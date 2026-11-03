import { getDb } from '../../../../db/connection.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../app/errors/AppError.js';
import {
  LeaveOperationsRepository,
  leaveOperationsRepository,
} from '../repository/leaveOperations.repository.js';
import {
  LeaveRepository,
  leaveRepository,
  insertNotifications,
  type Tx,
} from '../repository/leave.repository.js';
import { leaveGeneralSettingsRepository } from '../repository/leaveGeneralSettings.repository.js';
import { LeaveService, leaveService, type ApplyLeaveOptions } from './leave.service.js';
import { LeaveApprovalsService, leaveApprovalsService } from './leaveApprovals.service.js';
import { LeaveHolidaysService, leaveHolidaysService } from './leaveHolidays.service.js';
import { LeavePoliciesService, leavePoliciesService } from './leavePolicies.service.js';
import { isValidIsoDate, localDateInTimezone } from '../rules/leaveValidation.js';
import {
  addDays,
  cycleForStartYear,
  daysBetweenInclusive,
  eachDate,
  leaveCycleFor,
  weekdayName,
  type LeaveCycle,
} from '../rules/leaveCalendar.js';
import type { TeamConcurrencyConfig } from '../rules/leaveRestrictions.js';
import {
  LeaveGeneralSettingsService,
  leaveGeneralSettingsService,
} from './leaveGeneralSettings.service.js';
import { LeaveRestrictionsService, leaveRestrictionsService } from './leaveRestrictions.service.js';
import type { EmployeeLeaveBalance } from '../../../../db/schema.js';
import { LeaveAccrualService, leaveAccrualService } from './leaveAccrual.service.js';
import {
  LeaveHolidaysRepository,
  leaveHolidaysRepository,
} from '../repository/leaveHolidays.repository.js';
import type {
  ApplyOnBehalfInput,
  BalanceAdjustmentInput,
  BalanceCell,
  BalanceRegister,
  CalendarDay,
  CalendarEntry,
  HolidayCalendarView,
  YearEndView,
  EmployeeLedger,
  LedgerEntry,
  TeamCalendar,
  ApprovalStats,
  LeaveDataScope,
  LeaveOverview,
  LeaveOverviewAttention,
  LeaveOverviewPerson,
  LeaveRequestDetail,
  LeaveRequestFilters,
  LeaveRequestList,
  LeaveRequestStatus,
  OperationsLeaveRow,
} from '../types/leaveOperations.types.js';

const STATUSES = new Set<LeaveRequestStatus>([
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'cancellation_pending',
]);
const MAX_PAGE_SIZE = 100;
const MAX_BULK_APPROVALS = 50;
const MAX_CALENDAR_DAYS = 62;
const MAX_ADJUST_DAYS = 365;

/** Effect of each ledger transaction type on the available balance (days are stored unsigned
 *  except accrual/opening/adjustment, which carry their own sign). */
const LEDGER_SIGN: Record<string, number> = {
  usage_reserve: -1,
  usage_confirm: 0,
  usage_release: 1,
  usage_reversal: 1,
  lapse: -1,
  encashment: -1,
};

function toCell(b: EmployeeLeaveBalance): BalanceCell {
  const entitled = Number(b.totalDays);
  const used = Number(b.usedDays);
  const pending = Number(b.pendingDays);
  return {
    balanceId: b.id,
    entitled,
    used,
    pending,
    available: Math.round((entitled - used - pending) * 100) / 100,
    carriedForward: Number(b.carriedForwardDays),
    carryForwardExpiresOn: b.carryForwardExpiresOn,
  };
}

/** The viewer of an Operations page, as resolved by the controller from req.access. */
export interface OperationsViewer {
  userId: string;
  scope: LeaveDataScope;
  isHrOverride: boolean;
  canBackdateOverride: boolean;
  canPayrollOverride: boolean;
}

const optionalString = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function toPerson(row: OperationsLeaveRow): LeaveOverviewPerson {
  return {
    requestId: row.requestId,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeeNumber: row.employeeNumber,
    departmentName: row.departmentName,
    leaveTypeName: row.leaveTypeName,
    leaveTypeCode: row.leaveTypeCode,
    colorToken: row.colorToken,
    startDate: row.startDate,
    endDate: row.endDate,
    session: row.session,
    returnsOn: addDays(row.endDate, 1),
  };
}

/** Days a request charges inside [from, to], from its sealed per-day breakdown. */
function chargedDaysWithin(row: OperationsLeaveRow, from: string, to: string): number {
  if (row.breakdown.length === 0) {
    return row.startDate >= from && row.endDate <= to ? row.totalDays : 0;
  }
  return row.breakdown
    .filter((d) => d.date >= from && d.date <= to)
    .reduce((sum, d) => sum + d.chargedDays, 0);
}

