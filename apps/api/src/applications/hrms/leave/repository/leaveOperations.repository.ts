import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { getDb } from '../../../../db/connection.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import { insertLedgerEntry, insertNotifications } from './leave.repository.js';
import {
  departments,
  employeeLeaveBalances,
  employeeLeaveRequests,
  employees,
  leaveBalanceTransactions,
  leaveRequestApprovals,
  leaveTypes,
  locations,
  roles,
  users,
} from '../../../../db/schema.js';
import type {
  LeaveRequestDetail,
  LeaveRequestFilters,
  LeaveRequestListItem,
  LeaveRequestStatusCounts,
  OperationsLeaveRow,
  CalendarEmployee,
} from '../types/leaveOperations.types.js';

/** Employment statuses that count as part of the working population. */
const WORKFORCE_STATUSES = ['active', 'probation', 'notice'] as const;

const fullName = (first: string | null, last: string | null) =>
  `${first ?? ''} ${last ?? ''}`.trim();

/**
 * Read models for the HR Leave Operations pages (overview, request register, request detail).
 * `employeeIds` = null means company-wide; an array scopes every query to those employees.
 */
export class LeaveOperationsRepository {
  /** Direct and indirect reportees of a manager (breadth-first over reporting_manager_id). */
  async listReporteeIds(tenantId: string, companyId: string, managerId: string): Promise<string[]> {
    const seen = new Set<string>();
    let frontier = [managerId];
    while (frontier.length > 0) {
      const rows = await getDb()
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            inArray(employees.reportingManagerId, frontier),
          ),
        );
      frontier = rows.map((r) => r.id).filter((id) => !seen.has(id) && id !== managerId);
      frontier.forEach((id) => seen.add(id));
    }
    return [...seen];
  }

  async countWorkforce(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    filters: { departmentId?: string; locationId?: string },
  ): Promise<number> {
    if (employeeIds?.length === 0) return 0;
    const [row] = await getDb()
      .select({ n: count() })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          inArray(employees.employmentStatus, [...WORKFORCE_STATUSES]),
          employeeIds ? inArray(employees.id, employeeIds) : undefined,
          filters.departmentId ? eq(employees.departmentId, filters.departmentId) : undefined,
          filters.locationId ? eq(employees.locationId, filters.locationId) : undefined,
        ),
      );
    return Number(row?.n ?? 0);
  }

  /** Requests overlapping [from, to] in the given statuses, with employee and type details. */
  async listLeaveInRange(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    range: { from: string; to: string },
    statuses: Array<(typeof employeeLeaveRequests.status.enumValues)[number]>,
    filters: { departmentId?: string; locationId?: string } = {},
  ): Promise<OperationsLeaveRow[]> {
    if (employeeIds?.length === 0) return [];
    const rows = await getDb()
      .select({
        requestId: employeeLeaveRequests.id,
        employeeId: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeNumber: employees.employeeNumber,
        departmentName: departments.name,
        leaveTypeId: leaveTypes.id,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        colorToken: leaveTypes.colorToken,
        payrollImpact: leaveTypes.payrollImpact,
        startDate: employeeLeaveRequests.startDate,
        endDate: employeeLeaveRequests.endDate,
        totalDays: employeeLeaveRequests.totalDays,
        session: employeeLeaveRequests.session,
        status: employeeLeaveRequests.status,
        calculationSnapshot: employeeLeaveRequests.calculationSnapshot,
      })
      .from(employeeLeaveRequests)
      .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          inArray(employeeLeaveRequests.status, statuses),
          lte(employeeLeaveRequests.startDate, range.to),
          gte(employeeLeaveRequests.endDate, range.from),
          employeeIds ? inArray(employees.id, employeeIds) : undefined,
          filters.departmentId ? eq(employees.departmentId, filters.departmentId) : undefined,
          filters.locationId ? eq(employees.locationId, filters.locationId) : undefined,
        ),
      )
      .orderBy(asc(employeeLeaveRequests.startDate), asc(employees.firstName));
    return rows.map(({ firstName, lastName, totalDays, calculationSnapshot, ...r }) => ({
      ...r,
      employeeName: fullName(firstName, lastName),
      totalDays: Number(totalDays),
      breakdown: Array.isArray(calculationSnapshot?.scheduleBreakdown)
        ? (calculationSnapshot.scheduleBreakdown as OperationsLeaveRow['breakdown'])
        : [],
    }));
  }

  /** Pending approval steps for in-scope requests, split by purpose and SLA state. */
  async approvalCounts(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    now: Date,
  ): Promise<{ pending: number; overdue: number; cancellations: number }> {
    if (employeeIds?.length === 0) return { pending: 0, overdue: 0, cancellations: 0 };
    const [row] = await getDb()
      .select({
        pending: count(),
        overdue: sql<number>`SUM(CASE WHEN ${leaveRequestApprovals.slaBreachedAt} IS NOT NULL OR ${leaveRequestApprovals.slaDueAt} < ${now} THEN 1 ELSE 0 END)`,
        cancellations: sql<number>`SUM(CASE WHEN ${leaveRequestApprovals.purpose} = 'cancellation' THEN 1 ELSE 0 END)`,
      })
      .from(leaveRequestApprovals)
      .innerJoin(
        employeeLeaveRequests,
        eq(employeeLeaveRequests.id, leaveRequestApprovals.requestId),
      )
      .where(
        and(
          eq(leaveRequestApprovals.tenantId, tenantId),
          eq(leaveRequestApprovals.companyId, companyId),
          eq(leaveRequestApprovals.action, 'pending'),
          employeeIds ? inArray(employeeLeaveRequests.employeeId, employeeIds) : undefined,
        ),
      );
    return {
      pending: Number(row?.pending ?? 0),
      overdue: Number(row?.overdue ?? 0),
      cancellations: Number(row?.cancellations ?? 0),
    };
  }

  /** Approval steps decided as approved since `since` by anyone (for the "approved today" card). */
  async countApprovedSince(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    since: Date,
  ): Promise<number> {
    if (employeeIds?.length === 0) return 0;
    const [row] = await getDb()
      .select({ n: count() })
      .from(leaveRequestApprovals)
      .innerJoin(
        employeeLeaveRequests,
        eq(employeeLeaveRequests.id, leaveRequestApprovals.requestId),
      )
      .where(
        and(
          eq(leaveRequestApprovals.tenantId, tenantId),
          eq(leaveRequestApprovals.companyId, companyId),
          eq(leaveRequestApprovals.action, 'approved'),
          gte(leaveRequestApprovals.actedAt, since),
          employeeIds ? inArray(employeeLeaveRequests.employeeId, employeeIds) : undefined,
        ),
      );
    return Number(row?.n ?? 0);
  }

  /** Tracked balances below zero in the cycle containing `date`. */
  async countNegativeBalances(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    date: string,
  ): Promise<number> {
    if (employeeIds?.length === 0) return 0;
    const [row] = await getDb()
      .select({ n: count() })
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          lte(employeeLeaveBalances.cycleStartDate, date),
          gte(employeeLeaveBalances.cycleEndDate, date),
          lt(
            sql`${employeeLeaveBalances.totalDays} - ${employeeLeaveBalances.usedDays} - ${employeeLeaveBalances.pendingDays}`,
            0,
          ),
          employeeIds ? inArray(employeeLeaveBalances.employeeId, employeeIds) : undefined,
        ),
      );
    return Number(row?.n ?? 0);
  }

  async listRequests(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    f: LeaveRequestFilters,
  ): Promise<{ items: LeaveRequestListItem[]; total: number; counts: LeaveRequestStatusCounts }> {
    const empty = { pending: 0, approved: 0, rejected: 0, cancelled: 0, cancellation_pending: 0 };
    if (employeeIds?.length === 0) return { items: [], total: 0, counts: empty };

    const base: SQL[] = [
      eq(employeeLeaveRequests.tenantId, tenantId),
      eq(employeeLeaveRequests.companyId, companyId),
    ];
    if (employeeIds) base.push(inArray(employeeLeaveRequests.employeeId, employeeIds));
    if (f.leaveTypeId) base.push(eq(employeeLeaveRequests.leaveTypeId, f.leaveTypeId));
    if (f.departmentId) base.push(eq(employees.departmentId, f.departmentId));
    if (f.locationId) base.push(eq(employees.locationId, f.locationId));
    if (f.from) base.push(gte(employeeLeaveRequests.endDate, f.from));
    if (f.to) base.push(lte(employeeLeaveRequests.startDate, f.to));
    if (f.search) {
      const term = `%${f.search}%`;
      base.push(
        or(
          like(employees.firstName, term),
          like(employees.lastName, term),
          like(employees.employeeNumber, term),
          like(sql`CONCAT(${employees.firstName}, ' ', COALESCE(${employees.lastName}, ''))`, term),
        )!,
      );
    }
    if (f.appliedByHr) {
      base.push(isNotNull(employeeLeaveRequests.submittedByUserId));
      base.push(
        or(
          isNull(employees.userId),
          ne(employeeLeaveRequests.submittedByUserId, employees.userId),
        )!,
      );
    }
    const withStatus = f.status ? [...base, eq(employeeLeaveRequests.status, f.status)] : base;

    const db = getDb();
    const [rows, [totalRow], statusRows] = await Promise.all([
      db
        .select({
          id: employeeLeaveRequests.id,
          employeeId: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          employeeNumber: employees.employeeNumber,
          employeeUserId: employees.userId,
          departmentName: departments.name,
          locationName: locations.name,
          leaveTypeId: leaveTypes.id,
          leaveTypeName: leaveTypes.name,
          leaveTypeCode: leaveTypes.code,
          colorToken: leaveTypes.colorToken,
          startDate: employeeLeaveRequests.startDate,
          endDate: employeeLeaveRequests.endDate,
          totalDays: employeeLeaveRequests.totalDays,
          session: employeeLeaveRequests.session,
          status: employeeLeaveRequests.status,
          currentLevel: employeeLeaveRequests.currentLevel,
          submittedByUserId: employeeLeaveRequests.submittedByUserId,
          submittedAt: employeeLeaveRequests.createdAt,
        })
        .from(employeeLeaveRequests)
        .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
        .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
        .leftJoin(departments, eq(departments.id, employees.departmentId))
        .leftJoin(locations, eq(locations.id, employees.locationId))
        .where(and(...withStatus))
        .orderBy(desc(employeeLeaveRequests.createdAt))
        .limit(f.pageSize)
        .offset((f.page - 1) * f.pageSize),
      db
        .select({ n: count() })
        .from(employeeLeaveRequests)
        .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
        .where(and(...withStatus)),
      db
        .select({ status: employeeLeaveRequests.status, n: count() })
        .from(employeeLeaveRequests)
        .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
        .where(and(...base))
        .groupBy(employeeLeaveRequests.status),
    ]);

    const counts = { ...empty };
    for (const r of statusRows) counts[r.status] = Number(r.n);
    return {
      items: rows.map(
        ({ firstName, lastName, totalDays, employeeUserId, submittedByUserId, ...r }) => ({
          ...r,
          employeeName: fullName(firstName, lastName),
          totalDays: Number(totalDays),
          appliedOnBehalf: submittedByUserId !== null && submittedByUserId !== employeeUserId,
        }),
      ),
      total: Number(totalRow?.n ?? 0),
      counts,
    };
  }

  async getRequestDetail(
    tenantId: string,
    companyId: string,
    requestId: string,
  ): Promise<LeaveRequestDetail | null> {
    const submitter = alias(users, 'submitter');
    const canceller = alias(users, 'canceller');
    const [row] = await getDb()
      .select({
        request: employeeLeaveRequests,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeNumber: employees.employeeNumber,
        employeeUserId: employees.userId,
        departmentName: departments.name,
        locationName: locations.name,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        colorToken: leaveTypes.colorToken,
        submitterFirst: submitter.firstName,
        submitterLast: submitter.lastName,
        cancellerFirst: canceller.firstName,
        cancellerLast: canceller.lastName,
      })
      .from(employeeLeaveRequests)
      .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .leftJoin(locations, eq(locations.id, employees.locationId))
      .leftJoin(submitter, eq(submitter.id, employeeLeaveRequests.submittedByUserId))
      .leftJoin(canceller, eq(canceller.id, employeeLeaveRequests.cancelledByUserId))
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.id, requestId),
        ),
      )
      .limit(1);
    if (!row) return null;

    const approver = alias(employees, 'approver');
    const actor = alias(users, 'actor');
    const steps = await getDb()
      .select({
        id: leaveRequestApprovals.id,
        purpose: leaveRequestApprovals.purpose,
        level: leaveRequestApprovals.level,
        action: leaveRequestApprovals.action,
        approverEmployeeId: leaveRequestApprovals.approverEmployeeId,
        approverFirst: approver.firstName,
        approverLast: approver.lastName,
        approverRoleName: roles.name,
        actorFirst: actor.firstName,
        actorLast: actor.lastName,
        comment: leaveRequestApprovals.comment,
        actedAt: leaveRequestApprovals.actedAt,
        slaDueAt: leaveRequestApprovals.slaDueAt,
        slaBreachedAt: leaveRequestApprovals.slaBreachedAt,
        createdAt: leaveRequestApprovals.createdAt,
      })
      .from(leaveRequestApprovals)
      .leftJoin(approver, eq(approver.id, leaveRequestApprovals.approverEmployeeId))
      .leftJoin(roles, eq(roles.id, leaveRequestApprovals.approverRoleId))
      .leftJoin(actor, eq(actor.id, leaveRequestApprovals.actedByUserId))
      .where(eq(leaveRequestApprovals.requestId, requestId))
      .orderBy(asc(leaveRequestApprovals.createdAt), asc(leaveRequestApprovals.level));

    const r = row.request;
    return {
      id: r.id,
      employee: {
        id: r.employeeId,
        name: fullName(row.firstName, row.lastName),
        employeeNumber: row.employeeNumber,
        departmentName: row.departmentName,
        locationName: row.locationName,
      },
      leaveType: {
        id: r.leaveTypeId,
        name: row.leaveTypeName,
        code: row.leaveTypeCode,
        colorToken: row.colorToken,
      },
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: Number(r.totalDays),
      session: r.session,
      reason: r.reason,
      status: r.status,
      currentLevel: r.currentLevel,
      rejectionReason: r.rejectionReason,
      cancellationReason: r.cancellationReason,
      cancelledBy: row.cancellerFirst ? fullName(row.cancellerFirst, row.cancellerLast) : null,
      cancelledAt: r.cancelledAt,
      submittedAt: r.createdAt,
      submittedBy: row.submitterFirst ? fullName(row.submitterFirst, row.submitterLast) : null,
      appliedOnBehalf: r.submittedByUserId !== null && r.submittedByUserId !== row.employeeUserId,
      policyId: r.policyId,
      workflowId: r.workflowId,
      calculation: (r.calculationSnapshot as LeaveRequestDetail['calculation']) ?? null,
      approvals: steps.map((s) => ({
        id: s.id,
        purpose: s.purpose,
        level: s.level,
        action: s.action,
        approverEmployeeId: s.approverEmployeeId,
        approverName: s.approverFirst
          ? fullName(s.approverFirst, s.approverLast)
          : s.approverRoleName
            ? `Role: ${s.approverRoleName}`
            : null,
        actedBy: s.actorFirst ? fullName(s.actorFirst, s.actorLast) : null,
        comment: s.comment,
        actedAt: s.actedAt,
        slaDueAt: s.slaDueAt,
        slaBreachedAt: s.slaBreachedAt,
      })),
    };
  }

  // ── P2: employees, balances, ledger ───────────────────────────────────────

  /** Workforce employees in scope, optionally filtered and paged (name order). */
  async listEmployees(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    filters: {
      departmentId?: string;
      locationId?: string;
      search?: string;
      onlyIds?: string[];
      /** Include exited employees too (year-end rows may belong to leavers). */
      anyStatus?: boolean;
    },
    paging?: { page: number; pageSize: number },
  ): Promise<{ items: CalendarEmployee[]; total: number }> {
    if (employeeIds?.length === 0 || filters.onlyIds?.length === 0) return { items: [], total: 0 };
    const term = filters.search ? `%${filters.search}%` : null;
    const where = and(
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
      filters.anyStatus ? undefined : inArray(employees.employmentStatus, [...WORKFORCE_STATUSES]),
      employeeIds ? inArray(employees.id, employeeIds) : undefined,
      filters.onlyIds ? inArray(employees.id, filters.onlyIds) : undefined,
      filters.departmentId ? eq(employees.departmentId, filters.departmentId) : undefined,
      filters.locationId ? eq(employees.locationId, filters.locationId) : undefined,
      term
        ? or(
            like(employees.firstName, term),
            like(employees.lastName, term),
            like(employees.employeeNumber, term),
            like(
              sql`CONCAT(${employees.firstName}, ' ', COALESCE(${employees.lastName}, ''))`,
              term,
            ),
          )
        : undefined,
    );
    const db = getDb();
    const base = db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeNumber: employees.employeeNumber,
        departmentName: departments.name,
      })
      .from(employees)
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(where)
      .orderBy(asc(employees.firstName), asc(employees.lastName));
    const [rows, [totalRow]] = await Promise.all([
      paging ? base.limit(paging.pageSize).offset((paging.page - 1) * paging.pageSize) : base,
      db.select({ n: count() }).from(employees).where(where),
    ]);
    return {
      items: rows.map(({ firstName, lastName, ...r }) => ({
        ...r,
        name: fullName(firstName, lastName),
      })),
      total: Number(totalRow?.n ?? 0),
    };
  }

  /** Employees who booked each optional holiday (optional-holiday type, single-day requests). */
  async optionalHolidayUptake(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    range: { from: string; to: string },
  ): Promise<Map<string, number>> {
    if (employeeIds?.length === 0) return new Map();
    const rows = await getDb()
      .select({
        date: employeeLeaveRequests.startDate,
        n: sql<number>`COUNT(DISTINCT ${employeeLeaveRequests.employeeId})`,
      })
      .from(employeeLeaveRequests)
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(leaveTypes.category, 'optional_holiday'),
          inArray(employeeLeaveRequests.status, ['pending', 'approved', 'cancellation_pending']),
          gte(employeeLeaveRequests.startDate, range.from),
          lte(employeeLeaveRequests.startDate, range.to),
          employeeIds ? inArray(employeeLeaveRequests.employeeId, employeeIds) : undefined,
        ),
      )
      .groupBy(employeeLeaveRequests.startDate);
    return new Map(rows.map((r) => [r.date, Number(r.n)]));
  }

  async userNames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await getDb()
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(inArray(users.id, userIds));
    return new Map(rows.map((u) => [u.id, fullName(u.firstName, u.lastName)]));
  }

  /** Every leave type's display name (including inactive ones referenced by history). */
  async leaveTypeNames(tenantId: string, companyId: string): Promise<Map<string, string>> {
    const rows = await getDb()
      .select({ id: leaveTypes.id, name: leaveTypes.name })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.tenantId, tenantId), eq(leaveTypes.companyId, companyId)));
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  /** Active tracked leave types that carry a balance (optional holidays excluded). */
  async listTrackedTypes(tenantId: string, companyId: string) {
    return getDb()
      .select({
        id: leaveTypes.id,
        name: leaveTypes.name,
        code: leaveTypes.code,
        colorToken: leaveTypes.colorToken,
      })
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.isActive, true),
          eq(leaveTypes.isArchived, false),
          eq(leaveTypes.isTracked, true),
          ne(leaveTypes.category, 'optional_holiday'),
        ),
      )
      .orderBy(asc(leaveTypes.name));
  }

  async listBalances(
    tenantId: string,
    companyId: string,
    employeeIds: string[],
    cycleStart: string,
  ) {
    if (employeeIds.length === 0) return [];
    return getDb()
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          eq(employeeLeaveBalances.cycleStartDate, cycleStart),
          inArray(employeeLeaveBalances.employeeId, employeeIds),
        ),
      );
  }

  /** Employees in scope holding at least one negative balance in the cycle. */
  async listNegativeBalanceEmployeeIds(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    cycleStart: string,
  ): Promise<string[]> {
    if (employeeIds?.length === 0) return [];
    const rows = await getDb()
      .selectDistinct({ employeeId: employeeLeaveBalances.employeeId })
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          eq(employeeLeaveBalances.cycleStartDate, cycleStart),
          lt(
            sql`${employeeLeaveBalances.totalDays} - ${employeeLeaveBalances.usedDays} - ${employeeLeaveBalances.pendingDays}`,
            0,
          ),
          employeeIds ? inArray(employeeLeaveBalances.employeeId, employeeIds) : undefined,
        ),
      );
    return rows.map((r) => r.employeeId);
  }

  async balanceMetrics(
    tenantId: string,
    companyId: string,
    employeeIds: string[] | null,
    cycleStart: string,
    expiryWindow: { from: string; to: string },
  ): Promise<{ totalAvailable: number; negative: number; expiring: number }> {
    if (employeeIds?.length === 0) return { totalAvailable: 0, negative: 0, expiring: 0 };
    const available = sql`${employeeLeaveBalances.totalDays} - ${employeeLeaveBalances.usedDays} - ${employeeLeaveBalances.pendingDays}`;
    const [row] = await getDb()
      .select({
        totalAvailable: sql<string>`COALESCE(SUM(GREATEST(${available}, 0)), 0)`,
        negative: sql<number>`SUM(CASE WHEN ${available} < 0 THEN 1 ELSE 0 END)`,
        expiring: sql<string>`COALESCE(SUM(CASE WHEN ${employeeLeaveBalances.carryForwardExpiresOn} BETWEEN ${expiryWindow.from} AND ${expiryWindow.to} THEN ${employeeLeaveBalances.carriedForwardDays} ELSE 0 END), 0)`,
      })
      .from(employeeLeaveBalances)
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveBalances.leaveTypeId))
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          eq(employeeLeaveBalances.cycleStartDate, cycleStart),
          eq(leaveTypes.isTracked, true),
          employeeIds ? inArray(employeeLeaveBalances.employeeId, employeeIds) : undefined,
        ),
      );
    return {
      totalAvailable: Number(row?.totalAvailable ?? 0),
      negative: Number(row?.negative ?? 0),
      expiring: Number(row?.expiring ?? 0),
    };
  }

  /** Ledger rows for an employee's cycle, oldest first, with type and actor names. */
  async listLedger(
    tenantId: string,
    companyId: string,
    employeeId: string,
    cycleStart: string,
    leaveTypeId?: string,
  ) {
    const rows = await getDb()
      .select({
        id: leaveBalanceTransactions.id,
        balanceId: leaveBalanceTransactions.balanceId,
        leaveTypeId: leaveBalanceTransactions.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        txnType: leaveBalanceTransactions.txnType,
        days: leaveBalanceTransactions.days,
        referenceType: leaveBalanceTransactions.referenceType,
        referenceId: leaveBalanceTransactions.referenceId,
        reason: leaveBalanceTransactions.reason,
        createdByUserId: leaveBalanceTransactions.createdByUserId,
        actorFirst: users.firstName,
        actorLast: users.lastName,
        createdAt: leaveBalanceTransactions.createdAt,
      })
      .from(leaveBalanceTransactions)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalanceTransactions.leaveTypeId))
      .leftJoin(users, eq(users.id, leaveBalanceTransactions.createdByUserId))
      .where(
        and(
          eq(leaveBalanceTransactions.tenantId, tenantId),
          eq(leaveBalanceTransactions.companyId, companyId),
          eq(leaveBalanceTransactions.employeeId, employeeId),
          eq(leaveBalanceTransactions.cycleStartDate, cycleStart),
          leaveTypeId ? eq(leaveBalanceTransactions.leaveTypeId, leaveTypeId) : undefined,
        ),
      )
      .orderBy(asc(leaveBalanceTransactions.createdAt), asc(leaveBalanceTransactions.id));
    return rows.map(({ actorFirst, actorLast, days, ...r }) => ({
      ...r,
      days: Number(days),
      createdBy: actorFirst
        ? fullName(actorFirst, actorLast)
        : r.createdByUserId === 'system'
          ? 'System'
          : null,
    }));
  }

  /**
   * Manual credit/debit of a cycle balance: an `adjustment` ledger entry plus the materialised
   * total, under a row lock. Debits may not take the available balance below zero.
   */
  async adjustBalance(input: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    cycle: { start: string; end: string; startYear: number };
    days: number;
    reason: string;
    actorUserId: string;
    notification: { title: string; message: string };
  }): Promise<string> {
    let balanceId = '';
    await getDb().transaction(async (tx) => {
      const where = and(
        eq(employeeLeaveBalances.companyId, input.companyId),
        eq(employeeLeaveBalances.employeeId, input.employeeId),
        eq(employeeLeaveBalances.leaveTypeId, input.leaveTypeId),
        eq(employeeLeaveBalances.cycleStartDate, input.cycle.start),
      );
      let [balance] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
      if (!balance) {
        await tx.insert(employeeLeaveBalances).values({
          id: generateSurrogateId('lvb'),
          tenantId: input.tenantId,
          companyId: input.companyId,
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          year: input.cycle.startYear,
          cycleStartDate: input.cycle.start,
          cycleEndDate: input.cycle.end,
        });
        [balance] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
      }
      const available =
        Number(balance!.totalDays) - Number(balance!.usedDays) - Number(balance!.pendingDays);
      if (input.days < 0 && available + input.days < 0) {
        throw new BadRequestError(
          `Cannot debit ${Math.abs(input.days)} day(s): only ${available} available.`,
          'LEAVE_ADJUST_INSUFFICIENT',
        );
      }
      await insertLedgerEntry(
        tx,
        balance!,
        'adjustment',
        input.days,
        'manual_adjustment',
        null,
        input.actorUserId,
        input.reason,
      );
      await tx
        .update(employeeLeaveBalances)
        .set({ totalDays: sql`${employeeLeaveBalances.totalDays} + ${input.days.toFixed(2)}` })
        .where(eq(employeeLeaveBalances.id, balance!.id));
      await insertNotifications(tx, input.tenantId, input.companyId, [
        { employeeId: input.employeeId, ...input.notification, type: 'info' },
      ]);
      balanceId = balance!.id;
    });
    return balanceId;
  }
}

export const leaveOperationsRepository = new LeaveOperationsRepository();
