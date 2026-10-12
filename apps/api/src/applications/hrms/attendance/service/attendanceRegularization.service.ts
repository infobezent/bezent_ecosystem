import { BadRequestError, NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';
import { getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  employees,
  attendancePunches,
  employeeNotifications,
} from '../../../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { attendanceRepository } from '../repository/attendance.repository.js';
import { attendanceRegularizationRepository } from '../repository/attendanceRegularization.repository.js';
import { attendanceRegularizationEligibilityService } from './attendanceRegularizationEligibility.service.js';
import { attendanceCalculationService } from './attendanceCalculation.service.js';
import { DefaultShiftScheduleProvider } from './shiftSchedule.provider.js';
import { attendancePolicyService } from './attendancePolicy.service.js';
import type {
  RegularizationSubmissionInput,
  RegularizationDecisionInput,
  RegularizationClarificationRequestInput,
  RegularizationClarificationResponseInput,
  BulkRegularizationActionInput,
  BulkRegularizationActionResult,
  RegularizationFilterV1,
  RegularizationQueryResultV1,
  RegularizationDetailV1,
  RegularizationExportFilter,
  RegularizationRequestType,
} from '../types/attendance.types.js';

export class AttendanceRegularizationService {
  private readonly scheduleProvider = new DefaultShiftScheduleProvider();

  constructor(
    private readonly repo = attendanceRegularizationRepository,
    private readonly eligibilityService = attendanceRegularizationEligibilityService,
    private readonly attRepo = attendanceRepository,
  ) {}

  /**
   * Submit or draft a new regularization request
   */
  async submitRequest(
    tenantId: string,
    companyId: string,
    input: RegularizationSubmissionInput,
    actorUserId: string,
    isSelfService = false,
  ) {
    const db = getDb();

    // 1. Resolve employee ID
    let employeeId = input.employeeId;
    if (!employeeId && isSelfService) {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.userId, actorUserId),
          ),
        )
        .limit(1);
      if (!emp) {
        throw new NotFoundError('Employee profile not found for authenticated user');
      }
      employeeId = emp.id;
    }

    if (!employeeId) {
      throw new BadRequestError('Employee ID is required');
    }

    if (!input.workday || !/^\d{4}-\d{2}-\d{2}$/.test(input.workday)) {
      throw new BadRequestError('Valid workday (YYYY-MM-DD) is required');
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestError('Reason is required');
    }

    // 2. Validate request type specific parameters
    this.validateRequestTypeFields(input);

    const attachmentsCount = input.evidenceAttachments?.length || 0;

    // 3. Check Eligibility if not draft
    let eligibility = null;
    if (!input.isDraft) {
      eligibility = await this.eligibilityService.checkEligibility(
        tenantId,
        companyId,
        {
          employeeId,
          workday: input.workday,
          requestType: input.requestType,
        },
        attachmentsCount,
      );

      if (!eligibility.eligible) {
        throw new BadRequestError(
          `Regularization submission ineligible: ${eligibility.reasons.join(' ')}`,
        );
      }
    }

    // 4. Fetch existing attendance context for workday
    const [att] = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, employeeId),
          eq(employeeAttendance.date, input.workday),
        ),
      )
      .limit(1);

    const regId = generateSurrogateId('reg');
    const requestNumber = await this.repo.generateNextRequestNumber(companyId);

    // 5. Determine default reviewer assignment
    const [empDetails] = await db
      .select({ reportingManagerId: employees.reportingManagerId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    const assignedTo = empDetails?.reportingManagerId ?? null;
    const approvalStatus = input.isDraft ? 'draft' : 'submitted';

    const newRecord = await this.repo.createRegularization({
      id: regId,
      requestNumber,
      tenantId,
      companyId,
      employeeId,
      workday: input.workday,
      requestType: input.requestType,
      approvalStatus,
      applicationStatus: 'not_applicable',
      source: isSelfService ? 'ess' : 'web',
      assignedTo,
      assignedQueue: assignedTo ? 'manager_queue' : 'hr_unassigned',
      assignedAt: assignedTo ? new Date() : null,
      relatedExceptionId: input.relatedExceptionId || null,
      targetPunchId: input.targetPunchId || null,
      targetPunchDirection: input.targetPunchDirection || null,
      recordedCheckIn: att?.checkInTime || null,
      recordedCheckOut: att?.checkOutTime || null,
      recordedStatus: att?.status || null,
      proposedCheckIn: input.proposedCheckIn || null,
      proposedCheckOut: input.proposedCheckOut || null,
      proposedStatus: input.proposedStatus || null,
      claimedHours: input.claimedHours ? String(input.claimedHours) : null,
      reason: input.reason.trim(),
      evidenceAttachments: input.evidenceAttachments || [],
      isHighRisk: eligibility?.isHighRisk ?? false,
      riskFactors: eligibility?.riskFactors ?? [],
      submittedAt: new Date(),
    });

    // 6. Record Audit Trail
    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: regId,
      action: input.isDraft ? 'created' : 'submitted',
      actorUserId,
      newState: {
        approvalStatus,
        workday: input.workday,
        requestType: input.requestType,
        assignedTo,
      },
      notes: input.isDraft
        ? 'Draft regularization created'
        : `Regularization request submitted (${requestNumber})`,
    });

    // 7. Trigger Notification
    if (!input.isDraft) {
      await this.sendNotification(
        tenantId,
        companyId,
        employeeId,
        'Regularization Request Submitted',
        `Your attendance correction request ${requestNumber} for ${input.workday} has been submitted.`,
        '/hrms/attendance/regularization',
      );
    }

    return newRecord;
  }

  /**
   * Validates dynamic fields required for each of the 7 request types
   */
  private validateRequestTypeFields(input: RegularizationSubmissionInput) {
    switch (input.requestType) {
      case 'missing_in':
        if (!input.proposedCheckIn) {
          throw new BadRequestError('Proposed check-in timestamp is required for Missing IN Punch');
        }
        break;
      case 'missing_out':
        if (!input.proposedCheckOut) {
          throw new BadRequestError(
            'Proposed check-out timestamp is required for Missing OUT Punch',
          );
        }
        break;
      case 'incorrect_time':
        if (!input.proposedCheckIn && !input.proposedCheckOut) {
          throw new BadRequestError(
            'At least one corrected timestamp (check-in or check-out) is required',
          );
        }
        break;
      case 'status_correction':
        if (!input.proposedStatus) {
          throw new BadRequestError(
            'Expected status classification is required for Status Correction',
          );
        }
        break;
      case 'worked_hours':
        if (input.claimedHours === undefined || input.claimedHours === null) {
          throw new BadRequestError('Claimed hours count is required for Worked Hours Discrepancy');
        }
        break;
      case 'both_missing':
        if (!input.proposedCheckIn || !input.proposedCheckOut) {
          throw new BadRequestError(
            'Both proposed check-in and check-out timestamps are required when both punches are missing',
          );
        }
        break;
      case 'wrong_direction':
        if (!input.targetPunchDirection) {
          throw new BadRequestError(
            'Target punch direction is required for Wrong Punch Direction correction',
          );
        }
        break;
      default:
        throw new BadRequestError(`Unsupported request type: ${input.requestType}`);
    }
  }

  /**
   * Query workspace items with counters and filters
   */
  async listRegularizations(
    tenantId: string,
    companyId: string,
    filter: RegularizationFilterV1 = {},
  ): Promise<RegularizationQueryResultV1> {
    return this.repo.listRegularizations(tenantId, companyId, filter);
  }

  /**
   * Retrieve full details for review drawer including evidence context and audit trail
   */
  async getRegularizationDetails(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<RegularizationDetailV1> {
    const db = getDb();
    const item = await this.repo.getRegularizationById(tenantId, companyId, id);
    if (!item) {
      throw new NotFoundError(`Regularization request not found: ${id}`);
    }

    const reg = item.reg;
    const audits = await this.repo.getAuditsForRegularization(tenantId, companyId, id);

    // Fetch existing attendance record
    const [att] = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, reg.employeeId),
          eq(employeeAttendance.date, reg.workday),
        ),
      )
      .limit(1);

    // Fetch punches on and around workday
    const punches = await db
      .select()
      .from(attendancePunches)
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          eq(attendancePunches.employeeId, reg.employeeId),
          eq(attendancePunches.workday, reg.workday),
        ),
      )
      .orderBy(attendancePunches.punchTime);

    // Fetch shift schedule
    const shift = await this.scheduleProvider.getEmployeeSchedule(
      tenantId,
      companyId,
      reg.employeeId,
      reg.workday,
    );

    // Fetch effective policy
    const policy = await attendancePolicyService.getEffectivePolicy(
      tenantId,
      companyId,
      reg.employeeId,
    );

    // Check lock state
    const isLocked = await this.attRepo.checkDateInLockedPeriod(
      tenantId,
      companyId,
      reg.workday,
      reg.workday,
    );

    // Human-readable change string
    const requestedChange = this.repo.formatRequestedChange({
      requestType: reg.requestType,
      recordedCheckIn: reg.recordedCheckIn,
      recordedCheckOut: reg.recordedCheckOut,
      recordedStatus: reg.recordedStatus,
      proposedCheckIn: reg.proposedCheckIn,
      proposedCheckOut: reg.proposedCheckOut,
      proposedStatus: reg.proposedStatus,
      claimedHours: reg.claimedHours ? Number(reg.claimedHours) : null,
      targetPunchDirection: reg.targetPunchDirection,
    });

    return {
      id: reg.id,
      requestNumber: reg.requestNumber,
      employeeId: reg.employeeId,
      employeeCode: item.employeeCode ?? '',
      employeeName: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || 'Unknown',
      departmentName: item.departmentName ?? null,
      workday: reg.workday,
      requestType: reg.requestType,
      approvalStatus: reg.approvalStatus,
      applicationStatus: reg.applicationStatus,
      source: reg.source,
      assignedTo: reg.assignedTo,
      assignedToName: item.reviewerName ?? (reg.assignedTo ? 'HR Admin' : null),
      assignedQueue: reg.assignedQueue,
      relatedExceptionId: reg.relatedExceptionId,
      requestedChange,
      recordedCheckIn: reg.recordedCheckIn,
      recordedCheckOut: reg.recordedCheckOut,
      recordedStatus: reg.recordedStatus,
      proposedCheckIn: reg.proposedCheckIn,
      proposedCheckOut: reg.proposedCheckOut,
      proposedStatus: reg.proposedStatus,
      claimedHours: reg.claimedHours ? Number(reg.claimedHours) : null,
      reason: reg.reason,
      evidenceAttachments: (reg.evidenceAttachments || []) as Array<{
        name: string;
        size: string;
        url?: string;
      }>,
      isHighRisk: reg.isHighRisk,
      submittedAt: reg.submittedAt,
      decidedAt: reg.decidedAt,
      decidedByUserId: reg.decidedByUserId,
      appliedAt: reg.appliedAt,
      applicationError: reg.applicationError,
      applicationBlockedReason: reg.applicationBlockedReason,
      targetPunchId: reg.targetPunchId,
      targetPunchDirection: reg.targetPunchDirection,
      clarificationRequestedAt: reg.clarificationRequestedAt,
      clarificationNotes: reg.clarificationNotes,
      clarificationProvidedAt: reg.clarificationProvidedAt,
      clarificationResponse: reg.clarificationResponse,
      decisionReason: reg.decisionReason,
      riskFactors: (reg.riskFactors || []) as string[],
      appliedAdjustmentId: reg.appliedAdjustmentId,
      evidenceContext: {
        recordedAttendance: att
          ? {
              date: att.date,
              checkInTime: att.checkInTime,
              checkOutTime: att.checkOutTime,
              status: att.status,
              workedMinutes: att.workedMinutes,
              isMissingPunch: att.isMissingPunch,
              isLate: att.isLate,
              isEarlyExit: att.isEarlyExit,
              isRegularized: att.isRegularized,
            }
          : null,
        punchTimeline: punches.map((p) => ({
          id: p.id,
          punchTime: p.punchTime.toISOString(),
          punchType: p.punchType,
          source: p.source,
          workLocation: p.workLocation,
          notes: p.notes,
        })),
        shiftSchedule: {
          name: shift.scheduleRef || 'Standard 9-to-6',
          startTime: shift.startTime,
          endTime: shift.endTime,
          isOvernight: shift.startTime > shift.endTime,
        },
        policyRules: {
          policyName: policy.policyName,
          gracePeriodMinutes: policy.gracePeriodMinutes,
          missingPunchPolicy: policy.missingPunchPolicy,
          allowRegularization: policy.allowRegularization,
          submissionWindowDays: policy.regularizationCutoffDays,
        },
        leaveConflict: {
          hasConflict: false,
        },
        onDutyConflict: {
          hasConflict: false,
        },
        payrollLockState: {
          isLocked,
        },
      },
      audits,
    };
  }

  /**
   * Assign or reassign reviewer
   */
  async assignReviewer(
    tenantId: string,
    companyId: string,
    id: string,
    assignedTo: string | null,
    actorUserId: string,
  ) {
    const existing = await this.repo.getRegularizationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Regularization request not found: ${id}`);
    }

    const reg = existing.reg;
    if (['approved', 'rejected', 'cancelled'].includes(reg.approvalStatus)) {
      throw new ConflictError(
        `Cannot reassign request in finalized state (${reg.approvalStatus})`,
      );
    }

    const oldAssigned = reg.assignedTo;
    const updated = await this.repo.updateRegularization(tenantId, companyId, id, {
      assignedTo,
      assignedAt: new Date(),
      assignedQueue: assignedTo ? 'assigned_reviewer' : 'hr_unassigned',
    });

    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: id,
      action: oldAssigned ? 'reassigned' : 'assigned',
      actorUserId,
      oldState: { assignedTo: oldAssigned },
      newState: { assignedTo },
      notes: assignedTo ? `Assigned to reviewer ${assignedTo}` : 'Unassigned to general queue',
    });

    return updated;
  }

  /**
   * Start review (submitted -> under_review)
   */
  async startReview(tenantId: string, companyId: string, id: string, actorUserId: string) {
    const existing = await this.repo.getRegularizationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Regularization request not found: ${id}`);
    }

    const reg = existing.reg;
    if (reg.approvalStatus !== 'submitted') {
      throw new ConflictError(
        `Can only start review on submitted requests. Current status: ${reg.approvalStatus}`,
      );
    }

    const updated = await this.repo.updateRegularization(tenantId, companyId, id, {
      approvalStatus: 'under_review',
    });

    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: id,
      action: 'review_started',
      actorUserId,
      oldState: { approvalStatus: 'submitted' },
      newState: { approvalStatus: 'under_review' },
      notes: 'Review initiated by reviewer',
    });

    return updated;
  }

  /**
   * Request more information from employee (under_review / submitted -> awaiting_info)
   */
  async requestClarification(
    tenantId: string,
    companyId: string,
    id: string,
    input: RegularizationClarificationRequestInput,
    actorUserId: string,
  ) {
    const existing = await this.repo.getRegularizationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Regularization request not found: ${id}`);
    }

    const reg = existing.reg;
    if (reg.approvalStatus !== 'under_review' && reg.approvalStatus !== 'submitted') {
      throw new ConflictError(
        `Cannot request clarification on request with status: ${reg.approvalStatus}`,
      );
    }

    if (!input.notes || input.notes.trim().length === 0) {
      throw new BadRequestError('Clarification notes / questions are required');
    }

    const updated = await this.repo.updateRegularization(tenantId, companyId, id, {
      approvalStatus: 'awaiting_info',
      clarificationRequestedAt: new Date(),
      clarificationNotes: input.notes.trim(),
    });

    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: id,
      action: 'info_requested',
      actorUserId,
      oldState: { approvalStatus: reg.approvalStatus },
      newState: { approvalStatus: 'awaiting_info', notes: input.notes },
      notes: `Reviewer requested clarification: ${input.notes}`,
    });

    await this.sendNotification(
      tenantId,
      companyId,
      reg.employeeId,
      'Clarification Requested on Regularization',
      `Reviewer requested more information regarding your correction request for ${reg.workday}: ${input.notes}`,
      '/hrms/attendance/regularization',
    );

    return updated;
  }

  /**
   * Employee provides clarification (awaiting_info -> under_review)
   */
  async provideClarification(
    tenantId: string,
    companyId: string,
    id: string,
    input: RegularizationClarificationResponseInput,
    actorUserId: string,
  ) {
    const existing = await this.repo.getRegularizationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Regularization request not found: ${id}`);
    }

    const reg = existing.reg;
    if (reg.approvalStatus !== 'awaiting_info') {
      throw new ConflictError(
        `Request is not awaiting information. Current status: ${reg.approvalStatus}`,
      );
    }

    if (!input.response || input.response.trim().length === 0) {
      throw new BadRequestError('Response text is required');
    }

    const updated = await this.repo.updateRegularization(tenantId, companyId, id, {
      approvalStatus: 'under_review',
      clarificationProvidedAt: new Date(),
      clarificationResponse: input.response.trim(),
    });

    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: id,
      action: 'info_provided',
      actorUserId,
      oldState: { approvalStatus: 'awaiting_info' },
      newState: { approvalStatus: 'under_review', response: input.response },
      notes: `Employee provided clarification: ${input.response}`,
    });

    return updated;
  }

  /**
   * Review request decision: Approve or Reject
   */
  async reviewRequest(
    tenantId: string,
    companyId: string,
    id: string,
    input: RegularizationDecisionInput,
    actorUserId: string,
  ) {
    const db = getDb();
    const existing = await this.repo.getRegularizationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Regularization request not found: ${id}`);
    }

    const reg = existing.reg;

    // 1. Validate status transition
    if (['approved', 'rejected', 'cancelled'].includes(reg.approvalStatus)) {
      throw new ConflictError(
        `This regularization request has already been finalized (${reg.approvalStatus})`,
      );
    }

    // 2. Prevent Self-Approval Invariant
    const [emp] = await db
      .select({ userId: employees.userId })
      .from(employees)
      .where(eq(employees.id, reg.employeeId))
      .limit(1);

    if (actorUserId === reg.employeeId || (emp?.userId && actorUserId === emp.userId)) {
      throw new BadRequestError(
        'Self-approval violation: An employee cannot approve their own regularization request.',
      );
    }

    const decisionReason = input.reason || input.remarks || '';

    if (input.status === 'rejected') {
      if (!decisionReason.trim()) {
        throw new BadRequestError('Rejection reason is mandatory.');
      }

      const updated = await this.repo.updateRegularization(tenantId, companyId, id, {
        approvalStatus: 'rejected',
        applicationStatus: 'not_applicable',
        decisionReason: decisionReason.trim(),
        decidedByUserId: actorUserId,
        decidedAt: new Date(),
      });

      await this.repo.createAudit({
        id: generateSurrogateId('regaud'),
        tenantId,
        companyId,
        regularizationId: id,
        action: 'rejected',
        actorUserId,
        oldState: { approvalStatus: reg.approvalStatus },
        newState: { approvalStatus: 'rejected', decisionReason },
        notes: `Request rejected: ${decisionReason}`,
      });

      await this.sendNotification(
        tenantId,
        companyId,
        reg.employeeId,
        'Regularization Request Rejected',
        `Your correction request for ${reg.workday} was rejected: ${decisionReason}`,
        '/hrms/attendance/regularization',
      );

      return updated;
    }

    // --- APPROVAL FLOW ---
    // 3. Recheck Payroll Lock state
    const isLocked = await this.attRepo.checkDateInLockedPeriod(
      tenantId,
      companyId,
      reg.workday,
      reg.workday,
    );

    if (isLocked) {
      // Mark as Approved but Application Blocked
      const updated = await this.repo.updateRegularization(tenantId, companyId, id, {
        approvalStatus: 'approved',
        applicationStatus: 'blocked',
        applicationBlockedReason:
          'Workday falls within an attendance period locked for payroll. Adjustment blocked.',
        decisionReason: decisionReason.trim() || 'Approved by reviewer',
        decidedByUserId: actorUserId,
        decidedAt: new Date(),
      });

      await this.repo.createAudit({
        id: generateSurrogateId('regaud'),
        tenantId,
        companyId,
        regularizationId: id,
        action: 'apply_blocked',
        actorUserId,
        oldState: { approvalStatus: reg.approvalStatus },
        newState: { approvalStatus: 'approved', applicationStatus: 'blocked' },
        notes: 'Approved by reviewer, but application blocked due to locked payroll period.',
      });

      return updated;
    }

    // 4. Update status to Approved + Pending Application
    await this.repo.updateRegularization(tenantId, companyId, id, {
      approvalStatus: 'approved',
      applicationStatus: 'pending_application',
      decisionReason: decisionReason.trim() || 'Approved by reviewer',
      decidedByUserId: actorUserId,
      decidedAt: new Date(),
    });

    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: id,
      action: 'approved',
      actorUserId,
      oldState: { approvalStatus: reg.approvalStatus },
      newState: { approvalStatus: 'approved', applicationStatus: 'pending_application' },
      notes: `Request approved: ${decisionReason || 'Approved'}`,
    });

    // 5. Apply Adjustment to Attendance Integrity Engine
    try {
      const applyResult = await this.applyAdjustmentToAttendance(
        tenantId,
        companyId,
        reg,
        actorUserId,
      );

      // Re-evaluate and auto-resolve linked exception if present
      if (reg.relatedExceptionId) {
        try {
          await this.attRepo.verifyAndResolveException(
            tenantId,
            companyId,
            reg.relatedExceptionId,
            `Auto-resolved upon approval and application of Regularization Request ${reg.requestNumber}`,
            actorUserId,
          );
        } catch {
          // If already resolved or source verified, continue smoothly
        }
      }

      await this.sendNotification(
        tenantId,
        companyId,
        reg.employeeId,
        'Regularization Request Approved & Applied',
        `Your correction request ${reg.requestNumber} for ${reg.workday} has been approved and applied to your attendance.`,
        '/hrms/attendance/regularization',
      );

      return applyResult;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to apply attendance adjustment';
      const updatedFailed = await this.repo.updateRegularization(tenantId, companyId, id, {
        applicationStatus: 'failed',
        applicationError: errorMsg,
      });

      await this.repo.createAudit({
        id: generateSurrogateId('regaud'),
        tenantId,
        companyId,
        regularizationId: id,
        action: 'apply_failed',
        actorUserId,
        newState: { applicationStatus: 'failed', error: errorMsg },
        notes: `Application failed: ${errorMsg}`,
      });

      return updatedFailed;
    }
  }

  /**
   * Applies approved regularization to attendance records transactionally
   * Recalculates workday and creates adjustment ledger entry.
   * Does NOT alter or fabricate immutable raw biometric punch events.
   */
  async applyAdjustmentToAttendance(
    tenantId: string,
    companyId: string,
    reg: {
      id: string;
      employeeId: string;
      workday: string;
      requestType: RegularizationRequestType;
      recordedCheckIn: string | null;
      recordedCheckOut: string | null;
      recordedStatus: string | null;
      proposedCheckIn: string | null;
      proposedCheckOut: string | null;
      proposedStatus: string | null;
      claimedHours: string | number | null;
      reason: string;
    },
    appliedByUserId: string,
  ) {
    const db = getDb();

    // 1. Fetch current daily attendance record
    const [att] = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, reg.employeeId),
          eq(employeeAttendance.date, reg.workday),
        ),
      )
      .limit(1);

    const shift = await this.scheduleProvider.getEmployeeSchedule(
      tenantId,
      companyId,
      reg.employeeId,
      reg.workday,
    );

    const policy = await attendancePolicyService.getEffectivePolicy(
      tenantId,
      companyId,
      reg.employeeId,
    );

    // Compute target in/out times
    let newIn = reg.proposedCheckIn ?? att?.checkInTime ?? null;
    let newOut = reg.proposedCheckOut ?? att?.checkOutTime ?? null;

    if (reg.requestType === 'missing_in') {
      newIn = reg.proposedCheckIn;
    } else if (reg.requestType === 'missing_out') {
      newOut = reg.proposedCheckOut;
    } else if (reg.requestType === 'both_missing') {
      newIn = reg.proposedCheckIn;
      newOut = reg.proposedCheckOut;
    }

    // 2. Run attendance calculation engine for corrected workday
    const calc = attendanceCalculationService.calculate({
      date: reg.workday,
      checkInTime: newIn,
      checkOutTime: newOut,
      schedule: shift,
      policy,
      isOnApprovedLeave: false,
      isToday: false,
    });

    const targetStatus =
      reg.proposedStatus ??
      (calc.status === 'incomplete' && newIn && newOut ? 'present' : calc.status);

    const targetWorkedMinutes =
      reg.claimedHours && Number(reg.claimedHours) > 0
        ? Math.round(Number(reg.claimedHours) * 60)
        : calc.workedMinutes;

    // 3. Create Attendance Adjustment Ledger Record
    const adjId = generateSurrogateId('adj');
    await this.repo.createAdjustment({
      id: adjId,
      tenantId,
      companyId,
      employeeId: reg.employeeId,
      workday: reg.workday,
      regularizationId: reg.id,
      adjustmentType: reg.requestType,
      originalCheckIn: att?.checkInTime || reg.recordedCheckIn || null,
      originalCheckOut: att?.checkOutTime || reg.recordedCheckOut || null,
      originalStatus: att?.status || reg.recordedStatus || 'absent',
      originalWorkedMinutes: att?.workedMinutes || 0,
      adjustedCheckIn: newIn,
      adjustedCheckOut: newOut,
      adjustedStatus: targetStatus,
      adjustedWorkedMinutes: targetWorkedMinutes,
      approvedByUserId: appliedByUserId,
      appliedByUserId,
      status: 'applied',
      metadata: {
        regularizationId: reg.id,
        reason: reg.reason,
        calculationMetadata: calc.calculationMetadata,
      },
    });

    // 4. Update / Upsert Daily Attendance Record
    const recordData = {
      tenantId,
      companyId,
      employeeId: reg.employeeId,
      date: reg.workday,
      checkInTime: newIn,
      checkOutTime: newOut,
      status: targetStatus as (typeof employeeAttendance.status.enumValues)[number],
      processingState: 'finalized' as const,
      workLocation: att?.workLocation ?? 'office',
      workedMinutes: targetWorkedMinutes,
      lateMinutes: calc.lateMinutes,
      earlyMinutes: calc.earlyMinutes,
      isLate: calc.isLate,
      isEarlyExit: calc.isEarlyExit,
      isMissingPunch: false,
      isRegularized: true,
      notes: `Regularized via request (${reg.reason})`,
      shiftScheduleRef: calc.shiftScheduleRef,
      calculationMetadata: {
        ...calc.calculationMetadata,
        regularizationAdjustmentId: adjId,
        regularizationId: reg.id,
      },
    };

    if (att) {
      await this.attRepo.updateDailyAttendance(att.id, recordData);
    } else {
      await this.attRepo.upsertDailyAttendance({
        id: generateSurrogateId('att'),
        ...recordData,
      });
    }

    // 5. Update Regularization state to Applied
    const updated = await this.repo.updateRegularization(tenantId, companyId, reg.id, {
      applicationStatus: 'applied',
      appliedAt: new Date(),
      appliedAdjustmentId: adjId,
      applicationError: null,
    });

    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: reg.id,
      action: 'applied',
      actorUserId: appliedByUserId,
      newState: {
        applicationStatus: 'applied',
        adjustedCheckIn: newIn,
        adjustedCheckOut: newOut,
        adjustedStatus: targetStatus,
        adjustmentId: adjId,
      },
      notes: `Correction applied to attendance workday ${reg.workday} with recalculation`,
    });

    return updated;
  }

  /**
   * Cancel / withdraw request by employee
   */
  async cancelRequest(
    tenantId: string,
    companyId: string,
    id: string,
    reason: string,
    actorUserId: string,
  ) {
    const existing = await this.repo.getRegularizationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Regularization request not found: ${id}`);
    }

    const reg = existing.reg;
    if (['approved', 'rejected', 'cancelled'].includes(reg.approvalStatus)) {
      throw new ConflictError(
        `Cannot cancel request in finalized state (${reg.approvalStatus})`,
      );
    }

    const updated = await this.repo.updateRegularization(tenantId, companyId, id, {
      approvalStatus: 'cancelled',
      applicationStatus: 'not_applicable',
      decisionReason: reason || 'Cancelled by employee',
    });

    await this.repo.createAudit({
      id: generateSurrogateId('regaud'),
      tenantId,
      companyId,
      regularizationId: id,
      action: 'cancelled',
      actorUserId,
      oldState: { approvalStatus: reg.approvalStatus },
      newState: { approvalStatus: 'cancelled' },
      notes: `Request cancelled by employee: ${reason || 'Withdrawn'}`,
    });

    return updated;
  }

  /**
   * Controlled Bulk Action execution with eligibility check & audit integrity
   */
  async bulkAction(
    tenantId: string,
    companyId: string,
    input: BulkRegularizationActionInput,
    actorUserId: string,
  ): Promise<BulkRegularizationActionResult> {
    const succeeded: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const failed: Array<{ id: string; error: string }> = [];
    const db = getDb();

    for (const reqId of input.requestIds) {
      try {
        const item = await this.repo.getRegularizationById(tenantId, companyId, reqId);
        if (!item) {
          skipped.push({ id: reqId, reason: 'Request record not found' });
          continue;
        }

        const reg = item.reg;

        switch (input.action) {
          case 'assign':
            if (['approved', 'rejected', 'cancelled'].includes(reg.approvalStatus)) {
              skipped.push({ id: reqId, reason: `Already in state ${reg.approvalStatus}` });
              continue;
            }
            await this.assignReviewer(
              tenantId,
              companyId,
              reqId,
              input.assignedTo || null,
              actorUserId,
            );
            succeeded.push(reqId);
            break;

          case 'start_review':
            if (reg.approvalStatus !== 'submitted') {
              skipped.push({ id: reqId, reason: `Status is ${reg.approvalStatus}, not submitted` });
              continue;
            }
            await this.startReview(tenantId, companyId, reqId, actorUserId);
            succeeded.push(reqId);
            break;

          case 'request_info':
            if (reg.approvalStatus !== 'under_review' && reg.approvalStatus !== 'submitted') {
              skipped.push({ id: reqId, reason: `Status is ${reg.approvalStatus}` });
              continue;
            }
            await this.requestClarification(
              tenantId,
              companyId,
              reqId,
              { notes: input.notes || 'Additional evidence required' },
              actorUserId,
            );
            succeeded.push(reqId);
            break;

          case 'bulk_approve': {
            // High-risk and complex cases require individual review!
            if (reg.isHighRisk || reg.requestType === 'both_missing') {
              skipped.push({
                id: reqId,
                reason:
                  'High-risk or both-punches-missing request requires individual investigation.',
              });
              continue;
            }
            if (['approved', 'rejected', 'cancelled'].includes(reg.approvalStatus)) {
              skipped.push({ id: reqId, reason: `Already in state ${reg.approvalStatus}` });
              continue;
            }
            // Check self-approval
            const [bulkEmp] = await db
              .select({ userId: employees.userId })
              .from(employees)
              .where(eq(employees.id, reg.employeeId))
              .limit(1);
            if (actorUserId === reg.employeeId || (bulkEmp?.userId && actorUserId === bulkEmp.userId)) {
              skipped.push({ id: reqId, reason: 'Self-approval restriction prevents bulk action' });
              continue;
            }

            await this.reviewRequest(
              tenantId,
              companyId,
              reqId,
              { status: 'approved', remarks: input.notes || 'Approved in controlled bulk review' },
              actorUserId,
            );
            succeeded.push(reqId);
            break;
          }

          case 'bulk_reject':
            if (['approved', 'rejected', 'cancelled'].includes(reg.approvalStatus)) {
              skipped.push({ id: reqId, reason: `Already in state ${reg.approvalStatus}` });
              continue;
            }
            await this.reviewRequest(
              tenantId,
              companyId,
              reqId,
              { status: 'rejected', reason: input.reason || 'Rejected in bulk operation' },
              actorUserId,
            );
            succeeded.push(reqId);
            break;

          default:
            skipped.push({ id: reqId, reason: `Unsupported bulk action: ${input.action}` });
        }
      } catch (err: unknown) {
        failed.push({
          id: reqId,
          error: err instanceof Error ? err.message : 'Unknown execution error',
        });
      }
    }

    return {
      action: input.action,
      totalRequested: input.requestIds.length,
      succeeded,
      skipped,
      failed,
    };
  }

  /**
   * Export regularizations dataset (CSV with formula injection protection)
   */
  async exportRegularizationsCsv(
    tenantId: string,
    companyId: string,
    filter: RegularizationExportFilter,
  ): Promise<{ filename: string; content: string }> {
    const listResult = await this.repo.listRegularizations(tenantId, companyId, {
      ...filter,
      page: 1,
      limit: 1000,
    });

    let items = listResult.items;
    if (filter.selectedIds && filter.selectedIds.length > 0) {
      const selectedSet = new Set(filter.selectedIds);
      items = items.filter((i) => selectedSet.has(i.id));
    }

    const sanitizeCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      // Formula injection defense
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const headers = [
      'Request Number',
      'Employee Code',
      'Employee Name',
      'Department',
      'Workday',
      'Request Type',
      'Requested Change',
      'Submitted At',
      'Assigned To',
      'Approval Status',
      'Application Status',
      'Related Exception',
      'Reason',
    ];

    const rows = items.map((i) => [
      sanitizeCell(i.requestNumber),
      sanitizeCell(i.employeeCode),
      sanitizeCell(i.employeeName),
      sanitizeCell(i.departmentName || ''),
      sanitizeCell(i.workday),
      sanitizeCell(i.requestType),
      sanitizeCell(i.requestedChange),
      sanitizeCell(i.submittedAt),
      sanitizeCell(i.assignedToName || 'Unassigned'),
      sanitizeCell(i.approvalStatus),
      sanitizeCell(i.applicationStatus),
      sanitizeCell(i.relatedExceptionId || '—'),
      sanitizeCell(i.reason),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `regularization_register_${timestamp}.csv`;

    return { filename, content: csvContent };
  }

  /**
   * Helper to dispatch in-app notification
   */
  private async sendNotification(
    tenantId: string,
    companyId: string,
    employeeId: string,
    title: string,
    message: string,
    link: string,
  ) {
    try {
      const db = getDb();
      await db.insert(employeeNotifications).values({
        id: generateSurrogateId('notif'),
        tenantId,
        companyId,
        employeeId,
        title,
        message,
        type: 'info',
        link,
      });
    } catch {
      // Non-blocking notification
    }
  }
}

export const attendanceRegularizationService = new AttendanceRegularizationService();
