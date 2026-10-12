import { and, desc, eq, gte, lte, sql, or, like, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  attendanceRegularizations,
  attendanceAdjustments,
  attendanceRegularizationAudits,
  employees,
  departments,
  locations,
  users,
  type NewAttendanceRegularization,
  type NewAttendanceAdjustment,
  type NewAttendanceRegularizationAudit,
} from '../../../../db/schema.js';
import type {
  RegularizationFilterV1,
  RegularizationItemV1,
  RegularizationSummaryCounters,
  RegularizationQueryResultV1,
  RegularizationRequestType,
} from '../types/attendance.types.js';

export class AttendanceRegularizationRepository {
  /**
   * Helper to format human-readable requested change description
   */
  formatRequestedChange(reg: {
    requestType: RegularizationRequestType;
    recordedCheckIn?: string | null;
    recordedCheckOut?: string | null;
    recordedStatus?: string | null;
    proposedCheckIn?: string | null;
    proposedCheckOut?: string | null;
    proposedStatus?: string | null;
    claimedHours?: string | number | null;
    targetPunchDirection?: string | null;
  }): string {
    const formatTime = (t?: string | null) => {
      if (!t) return '—';
      const parts = t.split(':');
      if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
        const h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedH = h % 12 || 12;
        return `${String(formattedH).padStart(2, '0')}:${m} ${ampm}`;
      }
      return t;
    };

