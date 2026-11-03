import {
  RecruitmentRepository,
  recruitmentRepository,
} from '../repository/recruitment.repository.js';
import { AuditService, auditService } from '../../../../platform/audit/service/audit.service.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  BadRequestError,
} from '../../../../app/errors/AppError.js';
import type {
  CreateJobRequisitionDto,
  UpdateJobRequisitionDto,
  RequisitionFilterQuery,
  CreateJobPostingDto,
  UpdateJobPostingDto,
  CreateCandidateDto,
  UpdateCandidateDto,
  CandidateFilterQuery,
  CreateApplicationDto,
  ChangeApplicationStageDto,
  RejectApplicationDto,
  WithdrawApplicationDto,
  AssignRecruiterDto,
  ApplicationFilterQuery,
  ScheduleInterviewDto,
  RescheduleInterviewDto,
  CancelInterviewDto,
  RecordInterviewFeedbackDto,
  InterviewFilterQuery,
  RecruitmentActorContext,
  PaginatedResult,
  CandidateApplicationDetail,
  RecruitmentInterviewWithPanel,
  AddActivityNoteDto,
  ApplicationStatus,
} from '../types/recruitment.types.js';
import type {
  JobRequisition,
  JobPosting,
  Candidate,
  CandidateApplication,
  RecruitmentStage,
  RecruitmentActivity,
  RecruitmentInterview,
} from '../../../../db/schema.js';
import {
  validateCreateJobRequisition,
  validateUpdateJobRequisition,
  validateCreateJobPosting,
  validateCreateCandidate,
  validateUpdateCandidate,
  validateCreateApplication,
  validateScheduleInterview,
  validateRescheduleInterview,
  validateCancelInterview,
  validateRecordInterviewFeedback,
} from '../validation/recruitment.schema.js';

