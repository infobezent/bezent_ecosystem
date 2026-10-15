/**
 * BEZENT HRMS — Comp-Off Domain Service (V1.0)
 *
 * Implements enterprise business logic for:
 * - Workday attendance context extraction and deterministic eligibility calculation
 * - Comp-Off request lifecycle (Draft, Submit, Decide, Withdraw, Cancel, Reverse)
 * - Multi-stage approval workflow with self-approval guards and optimistic locking
 * - Double Benefit Prevention (Overtime settlement vs Comp-Off allocation overlap protection)
 * - Conversion of Overtime Comp-Off settlements into authoritative Comp-Off entitlements
 * - Canonical Leave Module handoff contract with idempotent execution
 * - Tenant and company isolation on all operations
 * - Immutable audit logging
 */

import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../../../app/errors/AppError.js';
import { getDb } from '../../../../db/connection.js';
import {
  employees,
  employeeAttendance,
  attendancePolicies,
  attendanceOvertimeSettlements,
  type AttendanceCompOffPolicy,
  type AttendanceCompOffHandoff,
} from '../../../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { AttendanceCompOffRepository } from '../repository/attendanceCompOff.repository.js';
import { AttendanceCompOffCalculationService } from './attendanceCompOffCalculation.service.js';
import type {
  CreateCompOffRequestInput,
  DecideCompOffRequestInput,
  CompOffFilterQuery,
  CompOffRequestItem,
  CompOffWorkdayContext,
  CompOffDayType,
  CompOffCalculationResult,
  CompOffEntitlementFilterQuery,
  CompOffHandoffFilterQuery,
  CompOffEntitlementItem,
} from '../types/attendanceCompOff.types.js';

export class AttendanceCompOffService {
  constructor(
    private readonly repo = new AttendanceCompOffRepository(),
    private readonly calculationService = new AttendanceCompOffCalculationService(),
  ) {}

  /**
   * Helper to format Date into YYYY-MM-DD
   */
  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Calculates boundaries of the calendar month for monthly cap accounting
   */
  private getMonthBounds(dateStr: string): { startOfMonth: string; endOfMonth: string } {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return {
      startOfMonth: this.formatDate(start),
      endOfMonth: this.formatDate(end),
    };
  }