    switch (reg.requestType) {
      case 'missing_in':
        return `IN: — → ${formatTime(reg.proposedCheckIn)}`;
      case 'missing_out':
        return `OUT: — → ${formatTime(reg.proposedCheckOut)}`;
      case 'incorrect_time':
        if (reg.proposedCheckIn && reg.proposedCheckOut) {
          return `IN: ${formatTime(reg.recordedCheckIn)} → ${formatTime(reg.proposedCheckIn)}, OUT: ${formatTime(reg.recordedCheckOut)} → ${formatTime(reg.proposedCheckOut)}`;
        }
        if (reg.proposedCheckIn) {
          return `IN: ${formatTime(reg.recordedCheckIn)} → ${formatTime(reg.proposedCheckIn)}`;
        }
        return `OUT: ${formatTime(reg.recordedCheckOut)} → ${formatTime(reg.proposedCheckOut)}`;
      case 'status_correction': {
        const rec = reg.recordedStatus ? reg.recordedStatus.replace('_', ' ') : 'Present';
        const prop = reg.proposedStatus ? reg.proposedStatus.replace('_', ' ') : 'Half Day';
        return `${rec.toUpperCase()} → ${prop.toUpperCase()}`;
      }
      case 'worked_hours':
        return `Hours → ${Number(reg.claimedHours || 0).toFixed(1)} hrs`;
      case 'both_missing':
        return `IN/OUT: — → ${formatTime(reg.proposedCheckIn)} / ${formatTime(reg.proposedCheckOut)}`;
      case 'wrong_direction': {
        const dir = reg.targetPunchDirection ? reg.targetPunchDirection.toUpperCase() : 'OUT';
        const target = dir === 'OUT' ? 'IN' : 'OUT';
        return `${dir} → ${target}`;
      }
      default:
        return 'Attendance Correction';
    }
  }

  /**
   * Generates sequential request number like REG-2026-00001
   */
  async generateNextRequestNumber(companyId: string): Promise<string> {
    const db = getDb();
    const year = new Date().getFullYear();
    const prefix = `REG-${year}-`;

    const [latest] = await db
      .select({ requestNumber: attendanceRegularizations.requestNumber })
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.companyId, companyId),
          like(attendanceRegularizations.requestNumber, `${prefix}%`),
        ),
      )
      .orderBy(desc(attendanceRegularizations.requestNumber))
      .limit(1);

    if (!latest?.requestNumber) {
      return `${prefix}00001`;
    }

    const numPart = latest.requestNumber.replace(prefix, '');
    const nextSeq = parseInt(numPart, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  /**
   * Count monthly submitted requests for an employee
   */
  async countMonthlyRequestsForEmployee(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const db = getDb();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const [res] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.tenantId, tenantId),
          eq(attendanceRegularizations.companyId, companyId),
          eq(attendanceRegularizations.employeeId, employeeId),
          gte(attendanceRegularizations.workday, startDate),
          lte(attendanceRegularizations.workday, endDate),
          sql`${attendanceRegularizations.approvalStatus} != 'cancelled'`,
        ),
      );

    return Number(res?.count || 0);
  }

  /**
   * Check if active request already exists for an employee on workday
   */
  async hasActiveRequestForWorkday(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workday: string,
    excludeId?: string,
  ): Promise<boolean> {
    const db = getDb();
    const conditions = [
      eq(attendanceRegularizations.tenantId, tenantId),
      eq(attendanceRegularizations.companyId, companyId),
      eq(attendanceRegularizations.employeeId, employeeId),
      eq(attendanceRegularizations.workday, workday),
      inArray(attendanceRegularizations.approvalStatus, [
        'submitted',
        'under_review',
        'awaiting_info',
        'approved',
      ]),
    ];

    if (excludeId) {
      conditions.push(sql`${attendanceRegularizations.id} != ${excludeId}`);
    }

    const [res] = await db
      .select({ id: attendanceRegularizations.id })
      .from(attendanceRegularizations)
      .where(and(...conditions))
      .limit(1);

    return !!res;
  }

  /**
   * List regularizations with pagination, filtering, and summary counters
   */
  async listRegularizations(
    tenantId: string,
    companyId: string,
    filter: RegularizationFilterV1 = {},
  ): Promise<RegularizationQueryResultV1> {
    const db = getDb();

    // 1. Build base filter conditions
    const conditions = [
      eq(attendanceRegularizations.tenantId, tenantId),
      eq(attendanceRegularizations.companyId, companyId),
    ];

    if (filter.employeeId) {
      conditions.push(eq(attendanceRegularizations.employeeId, filter.employeeId));
    }

    if (filter.workdayFrom) {
      conditions.push(gte(attendanceRegularizations.workday, filter.workdayFrom));
    }
    if (filter.workdayTo) {
      conditions.push(lte(attendanceRegularizations.workday, filter.workdayTo));
    }

    if (filter.submittedFrom) {
      conditions.push(
        gte(attendanceRegularizations.submittedAt, new Date(`${filter.submittedFrom}T00:00:00Z`)),
      );
    }
    if (filter.submittedTo) {
      conditions.push(
        lte(attendanceRegularizations.submittedAt, new Date(`${filter.submittedTo}T23:59:59Z`)),
      );
    }

    if (filter.approvalStatus && filter.approvalStatus !== 'all') {
      conditions.push(
        eq(
          attendanceRegularizations.approvalStatus,
          filter.approvalStatus as (typeof attendanceRegularizations.approvalStatus.enumValues)[number],
        ),
      );
    }

    if (filter.applicationStatus && filter.applicationStatus !== 'all') {
      conditions.push(
        eq(
          attendanceRegularizations.applicationStatus,
          filter.applicationStatus as (typeof attendanceRegularizations.applicationStatus.enumValues)[number],
        ),
      );
    }

    if (filter.requestType && filter.requestType !== 'all') {
      conditions.push(
        eq(
          attendanceRegularizations.requestType,
          filter.requestType as (typeof attendanceRegularizations.requestType.enumValues)[number],
        ),
      );
    }

    if (filter.assignedTo && filter.assignedTo !== 'all') {
      if (filter.assignedTo === 'unassigned') {
        conditions.push(sql`${attendanceRegularizations.assignedTo} IS NULL`);
      } else {
        conditions.push(eq(attendanceRegularizations.assignedTo, filter.assignedTo));
      }
    }

    if (filter.source && filter.source !== 'all') {
      conditions.push(
        eq(
          attendanceRegularizations.source,
          filter.source as (typeof attendanceRegularizations.source.enumValues)[number],
        ),
      );
    }

    if (filter.relatedException && filter.relatedException !== 'all') {
      if (filter.relatedException === 'has_exception') {
        conditions.push(sql`${attendanceRegularizations.relatedExceptionId} IS NOT NULL`);
      } else {
        conditions.push(eq(attendanceRegularizations.relatedExceptionId, filter.relatedException));
      }
    }

    if (filter.departmentId && filter.departmentId !== 'all') {
      conditions.push(eq(employees.departmentId, filter.departmentId));
    }

    if (filter.locationId && filter.locationId !== 'all') {
      conditions.push(eq(employees.locationId, filter.locationId));
    }

    if (filter.search && filter.search.trim()) {
      const q = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(attendanceRegularizations.requestNumber, q),
          like(employees.firstName, q),
          like(employees.lastName, q),
          like(employees.employeeNumber, q),
          like(attendanceRegularizations.reason, q),
        )!,
      );
    }

    // 2. Aggregate Summary Counters (tenant & company scoped)
    const [counts] = await db
      .select({
        pendingReview: sql<number>`SUM(CASE WHEN ${attendanceRegularizations.approvalStatus} = 'submitted' THEN 1 ELSE 0 END)`,
        underReview: sql<number>`SUM(CASE WHEN ${attendanceRegularizations.approvalStatus} = 'under_review' THEN 1 ELSE 0 END)`,
        awaitingInfo: sql<number>`SUM(CASE WHEN ${attendanceRegularizations.approvalStatus} = 'awaiting_info' THEN 1 ELSE 0 END)`,
        approvedToday: sql<number>`SUM(CASE WHEN ${attendanceRegularizations.approvalStatus} = 'approved' AND DATE(${attendanceRegularizations.decidedAt}) = CURDATE() THEN 1 ELSE 0 END)`,
        applicationIssues: sql<number>`SUM(CASE WHEN ${attendanceRegularizations.applicationStatus} IN ('failed', 'blocked') THEN 1 ELSE 0 END)`,
        rejectedToday: sql<number>`SUM(CASE WHEN ${attendanceRegularizations.approvalStatus} = 'rejected' AND DATE(${attendanceRegularizations.decidedAt}) = CURDATE() THEN 1 ELSE 0 END)`,
        total: sql<number>`count(*)`,
      })
      .from(attendanceRegularizations)
      .leftJoin(employees, eq(attendanceRegularizations.employeeId, employees.id))
      .where(
        and(
          eq(attendanceRegularizations.tenantId, tenantId),
          eq(attendanceRegularizations.companyId, companyId),
        ),
      );

    const counters: RegularizationSummaryCounters = {
      pendingReview: Number(counts?.pendingReview || 0),
      underReview: Number(counts?.underReview || 0),
      awaitingInfo: Number(counts?.awaitingInfo || 0),
      approvedToday: Number(counts?.approvedToday || 0),
      applicationIssues: Number(counts?.applicationIssues || 0),
      rejectedToday: Number(counts?.rejectedToday || 0),
    };

    // 3. Count matching query
    const [totalMatching] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceRegularizations)
      .leftJoin(employees, eq(attendanceRegularizations.employeeId, employees.id))
      .where(and(...conditions));

    const total = Number(totalMatching?.count || 0);

    // 4. Fetch paginated records with joins
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 50));
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        reg: attendanceRegularizations,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeNumber,
        departmentName: departments.name,
        reviewerFirstName: users.firstName,
        reviewerLastName: users.lastName,
      })
      .from(attendanceRegularizations)
      .leftJoin(employees, eq(attendanceRegularizations.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(users, eq(attendanceRegularizations.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRegularizations.submittedAt))
      .limit(limit)
      .offset(offset);

    const items: RegularizationItemV1[] = rows.map((r) => {
      const reg = r.reg;
      const employeeName = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Unknown';
      const reviewerName =
        `${r.reviewerFirstName ?? ''} ${r.reviewerLastName ?? ''}`.trim() || null;
      const requestedChange = this.formatRequestedChange({
        requestType: reg.requestType,
        recordedCheckIn: reg.recordedCheckIn,
        recordedCheckOut: reg.recordedCheckOut,
        recordedStatus: reg.recordedStatus,
        proposedCheckIn: reg.proposedCheckIn,
        proposedCheckOut: reg.proposedCheckOut,
        proposedStatus: reg.proposedStatus,
        claimedHours: reg.claimedHours ? Number(reg.claimedHours) : null,
        targetPunchDirection: reg.targetPunchDirection,
      });

      return {
        id: reg.id,
        requestNumber: reg.requestNumber,
        employeeId: reg.employeeId,
        employeeCode: r.employeeCode ?? '',
        employeeName,
        departmentName: r.departmentName ?? null,
        workday: reg.workday,
        requestType: reg.requestType,
        approvalStatus: reg.approvalStatus,
        applicationStatus: reg.applicationStatus,
        source: reg.source,
        assignedTo: reg.assignedTo,
        assignedToName: reviewerName ?? (reg.assignedTo ? 'HR Admin' : null),
        assignedQueue: reg.assignedQueue,
        relatedExceptionId: reg.relatedExceptionId,
        requestedChange,
        recordedCheckIn: reg.recordedCheckIn,
        recordedCheckOut: reg.recordedCheckOut,
        recordedStatus: reg.recordedStatus,
        proposedCheckIn: reg.proposedCheckIn,
        proposedCheckOut: reg.proposedCheckOut,
        proposedStatus: reg.proposedStatus,
        claimedHours: reg.claimedHours ? Number(reg.claimedHours) : null,
        reason: reg.reason,
        evidenceAttachments: (reg.evidenceAttachments || []) as Array<{
          name: string;
          size: string;
          url?: string;
        }>,
        isHighRisk: reg.isHighRisk,
        submittedAt: reg.submittedAt,
        decidedAt: reg.decidedAt,
        decidedByUserId: reg.decidedByUserId,
        appliedAt: reg.appliedAt,
        applicationError: reg.applicationError,
        applicationBlockedReason: reg.applicationBlockedReason,
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

  /**
   * Get single regularization by ID
   */
  async getRegularizationById(tenantId: string, companyId: string, id: string) {
    const db = getDb();
    const [row] = await db
      .select({
        reg: attendanceRegularizations,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeCode: employees.employeeNumber,
        departmentName: departments.name,
        locationName: locations.name,
        reviewerFirstName: users.firstName,
        reviewerLastName: users.lastName,
      })
      .from(attendanceRegularizations)
      .leftJoin(employees, eq(attendanceRegularizations.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .leftJoin(users, eq(attendanceRegularizations.assignedTo, users.id))
      .where(
        and(
          eq(attendanceRegularizations.tenantId, tenantId),
          eq(attendanceRegularizations.companyId, companyId),
          eq(attendanceRegularizations.id, id),
        ),
      )
      .limit(1);

    if (!row) return null;

    const reviewerName =
      `${row.reviewerFirstName ?? ''} ${row.reviewerLastName ?? ''}`.trim() || null;

    return {
      ...row,
      reviewerName,
    };
  }

  /**
   * Get audit entries for a regularization
   */
  async getAuditsForRegularization(tenantId: string, companyId: string, regularizationId: string) {
    const db = getDb();
    const rows = await db
      .select({
        audit: attendanceRegularizationAudits,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
      })
      .from(attendanceRegularizationAudits)
      .leftJoin(users, eq(attendanceRegularizationAudits.actorUserId, users.id))
      .where(
        and(
          eq(attendanceRegularizationAudits.tenantId, tenantId),
          eq(attendanceRegularizationAudits.companyId, companyId),
          eq(attendanceRegularizationAudits.regularizationId, regularizationId),
        ),
      )
      .orderBy(desc(attendanceRegularizationAudits.createdAt));

    return rows.map((r) => {
      const actorName =
        `${r.actorFirstName ?? ''} ${r.actorLastName ?? ''}`.trim() ||
        (r.audit.actorUserId ? 'System / HR' : 'System');
      return {
        id: r.audit.id,
        action: r.audit.action,
        actorUserId: r.audit.actorUserId,
        actorName,
        oldState: r.audit.oldState,
        newState: r.audit.newState,
        notes: r.audit.notes,
        createdAt: r.audit.createdAt,
      };
    });
  }

  /**
   * Create regularization record
   */
  async createRegularization(data: NewAttendanceRegularization) {
    const db = getDb();
    await db.insert(attendanceRegularizations).values(data);
    const [row] = await db
      .select()
      .from(attendanceRegularizations)
      .where(eq(attendanceRegularizations.id, data.id));
    return row!;
  }

  /**
   * Update regularization record
   */
  async updateRegularization(
    tenantId: string,
    companyId: string,
    id: string,
    data: Partial<NewAttendanceRegularization>,
  ) {
    const db = getDb();
    await db
      .update(attendanceRegularizations)
      .set(data)
      .where(
        and(
          eq(attendanceRegularizations.tenantId, tenantId),
          eq(attendanceRegularizations.companyId, companyId),
          eq(attendanceRegularizations.id, id),
        ),
      );

    const [updated] = await db
      .select()
      .from(attendanceRegularizations)
      .where(eq(attendanceRegularizations.id, id));
    return updated!;
  }

  /**
   * Create an audit entry
   */
  async createAudit(data: NewAttendanceRegularizationAudit) {
    const db = getDb();
    await db.insert(attendanceRegularizationAudits).values(data);
  }

  /**
   * Create an adjustment record
   */
  async createAdjustment(data: NewAttendanceAdjustment) {
    const db = getDb();
    await db.insert(attendanceAdjustments).values(data);
    const [created] = await db
      .select()
      .from(attendanceAdjustments)
      .where(eq(attendanceAdjustments.id, data.id));
    return created!;
  }
}

export const attendanceRegularizationRepository = new AttendanceRegularizationRepository();
