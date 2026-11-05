import { and, asc, count, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  holidayCalendarLocations,
  holidayCalendars,
  holidays,
  locations,
  type HolidayCalendarRecord,
  type HolidayRecord,
  type NewHolidayCalendarRecord,
  type NewHolidayRecord,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export class LeaveHolidaysRepository {
  async listCalendars(
    tenantId: string,
    companyId: string,
    year?: number,
  ): Promise<Array<HolidayCalendarRecord & { holidayCount: number; locationIds: string[] }>> {
    const db = getDb();
    const conditions = [
      eq(holidayCalendars.tenantId, tenantId),
      eq(holidayCalendars.companyId, companyId),
    ];
    if (year) conditions.push(eq(holidayCalendars.year, year));
    const rows = await db
      .select()
      .from(holidayCalendars)
      .where(and(...conditions))
      .orderBy(asc(holidayCalendars.year), asc(holidayCalendars.name));
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [counts, locs] = await Promise.all([
      db
        .select({ calendarId: holidays.calendarId, n: count() })
        .from(holidays)
        .where(inArray(holidays.calendarId, ids))
        .groupBy(holidays.calendarId),
      db
        .select({
          calendarId: holidayCalendarLocations.calendarId,
          locationId: holidayCalendarLocations.locationId,
        })
        .from(holidayCalendarLocations)
        .where(inArray(holidayCalendarLocations.calendarId, ids)),
    ]);
    return rows.map((r) => ({
      ...r,
      holidayCount: Number(counts.find((c) => c.calendarId === r.id)?.n ?? 0),
      locationIds: locs.filter((l) => l.calendarId === r.id).map((l) => l.locationId),
    }));
  }

  async findCalendar(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<HolidayCalendarRecord | null> {
    const [row] = await getDb()
      .select()
      .from(holidayCalendars)
      .where(
        and(
          eq(holidayCalendars.tenantId, tenantId),
          eq(holidayCalendars.companyId, companyId),
          eq(holidayCalendars.id, id),
        ),
      );
    return row ?? null;
  }

  async findCalendarByName(
    companyId: string,
    name: string,
    year: number,
  ): Promise<HolidayCalendarRecord | null> {
    const [row] = await getDb()
      .select()
      .from(holidayCalendars)
      .where(
        and(
          eq(holidayCalendars.companyId, companyId),
          eq(holidayCalendars.year, year),
          eq(sql`LOWER(${holidayCalendars.name})`, name.toLowerCase()),
        ),
      );
    return row ?? null;
  }

  async getLocationIds(calendarId: string): Promise<string[]> {
    const rows = await getDb()
      .select({ locationId: holidayCalendarLocations.locationId })
      .from(holidayCalendarLocations)
      .where(eq(holidayCalendarLocations.calendarId, calendarId));
    return rows.map((r) => r.locationId);
  }

  async getHolidays(calendarId: string, from?: string, to?: string): Promise<HolidayRecord[]> {
    const conditions = [eq(holidays.calendarId, calendarId)];
    if (from) conditions.push(gte(holidays.date, from));
    if (to) conditions.push(lte(holidays.date, to));
    return getDb()
      .select()
      .from(holidays)
      .where(and(...conditions))
      .orderBy(asc(holidays.date));
  }

  async findHoliday(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<HolidayRecord | null> {
    const [row] = await getDb()
      .select()
      .from(holidays)
      .where(
        and(
          eq(holidays.tenantId, tenantId),
          eq(holidays.companyId, companyId),
          eq(holidays.id, id),
        ),
      );
    return row ?? null;
  }

  async countActiveLocations(tenantId: string, companyId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const [row] = await getDb()
      .select({ n: count() })
      .from(locations)
      .where(
        and(
          eq(locations.tenantId, tenantId),
          eq(locations.companyId, companyId),
          eq(locations.status, 'active'),
          inArray(locations.id, ids),
        ),
      );
    return Number(row?.n ?? 0);
  }

  /** Published calendars of the same year already mapped to any of the given locations. */
  async findPublishedLocationConflicts(
    companyId: string,
    year: number,
    locationIds: string[],
    excludeCalendarId: string,
  ): Promise<Array<{ calendarName: string; locationId: string }>> {
    if (locationIds.length === 0) return [];
    return getDb()
      .select({
        calendarName: holidayCalendars.name,
        locationId: holidayCalendarLocations.locationId,
      })
      .from(holidayCalendarLocations)
      .innerJoin(holidayCalendars, eq(holidayCalendars.id, holidayCalendarLocations.calendarId))
      .where(
        and(
          eq(holidayCalendars.companyId, companyId),
          eq(holidayCalendars.year, year),
          eq(holidayCalendars.status, 'published'),
          ne(holidayCalendars.id, excludeCalendarId),
          inArray(holidayCalendarLocations.locationId, locationIds),
        ),
      );
  }

  async createCalendar(record: NewHolidayCalendarRecord, locationIds: string[]): Promise<void> {
    await getDb().transaction(async (tx) => {
      if (record.isDefault) await this.clearDefault(tx, record.companyId, record.year, record.id);
      await tx.insert(holidayCalendars).values(record);
      await this.replaceLocations(tx, record, locationIds);
    });
  }

  async updateCalendar(
    calendar: HolidayCalendarRecord,
    patch: Partial<NewHolidayCalendarRecord>,
    locationIds?: string[],
  ): Promise<void> {
    await getDb().transaction(async (tx) => {
      if (patch.isDefault)
        await this.clearDefault(tx, calendar.companyId, calendar.year, calendar.id);
      await tx
        .update(holidayCalendars)
        .set({
          ...patch,
          ...(calendar.status === 'published' ? { revision: calendar.revision + 1 } : {}),
        })
        .where(eq(holidayCalendars.id, calendar.id));
      if (locationIds) await this.replaceLocations(tx, calendar, locationIds);
    });
  }

  /** Bumps the revision of a published calendar after its holidays change. */
  async touchRevision(calendar: HolidayCalendarRecord): Promise<void> {
    if (calendar.status !== 'published') return;
    await getDb()
      .update(holidayCalendars)
      .set({ revision: sql`${holidayCalendars.revision} + 1` })
      .where(eq(holidayCalendars.id, calendar.id));
  }

  async deleteCalendar(id: string): Promise<void> {
    await getDb().delete(holidayCalendars).where(eq(holidayCalendars.id, id));
  }

  async insertHolidays(rows: NewHolidayRecord[]): Promise<void> {
    if (rows.length === 0) return;
    await getDb().transaction(async (tx) => {
      await tx.insert(holidays).values(rows);
    });
  }

  async updateHoliday(id: string, patch: Partial<NewHolidayRecord>): Promise<void> {
    await getDb().update(holidays).set(patch).where(eq(holidays.id, id));
  }

  async deleteHoliday(id: string): Promise<void> {
    await getDb().delete(holidays).where(eq(holidays.id, id));
  }

  /**
   * The published calendar that applies to an employee for a leave year: the one mapped to their
   * location, otherwise the company default.
   */
  async findPublishedCalendarFor(
    tenantId: string,
    companyId: string,
    year: number,
    locationId: string | null,
  ): Promise<HolidayCalendarRecord | null> {
    const db = getDb();
    const base = and(
      eq(holidayCalendars.tenantId, tenantId),
      eq(holidayCalendars.companyId, companyId),
      eq(holidayCalendars.year, year),
      eq(holidayCalendars.status, 'published'),
    );
    if (locationId) {
      const [mapped] = await db
        .select({ calendar: holidayCalendars })
        .from(holidayCalendars)
        .innerJoin(
          holidayCalendarLocations,
          eq(holidayCalendarLocations.calendarId, holidayCalendars.id),
        )
        .where(and(base, eq(holidayCalendarLocations.locationId, locationId)))
        .limit(1);
      if (mapped) return mapped.calendar;
    }
    const [fallback] = await db
      .select()
      .from(holidayCalendars)
      .where(and(base, eq(holidayCalendars.isDefault, true)))
      .limit(1);
    return fallback ?? null;
  }

  private async clearDefault(tx: Tx, companyId: string, year: number, exceptId: string) {
    await tx
      .update(holidayCalendars)
      .set({ isDefault: false })
      .where(
        and(
          eq(holidayCalendars.companyId, companyId),
          eq(holidayCalendars.year, year),
          ne(holidayCalendars.id, exceptId),
        ),
      );
  }

  private async replaceLocations(
    tx: Tx,
    calendar: { id: string; tenantId: string; companyId: string },
    locationIds: string[],
  ) {
    await tx
      .delete(holidayCalendarLocations)
      .where(eq(holidayCalendarLocations.calendarId, calendar.id));
    if (locationIds.length === 0) return;
    await tx.insert(holidayCalendarLocations).values(
      locationIds.map((locationId) => ({
        id: generateSurrogateId('hcl'),
        tenantId: calendar.tenantId,
        companyId: calendar.companyId,
        calendarId: calendar.id,
        locationId,
      })),
    );
  }
}

export const leaveHolidaysRepository = new LeaveHolidaysRepository();