  /**
   * Evaluates Comp-Off eligibility for an employee on a given workday.
   */
  async getWorkdayContext(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workDate: string,
  ): Promise<{
    context: CompOffWorkdayContext;
    policy: AttendanceCompOffPolicy | null;
    calculation: CompOffCalculationResult;
  }> {
    const db = getDb();

    // 1. Verify Employee
    const [emp] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
        ),
      );

    if (!emp) {
      throw new NotFoundError(`Employee with ID '${employeeId}' not found.`);
    }

    // 2. Fetch daily attendance record
    const [att] = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, employeeId),
          eq(employeeAttendance.date, workDate),
        ),
      );

    // 3. Determine Day Type
    let dayType: CompOffDayType = 'regular';
    const dateObj = new Date(`${workDate}T00:00:00Z`);
    const dayOfWeek = dateObj.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (att?.status === 'holiday') {
      dayType = 'holiday';
    } else if (isWeekend) {
      dayType = 'weekly_off';
    }

    // Baseline scheduled hours resolution (for regular workdays)
    let scheduledMinutes = 0;
    if (dayType === 'regular') {
      const attMeta = att?.calculationMetadata as Record<string, unknown> | null;
      if (typeof attMeta?.scheduledMinutes === 'number' && attMeta.scheduledMinutes > 0) {
        scheduledMinutes = attMeta.scheduledMinutes;
      } else {
        const [publishedAttPolicy] = await db
          .select({
            fullDayThresholdHours: attendancePolicies.fullDayThresholdHours,
          })
          .from(attendancePolicies)
          .where(
            and(
              eq(attendancePolicies.tenantId, tenantId),
              eq(attendancePolicies.companyId, companyId),
              eq(attendancePolicies.status, 'published'),
              eq(attendancePolicies.isActive, true),
            ),
          )
          .limit(1);

        if (publishedAttPolicy) {
          scheduledMinutes = Math.round(parseFloat(publishedAttPolicy.fullDayThresholdHours || '8') * 60);
        } else if (att?.shiftScheduleRef) {
          scheduledMinutes = 480;
        } else {
          scheduledMinutes = 480; // default baseline if shift assigned
        }
      }
    }

    const actualWorkedMinutes = att?.workedMinutes || 0;
    const isMissingPunch = att?.isMissingPunch ?? false;
    const isRegularized = att?.isRegularized ?? false;

    // 4. Double Benefit Prevention: Check Overtime allocations for the same work date
    const otAllocations = await this.repo.getOvertimeAllocationsForDate(
      tenantId,
      companyId,
      employeeId,
      workDate,
    );

    const totalAllocatedOtMinutes = otAllocations.reduce((sum, a) => sum + a.allocatedMinutes, 0);

    // 5. Prior earned Comp-Off days in the current calendar month
    const { startOfMonth, endOfMonth } = this.getMonthBounds(workDate);
    const priorMonthlyEarnedDays = await this.repo.getPriorEarnedDaysForMonth(
      tenantId,
      companyId,
      employeeId,
      startOfMonth,
      endOfMonth,
    );

    const context: CompOffWorkdayContext = {
      workDate,
      dayType,
      scheduledMinutes,
      actualWorkedMinutes,
      isMissingPunch,
      isRegularized,
      hasApprovedOd: false,
      odMinutes: 0,
      hasOvertimeAllocation: totalAllocatedOtMinutes > 0,
      allocatedOvertimeMinutes: totalAllocatedOtMinutes,
      employeeEmploymentType: emp.employmentType || 'full_time',
      employeeDepartmentId: emp.departmentId || undefined,
      priorMonthlyEarnedDays,
      shiftScheduleRef: att?.shiftScheduleRef || null,
    };

    // 6. Effective Policy
    const policy = await this.repo.getEffectivePolicy(tenantId, companyId, workDate, {
      departmentId: emp.departmentId || undefined,
      employeeId: emp.id,
    });

    if (!policy) {
      return {
        context,
        policy: null,
        calculation: {
          actualWorkedMinutes,
          qualifyingWorkedMinutes: 0,
          eligibleCreditDays: 0,
          eligibleCreditMinutes: 0,
          isEligible: false,
          nonEligibilityReason: 'No active Comp-Off policy configured for this organization or work date.',
        },
      };
    }

    const calculation = this.calculationService.calculateCompOff(context, policy);

    return { context, policy, calculation };
  }

  /**
   * Submits a new Comp-Off Earning Request
   */
  async createRequest(
    tenantId: string,
    companyId: string,
    input: CreateCompOffRequestInput,
    actorUserId: string,
    actorRole?: string,
  ): Promise<CompOffRequestItem> {
    const db = getDb();

    // 1. Basic validation
    if (!input.employeeId) throw new BadRequestError('Employee ID is required');
    if (!input.workDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.workDate)) {
      throw new BadRequestError('Valid work date (YYYY-MM-DD) is required');
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestError('Reason is required');
    }
    if (typeof input.requestedCreditDays !== 'number' || input.requestedCreditDays <= 0) {
      throw new BadRequestError('Requested credit days must be a positive number (e.g. 0.5 or 1.0)');
    }

    // 2. Prevent duplicate active claims for the same work date
    const existingActive = await this.repo.findActiveRequestForDate(
      tenantId,
      companyId,
      input.employeeId,
      input.workDate,
    );
    if (existingActive) {
      throw new ConflictError(
        `An active Comp-Off claim already exists for work date ${input.workDate} (Request ${existingActive.requestNumber}). Multiple active claims for the same date are prohibited.`,
      );
    }

    // 3. Resolve Workday Context & Calculation
    const { context, policy, calculation } = await this.getWorkdayContext(
      tenantId,
      companyId,
      input.employeeId,
      input.workDate,
    );

    if (!policy) {
      throw new BadRequestError('Cannot submit Comp-Off: No active Comp-Off policy configured.');
    }

    if (!calculation.isEligible) {
      throw new BadRequestError(
        `Comp-Off is not eligible for this workday: ${calculation.nonEligibilityReason || 'Policy criteria not met.'}`,
      );
    }

    if (input.requestedCreditDays > calculation.eligibleCreditDays) {
      throw new BadRequestError(
        `Requested credit (${input.requestedCreditDays} days) exceeds calculated policy-eligible credit (${calculation.eligibleCreditDays} days).`,
      );
    }

    // 4. Validate Source Intervals if provided
    if (input.sourceIntervals && input.sourceIntervals.length > 0) {
      const intervalVal = this.calculationService.validateSourceIntervals(input.sourceIntervals);
      if (!intervalVal.isValid) {
        throw new BadRequestError(intervalVal.errorMessage || 'Invalid source intervals.');
      }
    }

    // 5. Submission deadline check
    const submissionDeadlineDays = policy.submissionDeadlineDays || 14;
    const workDateObj = new Date(`${input.workDate}T00:00:00Z`);
    const nowObj = new Date();
    const diffDays = Math.floor((nowObj.getTime() - workDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > submissionDeadlineDays) {
      throw new BadRequestError(
        `Submission deadline exceeded: Comp-Off claims must be submitted within ${submissionDeadlineDays} days of the work date (work date was ${diffDays} days ago).`,
      );
    }

    // 6. Resolve approver assignment
    const [emp] = await db
      .select({ reportingManagerId: employees.reportingManagerId })
      .from(employees)
      .where(eq(employees.id, input.employeeId));

    const assignedTo = emp?.reportingManagerId || null;
    const assignedRole = 'manager';

    // Generate Request Number and ID
    const requestId = generateSurrogateId('att_co_req_');
    const requestNumber = await this.repo.generateNextRequestNumber(companyId);

    // 7. Insert Request
    await this.repo.createRequest({
      id: requestId,
      requestNumber,
      tenantId,
      companyId,
      employeeId: input.employeeId,
      workDate: input.workDate,
      dayType: context.dayType,
      sourceRecordType: 'daily_attendance',
      sourceRecordId: null,
      policyId: policy.id,
      policyVersion: policy.version,
      scheduledMinutes: context.scheduledMinutes,
      actualWorkedMinutes: context.actualWorkedMinutes,
      qualifyingWorkedMinutes: calculation.qualifyingWorkedMinutes,
      requestedCreditDays: String(input.requestedCreditDays),
      approvedCreditDays: '0.00',
      sourceIntervals: input.sourceIntervals || [],
      reason: input.reason.trim(),
      locationOrSite: input.locationOrSite || null,
      taskOrProject: input.taskOrProject || null,
      evidenceAttachments: input.evidenceAttachments || [],
      status: 'submitted',
      currentStage: 'pending_manager',
      assignedTo,
      assignedAt: new Date(),
      assignedRole,
      submittedAt: new Date(),
      submittedByUserId: actorUserId,
      version: 1,
    });

    // 8. Log Audit
    await this.repo.logAudit({
      id: generateSurrogateId('co_aud_'),
      tenantId,
      companyId,
      requestId,
      action: 'submitted',
      fromStatus: null,
      toStatus: 'submitted',
      performedByUserId: actorUserId,
      performedByRole: actorRole || 'employee',
      details: {
        requestedCreditDays: input.requestedCreditDays,
        qualifyingWorkedMinutes: calculation.qualifyingWorkedMinutes,
        assignedTo,
      },
    });

    const created = await this.repo.getRequestById(tenantId, companyId, requestId);
    return created!;
  }

  /**
   * Decides (Approve or Reject) a Comp-Off Request
   */
  async decideRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
    input: DecideCompOffRequestInput,
    reviewerUserId: string,
    reviewerRole: string,
  ): Promise<CompOffRequestItem> {
    const current = await this.repo.getRequestById(tenantId, companyId, requestId);
    if (!current) {
      throw new NotFoundError(`Comp-Off request with ID '${requestId}' not found.`);
    }

    if (!['submitted', 'pending_approval'].includes(current.status)) {
      throw new ConflictError(
        `Cannot decide Comp-Off claim in status '${current.status}'. Request is already finalized.`,
      );
    }

    // 1. Optimistic Concurrency Check
    if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
      throw new ConflictError(
        `Optimistic lock failure: Comp-Off request was modified by another transaction (expected v${input.expectedVersion}, found v${current.version}). Please refresh.`,
      );
    }

    // 2. Self-Approval Prevention
    if (current.submittedByUserId === reviewerUserId) {
      throw new ForbiddenError('Self-approval violation: Requester cannot approve or reject their own claim.');
    }

    const isHrAdmin = reviewerRole === 'hr_manager' || reviewerRole === 'admin' || reviewerRole === 'super_admin';
    const isAssigned =
      current.assignedTo === reviewerUserId || current.assignedTo === reviewerRole || isHrAdmin;

    if (!isAssigned) {
      throw new ForbiddenError('Access denied: You are not the assigned reviewer or authorized HR admin for this claim.');
    }

    if (input.decision === 'rejected') {
      await this.repo.updateRequest(
        tenantId,
        companyId,
        requestId,
        {
          status: 'rejected',
          currentStage: 'completed',
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
          reviewDecision: 'rejected',
          reviewNotes: input.reviewNotes || 'Claim rejected by reviewer.',
        },
        current.version,
      );

      await this.repo.logAudit({
        id: generateSurrogateId('co_aud_'),
        tenantId,
        companyId,
        requestId,
        action: 'rejected',
        fromStatus: current.status,
        toStatus: 'rejected',
        performedByUserId: reviewerUserId,
        performedByRole: reviewerRole,
        details: { reviewNotes: input.reviewNotes },
      });
    } else {
      // Approved
      const creditDaysToApprove =
        typeof input.approvedCreditDays === 'number' && input.approvedCreditDays > 0
          ? input.approvedCreditDays
          : current.requestedCreditDays;

      // Fetch policy for validity days
      const policy = current.policyId
        ? await this.repo.getPolicyById(tenantId, companyId, current.policyId)
        : null;

      const validityDays = policy?.validityDays || 60;
      const validFromDate = new Date(`${current.workDate}T00:00:00Z`);
      const expiresAtDate = new Date(validFromDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
      const validFrom = current.workDate;
      const expiresAt = this.formatDate(expiresAtDate);
      const earnedMinutes = Math.round(creditDaysToApprove * 480);

      // Create Entitlement Record
      const entitlementId = generateSurrogateId('coe_');
      await this.repo.createEntitlement({
        id: entitlementId,
        tenantId,
        companyId,
        requestId,
        employeeId: current.employeeId,
        workDate: current.workDate,
        earnedDays: String(creditDaysToApprove),
        earnedMinutes,
        validFrom,
        expiresAt,
        status: 'pending_handoff',
      });

      // Update Request status to approved
      await this.repo.updateRequest(
        tenantId,
        companyId,
        requestId,
        {
          status: 'approved',
          currentStage: 'completed',
          approvedCreditDays: String(creditDaysToApprove),
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
          reviewDecision: 'approved',
          reviewNotes: input.reviewNotes || 'Approved by reviewer.',
        },
        current.version,
      );

      // Create Leave Handoff Contract
      const idempotencyKey = `co_handoff_${tenantId}_${companyId}_${entitlementId}`;
      const handoffId = generateSurrogateId('coh_');

      await this.repo.createHandoff({
        id: handoffId,
        tenantId,
        companyId,
        entitlementId,
        employeeId: current.employeeId,
        idempotencyKey,
        creditDays: String(creditDaysToApprove),
        creditMinutes: earnedMinutes,
        leaveTypeCode: 'comp_off',
        validFrom,
        validUntil: expiresAt,
        status: 'pending_handoff',
        payload: {
          entitlementId,
          requestId,
          employeeId: current.employeeId,
          creditDays: creditDaysToApprove,
          creditMinutes: earnedMinutes,
          workDate: current.workDate,
          validFrom,
          expiresAt,
          policyId: policy?.id,
          policyVersion: policy?.version,
        },
      });

      await this.repo.updateEntitlement(tenantId, companyId, entitlementId, {
        handoffId,
      });

      // Execute Leave Handoff
      await this.executeLeaveHandoff(tenantId, companyId, handoffId);

      await this.repo.logAudit({
        id: generateSurrogateId('co_aud_'),
        tenantId,
        companyId,
        requestId,
        action: 'approved',
        fromStatus: current.status,
        toStatus: 'approved',
        performedByUserId: reviewerUserId,
        performedByRole: reviewerRole,
        details: {
          approvedCreditDays: creditDaysToApprove,
          entitlementId,
          validFrom,
          expiresAt,
          handoffId,
        },
      });
    }

    const updated = await this.repo.getRequestById(tenantId, companyId, requestId);
    return updated!;
  }

  /**
   * Executes the Leave Handoff contract idempotently.
   * If the canonical Leave module is incomplete or does not have comp_off leave ledger,
   * leaves status as 'pending_handoff' / 'acknowledged' with full documented contract payload.
   */
  async executeLeaveHandoff(tenantId: string, companyId: string, handoffId: string): Promise<AttendanceCompOffHandoff> {
    const handoff = await this.repo.getHandoffById(tenantId, companyId, handoffId);
    if (!handoff) {
      throw new NotFoundError(`Handoff record with ID '${handoffId}' not found.`);
    }

    // Acknowledge receipt of the handoff contract
    const updated = await this.repo.updateHandoff(tenantId, companyId, handoffId, {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      lastAttemptAt: new Date(),
      retryCount: handoff.retryCount + 1,
      responseDetails: {
        note: 'Handoff contract registered and acknowledged. Pending canonical Leave ledger balance ingestion.',
        contractVersion: '1.0',
        timestamp: new Date().toISOString(),
      },
    });

    return updated;
  }

  /**
   * Controlled withdrawal of a claim by the employee
   */
  async withdrawRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
    userId: string,
    reason: string,
  ): Promise<CompOffRequestItem> {
    const current = await this.repo.getRequestById(tenantId, companyId, requestId);
    if (!current) throw new NotFoundError('Request not found');

    if (!['submitted', 'pending_approval'].includes(current.status)) {
      throw new ConflictError(`Cannot withdraw claim in status '${current.status}'`);
    }

    await this.repo.updateRequest(
      tenantId,
      companyId,
      requestId,
      {
        status: 'withdrawn',
        currentStage: 'completed',
        withdrawalReason: reason,
      },
      current.version,
    );

    await this.repo.logAudit({
      id: generateSurrogateId('co_aud_'),
      tenantId,
      companyId,
      requestId,
      action: 'withdrawn',
      fromStatus: current.status,
      toStatus: 'withdrawn',
      performedByUserId: userId,
      details: { reason },
    });

    return (await this.repo.getRequestById(tenantId, companyId, requestId))!;
  }

  /**
   * Controlled reversal of an approved Comp-Off Entitlement
   */
  async reverseEntitlement(
    tenantId: string,
    companyId: string,
    entitlementId: string,
    userId: string,
    reversalReason: string,
  ): Promise<CompOffEntitlementItem> {
    const ent = await this.repo.getEntitlementById(tenantId, companyId, entitlementId);
    if (!ent) throw new NotFoundError('Entitlement not found');

    if (ent.status === 'reversed') {
      throw new ConflictError('Entitlement is already reversed.');
    }

    await this.repo.updateEntitlement(tenantId, companyId, entitlementId, {
      status: 'reversed',
      reversalReason,
      reversedByUserId: userId,
      reversedAt: new Date(),
    });

    // Update original request
    await this.repo.updateRequest(tenantId, companyId, ent.requestId, {
      status: 'cancelled',
      cancellationReason: `Reversed: ${reversalReason}`,
    });

    // Reverse any linked handoffs
    if (ent.handoffId) {
      await this.repo.updateHandoff(tenantId, companyId, ent.handoffId, {
        status: 'reversed',
        responseDetails: { reversalReason, reversedAt: new Date().toISOString() },
      });
    }

    // If originated from Overtime settlement, revert OT settlement status
    if (ent.sourceOvertimeSettlementId) {
      const db = getDb();
      await db
        .update(attendanceOvertimeSettlements)
        .set({
          status: 'pending_handoff',
          notes: `Comp-off entitlement ${entitlementId} reversed: ${reversalReason}`,
        })
        .where(eq(attendanceOvertimeSettlements.id, ent.sourceOvertimeSettlementId));
    }

    await this.repo.logAudit({
      id: generateSurrogateId('co_aud_'),
      tenantId,
      companyId,
      requestId: ent.requestId,
      action: 'reversed',
      fromStatus: ent.status,
      toStatus: 'reversed',
      performedByUserId: userId,
      details: { reversalReason, entitlementId },
    });

    const [updated] = (await this.repo.listEntitlements(tenantId, companyId, { id: entitlementId })).items;
    return updated!;
  }

  /**
   * Consumes an Overtime settlement with allocation_type = 'comp_off'
   * and creates an authoritative Comp-Off entitlement record.
   */
  async convertOvertimeSettlementToCompOff(
    tenantId: string,
    companyId: string,
    settlementId: string,
    actorUserId: string,
  ): Promise<CompOffEntitlementItem> {
    const db = getDb();

    const [set] = await db
      .select()
      .from(attendanceOvertimeSettlements)
      .where(
        and(
          eq(attendanceOvertimeSettlements.tenantId, tenantId),
          eq(attendanceOvertimeSettlements.companyId, companyId),
          eq(attendanceOvertimeSettlements.id, settlementId),
        ),
      );

    if (!set) throw new NotFoundError('Overtime settlement not found');
    if (set.allocationType !== 'comp_off') {
      throw new BadRequestError('Settlement allocation type is not comp_off.');
    }
    if (set.status === 'credited_to_comp_off') {
      throw new ConflictError('Overtime settlement has already been converted to Comp-Off.');
    }

    // Convert allocated minutes to days (480 mins = 1 day, 240 mins = 0.5 day)
    const earnedDays = Math.round((set.allocatedMinutes / 480) * 2) / 2;
    const workDate = new Date().toISOString().slice(0, 10);
    const validFrom = workDate;
    const expiresAt = this.formatDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));

    // Create synthetic approved Comp-Off request record representing the OT conversion
    const coRequestId = generateSurrogateId('cor_ot_');
    await this.repo.createRequest({
      id: coRequestId,
      requestNumber: `CO-OT-${settlementId.slice(-8).toUpperCase()}`,
      tenantId,
      companyId,
      employeeId: set.employeeId,
      workDate,
      requestedCreditDays: String(earnedDays),
      qualifyingWorkedMinutes: set.allocatedMinutes,
      reason: `Converted from Overtime Settlement (${set.id})`,
      status: 'approved',
      currentStage: 'completed',
      submittedByUserId: actorUserId,
      submittedAt: new Date(),
      reviewedByUserId: actorUserId,
      reviewedAt: new Date(),
      reviewDecision: 'approved',
      approvedCreditDays: String(earnedDays),
      reviewNotes: `Converted from Overtime Settlement ${settlementId}`,
    });

    const entitlementId = generateSurrogateId('coe_');
    await this.repo.createEntitlement({
      id: entitlementId,
      tenantId,
      companyId,
      requestId: coRequestId,
      employeeId: set.employeeId,
      workDate,
      earnedDays: String(earnedDays),
      earnedMinutes: set.allocatedMinutes,
      validFrom,
      expiresAt,
      status: 'pending_handoff',
      sourceOvertimeSettlementId: set.id,
    });

    // Update Overtime Settlement status to credited_to_comp_off
    await db
      .update(attendanceOvertimeSettlements)
      .set({
        status: 'credited_to_comp_off',
        notes: `Converted to Comp-Off entitlement ${entitlementId} (${earnedDays} days).`,
      })
      .where(eq(attendanceOvertimeSettlements.id, set.id));

    // Create Leave Handoff Contract
    const handoffId = generateSurrogateId('coh_');
    await this.repo.createHandoff({
      id: handoffId,
      tenantId,
      companyId,
      entitlementId,
      employeeId: set.employeeId,
      idempotencyKey: `co_ot_handoff_${tenantId}_${companyId}_${settlementId}`,
      creditDays: String(earnedDays),
      creditMinutes: set.allocatedMinutes,
      leaveTypeCode: 'comp_off',
      validFrom,
      validUntil: expiresAt,
      status: 'pending_handoff',
      payload: {
        settlementId: set.id,
        entitlementId,
        earnedDays,
        earnedMinutes: set.allocatedMinutes,
        source: 'overtime_conversion',
      },
    });

    await this.repo.updateEntitlement(tenantId, companyId, entitlementId, { handoffId });
    await this.executeLeaveHandoff(tenantId, companyId, handoffId);

    const [created] = (await this.repo.listEntitlements(tenantId, companyId, { id: entitlementId })).items;
    return created!;
  }

  // Delegated queries
  async listRequests(tenantId: string, companyId: string, filter: CompOffFilterQuery) {
    return this.repo.listRequests(tenantId, companyId, filter);
  }

  async getRequestById(tenantId: string, companyId: string, requestId: string) {
    return this.repo.getRequestById(tenantId, companyId, requestId);
  }

  async getApprovalQueue(
    tenantId: string,
    companyId: string,
    reviewerContext?: { reviewerUserId?: string; reviewerEmpId?: string; isHrAdmin?: boolean },
  ) {
    return this.repo.getApprovalQueue(tenantId, companyId, reviewerContext);
  }

  async listEntitlements(tenantId: string, companyId: string, filter: CompOffEntitlementFilterQuery) {
    return this.repo.listEntitlements(tenantId, companyId, filter);
  }

  async listHandoffs(tenantId: string, companyId: string, filter: CompOffHandoffFilterQuery) {
    return this.repo.listHandoffs(tenantId, companyId, filter);
  }

  async getOverview(tenantId: string, companyId: string, filter?: { startDate?: string; endDate?: string; departmentId?: string; employeeId?: string }) {
    return this.repo.getOverviewMetrics(tenantId, companyId, filter);
  }

  async listPolicies(tenantId: string, companyId: string, status?: 'draft' | 'published' | 'archived') {
    return this.repo.listPolicies(tenantId, companyId, status);
  }

  async createPolicy(tenantId: string, companyId: string, input: Partial<AttendanceCompOffPolicy> & { policyName: string; effectiveFrom: string }) {
    const policyId = generateSurrogateId('att_co_pol_');
    return this.repo.createPolicy({
      id: policyId,
      tenantId,
      companyId,
      policyName: input.policyName,
      version: 1,
      status: input.status || 'published',
      description: input.description || null,
      scope: input.scope || 'company',
      scopeId: input.scopeId || null,
      overridesPriority: input.overridesPriority || 0,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo || null,
      isEnabled: input.isEnabled ?? true,
      eligibleEmploymentTypes: input.eligibleEmploymentTypes || ['full_time'],
      eligibleDepartments: input.eligibleDepartments || [],
      eligibleWorkdayScenarios: input.eligibleWorkdayScenarios || {
        weeklyOff: true,
        holiday: true,
        approvedExtraWork: false,
      },
      minimumQualifyingMinutes: input.minimumQualifyingMinutes || 240,
      halfDayThresholdMinutes: input.halfDayThresholdMinutes || 240,
      fullDayThresholdMinutes: input.fullDayThresholdMinutes || 480,
      conversionRate: String(input.conversionRate || '1.00'),
      roundingRule: input.roundingRule || 'round_down_half_day',
      submissionDeadlineDays: input.submissionDeadlineDays || 14,
      approvalHierarchy: input.approvalHierarchy || 'manager_then_hr',
      validityDays: input.validityDays || 60,
      maxEarningLimitPerMonthDays: String(input.maxEarningLimitPerMonthDays || '2.00'),
      allowCarryForward: input.allowCarryForward ?? false,
      allowOvertimeConversion: input.allowOvertimeConversion ?? true,
      statutoryRules: input.statutoryRules || {},
      isActive: true,
    });
  }

  async getAuditsForRequest(tenantId: string, companyId: string, requestId: string) {
    return this.repo.getAuditsForRequest(tenantId, companyId, requestId);
  }
}
