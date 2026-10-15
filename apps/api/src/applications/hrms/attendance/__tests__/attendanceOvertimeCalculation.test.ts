import { describe, it, expect } from 'vitest';
import { AttendanceOvertimeCalculationService } from '../service/attendanceOvertimeCalculation.service.js';
import type { AttendanceOvertimePolicy } from '../../../../db/schema.js';
import type { OvertimeWorkdayContext } from '../types/attendanceOvertime.types.js';

describe('BEZENT HRMS — Overtime Calculation Engine V1.0 Unit Tests', () => {
  const calcService = new AttendanceOvertimeCalculationService();

  const basePolicy: AttendanceOvertimePolicy = {
    id: 'test_pol_01',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    policyName: 'Standard Test Policy',
    version: 1,
    status: 'published',
    description: null,
    scope: 'company',
    scopeId: null,
    overridesPriority: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    isEnabled: true,
    eligibleEmploymentTypes: ['full_time', 'contract'],
    eligibleDepartments: [],
    workdayEligibility: { regularWorkday: true, weeklyOff: true, holiday: true },
    minimumQualifyingMinutes: 60,
    dailyCapMinutes: 240, // 4 hrs
    weeklyCapMinutes: 720, // 12 hrs
    monthlyCapMinutes: 2400, // 40 hrs
    roundingRule: 'round_down_15',
    requiresPreApproval: false,
    submissionWindowDays: 14,
    allowPayable: true,
    allowCompOff: true,
    defaultSettlementPreference: 'payable',
    approvalHierarchy: 'manager_then_hr',
    statutoryRules: {
      statutoryMaxDailyMinutes: 300,
      statutoryMaxWeeklyMinutes: 900,
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('correctly calculates rounding for all supported rounding rules', () => {
    // 74 minutes
    expect(calcService.applyRounding(74, 'exact').roundedMinutes).toBe(74);
    expect(calcService.applyRounding(74, 'round_down_15').roundedMinutes).toBe(60);
    expect(calcService.applyRounding(74, 'round_nearest_15').roundedMinutes).toBe(75);
    expect(calcService.applyRounding(74, 'round_down_30').roundedMinutes).toBe(60);
    expect(calcService.applyRounding(74, 'round_nearest_30').roundedMinutes).toBe(60);

    // 76 minutes
    expect(calcService.applyRounding(76, 'round_nearest_30').roundedMinutes).toBe(90);
    expect(calcService.applyRounding(76, 'round_down_30').roundedMinutes).toBe(60);
  });

  it('validates source intervals and detects overlapping intervals', () => {
    const validIntervals = [
      { startTime: '18:00', endTime: '19:30', durationMinutes: 90 },
      { startTime: '20:00', endTime: '21:00', durationMinutes: 60 },
    ];
    const validResult = calcService.validateSourceIntervals(validIntervals);
    expect(validResult.isValid).toBe(true);
    expect(validResult.totalIntervalMinutes).toBe(150);

    const overlappingIntervals = [
      { startTime: '18:00', endTime: '19:30', durationMinutes: 90 },
      { startTime: '19:00', endTime: '20:00', durationMinutes: 60 },
    ];
    const overlapResult = calcService.validateSourceIntervals(overlappingIntervals);
    expect(overlapResult.isValid).toBe(false);
    expect(overlapResult.errorMessage).toContain('Overlapping overtime intervals');
  });

  it('handles overnight shift intervals crossing midnight', () => {
    const overnightIntervals = [{ startTime: '22:00', endTime: '02:00', durationMinutes: 240 }];
    const result = calcService.validateSourceIntervals(overnightIntervals);
    expect(result.isValid).toBe(true);
    expect(result.totalIntervalMinutes).toBe(240);
  });

  it('returns 0 eligible OT and informs reason when missing punch is not regularized without inventing hours', () => {
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 480,
      actualWorkedMinutes: 560,
      isMissingPunch: true,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
    };
    const res = calcService.calculateOvertime(context, basePolicy);
    expect(res.isEligible).toBe(false);
    expect(res.eligibleOtMinutes).toBe(0);
    expect(res.nonEligibilityReason).toContain('incomplete or missing punches');
  });

  it('enforces minimum qualifying duration threshold', () => {
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 480,
      actualWorkedMinutes: 520, // 40 mins extra < 60 min threshold
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
    };
    const res = calcService.calculateOvertime(context, basePolicy);
    expect(res.isEligible).toBe(false);
    expect(res.extraWorkedMinutes).toBe(40);
    expect(res.eligibleOtMinutes).toBe(0);
    expect(res.nonEligibilityReason).toContain('minimum qualifying threshold');
  });

  it('applies daily cap when extra work exceeds policy maximum', () => {
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 480,
      actualWorkedMinutes: 800, // 320 mins extra > 240 min daily cap
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
    };
    const res = calcService.calculateOvertime(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.extraWorkedMinutes).toBe(320);
    expect(res.appliedCap?.type).toBe('daily');
    expect(res.appliedCap?.cappedMinutes).toBe(240);
    expect(res.eligibleOtMinutes).toBe(240);
  });

  it('applies weekly and monthly accumulation caps', () => {
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 480,
      actualWorkedMinutes: 660, // 180 mins extra
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      priorWeeklyApprovedMinutes: 660, // weekly cap is 720, so only 60 mins left
    };
    const res = calcService.calculateOvertime(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.appliedCap?.type).toBe('weekly');
    expect(res.eligibleOtMinutes).toBe(60);
  });

  it('treats all worked minutes on weekly off / holiday as overtime eligible', () => {
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-11',
      dayType: 'weekly_off',
      scheduledMinutes: 0,
      actualWorkedMinutes: 185,
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
    };
    const res = calcService.calculateOvertime(context, basePolicy);
    expect(res.isEligible).toBe(true);
    expect(res.extraWorkedMinutes).toBe(185);
    // 185 rounded down to 15 is 180
    expect(res.eligibleOtMinutes).toBe(180);
    expect(res.scheduledMinutes).toBe(0);
  });

  it('enforces statutory caps over higher company policy limits', () => {
    const policyWithHighCap: AttendanceOvertimePolicy = {
      ...basePolicy,
      dailyCapMinutes: 480, // allows up to 8 hours
      statutoryRules: {
        statutoryMaxDailyMinutes: 180, // statutory limit is 3 hours
        complianceLimitationNote: 'Factories Act Daily Maximum',
      },
    };
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 480,
      actualWorkedMinutes: 800, // 320 mins extra
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
    };
    const res = calcService.calculateOvertime(context, policyWithHighCap);
    expect(res.isEligible).toBe(true);
    expect(res.appliedCap?.type).toBe('statutory');
    expect(res.appliedCap?.cappedMinutes).toBe(180);
    expect(res.eligibleOtMinutes).toBe(180);
    expect(res.complianceNotes?.[0]).toContain('statutory daily maximum');
  });

  it('Phase 0 Regression: returns explicit eligibility-unavailable when regular workday lacks authoritative baseline', () => {
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 0,
      actualWorkedMinutes: 600,
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      hasAuthoritativeBaseline: false, // No authoritative shift schedule or approved policy baseline
    };

    const res = calcService.calculateOvertime(context, basePolicy);
    expect(res.isEligible).toBe(false);
    expect(res.eligibleOtMinutes).toBe(0);
    expect(res.nonEligibilityReason).toContain('Eligibility unavailable');
    expect(res.nonEligibilityReason).toContain(
      'authoritative shift schedule or approved company policy baseline',
    );
  });

  it('Phase 0 Regression: flags compliance review when statutory rules are unresolved or unverified', () => {
    const unverifiedPolicy: AttendanceOvertimePolicy = {
      ...basePolicy,
      dailyCapMinutes: 240,
      statutoryRules: {
        statutoryJurisdiction: 'Karnataka Shops & Commercial Establishments',
        isJurisdictionVerified: false,
        requiresComplianceReview: true,
      },
    };
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 480,
      actualWorkedMinutes: 600,
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      hasAuthoritativeBaseline: true,
    };

    const res = calcService.calculateOvertime(context, unverifiedPolicy);
    expect(res.requiresComplianceReview).toBe(true);
    expect(res.complianceNotes?.some((n) => n.includes('Compliance review flagged'))).toBe(true);
  });

  it('Phase 0 Regression: does not apply arbitrary quarterly cap unless explicitly verified in jurisdiction statutory rules', () => {
    // Policy without verified quarterly rules
    const context: OvertimeWorkdayContext = {
      workDate: '2026-10-10',
      dayType: 'regular',
      scheduledMinutes: 480,
      actualWorkedMinutes: 600,
      isMissingPunch: false,
      isRegularized: false,
      hasApprovedOd: false,
      odMinutes: 0,
      hasAuthoritativeBaseline: true,
      priorQuarterlyApprovedMinutes: 3000,
    };

    const res = calcService.calculateOvertime(context, basePolicy);
    // basePolicy has no statutory quarterly cap; company monthly/daily apply, quarterly is not blindly enforced
    expect(res.appliedCap?.type).not.toBe('statutory');

    // With verified jurisdiction statutory quarterly cap
    const verifiedQuarterlyPolicy: AttendanceOvertimePolicy = {
      ...basePolicy,
      statutoryRules: {
        statutoryJurisdiction: 'Factories Act 1948 Sec 64',
        isJurisdictionVerified: true,
        statutoryMaxQuarterlyMinutes: 3000, // 50 hours
      },
    };

    const resVerified = calcService.calculateOvertime(context, verifiedQuarterlyPolicy);
    expect(resVerified.appliedCap?.type).toBe('statutory');
    expect(resVerified.appliedCap?.cappedMinutes).toBe(0); // 3000 - 3000 = 0 available
    expect(resVerified.eligibleOtMinutes).toBe(0);
    expect(
      resVerified.complianceNotes?.some((n) => n.includes('verified statutory quarterly limit')),
    ).toBe(true);
  });
});
