import { describe, it, expect } from 'vitest';
import {
  addDays,
  computeLeaveDuration,
  daysBetweenInclusive,
  leaveCycleFor,
  weekdayName,
  type DurationInput,
} from '../rules/leaveCalendar.js';

const MON_FRI = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const duration = (overrides: Partial<DurationInput>) =>
  computeLeaveDuration({
    startDate: '2026-11-06',
    endDate: '2026-11-09',
    dayCountingMethod: 'working_days',
    workingDays: MON_FRI,
    holidays: new Map(),
    weeklyOffTreatment: 'inherit',
    holidayTreatment: 'inherit',
    sandwichRuleEnabled: false,
    session: null,
    ...overrides,
  });

describe('leaveCalendar — date helpers', () => {
  it('handles month and leap-year boundaries independent of server timezone', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetweenInclusive('2026-11-06', '2026-11-09')).toBe(4);
    expect(weekdayName('2026-11-06')).toBe('friday');
  });
});

describe('leaveCalendar — leave year cycles', () => {
  it('calendar year', () => {
    expect(leaveCycleFor('2026-11-10', 'calendar_year', null)).toMatchObject({
      start: '2026-01-01',
      end: '2026-12-31',
      label: '2026',
      startYear: 2026,
    });
  });

  it('financial year straddles calendar years', () => {
    expect(leaveCycleFor('2027-03-30', 'financial_year', null)).toMatchObject({
      start: '2026-04-01',
      end: '2027-03-31',
      label: 'FY 2026-27',
    });
    expect(leaveCycleFor('2027-04-03', 'financial_year', null).label).toBe('FY 2027-28');
  });

  it('custom cycle including a leap year', () => {
    expect(leaveCycleFor('2028-03-15', 'custom', '07-01')).toMatchObject({
      start: '2027-07-01',
      end: '2028-06-30',
    });
  });
});

describe('leaveCalendar — duration', () => {
  it('working days excludes weekly offs (General Settings acceptance: Fri–Mon = 2 days)', () => {
    const res = duration({});
    expect(res.totalDays).toBe(2);
    expect(res.breakdown.map((b) => b.exclusionReasons)).toEqual([
      [],
      ['weekly_off'],
      ['weekly_off'],
      [],
    ]);
  });

  it('calendar days counts every day', () => {
    expect(duration({ dayCountingMethod: 'calendar_days' }).totalDays).toBe(4);
  });

  it('excludes a holiday under working days (Wed–Fri with Thursday holiday = 2 days)', () => {
    const res = duration({
      startDate: '2026-11-18',
      endDate: '2026-11-20',
      holidays: new Map([['2026-11-19', 'HOL']]),
    });
    expect(res.totalDays).toBe(2);
    expect(res.breakdown[1]).toMatchObject({ isHoliday: true, holidayCode: 'HOL', chargedDays: 0 });
  });

  it('leave type treatment overrides the company method', () => {
    expect(duration({ weeklyOffTreatment: 'count' }).totalDays).toBe(4);
    expect(
      duration({ dayCountingMethod: 'calendar_days', weeklyOffTreatment: 'exclude' }).totalDays,
    ).toBe(2);
  });

  it('sandwich rule charges non-working days between two leave days', () => {
    expect(duration({ sandwichRuleEnabled: true }).totalDays).toBe(4);
    // Leading/trailing weekend days are not sandwiched.
    expect(
      duration({ startDate: '2026-11-07', endDate: '2026-11-09', sandwichRuleEnabled: true })
        .totalDays,
    ).toBe(1);
  });

  it('half day charges 0.5 on a working day and 0 on a weekly off', () => {
    expect(
      duration({ startDate: '2026-11-12', endDate: '2026-11-12', session: 'first_half' }).totalDays,
    ).toBe(0.5);
    expect(
      duration({ startDate: '2026-11-15', endDate: '2026-11-15', session: 'first_half' }).totalDays,
    ).toBe(0);
    expect(
      duration({
        startDate: '2026-11-15',
        endDate: '2026-11-15',
        session: 'second_half',
        dayCountingMethod: 'calendar_days',
      }).totalDays,
    ).toBe(0.5);
  });
});
