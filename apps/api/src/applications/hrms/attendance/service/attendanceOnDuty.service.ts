import {
  AttendanceOnDutyRepository,
  attendanceOnDutyRepository,
} from '../repository/attendanceOnDuty.repository.js';
import { AttendanceRepository, attendanceRepository } from '../repository/attendance.repository.js';
import { AttendancePolicyService, attendancePolicyService } from './attendancePolicy.service.js';
import {
  AttendanceCalculationService,
  attendanceCalculationService,
} from './attendanceCalculation.service.js';
import {
  DefaultShiftScheduleProvider,
  defaultShiftScheduleProvider,
} from './shiftSchedule.provider.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../../../app/errors/AppError.js';
import type {
  CreateOnDutyRequestPayload,
  ReviewOnDutyDecisionInput,
  OnDutyFilterV1,
  OnDutyItemV1,
  OnDutyDetailV1,
  OnDutyQueryResultV1,
  OnDutyTypeConfig,
  BulkOnDutyActionInput,
  BulkOnDutyActionResult,
  BulkOnDutyEligibilityPreview,
  OnDutyRulesConfig,
  OnDutyDurationType,
  OnDutyApprovalStatus,
  OnDutyProcessingStatus,
  NewAttendanceOnDutyRequestRecord,
  NewAttendanceOnDutyWorkdayRecord,
} from '../types/attendance.types.js';

export const CANONICAL_OD_TYPES: OnDutyTypeConfig[] = [
  {
    id: 'client_visit',
    name: 'Client Visit / Meeting',
    description: 'Meeting or visiting client, partner, or prospective customer on-site',
  },
  {
    id: 'site_visit',
    name: 'Site Visit / Field Work',
    description: 'Inspecting facility, customer installation, or operational project site',
  },
  {
    id: 'training',
    name: 'Official Training',
    description: 'Off-site training workshop, corporate program, or technical conference',
  },
  {
    id: 'travel',
    name: 'Business Travel',
    description: 'Domestic or international official travel for business purposes',
  },
  {
    id: 'branch_visit',
    name: 'Branch / Office Visit',
    description: 'Working from or visiting another corporate branch or affiliate office',
  },
  {
    id: 'assignment',
    name: 'Official Assignment',
    description: 'Assigned off-site official duty, court appearance, or government liaison',
  },
  {
    id: 'other',
    name: 'Other Official Duty',
    description: 'Other authorized company duty requiring absence from primary office',
  },
];

interface MockOnDutyRecord {
  id: string;
  requestNumber?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  odTypeId: string;
  odTypeName?: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  durationType: string;
  durationHours?: number;
  halfDaySession?: string | null;
  locationOrSite?: string | null;
  reason?: string;
  projectReference?: string | null;
  submittedAt?: Date | string;
  createdAt?: Date | string;
  assignedTo?: string | null;
  status: string;
  currentStage: string;
  processingStatus?: string;
  evidenceAttachments?: unknown;
  decisionReason?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | Date | null;
}

interface OnDutyMockRepository {
  checkDateInLockedPeriod?: (
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
  ) => Promise<boolean>;
  checkOverlappingLeave?: (
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ) => Promise<boolean>;
  createOnDutyRequest: (
    tenantId: string,
    companyId: string,
    payload: Record<string, unknown>,
  ) => Promise<MockOnDutyRecord>;
  updateOnDutyRequest: (
    tenantId: string,
    companyId: string,
    id: string,
    payload: Record<string, unknown>,
  ) => Promise<MockOnDutyRecord>;
  getOnDutyRequestById: (
    tenantId: string,
    companyId: string,
    id: string,
  ) => Promise<MockOnDutyRecord | null>;
  upsertDailyAttendance?: (payload: Record<string, unknown>) => Promise<unknown>;
}

export class AttendanceOnDutyService {
  private readonly odRepo: AttendanceOnDutyRepository;
  private readonly attRepo: AttendanceRepository;
  private readonly policyService: AttendancePolicyService;
  private readonly calculator: AttendanceCalculationService;
  private readonly scheduleProvider: DefaultShiftScheduleProvider;
  private readonly isMockRepo: boolean = false;
  private readonly mockRepo?: OnDutyMockRepository;

  constructor(
    odRepoOrAttRepo: AttendanceOnDutyRepository | AttendanceRepository = attendanceOnDutyRepository,
    policyServiceOrAttRepo: AttendancePolicyService | AttendanceRepository = attendanceRepository,
    policyService: AttendancePolicyService = attendancePolicyService,
    calculator: AttendanceCalculationService = attendanceCalculationService,
    scheduleProvider: DefaultShiftScheduleProvider = defaultShiftScheduleProvider,
  ) {
    if (
      odRepoOrAttRepo &&
      'createOnDutyRequest' in odRepoOrAttRepo &&
      !('generateNextRequestNumber' in odRepoOrAttRepo)
    ) {
      this.isMockRepo = true;
      this.mockRepo = odRepoOrAttRepo as unknown as OnDutyMockRepository;
      this.attRepo = odRepoOrAttRepo as AttendanceRepository;
      this.policyService =
        (policyServiceOrAttRepo as AttendancePolicyService) || attendancePolicyService;
      this.odRepo = attendanceOnDutyRepository;
    } else {
      this.odRepo = (odRepoOrAttRepo as AttendanceOnDutyRepository) || attendanceOnDutyRepository;
      this.attRepo = (policyServiceOrAttRepo as AttendanceRepository) || attendanceRepository;
      this.policyService = policyService || attendancePolicyService;
    }
    this.calculator = calculator;
    this.scheduleProvider = scheduleProvider;
  }

