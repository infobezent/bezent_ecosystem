import { and, desc, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { getDb } from '../../../../db/connection.js';
import {
  employeeLeaveRequests,
  employees,
  leaveBalanceTransactions,
  leaveRequestApprovals,
  leaveTypes,
  roles,
  users,
} from '../../../../db/schema.js';

const fullName = (first: string | null, last: string | null) =>
  `${first ?? ''} ${last ?? ''}`.trim();

/** Rows audited per event source; the merged trail is capped by the service. */
const AUDIT_SOURCE_LIMIT = 500;

export interface ApprovalDecisionRow {
  approverKey: string;
  approverName: string;
  action: 'approved' | 'rejected' | 'escalated' | 'skipped';
  createdAt: Date;
  actedAt: Date;
  breached: boolean;
}

export interface AuditEventRow {
  at: Date;
  employeeName: string;
  employeeNumber: string;
  event: string;
  detail: string;
  actor: string | null;
}

/** Read models for Leave Operations → Reports that the request/balance queries do not cover. */
export class LeaveReportsRepository {
  /** Decided approval steps created in the range, with the approver's name. */
  async listApprovalDecisions(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    range: { from: Date; to: Date },
  ): Promise<ApprovalDecisionRow[]> {
    if (employeeIds?.length === 0) return [];
    const approver = alias(employees, 'approver');
    const rows = await getDb()
      .select({
        approverEmployeeId: leaveRequestApprovals.approverEmployeeId,
        approverRoleId: leaveRequestApprovals.approverRoleId,
        approverFirst: approver.firstName,
        approverLast: approver.lastName,
        roleName: roles.name,
        action: leaveRequestApprovals.action,
        createdAt: leaveRequestApprovals.createdAt,
        actedAt: leaveRequestApprovals.actedAt,
        slaBreachedAt: leaveRequestApprovals.slaBreachedAt,
        slaDueAt: leaveRequestApprovals.slaDueAt,
      })
      .from(leaveRequestApprovals)
      .innerJoin(
        employeeLeaveRequests,
        eq(employeeLeaveRequests.id, leaveRequestApprovals.requestId),
      )
      .leftJoin(approver, eq(approver.id, leaveRequestApprovals.approverEmployeeId))
      .leftJoin(roles, eq(roles.id, leaveRequestApprovals.approverRoleId))
      .where(
        and(
          eq(leaveRequestApprovals.tenantId, tenantId),
          eq(leaveRequestApprovals.companyId, companyId),
          inArray(leaveRequestApprovals.action, ['approved', 'rejected', 'escalated', 'skipped']),
          isNotNull(leaveRequestApprovals.actedAt),
          gte(leaveRequestApprovals.createdAt, range.from),
          lte(leaveRequestApprovals.createdAt, range.to),
          employeeIds ? inArray(employeeLeaveRequests.employeeId, employeeIds) : undefined,
        ),
      );
    return rows.map((r) => ({
      approverKey: r.approverEmployeeId ?? `role:${r.approverRoleId ?? 'none'}`,
      approverName: r.approverFirst
        ? fullName(r.approverFirst, r.approverLast)
        : r.roleName
          ? `Role: ${r.roleName}`
          : 'Unassigned',
      action: r.action as ApprovalDecisionRow['action'],
      createdAt: r.createdAt,
      actedAt: r.actedAt!,
      breached: r.slaBreachedAt !== null || (r.slaDueAt !== null && r.actedAt! > r.slaDueAt),
    }));
  }

  /**
   * Leave lifecycle and balance events in the range: submissions, decisions, cancellations and
   * manual balance adjustments, newest first.
   */
  async listAuditEvents(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    range: { from: Date; to: Date },
  ): Promise<AuditEventRow[]> {
    if (employeeIds?.length === 0) return [];
    const db = getDb();
    const actor = alias(users, 'actor');
    const inScope = (col: typeof employeeLeaveRequests.employeeId) =>
      employeeIds ? inArray(col, employeeIds) : undefined;
    const requestBase = and(
      eq(employeeLeaveRequests.tenantId, tenantId),
      eq(employeeLeaveRequests.companyId, companyId),
      inScope(employeeLeaveRequests.employeeId),
    );

    const [submitted, decided, cancelled, adjusted] = await Promise.all([
      db
        .select({
          at: employeeLeaveRequests.createdAt,
          first: employees.firstName,
          last: employees.lastName,
          number: employees.employeeNumber,
          type: leaveTypes.name,
          start: employeeLeaveRequests.startDate,
          end: employeeLeaveRequests.endDate,
          days: employeeLeaveRequests.totalDays,
          actorFirst: actor.firstName,
          actorLast: actor.lastName,
        })
        .from(employeeLeaveRequests)
        .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
        .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
        .leftJoin(actor, eq(actor.id, employeeLeaveRequests.submittedByUserId))
        .where(
          and(
            requestBase,
            gte(employeeLeaveRequests.createdAt, range.from),
            lte(employeeLeaveRequests.createdAt, range.to),
          ),
        )
        .orderBy(desc(employeeLeaveRequests.createdAt))
        .limit(AUDIT_SOURCE_LIMIT),
      db
        .select({
          at: leaveRequestApprovals.actedAt,
          first: employees.firstName,
          last: employees.lastName,
          number: employees.employeeNumber,
          type: leaveTypes.name,
          start: employeeLeaveRequests.startDate,
          end: employeeLeaveRequests.endDate,
          action: leaveRequestApprovals.action,
          purpose: leaveRequestApprovals.purpose,
          level: leaveRequestApprovals.level,
          comment: leaveRequestApprovals.comment,
          actorFirst: actor.firstName,
          actorLast: actor.lastName,
        })
        .from(leaveRequestApprovals)
        .innerJoin(
          employeeLeaveRequests,
          eq(employeeLeaveRequests.id, leaveRequestApprovals.requestId),
        )
        .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
        .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
        .leftJoin(actor, eq(actor.id, leaveRequestApprovals.actedByUserId))
        .where(
          and(
            requestBase,
            inArray(leaveRequestApprovals.action, ['approved', 'rejected', 'escalated', 'skipped']),
            gte(leaveRequestApprovals.actedAt, range.from),
            lte(leaveRequestApprovals.actedAt, range.to),
          ),
        )
        .orderBy(desc(leaveRequestApprovals.actedAt))
        .limit(AUDIT_SOURCE_LIMIT),
      db
        .select({
          at: employeeLeaveRequests.cancelledAt,
          first: employees.firstName,
          last: employees.lastName,
          number: employees.employeeNumber,
          type: leaveTypes.name,
          start: employeeLeaveRequests.startDate,
          end: employeeLeaveRequests.endDate,
          reason: employeeLeaveRequests.cancellationReason,
          actorFirst: actor.firstName,
          actorLast: actor.lastName,
        })
        .from(employeeLeaveRequests)
        .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
        .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
        .leftJoin(actor, eq(actor.id, employeeLeaveRequests.cancelledByUserId))
        .where(
          and(
            requestBase,
            gte(employeeLeaveRequests.cancelledAt, range.from),
            lte(employeeLeaveRequests.cancelledAt, range.to),
          ),
        )
        .orderBy(desc(employeeLeaveRequests.cancelledAt))
        .limit(AUDIT_SOURCE_LIMIT),
      db
        .select({
          at: leaveBalanceTransactions.createdAt,
          first: employees.firstName,
          last: employees.lastName,
          number: employees.employeeNumber,
          type: leaveTypes.name,
          days: leaveBalanceTransactions.days,
          reason: leaveBalanceTransactions.reason,
          actorFirst: actor.firstName,
          actorLast: actor.lastName,
        })
        .from(leaveBalanceTransactions)
        .innerJoin(employees, eq(employees.id, leaveBalanceTransactions.employeeId))
        .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalanceTransactions.leaveTypeId))
        .leftJoin(actor, eq(actor.id, leaveBalanceTransactions.createdByUserId))
        .where(
          and(
            eq(leaveBalanceTransactions.tenantId, tenantId),
            eq(leaveBalanceTransactions.companyId, companyId),
            eq(leaveBalanceTransactions.txnType, 'adjustment'),
            gte(leaveBalanceTransactions.createdAt, range.from),
            lte(leaveBalanceTransactions.createdAt, range.to),
            employeeIds ? inArray(leaveBalanceTransactions.employeeId, employeeIds) : undefined,
          ),
        )
        .orderBy(desc(leaveBalanceTransactions.createdAt))
        .limit(AUDIT_SOURCE_LIMIT),
    ]);

    const actorOf = (r: { actorFirst: string | null; actorLast: string | null }) =>
      r.actorFirst ? fullName(r.actorFirst, r.actorLast) : null;
    const span = (r: { start: string; end: string }) =>
      r.start === r.end ? r.start : `${r.start} to ${r.end}`;

    return [
      ...submitted.map((r) => ({
        at: r.at,
        employeeName: fullName(r.first, r.last),
        employeeNumber: r.number,
        event: 'Applied',
        detail: `${r.type} · ${span(r)} · ${Number(r.days)} day(s)`,
        actor: actorOf(r),
      })),
      ...decided.map((r) => ({
        at: r.at!,
        employeeName: fullName(r.first, r.last),
        employeeNumber: r.number,
        event: `${r.purpose === 'cancellation' ? 'Cancellation ' : ''}${r.action.charAt(0).toUpperCase()}${r.action.slice(1)} (L${r.level})`,
        detail: `${r.type} · ${span(r)}${r.comment ? ` · “${r.comment}”` : ''}`,
        actor: actorOf(r),
      })),
      ...cancelled.map((r) => ({
        at: r.at!,
        employeeName: fullName(r.first, r.last),
        employeeNumber: r.number,
        event: 'Cancelled',
        detail: `${r.type} · ${span(r)}${r.reason ? ` · ${r.reason}` : ''}`,
        actor: actorOf(r),
      })),
      ...adjusted.map((r) => ({
        at: r.at,
        employeeName: fullName(r.first, r.last),
        employeeNumber: r.number,
        event: Number(r.days) >= 0 ? 'Balance credited' : 'Balance debited',
        detail: `${r.type} · ${Math.abs(Number(r.days))} day(s)${r.reason ? ` · ${r.reason}` : ''}`,
        actor: actorOf(r),
      })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
  }
}

export const leaveReportsRepository = new LeaveReportsRepository();
