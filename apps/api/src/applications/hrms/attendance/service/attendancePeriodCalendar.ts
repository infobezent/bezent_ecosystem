/**
 * Attendance period boundaries for the company's payroll cycle
 * (HR Settings -> Attendance -> Payroll & Locking).
 *
 * A period is identified by `YYYY-MM`:
 * - `calendar_month`: the 1st to the last day of that month.
 * - `custom_cutoff` (cutoff day N): ends on day N of that month (clamped to the
 *   month's length) and starts the day after the previous period ended.
 *   Example, cutoff 25: period `2026-10` is 2026-09-26 to 2026-10-25.
 */

export type PayrollCycleType = 'calendar_month' | 'custom_cutoff';

export interface PeriodBounds {
  periodCode: string;
  startDate: string;
  endDate: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampedCutoff(year: number, month: number, cutoffDay: number): number {
  return Math.min(Math.max(1, Math.trunc(cutoffDay)), daysInMonth(year, month));
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parsePeriodCode(periodCode: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(periodCode);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

export function computePeriodBounds(
  periodCode: string,
  cycleType: PayrollCycleType,
  cutoffDay: number,
): PeriodBounds | null {
  const parsed = parsePeriodCode(periodCode);
  if (!parsed) return null;
  const { year, month } = parsed;

  if (cycleType === 'calendar_month') {
    return {
      periodCode,
      startDate: `${year}-${pad(month)}-01`,
      endDate: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
    };
  }

  const endDay = clampedCutoff(year, month, cutoffDay);
  const prev = previousMonth(year, month);
  const prevEnd = `${prev.year}-${pad(prev.month)}-${pad(clampedCutoff(prev.year, prev.month, cutoffDay))}`;
  return {
    periodCode,
    startDate: addDays(prevEnd, 1),
    endDate: `${year}-${pad(month)}-${pad(endDay)}`,
  };
}

/** The period (code) a calendar date belongs to under the company's cycle. */
export function periodCodeForDate(
  isoDate: string,
  cycleType: PayrollCycleType,
  cutoffDay: number,
): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  if (cycleType === 'calendar_month' || day <= clampedCutoff(year, month, cutoffDay)) {
    return `${year}-${pad(month)}`;
  }
  const next = nextMonth(year, month);
  return `${next.year}-${pad(next.month)}`;
}

export function daysBetweenInclusive(startDate: string, endDate: string): number {
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}
