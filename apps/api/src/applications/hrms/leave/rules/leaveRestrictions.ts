/**
 * HRMS Leave Domain — restriction rules (Tab 5), evaluated as pipeline step 8 (pure).
 */

import { addDays, daysBetweenInclusive, eachDate } from './leaveCalendar.js';

export type RestrictionType =
  'clubbing' | 'blackout' | 'min_notice' | 'min_gap' | 'frequency_cap' | 'team_concurrency';
export const RESTRICTION_TYPES: readonly RestrictionType[] = [
  'clubbing',
  'blackout',
  'min_notice',
  'min_gap',
  'frequency_cap',
  'team_concurrency',
];

export interface ClubbingConfig {
  leaveTypeIdA: string;
  leaveTypeIdB: string;
}
export interface BlackoutConfig {
  startDate: string;
  endDate: string;
  scope: 'company' | 'department' | 'location';
  scopeId: string | null;
  /** Empty = all leave types. */
  leaveTypeIds: string[];
  allowHrOverride: boolean;
}
export interface MinNoticeConfig {
  leaveTypeId: string;
  days: number;
}
export interface MinGapConfig {
  leaveTypeId: string;
  workingDays: number;
}
export interface FrequencyCapConfig {
  leaveTypeId: string;
  maxPerMonth: number | null;
  maxPerCycle: number | null;
}
export interface TeamConcurrencyConfig {
  /** null = every department. */
  departmentId: string | null;
  maxPercent: number | null;
  maxCount: number | null;
}

export interface RestrictionRule {
  id: string;
  name: string;
  ruleType: RestrictionType;
  config: Record<string, unknown>;
}

export interface RestrictionContext {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  today: string;
  departmentId: string | null;
  locationId: string | null;
  cycle: { start: string; end: string };
  /** The employee's other pending/approved requests near the requested dates. */
  existing: Array<{ leaveTypeId: string; startDate: string; endDate: string }>;
  isNonWorkingDay: (date: string) => boolean;
  leaveTypeName: (id: string) => string;
}

export interface RestrictionViolation {
  code: string;
  message: string;
  ruleId: string;
}

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart <= bEnd && bStart <= aEnd;

function workingDaysStrictlyBetween(
  from: string,
  to: string,
  isNonWorkingDay: (d: string) => boolean,
): number {
  const start = addDays(from, 1);
  const end = addDays(to, -1);
  if (start > end) return 0;
  return eachDate(start, end).filter((d) => !isNonWorkingDay(d)).length;
}

