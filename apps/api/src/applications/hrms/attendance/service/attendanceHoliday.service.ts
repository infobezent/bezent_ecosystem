import { getDb } from '../../../../db/connection.js';
import { employees } from '../../../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import {
  leaveHolidaysService,
  type LeaveHolidaysService,
} from '../../leave/service/leaveHolidays.service.js';

export interface HolidayResolutionResult {
  isHoliday: boolean;
  holidayName: string | null;
  holidayType: string | null;
  calendarId: string | null;
}

export class AttendanceHolidayService {
  constructor(
    private readonly holidaysService: LeaveHolidaysService = leaveHolidaysService,
  ) {}

  async resolveHolidayForEmployee(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<HolidayResolutionResult> {
    const db = getDb();
    const [emp] = await db
      .select({ locationId: employees.locationId })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
        ),
      )
      .limit(1);

    const locationId = emp?.locationId ?? null;

    try {
      const resolvedCalendar = await this.holidaysService.resolveForEmployee(
        tenantId,
        companyId,
        locationId,
        date,
      );

      if (!resolvedCalendar || !resolvedCalendar.holidays) {
        return { isHoliday: false, holidayName: null, holidayType: null, calendarId: null };
      }

      const match = resolvedCalendar.holidays.find((h) => h.date === date);
      if (match) {
        return {
          isHoliday: true,
          holidayName: match.name,
          holidayType: match.type,
          calendarId: resolvedCalendar.calendarId,
        };
      }
    } catch {
      // If leave settings/calendar unconfigured, fail safely to non-holiday
    }

    return { isHoliday: false, holidayName: null, holidayType: null, calendarId: null };
  }
}

export const attendanceHolidayService = new AttendanceHolidayService();
