import type { HolidayCalendarRecord, HolidayRecord } from '../../../../db/schema.js';

export type HolidayType = 'mandatory' | 'optional';
export const HOLIDAY_TYPES = ['mandatory', 'optional'] as const;

export interface HolidayCalendarSummary extends HolidayCalendarRecord {
  holidayCount: number;
  locationIds: string[];
  /** Leave-year bounds this calendar covers, from General Settings. */
  cycleStart: string;
  cycleEnd: string;
}

export interface HolidayCalendarDetail extends HolidayCalendarSummary {
  holidays: HolidayRecord[];
}

export interface CreateHolidayCalendarDto {
  name: string;
  year: number;
  isDefault?: boolean;
  optionalHolidayQuota?: number;
  locationIds?: string[];
}

export type UpdateHolidayCalendarDto = Partial<Omit<CreateHolidayCalendarDto, 'year'>>;

export interface HolidayDto {
  date: string;
  name: string;
  type?: HolidayType;
  description?: string | null;
}

export interface HolidayImportResult {
  imported: number;
  /** Row-level problems; when present nothing was imported. */
  errors: Array<{ row: number; message: string }>;
}

/** Resolved calendar for an employee's leave year (used by the request pipeline and ESS). */
export interface ResolvedHolidayCalendar {
  calendarId: string;
  revision: number;
  optionalHolidayQuota: number;
  holidays: HolidayRecord[];
}
