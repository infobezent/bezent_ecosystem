import {
  RecruitmentRepository,
  recruitmentRepository,
} from '../repository/recruitment.repository.js';
import { EmployeeService } from '../../employees/service/employee.service.js';
import { AuditService, auditService } from '../../../../platform/audit/service/audit.service.js';
import { OrganizationRepository } from '../../../../platform/organization/repository/organization.repository.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  BadRequestError,
} from '../../../../app/errors/AppError.js';
import type {
  InitiateOnboardingDto,
  ReviewOnboardingDto,
  ConfirmOnboardingDto,
  CancelOnboardingDto,
  RecruitmentOnboardingDetail,
  DuplicateConflictCheck,
  OnboardingFilterQuery,
  OnboardingEmploymentType,
} from '../types/onboarding.types.js';
import type { RecruitmentActorContext, PaginatedResult } from '../types/recruitment.types.js';
import type { RecruitmentOnboarding } from '../../../../db/schema.js';
import {
  validateInitiateOnboarding,
  validateReviewOnboarding,
  validateConfirmOnboarding,
  validateCancelOnboarding,
} from '../validation/onboarding.schema.js';

export class RecruitmentOnboardingService {
  constructor(
    private readonly repo: RecruitmentRepository = recruitmentRepository,
    private readonly employeeService: EmployeeService = new EmployeeService(),
    private readonly audit: AuditService = auditService,
    private readonly orgRepo: OrganizationRepository = new OrganizationRepository(),
  ) {}

  // ---------------------------------------------------------------------------
  // Duplicate Conflict Checking
  // ---------------------------------------------------------------------------

  async checkDuplicates(
    tenantId: string,
    companyId: string,
    candidateId: string,
    applicationId?: string,
  ): Promise<DuplicateConflictCheck> {
    const candidate = await this.repo.getCandidateById(tenantId, candidateId);
    if (!candidate) {
      return {
        hasConflict: false,
        conflictSeverity: 'none',
      };
    }

    // 1. Check if application is already completed in onboarding
    if (applicationId) {
      const existingOnb = await this.repo.getOnboardingByApplicationId(
        tenantId,
        companyId,
        applicationId,
      );
      if (existingOnb && existingOnb.status === 'completed') {
        return {
          hasConflict: true,
          conflictSeverity: 'blocking',
          conflictType: 'already_onboarded',
          conflictingEmployeeId: existingOnb.createdEmployeeId ?? null,
          message: `Application '${applicationId}' has already been successfully onboarded to Workforce.`,
        };
      }
    }

    // 2. Check if an employee exists in the company with candidate's email
    if (candidate.email) {
      const existingByEmail = await this.repo.getEmployeeByEmail(
        tenantId,
        companyId,
        candidate.email,
      );
      if (existingByEmail) {
        return {
          hasConflict: true,
          conflictSeverity: 'blocking',
          conflictType: 'email_exists',
          conflictingEmployeeId: existingByEmail.id,
          conflictingEmployeeNumber: existingByEmail.employeeNumber,
          conflictingEmployeeName: existingByEmail.lastName
            ? `${existingByEmail.firstName} ${existingByEmail.lastName}`
            : existingByEmail.firstName,
          message: `Workforce employee with email '${candidate.email}' already exists (${existingByEmail.employeeNumber}).`,
        };
      }
    }

    // 3. Check if an employee exists with candidate's phone
    if (candidate.phone && candidate.phone.trim()) {
      const existingByPhone = await this.repo.getEmployeeByPhone(
        tenantId,
        companyId,
        candidate.phone,
      );
      if (existingByPhone) {
        return {
          hasConflict: true,
          conflictSeverity: 'warning',
          conflictType: 'phone_exists',
          conflictingEmployeeId: existingByPhone.id,
          conflictingEmployeeNumber: existingByPhone.employeeNumber,
          conflictingEmployeeName: existingByPhone.lastName
            ? `${existingByPhone.firstName} ${existingByPhone.lastName}`
            : existingByPhone.firstName,
          message: `Potential conflict: Employee ${existingByPhone.employeeNumber} shares phone number '${candidate.phone}'.`,
        };
      }
    }

    // 4. Check if an employee exists with identical first and last name
    if (candidate.firstName && candidate.lastName) {
      const sameNameEmployees = await this.repo.getEmployeesByName(
        tenantId,
        companyId,
        candidate.firstName,
        candidate.lastName,
      );
      if (sameNameEmployees.length > 0) {
        const firstMatch = sameNameEmployees[0]!;
        return {
          hasConflict: true,
          conflictSeverity: 'warning',
          conflictType: 'name_match',
          conflictingEmployeeId: firstMatch.id,
          conflictingEmployeeNumber: firstMatch.employeeNumber,
          conflictingEmployeeName: `${candidate.firstName} ${candidate.lastName}`,
          message: `Potential conflict: ${sameNameEmployees.length} employee(s) found with name '${candidate.firstName} ${candidate.lastName}'.`,
        };
      }
    }

    return {
      hasConflict: false,
      conflictSeverity: 'none',
    };
  }

