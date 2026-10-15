import { and, eq, gte, lte, or, isNull, inArray, sql, asc, ne } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  employees,
  departments,
  employeeWorkSchedules,
  employeeLeaveRequests,
  attendanceOnDutyRequests,
  attendanceExceptions,
  attendanceRegularizations,
  attendanceMonthlySummaries,
  attendanceOvertimeRequests,
} from '../../../../db/schema.js';
import { attendanceSettingsService } from './attendanceSettings.service.js';
import { getDayOfWeekName } from './attendanceCalculation.service.js';
import type { CompanyAccess } from '../../../../platform/access/types/access.types.js';
import type { AuthenticatedUser } from '../../../../platform/auth/types/auth.types.js';
import type {
  TodayAttendanceKpis,
  AttendanceTrendsResult,
  AttendanceTrendItem,
  DepartmentComparisonItem,
  ActionQueueItem,
  ProcessingHealthResult,
  MonthlyPayrollReadinessOverview,
  AttendanceOverviewResult,
  OverviewFilterParams,
  OverviewAccessScope,
} from '../types/attendanceOverview.types.js';

export class AttendanceOverviewService {
  /**
   * Resolves company timezone and localized work date.
   */
  async resolveTimezoneAndDate(
    tenantId: string,
    companyId: string,
    requestedDate?: string,
  ): Promise<{ timezone: string; workDate: string; companyLocalToday: string }> {
    let timezone = 'UTC';
    try {
      const general = await attendanceSettingsService.getGeneralSettings(tenantId, companyId);
      if (general?.timezone) {
        timezone = general.timezone;
      }
    } catch {
      timezone = 'UTC';
    }

    let companyLocalToday: string;
    try {
      companyLocalToday = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      companyLocalToday = new Date().toISOString().slice(0, 10);
    }

    let workDate = companyLocalToday;
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      workDate = requestedDate;
    }