/** HR Leave Operations: overview, request register, apply on behalf, HR cancel, bulk approvals. */
export class LeaveOperationsService {
  constructor(
    private readonly repo: LeaveOperationsRepository = leaveOperationsRepository,
    private readonly leaveRepo: Pick<
      LeaveRepository,
      | 'findRequest'
      | 'cancelPendingRequest'
      | 'cancelApprovedRequest'
      | 'findLockedPeriodOverlapping'
    > = leaveRepository,
    private readonly leave: Pick<
      LeaveService,
      'applyLeave' | 'getWorkspace' | 'getApprovalQueue' | 'decideApproval'
    > = leaveService,
    private readonly approvals: Pick<LeaveApprovalsService, 'resolveActor'> = leaveApprovalsService,
    private readonly holidays: Pick<
      LeaveHolidaysService,
      'resolveForEmployee'
    > = leaveHolidaysService,
    private readonly policies: Pick<
      LeavePoliciesService,
      'countEmployeesWithoutPolicy'
    > = leavePoliciesService,
    private readonly settings: Pick<
      LeaveGeneralSettingsService,
      'getSettings'
    > = leaveGeneralSettingsService,
    private readonly restrictions: Pick<
      LeaveRestrictionsService,
      'listActive'
    > = leaveRestrictionsService,
    private readonly accrual: Pick<
      LeaveAccrualService,
      'previewCycleClose' | 'commitCycleClose' | 'listCloseRuns' | 'listEncashments'
    > = leaveAccrualService,
    private readonly holidayRepo: Pick<
      LeaveHolidaysRepository,
      'findPublishedCalendarFor' | 'getHolidays'
    > = leaveHolidaysRepository,
  ) {}

  // ── Overview ───────────────────────────────────────────────────────────────

  async getOverview(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    query: Record<string, unknown>,
  ): Promise<LeaveOverview> {
    const today = await this.today(tenantId, companyId);
    const rawDate = optionalString(query.date);
    if (rawDate && !isValidIsoDate(rawDate)) throw new BadRequestError('Invalid date.');
    const date = rawDate ?? today;
    const filters = {
      departmentId: optionalString(query.departmentId),
      locationId: optionalString(query.locationId),
    };
    const employeeIds = await this.employeeIdsFor(tenantId, companyId, viewer.scope);
    const monthStart = `${date.slice(0, 7)}-01`;
    const monthEnd = lastDayOfMonth(date.slice(0, 7));
    const isCompany = viewer.scope.kind === 'company';

    const [
      workforce,
      outTodayRows,
      upcomingRows,
      monthRows,
      approvalCounts,
      negativeBalances,
      withoutPolicy,
      calendar,
    ] = await Promise.all([
      this.repo.countWorkforce(tenantId, companyId, employeeIds, filters),
      this.repo.listLeaveInRange(
        tenantId,
        companyId,
        employeeIds,
        { from: date, to: date },
        ['approved', 'cancellation_pending'],
        filters,
      ),
      this.repo.listLeaveInRange(
        tenantId,
        companyId,
        employeeIds,
        { from: addDays(date, 1), to: addDays(date, 14) },
        ['approved', 'cancellation_pending'],
        filters,
      ),
      this.repo.listLeaveInRange(
        tenantId,
        companyId,
        employeeIds,
        { from: monthStart, to: monthEnd },
        ['approved', 'cancellation_pending'],
        filters,
      ),
      this.repo.approvalCounts(tenantId, companyId, employeeIds, new Date()),
      this.repo.countNegativeBalances(tenantId, companyId, employeeIds, date),
      isCompany ? this.policies.countEmployeesWithoutPolicy(tenantId, companyId) : 0,
      this.holidays.resolveForEmployee(tenantId, companyId, filters.locationId ?? null, date),
    ]);

    // Half-day sessions still count as out; the session is shown alongside.
    const outToday = outTodayRows
      .filter((r) => {
        const day = r.breakdown.find((d) => d.date === date);
        return day ? day.chargedDays > 0 : true;
      })
      .map(toPerson);
    const upcoming = upcomingRows.filter((r) => r.startDate > date).map(toPerson);
    const weekEnd = addDays(date, 7);
    const upcomingWeek = new Set(
      upcoming.filter((p) => p.startDate <= weekEnd).map((p) => p.employeeId),
    ).size;

    const mix = new Map<string, LeaveOverview['leaveMix'][number]>();
    let lopDaysThisMonth = 0;
    for (const row of monthRows) {
      const days = chargedDaysWithin(row, monthStart, monthEnd);
      if (days <= 0) continue;
      if (row.payrollImpact === 'unpaid') lopDaysThisMonth += days;
      const entry = mix.get(row.leaveTypeId) ?? {
        leaveTypeId: row.leaveTypeId,
        name: row.leaveTypeName,
        code: row.leaveTypeCode,
        colorToken: row.colorToken,
        days: 0,
      };
      entry.days += days;
      mix.set(row.leaveTypeId, entry);
    }

    const attention: LeaveOverviewAttention[] = [];
    if (approvalCounts.overdue > 0) {
      attention.push({
        id: 'overdue',
        severity: 'warning',
        title: `${approvalCounts.overdue} approval(s) past SLA`,
        detail: 'Overdue requests are escalated or auto-actioned per the workflow.',
        target: { page: 'approvals' },
      });
    }
    if (approvalCounts.cancellations > 0) {
      attention.push({
        id: 'cancellations',
        severity: 'info',
        title: `${approvalCounts.cancellations} cancellation request(s) pending`,
        detail: 'Employees asked to cancel approved leave.',
        target: { page: 'approvals' },
      });
    }
    if (negativeBalances > 0) {
      attention.push({
        id: 'negative',
        severity: 'warning',
        title: `${negativeBalances} negative balance(s)`,
        detail: 'Leave was taken beyond the available balance this cycle.',
        target: { page: 'requests' },
      });
    }
    if (withoutPolicy > 0) {
      attention.push({
        id: 'policy',
        severity: 'warning',
        title: `${withoutPolicy} employee(s) without a leave policy`,
        detail: 'They cannot apply for leave until a policy covers them.',
        target: { page: 'settings', tab: 'leave_policies' },
      });
    }
    if (isCompany && !calendar) {
      attention.push({
        id: 'calendar',
        severity: 'warning',
        title: 'No published holiday calendar',
        detail: 'Working-day leave that touches a holiday is blocked until one is published.',
        target: { page: 'settings', tab: 'holidays' },
      });
    }

    return {
      date,
      scope: viewer.scope.kind,
      metrics: {
        onLeaveToday: new Set(outToday.map((p) => p.employeeId)).size,
        workforce,
        pendingApprovals: approvalCounts.pending,
        overdueApprovals: approvalCounts.overdue,
        upcomingWeek,
        lopDaysThisMonth,
      },
      outToday,
      upcoming,
      attention,
      leaveMix: [...mix.values()].sort((a, b) => b.days - a.days),
      upcomingHolidays: (calendar?.holidays ?? [])
        .filter((h) => h.date >= date)
        .slice(0, 3)
        .map((h) => ({ date: h.date, name: h.name, type: h.type })),
    };
  }

