import { randomUUID } from 'node:crypto';
import {
  LeaveRepository,
  leaveRepository,
  type LeaveEmployeeProfile,
} from '../repository/leave.repository.js';
import { LeaveTypesRepository, leaveTypesRepository } from '../repository/leaveTypes.repository.js';
import {
  LeaveGeneralSettingsRepository,
  leaveGeneralSettingsRepository,
  defaultSettingsSnapshot,
} from '../repository/leaveGeneralSettings.repository.js';
import { LeavePoliciesService, leavePoliciesService } from './leavePolicies.service.js';
import { LeaveDefaultsService, leaveDefaultsService } from './leaveDefaults.service.js';
import { LeaveHolidaysService, leaveHolidaysService } from './leaveHolidays.service.js';
import {
  LeaveApprovalsService,
  leaveApprovalsService,
  type ApprovalActor,
} from './leaveApprovals.service.js';
import { LeaveRestrictionsService, leaveRestrictionsService } from './leaveRestrictions.service.js';
import { LeaveAccrualService, leaveAccrualService } from './leaveAccrual.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import { isValidIsoDate, localDateInTimezone } from '../rules/leaveValidation.js';
import {
  addDays,
  computeLeaveDuration,
  daysBetweenInclusive,
  leaveCycleFor,
  weekdayName,
  type DayTreatment,
} from '../rules/leaveCalendar.js';
import {
  findRestrictionViolation,
  teamConcurrencyWarning,
  type RestrictionRule,
  type TeamConcurrencyConfig,
} from '../rules/leaveRestrictions.js';
import type {
  EmployeeLeaveRequest,
  LeaveGeneralSettingsSnapshot,
  LeaveTypeRecord,
} from '../../../../db/schema.js';
import type {
  ApplyLeaveInput,
  LeaveBalanceSummary,
  LeaveCalculationSnapshot,
  LeaveRequestView,
  LeaveWorkspace,
} from '../types/leave.types.js';
import type { ResolvedHolidayCalendar } from '../types/leaveHolidays.types.js';

export const LEAVE_RULES_ENGINE_VERSION = 'leave-core-v2';
const ELIGIBLE_EMPLOYMENT_STATUSES = new Set(['active', 'probation', 'notice']);
const SESSIONS = new Set(['first_half', 'second_half']);
/** How far around a request we look for clubbing / gap / frequency checks. */
const RESTRICTION_WINDOW_DAYS = 120;
/** Hard cap on backdating when HR holds hrms.leave.backdated_override. */
export const BACKDATED_OVERRIDE_CAP_DAYS = 90;

/** HR-only relaxations for requests submitted on an employee's behalf. */
export interface ApplyLeaveOptions {
  backdatedOverride?: boolean;
  payrollLockOverride?: boolean;
}

const reject = (code: string, message: string): never => {
  throw new BadRequestError(message, code);
};

/** A holiday affects the count unless the type's treatment (or calendar-day counting) counts it. */
const holidaysExcluded = (
  treatment: string,
  method: LeaveGeneralSettingsSnapshot['dayCountingMethod'],
) => treatment === 'exclude' || (treatment === 'inherit' && method === 'working_days');

export class LeaveService {
  constructor(
    private readonly repo: LeaveRepository = leaveRepository,
    private readonly typesRepo: Pick<
      LeaveTypesRepository,
      'findById' | 'findAllForCompany'
    > = leaveTypesRepository,
    private readonly settingsRepo: LeaveGeneralSettingsRepository = leaveGeneralSettingsRepository,
    private readonly policies: Pick<
      LeavePoliciesService,
      'resolvePolicyForEmployee'
    > = leavePoliciesService,
    private readonly defaults: Pick<
      LeaveDefaultsService,
      'ensureDefaultLeaveSetup'
    > = leaveDefaultsService,
    private readonly holidays: Pick<
      LeaveHolidaysService,
      'resolveForEmployee'
    > = leaveHolidaysService,
    private readonly approvals: Pick<
      LeaveApprovalsService,
      | 'resolveWorkflow'
      | 'planForRequest'
      | 'planCancellation'
      | 'resolveActor'
      | 'getQueue'
      | 'decide'
    > = leaveApprovalsService,
    private readonly restrictions: Pick<
      LeaveRestrictionsService,
      'listActive'
    > = leaveRestrictionsService,
    private readonly accrual: Pick<LeaveAccrualService, 'computeTarget'> = leaveAccrualService,
  ) {}

