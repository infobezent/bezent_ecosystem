import {
  LeaveHolidaysRepository,
  leaveHolidaysRepository,
} from '../repository/leaveHolidays.repository.js';
import {
  LeaveGeneralSettingsService,
  leaveGeneralSettingsService,
} from './leaveGeneralSettings.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import { auditService, AuditService } from '../../../../platform/audit/service/audit.service.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  assertEnum,
  isDuplicateKeyError,
  isValidIsoDate,
  parseOptionalInteger,
} from '../rules/leaveValidation.js';
import { cycleForStartYear, leaveCycleFor, weekdayName } from '../rules/leaveCalendar.js';
import type { HolidayCalendarRecord, NewHolidayRecord } from '../../../../db/schema.js';
import {
  HOLIDAY_TYPES,
  type CreateHolidayCalendarDto,
  type HolidayCalendarDetail,
  type HolidayCalendarSummary,
  type HolidayDto,
  type HolidayImportResult,
  type ResolvedHolidayCalendar,
  type UpdateHolidayCalendarDto,
} from '../types/leaveHolidays.types.js';

const MAX_IMPORT_ROWS = 200;

export class LeaveHolidaysService {
  constructor(
    private readonly repo: LeaveHolidaysRepository = leaveHolidaysRepository,
    private readonly settings: Pick<
      LeaveGeneralSettingsService,
      'getSettings'
    > = leaveGeneralSettingsService,
    private readonly audit: Pick<AuditService, 'logEvent'> = auditService,
  ) {}

  async listCalendars(
    tenantId: string,
    companyId: string,
    year?: number,
  ): Promise<HolidayCalendarSummary[]> {
    const [rows, cycleOf] = await Promise.all([
      this.repo.listCalendars(tenantId, companyId, year),
      this.cycleResolver(tenantId, companyId),
    ]);
    return rows.map((r) => {
      const cycle = cycleOf(r.year);
      return { ...r, cycleStart: cycle.start, cycleEnd: cycle.end };
    });
  }

