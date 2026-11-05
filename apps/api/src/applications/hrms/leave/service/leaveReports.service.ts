import { BadRequestError, NotFoundError } from '../../../../app/errors/AppError.js';
import {
  LeaveOperationsRepository,
  leaveOperationsRepository,
} from '../repository/leaveOperations.repository.js';
import {
  LeaveReportsRepository,
  leaveReportsRepository,
} from '../repository/leaveReports.repository.js';
import { leaveGeneralSettingsRepository } from '../repository/leaveGeneralSettings.repository.js';
import {
  LeaveGeneralSettingsService,
  leaveGeneralSettingsService,
} from './leaveGeneralSettings.service.js';
import { LeaveAccrualService, leaveAccrualService } from './leaveAccrual.service.js';
import { isValidIsoDate, localDateInTimezone } from '../rules/leaveValidation.js';
import { daysBetweenInclusive, leaveCycleFor, weekdayName } from '../rules/leaveCalendar.js';
import type { OperationsViewer } from './leaveOperations.service.js';
import type { LeaveDataScope, OperationsLeaveRow } from '../types/leaveOperations.types.js';
import type {
  LeaveReport,
  LeaveReportColumn,
  LeaveReportId,
  LeaveReportRow,
} from '../types/leaveReports.types.js';

export const LEAVE_REPORT_IDS: LeaveReportId[] = [
  'utilisation',
  'lop',
  'liability',
  'absenteeism',
  'approval_sla',
  'audit',
];
const MAX_RANGE_DAYS = 366;
const MAX_AUDIT_ROWS = 1000;

interface ReportContext {
  tenantId: string;
  companyId: string;
  from: string;
  to: string;
  departmentId?: string;
  locationId?: string;
  leaveTypeId?: string;
  /** null = company-wide; otherwise employees in scope after department/location filters. */
  employeeIds: string[] | null;
  scopeIds: string[] | null;
}

const optionalString = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;
const col = (key: string, label: string, numeric = false): LeaveReportColumn => ({
  key,
  label,
  numeric,
});

/** Days a request charged inside [from, to], from its sealed per-day breakdown. */
function chargedWithin(row: OperationsLeaveRow, from: string, to: string): Map<string, number> {
  const days = new Map<string, number>();
  if (row.breakdown.length === 0) {
    if (row.startDate >= from && row.endDate <= to) days.set(row.startDate, row.totalDays);
    return days;
  }
  for (const d of row.breakdown) {
    if (d.date >= from && d.date <= to && d.chargedDays > 0) days.set(d.date, d.chargedDays);
  }
  return days;
}

function toCsvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Leave Operations → Reports: six exportable reports sharing one filter set and scope. */
export class LeaveReportsService {
  constructor(
    private readonly ops: LeaveOperationsRepository = leaveOperationsRepository,
    private readonly repo: LeaveReportsRepository = leaveReportsRepository,
    private readonly settings: Pick<
      LeaveGeneralSettingsService,
      'getSettings'
    > = leaveGeneralSettingsService,
    private readonly accrual: Pick<LeaveAccrualService, 'listRules'> = leaveAccrualService,
  ) {}

  async getReport(
    tenantId: string,
    companyId: string,
    viewer: OperationsViewer,
    reportId: string,
    query: Record<string, unknown>,
  ): Promise<LeaveReport> {
    if (!LEAVE_REPORT_IDS.includes(reportId as LeaveReportId)) {
      throw new NotFoundError('Unknown leave report');
    }
    const ctx = await this.context(tenantId, companyId, viewer.scope, query);
    switch (reportId as LeaveReportId) {
      case 'utilisation':
        return this.utilisation(ctx);
      case 'lop':
        return this.lop(ctx);
      case 'liability':
        return this.liability(ctx);
      case 'absenteeism':
        return this.absenteeism(ctx);
      case 'approval_sla':
        return this.approvalSla(ctx);
      case 'audit':
        return this.audit(ctx);
    }
  }