  /** Leave types the employee can use this cycle, their balances, requests and holidays. */
  async getWorkspace(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<LeaveWorkspace> {
    await this.defaults.ensureDefaultLeaveSetup(tenantId, companyId);
    const [employee, ctx] = await Promise.all([
      this.repo.getEmployeeProfile(tenantId, companyId, employeeId),
      this.companyContext(tenantId, companyId),
    ]);
    if (!employee) throw new NotFoundError('Employee profile not found');

    const settings = await this.effectiveSettings(tenantId, companyId, ctx.defaultGoLive);
    const cycle = leaveCycleFor(ctx.today, settings.leaveYearCycle, settings.customYearStartDate);

    const [policy, balances, requestRows, calendar] = await Promise.all([
      this.policies.resolvePolicyForEmployee(tenantId, companyId, employee, ctx.today),
      this.repo.getBalancesForCycle(tenantId, companyId, employeeId, cycle.start),
      this.repo.getRequestsWithTypes(tenantId, companyId, employeeId),
      this.holidays.resolveForEmployee(tenantId, companyId, employee.locationId, ctx.today),
    ]);

    const summaries: LeaveBalanceSummary[] = [];
    for (const ent of policy?.entitlements ?? []) {
      const type = await this.typesRepo.findById(tenantId, companyId, ent.leaveTypeId);
      if (!type || !type.isActive || !type.visibleToEmployee) continue;
      const balance = balances.find((b) => b.leaveTypeId === type.id);
      const used = balance ? Number(balance.usedDays) : 0;
      const pending = balance ? Number(balance.pendingDays) : 0;
      // Before the scheduled accrual has created the balance, show what has accrued so far.
      const total =
        !type.isTracked || type.category === 'optional_holiday'
          ? null
          : balance
            ? Number(balance.totalDays)
            : ((await this.accrual.computeTarget(
                tenantId,
                companyId,
                employee,
                type,
                ent.annualQuota,
                cycle,
                ctx.today,
              )) ?? 0);
      summaries.push({
        leaveTypeId: type.id,
        leaveTypeCode: type.code,
        leaveTypeName: type.name,
        colorToken: type.colorToken,
        isTracked: total !== null,
        allowHalfDay: type.allowHalfDay,
        instructions: type.instructions,
        cycleStartDate: cycle.start,
        cycleEndDate: cycle.end,
        totalDays: total,
        usedDays: used,
        pendingDays: pending,
        availableDays: total === null ? null : total - used - pending,
      });
    }

    const requests: LeaveRequestView[] = requestRows.map((r) => ({
      ...r.request,
      totalDays: Number(r.request.totalDays),
      leaveTypeCode: r.leaveTypeCode,
      leaveTypeName: r.leaveTypeName,
      colorToken: r.colorToken,
    }));

    return {
      policy: policy ? { id: policy.id, name: policy.name } : null,
      cycle: { start: cycle.start, end: cycle.end, label: cycle.label },
      balances: summaries,
      requests,
      holidays: (calendar?.holidays ?? []).map((h) => {
        const day = weekdayName(h.date);
        return {
          name: h.name,
          date: h.date,
          dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
          type: h.type,
        };
      }),
      holidayCalendarMissing: !calendar,
      optionalHolidayQuota: calendar?.optionalHolidayQuota ?? 0,
    };
  }

  /**
   * Validates and submits a leave request (spec §2.3, steps 1–12). The duration and every input to
   * it are sealed in `calculation_snapshot`; approval never recalculates.
   */
  async applyLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    actorUserId: string,
    raw: ApplyLeaveInput,
    options: ApplyLeaveOptions = {},
  ): Promise<EmployeeLeaveRequest & { warnings: string[] }> {
    const input = this.validateInput(raw);
    await this.defaults.ensureDefaultLeaveSetup(tenantId, companyId);
    const ctx = await this.companyContext(tenantId, companyId);

    // 1. Settings version in force at the submission timestamp.
    await this.settingsRepo.ensureDefaultSettings(
      tenantId,
      companyId,
      actorUserId,
      ctx.defaultGoLive,
    );
    const submittedAt = new Date();
    const version = await this.settingsRepo.getActiveVersionAtTimestamp(
      tenantId,
      companyId,
      submittedAt,
    );
    if (!version) throw new Error('Leave settings version could not be resolved.');
    const settings = version.settingsPayload;

    // 2. Leave type.
    const type = await this.typesRepo.findById(tenantId, companyId, input.leaveTypeId);
    if (!type || !type.isActive || !type.visibleToEmployee) {
      reject('LEAVE_TYPE_INACTIVE', 'This leave type is not currently available.');
    }
    const leaveType = type as LeaveTypeRecord;
    if (
      input.startDate < leaveType.effectiveFrom ||
      (leaveType.effectiveTo !== null && input.endDate > leaveType.effectiveTo)
    ) {
      reject('LEAVE_TYPE_INACTIVE', `${leaveType.name} is not available for the selected dates.`);
    }

    // 3. Employee and the policy in force on the start date.
    const employee = await this.repo.getEmployeeProfile(tenantId, companyId, employeeId);
    if (!employee) throw new NotFoundError('Employee profile not found');
    if (!ELIGIBLE_EMPLOYMENT_STATUSES.has(employee.employmentStatus)) {
      reject('LEAVE_EMPLOYEE_INELIGIBLE', 'Leave can only be applied by active employees.');
    }
    const policy = await this.policies.resolvePolicyForEmployee(
      tenantId,
      companyId,
      employee,
      input.startDate,
    );
    if (!policy)
      reject('LEAVE_NO_POLICY', 'No leave policy is assigned to you. Please contact HR.');
    const entitlement = policy!.entitlements.find((e) => e.leaveTypeId === leaveType.id);
    if (!entitlement) {
      reject('LEAVE_TYPE_NOT_IN_POLICY', `${leaveType.name} is not part of your leave policy.`);
    }

    // 4. Windows.
    this.checkWindows(input.startDate, input.endDate, ctx.today, settings, employee, {
      maxBackdatedDays: options.backdatedOverride
        ? Math.max(settings.maxBackdatedDays, BACKDATED_OVERRIDE_CAP_DAYS)
        : settings.maxBackdatedDays,
    });
    const locked = options.payrollLockOverride
      ? null
      : await this.repo.findLockedPeriodOverlapping(
          tenantId,
          companyId,
          input.startDate,
          input.endDate,
        );
    if (locked) {
      reject(
        'LEAVE_PAYROLL_LOCKED',
        `Submission blocked: The attendance period ${locked.periodCode} has been locked for payroll processing. Please contact HR Administration.`,
      );
    }
    const cycle = leaveCycleFor(
      input.startDate,
      settings.leaveYearCycle,
      settings.customYearStartDate,
    );
    const endCycle = leaveCycleFor(
      input.endDate,
      settings.leaveYearCycle,
      settings.customYearStartDate,
    );
    if (cycle.start !== endCycle.start) {
      reject(
        'LEAVE_CROSSES_YEAR',
        `Requests cannot span across leave year boundaries. Please submit separate requests for cycle ${cycle.label} and cycle ${endCycle.label}.`,
      );
    }

    // 5. Eligibility.
    this.checkEligibility(leaveType, employee, input.startDate);

    // 6. Duration: schedule, holiday calendar, treatments, sandwich, half day.
    if (input.session) {
      if (input.startDate !== input.endDate) {
        reject(
          'LEAVE_HALF_DAY_MULTI_DATE',
          'Multi-day half-day requests are not supported in V1. Please submit single-date requests for half-days.',
        );
      }
      if (!leaveType.allowHalfDay) {
        reject('LEAVE_HALF_DAY_NOT_ALLOWED', `${leaveType.name} cannot be taken as a half day.`);
      }
    }
    const schedule = await this.repo.getWorkingDays(tenantId, companyId, employeeId);
    const workingDays = schedule.workingDays.map((d) => d.toLowerCase());
    const isOptionalHolidayType = leaveType.category === 'optional_holiday';
    const needsCalendar =
      isOptionalHolidayType ||
      holidaysExcluded(leaveType.holidayTreatment, settings.dayCountingMethod);
    const calendar = await this.holidays.resolveForEmployee(
      tenantId,
      companyId,
      employee.locationId,
      input.startDate,
    );
    if (!calendar && needsCalendar) {
      reject(
        'LEAVE_SCHEDULE_MISSING',
        `Unable to calculate leave duration: Missing holiday calendar for ${cycle.label}. Please contact HR Administration.`,
      );
    }
    const mandatoryHolidays = new Map(
      (calendar?.holidays ?? []).filter((h) => h.type === 'mandatory').map((h) => [h.date, h.name]),
    );
    const duration = computeLeaveDuration({
      startDate: input.startDate,
      endDate: input.endDate,
      dayCountingMethod: settings.dayCountingMethod,
      workingDays,
      holidays: mandatoryHolidays,
      weeklyOffTreatment: leaveType.weeklyOffTreatment as DayTreatment,
      holidayTreatment: leaveType.holidayTreatment as DayTreatment,
      sandwichRuleEnabled: leaveType.sandwichRuleEnabled,
      session: input.session,
    });
    if (input.session && duration.totalDays === 0) {
      reject(
        'LEAVE_NON_WORKING_HALF_DAY',
        'Cannot apply for leave on a non-working day (Weekly Off or Public Holiday) when working-day counting is active.',
      );
    }
    if (duration.totalDays === 0) {
      reject('LEAVE_NO_CHARGEABLE_DAYS', 'The selected dates contain no working days.');
    }
    if (isOptionalHolidayType) {
      await this.checkOptionalHolidays(tenantId, companyId, employeeId, calendar!, duration, cycle);
    }

    // 7. Type limits.
    await this.checkTypeLimits(
      tenantId,
      companyId,
      employeeId,
      leaveType,
      entitlement!.maxPerYearOverride,
      input,
      duration,
      cycle,
    );

    // 8. Restrictions.
    const isNonWorkingDay = (date: string) =>
      !workingDays.includes(weekdayName(date)) || mandatoryHolidays.has(date);
    const { ruleIds, warnings } = await this.checkRestrictions(
      tenantId,
      companyId,
      employee,
      leaveType,
      input,
      ctx.today,
      cycle,
      isNonWorkingDay,
    );

    const overlap = await this.repo.findOverlappingLeave(
      tenantId,
      companyId,
      employeeId,
      input.startDate,
      input.endDate,
    );
    if (overlap) {
      throw new ConflictError(
        `Leave request overlaps with an existing ${overlap.status} leave (${overlap.startDate} to ${overlap.endDate})`,
        'LEAVE_OVERLAP',
      );
    }

    // 9. Documents (Decision D13: flagged, not yet enforced).
    const documentRequired =
      leaveType.documentRequirement === 'mandatory' ||
      (leaveType.documentRequirement === 'mandatory_after_n_days' &&
        duration.totalDays > (leaveType.documentThresholdDays ?? 0));

    // 10. Entitlement accrued so far (from the start of the request's cycle at the earliest).
    const tracked = leaveType.isTracked && !isOptionalHolidayType;
    const asOf = ctx.today > cycle.start ? ctx.today : cycle.start;
    const entitlementTarget = tracked
      ? await this.accrual.computeTarget(
          tenantId,
          companyId,
          employee,
          leaveType,
          entitlement!.annualQuota,
          cycle,
          asOf,
        )
      : null;

    // 12. Approval routing.
    const workflow = await this.approvals.resolveWorkflow(
      tenantId,
      companyId,
      leaveType.workflowId,
    );
    const plan = await this.approvals.planForRequest(
      tenantId,
      companyId,
      workflow,
      employee,
      duration.totalDays,
      submittedAt,
    );

    const snapshot: LeaveCalculationSnapshot = {
      calculationId: randomUUID(),
      rulesEngineVersion: LEAVE_RULES_ENGINE_VERSION,
      settingsVersionId: version.id,
      versionNumber: version.versionNumber,
      calculationTimestampUtc: submittedAt.toISOString(),
      companyTimezone: ctx.timeZone,
      dayCountingMethod: settings.dayCountingMethod,
      leaveTypeId: leaveType.id,
      policyId: policy!.id,
      calculatedDurationDays: duration.totalDays,
      halfDaySession: input.session,
      requestedStartDate: input.startDate,
      requestedEndDate: input.endDate,
      cycleStartDate: cycle.start,
      scheduleSource: schedule.source,
      workingDays,
      holidayCalendarId: calendar?.calendarId ?? null,
      holidayCalendarRevision: calendar?.revision ?? null,
      documentRequired,
      workflowId: workflow.id,
      restrictionRuleIds: ruleIds,
      warnings,
      scheduleBreakdown: duration.breakdown,
    };

    // 11. Balance check under lock, persist, reserve, route.
    const created = await this.repo.createRequestWithReservation({
      request: {
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveType.id,
        policyId: policy!.id,
        settingsVersionId: version.id,
        workflowId: workflow.id,
        currentLevel: plan.steps.find((s) => s.action === 'pending')?.level ?? null,
        submittedByUserId: actorUserId,
        startDate: input.startDate,
        endDate: input.endDate,
        totalDays: duration.totalDays.toFixed(2),
        session: input.session,
        calculationSnapshot: snapshot as unknown as Record<string, unknown>,
        reason: input.reason,
      },
      cycle,
      entitlementTarget,
      isTracked: tracked,
      negativeAllowance:
        leaveType.negativeBalanceEnabled && leaveType.negativeBalanceLimit !== null
          ? Number(leaveType.negativeBalanceLimit)
          : 0,
      approvalSteps: plan.steps,
      autoApprove: plan.autoApprove,
      notifications: plan.notifications,
      actorUserId,
    });
    return { ...created, warnings };
  }