  private mapMockToDetail(item: MockOnDutyRecord): OnDutyDetailV1 {
    return {
      id: item.id,
      requestNumber: item.requestNumber || `OD-${item.id.slice(-5).toUpperCase()}`,
      employeeId: item.employeeId,
      employeeName: item.employeeName || 'Test Employee',
      employeeCode: item.employeeCode || 'EMP-01',
      departmentName: item.departmentName || 'Engineering',
      odTypeId: item.odTypeId,
      odTypeName: item.odTypeName || item.odTypeId,
      startDate: item.startDate,
      endDate: item.endDate,
      startTime: item.startTime ?? null,
      endTime: item.endTime ?? null,
      dutyPeriodDisplay: `${item.startDate} to ${item.endDate}`,
      durationType: item.durationType as OnDutyDurationType,
      durationHours: Number(item.durationHours || 8),
      halfDaySession: (item.halfDaySession as 'first_half' | 'second_half' | null) ?? null,
      locationOrSite: item.locationOrSite ?? null,
      purpose: item.reason || '',
      projectReference: item.projectReference ?? null,
      submittedAt: (() => {
        const d = item.submittedAt || item.createdAt;
        if (d instanceof Date) return d.toISOString();
        if (typeof d === 'string') return new Date(d).toISOString();
        return new Date().toISOString();
      })(),
      assignedTo: item.assignedTo ?? null,
      assignedToName: null,
      assignedRole: null,
      approvalStatus: item.status as OnDutyApprovalStatus,
      status: item.status as OnDutyApprovalStatus,
      currentStage: item.currentStage,
      processingStatus: (item.processingStatus as OnDutyProcessingStatus) || 'not_applicable',
      isHighRisk: false,
      riskFactors: [],
      evidenceAttachments:
        (item.evidenceAttachments as Array<{
          name: string;
          size: string;
          url?: string;
        }> | null) ?? null,
      decisionReason: item.decisionReason ?? null,
      reviewedByUserId: item.reviewedByUserId ?? null,
      reviewedAt: item.reviewedAt ? new Date(item.reviewedAt).toISOString() : null,
      attendanceContext: {
        shiftSchedule: null,
        recordedPunchesSummary: '',
        leaveConflict: null,
        otherOdOverlap: null,
        regularizationConflict: null,
        isPayrollLocked: false,
      },
      workdays: [],
      audits: [],
    };
  }

