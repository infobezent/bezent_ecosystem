/**
 * BEZENT HRMS — Comp-Off Repository (V1.0)
 *
 * Implements strict tenant- and company-scoped queries and mutations for:
 * - Policies (effective-dated versioning and scopes)
 * - Earning Requests & Approval queues
 * - Approved Entitlements Register
 * - Leave Module Handoff Contract Ledger
 * - Overtime Double-Benefit Reconciliation
 * - Immutable Audits
 */

import { and, eq, desc, asc, lte, gte, sql, inArray, like, or } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  attendanceCompOffPolicies,
  attendanceCompOffRequests,
  attendanceCompOffEntitlements,
  attendanceCompOffHandoffs,
  attendanceCompOffAudits,
  attendanceOvertimeSettlements,
  attendanceOvertimeRequests,
  employees,
  users,
  type AttendanceCompOffPolicy,
  type NewAttendanceCompOffPolicy,
  type AttendanceCompOffRequest,
  type NewAttendanceCompOffRequest,
  type AttendanceCompOffEntitlement,
  type NewAttendanceCompOffEntitlement,
  type AttendanceCompOffHandoff,
  type NewAttendanceCompOffHandoff,
  type NewAttendanceCompOffAudit,
} from '../../../../db/schema.js';
import type {
  CompOffFilterQuery,
  CompOffEntitlementFilterQuery,
  CompOffHandoffFilterQuery,
  CompOffOverviewMetrics,
  CompOffRequestItem,
  CompOffEntitlementItem,
  CompOffHandoffItem,
  CompOffAuditItem,
} from '../types/attendanceCompOff.types.js';