  /**
   * Pending requests are cancelled at once. Approved future requests are cancelled directly, or sent
   * for cancellation approval when the workflow requires it. Leave that has started can only be
   * corrected by HR.
   */
  async cancelLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    requestId: string,
    actorUserId: string,
  ): Promise<EmployeeLeaveRequest> {
    const request = await this.repo.findRequest(tenantId, companyId, requestId);
    if (!request || request.employeeId !== employeeId)
      throw new NotFoundError('Leave request not found');
    if (request.status === 'pending') {
      return this.repo.cancelPendingRequest(
        tenantId,
        companyId,
        employeeId,
        requestId,
        actorUserId,
      );
    }
    if (request.status !== 'approved') {
      throw new ConflictError(`Cannot cancel leave request with status '${request.status}'`);
    }
    const { today } = await this.companyContext(tenantId, companyId);
    if (request.startDate <= today) {
      reject(
        'LEAVE_CANCEL_STARTED',
        'Approved leave that has already started can only be corrected by HR.',
      );
    }
    const employee = await this.repo.getEmployeeProfile(tenantId, companyId, employeeId);
    if (!employee) throw new NotFoundError('Employee profile not found');
    const step = await this.approvals.planCancellation(
      tenantId,
      companyId,
      request,
      employee,
      new Date(),
    );
    return this.repo.cancelApprovedRequest(
      tenantId,
      companyId,
      employeeId,
      requestId,
      actorUserId,
      step,
      step?.approverEmployeeId
        ? [
            {
              employeeId: step.approverEmployeeId,
              title: 'Leave cancellation approval required',
              message: `A request to cancel approved leave (${request.startDate} to ${request.endDate}) is awaiting your decision.`,
              type: 'action_required',
            },
          ]
        : [],
    );
  }

  // ── Approvals (ESS team queue and HR queue share these) ────────────────────

  async getApprovalQueue(
    tenantId: string,
    companyId: string,
    userId: string,
    isHrOverride: boolean,
    scope: 'mine' | 'all',
  ) {
    const actor = await this.approvals.resolveActor(tenantId, companyId, userId, isHrOverride);
    return this.approvals.getQueue(tenantId, companyId, actor, scope);
  }

  async decideApproval(
    tenantId: string,
    companyId: string,
    userId: string,
    isHrOverride: boolean,
    approvalId: string,
    decision: 'approved' | 'rejected',
    comment: unknown,
  ) {
    const actor: ApprovalActor = await this.approvals.resolveActor(
      tenantId,
      companyId,
      userId,
      isHrOverride,
    );
    const outcome = await this.approvals.decide(
      tenantId,
      companyId,
      approvalId,
      actor,
      decision,
      comment,
    );
    return {
      requestId: outcome.request.id,
      status: outcome.status,
      nextLevel: outcome.nextStep?.level ?? null,
    };
  }

  // ── Steps ──────────────────────────────────────────────────────────────────

  private validateInput(raw: ApplyLeaveInput): Required<ApplyLeaveInput> {
    if (!raw || typeof raw !== 'object') reject('LEAVE_INVALID_INPUT', 'Request body is required.');
    const { leaveTypeId, startDate, endDate } = raw;
    const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
    if (typeof leaveTypeId !== 'string' || !leaveTypeId || !startDate || !endDate || !reason) {
      reject('LEAVE_INVALID_INPUT', 'Start date, end date, leave type, and reason are required');
    }
    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      reject('LEAVE_INVALID_INPUT', 'Invalid date format provided');
    }
    if (endDate < startDate) reject('LEAVE_INVALID_INPUT', 'End date cannot precede start date');
    if (reason.length > 500)
      reject('LEAVE_INVALID_INPUT', 'Reason must be at most 500 characters.');
    const session = raw.session ?? null;
    if (session !== null && !SESSIONS.has(session)) {
      reject('LEAVE_INVALID_INPUT', 'Session must be first_half or second_half.');
    }
    return { leaveTypeId, startDate, endDate, reason, session };
  }

  private checkWindows(
    startDate: string,
    endDate: string,
    today: string,
    settings: LeaveGeneralSettingsSnapshot,
    employee: { joiningDate: string; lastWorkingDate: string | null },
    limits: { maxBackdatedDays: number },
  ): void {
    if (startDate < settings.goLiveDate) {
      reject(
        'LEAVE_BEFORE_GO_LIVE',
        `Leave applications cannot precede company go-live date (${settings.goLiveDate}).`,
      );
    }
    if (startDate < addDays(today, -limits.maxBackdatedDays)) {
      reject(
        'LEAVE_BACKDATE_LIMIT',
        `Leave requests cannot be backdated more than ${limits.maxBackdatedDays} days.`,
      );
    }
    if (endDate > addDays(today, settings.maxAdvanceBookingDays)) {
      reject(
        'LEAVE_ADVANCE_LIMIT',
        `Leave requests cannot be scheduled more than ${settings.maxAdvanceBookingDays} days in advance.`,
      );
    }
    if (startDate < employee.joiningDate) {
      reject(
        'LEAVE_BEFORE_JOINING',
        `Leave cannot start before your joining date (${employee.joiningDate}).`,
      );
    }
    if (employee.lastWorkingDate && endDate > employee.lastWorkingDate) {
      reject(
        'LEAVE_AFTER_LAST_WORKING_DAY',
        `Leave cannot extend beyond your last working day (${employee.lastWorkingDate}).`,
      );
    }
  }

  private checkEligibility(
    type: LeaveTypeRecord,
    employee: { employmentStatus: string; probationEndDate: string | null; gender: string | null },
    startDate: string,
  ): void {
    const inProbation =
      employee.employmentStatus === 'probation' ||
      (employee.probationEndDate !== null && startDate <= employee.probationEndDate);
    if (inProbation && !type.allowedInProbation) {
      reject('LEAVE_PROBATION_BLOCKED', `${type.name} is not available during probation.`);
    }
    if (employee.employmentStatus === 'notice' && !type.allowedInNoticePeriod) {
      reject('LEAVE_NOTICE_BLOCKED', `${type.name} is not available during the notice period.`);
    }
    if (type.genderEligibility !== 'all') {
      const gender = employee.gender?.trim().toLowerCase() ?? '';
      if (gender !== type.genderEligibility) {
        reject(
          'LEAVE_GENDER_INELIGIBLE',
          gender
            ? `${type.name} is only available to ${type.genderEligibility} employees.`
            : `${type.name} requires a recorded gender in your profile. Please contact HR.`,
        );
      }
    }
  }

  /** Optional-holiday leave: only on the calendar's optional holidays, within its quota (D10). */
  private async checkOptionalHolidays(
    tenantId: string,
    companyId: string,
    employeeId: string,
    calendar: ResolvedHolidayCalendar,
    duration: { breakdown: Array<{ date: string; chargedDays: number }> },
    cycle: { start: string; end: string },
  ): Promise<void> {
    const optionalDates = new Set(
      calendar.holidays.filter((h) => h.type === 'optional').map((h) => h.date),
    );
    const charged = duration.breakdown.filter((b) => b.chargedDays > 0);
    if (charged.some((b) => !optionalDates.has(b.date))) {
      reject(
        'LEAVE_NOT_OPTIONAL_HOLIDAY',
        'Optional holiday leave can only be taken on optional holidays.',
      );
    }
    const types = await this.typesRepo.findAllForCompany(tenantId, companyId);
    const optionalTypeIds = types.filter((t) => t.category === 'optional_holiday').map((t) => t.id);
    const taken = await this.repo.findActiveRequests(
      tenantId,
      companyId,
      employeeId,
      cycle.start,
      cycle.end,
      optionalTypeIds,
    );
    const used = taken.reduce((sum, r) => sum + Math.ceil(Number(r.totalDays)), 0);
    if (used + charged.length > calendar.optionalHolidayQuota) {
      reject(
        'LEAVE_OPTIONAL_HOLIDAY_QUOTA',
        `You can take at most ${calendar.optionalHolidayQuota} optional holiday(s) this leave year (${used} already taken).`,
      );
    }
  }

  private async checkTypeLimits(
    tenantId: string,
    companyId: string,
    employeeId: string,
    type: LeaveTypeRecord,
    maxPerYearOverride: number | null,
    input: Required<ApplyLeaveInput>,
    duration: { totalDays: number; breakdown: Array<{ date: string; chargedDays: number }> },
    cycle: { start: string; end: string },
  ): Promise<void> {
    const days = duration.totalDays;
    const min = Number(type.minPerRequest);
    if (days < min) {
      reject('LEAVE_MIN_PER_REQUEST', `${type.name} requires at least ${min} day(s) per request.`);
    }
    if (type.maxPerRequest !== null && days > Number(type.maxPerRequest)) {
      reject(
        'LEAVE_MAX_PER_REQUEST',
        `${type.name} allows at most ${Number(type.maxPerRequest)} day(s) per request.`,
      );
    }
    if (
      type.maxConsecutiveDays !== null &&
      daysBetweenInclusive(input.startDate, input.endDate) > type.maxConsecutiveDays
    ) {
      reject(
        'LEAVE_MAX_CONSECUTIVE',
        `${type.name} cannot exceed ${type.maxConsecutiveDays} consecutive day(s).`,
      );
    }

    const ceiling =
      maxPerYearOverride ?? (type.maxPerYear !== null ? Number(type.maxPerYear) : null);
    const maxPerMonth = type.maxPerMonth !== null ? Number(type.maxPerMonth) : null;
    if (ceiling === null && maxPerMonth === null) return;

    const existing = await this.repo.findActiveRequestsOfType(
      tenantId,
      companyId,
      employeeId,
      type.id,
      cycle.start,
      cycle.end,
    );
    if (ceiling !== null) {
      const usedInCycle = existing.reduce((sum, r) => sum + Number(r.totalDays), 0);
      if (usedInCycle + days > ceiling) {
        reject(
          'LEAVE_MAX_PER_YEAR',
          `Yearly limit for ${type.name} exceeded: ${usedInCycle} of ${ceiling} day(s) already requested this cycle.`,
        );
      }
    }
    if (maxPerMonth !== null) {
      const perMonth = new Map<string, number>();
      const add = (date: string, d: number) =>
        perMonth.set(date.slice(0, 7), (perMonth.get(date.slice(0, 7)) ?? 0) + d);
      for (const r of existing) {
        const breakdown = (r.calculationSnapshot as Partial<LeaveCalculationSnapshot> | null)
          ?.scheduleBreakdown;
        // Legacy requests have no breakdown; attribute them to their start month.
        if (breakdown?.length) breakdown.forEach((b) => add(b.date, b.chargedDays));
        else add(r.startDate, Number(r.totalDays));
      }
      const requested = new Map<string, number>();
      duration.breakdown.forEach((b) =>
        requested.set(b.date.slice(0, 7), (requested.get(b.date.slice(0, 7)) ?? 0) + b.chargedDays),
      );
      for (const [month, d] of requested) {
        if ((perMonth.get(month) ?? 0) + d > maxPerMonth) {
          reject(
            'LEAVE_MAX_PER_MONTH',
            `Monthly limit for ${type.name} (${maxPerMonth} day(s)) exceeded for ${month}.`,
          );
        }
      }
    }
  }

  private async checkRestrictions(
    tenantId: string,
    companyId: string,
    employee: LeaveEmployeeProfile,
    type: LeaveTypeRecord,
    input: Required<ApplyLeaveInput>,
    today: string,
    cycle: { start: string; end: string },
    isNonWorkingDay: (date: string) => boolean,
  ): Promise<{ ruleIds: string[]; warnings: string[] }> {
    const rules = await this.restrictions.listActive(tenantId, companyId);
    if (rules.length === 0) return { ruleIds: [], warnings: [] };

    const from =
      addDays(input.startDate, -RESTRICTION_WINDOW_DAYS) < cycle.start
        ? addDays(input.startDate, -RESTRICTION_WINDOW_DAYS)
        : cycle.start;
    const to =
      addDays(input.endDate, RESTRICTION_WINDOW_DAYS) > cycle.end
        ? addDays(input.endDate, RESTRICTION_WINDOW_DAYS)
        : cycle.end;
    const [existing, types] = await Promise.all([
      this.repo.findActiveRequests(tenantId, companyId, employee.id, from, to),
      this.typesRepo.findAllForCompany(tenantId, companyId),
    ]);
    const names = new Map(types.map((t) => [t.id, t.name]));

    const violation = findRestrictionViolation(rules as RestrictionRule[], {
      leaveTypeId: type.id,
      startDate: input.startDate,
      endDate: input.endDate,
      today,
      departmentId: employee.departmentId,
      locationId: employee.locationId,
      cycle,
      existing,
      isNonWorkingDay,
      leaveTypeName: (id) => names.get(id) ?? 'this leave type',
    });
    if (violation) reject(violation.code, violation.message);

    const warnings: string[] = [];
    for (const rule of rules.filter((r) => r.ruleType === 'team_concurrency')) {
      const cfg = rule.config as unknown as TeamConcurrencyConfig;
      if (
        !employee.departmentId ||
        (cfg.departmentId && cfg.departmentId !== employee.departmentId)
      )
        continue;
      const team = await this.repo.countDepartmentLeaveByDay(
        tenantId,
        companyId,
        employee.departmentId,
        employee.id,
        input.startDate,
        input.endDate,
      );
      const warning = teamConcurrencyWarning(
        cfg,
        input.startDate,
        input.endDate,
        team.headcount,
        team.requests,
      );
      if (warning) warnings.push(warning);
    }
    return { ruleIds: rules.map((r) => r.id), warnings };
  }

  private async companyContext(
    tenantId: string,
    companyId: string,
  ): Promise<{ today: string; timeZone: string; defaultGoLive: string }> {
    const profile = await this.settingsRepo.getCompanyProfile(tenantId, companyId);
    const timeZone = profile?.timeZone || 'UTC';
    return {
      today: localDateInTimezone(timeZone),
      timeZone,
      defaultGoLive: profile?.createdAt
        ? localDateInTimezone(timeZone, profile.createdAt)
        : localDateInTimezone(timeZone),
    };
  }

  private async effectiveSettings(
    tenantId: string,
    companyId: string,
    defaultGoLive: string,
  ): Promise<LeaveGeneralSettingsSnapshot> {
    const version = await this.settingsRepo.getActiveVersionAtTimestamp(
      tenantId,
      companyId,
      new Date(),
    );
    return version?.settingsPayload ?? defaultSettingsSnapshot(defaultGoLive);
  }
}

export const leaveService = new LeaveService();
