/**
 * BEZENT HRMS — Overtime Calculation Engine (V1.0)
 *
 * Implements deterministic, audited calculation of:
 * - Scheduled vs Actual Worked vs Extra Worked minutes
 * - Day type eligibility (Regular, Weekly Off, Holiday)
 * - Employment type & organizational scope eligibility
 * - Policy threshold validation (minimum qualifying duration)
 * - Daily, weekly, monthly and statutory caps
 * - Rounding rules (exact, round_down_15, round_nearest_15, round_down_30, round_nearest_30)
 * - Source interval validation and overlap detection
 * - Strict integer minute accounting
 */

import type {
  AttendanceOvertimePolicy,
  OvertimeRoundingRule,
  OvertimeWorkdayContext,
  OvertimeCalculationResult,
  OvertimeSourceInterval,
  OvertimePolicyStatutoryRules,
} from '../types/attendanceOvertime.types.js';

export class AttendanceOvertimeCalculationService {
  /**
   * Applies the configured rounding rule to raw minute value
   */
  applyRounding(minutes: number, rule: OvertimeRoundingRule): { roundedMinutes: number; delta: number } {
    if (minutes <= 0) return { roundedMinutes: 0, delta: 0 };

    let rounded: number;
    switch (rule) {
      case 'exact':
        rounded = minutes;
        break;
      case 'round_down_15':
        rounded = Math.floor(minutes / 15) * 15;
        break;
      case 'round_nearest_15':
        rounded = Math.round(minutes / 15) * 15;
        break;
      case 'round_down_30':
        rounded = Math.floor(minutes / 30) * 30;
        break;
      case 'round_nearest_30':
        rounded = Math.round(minutes / 30) * 30;
        break;
      default:
        rounded = Math.floor(minutes / 15) * 15;
    }

    return {
      roundedMinutes: Math.max(0, rounded),
      delta: rounded - minutes,
    };
  }

