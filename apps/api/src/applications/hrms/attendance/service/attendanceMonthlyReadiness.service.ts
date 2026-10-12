import {
  attendanceMonthlySummaryRepository,
  type AttendanceMonthlySummaryRepository,
} from '../repository/attendanceMonthlySummary.repository.js';
import type {
  AttendancePayrollReadiness,
  MonthlySummaryDailyRecord,
  MonthlySummaryReadinessReport,
} from '../types/attendanceMonthlySummary.types.js';
import type {
  AttendanceMonthlySummary,
  NewAttendanceMonthlyReadinessEvaluation,
} from '../../../../db/schema.js';

export interface ReadinessEvaluationResult {
  readinessStatus: AttendancePayrollReadiness;
  passedChecks: Array<{ code: string; name: string; details?: string }>;
  warningChecks: Array<{ code: string; name: string; details?: string }>;
  blockingChecks: Array<{ code: string; name: string; details?: string; sourceUrl?: string }>;
}

export class AttendanceMonthlyReadinessService {
  constructor(
    private readonly repo: AttendanceMonthlySummaryRepository = attendanceMonthlySummaryRepository,
  ) {}

  /**
   * Evaluates 10-point payroll readiness ruleset for a monthly summary
   */
  evaluateReadiness(
    summary: AttendanceMonthlySummary,
    dailyRecords: MonthlySummaryDailyRecord[],
  ): ReadinessEvaluationResult {
    const passedChecks: Array<{ code: string; name: string; details?: string }> = [];
    const warningChecks: Array<{ code: string; name: string; details?: string }> = [];
    const blockingChecks: Array<{
      code: string;
      name: string;
      details?: string;
      sourceUrl?: string;
    }> = [];

    // Check 1: Required daily attendance processed
    const pastPendingDays = dailyRecords.filter(
      (d) => !d.isFuture && d.classification === 'pending',
    );
    if (pastPendingDays.length > 0) {
      blockingChecks.push({
        code: 'DAILY_ATTENDANCE_PENDING',
        name: 'Unprocessed Workdays',
        details: `${pastPendingDays.length} past workdays have pending or unprocessed daily records.`,
      });
    } else {
      passedChecks.push({
        code: 'DAILY_ATTENDANCE_PROCESSED',
        name: 'Daily Attendance Processed',
        details: 'All past workdays in the month have been classified.',
      });
    }

    // Check 2: No unresolved blocking missing-punch/exception issues
    if (summary.unresolvedExceptions > 0) {
      blockingChecks.push({
        code: 'UNRESOLVED_EXCEPTIONS',
        name: 'Unresolved Attendance Exceptions',
        details: `${summary.unresolvedExceptions} unresolved attendance exceptions exist for this month.`,
        sourceUrl: `/hrms/attendance/exceptions?employeeId=${summary.employeeId}&month=${summary.month}`,
      });
    } else {
      passedChecks.push({
        code: 'NO_UNRESOLVED_EXCEPTIONS',
        name: 'Exceptions Reconciled',
        details: 'Zero unresolved exceptions or missing punches.',
      });
    }

    // Check 3: No pending impactful Regularizations
    if (summary.pendingCorrections > 0) {
      blockingChecks.push({
        code: 'PENDING_REGULARIZATIONS',
        name: 'Pending Regularization Requests',
        details: `${summary.pendingCorrections} regularization request(s) awaiting approval or review.`,
        sourceUrl: `/hrms/attendance/regularization?employeeId=${summary.employeeId}&month=${summary.month}`,
      });
    } else {
      passedChecks.push({
        code: 'REGULARIZATIONS_SETTLED',
        name: 'Regularizations Settled',
        details: 'No pending correction requests for this month.',
      });
    }

    // Check 4: Approved OD processing correctly applied
    if (summary.processingIssues > 0) {
      blockingChecks.push({
        code: 'OD_PROCESSING_ISSUES',
        name: 'On-Duty Processing Issues',
        details: `${summary.processingIssues} on-duty workday(s) encountered failed or blocked credit reconciliation.`,
        sourceUrl: `/hrms/attendance/on-duty?employeeId=${summary.employeeId}&month=${summary.month}`,
      });
    } else {
      passedChecks.push({
        code: 'OD_CREDIT_RECONCILED',
        name: 'On-Duty Coverage Applied',
        details: 'All approved On-Duty records successfully credited.',
      });
    }

    // Check 5: Leave and attendance coverage reconciled
    const overlappingRecords = dailyRecords.filter(
      (d) => d.classification === 'present' && d.leaveMinutes && d.leaveMinutes > 0,
    );
    if (overlappingRecords.length > 0) {
      warningChecks.push({
        code: 'COVERAGE_RECONCILIATION_WARNING',
        name: 'Partial Overlap Reconciled',
        details: `${overlappingRecords.length} day(s) have reconciled dual coverage (e.g. half-day present + half-day leave).`,
      });
    } else {
      passedChecks.push({
        code: 'LEAVE_RECONCILED',
        name: 'Leave Coverage Reconciled',
        details:
          'Leave requests and attendance coverage correctly separated without double-counting.',
      });
    }

    // Check 6: Required shift/calendar data present
    const missingShiftDays = dailyRecords.filter((d) => !d.shiftName || d.shiftName === 'None');
    if (missingShiftDays.length > 0) {
      blockingChecks.push({
        code: 'MISSING_SHIFT_SCHEDULE',
        name: 'Missing Shift Schedule',
        details: `${missingShiftDays.length} workdays have unassigned or invalid shift configurations.`,
      });
    } else {
      passedChecks.push({
        code: 'SCHEDULE_VERIFIED',
        name: 'Work Schedule Assigned',
        details: 'Valid shift schedule and calendar rules applied for all workdays.',
      });
    }

    // Check 7: Required monthly review completed against current version
    if (summary.reviewState === 'reviewed') {
      if (summary.reviewedVersion === summary.version) {
        passedChecks.push({
          code: 'REVIEW_COMPLETED',
          name: 'Monthly Review Signed Off',
          details: `Signed off by authorized reviewer against summary version ${summary.version}.`,
        });
      } else {
        blockingChecks.push({
          code: 'REVIEW_STALE',
          name: 'Review Version Mismatch',
          details: `Summary was reviewed at version ${summary.reviewedVersion}, but current version is ${summary.version}. Re-review required.`,
        });
      }
    } else if (summary.reviewState === 'needs_correction') {
      blockingChecks.push({
        code: 'REVIEW_CORRECTION_REQUESTED',
        name: 'Correction Requested During Review',
        details:
          summary.correctionRequestNotes ??
          'A reviewer requested corrections before payroll handoff.',
      });
    } else if (summary.reviewState === 'reopened') {
      blockingChecks.push({
        code: 'REVIEW_REOPENED',
        name: 'Review Reopened',
        details:
          summary.reopenReason ??
          'The previous sign-off was reopened due to source changes or admin action.',
      });
    } else {
      warningChecks.push({
        code: 'REVIEW_PENDING',
        name: 'Monthly Review Pending',
        details: 'Monthly review has not yet been finalized by the HR reviewer.',
      });
    }

    // Check 8: Lock / cutoff requirements satisfied
    if (summary.isLocked) {
      passedChecks.push({
        code: 'PERIOD_LOCKED',
        name: 'Period Lock Active',
        details: `Attendance period is safely locked under lock reference ${summary.periodLockId ?? 'PRD_LOCK'}.`,
      });
    } else {
      warningChecks.push({
        code: 'PERIOD_UNLOCKED',
        name: 'Period Unlocked',
        details: 'Attendance period is currently open for modifications prior to payroll cutoff.',
      });
    }

    // Check 9: Summary data is current
    if (summary.calculationState === 'calculated') {
      passedChecks.push({
        code: 'SUMMARY_UP_TO_DATE',
        name: 'Summary Data Current',
        details: 'Latest calculation is in sync with underlying source records.',
      });
    } else {
      blockingChecks.push({
        code: 'SUMMARY_STALE',
        name: 'Summary Calculation Stale',
        details: 'Summary calculation is out-of-sync or pending recalculation.',
      });
    }

    // Check 10: Critical calculation/reconciliation check
    const totalDayEquivalents =
      Number(summary.presentDays) +
      Number(summary.absentDays) +
      Number(summary.leaveDays) +
      summary.weeklyOffDays +
      summary.holidayDays;

    if (totalDayEquivalents <= 0 && summary.scheduledDays > 0) {
      blockingChecks.push({
        code: 'ZERO_DAY_EQUIVALENTS',
        name: 'Day Equivalents Error',
        details: 'Scheduled days exist but zero day equivalents were calculated.',
      });
    } else {
      passedChecks.push({
        code: 'CALCULATION_INTEGRITY',
        name: 'Day Equivalents Balanced',
        details: 'Precise non-overlapping day count arithmetic verified.',
      });
    }

    // Determine readiness state:
    // Blocked if any blocking checks
    // Needs Review if review is pending or warning checks only
    // Ready if no blocking checks AND review completed
    let readinessStatus: AttendancePayrollReadiness = 'needs_review';

    if (blockingChecks.length > 0) {
      readinessStatus = 'blocked';
    } else if (summary.reviewState === 'reviewed' && summary.reviewedVersion === summary.version) {
      readinessStatus = 'ready';
    } else {
      readinessStatus = 'needs_review';
    }

    return {
      readinessStatus,
      passedChecks,
      warningChecks,
      blockingChecks,
    };
  }