  toCsv(report: LeaveReport): string {
    const lines = [report.columns.map((c) => toCsvCell(c.label)).join(',')];
    for (const row of report.rows) {
      lines.push(report.columns.map((c) => toCsvCell(row[c.key] ?? null)).join(','));
    }
    return `${lines.join('\r\n')}\r\n`;
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  private async utilisation(ctx: ReportContext): Promise<LeaveReport> {
    const { tenantId, companyId } = ctx;
    const cycle = await this.cycleFor(tenantId, companyId, ctx.to);
    const [people, types, leave] = await Promise.all([
      this.ops.listEmployees(tenantId, companyId, ctx.scopeIds, {
        departmentId: ctx.departmentId,
        locationId: ctx.locationId,
      }),
      this.ops.listTrackedTypes(tenantId, companyId),
      this.leaveRows(ctx),
    ]);
    const balances = await this.ops.listBalances(
      tenantId,
      companyId,
      people.items.map((p) => p.id),
      cycle.start,
    );

    const taken = new Map<string, { name: string; days: number }>();
    for (const row of leave) {
      const days = [...chargedWithin(row, ctx.from, ctx.to).values()].reduce((s, d) => s + d, 0);
      if (days <= 0) continue;
      const key = `${row.employeeId}|${row.leaveTypeId}`;
      const prev = taken.get(key);
      taken.set(key, { name: row.leaveTypeName, days: (prev?.days ?? 0) + days });
    }

    const typeName = new Map(types.map((t) => [t.id, t.name]));
    const rows: LeaveReportRow[] = [];
    for (const p of people.items) {
      const typeIds = new Set([
        ...balances.filter((b) => b.employeeId === p.id).map((b) => b.leaveTypeId),
        ...[...taken.keys()].filter((k) => k.startsWith(`${p.id}|`)).map((k) => k.split('|')[1]!),
      ]);
      for (const typeId of typeIds) {
        if (ctx.leaveTypeId && typeId !== ctx.leaveTypeId) continue;
        const balance = balances.find((b) => b.employeeId === p.id && b.leaveTypeId === typeId);
        const used = taken.get(`${p.id}|${typeId}`);
        const entitled = balance ? Number(balance.totalDays) : null;
        const days = round(used?.days ?? 0);
        rows.push({
          employee: p.name,
          employeeNumber: p.employeeNumber,
          department: p.departmentName,
          leaveType: typeName.get(typeId) ?? used?.name ?? typeId,
          entitled,
          taken: days,
          utilisation: entitled && entitled > 0 ? round((days / entitled) * 100, 1) : null,
        });
      }
    }
    const totalTaken = round(rows.reduce((s, r) => s + Number(r.taken), 0));
    const withRatio = rows.filter((r) => r.utilisation !== null);
    return this.build(ctx, 'utilisation', {
      title: 'Leave Utilisation',
      description: `Days taken in the range against the ${cycle.label} entitlement.`,
      columns: [
        col('employee', 'Employee'),
        col('employeeNumber', 'Employee No.'),
        col('department', 'Department'),
        col('leaveType', 'Leave Type'),
        col('entitled', 'Entitled', true),
        col('taken', 'Taken', true),
        col('utilisation', 'Utilisation %', true),
      ],
      rows,
      summary: [
        { label: 'Days taken', value: totalTaken },
        {
          label: 'Employees on leave',
          value: new Set(rows.filter((r) => Number(r.taken) > 0).map((r) => r.employeeNumber)).size,
        },
        {
          label: 'Average utilisation',
          value: withRatio.length
            ? `${round(withRatio.reduce((s, r) => s + Number(r.utilisation), 0) / withRatio.length, 1)}%`
            : '—',
        },
      ],
    });
  }

  private async lop(ctx: ReportContext): Promise<LeaveReport> {
    const leave = (await this.leaveRows(ctx)).filter((r) => r.payrollImpact === 'unpaid');
    const perMonth = new Map<string, LeaveReportRow>();
    for (const row of leave) {
      for (const [date, days] of chargedWithin(row, ctx.from, ctx.to)) {
        const month = date.slice(0, 7);
        const key = `${row.employeeId}|${month}`;
        const existing = perMonth.get(key) ?? {
          employee: row.employeeName,
          employeeNumber: row.employeeNumber,
          department: row.departmentName,
          month,
          lopDays: 0,
        };
        existing.lopDays = round(Number(existing.lopDays) + days);
        perMonth.set(key, existing);
      }
    }
    const rows = [...perMonth.values()].sort(
      (a, b) =>
        String(a.month).localeCompare(String(b.month)) ||
        String(a.employee).localeCompare(String(b.employee)),
    );
    return this.build(ctx, 'lop', {
      title: 'LOP for Payroll',
      description: 'Loss-of-pay days per employee per payroll month (unpaid leave types).',
      columns: [
        col('employee', 'Employee'),
        col('employeeNumber', 'Employee No.'),
        col('department', 'Department'),
        col('month', 'Month'),
        col('lopDays', 'LOP Days', true),
      ],
      rows,
      summary: [
        { label: 'LOP days', value: round(rows.reduce((s, r) => s + Number(r.lopDays), 0)) },
        { label: 'Employees', value: new Set(rows.map((r) => r.employeeNumber)).size },
      ],
    });
  }

  private async liability(ctx: ReportContext): Promise<LeaveReport> {
    const { tenantId, companyId } = ctx;
    const cycle = await this.cycleFor(tenantId, companyId, ctx.to);
    const [people, rules] = await Promise.all([
      this.ops.listEmployees(tenantId, companyId, ctx.scopeIds, {
        departmentId: ctx.departmentId,
        locationId: ctx.locationId,
      }),
      this.accrual.listRules(tenantId, companyId, ctx.to),
    ]);
    const balances = await this.ops.listBalances(
      tenantId,
      companyId,
      people.items.map((p) => p.id),
      cycle.start,
    );
    const person = new Map(people.items.map((p) => [p.id, p]));
    const ruleFor = new Map(rules.map((r) => [r.leaveType.id, r]));

    const rows: LeaveReportRow[] = [];
    for (const b of balances) {
      if (ctx.leaveTypeId && b.leaveTypeId !== ctx.leaveTypeId) continue;
      const rule = ruleFor.get(b.leaveTypeId);
      if (!rule || !rule.leaveType.isTracked) continue;
      const available = round(Number(b.totalDays) - Number(b.usedDays) - Number(b.pendingDays));
      if (available <= 0) continue;
      const r = rule.current;
      const encashable = r.encashmentEnabled
        ? round(
            Math.min(
              Math.max(available - r.minBalanceToRetain, 0),
              r.maxEncashableDays ?? Number.POSITIVE_INFINITY,
            ),
          )
        : 0;
      const p = person.get(b.employeeId)!;
      rows.push({
        employee: p.name,
        employeeNumber: p.employeeNumber,
        department: p.departmentName,
        leaveType: rule.leaveType.name,
        available,
        encashable,
        basis: r.encashmentEnabled ? (r.encashmentBasis === 'gross' ? 'Gross' : 'Basic') : '—',
      });
    }
    rows.sort((a, b) => String(a.employee).localeCompare(String(b.employee)));
    return this.build(ctx, 'liability', {
      title: 'Balance Liability',
      description: `Unused days in leave year ${cycle.label} and how many could be encashed under current rules. Multiply by the daily rate in payroll for the cost.`,
      columns: [
        col('employee', 'Employee'),
        col('employeeNumber', 'Employee No.'),
        col('department', 'Department'),
        col('leaveType', 'Leave Type'),
        col('available', 'Available Days', true),
        col('encashable', 'Encashable Days', true),
        col('basis', 'Pay Basis'),
      ],
      rows,
      summary: [
        {
          label: 'Available days',
          value: round(rows.reduce((s, r) => s + Number(r.available), 0)),
        },
        {
          label: 'Encashable days',
          value: round(rows.reduce((s, r) => s + Number(r.encashable), 0)),
        },
        { label: 'Employees', value: new Set(rows.map((r) => r.employeeNumber)).size },
      ],
    });
  }

  private async absenteeism(ctx: ReportContext): Promise<LeaveReport> {
    const leave = await this.leaveRows(ctx);
    const months = new Map<
      string,
      { days: number; employees: Set<string>; monFri: number; unplanned: number }
    >();
    let total = 0;
    let monFriTotal = 0;
    for (const row of leave) {
      for (const [date, days] of chargedWithin(row, ctx.from, ctx.to)) {
        const m = months.get(date.slice(0, 7)) ?? {
          days: 0,
          employees: new Set<string>(),
          monFri: 0,
          unplanned: 0,
        };
        const weekday = weekdayName(date);
        m.days += days;
        m.employees.add(row.employeeId);
        if (weekday === 'monday' || weekday === 'friday') {
          m.monFri += days;
          monFriTotal += days;
        }
        if (row.payrollImpact === 'unpaid') m.unplanned += days;
        months.set(date.slice(0, 7), m);
        total += days;
      }
    }
    const rows: LeaveReportRow[] = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, m]) => ({
        month,
        leaveDays: round(m.days),
        employees: m.employees.size,
        daysPerEmployee: round(m.days / m.employees.size, 1),
        lopDays: round(m.unplanned),
        mondayFridayShare: m.days > 0 ? round((m.monFri / m.days) * 100, 1) : 0,
      }));
    const peak = rows.reduce<LeaveReportRow | null>(
      (best, r) => (!best || Number(r.leaveDays) > Number(best.leaveDays) ? r : best),
      null,
    );
    return this.build(ctx, 'absenteeism', {
      title: 'Absenteeism Trend',
      description:
        'Monthly leave days and the share falling on Mondays and Fridays (about 40% is a normal spread across a 5-day week).',
      columns: [
        col('month', 'Month'),
        col('leaveDays', 'Leave Days', true),
        col('employees', 'Employees', true),
        col('daysPerEmployee', 'Days / Employee', true),
        col('lopDays', 'LOP Days', true),
        col('mondayFridayShare', 'Mon/Fri Share %', true),
      ],
      rows,
      summary: [
        { label: 'Leave days', value: round(total) },
        { label: 'Peak month', value: peak ? String(peak.month) : '—' },
        {
          label: 'Mon/Fri share',
          value: total > 0 ? `${round((monFriTotal / total) * 100, 1)}%` : '—',
        },
      ],
    });
  }

  private async approvalSla(ctx: ReportContext): Promise<LeaveReport> {
    const decisions = await this.repo.listApprovalDecisions(
      ctx.tenantId,
      ctx.companyId,
      ctx.employeeIds,
      this.instantRange(ctx),
    );
    const byApprover = new Map<
      string,
      {
        name: string;
        decided: number;
        approved: number;
        rejected: number;
        hours: number;
        breached: number;
      }
    >();
    for (const d of decisions) {
      const a = byApprover.get(d.approverKey) ?? {
        name: d.approverName,
        decided: 0,
        approved: 0,
        rejected: 0,
        hours: 0,
        breached: 0,
      };
      a.decided += 1;
      if (d.action === 'approved') a.approved += 1;
      if (d.action === 'rejected') a.rejected += 1;
      a.hours += (d.actedAt.getTime() - d.createdAt.getTime()) / 3_600_000;
      if (d.breached) a.breached += 1;
      byApprover.set(d.approverKey, a);
    }
    const rows: LeaveReportRow[] = [...byApprover.values()]
      .sort((a, b) => b.decided - a.decided)
      .map((a) => ({
        approver: a.name,
        decided: a.decided,
        approved: a.approved,
        rejected: a.rejected,
        avgHours: round(a.hours / a.decided, 1),
        breached: a.breached,
        breachRate: round((a.breached / a.decided) * 100, 1),
      }));
    const totalHours = decisions.reduce(
      (s, d) => s + (d.actedAt.getTime() - d.createdAt.getTime()) / 3_600_000,
      0,
    );
    const breached = decisions.filter((d) => d.breached).length;
    return this.build(ctx, 'approval_sla', {
      title: 'Approval SLA',
      description: 'How quickly each approver decides, and how often the SLA was missed.',
      columns: [
        col('approver', 'Approver'),
        col('decided', 'Decisions', true),
        col('approved', 'Approved', true),
        col('rejected', 'Rejected', true),
        col('avgHours', 'Avg Hours', true),
        col('breached', 'SLA Breaches', true),
        col('breachRate', 'Breach Rate %', true),
      ],
      rows,
      summary: [
        { label: 'Decisions', value: decisions.length },
        {
          label: 'Average decision time',
          value: decisions.length ? `${round(totalHours / decisions.length, 1)}h` : '—',
        },
        {
          label: 'Breach rate',
          value: decisions.length ? `${round((breached / decisions.length) * 100, 1)}%` : '—',
        },
      ],
    });
  }

  private async audit(ctx: ReportContext): Promise<LeaveReport> {
    const events = await this.repo.listAuditEvents(
      ctx.tenantId,
      ctx.companyId,
      ctx.employeeIds,
      this.instantRange(ctx),
    );
    const rows: LeaveReportRow[] = events.slice(0, MAX_AUDIT_ROWS).map((e) => ({
      at: e.at.toISOString().slice(0, 16).replace('T', ' '),
      employee: e.employeeName,
      employeeNumber: e.employeeNumber,
      event: e.event,
      detail: e.detail,
      actor: e.actor,
    }));
    return this.build(ctx, 'audit', {
      title: 'Leave Audit Trail',
      description: 'Applications, decisions, cancellations and manual balance adjustments (UTC).',
      columns: [
        col('at', 'When (UTC)'),
        col('employee', 'Employee'),
        col('employeeNumber', 'Employee No.'),
        col('event', 'Event'),
        col('detail', 'Detail'),
        col('actor', 'By'),
      ],
      rows,
      summary: [
        { label: 'Events', value: events.length },
        { label: 'Shown', value: rows.length },
      ],
      truncated: events.length > MAX_AUDIT_ROWS,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async context(
    tenantId: string,
    companyId: string,
    scope: LeaveDataScope,
    query: Record<string, unknown>,
  ): Promise<ReportContext> {
    const today = localDateInTimezone(
      await leaveGeneralSettingsRepository.getCompanyTimezone(tenantId, companyId),
    );
    const cycle = await this.cycleFor(tenantId, companyId, today);
    const from = optionalString(query.from) ?? cycle.start;
    const to = optionalString(query.to) ?? today;
    if (!isValidIsoDate(from) || !isValidIsoDate(to) || to < from) {
      throw new BadRequestError('Invalid report date range.');
    }
    if (daysBetweenInclusive(from, to) > MAX_RANGE_DAYS) {
      throw new BadRequestError(`A report range cannot exceed ${MAX_RANGE_DAYS} days.`);
    }
    const departmentId = optionalString(query.departmentId);
    const locationId = optionalString(query.locationId);
    let scopeIds: string[] | null = null;
    if (scope.kind === 'team') {
      scopeIds = scope.managerEmployeeId
        ? await this.ops.listReporteeIds(tenantId, companyId, scope.managerEmployeeId)
        : [];
    }
    // Department/location narrow the employee set for every report.
    const employeeIds =
      departmentId || locationId
        ? (
            await this.ops.listEmployees(tenantId, companyId, scopeIds, {
              departmentId,
              locationId,
              anyStatus: true,
            })
          ).items.map((e) => e.id)
        : scopeIds;
    return {
      tenantId,
      companyId,
      from,
      to,
      departmentId,
      locationId,
      leaveTypeId: optionalString(query.leaveTypeId),
      employeeIds,
      scopeIds,
    };
  }

  private async leaveRows(ctx: ReportContext): Promise<OperationsLeaveRow[]> {
    const rows = await this.ops.listLeaveInRange(
      ctx.tenantId,
      ctx.companyId,
      ctx.employeeIds,
      { from: ctx.from, to: ctx.to },
      ['approved', 'cancellation_pending'],
    );
    return ctx.leaveTypeId ? rows.filter((r) => r.leaveTypeId === ctx.leaveTypeId) : rows;
  }

  private async cycleFor(tenantId: string, companyId: string, date: string) {
    const { settings } = await this.settings.getSettings(tenantId, companyId);
    return leaveCycleFor(date, settings.leaveYearCycle, settings.customYearStartDate);
  }

  private instantRange(ctx: ReportContext) {
    return { from: new Date(`${ctx.from}T00:00:00Z`), to: new Date(`${ctx.to}T23:59:59Z`) };
  }

  private build(
    ctx: ReportContext,
    reportId: LeaveReportId,
    body: Pick<LeaveReport, 'title' | 'description' | 'columns' | 'rows' | 'summary'> & {
      truncated?: boolean;
    },
  ): LeaveReport {
    return {
      reportId,
      ...body,
      truncated: body.truncated ?? false,
      range: { from: ctx.from, to: ctx.to },
      generatedAt: new Date().toISOString(),
    };
  }
}

export const leaveReportsService = new LeaveReportsService();