  // ---------------------------------------------------------------------------
  // Initiate Onboarding
  // ---------------------------------------------------------------------------

  async initiateOnboarding(
    tenantId: string,
    companyId: string,
    applicationId: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentOnboardingDetail> {
    const validated = validateInitiateOnboarding(input);

    // 1. Verify application exists and belongs to company
    const app = await this.repo.getApplicationById(tenantId, companyId, applicationId);
    if (!app) {
      throw new NotFoundError(`Application '${applicationId}' not found in this company`);
    }

    // 2. Validate eligibility: Candidate application MUST be in 'hired' status
    if (app.status !== 'hired') {
      throw new BadRequestError(
        `Application '${applicationId}' is in status '${app.status}'. Only 'hired' applications can initiate onboarding.`,
        'APPLICATION_NOT_HIRED',
      );
    }

    // 3. Check if onboarding record already exists for this application
    const existing = await this.repo.getOnboardingByApplicationId(
      tenantId,
      companyId,
      applicationId,
    );
    if (existing) {
      if (existing.status === 'completed') {
        throw new ConflictError(
          `Onboarding for application '${applicationId}' has already been completed.`,
          'ONBOARDING_ALREADY_COMPLETED',
        );
      }
      // If already pending or ready, return existing enriched record
      return this.getOnboardingById(tenantId, companyId, existing.id);
    }

    // 4. Fetch candidate and requisition for defaulting
    const candidate = await this.repo.getCandidateById(tenantId, app.candidateId);
    if (!candidate) {
      throw new NotFoundError(`Candidate '${app.candidateId}' not found`);
    }

    const requisition = await this.repo.getRequisitionById(tenantId, companyId, app.requisitionId);

    // Default employmentType: normalize 'internship' to 'intern'
    let employmentType: OnboardingEmploymentType = validated.employmentType ?? 'full_time';
    if (!validated.employmentType && requisition?.employmentType) {
      employmentType =
        requisition.employmentType === ('internship' as any)
          ? 'intern'
          : (requisition.employmentType as OnboardingEmploymentType);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const targetJoiningDate =
      validated.targetJoiningDate || requisition?.targetCloseDate || todayStr;

    const onboardingId = generateSurrogateId('onb');

    const created = await this.repo.createOnboarding({
      id: onboardingId,
      tenantId,
      companyId,
      candidateId: app.candidateId,
      applicationId: app.id,
      createdEmployeeId: null,
      status: 'pending_review',
      targetJoiningDate,
      departmentId: validated.departmentId ?? requisition?.departmentId ?? null,
      designationId: validated.designationId ?? requisition?.designationId ?? null,
      locationId: validated.locationId ?? requisition?.locationId ?? null,
      reportingManagerId: validated.reportingManagerId ?? requisition?.hiringManagerId ?? null,
      employmentType,
      workflowTemplate: validated.workflowTemplate ?? 'Standard Pre-Boarding',
      assignedPartner: validated.assignedPartner ?? null,
      notes: validated.notes ?? null,
      reviewedByUserId: null,
      reviewedAt: null,
      confirmedByUserId: null,
      confirmedAt: null,
      cancelledByUserId: null,
      cancelledAt: null,
      cancellationReason: null,
    });

    // Audit log
    await this.audit.logEvent({
      actorUserId: actor?.userId ?? null,
      actorEmail: actor?.email ?? null,
      action: 'recruitment_onboarding_initiated',
      targetType: 'recruitment_onboarding',
      targetId: onboardingId,
      tenantId,
      companyId,
      metadata: {
        candidateId: app.candidateId,
        applicationId: app.id,
        requisitionId: app.requisitionId,
        targetJoiningDate,
      },
    });

    return this.getOnboardingById(tenantId, companyId, created.id);
  }

  // ---------------------------------------------------------------------------
  // Get Onboarding Detail By ID
  // ---------------------------------------------------------------------------

  async getOnboardingById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<RecruitmentOnboardingDetail> {
    const onboarding = await this.repo.getOnboardingById(tenantId, companyId, id);
    if (!onboarding) {
      throw new NotFoundError(`Onboarding record '${id}' not found`);
    }

    const candidate = await this.repo.getCandidateById(tenantId, onboarding.candidateId);
    if (!candidate) {
      throw new NotFoundError(`Candidate '${onboarding.candidateId}' not found`);
    }

    const application = await this.repo.getApplicationById(
      tenantId,
      companyId,
      onboarding.applicationId,
    );
    if (!application) {
      throw new NotFoundError(`Application '${onboarding.applicationId}' not found`);
    }

    const requisition = await this.repo.getRequisitionById(
      tenantId,
      companyId,
      application.requisitionId,
    );

    let createdEmployee: {
      id: string;
      employeeNumber: string;
      firstName: string;
      lastName: string | null;
      email: string;
    } | null = null;

    if (onboarding.createdEmployeeId) {
      const emp = await this.repo.getEmployee(tenantId, companyId, onboarding.createdEmployeeId);
      if (emp) {
        createdEmployee = {
          id: emp.id,
          employeeNumber: emp.employeeNumber,
          firstName: emp.firstName,
          lastName: emp.lastName ?? null,
          email: emp.email,
        };
      }
    }

    const duplicateCheck = await this.checkDuplicates(
      tenantId,
      companyId,
      candidate.id,
      application.id,
    );

    return {
      ...onboarding,
      candidate: {
        id: candidate.id,
        candidateNumber: candidate.candidateNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        currentCompany: candidate.currentCompany,
        currentDesignation: candidate.currentDesignation,
      },
      application: {
        id: application.id,
        stage: application.stage,
        status: application.status,
        appliedAt: application.appliedAt,
        hiredAt: application.hiredAt,
        requisitionId: application.requisitionId,
      },
      requisition: requisition
        ? {
            id: requisition.id,
            requisitionNumber: requisition.requisitionNumber,
            jobTitle: requisition.jobTitle,
            departmentId: requisition.departmentId,
            designationId: requisition.designationId,
            locationId: requisition.locationId,
            locationName: requisition.locationName,
            employmentType: requisition.employmentType,
          }
        : null,
      createdEmployee,
      duplicateCheck,
    };
  }

  // ---------------------------------------------------------------------------
  // List Onboardings
  // ---------------------------------------------------------------------------

  async listOnboardings(
    tenantId: string,
    companyId: string,
    query: OnboardingFilterQuery = {},
  ): Promise<PaginatedResult<RecruitmentOnboardingDetail>> {
    const listResult = await this.repo.listOnboardings(tenantId, companyId, query);

    const detailedItems: RecruitmentOnboardingDetail[] = [];
    for (const item of listResult.items) {
      const detail = await this.getOnboardingById(tenantId, companyId, item.id);
      detailedItems.push(detail);
    }

    return {
      items: detailedItems,
      pagination: listResult.pagination,
    };
  }

  // ---------------------------------------------------------------------------
  // Review Onboarding (Update Handoff Information)
  // ---------------------------------------------------------------------------

  async reviewOnboarding(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentOnboardingDetail> {
    const validated = validateReviewOnboarding(input);

    const onboarding = await this.repo.getOnboardingById(tenantId, companyId, id);
    if (!onboarding) {
      throw new NotFoundError(`Onboarding record '${id}' not found`);
    }

    if (onboarding.status === 'completed') {
      throw new ConflictError(
        'Cannot review or modify a completed onboarding record',
        'ONBOARDING_ALREADY_COMPLETED',
      );
    }

    if (onboarding.status === 'cancelled') {
      throw new BadRequestError(
        'Cannot review or modify a cancelled onboarding record',
        'ONBOARDING_CANCELLED',
      );
    }

    // Validate organization masters if supplied
    if (validated.departmentId) {
      const dept = await this.repo.getDepartment(tenantId, companyId, validated.departmentId);
      if (!dept) {
        throw new BadRequestError(
          `Department '${validated.departmentId}' does not exist or does not belong to this company`,
          'INVALID_DEPARTMENT',
        );
      }
    }

    if (validated.designationId) {
      const desig = await this.repo.getDesignation(tenantId, companyId, validated.designationId);
      if (!desig) {
        throw new BadRequestError(
          `Designation '${validated.designationId}' does not exist or does not belong to this company`,
          'INVALID_DESIGNATION',
        );
      }
    }

    if (validated.locationId) {
      const loc = await this.repo.getLocation(tenantId, companyId, validated.locationId);
      if (!loc) {
        throw new BadRequestError(
          `Location '${validated.locationId}' does not exist or does not belong to this company`,
          'INVALID_LOCATION',
        );
      }
    }

    if (validated.reportingManagerId) {
      const mgr = await this.repo.getEmployee(tenantId, companyId, validated.reportingManagerId);
      if (!mgr) {
        throw new BadRequestError(
          `Reporting manager '${validated.reportingManagerId}' does not exist or does not belong to this company`,
          'INVALID_REPORTING_MANAGER',
        );
      }
    }

    const newStatus = validated.status ?? 'ready_for_confirmation';

    await this.repo.updateOnboarding(tenantId, companyId, id, {
      targetJoiningDate: validated.targetJoiningDate ?? onboarding.targetJoiningDate,
      departmentId:
        validated.departmentId !== undefined ? validated.departmentId : onboarding.departmentId,
      designationId:
        validated.designationId !== undefined ? validated.designationId : onboarding.designationId,
      locationId: validated.locationId !== undefined ? validated.locationId : onboarding.locationId,
      reportingManagerId:
        validated.reportingManagerId !== undefined
          ? validated.reportingManagerId
          : onboarding.reportingManagerId,
      employmentType: validated.employmentType ?? onboarding.employmentType,
      workflowTemplate:
        validated.workflowTemplate !== undefined
          ? validated.workflowTemplate
          : onboarding.workflowTemplate,
      assignedPartner:
        validated.assignedPartner !== undefined
          ? validated.assignedPartner
          : onboarding.assignedPartner,
      notes: validated.notes !== undefined ? validated.notes : onboarding.notes,
      status: newStatus,
      reviewedByUserId: actor?.userId ?? null,
      reviewedAt: new Date(),
    });

    await this.audit.logEvent({
      actorUserId: actor?.userId ?? null,
      actorEmail: actor?.email ?? null,
      action: 'recruitment_onboarding_reviewed',
      targetType: 'recruitment_onboarding',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        newStatus,
        targetJoiningDate: validated.targetJoiningDate ?? onboarding.targetJoiningDate,
      },
    });

    return this.getOnboardingById(tenantId, companyId, id);
  }

  // ---------------------------------------------------------------------------
  // Confirm Onboarding & Create Workforce Employee Record (Atomic Transaction)
  // ---------------------------------------------------------------------------

  async confirmOnboarding(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentOnboardingDetail> {
    const validated = validateConfirmOnboarding(input);

    await this.repo.transaction(async (tx) => {
      // 1. Fetch onboarding record inside transaction with row lock
      const onboarding = await this.repo.getOnboardingById(tenantId, companyId, id, tx, true);
      if (!onboarding) {
        throw new NotFoundError(`Onboarding record '${id}' not found`);
      }

      // 2. Validate eligibility and prevent duplicate confirmation
      if (onboarding.status === 'completed' || onboarding.createdEmployeeId) {
        throw new ConflictError(
          'This onboarding handoff has already been confirmed and completed.',
          'ONBOARDING_ALREADY_COMPLETED',
        );
      }

      if (onboarding.status === 'cancelled') {
        throw new BadRequestError(
          'Cannot confirm a cancelled onboarding record.',
          'ONBOARDING_CANCELLED',
        );
      }

      // 3. Fetch Candidate and Application inside transaction
      const candidate = await this.repo.getCandidateById(tenantId, onboarding.candidateId, tx);
      if (!candidate) {
        throw new NotFoundError(`Candidate '${onboarding.candidateId}' not found`);
      }

      const application = await this.repo.getApplicationById(
        tenantId,
        companyId,
        onboarding.applicationId,
        tx,
      );
      if (!application) {
        throw new NotFoundError(`Application '${onboarding.applicationId}' not found`);
      }

      if (application.status !== 'hired') {
        throw new BadRequestError(
          `Cannot confirm onboarding: Application status is '${application.status}', expected 'hired'.`,
          'APPLICATION_NOT_HIRED',
        );
      }

      // 4. Duplicate Employee Check (Strict Isolation & Conflict Prevention)
      const duplicateCheck = await this.checkDuplicates(
        tenantId,
        companyId,
        candidate.id,
        application.id,
      );

      if (duplicateCheck.hasConflict && duplicateCheck.conflictSeverity === 'blocking') {
        throw new ConflictError(
          duplicateCheck.message ||
            'Duplicate employee conflict detected. Employee creation blocked.',
          'DUPLICATE_EMPLOYEE_CONFLICT',
        );
      }

      // 5. Create Workforce Employee using existing EmployeeService
      const employeeCreatePayload = {
        firstName: candidate.firstName,
        lastName: candidate.lastName ?? null,
        email: candidate.email,
        phone: candidate.phone ?? null,
        departmentId: onboarding.departmentId ?? null,
        designationId: onboarding.designationId ?? null,
        locationId: onboarding.locationId ?? null,
        reportingManagerId: onboarding.reportingManagerId ?? null,
        employmentType: onboarding.employmentType,
        employmentStatus: 'probation' as const,
        joiningDate: onboarding.targetJoiningDate || new Date().toISOString().slice(0, 10),
      };

      const createdEmployee = await this.employeeService.createEmployee(
        tenantId,
        companyId,
        employeeCreatePayload,
        tx,
      );

      // 6. Update Onboarding Record
      const notesUpdated = validated.notes
        ? `${onboarding.notes ? `${onboarding.notes} | ` : ''}${validated.notes}`
        : onboarding.notes;

      await this.repo.updateOnboarding(
        tenantId,
        companyId,
        id,
        {
          createdEmployeeId: createdEmployee.id,
          status: 'completed',
          confirmedByUserId: actor?.userId ?? null,
          confirmedAt: new Date(),
          notes: notesUpdated,
        },
        tx,
      );

      // 7. Record Business Activity & Audit Log
      const activityId = generateSurrogateId('act');
      await this.repo.createActivity(
        {
          id: activityId,
          tenantId,
          companyId,
          applicationId: application.id,
          candidateId: candidate.id,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? 'System',
          type: 'status_change',
          title: 'Workforce Onboarding Handoff Completed',
          content: `Employee record ${createdEmployee.employeeNumber} created for ${candidate.firstName} ${candidate.lastName}.`,
          metadata: {
            employeeId: createdEmployee.id,
            employeeNumber: createdEmployee.employeeNumber,
            onboardingId: id,
          },
        },
        tx,
      );

      await this.audit.logEvent(
        {
          actorUserId: actor?.userId ?? null,
          actorEmail: actor?.email ?? null,
          action: 'recruitment_onboarding_confirmed',
          targetType: 'recruitment_onboarding',
          targetId: id,
          tenantId,
          companyId,
          metadata: {
            candidateId: candidate.id,
            applicationId: application.id,
            createdEmployeeId: createdEmployee.id,
            employeeNumber: createdEmployee.employeeNumber,
            employeeEmail: createdEmployee.email,
          },
        },
        tx,
      );
    });

    return this.getOnboardingById(tenantId, companyId, id);
  }

  // ---------------------------------------------------------------------------
  // Cancel Onboarding
  // ---------------------------------------------------------------------------

  async cancelOnboarding(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    actor?: RecruitmentActorContext,
  ): Promise<RecruitmentOnboardingDetail> {
    const validated = validateCancelOnboarding(input);

    const onboarding = await this.repo.getOnboardingById(tenantId, companyId, id);
    if (!onboarding) {
      throw new NotFoundError(`Onboarding record '${id}' not found`);
    }

    if (onboarding.status === 'completed') {
      throw new ConflictError(
        'Cannot cancel an already completed onboarding handoff',
        'ONBOARDING_ALREADY_COMPLETED',
      );
    }

    if (onboarding.status === 'cancelled') {
      throw new BadRequestError('Onboarding record is already cancelled', 'ALREADY_CANCELLED');
    }

    await this.repo.updateOnboarding(tenantId, companyId, id, {
      status: 'cancelled',
      cancellationReason: validated.reason,
      cancelledByUserId: actor?.userId ?? null,
      cancelledAt: new Date(),
    });

    await this.audit.logEvent({
      actorUserId: actor?.userId ?? null,
      actorEmail: actor?.email ?? null,
      action: 'recruitment_onboarding_cancelled',
      targetType: 'recruitment_onboarding',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        reason: validated.reason,
      },
    });

    return this.getOnboardingById(tenantId, companyId, id);
  }
}

export const recruitmentOnboardingService = new RecruitmentOnboardingService();