export class AttendanceCompOffRepository {
  /**
   * Retrieves the effective published Comp-Off policy for an employee on a given date.
   */
  async getEffectivePolicy(
    tenantId: string,
    companyId: string,
    workDate: string,
    target?: { departmentId?: string; employeeId?: string },
  ): Promise<AttendanceCompOffPolicy | null> {
    const db = getDb();

    const scopeConditions = [
      and(
        eq(attendanceCompOffPolicies.scope, 'company'),
        sql`${attendanceCompOffPolicies.scopeId} IS NULL OR ${attendanceCompOffPolicies.scopeId} = ''`,
      ),
    ];

    if (target?.departmentId) {
      scopeConditions.push(
        and(
          eq(attendanceCompOffPolicies.scope, 'department'),
          eq(attendanceCompOffPolicies.scopeId, target.departmentId),
        ),
      );
    }

    if (target?.employeeId) {
      scopeConditions.push(
        and(
          eq(attendanceCompOffPolicies.scope, 'employee'),
          eq(attendanceCompOffPolicies.scopeId, target.employeeId),
        ),
      );
    }

    const rows = await db
      .select()
      .from(attendanceCompOffPolicies)
      .where(
        and(
          eq(attendanceCompOffPolicies.tenantId, tenantId),
          eq(attendanceCompOffPolicies.companyId, companyId),
          eq(attendanceCompOffPolicies.status, 'published'),
          eq(attendanceCompOffPolicies.isActive, true),
          lte(attendanceCompOffPolicies.effectiveFrom, workDate),
          or(
            sql`${attendanceCompOffPolicies.effectiveTo} IS NULL`,
            gte(attendanceCompOffPolicies.effectiveTo, workDate),
          ),
          or(...scopeConditions),
        ),
      )
      .orderBy(
        desc(attendanceCompOffPolicies.overridesPriority),
        desc(attendanceCompOffPolicies.effectiveFrom),
        desc(attendanceCompOffPolicies.version),
      )
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Lists policies for tenant & company
   */
  async listPolicies(
    tenantId: string,
    companyId: string,
    status?: 'draft' | 'published' | 'archived',
  ): Promise<AttendanceCompOffPolicy[]> {
    const db = getDb();
    const conditions = [
      eq(attendanceCompOffPolicies.tenantId, tenantId),
      eq(attendanceCompOffPolicies.companyId, companyId),
    ];
    if (status) {
      conditions.push(eq(attendanceCompOffPolicies.status, status));
    }

    return db
      .select()
      .from(attendanceCompOffPolicies)
      .where(and(...conditions))
      .orderBy(desc(attendanceCompOffPolicies.createdAt));
  }

  async getPolicyById(
    tenantId: string,
    companyId: string,
    policyId: string,
  ): Promise<AttendanceCompOffPolicy | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceCompOffPolicies)
      .where(
        and(
          eq(attendanceCompOffPolicies.tenantId, tenantId),
          eq(attendanceCompOffPolicies.companyId, companyId),
          eq(attendanceCompOffPolicies.id, policyId),
        ),
      )
      .limit(1);
    return rows[0] || null;
  }

  async createPolicy(data: NewAttendanceCompOffPolicy): Promise<AttendanceCompOffPolicy> {
    const db = getDb();
    await db.insert(attendanceCompOffPolicies).values(data);
    const [created] = await db
      .select()
      .from(attendanceCompOffPolicies)
      .where(eq(attendanceCompOffPolicies.id, data.id));
    return created!;
  }

  async updatePolicy(
    tenantId: string,
    companyId: string,
    policyId: string,
    updates: Partial<NewAttendanceCompOffPolicy>,
  ): Promise<AttendanceCompOffPolicy> {
    const db = getDb();
    await db
      .update(attendanceCompOffPolicies)
      .set(updates)
      .where(
        and(
          eq(attendanceCompOffPolicies.tenantId, tenantId),
          eq(attendanceCompOffPolicies.companyId, companyId),
          eq(attendanceCompOffPolicies.id, policyId),
        ),
      );

    const [updated] = await db
      .select()
      .from(attendanceCompOffPolicies)
      .where(eq(attendanceCompOffPolicies.id, policyId));
    return updated!;
  }

  /**
   * Generates sequential human-readable request number (e.g. CO-2026-00001)
   */
  async generateNextRequestNumber(companyId: string): Promise<string> {
    const db = getDb();
    const currentYear = new Date().getFullYear();
    const prefix = `CO-${currentYear}-`;

    const [latest] = await db
      .select({ requestNumber: attendanceCompOffRequests.requestNumber })
      .from(attendanceCompOffRequests)
      .where(
        and(
          eq(attendanceCompOffRequests.companyId, companyId),
          like(attendanceCompOffRequests.requestNumber, `${prefix}%`),
        ),
      )
      .orderBy(desc(attendanceCompOffRequests.requestNumber))
      .limit(1);

    let nextSeq = 1;
    if (latest && latest.requestNumber) {
      const match = latest.requestNumber.match(/\d+$/);
      if (match) {
        nextSeq = parseInt(match[0], 10) + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  /**
   * Checks for existing active claim for the same employee and work date
   */
  async findActiveRequestForDate(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workDate: string,
  ): Promise<AttendanceCompOffRequest | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceCompOffRequests)
      .where(
        and(
          eq(attendanceCompOffRequests.tenantId, tenantId),
          eq(attendanceCompOffRequests.companyId, companyId),
          eq(attendanceCompOffRequests.employeeId, employeeId),
          eq(attendanceCompOffRequests.workDate, workDate),
          inArray(attendanceCompOffRequests.status, ['draft', 'submitted', 'pending_approval', 'approved']),
        ),
      )
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Finds any overtime settlement allocations for the employee and work date
   * to ensure Double Benefit Prevention
   */
  async getOvertimeAllocationsForDate(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workDate: string,
  ): Promise<Array<{ allocatedMinutes: number; allocationType: 'payable' | 'comp_off'; status: string }>> {
    const db = getDb();

    const rows = await db
      .select({
        allocatedMinutes: attendanceOvertimeSettlements.allocatedMinutes,
        allocationType: attendanceOvertimeSettlements.allocationType,
        status: attendanceOvertimeSettlements.status,
      })
      .from(attendanceOvertimeSettlements)
      .innerJoin(
        attendanceOvertimeRequests,
        eq(attendanceOvertimeSettlements.requestId, attendanceOvertimeRequests.id),
      )
      .where(
        and(
          eq(attendanceOvertimeSettlements.tenantId, tenantId),
          eq(attendanceOvertimeSettlements.companyId, companyId),
          eq(attendanceOvertimeSettlements.employeeId, employeeId),
          eq(attendanceOvertimeRequests.workDate, workDate),
          inArray(attendanceOvertimeSettlements.status, [
            'pending_handoff',
            'exported_to_payroll',
            'credited_to_comp_off',
          ]),
        ),
      );

    return rows;
  }

  /**
   * Calculates prior Comp-Off credit days earned in the current calendar month
   */
  async getPriorEarnedDaysForMonth(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startOfMonth: string,
    endOfMonth: string,
  ): Promise<number> {
    const db = getDb();

    const rows = await db
      .select({
        totalDays: sql<string>`COALESCE(SUM(${attendanceCompOffRequests.approvedCreditDays}), 0)`,
      })
      .from(attendanceCompOffRequests)
      .where(
        and(
          eq(attendanceCompOffRequests.tenantId, tenantId),
          eq(attendanceCompOffRequests.companyId, companyId),
          eq(attendanceCompOffRequests.employeeId, employeeId),
          gte(attendanceCompOffRequests.workDate, startOfMonth),
          lte(attendanceCompOffRequests.workDate, endOfMonth),
          eq(attendanceCompOffRequests.status, 'approved'),
        ),
      );

    return parseFloat(rows[0]?.totalDays || '0');
  }

  async createRequest(data: NewAttendanceCompOffRequest): Promise<AttendanceCompOffRequest> {
    const db = getDb();
    await db.insert(attendanceCompOffRequests).values(data);
    const [created] = await db
      .select()
      .from(attendanceCompOffRequests)
      .where(eq(attendanceCompOffRequests.id, data.id));
    return created!;
  }

  async getRequestById(
    tenantId: string,
    companyId: string,
    requestId: string,
  ): Promise<CompOffRequestItem | null> {
    const db = getDb();
    const rows = await db
      .select({
        req: attendanceCompOffRequests,
        emp: employees,
        pol: attendanceCompOffPolicies,
        assignee: users,
        submitter: users,
        reviewer: users,
      })
      .from(attendanceCompOffRequests)
      .innerJoin(employees, eq(attendanceCompOffRequests.employeeId, employees.id))
      .leftJoin(
        attendanceCompOffPolicies,
        eq(attendanceCompOffRequests.policyId, attendanceCompOffPolicies.id),
      )
      .leftJoin(users, eq(attendanceCompOffRequests.assignedTo, users.id))
      .where(
        and(
          eq(attendanceCompOffRequests.tenantId, tenantId),
          eq(attendanceCompOffRequests.companyId, companyId),
          eq(attendanceCompOffRequests.id, requestId),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;

    return {
      id: r.req.id,
      requestNumber: r.req.requestNumber,
      tenantId: r.req.tenantId,
      companyId: r.req.companyId,
      employeeId: r.req.employeeId,
      employeeCode: r.emp.employeeNumber,
      employeeName: `${r.emp.firstName} ${r.emp.lastName}`.trim(),
      departmentName: r.emp.departmentId || null,
      workDate: r.req.workDate,
      dayType: r.req.dayType,
      sourceRecordType: r.req.sourceRecordType,
      sourceRecordId: r.req.sourceRecordId,
      policyId: r.req.policyId,
      policyName: r.pol?.policyName || null,
      policyVersion: r.req.policyVersion,
      scheduledMinutes: r.req.scheduledMinutes,
      actualWorkedMinutes: r.req.actualWorkedMinutes,
      qualifyingWorkedMinutes: r.req.qualifyingWorkedMinutes,
      requestedCreditDays: parseFloat(String(r.req.requestedCreditDays)),
      approvedCreditDays: parseFloat(String(r.req.approvedCreditDays)),
      sourceIntervals: (r.req.sourceIntervals as CompOffRequestItem['sourceIntervals']) || [],
      reason: r.req.reason,
      locationOrSite: r.req.locationOrSite,
      taskOrProject: r.req.taskOrProject,
      evidenceAttachments: (r.req.evidenceAttachments as CompOffRequestItem['evidenceAttachments']) || [],
      status: r.req.status,
      currentStage: r.req.currentStage,
      assignedTo: r.req.assignedTo,
      assignedToName: r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}`.trim() : null,
      assignedAt: r.req.assignedAt,
      assignedRole: r.req.assignedRole,
      submittedAt: r.req.submittedAt,
      submittedByUserId: r.req.submittedByUserId,
      submittedByUserName: null,
      reviewedByUserId: r.req.reviewedByUserId,
      reviewedByUserName: null,
      reviewedAt: r.req.reviewedAt,
      reviewDecision: r.req.reviewDecision,
      reviewNotes: r.req.reviewNotes,
      cancellationReason: r.req.cancellationReason,
      withdrawalReason: r.req.withdrawalReason,
      version: r.req.version,
      createdAt: r.req.createdAt,
      updatedAt: r.req.updatedAt,
    };
  }

  async updateRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
    updates: Partial<NewAttendanceCompOffRequest>,
    expectedVersion?: number,
  ): Promise<AttendanceCompOffRequest> {
    const db = getDb();

    const conditions = [
      eq(attendanceCompOffRequests.tenantId, tenantId),
      eq(attendanceCompOffRequests.companyId, companyId),
      eq(attendanceCompOffRequests.id, requestId),
    ];

    if (expectedVersion !== undefined) {
      conditions.push(eq(attendanceCompOffRequests.version, expectedVersion));
    }

    await db
      .update(attendanceCompOffRequests)
      .set({
        ...updates,
        version: sql`${attendanceCompOffRequests.version} + 1`,
      })
      .where(and(...conditions));

    const [updated] = await db
      .select()
      .from(attendanceCompOffRequests)
      .where(eq(attendanceCompOffRequests.id, requestId));

    return updated!;
  }

  async listRequests(
    tenantId: string,
    companyId: string,
    filter: CompOffFilterQuery,
  ): Promise<{ items: CompOffRequestItem[]; total: number; page: number; limit: number }> {
    const db = getDb();
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(attendanceCompOffRequests.tenantId, tenantId),
      eq(attendanceCompOffRequests.companyId, companyId),
    ];

    if (filter.employeeId) {
      conditions.push(eq(attendanceCompOffRequests.employeeId, filter.employeeId));
    }
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(attendanceCompOffRequests.status, filter.status));
    }
    if (filter.workDate) {
      conditions.push(eq(attendanceCompOffRequests.workDate, filter.workDate));
    }
    if (filter.startDate) {
      conditions.push(gte(attendanceCompOffRequests.workDate, filter.startDate));
    }
    if (filter.endDate) {
      conditions.push(lte(attendanceCompOffRequests.workDate, filter.endDate));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceCompOffRequests)
      .where(whereClause);

    const total = Number(totalRow?.count || 0);

    const rows = await db
      .select({
        req: attendanceCompOffRequests,
        emp: employees,
        pol: attendanceCompOffPolicies,
        assignee: users,
      })
      .from(attendanceCompOffRequests)
      .innerJoin(employees, eq(attendanceCompOffRequests.employeeId, employees.id))
      .leftJoin(
        attendanceCompOffPolicies,
        eq(attendanceCompOffRequests.policyId, attendanceCompOffPolicies.id),
      )
      .leftJoin(users, eq(attendanceCompOffRequests.assignedTo, users.id))
      .where(whereClause)
      .orderBy(desc(attendanceCompOffRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const items: CompOffRequestItem[] = rows.map((r) => ({
      id: r.req.id,
      requestNumber: r.req.requestNumber,
      tenantId: r.req.tenantId,
      companyId: r.req.companyId,
      employeeId: r.req.employeeId,
      employeeCode: r.emp.employeeNumber,
      employeeName: `${r.emp.firstName} ${r.emp.lastName}`.trim(),
      departmentName: r.emp.departmentId || null,
      workDate: r.req.workDate,
      dayType: r.req.dayType,
      sourceRecordType: r.req.sourceRecordType,
      sourceRecordId: r.req.sourceRecordId,
      policyId: r.req.policyId,
      policyName: r.pol?.policyName || null,
      policyVersion: r.req.policyVersion,
      scheduledMinutes: r.req.scheduledMinutes,
      actualWorkedMinutes: r.req.actualWorkedMinutes,
      qualifyingWorkedMinutes: r.req.qualifyingWorkedMinutes,
      requestedCreditDays: parseFloat(String(r.req.requestedCreditDays)),
      approvedCreditDays: parseFloat(String(r.req.approvedCreditDays)),
      sourceIntervals: (r.req.sourceIntervals as CompOffRequestItem['sourceIntervals']) || [],
      reason: r.req.reason,
      locationOrSite: r.req.locationOrSite,
      taskOrProject: r.req.taskOrProject,
      evidenceAttachments: (r.req.evidenceAttachments as CompOffRequestItem['evidenceAttachments']) || [],
      status: r.req.status,
      currentStage: r.req.currentStage,
      assignedTo: r.req.assignedTo,
      assignedToName: r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}`.trim() : null,
      assignedAt: r.req.assignedAt,
      assignedRole: r.req.assignedRole,
      submittedAt: r.req.submittedAt,
      submittedByUserId: r.req.submittedByUserId,
      submittedByUserName: null,
      reviewedByUserId: r.req.reviewedByUserId,
      reviewedByUserName: null,
      reviewedAt: r.req.reviewedAt,
      reviewDecision: r.req.reviewDecision,
      reviewNotes: r.req.reviewNotes,
      cancellationReason: r.req.cancellationReason,
      withdrawalReason: r.req.withdrawalReason,
      version: r.req.version,
      createdAt: r.req.createdAt,
      updatedAt: r.req.updatedAt,
    }));

    return { items, total, page, limit };
  }

  /**
   * Retrieves pending approvals queue for a reviewer or HR admin
   */
  async getApprovalQueue(
    tenantId: string,
    companyId: string,
    reviewerContext?: { reviewerUserId?: string; reviewerEmpId?: string; isHrAdmin?: boolean },
  ): Promise<CompOffRequestItem[]> {
    const db = getDb();

    const conditions = [
      eq(attendanceCompOffRequests.tenantId, tenantId),
      eq(attendanceCompOffRequests.companyId, companyId),
      inArray(attendanceCompOffRequests.status, ['submitted', 'pending_approval']),
    ];

    if (reviewerContext?.reviewerEmpId && !reviewerContext.isHrAdmin) {
      conditions.push(
        or(
          eq(attendanceCompOffRequests.assignedTo, reviewerContext.reviewerEmpId),
          eq(attendanceCompOffRequests.assignedTo, reviewerContext.reviewerUserId || ''),
        )!,
      );
    }

    const rows = await db
      .select({
        req: attendanceCompOffRequests,
        emp: employees,
        pol: attendanceCompOffPolicies,
        assignee: users,
      })
      .from(attendanceCompOffRequests)
      .innerJoin(employees, eq(attendanceCompOffRequests.employeeId, employees.id))
      .leftJoin(
        attendanceCompOffPolicies,
        eq(attendanceCompOffRequests.policyId, attendanceCompOffPolicies.id),
      )
      .leftJoin(users, eq(attendanceCompOffRequests.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(asc(attendanceCompOffRequests.submittedAt));

    return rows.map((r) => ({
      id: r.req.id,
      requestNumber: r.req.requestNumber,
      tenantId: r.req.tenantId,
      companyId: r.req.companyId,
      employeeId: r.req.employeeId,
      employeeCode: r.emp.employeeNumber,
      employeeName: `${r.emp.firstName} ${r.emp.lastName}`.trim(),
      departmentName: r.emp.departmentId || null,
      workDate: r.req.workDate,
      dayType: r.req.dayType,
      sourceRecordType: r.req.sourceRecordType,
      sourceRecordId: r.req.sourceRecordId,
      policyId: r.req.policyId,
      policyName: r.pol?.policyName || null,
      policyVersion: r.req.policyVersion,
      scheduledMinutes: r.req.scheduledMinutes,
      actualWorkedMinutes: r.req.actualWorkedMinutes,
      qualifyingWorkedMinutes: r.req.qualifyingWorkedMinutes,
      requestedCreditDays: parseFloat(String(r.req.requestedCreditDays)),
      approvedCreditDays: parseFloat(String(r.req.approvedCreditDays)),
      sourceIntervals: (r.req.sourceIntervals as CompOffRequestItem['sourceIntervals']) || [],
      reason: r.req.reason,
      locationOrSite: r.req.locationOrSite,
      taskOrProject: r.req.taskOrProject,
      evidenceAttachments: (r.req.evidenceAttachments as CompOffRequestItem['evidenceAttachments']) || [],
      status: r.req.status,
      currentStage: r.req.currentStage,
      assignedTo: r.req.assignedTo,
      assignedToName: r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}`.trim() : null,
      assignedAt: r.req.assignedAt,
      assignedRole: r.req.assignedRole,
      submittedAt: r.req.submittedAt,
      submittedByUserId: r.req.submittedByUserId,
      submittedByUserName: null,
      reviewedByUserId: r.req.reviewedByUserId,
      reviewedByUserName: null,
      reviewedAt: r.req.reviewedAt,
      reviewDecision: r.req.reviewDecision,
      reviewNotes: r.req.reviewNotes,
      cancellationReason: r.req.cancellationReason,
      withdrawalReason: r.req.withdrawalReason,
      version: r.req.version,
      createdAt: r.req.createdAt,
      updatedAt: r.req.updatedAt,
    }));
  }

  /**
   * Entitlements Ledger methods
   */
  async createEntitlement(data: NewAttendanceCompOffEntitlement): Promise<AttendanceCompOffEntitlement> {
    const db = getDb();
    await db.insert(attendanceCompOffEntitlements).values(data);
    const [created] = await db
      .select()
      .from(attendanceCompOffEntitlements)
      .where(eq(attendanceCompOffEntitlements.id, data.id));
    return created!;
  }

  async getEntitlementById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<AttendanceCompOffEntitlement | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceCompOffEntitlements)
      .where(
        and(
          eq(attendanceCompOffEntitlements.tenantId, tenantId),
          eq(attendanceCompOffEntitlements.companyId, companyId),
          eq(attendanceCompOffEntitlements.id, id),
        ),
      )
      .limit(1);
    return rows[0] || null;
  }

  async updateEntitlement(
    tenantId: string,
    companyId: string,
    id: string,
    updates: Partial<NewAttendanceCompOffEntitlement>,
  ): Promise<AttendanceCompOffEntitlement> {
    const db = getDb();
    await db
      .update(attendanceCompOffEntitlements)
      .set(updates)
      .where(
        and(
          eq(attendanceCompOffEntitlements.tenantId, tenantId),
          eq(attendanceCompOffEntitlements.companyId, companyId),
          eq(attendanceCompOffEntitlements.id, id),
        ),
      );
    const [updated] = await db
      .select()
      .from(attendanceCompOffEntitlements)
      .where(eq(attendanceCompOffEntitlements.id, id));
    return updated!;
  }

  async listEntitlements(
    tenantId: string,
    companyId: string,
    filter: CompOffEntitlementFilterQuery,
  ): Promise<{ items: CompOffEntitlementItem[]; total: number; page: number; limit: number }> {
    const db = getDb();
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(attendanceCompOffEntitlements.tenantId, tenantId),
      eq(attendanceCompOffEntitlements.companyId, companyId),
    ];

    if (filter.id) {
      conditions.push(eq(attendanceCompOffEntitlements.id, filter.id));
    }
    if (filter.employeeId) {
      conditions.push(eq(attendanceCompOffEntitlements.employeeId, filter.employeeId));
    }
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(attendanceCompOffEntitlements.status, filter.status));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceCompOffEntitlements)
      .where(whereClause);

    const total = Number(totalRow?.count || 0);

    const rows = await db
      .select({
        ent: attendanceCompOffEntitlements,
        req: attendanceCompOffRequests,
        emp: employees,
        reverser: users,
      })
      .from(attendanceCompOffEntitlements)
      .innerJoin(
        attendanceCompOffRequests,
        eq(attendanceCompOffEntitlements.requestId, attendanceCompOffRequests.id),
      )
      .innerJoin(employees, eq(attendanceCompOffEntitlements.employeeId, employees.id))
      .leftJoin(users, eq(attendanceCompOffEntitlements.reversedByUserId, users.id))
      .where(whereClause)
      .orderBy(desc(attendanceCompOffEntitlements.createdAt))
      .limit(limit)
      .offset(offset);

    const items: CompOffEntitlementItem[] = rows.map((r) => ({
      id: r.ent.id,
      tenantId: r.ent.tenantId,
      companyId: r.ent.companyId,
      requestId: r.ent.requestId,
      requestNumber: r.req.requestNumber,
      employeeId: r.ent.employeeId,
      employeeCode: r.emp.employeeNumber,
      employeeName: `${r.emp.firstName} ${r.emp.lastName}`.trim(),
      workDate: r.ent.workDate,
      earnedDays: parseFloat(String(r.ent.earnedDays)),
      earnedMinutes: r.ent.earnedMinutes,
      validFrom: r.ent.validFrom,
      expiresAt: r.ent.expiresAt,
      status: r.ent.status,
      sourceOvertimeSettlementId: r.ent.sourceOvertimeSettlementId,
      handoffId: r.ent.handoffId,
      creditedLeaveBalanceId: r.ent.creditedLeaveBalanceId,
      reversalReason: r.ent.reversalReason,
      reversedByUserId: r.ent.reversedByUserId,
      reversedByUserName: r.reverser ? `${r.reverser.firstName} ${r.reverser.lastName}`.trim() : null,
      reversedAt: r.ent.reversedAt,
      createdAt: r.ent.createdAt,
      updatedAt: r.ent.updatedAt,
    }));

    return { items, total, page, limit };
  }

  /**
   * Leave Handoff Contract Ledger methods
   */
  async createHandoff(data: NewAttendanceCompOffHandoff): Promise<AttendanceCompOffHandoff> {
    const db = getDb();
    await db.insert(attendanceCompOffHandoffs).values(data);
    const [created] = await db
      .select()
      .from(attendanceCompOffHandoffs)
      .where(eq(attendanceCompOffHandoffs.id, data.id));
    return created!;
  }

  async getHandoffById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<AttendanceCompOffHandoff | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceCompOffHandoffs)
      .where(
        and(
          eq(attendanceCompOffHandoffs.tenantId, tenantId),
          eq(attendanceCompOffHandoffs.companyId, companyId),
          eq(attendanceCompOffHandoffs.id, id),
        ),
      )
      .limit(1);
    return rows[0] || null;
  }

  async findHandoffByIdempotencyKey(
    tenantId: string,
    companyId: string,
    idempotencyKey: string,
  ): Promise<AttendanceCompOffHandoff | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceCompOffHandoffs)
      .where(
        and(
          eq(attendanceCompOffHandoffs.tenantId, tenantId),
          eq(attendanceCompOffHandoffs.companyId, companyId),
          eq(attendanceCompOffHandoffs.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] || null;
  }

  async updateHandoff(
    tenantId: string,
    companyId: string,
    id: string,
    updates: Partial<NewAttendanceCompOffHandoff>,
  ): Promise<AttendanceCompOffHandoff> {
    const db = getDb();
    await db
      .update(attendanceCompOffHandoffs)
      .set(updates)
      .where(
        and(
          eq(attendanceCompOffHandoffs.tenantId, tenantId),
          eq(attendanceCompOffHandoffs.companyId, companyId),
          eq(attendanceCompOffHandoffs.id, id),
        ),
      );
    const [updated] = await db
      .select()
      .from(attendanceCompOffHandoffs)
      .where(eq(attendanceCompOffHandoffs.id, id));
    return updated!;
  }

  async listHandoffs(
    tenantId: string,
    companyId: string,
    filter: CompOffHandoffFilterQuery,
  ): Promise<{ items: CompOffHandoffItem[]; total: number; page: number; limit: number }> {
    const db = getDb();
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(attendanceCompOffHandoffs.tenantId, tenantId),
      eq(attendanceCompOffHandoffs.companyId, companyId),
    ];

    if (filter.employeeId) {
      conditions.push(eq(attendanceCompOffHandoffs.employeeId, filter.employeeId));
    }
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(attendanceCompOffHandoffs.status, filter.status));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceCompOffHandoffs)
      .where(whereClause);

    const total = Number(totalRow?.count || 0);

    const rows = await db
      .select({
        han: attendanceCompOffHandoffs,
        emp: employees,
      })
      .from(attendanceCompOffHandoffs)
      .innerJoin(employees, eq(attendanceCompOffHandoffs.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(attendanceCompOffHandoffs.createdAt))
      .limit(limit)
      .offset(offset);

    const items: CompOffHandoffItem[] = rows.map((r) => ({
      id: r.han.id,
      tenantId: r.han.tenantId,
      companyId: r.han.companyId,
      entitlementId: r.han.entitlementId,
      employeeId: r.han.employeeId,
      employeeCode: r.emp.employeeNumber,
      employeeName: `${r.emp.firstName} ${r.emp.lastName}`.trim(),
      idempotencyKey: r.han.idempotencyKey,
      creditDays: parseFloat(String(r.han.creditDays)),
      creditMinutes: r.han.creditMinutes,
      leaveTypeCode: r.han.leaveTypeCode,
      validFrom: r.han.validFrom,
      validUntil: r.han.validUntil,
      status: r.han.status,
      payload: (r.han.payload as Record<string, unknown>) || {},
      retryCount: r.han.retryCount,
      lastAttemptAt: r.han.lastAttemptAt,
      responseDetails: (r.han.responseDetails as Record<string, unknown>) || null,
      acknowledgedAt: r.han.acknowledgedAt,
      createdAt: r.han.createdAt,
      updatedAt: r.han.updatedAt,
    }));

    return { items, total, page, limit };
  }

  /**
   * Immutable Audits
   */
  async logAudit(data: NewAttendanceCompOffAudit): Promise<void> {
    const db = getDb();
    await db.insert(attendanceCompOffAudits).values(data);
  }

  async getAuditsForRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
  ): Promise<CompOffAuditItem[]> {
    const db = getDb();
    const rows = await db
      .select({
        audit: attendanceCompOffAudits,
        user: users,
      })
      .from(attendanceCompOffAudits)
      .leftJoin(users, eq(attendanceCompOffAudits.performedByUserId, users.id))
      .where(
        and(
          eq(attendanceCompOffAudits.tenantId, tenantId),
          eq(attendanceCompOffAudits.companyId, companyId),
          eq(attendanceCompOffAudits.requestId, requestId),
        ),
      )
      .orderBy(asc(attendanceCompOffAudits.createdAt));

    return rows.map((r) => ({
      id: r.audit.id,
      tenantId: r.audit.tenantId,
      companyId: r.audit.companyId,
      requestId: r.audit.requestId,
      action: r.audit.action,
      fromStatus: r.audit.fromStatus,
      toStatus: r.audit.toStatus,
      performedByUserId: r.audit.performedByUserId,
      performedByUserName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : null,
      performedByRole: r.audit.performedByRole,
      details: (r.audit.details as Record<string, unknown>) || null,
      clientIp: r.audit.clientIp,
      createdAt: r.audit.createdAt,
    }));
  }

  /**
   * Overview KPIs & Aggregated Metrics
   */
  async getOverviewMetrics(
    tenantId: string,
    companyId: string,
    filter?: { startDate?: string; endDate?: string; employeeId?: string },
  ): Promise<CompOffOverviewMetrics> {
    const db = getDb();

    const reqConditions = [
      eq(attendanceCompOffRequests.tenantId, tenantId),
      eq(attendanceCompOffRequests.companyId, companyId),
    ];
    if (filter?.employeeId) {
      reqConditions.push(eq(attendanceCompOffRequests.employeeId, filter.employeeId));
    }
    if (filter?.startDate) {
      reqConditions.push(gte(attendanceCompOffRequests.workDate, filter.startDate));
    }
    if (filter?.endDate) {
      reqConditions.push(lte(attendanceCompOffRequests.workDate, filter.endDate));
    }

    const [reqCounts] = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        pendingApproval: sql<number>`sum(case when ${attendanceCompOffRequests.status} in ('submitted', 'pending_approval') then 1 else 0 end)`,
        approved: sql<number>`sum(case when ${attendanceCompOffRequests.status} = 'approved' then 1 else 0 end)`,
        rejected: sql<number>`sum(case when ${attendanceCompOffRequests.status} = 'rejected' then 1 else 0 end)`,
        totalEarnedDays: sql<string>`coalesce(sum(case when ${attendanceCompOffRequests.status} = 'approved' then ${attendanceCompOffRequests.approvedCreditDays} else 0 end), 0)`,
      })
      .from(attendanceCompOffRequests)
      .where(and(...reqConditions));

    const entConditions = [
      eq(attendanceCompOffEntitlements.tenantId, tenantId),
      eq(attendanceCompOffEntitlements.companyId, companyId),
    ];
    if (filter?.employeeId) {
      entConditions.push(eq(attendanceCompOffEntitlements.employeeId, filter.employeeId));
    }

    const [entCounts] = await db
      .select({
        activeCount: sql<number>`sum(case when ${attendanceCompOffEntitlements.status} in ('active', 'pending_handoff', 'credited_to_leave') then 1 else 0 end)`,
        pendingHandoff: sql<number>`sum(case when ${attendanceCompOffEntitlements.status} = 'pending_handoff' then 1 else 0 end)`,
        creditedLeave: sql<number>`sum(case when ${attendanceCompOffEntitlements.status} = 'credited_to_leave' then 1 else 0 end)`,
      })
      .from(attendanceCompOffEntitlements)
      .where(and(...entConditions));

    return {
      totalRequests: Number(reqCounts?.totalRequests || 0),
      pendingApprovalCount: Number(reqCounts?.pendingApproval || 0),
      approvedCount: Number(reqCounts?.approved || 0),
      rejectedCount: Number(reqCounts?.rejected || 0),
      totalEarnedDays: parseFloat(reqCounts?.totalEarnedDays || '0'),
      activeEntitlementsCount: Number(entCounts?.activeCount || 0),
      pendingHandoffCount: Number(entCounts?.pendingHandoff || 0),
      creditedLeaveCount: Number(entCounts?.creditedLeave || 0),
    };
  }
}
