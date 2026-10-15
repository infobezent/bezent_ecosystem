/**
 * BEZENT HRMS — Overtime Domain Service (V1.0)
 *
 * Implements enterprise business logic for:
 * - Workday attendance context extraction and eligibility calculation
 * - Overtime request creation with idempotency and duplicate prevention
 * - Multi-stage approval workflow with self-approval guards and optimistic locking
 * - Settlement allocations (Payable vs Comp-Off handoff contract)
 * - Controlled reversal with immutable audit logging
 * - Tenant and company isolation on all operations
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
  type AttendanceOvertimePolicy,
} from '../../../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { AttendanceOvertimeRepository } from '../repository/attendanceOvertime.repository.js';
import { AttendanceOvertimeCalculationService } from './attendanceOvertimeCalculation.service.js';
import type {
  CreateOvertimeRequestInput,
  DecideOvertimeRequestInput,
  AllocateOvertimeSettlementInput,
  ReverseOvertimeSettlementInput,
  OvertimeFilterQuery,
  OvertimeRequestItem,
  OvertimeWorkdayContext,
  OvertimeDayType,
  NewAttendanceOvertimePolicy,
  OvertimeCalculationResult,
  OvertimeSettlementFilterQuery,
} from '../types/attendanceOvertime.types.js';

export class AttendanceOvertimeService {
  constructor(
    private readonly repo = new AttendanceOvertimeRepository(),
    private readonly calculationService = new AttendanceOvertimeCalculationService(),
  ) {}

  /**
   * Helper to compute start and end of week (Monday to Sunday)
   */
  private getWeekBounds(dateStr: string): { startOfWeek: string; endOfWeek: string } {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const day = d.getUTCDay();
    // Monday as start (day 1, or day 7 if Sunday)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    return {
      startOfWeek: monday.toISOString().slice(0, 10),
      endOfWeek: sunday.toISOString().slice(0, 10),
    };
  }

  /**
   * Helper to compute start and end of month
   */
  private getMonthBounds(dateStr: string): { startOfMonth: string; endOfMonth: string } {
    const yearMonth = dateStr.slice(0, 7); // YYYY-MM
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(5, 7), 10);
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startOfMonth: `${yearMonth}-01`,
      endOfMonth: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  /**
   * Loads authoritative attendance and employee context for a specific workday
   */
  async getWorkdayContext(
    tenantId: string,
    companyId: string,
    employeeId: string,
    workDate: string,
  ): Promise<{
    context: OvertimeWorkdayContext;
    policy: AttendanceOvertimePolicy | null;
    calculation: OvertimeCalculationResult;
  }> {
    const db = getDb();

    // 1. Employee lookup
    const [emp] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
        ),
      );

    if (!emp) {
      throw new NotFoundError(`Employee with ID '${employeeId}' not found in this company.`);
    }

    // 2. Authoritative daily attendance record
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
    let dayType: OvertimeDayType = 'regular';
    const dateObj = new Date(`${workDate}T00:00:00Z`);
    const dayOfWeek = dateObj.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (att) {
      if (att.status === 'holiday') {
        dayType = 'holiday';
      } else if (att.status === 'absent' && isWeekend) {
        dayType = 'weekly_off';
      }
    } else if (isWeekend) {
      dayType = 'weekly_off';
    }

    // Scheduled minutes baseline resolution
    // Do NOT assume an 8-hour schedule when no authoritative shift or policy baseline exists.
    let scheduledMinutes = 0;
    let hasAuthoritativeBaseline = false;

    if (dayType === 'weekly_off' || dayType === 'holiday') {
      scheduledMinutes = 0;
      hasAuthoritativeBaseline = true;
    } else {
      const attMeta = att?.calculationMetadata as Record<string, unknown> | null;
      if (typeof attMeta?.scheduledMinutes === 'number' && attMeta.scheduledMinutes > 0) {
        scheduledMinutes = attMeta.scheduledMinutes;
        hasAuthoritativeBaseline = true;
      } else {
        const [publishedAttPolicy] = await db
          .select({
            fullDayThresholdHours: attendancePolicies.fullDayThresholdHours,
            halfDayThresholdHours: attendancePolicies.halfDayThresholdHours,
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
          const fullDayMins = Math.round(
            parseFloat(publishedAttPolicy.fullDayThresholdHours || '8') * 60,
          );
          const halfDayMins = Math.round(
            parseFloat(publishedAttPolicy.halfDayThresholdHours || '4') * 60,
          );
          scheduledMinutes = att?.status === 'half_day' ? halfDayMins : fullDayMins;
          hasAuthoritativeBaseline = true;
        } else if (att?.shiftScheduleRef) {
          scheduledMinutes = att?.status === 'half_day' ? 240 : 480;
          hasAuthoritativeBaseline = true;
        } else {
          hasAuthoritativeBaseline = false;
          scheduledMinutes = 0;
        }
      }
    }

    const actualWorkedMinutes = att?.workedMinutes || 0;
    const isMissingPunch = att?.isMissingPunch ?? false;
    const isRegularized = att?.isRegularized ?? false;

    // 4. Prior approved OT in week and month
    const { startOfWeek, endOfWeek } = this.getWeekBounds(workDate);
    const { startOfMonth, endOfMonth } = this.getMonthBounds(workDate);

    const [priorWeeklyApprovedMinutes, priorMonthlyApprovedMinutes] = await Promise.all([
      this.repo.getPriorApprovedMinutesForWeek(
        tenantId,
        companyId,
        employeeId,
        startOfWeek,
        endOfWeek,
      ),
      this.repo.getPriorApprovedMinutesForMonth(
        tenantId,
        companyId,
        employeeId,
        startOfMonth,
        endOfMonth,
      ),
    ]);

    const context: OvertimeWorkdayContext = {
      workDate,
      dayType,
      scheduledMinutes,
      actualWorkedMinutes,
      isMissingPunch,
      isRegularized,
      hasApprovedOd: false,
      odMinutes: 0,
      employeeEmploymentType: emp.employmentType || 'full_time',
      employeeDepartmentId: emp.departmentId || undefined,
      priorWeeklyApprovedMinutes,
      priorMonthlyApprovedMinutes,
      hasAuthoritativeBaseline,
    };

    // If regular workday has no authoritative baseline, return explicit eligibility-unavailable
    if (dayType === 'regular' && !hasAuthoritativeBaseline) {
      return {
        context,
        policy: null,
        calculation: {
          scheduledMinutes: 0,
          actualWorkedMinutes,
          extraWorkedMinutes: 0,
          eligibleOtMinutes: 0,
          isEligible: false,
          nonEligibilityReason:
            'Eligibility unavailable: No authoritative shift schedule or approved company policy baseline exists for this workday.',
          roundingAdjustmentMinutes: 0,
          complianceNotes: [
            'Eligibility unavailable: Standard workday baseline requires an authoritative shift assignment or published company attendance policy.',
          ],
        },
      };
    }

    // 5. Effective Policy
    const policy = await this.repo.getEffectivePolicy(tenantId, companyId, workDate, {
      departmentId: emp.departmentId || undefined,
      employeeId: emp.id,
    });

    if (!policy) {
      return {
        context,
        policy: null,
        calculation: {
          scheduledMinutes,
          actualWorkedMinutes,
          extraWorkedMinutes: Math.max(0, actualWorkedMinutes - scheduledMinutes),
          eligibleOtMinutes: 0,
          isEligible: false,
          nonEligibilityReason:
            'No active overtime policy configured for this organization or work date.',
          roundingAdjustmentMinutes: 0,
        },
      };
    }

    const calculation = this.calculationService.calculateOvertime(context, policy);

    return { context, policy, calculation };
  }

  /**
   * Submits a new Overtime Request
   */
  async createRequest(
    tenantId: string,
    companyId: string,
    input: CreateOvertimeRequestInput,
    actorUserId: string,
    actorRole?: string,
  ): Promise<OvertimeRequestItem> {
    const db = getDb();

    // 1. Basic validation
    if (!input.employeeId) throw new BadRequestError('Employee ID is required');
    if (!input.workDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.workDate)) {
      throw new BadRequestError('Valid work date (YYYY-MM-DD) is required');
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestError('Reason is required');
    }
    if (typeof input.requestedOtMinutes !== 'number' || input.requestedOtMinutes <= 0) {
      throw new BadRequestError('Requested overtime minutes must be a positive integer');
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
        `An active overtime claim already exists for work date ${input.workDate} (Request ${existingActive.requestNumber}). Multiple active claims for the same date are prohibited.`,
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
      throw new BadRequestError('Cannot submit overtime: No active overtime policy configured.');
    }

    if (!calculation.isEligible) {
      throw new BadRequestError(
        `Overtime is not eligible for this workday: ${calculation.nonEligibilityReason || 'Policy criteria not met.'}`,
      );
    }

    if (input.requestedOtMinutes > calculation.eligibleOtMinutes) {
      throw new BadRequestError(
        `Requested duration (${input.requestedOtMinutes} mins) exceeds calculated policy-eligible duration (${calculation.eligibleOtMinutes} mins).`,
      );
    }

    // 4. Validate Source Intervals
    if (input.sourceIntervals && input.sourceIntervals.length > 0) {
      const intervalVal = this.calculationService.validateSourceIntervals(input.sourceIntervals);
      if (!intervalVal.isValid) {
        throw new BadRequestError(intervalVal.errorMessage || 'Invalid source intervals.');
      }
      if (intervalVal.totalIntervalMinutes < input.requestedOtMinutes) {
        throw new BadRequestError(
          `Total duration of source intervals (${intervalVal.totalIntervalMinutes} mins) is less than requested overtime (${input.requestedOtMinutes} mins).`,
        );
      }
    }

    // 5. Submission deadline check
    const submissionWindowDays = policy.submissionWindowDays || 14;
    const workDateObj = new Date(`${input.workDate}T00:00:00Z`);
    const nowObj = new Date();
    const diffDays = Math.floor((nowObj.getTime() - workDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > submissionWindowDays) {
      throw new BadRequestError(
        `Submission deadline exceeded: overtime claims must be submitted within ${submissionWindowDays} days of the work date (work date was ${diffDays} days ago).`,
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
    const requestId = generateSurrogateId('att_ot_req_');
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
      scheduledMinutes: calculation.scheduledMinutes,
      actualWorkedMinutes: calculation.actualWorkedMinutes,
      extraWorkedMinutes: calculation.extraWorkedMinutes,
      eligibleOtMinutes: calculation.eligibleOtMinutes,
      requestedOtMinutes: input.requestedOtMinutes,
      approvedOtMinutes: 0,
      allocatedPayableMinutes: 0,
      allocatedCompOffMinutes: 0,
      unallocatedMinutes: 0,
      sourceIntervals: input.sourceIntervals || [],
      reason: input.reason.trim(),
      locationOrSite: input.locationOrSite || null,
      taskOrProject: input.taskOrProject || null,
      evidenceAttachments: input.evidenceAttachments || [],
      status: 'submitted',
      settlementStatus: 'unallocated',
      currentStage: assignedTo ? 'pending_manager' : 'pending_hr',
      assignedTo,
      assignedAt: new Date(),
      assignedRole,
      submittedAt: new Date(),
      submittedByUserId: actorUserId,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewDecision: null,
      reviewNotes: null,
      cancellationReason: null,
      withdrawalReason: null,
      version: 1,
    });

    // 8. Record Immutable Audit
    await this.repo.recordAudit({
      id: generateSurrogateId('att_ot_aud_'),
      tenantId,
      companyId,
      requestId,
      action: 'REQUEST_SUBMITTED',
      fromStatus: null,
      toStatus: 'submitted',
      performedByUserId: actorUserId,
      performedByRole: actorRole || 'employee',
      details: {
        requestedOtMinutes: input.requestedOtMinutes,
        eligibleOtMinutes: calculation.eligibleOtMinutes,
        workDate: input.workDate,
        reason: input.reason,
      },
      clientIp: null,
    });

    const created = await this.repo.findRequestById(tenantId, companyId, requestId);
    return created!;
  }

  /**
   * Decision by Manager or HR (Approve or Reject)
   */
  async decideRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
    input: DecideOvertimeRequestInput,
    actorUserId: string,
    actorRole?: string,
  ): Promise<OvertimeRequestItem> {
    const db = getDb();

    // 1. Fetch current request
    const req = await this.repo.findRequestRecordById(tenantId, companyId, requestId);
    if (!req) {
      throw new NotFoundError(`Overtime request with ID '${requestId}' not found.`);
    }

    if (req.status !== 'submitted' && req.status !== 'pending_approval') {
      throw new BadRequestError(
        `Cannot decide request in status '${req.status}'. Must be submitted or pending approval.`,
      );
    }

    // 2. Concurrency check
    if (input.expectedVersion !== undefined && req.version !== input.expectedVersion) {
      throw new ConflictError(
        'Overtime request was modified by another transaction. Please refresh and try again.',
      );
    }

    // 3. Self-approval prevention
    if (actorUserId === req.submittedByUserId) {
      throw new ForbiddenError(
        'Self-approval violation: Requester cannot approve or reject their own overtime request.',
      );
    }

    const [actorEmp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.userId, actorUserId),
        ),
      );

    if (actorEmp && actorEmp.id === req.employeeId) {
      throw new ForbiddenError(
        'Self-approval violation: An employee cannot approve their own overtime claim.',
      );
    }

    // 4. Process Decision
    if (input.decision === 'rejected') {
      await this.repo.updateRequest(tenantId, companyId, requestId, {
        status: 'rejected',
        reviewDecision: 'rejected',
        reviewNotes: input.reviewNotes || null,
        reviewedByUserId: actorUserId,
        reviewedAt: new Date(),
        currentStage: 'completed',
        version: req.version + 1,
      });

      await this.repo.recordAudit({
        id: generateSurrogateId('att_ot_aud_'),
        tenantId,
        companyId,
        requestId,
        action: 'DECISION_REJECTED',
        fromStatus: req.status,
        toStatus: 'rejected',
        performedByUserId: actorUserId,
        performedByRole: actorRole || 'manager',
        details: { reviewNotes: input.reviewNotes },
        clientIp: null,
      });
    } else if (input.decision === 'approved') {
      const approvedMinutes =
        input.approvedOtMinutes !== undefined ? input.approvedOtMinutes : req.requestedOtMinutes;
      if (approvedMinutes <= 0) {
        throw new BadRequestError('Approved overtime minutes must be greater than zero.');
      }
      if (approvedMinutes > req.eligibleOtMinutes) {
        throw new BadRequestError(
          `Approved overtime (${approvedMinutes} mins) cannot exceed policy-eligible duration (${req.eligibleOtMinutes} mins).`,
        );
      }

      await this.repo.updateRequest(tenantId, companyId, requestId, {
        status: 'approved',
        approvedOtMinutes: approvedMinutes,
        unallocatedMinutes: approvedMinutes,
        reviewDecision: 'approved',
        reviewNotes: input.reviewNotes || null,
        reviewedByUserId: actorUserId,
        reviewedAt: new Date(),
        settlementStatus: 'unallocated',
        currentStage: 'completed',
        version: req.version + 1,
      });

      await this.repo.recordAudit({
        id: generateSurrogateId('att_ot_aud_'),
        tenantId,
        companyId,
        requestId,
        action: 'DECISION_APPROVED',
        fromStatus: req.status,
        toStatus: 'approved',
        performedByUserId: actorUserId,
        performedByRole: actorRole || 'manager',
        details: {
          approvedOtMinutes: approvedMinutes,
          reviewNotes: input.reviewNotes,
        },
        clientIp: null,
      });
    } else {
      throw new BadRequestError("Invalid decision. Must be 'approved' or 'rejected'.");
    }

    const updated = await this.repo.findRequestById(tenantId, companyId, requestId);
    return updated!;
  }

  /**
   * Withdraw a request by requester
   */
  async withdrawRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
    reason: string,
    actorUserId: string,
  ): Promise<OvertimeRequestItem> {
    const req = await this.repo.findRequestRecordById(tenantId, companyId, requestId);
    if (!req) {
      throw new NotFoundError(`Overtime request with ID '${requestId}' not found.`);
    }

    if (req.status !== 'draft' && req.status !== 'submitted' && req.status !== 'pending_approval') {
      throw new BadRequestError(`Cannot withdraw request in status '${req.status}'.`);
    }

    await this.repo.updateRequest(tenantId, companyId, requestId, {
      status: 'withdrawn',
      withdrawalReason: reason,
      version: req.version + 1,
    });

    await this.repo.recordAudit({
      id: generateSurrogateId('att_ot_aud_'),
      tenantId,
      companyId,
      requestId,
      action: 'REQUEST_WITHDRAWN',
      fromStatus: req.status,
      toStatus: 'withdrawn',
      performedByUserId: actorUserId,
      performedByRole: 'employee',
      details: { withdrawalReason: reason },
      clientIp: null,
    });

    const updated = await this.repo.findRequestById(tenantId, companyId, requestId);
    return updated!;
  }

  /**
   * Cancel an approved or pending request
   */
  async cancelRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
    reason: string,
    actorUserId: string,
    actorRole?: string,
  ): Promise<OvertimeRequestItem> {
    const req = await this.repo.findRequestRecordById(tenantId, companyId, requestId);
    if (!req) {
      throw new NotFoundError(`Overtime request with ID '${requestId}' not found.`);
    }

    if (req.allocatedPayableMinutes > 0 || req.allocatedCompOffMinutes > 0) {
      throw new BadRequestError(
        'Cannot cancel overtime request with active settlement allocations. Settle allocations must be reversed first.',
      );
    }

    await this.repo.updateRequest(tenantId, companyId, requestId, {
      status: 'cancelled',
      cancellationReason: reason,
      version: req.version + 1,
    });

    await this.repo.recordAudit({
      id: generateSurrogateId('att_ot_aud_'),
      tenantId,
      companyId,
      requestId,
      action: 'REQUEST_CANCELLED',
      fromStatus: req.status,
      toStatus: 'cancelled',
      performedByUserId: actorUserId,
      performedByRole: actorRole || 'admin',
      details: { cancellationReason: reason },
      clientIp: null,
    });

    const updated = await this.repo.findRequestById(tenantId, companyId, requestId);
    return updated!;
  }

  /**
   * Allocate Approved OT towards Payable or Comp-Off
   */
  async allocateSettlement(
    tenantId: string,
    companyId: string,
    requestId: string,
    input: AllocateOvertimeSettlementInput,
    actorUserId: string,
    actorRole?: string,
  ): Promise<OvertimeRequestItem> {
    const req = await this.repo.findRequestRecordById(tenantId, companyId, requestId);
    if (!req) {
      throw new NotFoundError(`Overtime request with ID '${requestId}' not found.`);
    }

    if (req.status !== 'approved') {
      throw new BadRequestError(
        `Cannot allocate settlement for request with status '${req.status}'. Must be approved.`,
      );
    }

    const payableMins = input.payableMinutes || 0;
    const compOffMins = input.compOffMinutes || 0;
    const totalToAllocate = payableMins + compOffMins;

    if (totalToAllocate <= 0) {
      throw new BadRequestError('Must allocate at least 1 minute to payable or comp-off.');
    }

    if (totalToAllocate > req.unallocatedMinutes) {
      throw new BadRequestError(
        `Total allocation (${totalToAllocate} mins) exceeds remaining unallocated approved balance (${req.unallocatedMinutes} mins).`,
      );
    }

    // Verify policy allowances
    const policy = req.policyId
      ? await this.repo.getPolicyById(tenantId, companyId, req.policyId)
      : null;
    if (policy) {
      if (payableMins > 0 && !policy.allowPayable) {
        throw new BadRequestError(
          'Payable overtime is not permitted by the governing overtime policy.',
        );
      }
      if (compOffMins > 0 && !policy.allowCompOff) {
        throw new BadRequestError(
          'Comp-Off conversion is not permitted by the governing overtime policy.',
        );
      }
    }

    // Create Settlement records
    if (payableMins > 0) {
      await this.repo.createSettlement({
        id: generateSurrogateId('att_ot_set_'),
        tenantId,
        companyId,
        requestId,
        employeeId: req.employeeId,
        allocationType: 'payable',
        allocatedMinutes: payableMins,
        status: 'pending_handoff',
        batchReference: input.batchReference || null,
        allocatedByUserId: actorUserId,
        notes: input.notes || null,
        reversalReason: null,
        reversedByUserId: null,
        reversedAt: null,
      });
    }

    if (compOffMins > 0) {
      await this.repo.createSettlement({
        id: generateSurrogateId('att_ot_set_'),
        tenantId,
        companyId,
        requestId,
        employeeId: req.employeeId,
        allocationType: 'comp_off',
        allocatedMinutes: compOffMins,
        status: 'pending_handoff',
        batchReference: input.batchReference || null,
        allocatedByUserId: actorUserId,
        notes: input.notes || null,
        reversalReason: null,
        reversedByUserId: null,
        reversedAt: null,
      });
    }

    const newPayable = req.allocatedPayableMinutes + payableMins;
    const newCompOff = req.allocatedCompOffMinutes + compOffMins;
    const newUnallocated = req.approvedOtMinutes - (newPayable + newCompOff);
    const newSettlementStatus = newUnallocated === 0 ? 'pending_handoff' : 'partially_allocated';

    await this.repo.updateRequest(tenantId, companyId, requestId, {
      allocatedPayableMinutes: newPayable,
      allocatedCompOffMinutes: newCompOff,
      unallocatedMinutes: newUnallocated,
      settlementStatus: newSettlementStatus,
      version: req.version + 1,
    });

    await this.repo.recordAudit({
      id: generateSurrogateId('att_ot_aud_'),
      tenantId,
      companyId,
      requestId,
      action: 'SETTLEMENT_ALLOCATED',
      fromStatus: req.settlementStatus,
      toStatus: newSettlementStatus,
      performedByUserId: actorUserId,
      performedByRole: actorRole || 'payroll_admin',
      details: {
        allocatedPayableMinutes: payableMins,
        allocatedCompOffMinutes: compOffMins,
        batchReference: input.batchReference,
        notes: input.notes,
      },
      clientIp: null,
    });

    const updated = await this.repo.findRequestById(tenantId, companyId, requestId);
    return updated!;
  }

  /**
   * Reverses a settlement allocation
   */
  async reverseSettlement(
    tenantId: string,
    companyId: string,
    input: ReverseOvertimeSettlementInput,
    actorUserId: string,
    actorRole?: string,
  ): Promise<OvertimeRequestItem> {
    if (!input.reversalReason || input.reversalReason.trim().length === 0) {
      throw new BadRequestError('Reversal reason is required.');
    }

    const setRecord = await this.repo.findSettlementById(tenantId, companyId, input.settlementId);
    if (!setRecord) {
      throw new NotFoundError(`Settlement record with ID '${input.settlementId}' not found.`);
    }

    if (setRecord.status === 'reversed') {
      throw new BadRequestError('This settlement record is already reversed.');
    }

    const req = await this.repo.findRequestRecordById(tenantId, companyId, setRecord.requestId);
    if (!req) {
      throw new NotFoundError(
        `Associated overtime request with ID '${setRecord.requestId}' not found.`,
      );
    }

    // Mark settlement as reversed
    await this.repo.updateSettlement(tenantId, companyId, input.settlementId, {
      status: 'reversed',
      reversalReason: input.reversalReason,
      reversedByUserId: actorUserId,
      reversedAt: new Date(),
    });

    // Recompute request allocations
    const newPayable =
      setRecord.allocationType === 'payable'
        ? Math.max(0, req.allocatedPayableMinutes - setRecord.allocatedMinutes)
        : req.allocatedPayableMinutes;
    const newCompOff =
      setRecord.allocationType === 'comp_off'
        ? Math.max(0, req.allocatedCompOffMinutes - setRecord.allocatedMinutes)
        : req.allocatedCompOffMinutes;
    const newUnallocated = req.approvedOtMinutes - (newPayable + newCompOff);
    const newSettlementStatus =
      newPayable === 0 && newCompOff === 0
        ? 'unallocated'
        : newUnallocated === 0
          ? 'pending_handoff'
          : 'partially_allocated';

    await this.repo.updateRequest(tenantId, companyId, req.id, {
      allocatedPayableMinutes: newPayable,
      allocatedCompOffMinutes: newCompOff,
      unallocatedMinutes: newUnallocated,
      settlementStatus: newSettlementStatus,
      version: req.version + 1,
    });

    await this.repo.recordAudit({
      id: generateSurrogateId('att_ot_aud_'),
      tenantId,
      companyId,
      requestId: req.id,
      action: 'SETTLEMENT_REVERSED',
      fromStatus: req.settlementStatus,
      toStatus: newSettlementStatus,
      performedByUserId: actorUserId,
      performedByRole: actorRole || 'payroll_admin',
      details: {
        settlementId: input.settlementId,
        allocationType: setRecord.allocationType,
        reversedMinutes: setRecord.allocatedMinutes,
        reversalReason: input.reversalReason,
      },
      clientIp: null,
    });

    const updated = await this.repo.findRequestById(tenantId, companyId, req.id);
    return updated!;
  }

  // ==========================================
  // QUERY & METRICS PROXY METHODS
  // ==========================================

  async getOverview(
    tenantId: string,
    companyId: string,
    filter?: { startDate?: string; endDate?: string; departmentId?: string; employeeId?: string },
  ) {
    return this.repo.getOverviewMetrics(tenantId, companyId, filter);
  }

  async queryRequests(tenantId: string, companyId: string, filter: OvertimeFilterQuery) {
    return this.repo.queryRequests(tenantId, companyId, filter);
  }

  async getRequestById(tenantId: string, companyId: string, id: string) {
    const item = await this.repo.findRequestById(tenantId, companyId, id);
    if (!item) throw new NotFoundError(`Overtime request with ID '${id}' not found.`);
    const settlements = await this.repo.listSettlementsForRequest(tenantId, companyId, id);
    const audits = await this.repo.listAuditsForRequest(tenantId, companyId, id);
    return { ...item, settlements, audits };
  }

  async listPolicies(tenantId: string, companyId: string) {
    return this.repo.listPolicies(tenantId, companyId);
  }

  async getPolicyById(tenantId: string, companyId: string, id: string) {
    const policy = await this.repo.getPolicyById(tenantId, companyId, id);
    if (!policy) throw new NotFoundError(`Overtime policy with ID '${id}' not found.`);
    return policy;
  }

  async createPolicy(
    tenantId: string,
    companyId: string,
    input: Partial<NewAttendanceOvertimePolicy>,
  ) {
    const policyId = generateSurrogateId('att_ot_pol_');
    return this.repo.createPolicy({
      id: policyId,
      tenantId,
      companyId,
      policyName: input.policyName || 'Standard Policy',
      version: 1,
      status: input.status || 'published',
      description: input.description || null,
      scope: input.scope || 'company',
      scopeId: input.scopeId || null,
      overridesPriority: input.overridesPriority || 0,
      effectiveFrom: input.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: input.effectiveTo || null,
      isEnabled: input.isEnabled ?? true,
      eligibleEmploymentTypes: input.eligibleEmploymentTypes || ['full_time'],
      eligibleDepartments: input.eligibleDepartments || [],
      workdayEligibility: input.workdayEligibility || {
        regularWorkday: true,
        weeklyOff: true,
        holiday: true,
      },
      minimumQualifyingMinutes: input.minimumQualifyingMinutes ?? 30,
      dailyCapMinutes: input.dailyCapMinutes ?? 240,
      weeklyCapMinutes: input.weeklyCapMinutes ?? 720,
      monthlyCapMinutes: input.monthlyCapMinutes ?? 2400,
      roundingRule: input.roundingRule || 'round_down_15',
      requiresPreApproval: input.requiresPreApproval ?? false,
      submissionWindowDays: input.submissionWindowDays ?? 14,
      allowPayable: input.allowPayable ?? true,
      allowCompOff: input.allowCompOff ?? true,
      defaultSettlementPreference: input.defaultSettlementPreference || 'payable',
      approvalHierarchy: input.approvalHierarchy || 'manager_then_hr',
      statutoryRules: input.statutoryRules || {},
      isActive: true,
    });
  }

  async updatePolicy(
    tenantId: string,
    companyId: string,
    id: string,
    patch: Partial<NewAttendanceOvertimePolicy>,
  ) {
    const updated = await this.repo.updatePolicy(tenantId, companyId, id, patch);
    if (!updated) throw new NotFoundError(`Overtime policy with ID '${id}' not found.`);
    return updated;
  }

  async querySettlements(
    tenantId: string,
    companyId: string,
    filter: OvertimeSettlementFilterQuery,
  ) {
    return this.repo.querySettlements(tenantId, companyId, filter);
  }
}