  async getCalendar(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<HolidayCalendarDetail> {
    const calendar = await this.requireCalendar(tenantId, companyId, id);
    const [holidayRows, locationIds, cycleOf] = await Promise.all([
      this.repo.getHolidays(id),
      this.repo.getLocationIds(id),
      this.cycleResolver(tenantId, companyId),
    ]);
    const cycle = cycleOf(calendar.year);
    return {
      ...calendar,
      holidays: holidayRows,
      holidayCount: holidayRows.length,
      locationIds,
      cycleStart: cycle.start,
      cycleEnd: cycle.end,
    };
  }

  async createCalendar(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: CreateHolidayCalendarDto,
  ): Promise<HolidayCalendarDetail> {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');
    const name = this.validateName(dto.name, 'Calendar name');
    const year = parseOptionalInteger(dto.year, 'Year');
    if (year === null || year < 2000 || year > 2100) {
      throw new BadRequestError('Year must be a whole number between 2000 and 2100.');
    }
    if (await this.repo.findCalendarByName(companyId, name, year)) {
      throw new ConflictError(`A holiday calendar named "${name}" already exists for ${year}.`);
    }
    const locationIds = await this.validateLocations(tenantId, companyId, dto.locationIds ?? []);

    const id = generateSurrogateId('hcal');
    await this.withDuplicateGuard(() =>
      this.repo.createCalendar(
        {
          id,
          tenantId,
          companyId,
          name,
          year,
          isDefault: dto.isDefault === true,
          optionalHolidayQuota: this.validateQuota(dto.optionalHolidayQuota),
          createdByUserId: userId,
        },
        locationIds,
      ),
    );
    await this.logAudit(userId, 'holiday_calendar_created', tenantId, companyId, id, {
      name,
      year,
    });
    return this.getCalendar(tenantId, companyId, id);
  }

  async updateCalendar(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateHolidayCalendarDto,
  ): Promise<HolidayCalendarDetail> {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');
    const calendar = await this.requireCalendar(tenantId, companyId, id);
    const patch: Partial<HolidayCalendarRecord> = {};

    if (dto.name !== undefined) {
      const name = this.validateName(dto.name, 'Calendar name');
      const dup = await this.repo.findCalendarByName(companyId, name, calendar.year);
      if (dup && dup.id !== id) {
        throw new ConflictError(
          `A holiday calendar named "${name}" already exists for ${calendar.year}.`,
        );
      }
      patch.name = name;
    }
    if (dto.optionalHolidayQuota !== undefined) {
      patch.optionalHolidayQuota = this.validateQuota(dto.optionalHolidayQuota);
    }
    if (dto.isDefault !== undefined) {
      if (typeof dto.isDefault !== 'boolean')
        throw new BadRequestError('isDefault must be true or false.');
      patch.isDefault = dto.isDefault;
    }

    let locationIds: string[] | undefined;
    if (dto.locationIds !== undefined) {
      locationIds = await this.validateLocations(tenantId, companyId, dto.locationIds);
      if (calendar.status === 'published') {
        await this.assertNoLocationConflict(calendar, locationIds);
      }
    }

    await this.withDuplicateGuard(() => this.repo.updateCalendar(calendar, patch, locationIds));
    await this.logAudit(userId, 'holiday_calendar_updated', tenantId, companyId, id, {
      fieldsUpdated: Object.keys(dto),
    });
    return this.getCalendar(tenantId, companyId, id);
  }

  /** Publishing makes the calendar authoritative for leave day counting. */
  async publishCalendar(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
  ): Promise<HolidayCalendarDetail> {
    const calendar = await this.requireCalendar(tenantId, companyId, id);
    if (calendar.status === 'published') return this.getCalendar(tenantId, companyId, id);

    await this.assertNoLocationConflict(calendar, await this.repo.getLocationIds(id));
    await this.repo.updateCalendar(calendar, { status: 'published', publishedAt: new Date() });
    await this.logAudit(userId, 'holiday_calendar_published', tenantId, companyId, id, {
      name: calendar.name,
      year: calendar.year,
    });
    return this.getCalendar(tenantId, companyId, id);
  }

  async deleteCalendar(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    const calendar = await this.requireCalendar(tenantId, companyId, id);
    if (calendar.status === 'published') {
      throw new BadRequestError(
        'Published calendars cannot be deleted; they may be referenced by leave requests.',
      );
    }
    await this.repo.deleteCalendar(id);
    await this.logAudit(userId, 'holiday_calendar_deleted', tenantId, companyId, id, {
      name: calendar.name,
    });
  }

  async addHoliday(
    tenantId: string,
    companyId: string,
    calendarId: string,
    userId: string,
    dto: HolidayDto,
  ): Promise<HolidayCalendarDetail> {
    const calendar = await this.requireCalendar(tenantId, companyId, calendarId);
    const cycle = (await this.cycleResolver(tenantId, companyId))(calendar.year);
    const row = this.validateHoliday(dto, cycle);
    await this.withDuplicateGuard(
      () =>
        this.repo.insertHolidays([
          { id: generateSurrogateId('hol'), tenantId, companyId, calendarId, ...row },
        ]),
      `A holiday already exists on ${row.date} in this calendar.`,
    );
    await this.repo.touchRevision(calendar);
    await this.logAudit(userId, 'holiday_added', tenantId, companyId, calendarId, row);
    return this.getCalendar(tenantId, companyId, calendarId);
  }

  async updateHoliday(
    tenantId: string,
    companyId: string,
    holidayId: string,
    userId: string,
    dto: Partial<HolidayDto>,
  ): Promise<HolidayCalendarDetail> {
    const existing = await this.repo.findHoliday(tenantId, companyId, holidayId);
    if (!existing) throw new NotFoundError('Holiday not found.');
    const calendar = await this.requireCalendar(tenantId, companyId, existing.calendarId);
    const cycle = (await this.cycleResolver(tenantId, companyId))(calendar.year);
    const row = this.validateHoliday({ ...existing, ...dto }, cycle);
    await this.withDuplicateGuard(
      () => this.repo.updateHoliday(holidayId, row),
      `A holiday already exists on ${row.date} in this calendar.`,
    );
    await this.repo.touchRevision(calendar);
    await this.logAudit(userId, 'holiday_updated', tenantId, companyId, calendar.id, {
      holidayId,
      before: { date: existing.date, name: existing.name, type: existing.type },
      after: row,
    });
    return this.getCalendar(tenantId, companyId, calendar.id);
  }

  async deleteHoliday(
    tenantId: string,
    companyId: string,
    holidayId: string,
    userId: string,
  ): Promise<HolidayCalendarDetail> {
    const existing = await this.repo.findHoliday(tenantId, companyId, holidayId);
    if (!existing) throw new NotFoundError('Holiday not found.');
    const calendar = await this.requireCalendar(tenantId, companyId, existing.calendarId);
    await this.repo.deleteHoliday(holidayId);
    await this.repo.touchRevision(calendar);
    await this.logAudit(userId, 'holiday_deleted', tenantId, companyId, calendar.id, {
      date: existing.date,
      name: existing.name,
    });
    return this.getCalendar(tenantId, companyId, calendar.id);
  }

  /** Copies holidays from another calendar, shifted to this calendar's year; existing dates are kept. */
  async copyFrom(
    tenantId: string,
    companyId: string,
    calendarId: string,
    userId: string,
    sourceCalendarId: unknown,
  ): Promise<{ copied: number; skipped: number; calendar: HolidayCalendarDetail }> {
    if (typeof sourceCalendarId !== 'string' || !sourceCalendarId) {
      throw new BadRequestError('Source calendar is required.');
    }
    const target = await this.requireCalendar(tenantId, companyId, calendarId);
    const source = await this.requireCalendar(tenantId, companyId, sourceCalendarId);
    const cycle = (await this.cycleResolver(tenantId, companyId))(target.year);
    const shift = target.year - source.year;
    const existingDates = new Set((await this.repo.getHolidays(target.id)).map((h) => h.date));

    const rows: NewHolidayRecord[] = [];
    let skipped = 0;
    for (const h of await this.repo.getHolidays(source.id)) {
      const date = `${Number(h.date.slice(0, 4)) + shift}${h.date.slice(4)}`;
      if (
        !isValidIsoDate(date) ||
        date < cycle.start ||
        date > cycle.end ||
        existingDates.has(date)
      ) {
        skipped++;
        continue;
      }
      existingDates.add(date);
      rows.push({
        id: generateSurrogateId('hol'),
        tenantId,
        companyId,
        calendarId: target.id,
        date,
        name: h.name,
        type: h.type,
        description: h.description,
      });
    }
    await this.repo.insertHolidays(rows);
    if (rows.length > 0) await this.repo.touchRevision(target);
    await this.logAudit(userId, 'holiday_calendar_copied', tenantId, companyId, target.id, {
      sourceCalendarId,
      copied: rows.length,
      skipped,
    });
    return {
      copied: rows.length,
      skipped,
      calendar: await this.getCalendar(tenantId, companyId, target.id),
    };
  }

  /**
   * CSV import (`date,name,type` per line; header optional). All rows are validated first; if any
   * row is invalid nothing is imported and the row-level report is returned.
   */
  async importCsv(
    tenantId: string,
    companyId: string,
    calendarId: string,
    userId: string,
    csv: unknown,
  ): Promise<HolidayImportResult> {
    if (typeof csv !== 'string' || !csv.trim())
      throw new BadRequestError('CSV content is required.');
    const calendar = await this.requireCalendar(tenantId, companyId, calendarId);
    const cycle = (await this.cycleResolver(tenantId, companyId))(calendar.year);
    const existingDates = new Set((await this.repo.getHolidays(calendarId)).map((h) => h.date));

    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines[0]?.toLowerCase().startsWith('date,')) lines.shift();
    if (lines.length > MAX_IMPORT_ROWS) {
      throw new BadRequestError(`At most ${MAX_IMPORT_ROWS} rows can be imported at once.`);
    }

    const errors: HolidayImportResult['errors'] = [];
    const rows: NewHolidayRecord[] = [];
    lines.forEach((line, i) => {
      const [date = '', name = '', type = 'mandatory'] = line.split(',').map((c) => c.trim());
      try {
        const row = this.validateHoliday(
          { date, name, type: (type || 'mandatory') as never },
          cycle,
        );
        if (existingDates.has(row.date))
          throw new BadRequestError(`${row.date} already has a holiday.`);
        existingDates.add(row.date);
        rows.push({ id: generateSurrogateId('hol'), tenantId, companyId, calendarId, ...row });
      } catch (err) {
        errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'Invalid row.' });
      }
    });

    if (errors.length > 0) return { imported: 0, errors };
    await this.repo.insertHolidays(rows);
    if (rows.length > 0) await this.repo.touchRevision(calendar);
    await this.logAudit(userId, 'holidays_imported', tenantId, companyId, calendarId, {
      imported: rows.length,
    });
    return { imported: rows.length, errors: [] };
  }

  /** The published calendar for an employee's leave year containing `date`, with its holidays. */
  async resolveForEmployee(
    tenantId: string,
    companyId: string,
    locationId: string | null,
    date: string,
  ): Promise<ResolvedHolidayCalendar | null> {
    const { settings } = await this.settings.getSettings(tenantId, companyId);
    const cycle = leaveCycleFor(date, settings.leaveYearCycle, settings.customYearStartDate);
    const calendar = await this.repo.findPublishedCalendarFor(
      tenantId,
      companyId,
      cycle.startYear,
      locationId,
    );
    if (!calendar) return null;
    return {
      calendarId: calendar.id,
      revision: calendar.revision,
      optionalHolidayQuota: calendar.optionalHolidayQuota,
      holidays: await this.repo.getHolidays(calendar.id, cycle.start, cycle.end),
    };
  }

  /** Holidays for ESS display: the employee's calendar for the current leave year. */
  async listForEmployee(
    tenantId: string,
    companyId: string,
    locationId: string | null,
    today: string,
  ): Promise<Array<{ name: string; date: string; dayOfWeek: string; type: string }>> {
    const resolved = await this.resolveForEmployee(tenantId, companyId, locationId, today);
    return (resolved?.holidays ?? []).map((h) => {
      const day = weekdayName(h.date);
      return {
        name: h.name,
        date: h.date,
        dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
        type: h.type,
      };
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async cycleResolver(tenantId: string, companyId: string) {
    const { settings } = await this.settings.getSettings(tenantId, companyId);
    return (year: number) =>
      cycleForStartYear(year, settings.leaveYearCycle, settings.customYearStartDate);
  }

  private async requireCalendar(tenantId: string, companyId: string, id: string) {
    const calendar = await this.repo.findCalendar(tenantId, companyId, id);
    if (!calendar) throw new NotFoundError(`Holiday calendar "${id}" not found.`);
    return calendar;
  }

  private validateName(value: unknown, field: string): string {
    const name = typeof value === 'string' ? value.trim() : '';
    if (name.length < 2 || name.length > 100) {
      throw new BadRequestError(`${field} is required and must be between 2 and 100 characters.`);
    }
    return name;
  }

  private validateQuota(value: unknown): number {
    const quota = parseOptionalInteger(value, 'Optional holiday quota') ?? 0;
    if (quota < 0 || quota > 10) {
      throw new BadRequestError('Optional holiday quota must be a whole number between 0 and 10.');
    }
    return quota;
  }

  private validateHoliday(
    dto: Partial<HolidayDto>,
    cycle: { start: string; end: string },
  ): Pick<NewHolidayRecord, 'date' | 'name' | 'type' | 'description'> {
    if (!dto || !isValidIsoDate(dto.date)) {
      throw new BadRequestError('Holiday date must be a valid YYYY-MM-DD date.');
    }
    if (dto.date < cycle.start || dto.date > cycle.end) {
      throw new BadRequestError(
        `Holiday date ${dto.date} is outside this calendar's leave year (${cycle.start} to ${cycle.end}).`,
      );
    }
    const description =
      typeof dto.description === 'string' ? dto.description.trim().slice(0, 500) || null : null;
    return {
      date: dto.date,
      name: this.validateName(dto.name, 'Holiday name'),
      type: assertEnum(dto.type ?? 'mandatory', HOLIDAY_TYPES, 'Holiday type'),
      description,
    };
  }

  private async validateLocations(
    tenantId: string,
    companyId: string,
    raw: unknown,
  ): Promise<string[]> {
    if (!Array.isArray(raw) || raw.some((id) => typeof id !== 'string' || !id)) {
      throw new BadRequestError('Locations must be a list of location ids.');
    }
    const ids = [...new Set(raw as string[])];
    if ((await this.repo.countActiveLocations(tenantId, companyId, ids)) !== ids.length) {
      throw new BadRequestError('One or more selected locations were not found or are inactive.');
    }
    return ids;
  }

  private async assertNoLocationConflict(calendar: HolidayCalendarRecord, locationIds: string[]) {
    const conflicts = await this.repo.findPublishedLocationConflicts(
      calendar.companyId,
      calendar.year,
      locationIds,
      calendar.id,
    );
    if (conflicts.length > 0) {
      throw new ConflictError(
        `A location can have only one published calendar per year; already covered by "${conflicts[0]!.calendarName}".`,
      );
    }
  }

  private async withDuplicateGuard<T>(fn: () => Promise<T>, message?: string): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictError(
          message ?? 'A holiday calendar with this name already exists for that year.',
        );
      }
      throw err;
    }
  }

  private async logAudit(
    userId: string,
    action: string,
    tenantId: string,
    companyId: string,
    calendarId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.logEvent({
      actorUserId: userId,
      action,
      targetType: 'holiday_calendar',
      targetId: calendarId,
      tenantId,
      companyId,
      metadata,
    });
  }
}

export const leaveHolidaysService = new LeaveHolidaysService();
