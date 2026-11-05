import { and, asc, desc, eq, inArray, isNull, lt, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { getDb } from '../../../../db/connection.js';
import {
  departments,
  employeeLeaveRequests,
  employees,
  leaveApprovalWorkflows,
  leaveRequestApprovals,
  leaveTypes,
  roleAssignments,
  roles,
  type LeaveApprovalWorkflowRecord,
  type LeaveRequestApprovalRecord,
  type NewLeaveApprovalWorkflowRecord,
} from '../../../../db/schema.js';

export interface ApprovalQueueItem {
  approvalId: string;
  requestId: string;
  level: number;
  purpose: 'approval' | 'cancellation';
  slaDueAt: Date | null;
  slaBreachedAt: Date | null;
  approverEmployeeId: string | null;
  approverRoleId: string | null;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorToken: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  session: string | null;
  reason: string;
  requestStatus: string;
  submittedAt: Date;
}

export class LeaveApprovalsRepository {
  // ── Workflows ──────────────────────────────────────────────────────────────

  async listWorkflows(tenantId: string, companyId: string): Promise<LeaveApprovalWorkflowRecord[]> {
    return getDb()
      .select()
      .from(leaveApprovalWorkflows)
      .where(
        and(
          eq(leaveApprovalWorkflows.tenantId, tenantId),
          eq(leaveApprovalWorkflows.companyId, companyId),
        ),
      )
      .orderBy(desc(leaveApprovalWorkflows.isDefault), asc(leaveApprovalWorkflows.name));
  }

  async findWorkflow(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<LeaveApprovalWorkflowRecord | null> {
    const [row] = await getDb()
      .select()
      .from(leaveApprovalWorkflows)
      .where(
        and(
          eq(leaveApprovalWorkflows.tenantId, tenantId),
          eq(leaveApprovalWorkflows.companyId, companyId),
          eq(leaveApprovalWorkflows.id, id),
        ),
      );
    return row ?? null;
  }

  async findWorkflowByName(companyId: string, name: string, excludeId?: string) {
    const conditions: SQL[] = [
      eq(leaveApprovalWorkflows.companyId, companyId),
      eq(sql`LOWER(${leaveApprovalWorkflows.name})`, name.toLowerCase()),
    ];
    if (excludeId) conditions.push(ne(leaveApprovalWorkflows.id, excludeId));
    const [row] = await getDb()
      .select()
      .from(leaveApprovalWorkflows)
      .where(and(...conditions));
    return row ?? null;
  }

  async findDefaultWorkflow(
    tenantId: string,
    companyId: string,
  ): Promise<LeaveApprovalWorkflowRecord | null> {
    const [row] = await getDb()
      .select()
      .from(leaveApprovalWorkflows)
      .where(
        and(
          eq(leaveApprovalWorkflows.tenantId, tenantId),
          eq(leaveApprovalWorkflows.companyId, companyId),
          eq(leaveApprovalWorkflows.isDefault, true),
          eq(leaveApprovalWorkflows.isActive, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async saveWorkflow(
    record: NewLeaveApprovalWorkflowRecord,
    mode: 'create' | 'update',
  ): Promise<void> {
    await getDb().transaction(async (tx) => {
      if (record.isDefault) {
        await tx
          .update(leaveApprovalWorkflows)
          .set({ isDefault: false })
          .where(
            and(
              eq(leaveApprovalWorkflows.companyId, record.companyId),
              ne(leaveApprovalWorkflows.id, record.id),
            ),
          );
      }
      if (mode === 'create') {
        await tx.insert(leaveApprovalWorkflows).values(record);
      } else {
        const { id, tenantId: _t, companyId: _c, createdByUserId: _u, ...patch } = record;
        await tx.update(leaveApprovalWorkflows).set(patch).where(eq(leaveApprovalWorkflows.id, id));
      }
    });
  }

  async countLeaveTypesUsingWorkflow(companyId: string, workflowId: string): Promise<number> {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)` })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.companyId, companyId), eq(leaveTypes.workflowId, workflowId)));
    return Number(row?.n ?? 0);
  }

  // ── Approver resolution ────────────────────────────────────────────────────

  async getDepartmentHeadId(tenantId: string, companyId: string, departmentId: string) {
    const [row] = await getDb()
      .select({ headEmployeeId: departments.headEmployeeId })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          eq(departments.id, departmentId),
        ),
      );
    return row?.headEmployeeId ?? null;
  }

  /** Active (or probation/notice) employee in the company; inactive approvers are not routable. */
  async isActiveEmployee(tenantId: string, companyId: string, employeeId: string) {
    const [row] = await getDb()
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
          inArray(employees.employmentStatus, ['active', 'probation', 'notice']),
        ),
      );
    return Boolean(row);
  }

  /** Active role usable in this company (company-specific or a system role). */
  async roleExists(companyId: string, roleId: string) {
    const [row] = await getDb()
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.status, 'active'),
          or(isNull(roles.companyId), eq(roles.companyId, companyId)),
        ),
      );
    return Boolean(row);
  }

  async getEmployeeIdForUser(tenantId: string, companyId: string, userId: string) {
    const [row] = await getDb()
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
    return row?.id ?? null;
  }

  async getUserRoleIds(companyId: string, userId: string): Promise<string[]> {
    const rows = await getDb()
      .select({ roleId: roleAssignments.roleId })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.companyId, companyId),
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.status, 'active'),
        ),
      );
    return rows.map((r) => r.roleId);
  }

  async isEmployeeHr(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workflow?: LeaveApprovalWorkflowRecord,
  ): Promise<boolean> {
    const [emp] = await getDb()
      .select({ userId: employees.userId })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
        ),
      )
      .limit(1);
    if (!emp?.userId) return false;
    const userRoleIds = await this.getUserRoleIds(companyId, emp.userId);
    if (!userRoleIds.length) return false;
    if (workflow?.fallbackApproverRoleId && userRoleIds.includes(workflow.fallbackApproverRoleId)) {
      return true;
    }
    const hrLevels = workflow?.levels.filter((l) => l.approverType === 'hr_role' && l.approverRef);
    if (hrLevels?.some((l) => userRoleIds.includes(l.approverRef!))) {
      return true;
    }
    const roleRows = await getDb()
      .select({ code: roles.code })
      .from(roles)
      .where(inArray(roles.id, userRoleIds));
    return roleRows.some(
      (r) => r.code.toLowerCase().includes('hr') || r.code.toLowerCase().includes('admin'),
    );
  }

  // ── Queue ──────────────────────────────────────────────────────────────────

  /**
   * Pending steps. With `actor` set, only steps assigned to that employee or one of the roles;
   * otherwise every pending step of the company (HR view).
   */
  async listPending(
    tenantId: string,
    companyId: string,
    actor: { employeeId: string | null; roleIds: string[] } | null,
  ): Promise<ApprovalQueueItem[]> {
    const applicant = alias(employees, 'applicant');
    const conditions: SQL[] = [
      eq(leaveRequestApprovals.tenantId, tenantId),
      eq(leaveRequestApprovals.companyId, companyId),
      eq(leaveRequestApprovals.action, 'pending'),
    ];
    if (actor) {
      const mine: SQL[] = [];
      if (actor.employeeId)
        mine.push(eq(leaveRequestApprovals.approverEmployeeId, actor.employeeId));
      if (actor.roleIds.length > 0)
        mine.push(inArray(leaveRequestApprovals.approverRoleId, actor.roleIds));
      if (mine.length === 0) return [];
      conditions.push(or(...mine)!);
    }
    const rows = await getDb()
      .select({
        approvalId: leaveRequestApprovals.id,
        requestId: leaveRequestApprovals.requestId,
        level: leaveRequestApprovals.level,
        purpose: leaveRequestApprovals.purpose,
        slaDueAt: leaveRequestApprovals.slaDueAt,
        slaBreachedAt: leaveRequestApprovals.slaBreachedAt,
        approverEmployeeId: leaveRequestApprovals.approverEmployeeId,
        approverRoleId: leaveRequestApprovals.approverRoleId,
        employeeId: employeeLeaveRequests.employeeId,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        employeeNumber: applicant.employeeNumber,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        colorToken: leaveTypes.colorToken,
        startDate: employeeLeaveRequests.startDate,
        endDate: employeeLeaveRequests.endDate,
        totalDays: employeeLeaveRequests.totalDays,
        session: employeeLeaveRequests.session,
        reason: employeeLeaveRequests.reason,
        requestStatus: employeeLeaveRequests.status,
        submittedAt: employeeLeaveRequests.createdAt,
      })
      .from(leaveRequestApprovals)
      .innerJoin(
        employeeLeaveRequests,
        eq(employeeLeaveRequests.id, leaveRequestApprovals.requestId),
      )
      .innerJoin(applicant, eq(applicant.id, employeeLeaveRequests.employeeId))
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
      .where(and(...conditions))
      .orderBy(asc(leaveRequestApprovals.slaDueAt), asc(employeeLeaveRequests.createdAt));
    return rows.map(({ firstName, lastName, totalDays, ...r }) => ({
      ...r,
      employeeName: `${firstName} ${lastName ?? ''}`.trim(),
      totalDays: Number(totalDays),
    }));
  }

  async getSteps(requestId: string): Promise<LeaveRequestApprovalRecord[]> {
    return getDb()
      .select()
      .from(leaveRequestApprovals)
      .where(eq(leaveRequestApprovals.requestId, requestId))
      .orderBy(asc(leaveRequestApprovals.purpose), asc(leaveRequestApprovals.level));
  }

  async findStep(approvalId: string): Promise<LeaveRequestApprovalRecord | null> {
    const [row] = await getDb()
      .select()
      .from(leaveRequestApprovals)
      .where(eq(leaveRequestApprovals.id, approvalId));
    return row ?? null;
  }

  /** Pending steps whose SLA is overdue and not yet handled. */
  async findOverdue(now: Date): Promise<LeaveRequestApprovalRecord[]> {
    return getDb()
      .select()
      .from(leaveRequestApprovals)
      .where(
        and(
          eq(leaveRequestApprovals.action, 'pending'),
          lt(leaveRequestApprovals.slaDueAt, now),
          isNull(leaveRequestApprovals.slaBreachedAt),
        ),
      )
      .limit(500);
  }
}

export const leaveApprovalsRepository = new LeaveApprovalsRepository();