  /**
   * Validates source intervals for valid format and zero overlaps.
   * Throws an error or returns validation failure.
   */
  validateSourceIntervals(intervals: OvertimeSourceInterval[]): {
    isValid: boolean;
    totalIntervalMinutes: number;
    errorMessage?: string;
  } {
    if (!intervals || intervals.length === 0) {
      return { isValid: true, totalIntervalMinutes: 0 };
    }

    // Helper to parse HH:mm to minutes from midnight
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':').map((p) => parseInt(p, 10));
      if (parts.length < 2 || isNaN(parts[0]!) || isNaN(parts[1]!)) {
        throw new Error(`Invalid time format '${timeStr}'. Expected HH:mm.`);
      }
      return parts[0]! * 60 + parts[1]!;
    };

    const parsedRanges: Array<{ start: number; end: number; duration: number }> = [];

    for (const interval of intervals) {
      if (!interval.startTime || !interval.endTime) {
        return { isValid: false, totalIntervalMinutes: 0, errorMessage: 'Interval must have startTime and endTime' };
      }

      const start = parseTime(interval.startTime);
      let end = parseTime(interval.endTime);

      // Handle overnight interval (crosses midnight, e.g. 22:00 to 02:00)
      if (end < start) {
        end += 24 * 60; // add 1440 minutes
      }

      const calcDuration = end - start;
      if (calcDuration <= 0) {
        return {
          isValid: false,
          totalIntervalMinutes: 0,
          errorMessage: `Invalid interval ${interval.startTime} to ${interval.endTime}: end time must be after start time.`,
        };
      }

      parsedRanges.push({ start, end, duration: calcDuration });
    }

    // Sort by start
    parsedRanges.sort((a, b) => a.start - b.start);

    // Check overlaps
    for (let i = 0; i < parsedRanges.length - 1; i++) {
      const current = parsedRanges[i]!;
      const next = parsedRanges[i + 1]!;
      if (current.end > next.start) {
        return {
          isValid: false,
          totalIntervalMinutes: 0,
          errorMessage: `Overlapping overtime intervals detected between [${Math.floor(current.start / 60)}:${current.start % 60} - ${Math.floor(current.end / 60)}:${current.end % 60}] and [${Math.floor(next.start / 60)}:${next.start % 60} - ${Math.floor(next.end / 60)}:${next.end % 60}].`,
        };
      }
    }

    const totalMinutes = parsedRanges.reduce((acc, r) => acc + r.duration, 0);
    return { isValid: true, totalIntervalMinutes: totalMinutes };
  }

  /**
   * Calculates overtime eligibility, extra worked minutes, caps and rounding
   * based on authoritative workday attendance context and effective policy version.
   */
  calculateOvertime(
    context: OvertimeWorkdayContext,
    policy: AttendanceOvertimePolicy,
  ): OvertimeCalculationResult {
    const complianceNotes: string[] = [];

    // 1. Policy Enablement Check
    if (!policy.isEnabled || !policy.isActive) {
      return {
        scheduledMinutes: context.scheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: 0,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Overtime policy is disabled or inactive for this organization.',
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    // 2. Scope & Employment Type Eligibility
    const eligibleEmpTypes = (policy.eligibleEmploymentTypes as string[] | null) || [];
    if (
      eligibleEmpTypes.length > 0 &&
      context.employeeEmploymentType &&
      !eligibleEmpTypes.includes(context.employeeEmploymentType)
    ) {
      return {
        scheduledMinutes: context.scheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: 0,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: `Employment type '${context.employeeEmploymentType}' is not eligible for overtime under this policy.`,
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    const eligibleDepts = (policy.eligibleDepartments as string[] | null) || [];
    if (
      eligibleDepts.length > 0 &&
      context.employeeDepartmentId &&
      !eligibleDepts.includes(context.employeeDepartmentId)
    ) {
      return {
        scheduledMinutes: context.scheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: 0,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Department is not eligible for overtime under this policy.',
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    // 3. Workday Type Eligibility
    const workdayEligibility = (policy.workdayEligibility as {
      regular?: boolean;
      weeklyOff?: boolean;
      holiday?: boolean;
    } | null) || { regular: true, weeklyOff: true, holiday: true };

    if (context.dayType === 'regular' && workdayEligibility.regular === false) {
      return {
        scheduledMinutes: context.scheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: 0,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Overtime is not permitted on regular working days under this policy.',
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    if (context.dayType === 'weekly_off' && workdayEligibility.weeklyOff === false) {
      return {
        scheduledMinutes: 0,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: context.actualWorkedMinutes,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Overtime is not permitted on weekly offs under this policy.',
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    if (context.dayType === 'holiday' && workdayEligibility.holiday === false) {
      return {
        scheduledMinutes: 0,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: context.actualWorkedMinutes,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Overtime is not permitted on company holidays under this policy.',
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    // 4. Incomplete punches validation (Do NOT invent actual working hours)
    if (context.isMissingPunch && !context.isRegularized) {
      return {
        scheduledMinutes: context.scheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: 0,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason:
          'Attendance contains incomplete or missing punches. Must be regularized before claiming overtime.',
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    // 5. Authoritative Baseline Check
    // If regular workday has no authoritative shift or policy baseline, fail with explicit eligibility-unavailable
    if (context.dayType === 'regular' && context.hasAuthoritativeBaseline === false) {
      return {
        scheduledMinutes: context.scheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: 0,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason:
          'Eligibility unavailable: No authoritative shift schedule or approved company policy baseline exists for this workday.',
        roundingAdjustmentMinutes: 0,
        complianceNotes: [
          'Calculation baseline unavailable: Requires authoritative shift assignment or approved company policy baseline.',
        ],
      };
    }

    // 6. Calculate Extra Worked Minutes
    // On weekly off or holiday, scheduled time is 0 unless defined, so all worked time counts as extra
    let effectiveScheduledMinutes = context.scheduledMinutes;
    if (context.dayType === 'weekly_off' || context.dayType === 'holiday') {
      effectiveScheduledMinutes = 0;
    }

    const extraWorkedMinutes = Math.max(0, context.actualWorkedMinutes - effectiveScheduledMinutes);

    if (extraWorkedMinutes <= 0) {
      return {
        scheduledMinutes: effectiveScheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes: 0,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'No extra hours worked beyond scheduled requirement.',
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    // 7. Minimum Qualifying Threshold
    const minQualifying = policy.minimumQualifyingMinutes || 30;
    if (extraWorkedMinutes < minQualifying) {
      return {
        scheduledMinutes: effectiveScheduledMinutes,
        actualWorkedMinutes: context.actualWorkedMinutes,
        extraWorkedMinutes,
        eligibleOtMinutes: 0,
        isEligible: false,
        nonEligibilityReason: `Extra worked duration (${extraWorkedMinutes} mins) is below the minimum qualifying threshold (${minQualifying} mins).`,
        roundingAdjustmentMinutes: 0,
        complianceNotes,
      };
    }

    // 8. Policy Caps and Statutory Limits
    let calculatedMinutes = extraWorkedMinutes;
    let appliedCap: OvertimeCalculationResult['appliedCap'] = undefined;

    // Daily Policy Cap
    const dailyCap = policy.dailyCapMinutes || 240;
    if (calculatedMinutes > dailyCap) {
      appliedCap = {
        type: 'daily',
        originalMinutes: calculatedMinutes,
        cappedMinutes: dailyCap,
      };
      calculatedMinutes = dailyCap;
    }

    // Statutory Limits (cannot be overridden by company policy)
    // Separate configured company limits from verified jurisdiction-specific legal constraints.
    const statutoryRules = (policy.statutoryRules as OvertimePolicyStatutoryRules | null) || {};

    let requiresComplianceReview = false;
    // Check if statutory requirements are unresolved or unverified for jurisdiction
    if (
      statutoryRules.requiresComplianceReview === true ||
      (statutoryRules.statutoryJurisdiction && statutoryRules.isJurisdictionVerified === false)
    ) {
      requiresComplianceReview = true;
      complianceNotes.push(
        `Compliance review flagged: Statutory overtime constraints for jurisdiction '${statutoryRules.statutoryJurisdiction || 'unresolved'}' are unverified. Claim requires compliance officer review.`,
      );
    }

    if (statutoryRules.statutoryMaxDailyMinutes && calculatedMinutes > statutoryRules.statutoryMaxDailyMinutes) {
      appliedCap = {
        type: 'statutory',
        originalMinutes: calculatedMinutes,
        cappedMinutes: statutoryRules.statutoryMaxDailyMinutes,
      };
      calculatedMinutes = statutoryRules.statutoryMaxDailyMinutes;
      complianceNotes.push(
        `Capped by statutory daily maximum of ${statutoryRules.statutoryMaxDailyMinutes} minutes (${statutoryRules.complianceLimitationNote || 'Statutory compliance limit'}).`,
      );
    }

    // Weekly Policy & Statutory Cap
    const weeklyCap = policy.weeklyCapMinutes || 720;
    const priorWeekly = context.priorWeeklyApprovedMinutes || 0;
    const availableWeekly = Math.max(0, weeklyCap - priorWeekly);
    if (calculatedMinutes > availableWeekly) {
      appliedCap = {
        type: 'weekly',
        originalMinutes: calculatedMinutes,
        cappedMinutes: availableWeekly,
      };
      calculatedMinutes = availableWeekly;
    }

    if (statutoryRules.statutoryMaxWeeklyMinutes) {
      const statutoryAvailableWeekly = Math.max(0, statutoryRules.statutoryMaxWeeklyMinutes - priorWeekly);
      if (calculatedMinutes > statutoryAvailableWeekly) {
        appliedCap = {
          type: 'statutory',
          originalMinutes: calculatedMinutes,
          cappedMinutes: statutoryAvailableWeekly,
        };
        calculatedMinutes = statutoryAvailableWeekly;
        complianceNotes.push(
          `Capped by statutory weekly limit of ${statutoryRules.statutoryMaxWeeklyMinutes} minutes.`,
        );
      }
    }

    // Monthly Policy Cap
    const monthlyCap = policy.monthlyCapMinutes || 2400;
    const priorMonthly = context.priorMonthlyApprovedMinutes || 0;
    const availableMonthly = Math.max(0, monthlyCap - priorMonthly);
    if (calculatedMinutes > availableMonthly) {
      appliedCap = {
        type: 'monthly',
        originalMinutes: calculatedMinutes,
        cappedMinutes: availableMonthly,
      };
      calculatedMinutes = availableMonthly;
    }

    if (statutoryRules.statutoryMaxMonthlyMinutes) {
      const statutoryAvailableMonthly = Math.max(0, statutoryRules.statutoryMaxMonthlyMinutes - priorMonthly);
      if (calculatedMinutes > statutoryAvailableMonthly) {
        appliedCap = {
          type: 'statutory',
          originalMinutes: calculatedMinutes,
          cappedMinutes: statutoryAvailableMonthly,
        };
        calculatedMinutes = statutoryAvailableMonthly;
        complianceNotes.push(
          `Capped by statutory monthly limit of ${statutoryRules.statutoryMaxMonthlyMinutes} minutes.`,
        );
      }
    }

    // Statutory Quarterly Cap:
    // Important: Do NOT treat any example quarterly cap as universally applicable.
    // Only apply if verified jurisdiction-specific legal constraint is configured.
    if (statutoryRules.statutoryMaxQuarterlyMinutes && statutoryRules.isJurisdictionVerified) {
      const priorQuarterly = context.priorQuarterlyApprovedMinutes || 0;
      const statutoryAvailableQuarterly = Math.max(0, statutoryRules.statutoryMaxQuarterlyMinutes - priorQuarterly);
      if (calculatedMinutes > statutoryAvailableQuarterly) {
        appliedCap = {
          type: 'statutory',
          originalMinutes: calculatedMinutes,
          cappedMinutes: statutoryAvailableQuarterly,
        };
        calculatedMinutes = statutoryAvailableQuarterly;
        complianceNotes.push(
          `Capped by verified statutory quarterly limit of ${statutoryRules.statutoryMaxQuarterlyMinutes} minutes (${statutoryRules.statutoryJurisdiction}).`,
        );
      }
    }

    // 9. Apply Rounding Rule
    const roundingRule = (policy.roundingRule as OvertimeRoundingRule) || 'round_down_15';
    const { roundedMinutes, delta } = this.applyRounding(calculatedMinutes, roundingRule);

    return {
      scheduledMinutes: effectiveScheduledMinutes,
      actualWorkedMinutes: context.actualWorkedMinutes,
      extraWorkedMinutes,
      eligibleOtMinutes: roundedMinutes,
      isEligible: roundedMinutes > 0,
      appliedCap,
      roundingAdjustmentMinutes: delta,
      complianceNotes,
      requiresComplianceReview: requiresComplianceReview || undefined,
    };
  }
}