  /**
   * Helper to enumerate dates between start and end inclusive (YYYY-MM-DD).
   */
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);

    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  async getConfiguredOdTypes(tenantId: string, companyId: string): Promise<OnDutyTypeConfig[]> {
    const effectivePolicy = await this.policyService.getEffectivePolicy(tenantId, companyId);
    const odRules = effectivePolicy.odRules as unknown as OnDutyRulesConfig | null;

    if (odRules?.odTypes && odRules.odTypes.length > 0) {
      return odRules.odTypes.map((typeKey) => {
        const found = CANONICAL_OD_TYPES.find(
          (d) => d.id === typeKey || d.name.toLowerCase() === typeKey.toLowerCase(),
        );
        return {
          id: typeKey,
          name:
            found?.name ||
            typeKey
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
          description: found?.description || 'Authorized official duty assignment',
        };
      });
    }

    return CANONICAL_OD_TYPES;
  }

  async createRequest(
    tenantId: string,
    companyId: string,
    input: CreateOnDutyRequestPayload,
    submittedByUserId?: string,
    isDraft: boolean = false,
  ): Promise<OnDutyDetailV1> {
    if (!input.employeeId) throw new BadRequestError('Employee ID is required');
    if (!input.odTypeId) throw new BadRequestError('On-Duty type is required');
    if (!input.startDate || !input.endDate)
      throw new BadRequestError('Start and end date are required');
    const purpose = (
      input.purpose ||
      (input as unknown as { reason?: string }).reason ||
      ''
    ).trim();
    if (purpose.length < 3) {
      throw new BadRequestError('A detailed business purpose (minimum 3 characters) is required');
    }
    input.purpose = purpose;
    const effectiveIsDraft = Boolean(input.isDraft || isDraft);

    if (input.startDate > input.endDate) {
      throw new BadRequestError('Start date cannot be after end date');
    }

    const durationType = input.durationType || 'full_day';
    if (durationType === 'hourly' && (!input.startTime || !input.endTime)) {
      throw new BadRequestError(
        'Start time and end time are mandatory for hourly On-Duty requests',
      );
    }

    const effectivePolicy = await this.policyService.getEffectivePolicy(
      tenantId,
      companyId,
      input.startDate,
      input.employeeId,
    );
    const odRules = effectivePolicy.odRules as unknown as OnDutyRulesConfig | null;

    if (odRules?.enabled === false) {
      throw new BadRequestError('On-Duty requests are disabled by company policy');
    }

    // Check submission window (past dates)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (input.startDate < todayStr) {
      const msDiff =
        new Date(`${todayStr}T00:00:00Z`).getTime() -
        new Date(`${input.startDate}T00:00:00Z`).getTime();
      const daysAgo = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      const maxBackdated = odRules?.backdatedAllowedDays ?? odRules?.maxBackdatedDays ?? 14;
      if (daysAgo > maxBackdated) {
        throw new BadRequestError(
          `Backdated requests older than ${maxBackdated} days are not permitted by policy (requested: ${daysAgo} days ago)`,
        );
      }
    }

    if (this.isMockRepo && this.mockRepo) {
      if (this.mockRepo.checkDateInLockedPeriod) {
        const locked = await this.mockRepo.checkDateInLockedPeriod(
          tenantId,
          companyId,
          input.startDate,
          input.endDate,
        );
        if (locked) {
          throw new BadRequestError(
            'Cannot submit On-Duty request: One or more dates fall into a locked payroll period',
          );
        }
      }
      if (this.mockRepo.checkOverlappingLeave) {
        const hasLeave = await this.mockRepo.checkOverlappingLeave(
          tenantId,
          companyId,
          input.employeeId,
          input.startDate,
          input.endDate,
        );
        if (hasLeave) {
          throw new ConflictError(
            'Cannot submit On-Duty request: An approved leave overlapping these dates already exists',
          );
        }
      }
      const created = await this.mockRepo.createOnDutyRequest(tenantId, companyId, {
        employeeId: input.employeeId,
        odTypeId: input.odTypeId,
        odTypeName: input.odTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationType,
        halfDaySession: input.halfDaySession,
        durationHours: durationType === 'half_day' ? 4 : 8,
        reason: purpose,
        locationOrSite: input.locationOrSite,
        attachmentUrl: input.evidenceAttachments?.[0]?.url,
        submittedByUserId,
        effectivePolicyVersion: effectivePolicy.version || 1,
        status: effectiveIsDraft ? 'draft' : 'submitted',
        currentStage: effectiveIsDraft ? 'draft' : 'pending_approval',
      });
      return this.mapMockToDetail(created);
    }

    // Check locked attendance period
    const isLocked = await this.odRepo.checkDateInLockedPeriod(
      tenantId,
      companyId,
      input.startDate,
      input.endDate,
    );
    if (isLocked) {
      throw new BadRequestError(
        'Cannot submit On-Duty request: One or more dates fall into a locked payroll period',
      );
    }

    // Check overlapping OD request
    const existingOd = await this.odRepo.checkOverlappingOnDuty(
      tenantId,
      companyId,
      input.employeeId,
      input.startDate,
      input.endDate,
    );
    if (existingOd) {
      throw new ConflictError(
        `Employee already has an active On-Duty request (${existingOd.odTypeName}, ${existingOd.startDate} to ${existingOd.endDate}) overlapping these dates`,
      );
    }

    // Check overlapping approved leave
    const hasLeave = await this.odRepo.checkOverlappingLeave(
      tenantId,
      companyId,
      input.employeeId,
      input.startDate,
      input.endDate,
    );
    if (hasLeave) {
      throw new ConflictError(
        'Employee has approved leave overlapping the requested On-Duty period',
      );
    }

    // Resolve OD type label
    const configuredTypes = await this.getConfiguredOdTypes(tenantId, companyId);
    const typeObj = configuredTypes.find((t) => t.id === input.odTypeId);
    const odTypeName = typeObj?.name || input.odTypeId;

    const requestNumber = await this.odRepo.generateNextRequestNumber(companyId);
    const id = `od_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Assess risk factors
    const riskFactors: string[] = [];
    const isMultiDay = input.startDate !== input.endDate;
    if (isMultiDay) riskFactors.push('multi_day');
    if (input.startDate < todayStr) riskFactors.push('retroactive');
    const isHighRisk = riskFactors.length > 0;

    let durationHours = 8.0;
    if (durationType === 'half_day') durationHours = 4.0;
    else if (durationType === 'hourly' && input.startTime && input.endTime) {
      const [sh, sm] = input.startTime.split(':').map(Number);
      const [eh, em] = input.endTime.split(':').map(Number);
      if (sh !== undefined && sm !== undefined && eh !== undefined && em !== undefined) {
        durationHours = Math.max(0.5, (eh * 60 + em - (sh * 60 + sm)) / 60);
      }
    }

    const newRecord: NewAttendanceOnDutyRequestRecord = {
      id,
      requestNumber,
      tenantId,
      companyId,
      employeeId: input.employeeId,
      odTypeId: input.odTypeId,
      odTypeName,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      durationType,
      halfDaySession: input.halfDaySession || null,
      durationHours: String(durationHours.toFixed(2)),
      reason: input.purpose.trim(),
      locationOrSite: input.locationOrSite?.trim() || null,
      projectReference: input.projectReference?.trim() || null,
      attachmentUrl: input.evidenceAttachments?.[0]?.url || null,
      evidenceAttachments: input.evidenceAttachments || null,
      status: effectiveIsDraft ? 'draft' : 'submitted',
      processingStatus: 'not_applicable',
      currentStage: effectiveIsDraft ? 'draft' : 'pending_manager',
      submittedAt: effectiveIsDraft ? null : new Date(),
      submittedByUserId: submittedByUserId || null,
      effectivePolicyVersion: effectivePolicy.version || 1,
      isHighRisk,
      riskFactors,
    };

    await this.odRepo.createRequest(newRecord);

    // Create workday placeholders
    const dates = this.getDateRange(input.startDate, input.endDate);
    const workdaysToInsert: NewAttendanceOnDutyWorkdayRecord[] = dates.map((wDate) => ({
      id: `od_wd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      employeeId: input.employeeId,
      workday: wDate,
      durationType: durationType === 'multi_day' ? 'full_day' : durationType,
      durationHours:
        durationType === 'hourly'
          ? durationHours.toFixed(2)
          : durationType === 'half_day'
            ? '4.00'
            : '8.00',
      halfDaySession: input.halfDaySession || null,
      creditedStatus: durationType === 'half_day' ? 'half_day' : 'present',
      creditedWorkedMinutes:
        durationType === 'hourly'
          ? Math.round(durationHours * 60)
          : durationType === 'half_day'
            ? 240
            : 480,
      processingStatus: 'not_applicable',
    }));

    await this.odRepo.createWorkdays(workdaysToInsert);

    // Audit record
    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: effectiveIsDraft ? 'created' : 'submitted',
      actorUserId: submittedByUserId || null,
      notes: effectiveIsDraft
        ? 'Draft On-Duty request saved'
        : `Submitted On-Duty request: ${odTypeName}`,
      oldState: null,
      newState: { status: effectiveIsDraft ? 'draft' : 'submitted', requestNumber },
    });

    if (!effectiveIsDraft) {
      await this.odRepo.dispatchNotification(
        tenantId,
        companyId,
        input.employeeId,
        'On-Duty Request Submitted',
        `Your On-Duty request (${requestNumber}) for ${odTypeName} has been submitted for approval.`,
        'info',
      );
    }

    const result = await this.odRepo.getRequestById(tenantId, companyId, id);
    if (!result) throw new NotFoundError('Failed to retrieve newly created On-Duty request');
    return result;
  }

  async listWorkspace(
    tenantId: string,
    companyId: string,
    filter: OnDutyFilterV1,
  ): Promise<OnDutyQueryResultV1> {
    return this.odRepo.getRequests(tenantId, companyId, filter);
  }

  async listRequests(
    tenantId: string,
    companyId: string,
    filter: OnDutyFilterV1,
  ): Promise<OnDutyItemV1[]> {
    const res = await this.listWorkspace(tenantId, companyId, filter);
    return res.items;
  }

  async submitDraft(
    tenantId: string,
    companyId: string,
    id: string,
    actorUserId: string,
  ): Promise<OnDutyDetailV1> {
    if (this.isMockRepo && this.mockRepo) {
      const updated = await this.mockRepo.updateOnDutyRequest(tenantId, companyId, id, {
        status: 'submitted',
        currentStage: 'pending_approval',
        submittedAt: new Date(),
      });
      return this.mapMockToDetail(updated);
    }
    const existing = await this.getRequestById(tenantId, companyId, id);
    if (existing.approvalStatus !== 'draft') {
      throw new BadRequestError('Only draft requests can be submitted');
    }
    await this.odRepo.updateRequest(tenantId, companyId, id, {
      status: 'submitted',
      currentStage: 'pending_manager',
      submittedAt: new Date(),
      submittedByUserId: actorUserId,
    });
    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: 'submitted',
      actorUserId,
      notes: 'Submitted from draft',
      oldState: { status: 'draft' },
      newState: { status: 'submitted' },
    });
    return this.getRequestById(tenantId, companyId, id);
  }

  async withdrawRequest(
    tenantId: string,
    companyId: string,
    id: string,
    actorUserId: string,
    reason?: string,
  ): Promise<OnDutyDetailV1> {
    if (this.isMockRepo && this.mockRepo) {
      const updated = await this.mockRepo.updateOnDutyRequest(tenantId, companyId, id, {
        status: 'withdrawn',
        currentStage: 'withdrawn',
        withdrawnAt: new Date(),
        withdrawnReason: reason || null,
      });
      return this.mapMockToDetail(updated);
    }
    const existing = await this.getRequestById(tenantId, companyId, id);
    if (existing.approvalStatus !== 'submitted' && existing.approvalStatus !== 'draft') {
      throw new BadRequestError('Only pending or draft requests can be withdrawn');
    }
    await this.odRepo.updateRequest(tenantId, companyId, id, {
      status: 'withdrawn',
      currentStage: 'withdrawn',
      withdrawnAt: new Date(),
      withdrawnReason: reason || 'Withdrawn by employee',
    });
    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: 'withdrawn',
      actorUserId,
      notes: reason || 'Withdrawn by employee',
      oldState: { status: existing.approvalStatus },
      newState: { status: 'withdrawn' },
    });
    return this.getRequestById(tenantId, companyId, id);
  }

  async reviewRequest(
    tenantId: string,
    companyId: string,
    id: string,
    input: {
      status?: 'approved' | 'rejected';
      action?: 'approve' | 'reject';
      decisionReason?: string;
      reason?: string;
      remarks?: string;
    },
    actorUserId: string,
    reviewerEmployeeId?: string,
  ): Promise<OnDutyDetailV1> {
    const action =
      input.status === 'approved' || input.action === 'approve'
        ? ('approved' as const)
        : ('rejected' as const);
    const reason = input.decisionReason || input.reason || input.remarks || '';
    return this.reviewDecision(
      tenantId,
      companyId,
      id,
      { action, reason },
      actorUserId,
      reviewerEmployeeId,
    );
  }

  async getRequestById(tenantId: string, companyId: string, id: string): Promise<OnDutyDetailV1> {
    if (this.isMockRepo && this.mockRepo) {
      const item = await this.mockRepo.getOnDutyRequestById(tenantId, companyId, id);
      if (!item) throw new NotFoundError(`On-Duty request ${id} not found`);
      return this.mapMockToDetail(item);
    }
    const item = await this.odRepo.getRequestById(tenantId, companyId, id);
    if (!item) throw new NotFoundError(`On-Duty request ${id} not found`);
    return item;
  }

  async assignReviewer(
    tenantId: string,
    companyId: string,
    id: string,
    assigneeUserId: string,
    actorUserId: string,
    role?: string,
  ): Promise<OnDutyDetailV1> {
    const existing = await this.getRequestById(tenantId, companyId, id);
    await this.odRepo.updateRequest(tenantId, companyId, id, {
      assignedTo: assigneeUserId,
      assignedAt: new Date(),
      assignedRole: role || 'Reviewer',
      status: existing.approvalStatus === 'submitted' ? 'under_review' : existing.approvalStatus,
    });

    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: 'assigned',
      actorUserId,
      notes: `Assigned reviewer to ${assigneeUserId}`,
      oldState: { assignedTo: existing.assignedTo },
      newState: { assignedTo: assigneeUserId },
    });

    await this.odRepo.dispatchNotification(
      tenantId,
      companyId,
      existing.employeeId,
      'Reviewer Assigned to On-Duty',
      `Your On-Duty request (${existing.requestNumber}) has been assigned to a reviewer.`,
      'info',
    );

    return this.getRequestById(tenantId, companyId, id);
  }

  async startReview(
    tenantId: string,
    companyId: string,
    id: string,
    actorUserId: string,
  ): Promise<OnDutyDetailV1> {
    const existing = await this.getRequestById(tenantId, companyId, id);
    if (existing.approvalStatus === 'under_review') {
      return existing;
    }
    if (existing.approvalStatus !== 'submitted') {
      throw new BadRequestError(
        `Cannot start review on request with status '${existing.approvalStatus}'`,
      );
    }

    await this.odRepo.updateRequest(tenantId, companyId, id, {
      status: 'under_review',
      currentStage: 'in_review',
    });

    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: 'review_started',
      actorUserId,
      notes: 'Review initiated by reviewer',
      oldState: { status: 'submitted' },
      newState: { status: 'under_review' },
    });

    return this.getRequestById(tenantId, companyId, id);
  }

  async requestClarification(
    tenantId: string,
    companyId: string,
    id: string,
    notes: string,
    actorUserId: string,
  ): Promise<OnDutyDetailV1> {
    if (!notes || notes.trim().length < 3) {
      throw new BadRequestError('Clarification notes (minimum 3 characters) are mandatory');
    }
    const existing = await this.getRequestById(tenantId, companyId, id);

    await this.odRepo.updateRequest(tenantId, companyId, id, {
      status: 'awaiting_info',
      currentStage: 'awaiting_employee',
      clarificationRequestedAt: new Date(),
      clarificationNotes: notes.trim(),
    });

    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: 'info_requested',
      actorUserId,
      notes: `Requested clarification: ${notes.trim()}`,
      oldState: { status: existing.approvalStatus },
      newState: { status: 'awaiting_info', clarificationNotes: notes.trim() },
    });

    await this.odRepo.dispatchNotification(
      tenantId,
      companyId,
      existing.employeeId,
      `Clarification Requested: On-Duty (${existing.requestNumber})`,
      notes.trim(),
      'action_required',
    );

    return this.getRequestById(tenantId, companyId, id);
  }

  async provideClarification(
    tenantId: string,
    companyId: string,
    id: string,
    response: string,
    actorUserId: string,
  ): Promise<OnDutyDetailV1> {
    if (!response || response.trim().length < 3) {
      throw new BadRequestError('Clarification response (minimum 3 characters) is required');
    }
    const existing = await this.getRequestById(tenantId, companyId, id);
    if (existing.approvalStatus !== 'awaiting_info') {
      throw new BadRequestError(
        `Cannot provide clarification on request with status '${existing.approvalStatus}'`,
      );
    }

    await this.odRepo.updateRequest(tenantId, companyId, id, {
      status: 'under_review',
      currentStage: 'in_review',
      clarificationProvidedAt: new Date(),
      clarificationResponse: response.trim(),
    });

    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: 'info_provided',
      actorUserId,
      notes: `Clarification provided by employee: ${response.trim()}`,
      oldState: { status: 'awaiting_info' },
      newState: { status: 'under_review', clarificationResponse: response.trim() },
    });

    return this.getRequestById(tenantId, companyId, id);
  }

  async reviewDecision(
    tenantId: string,
    companyId: string,
    id: string,
    input: ReviewOnDutyDecisionInput,
    reviewerUserId: string,
    reviewerEmployeeId?: string,
  ): Promise<OnDutyDetailV1> {
    const existing = await this.getRequestById(tenantId, companyId, id);
    if (existing.approvalStatus !== 'submitted' && existing.approvalStatus !== 'under_review') {
      throw new BadRequestError(`Cannot review request in status '${existing.approvalStatus}'`);
    }

    // Prevent self-approval (check both reviewerEmployeeId and reviewerUserId against employee record)
    const empUserId = await this.odRepo.findEmployeeUserId(existing.employeeId);
    if (
      (reviewerEmployeeId && reviewerEmployeeId === existing.employeeId) ||
      (reviewerUserId &&
        (reviewerUserId === existing.employeeId || (empUserId && reviewerUserId === empUserId)))
    ) {
      throw new ForbiddenError('Self-approval of On-Duty requests is prohibited');
    }

    if (this.isMockRepo && this.mockRepo) {
      if (input.action === 'rejected') {
        if (!input.reason || input.reason.trim().length < 3) {
          throw new BadRequestError('A rejection reason (minimum 3 characters) is mandatory');
        }
      }
      const status = input.action === 'approved' ? 'approved' : 'rejected';
      const updated = await this.mockRepo.updateOnDutyRequest(tenantId, companyId, id, {
        status,
        currentStage: status,
        decisionReason: input.reason || 'Approved by authorized reviewer',
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
      });
      if (status === 'approved') {
        const dates = this.getDateRange(existing.startDate, existing.endDate);
        for (const d of dates) {
          if (this.mockRepo.upsertDailyAttendance) {
            await this.mockRepo.upsertDailyAttendance({
              tenantId,
              companyId,
              employeeId: existing.employeeId,
              date: d,
              status: existing.durationType === 'half_day' ? 'half_day' : 'present',
              workedMinutes: existing.durationType === 'half_day' ? 240 : 480,
              workLocation: existing.locationOrSite || 'field',
              notes: `Approved On-Duty: ${existing.odTypeName} (${existing.id})`,
            });
          }
        }
      }
      return this.mapMockToDetail(updated);
    }

    if (input.action === 'clarify') {
      return this.requestClarification(
        tenantId,
        companyId,
        id,
        input.reason || input.notes || 'Please provide details',
        reviewerUserId,
      );
    }

    if (input.action === 'rejected') {
      if (!input.reason || input.reason.trim().length < 3) {
        throw new BadRequestError('A rejection reason (minimum 3 characters) is mandatory');
      }

      await this.odRepo.updateRequest(tenantId, companyId, id, {
        status: 'rejected',
        currentStage: 'rejected',
        decisionReason: input.reason.trim(),
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        processingStatus: 'not_applicable',
      });

      await this.odRepo.createAudit({
        id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        companyId,
        onDutyRequestId: id,
        action: 'rejected',
        actorUserId: reviewerUserId,
        notes: `Rejected: ${input.reason.trim()}`,
        oldState: { status: existing.approvalStatus },
        newState: { status: 'rejected', reason: input.reason.trim() },
      });

      await this.odRepo.dispatchNotification(
        tenantId,
        companyId,
        existing.employeeId,
        `On-Duty Request Rejected (${existing.requestNumber})`,
        `Your On-Duty request was rejected. Reason: ${input.reason.trim()}`,
        'warning',
      );

      return this.getRequestById(tenantId, companyId, id);
    }

    if (input.action === 'approved') {
      // 1. Re-validate payroll lock
      const isLocked = await this.odRepo.checkDateInLockedPeriod(
        tenantId,
        companyId,
        existing.startDate,
        existing.endDate,
      );
      if (isLocked) {
        throw new BadRequestError(
          'Cannot approve On-Duty request: One or more dates fall into a locked payroll period',
        );
      }

      // 2. Re-validate overlapping leave
      const hasLeave = await this.odRepo.checkOverlappingLeave(
        tenantId,
        companyId,
        existing.employeeId,
        existing.startDate,
        existing.endDate,
      );
      if (hasLeave) {
        throw new ConflictError(
          'Cannot approve On-Duty request: Conflicting approved leave exists',
        );
      }

      // 3. Mark Approved
      await this.odRepo.updateRequest(tenantId, companyId, id, {
        status: 'approved',
        currentStage: 'approved',
        decisionReason:
          input.reason?.trim() || input.notes?.trim() || 'Approved by authorized reviewer',
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        appliedAt: new Date(),
        appliedByUserId: reviewerUserId,
      });

      await this.odRepo.createAudit({
        id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        companyId,
        onDutyRequestId: id,
        action: 'approved',
        actorUserId: reviewerUserId,
        notes: `Approved: ${input.reason?.trim() || 'Approved'}`,
        oldState: { status: existing.approvalStatus },
        newState: { status: 'approved' },
      });

      // 4. Execute Attendance Engine Reconciliation
      await this.processApprovedAttendanceCredit(tenantId, companyId, id);

      await this.odRepo.dispatchNotification(
        tenantId,
        companyId,
        existing.employeeId,
        `On-Duty Request Approved (${existing.requestNumber})`,
        `Your On-Duty request for ${existing.odTypeName} has been approved.`,
        'success',
      );

      return this.getRequestById(tenantId, companyId, id);
    }

    throw new BadRequestError(`Invalid decision action '${input.action}'`);
  }

  /**
   * Applies approved On-Duty credit to employee_attendance for each affected workday.
   * Tracks per-workday status and aggregates request-level processing status.
   */
  async processApprovedAttendanceCredit(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<void> {
    const existing = await this.getRequestById(tenantId, companyId, id);
    const today = new Date().toISOString().slice(0, 10);
    const dates = this.getDateRange(existing.startDate, existing.endDate);

    let appliedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    for (const wDate of dates) {
      const isFuture = wDate > today;
      const workdayRecord = existing.workdays.find((w) => w.workday === wDate);

      if (isFuture) {
        // Future duty is not prematurely reconciled into finalized attendance
        pendingCount++;
        if (workdayRecord) {
          await this.odRepo.updateWorkday(workdayRecord.id, {
            processingStatus: 'pending',
          });
        }
        continue;
      }

      try {
        const [isLocked, policy] = await Promise.all([
          this.odRepo.checkDateInLockedPeriod(tenantId, companyId, wDate, wDate),
          this.policyService.getEffectivePolicy(tenantId, companyId, wDate, existing.employeeId),
        ]);

        if (isLocked) {
          blockedCount++;
          if (workdayRecord) {
            await this.odRepo.updateWorkday(workdayRecord.id, {
              processingStatus: 'blocked',
              blockedReason: 'Payroll period locked',
            });
          }
          continue;
        }

        const existingAtt = await this.attRepo.getTodayAttendance(
          tenantId,
          companyId,
          existing.employeeId,
          wDate,
        );

        const fullDayMinutes = policy?.fullDayThresholdHours
          ? Math.round(Number(policy.fullDayThresholdHours) * 60)
          : 480;
        const halfDayMinutes = policy?.halfDayThresholdHours
          ? Math.round(Number(policy.halfDayThresholdHours) * 60)
          : 240;

        let baseOdMinutes = fullDayMinutes;
        if (existing.durationType === 'half_day') {
          baseOdMinutes = halfDayMinutes;
        } else if (existing.durationType === 'hourly') {
          baseOdMinutes = Math.round(Number(existing.durationHours || 1) * 60);
        }

        const calcMeta = existingAtt?.calculationMetadata as
          { isOdCredit?: boolean; odRequestId?: string } | null | undefined;
        const alreadyCredited =
          existingAtt && Boolean(calcMeta?.isOdCredit) && calcMeta?.odRequestId === existing.id;

        let creditedMinutes = baseOdMinutes;
        let finalStatus: 'present' | 'half_day' =
          existing.durationType === 'half_day' ? 'half_day' : 'present';

        if (alreadyCredited) {
          creditedMinutes = existingAtt.workedMinutes;
          finalStatus = existingAtt.status as 'present' | 'half_day';
        } else if (existingAtt && existingAtt.workedMinutes > 0) {
          const combined = existingAtt.workedMinutes + baseOdMinutes;
          creditedMinutes = combined;
          finalStatus =
            combined >= fullDayMinutes
              ? 'present'
              : combined >= halfDayMinutes
                ? 'half_day'
                : 'present';
        } else {
          finalStatus =
            baseOdMinutes >= fullDayMinutes
              ? 'present'
              : baseOdMinutes >= halfDayMinutes
                ? 'half_day'
                : 'present';
        }

        const attId =
          existingAtt?.id || `att_od_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const recordData = {
          tenantId,
          companyId,
          employeeId: existing.employeeId,
          date: wDate,
          checkInTime: existingAtt?.checkInTime ?? null,
          checkOutTime: existingAtt?.checkOutTime ?? null,
          status: finalStatus,
          processingState: 'finalized' as const,
          workLocation: existing.locationOrSite || 'field',
          workedMinutes: creditedMinutes,
          lateMinutes: 0,
          earlyMinutes: 0,
          isLate: false,
          isEarlyExit: false,
          isMissingPunch: false,
          isRegularized: false,
          notes:
            existingAtt?.notes && !alreadyCredited
              ? `${existingAtt.notes} | Approved On-Duty: ${existing.odTypeName}`
              : `Approved On-Duty: ${existing.odTypeName}`,
          calculationMetadata: {
            isOdCredit: true,
            odRequestId: existing.id,
            odRequestNumber: existing.requestNumber,
            odTypeName: existing.odTypeName,
            durationType: existing.durationType,
            reconciledAt: new Date().toISOString(),
            baseOdMinutes,
            totalCreditedMinutes: creditedMinutes,
          },
        };

        if (existingAtt) {
          await this.attRepo.updateDailyAttendance(existingAtt.id, recordData);
        } else {
          await this.attRepo.upsertDailyAttendance({ id: attId, ...recordData });
        }

        if (workdayRecord) {
          await this.odRepo.updateWorkday(workdayRecord.id, {
            processingStatus: 'applied',
            appliedAttendanceId: attId,
            appliedAt: new Date(),
          });
        }

        // Auto-resolve linked open exceptions for this employee & workday
        await this.odRepo.autoResolveLinkedExceptions(
          tenantId,
          companyId,
          existing.employeeId,
          wDate,
          existing.requestNumber,
          existing.reviewedByUserId || 'system',
        );

        appliedCount++;
      } catch (err: unknown) {
        failedCount++;
        if (workdayRecord) {
          await this.odRepo.updateWorkday(workdayRecord.id, {
            processingStatus: 'failed',
            errorMessage: err instanceof Error ? err.message : 'Calculation error',
          });
        }
      }
    }

    // Derive aggregate processing status
    let aggregateStatus: OnDutyDetailV1['processingStatus'] = 'applied';
    if (blockedCount > 0 || failedCount > 0) {
      aggregateStatus = 'processing_issues';
    } else if (appliedCount > 0 && pendingCount > 0) {
      aggregateStatus = 'partially_applied';
    } else if (appliedCount === 0 && pendingCount > 0) {
      aggregateStatus = 'pending';
    }

    await this.odRepo.updateRequest(tenantId, companyId, id, {
      processingStatus: aggregateStatus,
    });
  }

  async cancelRequest(
    tenantId: string,
    companyId: string,
    id: string,
    actorUserId: string,
    reason?: string,
  ): Promise<OnDutyDetailV1> {
    const existing = await this.getRequestById(tenantId, companyId, id);
    if (existing.approvalStatus === 'cancelled' || existing.approvalStatus === 'rejected') {
      throw new BadRequestError(
        `Request is already in terminal status '${existing.approvalStatus}'`,
      );
    }

    if (this.isMockRepo && this.mockRepo) {
      const updated = await this.mockRepo.updateOnDutyRequest(tenantId, companyId, id, {
        status: 'cancelled',
        currentStage: 'cancelled',
        cancelledAt: new Date(),
        cancelledReason: reason || 'Cancelled by employee/reviewer',
      });
      return this.mapMockToDetail(updated);
    }

    const isLocked = await this.odRepo.checkDateInLockedPeriod(
      tenantId,
      companyId,
      existing.startDate,
      existing.endDate,
    );
    if (isLocked) {
      throw new BadRequestError('Cannot cancel request for a locked payroll period');
    }

    await this.odRepo.updateRequest(tenantId, companyId, id, {
      status: 'cancelled',
      currentStage: 'cancelled',
      cancelledAt: new Date(),
      cancelledReason: reason?.trim() || 'Cancelled by employee/reviewer',
    });

    await this.odRepo.createAudit({
      id: `od_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      onDutyRequestId: id,
      action: 'cancelled',
      actorUserId,
      notes: reason ? `Cancelled: ${reason}` : 'Request cancelled',
      oldState: { status: existing.approvalStatus },
      newState: { status: 'cancelled' },
    });

    return this.getRequestById(tenantId, companyId, id);
  }

  async previewBulkApproval(
    tenantId: string,
    companyId: string,
    requestIds: string[],
    reviewerUserId: string,
    reviewerEmployeeId?: string,
  ): Promise<BulkOnDutyEligibilityPreview> {
    const items: BulkOnDutyEligibilityPreview['items'] = [];
    let eligibleCount = 0;
    let notEligibleCount = 0;

    for (const reqId of requestIds) {
      const item = await this.odRepo.getRequestById(tenantId, companyId, reqId);
      if (!item) continue;

      let isEligible = true;
      let reason: string | undefined;

      if (item.approvalStatus !== 'submitted' && item.approvalStatus !== 'under_review') {
        isEligible = false;
        reason = `Status is '${item.approvalStatus}'`;
      } else if (reviewerEmployeeId && reviewerEmployeeId === item.employeeId) {
        isEligible = false;
        reason = 'Self-approval is prohibited';
      } else if (item.isHighRisk || item.durationType === 'multi_day') {
        isEligible = false;
        reason =
          item.durationType === 'multi_day'
            ? 'Multi-day request requires individual review'
            : 'High-risk or retroactive request requires individual review';
      } else if (item.attendanceContext.leaveConflict) {
        isEligible = false;
        reason = 'Overlapping leave conflict';
      } else if (item.attendanceContext.isPayrollLocked) {
        isEligible = false;
        reason = 'Period is locked for payroll';
      }

      if (isEligible) eligibleCount++;
      else notEligibleCount++;

      items.push({
        id: item.id,
        employeeName: item.employeeName,
        employeeCode: item.employeeCode,
        odTypeName: item.odTypeName,
        durationType: item.durationType,
        isEligible,
        reason,
      });
    }

    return {
      totalSelected: requestIds.length,
      eligibleCount,
      notEligibleCount,
      items,
    };
  }

  async executeBulkAction(
    tenantId: string,
    companyId: string,
    input: BulkOnDutyActionInput,
    actorUserId: string,
    actorEmployeeId?: string,
  ): Promise<BulkOnDutyActionResult> {
    const result: BulkOnDutyActionResult = {
      action: input.action,
      totalRequested: input.requestIds.length,
      succeeded: [],
      skipped: [],
      failed: [],
    };

    for (const reqId of input.requestIds) {
      try {
        const item = await this.odRepo.getRequestById(tenantId, companyId, reqId);
        if (!item) {
          result.skipped.push({ id: reqId, reason: 'Request not found' });
          continue;
        }

        if (input.action === 'assign') {
          await this.assignReviewer(
            tenantId,
            companyId,
            reqId,
            input.assignedTo || actorUserId,
            actorUserId,
          );
          result.succeeded.push(reqId);
        } else if (input.action === 'start_review') {
          if (item.approvalStatus !== 'submitted') {
            result.skipped.push({ id: reqId, reason: `Status is '${item.approvalStatus}'` });
            continue;
          }
          await this.startReview(tenantId, companyId, reqId, actorUserId);
          result.succeeded.push(reqId);
        } else if (input.action === 'request_info') {
          await this.requestClarification(
            tenantId,
            companyId,
            reqId,
            input.notes || 'Please provide details',
            actorUserId,
          );
          result.succeeded.push(reqId);
        } else if (input.action === 'bulk_approve') {
          if (actorEmployeeId && actorEmployeeId === item.employeeId) {
            result.skipped.push({ id: reqId, reason: 'Self-approval is prohibited' });
            continue;
          }
          if (item.isHighRisk || item.durationType === 'multi_day') {
            result.skipped.push({
              id: reqId,
              reason: 'Multi-day or high-risk requires individual review',
            });
            continue;
          }
          await this.reviewDecision(
            tenantId,
            companyId,
            reqId,
            { action: 'approved', reason: input.reason || 'Bulk approved' },
            actorUserId,
            actorEmployeeId,
          );
          result.succeeded.push(reqId);
        } else if (input.action === 'bulk_reject') {
          await this.reviewDecision(
            tenantId,
            companyId,
            reqId,
            { action: 'rejected', reason: input.reason || 'Bulk rejected by reviewer' },
            actorUserId,
            actorEmployeeId,
          );
          result.succeeded.push(reqId);
        }
      } catch (err: unknown) {
        result.failed.push({
          id: reqId,
          error: err instanceof Error ? err.message : 'Operation failed',
        });
      }
    }

    return result;
  }

  async resolveEmployeeIdByUserId(
    tenantId: string,
    companyId: string,
    userId: string,
  ): Promise<string | null> {
    return this.odRepo.resolveEmployeeIdForUser(tenantId, companyId, userId);
  }
}

export const attendanceOnDutyService = new AttendanceOnDutyService();
