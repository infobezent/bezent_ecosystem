/**
 * BEZENT HRMS — Comp-Off Calculation Engine (V1.0)
 *
 * Implements deterministic, audited calculation of:
 * - Qualifying worked minutes from authoritative daily logs, punches & intervals
 * - Workday scenario eligibility (Weekly Off, Holiday, Approved Extra Work)
 * - Half-day vs Full-day conversion thresholds
 * - Conversion rates and rounding rules
 * - Double Benefit Prevention (Overtime vs Comp-Off allocation overlap protection)
 * - Monthly earning caps
 * - Strict integer minute accounting
 */

import type {
  AttendanceCompOffPolicy,
  CompOffRoundingRule,
  CompOffWorkdayContext,
  CompOffCalculationResult,
  CompOffSourceInterval,
} from '../types/attendanceCompOff.types.js';

export class AttendanceCompOffCalculationService {
  /**
   * Validates source intervals for valid format and zero overlaps.
   */
  validateSourceIntervals(intervals: CompOffSourceInterval[]): {
    isValid: boolean;
    totalIntervalMinutes: number;
    errorMessage?: string;
  } {
    if (!intervals || intervals.length === 0) {
      return { isValid: true, totalIntervalMinutes: 0 };
    }

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
        return {
          isValid: false,
          totalIntervalMinutes: 0,
          errorMessage: 'Interval must have startTime and endTime',
        };
      }

      const start = parseTime(interval.startTime);
      let end = parseTime(interval.endTime);

      // Handle overnight interval (crosses midnight, e.g. 22:00 to 02:00)
      if (end < start) {
        end += 24 * 60;
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

    // Overlap protection
    for (let i = 0; i < parsedRanges.length - 1; i++) {
      const current = parsedRanges[i]!;
      const next = parsedRanges[i + 1]!;
      if (current.end > next.start) {
        return {
          isValid: false,
          totalIntervalMinutes: 0,
          errorMessage: `Overlapping intervals detected between [${Math.floor(current.start / 60)}:${current.start % 60} - ${Math.floor(current.end / 60)}:${current.end % 60}] and [${Math.floor(next.start / 60)}:${next.start % 60} - ${Math.floor(next.end / 60)}:${next.end % 60}].`,
        };
      }
    }

    const totalMinutes = parsedRanges.reduce((acc, r) => acc + r.duration, 0);
    return { isValid: true, totalIntervalMinutes: totalMinutes };
  }

  /**
   * Applies rounding to calculated days (e.g. 0.5 step)
   */
  applyRounding(days: number, rule: CompOffRoundingRule): { roundedDays: number; delta: number } {
    if (days <= 0) return { roundedDays: 0, delta: 0 };

    let rounded: number;
    switch (rule) {
      case 'exact':
        rounded = days;
        break;
      case 'round_down_half_day':
        rounded = Math.floor(days * 2) / 2;
        break;
      case 'round_nearest_half_day':
        rounded = Math.round(days * 2) / 2;
        break;
      default:
        rounded = Math.floor(days * 2) / 2;
    }

    return {
      roundedDays: Math.max(0, rounded),
      delta: rounded - days,
    };
  }

