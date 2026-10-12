import { eq, and, desc, asc, sql, gte, lte, or, ne, isNull, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  attendancePunches,
  attendanceOnDutyRequests,
  attendancePeriods,
  employeeLeaveRequests,
  employees,
  departments,
  designations,
  locations,
  employeeWorkSchedules,
  attendancePolicies,
  employeeRequests,
  attendancePunchAudits,
  attendanceExceptions,
  attendanceExceptionAudits,
  type EmployeeAttendance,
  type AttendancePunch,
  type AttendancePunchAudit,
  type AttendanceException,
  type AttendanceExceptionAudit,
  type AttendanceOnDutyRequest,
  type NewAttendanceOnDutyRequest,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { getDayOfWeekName } from '../service/attendanceCalculation.service.js';
import type {
  DailyAttendanceItem,
  DailyLogFilter,
  DailyLogResult,
  DailyLogSummaryCounters,
  DailyLogEmployeeDetail,
  PunchLogFilter,
  PunchLogResult,
  PunchLogItem,
  PunchLogSummaryCounters,
  PunchEventDetail,
  UpdatePunchInvestigationInput,
  RetryPunchProcessingInput,
  BulkPunchActionInput,
  RegularizationFilter,
  RegularizationItem,
  AttendanceExceptionFilter,
  AttendanceExceptionItem,
  ExceptionType,
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionSource,
  ExceptionSummaryCounters,
  ExceptionFilter,
  AttendanceExceptionCaseItem,
  ExceptionCaseDetail,
  ExceptionQueryResult,
  AssignExceptionInput,
  UpdateExceptionStatusInput,
  OverrideExceptionSeverityInput,
  BulkExceptionActionInput,
  MonthlySummaryEmployeeRow,
  MonthlySummaryDayDetail,
  OnDutyFilter,
  OnDutyRequestItem,
  CreateOnDutyRequestInput,
} from '../types/attendance.types.js';

export class AttendanceRepository {
  async getTodayAttendance(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<EmployeeAttendance | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, employeeId),
          eq(employeeAttendance.date, date),
        ),
      );
    return rows[0] ?? null;
  }

  async getAttendanceRecordById(id: string): Promise<EmployeeAttendance | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(employeeAttendance)
      .where(eq(employeeAttendance.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async checkIn(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    checkInTime: string,
    workLocation: string,
    notes?: string,
  ): Promise<EmployeeAttendance> {
    const db = getDb();
    const existing = await this.getTodayAttendance(tenantId, companyId, employeeId, date);
    if (existing) {
      if (existing.checkInTime) {
        throw new Error('Attendance check-in already recorded for today');
      }
      await db
        .update(employeeAttendance)
        .set({
          checkInTime,
          workLocation,
          notes: notes ?? existing.notes,
        })
        .where(eq(employeeAttendance.id, existing.id));
      const [updated] = await db
        .select()
        .from(employeeAttendance)
        .where(eq(employeeAttendance.id, existing.id));
      return updated!;
    }

    const id = generateSurrogateId('att');
    await db.insert(employeeAttendance).values({
      id,
      tenantId,
      companyId,
      employeeId,
      date,
      checkInTime,
      workLocation,
      notes: notes ?? null,
      status: 'present',
    });

    const [created] = await db
      .select()
      .from(employeeAttendance)
      .where(eq(employeeAttendance.id, id));
    return created!;
  }

  async checkOut(id: string, checkOutTime: string): Promise<EmployeeAttendance> {
    const db = getDb();
    await db.update(employeeAttendance).set({ checkOutTime }).where(eq(employeeAttendance.id, id));
    const [updated] = await db
      .select()
      .from(employeeAttendance)
      .where(eq(employeeAttendance.id, id));
    return updated!;
  }

  async getAttendanceHistory(
    tenantId: string,
    companyId: string,
    employeeId: string,
    limit: number = 30,
  ): Promise<EmployeeAttendance[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeAttendance.date))
      .limit(limit);
  }

  async recordPunch(
    tenantId: string,
    companyId: string,
    employeeId: string,
    punchType: 'in' | 'out' | 'break_in' | 'break_out' | 'auto',
    source: 'web' | 'mobile' | 'biometric' | 'manual' | 'api' = 'web',
    workLocation: string = 'office',
    notes?: string,
    deviceMetadata?: Record<string, unknown>,
    punchDate?: Date,
  ): Promise<AttendancePunch> {
    const db = getDb();
    const punchTime = punchDate ?? new Date();

    // Check for duplicate punch within 60 seconds
    const sixtySecondsAgo = new Date(punchTime.getTime() - 60000);
    const existing = await db
      .select({ id: attendancePunches.id })
      .from(attendancePunches)
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          eq(attendancePunches.employeeId, employeeId),
          eq(attendancePunches.punchType, punchType),
          gte(attendancePunches.punchTime, sixtySecondsAgo),
          lte(attendancePunches.punchTime, punchTime),
        ),
      )
      .limit(1);

    const isDuplicate = existing.length > 0;
    const id = generateSurrogateId('punch');

    await db.insert(attendancePunches).values({
      id,
      tenantId,
      companyId,
      employeeId,
      punchTime,
      punchType,
      source,
      deviceMetadata: deviceMetadata ?? null,
      workLocation,
      notes: notes ?? null,
      isDuplicate,
    });

    const [created] = await db.select().from(attendancePunches).where(eq(attendancePunches.id, id));
    return created!;
  }

  async getPunches(
    tenantId: string,
    companyId: string,
    filter: PunchLogFilter,
  ): Promise<PunchLogResult> {
    const db = getDb();

    // Base conditions for tenant & company
    const baseConditions = [
      eq(attendancePunches.tenantId, tenantId),
      eq(attendancePunches.companyId, companyId),
    ];

    // Date conditions based on dateInterpretation
    const dateConditions = [];
    const dateInterpretation = filter.dateInterpretation || 'event_timestamp';

    if (dateInterpretation === 'workday') {
      if (filter.dateFrom && filter.dateTo) {
        dateConditions.push(gte(attendancePunches.workday, filter.dateFrom));
        dateConditions.push(lte(attendancePunches.workday, filter.dateTo));
      } else if (filter.date) {
        dateConditions.push(eq(attendancePunches.workday, filter.date));
      }
    } else {
      // Default: event_timestamp
      if (filter.dateFrom && filter.dateTo) {
        const startOfDay = new Date(`${filter.dateFrom}T00:00:00.000Z`);
        const endOfDay = new Date(`${filter.dateTo}T23:59:59.999Z`);
        dateConditions.push(gte(attendancePunches.punchTime, startOfDay));
        dateConditions.push(lte(attendancePunches.punchTime, endOfDay));
      } else if (filter.date) {
        const startOfDay = new Date(`${filter.date}T00:00:00.000Z`);
        const endOfDay = new Date(`${filter.date}T23:59:59.999Z`);
        dateConditions.push(gte(attendancePunches.punchTime, startOfDay));
        dateConditions.push(lte(attendancePunches.punchTime, endOfDay));
      }
    }

    // Filter conditions
    const filterConditions = [...baseConditions, ...dateConditions];

    if (filter.employeeId) {
      filterConditions.push(eq(attendancePunches.employeeId, filter.employeeId));
    }
    if (filter.source && filter.source !== 'all') {
      filterConditions.push(
        eq(
          attendancePunches.source,
          filter.source as any,
        ),
      );
    }
    if (filter.punchType && filter.punchType !== 'all') {
      filterConditions.push(
        eq(
          attendancePunches.punchType,
          filter.punchType as any,
        ),
      );
    }
    if (filter.validationStatus && filter.validationStatus !== 'all') {
      filterConditions.push(
        eq(attendancePunches.validationStatus, filter.validationStatus as any),
      );
    }
    if (filter.processingState && filter.processingState !== 'all') {
      filterConditions.push(
        eq(attendancePunches.processingState, filter.processingState as any),
      );
    }
    if (filter.departmentId && filter.departmentId !== 'all') {
      filterConditions.push(eq(employees.departmentId, filter.departmentId));
    }
    if (filter.locationId && filter.locationId !== 'all') {
      filterConditions.push(eq(employees.locationId, filter.locationId));
    }
    if (filter.search) {
      const s = `%${filter.search.toLowerCase()}%`;
      filterConditions.push(
        or(
          sql`LOWER(${employees.firstName}) LIKE ${s}`,
          sql`LOWER(${employees.lastName}) LIKE ${s}`,
          sql`LOWER(${employees.employeeNumber}) LIKE ${s}`,
          sql`LOWER(${attendancePunches.rawIdentifier}) LIKE ${s}`,
        )!,
      );
    }

    // Compute Summary Counters across the date-filtered universe before pagination
    const counterConditions = [...baseConditions, ...dateConditions];
    const counterRow = await db
      .select({
        total: sql<number>`count(*)`,
        valid: sql<number>`sum(case when ${attendancePunches.validationStatus} = 'valid' then 1 else 0 end)`,
        needsReview: sql<number>`sum(case when ${attendancePunches.validationStatus} = 'needs_review' or ${attendancePunches.investigationStatus} in ('open', 'assigned', 'in_review') then 1 else 0 end)`,
        duplicates: sql<number>`sum(case when ${attendancePunches.validationStatus} = 'duplicate' or ${attendancePunches.isDuplicate} = true then 1 else 0 end)`,
        unmatched: sql<number>`sum(case when ${attendancePunches.validationStatus} = 'unmatched' or ${attendancePunches.employeeId} is null then 1 else 0 end)`,
        processingFailed: sql<number>`sum(case when ${attendancePunches.processingState} = 'failed' then 1 else 0 end)`,
      })
      .from(attendancePunches)
      .where(and(...counterConditions));

    const counters: PunchLogSummaryCounters = {
      total: Number(counterRow[0]?.total ?? 0),
      valid: Number(counterRow[0]?.valid ?? 0),
      needsReview: Number(counterRow[0]?.needsReview ?? 0),
      duplicates: Number(counterRow[0]?.duplicates ?? 0),
      unmatched: Number(counterRow[0]?.unmatched ?? 0),
      processingFailed: Number(counterRow[0]?.processingFailed ?? 0),
    };

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 30));
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: attendancePunches.id,
        tenantId: attendancePunches.tenantId,
        companyId: attendancePunches.companyId,
        employeeId: attendancePunches.employeeId,
        rawIdentifier: attendancePunches.rawIdentifier,
        punchTime: attendancePunches.punchTime,
        punchType: attendancePunches.punchType,
        source: attendancePunches.source,
        deviceMetadata: attendancePunches.deviceMetadata,
        workLocation: attendancePunches.workLocation,
        workday: attendancePunches.workday,
        validationStatus: attendancePunches.validationStatus,
        validationReason: attendancePunches.validationReason,
        processingState: attendancePunches.processingState,
        processingError: attendancePunches.processingError,
        retryCount: attendancePunches.retryCount,
        investigationStatus: attendancePunches.investigationStatus,
        assignedTo: attendancePunches.assignedTo,
        investigationNotes: attendancePunches.investigationNotes,
        resolvedAt: attendancePunches.resolvedAt,
        notes: attendancePunches.notes,
        isDuplicate: attendancePunches.isDuplicate,
        createdAt: attendancePunches.createdAt,
        updatedAt: attendancePunches.updatedAt,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeNumber,
        departmentName: departments.name,
        linkedAttendanceId: employeeAttendance.id,
        linkedAttendanceStatus: employeeAttendance.status,
        linkedAttendanceProcessingState: employeeAttendance.processingState,
      })
      .from(attendancePunches)
      .leftJoin(employees, eq(attendancePunches.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        employeeAttendance,
        and(
          eq(attendancePunches.employeeId, employeeAttendance.employeeId),
          eq(attendancePunches.workday, employeeAttendance.date),
        ),
      )
      .where(and(...filterConditions))
      .orderBy(desc(attendancePunches.punchTime), desc(attendancePunches.id))
      .limit(limit)
      .offset(offset);

    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendancePunches)
      .leftJoin(employees, eq(attendancePunches.employeeId, employees.id))
      .where(and(...filterConditions));

    const total = Number(countRows[0]?.count ?? 0);

    const punches: PunchLogItem[] = rows.map((r) => {
      const fullName = [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
      return {
        ...r,
        employeeName: fullName || (r.employeeId ? 'Unknown Employee' : 'Unmatched Employee'),
        employeeCode: r.employeeCode ?? r.rawIdentifier ?? 'UNMATCHED',
        departmentName: r.departmentName ?? undefined,
        avatarUrl: undefined,
        linkedAttendanceId: r.linkedAttendanceId ?? undefined,
        linkedAttendanceStatus: r.linkedAttendanceStatus ?? undefined,
        linkedAttendanceProcessingState: r.linkedAttendanceProcessingState ?? undefined,
      };
    });

    return {
      punches,
      counters,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPunchById(
    tenantId: string,
    companyId: string,
    punchId: string,
  ): Promise<PunchEventDetail | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: attendancePunches.id,
        tenantId: attendancePunches.tenantId,
        companyId: attendancePunches.companyId,
        employeeId: attendancePunches.employeeId,
        rawIdentifier: attendancePunches.rawIdentifier,
        punchTime: attendancePunches.punchTime,
        punchType: attendancePunches.punchType,
        source: attendancePunches.source,
        deviceMetadata: attendancePunches.deviceMetadata,
        workLocation: attendancePunches.workLocation,
        workday: attendancePunches.workday,
        validationStatus: attendancePunches.validationStatus,
        validationReason: attendancePunches.validationReason,
        processingState: attendancePunches.processingState,
        processingError: attendancePunches.processingError,
        retryCount: attendancePunches.retryCount,
        investigationStatus: attendancePunches.investigationStatus,
        assignedTo: attendancePunches.assignedTo,
        investigationNotes: attendancePunches.investigationNotes,
        resolvedAt: attendancePunches.resolvedAt,
        notes: attendancePunches.notes,
        isDuplicate: attendancePunches.isDuplicate,
        createdAt: attendancePunches.createdAt,
        updatedAt: attendancePunches.updatedAt,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeNumber,
        departmentName: departments.name,
        linkedAttendanceId: employeeAttendance.id,
        linkedAttendanceStatus: employeeAttendance.status,
        linkedAttendanceProcessingState: employeeAttendance.processingState,
      })
      .from(attendancePunches)
      .leftJoin(employees, eq(attendancePunches.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        employeeAttendance,
        and(
          eq(attendancePunches.employeeId, employeeAttendance.employeeId),
          eq(attendancePunches.workday, employeeAttendance.date),
        ),
      )
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          eq(attendancePunches.id, punchId),
        ),
      );

    if (!row) return null;

    const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
    const punchItem: PunchLogItem = {
      ...row,
      employeeName: fullName || (row.employeeId ? 'Unknown Employee' : 'Unmatched Employee'),
      employeeCode: row.employeeCode ?? row.rawIdentifier ?? 'UNMATCHED',
      departmentName: row.departmentName ?? undefined,
      avatarUrl: undefined,
      linkedAttendanceId: row.linkedAttendanceId ?? undefined,
      linkedAttendanceStatus: row.linkedAttendanceStatus ?? undefined,
      linkedAttendanceProcessingState: row.linkedAttendanceProcessingState ?? undefined,
    };

    // Fetch related timeline punches for the same employee or device within +/- 2 days
    const punchTime = new Date(row.punchTime);
    const windowStart = new Date(punchTime.getTime() - 2 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(punchTime.getTime() + 2 * 24 * 60 * 60 * 1000);

    const timelineRows = row.employeeId
      ? await db
          .select({
            id: attendancePunches.id,
            punchTime: attendancePunches.punchTime,
            punchType: attendancePunches.punchType,
            source: attendancePunches.source,
            validationStatus: attendancePunches.validationStatus,
            processingState: attendancePunches.processingState,
          })
          .from(attendancePunches)
          .where(
            and(
              eq(attendancePunches.tenantId, tenantId),
              eq(attendancePunches.companyId, companyId),
              eq(attendancePunches.employeeId, row.employeeId),
              gte(attendancePunches.punchTime, windowStart),
              lte(attendancePunches.punchTime, windowEnd),
            ),
          )
          .orderBy(desc(attendancePunches.punchTime))
          .limit(10)
      : [];

    // Fetch audits from attendancePunchAudits
    const auditRows = await db
      .select()
      .from(attendancePunchAudits)
      .where(
        and(
          eq(attendancePunchAudits.tenantId, tenantId),
          eq(attendancePunchAudits.companyId, companyId),
          eq(attendancePunchAudits.punchId, punchId),
        ),
      )
      .orderBy(desc(attendancePunchAudits.createdAt))
      .limit(50);

    return {
      ...punchItem,
      timeline: timelineRows.map((t) => ({
        id: t.id,
        punchTime: t.punchTime,
        punchType: t.punchType,
        source: t.source,
        validationStatus: t.validationStatus,
        processingState: t.processingState,
      })),
      audits: auditRows,
    };
  }

  async updatePunchInvestigation(
    tenantId: string,
    companyId: string,
    input: UpdatePunchInvestigationInput,
    actorUserId: string,
  ): Promise<PunchLogItem> {
    const db = getDb();
    const existing = await this.getPunchById(tenantId, companyId, input.punchId);
    if (!existing) {
      throw new Error(`Punch event not found: ${input.punchId}`);
    }

    const invStatus = input.investigationStatus || input.status || 'open';
    const invNotes = input.investigationNotes !== undefined ? input.investigationNotes : input.notes;

    const updates: Partial<typeof attendancePunches.$inferInsert> = {
      investigationStatus: invStatus,
      updatedAt: new Date(),
    };

    if (input.assignedTo !== undefined) {
      updates.assignedTo = input.assignedTo;
    }
    if (invNotes !== undefined) {
      updates.investigationNotes = invNotes;
    }

    // If resolving unmatched employee identity
    if (input.resolvedEmployeeId) {
      updates.employeeId = input.resolvedEmployeeId;
      updates.validationStatus = 'valid';
      updates.validationReason = input.resolutionReason || 'Identity resolved by investigation';
      updates.resolvedAt = new Date();
      updates.investigationStatus = 'resolved';
    }

    await db
      .update(attendancePunches)
      .set(updates)
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          eq(attendancePunches.id, input.punchId),
        ),
      );

    // Record audit trail
    let auditAction: 'identity_mapped' | 'investigation_assigned' | 'investigation_resolved' | 'investigation_opened';
    if (input.resolvedEmployeeId) {
      auditAction = 'identity_mapped';
    } else if (invStatus === 'resolved') {
      auditAction = 'investigation_resolved';
    } else if (invStatus === 'assigned') {
      auditAction = 'investigation_assigned';
    } else {
      auditAction = 'investigation_opened';
    }

    const auditId = generateSurrogateId('paud');
    await db.insert(attendancePunchAudits).values({
      id: auditId,
      tenantId,
      companyId,
      punchId: input.punchId,
      action: auditAction,
      actorUserId,
      details: {
        oldState: {
          investigationStatus: existing.investigationStatus,
          assignedTo: existing.assignedTo,
          employeeId: existing.employeeId,
          validationStatus: existing.validationStatus,
        },
        newState: {
          investigationStatus: updates.investigationStatus,
          assignedTo: updates.assignedTo,
          employeeId: updates.employeeId ?? existing.employeeId,
          validationStatus: updates.validationStatus ?? existing.validationStatus,
        },
      },
      notes: input.resolutionReason || invNotes || 'Investigation updated',
      createdAt: new Date(),
    });

    const updated = await this.getPunchById(tenantId, companyId, input.punchId);
    return updated!;
  }

  async retryPunchProcessing(
    tenantId: string,
    companyId: string,
    punchIds: string[],
    actorUserId: string,
  ): Promise<{ success: boolean; retriedCount: number; message: string }> {
    const db = getDb();
    let retriedCount = 0;

    for (const punchId of punchIds) {
      const punch = await this.getPunchById(tenantId, companyId, punchId);
      if (!punch) continue;

      // Technical failures are eligible for retry
      if (punch.processingState !== 'failed' && punch.processingState !== 'retry_pending') {
        continue;
      }

      await db
        .update(attendancePunches)
        .set({
          processingState: 'processed',
          processingError: null,
          retryCount: (punch.retryCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.id, punchId),
          ),
        );

      // Record audit
      const auditId = generateSurrogateId('paud');
      await db.insert(attendancePunchAudits).values({
        id: auditId,
        tenantId,
        companyId,
        punchId,
        action: 'retry_attempted',
        actorUserId,
        details: {
          oldState: { processingState: punch.processingState, retryCount: punch.retryCount },
          newState: { processingState: 'processed', retryCount: (punch.retryCount ?? 0) + 1 },
        },
        notes: 'Authorized retry processed successfully',
        createdAt: new Date(),
      });

      retriedCount++;
    }

    return {
      success: true,
      retriedCount,
      message: `Successfully retried processing for ${retriedCount} punch event(s)`,
    };
  }

  async bulkPunchAction(
    tenantId: string,
    companyId: string,
    input: BulkPunchActionInput,
    actorUserId: string,
  ): Promise<{ success: boolean; affectedCount: number; message: string }> {
    let affectedCount = 0;

    if (input.action === 'retry') {
      const res = await this.retryPunchProcessing(tenantId, companyId, input.punchIds, actorUserId);
      return { success: res.success, affectedCount: res.retriedCount, message: res.message };
    }

    if (input.action === 'assign_investigation') {
      for (const punchId of input.punchIds) {
        await this.updatePunchInvestigation(
          tenantId,
          companyId,
          {
            punchId,
            investigationStatus: 'assigned',
            assignedTo: input.assignToUserId,
            investigationNotes: input.notes,
          },
          actorUserId,
        );
        affectedCount++;
      }
      return {
        success: true,
        affectedCount,
        message: `Assigned ${affectedCount} punch event(s) to reviewer`,
      };
    }

    if (input.action === 'mark_investigation') {
      for (const punchId of input.punchIds) {
        await this.updatePunchInvestigation(
          tenantId,
          companyId,
          {
            punchId,
            investigationStatus: 'open',
            investigationNotes: input.notes,
          },
          actorUserId,
        );
        affectedCount++;
      }
      return {
        success: true,
        affectedCount,
        message: `Marked ${affectedCount} punch event(s) for investigation`,
      };
    }

    return {
      success: false,
      affectedCount: 0,
      message: `Unknown bulk action: ${input.action}`,
    };
  }

  async getDailyAttendanceLog(
    tenantId: string,
    companyId: string,
    filter: DailyLogFilter,
  ): Promise<DailyLogResult> {
    const db = getDb();
    const conditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
      eq(employees.employmentStatus, 'active'),
    ];

    if (filter.employeeId) {
      conditions.push(eq(employees.id, filter.employeeId));
    }
    if (filter.departmentId) {
      conditions.push(eq(employees.departmentId, filter.departmentId));
    }
    if (filter.locationId) {
      conditions.push(eq(employees.locationId, filter.locationId));
    }

    const empList = await db
      .select({
        employeeId: employees.id,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        designationId: employees.designationId,
        designationName: designations.name,
        locationId: employees.locationId,
        locationName: locations.name,
        locationTimezone: locations.timezone,
        scheduleRef: employeeWorkSchedules.workSchedule,
        scheduleStartTime: employeeWorkSchedules.startTime,
        scheduleEndTime: employeeWorkSchedules.endTime,
        scheduleWorkingDays: employeeWorkSchedules.workingDays,
        scheduleBreakMinutes: employeeWorkSchedules.breakMinutes,
        scheduleTimezone: employeeWorkSchedules.timeZone,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .leftJoin(employeeWorkSchedules, eq(employees.id, employeeWorkSchedules.employeeId))
      .where(and(...conditions));

    // Fetch existing attendance records for date
    const attRows = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.date, filter.date),
        ),
      );

    const attMap = new Map<string, EmployeeAttendance>();
    for (const row of attRows) {
      attMap.set(row.employeeId, row);
    }

    // Fetch approved leaves covering date
    const leaveRows = await db
      .select({
        employeeId: employeeLeaveRequests.employeeId,
        leaveId: employeeLeaveRequests.id,
      })
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.status, 'approved'),
          lte(employeeLeaveRequests.startDate, filter.date),
          gte(employeeLeaveRequests.endDate, filter.date),
        ),
      );
    const leaveMap = new Map<string, string>();
    for (const l of leaveRows) {
      leaveMap.set(l.employeeId, l.leaveId);
    }

    // Fetch approved On-Duty covering date
    const odRows = await db
      .select({
        employeeId: attendanceOnDutyRequests.employeeId,
        odId: attendanceOnDutyRequests.id,
      })
      .from(attendanceOnDutyRequests)
      .where(
        and(
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
          eq(attendanceOnDutyRequests.status, 'approved'),
          lte(attendanceOnDutyRequests.startDate, filter.date),
          gte(attendanceOnDutyRequests.endDate, filter.date),
        ),
      );
    const odMap = new Map<string, string>();
    for (const od of odRows) {
      odMap.set(od.employeeId, od.odId);
    }

    // Fetch punches on this date to extract punch source per employee
    const dayStart = new Date(`${filter.date}T00:00:00.000Z`);
    const dayEnd = new Date(`${filter.date}T23:59:59.999Z`);
    const punchRows = await db
      .select({
        employeeId: attendancePunches.employeeId,
        source: attendancePunches.source,
      })
      .from(attendancePunches)
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          gte(attendancePunches.punchTime, dayStart),
          lte(attendancePunches.punchTime, dayEnd),
        ),
      );
    const punchSourceMap = new Map<string, string>();
    for (const p of punchRows) {
      if (p.employeeId && !punchSourceMap.has(p.employeeId)) {
        punchSourceMap.set(p.employeeId, p.source);
      }
    }

    const dayOfWeek = getDayOfWeekName(filter.date);
    const isToday = filter.date === new Date().toISOString().slice(0, 10);

    const allItems: (DailyAttendanceItem & { isScheduledDay: boolean })[] = empList.map((emp) => {
      const att = attMap.get(emp.employeeId);
      const isLeave = leaveMap.has(emp.employeeId);
      const isOd = odMap.has(emp.employeeId);

      const workingDays = emp.scheduleWorkingDays ?? [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ];
      const isWorkingDay = workingDays.some((d) => d.toLowerCase() === dayOfWeek.toLowerCase());

      const shiftStart = emp.scheduleStartTime || '09:00';
      const shiftEnd = emp.scheduleEndTime || '18:00';
      const shiftScheduleRef = emp.scheduleRef || `General ${shiftStart} - ${shiftEnd}`;

      let status: DailyAttendanceItem['status'];
      let processingState: DailyAttendanceItem['processingState'] = 'finalized';
      const checkInTime = att?.checkInTime ?? null;
      const checkOutTime = att?.checkOutTime ?? null;
      const workedMinutes = att?.workedMinutes ?? 0;
      const lateMinutes = att?.lateMinutes ?? 0;
      const earlyMinutes = att?.earlyMinutes ?? 0;
      const isLate = att?.isLate ?? false;
      const isEarlyExit = att?.isEarlyExit ?? false;
      const isMissingPunch = att?.isMissingPunch ?? false;
      const isRegularized = att?.isRegularized ?? false;

      if (att) {
        status = att.status as DailyAttendanceItem['status'];
        processingState = att.processingState;
      } else if (isOd) {
        status = 'on_duty' as DailyAttendanceItem['status'];
      } else if (isLeave) {
        status = 'on_leave';
      } else if (!isWorkingDay) {
        status = 'holiday';
      } else {
        status = 'absent';
      }

      // Compute indicators
      const indicators: string[] = [];
      if (isLate) indicators.push('late');
      if (isEarlyExit) indicators.push('early_exit');
      if (isMissingPunch || (!checkInTime && checkOutTime)) indicators.push('missing_punch_in');
      if (isMissingPunch || (checkInTime && !checkOutTime && !isToday)) indicators.push('missing_punch_out');
      if (status === 'half_day' || (workedMinutes > 0 && workedMinutes < 240)) indicators.push('insufficient_hours');
      if (isRegularized) indicators.push('regularized');
      if (processingState === 'provisional') indicators.push('device_sync_pending');

      const punchSource = punchSourceMap.get(emp.employeeId) ?? (isRegularized ? 'manual' : 'web');

      return {
        id: att?.id ?? `missing_${emp.employeeId}`,
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode ?? '',
        firstName: emp.firstName,
        lastName: emp.lastName,
        departmentId: emp.departmentId,
        departmentName: emp.departmentName ?? null,
        designationId: emp.designationId,
        designationName: emp.designationName ?? null,
        locationId: emp.locationId ?? null,
        locationName: emp.locationName ?? null,
        shiftScheduleRef,
        shiftName: shiftScheduleRef,
        punchSource,
        indicators,
        date: filter.date,
        checkInTime,
        checkOutTime,
        status,
        processingState,
        workLocation: att?.workLocation ?? emp.locationName ?? 'office',
        workedMinutes,
        lateMinutes,
        earlyMinutes,
        isLate,
        isEarlyExit,
        isMissingPunch,
        isRegularized,
        notes: att?.notes ?? null,
        isScheduledDay: isWorkingDay,
      };
    });

    // Compute Summary Counters before filtering
    const counters: DailyLogSummaryCounters = {
      scheduled: 0,
      present: 0,
      absent: 0,
      onLeave: 0,
      onDuty: 0,
      pendingReview: 0,
      halfDay: 0,
      holiday: 0,
      unresolved: 0,
    };

    for (const item of allItems) {
      if (item.isScheduledDay) {
        counters.scheduled++;
      }

      if (item.status === 'present') {
        counters.present++;
      } else if (item.status === 'half_day') {
        counters.present++;
        counters.halfDay = (counters.halfDay ?? 0) + 1;
      } else if (item.status === 'absent') {
        counters.absent++;
      } else if (item.status === 'on_leave') {
        counters.onLeave++;
      } else if (item.status === ('on_duty' as DailyAttendanceItem['status'])) {
        counters.onDuty++;
      } else if (item.status === 'holiday') {
        counters.holiday = (counters.holiday ?? 0) + 1;
      } else if (item.status === 'incomplete') {
        counters.unresolved = (counters.unresolved ?? 0) + 1;
      }

      if (item.processingState === 'pending_review' || item.status === 'incomplete' || item.isMissingPunch) {
        counters.pendingReview++;
      }
    }

    // Apply Filters
    let filtered = allItems;

    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'scheduled') {
        filtered = filtered.filter((r) => r.isScheduledDay);
      } else if (filter.status === 'present') {
        filtered = filtered.filter((r) => r.status === 'present' || r.status === 'half_day');
      } else if (filter.status === 'pending_review') {
        filtered = filtered.filter((r) => r.processingState === 'pending_review' || r.status === 'incomplete');
      } else {
        filtered = filtered.filter((r) => r.status === filter.status);
      }
    }

    if (filter.processingState && filter.processingState !== 'all') {
      filtered = filtered.filter((r) => r.processingState === filter.processingState);
    }

    if (filter.shiftRef && filter.shiftRef !== 'all') {
      filtered = filtered.filter((r) => r.shiftScheduleRef === filter.shiftRef);
    }

    if (filter.indicator && filter.indicator !== 'all') {
      filtered = filtered.filter((r) => r.indicators?.includes(filter.indicator!));
    }

    if (filter.punchSource && filter.punchSource !== 'all') {
      filtered = filtered.filter((r) => r.punchSource === filter.punchSource);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.firstName.toLowerCase().includes(q) ||
          (r.lastName && r.lastName.toLowerCase().includes(q)) ||
          r.employeeCode.toLowerCase().includes(q) ||
          (r.departmentName && r.departmentName.toLowerCase().includes(q)),
      );
    }

    // Apply Sorting
    const sortBy = filter.sortBy ?? 'name';
    const sortOrder = filter.sortOrder ?? 'asc';
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'code':
          comparison = a.employeeCode.localeCompare(b.employeeCode);
          break;
        case 'department':
          comparison = (a.departmentName ?? '').localeCompare(b.departmentName ?? '');
          break;
        case 'checkIn':
          comparison = (a.checkInTime ?? '').localeCompare(b.checkInTime ?? '');
          break;
        case 'checkOut':
          comparison = (a.checkOutTime ?? '').localeCompare(b.checkOutTime ?? '');
          break;
        case 'workedHours':
          comparison = a.workedMinutes - b.workedMinutes;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'name':
        default: {
          const nameA = `${a.firstName} ${a.lastName ?? ''}`.trim();
          const nameB = `${b.firstName} ${b.lastName ?? ''}`.trim();
          comparison = nameA.localeCompare(nameB);
          break;
        }
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = filtered.length;
    const page = Math.max(1, filter.page ?? 1);
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 25;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      counters,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getEmployeeDailyDetail(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<DailyLogEmployeeDetail | null> {
    const db = getDb();

    // 1. Employee metadata
    const empRows = await db
      .select({
        employeeId: employees.id,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        departmentName: departments.name,
        designationName: designations.name,
        locationName: locations.name,
        locationTimezone: locations.timezone,
        scheduleRef: employeeWorkSchedules.workSchedule,
        scheduleStartTime: employeeWorkSchedules.startTime,
        scheduleEndTime: employeeWorkSchedules.endTime,
        scheduleWorkingDays: employeeWorkSchedules.workingDays,
        scheduleBreakMinutes: employeeWorkSchedules.breakMinutes,
        scheduleTimezone: employeeWorkSchedules.timeZone,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .leftJoin(employeeWorkSchedules, eq(employees.id, employeeWorkSchedules.employeeId))
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
        ),
      )
      .limit(1);

    const emp = empRows[0];
    if (!emp) return null;

    // 2. Attendance summary
    const att = await this.getTodayAttendance(tenantId, companyId, employeeId, date);

    // 3. Raw punch timeline
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const punchRows = await db
      .select()
      .from(attendancePunches)
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          eq(attendancePunches.employeeId, employeeId),
          gte(attendancePunches.punchTime, dayStart),
          lte(attendancePunches.punchTime, dayEnd),
        ),
      )
      .orderBy(attendancePunches.punchTime);

    // 4. Related Leave
    const leaveRows = await db
      .select({
        id: employeeLeaveRequests.id,
        status: employeeLeaveRequests.status,
        startDate: employeeLeaveRequests.startDate,
        endDate: employeeLeaveRequests.endDate,
        reason: employeeLeaveRequests.reason,
      })
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
          lte(employeeLeaveRequests.startDate, date),
          gte(employeeLeaveRequests.endDate, date),
        ),
      )
      .limit(1);

    // 5. Related On-Duty
    const odRows = await db
      .select({
        id: attendanceOnDutyRequests.id,
        odTypeName: attendanceOnDutyRequests.odTypeName,
        status: attendanceOnDutyRequests.status,
        startDate: attendanceOnDutyRequests.startDate,
        endDate: attendanceOnDutyRequests.endDate,
        reason: attendanceOnDutyRequests.reason,
      })
      .from(attendanceOnDutyRequests)
      .where(
        and(
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
          eq(attendanceOnDutyRequests.employeeId, employeeId),
          lte(attendanceOnDutyRequests.startDate, date),
          gte(attendanceOnDutyRequests.endDate, date),
        ),
      )
      .limit(1);

    // 6. Related Regularizations
    const regRows = await db
      .select({
        id: employeeRequests.id,
        status: employeeRequests.status,
        details: employeeRequests.details,
        reviewerNotes: employeeRequests.reviewerNotes,
      })
      .from(employeeRequests)
      .where(
        and(
          eq(employeeRequests.tenantId, tenantId),
          eq(employeeRequests.companyId, companyId),
          eq(employeeRequests.employeeId, employeeId),
          eq(employeeRequests.requestType, 'attendance_regularization'),
        ),
      );

    const relatedRegs = regRows
      .filter((r) => {
        const d = r.details as Record<string, unknown> | null;
        return d && d.date === date;
      })
      .map((r) => {
        const d = r.details as Record<string, unknown>;
        return {
          id: r.id,
          status: r.status,
          requestedCheckIn: String(d.requestedCheckIn ?? d.checkInTime ?? ''),
          requestedCheckOut: String(d.requestedCheckOut ?? d.checkOutTime ?? ''),
          reason: String(d.reason ?? ''),
          reviewerNotes: r.reviewerNotes,
        };
      });

    // 7. Effective policy
    const policyRows = await db
      .select()
      .from(attendancePolicies)
      .where(
        and(
          eq(attendancePolicies.tenantId, tenantId),
          eq(attendancePolicies.companyId, companyId),
          eq(attendancePolicies.status, 'published'),
        ),
      )
      .limit(1);
    const policy = policyRows[0];

    const isLocked = await this.checkDateInLockedPeriod(tenantId, companyId, date, date);

    // Determine indicators
    const isToday = date === new Date().toISOString().slice(0, 10);
    const indicators: string[] = [];
    if (att?.isLate) indicators.push('late');
    if (att?.isEarlyExit) indicators.push('early_exit');
    if (att?.isMissingPunch || (!att?.checkInTime && att?.checkOutTime)) indicators.push('missing_punch_in');
    if (att?.isMissingPunch || (att?.checkInTime && !att?.checkOutTime && !isToday)) indicators.push('missing_punch_out');
    if (att?.status === 'half_day') indicators.push('insufficient_hours');
    if (att?.isRegularized) indicators.push('regularized');

    const exceptions: Array<{ type: string; details: string }> = [];
    if (att?.isLate) exceptions.push({ type: 'Late Arrival', details: `Late by ${att.lateMinutes} minutes` });
    if (att?.isEarlyExit) exceptions.push({ type: 'Early Exit', details: `Exited ${att.earlyMinutes} minutes early` });
    if (att?.isMissingPunch) exceptions.push({ type: 'Missing Punch', details: 'Unresolved punch discrepancy' });

    return {
      employee: {
        id: emp.employeeId,
        employeeCode: emp.employeeCode ?? '',
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        departmentName: emp.departmentName ?? null,
        designationName: emp.designationName ?? null,
        locationName: emp.locationName ?? null,
        workday: date,
        assignedShift: {
          scheduleRef: emp.scheduleRef ?? 'General 09:00 - 18:00',
          startTime: emp.scheduleStartTime ?? '09:00',
          endTime: emp.scheduleEndTime ?? '18:00',
          workingDays: emp.scheduleWorkingDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          breakMinutes: emp.scheduleBreakMinutes ?? 60,
          timeZone: emp.scheduleTimezone ?? emp.locationTimezone ?? 'UTC',
        },
        timeZone: emp.scheduleTimezone ?? emp.locationTimezone ?? 'UTC',
      },
      attendanceSummary: {
        id: att?.id ?? `missing_${emp.employeeId}`,
        checkInTime: att?.checkInTime ?? null,
        checkOutTime: att?.checkOutTime ?? null,
        workedMinutes: att?.workedMinutes ?? 0,
        status: (att?.status ?? (leaveRows[0] ? 'on_leave' : odRows[0] ? 'on_duty' : 'absent')) as DailyAttendanceItem['status'],
        processingState: att?.processingState ?? 'finalized',
        indicators,
        isLate: att?.isLate ?? false,
        lateMinutes: att?.lateMinutes ?? 0,
        isEarlyExit: att?.isEarlyExit ?? false,
        earlyMinutes: att?.earlyMinutes ?? 0,
        isMissingPunch: att?.isMissingPunch ?? false,
        isRegularized: att?.isRegularized ?? false,
        effectivePolicy: policy
          ? {
              id: policy.id,
              policyName: policy.policyName,
              version: policy.version,
              gracePeriodMinutes: policy.gracePeriodMinutes,
              missingPunchPolicy: policy.missingPunchPolicy,
            }
          : null,
      },
      punchTimeline: punchRows.map((p) => ({
        id: p.id,
        punchTime: p.punchTime.toISOString(),
        punchType: p.punchType,
        source: p.source,
        workLocation: p.workLocation,
        notes: p.notes,
        deviceMetadata: p.deviceMetadata,
        isDuplicate: p.isDuplicate,
      })),
      relatedRecords: {
        leave: leaveRows[0]
          ? {
              id: leaveRows[0].id,
              status: leaveRows[0].status,
              startDate: leaveRows[0].startDate,
              endDate: leaveRows[0].endDate,
              reason: leaveRows[0].reason,
            }
          : null,
        onDuty: odRows[0]
          ? {
              id: odRows[0].id,
              odTypeName: odRows[0].odTypeName,
              status: odRows[0].status,
              startDate: odRows[0].startDate,
              endDate: odRows[0].endDate,
              reason: odRows[0].reason,
            }
          : null,
        regularizations: relatedRegs,
        exceptions,
      },
      historyAndActions: {
        calculationMetadata: att?.calculationMetadata ?? null,
        shiftScheduleRef: att?.shiftScheduleRef ?? emp.scheduleRef ?? null,
        notes: att?.notes ?? null,
        isLocked,
        canManualCorrect: !isLocked,
        canRegularize: !isLocked,
        canRecalculate: !isLocked,
      },
    };
  }

  async bulkFinalizeAttendance(
    tenantId: string,
    companyId: string,
    employeeIds: string[],
    date: string,
  ): Promise<{ finalizedCount: number }> {
    const db = getDb();
    const isLocked = await this.checkDateInLockedPeriod(tenantId, companyId, date, date);
    if (isLocked) {
      throw new Error(`Cannot finalize attendance for ${date}: Period is locked for payroll`);
    }

    if (employeeIds.length === 0) return { finalizedCount: 0 };

    await db
      .update(employeeAttendance)
      .set({ processingState: 'finalized' })
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.date, date),
          sql`${employeeAttendance.employeeId} IN (${sql.join(
            employeeIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      );

    return { finalizedCount: employeeIds.length };
  }

  async updateDailyAttendance(
    id: string,
    updates: Partial<typeof employeeAttendance.$inferInsert>,
  ): Promise<EmployeeAttendance> {
    const db = getDb();
    await db.update(employeeAttendance).set(updates).where(eq(employeeAttendance.id, id));

    const [updated] = await db
      .select()
      .from(employeeAttendance)
      .where(eq(employeeAttendance.id, id));
    return updated!;
  }

  async upsertDailyAttendance(
    data: typeof employeeAttendance.$inferInsert,
  ): Promise<EmployeeAttendance> {
    const db = getDb();
    const existing = await this.getTodayAttendance(
      data.tenantId,
      data.companyId,
      data.employeeId,
      data.date,
    );

    if (existing) {
      await db.update(employeeAttendance).set(data).where(eq(employeeAttendance.id, existing.id));
      const [updated] = await db
        .select()
        .from(employeeAttendance)
        .where(eq(employeeAttendance.id, existing.id));
      return updated!;
    }

    await db.insert(employeeAttendance).values(data);
    const [created] = await db
      .select()
      .from(employeeAttendance)
      .where(eq(employeeAttendance.id, data.id));
    return created!;
  }

  async detectAndSyncExceptions(
    tenantId: string,
    companyId: string,
  ): Promise<{ syncedCount: number }> {
    const db = getDb();
    let syncedCount = 0;

    // 1. Scan employeeAttendance for missing punches, late arrival, early exit, insufficient hours
    const dailyRows = await db
      .select({
        id: employeeAttendance.id,
        employeeId: employeeAttendance.employeeId,
        date: employeeAttendance.date,
        checkInTime: employeeAttendance.checkInTime,
        checkOutTime: employeeAttendance.checkOutTime,
        status: employeeAttendance.status,
        processingState: employeeAttendance.processingState,
        isLate: employeeAttendance.isLate,
        lateMinutes: employeeAttendance.lateMinutes,
        isEarlyExit: employeeAttendance.isEarlyExit,
        earlyMinutes: employeeAttendance.earlyMinutes,
        isMissingPunch: employeeAttendance.isMissingPunch,
        isRegularized: employeeAttendance.isRegularized,
        workedMinutes: employeeAttendance.workedMinutes,
      })
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          sql`(${employeeAttendance.isMissingPunch} = true OR ${employeeAttendance.isLate} = true OR ${employeeAttendance.isEarlyExit} = true OR ${employeeAttendance.status} = 'half_day' OR ${employeeAttendance.status} = 'incomplete')`,
        ),
      )
      .limit(200);

    for (const r of dailyRows) {
      if (r.isRegularized) continue;

      let exType: ExceptionType | null = null;
      let severity: ExceptionSeverity = 'medium';
      let title = '';
      let description = '';

      if (r.isMissingPunch || r.status === 'incomplete') {
        if (!r.checkInTime) {
          exType = 'missing_in';
          severity = 'critical';
          title = 'Missing Check-In Punch';
          description = `No start punch recorded for workday ${r.date}`;
        } else if (!r.checkOutTime) {
          exType = 'missing_out';
          severity = 'high';
          title = 'Missing Check-Out Punch';
          description = `No exit punch recorded for workday ${r.date}`;
        } else {
          exType = 'missing_in';
          severity = 'high';
          title = 'Punch Discrepancy';
          description = `Unresolved punch sequence discrepancy for workday ${r.date}`;
        }
      } else if (r.isLate) {
        exType = 'late_arrival';
        severity = (r.lateMinutes ?? 0) > 60 ? 'high' : 'medium';
        title = `Late Arrival (${r.lateMinutes ?? 0}m)`;
        description = `Employee arrived ${r.lateMinutes ?? 0} minutes past shift schedule`;
      } else if (r.isEarlyExit) {
        exType = 'early_exit';
        severity = (r.earlyMinutes ?? 0) > 60 ? 'high' : 'medium';
        title = `Early Exit (${r.earlyMinutes ?? 0}m)`;
        description = `Employee departed ${r.earlyMinutes ?? 0} minutes before shift end`;
      } else if (r.status === 'half_day' || (r.workedMinutes > 0 && r.workedMinutes < 240)) {
        exType = 'insufficient_hours';
        severity = 'medium';
        title = 'Insufficient Working Hours';
        description = `Recorded only ${Math.round((r.workedMinutes / 60) * 10) / 10} hours worked`;
      }

      if (!exType) continue;

      // Check deduplication
      const existing = await db
        .select({ id: attendanceExceptions.id, status: attendanceExceptions.status })
        .from(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.companyId, companyId),
            eq(attendanceExceptions.sourceRecordType, 'daily_attendance'),
            eq(attendanceExceptions.sourceRecordId, r.id),
            eq(attendanceExceptions.exceptionType, exType),
          ),
        );

      if (existing.length === 0) {
        const excId = generateSurrogateId('aexc');
        await db.insert(attendanceExceptions).values({
          id: excId,
          tenantId,
          companyId,
          employeeId: r.employeeId,
          workday: r.date,
          exceptionType: exType,
          severity,
          source: 'engine',
          sourceRecordType: 'daily_attendance',
          sourceRecordId: r.id,
          title,
          description,
          status: 'open',
          detectedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await db.insert(attendanceExceptionAudits).values({
          id: generateSurrogateId('aexca'),
          tenantId,
          companyId,
          exceptionId: excId,
          action: 'detected',
          actorUserId: 'system',
          oldState: null,
          newState: { status: 'open', severity, exceptionType: exType },
          notes: 'Exception detected by automated attendance engine scan',
          createdAt: new Date(),
        });
        syncedCount++;
      }
    }

    // 2. Scan attendancePunches for unmatched, invalid, duplicate, or failed syncs
    const punchRows = await db
      .select({
        id: attendancePunches.id,
        employeeId: attendancePunches.employeeId,
        rawIdentifier: attendancePunches.rawIdentifier,
        workday: attendancePunches.workday,
        source: attendancePunches.source,
        validationStatus: attendancePunches.validationStatus,
        validationReason: attendancePunches.validationReason,
        processingState: attendancePunches.processingState,
        processingError: attendancePunches.processingError,
        punchTime: attendancePunches.punchTime,
      })
      .from(attendancePunches)
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          sql`(${attendancePunches.validationStatus} IN ('unmatched', 'duplicate', 'invalid') OR ${attendancePunches.processingState} = 'failed')`,
        ),
      )
      .limit(100);

    for (const p of punchRows) {
      let pExType: ExceptionType | null = null;
      let pSeverity: ExceptionSeverity = 'medium';
      let pTitle = '';
      let pDesc = '';

      if (p.validationStatus === 'unmatched') {
        pExType = 'unmatched_employee';
        pSeverity = 'high';
        pTitle = 'Unmatched Hardware Employee';
        pDesc = `Punch received for unmapped biometric/card identifier: ${p.rawIdentifier || 'Unknown'}`;
      } else if (p.validationStatus === 'duplicate') {
        pExType = 'duplicate_punch';
        pSeverity = 'low';
        pTitle = 'Duplicate Punch Event';
        pDesc = 'Multiple identical punches recorded within deduplication threshold';
      } else if (p.validationStatus === 'invalid') {
        pExType = 'invalid_punch';
        pSeverity = 'medium';
        pTitle = 'Invalid Punch Validation';
        pDesc = p.validationReason || 'Punch failed policy validation rules';
      } else if (p.processingState === 'failed') {
        pExType = 'device_sync_failure';
        pSeverity = 'critical';
        pTitle = 'Device / Ingestion Failure';
        pDesc = p.processingError || 'Technical error during punch processing';
      }

      if (!pExType) continue;

      const pExisting = await db
        .select({ id: attendanceExceptions.id })
        .from(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.companyId, companyId),
            eq(attendanceExceptions.sourceRecordType, 'punch_log'),
            eq(attendanceExceptions.sourceRecordId, p.id),
            eq(attendanceExceptions.exceptionType, pExType),
          ),
        );

      if (pExisting.length === 0) {
        const excId = generateSurrogateId('aexc');
        await db.insert(attendanceExceptions).values({
          id: excId,
          tenantId,
          companyId,
          employeeId: p.employeeId,
          workday: p.workday,
          exceptionType: pExType,
          severity: pSeverity,
          source: (p.source as any) || 'biometric',
          sourceRecordType: 'punch_log',
          sourceRecordId: p.id,
          title: pTitle,
          description: pDesc,
          status: 'open',
          detectedAt: p.punchTime || new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await db.insert(attendanceExceptionAudits).values({
          id: generateSurrogateId('aexca'),
          tenantId,
          companyId,
          exceptionId: excId,
          action: 'detected',
          actorUserId: 'system',
          oldState: null,
          newState: { status: 'open', severity: pSeverity, exceptionType: pExType },
          notes: 'Hardware anomaly detected during punch validation',
          createdAt: new Date(),
        });
        syncedCount++;
      }
    }

    return { syncedCount };
  }

  async getExceptions(
    tenantId: string,
    companyId: string,
    filter: ExceptionFilter = {},
  ): Promise<ExceptionQueryResult> {
    const db = getDb();

    // Trigger proactive scan & deduplication
    try {
      await this.detectAndSyncExceptions(tenantId, companyId);
    } catch {
      // Continue even if scan encounters non-blocking error
    }

    const filterConditions: any[] = [
      eq(attendanceExceptions.tenantId, tenantId),
      eq(attendanceExceptions.companyId, companyId),
    ];

    // Status filter
    if (!filter.status || filter.status === 'active') {
      filterConditions.push(
        inArray(attendanceExceptions.status, ['open', 'assigned', 'in_review', 'pending_action']),
      );
    } else if (filter.status !== 'all') {
      filterConditions.push(eq(attendanceExceptions.status, filter.status as any));
    }

    // Severity filter
    if (filter.severity && filter.severity !== 'all') {
      filterConditions.push(eq(attendanceExceptions.severity, filter.severity as any));
    }

    // Exception type filter
    if (filter.exceptionType && filter.exceptionType !== 'all') {
      filterConditions.push(eq(attendanceExceptions.exceptionType, filter.exceptionType as any));
    }

    // Source filter
    if (filter.source && filter.source !== 'all') {
      filterConditions.push(eq(attendanceExceptions.source, filter.source as any));
    }

    // Assignment filter
    if (filter.assignment === 'unassigned') {
      filterConditions.push(
        or(isNull(attendanceExceptions.assignedTo), eq(attendanceExceptions.assignedTo, '')),
      );
    } else if (filter.assignedTo && filter.assignedTo !== 'all') {
      filterConditions.push(eq(attendanceExceptions.assignedTo, filter.assignedTo));
    }

    // Pending action reason
    if (filter.pendingActionReason && filter.pendingActionReason !== 'all') {
      filterConditions.push(eq(attendanceExceptions.pendingActionReason, filter.pendingActionReason));
    }

    // Date range with dual interpretation
    if (filter.dateInterpretation === 'detected_at') {
      if (filter.dateFrom) {
        filterConditions.push(gte(attendanceExceptions.detectedAt, new Date(filter.dateFrom)));
      }
      if (filter.dateTo) {
        filterConditions.push(
          lte(attendanceExceptions.detectedAt, new Date(`${filter.dateTo}T23:59:59.999Z`)),
        );
      }
    } else {
      if (filter.dateFrom) {
        filterConditions.push(gte(attendanceExceptions.workday, filter.dateFrom));
      }
      if (filter.dateTo) {
        filterConditions.push(lte(attendanceExceptions.workday, filter.dateTo));
      }
    }

    // Department filter
    if (filter.departmentId) {
      filterConditions.push(eq(employees.departmentId, filter.departmentId));
    }

    // Search filter
    if (filter.search && filter.search.trim()) {
      const term = `%${filter.search.trim()}%`;
      filterConditions.push(
        or(
          sql`${employees.firstName} LIKE ${term}`,
          sql`${employees.lastName} LIKE ${term}`,
          sql`${employees.employeeNumber} LIKE ${term}`,
          sql`${attendanceExceptions.title} LIKE ${term}`,
          sql`${attendanceExceptions.id} LIKE ${term}`,
        ),
      );
    }

    // Compute the 6 Real Summary Counters from database
    const [counterRow] = await db
      .select({
        activeCases: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceExceptions.status} IN ('open', 'assigned', 'in_review', 'pending_action') THEN 1 ELSE 0 END), 0)`,
        critical: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceExceptions.status} IN ('open', 'assigned', 'in_review', 'pending_action') AND ${attendanceExceptions.severity} = 'critical' THEN 1 ELSE 0 END), 0)`,
        highPriority: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceExceptions.status} IN ('open', 'assigned', 'in_review', 'pending_action') AND ${attendanceExceptions.severity} = 'high' THEN 1 ELSE 0 END), 0)`,
        unassigned: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceExceptions.status} IN ('open', 'assigned', 'in_review', 'pending_action') AND (${attendanceExceptions.assignedTo} IS NULL OR ${attendanceExceptions.assignedTo} = '') THEN 1 ELSE 0 END), 0)`,
        pendingAction: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceExceptions.status} = 'pending_action' THEN 1 ELSE 0 END), 0)`,
        resolvedToday: sql<number>`COALESCE(SUM(CASE WHEN ${attendanceExceptions.status} = 'resolved' AND DATE(${attendanceExceptions.resolvedAt}) = CURRENT_DATE() THEN 1 ELSE 0 END), 0)`,
      })
      .from(attendanceExceptions)
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
        ),
      );

    const counters: ExceptionSummaryCounters = {
      activeCases: Number(counterRow?.activeCases ?? 0),
      critical: Number(counterRow?.critical ?? 0),
      highPriority: Number(counterRow?.highPriority ?? 0),
      unassigned: Number(counterRow?.unassigned ?? 0),
      pendingAction: Number(counterRow?.pendingAction ?? 0),
      resolvedToday: Number(counterRow?.resolvedToday ?? 0),
    };

    // Total count for current filtered query
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(attendanceExceptions)
      .leftJoin(employees, eq(attendanceExceptions.employeeId, employees.id))
      .where(and(...filterConditions));

    const total = Number(countRow?.count ?? 0);
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    // Sorting expression (default: Critical -> High -> Medium -> Low, then oldest detected_at)
    const severityOrder = sql`CASE ${attendanceExceptions.severity}
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END`;

    let orderByClause = [asc(severityOrder), asc(attendanceExceptions.detectedAt)];
    if (filter.sortBy === 'detectedAt') {
      orderByClause = [filter.sortOrder === 'desc' ? desc(attendanceExceptions.detectedAt) : asc(attendanceExceptions.detectedAt)];
    } else if (filter.sortBy === 'workday') {
      orderByClause = [filter.sortOrder === 'desc' ? desc(attendanceExceptions.workday) : asc(attendanceExceptions.workday)];
    } else if (filter.sortBy === 'status') {
      orderByClause = [filter.sortOrder === 'desc' ? desc(attendanceExceptions.status) : asc(attendanceExceptions.status)];
    } else if (filter.sortBy === 'exceptionType') {
      orderByClause = [filter.sortOrder === 'desc' ? desc(attendanceExceptions.exceptionType) : asc(attendanceExceptions.exceptionType)];
    }

    const rows = await db
      .select({
        id: attendanceExceptions.id,
        tenantId: attendanceExceptions.tenantId,
        companyId: attendanceExceptions.companyId,
        employeeId: attendanceExceptions.employeeId,
        workday: attendanceExceptions.workday,
        exceptionType: attendanceExceptions.exceptionType,
        severity: attendanceExceptions.severity,
        source: attendanceExceptions.source,
        sourceRecordType: attendanceExceptions.sourceRecordType,
        sourceRecordId: attendanceExceptions.sourceRecordId,
        title: attendanceExceptions.title,
        description: attendanceExceptions.description,
        status: attendanceExceptions.status,
        assignedTo: attendanceExceptions.assignedTo,
        assignedQueue: attendanceExceptions.assignedQueue,
        pendingActionReason: attendanceExceptions.pendingActionReason,
        pendingActionAwaitedFrom: attendanceExceptions.pendingActionAwaitedFrom,
        resolutionType: attendanceExceptions.resolutionType,
        resolutionNotes: attendanceExceptions.resolutionNotes,
        resolvedAt: attendanceExceptions.resolvedAt,
        resolvedByUserId: attendanceExceptions.resolvedByUserId,
        closedAt: attendanceExceptions.closedAt,
        closedByUserId: attendanceExceptions.closedByUserId,
        detectedAt: attendanceExceptions.detectedAt,
        createdAt: attendanceExceptions.createdAt,
        updatedAt: attendanceExceptions.updatedAt,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeNumber: employees.employeeNumber,
        departmentName: departments.name,
      })
      .from(attendanceExceptions)
      .leftJoin(employees, eq(attendanceExceptions.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...filterConditions))
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset);

    const items: AttendanceExceptionCaseItem[] = rows.map((r) => {
      const fullName = [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
      return {
        id: r.id,
        tenantId: r.tenantId,
        companyId: r.companyId,
        employeeId: r.employeeId,
        employeeName: fullName || (r.employeeId ? 'Unknown Employee' : 'Unmatched Employee'),
        employeeCode: r.employeeNumber || (r.employeeId ? r.employeeId.slice(0, 8) : 'UNMATCHED'),
        departmentName: r.departmentName ?? null,
        workday: r.workday,
        exceptionType: r.exceptionType,
        severity: r.severity,
        source: r.source,
        sourceRecordType: r.sourceRecordType,
        sourceRecordId: r.sourceRecordId,
        title: r.title,
        description: r.description,
        status: r.status,
        assignedTo: r.assignedTo,
        assignedQueue: r.assignedQueue,
        pendingActionReason: r.pendingActionReason,
        pendingActionAwaitedFrom: r.pendingActionAwaitedFrom,
        resolutionType: r.resolutionType,
        resolutionNotes: r.resolutionNotes,
        resolvedAt: r.resolvedAt,
        resolvedByUserId: r.resolvedByUserId,
        closedAt: r.closedAt,
        closedByUserId: r.closedByUserId,
        detectedAt: r.detectedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        relatedRecordSummary: {
          type: r.sourceRecordType,
          id: r.sourceRecordId,
          label: `${r.sourceRecordType.replace('_', ' ').toUpperCase()} #${r.sourceRecordId.slice(-8)}`,
        },
      };
    });

    return {
      items,
      counters,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getExceptionById(
    tenantId: string,
    companyId: string,
    exceptionId: string,
  ): Promise<ExceptionCaseDetail | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: attendanceExceptions.id,
        tenantId: attendanceExceptions.tenantId,
        companyId: attendanceExceptions.companyId,
        employeeId: attendanceExceptions.employeeId,
        workday: attendanceExceptions.workday,
        exceptionType: attendanceExceptions.exceptionType,
        severity: attendanceExceptions.severity,
        source: attendanceExceptions.source,
        sourceRecordType: attendanceExceptions.sourceRecordType,
        sourceRecordId: attendanceExceptions.sourceRecordId,
        title: attendanceExceptions.title,
        description: attendanceExceptions.description,
        status: attendanceExceptions.status,
        assignedTo: attendanceExceptions.assignedTo,
        assignedQueue: attendanceExceptions.assignedQueue,
        pendingActionReason: attendanceExceptions.pendingActionReason,
        pendingActionAwaitedFrom: attendanceExceptions.pendingActionAwaitedFrom,
        resolutionType: attendanceExceptions.resolutionType,
        resolutionNotes: attendanceExceptions.resolutionNotes,
        resolvedAt: attendanceExceptions.resolvedAt,
        resolvedByUserId: attendanceExceptions.resolvedByUserId,
        closedAt: attendanceExceptions.closedAt,
        closedByUserId: attendanceExceptions.closedByUserId,
        detectedAt: attendanceExceptions.detectedAt,
        createdAt: attendanceExceptions.createdAt,
        updatedAt: attendanceExceptions.updatedAt,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeNumber: employees.employeeNumber,
        departmentName: departments.name,
      })
      .from(attendanceExceptions)
      .leftJoin(employees, eq(attendanceExceptions.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
          eq(attendanceExceptions.id, exceptionId),
        ),
      );

    if (!row) return null;

    // Fetch Evidence Context
    let evidencePunches: Array<{
      id: string;
      punchTime: string | Date;
      punchType: string;
      source: string;
      validationStatus?: string;
    }> = [];
    let evidenceDailyLog: any = null;

    if (row.employeeId && row.workday) {
      const punches = await db
        .select({
          id: attendancePunches.id,
          punchTime: attendancePunches.punchTime,
          punchType: attendancePunches.punchType,
          source: attendancePunches.source,
          validationStatus: attendancePunches.validationStatus,
        })
        .from(attendancePunches)
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.employeeId, row.employeeId),
            eq(attendancePunches.workday, row.workday),
          ),
        )
        .orderBy(asc(attendancePunches.punchTime));
      evidencePunches = punches;

      const [daily] = await db
        .select()
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            eq(employeeAttendance.employeeId, row.employeeId),
            eq(employeeAttendance.date, row.workday),
          ),
        );
      if (daily) evidenceDailyLog = daily;
    }

    // Fetch Case Audit Trail
    const auditRows = await db
      .select({
        id: attendanceExceptionAudits.id,
        action: attendanceExceptionAudits.action,
        actorUserId: attendanceExceptionAudits.actorUserId,
        oldState: attendanceExceptionAudits.oldState,
        newState: attendanceExceptionAudits.newState,
        notes: attendanceExceptionAudits.notes,
        createdAt: attendanceExceptionAudits.createdAt,
      })
      .from(attendanceExceptionAudits)
      .where(
        and(
          eq(attendanceExceptionAudits.tenantId, tenantId),
          eq(attendanceExceptionAudits.companyId, companyId),
          eq(attendanceExceptionAudits.exceptionId, exceptionId),
        ),
      )
      .orderBy(desc(attendanceExceptionAudits.createdAt));

    const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
    return {
      id: row.id,
      tenantId: row.tenantId,
      companyId: row.companyId,
      employeeId: row.employeeId,
      employeeName: fullName || (row.employeeId ? 'Unknown Employee' : 'Unmatched Employee'),
      employeeCode: row.employeeNumber || (row.employeeId ? row.employeeId.slice(0, 8) : 'UNMATCHED'),
      departmentName: row.departmentName ?? null,
      workday: row.workday,
      exceptionType: row.exceptionType,
      severity: row.severity,
      source: row.source,
      sourceRecordType: row.sourceRecordType,
      sourceRecordId: row.sourceRecordId,
      title: row.title,
      description: row.description,
      status: row.status,
      assignedTo: row.assignedTo,
      assignedQueue: row.assignedQueue,
      pendingActionReason: row.pendingActionReason,
      pendingActionAwaitedFrom: row.pendingActionAwaitedFrom,
      resolutionType: row.resolutionType,
      resolutionNotes: row.resolutionNotes,
      resolvedAt: row.resolvedAt,
      resolvedByUserId: row.resolvedByUserId,
      closedAt: row.closedAt,
      closedByUserId: row.closedByUserId,
      detectedAt: row.detectedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      relatedRecordSummary: {
        type: row.sourceRecordType,
        id: row.sourceRecordId,
        label: `${row.sourceRecordType.replace('_', ' ').toUpperCase()} #${row.sourceRecordId.slice(-8)}`,
      },
      evidence: {
        punches: evidencePunches,
        dailyLog: evidenceDailyLog,
      },
      audits: auditRows,
    };
  }

  async assignException(
    tenantId: string,
    companyId: string,
    input: AssignExceptionInput,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    const db = getDb();
    const existing = await this.getExceptionById(tenantId, companyId, input.exceptionId);
    if (!existing) {
      throw new Error(`Exception case not found: ${input.exceptionId}`);
    }

    const nextStatus: ExceptionStatus = existing.status === 'open' ? 'assigned' : existing.status;
    const updates: Partial<typeof attendanceExceptions.$inferInsert> = {
      assignedTo: input.assignedTo ?? existing.assignedTo,
      assignedQueue: input.assignedQueue ?? existing.assignedQueue,
      status: nextStatus,
      updatedAt: new Date(),
    };

    await db
      .update(attendanceExceptions)
      .set(updates)
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
          eq(attendanceExceptions.id, input.exceptionId),
        ),
      );

    await db.insert(attendanceExceptionAudits).values({
      id: generateSurrogateId('aexca'),
      tenantId,
      companyId,
      exceptionId: input.exceptionId,
      action: existing.assignedTo ? 'reassigned' : 'assigned',
      actorUserId,
      oldState: { assignedTo: existing.assignedTo, status: existing.status },
      newState: { assignedTo: updates.assignedTo, status: nextStatus },
      notes: input.notes || 'Case assigned to reviewer',
      createdAt: new Date(),
    });

    const updated = await this.getExceptionById(tenantId, companyId, input.exceptionId);
    return updated!;
  }

  async updateExceptionStatus(
    tenantId: string,
    companyId: string,
    input: UpdateExceptionStatusInput,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    const db = getDb();
    const existing = await this.getExceptionById(tenantId, companyId, input.exceptionId);
    if (!existing) {
      throw new Error(`Exception case not found: ${input.exceptionId}`);
    }

    const updates: Partial<typeof attendanceExceptions.$inferInsert> = {
      status: input.status,
      updatedAt: new Date(),
    };

    if (input.pendingActionReason !== undefined) {
      updates.pendingActionReason = input.pendingActionReason;
    }
    if (input.pendingActionAwaitedFrom !== undefined) {
      updates.pendingActionAwaitedFrom = input.pendingActionAwaitedFrom;
    }
    if (input.resolutionNotes !== undefined) {
      updates.resolutionNotes = input.resolutionNotes;
    }
    if (input.resolutionType !== undefined) {
      updates.resolutionType = input.resolutionType;
    }

    let auditAction: any = 'status_transitioned';
    if (input.status === 'resolved') {
      updates.resolvedAt = new Date();
      updates.resolvedByUserId = actorUserId;
      auditAction = 'resolved';
    } else if (input.status === 'closed') {
      updates.closedAt = new Date();
      updates.closedByUserId = actorUserId;
      auditAction = 'closed';
    } else if (input.status === 'pending_action') {
      auditAction = 'pending_action_marked';
    } else if (existing.status === 'closed' || existing.status === 'resolved') {
      auditAction = 'reopened';
    }

    await db
      .update(attendanceExceptions)
      .set(updates)
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
          eq(attendanceExceptions.id, input.exceptionId),
        ),
      );

    await db.insert(attendanceExceptionAudits).values({
      id: generateSurrogateId('aexca'),
      tenantId,
      companyId,
      exceptionId: input.exceptionId,
      action: auditAction,
      actorUserId,
      oldState: { status: existing.status },
      newState: { status: input.status, reason: input.pendingActionReason },
      notes: input.notes || input.resolutionNotes || `Transitioned status to ${input.status}`,
      createdAt: new Date(),
    });

    const updated = await this.getExceptionById(tenantId, companyId, input.exceptionId);
    return updated!;
  }

  async overrideExceptionSeverity(
    tenantId: string,
    companyId: string,
    input: OverrideExceptionSeverityInput,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    const db = getDb();
    if (!input.reason || !input.reason.trim()) {
      throw new Error('Mandatory justification reason required to override case severity');
    }

    const existing = await this.getExceptionById(tenantId, companyId, input.exceptionId);
    if (!existing) {
      throw new Error(`Exception case not found: ${input.exceptionId}`);
    }

    await db
      .update(attendanceExceptions)
      .set({
        severity: input.severity,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
          eq(attendanceExceptions.id, input.exceptionId),
        ),
      );

    await db.insert(attendanceExceptionAudits).values({
      id: generateSurrogateId('aexca'),
      tenantId,
      companyId,
      exceptionId: input.exceptionId,
      action: 'severity_overridden',
      actorUserId,
      oldState: { severity: existing.severity },
      newState: { severity: input.severity },
      notes: input.reason.trim(),
      createdAt: new Date(),
    });

    const updated = await this.getExceptionById(tenantId, companyId, input.exceptionId);
    return updated!;
  }

  async verifyAndResolveException(
    tenantId: string,
    companyId: string,
    exceptionId: string,
    resolutionNotes: string,
    actorUserId: string,
  ): Promise<AttendanceExceptionCaseItem> {
    const db = getDb();
    const existing = await this.getExceptionById(tenantId, companyId, exceptionId);
    if (!existing) {
      throw new Error(`Exception case not found: ${exceptionId}`);
    }

    // Verify source integrity before permitting transition to Resolved
    if (existing.sourceRecordType === 'daily_attendance') {
      const [daily] = await db
        .select()
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            eq(employeeAttendance.id, existing.sourceRecordId),
          ),
        );

      if (!daily) {
        throw new Error('Underlying daily attendance record no longer exists.');
      }

      // Check if source discrepancy has been corrected
      const isMissingPunchResolved =
        !daily.isMissingPunch && daily.checkInTime !== null && daily.checkOutTime !== null;
      const isRegularizedOrCorrected =
        daily.isRegularized || daily.status === 'present' || isMissingPunchResolved;

      if (!isRegularizedOrCorrected && (existing.exceptionType === 'missing_in' || existing.exceptionType === 'missing_out')) {
        throw new Error(
          'Verification failed: Daily attendance record still has missing punches. Please complete Regularization or Manual Attendance Entry before resolving.',
        );
      }
    } else if (existing.sourceRecordType === 'punch_log') {
      const [punch] = await db
        .select()
        .from(attendancePunches)
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.id, existing.sourceRecordId),
          ),
        );

      if (punch && punch.validationStatus === 'unmatched') {
        throw new Error(
          'Verification failed: Hardware punch still has unmatched employee identity. Resolve identity in Punch Logs first.',
        );
      }
    }

    // Source condition verified! Transition case to Resolved
    const updates: Partial<typeof attendanceExceptions.$inferInsert> = {
      status: 'resolved',
      resolutionType: 'verified_source_resolution',
      resolutionNotes: resolutionNotes || 'Source condition verified and corrected',
      resolvedAt: new Date(),
      resolvedByUserId: actorUserId,
      updatedAt: new Date(),
    };

    await db
      .update(attendanceExceptions)
      .set(updates)
      .where(
        and(
          eq(attendanceExceptions.tenantId, tenantId),
          eq(attendanceExceptions.companyId, companyId),
          eq(attendanceExceptions.id, exceptionId),
        ),
      );

    await db.insert(attendanceExceptionAudits).values({
      id: generateSurrogateId('aexca'),
      tenantId,
      companyId,
      exceptionId,
      action: 'resolution_verified',
      actorUserId,
      oldState: { status: existing.status },
      newState: { status: 'resolved' },
      notes: resolutionNotes || 'Source verification passed: marked case resolved',
      createdAt: new Date(),
    });

    const updated = await this.getExceptionById(tenantId, companyId, exceptionId);
    return updated!;
  }

  async bulkExceptionAction(
    tenantId: string,
    companyId: string,
    input: BulkExceptionActionInput,
    actorUserId: string,
  ): Promise<{ success: boolean; affectedCount: number; message: string }> {
    let affectedCount = 0;

    for (const id of input.exceptionIds) {
      try {
        if (input.action === 'assign') {
          await this.assignException(
            tenantId,
            companyId,
            {
              exceptionId: id,
              assignedTo: input.assignedTo,
              assignedQueue: input.assignedQueue,
              notes: input.notes,
            },
            actorUserId,
          );
          affectedCount++;
        } else if (input.action === 'start_review') {
          await this.updateExceptionStatus(
            tenantId,
            companyId,
            {
              exceptionId: id,
              status: 'in_review',
              notes: input.notes || 'Review started in bulk',
            },
            actorUserId,
          );
          affectedCount++;
        } else if (input.action === 'mark_pending_action') {
          await this.updateExceptionStatus(
            tenantId,
            companyId,
            {
              exceptionId: id,
              status: 'pending_action',
              pendingActionReason: input.pendingActionReason || 'Awaiting action',
              pendingActionAwaitedFrom: input.pendingActionAwaitedFrom,
              notes: input.notes,
            },
            actorUserId,
          );
          affectedCount++;
        }
      } catch {
        // Individual item skip on error (partial bulk execution)
      }
    }

    return {
      success: true,
      affectedCount,
      message: `Successfully executed ${input.action} on ${affectedCount} exception case(s)`,
    };
  }

  // Backward-compatibility wrapper for existing test suites
  async getAttendanceExceptions(
    tenantId: string,
    companyId: string,
    filter: AttendanceExceptionFilter = {},
  ): Promise<AttendanceExceptionItem[]> {
    const res = await this.getExceptions(tenantId, companyId, {
      dateFrom: filter.date,
      dateTo: filter.date,
      exceptionType: filter.type,
      departmentId: filter.departmentId,
      status: 'all',
      limit: 100,
    });

    return res.items.map((i) => ({
      id: i.id,
      employeeId: i.employeeId ?? '',
      employeeCode: i.employeeCode,
      employeeName: i.employeeName,
      departmentName: i.departmentName ?? null,
      date: i.workday ?? new Date(i.detectedAt).toISOString().slice(0, 10),
      checkInTime: null,
      checkOutTime: null,
      exceptionType: (i.exceptionType as any) || 'missing_punch',
      details: i.description || i.title,
      status: i.status,
      isRegularized: i.status === 'resolved',
    }));
  }

  async getRegularizationRequests(
    tenantId: string,
    companyId: string,
    filter: RegularizationFilter,
  ): Promise<RegularizationItem[]> {
    const db = getDb();
    const conditions = [
      eq(employeeRequests.tenantId, tenantId),
      eq(employeeRequests.companyId, companyId),
      eq(employeeRequests.requestType, 'attendance_regularization'),
    ];

    if (filter.status && filter.status !== 'all') {
      conditions.push(
        eq(
          employeeRequests.status,
          filter.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
        ),
      );
    }
    if (filter.employeeId) {
      conditions.push(eq(employeeRequests.employeeId, filter.employeeId));
    }

    const rows = await db
      .select({
        id: employeeRequests.id,
        employeeId: employeeRequests.employeeId,
        subject: employeeRequests.subject,
        details: employeeRequests.details,
        status: employeeRequests.status,
        reviewerNotes: employeeRequests.reviewerNotes,
        reviewedByUserId: employeeRequests.reviewedByUserId,
        createdAt: employeeRequests.createdAt,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeNumber,
        departmentName: departments.name,
      })
      .from(employeeRequests)
      .leftJoin(employees, eq(employeeRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(employeeRequests.createdAt));

    return rows.map((r) => {
      const d = (r.details ?? {}) as Record<string, unknown>;
      const requestedIn =
        typeof d.checkInTime === 'string'
          ? d.checkInTime
          : typeof d.requestedCheckIn === 'string'
            ? d.requestedCheckIn
            : '';
      const requestedOut =
        typeof d.checkOutTime === 'string'
          ? d.checkOutTime
          : typeof d.requestedCheckOut === 'string'
            ? d.requestedCheckOut
            : '';

      return {
        id: r.id,
        employeeId: r.employeeId,
        employeeCode: r.employeeCode ?? '',
        employeeName: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Unknown',
        departmentName: r.departmentName ?? null,
        date: typeof d.date === 'string' ? d.date : '',
        requestedCheckIn: requestedIn,
        requestedCheckOut: requestedOut,
        reason: typeof d.reason === 'string' ? d.reason : '',
        status: r.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
        reviewerNotes: r.reviewerNotes,
        reviewedByUserId: r.reviewedByUserId,
        createdAt: r.createdAt,
      };
    });
  }

  async getRegularizationRequestById(tenantId: string, companyId: string, requestId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(employeeRequests)
      .where(
        and(
          eq(employeeRequests.tenantId, tenantId),
          eq(employeeRequests.companyId, companyId),
          eq(employeeRequests.id, requestId),
          eq(employeeRequests.requestType, 'attendance_regularization'),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async reviewRegularizationRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
    status: 'approved' | 'rejected',
    reviewerNotes?: string,
    reviewedByUserId?: string,
  ) {
    const db = getDb();
    await db
      .update(employeeRequests)
      .set({
        status,
        reviewerNotes: reviewerNotes ?? null,
        reviewedByUserId: reviewedByUserId ?? null,
      })
      .where(
        and(
          eq(employeeRequests.tenantId, tenantId),
          eq(employeeRequests.companyId, companyId),
          eq(employeeRequests.id, requestId),
        ),
      );

    const [updated] = await db
      .select()
      .from(employeeRequests)
      .where(eq(employeeRequests.id, requestId));
    return updated!;
  }

  async getOverviewData(tenantId: string, companyId: string, date: string) {
    const db = getDb();

    // 1. All active employees
    const empRows = await db
      .select({
        id: employees.id,
        departmentId: employees.departmentId,
        departmentName: departments.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.employmentStatus, 'active'),
        ),
      );

    const expectedCount = empRows.length;

    // 2. Attendance for today
    const attRows = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.date, date),
        ),
      );

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;
    let missingPunchCount = 0;
    let halfDayCount = 0;

    const recordedEmpIds = new Set<string>();

    for (const att of attRows) {
      recordedEmpIds.add(att.employeeId);
      if (att.status === 'present') presentCount++;
      else if (att.status === 'absent') absentCount++;
      else if (att.status === 'on_leave') onLeaveCount++;
      else if (att.status === 'half_day') halfDayCount++;

      if (att.isLate) lateCount++;
      if (att.isMissingPunch) missingPunchCount++;
    }

    // Unrecorded active employees are implicitly absent
    const unrecordedCount = Math.max(0, expectedCount - recordedEmpIds.size);
    absentCount += unrecordedCount;

    // 3. Pending regularizations
    const pendingReg = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeRequests)
      .where(
        and(
          eq(employeeRequests.tenantId, tenantId),
          eq(employeeRequests.companyId, companyId),
          eq(employeeRequests.requestType, 'attendance_regularization'),
          eq(employeeRequests.status, 'pending'),
        ),
      );

    const pendingRegularizationCount = Number(pendingReg[0]?.count ?? 0);

    // 4. Department breakdown
    const deptMap = new Map<string, { id: string; name: string; total: number; present: number }>();
    for (const emp of empRows) {
      const deptId = emp.departmentId ?? 'unassigned';
      const deptName = emp.departmentName ?? 'Unassigned';
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, { id: deptId, name: deptName, total: 0, present: 0 });
      }
      const entry = deptMap.get(deptId)!;
      entry.total++;
      const att = attRows.find((a) => a.employeeId === emp.id);
      if (att && (att.status === 'present' || att.status === 'half_day')) {
        entry.present++;
      }
    }

    const departmentBreakdown = Array.from(deptMap.values()).map((d) => ({
      departmentId: d.id,
      departmentName: d.name,
      present: d.present,
      total: d.total,
    }));

    // 5. Recent trends (last 5 business days ending on date)
    const recentTrends = [{ date, present: presentCount, absent: absentCount, late: lateCount }];

    const attendanceRate =
      expectedCount > 0
        ? Math.round(((presentCount + halfDayCount * 0.5) / expectedCount) * 100)
        : 0;

    return {
      date,
      expectedCount,
      presentCount,
      absentCount,
      lateCount,
      onLeaveCount,
      missingPunchCount,
      halfDayCount,
      pendingRegularizationCount,
      attendanceRate,
      departmentBreakdown,
      recentTrends,
    };
  }

  async getMonthlyMatrix(
    tenantId: string,
    companyId: string,
    year: number,
    month: number,
    departmentId?: string,
    search?: string,
  ): Promise<MonthlySummaryEmployeeRow[]> {
    const db = getDb();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const conditions = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
      eq(employees.employmentStatus, 'active'),
    ];

    if (departmentId) {
      conditions.push(eq(employees.departmentId, departmentId));
    }

    const empList = await db
      .select({
        employeeId: employees.id,
        employeeCode: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        designationName: designations.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(and(...conditions));

    const attRows = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          gte(employeeAttendance.date, startDate),
          lte(employeeAttendance.date, endDate),
        ),
      );

    const attMap = new Map<string, EmployeeAttendance>();
    for (const row of attRows) {
      attMap.set(`${row.employeeId}_${row.date}`, row);
    }

    let rows: MonthlySummaryEmployeeRow[] = empList.map((emp) => {
      const days: Record<string, MonthlySummaryDayDetail> = {};
      const totals = {
        present: 0,
        absent: 0,
        halfDay: 0,
        onLeave: 0,
        holiday: 0,
        totalWorkedMinutes: 0,
        totalLateMinutes: 0,
      };

      for (let d = 1; d <= lastDay; d++) {
        const dayStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
        const att = attMap.get(`${emp.employeeId}_${dayStr}`);

        if (att) {
          days[dayStr] = {
            status: att.status,
            processingState: att.processingState,
            checkInTime: att.checkInTime,
            checkOutTime: att.checkOutTime,
            workedMinutes: att.workedMinutes,
            isLate: att.isLate,
            isMissingPunch: att.isMissingPunch,
          };
          if (att.status === 'present') totals.present++;
          else if (att.status === 'absent' || att.status === 'incomplete') totals.absent++;
          else if (att.status === 'half_day') totals.halfDay++;
          else if (att.status === 'on_leave') totals.onLeave++;
          else if (att.status === 'holiday') totals.holiday++;

          totals.totalWorkedMinutes += att.workedMinutes;
          totals.totalLateMinutes += att.lateMinutes;
        } else {
          // Unrecorded: check if weekend
          const dObj = new Date(Date.UTC(year, month - 1, d));
          const dayOfWeek = dObj.getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          days[dayStr] = {
            status: isWeekend ? 'off' : 'absent',
            checkInTime: null,
            checkOutTime: null,
            workedMinutes: 0,
            isLate: false,
            isMissingPunch: false,
          };
          if (isWeekend) totals.holiday++;
          else totals.absent++;
        }
      }

      return {
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode ?? '',
        employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
        departmentId: emp.departmentId,
        departmentName: emp.departmentName ?? null,
        designationName: emp.designationName ?? null,
        days,
        totals,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          (r.departmentName && r.departmentName.toLowerCase().includes(q)),
      );
    }

    return rows;
  }

  // ════════════════════════════════════════════════════════════════════════
  // ON-DUTY (OD) WORKFLOW PERSISTENCE & QUERIES
  // ════════════════════════════════════════════════════════════════════════

  async createOnDutyRequest(
    tenantId: string,
    companyId: string,
    data: CreateOnDutyRequestInput & {
      id?: string;
      submittedByUserId?: string;
      effectivePolicyVersion?: number;
      status?: 'draft' | 'submitted';
      currentStage?: string;
    },
  ): Promise<AttendanceOnDutyRequest> {
    const db = getDb();
    const id = data.id || generateSurrogateId('od_req');
    const status = data.status || 'submitted';

    await db.insert(attendanceOnDutyRequests).values({
      id,
      tenantId,
      companyId,
      employeeId: data.employeeId,
      odTypeId: data.odTypeId,
      odTypeName: data.odTypeName || data.odTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      durationType: data.durationType || 'full_day',
      halfDaySession: data.halfDaySession || null,
      durationHours: data.durationHours ? String(data.durationHours) : '8.00',
      reason: data.reason,
      locationOrSite: data.locationOrSite || null,
      attachmentUrl: data.attachmentUrl || null,
      status,
      currentStage: status === 'submitted' ? 'pending_approval' : 'draft',
      submittedAt: status === 'submitted' ? new Date() : null,
      submittedByUserId: data.submittedByUserId || null,
      effectivePolicyVersion: data.effectivePolicyVersion || 1,
    });

    const [created] = await db
      .select()
      .from(attendanceOnDutyRequests)
      .where(eq(attendanceOnDutyRequests.id, id));
    return created!;
  }

  async getOnDutyRequests(
    tenantId: string,
    companyId: string,
    filter: OnDutyFilter,
  ): Promise<OnDutyRequestItem[]> {
    const db = getDb();
    const conditions = [
      eq(attendanceOnDutyRequests.tenantId, tenantId),
      eq(attendanceOnDutyRequests.companyId, companyId),
    ];

    if (filter.employeeId) {
      conditions.push(eq(attendanceOnDutyRequests.employeeId, filter.employeeId));
    }
    if (filter.status && filter.status !== 'all') {
      conditions.push(
        eq(
          attendanceOnDutyRequests.status,
          filter.status as 'draft' | 'submitted' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled',
        ),
      );
    }
    if (filter.startDate) {
      conditions.push(gte(attendanceOnDutyRequests.endDate, filter.startDate));
    }
    if (filter.endDate) {
      conditions.push(lte(attendanceOnDutyRequests.startDate, filter.endDate));
    }

    const rows = await db
      .select({
        id: attendanceOnDutyRequests.id,
        employeeId: attendanceOnDutyRequests.employeeId,
        odTypeId: attendanceOnDutyRequests.odTypeId,
        odTypeName: attendanceOnDutyRequests.odTypeName,
        startDate: attendanceOnDutyRequests.startDate,
        endDate: attendanceOnDutyRequests.endDate,
        startTime: attendanceOnDutyRequests.startTime,
        endTime: attendanceOnDutyRequests.endTime,
        durationType: attendanceOnDutyRequests.durationType,
        halfDaySession: attendanceOnDutyRequests.halfDaySession,
        durationHours: attendanceOnDutyRequests.durationHours,
        reason: attendanceOnDutyRequests.reason,
        locationOrSite: attendanceOnDutyRequests.locationOrSite,
        attachmentUrl: attendanceOnDutyRequests.attachmentUrl,
        status: attendanceOnDutyRequests.status,
        currentStage: attendanceOnDutyRequests.currentStage,
        decisionReason: attendanceOnDutyRequests.decisionReason,
        reviewedByUserId: attendanceOnDutyRequests.reviewedByUserId,
        reviewedAt: attendanceOnDutyRequests.reviewedAt,
        createdAt: attendanceOnDutyRequests.createdAt,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeNumber,
        departmentId: employees.departmentId,
        departmentName: departments.name,
      })
      .from(attendanceOnDutyRequests)
      .leftJoin(employees, eq(attendanceOnDutyRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceOnDutyRequests.createdAt));

    let filtered = rows;
    if (filter.departmentId) {
      filtered = filtered.filter((r) => r.departmentId === filter.departmentId);
    }

    return filtered.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeCode: r.employeeCode ?? '',
      employeeName: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Unknown',
      departmentName: r.departmentName ?? null,
      odTypeId: r.odTypeId,
      odTypeName: r.odTypeName,
      startDate: r.startDate,
      endDate: r.endDate,
      startTime: r.startTime,
      endTime: r.endTime,
      durationType: r.durationType,
      halfDaySession: r.halfDaySession,
      durationHours: Number(r.durationHours ?? 8),
      reason: r.reason,
      locationOrSite: r.locationOrSite,
      attachmentUrl: r.attachmentUrl,
      status: r.status,
      currentStage: r.currentStage,
      decisionReason: r.decisionReason,
      reviewedByUserId: r.reviewedByUserId,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    }));
  }

  async getOnDutyRequestById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<(AttendanceOnDutyRequest & { employeeName: string; employeeCode: string; departmentName: string | null }) | null> {
    const db = getDb();
    const rows = await db
      .select({
        req: attendanceOnDutyRequests,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeNumber,
        departmentName: departments.name,
      })
      .from(attendanceOnDutyRequests)
      .leftJoin(employees, eq(attendanceOnDutyRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
          eq(attendanceOnDutyRequests.id, id),
        ),
      )
      .limit(1);

    const r = rows[0];
    if (!r) return null;

    return {
      ...r.req,
      employeeName: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Unknown',
      employeeCode: r.employeeCode ?? '',
      departmentName: r.departmentName ?? null,
    };
  }

  async updateOnDutyRequest(
    tenantId: string,
    companyId: string,
    id: string,
    updates: Partial<NewAttendanceOnDutyRequest>,
  ): Promise<AttendanceOnDutyRequest> {
    const db = getDb();
    await db
      .update(attendanceOnDutyRequests)
      .set(updates)
      .where(
        and(
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
          eq(attendanceOnDutyRequests.id, id),
        ),
      );

    const [updated] = await db
      .select()
      .from(attendanceOnDutyRequests)
      .where(eq(attendanceOnDutyRequests.id, id));
    return updated!;
  }

  async checkOverlappingOnDuty(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeId?: string,
  ): Promise<AttendanceOnDutyRequest | null> {
    const db = getDb();
    const conditions = [
      eq(attendanceOnDutyRequests.tenantId, tenantId),
      eq(attendanceOnDutyRequests.companyId, companyId),
      eq(attendanceOnDutyRequests.employeeId, employeeId),
      // Active requests only (submitted, approved, draft)
      or(
        eq(attendanceOnDutyRequests.status, 'submitted'),
        eq(attendanceOnDutyRequests.status, 'approved'),
        eq(attendanceOnDutyRequests.status, 'draft'),
      ),
      lte(attendanceOnDutyRequests.startDate, endDate),
      gte(attendanceOnDutyRequests.endDate, startDate),
    ];

    if (excludeId) {
      conditions.push(ne(attendanceOnDutyRequests.id, excludeId));
    }

    const rows = await db
      .select()
      .from(attendanceOnDutyRequests)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  async checkOverlappingLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const db = getDb();
    const rows = await db
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

    return rows.length > 0;
  }

  async checkDateInLockedPeriod(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const db = getDb();
    const rows = await db
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

    return rows.length > 0;
  }

  async getApprovedOnDutyForDate(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<AttendanceOnDutyRequest | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceOnDutyRequests)
      .where(
        and(
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
          eq(attendanceOnDutyRequests.employeeId, employeeId),
          eq(attendanceOnDutyRequests.status, 'approved'),
          lte(attendanceOnDutyRequests.startDate, date),
          gte(attendanceOnDutyRequests.endDate, date),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }
}

export const attendanceRepository = new AttendanceRepository();
