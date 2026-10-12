import { eq, and, desc, sql, gte, lte, or, like } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  attendanceMonthlySummaries,
  attendanceMonthlyReviews,
  attendanceMonthlyReadinessEvaluations,
  attendanceMonthlyAudits,
  employees,
  departments,
  users,
  employeeAttendance,
  attendanceOnDutyWorkdays,
  employeeLeaveRequests,
  attendanceRegularizations,
  attendanceExceptions,
  employeeWorkSchedules,
  attendancePeriods,
  employeeNotifications,
  type AttendanceMonthlySummary,
  type NewAttendanceMonthlySummary,
  type AttendanceMonthlyReview,
  type NewAttendanceMonthlyReview,
  type AttendanceMonthlyReadinessEvaluation,
  type NewAttendanceMonthlyReadinessEvaluation,
  type AttendanceMonthlyAudit,
  type NewAttendanceMonthlyAudit,
} from '../../../../db/schema.js';
import type {
  MonthlySummaryFilter,
  MonthlySummaryRow,
  MonthlySummaryCounters,
} from '../types/attendanceMonthlySummary.types.js';

export class AttendanceMonthlySummaryRepository {
  async getSummaryById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<MonthlySummaryRow | null> {
    const db = getDb();
    const rows = await db
      .select({
        summary: attendanceMonthlySummaries,
        employee: employees,
        department: departments,
        assignedUser: users,
      })
      .from(attendanceMonthlySummaries)
      .innerJoin(employees, eq(attendanceMonthlySummaries.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(users, eq(attendanceMonthlySummaries.assignedReviewerId, users.id))
      .where(
        and(
          eq(attendanceMonthlySummaries.id, id),
          eq(attendanceMonthlySummaries.tenantId, tenantId),
          eq(attendanceMonthlySummaries.companyId, companyId),
        ),
      )
      .limit(1);

    if (!rows || rows.length === 0 || !rows[0]) return null;
    const r = rows[0];
    return this.mapToRow(r.summary, r.employee, r.department, r.assignedUser);
  }

  async getSummaryByEmployeeMonth(
    tenantId: string,
    companyId: string,
    employeeId: string,
    month: string,
  ): Promise<AttendanceMonthlySummary | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceMonthlySummaries)
      .where(
        and(
          eq(attendanceMonthlySummaries.tenantId, tenantId),
          eq(attendanceMonthlySummaries.companyId, companyId),
          eq(attendanceMonthlySummaries.employeeId, employeeId),
          eq(attendanceMonthlySummaries.month, month),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listSummaries(
    tenantId: string,
    companyId: string,
    filter: MonthlySummaryFilter,
  ): Promise<{ items: MonthlySummaryRow[]; totalCount: number }> {
    const db = getDb();
    const conditions = [
      eq(attendanceMonthlySummaries.tenantId, tenantId),
      eq(attendanceMonthlySummaries.companyId, companyId),
      eq(attendanceMonthlySummaries.month, filter.month),
    ];

    if (filter.search) {
      const term = `%${filter.search}%`;
      conditions.push(
        or(
          like(employees.firstName, term),
          like(employees.lastName, term),
          like(employees.employeeNumber, term),
          like(employees.email, term),
        )!,
      );
    }

    if (filter.departmentId) {
      conditions.push(eq(employees.departmentId, filter.departmentId));
    }

    if (filter.payrollReadiness) {
      conditions.push(eq(attendanceMonthlySummaries.payrollReadiness, filter.payrollReadiness));
    }

    if (filter.reviewState) {
      conditions.push(eq(attendanceMonthlySummaries.reviewState, filter.reviewState));
    }

    if (filter.isLocked !== undefined) {
      conditions.push(eq(attendanceMonthlySummaries.isLocked, filter.isLocked));
    }

    if (filter.hasExceptions) {
      conditions.push(sql`${attendanceMonthlySummaries.unresolvedExceptions} > 0`);
    }

    if (filter.hasPendingCorrections) {
      conditions.push(sql`${attendanceMonthlySummaries.pendingCorrections} > 0`);
    }

    if (filter.hasProcessingIssues) {
      conditions.push(sql`${attendanceMonthlySummaries.processingIssues} > 0`);
    }

    // Counter quick-filters
    if (filter.counterFilter) {
      switch (filter.counterFilter) {
        case 'ready':
          conditions.push(eq(attendanceMonthlySummaries.payrollReadiness, 'ready'));
          break;
        case 'needs_review':
          conditions.push(
            or(
              eq(attendanceMonthlySummaries.reviewState, 'not_reviewed'),
              eq(attendanceMonthlySummaries.reviewState, 'in_review'),
              eq(attendanceMonthlySummaries.reviewState, 'needs_correction'),
              eq(attendanceMonthlySummaries.reviewState, 'reopened'),
              eq(attendanceMonthlySummaries.payrollReadiness, 'needs_review'),
            )!,
          );
          break;
        case 'issues':
          conditions.push(sql`${attendanceMonthlySummaries.processingIssues} > 0`);
          break;
        case 'locked':
          conditions.push(eq(attendanceMonthlySummaries.isLocked, true));
          break;
        case 'corrections':
          conditions.push(sql`${attendanceMonthlySummaries.pendingCorrections} > 0`);
          break;
      }
    }

    const whereClause = and(...conditions);

    // Count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceMonthlySummaries)
      .innerJoin(employees, eq(attendanceMonthlySummaries.employeeId, employees.id))
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count ?? 0);

    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        summary: attendanceMonthlySummaries,
        employee: employees,
        department: departments,
        assignedUser: users,
      })
      .from(attendanceMonthlySummaries)
      .innerJoin(employees, eq(attendanceMonthlySummaries.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(users, eq(attendanceMonthlySummaries.assignedReviewerId, users.id))
      .where(whereClause)
      .orderBy(desc(attendanceMonthlySummaries.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((r) =>
      this.mapToRow(r.summary, r.employee, r.department, r.assignedUser),
    );

    return { items, totalCount };
  }

  async getCounters(
    tenantId: string,
    companyId: string,
    month: string,
  ): Promise<MonthlySummaryCounters> {
    const db = getDb();
    const rows = await db
      .select({
        totalEmployees: sql<number>`count(distinct ${attendanceMonthlySummaries.employeeId})`,
        readyForPayroll: sql<number>`count(case when ${attendanceMonthlySummaries.payrollReadiness} = 'ready' then 1 end)`,
        needsReview: sql<number>`count(case when ${attendanceMonthlySummaries.reviewState} in ('not_reviewed', 'in_review', 'needs_correction', 'reopened') or ${attendanceMonthlySummaries.payrollReadiness} = 'needs_review' then 1 end)`,
        processingIssues: sql<number>`count(case when ${attendanceMonthlySummaries.processingIssues} > 0 then 1 end)`,
        locked: sql<number>`count(case when ${attendanceMonthlySummaries.isLocked} = true then 1 end)`,
        pendingCorrections: sql<number>`count(case when ${attendanceMonthlySummaries.pendingCorrections} > 0 then 1 end)`,
      })
      .from(attendanceMonthlySummaries)
      .where(
        and(
          eq(attendanceMonthlySummaries.tenantId, tenantId),
          eq(attendanceMonthlySummaries.companyId, companyId),
          eq(attendanceMonthlySummaries.month, month),
        ),
      );

    const c = rows[0];
    return {
      totalEmployees: Number(c?.totalEmployees ?? 0),
      readyForPayroll: Number(c?.readyForPayroll ?? 0),
      needsReview: Number(c?.needsReview ?? 0),
      processingIssues: Number(c?.processingIssues ?? 0),
      locked: Number(c?.locked ?? 0),
      pendingCorrections: Number(c?.pendingCorrections ?? 0),
    };
  }

  async upsertSummary(data: NewAttendanceMonthlySummary): Promise<void> {
    const db = getDb();
    await db
      .insert(attendanceMonthlySummaries)
      .values(data)
      .onDuplicateKeyUpdate({
        set: {
          timezone: data.timezone,
          scheduledDays: data.scheduledDays,
          scheduledMinutes: data.scheduledMinutes,
          presentDays: data.presentDays,
          absentDays: data.absentDays,
          leaveDays: data.leaveDays,
          onDutyDays: data.onDutyDays,
          weeklyOffDays: data.weeklyOffDays,
          holidayDays: data.holidayDays,
          actualWorkedMinutes: data.actualWorkedMinutes,
          policyCreditedMinutes: data.policyCreditedMinutes,
          lateOccurrences: data.lateOccurrences,
          lateMinutes: data.lateMinutes,
          earlyExitOccurrences: data.earlyExitOccurrences,
          earlyExitMinutes: data.earlyExitMinutes,
          unresolvedExceptions: data.unresolvedExceptions,
          pendingCorrections: data.pendingCorrections,
          processingIssues: data.processingIssues,
          calculationState: data.calculationState,
          reviewState: data.reviewState,
          payrollReadiness: data.payrollReadiness,
          isLocked: data.isLocked,
          periodLockId: data.periodLockId,
          version: data.version,
          sourceFingerprint: data.sourceFingerprint,
          lastCalculatedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  async updateSummary(id: string, updates: Partial<NewAttendanceMonthlySummary>): Promise<void> {
    const db = getDb();
    await db
      .update(attendanceMonthlySummaries)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(attendanceMonthlySummaries.id, id));
  }

  async createReview(data: NewAttendanceMonthlyReview): Promise<void> {
    const db = getDb();
    await db.insert(attendanceMonthlyReviews).values(data);
  }

  async getReviewHistory(
    monthlySummaryId: string,
  ): Promise<Array<AttendanceMonthlyReview & { reviewerName?: string }>> {
    const db = getDb();
    const rows = await db
      .select({
        review: attendanceMonthlyReviews,
        user: users,
      })
      .from(attendanceMonthlyReviews)
      .leftJoin(users, eq(attendanceMonthlyReviews.reviewerUserId, users.id))
      .where(eq(attendanceMonthlyReviews.monthlySummaryId, monthlySummaryId))
      .orderBy(desc(attendanceMonthlyReviews.createdAt));

    return rows.map((r) => ({
      ...r.review,
      reviewerName: r.user ? `${r.user.firstName} ${r.user.lastName ?? ''}`.trim() : undefined,
    }));
  }

  async createReadinessEvaluation(data: NewAttendanceMonthlyReadinessEvaluation): Promise<void> {
    const db = getDb();
    await db.insert(attendanceMonthlyReadinessEvaluations).values(data);
  }

  async getLatestReadinessEvaluation(
    monthlySummaryId: string,
  ): Promise<AttendanceMonthlyReadinessEvaluation | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceMonthlyReadinessEvaluations)
      .where(eq(attendanceMonthlyReadinessEvaluations.monthlySummaryId, monthlySummaryId))
      .orderBy(desc(attendanceMonthlyReadinessEvaluations.evaluatedAt))
      .limit(1);

    return rows[0] ?? null;
  }

  async createAudit(data: NewAttendanceMonthlyAudit): Promise<void> {
    const db = getDb();
    await db.insert(attendanceMonthlyAudits).values(data);
  }

  async getAuditHistory(monthlySummaryId: string): Promise<AttendanceMonthlyAudit[]> {
    const db = getDb();
    return db
      .select()
      .from(attendanceMonthlyAudits)
      .where(eq(attendanceMonthlyAudits.monthlySummaryId, monthlySummaryId))
      .orderBy(desc(attendanceMonthlyAudits.createdAt));
  }

  async getActiveEmployeesForMonth(
    tenantId: string,
    companyId: string,
    month: string,
  ): Promise<
    Array<{
      id: string;
      employeeNumber: string;
      firstName: string;
      lastName: string | null;
      joiningDate: string;
      employmentStatus: string;
      departmentId: string | null;
    }>
  > {
    const db = getDb();
    const monthEnd = `${month}-31`;

    return db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        joiningDate: employees.joiningDate,
        employmentStatus: employees.employmentStatus,
        departmentId: employees.departmentId,
      })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          lte(employees.joiningDate, monthEnd),
        ),
      );
  }

  async getDailySourcesForEmployeeMonth(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ) {
    const db = getDb();

    const [
      dailyRecords,
      odWorkdays,
      leaveRequests,
      regularizations,
      exceptions,
      schedules,
      periods,
    ] = await Promise.all([
      db
        .select()
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            eq(employeeAttendance.employeeId, employeeId),
            gte(employeeAttendance.date, startDate),
            lte(employeeAttendance.date, endDate),
          ),
        ),
      db
        .select()
        .from(attendanceOnDutyWorkdays)
        .where(
          and(
            eq(attendanceOnDutyWorkdays.tenantId, tenantId),
            eq(attendanceOnDutyWorkdays.companyId, companyId),
            eq(attendanceOnDutyWorkdays.employeeId, employeeId),
            gte(attendanceOnDutyWorkdays.workday, startDate),
            lte(attendanceOnDutyWorkdays.workday, endDate),
          ),
        ),
      db
        .select()
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
        ),
      db
        .select()
        .from(attendanceRegularizations)
        .where(
          and(
            eq(attendanceRegularizations.tenantId, tenantId),
            eq(attendanceRegularizations.companyId, companyId),
            eq(attendanceRegularizations.employeeId, employeeId),
            gte(attendanceRegularizations.workday, startDate),
            lte(attendanceRegularizations.workday, endDate),
          ),
        ),
      db
        .select()
        .from(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.companyId, companyId),
            eq(attendanceExceptions.employeeId, employeeId),
            gte(attendanceExceptions.workday, startDate),
            lte(attendanceExceptions.workday, endDate),
          ),
        ),
      db
        .select()
        .from(employeeWorkSchedules)
        .where(eq(employeeWorkSchedules.employeeId, employeeId))
        .limit(1),
      db
        .select()
        .from(attendancePeriods)
        .where(
          and(
            eq(attendancePeriods.tenantId, tenantId),
            eq(attendancePeriods.companyId, companyId),
            lte(attendancePeriods.startDate, endDate),
            gte(attendancePeriods.endDate, startDate),
          ),
        ),
    ]);

    return {
      dailyRecords,
      odWorkdays,
      leaveRequests,
      regularizations,
      exceptions,
      schedule: schedules[0] ?? null,
      periods,
    };
  }

  async sendNotification(
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
        id: `notif_ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  private mapToRow(
    summary: AttendanceMonthlySummary,
    employee: typeof employees.$inferSelect,
    department: typeof departments.$inferSelect | null,
    assignedUser: typeof users.$inferSelect | null,
  ): MonthlySummaryRow {
    return {
      id: summary.id,
      tenantId: summary.tenantId,
      companyId: summary.companyId,
      employeeId: summary.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName ?? ''}`.trim(),
      employeeCode: employee.employeeNumber,
      departmentName: department?.name ?? 'Unassigned',
      departmentId: employee.departmentId ?? undefined,
      month: summary.month,
      timezone: summary.timezone,
      scheduledDays: summary.scheduledDays,
      scheduledMinutes: summary.scheduledMinutes,
      presentDays: Number(summary.presentDays),
      absentDays: Number(summary.absentDays),
      leaveDays: Number(summary.leaveDays),
      onDutyDays: Number(summary.onDutyDays),
      weeklyOffDays: summary.weeklyOffDays,
      holidayDays: summary.holidayDays,
      actualWorkedMinutes: summary.actualWorkedMinutes,
      policyCreditedMinutes: summary.policyCreditedMinutes,
      actualWorkedHours: Math.round((summary.actualWorkedMinutes / 60) * 10) / 10,
      policyCreditedHours: Math.round((summary.policyCreditedMinutes / 60) * 10) / 10,
      lateOccurrences: summary.lateOccurrences,
      lateMinutes: summary.lateMinutes,
      earlyExitOccurrences: summary.earlyExitOccurrences,
      earlyExitMinutes: summary.earlyExitMinutes,
      unresolvedExceptions: summary.unresolvedExceptions,
      pendingCorrections: summary.pendingCorrections,
      processingIssues: summary.processingIssues,
      calculationState: summary.calculationState,
      reviewState: summary.reviewState,
      payrollReadiness: summary.payrollReadiness,
      isLocked: summary.isLocked,
      periodLockId: summary.periodLockId,
      version: summary.version,
      sourceFingerprint: summary.sourceFingerprint,
      assignedReviewerId: summary.assignedReviewerId,
      assignedReviewerName: assignedUser
        ? `${assignedUser.firstName} ${assignedUser.lastName ?? ''}`.trim()
        : null,
      assignedAt: summary.assignedAt ? summary.assignedAt.toISOString() : null,
      reviewedByUserId: summary.reviewedByUserId,
      reviewedByUserName: summary.reviewedByUserId ?? null,
      reviewedAt: summary.reviewedAt ? summary.reviewedAt.toISOString() : null,
      reviewedVersion: summary.reviewedVersion,
      reviewNotes: summary.reviewNotes,
      correctionRequestNotes: summary.correctionRequestNotes,
      reopenReason: summary.reopenReason,
      lastCalculatedAt: summary.lastCalculatedAt.toISOString(),
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    };
  }
}

export const attendanceMonthlySummaryRepository = new AttendanceMonthlySummaryRepository();
