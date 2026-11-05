import {
  LeaveAccrualRepository,
  leaveAccrualRepository,
  type CycleCloseItem,
} from '../repository/leaveAccrual.repository.js';
import {
  LeaveRepository,
  leaveRepository,
  type LeaveEmployeeProfile,
} from '../repository/leave.repository.js';
import { LeaveTypesRepository, leaveTypesRepository } from '../repository/leaveTypes.repository.js';
import {
  LeavePoliciesRepository,
  leavePoliciesRepository,
} from '../repository/leavePolicies.repository.js';
import { selectPolicyForEmployee } from './leavePolicies.service.js';
import {
  LeaveGeneralSettingsService,
  leaveGeneralSettingsService,
} from './leaveGeneralSettings.service.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../app/errors/AppError.js';
import { auditService, AuditService } from '../../../../platform/audit/service/audit.service.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  assertEnum,
  isDuplicateKeyError,
  isHalfDayMultiple,
  isValidIsoDate,
  localDateInTimezone,
  parseOptionalInteger,
  parseOptionalNumber,
} from '../rules/leaveValidation.js';
import { addDays, leaveCycleFor, type LeaveCycle } from '../rules/leaveCalendar.js';
import {
  computeAccruedEntitlement,
  computeCycleClose,
  cycleMonths,
  DEFAULT_ACCRUAL_RULE,
  type AccrualRuleInput,
} from '../rules/leaveAccrual.js';
import type { LeaveAccrualRuleRecord, LeaveTypeRecord } from '../../../../db/schema.js';

const GRANT_METHODS = [
  'upfront_annual',
  'monthly',
  'quarterly',
  'half_yearly',
  'manual_only',
] as const;
const TIMINGS = ['cycle_start', 'period_start', 'period_end'] as const;
const ENCASH_TRIGGERS = ['cycle_end', 'exit', 'both'] as const;
const BASES = ['basic', 'gross'] as const;

export interface AccrualRuleView extends AccrualRuleInput {
  id: string | null;
  leaveTypeId: string;
  effectiveFrom: string;
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number | null;
  maxAccumulationDays: number | null;
  carryForwardExpiryMonths: number | null;
  lapseRemaining: boolean;
  encashmentEnabled: boolean;
  encashmentTrigger: 'cycle_end' | 'exit' | 'both';
  minBalanceToRetain: number;
  maxEncashableDays: number | null;
  encashmentBasis: 'basic' | 'gross';
  /** True when no rule has been saved and the defaults apply. */
  isDefault: boolean;
}

export type AccrualRuleDto = Partial<Omit<AccrualRuleView, 'id' | 'leaveTypeId' | 'isDefault'>>;

export interface CycleClosePreviewRow {
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  available: number;
  encash: number;
  carryForward: number;
  lapse: number;
}

const toNum = (v: string | null) => (v === null ? null : Number(v));

function viewOf(
  leaveTypeId: string,
  row: LeaveAccrualRuleRecord | null,
  fallbackFrom: string,
): AccrualRuleView {
  if (!row) {
    return {
      ...DEFAULT_ACCRUAL_RULE,
      id: null,
      leaveTypeId,
      effectiveFrom: fallbackFrom,
      carryForwardEnabled: false,
      maxCarryForwardDays: null,
      maxAccumulationDays: null,
      carryForwardExpiryMonths: null,
      lapseRemaining: true,
      encashmentEnabled: false,
      encashmentTrigger: 'cycle_end',
      minBalanceToRetain: 0,
      maxEncashableDays: null,
      encashmentBasis: 'basic',
      isDefault: true,
    };
  }
  return {
    id: row.id,
    leaveTypeId,
    effectiveFrom: row.effectiveFrom,
    grantMethod: row.grantMethod,
    accrualTiming: row.accrualTiming,
    proRataOnJoining: row.proRataOnJoining,
    joiningCutoffDay: row.joiningCutoffDay,
    proRataOnExit: row.proRataOnExit,
    accrueDuringProbation: row.accrueDuringProbation,
    backcreditAfterProbation: row.backcreditAfterProbation,
    accrueDuringLop: row.accrueDuringLop,
    carryForwardEnabled: row.carryForwardEnabled,
    maxCarryForwardDays: toNum(row.maxCarryForwardDays),
    maxAccumulationDays: toNum(row.maxAccumulationDays),
    carryForwardExpiryMonths: row.carryForwardExpiryMonths,
    lapseRemaining: row.lapseRemaining,
    encashmentEnabled: row.encashmentEnabled,
    encashmentTrigger: row.encashmentTrigger,
    minBalanceToRetain: Number(row.minBalanceToRetain),
    maxEncashableDays: toNum(row.maxEncashableDays),
    encashmentBasis: row.encashmentBasis,
    isDefault: false,
  };
}

