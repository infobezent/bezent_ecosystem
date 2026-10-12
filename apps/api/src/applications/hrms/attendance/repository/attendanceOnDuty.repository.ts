import { and, desc, eq, gte, lte, sql, or, like, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  attendanceOnDutyRequests,
  attendanceOnDutyWorkdays,
  attendanceOnDutyAudits,
  employees,
  departments,
  locations,
  users,
  employeeLeaveRequests,
  attendanceRegularizations,
  attendancePeriods,
  attendanceExceptions,
  employeeNotifications,
  type NewAttendanceOnDutyRequestRecord,
  type NewAttendanceOnDutyWorkdayRecord,
  type NewAttendanceOnDutyAuditRecord,
} from '../../../../db/schema.js';
import type {
  OnDutyFilterV1,
  OnDutyItemV1,
  OnDutyDetailV1,
  OnDutySummaryCounters,
  OnDutyQueryResultV1,
  OnDutyApprovalStatus,
  OnDutyProcessingStatus,
  OnDutyDurationType,
} from '../types/attendance.types.js';

export class AttendanceOnDutyRepository {
  /**
   * Helper to format human-readable duty period
   */
  formatDutyPeriod(startDate: string, endDate: string): string {
    const formatDate = (dStr: string) => {
      const d = new Date(`${dStr}T00:00:00Z`);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const month = months[d.getUTCMonth()];
      const day = String(d.getUTCDate()).padStart(2, '0');
      const year = d.getUTCFullYear();
      const weekday = days[d.getUTCDay()];
      return { text: `${month} ${day}, ${year}`, weekday: weekday || '' };
    };

    const s = formatDate(startDate);
    if (startDate === endDate) {
      return `${s.text} (${s.weekday})`;
    }
    const e = formatDate(endDate);
    return `${s.text} – ${e.text} (${s.weekday} – ${e.weekday})`;
  }