  /**
   * Calculates Comp-Off eligibility and credit days based on workday context and policy.
   */
  calculateCompOff(
    context: CompOffWorkdayContext,
    policy: AttendanceCompOffPolicy,
  ): CompOffCalculationResult {
    const complianceNotes: string[] = [];

    // 1. Policy Enablement & Active Status
    if (!policy.isEnabled || !policy.isActive) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Comp-Off policy is disabled or inactive for this organization.',
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
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason: `Employment type '${context.employeeEmploymentType}' is not eligible for Comp-Off under this policy.`,
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
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Department is not eligible for Comp-Off under this policy.',
        complianceNotes,
      };
    }

    // 3. Workday Scenario Eligibility
    const scenarios = (policy.eligibleWorkdayScenarios as {
      weeklyOff?: boolean;
      holiday?: boolean;
      approvedExtraWork?: boolean;
    } | null) || { weeklyOff: true, holiday: true, approvedExtraWork: false };

    if (context.dayType === 'weekly_off' && scenarios.weeklyOff === false) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason:
          'Comp-Off earning is not permitted for weekly offs under this policy.',
        complianceNotes,
      };
    }

    if (context.dayType === 'holiday' && scenarios.holiday === false) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason: 'Comp-Off earning is not permitted for holidays under this policy.',
        complianceNotes,
      };
    }

    if (context.dayType === 'regular' && scenarios.approvedExtraWork === false) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason:
          'Comp-Off earning is not permitted on regular workdays under this policy.',
        complianceNotes,
      };
    }

    // 4. Incomplete Punches Validation
    if (context.isMissingPunch && !context.isRegularized) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason:
          'Attendance contains incomplete or missing punches. Must be regularized before claiming Comp-Off.',
        complianceNotes,
      };
    }

    // 5. Double Benefit Prevention: Account for already allocated Overtime minutes
    // An approved work interval must not generate both payable overtime and Comp-Off credit
    let rawQualifyingMinutes = context.actualWorkedMinutes;
    if (context.dayType === 'regular') {
      rawQualifyingMinutes = Math.max(0, context.actualWorkedMinutes - context.scheduledMinutes);
    }

    const otAllocatedMinutes = context.allocatedOvertimeMinutes || 0;
    if (otAllocatedMinutes > 0) {
      rawQualifyingMinutes = Math.max(0, rawQualifyingMinutes - otAllocatedMinutes);
      complianceNotes.push(
        `Deducted ${otAllocatedMinutes} minutes previously allocated to overtime to prevent double benefits.`,
      );
    }

    if (rawQualifyingMinutes <= 0) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: 0,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason:
          otAllocatedMinutes > 0
            ? 'All extra worked duration on this workday has already been allocated to overtime or prior benefits.'
            : 'No qualifying worked duration beyond scheduled requirement.',
        complianceNotes,
      };
    }

    // 6. Minimum Qualifying Duration Check
    const minQualifying = policy.minimumQualifyingMinutes || 240;
    if (rawQualifyingMinutes < minQualifying) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: rawQualifyingMinutes,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason: `Qualifying worked duration (${rawQualifyingMinutes} mins) is below the minimum qualifying threshold (${minQualifying} mins).`,
        complianceNotes,
      };
    }

    // 7. Full-Day and Half-Day Threshold Evaluation
    const halfDayThreshold = policy.halfDayThresholdMinutes || 240;
    const fullDayThreshold = policy.fullDayThresholdMinutes || 480;

    let baseCreditDays = 0;
    let appliedThreshold: 'half_day' | 'full_day' = 'half_day';
    let integerMinutesEquiv = 0;

    if (rawQualifyingMinutes >= fullDayThreshold) {
      baseCreditDays = 1.0;
      appliedThreshold = 'full_day';
      integerMinutesEquiv = fullDayThreshold;
    } else if (rawQualifyingMinutes >= halfDayThreshold) {
      baseCreditDays = 0.5;
      appliedThreshold = 'half_day';
      integerMinutesEquiv = halfDayThreshold;
    } else {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: rawQualifyingMinutes,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason: `Qualifying worked duration (${rawQualifyingMinutes} mins) does not meet the half-day threshold (${halfDayThreshold} mins).`,
        complianceNotes,
      };
    }

    // 8. Apply Conversion Rate
    const conversionRate = parseFloat(String(policy.conversionRate || '1.00'));
    let calculatedCreditDays = baseCreditDays * conversionRate;

    // 9. Monthly Maximum Earning Cap
    const maxMonthlyLimit = parseFloat(String(policy.maxEarningLimitPerMonthDays || '2.00'));
    const priorMonthlyDays = context.priorMonthlyEarnedDays || 0;
    const availableMonthlyDays = Math.max(0, maxMonthlyLimit - priorMonthlyDays);

    if (availableMonthlyDays <= 0) {
      return {
        actualWorkedMinutes: context.actualWorkedMinutes,
        qualifyingWorkedMinutes: rawQualifyingMinutes,
        eligibleCreditDays: 0,
        eligibleCreditMinutes: 0,
        isEligible: false,
        nonEligibilityReason: `Monthly Comp-Off earning limit reached (${maxMonthlyLimit} days max, ${priorMonthlyDays} already earned this month).`,
        complianceNotes,
      };
    }

    if (calculatedCreditDays > availableMonthlyDays) {
      complianceNotes.push(
        `Capped by monthly maximum earning limit of ${maxMonthlyLimit} days (${priorMonthlyDays} previously earned, ${availableMonthlyDays} remaining).`,
      );
      calculatedCreditDays = availableMonthlyDays;
    }

    // 10. Apply Rounding Rule
    const roundingRule = (policy.roundingRule as CompOffRoundingRule) || 'round_down_half_day';
    const { roundedDays, delta } = this.applyRounding(calculatedCreditDays, roundingRule);

    return {
      actualWorkedMinutes: context.actualWorkedMinutes,
      qualifyingWorkedMinutes: rawQualifyingMinutes,
      eligibleCreditDays: roundedDays,
      eligibleCreditMinutes: integerMinutesEquiv,
      isEligible: roundedDays > 0,
      appliedThreshold,
      roundingAdjustmentDays: delta,
      complianceNotes,
    };
  }
}