  // ── Request register ───────────────────────────────────────────────────────

  async listRequests(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    query: Record<string, unknown>,
  ): Promise<LeaveRequestList> {
    const filters = this.parseFilters(query);
    const employeeIds = await this.employeeIdsFor(tenantId, companyId, viewer.scope);
    const { items, total, counts } = await this.repo.listRequests(
      tenantId,
      companyId,
      employeeIds,
      filters,
    );
    return { items, total, page: filters.page, pageSize: filters.pageSize, counts };
  }

  async getRequest(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    requestId: string,
  ): Promise<LeaveRequestDetail> {
    const detail = await this.repo.getRequestDetail(tenantId, companyId, requestId);
    if (!detail) throw new NotFoundError('Leave request not found');
    await this.assertInScope(tenantId, companyId, viewer.scope, detail.employee.id);

    const actor = await this.approvals.resolveActor(
      tenantId,
      companyId,
      viewer.userId,
      viewer.isHrOverride,
    );
    const open = detail.approvals.find((s) => s.action === 'pending');
    const canAct =
      !!open &&
      (viewer.isHrOverride ||
        (open.approverEmployeeId !== null && open.approverEmployeeId === actor.employeeId));
    return { ...detail, myPendingApprovalId: canAct ? open!.id : null };
  }

  // ── Apply on behalf ────────────────────────────────────────────────────────

  /** Employee's applicable types and balances, for the apply-on-behalf form. */
  async getEmployeeWorkspace(tenantId: string, companyId: string, employeeId: string) {
    return this.leave.getWorkspace(tenantId, companyId, employeeId);
  }

  async applyOnBehalf(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    raw: Partial<ApplyOnBehalfInput> & {
      backdatedOverride?: unknown;
      payrollLockOverride?: unknown;
    },
  ) {
    const employeeId = optionalString(raw?.employeeId);
    if (!employeeId) throw new BadRequestError('employeeId is required.');
    const options: ApplyLeaveOptions = {
      backdatedOverride: raw.backdatedOverride === true,
      payrollLockOverride: raw.payrollLockOverride === true,
    };
    if (options.backdatedOverride && !viewer.canBackdateOverride) {
      throw new ForbiddenError('You do not have permission to override the backdated limit.');
    }
    if (options.payrollLockOverride && !viewer.canPayrollOverride) {
      throw new ForbiddenError('You do not have permission to apply leave in a locked period.');
    }
    const created = await this.leave.applyLeave(
      tenantId,
      companyId,
      employeeId,
      viewer.userId,
      {
        leaveTypeId: raw.leaveTypeId as string,
        startDate: raw.startDate as string,
        endDate: raw.endDate as string,
        reason: raw.reason as string,
        session: raw.session ?? null,
      },
      options,
    );
    await insertNotifications(getDb() as unknown as Tx, tenantId, companyId, [
      {
        employeeId,
        title: 'Leave applied on your behalf',
        message: `HR applied ${created.totalDays} day(s) of leave for you (${created.startDate} to ${created.endDate}).`,
        type: 'info',
      },
    ]);
    return created;
  }