  /**
   * Generates sequential request number like OD-2026-00001
   */
  async generateNextRequestNumber(companyId: string): Promise<string> {
    const db = getDb();
    const year = new Date().getFullYear();
    const prefix = `OD-${year}-`;

    const [latest] = await db
      .select({ requestNumber: attendanceOnDutyRequests.requestNumber })
      .from(attendanceOnDutyRequests)
      .where(
        and(
          eq(attendanceOnDutyRequests.companyId, companyId),
          like(attendanceOnDutyRequests.requestNumber, `${prefix}%`),
        ),
      )
      .orderBy(desc(attendanceOnDutyRequests.requestNumber))
      .limit(1);

    if (!latest || !latest.requestNumber) {
      return `${prefix}00001`;
    }

    const lastNum = parseInt(latest.requestNumber.replace(prefix, ''), 10);
    const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  async createRequest(
    data: NewAttendanceOnDutyRequestRecord,
  ): Promise<NewAttendanceOnDutyRequestRecord> {
    const db = getDb();
    await db.insert(attendanceOnDutyRequests).values(data);
    return data;
  }

  async updateRequest(
    tenantId: string,
    companyId: string,
    id: string,
    patch: Partial<NewAttendanceOnDutyRequestRecord>,
  ) {
    const db = getDb();
    await db
      .update(attendanceOnDutyRequests)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(attendanceOnDutyRequests.id, id),
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
        ),
      );
    return this.getRequestById(tenantId, companyId, id);
  }

  async getRequestById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnDutyDetailV1 | null> {
    const db = getDb();

    const [row] = await db
      .select({
        req: attendanceOnDutyRequests,
        emp: {
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          employeeCode: employees.employeeNumber,
          departmentId: employees.departmentId,
        },
        dept: {
          name: departments.name,
        },
        reviewerUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceOnDutyRequests)
      .innerJoin(employees, eq(attendanceOnDutyRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(users, eq(attendanceOnDutyRequests.assignedTo, users.id))
      .where(
        and(
          eq(attendanceOnDutyRequests.id, id),
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
        ),
      )
      .limit(1);

    if (!row) return null;

    // Load workdays
    const workdays = await db
      .select()
      .from(attendanceOnDutyWorkdays)
      .where(eq(attendanceOnDutyWorkdays.onDutyRequestId, id))
      .orderBy(attendanceOnDutyWorkdays.workday);

    // Load audits
    const audits = await db
      .select()
      .from(attendanceOnDutyAudits)
      .where(eq(attendanceOnDutyAudits.onDutyRequestId, id))
      .orderBy(desc(attendanceOnDutyAudits.createdAt));

    // Check conflicts context
    const [leaveConflict, regConflict, isPayrollLocked] = await Promise.all([
      this.checkOverlappingLeave(tenantId, companyId, row.req.employeeId, row.req.startDate, row.req.endDate),
      this.checkOverlappingRegularization(tenantId, companyId, row.req.employeeId, row.req.startDate, row.req.endDate),
      this.checkDateInLockedPeriod(tenantId, companyId, row.req.startDate, row.req.endDate),
    ]);

    const employeeName = `${row.emp.firstName} ${row.emp.lastName || ''}`.trim();
    const dutyPeriodDisplay = this.formatDutyPeriod(row.req.startDate, row.req.endDate);

    return {
      id: row.req.id,
      requestNumber: row.req.requestNumber || `OD-${row.req.id.slice(-5).toUpperCase()}`,
      employeeId: row.req.employeeId,
      employeeName,
      employeeCode: row.emp.employeeCode,
      departmentName: row.dept?.name ?? null,
      odTypeId: row.req.odTypeId,
      odTypeName: row.req.odTypeName,
      startDate: row.req.startDate,
      endDate: row.req.endDate,
      startTime: row.req.startTime,
      endTime: row.req.endTime,
      dutyPeriodDisplay,
      durationType: row.req.durationType as OnDutyDurationType,
      durationHours: Number(row.req.durationHours || 8),
      halfDaySession: row.req.halfDaySession,
      locationOrSite: row.req.locationOrSite,
      purpose: row.req.reason,
      projectReference: row.req.projectReference,
      submittedAt: (row.req.submittedAt || row.req.createdAt).toISOString(),
      submittedByUserId: row.req.submittedByUserId,
      assignedTo: row.req.assignedTo,
      assignedToName: row.reviewerUser
        ? `${row.reviewerUser.firstName} ${row.reviewerUser.lastName || ''}`.trim()
        : null,
      assignedRole: row.req.assignedRole,
      approvalStatus: row.req.status as OnDutyApprovalStatus,
      status: row.req.status as OnDutyApprovalStatus,
      currentStage: row.req.currentStage,
      processingStatus: row.req.processingStatus as OnDutyProcessingStatus,
      isHighRisk: row.req.isHighRisk,
      riskFactors: row.req.riskFactors,
      evidenceAttachments: row.req.evidenceAttachments,
      decisionReason: row.req.decisionReason,
      reviewedByUserId: row.req.reviewedByUserId,
      reviewedAt: row.req.reviewedAt?.toISOString() ?? null,
      clarificationNotes: row.req.clarificationNotes,
      clarificationRequestedAt: row.req.clarificationRequestedAt?.toISOString() ?? null,
      clarificationResponse: row.req.clarificationResponse,
      clarificationProvidedAt: row.req.clarificationProvidedAt?.toISOString() ?? null,
      appliedAt: row.req.appliedAt?.toISOString() ?? null,
      appliedByUserId: row.req.appliedByUserId,
      processingError: row.req.processingError,
      processingBlockedReason: row.req.processingBlockedReason,
      attendanceContext: {
        shiftSchedule: {
          startTime: '09:00 AM',
          endTime: '06:00 PM',
          shiftName: 'General Shift (GS-0918)',
        },
        recordedPunchesSummary: 'No punches recorded',
        leaveConflict: leaveConflict ? 'Overlapping leave approved' : null,
        otherOdOverlap: null,
        regularizationConflict: regConflict ? 'Pending regularization on date' : null,
        isPayrollLocked,
      },
      workdays: workdays.map((w) => ({
        id: w.id,
        workday: w.workday,
        durationType: w.durationType,
        durationHours: Number(w.durationHours),
        halfDaySession: w.halfDaySession,
        creditedStatus: w.creditedStatus,
        creditedWorkedMinutes: w.creditedWorkedMinutes,
        processingStatus: w.processingStatus,
        errorMessage: w.errorMessage,
        blockedReason: w.blockedReason,
        appliedAt: w.appliedAt?.toISOString() ?? null,
      })),
      audits: audits.map((a) => ({
        id: a.id,
        action: a.action,
        actorUserId: a.actorUserId,
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  async getRequests(
    tenantId: string,
    companyId: string,
    filter: OnDutyFilterV1,
  ): Promise<OnDutyQueryResultV1> {
    const db = getDb();
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, Math.max(5, filter.pageSize || 10));
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(attendanceOnDutyRequests.tenantId, tenantId),
      eq(attendanceOnDutyRequests.companyId, companyId),
    ];

    if (filter.employeeId) {
      conditions.push(eq(attendanceOnDutyRequests.employeeId, filter.employeeId));
    }

    if (filter.startDate && filter.endDate) {
      conditions.push(
        and(
          lte(attendanceOnDutyRequests.startDate, filter.endDate),
          gte(attendanceOnDutyRequests.endDate, filter.startDate),
        )!,
      );
    } else if (filter.startDate) {
      conditions.push(gte(attendanceOnDutyRequests.endDate, filter.startDate));
    } else if (filter.endDate) {
      conditions.push(lte(attendanceOnDutyRequests.startDate, filter.endDate));
    }

    if (filter.approvalStatus && filter.approvalStatus !== 'all') {
      conditions.push(eq(attendanceOnDutyRequests.status, filter.approvalStatus as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn' | 'awaiting_info' | 'cancelled'));
    }

    if (filter.odTypeId && filter.odTypeId !== 'all') {
      conditions.push(eq(attendanceOnDutyRequests.odTypeId, filter.odTypeId));
    }

    if (filter.processingStatus && filter.processingStatus !== 'all') {
      conditions.push(
        eq(
          attendanceOnDutyRequests.processingStatus,
          filter.processingStatus as
            | 'not_applicable'
            | 'pending'
            | 'applied'
            | 'partially_applied'
            | 'processing_issues'
            | 'blocked'
            | 'failed',
        ),
      );
    }

    if (filter.durationType && filter.durationType !== 'all') {
      conditions.push(eq(attendanceOnDutyRequests.durationType, filter.durationType as 'full_day' | 'half_day' | 'hourly' | 'multi_day'));
    }

    if (filter.assignedTo && filter.assignedTo !== 'all') {
      if (filter.assignedTo === 'unassigned') {
        conditions.push(sql`${attendanceOnDutyRequests.assignedTo} IS NULL`);
      } else {
        conditions.push(eq(attendanceOnDutyRequests.assignedTo, filter.assignedTo));
      }
    }

    if (filter.departmentId && filter.departmentId !== 'all') {
      conditions.push(eq(employees.departmentId, filter.departmentId));
    }

    if (filter.locationId && filter.locationId !== 'all') {
      conditions.push(eq(employees.locationId, filter.locationId));
    }

    if (filter.submittedFrom) {
      conditions.push(gte(attendanceOnDutyRequests.submittedAt, new Date(filter.submittedFrom)));
    }
    if (filter.submittedTo) {
      conditions.push(lte(attendanceOnDutyRequests.submittedAt, new Date(`${filter.submittedTo}T23:59:59`)));
    }

    if (filter.search && filter.search.trim()) {
      const q = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(attendanceOnDutyRequests.requestNumber, q),
          like(employees.firstName, q),
          like(employees.lastName, q),
          like(employees.employeeNumber, q),
          like(attendanceOnDutyRequests.reason, q),
          like(attendanceOnDutyRequests.locationOrSite, q),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Count Total
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceOnDutyRequests)
      .innerJoin(employees, eq(attendanceOnDutyRequests.employeeId, employees.id))
      .where(whereClause);

    const totalCount = Number(countRow?.count || 0);

    // Fetch Paginated Rows
    const rows = await db
      .select({
        req: attendanceOnDutyRequests,
        emp: {
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          employeeCode: employees.employeeNumber,
          departmentId: employees.departmentId,
        },
        dept: {
          name: departments.name,
        },
        reviewerUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceOnDutyRequests)
      .innerJoin(employees, eq(attendanceOnDutyRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(users, eq(attendanceOnDutyRequests.assignedTo, users.id))
      .where(whereClause)
      .orderBy(desc(attendanceOnDutyRequests.submittedAt), desc(attendanceOnDutyRequests.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: OnDutyItemV1[] = rows.map((r) => {
      const employeeName = `${r.emp.firstName} ${r.emp.lastName || ''}`.trim();
      const dutyPeriodDisplay = this.formatDutyPeriod(r.req.startDate, r.req.endDate);

      return {
        id: r.req.id,
        requestNumber: r.req.requestNumber || `OD-${r.req.id.slice(-5).toUpperCase()}`,
        employeeId: r.req.employeeId,
        employeeName,
        employeeCode: r.emp.employeeCode,
        departmentName: r.dept?.name ?? null,
        odTypeId: r.req.odTypeId,
        odTypeName: r.req.odTypeName,
        startDate: r.req.startDate,
        endDate: r.req.endDate,
        startTime: r.req.startTime,
        endTime: r.req.endTime,
        dutyPeriodDisplay,
        durationType: r.req.durationType as OnDutyDurationType,
        durationHours: Number(r.req.durationHours || 8),
        halfDaySession: r.req.halfDaySession,
        locationOrSite: r.req.locationOrSite,
        purpose: r.req.reason,
        projectReference: r.req.projectReference,
        submittedAt: (r.req.submittedAt || r.req.createdAt).toISOString(),
        assignedTo: r.req.assignedTo,
        assignedToName: r.reviewerUser
          ? `${r.reviewerUser.firstName} ${r.reviewerUser.lastName || ''}`.trim()
          : null,
        assignedRole: r.req.assignedRole,
        approvalStatus: r.req.status as OnDutyApprovalStatus,
        status: r.req.status as OnDutyApprovalStatus,
        currentStage: r.req.currentStage,
        processingStatus: r.req.processingStatus as OnDutyProcessingStatus,
        isHighRisk: r.req.isHighRisk,
        riskFactors: r.req.riskFactors,
        evidenceAttachments: r.req.evidenceAttachments,
      };
    });

    const counters = await this.getSummaryCounters(tenantId, companyId, filter.employeeId);

    return {
      items,
      counters,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
    };
  }

  async getSummaryCounters(
    tenantId: string,
    companyId: string,
    scopedEmployeeId?: string,
  ): Promise<OnDutySummaryCounters> {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const startOfToday = new Date(`${today}T00:00:00.000Z`);

    const baseConditions = [
      eq(attendanceOnDutyRequests.tenantId, tenantId),
      eq(attendanceOnDutyRequests.companyId, companyId),
    ];

    if (scopedEmployeeId) {
      baseConditions.push(eq(attendanceOnDutyRequests.employeeId, scopedEmployeeId));
    }

    const [counts] = await db
      .select({
        pendingReview: sql<number>`SUM(CASE WHEN ${attendanceOnDutyRequests.status} = 'submitted' THEN 1 ELSE 0 END)`,
        underReview: sql<number>`SUM(CASE WHEN ${attendanceOnDutyRequests.status} = 'under_review' THEN 1 ELSE 0 END)`,
        awaitingInfo: sql<number>`SUM(CASE WHEN ${attendanceOnDutyRequests.status} = 'awaiting_info' THEN 1 ELSE 0 END)`,
        approvedToday: sql<number>`SUM(CASE WHEN ${attendanceOnDutyRequests.status} = 'approved' AND ${attendanceOnDutyRequests.reviewedAt} >= ${startOfToday} THEN 1 ELSE 0 END)`,
        processingIssues: sql<number>`SUM(CASE WHEN ${attendanceOnDutyRequests.processingStatus} IN ('processing_issues', 'failed', 'blocked') THEN 1 ELSE 0 END)`,
        upcomingOd: sql<number>`SUM(CASE WHEN ${attendanceOnDutyRequests.status} = 'approved' AND ${attendanceOnDutyRequests.startDate} >= ${today} THEN 1 ELSE 0 END)`,
      })
      .from(attendanceOnDutyRequests)
      .where(and(...baseConditions));

    return {
      pendingReview: Number(counts?.pendingReview || 0),
      underReview: Number(counts?.underReview || 0),
      awaitingInfo: Number(counts?.awaitingInfo || 0),
      approvedToday: Number(counts?.approvedToday || 0),
      processingIssues: Number(counts?.processingIssues || 0),
      upcomingOd: Number(counts?.upcomingOd || 0),
    };
  }

  async checkOverlappingOnDuty(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeId?: string,
  ) {
    const db = getDb();
    const conditions = [
      eq(attendanceOnDutyRequests.tenantId, tenantId),
      eq(attendanceOnDutyRequests.companyId, companyId),
      eq(attendanceOnDutyRequests.employeeId, employeeId),
      inArray(attendanceOnDutyRequests.status, ['submitted', 'under_review', 'approved']),
      lte(attendanceOnDutyRequests.startDate, endDate),
      gte(attendanceOnDutyRequests.endDate, startDate),
    ];

    if (excludeId) {
      conditions.push(sql`${attendanceOnDutyRequests.id} != ${excludeId}`);
    }

    const [overlap] = await db
      .select()
      .from(attendanceOnDutyRequests)
      .where(and(...conditions))
      .limit(1);

    return overlap || null;
  }

  async checkOverlappingLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const db = getDb();
    try {
      const [overlap] = await db
        .select({ id: employeeLeaveRequests.id })
        .from(employeeLeaveRequests)
        .where(
          and(
            eq(employeeLeaveRequests.tenantId, tenantId),
            eq(employeeLeaveRequests.companyId, companyId),
            eq(employeeLeaveRequests.employeeId, employeeId),
            eq(employeeLeaveRequests.status, 'approved'),
            lte(employeeLeaveRequests.startDate, endDate),
            gte(employeeLeaveRequests.endDate, startDate),
          ),
        )
        .limit(1);

      return Boolean(overlap);
    } catch {
      return false;
    }
  }

  async checkOverlappingRegularization(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const db = getDb();
    try {
      const [overlap] = await db
        .select({ id: attendanceRegularizations.id })
        .from(attendanceRegularizations)
        .where(
          and(
            eq(attendanceRegularizations.tenantId, tenantId),
            eq(attendanceRegularizations.companyId, companyId),
            eq(attendanceRegularizations.employeeId, employeeId),
            inArray(attendanceRegularizations.approvalStatus, ['submitted', 'under_review', 'approved']),
            gte(attendanceRegularizations.workday, startDate),
            lte(attendanceRegularizations.workday, endDate),
          ),
        )
        .limit(1);

      return Boolean(overlap);
    } catch {
      return false;
    }
  }

  async checkDateInLockedPeriod(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const db = getDb();
    try {
      const [locked] = await db
        .select({ id: attendancePeriods.id })
        .from(attendancePeriods)
        .where(
          and(
            eq(attendancePeriods.tenantId, tenantId),
            eq(attendancePeriods.companyId, companyId),
            eq(attendancePeriods.status, 'locked'),
            lte(attendancePeriods.startDate, endDate),
            gte(attendancePeriods.endDate, startDate),
          ),
        )
        .limit(1);

      return Boolean(locked);
    } catch {
      return false;
    }
  }

  async createWorkdays(workdays: NewAttendanceOnDutyWorkdayRecord[]): Promise<void> {
    if (workdays.length === 0) return;
    const db = getDb();
    await db.insert(attendanceOnDutyWorkdays).values(workdays);
  }

  async updateWorkday(
    id: string,
    patch: Partial<NewAttendanceOnDutyWorkdayRecord>,
  ): Promise<void> {
    const db = getDb();
    await db
      .update(attendanceOnDutyWorkdays)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(attendanceOnDutyWorkdays.id, id));
  }

  async createAudit(audit: NewAttendanceOnDutyAuditRecord): Promise<void> {
    const db = getDb();
    await db.insert(attendanceOnDutyAudits).values(audit);
  }

  async getAuditsByRequestId(requestId: string) {
    const db = getDb();
    return db
      .select()
      .from(attendanceOnDutyAudits)
      .where(eq(attendanceOnDutyAudits.onDutyRequestId, requestId))
      .orderBy(desc(attendanceOnDutyAudits.createdAt));
  }

  async findEmployeeUserId(employeeId: string): Promise<string | null> {
    const db = getDb();
    const [emp] = await db
      .select({ userId: employees.userId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);
    return emp?.userId ?? null;
  }

  async resolveEmployeeIdForUser(
    tenantId: string,
    companyId: string,
    userId: string,
  ): Promise<string | null> {
    const db = getDb();
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.userId, userId),
        ),
      )
      .limit(1);
    return emp?.id ?? null;
  }

  async autoResolveLinkedExceptions(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workday: string,
    odRequestNumber: string,
    resolvedByUserId?: string,
  ): Promise<number> {
    const db = getDb();
    try {
      const openExceptions = await db
        .select({ id: attendanceExceptions.id })
        .from(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.companyId, companyId),
            eq(attendanceExceptions.employeeId, employeeId),
            eq(attendanceExceptions.workday, workday),
            inArray(attendanceExceptions.status, ['open', 'assigned', 'in_review', 'pending_action']),
          ),
        );

      if (openExceptions.length === 0) return 0;

      await db
        .update(attendanceExceptions)
        .set({
          status: 'resolved',
          resolutionType: 'on_duty_approval',
          resolutionNotes: `Auto-resolved via approved On-Duty request ${odRequestNumber}`,
          resolvedAt: new Date(),
          resolvedByUserId: resolvedByUserId || 'system',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.companyId, companyId),
            eq(attendanceExceptions.employeeId, employeeId),
            eq(attendanceExceptions.workday, workday),
            inArray(attendanceExceptions.status, ['open', 'assigned', 'in_review', 'pending_action']),
          ),
        );

      return openExceptions.length;
    } catch {
      return 0;
    }
  }

  async dispatchNotification(
    tenantId: string,
    companyId: string,
    employeeId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'action_required',
  ): Promise<void> {
    const db = getDb();
    try {
      await db.insert(employeeNotifications).values({
        id: `notif_od_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        companyId,
        employeeId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date(),
      });
    } catch {
      // Non-blocking notification delivery
    }
  }
}

export const attendanceOnDutyRepository = new AttendanceOnDutyRepository();