/** First violated rule (team concurrency never blocks; see `teamConcurrencyRules`). */
export function findRestrictionViolation(
  rules: RestrictionRule[],
  ctx: RestrictionContext,
): RestrictionViolation | null {
  for (const rule of rules) {
    const c = rule.config;
    switch (rule.ruleType) {
      case 'blackout': {
        const cfg = c as unknown as BlackoutConfig;
        const typeApplies =
          cfg.leaveTypeIds.length === 0 || cfg.leaveTypeIds.includes(ctx.leaveTypeId);
        const scopeApplies =
          cfg.scope === 'company' ||
          (cfg.scope === 'department' && cfg.scopeId === ctx.departmentId) ||
          (cfg.scope === 'location' && cfg.scopeId === ctx.locationId);
        if (
          typeApplies &&
          scopeApplies &&
          overlaps(ctx.startDate, ctx.endDate, cfg.startDate, cfg.endDate)
        ) {
          return {
            code: 'LEAVE_BLACKOUT',
            message: `Leave is not allowed during ${rule.name} (${cfg.startDate} to ${cfg.endDate}).`,
            ruleId: rule.id,
          };
        }
        break;
      }
      case 'min_notice': {
        const cfg = c as unknown as MinNoticeConfig;
        if (cfg.leaveTypeId !== ctx.leaveTypeId) break;
        const notice = daysBetweenInclusive(ctx.today, ctx.startDate) - 1;
        if (notice < cfg.days) {
          return {
            code: 'LEAVE_MIN_NOTICE',
            message: `${ctx.leaveTypeName(cfg.leaveTypeId)} must be applied at least ${cfg.days} day(s) in advance.`,
            ruleId: rule.id,
          };
        }
        break;
      }
      case 'clubbing': {
        const cfg = c as unknown as ClubbingConfig;
        const other =
          cfg.leaveTypeIdA === ctx.leaveTypeId
            ? cfg.leaveTypeIdB
            : cfg.leaveTypeIdB === ctx.leaveTypeId
              ? cfg.leaveTypeIdA
              : null;
        if (!other) break;
        const adjacent = ctx.existing.some(
          (r) =>
            r.leaveTypeId === other &&
            ((r.endDate < ctx.startDate &&
              workingDaysStrictlyBetween(r.endDate, ctx.startDate, ctx.isNonWorkingDay) === 0) ||
              (r.startDate > ctx.endDate &&
                workingDaysStrictlyBetween(ctx.endDate, r.startDate, ctx.isNonWorkingDay) === 0)),
        );
        if (adjacent) {
          return {
            code: 'LEAVE_CLUBBING_BLOCKED',
            message: `${ctx.leaveTypeName(ctx.leaveTypeId)} cannot be combined with ${ctx.leaveTypeName(other)}.`,
            ruleId: rule.id,
          };
        }
        break;
      }
      case 'min_gap': {
        const cfg = c as unknown as MinGapConfig;
        if (cfg.leaveTypeId !== ctx.leaveTypeId) break;
        const tooClose = ctx.existing.some((r) => {
          if (r.leaveTypeId !== cfg.leaveTypeId) return false;
          if (r.endDate < ctx.startDate) {
            return (
              workingDaysStrictlyBetween(r.endDate, ctx.startDate, ctx.isNonWorkingDay) <
              cfg.workingDays
            );
          }
          if (r.startDate > ctx.endDate) {
            return (
              workingDaysStrictlyBetween(ctx.endDate, r.startDate, ctx.isNonWorkingDay) <
              cfg.workingDays
            );
          }
          return false;
        });
        if (tooClose) {
          return {
            code: 'LEAVE_MIN_GAP',
            message: `${ctx.leaveTypeName(cfg.leaveTypeId)} requests must be at least ${cfg.workingDays} working day(s) apart.`,
            ruleId: rule.id,
          };
        }
        break;
      }
      case 'frequency_cap': {
        const cfg = c as unknown as FrequencyCapConfig;
        if (cfg.leaveTypeId !== ctx.leaveTypeId) break;
        const sameType = ctx.existing.filter((r) => r.leaveTypeId === cfg.leaveTypeId);
        const month = ctx.startDate.slice(0, 7);
        if (
          cfg.maxPerMonth !== null &&
          sameType.filter((r) => r.startDate.slice(0, 7) === month).length + 1 > cfg.maxPerMonth
        ) {
          return {
            code: 'LEAVE_FREQUENCY_CAP',
            message: `At most ${cfg.maxPerMonth} ${ctx.leaveTypeName(cfg.leaveTypeId)} request(s) are allowed per month.`,
            ruleId: rule.id,
          };
        }
        if (
          cfg.maxPerCycle !== null &&
          sameType.filter((r) => r.startDate >= ctx.cycle.start && r.startDate <= ctx.cycle.end)
            .length +
            1 >
            cfg.maxPerCycle
        ) {
          return {
            code: 'LEAVE_FREQUENCY_CAP',
            message: `At most ${cfg.maxPerCycle} ${ctx.leaveTypeName(cfg.leaveTypeId)} request(s) are allowed per leave year.`,
            ruleId: rule.id,
          };
        }
        break;
      }
      default:
        break;
    }
  }
  return null;
}

/** Days on which the department would exceed its concurrency limit (warn-only, Decision D7). */
export function teamConcurrencyWarning(
  cfg: TeamConcurrencyConfig,
  startDate: string,
  endDate: string,
  headcount: number,
  others: Array<{ startDate: string; endDate: string }>,
): string | null {
  const limit = Math.min(
    cfg.maxCount ?? Number.POSITIVE_INFINITY,
    cfg.maxPercent !== null
      ? Math.floor((headcount * cfg.maxPercent) / 100)
      : Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(limit)) return null;
  const crowded = eachDate(startDate, endDate).filter(
    (d) => others.filter((o) => o.startDate <= d && o.endDate >= d).length + 1 > limit,
  );
  return crowded.length > 0
    ? `Team concurrency limit (${limit} on leave) would be exceeded on ${crowded.slice(0, 3).join(', ')}${crowded.length > 3 ? '…' : ''}.`
    : null;
}
