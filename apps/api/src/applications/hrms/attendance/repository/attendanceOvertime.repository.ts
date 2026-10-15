/**
 * BEZENT HRMS — Overtime Repository (V1.0)
 *
 * Provides database access for:
 * - Overtime Policies (effective-dated, scoped)
 * - Overtime Requests (CRUD, filtering, joins with employee/dept/reviewer)
 * - Settlements & Allocations (Payable vs Comp-Off)
 * - Immutable Audit Logging
 *
 * Strictly enforces Tenant and Company isolation on every query.
 */

import { and, desc, eq, gte, lte, sql, or, like } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  attendanceOvertimePolicies,
  attendanceOvertimeRequests,
  attendanceOvertimeSettlements,
  attendanceOvertimeAudits,
  employees,
  departments,
  users,
  type AttendanceOvertimePolicy,
  type NewAttendanceOvertimePolicy,
  type AttendanceOvertimeRequest,
  type NewAttendanceOvertimeRequest,
  type AttendanceOvertimeSettlement,
  type NewAttendanceOvertimeSettlement,
  type NewAttendanceOvertimeAudit,
} from '../../../../db/schema.js';
import type {
  OvertimeRequestItem,
  OvertimeSettlementItem,
  OvertimeAuditItem,
  OvertimeFilterQuery,
  OvertimeSettlementFilterQuery,
  OvertimeOverviewMetrics,
  OvertimeSourceInterval,
  OvertimeEvidenceAttachment,
} from '../types/attendanceOvertime.types.js';