  // ── HR cancel ──────────────────────────────────────────────────────────────

  /** HR cancels a pending or approved request directly, with a mandatory reason. */
  async cancelRequest(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    requestId: string,
    rawReason: unknown,
  ) {
    const reason = typeof rawReason === 'string' ? rawReason.trim().slice(0, 500) : '';
    if (reason.length < 3) throw new BadRequestError('A cancellation reason is required.');
    const request = await this.leaveRepo.findRequest(tenantId, companyId, requestId);
    if (!request) throw new NotFoundError('Leave request not found');
    await this.assertInScope(tenantId, companyId, viewer.scope, request.employeeId);

    const notify = [
      {
        employeeId: request.employeeId,
        title: 'Leave cancelled by HR',
        message: `Your leave from ${request.startDate} to ${request.endDate} was cancelled. Reason: ${reason}`,
        type: 'warning' as const,
      },
    ];
    if (request.status === 'pending') {
      const cancelled = await this.leaveRepo.cancelPendingRequest(
        tenantId,
        companyId,
        request.employeeId,
        requestId,
        viewer.userId,
        reason,
      );
      await insertNotifications(getDb() as unknown as Tx, tenantId, companyId, notify);
      return cancelled;
    }
    if (request.status !== 'approved') {
      throw new ConflictError(`Cannot cancel leave request with status '${request.status}'`);
    }
    if (!viewer.canPayrollOverride) {
      const locked = await this.leaveRepo.findLockedPeriodOverlapping(
        tenantId,
        companyId,
        request.startDate,
        request.endDate,
      );
      if (locked) {
        throw new BadRequestError(
          `The attendance period ${locked.periodCode} is locked for payroll. Cancelling needs the payroll override permission.`,
          'LEAVE_PAYROLL_LOCKED',
        );
      }
    }
    return this.leaveRepo.cancelApprovedRequest(
      tenantId,
      companyId,
      request.employeeId,
      requestId,
      viewer.userId,
      null,
      notify,
      reason,
    );
  }

  // ── Approvals ──────────────────────────────────────────────────────────────

  async approvalStats(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
  ): Promise<ApprovalStats> {
    const now = new Date();
    const [mine, employeeIds] = await Promise.all([
      this.leave.getApprovalQueue(tenantId, companyId, viewer.userId, viewer.isHrOverride, 'mine'),
      this.employeeIdsFor(tenantId, companyId, viewer.scope),
    ]);
    const approvedToday = await this.repo.countApprovedSince(
      tenantId,
      companyId,
      employeeIds,
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
    );
    return {
      awaitingMe: mine.length,
      overdue: mine.filter((q) => q.slaBreachedAt || (q.slaDueAt && q.slaDueAt < now)).length,
      cancellations: mine.filter((q) => q.purpose === 'cancellation').length,
      approvedToday,
    };
  }

