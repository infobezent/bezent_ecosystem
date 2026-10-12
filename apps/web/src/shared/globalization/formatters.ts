/**
 * BEZENT Locale-Aware Date, Time, Number and Policy Formatters
 *
 * INVARIANT: Never silently format corporate/policy dates (attendance logs,
 * pay periods, shift windows) using user browser timezone. Those MUST be
 * formatted with formatPolicyTimestamp using the company/policy timezone.
 */

export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

function toDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'string') {
    // If it's a date-only string like "YYYY-MM-DD", treat as noon UTC to avoid rollover
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const parts = input.split('-');
      const y = Number(parts[0]) || 2026;
      const m = Number(parts[1]) || 1;
      const d = Number(parts[2]) || 1;
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date using native Intl.DateTimeFormat.
 */
export function formatDate(
  input: Date | string | number | null | undefined,
  options: DateFormatOptions = {},
): string {
  const d = toDate(input);
  if (!d) return '—';
  try {
    const { locale = 'en-US', timeZone, dateStyle = 'medium' } = options;
    return new Intl.DateTimeFormat(locale, {
      dateStyle,
      ...(timeZone ? { timeZone } : {}),
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formats time using native Intl.DateTimeFormat.
 */
export function formatTime(
  input: Date | string | number | null | undefined,
  options: DateFormatOptions = {},
): string {
  const d = toDate(input);
  if (!d) return '—';
  try {
    const { locale = 'en-US', timeZone, timeStyle = 'short' } = options;
    return new Intl.DateTimeFormat(locale, {
      timeStyle,
      ...(timeZone ? { timeZone } : {}),
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formats full datetime using native Intl.DateTimeFormat.
 */
export function formatDateTime(
  input: Date | string | number | null | undefined,
  options: DateFormatOptions = {},
): string {
  const d = toDate(input);
  if (!d) return '—';
  try {
    const { locale = 'en-US', timeZone, dateStyle = 'medium', timeStyle = 'short' } = options;
    return new Intl.DateTimeFormat(locale, {
      dateStyle,
      timeStyle,
      ...(timeZone ? { timeZone } : {}),
    }).format(d);
  } catch {
    return '—';
  }
}

export interface PolicyTimestampOptions {
  locale?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

/**
 * Strictly formats a policy timestamp anchored to a specific policy timezone.
 * Used for attendance logs, punches, shift cutoffs, and payroll locks.
 */
export function formatPolicyTimestamp(
  input: Date | string | number | null | undefined,
  policyTimezone: string = 'UTC',
  optionsOrLocale: string | PolicyTimestampOptions = 'en-US',
  dateStyle: 'full' | 'long' | 'medium' | 'short' = 'medium',
  timeStyle: 'full' | 'long' | 'medium' | 'short' = 'short',
): string {
  const d = toDate(input);
  if (!d) return '—';
  try {
    let loc = 'en-US';
    let ds = dateStyle;
    let ts = timeStyle;
    if (typeof optionsOrLocale === 'object') {
      loc = optionsOrLocale.locale || 'en-US';
      ds = optionsOrLocale.dateStyle || 'medium';
      ts = optionsOrLocale.timeStyle || 'short';
    } else {
      loc = optionsOrLocale || 'en-US';
    }
    return new Intl.DateTimeFormat(loc, {
      timeZone: policyTimezone,
      dateStyle: ds,
      timeStyle: ts,
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formats a localized number or percentage.
 */
export function formatNumber(
  value: number,
  optionsOrLocale: Intl.NumberFormatOptions | string = 'en-US',
  maybeLocale: string = 'en-US',
): string {
  try {
    let options: Intl.NumberFormatOptions = {};
    let locale = 'en-US';
    if (typeof optionsOrLocale === 'string') {
      locale = optionsOrLocale;
    } else {
      options = optionsOrLocale;
      if (maybeLocale) locale = maybeLocale;
    }
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Formats relative time (e.g. "2 hours ago", "in 3 days").
 */
export function formatRelativeTime(
  targetDate: Date | string | number,
  baseDate: Date = new Date(),
  locale: string = 'en-US',
): string {
  try {
    const d = toDate(targetDate);
    if (!d) return '—';
    const target = d.getTime();
    const base = baseDate.getTime();
    const diffSecs = Math.round((target - base) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffSecs) < 60) return rtf.format(diffSecs, 'second');
    const diffMins = Math.round(diffSecs / 60);
    if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
    const diffHours = Math.round(diffMins / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
    const diffYears = Math.round(diffDays / 365);
    return rtf.format(diffYears, 'year');
  } catch {
    return String(targetDate);
  }
}

/**
 * Converts a Date to standard "YYYY-MM-DD" in local calendar day safely.
 */
export function formatDateIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