    return { timezone, workDate, companyLocalToday };
  }

  /**
   * Resolves authorized user scope based on RBAC and organizational assignments.
   */
  async resolveUserScope(
    tenantId: string,
    companyId: string,
    user?: AuthenticatedUser,
    access?: CompanyAccess,
  ): Promise<{
    scope: OverviewAccessScope;
    scopedEmployeeIds?: string[];
  }> {
    const permissions = access?.permissions ?? [];
    const isTenantAdmin = Boolean(access?.isTenantAdmin || access?.isPlatformOversight);
    const hasAdminView =
      isTenantAdmin ||
      permissions.includes('hrms.attendance.view') ||
      permissions.includes('hrms.attendance.admin') ||
      permissions.includes('hrms.attendance.reports');

    const canViewPayroll =
      hasAdminView ||
      permissions.includes('hrms.payroll.view') ||
      permissions.includes('hrms.attendance.payroll');

    const db = getDb();

    // 1. Unspecified access (internal/service calls) or HR Admin or Platform Oversight: full company access
    if (!access || hasAdminView) {
      return {
        scope: {
          role: 'hr_admin',
          isCompanyWide: true,
          canViewPayrollReadiness: !access || canViewPayroll,
        },
      };
    }

    // 2. Identify linked Employee record
    let actorEmployeeId = access?.employeeId;
    if (!actorEmployeeId && user?.id) {
      const [emp] = await db
        .select({ id: employees.id, departmentId: employees.departmentId })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.userId, user.id),
          ),
        )
        .limit(1);
      if (emp) {
        actorEmployeeId = emp.id;
      }
    }

    // 3. Manager Scope Check: does user manage any employees?
    if (actorEmployeeId) {
      const supervisees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.reportingManagerId, actorEmployeeId),
          ),
        );

      if (supervisees.length > 0) {
        const teamIds = [actorEmployeeId, ...supervisees.map((s) => s.id)];
        return {
          scope: {
            role: 'manager',
            isCompanyWide: false,
            employeeId: actorEmployeeId,
            canViewPayrollReadiness: canViewPayroll,
          },
          scopedEmployeeIds: teamIds,
        };
      }

      // 4. Employee Self-Service Scope
      return {
        scope: {
          role: 'employee',
          isCompanyWide: false,
          employeeId: actorEmployeeId,
          canViewPayrollReadiness: false,
        },
        scopedEmployeeIds: [actorEmployeeId],
      };
    }

    // 5. Default fallback restricted
    return {
      scope: {
        role: 'employee',
        isCompanyWide: false,
        canViewPayrollReadiness: false,
      },
      scopedEmployeeIds: [],
    };
  }

  /**
   * 1. TODAY ATTENDANCE KPIS
   * Computes authoritative attendance situation for the selected date.
   */
  async getTodayKpis(
    tenantId: string,
    companyId: string,
    date: string,
    access?: CompanyAccess,
    user?: AuthenticatedUser,
  ): Promise<TodayAttendanceKpis> {
    const { timezone, companyLocalToday } = await this.resolveTimezoneAndDate(
      tenantId,
      companyId,
      date,
    );
    const { scopedEmployeeIds } = await this.resolveUserScope(tenantId, companyId, user, access);

    const isFuture = date > companyLocalToday;
    const isToday = date === companyLocalToday;
    const asOf = new Date().toISOString();

    const db = getDb();

    // 1. Fetch eligible active employees for this date
    const empConditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
      lte(employees.joiningDate, date),
      or(isNull(employees.lastWorkingDate), gte(employees.lastWorkingDate, date)),
      sql`(${employees.employmentStatus} NOT IN ('terminated', 'resigned') OR ${employees.lastWorkingDate} >= ${date})`,
    ];

    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      empConditions.push(inArray(employees.id, scopedEmployeeIds));
    } else if (scopedEmployeeIds && scopedEmployeeIds.length === 0) {
      return {
        date,
        timezone,
        totalEligibleEmployees: 0,
        presentCount: 0,
        absentCount: 0,
        onLeaveCount: 0,
        onDutyCount: 0,
        lateArrivalsCount: 0,
        missingPunchCount: 0,
        pendingProcessingCount: 0,
        halfDayCount: 0,
        attendanceRate: null,
        processingCompletenessPercent: 100,
        isFuture,
        asOf,
      };
    }

    const eligibleEmployees = await db
      .select({
        id: employees.id,
        departmentId: employees.departmentId,
      })
      .from(employees)
      .where(and(...empConditions));

    const eligibleEmpIds = eligibleEmployees.map((e) => e.id);
    const totalEligibleEmployees = eligibleEmpIds.length;

    if (totalEligibleEmployees === 0) {
      return {
        date,
        timezone,
        totalEligibleEmployees: 0,
        presentCount: 0,
        absentCount: 0,
        onLeaveCount: 0,
        onDutyCount: 0,
        lateArrivalsCount: 0,
        missingPunchCount: 0,
        pendingProcessingCount: 0,
        halfDayCount: 0,
        attendanceRate: null,
        processingCompletenessPercent: 100,
        isFuture,
        asOf,
      };
    }

    // 2. Fetch Attendance Records for this date
    const attRows = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.date, date),
          inArray(employeeAttendance.employeeId, eligibleEmpIds),
        ),
      );

    const attMap = new Map<string, (typeof attRows)[number]>();
    for (const att of attRows) {
      attMap.set(att.employeeId, att);
    }

    // 3. Fetch Approved Leave for this date
    const leaveRows = await db
      .select({
        employeeId: employeeLeaveRequests.employeeId,
      })
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.status, 'approved'),
          lte(employeeLeaveRequests.startDate, date),
          gte(employeeLeaveRequests.endDate, date),
          inArray(employeeLeaveRequests.employeeId, eligibleEmpIds),
        ),
      );
    const leaveSet = new Set(leaveRows.map((r) => r.employeeId));

    // 4. Fetch Approved On-Duty for this date
    const odRows = await db
      .select({
        employeeId: attendanceOnDutyRequests.employeeId,
        durationType: attendanceOnDutyRequests.durationType,
      })
      .from(attendanceOnDutyRequests)
      .where(
        and(
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
          eq(attendanceOnDutyRequests.status, 'approved'),
          lte(attendanceOnDutyRequests.startDate, date),
          gte(attendanceOnDutyRequests.endDate, date),
          inArray(attendanceOnDutyRequests.employeeId, eligibleEmpIds),
        ),
      );
    const odMap = new Map<string, string>();
    for (const od of odRows) {
      odMap.set(od.employeeId, od.durationType);
    }

    // 5. Aggregate metrics
    let presentCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let onDutyCount = 0;
    let lateArrivalsCount = 0;
    let missingPunchCount = 0;
    let pendingProcessingCount = 0;
    let halfDayCount = 0;
    let finalizedCount = 0;

    for (const emp of eligibleEmployees) {
      const att = attMap.get(emp.id);
      const hasApprovedLeave = leaveSet.has(emp.id);
      const odDuration = odMap.get(emp.id);

      // On-Duty coverage
      if (odDuration) {
        onDutyCount += odDuration === 'half_day' ? 0.5 : 1.0;
      }

      // Leave coverage
      if (hasApprovedLeave || att?.status === 'on_leave') {
        onLeaveCount += att?.status === 'half_day' ? 0.5 : 1.0;
      }

      if (att) {
        if (att.processingState === 'finalized' || att.processingState === 'locked') {
          finalizedCount++;
        }

        if (att.status === 'present') {
          presentCount += 1.0;
        } else if (att.status === 'half_day') {
          halfDayCount += 1;
          presentCount += 0.5;
          if (!hasApprovedLeave) {
            absentCount += 0.5;
          }
        } else if (att.status === 'absent') {
          absentCount += 1.0;
        } else if (att.status === 'on_leave') {
          // already counted in onLeaveCount
        } else if (att.status === 'incomplete') {
          if (isToday || isFuture) {
            pendingProcessingCount += 1;
          } else {
            absentCount += 1.0;
          }
        }

        if (att.isLate) lateArrivalsCount += 1;
        if (att.isMissingPunch) missingPunchCount += 1;
      } else {
        // No attendance record for this eligible employee
        if (hasApprovedLeave) {
          // Already accounted in leave
        } else if (odDuration) {
          // Has OD coverage
          presentCount += odDuration === 'half_day' ? 0.5 : 1.0;
        } else if (isFuture) {
          // Future work date: not absent, awaiting work date
          pendingProcessingCount += 1;
        } else if (isToday) {
          // Current work day: shift cutoff has not elapsed, pending check-in/processing
          pendingProcessingCount += 1;
        } else {
          // Past date with no punch or excuse: absent
          absentCount += 1.0;
        }
      }
    }

    const attendanceRate =
      isFuture || totalEligibleEmployees === 0
        ? null
        : Math.round((presentCount / totalEligibleEmployees) * 100 * 10) / 10;

    const processingCompletenessPercent =
      totalEligibleEmployees > 0
        ? Math.round((finalizedCount / totalEligibleEmployees) * 100)
        : 100;

    return {
      date,
      timezone,
      totalEligibleEmployees,
      presentCount,
      absentCount,
      onLeaveCount,
      onDutyCount,
      lateArrivalsCount,
      missingPunchCount,
      pendingProcessingCount,
      halfDayCount,
      attendanceRate,
      processingCompletenessPercent,
      isFuture,
      asOf,
    };
  }

  /**
   * 2. ATTENDANCE TRENDS
   * Aggregates date-based trends (7-day, 30-day, or custom range) using authoritative records.
   */
  async getTrends(
    tenantId: string,
    companyId: string,
    params: OverviewFilterParams,
    access?: CompanyAccess,
    user?: AuthenticatedUser,
  ): Promise<AttendanceTrendsResult> {
    const { companyLocalToday } = await this.resolveTimezoneAndDate(
      tenantId,
      companyId,
      params.date,
    );
    const { scopedEmployeeIds } = await this.resolveUserScope(tenantId, companyId, user, access);

    const rangeType = params.trendRange || '7d';
    const referenceDate = params.date || companyLocalToday;

    let startDate: string;
    let endDate: string;

    if (rangeType === 'custom' && params.startDate && params.endDate) {
      startDate = params.startDate;
      endDate = params.endDate;
    } else {
      const daysBack = rangeType === '30d' ? 29 : 6;
      endDate = referenceDate;
      const ref = new Date(`${referenceDate}T00:00:00Z`);
      ref.setUTCDate(ref.getUTCDate() - daysBack);
      startDate = ref.toISOString().slice(0, 10);
    }

    // Build list of dates
    const dateList: string[] = [];
    const cur = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    while (cur <= end) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const db = getDb();

    // Fetch active employees within scope
    const empConditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
      lte(employees.joiningDate, endDate),
      or(isNull(employees.lastWorkingDate), gte(employees.lastWorkingDate, startDate)),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      empConditions.push(inArray(employees.id, scopedEmployeeIds));
    } else if (scopedEmployeeIds && scopedEmployeeIds.length === 0) {
      return {
        range: rangeType,
        startDate,
        endDate,
        items: [],
        avgAttendanceRate: null,
        avgAbsenceRate: null,
        totalLateOccurrences: 0,
      };
    }

    const activeEmps = await db
      .select({
        id: employees.id,
        joiningDate: employees.joiningDate,
        lastWorkingDate: employees.lastWorkingDate,
      })
      .from(employees)
      .where(and(...empConditions));

    const activeEmpIds = activeEmps.map((e) => e.id);

    // Fetch all attendance rows in the period
    const attRows =
      activeEmpIds.length > 0
        ? await db
            .select()
            .from(employeeAttendance)
            .where(
              and(
                eq(employeeAttendance.tenantId, tenantId),
                eq(employeeAttendance.companyId, companyId),
                gte(employeeAttendance.date, startDate),
                lte(employeeAttendance.date, endDate),
                inArray(employeeAttendance.employeeId, activeEmpIds),
              ),
            )
        : [];

    // Group attendance by date
    const attByDate = new Map<string, (typeof attRows)[number][]>();
    for (const att of attRows) {
      const list = attByDate.get(att.date) || [];
      list.push(att);
      attByDate.set(att.date, list);
    }

    // Fetch OD rows in the period
    const odTrendRows =
      activeEmpIds.length > 0
        ? await db
            .select({
              employeeId: attendanceOnDutyRequests.employeeId,
              startDate: attendanceOnDutyRequests.startDate,
              endDate: attendanceOnDutyRequests.endDate,
              durationType: attendanceOnDutyRequests.durationType,
            })
            .from(attendanceOnDutyRequests)
            .where(
              and(
                eq(attendanceOnDutyRequests.tenantId, tenantId),
                eq(attendanceOnDutyRequests.companyId, companyId),
                eq(attendanceOnDutyRequests.status, 'approved'),
                lte(attendanceOnDutyRequests.startDate, endDate),
                gte(attendanceOnDutyRequests.endDate, startDate),
                inArray(attendanceOnDutyRequests.employeeId, activeEmpIds),
              ),
            )
        : [];

    const items: AttendanceTrendItem[] = [];
    let cumulativeAttendanceRate = 0;
    let attendanceRateDayCount = 0;
    let cumulativeAbsenceRate = 0;
    let totalLateOccurrences = 0;

    for (const d of dateList) {
      const isFuture = d > companyLocalToday;
      const dayOfWeek = getDayOfWeekName(d);

      // Filter employees active on this specific date
      const scheduledOnDay = activeEmps.filter(
        (e) => e.joiningDate <= d && (!e.lastWorkingDate || e.lastWorkingDate >= d),
      );
      const scheduledDayEquivalents = scheduledOnDay.length;

      const dayAtts = attByDate.get(d) || [];

      let presentEquivalents = 0;
      let absentEquivalents = 0;
      let leaveCoverageEquivalents = 0;
      let odCoverageEquivalents = 0;
      let lateOccurrences = 0;

      for (const od of odTrendRows) {
        if (od.startDate <= d && od.endDate >= d) {
          odCoverageEquivalents += od.durationType === 'half_day' ? 0.5 : 1.0;
        }
      }

      for (const att of dayAtts) {
        if (att.status === 'present') {
          presentEquivalents += 1.0;
        } else if (att.status === 'half_day') {
          presentEquivalents += 0.5;
          absentEquivalents += 0.5;
        } else if (att.status === 'absent') {
          absentEquivalents += 1.0;
        } else if (att.status === 'on_leave') {
          leaveCoverageEquivalents += 1.0;
        }

        if (att.isLate) lateOccurrences += 1;
      }

      if (!isFuture && d < companyLocalToday) {
        const unrecorded = Math.max(0, scheduledDayEquivalents - dayAtts.length);
        absentEquivalents += unrecorded;
      }

      totalLateOccurrences += lateOccurrences;

      let attendanceRate: number | null = null;
      let absenceRate: number | null = null;

      if (!isFuture && scheduledDayEquivalents > 0) {
        attendanceRate = Math.round((presentEquivalents / scheduledDayEquivalents) * 100 * 10) / 10;
        absenceRate = Math.round((absentEquivalents / scheduledDayEquivalents) * 100 * 10) / 10;

        cumulativeAttendanceRate += attendanceRate;
        cumulativeAbsenceRate += absenceRate;
        attendanceRateDayCount++;
      }

      items.push({
        date: d,
        dayOfWeek,
        scheduledDayEquivalents,
        presentEquivalentDays: presentEquivalents,
        absentEquivalentDays: absentEquivalents,
        leaveCoverageEquivalents,
        odCoverageEquivalents,
        attendanceRate,
        absenceRate,
        lateOccurrences,
        isFuture,
      });
    }

    const avgAttendanceRate =
      attendanceRateDayCount > 0
        ? Math.round((cumulativeAttendanceRate / attendanceRateDayCount) * 10) / 10
        : null;

    const avgAbsenceRate =
      attendanceRateDayCount > 0
        ? Math.round((cumulativeAbsenceRate / attendanceRateDayCount) * 10) / 10
        : null;

    return {
      range: rangeType,
      startDate,
      endDate,
      items,
      avgAttendanceRate,
      avgAbsenceRate,
      totalLateOccurrences,
    };
  }

  /**
   * 3. DEPARTMENT COMPARISON
   * Aggregates attendance statistics by authorized department.
   */
  async getDepartmentComparison(
    tenantId: string,
    companyId: string,
    date: string,
    access?: CompanyAccess,
    user?: AuthenticatedUser,
  ): Promise<DepartmentComparisonItem[]> {
    const { scopedEmployeeIds } = await this.resolveUserScope(tenantId, companyId, user, access);

    const db = getDb();

    // 1. Fetch departments
    const deptRows = await db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .where(and(eq(departments.tenantId, tenantId), eq(departments.companyId, companyId)));

    // 2. Fetch eligible employees
    const empConditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
      lte(employees.joiningDate, date),
      or(isNull(employees.lastWorkingDate), gte(employees.lastWorkingDate, date)),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      empConditions.push(inArray(employees.id, scopedEmployeeIds));
    } else if (scopedEmployeeIds && scopedEmployeeIds.length === 0) {
      return [];
    }

    const empRows = await db
      .select({
        id: employees.id,
        departmentId: employees.departmentId,
      })
      .from(employees)
      .where(and(...empConditions));

    if (empRows.length === 0) return [];

    const empIds = empRows.map((e) => e.id);

    // 3. Fetch attendance rows
    const attRows = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.date, date),
          inArray(employeeAttendance.employeeId, empIds),
        ),
      );

    const attMap = new Map<string, (typeof attRows)[number]>();
    for (const a of attRows) {
      attMap.set(a.employeeId, a);
    }

    // 4. Fetch open exceptions
    const excRows = await db
      .select({
        employeeId: attendanceExceptions.employeeId,
      })
      .from(attendanceExceptions)
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
          inArray(attendanceExceptions.status, ['open', 'assigned', 'in_review', 'pending_action']),
          inArray(attendanceExceptions.employeeId, empIds),
        ),
      );

    const excCountByEmp = new Map<string, number>();
    for (const exc of excRows) {
      if (exc.employeeId) {
        excCountByEmp.set(exc.employeeId, (excCountByEmp.get(exc.employeeId) || 0) + 1);
      }
    }

    // 5. Group by department
    const deptMap = new Map<
      string,
      {
        id: string;
        name: string;
        eligible: number;
        present: number;
        absent: number;
        leave: number;
        od: number;
        missingPunch: number;
        exceptions: number;
      }
    >();

    // Seed departments
    for (const d of deptRows) {
      deptMap.set(d.id, {
        id: d.id,
        name: d.name,
        eligible: 0,
        present: 0,
        absent: 0,
        leave: 0,
        od: 0,
        missingPunch: 0,
        exceptions: 0,
      });
    }

    const unassignedKey = 'unassigned';
    deptMap.set(unassignedKey, {
      id: unassignedKey,
      name: 'Unassigned',
      eligible: 0,
      present: 0,
      absent: 0,
      leave: 0,
      od: 0,
      missingPunch: 0,
      exceptions: 0,
    });

    for (const emp of empRows) {
      const deptKey =
        emp.departmentId && deptMap.has(emp.departmentId) ? emp.departmentId : unassignedKey;
      const stat = deptMap.get(deptKey)!;
      stat.eligible++;

      const att = attMap.get(emp.id);
      if (att) {
        if (att.status === 'present') stat.present += 1.0;
        else if (att.status === 'half_day') {
          stat.present += 0.5;
          stat.absent += 0.5;
        } else if (att.status === 'absent') stat.absent += 1.0;
        else if (att.status === 'on_leave') stat.leave += 1.0;

        if (att.isMissingPunch) stat.missingPunch++;
      } else {
        stat.absent += 1.0;
      }

      stat.exceptions += excCountByEmp.get(emp.id) || 0;
    }

    const results: DepartmentComparisonItem[] = [];
    for (const entry of deptMap.values()) {
      // Exclude empty departments unless requested
      if (entry.eligible === 0) continue;

      const rate =
        entry.eligible > 0 ? Math.round((entry.present / entry.eligible) * 100 * 10) / 10 : null;

      results.push({
        departmentId: entry.id,
        departmentName: entry.name,
        eligibleEmployees: entry.eligible,
        presentEquivalents: entry.present,
        absentEquivalents: entry.absent,
        leaveCoverage: entry.leave,
        odCoverage: entry.od,
        attendanceRate: rate,
        missingPunchCount: entry.missingPunch,
        unresolvedExceptions: entry.exceptions,
      });
    }

    return results.sort((a, b) => b.eligibleEmployees - a.eligibleEmployees);
  }

  /**
   * 4. ACTION REQUIRED QUEUE
   * Aggregates actionable records from existing attendance workflows.
   */
  async getActionQueue(
    tenantId: string,
    companyId: string,
    access?: CompanyAccess,
    user?: AuthenticatedUser,
  ): Promise<ActionQueueItem[]> {
    const { scopedEmployeeIds } = await this.resolveUserScope(tenantId, companyId, user, access);

    const db = getDb();
    const now = Date.now();
    const queue: ActionQueueItem[] = [];

    // 1. Pending Regularization Requests
    const regConditions = [
      eq(attendanceRegularizations.tenantId, tenantId),
      eq(attendanceRegularizations.companyId, companyId),
      inArray(attendanceRegularizations.approvalStatus, [
        'submitted',
        'under_review',
        'awaiting_info',
      ]),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      regConditions.push(inArray(attendanceRegularizations.employeeId, scopedEmployeeIds));
    }

    const pendingRegs = await db
      .select({
        id: attendanceRegularizations.id,
        createdAt: attendanceRegularizations.createdAt,
      })
      .from(attendanceRegularizations)
      .where(and(...regConditions))
      .orderBy(asc(attendanceRegularizations.createdAt));

    let oldestRegDays: number | null = null;
    if (pendingRegs.length > 0 && pendingRegs[0]?.createdAt) {
      oldestRegDays = Math.max(
        0,
        Math.floor((now - new Date(pendingRegs[0].createdAt).getTime()) / 86400000),
      );
    }

    queue.push({
      actionType: 'pending_regularization',
      title: 'Pending Regularizations',
      description: 'Employee punch & status correction requests awaiting approval',
      authorizedPendingCount: pendingRegs.length,
      severity: pendingRegs.length > 10 ? 'danger' : pendingRegs.length > 0 ? 'warning' : 'info',
      oldestPendingAgeDays: oldestRegDays,
      targetRoute: '/hrms/attendance/regularization',
      filterParams: { approvalStatus: 'submitted' },
      lastUpdated: new Date().toISOString(),
    });

    // 2. Pending On-Duty Requests
    const odConditions = [
      eq(attendanceOnDutyRequests.tenantId, tenantId),
      eq(attendanceOnDutyRequests.companyId, companyId),
      inArray(attendanceOnDutyRequests.status, ['submitted', 'under_review', 'awaiting_info']),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      odConditions.push(inArray(attendanceOnDutyRequests.employeeId, scopedEmployeeIds));
    }

    const pendingODs = await db
      .select({
        id: attendanceOnDutyRequests.id,
        createdAt: attendanceOnDutyRequests.createdAt,
      })
      .from(attendanceOnDutyRequests)
      .where(and(...odConditions))
      .orderBy(asc(attendanceOnDutyRequests.createdAt));

    let oldestOdDays: number | null = null;
    if (pendingODs.length > 0 && pendingODs[0]?.createdAt) {
      oldestOdDays = Math.max(
        0,
        Math.floor((now - new Date(pendingODs[0].createdAt).getTime()) / 86400000),
      );
    }

    queue.push({
      actionType: 'pending_on_duty',
      title: 'Pending On-Duty Approvals',
      description: 'Field work and client visit authorizations awaiting review',
      authorizedPendingCount: pendingODs.length,
      severity: pendingODs.length > 5 ? 'danger' : pendingODs.length > 0 ? 'warning' : 'info',
      oldestPendingAgeDays: oldestOdDays,
      targetRoute: '/hrms/attendance/on-duty',
      filterParams: { status: 'submitted' },
      lastUpdated: new Date().toISOString(),
    });

    // 3. Unresolved Attendance Exceptions
    const excConditions = [
      eq(attendanceExceptions.tenantId, tenantId),
      eq(attendanceExceptions.companyId, companyId),
      inArray(attendanceExceptions.status, ['open', 'assigned', 'in_review', 'pending_action']),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      excConditions.push(inArray(attendanceExceptions.employeeId, scopedEmployeeIds));
    }

    const openExceptions = await db
      .select({
        id: attendanceExceptions.id,
        severity: attendanceExceptions.severity,
        createdAt: attendanceExceptions.createdAt,
      })
      .from(attendanceExceptions)
      .where(and(...excConditions))
      .orderBy(asc(attendanceExceptions.createdAt));

    const blockingExceptionsCount = openExceptions.filter(
      (e) => e.severity === 'critical' || e.severity === 'high',
    ).length;

    let oldestExcDays: number | null = null;
    if (openExceptions.length > 0 && openExceptions[0]?.createdAt) {
      oldestExcDays = Math.max(
        0,
        Math.floor((now - new Date(openExceptions[0].createdAt).getTime()) / 86400000),
      );
    }

    queue.push({
      actionType: 'unresolved_exceptions',
      title: 'Unresolved Exceptions',
      description: 'Punch anomalies, sync errors, and rule violations requiring attention',
      authorizedPendingCount: openExceptions.length,
      severity:
        blockingExceptionsCount > 0 ? 'danger' : openExceptions.length > 0 ? 'warning' : 'info',
      oldestPendingAgeDays: oldestExcDays,
      targetRoute: '/hrms/attendance/exceptions',
      filterParams: { status: 'open' },
      lastUpdated: new Date().toISOString(),
    });

    // 4. Missing Punch Issues (Recent un-finalized)
    const recentDateLimit = new Date();
    recentDateLimit.setUTCDate(recentDateLimit.getUTCDate() - 7);
    const recentDateStr = recentDateLimit.toISOString().slice(0, 10);

    const mpConditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      eq(employeeAttendance.isMissingPunch, true),
      ne(employeeAttendance.processingState, 'finalized'),
      gte(employeeAttendance.date, recentDateStr),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      mpConditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const missingPunchRows = await db
      .select({ id: employeeAttendance.id, date: employeeAttendance.date })
      .from(employeeAttendance)
      .where(and(...mpConditions))
      .orderBy(asc(employeeAttendance.date));

    queue.push({
      actionType: 'missing_punch_issues',
      title: 'Missing Punch Records',
      description: 'Single-punch shifts without matching check-out or check-in',
      authorizedPendingCount: missingPunchRows.length,
      severity: missingPunchRows.length > 0 ? 'warning' : 'info',
      oldestPendingAgeDays: missingPunchRows.length > 0 ? 3 : null,
      targetRoute: '/hrms/attendance/daily-log',
      filterParams: { indicator: 'missing_punch' },
      lastUpdated: new Date().toISOString(),
    });

    // 5. Monthly Summaries Pending Review
    const currentMonth = new Date().toISOString().slice(0, 7);
    const msConditions = [
      eq(attendanceMonthlySummaries.tenantId, tenantId),
      eq(attendanceMonthlySummaries.companyId, companyId),
      eq(attendanceMonthlySummaries.month, currentMonth),
      inArray(attendanceMonthlySummaries.reviewState, [
        'not_reviewed',
        'in_review',
        'needs_correction',
      ]),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      msConditions.push(inArray(attendanceMonthlySummaries.employeeId, scopedEmployeeIds));
    }

    const pendingMonthlyReviews = await db
      .select({ id: attendanceMonthlySummaries.id })
      .from(attendanceMonthlySummaries)
      .where(and(...msConditions));

    queue.push({
      actionType: 'pending_monthly_review',
      title: 'Pending Monthly Reviews',
      description: `Monthly attendance summaries awaiting HR supervisor sign-off for ${currentMonth}`,
      authorizedPendingCount: pendingMonthlyReviews.length,
      severity: pendingMonthlyReviews.length > 0 ? 'warning' : 'info',
      oldestPendingAgeDays: null,
      targetRoute: '/hrms/attendance/monthly-summary',
      filterParams: { month: currentMonth, reviewState: 'in_review' },
      lastUpdated: new Date().toISOString(),
    });

    // 6. Payroll Readiness Blockers
    const blockedConditions = [
      eq(attendanceMonthlySummaries.tenantId, tenantId),
      eq(attendanceMonthlySummaries.companyId, companyId),
      eq(attendanceMonthlySummaries.month, currentMonth),
      eq(attendanceMonthlySummaries.payrollReadiness, 'blocked'),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      blockedConditions.push(inArray(attendanceMonthlySummaries.employeeId, scopedEmployeeIds));
    }

    const blockedSummaries = await db
      .select({ id: attendanceMonthlySummaries.id })
      .from(attendanceMonthlySummaries)
      .where(and(...blockedConditions));

    queue.push({
      actionType: 'payroll_readiness_blockers',
      title: 'Payroll Readiness Blockers',
      description: `Employees with unresolved exceptions blocking payroll handover for ${currentMonth}`,
      authorizedPendingCount: blockedSummaries.length,
      severity: blockedSummaries.length > 0 ? 'danger' : 'info',
      oldestPendingAgeDays: null,
      targetRoute: '/hrms/attendance/monthly-summary',
      filterParams: { month: currentMonth, readiness: 'blocked' },
      lastUpdated: new Date().toISOString(),
    });

    // 7. Pending Overtime Claims
    const otConditions = [
      eq(attendanceOvertimeRequests.tenantId, tenantId),
      eq(attendanceOvertimeRequests.companyId, companyId),
      inArray(attendanceOvertimeRequests.status, ['submitted', 'pending_approval']),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      otConditions.push(inArray(attendanceOvertimeRequests.employeeId, scopedEmployeeIds));
    }
    const pendingOtRequests = await db
      .select({ id: attendanceOvertimeRequests.id })
      .from(attendanceOvertimeRequests)
      .where(and(...otConditions));

    queue.push({
      actionType: 'pending_overtime_claims',
      title: 'Pending Overtime Claims',
      description: 'Employee overtime claims awaiting manager review and policy verification',
      authorizedPendingCount: pendingOtRequests.length,
      severity: pendingOtRequests.length > 0 ? 'warning' : 'info',
      oldestPendingAgeDays: null,
      targetRoute: '/hrms/attendance/overtime',
      filterParams: { status: 'submitted' },
      lastUpdated: new Date().toISOString(),
    });

    return queue;
  }

  /**
   * 5. ATTENDANCE PROCESSING HEALTH
   * Computes processing success rate, pipeline state, and infrastructure integrity.
   */
  async getProcessingHealth(
    tenantId: string,
    companyId: string,
    date: string,
    access?: CompanyAccess,
    user?: AuthenticatedUser,
  ): Promise<ProcessingHealthResult> {
    const { companyLocalToday } = await this.resolveTimezoneAndDate(tenantId, companyId, date);
    const { scopedEmployeeIds } = await this.resolveUserScope(tenantId, companyId, user, access);

    const isFuture = date > companyLocalToday;
    const asOf = new Date().toISOString();

    const db = getDb();

    // 1. Eligible employees for date
    const empConditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
      lte(employees.joiningDate, date),
      or(isNull(employees.lastWorkingDate), gte(employees.lastWorkingDate, date)),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      empConditions.push(inArray(employees.id, scopedEmployeeIds));
    }

    const eligibleEmps = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(...empConditions));

    const eligibleWorkdays = eligibleEmps.length;

    if (isFuture) {
      return {
        date,
        eligibleWorkdays,
        processedWorkdays: 0,
        pendingWorkdays: eligibleWorkdays,
        failedWorkdays: 0,
        missingScheduleCount: 0,
        unresolvedBlockingExceptions: 0,
        staleMonthlySummaries: 0,
        processingSuccessRate: null,
        denominatorDescription: 'Future date: scheduled workdays pending clock-in and cutoff',
        status: 'upcoming',
        asOf,
      };
    }

    const eligibleIds = eligibleEmps.map((e) => e.id);

    // 2. Attendance states
    const attRows =
      eligibleIds.length > 0
        ? await db
            .select({
              id: employeeAttendance.id,
              processingState: employeeAttendance.processingState,
            })
            .from(employeeAttendance)
            .where(
              and(
                eq(employeeAttendance.tenantId, tenantId),
                eq(employeeAttendance.companyId, companyId),
                eq(employeeAttendance.date, date),
                inArray(employeeAttendance.employeeId, eligibleIds),
              ),
            )
        : [];

    let processedWorkdays = 0;
    let pendingWorkdays = 0;
    let failedWorkdays = 0;

    for (const att of attRows) {
      if (att.processingState === 'finalized' || att.processingState === 'locked') {
        processedWorkdays++;
      } else if (
        att.processingState === 'provisional' ||
        att.processingState === 'pending_review'
      ) {
        pendingWorkdays++;
      } else if (att.processingState === 'incomplete') {
        failedWorkdays++;
      }
    }

    // Unrecorded workdays on today count as pending; on past days count as missing
    const unrecordedCount = Math.max(0, eligibleWorkdays - attRows.length);
    if (date === companyLocalToday) {
      pendingWorkdays += unrecordedCount;
    } else {
      pendingWorkdays += unrecordedCount;
    }

    // 3. Missing schedule definitions
    const schedules =
      eligibleIds.length > 0
        ? await db
            .select({ employeeId: employeeWorkSchedules.employeeId })
            .from(employeeWorkSchedules)
            .where(
              and(
                eq(employeeWorkSchedules.tenantId, tenantId),
                eq(employeeWorkSchedules.companyId, companyId),
                inArray(employeeWorkSchedules.employeeId, eligibleIds),
              ),
            )
        : [];
    const scheduledEmpSet = new Set(schedules.map((s) => s.employeeId));
    const missingScheduleCount = eligibleIds.filter((id) => !scheduledEmpSet.has(id)).length;

    // 4. Unresolved blocking exceptions
    const blockingExc = await db
      .select({ id: attendanceExceptions.id })
      .from(attendanceExceptions)
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
          inArray(attendanceExceptions.status, ['open', 'assigned', 'in_review', 'pending_action']),
          inArray(attendanceExceptions.severity, ['critical', 'high']),
        ),
      );
    const unresolvedBlockingExceptions = blockingExc.length;

    // 5. Stale monthly summaries
    const currentMonth = date.slice(0, 7);
    const staleSummaries = await db
      .select({ id: attendanceMonthlySummaries.id })
      .from(attendanceMonthlySummaries)
      .where(
        and(
          eq(attendanceMonthlySummaries.tenantId, tenantId),
          eq(attendanceMonthlySummaries.companyId, companyId),
          eq(attendanceMonthlySummaries.month, currentMonth),
          eq(attendanceMonthlySummaries.calculationState, 'stale'),
        ),
      );
    const staleMonthlySummaries = staleSummaries.length;

    const processingSuccessRate =
      eligibleWorkdays > 0
        ? Math.round((processedWorkdays / eligibleWorkdays) * 100 * 10) / 10
        : 100;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (failedWorkdays > 0 || unresolvedBlockingExceptions > 5) {
      status = 'critical';
    } else if (pendingWorkdays > 0 || staleMonthlySummaries > 0 || missingScheduleCount > 0) {
      status = 'degraded';
    }

    return {
      date,
      eligibleWorkdays,
      processedWorkdays,
      pendingWorkdays,
      failedWorkdays,
      missingScheduleCount,
      unresolvedBlockingExceptions,
      staleMonthlySummaries,
      processingSuccessRate,
      denominatorDescription: `Processed Finalized (${processedWorkdays}) / Eligible Workdays (${eligibleWorkdays}) × 100`,
      status,
      asOf,
    };
  }

  /**
   * 6. MONTHLY PAYROLL READINESS
   * Reuses Monthly Summary V1.0 records with distinct readiness, review, and lock dimensions.
   */
  async getMonthlyPayrollReadiness(
    tenantId: string,
    companyId: string,
    monthStr?: string,
    access?: CompanyAccess,
    user?: AuthenticatedUser,
  ): Promise<MonthlyPayrollReadinessOverview> {
    const { scope, scopedEmployeeIds } = await this.resolveUserScope(
      tenantId,
      companyId,
      user,
      access,
    );

    const month =
      monthStr && /^\d{4}-\d{2}$/.test(monthStr) ? monthStr : new Date().toISOString().slice(0, 7);

    if (!scope.canViewPayrollReadiness) {
      return {
        month,
        isAuthorized: false,
        totalInScope: 0,
        readyCount: 0,
        needsReviewCount: 0,
        blockedCount: 0,
        calculatingCount: 0,
        reviewedCount: 0,
        pendingReviewCount: 0,
        reopenedCount: 0,
        lockedCount: 0,
        targetRoute: '/hrms/attendance/monthly-summary',
        filterParams: { month },
      };
    }

    const db = getDb();
    const conditions = [
      eq(attendanceMonthlySummaries.tenantId, tenantId),
      eq(attendanceMonthlySummaries.companyId, companyId),
      eq(attendanceMonthlySummaries.month, month),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(attendanceMonthlySummaries.employeeId, scopedEmployeeIds));
    }

    const rows = await db
      .select({
        id: attendanceMonthlySummaries.id,
        payrollReadiness: attendanceMonthlySummaries.payrollReadiness,
        reviewState: attendanceMonthlySummaries.reviewState,
        isLocked: attendanceMonthlySummaries.isLocked,
      })
      .from(attendanceMonthlySummaries)
      .where(and(...conditions));

    let readyCount = 0;
    let needsReviewCount = 0;
    let blockedCount = 0;
    let calculatingCount = 0;
    let reviewedCount = 0;
    let pendingReviewCount = 0;
    let reopenedCount = 0;
    let lockedCount = 0;

    for (const r of rows) {
      if (r.payrollReadiness === 'ready') readyCount++;
      else if (r.payrollReadiness === 'needs_review') needsReviewCount++;
      else if (r.payrollReadiness === 'blocked') blockedCount++;
      else if (r.payrollReadiness === 'calculating') calculatingCount++;

      if (r.reviewState === 'reviewed') reviewedCount++;
      else if (r.reviewState === 'not_reviewed' || r.reviewState === 'in_review')
        pendingReviewCount++;
      else if (r.reviewState === 'needs_correction' || r.reviewState === 'reopened')
        reopenedCount++;

      if (r.isLocked) lockedCount++;
    }

    return {
      month,
      isAuthorized: true,
      totalInScope: rows.length,
      readyCount,
      needsReviewCount,
      blockedCount,
      calculatingCount,
      reviewedCount,
      pendingReviewCount,
      reopenedCount,
      lockedCount,
      targetRoute: '/hrms/attendance/monthly-summary',
      filterParams: { month },
    };
  }

  /**
   * Combined Master Endpoint
   * Returns complete overview payload in a single network round-trip.
   */
  async getCombinedOverview(
    tenantId: string,
    companyId: string,
    params: OverviewFilterParams,
    user?: AuthenticatedUser,
    access?: CompanyAccess,
  ): Promise<AttendanceOverviewResult> {
    const { timezone, workDate } = await this.resolveTimezoneAndDate(
      tenantId,
      companyId,
      params.date,
    );
    const { scope } = await this.resolveUserScope(tenantId, companyId, user, access);

    const month = params.month || workDate.slice(0, 7);

    const [todayKpis, trends, departmentsList, actionQueue, processingHealth, monthlyReadiness] =
      await Promise.all([
        this.getTodayKpis(tenantId, companyId, workDate, access, user),
        this.getTrends(tenantId, companyId, { ...params, date: workDate }, access, user),
        this.getDepartmentComparison(tenantId, companyId, workDate, access, user),
        this.getActionQueue(tenantId, companyId, access, user),
        this.getProcessingHealth(tenantId, companyId, workDate, access, user),
        this.getMonthlyPayrollReadiness(tenantId, companyId, month, access, user),
      ]);

    const asOf = new Date().toISOString();

    const regAction = actionQueue.find((a) => a.actionType === 'pending_regularization');

    return {
      date: workDate,
      timezone,
      asOf,
      dataFreshness: 'realtime',
      scope,

      todayKpis,
      trends,
      departments: departmentsList,
      actionQueue,
      processingHealth,
      monthlyReadiness,

      // Backwards-compatible legacy properties
      expectedCount: todayKpis.totalEligibleEmployees,
      presentCount: todayKpis.presentCount,
      absentCount: todayKpis.absentCount,
      lateCount: todayKpis.lateArrivalsCount,
      onLeaveCount: todayKpis.onLeaveCount,
      missingPunchCount: todayKpis.missingPunchCount,
      halfDayCount: todayKpis.halfDayCount,
      pendingRegularizationCount: regAction ? regAction.authorizedPendingCount : 0,
      attendanceRate: todayKpis.attendanceRate ?? 0,
      departmentBreakdown: departmentsList.map((d) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        present: d.presentEquivalents,
        total: d.eligibleEmployees,
      })),
      recentTrends: trends.items.slice(-5).map((t) => ({
        date: t.date,
        present: t.presentEquivalentDays,
        absent: t.absentEquivalentDays,
        late: t.lateOccurrences,
      })),
    };
  }
}

export const attendanceOverviewService = new AttendanceOverviewService();