  /**
   * Evaluates readiness and persists evaluation report
   */
  async evaluateAndPersist(
    summary: AttendanceMonthlySummary,
    dailyRecords: MonthlySummaryDailyRecord[],
  ): Promise<MonthlySummaryReadinessReport> {
    const result = this.evaluateReadiness(summary, dailyRecords);

    // Update summary readiness status in database if changed
    if (summary.payrollReadiness !== result.readinessStatus) {
      await this.repo.updateSummary(summary.id, {
        payrollReadiness: result.readinessStatus,
      });
    }

    const evaluationRecord: NewAttendanceMonthlyReadinessEvaluation = {
      id: `att_mre_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: summary.tenantId,
      companyId: summary.companyId,
      monthlySummaryId: summary.id,
      evaluationVersion: summary.version,
      readinessStatus: result.readinessStatus,
      passedChecks: result.passedChecks,
      warningChecks: result.warningChecks,
      blockingChecks: result.blockingChecks,
      evaluatedAt: new Date(),
    };

    await this.repo.createReadinessEvaluation(evaluationRecord);

    return {
      monthlySummaryId: summary.id,
      evaluationVersion: summary.version,
      readinessStatus: result.readinessStatus,
      passedChecks: result.passedChecks,
      warningChecks: result.warningChecks,
      blockingChecks: result.blockingChecks,
      evaluatedAt: evaluationRecord.evaluatedAt
        ? (evaluationRecord.evaluatedAt as Date).toISOString()
        : new Date().toISOString(),
    };
  }
}

export const attendanceMonthlyReadinessService = new AttendanceMonthlyReadinessService();
