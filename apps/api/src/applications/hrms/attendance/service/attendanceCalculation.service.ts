import type {
  CalculationInput,
  CalculationResult,
  ShiftSchedule,
  OnDutyRulesConfig,
  AttendanceStatus,
  AttendanceProcessingState,
} from '../types/attendance.types.js';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function getDayOfWeekName(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year!, month! - 1, day!));
  return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

export const DEFAULT_WORK_SCHEDULE: ShiftSchedule = {
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
  lunchMinutes: 0,
  timeZone: 'UTC',
  scheduleRef: 'default_9_to_6',
};

export class AttendanceCalculationService {
  /**
   * Deterministically calculates daily worked duration, late/early flags,
   * missing punches, and attendance status based on schedule and policy.
   */
  calculate(input: CalculationInput): CalculationResult {
    const { date, checkInTime, checkOutTime, schedule, policy, isOnApprovedLeave } = input;
    const isToday = Boolean(input.isToday);

    // 1. Leave override
    if (isOnApprovedLeave) {
      return {
        status: 'on_leave',
        processingState: 'finalized',
        workedMinutes: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        isLate: false,
        isEarlyExit: false,
        isMissingPunch: false,
        isPayrollReady: true,
        shiftScheduleRef: schedule.scheduleRef,
        calculationMetadata: { reason: 'Approved Leave' },
      };
    }

    const dayName = getDayOfWeekName(date);
    const dayIndex = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const isWorkingDay = (schedule.workingDays as Array<string | number>).some((d) => {
      if (typeof d === 'number') {
        return d === dayIndex || (d === 7 && dayIndex === 0);
      }
      return String(d).toLowerCase() === dayName.toLowerCase();
    });

    // 2. Off-day / Weekend handling
    if (!isWorkingDay && !checkInTime && !checkOutTime) {
      return {
        status: 'holiday',
        processingState: 'finalized',
        workedMinutes: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        isLate: false,
        isEarlyExit: false,
        isMissingPunch: false,
        isPayrollReady: true,
        shiftScheduleRef: schedule.scheduleRef,
        calculationMetadata: { dayName, isWorkingDay: false },
      };
    }

    // 3. No punches recorded on working day
    if (!checkInTime && !checkOutTime) {
      return {
        status: 'absent',
        processingState: 'finalized',
        workedMinutes: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        isLate: false,
        isEarlyExit: false,
        isMissingPunch: false,
        isPayrollReady: true,
        shiftScheduleRef: schedule.scheduleRef,
        calculationMetadata: { dayName, isWorkingDay: true, punchesPresent: false },
      };
    }

    let isLate = false;
    let lateMinutes = 0;
    let isEarlyExit = false;
    let earlyMinutes = 0;
    let isMissingPunch = false;
    let workedMinutes = 0;

    const startMinutes = timeToMinutes(schedule.startTime);
    const endMinutes = timeToMinutes(schedule.endTime);
    const gracePeriod = policy.gracePeriodMinutes ?? 15;

    const isOvernightShift = endMinutes < startMinutes;

    // 4. Check-in analysis
    const lateConfig = (policy.classificationRules as Record<string, unknown> | null)
      ?.lateArrivalConfig as
      | {
          countingMode?: 'after_grace' | 'from_start';
          extendedLateThresholdMinutes?: number;
          extendedLateAction?: string;
        }
      | undefined;
    const earlyConfig = (policy.classificationRules as Record<string, unknown> | null)
      ?.earlyExitConfig as
      | {
          graceMinutes?: number;
          extendedEarlyExitThresholdMinutes?: number;
          extendedEarlyExitAction?: string;
        }
      | undefined;
    const workingConfig = (policy.classificationRules as Record<string, unknown> | null)
      ?.workingHoursConfig as
      { netOrGross?: 'net' | 'gross'; workingHoursMode?: string } | undefined;

    if (checkInTime) {
      if (policy.enableLateTracking !== false) {
        const checkInMinutes = timeToMinutes(checkInTime);
        let arrivalMinutes = checkInMinutes;
        // Overnight shift normalization: arrival after midnight on overnight shift
        if (isOvernightShift && checkInMinutes < startMinutes && checkInMinutes <= endMinutes) {
          arrivalMinutes = checkInMinutes + 1440;
        }

        if (arrivalMinutes > startMinutes + gracePeriod) {
          isLate = true;
          // Count late minutes either from start or only excess after grace
          if (lateConfig?.countingMode === 'after_grace') {
            lateMinutes = arrivalMinutes - (startMinutes + gracePeriod);
          } else {
            lateMinutes = arrivalMinutes - startMinutes;
          }
        }
      }
    } else {
      // Punched out without punching in
      isMissingPunch = true;
    }

    // 5. Check-out analysis & worked hours
    const earlyExitGrace = earlyConfig?.graceMinutes ?? 0;
    if (checkOutTime) {
      const checkOutMinutes = timeToMinutes(checkOutTime);

      if (policy.enableEarlyExitTracking !== false) {
        if (isOvernightShift) {
          const normalizedEnd = endMinutes + 1440;
          const normalizedCheckOut =
            checkOutMinutes < startMinutes ? checkOutMinutes + 1440 : checkOutMinutes;
          if (normalizedCheckOut < normalizedEnd - earlyExitGrace) {
            isEarlyExit = true;
            earlyMinutes = normalizedEnd - normalizedCheckOut;
          }
        } else {
          if (checkOutMinutes < endMinutes - earlyExitGrace) {
            isEarlyExit = true;
            earlyMinutes = endMinutes - checkOutMinutes;
          }
        }
      }

      if (checkInTime) {
        const checkInMinutes = timeToMinutes(checkInTime);
        const grossMinutes =
          checkOutMinutes >= checkInMinutes
            ? checkOutMinutes - checkInMinutes
            : 1440 - checkInMinutes + checkOutMinutes;

        // Break deduction based on breakDeductionMethod
        let breakDeduction = 0;
        if (policy.breakDeductionMethod === 'none') {
          breakDeduction = 0;
        } else if (policy.breakDeductionMethod === 'actual') {
          breakDeduction =
            schedule.lunchMinutes ||
            (grossMinutes >= 240 ? Math.min(schedule.breakMinutes ?? 0, 60) : 0);
        } else {
          // 'scheduled'
          breakDeduction = grossMinutes >= 240 ? Math.min(schedule.breakMinutes ?? 0, 60) : 0;
        }

        if (workingConfig?.netOrGross === 'gross') {
          workedMinutes = grossMinutes;
        } else {
          workedMinutes = Math.max(0, grossMinutes - breakDeduction);
        }
      }
    } else {
      // Check-in present, but no check-out
      if (!isToday) {
        isMissingPunch = true;
      }
    }

    // 6. Status determination based on thresholds
    let halfDayThresholdHours = Number(policy.halfDayThresholdHours ?? 4.0);
    let fullDayThresholdHours = Number(policy.fullDayThresholdHours ?? 8.0);

    const classificationRules = policy.classificationRules as Record<string, unknown> | null;
    if (classificationRules?.thresholdMode === 'percentage_of_shift') {
      const shiftGrossHours = Math.max(
        1,
        (endMinutes - startMinutes - (schedule.breakMinutes ?? 0)) / 60,
      );
      const fullPct = Number(classificationRules.fullDayPercentage ?? 100);
      const halfPct = Number(classificationRules.halfDayPercentage ?? 50);
      fullDayThresholdHours = (fullPct / 100) * shiftGrossHours;
      halfDayThresholdHours = (halfPct / 100) * shiftGrossHours;
    }

    const effectiveFullDayThreshold = isLate
      ? fullDayThresholdHours
      : Math.max(halfDayThresholdHours, fullDayThresholdHours - gracePeriod / 60);
    const workedHours = workedMinutes / 60;

    let status: AttendanceStatus = 'present';
    let processingState: AttendanceProcessingState = 'finalized';
    let isPayrollReady = true;

    if (isMissingPunch) {
      if (policy.missingPunchPolicy === 'mark_absent') {
        status = 'absent';
        processingState = 'finalized';
        isPayrollReady = true;
      } else if (policy.missingPunchPolicy === 'half_day') {
        status = 'half_day';
        processingState = 'finalized';
        isPayrollReady = true;
      } else {
        // Policy is 'flag_exception' (or unresolved)
        // Must NOT finalize as present, half_day, or absent solely because a punch is missing!
        // Unresolved missing punches are held in 'incomplete' status and 'pending_review' processing state.
        status = 'incomplete';
        processingState = 'pending_review';
        isPayrollReady = false;
        workedMinutes = 0; // Unverified duration is not invented
      }
    } else if (checkInTime && checkOutTime) {
      processingState = 'finalized';
      isPayrollReady = true;
      if (workedHours < halfDayThresholdHours) {
        if (classificationRules?.insufficientHoursAction === 'absent') {
          status = 'absent';
        } else if (classificationRules?.insufficientHoursAction === 'half_day') {
          status = 'half_day';
        } else {
          status = workedHours >= 1.0 ? 'half_day' : 'absent';
        }
      } else if (workedHours < effectiveFullDayThreshold) {
        status = 'half_day';
      } else {
        status = 'present';
      }

      // Check extended late action override
      if (
        isLate &&
        lateConfig?.extendedLateThresholdMinutes &&
        lateMinutes >= lateConfig.extendedLateThresholdMinutes
      ) {
        if (lateConfig.extendedLateAction === 'half_day') {
          status = 'half_day';
        } else if (lateConfig.extendedLateAction === 'mark_absent') {
          status = 'absent';
        }
      }

      // Check extended early exit action override
      if (
        isEarlyExit &&
        earlyConfig?.extendedEarlyExitThresholdMinutes &&
        earlyMinutes >= earlyConfig.extendedEarlyExitThresholdMinutes
      ) {
        if (earlyConfig.extendedEarlyExitAction === 'half_day') {
          status = 'half_day';
        } else if (earlyConfig.extendedEarlyExitAction === 'mark_absent') {
          status = 'absent';
        }
      }
    } else if (checkInTime && !checkOutTime) {
      // Currently clocked in today
      status = 'present';
      processingState = isToday ? 'provisional' : 'pending_review';
      isPayrollReady = false;
    }

    return {
      status,
      processingState,
      workedMinutes,
      lateMinutes,
      earlyMinutes,
      isLate,
      isEarlyExit,
      isMissingPunch,
      isPayrollReady,
      shiftScheduleRef: schedule.scheduleRef,
      calculationMetadata: {
        scheduledStart: schedule.startTime,
        scheduledEnd: schedule.endTime,
        gracePeriodApplied: gracePeriod,
        workedHours: Math.round(workedHours * 100) / 100,
        dayName,
      },
    };
  }

