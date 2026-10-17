import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  employees,
  employeeWorkSchedules,
  attendancePeriods,
  employeeAttendance,
  attendancePunches,
  attendanceGeneralSettings,
  employeeNotifications,
} from '../../../../db/schema.js';
import {
  isValidTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
  resolveWorkday,
  attendanceWorkdayService,
} from '../service/attendanceWorkday.service.js';
import { defaultShiftScheduleProvider } from '../service/shiftSchedule.provider.js';
import { attendanceService } from '../service/attendance.service.js';
import {
  hrmsTestHeaders,
  removeHrmsTestAccess,
} from '../../../../platform/__tests__/support/testSession.js';
import { BadRequestError, ConflictError } from '../../../../app/errors/AppError.js';

describe('Attendance Phase 2: Pure Timezone & Workday Calculations', () => {
  it('validates IANA timezones and rejects invalid strings', () => {
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('Invalid/Timezone_Not_Real')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(null)).toBe(false);
    expect(isValidTimezone(undefined)).toBe(false);
  });

  it('formats dates accurately across timezones without server host dependence', () => {
    // 2026-10-15T22:30:00.000Z (UTC)
    const instant = new Date('2026-10-15T22:30:00.000Z');

    // In UTC, calendar date is 2026-10-15
    expect(formatDateInTimezone(instant, 'UTC')).toBe('2026-10-15');
    // In Asia/Kolkata (+05:30), 22:30 + 05:30 = 04:00 on Oct 16 -> 2026-10-16
    expect(formatDateInTimezone(instant, 'Asia/Kolkata')).toBe('2026-10-16');
    // In America/New_York (-04:00 EDT), 22:30 - 04:00 = 18:30 on Oct 15 -> 2026-10-15
    expect(formatDateInTimezone(instant, 'America/New_York')).toBe('2026-10-15');
  });

  it('formats times accurately (24-hour HH:mm) across timezones', () => {
    const instant = new Date('2026-10-15T22:30:00.000Z');

    expect(formatTimeInTimezone(instant, 'UTC')).toBe('22:30');
    expect(formatTimeInTimezone(instant, 'Asia/Kolkata')).toBe('04:00');
    expect(formatTimeInTimezone(instant, 'America/New_York')).toBe('18:30');
  });

  it('resolves workdays for Asia/Kolkata, UTC, and America/New_York with day boundaries', () => {
    // 2026-10-16T01:00:00.000Z (UTC)
    // In Asia/Kolkata: Oct 16 at 06:30
    const instant = new Date('2026-10-16T01:00:00.000Z');

    // With 04:00:00 day boundary:
    // IST local time 06:30 is AFTER 04:00 -> workday is Oct 16
    expect(resolveWorkday(instant, '04:00:00', 'Asia/Kolkata')).toBe('2026-10-16');

    // With 07:00:00 day boundary:
    // IST local time 06:30 is BEFORE 07:00 -> belongs to prior workday Oct 15
    expect(resolveWorkday(instant, '07:00:00', 'Asia/Kolkata')).toBe('2026-10-15');

    // In UTC: 01:00 UTC with 04:00 boundary -> belongs to Oct 15
    expect(resolveWorkday(instant, '04:00:00', 'UTC')).toBe('2026-10-15');

    // In America/New_York: 2026-10-15 21:00 EDT with 04:00 boundary -> Oct 15
    expect(resolveWorkday(instant, '04:00:00', 'America/New_York')).toBe('2026-10-15');
  });

  it('supports overnight shifts and midnight crossings seamlessly', () => {
    // Night shift starting at 22:00 on Oct 15 and ending at 06:00 on Oct 16
    // Workday boundary configured to 07:00:00
    // Check-in punch at 22:30 UTC on Oct 15
    const punchCheckIn = new Date('2026-10-15T22:30:00.000Z');
    // Midnight crossing punch (break) at 01:15 UTC on Oct 16
    const punchMidnightBreak = new Date('2026-10-16T01:15:00.000Z');
    // Morning punch (check-out) at 05:45 UTC on Oct 16
    const punchCheckOut = new Date('2026-10-16T05:45:00.000Z');

    // All punches belong to workday 2026-10-15 when boundary is 07:00:00
    expect(resolveWorkday(punchCheckIn, '07:00:00', 'UTC')).toBe('2026-10-15');
    expect(resolveWorkday(punchMidnightBreak, '07:00:00', 'UTC')).toBe('2026-10-15');
    expect(resolveWorkday(punchCheckOut, '07:00:00', 'UTC')).toBe('2026-10-15');

    // Punch at 07:30 UTC belongs to the NEW workday 2026-10-16
    const nextDayMorning = new Date('2026-10-16T07:30:00.000Z');
    expect(resolveWorkday(nextDayMorning, '07:00:00', 'UTC')).toBe('2026-10-16');
  });

  it('correctly handles Daylight Saving Time (DST) transitions in US Eastern', () => {
    // 2026 US Eastern DST change:
    // Spring forward on March 8, 2026 (UTC-5 -> UTC-4)
    // Fall back on November 1, 2026 (UTC-4 -> UTC-5)
    const summerTime = new Date('2026-06-15T02:00:00.000Z'); // 22:00 EDT on June 14
    const winterTime = new Date('2026-12-15T02:00:00.000Z'); // 21:00 EST on Dec 14

    expect(formatTimeInTimezone(summerTime, 'America/New_York')).toBe('22:00');
    expect(formatTimeInTimezone(winterTime, 'America/New_York')).toBe('21:00');

    expect(formatDateInTimezone(summerTime, 'America/New_York')).toBe('2026-06-14');
    expect(formatDateInTimezone(winterTime, 'America/New_York')).toBe('2026-12-14');
  });
});

