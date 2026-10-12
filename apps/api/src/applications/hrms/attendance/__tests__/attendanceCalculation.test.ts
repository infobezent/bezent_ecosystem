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

    it('marks holiday on non-working day without punches', () => {
      const result = service.calculate({
        date: '2026-10-10', // Saturday
        checkInTime: null,
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE, // Mon-Fri
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('holiday');
      expect(result.isLate).toBe(false);
      expect(result.workedMinutes).toBe(0);
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
