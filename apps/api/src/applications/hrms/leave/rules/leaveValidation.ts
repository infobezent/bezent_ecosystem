/**
 * HRMS Leave Domain — shared validation helpers.
 *
 * Pure functions used by the leave settings services. Request payloads are untrusted,
 * so every enum, number and date is re-validated server-side.
 */

import { BadRequestError } from '../../../../app/errors/AppError.js';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-31). */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Today's date (`YYYY-MM-DD`) in the given IANA timezone; falls back to UTC. */
export function localDateInTimezone(timeZone: string | null | undefined, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new BadRequestError(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

/** Parses an optional numeric input; `null`/`''` mean "not set". Rejects NaN and Infinity. */
export function parseOptionalNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new BadRequestError(`${field} must be a valid number.`);
  }
  return n;
}

export function parseOptionalInteger(value: unknown, field: string): number | null {
  const n = parseOptionalNumber(value, field);
  if (n !== null && !Number.isInteger(n)) {
    throw new BadRequestError(`${field} must be a whole number.`);
  }
  return n;
}

/** Day quantities in V1 are whole or half days. */
export function isHalfDayMultiple(n: number): boolean {
  return Number.isInteger(n * 2);
}

export function isDuplicateKeyError(err: unknown): boolean {
  const e = err as { code?: string; errno?: number; message?: string; cause?: unknown } | null;
  if (!e) return false;
  if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) return true;
  if (typeof e.message === 'string' && e.message.includes('Duplicate entry')) return true;
  return e.cause ? isDuplicateKeyError(e.cause) : false;
}