describe.skipIf(!isDatabaseConfigured)('Attendance Phase 2: Database & Domain Integration', () => {
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_phase2_core';
  const isolationCompanyId = 'comp_phase2_isolated';

  const empWithSchedule = 'emp_phase2_sched_01';
  const empWithoutSchedule = 'emp_phase2_nosched_02';

  const lockedWorkday = '2026-08-15';
  const openWorkday = '2026-08-16';

  beforeAll(async () => {
    await hrmsTestHeaders(companyId, tenantId);
    await hrmsTestHeaders(isolationCompanyId, tenantId);

    const db = getDb();

    // 1. Clean up potential leftover test data
    await db
      .delete(attendancePunches)
      .where(
        and(eq(attendancePunches.tenantId, tenantId), eq(attendancePunches.companyId, companyId)),
      );
    await db
      .delete(employeeAttendance)
      .where(
        and(eq(employeeAttendance.tenantId, tenantId), eq(employeeAttendance.companyId, companyId)),
      );
    await db
      .delete(employeeWorkSchedules)
      .where(
        and(
          eq(employeeWorkSchedules.tenantId, tenantId),
          eq(employeeWorkSchedules.companyId, companyId),
        ),
      );
    await db
      .delete(attendancePeriods)
      .where(
        and(eq(attendancePeriods.tenantId, tenantId), eq(attendancePeriods.companyId, companyId)),
      );
    await db
      .delete(attendanceGeneralSettings)
      .where(
        and(
          eq(attendanceGeneralSettings.tenantId, tenantId),
          eq(attendanceGeneralSettings.companyId, companyId),
        ),
      );
    await db
      .delete(employeeNotifications)
      .where(
        and(
          eq(employeeNotifications.tenantId, tenantId),
          eq(employeeNotifications.companyId, companyId),
        ),
      );
    await db
      .delete(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.companyId, companyId)));

    // 2. Insert test employees
    await db.insert(employees).values([
      {
        id: empWithSchedule,
        tenantId,
        companyId,
        employeeNumber: 'P2-SCHED-01',
        firstName: 'Aarav',
        lastName: 'Sharma',
        email: 'aarav.sharma@example.test',
        joiningDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      },
      {
        id: empWithoutSchedule,
        tenantId,
        companyId,
        employeeNumber: 'P2-NOSCHED-02',
        firstName: 'Meera',
        lastName: 'Patel',
        email: 'meera.patel@example.test',
        joiningDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      },
    ]);

    // 3. Configure company general settings with timezone
    await db.insert(attendanceGeneralSettings).values({
      id: 'sett_phase2_01',
      tenantId,
      companyId,
      timezone: 'Asia/Kolkata',
      dayBoundaryTime: '04:00:00',
    });

    // 4. Assign actual shift schedule to empWithSchedule (Night Shift in America/New_York)
    await db.insert(employeeWorkSchedules).values({
      tenantId,
      companyId,
      employeeId: empWithSchedule,
      workSchedule: 'Engineering Night Shift',
      workingCalendar: 'Night 5-Day',
      startTime: '22:00',
      endTime: '06:00',
      breakMinutes: 60,
      lunchMinutes: 0,
      timeZone: 'America/New_York',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    });

    // 5. Create attendance periods: locked for Aug 01-15, open for Aug 16-31
    await db.insert(attendancePeriods).values([
      {
        id: 'period_p2_locked',
        tenantId,
        companyId,
        periodCode: '2026-08-H1',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        status: 'locked',
      },
      {
        id: 'period_p2_open',
        tenantId,
        companyId,
        periodCode: '2026-08-H2',
        startDate: '2026-08-16',
        endDate: '2026-08-31',
        status: 'open',
      },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db
      .delete(attendancePunches)
      .where(
        and(eq(attendancePunches.tenantId, tenantId), eq(attendancePunches.companyId, companyId)),
      );
    await db
      .delete(employeeAttendance)
      .where(
        and(eq(employeeAttendance.tenantId, tenantId), eq(employeeAttendance.companyId, companyId)),
      );
    await db
      .delete(employeeWorkSchedules)
      .where(
        and(
          eq(employeeWorkSchedules.tenantId, tenantId),
          eq(employeeWorkSchedules.companyId, companyId),
        ),
      );
    await db
      .delete(attendancePeriods)
      .where(
        and(eq(attendancePeriods.tenantId, tenantId), eq(attendancePeriods.companyId, companyId)),
      );
    await db
      .delete(attendanceGeneralSettings)
      .where(
        and(
          eq(attendanceGeneralSettings.tenantId, tenantId),
          eq(attendanceGeneralSettings.companyId, companyId),
        ),
      );
    await db
      .delete(employeeNotifications)
      .where(
        and(
          eq(employeeNotifications.tenantId, tenantId),
          eq(employeeNotifications.companyId, companyId),
        ),
      );
    await db
      .delete(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.companyId, companyId)));
    await removeHrmsTestAccess([companyId, isolationCompanyId]);
  });

  describe('Effective Timezone Precedence', () => {
    it('uses employee shift timezone when assigned', async () => {
      const tz = await attendanceWorkdayService.resolveTimezone(
        tenantId,
        companyId,
        empWithSchedule,
      );
      expect(tz).toBe('America/New_York');
    });

    it('falls back to company general settings timezone when employee has no schedule', async () => {
      const tz = await attendanceWorkdayService.resolveTimezone(
        tenantId,
        companyId,
        empWithoutSchedule,
      );
      expect(tz).toBe('Asia/Kolkata');
    });

    it('falls back to UTC when company has no settings and employee has no schedule', async () => {
      const tz = await attendanceWorkdayService.resolveTimezone(
        tenantId,
        isolationCompanyId,
        'non_existent_emp',
      );
      expect(tz).toBe('UTC');
    });
  });

  describe('Actual Employee Shift Binding', () => {
    it('returns actual shift details for an assigned employee', async () => {
      const shift = await defaultShiftScheduleProvider.getAssignedShiftDetails(
        tenantId,
        companyId,
        empWithSchedule,
      );

      expect(shift.isAssigned).toBe(true);
      expect(shift.name).toBe('Engineering Night Shift');
      expect(shift.startTime).toBe('22:00');
      expect(shift.endTime).toBe('06:00');
      expect(shift.effectiveTimezone).toBe('America/New_York');
      expect(shift.workingDays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      expect(shift.requiredHours).toBe(7); // 8h gross - 1h break = 7h
    });

    it('returns explicit unassigned state without inventing General Shift', async () => {
      const shift = await defaultShiftScheduleProvider.getAssignedShiftDetails(
        tenantId,
        companyId,
        empWithoutSchedule,
      );

      expect(shift.isAssigned).toBe(false);
      expect(shift.name).toBeNull();
      expect(shift.startTime).toBeNull();
      expect(shift.endTime).toBeNull();
      expect(shift.requiredHours).toBe(0);
      expect(shift.workingDays).toEqual([]);
    });
  });

  describe('Payroll Lock Enforcement on Mutations', () => {
    it('rejects check-in for a locked period without recording punch or daily row', async () => {
      await expect(
        attendanceService.recordCheckIn(tenantId, companyId, empWithSchedule, lockedWorkday, {
          source: 'web',
          workLocation: 'office',
        }),
      ).rejects.toThrow(BadRequestError);

      // Verify zero punches were created
      const db = getDb();
      const punches = await db
        .select()
        .from(attendancePunches)
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.employeeId, empWithSchedule),
            eq(attendancePunches.workday, lockedWorkday),
          ),
        );
      expect(punches.length).toBe(0);

      // Verify zero daily attendance records were created
      const daily = await db
        .select()
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            eq(employeeAttendance.employeeId, empWithSchedule),
            eq(employeeAttendance.date, lockedWorkday),
          ),
        );
      expect(daily.length).toBe(0);
    });

    it('rejects check-out and break mutations for a locked period', async () => {
      await expect(
        attendanceService.recordCheckOut(tenantId, companyId, empWithSchedule, lockedWorkday),
      ).rejects.toThrow(BadRequestError);

      await expect(
        attendanceService.recordBreakStart(
          tenantId,
          companyId,
          empWithSchedule,
          lockedWorkday,
          'tea',
        ),
      ).rejects.toThrow(BadRequestError);

      await expect(
        attendanceService.recordBreakEnd(tenantId, companyId, empWithSchedule, lockedWorkday),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Concurrent Punch Safety & Transitions', () => {
    const testDate = openWorkday;

    it('prevents simultaneous duplicate check-in punches via transaction and row locking', async () => {
      // Fire 2 concurrent check-ins simultaneously
      const results = await Promise.allSettled([
        attendanceService.recordCheckIn(tenantId, companyId, empWithSchedule, testDate, {
          source: 'web',
          workLocation: 'office',
        }),
        attendanceService.recordCheckIn(tenantId, companyId, empWithSchedule, testDate, {
          source: 'web',
          workLocation: 'office',
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionReason).toBeInstanceOf(ConflictError);
      expect(rejectionReason.message).toMatch(/already recorded/i);

      // Database verification: strictly 1 row in employee_attendance, strictly 1 punch in attendance_punches
      const db = getDb();
      const dailyRows = await db
        .select()
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            eq(employeeAttendance.employeeId, empWithSchedule),
            eq(employeeAttendance.date, testDate),
          ),
        );
      expect(dailyRows.length).toBe(1);
      expect(dailyRows[0]!.checkInTime).toBeDefined();

      const punchRows = await db
        .select()
        .from(attendancePunches)
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.employeeId, empWithSchedule),
            eq(attendancePunches.workday, testDate),
            eq(attendancePunches.punchType, 'in'),
          ),
        );
      expect(punchRows.length).toBe(1);
    });

    it('prevents concurrent break start actions (only 1 break_out punch recorded)', async () => {
      const results = await Promise.allSettled([
        attendanceService.recordBreakStart(tenantId, companyId, empWithSchedule, testDate, 'lunch'),
        attendanceService.recordBreakStart(tenantId, companyId, empWithSchedule, testDate, 'lunch'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionReason).toBeInstanceOf(ConflictError);
      expect(rejectionReason.message).toMatch(/already on a break/i);

      // Database verification: strictly 1 break_out punch
      const db = getDb();
      const breakPunches = await db
        .select()
        .from(attendancePunches)
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.employeeId, empWithSchedule),
            eq(attendancePunches.workday, testDate),
            eq(attendancePunches.punchType, 'break_out'),
          ),
        );
      expect(breakPunches.length).toBe(1);
    });

    it('prevents concurrent break end actions (only 1 break_in punch recorded)', async () => {
      const results = await Promise.allSettled([
        attendanceService.recordBreakEnd(tenantId, companyId, empWithSchedule, testDate),
        attendanceService.recordBreakEnd(tenantId, companyId, empWithSchedule, testDate),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionReason).toBeInstanceOf(BadRequestError);
      expect(rejectionReason.message).toMatch(/not currently on a break/i);

      // Database verification: strictly 1 break_in punch
      const db = getDb();
      const breakPunches = await db
        .select()
        .from(attendancePunches)
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.employeeId, empWithSchedule),
            eq(attendancePunches.workday, testDate),
            eq(attendancePunches.punchType, 'break_in'),
          ),
        );
      expect(breakPunches.length).toBe(1);
    });

    it('prevents concurrent check-out punches', async () => {
      const results = await Promise.allSettled([
        attendanceService.recordCheckOut(tenantId, companyId, empWithSchedule, testDate),
        attendanceService.recordCheckOut(tenantId, companyId, empWithSchedule, testDate),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionReason).toBeInstanceOf(ConflictError);
      expect(rejectionReason.message).toMatch(/check out already recorded/i);

      // Database verification: strictly 1 'out' punch
      const db = getDb();
      const outPunches = await db
        .select()
        .from(attendancePunches)
        .where(
          and(
            eq(attendancePunches.tenantId, tenantId),
            eq(attendancePunches.companyId, companyId),
            eq(attendancePunches.employeeId, empWithSchedule),
            eq(attendancePunches.workday, testDate),
            eq(attendancePunches.punchType, 'out'),
          ),
        );
      expect(outPunches.length).toBe(1);
    });
  });

  describe('Tenant and Company Isolation', () => {
    it('does not expose punches or attendance records across company boundaries', async () => {
      const otherCompany = 'comp_other_isolate';
      const punches = await attendanceService.getEmployeeDayPunches(
        tenantId,
        otherCompany,
        empWithSchedule,
        openWorkday,
      );
      expect(punches.length).toBe(0);

      const att = await attendanceService.getTodayAttendance(
        tenantId,
        otherCompany,
        empWithSchedule,
        openWorkday,
      );
      expect(att).toBeNull();
    });
  });
});