function addMonthsToDate(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export class LeaveAccrualService {
  constructor(
    private readonly repo: LeaveAccrualRepository = leaveAccrualRepository,
    private readonly leaveRepo: Pick<LeaveRepository, 'getEmployeeProfile'> = leaveRepository,
    private readonly typesRepo: Pick<
      LeaveTypesRepository,
      'findById' | 'findAllForCompany'
    > = leaveTypesRepository,
    private readonly policiesRepo: Pick<
      LeavePoliciesRepository,
      'findPoliciesInForceOn' | 'findEmployeesForResolution' | 'findById'
    > = leavePoliciesRepository,
    private readonly settings: Pick<
      LeaveGeneralSettingsService,
      'getSettings' | 'roundAccrual'
    > = leaveGeneralSettingsService,
    private readonly audit: Pick<AuditService, 'logEvent'> = auditService,
  ) {}

  // ── Rules (Tab 4) ──────────────────────────────────────────────────────────

  async listRules(tenantId: string, companyId: string, today: string) {
    const [types, rows] = await Promise.all([
      this.typesRepo.findAllForCompany(tenantId, companyId),
      this.repo.listRules(tenantId, companyId),
    ]);
    return types
      .filter((t) => !t.isArchived)
      .map((type) => {
        const history = rows.filter((r) => r.leaveTypeId === type.id);
        const current = history.find((r) => r.effectiveFrom <= today) ?? null;
        return {
          leaveType: {
            id: type.id,
            name: type.name,
            code: type.code,
            isTracked: type.isTracked,
            category: type.category,
            isActive: type.isActive,
          },
          current: viewOf(type.id, current, type.effectiveFrom),
          scheduled: history
            .filter((r) => r.effectiveFrom > today)
            .map((r) => viewOf(type.id, r, r.effectiveFrom)),
          history: history.map((r) => viewOf(type.id, r, r.effectiveFrom)),
        };
      });
  }

  async ruleFor(
    leaveTypeId: string,
    date: string,
    fallbackFrom = '2000-01-01',
  ): Promise<AccrualRuleView> {
    return viewOf(leaveTypeId, await this.repo.findRuleFor(leaveTypeId, date), fallbackFrom);
  }

  async saveRule(
    tenantId: string,
    companyId: string,
    leaveTypeId: string,
    userId: string,
    dto: AccrualRuleDto,
    today: string,
  ): Promise<AccrualRuleView> {
    const type = await this.typesRepo.findById(tenantId, companyId, leaveTypeId);
    if (!type) throw new NotFoundError(`Leave type "${leaveTypeId}" not found.`);
    if (!type.isTracked) {
      throw new BadRequestError(`${type.name} is not tracked, so it has no balance to accrue.`);
    }
    const current = await this.ruleFor(leaveTypeId, today, type.effectiveFrom);
    const v = this.validate({ ...current, ...dto, effectiveFrom: dto?.effectiveFrom ?? today });

    const id = generateSurrogateId('lacr');
    try {
      await this.repo.saveRule({
        id,
        tenantId,
        companyId,
        leaveTypeId,
        effectiveFrom: v.effectiveFrom,
        grantMethod: v.grantMethod,
        accrualTiming: v.accrualTiming,
        proRataOnJoining: v.proRataOnJoining,
        joiningCutoffDay: v.joiningCutoffDay,
        proRataOnExit: v.proRataOnExit,
        accrueDuringProbation: v.accrueDuringProbation,
        backcreditAfterProbation: v.backcreditAfterProbation,
        accrueDuringLop: v.accrueDuringLop,
        carryForwardEnabled: v.carryForwardEnabled,
        maxCarryForwardDays: v.maxCarryForwardDays?.toFixed(2) ?? null,
        maxAccumulationDays: v.maxAccumulationDays?.toFixed(2) ?? null,
        carryForwardExpiryMonths: v.carryForwardExpiryMonths,
        lapseRemaining: v.lapseRemaining,
        encashmentEnabled: v.encashmentEnabled,
        encashmentTrigger: v.encashmentTrigger,
        minBalanceToRetain: v.minBalanceToRetain.toFixed(2),
        maxEncashableDays: v.maxEncashableDays?.toFixed(2) ?? null,
        encashmentBasis: v.encashmentBasis,
        createdByUserId: userId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err))
        throw new ConflictError('This rule was saved concurrently. Please refresh.');
      throw err;
    }
    await this.audit.logEvent({
      actorUserId: userId,
      action: 'leave_accrual_rule_saved',
      targetType: 'leave_type',
      targetId: leaveTypeId,
      tenantId,
      companyId,
      metadata: { effectiveFrom: v.effectiveFrom, before: current, after: v },
    });
    return this.ruleFor(leaveTypeId, v.effectiveFrom);
  }

  // ── Entitlement ────────────────────────────────────────────────────────────

  /** Accrued entitlement as of `asOf` for a tracked type; null when the type is untracked. */
  async computeTarget(
    tenantId: string,
    companyId: string,
    employee: Pick<
      LeaveEmployeeProfile,
      'id' | 'joiningDate' | 'lastWorkingDate' | 'probationEndDate'
    >,
    type: Pick<LeaveTypeRecord, 'id' | 'isTracked' | 'effectiveFrom'>,
    annualQuota: number | null,
    cycle: LeaveCycle,
    asOf: string,
  ): Promise<number | null> {
    if (!type.isTracked || annualQuota === null) return null;
    const rule = await this.ruleFor(type.id, asOf, type.effectiveFrom);
    const { settings } = await this.settings.getSettings(tenantId, companyId);
    const months = cycleMonths(cycle.start);
    const lopDaysByMonth = rule.accrueDuringLop
      ? undefined
      : await this.repo.lopDaysByMonth(
          employee.id,
          cycle.start,
          cycle.end,
          months.map((m) => m.start),
        );
    return computeAccruedEntitlement({
      rule,
      annualQuota,
      cycleStart: cycle.start,
      asOf,
      joiningDate: employee.joiningDate,
      lastWorkingDate: employee.lastWorkingDate,
      probationEndDate: employee.probationEndDate,
      lopDaysByMonth,
      round: (value) => this.settings.roundAccrual(value, settings.balanceRoundingRule),
    });
  }

  /** Brings every in-scope employee's tracked balances for the current cycle up to date. */
  async runAccrualSweep(
    now: Date = new Date(),
  ): Promise<{ companies: number; reconciled: number }> {
    let reconciled = 0;
    const targets = await this.repo.listCompaniesWithPolicies();
    for (const c of targets) {
      const today = localDateInTimezone(c.timeZone, now);
      const { settings } = await this.settings.getSettings(c.tenantId, c.companyId);
      const cycle = leaveCycleFor(today, settings.leaveYearCycle, settings.customYearStartDate);
      const [candidates, staff] = await Promise.all([
        this.policiesRepo.findPoliciesInForceOn(c.tenantId, c.companyId, today),
        this.policiesRepo.findEmployeesForResolution(c.tenantId, c.companyId),
      ]);
      for (const member of staff) {
        const picked = selectPolicyForEmployee(candidates, member);
        if (!picked) continue;
        const policy = await this.policiesRepo.findById(c.tenantId, c.companyId, picked.id);
        const employee = await this.leaveRepo.getEmployeeProfile(
          c.tenantId,
          c.companyId,
          member.id,
        );
        if (!policy || !employee) continue;
        for (const ent of policy.entitlements) {
          if (!ent.isTracked || ent.annualQuota === null) continue;
          const type = await this.typesRepo.findById(c.tenantId, c.companyId, ent.leaveTypeId);
          if (!type || !type.isActive) continue;
          const target = await this.computeTarget(
            c.tenantId,
            c.companyId,
            employee,
            type,
            ent.annualQuota,
            cycle,
            today,
          );
          if (target === null) continue;
          await this.repo.ensureAndReconcile({
            tenantId: c.tenantId,
            companyId: c.companyId,
            employeeId: employee.id,
            leaveTypeId: type.id,
            cycle,
            target,
            actorUserId: 'system',
          });
          reconciled++;
        }
      }
      await this.repo.expireCarryForward(today, 'system');
    }
    return { companies: targets.length, reconciled };
  }

  // ── Year-end ───────────────────────────────────────────────────────────────

  /** Dry run: what closing `cycleStart` would encash, carry forward and lapse, per balance. */
  async previewCycleClose(
    tenantId: string,
    companyId: string,
    cycleStart: string,
  ): Promise<{
    cycle: LeaveCycle;
    nextCycle: LeaveCycle;
    alreadyClosed: boolean;
    runStatus: 'pending' | 'reviewed' | 'committed' | null;
    rows: CycleClosePreviewRow[];
    items: CycleCloseItem[];
  }> {
    if (!isValidIsoDate(cycleStart)) throw new BadRequestError('Cycle start must be a valid date.');
    const { settings } = await this.settings.getSettings(tenantId, companyId);
    const cycle = leaveCycleFor(cycleStart, settings.leaveYearCycle, settings.customYearStartDate);
    if (cycle.start !== cycleStart) {
      throw new BadRequestError(
        `${cycleStart} is not the start of a leave year (expected ${cycle.start}).`,
      );
    }
    const nextCycle = leaveCycleFor(
      addDays(cycle.end, 1),
      settings.leaveYearCycle,
      settings.customYearStartDate,
    );

    const balances = await this.repo.listBalancesForCycle(tenantId, companyId, cycle.start);
    const rows: CycleClosePreviewRow[] = [];
    const items: CycleCloseItem[] = [];
    for (const b of balances) {
      if (!b.isTracked) continue;
      const rule = await this.ruleFor(b.leaveTypeId, cycle.end);
      const available = Number(b.totalDays) - Number(b.usedDays) - Number(b.pendingDays);
      // Max accumulation is checked against the next cycle's upfront grant when known.
      const nextGrant = 0;
      const result = computeCycleClose(
        {
          carryForwardEnabled: rule.carryForwardEnabled,
          maxCarryForwardDays: rule.maxCarryForwardDays,
          maxAccumulationDays: rule.maxAccumulationDays,
          lapseRemaining: rule.lapseRemaining,
          encashmentEnabled: rule.encashmentEnabled,
          encashOnCycleEnd: rule.encashmentTrigger !== 'exit',
          minBalanceToRetain: rule.minBalanceToRetain,
          maxEncashableDays: rule.maxEncashableDays,
        },
        available,
        nextGrant,
      );
      rows.push({
        employeeId: b.employeeId,
        leaveTypeId: b.leaveTypeId,
        leaveTypeName: b.leaveTypeName,
        ...result,
      });
      items.push({
        balanceId: b.id,
        employeeId: b.employeeId,
        leaveTypeId: b.leaveTypeId,
        encash: result.encash,
        carryForward: result.carryForward,
        lapse: result.lapse,
        encashmentBasis: rule.encashmentBasis,
        carryForwardExpiresOn:
          result.carryForward > 0 && rule.carryForwardExpiryMonths
            ? addDays(addMonthsToDate(nextCycle.start, rule.carryForwardExpiryMonths), -1)
            : null,
      });
    }
    const existingRun = await this.repo.findCloseRun(companyId, cycle.start);
    const alreadyClosed = Boolean(existingRun && existingRun.status === 'committed');
    const runStatus = existingRun?.status ?? null;
    return { cycle, nextCycle, alreadyClosed, runStatus, rows, items };
  }

  /** Marks a pending year-end close run as reviewed by an HR administrator (L2). */
  async reviewCycleClose(
    tenantId: string,
    companyId: string,
    cycleStart: string,
    userId: string,
  ): Promise<{ runId: string; status: 'reviewed'; reviewedByUserId: string; reviewedAt: Date }> {
    if (!isValidIsoDate(cycleStart)) throw new BadRequestError('Cycle start must be a valid date.');
    if (userId === 'system') {
      throw new ForbiddenError('Automated background sweeps cannot review year-end runs.');
    }
    const existing = await this.repo.findCloseRun(companyId, cycleStart);
    if (!existing) {
      throw new NotFoundError(`No year-end run found for cycle starting on ${cycleStart}.`);
    }
    if (existing.status === 'committed') {
      throw new ConflictError(`Leave year starting on ${cycleStart} is already committed.`);
    }
    const now = new Date();
    await this.repo.markRunReviewed(companyId, cycleStart, userId);
    await this.audit.logEvent({
      actorUserId: userId,
      action: 'leave_cycle_close_reviewed',
      targetType: 'leave_cycle',
      targetId: cycleStart,
      tenantId,
      companyId,
      metadata: { runId: existing.id, reviewedByUserId: userId, reviewedAt: now.toISOString() },
    });
    return {
      runId: existing.id,
      status: 'reviewed',
      reviewedByUserId: userId,
      reviewedAt: now,
    };
  }

  /** Commits a cycle close once; only after the cycle has ended and authorized by HR. */
  async commitCycleClose(
    tenantId: string,
    companyId: string,
    cycleStart: string,
    userId: string,
    today: string,
  ): Promise<{
    runId: string;
    balances: number;
    encashed: number;
    carriedForward: number;
    lapsed: number;
  }> {
    if (userId === 'system') {
      throw new ForbiddenError(
        'Automated background sweeps cannot commit year-end runs. HR review and authorization is required.',
      );
    }
    const preview = await this.previewCycleClose(tenantId, companyId, cycleStart);
    if (preview.cycle.end >= today) {
      throw new BadRequestError(`The leave year ${preview.cycle.label} has not ended yet.`);
    }
    if (preview.alreadyClosed)
      throw new ConflictError(`Leave year ${preview.cycle.label} is already closed.`);

    const sum = (key: 'encash' | 'carryForward' | 'lapse') =>
      preview.items.reduce((s, i) => s + i[key], 0);
    const summary = {
      balances: preview.items.length,
      encashed: sum('encash'),
      carriedForward: sum('carryForward'),
      lapsed: sum('lapse'),
    };
    let runId: string;
    try {
      runId = await this.repo.commitCycleClose({
        tenantId,
        companyId,
        cycle: preview.cycle,
        nextCycle: preview.nextCycle,
        items: preview.items,
        summary,
        actorUserId: userId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err))
        throw new ConflictError(`Leave year ${preview.cycle.label} is already closed.`);
      throw err;
    }
    await this.audit.logEvent({
      actorUserId: userId,
      action: 'leave_cycle_closed',
      targetType: 'leave_cycle',
      targetId: preview.cycle.start,
      tenantId,
      companyId,
      metadata: { runId, ...summary },
    });
    return { runId, ...summary };
  }

  /**
   * Scans companies whose previous leave year has ended and creates/maintains a pending year-end close run (L2).
   * Background sweeps do NOT commit balances automatically; HR review and authorization is required.
   */
  async runYearEndSweep(
    now: Date = new Date(),
  ): Promise<{ pending: number; closed: number; skipped: number }> {
    let pending = 0;
    let skipped = 0;
    for (const c of await this.repo.listCompaniesWithPolicies()) {
      const today = localDateInTimezone(c.timeZone, now);
      const { settings } = await this.settings.getSettings(c.tenantId, c.companyId);
      const current = leaveCycleFor(today, settings.leaveYearCycle, settings.customYearStartDate);
      const previous = leaveCycleFor(
        addDays(current.start, -1),
        settings.leaveYearCycle,
        settings.customYearStartDate,
      );
      // A cycle that ended before go-live never held tracked balances: nothing to close.
      if (previous.end < settings.goLiveDate) {
        skipped++;
        continue;
      }
      const existingRun = await this.repo.findCloseRun(c.companyId, previous.start);
      if (existingRun && existingRun.status === 'committed') {
        skipped++;
        continue;
      }
      try {
        const preview = await this.previewCycleClose(c.tenantId, c.companyId, previous.start);
        const sum = (key: 'encash' | 'carryForward' | 'lapse') =>
          preview.items.reduce((s, i) => s + i[key], 0);
        const summary = {
          balances: preview.items.length,
          encashed: sum('encash'),
          carriedForward: sum('carryForward'),
          lapsed: sum('lapse'),
        };
        await this.repo.recordPendingCycleClose({
          tenantId: c.tenantId,
          companyId: c.companyId,
          cycle: preview.cycle,
          summary,
          actorUserId: 'system',
        });
        pending++;
      } catch (err) {
        if (!(err instanceof ConflictError)) throw err;
      }
    }
    return { pending, closed: 0, skipped };
  }

  listCloseRuns(tenantId: string, companyId: string) {
    return this.repo.listCloseRuns(tenantId, companyId);
  }

  listEncashments(tenantId: string, companyId: string, cycleStart?: string) {
    return this.repo.listEncashments(tenantId, companyId, cycleStart);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  private validate(raw: AccrualRuleView): AccrualRuleView {
    const bool = (v: unknown, field: string) => {
      if (typeof v !== 'boolean') throw new BadRequestError(`${field} must be true or false.`);
      return v;
    };
    const days = (v: unknown, field: string, allowNull: boolean) => {
      const n = parseOptionalNumber(v, field);
      if (n === null) {
        if (allowNull) return null;
        throw new BadRequestError(`${field} is required.`);
      }
      if (n < 0 || n > 9999.5 || !isHalfDayMultiple(n)) {
        throw new BadRequestError(`${field} must be between 0 and 9999.5 days, in steps of 0.5.`);
      }
      return n;
    };
    if (!isValidIsoDate(raw.effectiveFrom))
      throw new BadRequestError('Effective from must be a valid date.');
    const cutoff = parseOptionalInteger(raw.joiningCutoffDay, 'Joining cut-off day');
    if (cutoff === null || cutoff < 1 || cutoff > 28) {
      throw new BadRequestError('Joining cut-off day must be between 1 and 28.');
    }
    const expiry = parseOptionalInteger(raw.carryForwardExpiryMonths, 'Carry-forward expiry');
    if (expiry !== null && (expiry < 1 || expiry > 12)) {
      throw new BadRequestError('Carry-forward expiry must be between 1 and 12 months.');
    }

    return {
      ...raw,
      grantMethod: assertEnum(raw.grantMethod, GRANT_METHODS, 'Grant method'),
      accrualTiming: assertEnum(raw.accrualTiming, TIMINGS, 'Accrual timing'),
      joiningCutoffDay: cutoff,
      proRataOnJoining: bool(raw.proRataOnJoining, 'Pro-rata on joining'),
      proRataOnExit: bool(raw.proRataOnExit, 'Pro-rata on exit'),
      accrueDuringProbation: bool(raw.accrueDuringProbation, 'Accrue during probation'),
      backcreditAfterProbation: bool(raw.backcreditAfterProbation, 'Back-credit after probation'),
      accrueDuringLop: bool(raw.accrueDuringLop, 'Accrue during loss of pay'),
      carryForwardEnabled: bool(raw.carryForwardEnabled, 'Carry forward'),
      maxCarryForwardDays: days(raw.maxCarryForwardDays, 'Maximum carry forward', true),
      maxAccumulationDays: days(raw.maxAccumulationDays, 'Maximum accumulation', true),
      carryForwardExpiryMonths: expiry,
      lapseRemaining: bool(raw.lapseRemaining, 'Lapse remaining'),
      encashmentEnabled: bool(raw.encashmentEnabled, 'Encashment'),
      encashmentTrigger: assertEnum(raw.encashmentTrigger, ENCASH_TRIGGERS, 'Encashment trigger'),
      minBalanceToRetain: days(raw.minBalanceToRetain, 'Minimum balance to retain', false)!,
      maxEncashableDays: days(raw.maxEncashableDays, 'Maximum encashable days', true),
      encashmentBasis: assertEnum(raw.encashmentBasis, BASES, 'Encashment basis'),
      isDefault: false,
    };
  }
}

export const leaveAccrualService = new LeaveAccrualService();
