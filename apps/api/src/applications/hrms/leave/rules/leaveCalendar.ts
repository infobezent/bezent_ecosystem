/**
 * HRMS Leave Domain — calendar & duration rules (pure, deterministic).
 *
 * Dates are `YYYY-MM-DD` strings handled as UTC calendar days, so results never depend on the
 * server timezone. Day quantities are computed in integer half-days (PO Decision #13).
 */

import type { DayCountingMethod, HalfDaySession, LeaveYearCycle } from '../types/settings.types.js';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function toUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(start: string, end: string): number {
  return Math.round((toUtc(end).getTime() - toUtc(start).getTime()) / 86_400_000) + 1;
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function weekdayName(date: string): string {
  return WEEKDAYS[toUtc(date).getUTCDay()]!;
}

export interface LeaveCycle {
  start: string;
  end: string;
  /** e.g. "2026" or "FY 2026-27" */
  label: string;
  /** Calendar year in which the cycle starts. */
  startYear: number;
}

/** The leave year containing `date` (half-open [start, nextStart) expressed with an inclusive end). */
export function leaveCycleFor(
  date: string,
  cycle: LeaveYearCycle,
  customYearStartDate: string | null,
): LeaveCycle {
  const startMonthDay =
    cycle === 'calendar_year'
      ? '01-01'
      : cycle === 'financial_year'
        ? '04-01'
        : customYearStartDate;
  if (!startMonthDay) throw new Error('Custom leave year requires a start date.');

  const year = Number(date.slice(0, 4));
  const thisYearStart = `${year}-${startMonthDay}`;
  const startYear = date >= thisYearStart ? year : year - 1;
  const start = `${startYear}-${startMonthDay}`;
  const end = addDays(`${startYear + 1}-${startMonthDay}`, -1);

  const label =
    startMonthDay === '01-01'
      ? String(startYear)
      : cycle === 'financial_year'
        ? `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
        : `${start} to ${end}`;
  return { start, end, label, startYear };
}

/** The leave year that starts in `startYear`. */
export function cycleForStartYear(
  startYear: number,
  cycle: LeaveYearCycle,
  customYearStartDate: string | null,
): LeaveCycle {
  const startMonthDay =
    cycle === 'calendar_year'
      ? '01-01'
      : cycle === 'financial_year'
        ? '04-01'
        : customYearStartDate;
  if (!startMonthDay) throw new Error('Custom leave year requires a start date.');
  return leaveCycleFor(`${startYear}-${startMonthDay}`, cycle, customYearStartDate);
}

export type DayTreatment = 'inherit' | 'count' | 'exclude';

export interface DurationInput {
  startDate: string;
  endDate: string;
  dayCountingMethod: DayCountingMethod;
  /** Lower-case weekday names the employee works, e.g. ['monday', ...]. */
  workingDays: string[];
  holidays: Map<string, string>; // date -> holiday code
  weeklyOffTreatment: DayTreatment;
  holidayTreatment: DayTreatment;
  sandwichRuleEnabled: boolean;
  session: HalfDaySession | null;
}

export interface ScheduleBreakdownItem {
  date: string;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayCode: string | null;
  chargedDays: number;
  exclusionReasons: string[];
}

export interface DurationResult {
  totalDays: number;
  breakdown: ScheduleBreakdownItem[];
}

/**
 * Charged leave days for a date range.
 *
 * A non-working day (weekly off or holiday) is charged when its treatment says `count`, or when it
 * is `inherit` and the company counts calendar days. With the sandwich rule, excluded non-working
 * days that sit between two charged days inside the request are charged as well.
 */
export function computeLeaveDuration(input: DurationInput): DurationResult {
  const counts = (treatment: DayTreatment) =>
    treatment === 'count' ||
    (treatment === 'inherit' && input.dayCountingMethod === 'calendar_days');
  const countWeeklyOff = counts(input.weeklyOffTreatment);
  const countHoliday = counts(input.holidayTreatment);
  const working = new Set(input.workingDays.map((d) => d.toLowerCase()));

  const breakdown: ScheduleBreakdownItem[] = eachDate(input.startDate, input.endDate).map(
    (date) => {
      const isWeeklyOff = !working.has(weekdayName(date));
      const holidayCode = input.holidays.get(date) ?? null;
      const isHoliday = holidayCode !== null;
      const exclusionReasons: string[] = [];
      if (isWeeklyOff && !countWeeklyOff) exclusionReasons.push('weekly_off');
      if (isHoliday && !countHoliday) exclusionReasons.push('holiday');
      return {
        date,
        isWeeklyOff,
        isHoliday,
        holidayCode,
        chargedDays: exclusionReasons.length === 0 ? 1 : 0,
        exclusionReasons,
      };
    },
  );

  if (input.sandwichRuleEnabled) {
    const charged = breakdown.map((b) => b.chargedDays > 0);
    const first = charged.indexOf(true);
    const last = charged.lastIndexOf(true);
    for (let i = first + 1; i < last; i++) {
      const item = breakdown[i]!;
      if (item.chargedDays === 0) {
        item.chargedDays = 1;
        item.exclusionReasons = [];
      }
    }
  }

  if (input.session && breakdown.length === 1 && breakdown[0]!.chargedDays === 1) {
    breakdown[0]!.chargedDays = 0.5;
  }

  // Sum in half-days to stay exact.
  const halfDays = breakdown.reduce((sum, b) => sum + Math.round(b.chargedDays * 2), 0);
  return { totalDays: halfDays / 2, breakdown };
}
