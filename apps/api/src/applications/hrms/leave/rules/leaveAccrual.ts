/**
 * HRMS Leave Domain — accrual, carry-forward and encashment arithmetic (Tab 4, pure).
 *
 * Entitlement is modelled month by month across the leave year: a month is "eligible" when the
 * employee is employed for it (joining/exit cut-off) and, if configured, past probation or not on
 * loss of pay. Grant methods then decide when eligible months become credited.
 */

import { addDays, daysBetweenInclusive } from './leaveCalendar.js';

export type GrantMethod =
  'upfront_annual' | 'monthly' | 'quarterly' | 'half_yearly' | 'manual_only';
export type AccrualTiming = 'cycle_start' | 'period_start' | 'period_end';

export interface AccrualRuleInput {
  grantMethod: GrantMethod;
  accrualTiming: AccrualTiming;
  proRataOnJoining: boolean;
  joiningCutoffDay: number;
  proRataOnExit: boolean;
  accrueDuringProbation: boolean;
  backcreditAfterProbation: boolean;
  accrueDuringLop: boolean;
}

export const DEFAULT_ACCRUAL_RULE: AccrualRuleInput = {
  grantMethod: 'upfront_annual',
  accrualTiming: 'period_start',
  proRataOnJoining: true,
  joiningCutoffDay: 15,
  proRataOnExit: true,
  accrueDuringProbation: true,
  backcreditAfterProbation: false,
  accrueDuringLop: true,
};

const MONTHS_PER_PERIOD: Record<Exclude<GrantMethod, 'manual_only'>, number> = {
  upfront_annual: 12,
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
};

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface MonthWindow {
  start: string;
  end: string;
}

/** The twelve monthly windows of a leave year starting on `cycleStart`. */
export function cycleMonths(cycleStart: string): MonthWindow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    start: addMonths(cycleStart, i),
    end: addDays(addMonths(cycleStart, i + 1), -1),
  }));
}

export interface EntitlementInput {
  rule: AccrualRuleInput;
  annualQuota: number;
  cycleStart: string;
  asOf: string;
  joiningDate: string;
  lastWorkingDate: string | null;
  probationEndDate: string | null;
  /** Approved loss-of-pay days per month window start date (only used when accrueDuringLop=false). */
  lopDaysByMonth?: Map<string, number>;
  /** Rounds the final entitlement (General Settings rounding rule, 0.5 increment). */
  round: (value: number) => number;
}

/** Fraction (0..1) of a month the employee earns entitlement for. */
function monthEligibility(month: MonthWindow, input: EntitlementInput): number {
  const { rule, joiningDate, lastWorkingDate, probationEndDate, asOf } = input;
  if (joiningDate > month.end) return 0;
  if (lastWorkingDate && lastWorkingDate < month.start) return 0;

  if (joiningDate > month.start) {
    // Joined mid-month: the month counts only if joined on/before the cut-off day.
    if (rule.proRataOnJoining && Number(joiningDate.slice(8, 10)) > rule.joiningCutoffDay) return 0;
  }
  if (lastWorkingDate && lastWorkingDate < month.end && rule.proRataOnExit) {
    // Left mid-month: the month counts only if the employee worked past the cut-off day.
    if (Number(lastWorkingDate.slice(8, 10)) < rule.joiningCutoffDay) return 0;
  }
  if (!rule.accrueDuringProbation && probationEndDate && month.end <= probationEndDate) {
    const backCredited = rule.backcreditAfterProbation && asOf > probationEndDate;
    if (!backCredited) return 0;
  }
  if (!rule.accrueDuringLop) {
    const lop = input.lopDaysByMonth?.get(month.start) ?? 0;
    const days = daysBetweenInclusive(month.start, month.end);
    return Math.max(0, 1 - lop / days);
  }
  return 1;
}

/**
 * Entitlement accrued as of `asOf` within the leave year. Upfront grants credit the whole (pro-rated)
 * year at cycle start; periodic grants credit each period by `accrualTiming`.
 */
export function computeAccruedEntitlement(input: EntitlementInput): number {
  const { rule, annualQuota, cycleStart, asOf } = input;
  if (rule.grantMethod === 'manual_only' || annualQuota <= 0 || asOf < cycleStart) return 0;

  const months = cycleMonths(cycleStart);
  const perMonth = annualQuota / 12;

  // When pro-rating is off, any employment in the year earns the full year (upfront) / full periods.
  const eligibility = months.map((m) => {
    const fraction = monthEligibility(m, input);
    if (fraction > 0 || rule.proRataOnJoining) return fraction;
    return input.joiningDate <= months[11]!.end ? 1 : 0;
  });

  if (rule.grantMethod === 'upfront_annual') {
    return input.round(eligibility.reduce((sum, f) => sum + f * perMonth, 0));
  }

  const size = MONTHS_PER_PERIOD[rule.grantMethod];
  let credited = 0;
  for (let p = 0; p < 12 / size; p++) {
    const first = months[p * size]!;
    const last = months[p * size + size - 1]!;
    const due =
      rule.accrualTiming === 'cycle_start'
        ? cycleStart
        : rule.accrualTiming === 'period_start'
          ? first.start
          : last.end;
    if (asOf < due) continue;
    for (let i = p * size; i < p * size + size; i++) credited += eligibility[i]! * perMonth;
  }
  return input.round(credited);
}

export interface CycleCloseRule {
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number | null;
  maxAccumulationDays: number | null;
  lapseRemaining: boolean;
  encashmentEnabled: boolean;
  encashOnCycleEnd: boolean;
  minBalanceToRetain: number;
  maxEncashableDays: number | null;
}

export interface CycleCloseResult {
  available: number;
  encash: number;
  carryForward: number;
  lapse: number;
}

/**
 * Splits the closing available balance: encash first (keeping the minimum to retain), then carry
 * forward up to the cap (and so the new balance stays within max accumulation), then lapse the rest
 * except the retained minimum, which stays in the closed cycle (spec §6.6: closing 12, CF cap 5,
 * retain 2, max encash 3 → encash 3, CF 5, lapse 2). Values round down to half days.
 */
export function computeCycleClose(
  rule: CycleCloseRule,
  available: number,
  nextCycleGrant: number,
): CycleCloseResult {
  const half = (n: number) => Math.floor(Math.max(0, n) * 2) / 2;
  let remaining = half(available);

  let encash = 0;
  if (rule.encashmentEnabled && rule.encashOnCycleEnd) {
    encash = half(
      Math.min(remaining - rule.minBalanceToRetain, rule.maxEncashableDays ?? Infinity),
    );
    remaining -= encash;
  }

  let carryForward = 0;
  if (rule.carryForwardEnabled) {
    const accumulationRoom =
      rule.maxAccumulationDays === null ? Infinity : rule.maxAccumulationDays - nextCycleGrant;
    carryForward = half(
      Math.min(remaining, rule.maxCarryForwardDays ?? Infinity, accumulationRoom),
    );
    remaining -= carryForward;
  }

  const retained = rule.encashmentEnabled ? rule.minBalanceToRetain : 0;
  const lapse = rule.lapseRemaining ? half(remaining - retained) : 0;
  return { available: half(available), encash, carryForward, lapse };
}