  /**
   * Deterministically calculates late penalty units for Payroll Readiness.
   * Payroll owns monetary calculation; Attendance provides validated penalty units.
   */
  calculatePenaltyUnits(
    lateMarksCount: number,
    penaltyRules?: {
      enabled: boolean;
      lateMarksThreshold: number;
      penaltyUnit: string;
      isRepeating?: boolean;
      maxPenaltyUnits?: number | null;
      warningOnly?: boolean;
    } | null,
  ): {
    penaltyUnits: number;
    triggers: number;
    isCapped: boolean;
    isWarningOnly: boolean;
    unitType: string;
    explanation: string;
  } {
    if (
      !penaltyRules ||
      !penaltyRules.enabled ||
      lateMarksCount < penaltyRules.lateMarksThreshold
    ) {
      return {
        penaltyUnits: 0,
        triggers: 0,
        isCapped: false,
        isWarningOnly: false,
        unitType: penaltyRules?.penaltyUnit || 'none',
        explanation: 'Below threshold or penalties disabled',
      };
    }

    if (penaltyRules.warningOnly || penaltyRules.penaltyUnit === 'warning_only') {
      return {
        penaltyUnits: 0,
        triggers: 1,
        isCapped: false,
        isWarningOnly: true,
        unitType: 'warning_only',
        explanation: `Warning-only consequence issued for ${lateMarksCount} late marks`,
      };
    }

    // Map penalty unit to day-equivalent units
    let unitValue = 0.5; // default half_day
    if (penaltyRules.penaltyUnit === 'quarter_day') unitValue = 0.25;
    else if (
      penaltyRules.penaltyUnit === 'half_day' ||
      penaltyRules.penaltyUnit === 'half_day_deduction'
    )
      unitValue = 0.5;
    else if (
      penaltyRules.penaltyUnit === 'full_day' ||
      penaltyRules.penaltyUnit === 'full_day_deduction' ||
      penaltyRules.penaltyUnit === 'loss_of_pay'
    )
      unitValue = 1.0;

    let triggers = 1;
    if (penaltyRules.isRepeating) {
      triggers = Math.floor(lateMarksCount / penaltyRules.lateMarksThreshold);
    }

    let penaltyUnits = triggers * unitValue;
    let isCapped = false;
    let explanation = `Applied ${triggers} trigger(s) of ${unitValue} day deduction unit(s)`;

    if (penaltyRules.maxPenaltyUnits != null && penaltyRules.maxPenaltyUnits > 0) {
      if (penaltyUnits > penaltyRules.maxPenaltyUnits) {
        penaltyUnits = penaltyRules.maxPenaltyUnits;
        isCapped = true;
        explanation = `Calculated ${triggers * unitValue} penalty units, capped at maximum ${penaltyRules.maxPenaltyUnits}`;
      }
    }

    return {
      penaltyUnits,
      triggers,
      isCapped,
      isWarningOnly: false,
      unitType: penaltyRules.penaltyUnit,
      explanation,
    };
  }

