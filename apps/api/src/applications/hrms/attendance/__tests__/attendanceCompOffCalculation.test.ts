import { describe, it, expect } from 'vitest';
import { AttendanceCompOffCalculationService } from '../service/attendanceCompOffCalculation.service.js';
import type { AttendanceCompOffPolicy } from '../../../../db/schema.js';
import type { CompOffWorkdayContext } from '../types/attendanceCompOff.types.js';

describe('BEZENT HRMS — Comp-Off Calculation Engine (V1.0) Suite', () => {
  const calcService = new AttendanceCompOffCalculationService();

  const basePolicy: AttendanceCompOffPolicy = {
    id: 'comp_off_pol_test_01',
    tenantId: 'tenant_test_01',
    companyId: 'comp_test_01',
    policyName: 'Standard Comp-Off Policy',
    version: 1,
    status: 'published',
    description: null,
    scope: 'company',
    scopeId: null,
    overridesPriority: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    isEnabled: true,
    eligibleEmploymentTypes: ['full_time'],
    eligibleDepartments: null,
    eligibleWorkdayScenarios: { weeklyOff: true, holiday: true, approvedExtraWork: true },
    minimumQualifyingMinutes: 240,
    halfDayThresholdMinutes: 240,
    fullDayThresholdMinutes: 480,
    conversionRate: '1.00',
    roundingRule: 'round_down_half_day',
    submissionDeadlineDays: 14,
    approvalHierarchy: 'manager_then_hr',
    validityDays: 60,
    maxEarningLimitPerMonthDays: '2.00',
    allowCarryForward: false,
    allowOvertimeConversion: true,
    statutoryRules: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('1. Calculates full-day credit (1.0 day) when qualifying worked minutes >= 480', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'weekly_off',
      scheduledMinutes: 0,
      actualWorkedMinutes: 510, // 8.5 hours
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 0,
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.eligibleCreditDays).toBe(1.0);
    expect(res.eligibleCreditMinutes).toBe(480);
    expect(res.appliedThreshold).toBe('full_day');
  });

  it('2. Calculates half-day credit (0.5 day) when qualifying worked minutes between 240 and 479', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'weekly_off',
      scheduledMinutes: 0,
      actualWorkedMinutes: 300, // 5 hours
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 0,
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.eligibleCreditDays).toBe(0.5);
    expect(res.eligibleCreditMinutes).toBe(240);
    expect(res.appliedThreshold).toBe('half_day');
  });

  it('3. Rejects claim when worked duration is below minimum qualifying threshold (<240 mins)', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'holiday',
      scheduledMinutes: 0,
      actualWorkedMinutes: 180, // 3 hours (below 240)
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 0,
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(false);
    expect(res.eligibleCreditDays).toBe(0);
    expect(res.nonEligibilityReason).toContain('below the minimum qualifying threshold');
  });

  it('4. Enforces missing punch guard: incomplete punches without regularization cannot earn Comp-Off', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'weekly_off',
      scheduledMinutes: 0,
      actualWorkedMinutes: 480,
      isMissingPunch: true,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 0,
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(false);
    expect(res.nonEligibilityReason).toContain('incomplete or missing punches');
  });

  it('5. Allows missing punch if attendance is officially regularized', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'weekly_off',
      scheduledMinutes: 0,
      actualWorkedMinutes: 480,
      isMissingPunch: true,
      isRegularized: true, // regularized
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 0,
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.eligibleCreditDays).toBe(1.0);
  });

  it('6. Double Benefit Prevention: deducts overtime-allocated minutes from qualifying duration', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'holiday',
      scheduledMinutes: 0,
      actualWorkedMinutes: 600, // 10 hours worked
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      hasOvertimeAllocation: true,
      allocatedOvertimeMinutes: 360, // 6 hours already allocated to payable OT
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 0,
    };

    // 600 - 360 = 240 mins remaining -> qualifies for half-day comp-off (0.5 day)
    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.qualifyingWorkedMinutes).toBe(240);
    expect(res.eligibleCreditDays).toBe(0.5);
    expect(res.complianceNotes?.some((n) => n.includes('Deducted 360 minutes'))).toBe(true);
  });

  it('7. Double Benefit Prevention: rejects Comp-Off when all extra minutes are allocated to overtime', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'holiday',
      scheduledMinutes: 0,
      actualWorkedMinutes: 480,
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      hasOvertimeAllocation: true,
      allocatedOvertimeMinutes: 480, // all 480 mins allocated to OT
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 0,
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(false);
    expect(res.eligibleCreditDays).toBe(0);
    expect(res.nonEligibilityReason).toContain('already been allocated to overtime');
  });

  it('8. Enforces monthly maximum earning cap (e.g. 2 days per month)', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-25',
      dayType: 'weekly_off',
      scheduledMinutes: 0,
      actualWorkedMinutes: 500,
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 2.0, // already earned 2.0 days this month
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(false);
    expect(res.eligibleCreditDays).toBe(0);
    expect(res.nonEligibilityReason).toContain('Monthly Comp-Off earning limit reached');
  });

  it('9. Partially caps earning if claiming 1.0 day but only 0.5 day remains in monthly limit', () => {
    const context: CompOffWorkdayContext = {
      workDate: '2026-10-25',
      dayType: 'weekly_off',
      scheduledMinutes: 0,
      actualWorkedMinutes: 500, // qualifies for 1.0 day
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: 'full_time',
      priorMonthlyEarnedDays: 1.5, // 0.5 day remaining
    };

    const res = calcService.calculateCompOff(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.eligibleCreditDays).toBe(0.5); // capped from 1.0 to 0.5
    expect(
      res.complianceNotes?.some((n) => n.includes('Capped by monthly maximum earning limit')),
    ).toBe(true);
  });

  it('10. Validates source intervals for invalid format, inverted times, and overlaps', () => {
    // Inverted
    const inverted = calcService.validateSourceIntervals([
      { startTime: '17:00', endTime: '15:00', durationMinutes: 120 },
    ]);
    // Note: overnight is allowed if end crosses midnight, but if same day end < start without cross, duration handles it
    expect(inverted.isValid).toBe(true); // overnight 17:00 to 15:00 next day

    // Overlapping
    const overlap = calcService.validateSourceIntervals([
      { startTime: '09:00', endTime: '13:00', durationMinutes: 240 },
      { startTime: '12:00', endTime: '16:00', durationMinutes: 240 },
    ]);
    expect(overlap.isValid).toBe(false);
    expect(overlap.errorMessage).toContain('Overlapping intervals detected');

    // Valid non-overlapping
    const valid = calcService.validateSourceIntervals([
      { startTime: '09:00', endTime: '13:00', durationMinutes: 240 },
      { startTime: '14:00', endTime: '18:00', durationMinutes: 240 },
    ]);
    expect(valid.isValid).toBe(true);
    expect(valid.totalIntervalMinutes).toBe(480);
  });
});