  /** Approves several steps; each is decided independently and reported back. */
  async bulkApprove(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    rawIds: unknown,
    comment: unknown,
  ) {
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      throw new BadRequestError('approvalIds must be a non-empty array.');
    }
    const ids = [...new Set(rawIds.filter((id): id is string => typeof id === 'string'))];
    if (ids.length > MAX_BULK_APPROVALS) {
      throw new BadRequestError(
        `At most ${MAX_BULK_APPROVALS} approvals can be processed at once.`,
      );
    }
    const results: Array<{ approvalId: string; ok: boolean; status?: string; error?: string }> = [];
    for (const approvalId of ids) {
      try {
        const outcome = await this.leave.decideApproval(
          tenantId,
          companyId,
          viewer.userId,
          viewer.isHrOverride,
          approvalId,
          'approved',
          comment,
        );
        results.push({ approvalId, ok: true, status: outcome.status });
      } catch (err) {
        results.push({
          approvalId,
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to approve',
        });
      }
    }
    return { approved: results.filter((r) => r.ok).length, results };
  }

  // ── P2: Team calendar ──────────────────────────────────────────────────────

  async getCalendar(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    query: Record<string, unknown>,
  ): Promise<TeamCalendar> {
    const today = await this.today(tenantId, companyId);
    const from = optionalString(query.from) ?? `${today.slice(0, 7)}-01`;
    const to = optionalString(query.to) ?? lastDayOfMonth(from.slice(0, 7));
    if (!isValidIsoDate(from) || !isValidIsoDate(to) || to < from) {
      throw new BadRequestError('Invalid calendar range.');
    }
    if (daysBetweenInclusive(from, to) > MAX_CALENDAR_DAYS) {
      throw new BadRequestError(`The calendar range cannot exceed ${MAX_CALENDAR_DAYS} days.`);
    }
    const filters = {
      departmentId: optionalString(query.departmentId),
      locationId: optionalString(query.locationId),
    };
    const leaveTypeId = optionalString(query.leaveTypeId);
    const employeeIds = await this.employeeIdsFor(tenantId, companyId, viewer.scope);

    const [people, rows, startCalendar, endCalendar, rules] = await Promise.all([
      this.repo.listEmployees(tenantId, companyId, employeeIds, filters),
      this.repo.listLeaveInRange(
        tenantId,
        companyId,
        employeeIds,
        { from, to },
        ['approved', 'cancellation_pending', 'pending'],
        filters,
      ),
      this.holidays.resolveForEmployee(tenantId, companyId, filters.locationId ?? null, from),
      this.holidays.resolveForEmployee(tenantId, companyId, filters.locationId ?? null, to),
      this.restrictions.listActive(tenantId, companyId),
    ]);

    const holidayByDate = new Map<string, { name: string; type: string }>();
    for (const h of [...(startCalendar?.holidays ?? []), ...(endCalendar?.holidays ?? [])]) {
      holidayByDate.set(h.date, { name: h.name, type: h.type });
    }

    const entries: CalendarEntry[] = rows
      .filter((r) => !leaveTypeId || r.leaveTypeId === leaveTypeId)
      .map((r) => ({
        requestId: r.requestId,
        employeeId: r.employeeId,
        leaveTypeName: r.leaveTypeName,
        leaveTypeCode: r.leaveTypeCode,
        colorToken: r.colorToken,
        status: r.status as CalendarEntry['status'],
        session: r.session,
        days: eachDate(
          r.startDate < from ? from : r.startDate,
          r.endDate > to ? to : r.endDate,
        ).map((date) => {
          const day = r.breakdown.find((d) => d.date === date);
          return { date, charged: day ? day.chargedDays : r.session ? 0.5 : 1 };
        }),
      }));

    // Company-level team-concurrency limits (department-scoped rules apply when filtered to it).
    const limits = rules
      .filter((rule) => rule.ruleType === 'team_concurrency')
      .map((rule) => rule.config as unknown as TeamConcurrencyConfig)
      .filter((c) => c.departmentId === null || c.departmentId === filters.departmentId);
    const workforce = people.total;

    const days: CalendarDay[] = eachDate(from, to).map((date) => {
      const outIds = new Set<string>();
      const pendingIds = new Set<string>();
      for (const e of entries) {
        const day = e.days.find((d) => d.date === date);
        if (!day || day.charged <= 0) continue;
        (e.status === 'pending' ? pendingIds : outIds).add(e.employeeId);
      }
      const out = outIds.size;
      const weekday = weekdayName(date);
      return {
        date,
        isWeekend: weekday === 'saturday' || weekday === 'sunday',
        holiday: holidayByDate.get(date) ?? null,
        out,
        pending: pendingIds.size,
        overLimit: limits.some(
          (l) =>
            (l.maxCount !== null && out > l.maxCount) ||
            (l.maxPercent !== null && workforce > 0 && (out / workforce) * 100 > l.maxPercent),
        ),
      };
    });

    return {
      from,
      to,
      scope: viewer.scope.kind,
      workforce,
      employees: people.items,
      entries,
      days,
    };
  }

  // ── P2: Balances ───────────────────────────────────────────────────────────

  async getBalances(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    query: Record<string, unknown>,
  ): Promise<BalanceRegister> {
    const today = await this.today(tenantId, companyId);
    const cycle = await this.cycleFor(
      tenantId,
      companyId,
      optionalString(query.cycleStart) ?? today,
    );
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || 25));
    const scopeIds = await this.employeeIdsFor(tenantId, companyId, viewer.scope);
    const onlyIds =
      query.negativeOnly === 'true'
        ? await this.repo.listNegativeBalanceEmployeeIds(tenantId, companyId, scopeIds, cycle.start)
        : undefined;

    const [types, people, metrics, workforce] = await Promise.all([
      this.repo.listTrackedTypes(tenantId, companyId),
      this.repo.listEmployees(
        tenantId,
        companyId,
        scopeIds,
        {
          departmentId: optionalString(query.departmentId),
          locationId: optionalString(query.locationId),
          search: optionalString(query.search)?.slice(0, 100),
          onlyIds,
        },
        { page, pageSize },
      ),
      this.repo.balanceMetrics(tenantId, companyId, scopeIds, cycle.start, {
        from: today,
        to: addDays(today, 30),
      }),
      this.repo.countWorkforce(tenantId, companyId, scopeIds, {}),
    ]);
    const balances = await this.repo.listBalances(
      tenantId,
      companyId,
      people.items.map((p) => p.id),
      cycle.start,
    );
    const trackedIds = new Set(types.map((t) => t.id));

    return {
      cycle: { start: cycle.start, end: cycle.end, label: cycle.label },
      leaveTypes: types,
      rows: people.items.map((employee) => ({
        employee,
        balances: Object.fromEntries(
          balances
            .filter((b) => b.employeeId === employee.id && trackedIds.has(b.leaveTypeId))
            .map((b) => [b.leaveTypeId, toCell(b)]),
        ),
      })),
      total: people.total,
      page,
      pageSize,
      metrics: {
        employees: workforce,
        totalAvailable: metrics.totalAvailable,
        negativeBalances: metrics.negative,
        expiringCarryForward: metrics.expiring,
      },
    };
  }

  async getLedger(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    employeeId: string,
    query: Record<string, unknown>,
  ): Promise<EmployeeLedger> {
    await this.assertInScope(tenantId, companyId, viewer.scope, employeeId);
    const today = await this.today(tenantId, companyId);
    const cycle = await this.cycleFor(
      tenantId,
      companyId,
      optionalString(query.cycleStart) ?? today,
    );
    const [people, types, balances, rows] = await Promise.all([
      this.repo.listEmployees(tenantId, companyId, null, { onlyIds: [employeeId] }),
      this.repo.listTrackedTypes(tenantId, companyId),
      this.repo.listBalances(tenantId, companyId, [employeeId], cycle.start),
      this.repo.listLedger(
        tenantId,
        companyId,
        employeeId,
        cycle.start,
        optionalString(query.leaveTypeId),
      ),
    ]);
    const employee = people.items[0];
    if (!employee) throw new NotFoundError('Employee not found');

    // Balances imported or seeded before the ledger existed carry movements with no ledger row;
    // start each running total at that offset so it always ends on the real available balance.
    const effectOf = (r: (typeof rows)[number]) =>
      Math.round(r.days * (LEDGER_SIGN[r.txnType] ?? 1) * 100) / 100;
    const running = new Map<string, number>();
    for (const b of balances) {
      const ledgerTotal = rows
        .filter((r) => r.balanceId === b.id)
        .reduce((sum, r) => sum + effectOf(r), 0);
      running.set(b.id, Math.round((toCell(b).available - ledgerTotal) * 100) / 100);
    }
    const entries: LedgerEntry[] = rows.map((r) => {
      const effect = effectOf(r);
      const next = Math.round(((running.get(r.balanceId) ?? 0) + effect) * 100) / 100;
      running.set(r.balanceId, next);
      return {
        id: r.id,
        leaveTypeId: r.leaveTypeId,
        leaveTypeName: r.leaveTypeName,
        txnType: r.txnType,
        effect,
        days: r.days,
        runningAvailable: next,
        referenceType: r.referenceType,
        referenceId: r.referenceId,
        reason: r.reason,
        createdBy: r.createdBy,
        createdAt: r.createdAt,
      };
    });

    return {
      employee,
      cycle: { start: cycle.start, end: cycle.end, label: cycle.label },
      balances: types.flatMap((t) => {
        const b = balances.find((x) => x.leaveTypeId === t.id);
        return b
          ? [{ leaveTypeId: t.id, leaveTypeName: t.name, leaveTypeCode: t.code, ...toCell(b) }]
          : [];
      }),
      entries,
    };
  }

  /** HR credit/debit with a mandatory reason, written to the ledger as an adjustment. */
  async adjustBalance(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    raw: Partial<BalanceAdjustmentInput>,
  ) {
    const employeeId = optionalString(raw?.employeeId);
    const leaveTypeId = optionalString(raw?.leaveTypeId);
    if (!employeeId || !leaveTypeId) {
      throw new BadRequestError('employeeId and leaveTypeId are required.');
    }
    if (raw.direction !== 'credit' && raw.direction !== 'debit') {
      throw new BadRequestError('direction must be credit or debit.');
    }
    const days = Number(raw.days);
    if (!Number.isFinite(days) || days <= 0 || days > MAX_ADJUST_DAYS) {
      throw new BadRequestError(`days must be between 0 and ${MAX_ADJUST_DAYS}.`);
    }
    if (Math.round(days * 2) !== days * 2) {
      throw new BadRequestError('days must be in steps of 0.5.');
    }
    const reason = typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 500) : '';
    if (reason.length < 3) throw new BadRequestError('A reason is required for adjustments.');
    const effectiveDate = optionalString(raw.effectiveDate);
    if (effectiveDate && !isValidIsoDate(effectiveDate)) {
      throw new BadRequestError('Invalid effective date.');
    }
    await this.assertInScope(tenantId, companyId, viewer.scope, employeeId);

    const types = await this.repo.listTrackedTypes(tenantId, companyId);
    const type = types.find((t) => t.id === leaveTypeId);
    if (!type) throw new BadRequestError('Balances can only be adjusted for active tracked types.');
    const [person] = (
      await this.repo.listEmployees(tenantId, companyId, null, { onlyIds: [employeeId] })
    ).items;
    if (!person) throw new NotFoundError('Employee not found');

    const today = await this.today(tenantId, companyId);
    const cycle = await this.cycleFor(tenantId, companyId, effectiveDate ?? today);
    const signed = raw.direction === 'credit' ? days : -days;
    const balanceId = await this.repo.adjustBalance({
      tenantId,
      companyId,
      employeeId,
      leaveTypeId,
      cycle,
      days: signed,
      reason,
      actorUserId: viewer.userId,
      notification: {
        title: `${type.name} balance ${raw.direction === 'credit' ? 'credited' : 'debited'}`,
        message: `HR ${raw.direction === 'credit' ? 'added' : 'deducted'} ${days} day(s) ${raw.direction === 'credit' ? 'to' : 'from'} your ${type.name} balance (${cycle.label}). Reason: ${reason}`,
      },
    });
    return { balanceId, employeeId, leaveTypeId, cycleStart: cycle.start, days: signed };
  }

  private async cycleFor(tenantId: string, companyId: string, date: string): Promise<LeaveCycle> {
    if (!isValidIsoDate(date)) throw new BadRequestError('Invalid cycle date.');
    const { settings } = await this.settings.getSettings(tenantId, companyId);
    return leaveCycleFor(date, settings.leaveYearCycle, settings.customYearStartDate);
  }

  // ── P3: Holiday calendar (read view) ───────────────────────────────────────

  async getHolidayCalendar(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    query: Record<string, unknown>,
  ): Promise<HolidayCalendarView> {
    const today = await this.today(tenantId, companyId);
    const { settings } = await this.settings.getSettings(tenantId, companyId);
    const current = leaveCycleFor(today, settings.leaveYearCycle, settings.customYearStartDate);
    const year = query.year === undefined ? current.startYear : Number(query.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestError('Invalid year.');
    }
    const cycle = cycleForStartYear(year, settings.leaveYearCycle, settings.customYearStartDate);
    const locationId = optionalString(query.locationId) ?? null;

    const calendar = await this.holidayRepo.findPublishedCalendarFor(
      tenantId,
      companyId,
      cycle.startYear,
      locationId,
    );
    const employeeIds = await this.employeeIdsFor(tenantId, companyId, viewer.scope);
    const [list, uptake] = calendar
      ? await Promise.all([
          this.holidayRepo.getHolidays(calendar.id, cycle.start, cycle.end),
          this.repo.optionalHolidayUptake(tenantId, companyId, employeeIds, {
            from: cycle.start,
            to: cycle.end,
          }),
        ])
      : [[], new Map<string, number>()];

    const holidays = list.map((h) => ({
      date: h.date,
      name: h.name,
      type: h.type,
      weekday: weekdayName(h.date),
      optedCount: h.type === 'optional' ? (uptake.get(h.date) ?? 0) : 0,
      isPast: h.date < today,
    }));
    const next = holidays.find((h) => !h.isPast) ?? null;
    return {
      year,
      cycle: { start: cycle.start, end: cycle.end, label: cycle.label },
      calendar: calendar
        ? {
            id: calendar.id,
            name: calendar.name,
            revision: calendar.revision,
            isDefault: calendar.isDefault,
            optionalHolidayQuota: calendar.optionalHolidayQuota,
          }
        : null,
      holidays,
      metrics: {
        total: holidays.length,
        mandatory: holidays.filter((h) => h.type === 'mandatory').length,
        optional: holidays.filter((h) => h.type === 'optional').length,
        optionalQuota: calendar?.optionalHolidayQuota ?? 0,
        next: next ? { date: next.date, name: next.name } : null,
      },
    };
  }

  // ── P3: Year-end & encashment ──────────────────────────────────────────────

  async getYearEnd(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    query: Record<string, unknown>,
  ): Promise<YearEndView> {
    const today = await this.today(tenantId, companyId);
    const cycle = await this.cycleFor(
      tenantId,
      companyId,
      optionalString(query.cycleStart) ?? today,
    );
    const employeeIds = await this.employeeIdsFor(tenantId, companyId, viewer.scope);
    const [preview, runs, encashments, typeNames] = await Promise.all([
      this.accrual.previewCycleClose(tenantId, companyId, cycle.start),
      this.accrual.listCloseRuns(tenantId, companyId),
      this.accrual.listEncashments(tenantId, companyId, cycle.start),
      this.repo.leaveTypeNames(tenantId, companyId),
    ]);
    const inScope = (id: string) => !employeeIds || employeeIds.includes(id);
    const rows = preview.rows.filter((r) => inScope(r.employeeId));
    const scopedEncashments = encashments.filter((e) => inScope(e.employeeId));

    const ids = [...new Set([...rows, ...scopedEncashments].map((r) => r.employeeId))];
    const people = await this.repo.listEmployees(tenantId, companyId, null, {
      onlyIds: ids,
      anyStatus: true,
    });
    const person = new Map(people.items.map((p) => [p.id, p]));
    const userIds = [...new Set(runs.map((r) => r.createdByUserId))];
    const userNames = await this.repo.userNames(userIds);
    const sum = (key: 'encash' | 'carryForward' | 'lapse') =>
      Math.round(rows.reduce((s, r) => s + r[key], 0) * 100) / 100;

    return {
      cycle: { start: preview.cycle.start, end: preview.cycle.end, label: preview.cycle.label },
      nextCycle: {
        start: preview.nextCycle.start,
        end: preview.nextCycle.end,
        label: preview.nextCycle.label,
      },
      alreadyClosed: preview.alreadyClosed,
      canClose: !preview.alreadyClosed && preview.cycle.end < today,
      autoCloseOn: addDays(preview.cycle.end, 1),
      totals: {
        employees: new Set(rows.map((r) => r.employeeId)).size,
        encash: sum('encash'),
        carryForward: sum('carryForward'),
        lapse: sum('lapse'),
      },
      rows: rows
        .map((r) => ({
          ...r,
          employeeName: person.get(r.employeeId)?.name ?? r.employeeId,
          employeeNumber: person.get(r.employeeId)?.employeeNumber ?? '',
        }))
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
      runs: runs.map((r) => ({
        id: r.id,
        cycleStartDate: r.cycleStartDate,
        cycleEndDate: r.cycleEndDate,
        summary: r.summary,
        closedBy:
          r.createdByUserId === 'system'
            ? 'Automatic'
            : (userNames.get(r.createdByUserId) ?? r.createdByUserId),
        createdAt: r.createdAt,
      })),
      encashments: scopedEncashments.map((e) => ({
        id: e.id,
        employeeId: e.employeeId,
        employeeName: person.get(e.employeeId)?.name ?? e.employeeId,
        leaveTypeName: typeNames.get(e.leaveTypeId) ?? e.leaveTypeId,
        days: Number(e.days),
        basis: e.basis,
        trigger: e.trigger,
        status: e.status,
        createdAt: e.createdAt,
      })),
    };
  }

  /** Closes a finished leave year; company-wide only (needs hrms.leave.year_end_process). */
  async closeYear(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    rawCycleStart: unknown,
  ) {
    if (viewer.scope.kind !== 'company') {
      throw new ForbiddenError('Only company-wide leave administrators can close a leave year.');
    }
    const cycleStart = optionalString(rawCycleStart);
    if (!cycleStart) throw new BadRequestError('cycleStart is required.');
    return this.accrual.commitCycleClose(
      tenantId,
      companyId,
      cycleStart,
      viewer.userId,
      await this.today(tenantId, companyId),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async today(tenantId: string, companyId: string): Promise<string> {
    return localDateInTimezone(
      await leaveGeneralSettingsRepository.getCompanyTimezone(tenantId, companyId),
    );
  }

  private async employeeIdsFor(
    tenantId: string,
    companyId: string,
    scope: LeaveDataScope,
  ): Promise<string[] | null> {
    if (scope.kind === 'company') return null;
    if (!scope.managerEmployeeId) return [];
    return this.repo.listReporteeIds(tenantId, companyId, scope.managerEmployeeId);
  }

  private async assertInScope(
    tenantId: string,
    companyId: string,
    scope: LeaveDataScope,
    employeeId: string,
  ): Promise<void> {
    const ids = await this.employeeIdsFor(tenantId, companyId, scope);
    if (ids && !ids.includes(employeeId)) throw new NotFoundError('Leave request not found');
  }

  private parseFilters(query: Record<string, unknown>): LeaveRequestFilters {
    const status = optionalString(query.status);
    if (status && !STATUSES.has(status as LeaveRequestStatus)) {
      throw new BadRequestError('Invalid status filter.');
    }
    const from = optionalString(query.from);
    const to = optionalString(query.to);
    if ((from && !isValidIsoDate(from)) || (to && !isValidIsoDate(to))) {
      throw new BadRequestError('Invalid date range.');
    }
    if (from && to && to < from) throw new BadRequestError('"to" cannot precede "from".');
    return {
      status: status as LeaveRequestStatus | undefined,
      leaveTypeId: optionalString(query.leaveTypeId),
      departmentId: optionalString(query.departmentId),
      locationId: optionalString(query.locationId),
      from,
      to,
      search: optionalString(query.search)?.slice(0, 100),
      appliedByHr: query.appliedByHr === 'true',
      page: Math.max(1, Number(query.page) || 1),
      pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || 20)),
    };
  }
}

export const leaveOperationsService = new LeaveOperationsService();