  /**
   * Evaluates approved On-Duty (OD) record for attendance classification.
   * Prevents fabricating false biometric punches while honoring authorized credit.
   */
  evaluateOnDutyAttendance(
    od: {
      id?: string;
      odType?: string;
      type?: string;
      durationType?: 'full_day' | 'half_day' | 'hourly';
      duration?: 'full_day' | 'half_day' | 'hourly';
      status?: string;
      hours?: number;
    },
    policyOrRules?: {
      odRules?: OnDutyRulesConfig | null;
      enabled?: boolean;
      odTypes?: string[];
      creditTreatment?: 'count_as_present' | 'verified_hours';
      punchRule?: 'exempt' | 'required_at_location';
    } | null,
  ): CalculationResult & {
    creditedStatus: 'present' | 'half_day' | null;
    isPunchExempt: boolean;
    creditedWorkedMinutes: number;
  } {
    const rules =
      policyOrRules?.odRules ||
      (policyOrRules?.enabled !== undefined ? (policyOrRules as OnDutyRulesConfig) : null);
    const duration = od.durationType || od.duration || 'full_day';
    const isApproved = !od.status || od.status === 'approved';

    if (!isApproved) {
      return {
        status: 'absent',
        processingState: 'finalized',
        workedMinutes: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        isLate: false,
        isEarlyExit: false,
        isMissingPunch: false,
        isPayrollReady: false,
        shiftScheduleRef: 'on_duty_pending_or_rejected',
        calculationMetadata: {
          reason: 'Non-approved On-Duty (OD)',
          odType: od.odType || od.type || 'OD',
          status: od.status,
          isOdCredit: false,
        },
        creditedStatus: null,
        isPunchExempt: false,
        creditedWorkedMinutes: 0,
      };
    }

    const isPresent = rules?.creditTreatment !== 'verified_hours' || duration === 'full_day';
    const creditedStatus: 'present' | 'half_day' =
      isPresent && duration !== 'half_day' ? 'present' : 'half_day';
    const creditedWorkedMinutes =
      duration === 'full_day'
        ? 480
        : duration === 'half_day'
          ? 240
          : Math.round((od.hours ?? 4) * 60);
    const isPunchExempt = rules?.punchRule !== 'required_at_location';

    return {
      status: creditedStatus,
      processingState: 'finalized',
      workedMinutes: creditedWorkedMinutes,
      lateMinutes: 0,
      earlyMinutes: 0,
      isLate: false,
      isEarlyExit: false,
      isMissingPunch: false,
      isPayrollReady: true,
      shiftScheduleRef: 'on_duty_authorized',
      calculationMetadata: {
        reason: 'Approved On-Duty (OD)',
        odType: od.odType || od.type || 'OD',
        durationType: duration,
        isOdCredit: true,
        isPunchExempt,
      },
      creditedStatus,
      isPunchExempt,
      creditedWorkedMinutes,
    };
  }
}

export const attendanceCalculationService = new AttendanceCalculationService();
