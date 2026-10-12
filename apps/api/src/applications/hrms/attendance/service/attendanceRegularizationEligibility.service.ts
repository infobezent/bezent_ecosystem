import { getDb } from '../../../../db/connection.js';
import {
  employees,
  attendanceGeneralSettings,
  attendanceRegularizationSettings,
  employeeAttendance,
  employeeLeaveRequests,
  attendanceOnDutyRequests,
} from '../../../../db/schema.js';
import { and, eq, lte, gte } from 'drizzle-orm';
import { attendanceRepository } from '../repository/attendance.repository.js';
import { attendanceRegularizationRepository } from '../repository/attendanceRegularization.repository.js';
import type {
  RegularizationEligibilityCheckInput,
  RegularizationEligibilityCheckResult,
} from '../types/attendance.types.js';

export class AttendanceRegularizationEligibilityService {
  /**
   * Evaluates comprehensive submission eligibility and risk profile
   */
  async checkEligibility(
    tenantId: string,
    companyId: string,
    input: RegularizationEligibilityCheckInput,
    attachmentsCount = 0,
    excludeRequestId?: string,
  ): Promise<RegularizationEligibilityCheckResult> {
    const db = getDb();
    const reasons: string[] = [];
    const warnings: string[] = [];
    const riskFactors: string[] = [];

    // 1. Fetch Employee record
    const [emp] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, input.employeeId),
        ),
      )
      .limit(1);

    if (!emp) {
      return {
        eligible: false,
        reasons: ['Employee record not found or does not belong to authorized company.'],
        warnings: [],
        isHighRisk: true,
        riskFactors: ['unknown_employee'],
        context: {
          workday: input.workday,
          trackingStartDate: '2026-01-01',
          employeeJoiningDate: null,
          submissionWindowDays: 7,
          monthlyRequestLimit: 3,
          currentMonthRequestCount: 0,
          existingAttendance: null,
          hasLeaveConflict: false,
          hasOdConflict: false,
          isPayrollLocked: false,
          activeRequestExists: false,
        },
      };
    }

    // 2. Fetch General & Regularization Settings
    const [genSettings] = await db
      .select()
      .from(attendanceGeneralSettings)
      .where(
        and(
          eq(attendanceGeneralSettings.tenantId, tenantId),
          eq(attendanceGeneralSettings.companyId, companyId),
        ),
      )
      .limit(1);

    const [regSettings] = await db
      .select()
      .from(attendanceRegularizationSettings)
      .where(
        and(
          eq(attendanceRegularizationSettings.tenantId, tenantId),
          eq(attendanceRegularizationSettings.companyId, companyId),
        ),
      )
      .limit(1);

    const trackingStartDate = genSettings?.trackingStartDate || '2026-01-01';
    const submissionWindowDays = regSettings?.submissionWindowDays ?? 7;
    const maxRequestsPerMonth = regSettings?.maxRequestsPerMonth ?? 3;
    const requireEvidence = regSettings?.requireEvidence ?? false;

    // 3. Rule: Check if Regularization is disabled globally
    if (regSettings && !regSettings.isEnabled) {
      reasons.push('Attendance regularization is currently disabled in company settings.');
    }

    // 4. Rule: Future Workday restriction
    const todayStr = new Date().toISOString().slice(0, 10);
    if (input.workday > todayStr) {
      reasons.push(
        `Cannot submit regularization for future date (${input.workday}). Today is ${todayStr}.`,
      );
    }

    // 5. Rule: Attendance Tracking Start Date
    if (input.workday < trackingStartDate) {
      reasons.push(
        `Date (${input.workday}) is prior to company attendance tracking start date (${trackingStartDate}).`,
      );
    }

    // 6. Rule: Employee Employment Period
    if (emp.joiningDate && input.workday < emp.joiningDate) {
      reasons.push(
        `Workday (${input.workday}) is before employee joining date (${emp.joiningDate}).`,
      );
    }
    if (emp.lastWorkingDate && input.workday > emp.lastWorkingDate) {
      reasons.push(
        `Workday (${input.workday}) is after employee termination/exit date (${emp.lastWorkingDate}).`,
      );
    }
    if (emp.employmentStatus !== 'active') {
      warnings.push(`Employee status is ${emp.employmentStatus}. Requires authorized review.`);
      riskFactors.push('inactive_employee_status');
    }

    // 7. Rule: Submission Window Days
    const workdayDate = new Date(`${input.workday}T00:00:00Z`);
    const todayDate = new Date(`${todayStr}T00:00:00Z`);
    const diffDays = Math.floor(
      (todayDate.getTime() - workdayDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > submissionWindowDays) {
      reasons.push(
        `Submission window expired: Target date is ${diffDays} days ago, maximum allowed window is ${submissionWindowDays} days.`,
      );
    }

    // 8. Rule: Monthly Request Limit
    const targetYear = parseInt(input.workday.slice(0, 4), 10);
    const targetMonth = parseInt(input.workday.slice(5, 7), 10);
    const monthlyCount = await attendanceRegularizationRepository.countMonthlyRequestsForEmployee(
      tenantId,
      companyId,
      input.employeeId,
      targetYear,
      targetMonth,
    );

    if (maxRequestsPerMonth > 0 && monthlyCount >= maxRequestsPerMonth) {
      reasons.push(
        `Monthly regularization quota exceeded (${monthlyCount}/${maxRequestsPerMonth} requests used for ${input.workday.slice(0, 7)}).`,
      );
    }

    // 9. Rule: Duplicate Active Request
    const activeExists = await attendanceRegularizationRepository.hasActiveRequestForWorkday(
      tenantId,
      companyId,
      input.employeeId,
      input.workday,
      excludeRequestId,
    );
    if (activeExists) {
      reasons.push(
        `An active regularization request is already pending or approved for this employee on ${input.workday}.`,
      );
    }

    // 10. Rule: Required Evidence
    if (requireEvidence && attachmentsCount === 0) {
      reasons.push('Company policy mandates supporting evidence attachments for regularization.');
    }

    // 11. Rule: Leave & On-Duty Conflicts
    const [leaveConflict] = await db
      .select({ id: employeeLeaveRequests.id, status: employeeLeaveRequests.status })
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, input.employeeId),
          lte(employeeLeaveRequests.startDate, input.workday),
          gte(employeeLeaveRequests.endDate, input.workday),
          eq(employeeLeaveRequests.status, 'approved'),
        ),
      )
      .limit(1);

    const [odConflict] = await db
      .select({ id: attendanceOnDutyRequests.id, status: attendanceOnDutyRequests.status })
      .from(attendanceOnDutyRequests)
      .where(
        and(
          eq(attendanceOnDutyRequests.tenantId, tenantId),
          eq(attendanceOnDutyRequests.companyId, companyId),
          eq(attendanceOnDutyRequests.employeeId, input.employeeId),
          lte(attendanceOnDutyRequests.startDate, input.workday),
          gte(attendanceOnDutyRequests.endDate, input.workday),
          eq(attendanceOnDutyRequests.status, 'approved'),
        ),
      )
      .limit(1);

    if (leaveConflict) {
      warnings.push(
        `Employee has an approved leave request on ${input.workday}. Leave must be cancelled/amended through Leave Workflow.`,
      );
      riskFactors.push('leave_conflict');
    }

    if (odConflict) {
      warnings.push(
        `Employee has an approved On-Duty authorization on ${input.workday}. Must be managed through On-Duty workflow.`,
      );
      riskFactors.push('on_duty_conflict');
    }

    // 12. Rule: Attendance Lock & Payroll Cutoff
    const isLocked = await attendanceRepository.checkDateInLockedPeriod(
      tenantId,
      companyId,
      input.workday,
      input.workday,
    );
    if (isLocked) {
      reasons.push(
        `Workday (${input.workday}) falls in an attendance period that is locked for payroll handover. Adjustments are restricted.`,
      );
      riskFactors.push('payroll_period_locked');
    }

    // 13. High-Risk Profiling
    if (input.requestType === 'both_missing') {
      riskFactors.push('both_punches_missing');
    }
    if (input.requestType === 'status_correction') {
      riskFactors.push('manual_status_override');
    }
    if (diffDays > 5) {
      riskFactors.push('stale_workday_submission');
    }
    if (attachmentsCount === 0) {
      riskFactors.push('no_supporting_evidence');
    }

    // Existing attendance context
    const [att] = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, input.employeeId),
          eq(employeeAttendance.date, input.workday),
        ),
      )
      .limit(1);

    const isHighRisk = riskFactors.length > 0 || input.requestType === 'both_missing';

    return {
      eligible: reasons.length === 0,
      reasons,
      warnings,
      isHighRisk,
      riskFactors,
      context: {
        workday: input.workday,
        trackingStartDate,
        employeeJoiningDate: emp.joiningDate,
        submissionWindowDays,
        monthlyRequestLimit: maxRequestsPerMonth,
        currentMonthRequestCount: monthlyCount,
        existingAttendance: att
          ? {
              status: att.status,
              checkInTime: att.checkInTime,
              checkOutTime: att.checkOutTime,
              workedMinutes: att.workedMinutes,
            }
          : null,
        hasLeaveConflict: !!leaveConflict,
        hasOdConflict: !!odConflict,
        isPayrollLocked: isLocked,
        activeRequestExists: activeExists,
      },
    };
  }
}

export const attendanceRegularizationEligibilityService =
  new AttendanceRegularizationEligibilityService();