export class AttendanceOvertimeRepository {
  /**
   * Generates sequential request number: OT-YYYY-00001
   */
  async generateNextRequestNumber(companyId: string): Promise<string> {
    const db = getDb();
    const year = new Date().getFullYear();
    const prefix = `OT-${year}-`;

    const [latest] = await db
      .select({ requestNumber: attendanceOvertimeRequests.requestNumber })
      .from(attendanceOvertimeRequests)
      .where(
        and(
          eq(attendanceOvertimeRequests.companyId, companyId),
          like(attendanceOvertimeRequests.requestNumber, `${prefix}%`),
        ),
      )
      .orderBy(desc(attendanceOvertimeRequests.requestNumber))
      .limit(1);

    if (!latest || !latest.requestNumber) {
      return `${prefix}00001`;
    }

    const lastNum = parseInt(latest.requestNumber.replace(prefix, ''), 10);
    const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  // ==========================================
  // POLICY METHODS
  // ==========================================

  async getEffectivePolicy(
    tenantId: string,
    companyId: string,
    workDate: string,
    scope?: { departmentId?: string; employeeId?: string },
  ): Promise<AttendanceOvertimePolicy | null> {
    const db = getDb();

    // Query active published policies effective on workDate
    const candidatePolicies = await db
      .select()
      .from(attendanceOvertimePolicies)
      .where(
        and(
          eq(attendanceOvertimePolicies.tenantId, tenantId),
          eq(attendanceOvertimePolicies.companyId, companyId),
          eq(attendanceOvertimePolicies.isActive, true),
          eq(attendanceOvertimePolicies.status, 'published'),
          lte(attendanceOvertimePolicies.effectiveFrom, workDate),
          or(
            sql`${attendanceOvertimePolicies.effectiveTo} IS NULL`,
            gte(attendanceOvertimePolicies.effectiveTo, workDate),
          ),
        ),
      )
      .orderBy(desc(attendanceOvertimePolicies.overridesPriority), desc(attendanceOvertimePolicies.version));

    if (candidatePolicies.length === 0) {
      return null;
    }

    // Match order: employee > department > company
    if (scope?.employeeId) {
      const empPolicy = candidatePolicies.find(
        (p) => p.scope === 'employee' && p.scopeId === scope.employeeId,
      );
      if (empPolicy) return empPolicy;
    }

    if (scope?.departmentId) {
      const deptPolicy = candidatePolicies.find(
        (p) => p.scope === 'department' && p.scopeId === scope.departmentId,
      );
      if (deptPolicy) return deptPolicy;
    }

    const companyPolicy = candidatePolicies.find((p) => p.scope === 'company');
    return companyPolicy || candidatePolicies[0] || null;
  }

  async getPolicyById(
    tenantId: string,
    companyId: string,
    policyId: string,
  ): Promise<AttendanceOvertimePolicy | null> {
    const db = getDb();
    const [policy] = await db
      .select()
      .from(attendanceOvertimePolicies)
      .where(
        and(
          eq(attendanceOvertimePolicies.id, policyId),
          eq(attendanceOvertimePolicies.tenantId, tenantId),
          eq(attendanceOvertimePolicies.companyId, companyId),
        ),
      );
    return policy || null;
  }

  async listPolicies(tenantId: string, companyId: string): Promise<AttendanceOvertimePolicy[]> {
    const db = getDb();
    return db
      .select()
      .from(attendanceOvertimePolicies)
      .where(
        and(
          eq(attendanceOvertimePolicies.tenantId, tenantId),
          eq(attendanceOvertimePolicies.companyId, companyId),
        ),
      )
      .orderBy(desc(attendanceOvertimePolicies.effectiveFrom));
  }

  async createPolicy(policy: NewAttendanceOvertimePolicy): Promise<AttendanceOvertimePolicy> {
    const db = getDb();
    await db.insert(attendanceOvertimePolicies).values(policy);
    const [created] = await db
      .select()
      .from(attendanceOvertimePolicies)
      .where(eq(attendanceOvertimePolicies.id, policy.id));
    return created!;
  }

  async updatePolicy(
    tenantId: string,
    companyId: string,
    id: string,
    patch: Partial<NewAttendanceOvertimePolicy>,
  ): Promise<AttendanceOvertimePolicy | null> {
    const db = getDb();
    await db
      .update(attendanceOvertimePolicies)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(attendanceOvertimePolicies.id, id),
          eq(attendanceOvertimePolicies.tenantId, tenantId),
          eq(attendanceOvertimePolicies.companyId, companyId),
        ),
      );
    return this.getPolicyById(tenantId, companyId, id);
  }

  // ==========================================
  // REQUEST METHODS
  // ==========================================

  async createRequest(data: NewAttendanceOvertimeRequest): Promise<AttendanceOvertimeRequest> {
    const db = getDb();
    await db.insert(attendanceOvertimeRequests).values(data);
    const [created] = await db
      .select()
      .from(attendanceOvertimeRequests)
      .where(eq(attendanceOvertimeRequests.id, data.id));
    return created!;
  }

  async findRequestRecordById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<AttendanceOvertimeRequest | null> {
    const db = getDb();
    const [req] = await db
      .select()
      .from(attendanceOvertimeRequests)
      .where(
        and(
          eq(attendanceOvertimeRequests.id, id),
          eq(attendanceOvertimeRequests.tenantId, tenantId),
          eq(attendanceOvertimeRequests.companyId, companyId),
        ),
      );
    return req || null;
  }

  async findActiveRequestForDate(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workDate: string,
  ): Promise<AttendanceOvertimeRequest | null> {
    const db = getDb();
    const [req] = await db
      .select()
      .from(attendanceOvertimeRequests)
      .where(
        and(
          eq(attendanceOvertimeRequests.tenantId, tenantId),
          eq(attendanceOvertimeRequests.companyId, companyId),
          eq(attendanceOvertimeRequests.employeeId, employeeId),
          eq(attendanceOvertimeRequests.workDate, workDate),
          sql`${attendanceOvertimeRequests.status} NOT IN ('rejected', 'withdrawn', 'cancelled')`,
        ),
      );
    return req || null;
  }

  async updateRequest(
    tenantId: string,
    companyId: string,
    id: string,
    patch: Partial<AttendanceOvertimeRequest>,
  ): Promise<void> {
    const db = getDb();
    await db
      .update(attendanceOvertimeRequests)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(attendanceOvertimeRequests.id, id),
          eq(attendanceOvertimeRequests.tenantId, tenantId),
          eq(attendanceOvertimeRequests.companyId, companyId),
        ),
      );
  }

  async findRequestById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OvertimeRequestItem | null> {
    const db = getDb();
    const rows = await db
      .select({
        req: attendanceOvertimeRequests,
        emp: {
          employeeNumber: employees.employeeNumber,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentId: employees.departmentId,
        },
        dept: {
          name: departments.name,
        },
        pol: {
          policyName: attendanceOvertimePolicies.policyName,
        },
        assignedUser: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceOvertimeRequests)
      .innerJoin(employees, eq(attendanceOvertimeRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        attendanceOvertimePolicies,
        eq(attendanceOvertimeRequests.policyId, attendanceOvertimePolicies.id),
      )
      .leftJoin(users, eq(attendanceOvertimeRequests.assignedTo, users.id))
      .where(
        and(
          eq(attendanceOvertimeRequests.id, id),
          eq(attendanceOvertimeRequests.tenantId, tenantId),
          eq(attendanceOvertimeRequests.companyId, companyId),
        ),
      );

    if (rows.length === 0 || !rows[0]) {
      return null;
    }

    const row = rows[0];
    const r = row.req;
    return {
      id: r.id,
      requestNumber: r.requestNumber,
      tenantId: r.tenantId,
      companyId: r.companyId,
      employeeId: r.employeeId,
      employeeCode: row.emp.employeeNumber,
      employeeName: `${row.emp.firstName} ${row.emp.lastName || ''}`.trim(),
      departmentName: row.dept?.name || null,
      workDate: r.workDate,
      dayType: r.dayType,
      sourceRecordType: r.sourceRecordType,
      sourceRecordId: r.sourceRecordId,
      policyId: r.policyId,
      policyName: row.pol?.policyName || null,
      policyVersion: r.policyVersion,
      scheduledMinutes: r.scheduledMinutes,
      actualWorkedMinutes: r.actualWorkedMinutes,
      extraWorkedMinutes: r.extraWorkedMinutes,
      eligibleOtMinutes: r.eligibleOtMinutes,
      requestedOtMinutes: r.requestedOtMinutes,
      approvedOtMinutes: r.approvedOtMinutes,
      allocatedPayableMinutes: r.allocatedPayableMinutes,
      allocatedCompOffMinutes: r.allocatedCompOffMinutes,
      unallocatedMinutes: r.unallocatedMinutes,
      sourceIntervals: (r.sourceIntervals as unknown as OvertimeSourceInterval[]) || [],
      reason: r.reason,
      locationOrSite: r.locationOrSite,
      taskOrProject: r.taskOrProject,
      evidenceAttachments: (r.evidenceAttachments as unknown as OvertimeEvidenceAttachment[]) || [],
      status: r.status,
      settlementStatus: r.settlementStatus,
      currentStage: r.currentStage,
      assignedTo: r.assignedTo,
      assignedToName: row.assignedUser ? `${row.assignedUser.firstName} ${row.assignedUser.lastName || ''}`.trim() : null,
      assignedAt: r.assignedAt,
      assignedRole: r.assignedRole,
      submittedAt: r.submittedAt,
      submittedByUserId: r.submittedByUserId,
      reviewedByUserId: r.reviewedByUserId,
      reviewedAt: r.reviewedAt,
      reviewDecision: r.reviewDecision,
      reviewNotes: r.reviewNotes,
      cancellationReason: r.cancellationReason,
      withdrawalReason: r.withdrawalReason,
      version: r.version,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async queryRequests(
    tenantId: string,
    companyId: string,
    filter: OvertimeFilterQuery,
  ): Promise<{ items: OvertimeRequestItem[]; totalCount: number }> {
    const db = getDb();
    const conditions = [
      eq(attendanceOvertimeRequests.tenantId, tenantId),
      eq(attendanceOvertimeRequests.companyId, companyId),
    ];

    if (filter.employeeId) {
      conditions.push(eq(attendanceOvertimeRequests.employeeId, filter.employeeId));
    }
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(attendanceOvertimeRequests.status, filter.status));
    }
    if (filter.settlementStatus && filter.settlementStatus !== 'all') {
      conditions.push(eq(attendanceOvertimeRequests.settlementStatus, filter.settlementStatus));
    }
    if (filter.startDate) {
      conditions.push(gte(attendanceOvertimeRequests.workDate, filter.startDate));
    }
    if (filter.endDate) {
      conditions.push(lte(attendanceOvertimeRequests.workDate, filter.endDate));
    }
    if (filter.workDate) {
      conditions.push(eq(attendanceOvertimeRequests.workDate, filter.workDate));
    }
    if (filter.departmentId) {
      conditions.push(eq(employees.departmentId, filter.departmentId));
    }

    if (filter.search) {
      const searchPattern = `%${filter.search}%`;
      conditions.push(
        or(
          like(attendanceOvertimeRequests.requestNumber, searchPattern),
          like(attendanceOvertimeRequests.reason, searchPattern),
          like(employees.employeeNumber, searchPattern),
          like(employees.firstName, searchPattern),
          like(employees.lastName, searchPattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceOvertimeRequests)
      .innerJoin(employees, eq(attendanceOvertimeRequests.employeeId, employees.id))
      .where(whereClause);

    const totalCount = Number(countResult?.count || 0);

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        req: attendanceOvertimeRequests,
        emp: {
          employeeNumber: employees.employeeNumber,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentId: employees.departmentId,
        },
        dept: {
          name: departments.name,
        },
        pol: {
          policyName: attendanceOvertimePolicies.policyName,
        },
        assignedUser: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceOvertimeRequests)
      .innerJoin(employees, eq(attendanceOvertimeRequests.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        attendanceOvertimePolicies,
        eq(attendanceOvertimeRequests.policyId, attendanceOvertimePolicies.id),
      )
      .leftJoin(users, eq(attendanceOvertimeRequests.assignedTo, users.id))
      .where(whereClause)
      .orderBy(desc(attendanceOvertimeRequests.workDate), desc(attendanceOvertimeRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const items: OvertimeRequestItem[] = rows.map((row) => ({
      id: row.req.id,
      requestNumber: row.req.requestNumber,
      tenantId: row.req.tenantId,
      companyId: row.req.companyId,
      employeeId: row.req.employeeId,
      employeeCode: row.emp.employeeNumber,
      employeeName: `${row.emp.firstName} ${row.emp.lastName || ''}`.trim(),
      departmentName: row.dept?.name || null,
      workDate: row.req.workDate,
      dayType: row.req.dayType,
      sourceRecordType: row.req.sourceRecordType,
      sourceRecordId: row.req.sourceRecordId,
      policyId: row.req.policyId,
      policyName: row.pol?.policyName || null,
      policyVersion: row.req.policyVersion,
      scheduledMinutes: row.req.scheduledMinutes,
      actualWorkedMinutes: row.req.actualWorkedMinutes,
      extraWorkedMinutes: row.req.extraWorkedMinutes,
      eligibleOtMinutes: row.req.eligibleOtMinutes,
      requestedOtMinutes: row.req.requestedOtMinutes,
      approvedOtMinutes: row.req.approvedOtMinutes,
      allocatedPayableMinutes: row.req.allocatedPayableMinutes,
      allocatedCompOffMinutes: row.req.allocatedCompOffMinutes,
      unallocatedMinutes: row.req.unallocatedMinutes,
      sourceIntervals: (row.req.sourceIntervals as unknown as OvertimeSourceInterval[]) || [],
      reason: row.req.reason,
      locationOrSite: row.req.locationOrSite,
      taskOrProject: row.req.taskOrProject,
      evidenceAttachments: (row.req.evidenceAttachments as unknown as OvertimeEvidenceAttachment[]) || [],
      status: row.req.status,
      settlementStatus: row.req.settlementStatus,
      currentStage: row.req.currentStage,
      assignedTo: row.req.assignedTo,
      assignedToName: row.assignedUser ? `${row.assignedUser.firstName} ${row.assignedUser.lastName || ''}`.trim() : null,
      assignedAt: row.req.assignedAt,
      assignedRole: row.req.assignedRole,
      submittedAt: row.req.submittedAt,
      submittedByUserId: row.req.submittedByUserId,
      reviewedByUserId: row.req.reviewedByUserId,
      reviewedAt: row.req.reviewedAt,
      reviewDecision: row.req.reviewDecision,
      reviewNotes: row.req.reviewNotes,
      cancellationReason: row.req.cancellationReason,
      withdrawalReason: row.req.withdrawalReason,
      version: row.req.version,
      createdAt: row.req.createdAt,
      updatedAt: row.req.updatedAt,
    }));

    return { items, totalCount };
  }

  async getPriorApprovedMinutesForWeek(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startOfWeek: string,
    endOfWeek: string,
    excludeRequestId?: string,
  ): Promise<number> {
    const db = getDb();
    const conditions = [
      eq(attendanceOvertimeRequests.tenantId, tenantId),
      eq(attendanceOvertimeRequests.companyId, companyId),
      eq(attendanceOvertimeRequests.employeeId, employeeId),
      eq(attendanceOvertimeRequests.status, 'approved'),
      gte(attendanceOvertimeRequests.workDate, startOfWeek),
      lte(attendanceOvertimeRequests.workDate, endOfWeek),
    ];
    if (excludeRequestId) {
      conditions.push(sql`${attendanceOvertimeRequests.id} != ${excludeRequestId}`);
    }

    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${attendanceOvertimeRequests.approvedOtMinutes}), 0)` })
      .from(attendanceOvertimeRequests)
      .where(and(...conditions));

    return Number(row?.total || 0);
  }

  async getPriorApprovedMinutesForMonth(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startOfMonth: string,
    endOfMonth: string,
    excludeRequestId?: string,
  ): Promise<number> {
    const db = getDb();
    const conditions = [
      eq(attendanceOvertimeRequests.tenantId, tenantId),
      eq(attendanceOvertimeRequests.companyId, companyId),
      eq(attendanceOvertimeRequests.employeeId, employeeId),
      eq(attendanceOvertimeRequests.status, 'approved'),
      gte(attendanceOvertimeRequests.workDate, startOfMonth),
      lte(attendanceOvertimeRequests.workDate, endOfMonth),
    ];
    if (excludeRequestId) {
      conditions.push(sql`${attendanceOvertimeRequests.id} != ${excludeRequestId}`);
    }

    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${attendanceOvertimeRequests.approvedOtMinutes}), 0)` })
      .from(attendanceOvertimeRequests)
      .where(and(...conditions));

    return Number(row?.total || 0);
  }

  async getOverviewMetrics(
    tenantId: string,
    companyId: string,
    filter?: { startDate?: string; endDate?: string; departmentId?: string; employeeId?: string },
  ): Promise<OvertimeOverviewMetrics> {
    const db = getDb();
    const conditions = [
      eq(attendanceOvertimeRequests.tenantId, tenantId),
      eq(attendanceOvertimeRequests.companyId, companyId),
    ];

    if (filter?.employeeId) {
      conditions.push(eq(attendanceOvertimeRequests.employeeId, filter.employeeId));
    }
    if (filter?.startDate) {
      conditions.push(gte(attendanceOvertimeRequests.workDate, filter.startDate));
    }
    if (filter?.endDate) {
      conditions.push(lte(attendanceOvertimeRequests.workDate, filter.endDate));
    }
    if (filter?.departmentId) {
      conditions.push(eq(employees.departmentId, filter.departmentId));
    }

    const [metrics] = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        pendingApprovalCount: sql<number>`coalesce(sum(case when ${attendanceOvertimeRequests.status} in ('submitted', 'pending_approval') then 1 else 0 end), 0)`,
        approvedCount: sql<number>`coalesce(sum(case when ${attendanceOvertimeRequests.status} = 'approved' then 1 else 0 end), 0)`,
        rejectedCount: sql<number>`coalesce(sum(case when ${attendanceOvertimeRequests.status} = 'rejected' then 1 else 0 end), 0)`,
        totalRequestedMinutes: sql<number>`coalesce(sum(${attendanceOvertimeRequests.requestedOtMinutes}), 0)`,
        totalApprovedMinutes: sql<number>`coalesce(sum(${attendanceOvertimeRequests.approvedOtMinutes}), 0)`,
        totalAllocatedPayableMinutes: sql<number>`coalesce(sum(${attendanceOvertimeRequests.allocatedPayableMinutes}), 0)`,
        totalAllocatedCompOffMinutes: sql<number>`coalesce(sum(${attendanceOvertimeRequests.allocatedCompOffMinutes}), 0)`,
        unallocatedApprovedMinutes: sql<number>`coalesce(sum(case when ${attendanceOvertimeRequests.status} = 'approved' then ${attendanceOvertimeRequests.unallocatedMinutes} else 0 end), 0)`,
        pendingHandoffCount: sql<number>`coalesce(sum(case when ${attendanceOvertimeRequests.settlementStatus} = 'pending_handoff' then 1 else 0 end), 0)`,
      })
      .from(attendanceOvertimeRequests)
      .innerJoin(employees, eq(attendanceOvertimeRequests.employeeId, employees.id))
      .where(and(...conditions));

    return {
      totalRequests: Number(metrics?.totalRequests || 0),
      pendingApprovalCount: Number(metrics?.pendingApprovalCount || 0),
      approvedCount: Number(metrics?.approvedCount || 0),
      rejectedCount: Number(metrics?.rejectedCount || 0),
      totalRequestedMinutes: Number(metrics?.totalRequestedMinutes || 0),
      totalApprovedMinutes: Number(metrics?.totalApprovedMinutes || 0),
      totalAllocatedPayableMinutes: Number(metrics?.totalAllocatedPayableMinutes || 0),
      totalAllocatedCompOffMinutes: Number(metrics?.totalAllocatedCompOffMinutes || 0),
      unallocatedApprovedMinutes: Number(metrics?.unallocatedApprovedMinutes || 0),
      pendingHandoffCount: Number(metrics?.pendingHandoffCount || 0),
    };
  }

  // ==========================================
  // SETTLEMENT METHODS
  // ==========================================

  async createSettlement(data: NewAttendanceOvertimeSettlement): Promise<AttendanceOvertimeSettlement> {
    const db = getDb();
    await db.insert(attendanceOvertimeSettlements).values(data);
    const [created] = await db
      .select()
      .from(attendanceOvertimeSettlements)
      .where(eq(attendanceOvertimeSettlements.id, data.id));
    return created!;
  }

  async findSettlementById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<AttendanceOvertimeSettlement | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(attendanceOvertimeSettlements)
      .where(
        and(
          eq(attendanceOvertimeSettlements.id, id),
          eq(attendanceOvertimeSettlements.tenantId, tenantId),
          eq(attendanceOvertimeSettlements.companyId, companyId),
        ),
      );
    return row || null;
  }

  async listSettlementsForRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
  ): Promise<AttendanceOvertimeSettlement[]> {
    const db = getDb();
    return db
      .select()
      .from(attendanceOvertimeSettlements)
      .where(
        and(
          eq(attendanceOvertimeSettlements.tenantId, tenantId),
          eq(attendanceOvertimeSettlements.companyId, companyId),
          eq(attendanceOvertimeSettlements.requestId, requestId),
        ),
      )
      .orderBy(desc(attendanceOvertimeSettlements.createdAt));
  }

  async updateSettlement(
    tenantId: string,
    companyId: string,
    id: string,
    patch: Partial<AttendanceOvertimeSettlement>,
  ): Promise<void> {
    const db = getDb();
    await db
      .update(attendanceOvertimeSettlements)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(attendanceOvertimeSettlements.id, id),
          eq(attendanceOvertimeSettlements.tenantId, tenantId),
          eq(attendanceOvertimeSettlements.companyId, companyId),
        ),
      );
  }

  async querySettlements(
    tenantId: string,
    companyId: string,
    filter: OvertimeSettlementFilterQuery,
  ): Promise<{ items: OvertimeSettlementItem[]; totalCount: number }> {
    const db = getDb();
    const conditions = [
      eq(attendanceOvertimeSettlements.tenantId, tenantId),
      eq(attendanceOvertimeSettlements.companyId, companyId),
    ];
    if (filter.employeeId) {
      conditions.push(eq(attendanceOvertimeSettlements.employeeId, filter.employeeId));
    }
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(attendanceOvertimeSettlements.status, filter.status));
    }

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceOvertimeSettlements)
      .where(whereClause);
    const totalCount = Number(countRow?.count || 0);

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        set: attendanceOvertimeSettlements,
        req: {
          requestNumber: attendanceOvertimeRequests.requestNumber,
          workDate: attendanceOvertimeRequests.workDate,
        },
        emp: {
          employeeNumber: employees.employeeNumber,
          firstName: employees.firstName,
          lastName: employees.lastName,
        },
        allocUser: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceOvertimeSettlements)
      .innerJoin(
        attendanceOvertimeRequests,
        eq(attendanceOvertimeSettlements.requestId, attendanceOvertimeRequests.id),
      )
      .innerJoin(employees, eq(attendanceOvertimeSettlements.employeeId, employees.id))
      .leftJoin(users, eq(attendanceOvertimeSettlements.allocatedByUserId, users.id))
      .where(whereClause)
      .orderBy(desc(attendanceOvertimeSettlements.allocatedAt))
      .limit(limit)
      .offset(offset);

    const items: OvertimeSettlementItem[] = rows.map((r) => ({
      id: r.set.id,
      tenantId: r.set.tenantId,
      companyId: r.set.companyId,
      requestId: r.set.requestId,
      requestNumber: r.req.requestNumber,
      employeeId: r.set.employeeId,
      employeeCode: r.emp.employeeNumber,
      employeeName: `${r.emp.firstName} ${r.emp.lastName || ''}`.trim(),
      workDate: r.req.workDate,
      allocationType: r.set.allocationType,
      allocatedMinutes: r.set.allocatedMinutes,
      status: r.set.status,
      batchReference: r.set.batchReference,
      allocatedByUserId: r.set.allocatedByUserId,
      allocatedByUserName: r.allocUser ? `${r.allocUser.firstName} ${r.allocUser.lastName || ''}`.trim() : null,
      allocatedAt: r.set.allocatedAt,
      notes: r.set.notes,
      reversalReason: r.set.reversalReason,
      reversedByUserId: r.set.reversedByUserId,
      reversedAt: r.set.reversedAt,
      createdAt: r.set.createdAt,
      updatedAt: r.set.updatedAt,
    }));

    return { items, totalCount };
  }

  // ==========================================
  // AUDIT METHODS
  // ==========================================

  async recordAudit(audit: NewAttendanceOvertimeAudit): Promise<void> {
    const db = getDb();
    await db.insert(attendanceOvertimeAudits).values(audit);
  }

  async listAuditsForRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
  ): Promise<OvertimeAuditItem[]> {
    const db = getDb();
    const rows = await db
      .select({
        aud: attendanceOvertimeAudits,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendanceOvertimeAudits)
      .leftJoin(users, eq(attendanceOvertimeAudits.performedByUserId, users.id))
      .where(
        and(
          eq(attendanceOvertimeAudits.tenantId, tenantId),
          eq(attendanceOvertimeAudits.companyId, companyId),
          eq(attendanceOvertimeAudits.requestId, requestId),
        ),
      )
      .orderBy(desc(attendanceOvertimeAudits.createdAt));

    return rows.map((r) => ({
      id: r.aud.id,
      tenantId: r.aud.tenantId,
      companyId: r.aud.companyId,
      requestId: r.aud.requestId,
      action: r.aud.action,
      fromStatus: r.aud.fromStatus,
      toStatus: r.aud.toStatus,
      performedByUserId: r.aud.performedByUserId,
      performedByUserName: r.user ? `${r.user.firstName} ${r.user.lastName || ''}`.trim() : null,
      performedByRole: r.aud.performedByRole,
      details: (r.aud.details as Record<string, unknown>) || null,
      clientIp: r.aud.clientIp,
      createdAt: r.aud.createdAt,
    }));
  }
}
