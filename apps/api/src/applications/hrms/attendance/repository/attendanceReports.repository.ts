import { and, desc, eq, gte, lte, or, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  attendanceMonthlySummaries,
  attendanceMonthlyReviews,
  attendanceMonthlyReadinessEvaluations,
  attendanceExceptions,
  attendanceRegularizations,
  attendanceOnDutyRequests,
  employeeLeaveRequests,
  auditLogs,
  attendanceSavedReports,
  attendanceReportGenerations,
  employees,
  departments,
  locations,
  companies,
  type AttendanceSavedReport,
  type NewAttendanceSavedReport,
  type AttendanceReportGeneration,
  type NewAttendanceReportGeneration,
} from '../../../../db/schema.js';
import type { ReportId, ReportQueryOptions } from '../types/attendanceReports.types.js';

export class AttendanceReportsRepository {
  private get db() {
    return getDb();
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCOPING & EMPLOYEE DIRECTORY HELPERS
  // ════════════════════════════════════════════════════════════════════════

  async getCompanyMetadata(companyId: string) {
    const [comp] = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        code: companies.code,
      })
      .from(companies)
      .where(eq(companies.id, companyId));
    return comp ?? { id: companyId, name: 'BEZENT Company', code: 'BEZ' };
  }

  async getEmployeesMap(tenantId: string, companyId: string, employeeIds?: string[]) {
    const conditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
    ];
    if (employeeIds && employeeIds.length > 0) {
      conditions.push(inArray(employees.id, employeeIds));
    }

    const rows = await this.db
      .select({
        id: employees.id,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentId: employees.departmentId,
        locationId: employees.locationId,
        departmentName: departments.name,
        locationName: locations.name,
        managerId: employees.reportingManagerId,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(and(...conditions));

    const map = new Map<string, {
      id: string;
      code: string;
      name: string;
      departmentId: string | null;
      departmentName: string;
      locationId: string | null;
      locationName: string;
      managerId: string | null;
    }>();

    for (const r of rows) {
      const name = `${r.firstName} ${r.lastName || ''}`.trim();
      map.set(r.id, {
        id: r.id,
        code: r.employeeCode,
        name,
        departmentId: r.departmentId,
        departmentName: r.departmentName ?? 'Unassigned',
        locationId: r.locationId,
        locationName: r.locationName ?? 'Headquarters',
        managerId: r.managerId,
      });
    }

    return map;
  }

  // ════════════════════════════════════════════════════════════════════════
  // R01 — DAILY ATTENDANCE REGISTER
  // ════════════════════════════════════════════════════════════════════════

  async queryR01DailyAttendance(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || (filters.date as string) || new Date().toISOString().slice(0, 10);
    const endDate = (filters.endDate as string) || startDate;

    const conditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      gte(employeeAttendance.date, startDate),
      lte(employeeAttendance.date, endDate),
    ];

    if (filters.status && typeof filters.status === 'string') {
      conditions.push(eq(employeeAttendance.status, filters.status as typeof employeeAttendance.$inferSelect.status));
    }
    if (filters.employeeId && typeof filters.employeeId === 'string') {
      conditions.push(eq(employeeAttendance.employeeId, filters.employeeId));
    }
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        id: employeeAttendance.id,
        date: employeeAttendance.date,
        employeeId: employeeAttendance.employeeId,
        checkInTime: employeeAttendance.checkInTime,
        checkOutTime: employeeAttendance.checkOutTime,
        status: employeeAttendance.status,
        processingState: employeeAttendance.processingState,
        workedMinutes: employeeAttendance.workedMinutes,
        lateMinutes: employeeAttendance.lateMinutes,
        earlyMinutes: employeeAttendance.earlyMinutes,
        isLate: employeeAttendance.isLate,
        isEarlyExit: employeeAttendance.isEarlyExit,
        isMissingPunch: employeeAttendance.isMissingPunch,
        isRegularized: employeeAttendance.isRegularized,
        shiftScheduleRef: employeeAttendance.shiftScheduleRef,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
        departmentId: employees.departmentId,
        locationName: locations.name,
        locationId: employees.locationId,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(desc(employeeAttendance.date));

    // In-memory filter for department/location/search if supplied
    return rows
      .filter((r) => {
        if (filters.departmentId && r.departmentId !== filters.departmentId) return false;
        if (filters.locationId && r.locationId !== filters.locationId) return false;
        if (filters.search) {
          const s = String(filters.search).toLowerCase();
          const fullName = `${r.firstName} ${r.lastName || ''}`.toLowerCase();
          const code = (r.employeeCode || '').toLowerCase();
          if (!fullName.includes(s) && !code.includes(s)) return false;
        }
        return true;
      })
      .map((r) => {
        const workedHours = Number((r.workedMinutes / 60).toFixed(2));
        const creditedHours = r.status === 'present' ? workedHours : r.status === 'half_day' ? 4 : 0;
        let exceptionStatus = 'Normal';
        if (r.isMissingPunch) exceptionStatus = 'Missing Punch';
        else if (r.isLate && r.isEarlyExit) exceptionStatus = 'Late & Early Exit';
        else if (r.isLate) exceptionStatus = 'Late Arrival';
        else if (r.isEarlyExit) exceptionStatus = 'Early Exit';
        else if (r.isRegularized) exceptionStatus = 'Regularized';

        return {
          date: r.date,
          employeeId: r.employeeCode || r.employeeId,
          employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
          department: r.departmentName ?? 'Unassigned',
          branch: r.locationName ?? 'Main Branch',
          shift: r.shiftScheduleRef ?? 'General 09:00-18:00',
          scheduledIn: '09:00 AM',
          scheduledOut: '06:00 PM',
          firstIn: r.checkInTime ? formatTimeDisplay(r.checkInTime) : '—',
          lastOut: r.checkOutTime ? formatTimeDisplay(r.checkOutTime) : '—',
          actualWorkedHours: workedHours,
          creditedHours,
          attendanceStatus: capitalize(r.status),
          lateMinutes: r.lateMinutes,
          earlyExitMinutes: r.earlyMinutes,
          exceptionStatus,
        };
      });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R02 — MONTHLY ATTENDANCE REGISTER
  // ════════════════════════════════════════════════════════════════════════

  async queryR02MonthlyAttendance(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const month = (filters.month as string) || new Date().toISOString().slice(0, 7);

    const conditions = [
      eq(attendanceMonthlySummaries.tenantId, tenantId),
      eq(attendanceMonthlySummaries.companyId, companyId),
      eq(attendanceMonthlySummaries.month, month),
    ];

    if (filters.employeeId && typeof filters.employeeId === 'string') {
      conditions.push(eq(attendanceMonthlySummaries.employeeId, filters.employeeId));
    }
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(attendanceMonthlySummaries.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        summary: attendanceMonthlySummaries,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
        departmentId: employees.departmentId,
      })
      .from(attendanceMonthlySummaries)
      .innerJoin(employees, eq(attendanceMonthlySummaries.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions));

    return rows
      .filter((r) => {
        if (filters.departmentId && r.departmentId !== filters.departmentId) return false;
        if (filters.reviewState && r.summary.reviewState !== filters.reviewState) return false;
        if (filters.payrollReadiness && r.summary.payrollReadiness !== filters.payrollReadiness) return false;
        if (filters.search) {
          const s = String(filters.search).toLowerCase();
          const fullName = `${r.firstName} ${r.lastName || ''}`.toLowerCase();
          const code = (r.employeeCode || '').toLowerCase();
          if (!fullName.includes(s) && !code.includes(s)) return false;
        }
        return true;
      })
      .map((r) => {
        const s = r.summary;
        return {
          employeeId: r.employeeCode || s.employeeId,
          employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
          department: r.departmentName ?? 'Unassigned',
          scheduledDays: s.scheduledDays,
          presentDays: Number(s.presentDays),
          absentDays: Number(s.absentDays),
          leaveDays: Number(s.leaveDays),
          odDays: Number(s.onDutyDays),
          weeklyOff: s.weeklyOffDays,
          holidays: s.holidayDays,
          actualWorkedHours: Number((s.actualWorkedMinutes / 60).toFixed(2)),
          creditedHours: Number((s.policyCreditedMinutes / 60).toFixed(2)),
          lateCount: s.lateOccurrences,
          earlyExitCount: s.earlyExitOccurrences,
          exceptions: s.unresolvedExceptions,
          reviewStatus: capitalize(s.reviewState.replace(/_/g, ' ')),
          payrollReadiness: capitalize(s.payrollReadiness.replace(/_/g, ' ')),
        };
      });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R03 — ATTENDANCE TREND
  // ════════════════════════════════════════════════════════════════════════

  async queryR03AttendanceTrend(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      gte(employeeAttendance.date, startDate),
      lte(employeeAttendance.date, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        date: employeeAttendance.date,
        status: employeeAttendance.status,
        isLate: employeeAttendance.isLate,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        locationName: locations.name,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(and(...conditions));

    // Group by period (Month or Date) + Department
    const groupMap = new Map<string, {
      period: string;
      departmentBranch: string;
      scheduledDays: number;
      presentDays: number;
      absentDays: number;
      leaveDays: number;
      lateCount: number;
    }>();

    for (const r of rows) {
      const period = r.date.slice(0, 7); // Monthly period grouping
      const dept = r.departmentName || 'General';
      const branch = r.locationName || 'Main';
      const key = `${period}__${dept} / ${branch}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          period,
          departmentBranch: `${dept} / ${branch}`,
          scheduledDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          lateCount: 0,
        });
      }

      const item = groupMap.get(key)!;
      item.scheduledDays += 1;
      if (r.status === 'present') item.presentDays += 1;
      else if (r.status === 'half_day') item.presentDays += 0.5;
      else if (r.status === 'absent') item.absentDays += 1;
      else if (r.status === 'on_leave') item.leaveDays += 1;

      if (r.isLate) item.lateCount += 1;
    }

    return Array.from(groupMap.values()).map((g) => {
      const attendanceRate = g.scheduledDays > 0 ? Number(((g.presentDays / g.scheduledDays) * 100).toFixed(1)) : 'N/A';
      const absenceRate = g.scheduledDays > 0 ? Number(((g.absentDays / g.scheduledDays) * 100).toFixed(1)) : 'N/A';

      return {
        period: g.period,
        departmentBranch: g.departmentBranch,
        scheduledEmployeeDays: g.scheduledDays,
        presentEquivalentDays: g.presentDays,
        absentEquivalentDays: g.absentDays,
        leaveEquivalentDays: g.leaveDays,
        attendanceRate,
        absenceRate,
        lateOccurrences: g.lateCount,
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R04 — WORKING HOURS
  // ════════════════════════════════════════════════════════════════════════

  async queryR04WorkingHours(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 10);
    const endDate = (filters.endDate as string) || startDate;

    const conditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      gte(employeeAttendance.date, startDate),
      lte(employeeAttendance.date, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        date: employeeAttendance.date,
        employeeId: employeeAttendance.employeeId,
        workedMinutes: employeeAttendance.workedMinutes,
        status: employeeAttendance.status,
        processingState: employeeAttendance.processingState,
        shiftScheduleRef: employeeAttendance.shiftScheduleRef,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(employeeAttendance.date));

    return rows.map((r) => {
      const scheduledMinutes = 480; // Standard 8h shift
      const actualWorkedMinutes = r.workedMinutes;
      const policyCreditedMinutes = r.status === 'present' ? actualWorkedMinutes : r.status === 'half_day' ? 240 : 0;
      const differenceMinutes = policyCreditedMinutes - scheduledMinutes;

      return {
        datePeriod: r.date,
        employeeId: r.employeeCode || r.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        shift: r.shiftScheduleRef ?? 'Standard Shift (8h)',
        scheduledMinutes,
        actualWorkedMinutes,
        policyCreditedMinutes,
        differenceMinutes,
        processingStatus: capitalize(r.processingState),
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R05 — LATE ARRIVAL & EARLY EXIT
  // ════════════════════════════════════════════════════════════════════════

  async queryR05LateAndEarlyExit(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 10);
    const endDate = (filters.endDate as string) || startDate;

    const conditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      gte(employeeAttendance.date, startDate),
      lte(employeeAttendance.date, endDate),
      or(eq(employeeAttendance.isLate, true), eq(employeeAttendance.isEarlyExit, true)),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        date: employeeAttendance.date,
        employeeId: employeeAttendance.employeeId,
        checkInTime: employeeAttendance.checkInTime,
        checkOutTime: employeeAttendance.checkOutTime,
        lateMinutes: employeeAttendance.lateMinutes,
        earlyMinutes: employeeAttendance.earlyMinutes,
        isLate: employeeAttendance.isLate,
        isEarlyExit: employeeAttendance.isEarlyExit,
        shiftScheduleRef: employeeAttendance.shiftScheduleRef,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(employeeAttendance.date));

    return rows.map((r) => {
      let policyViolationStatus = 'Compliant';
      if (r.isLate && r.isEarlyExit) policyViolationStatus = 'Dual Violation';
      else if (r.isLate) policyViolationStatus = 'Late Arrival';
      else if (r.isEarlyExit) policyViolationStatus = 'Early Exit';

      const graceApplied = (r.lateMinutes > 0 && r.lateMinutes <= 15) ? 'Yes (15m)' : 'No';

      return {
        date: r.date,
        employeeId: r.employeeCode || r.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        shift: r.shiftScheduleRef ?? 'Morning Shift (09:00 - 18:00)',
        expectedIn: '09:00 AM',
        actualIn: r.checkInTime ? formatTimeDisplay(r.checkInTime) : '—',
        lateMinutes: r.lateMinutes,
        expectedOut: '06:00 PM',
        actualOut: r.checkOutTime ? formatTimeDisplay(r.checkOutTime) : '—',
        earlyExitMinutes: r.earlyMinutes,
        graceApplied,
        policyViolationStatus,
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R06 — OVERTIME
  // ════════════════════════════════════════════════════════════════════════

  async queryR06Overtime(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 10);
    const endDate = (filters.endDate as string) || startDate;

    const conditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      gte(employeeAttendance.date, startDate),
      lte(employeeAttendance.date, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        date: employeeAttendance.date,
        employeeId: employeeAttendance.employeeId,
        workedMinutes: employeeAttendance.workedMinutes,
        processingState: employeeAttendance.processingState,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(employeeAttendance.date));

    return rows.map((r) => {
      const scheduledMinutes = 480;
      const actualWorkedHours = Number((r.workedMinutes / 60).toFixed(2));
      const extraWorkedHours = Math.max(0, Number(((r.workedMinutes - scheduledMinutes) / 60).toFixed(2)));

      return {
        date: r.date,
        employeeId: r.employeeCode || r.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        scheduledHours: 8.0,
        actualWorkedHours,
        extraWorkedHours,
        approvedOtHours: 'N/A', // Rule: do not invent approved overtime without dedicated approval workflow
        approvalStatus: 'N/A',
        otPolicy: 'Pre-Approval Required',
        processingStatus: capitalize(r.processingState),
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R07 — ABSENTEEISM
  // ════════════════════════════════════════════════════════════════════════

  async queryR07Absenteeism(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      gte(employeeAttendance.date, startDate),
      lte(employeeAttendance.date, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        date: employeeAttendance.date,
        employeeId: employeeAttendance.employeeId,
        status: employeeAttendance.status,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(employeeAttendance.employeeId, employeeAttendance.date);

    // Group per employee
    const empMap = new Map<string, {
      code: string;
      name: string;
      dept: string;
      scheduledDays: number;
      absentDays: number;
      consecutiveDays: number;
      currentConsecutive: number;
    }>();

    for (const r of rows) {
      if (!empMap.has(r.employeeId)) {
        empMap.set(r.employeeId, {
          code: r.employeeCode || r.employeeId,
          name: `${r.firstName} ${r.lastName || ''}`.trim(),
          dept: r.departmentName ?? 'Unassigned',
          scheduledDays: 0,
          absentDays: 0,
          consecutiveDays: 0,
          currentConsecutive: 0,
        });
      }

      const item = empMap.get(r.employeeId)!;
      item.scheduledDays += 1;
      if (r.status === 'absent') {
        item.absentDays += 1;
        item.currentConsecutive += 1;
        if (item.currentConsecutive > item.consecutiveDays) {
          item.consecutiveDays = item.currentConsecutive;
        }
      } else {
        item.currentConsecutive = 0;
      }
    }

    return Array.from(empMap.values()).map((e) => {
      const absenceRate = e.scheduledDays > 0 ? Number(((e.absentDays / e.scheduledDays) * 100).toFixed(1)) : 'N/A';
      return {
        employeeId: e.code,
        employeeName: e.name,
        department: e.dept,
        period: `${startDate} to ${endDate}`,
        eligibleScheduledDays: e.scheduledDays,
        absentEquivalentDays: e.absentDays,
        absenceRate,
        consecutiveAbsenceDays: e.consecutiveDays,
        unresolvedAbsenceIssues: e.consecutiveDays >= 3 ? 1 : 0,
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R08 — LEAVE IMPACT
  // ════════════════════════════════════════════════════════════════════════

  async queryR08LeaveImpact(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(employeeLeaveRequests.tenantId, tenantId),
      eq(employeeLeaveRequests.companyId, companyId),
      lte(employeeLeaveRequests.startDate, endDate),
      gte(employeeLeaveRequests.endDate, startDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeLeaveRequests.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        id: employeeLeaveRequests.id,
        employeeId: employeeLeaveRequests.employeeId,
        leaveType: employeeLeaveRequests.leaveType,
        startDate: employeeLeaveRequests.startDate,
        endDate: employeeLeaveRequests.endDate,
        totalDays: employeeLeaveRequests.totalDays,
        status: employeeLeaveRequests.status,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(employeeLeaveRequests)
      .innerJoin(employees, eq(employeeLeaveRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(employeeLeaveRequests.startDate));

    return rows.map((r) => ({
      employeeId: r.employeeCode || r.employeeId,
      employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
      department: r.departmentName ?? 'Unassigned',
      leaveType: capitalize(r.leaveType),
      leaveStart: r.startDate,
      leaveEnd: r.endDate,
      approvedLeaveEquivalentDays: r.totalDays,
      attendanceCoverage: r.status === 'approved' ? 'Full Day Protected' : 'Pending Verification',
      overlapConflictStatus: 'No Conflict',
      approvalStatus: capitalize(r.status),
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  // R09 — MISSING PUNCH
  // ════════════════════════════════════════════════════════════════════════

  async queryR09MissingPunch(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(employeeAttendance.tenantId, tenantId),
      eq(employeeAttendance.companyId, companyId),
      eq(employeeAttendance.isMissingPunch, true),
      gte(employeeAttendance.date, startDate),
      lte(employeeAttendance.date, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(employeeAttendance.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        id: employeeAttendance.id,
        date: employeeAttendance.date,
        employeeId: employeeAttendance.employeeId,
        checkInTime: employeeAttendance.checkInTime,
        checkOutTime: employeeAttendance.checkOutTime,
        shiftScheduleRef: employeeAttendance.shiftScheduleRef,
        isRegularized: employeeAttendance.isRegularized,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(employeeAttendance.date));

    const todayMs = new Date().getTime();

    return rows.map((r) => {
      const missingDirection = !r.checkInTime ? 'Missing In' : !r.checkOutTime ? 'Missing Out' : 'Both Missing';
      const availablePunch = r.checkInTime ? formatTimeDisplay(r.checkInTime) : r.checkOutTime ? formatTimeDisplay(r.checkOutTime) : 'None';
      const rowDateMs = new Date(r.date).getTime();
      const agingDays = Math.max(0, Math.floor((todayMs - rowDateMs) / (1000 * 60 * 60 * 24)));

      return {
        workDate: r.date,
        employeeId: r.employeeCode || r.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        shift: r.shiftScheduleRef ?? 'Standard Shift',
        missingInOut: missingDirection,
        availablePunchTime: availablePunch,
        exceptionReference: `EXP-${r.id.slice(0, 8).toUpperCase()}`,
        resolutionStatus: r.isRegularized ? 'Resolved' : 'Pending',
        agingDays,
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R10 — ATTENDANCE EXCEPTIONS
  // ════════════════════════════════════════════════════════════════════════

  async queryR10AttendanceExceptions(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(attendanceExceptions.tenantId, tenantId),
      eq(attendanceExceptions.companyId, companyId),
      gte(attendanceExceptions.workday, startDate),
      lte(attendanceExceptions.workday, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(attendanceExceptions.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        ex: attendanceExceptions,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(attendanceExceptions)
      .innerJoin(employees, eq(attendanceExceptions.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceExceptions.createdAt));

    const todayMs = new Date().getTime();

    return rows.map((r) => {
      const e = r.ex;
      const createdMs = e.createdAt.getTime();
      const agingDays = Math.max(0, Math.floor((todayMs - createdMs) / (1000 * 60 * 60 * 24)));

      return {
        exceptionId: e.id,
        workDate: e.workday,
        employeeId: r.employeeCode || e.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        exceptionType: capitalize(e.exceptionType.replace(/_/g, ' ')),
        severity: capitalize(e.severity),
        status: capitalize(e.status.replace(/_/g, ' ')),
        assignedTo: e.assignedTo ?? 'Unassigned',
        createdAt: e.createdAt.toISOString().slice(0, 10),
        agingDays,
        resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString().slice(0, 10) : '—',
        resolutionType: e.resolutionType ? capitalize(e.resolutionType.replace(/_/g, ' ')) : 'Pending',
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R11 — REGULARIZATION
  // ════════════════════════════════════════════════════════════════════════

  async queryR11Regularization(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(attendanceRegularizations.tenantId, tenantId),
      eq(attendanceRegularizations.companyId, companyId),
      gte(attendanceRegularizations.workday, startDate),
      lte(attendanceRegularizations.workday, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(attendanceRegularizations.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        reg: attendanceRegularizations,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(attendanceRegularizations)
      .innerJoin(employees, eq(attendanceRegularizations.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRegularizations.submittedAt));

    return rows.map((r) => {
      const reg = r.reg;
      return {
        requestId: reg.requestNumber || reg.id,
        employeeId: r.employeeCode || reg.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        affectedDate: reg.workday,
        requestType: capitalize(reg.requestType.replace(/_/g, ' ')),
        submittedAt: reg.submittedAt.toISOString().slice(0, 10),
        approvalStatus: capitalize(reg.approvalStatus.replace(/_/g, ' ')),
        processingStatus: capitalize(reg.applicationStatus.replace(/_/g, ' ')),
        reviewer: reg.assignedTo ?? 'Manager / HR',
        decisionAt: reg.decidedAt ? reg.decidedAt.toISOString().slice(0, 10) : '—',
        appliedCorrectionReference: reg.appliedAdjustmentId ?? (reg.applicationStatus === 'applied' ? 'ADJ-AUTO' : '—'),
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R12 — ON-DUTY
  // ════════════════════════════════════════════════════════════════════════

  async queryR12OnDuty(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(attendanceOnDutyRequests.tenantId, tenantId),
      eq(attendanceOnDutyRequests.companyId, companyId),
      gte(attendanceOnDutyRequests.startDate, startDate),
      lte(attendanceOnDutyRequests.endDate, endDate),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(attendanceOnDutyRequests.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        od: attendanceOnDutyRequests,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(attendanceOnDutyRequests)
      .innerJoin(employees, eq(attendanceOnDutyRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceOnDutyRequests.startDate));

    return rows.map((r) => {
      const od = r.od;
      const reqDur = od.durationHours ? `${od.durationHours}h` : 'Full Day';
      const appDur = od.status === 'approved' ? (od.durationHours ? `${od.durationHours}h` : 'Full Day') : '—';
      const creditDays = od.status === 'approved' ? (od.durationType === 'half_day' ? 0.5 : 1) : 0;

      return {
        odRequestId: od.requestNumber || od.id,
        employeeId: r.employeeCode || od.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        odStart: od.startDate,
        odEnd: od.endDate,
        requestedDuration: reqDur,
        approvedDuration: appDur,
        appliedCredit: creditDays,
        approvalStatus: capitalize(od.status.replace(/_/g, ' ')),
        processingStatus: capitalize(od.processingStatus.replace(/_/g, ' ')),
        reviewer: od.reviewedByUserId ? 'Authorized Reviewer' : 'Pending',
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R13 — PAYROLL READINESS
  // ════════════════════════════════════════════════════════════════════════

  async queryR13PayrollReadiness(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const month = (filters.month as string) || new Date().toISOString().slice(0, 7);

    const conditions = [
      eq(attendanceMonthlySummaries.tenantId, tenantId),
      eq(attendanceMonthlySummaries.companyId, companyId),
      eq(attendanceMonthlySummaries.month, month),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(attendanceMonthlySummaries.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        summary: attendanceMonthlySummaries,
        eval: attendanceMonthlyReadinessEvaluations,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(attendanceMonthlySummaries)
      .innerJoin(employees, eq(attendanceMonthlySummaries.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        attendanceMonthlyReadinessEvaluations,
        eq(attendanceMonthlySummaries.id, attendanceMonthlyReadinessEvaluations.monthlySummaryId),
      )
      .where(and(...conditions));

    return rows.map((r) => {
      const s = r.summary;
      const ev = r.eval;
      const blockingReasons = ev?.blockingChecks && Array.isArray(ev.blockingChecks) && ev.blockingChecks.length > 0
        ? ev.blockingChecks.map((b) => b.name).join('; ')
        : 'None';

      return {
        attendanceMonth: s.month,
        employeeId: r.employeeCode || s.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        scheduledDays: s.scheduledDays,
        presentEquivalent: Number(s.presentDays),
        leaveEquivalent: Number(s.leaveDays),
        odCoverage: Number(s.onDutyDays),
        unresolvedExceptions: s.unresolvedExceptions,
        pendingCorrections: s.pendingCorrections,
        reviewStatus: capitalize(s.reviewState.replace(/_/g, ' ')),
        readinessStatus: capitalize(s.payrollReadiness.replace(/_/g, ' ')),
        blockingReasons,
        lockState: s.isLocked ? 'Locked' : 'Open',
        evaluatedAt: ev?.evaluatedAt ? ev.evaluatedAt.toISOString().slice(0, 10) : s.lastCalculatedAt.toISOString().slice(0, 10),
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R14 — MONTHLY REVIEW
  // ════════════════════════════════════════════════════════════════════════

  async queryR14MonthlyReview(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
    scopedEmployeeIds?: string[],
  ) {
    const { filters } = options;
    const month = (filters.month as string) || new Date().toISOString().slice(0, 7);

    const conditions = [
      eq(attendanceMonthlySummaries.tenantId, tenantId),
      eq(attendanceMonthlySummaries.companyId, companyId),
      eq(attendanceMonthlySummaries.month, month),
    ];
    if (scopedEmployeeIds && scopedEmployeeIds.length > 0) {
      conditions.push(inArray(attendanceMonthlySummaries.employeeId, scopedEmployeeIds));
    }

    const rows = await this.db
      .select({
        summary: attendanceMonthlySummaries,
        rev: attendanceMonthlyReviews,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentName: departments.name,
      })
      .from(attendanceMonthlySummaries)
      .innerJoin(employees, eq(attendanceMonthlySummaries.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        attendanceMonthlyReviews,
        eq(attendanceMonthlySummaries.id, attendanceMonthlyReviews.monthlySummaryId),
      )
      .where(and(...conditions));

    return rows.map((r) => {
      const s = r.summary;
      const rev = r.rev;

      return {
        attendanceMonth: s.month,
        employeeId: r.employeeCode || s.employeeId,
        employeeName: `${r.firstName} ${r.lastName || ''}`.trim(),
        department: r.departmentName ?? 'Unassigned',
        assignedReviewer: s.assignedReviewerId ?? 'Unassigned',
        reviewState: capitalize(s.reviewState.replace(/_/g, ' ')),
        reviewedVersion: rev?.reviewedSummaryVersion ?? s.reviewedVersion ?? s.version,
        currentSummaryVersion: s.version,
        reviewStartedAt: s.assignedAt ? s.assignedAt.toISOString().slice(0, 10) : '—',
        reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString().slice(0, 10) : '—',
        reopenedAt: s.reviewState === 'reopened' ? s.updatedAt.toISOString().slice(0, 10) : '—',
        reopenReason: s.reopenReason ?? '—',
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // R15 — ATTENDANCE AUDIT (SENSITIVE)
  // ════════════════════════════════════════════════════════════════════════

  async queryR15AttendanceAudit(
    tenantId: string,
    companyId: string,
    options: ReportQueryOptions,
  ) {
    const { filters } = options;
    const startDate = (filters.startDate as string) || new Date().toISOString().slice(0, 8) + '01';
    const endDate = (filters.endDate as string) || new Date().toISOString().slice(0, 10);

    const conditions = [
      eq(auditLogs.tenantId, tenantId),
      eq(auditLogs.companyId, companyId),
      gte(auditLogs.createdAt, new Date(startDate)),
      lte(auditLogs.createdAt, new Date(`${endDate}T23:59:59.999Z`)),
    ];

    const logs = await this.db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        actorUserId: auditLogs.actorUserId,
        actorEmail: auditLogs.actorEmail,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
      })
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(500);

    return logs.map((l) => {
      const meta = l.metadata || {};
      const beforeStr = meta.before ? maskSensitiveData(JSON.stringify(meta.before)) : '—';
      const afterStr = meta.after ? maskSensitiveData(JSON.stringify(meta.after)) : '—';
      const reason = typeof meta.reason === 'string' ? meta.reason : 'System Event';

      return {
        eventId: l.id,
        timestamp: l.createdAt.toISOString().replace('T', ' ').slice(0, 19),
        actor: l.actorEmail || l.actorUserId || 'system',
        employeeReference: (meta.employeeId as string) || l.targetId,
        sourceModule: capitalize(l.targetType.replace(/_/g, ' ')),
        entityReference: l.targetId,
        action: capitalize(l.action.replace(/_/g, ' ')),
        beforeValue: beforeStr,
        afterValue: afterStr,
        reason,
        sourceVersion: (meta.version as string) ? String(meta.version) : '1',
        companyReference: companyId,
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SAVED REPORT CONFIGURATIONS PERSISTENCE
  // ════════════════════════════════════════════════════════════════════════

  async listSavedReports(
    tenantId: string,
    companyId: string,
    ownerUserId: string,
    reportId?: ReportId,
  ): Promise<AttendanceSavedReport[]> {
    const conditions = [
      eq(attendanceSavedReports.tenantId, tenantId),
      eq(attendanceSavedReports.companyId, companyId),
      eq(attendanceSavedReports.ownerUserId, ownerUserId),
    ];
    if (reportId) {
      conditions.push(eq(attendanceSavedReports.reportId, reportId));
    }

    return this.db
      .select()
      .from(attendanceSavedReports)
      .where(and(...conditions))
      .orderBy(desc(attendanceSavedReports.createdAt));
  }

  async findSavedReportById(
    tenantId: string,
    companyId: string,
    id: string,
    ownerUserId: string,
  ): Promise<AttendanceSavedReport | undefined> {
    const [found] = await this.db
      .select()
      .from(attendanceSavedReports)
      .where(
        and(
          eq(attendanceSavedReports.id, id),
          eq(attendanceSavedReports.tenantId, tenantId),
          eq(attendanceSavedReports.companyId, companyId),
          eq(attendanceSavedReports.ownerUserId, ownerUserId),
        ),
      );
    return found;
  }

  async createSavedReport(item: NewAttendanceSavedReport): Promise<AttendanceSavedReport> {
    await this.db.insert(attendanceSavedReports).values(item);
    const found = await this.findSavedReportById(item.tenantId, item.companyId, item.id, item.ownerUserId);
    return found!;
  }

  async updateSavedReport(
    tenantId: string,
    companyId: string,
    id: string,
    ownerUserId: string,
    updates: Partial<AttendanceSavedReport>,
  ): Promise<AttendanceSavedReport | undefined> {
    await this.db
      .update(attendanceSavedReports)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceSavedReports.id, id),
          eq(attendanceSavedReports.tenantId, tenantId),
          eq(attendanceSavedReports.companyId, companyId),
          eq(attendanceSavedReports.ownerUserId, ownerUserId),
        ),
      );
    return this.findSavedReportById(tenantId, companyId, id, ownerUserId);
  }

  async deleteSavedReport(
    tenantId: string,
    companyId: string,
    id: string,
    ownerUserId: string,
  ): Promise<boolean> {
    const res = await this.db
      .delete(attendanceSavedReports)
      .where(
        and(
          eq(attendanceSavedReports.id, id),
          eq(attendanceSavedReports.tenantId, tenantId),
          eq(attendanceSavedReports.companyId, companyId),
          eq(attendanceSavedReports.ownerUserId, ownerUserId),
        ),
      );
    const [header] = res as unknown as [{ affectedRows?: number }, unknown];
    return (header?.affectedRows ?? 0) > 0;
  }

  // ════════════════════════════════════════════════════════════════════════
  // REPORT GENERATION & DOWNLOAD HISTORY PERSISTENCE
  // ════════════════════════════════════════════════════════════════════════

  async listGenerations(
    tenantId: string,
    companyId: string,
    actorUserId?: string,
    reportId?: ReportId,
    limit = 50,
  ): Promise<AttendanceReportGeneration[]> {
    const conditions = [
      eq(attendanceReportGenerations.tenantId, tenantId),
      eq(attendanceReportGenerations.companyId, companyId),
    ];
    if (actorUserId) {
      conditions.push(eq(attendanceReportGenerations.actorUserId, actorUserId));
    }
    if (reportId) {
      conditions.push(eq(attendanceReportGenerations.reportId, reportId));
    }

    return this.db
      .select()
      .from(attendanceReportGenerations)
      .where(and(...conditions))
      .orderBy(desc(attendanceReportGenerations.createdAt))
      .limit(limit);
  }

  async findGenerationById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<AttendanceReportGeneration | undefined> {
    const [found] = await this.db
      .select()
      .from(attendanceReportGenerations)
      .where(
        and(
          eq(attendanceReportGenerations.id, id),
          eq(attendanceReportGenerations.tenantId, tenantId),
          eq(attendanceReportGenerations.companyId, companyId),
        ),
      );
    return found;
  }

  async createGeneration(item: NewAttendanceReportGeneration): Promise<AttendanceReportGeneration> {
    await this.db.insert(attendanceReportGenerations).values(item);
    const found = await this.findGenerationById(item.tenantId, item.companyId, item.id);
    return found!;
  }
}

function capitalize(s?: string | null): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTimeDisplay(t?: string | null): string {
  if (!t) return '—';
  const parts = t.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0]!, 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${String(displayH).padStart(2, '0')}:${m} ${ampm}`;
  }
  return t;
}

function maskSensitiveData(str: string): string {
  return str.replace(
    /"(password|token|secret|credential|authKey)":\s*"[^"]+"/gi,
    '"$1":"[REDACTED]"',
  );
}

export const attendanceReportsRepository = new AttendanceReportsRepository();