export class RecruitmentService {
  constructor(
    private readonly repo: RecruitmentRepository = recruitmentRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Job Requisitions
  // ---------------------------------------------------------------------------

  async createRequisition(
    tenantId: string,
    companyId: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<JobRequisition> {
    const validated = validateCreateJobRequisition(input);

    // Validate foreign references if provided
    if (validated.departmentId) {
      const dept = await this.repo.getDepartment(tenantId, companyId, validated.departmentId);
      if (!dept) {
        throw new NotFoundError(
          `Department with ID '${validated.departmentId}' not found in this company`,
        );
      }
    }
    if (validated.designationId) {
      const desig = await this.repo.getDesignation(tenantId, companyId, validated.designationId);
      if (!desig) {
        throw new NotFoundError(
          `Designation with ID '${validated.designationId}' not found in this company`,
        );
      }
    }
    if (validated.hiringManagerId) {
      const hm = await this.repo.getEmployee(tenantId, companyId, validated.hiringManagerId);
      if (!hm) {
        throw new NotFoundError(
          `Hiring manager with ID '${validated.hiringManagerId}' not found in this company`,
        );
      }
    }
    if (validated.recruiterId) {
      const rec = await this.repo.getEmployee(tenantId, companyId, validated.recruiterId);
      if (!rec) {
        throw new NotFoundError(
          `Recruiter with ID '${validated.recruiterId}' not found in this company`,
        );
      }
    }

    const id = generateSurrogateId('req');
    const requisitionNumber = await this.repo.getNextRequisitionNumber(tenantId, companyId);

    return this.repo.transaction(async (tx) => {
      const created = await this.repo.createRequisition(
        {
          id,
          tenantId,
          companyId,
          requisitionNumber,
          jobTitle: validated.jobTitle,
          departmentId: validated.departmentId,
          designationId: validated.designationId,
          locationId: validated.locationId,
          locationName: validated.locationName,
          workplaceType: validated.workplaceType,
          employmentType: validated.employmentType,
          experienceLevel: validated.experienceLevel,
          openings: validated.openings,
          description: validated.description,
          requirements: validated.requirements,
          responsibilities: validated.responsibilities,
          skills: validated.skills,
          experienceMin: validated.experienceMin,
          experienceMax: validated.experienceMax,
          salaryMin: validated.salaryMin !== null ? String(validated.salaryMin) : null,
          salaryMax: validated.salaryMax !== null ? String(validated.salaryMax) : null,
          currency: validated.currency,
          hiringManagerId: validated.hiringManagerId,
          recruiterId: validated.recruiterId,
          priority: validated.priority,
          status: validated.status,
          targetCloseDate: validated.targetCloseDate,
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'requisition_created',
          targetType: 'job_requisition',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            requisitionNumber,
            jobTitle: validated.jobTitle,
            status: validated.status,
          },
        },
        tx,
      );

      return created;
    });
  }

  async getRequisitionById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<JobRequisition> {
    const req = await this.repo.getRequisitionById(tenantId, companyId, id);
    if (!req) {
      throw new NotFoundError(`Job requisition with ID '${id}' not found`);
    }
    return req;
  }

  async listRequisitions(
    tenantId: string,
    companyId: string,
    query: RequisitionFilterQuery,
  ): Promise<PaginatedResult<JobRequisition>> {
    return this.repo.listRequisitions(tenantId, companyId, query);
  }

  async updateRequisition(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<JobRequisition> {
    const existing = await this.getRequisitionById(tenantId, companyId, id);
    const validated = validateUpdateJobRequisition(input);

    const updatePayload: Partial<JobRequisition> = {};
    if (validated.jobTitle !== undefined) updatePayload.jobTitle = validated.jobTitle;
    if (validated.departmentId !== undefined) updatePayload.departmentId = validated.departmentId;
    if (validated.designationId !== undefined)
      updatePayload.designationId = validated.designationId;
    if (validated.locationId !== undefined) updatePayload.locationId = validated.locationId;
    if (validated.locationName !== undefined) updatePayload.locationName = validated.locationName;
    if (validated.workplaceType !== undefined)
      updatePayload.workplaceType = validated.workplaceType;
    if (validated.employmentType !== undefined)
      updatePayload.employmentType = validated.employmentType;
    if (validated.experienceLevel !== undefined)
      updatePayload.experienceLevel = validated.experienceLevel;
    if (validated.openings !== undefined) updatePayload.openings = validated.openings;
    if (validated.filledCount !== undefined) updatePayload.filledCount = validated.filledCount;
    if (validated.description !== undefined) updatePayload.description = validated.description;
    if (validated.requirements !== undefined) updatePayload.requirements = validated.requirements;
    if (validated.responsibilities !== undefined)
      updatePayload.responsibilities = validated.responsibilities;
    if (validated.skills !== undefined) updatePayload.skills = validated.skills;
    if (validated.experienceMin !== undefined)
      updatePayload.experienceMin = validated.experienceMin;
    if (validated.experienceMax !== undefined)
      updatePayload.experienceMax = validated.experienceMax;
    if (validated.salaryMin !== undefined)
      updatePayload.salaryMin = validated.salaryMin !== null ? String(validated.salaryMin) : null;
    if (validated.salaryMax !== undefined)
      updatePayload.salaryMax = validated.salaryMax !== null ? String(validated.salaryMax) : null;
    if (validated.currency !== undefined) updatePayload.currency = validated.currency;
    if (validated.hiringManagerId !== undefined)
      updatePayload.hiringManagerId = validated.hiringManagerId;
    if (validated.recruiterId !== undefined) updatePayload.recruiterId = validated.recruiterId;
    if (validated.priority !== undefined) updatePayload.priority = validated.priority;
    if (validated.status !== undefined) {
      updatePayload.status = validated.status;
      if (validated.status === 'closed' || validated.status === 'cancelled') {
        updatePayload.closedAt = new Date();
        updatePayload.closedReason = validated.closedReason || 'Closed by user';
      }
    }
    if (validated.targetCloseDate !== undefined)
      updatePayload.targetCloseDate = validated.targetCloseDate;

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateRequisition(tenantId, companyId, id, updatePayload, tx);
      if (!updated) {
        throw new NotFoundError(`Job requisition with ID '${id}' not found`);
      }

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'requisition_updated',
          targetType: 'job_requisition',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            requisitionNumber: existing.requisitionNumber,
            previousStatus: existing.status,
            newStatus: updatePayload.status ?? existing.status,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async closeRequisition(
    tenantId: string,
    companyId: string,
    id: string,
    reason?: string,
    actor?: RecruitmentActorContext,
  ): Promise<JobRequisition> {
    return this.updateRequisition(
      tenantId,
      companyId,
      id,
      {
        status: 'closed',
        closedReason: reason || 'Requisition closed',
      },
      actor,
    );
  }

  // ---------------------------------------------------------------------------
  // Job Postings
  // ---------------------------------------------------------------------------

  async createJobPosting(
    tenantId: string,
    companyId: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<JobPosting> {
    const validated = validateCreateJobPosting(input);

    const req = await this.getRequisitionById(tenantId, companyId, validated.requisitionId);
    if (req.status === 'closed' || req.status === 'cancelled') {
      throw new BadRequestError(
        'Cannot create a job posting for a closed or cancelled requisition',
      );
    }

    const id = generateSurrogateId('pst');
    const postingCode =
      validated.postingCode || (await this.repo.getNextPostingCode(tenantId, companyId));

    return this.repo.transaction(async (tx) => {
      const created = await this.repo.createJobPosting(
        {
          id,
          tenantId,
          companyId,
          requisitionId: validated.requisitionId,
          postingCode,
          title: validated.title,
          description: validated.description,
          location: validated.location,
          workplaceType: validated.workplaceType,
          employmentType: validated.employmentType,
          publishedAt: validated.publishedAt ? new Date(validated.publishedAt) : null,
          expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
          status: validated.status,
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'job_posting_created',
          targetType: 'job_posting',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            postingCode,
            title: validated.title,
            requisitionId: validated.requisitionId,
          },
        },
        tx,
      );

      return created;
    });
  }

  async publishJobPosting(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: RecruitmentActorContext,
  ): Promise<JobPosting> {
    const posting = await this.getJobPostingById(tenantId, companyId, id);
    const req = await this.getRequisitionById(tenantId, companyId, posting.requisitionId);

    // Rule 9: "A job posting cannot be published without a valid requisition."
    if (req.status === 'closed' || req.status === 'cancelled') {
      throw new BadRequestError(
        'Cannot publish a job posting for a closed or inactive requisition',
      );
    }

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateJobPosting(
        tenantId,
        companyId,
        id,
        {
          status: 'published',
          publishedAt: new Date(),
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'job_posting_published',
          targetType: 'job_posting',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            postingCode: posting.postingCode,
            requisitionId: posting.requisitionId,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async closeJobPosting(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: RecruitmentActorContext,
  ): Promise<JobPosting> {
    const posting = await this.getJobPostingById(tenantId, companyId, id);

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateJobPosting(
        tenantId,
        companyId,
        id,
        {
          status: 'closed',
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'job_posting_closed',
          targetType: 'job_posting',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            postingCode: posting.postingCode,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async getJobPostingById(tenantId: string, companyId: string, id: string): Promise<JobPosting> {
    const posting = await this.repo.getJobPostingById(tenantId, companyId, id);
    if (!posting) {
      throw new NotFoundError(`Job posting with ID '${id}' not found`);
    }
    return posting;
  }

  async listJobPostings(
    tenantId: string,
    companyId: string,
    query: { page?: number; limit?: number; status?: string; requisitionId?: string },
  ): Promise<PaginatedResult<JobPosting>> {
    return this.repo.listJobPostings(tenantId, companyId, query);
  }

  // ---------------------------------------------------------------------------
  // Candidates
  // ---------------------------------------------------------------------------

  async createCandidate(
    tenantId: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<Candidate> {
    const validated = validateCreateCandidate(input);

    // Tenant-scoped duplicate check by email
    const existing = await this.repo.getCandidateByEmail(tenantId, validated.email);
    if (existing) {
      throw new ConflictError(
        `Candidate with email '${validated.email}' already exists in this tenant (Candidate Number: ${existing.candidateNumber})`,
        'DUPLICATE_CANDIDATE',
      );
    }

    const id = generateSurrogateId('cnd');
    const candidateNumber = await this.repo.getNextCandidateNumber(tenantId);

    return this.repo.transaction(async (tx) => {
      const created = await this.repo.createCandidate(
        {
          id,
          tenantId,
          candidateNumber,
          firstName: validated.firstName,
          lastName: validated.lastName,
          email: validated.email,
          phone: validated.phone,
          location: validated.location,
          currentCompany: validated.currentCompany,
          currentDesignation: validated.currentDesignation,
          totalExperienceYears: String(validated.totalExperienceYears ?? 0),
          relevantExperienceYears: String(validated.relevantExperienceYears ?? 0),
          noticePeriodDays: validated.noticePeriodDays,
          currentCtcLpa:
            validated.currentCtcLpa !== null && validated.currentCtcLpa !== undefined
              ? String(validated.currentCtcLpa)
              : null,
          expectedCtcLpa:
            validated.expectedCtcLpa !== null && validated.expectedCtcLpa !== undefined
              ? String(validated.expectedCtcLpa)
              : null,
          skills: validated.skills,
          tags: validated.tags,
          source: validated.source,
          referredBy: validated.referredBy,
          resumeUrl: validated.resumeUrl,
          resumeFileName: validated.resumeFileName,
          summary: validated.summary,
          status: 'active',
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'candidate_created',
          targetType: 'candidate',
          targetId: id,
          tenantId,
          metadata: {
            candidateNumber,
            firstName: validated.firstName,
            lastName: validated.lastName,
            email: validated.email,
          },
        },
        tx,
      );

      return created;
    });
  }

  async getCandidateById(tenantId: string, id: string): Promise<Candidate> {
    const candidate = await this.repo.getCandidateById(tenantId, id);
    if (!candidate) {
      throw new NotFoundError(`Candidate with ID '${id}' not found`);
    }
    return candidate;
  }

  async listCandidates(
    tenantId: string,
    query: CandidateFilterQuery,
  ): Promise<PaginatedResult<Candidate>> {
    return this.repo.listCandidates(tenantId, query);
  }

  async updateCandidate(
    tenantId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<Candidate> {
    const existing = await this.getCandidateById(tenantId, id);
    const validated = validateUpdateCandidate(input);

    if (validated.email && validated.email !== existing.email) {
      const emailConflict = await this.repo.getCandidateByEmail(tenantId, validated.email);
      if (emailConflict && emailConflict.id !== id) {
        throw new ConflictError(
          `Candidate with email '${validated.email}' already exists in this tenant`,
          'DUPLICATE_CANDIDATE',
        );
      }
    }

    const updatePayload: Partial<Candidate> = {};
    if (validated.firstName !== undefined) updatePayload.firstName = validated.firstName;
    if (validated.lastName !== undefined) updatePayload.lastName = validated.lastName;
    if (validated.email !== undefined) updatePayload.email = validated.email;
    if (validated.phone !== undefined) updatePayload.phone = validated.phone;
    if (validated.location !== undefined) updatePayload.location = validated.location;
    if (validated.currentCompany !== undefined)
      updatePayload.currentCompany = validated.currentCompany;
    if (validated.currentDesignation !== undefined)
      updatePayload.currentDesignation = validated.currentDesignation;
    if (validated.totalExperienceYears !== undefined)
      updatePayload.totalExperienceYears = String(validated.totalExperienceYears);
    if (validated.relevantExperienceYears !== undefined)
      updatePayload.relevantExperienceYears = String(validated.relevantExperienceYears);
    if (validated.noticePeriodDays !== undefined)
      updatePayload.noticePeriodDays = validated.noticePeriodDays;
    if (validated.currentCtcLpa !== undefined)
      updatePayload.currentCtcLpa =
        validated.currentCtcLpa !== null ? String(validated.currentCtcLpa) : null;
    if (validated.expectedCtcLpa !== undefined)
      updatePayload.expectedCtcLpa =
        validated.expectedCtcLpa !== null ? String(validated.expectedCtcLpa) : null;
    if (validated.skills !== undefined) updatePayload.skills = validated.skills;
    if (validated.tags !== undefined) updatePayload.tags = validated.tags;
    if (validated.source !== undefined) updatePayload.source = validated.source;
    if (validated.referredBy !== undefined) updatePayload.referredBy = validated.referredBy;
    if (validated.resumeUrl !== undefined) updatePayload.resumeUrl = validated.resumeUrl;
    if (validated.resumeFileName !== undefined)
      updatePayload.resumeFileName = validated.resumeFileName;
    if (validated.summary !== undefined) updatePayload.summary = validated.summary;
    if (validated.status !== undefined) updatePayload.status = validated.status;

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateCandidate(tenantId, id, updatePayload, tx);
      if (!updated) {
        throw new NotFoundError(`Candidate with ID '${id}' not found`);
      }

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'candidate_updated',
          targetType: 'candidate',
          targetId: id,
          tenantId,
          metadata: {
            candidateNumber: existing.candidateNumber,
          },
        },
        tx,
      );

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Candidate Applications
  // ---------------------------------------------------------------------------

  async createApplication(
    tenantId: string,
    companyId: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<CandidateApplication> {
    const validated = validateCreateApplication(input);

    // Verify candidate exists in this tenant
    const candidate = await this.getCandidateById(tenantId, validated.candidateId);

    // Verify requisition exists in this tenant & company
    const req = await this.getRequisitionById(tenantId, companyId, validated.requisitionId);

    // Rule 8: "Closed requisitions must not accept new applications."
    if (req.status === 'closed' || req.status === 'cancelled' || req.status === 'filled') {
      throw new BadRequestError(
        `Cannot apply to a ${req.status} job requisition`,
        'REQUISITION_CLOSED',
      );
    }

    // Verify posting if provided
    if (validated.jobPostingId) {
      const posting = await this.getJobPostingById(tenantId, companyId, validated.jobPostingId);
      if (posting.requisitionId !== req.id) {
        throw new BadRequestError('Job posting does not match the specified requisition');
      }
    }

    // Rule 5: "Duplicate applications for the same active job must be prevented."
    const existingActive = await this.repo.getActiveApplication(
      tenantId,
      companyId,
      candidate.id,
      req.id,
    );
    if (existingActive) {
      throw new ConflictError(
        `Candidate ${candidate.candidateNumber} already has an active application for requisition ${req.requisitionNumber}`,
        'DUPLICATE_ACTIVE_APPLICATION',
      );
    }

    // Resolve stage
    const initialStageCode = validated.initialStage || 'applied';
    const stageRecord = await this.repo.getStageByCode(tenantId, companyId, initialStageCode);

    const applicationId = generateSurrogateId('app');
    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const created = await this.repo.createApplication(
        {
          id: applicationId,
          tenantId,
          companyId,
          candidateId: candidate.id,
          requisitionId: req.id,
          jobPostingId: validated.jobPostingId,
          currentStageId: stageRecord?.id ?? null,
          stage: initialStageCode,
          status: 'active',
          assignedRecruiterId: validated.assignedRecruiterId,
        },
        tx,
      );

      // Record business activity
      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId,
          candidateId: candidate.id,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'status_change',
          title: 'Application Created',
          content: `Applied for ${req.jobTitle} (${req.requisitionNumber}) at stage ${initialStageCode}.`,
          metadata: {
            requisitionNumber: req.requisitionNumber,
            stage: initialStageCode,
          },
        },
        tx,
      );

      // Compliance audit log
      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'application_created',
          targetType: 'candidate_application',
          targetId: applicationId,
          tenantId,
          companyId,
          metadata: {
            candidateNumber: candidate.candidateNumber,
            requisitionNumber: req.requisitionNumber,
            stage: initialStageCode,
          },
        },
        tx,
      );

      return created;
    });
  }

  async getApplicationById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<CandidateApplicationDetail> {
    const app = await this.repo.getApplicationById(tenantId, companyId, id);
    if (!app) {
      throw new NotFoundError(`Candidate application with ID '${id}' not found`);
    }
    return app;
  }

  async listApplications(
    tenantId: string,
    companyId: string,
    query: ApplicationFilterQuery,
  ): Promise<PaginatedResult<CandidateApplication>> {
    return this.repo.listApplications(tenantId, companyId, query);
  }

  async changeApplicationStage(
    tenantId: string,
    companyId: string,
    id: string,
    input: ChangeApplicationStageDto,
    actor?: RecruitmentActorContext,
  ): Promise<CandidateApplication> {
    const app = await this.getApplicationById(tenantId, companyId, id);

    // Rule 6: "A rejected or withdrawn application must not silently become active again."
    if (app.status === 'rejected' || app.status === 'withdrawn' || app.status === 'hired') {
      throw new BadRequestError(
        `Cannot change stage of a finalized application (${app.status})`,
        'APPLICATION_FINALIZED',
      );
    }

    const targetStageCode = input.stage.trim();
    if (!targetStageCode) {
      throw new ValidationError('Target stage is required');
    }

    const stageRecord = await this.repo.getStageByCode(tenantId, companyId, targetStageCode);

    // Determine new status based on stage
    let newStatus: ApplicationStatus = app.status as ApplicationStatus;
    let hiredAt: Date | null = null;
    let rejectedAt: Date | null = null;
    let withdrawnAt: Date | null = null;

    if (stageRecord?.stageType === 'terminal_success' || targetStageCode === 'hired') {
      newStatus = 'hired';
      hiredAt = new Date();
    } else if (stageRecord?.stageType === 'terminal_rejection' || targetStageCode === 'rejected') {
      newStatus = 'rejected';
      rejectedAt = new Date();
    } else if (
      stageRecord?.stageType === 'terminal_withdrawal' ||
      targetStageCode === 'withdrawn'
    ) {
      newStatus = 'withdrawn';
      withdrawnAt = new Date();
    }

    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateApplication(
        tenantId,
        companyId,
        id,
        {
          stage: targetStageCode,
          currentStageId: stageRecord?.id ?? null,
          status: newStatus,
          hiredAt: hiredAt ?? undefined,
          rejectedAt: rejectedAt ?? undefined,
          withdrawnAt: withdrawnAt ?? undefined,
        },
        tx,
      );

      // Record business activity
      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: id,
          candidateId: app.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'stage_change',
          title: `Stage Changed to ${stageRecord?.name || targetStageCode}`,
          content: input.notes || `Application progressed from ${app.stage} to ${targetStageCode}.`,
          metadata: {
            fromStage: app.stage,
            toStage: targetStageCode,
            status: newStatus,
          },
        },
        tx,
      );

      // Compliance audit log
      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'application_stage_changed',
          targetType: 'candidate_application',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            fromStage: app.stage,
            toStage: targetStageCode,
            status: newStatus,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async rejectApplication(
    tenantId: string,
    companyId: string,
    id: string,
    input: RejectApplicationDto,
    actor?: RecruitmentActorContext,
  ): Promise<CandidateApplication> {
    const app = await this.getApplicationById(tenantId, companyId, id);

    if (app.status === 'rejected') {
      throw new BadRequestError('Application is already rejected');
    }
    if (app.status === 'withdrawn' || app.status === 'hired') {
      throw new BadRequestError(`Cannot reject a ${app.status} application`);
    }

    if (!input.reason || !input.reason.trim()) {
      throw new ValidationError('Rejection reason is required');
    }

    const stageRecord = await this.repo.getStageByCode(tenantId, companyId, 'rejected');
    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateApplication(
        tenantId,
        companyId,
        id,
        {
          stage: 'rejected',
          currentStageId: stageRecord?.id ?? null,
          status: 'rejected',
          rejectionReason: input.reason.trim(),
          rejectedAt: new Date(),
        },
        tx,
      );

      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: id,
          candidateId: app.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'rejection',
          title: 'Application Rejected',
          content: input.reason.trim(),
          metadata: {
            reason: input.reason.trim(),
            notes: input.notes,
          },
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'application_rejected',
          targetType: 'candidate_application',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            reason: input.reason.trim(),
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async withdrawApplication(
    tenantId: string,
    companyId: string,
    id: string,
    input: WithdrawApplicationDto,
    actor?: RecruitmentActorContext,
  ): Promise<CandidateApplication> {
    const app = await this.getApplicationById(tenantId, companyId, id);

    if (app.status === 'withdrawn') {
      throw new BadRequestError('Application is already withdrawn');
    }
    if (app.status === 'rejected' || app.status === 'hired') {
      throw new BadRequestError(`Cannot withdraw a ${app.status} application`);
    }

    const stageRecord = await this.repo.getStageByCode(tenantId, companyId, 'withdrawn');
    const activityId = generateSurrogateId('act');
    const reason = input.reason?.trim() || 'Withdrawn by candidate';

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateApplication(
        tenantId,
        companyId,
        id,
        {
          stage: 'withdrawn',
          currentStageId: stageRecord?.id ?? null,
          status: 'withdrawn',
          withdrawalReason: reason,
          withdrawnAt: new Date(),
        },
        tx,
      );

      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: id,
          candidateId: app.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'withdrawal',
          title: 'Application Withdrawn',
          content: reason,
          metadata: {
            reason,
            notes: input.notes,
          },
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'application_withdrawn',
          targetType: 'candidate_application',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            reason,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async assignRecruiter(
    tenantId: string,
    companyId: string,
    id: string,
    input: AssignRecruiterDto,
    actor?: RecruitmentActorContext,
  ): Promise<CandidateApplication> {
    const app = await this.getApplicationById(tenantId, companyId, id);

    // Verify recruiter employee exists in company
    const recruiter = await this.repo.getEmployee(tenantId, companyId, input.recruiterId);
    if (!recruiter) {
      throw new NotFoundError(
        `Recruiter employee with ID '${input.recruiterId}' not found in this company`,
      );
    }

    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateApplication(
        tenantId,
        companyId,
        id,
        {
          assignedRecruiterId: recruiter.id,
        },
        tx,
      );

      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: id,
          candidateId: app.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'recruiter_assigned',
          title: 'Recruiter Assigned',
          content: `Assigned to ${recruiter.firstName} ${recruiter.lastName} (${recruiter.employeeNumber}).`,
          metadata: {
            recruiterId: recruiter.id,
            recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
          },
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'recruiter_assigned',
          targetType: 'candidate_application',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            recruiterId: recruiter.id,
            recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  // ---------------------------------------------------------------------------
  // Pipeline Stages
  // ---------------------------------------------------------------------------

  async listStages(tenantId: string, companyId: string): Promise<RecruitmentStage[]> {
    return this.repo.listStages(tenantId, companyId);
  }

  // ---------------------------------------------------------------------------
  // Candidate Notes and Activity History
  // ---------------------------------------------------------------------------

  async addNote(
    tenantId: string,
    companyId: string,
    applicationId: string,
    input: AddActivityNoteDto,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentActivity> {
    const app = await this.getApplicationById(tenantId, companyId, applicationId);

    if (!input.content || !input.content.trim()) {
      throw new ValidationError('Note content is required');
    }

    const id = generateSurrogateId('act');

    return this.repo.createActivity({
      id,
      tenantId,
      companyId,
      applicationId,
      candidateId: app.candidateId,
      actorUserId: actor?.userId ?? null,
      actorName: actor?.name ?? 'System User',
      type: 'note',
      title: input.title?.trim() || 'Recruiter Note',
      content: input.content.trim(),
    });
  }

  async listActivities(
    tenantId: string,
    companyId: string,
    applicationId: string,
  ): Promise<RecruitmentActivity[]> {
    await this.getApplicationById(tenantId, companyId, applicationId);
    return this.repo.listActivities(tenantId, companyId, applicationId);
  }

  // ---------------------------------------------------------------------------
  // Interview Scheduling
  // ---------------------------------------------------------------------------

  async scheduleInterview(
    tenantId: string,
    companyId: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentInterviewWithPanel> {
    const validated = validateScheduleInterview(input);

    const app = await this.getApplicationById(tenantId, companyId, validated.applicationId);
    if (app.status !== 'active') {
      throw new BadRequestError(`Cannot schedule interview for a ${app.status} application`);
    }

    // Rule 11: "Interviewers must belong to an authorized tenant/company context."
    for (const panelMember of validated.panel) {
      if (panelMember.employeeId) {
        const emp = await this.repo.getEmployee(tenantId, companyId, panelMember.employeeId);
        if (!emp) {
          throw new ValidationError(
            `Interviewer employee with ID '${panelMember.employeeId}' does not belong to this company`,
          );
        }
      }
    }

    // Calculate duration in minutes from startTime and endTime
    const [startH = 0, startM = 0] = validated.startTime.split(':').map(Number);
    const [endH = 0, endM = 0] = validated.endTime.split(':').map(Number);
    const durationMinutes = endH * 60 + endM - (startH * 60 + startM);

    const interviewId = generateSurrogateId('int');
    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const created = await this.repo.createInterview(
        {
          id: interviewId,
          tenantId,
          companyId,
          applicationId: app.id,
          candidateId: app.candidateId,
          roundName: validated.roundName,
          interviewType: validated.interviewType,
          scheduledDate: validated.scheduledDate,
          startTime: validated.startTime,
          endTime: validated.endTime,
          durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
          timezone: validated.timezone,
          locationOrLink: validated.locationOrLink,
          status: 'scheduled',
          feedbackStatus: 'pending',
        },
        validated.panel,
        tx,
      );

      // Record business activity
      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: app.id,
          candidateId: app.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'interview_scheduled',
          title: `Interview Scheduled: ${validated.roundName}`,
          content: `${validated.interviewType} interview on ${validated.scheduledDate} from ${validated.startTime} to ${validated.endTime}.`,
          metadata: {
            interviewId,
            roundName: validated.roundName,
            scheduledDate: validated.scheduledDate,
            startTime: validated.startTime,
            endTime: validated.endTime,
          },
        },
        tx,
      );

      // Audit event
      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'interview_scheduled',
          targetType: 'interview',
          targetId: interviewId,
          tenantId,
          companyId,
          metadata: {
            applicationId: app.id,
            roundName: validated.roundName,
            scheduledDate: validated.scheduledDate,
          },
        },
        tx,
      );

      return created;
    });
  }

  async rescheduleInterview(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentInterview> {
    const interview = await this.getInterviewById(tenantId, companyId, id);
    if (interview.status === 'completed' || interview.status === 'cancelled') {
      throw new BadRequestError(`Cannot reschedule a ${interview.status} interview`);
    }

    const validated = validateRescheduleInterview(input);

    const [startH = 0, startM = 0] = validated.startTime.split(':').map(Number);
    const [endH = 0, endM = 0] = validated.endTime.split(':').map(Number);
    const durationMinutes = endH * 60 + endM - (startH * 60 + startM);

    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateInterview(
        tenantId,
        companyId,
        id,
        {
          scheduledDate: validated.scheduledDate,
          startTime: validated.startTime,
          endTime: validated.endTime,
          durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
          timezone: validated.timezone,
          locationOrLink: validated.locationOrLink ?? interview.locationOrLink,
          status: 'rescheduled',
          rescheduleReason: validated.reason,
        },
        tx,
      );

      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: interview.applicationId,
          candidateId: interview.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'interview_rescheduled',
          title: `Interview Rescheduled: ${interview.roundName}`,
          content: `Rescheduled to ${validated.scheduledDate} at ${validated.startTime}. Reason: ${validated.reason}`,
          metadata: {
            interviewId: id,
            previousDate: interview.scheduledDate,
            newDate: validated.scheduledDate,
            reason: validated.reason,
          },
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'interview_rescheduled',
          targetType: 'interview',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            previousDate: interview.scheduledDate,
            newDate: validated.scheduledDate,
            reason: validated.reason,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async cancelInterview(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentInterview> {
    const interview = await this.getInterviewById(tenantId, companyId, id);
    if (interview.status === 'cancelled') {
      throw new BadRequestError('Interview is already cancelled');
    }
    if (interview.status === 'completed') {
      throw new BadRequestError('Cannot cancel a completed interview');
    }

    const validated = validateCancelInterview(input);
    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateInterview(
        tenantId,
        companyId,
        id,
        {
          status: 'cancelled',
          cancellationReason: validated.reason,
        },
        tx,
      );

      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: interview.applicationId,
          candidateId: interview.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'interview_cancelled',
          title: `Interview Cancelled: ${interview.roundName}`,
          content: `Cancelled. Reason: ${validated.reason}`,
          metadata: {
            interviewId: id,
            reason: validated.reason,
          },
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'interview_cancelled',
          targetType: 'interview',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            reason: validated.reason,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async recordInterviewFeedback(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentInterview> {
    const interview = await this.getInterviewById(tenantId, companyId, id);
    if (interview.status === 'cancelled') {
      throw new BadRequestError('Cannot record feedback for a cancelled interview');
    }

    const validated = validateRecordInterviewFeedback(input);
    const activityId = generateSurrogateId('act');

    return this.repo.transaction(async (tx) => {
      const updated = await this.repo.updateInterview(
        tenantId,
        companyId,
        id,
        {
          status: 'completed',
          feedbackStatus: 'submitted',
          feedbackRecommendation: validated.recommendation,
          feedbackScore: validated.score ?? null,
          feedbackNotes: validated.notes,
        },
        tx,
      );

      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: interview.applicationId,
          candidateId: interview.candidateId,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'interview_completed',
          title: `Interview Feedback: ${interview.roundName}`,
          content: `Recommendation: ${validated.recommendation}. Score: ${validated.score ?? 'N/A'}/5.`,
          metadata: {
            interviewId: id,
            recommendation: validated.recommendation,
            score: validated.score,
          },
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'interview_feedback_recorded',
          targetType: 'interview',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            recommendation: validated.recommendation,
            score: validated.score,
          },
        },
        tx,
      );

      return updated!;
    });
  }

  async getInterviewById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<RecruitmentInterviewWithPanel> {
    const interview = await this.repo.getInterviewById(tenantId, companyId, id);
    if (!interview) {
      throw new NotFoundError(`Interview with ID '${id}' not found`);
    }
    return interview;
  }

  async listInterviews(
    tenantId: string,
    companyId: string,
    query: InterviewFilterQuery,
  ): Promise<PaginatedResult<RecruitmentInterviewWithPanel>> {
    return this.repo.listInterviews(tenantId, companyId, query);
  }
}

export const recruitmentService = new RecruitmentService();
