import { describe, it, expect } from 'vitest';
import {
  AttendanceCalculationService,
  timeToMinutes,
  minutesToTime,
  getDayOfWeekName,
  DEFAULT_WORK_SCHEDULE,
} from '../service/attendanceCalculation.service.js';
import { FALLBACK_ATTENDANCE_POLICY } from '../service/attendancePolicy.service.js';

describe('AttendanceCalculationService', () => {
  const service = new AttendanceCalculationService();

  describe('Utility time functions', () => {
    it('converts HH:mm to minutes and back', () => {
      expect(timeToMinutes('09:00')).toBe(540);
      expect(timeToMinutes('09:15')).toBe(555);
      expect(timeToMinutes('18:00')).toBe(1080);
      expect(minutesToTime(540)).toBe('09:00');
      expect(minutesToTime(555)).toBe('09:15');
      expect(minutesToTime(1080)).toBe('18:00');
    });

    it('correctly resolves day of week', () => {
      // 2026-10-09 is a Friday
      expect(getDayOfWeekName('2026-10-09')).toBe('Friday');
      // 2026-10-10 is a Saturday
      expect(getDayOfWeekName('2026-10-10')).toBe('Saturday');
      // 2026-10-11 is a Sunday
      expect(getDayOfWeekName('2026-10-11')).toBe('Sunday');
    });
  });

  describe('Standard Day Calculations', () => {
    it('marks full-day present on standard on-time day', () => {
      const result = service.calculate({
        date: '2026-10-09', // Friday
        checkInTime: '09:00',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('present');
      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
      expect(result.isEarlyExit).toBe(false);
      expect(result.earlyMinutes).toBe(0);
      expect(result.isMissingPunch).toBe(false);
      // 9 hours minus 1 hour break = 8 hours (480 mins)
      expect(result.workedMinutes).toBe(480);
    });

    it('allows arrival within grace period without marking late', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:14', // Within 15 min grace period
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('present');
      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    it('flags late arrival when exceeding grace period', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:35', // 35 mins after 9:00
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(35);
    });

    it('flags early exit when departing before scheduled end time', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '17:15', // Scheduled end is 18:00 (45 mins early)
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.isEarlyExit).toBe(true);
      expect(result.earlyMinutes).toBe(45);
    });

    it('determines half-day status when worked hours are between half-day and full-day thresholds', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '14:30', // 5.5 hours - 1 hour break = 4.5 hours worked (>= 4.0h, < 8.0h)
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('half_day');
    });

    it('marks absent if worked hours are below half-day threshold', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '09:45', // 45 minutes worked (< 1 hour)
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('absent');
    });
  });

  describe('C1 regression: late arrival must not shrink the full-day threshold', () => {
    // Shift 09:00-18:00, 60-min break, 15-min grace, 8h full-day threshold.
    it('09:15-18:00 (within grace): present, late 0', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:15',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('present');
      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    it('09:16-18:00 (1 min past grace): present, late 16 - not half_day', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:16',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('present');
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(16);
      // 18:00 - 09:16 = 524 min gross, minus 60 min break = 464 min worked.
      expect(result.workedMinutes).toBe(464);
    });

    it('09:46-18:00 (31 min past grace): present, late 46', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:46',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('present');
      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(46);
    });

    it('09:00-13:00 (on time, short day): half_day, independent of lateness', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '13:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('half_day');
      expect(result.isLate).toBe(false);
    });

    it('09:00-14:00 (on time, early exit): half_day, unaffected by the C1 fix', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '14:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('half_day');
      expect(result.isEarlyExit).toBe(true);
    });

    it('09:00-23:59 (on time, overtime): present, unaffected by the C1 fix', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '23:59',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('present');
      expect(result.isEarlyExit).toBe(false);
    });

    it('a late arrival past the extended-late-action threshold can still be demoted by explicit policy opt-in', () => {
      const policy = {
        ...FALLBACK_ATTENDANCE_POLICY,
        classificationRules: {
          lateArrivalConfig: {
            extendedLateThresholdMinutes: 30,
            extendedLateAction: 'half_day',
          },
        },
      };
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: '09:46', // 46 min late, past the 30-min extended threshold
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy,
      });

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(46);
      // The default-off extended-late-action policy is the explicit opt-in the
      // audit allows (unlike the removed implicit threshold-shrink), and it is
      // unaffected by the C1 fix.
      expect(result.status).toBe('half_day');
    });
  });

  describe('Missing Punches & Weekend Rules', () => {
    it('detects missing checkout for a past date', () => {
      const result = service.calculate({
        date: '2026-10-05', // Past date
        checkInTime: '09:00',
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
        isToday: false,
      });

      expect(result.isMissingPunch).toBe(true);
    });

    it('marks weekly_off on non-working day without punches', () => {
      const result = service.calculate({
        date: '2026-10-10', // Saturday
        checkInTime: null,
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE, // Mon-Fri
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('weekly_off');
      expect(result.isLate).toBe(false);
      expect(result.workedMinutes).toBe(0);
    });

    it('marks holiday on public holiday even on scheduled working day', () => {
      const result = service.calculate({
        date: '2026-10-02', // Gandhi Jayanti (Friday - normal working day)
        checkInTime: null,
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE, // Mon-Fri
        policy: FALLBACK_ATTENDANCE_POLICY,
        isHoliday: true,
        holidayName: 'Gandhi Jayanti',
      });

      expect(result.status).toBe('holiday');
      expect(result.isLate).toBe(false);
      expect(result.workedMinutes).toBe(0);
      expect(result.calculationMetadata?.holidayName).toBe('Gandhi Jayanti');
    });

    it('marks absent on working day with zero punches', () => {
      const result = service.calculate({
        date: '2026-10-09', // Friday
        checkInTime: null,
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('absent');
    });

    it('respects approved leave override regardless of punches', () => {
      const result = service.calculate({
        date: '2026-10-09',
        checkInTime: null,
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
        isOnApprovedLeave: true,
      });

      expect(result.status).toBe('on_leave');
      expect(result.workedMinutes).toBe(0);
      expect(result.isLate).toBe(false);
    });
  });
});
