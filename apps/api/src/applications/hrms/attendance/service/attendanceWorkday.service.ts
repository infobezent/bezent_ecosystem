import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';
import { defaultShiftScheduleProvider } from './shiftSchedule.provider.js';

/**
 * Validates whether a given string is a valid IANA timezone identifier.
 */
export function isValidTimezone(timeZone: string | null | undefined): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Formats a date as YYYY-MM-DD in the given timezone without server host dependence. */
export function formatDateInTimezone(date: Date, timeZone: string = 'UTC'): string {
  const validTz = isValidTimezone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value.padStart(2, '0') ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value.padStart(2, '0') ?? '01';
  return `${year}-${month}-${day}`;
}

/** Formats time as HH:mm (24-hour) in the given timezone without server host dependence. */
export function formatTimeInTimezone(date: Date, timeZone: string = 'UTC'): string {
  const validTz = isValidTimezone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') ?? '00';
  const normalizedHour = hour === '24' ? '00' : hour;
  return `${normalizedHour}:${minute}`;
}

/**
 * Which attendance workday does "now" belong to?
 *
 * The company's day boundary (HR Settings -> Attendance -> General) is the clock
 * time at which a new attendance day starts. With a 04:00 boundary a 01:30
 * punch still belongs to the previous workday, which is what lets night-shift
 * employees check out after midnight. A boundary of 00:00 (the default) keeps the
 * plain calendar date.
 */

export function boundaryToMilliseconds(boundaryTime: string | null | undefined): number {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(boundaryTime ?? '');
  if (!match) return 0;
  const [hours, minutes, seconds] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  if (hours > 23 || minutes > 59 || seconds > 59) return 0;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

/** Local-time workday (YYYY-MM-DD) of `now` for a given day boundary and timezone. */
export function resolveWorkday(
  now: Date,
  boundaryTime: string | null | undefined,
  timeZone?: string,
): string {
  const shifted = new Date(now.getTime() - boundaryToMilliseconds(boundaryTime));
  if (timeZone) {
    const validTz = isValidTimezone(timeZone) ? timeZone : 'UTC';
    return formatDateInTimezone(shifted, validTz);
  }
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${shifted.getFullYear()}-${month}-${day}`;
}

export class AttendanceWorkdayService {
  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
  ) {}

  /**
   * Resolves effective timezone according to canonical precedence:
   * 1. Assigned employee shift schedule timezone (if valid IANA)
   * 2. Company general attendance settings timezone (if valid IANA)
   * 3. Fallback: 'UTC' (never silently defaulted to server host timezone)
   */
  async resolveTimezone(tenantId: string, companyId: string, employeeId?: string): Promise<string> {
    if (employeeId) {
      const schedule = await defaultShiftScheduleProvider.getRawSchedule(
        tenantId,
        companyId,
        employeeId,
      );
      if (schedule?.timeZone && isValidTimezone(schedule.timeZone)) {
        return schedule.timeZone;
      }
    }
    const settings = await this.settingsRepo.getGeneralSettings(tenantId, companyId);
    if (settings?.timezone && isValidTimezone(settings.timezone)) {
      return settings.timezone;
    }
    return 'UTC';
  }

  async currentWorkday(
    tenantId: string,
    companyId: string,
    now: Date = new Date(),
    employeeId?: string,
  ): Promise<string> {
    const [settings, timezone] = await Promise.all([
      this.settingsRepo.getGeneralSettings(tenantId, companyId),
      this.resolveTimezone(tenantId, companyId, employeeId),
    ]);
    return resolveWorkday(now, settings?.dayBoundaryTime, timezone);
  }
}

export const attendanceWorkdayService = new AttendanceWorkdayService();
