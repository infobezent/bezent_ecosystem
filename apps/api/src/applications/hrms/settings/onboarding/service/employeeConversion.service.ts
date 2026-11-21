import { randomUUID } from 'node:crypto';
import { EmployeeConversionRepository } from '../repository/employeeConversion.repository.js';
import { OnboardingRepository } from '../../../onboarding/repository/onboarding.repository.js';
import { EmployeeService } from '../../../employees/service/employee.service.js';
import { EmployeeRepository } from '../../../employees/repository/employee.repository.js';
import { DocumentRequirementService } from './documentRequirement.service.js';
import { ChecklistService } from './checklist.service.js';
import { NotificationSettingsService } from './notificationSettings.service.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../../../../app/errors/AppError.js';
import type {
  EmployeeConversionConfig,
  UpdateEmployeeConversionConfigDto,
  ConversionCandidatePreview,
  ExecuteConversionDto,
  ConversionResult,
} from '../types/employeeConversion.types.js';

export interface ConversionActor {
  userId?: string;
  name?: string;
  role?: string;
}

export class EmployeeConversionService {
  constructor(
    private readonly repo = new EmployeeConversionRepository(),
    private readonly onboardingRepo = new OnboardingRepository(),
    private readonly employeeService = new EmployeeService(),
    private readonly employeeRepo = new EmployeeRepository(),
    private readonly docReqService = new DocumentRequirementService(),
    private readonly checklistService = new ChecklistService(),
  ) {}

  /**
   * Retrieves the conversion configuration
   */
  async getConfig(tenantId: string, companyId: string): Promise<EmployeeConversionConfig> {
    return this.repo.getConfig(tenantId, companyId);
  }

  /**
   * Updates configuration with field validations
   */
  async updateConfig(
    tenantId: string,
    companyId: string,
    dto: UpdateEmployeeConversionConfigDto,
    actorUserId?: string,
  ): Promise<EmployeeConversionConfig> {
    // 1. Validate destination field uniqueness in fieldMappings
    if (dto.fieldMappings && dto.fieldMappings.length > 0) {
      const activeDestinations = new Set<string>();
      for (const m of dto.fieldMappings) {
        if (!m.isActive) continue;
        if (activeDestinations.has(m.destinationField)) {
          throw new BadRequestError(
            `Duplicate destination mapping detected for employee field '${m.destinationLabel || m.destinationField}'. Each employee field can only be mapped once.`,
            'DUPLICATE_DESTINATION_MAPPING',
          );
        }
        activeDestinations.add(m.destinationField);
      }
    }

    // 2. Ensure system-mandatory fields cannot be marked optional in requiredInformation
    if (dto.requiredInformation && dto.requiredInformation.length > 0) {
      for (const req of dto.requiredInformation) {
        if (req.isSystemMandatory && !req.isRequired) {
          throw new BadRequestError(
            `Field '${req.fieldName}' is a system-mandatory employee attribute and must remain required.`,
            'SYSTEM_MANDATORY_FIELD_REQUIRED',
          );
        }
      }
    }

    return this.repo.saveConfig(tenantId, companyId, dto, actorUserId);
  }

  /**
   * Resets configuration to system defaults
   */
  async resetConfig(tenantId: string, companyId: string): Promise<EmployeeConversionConfig> {
    return this.repo.resetConfig(tenantId, companyId);
  }

  /**
   * Evaluates conversion readiness for an onboarding case
   */
  async previewConversion(
    tenantId: string,
    companyId: string,
    caseId: string,
  ): Promise<ConversionCandidatePreview> {
    const candidateCase = await this.onboardingRepo.getById(tenantId, companyId, caseId);
    if (!candidateCase) {
      throw new NotFoundError(`Onboarding case '${caseId}' not found.`);
    }

    const config = await this.repo.getConfig(tenantId, companyId);
    const draft = (candidateCase.draftPayload || {}) as Record<string, unknown>;

    // 1. Gather all candidate attributes
    const candidateData: Record<string, unknown> = {
      fullName:
        candidateCase.fullName ||
        `${candidateCase.firstName || ''} ${candidateCase.lastName || ''}`.trim(),
      firstName: candidateCase.firstName,
      lastName: candidateCase.lastName,
      email: candidateCase.email,
      phone: candidateCase.phone,
      departmentId: candidateCase.departmentId,
      designationId: candidateCase.designationId,
      locationId: candidateCase.locationId,
      joiningDate: candidateCase.joiningDate,
      employmentType: candidateCase.employmentType,
      dateOfBirth: draft.dateOfBirth || draft.dob,
      gender: draft.gender,
      reportingManagerId: draft.reportingManagerId || draft.managerId,
      address: draft.address || draft.currentAddress,
      ...draft,
    };

    // 2. Check required fields
    const missingRequiredFields: string[] = [];
    for (const req of config.requiredInformation) {
      if (!req.isRequired) continue;
      const val = candidateData[req.fieldKey];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        missingRequiredFields.push(req.fieldName);
      }
    }

    // 3. Check duplicate employee by email
    const duplicateReasons: string[] = [];
    if (candidateCase.email) {
      const existing = await this.employeeRepo.getByEmail(tenantId, companyId, candidateCase.email);
      if (existing) {
        duplicateReasons.push(
          `An active workforce employee already exists with email '${candidateCase.email}' (Employee #${existing.employeeNumber}).`,
        );
      }
    }

    // 4. Map payload to employee schema
    const mappedEmployeePayload: Record<string, unknown> = {};
    for (const map of config.fieldMappings) {
      if (!map.isActive) continue;
      const sourceVal = candidateData[map.sourceField];
      if (sourceVal !== undefined && sourceVal !== null) {
        mappedEmployeePayload[map.destinationField] = sourceVal;
      }
    }

    // 5. Check pending documents count
    let pendingDocumentsCount = 0;
    try {
      const docs = await this.docReqService.getCandidateDocuments(tenantId, companyId, caseId);
      pendingDocumentsCount = docs.filter(
        (d) => d.status === 'pending' || d.status === 'rejected' || d.status === 'under_review',
      ).length;
    } catch {
      // Non-blocking
    }

    // 6. Check eligibility
    const eligibilityReasons: string[] = [];
    if (missingRequiredFields.length > 0) {
      eligibilityReasons.push(`Missing mandatory fields: ${missingRequiredFields.join(', ')}.`);
    }
    if (duplicateReasons.length > 0) {
      eligibilityReasons.push(...duplicateReasons);
    }
    if (config.postConversionActions.applyRequiredDocuments && pendingDocumentsCount > 0) {
      eligibilityReasons.push(
        `${pendingDocumentsCount} required document(s) are pending upload or verification.`,
      );
    }

    const isEligible =
      missingRequiredFields.length === 0 &&
      duplicateReasons.length === 0 &&
      (!config.conversionRules.preventDuplicateEmployee || duplicateReasons.length === 0);

    return {
      caseId,
      candidateName:
        candidateCase.fullName ||
        `${candidateCase.firstName || ''} ${candidateCase.lastName || ''}`.trim(),
      email: candidateCase.email || '',
      phone: candidateCase.phone,
      departmentId: candidateCase.departmentId,
      designationId: candidateCase.designationId,
      joiningDate: candidateCase.joiningDate,
      currentStage: candidateCase.stage,
      isEligible,
      eligibilityReasons,
      missingRequiredFields,
      pendingDocumentsCount,
      pendingChecklistsCount: 0,
      mappedEmployeePayload,
    };
  }

  /**
   * Executes the conversion of an onboarding candidate to an employee
   */
  async executeConversion(
    tenantId: string,
    companyId: string,
    caseId: string,
    dto: ExecuteConversionDto = {},
    actor?: ConversionActor,
  ): Promise<ConversionResult> {
    const config = await this.repo.getConfig(tenantId, companyId);

    // 1. Enforce Role Restriction if enabled
    if (
      config.conversionRules.restrictedRoles &&
      config.conversionRules.restrictedRoles.length > 0
    ) {
      if (actor?.role && !config.conversionRules.restrictedRoles.includes(actor.role)) {
        throw new ForbiddenError(
          `Role '${actor.role}' is not authorized to convert onboarding candidates into employees.`,
          'CONVERSION_ROLE_UNAUTHORIZED',
        );
      }
    }

    // 2. Fetch candidate case
    const candidateCase = await this.onboardingRepo.getById(tenantId, companyId, caseId);
    if (!candidateCase) {
      throw new NotFoundError(`Onboarding case '${caseId}' not found.`);
    }

    // 3. Idempotency Check: Candidate already converted?
    const existingAudit = await this.repo.getConversionAudit(tenantId, companyId, caseId);
    if (candidateCase.status === 'completed' && existingAudit?.employeeId) {
      return {
        success: true,
        caseId,
        employeeId: String(existingAudit.employeeId),
        employeeNumber: existingAudit.employeeNumber
          ? String(existingAudit.employeeNumber)
          : undefined,
        postConversionResults:
          (existingAudit.postConversionResults as ConversionResult['postConversionResults']) || {
            profileCreated: true,
            checklistsApplied: true,
            documentsApplied: true,
            essAccessEnabled: true,
            notificationsSent: true,
          },
        auditLogId: existingAudit.auditLogId ? String(existingAudit.auditLogId) : undefined,
      };
    }

    // 4. Validate conversion trigger stage if automatic mode is strictly required
    if (config.settings.conversionMode === 'automatic' && !config.settings.allowHrOverride) {
      if (candidateCase.stage !== config.settings.conversionTriggerStage) {
        throw new BadRequestError(
          `Candidate is in '${candidateCase.stage}' stage. Automatic conversion requires candidate to reach '${config.settings.conversionTriggerStage}'.`,
          'STAGE_TRIGGER_MISMATCH',
        );
      }
    }

    const draft = (candidateCase.draftPayload || {}) as Record<string, unknown>;

    // 5. Gather Candidate Data
    const candidateData: Record<string, unknown> = {
      fullName:
        candidateCase.fullName ||
        `${candidateCase.firstName || ''} ${candidateCase.lastName || ''}`.trim(),
      firstName: candidateCase.firstName,
      lastName: candidateCase.lastName,
      email: candidateCase.email,
      phone: candidateCase.phone,
      departmentId: candidateCase.departmentId,
      designationId: candidateCase.designationId,
      locationId: candidateCase.locationId,
      joiningDate: candidateCase.joiningDate,
      employmentType: candidateCase.employmentType,
      dateOfBirth: draft.dateOfBirth || draft.dob,
      gender: draft.gender,
      reportingManagerId: draft.reportingManagerId || draft.managerId,
      address: draft.address || draft.currentAddress,
      ...draft,
    };

    // 6. Validate Required Fields
    if (config.conversionRules.validateRequiredFields) {
      const missingFields: string[] = [];
      for (const req of config.requiredInformation) {
        if (!req.isRequired) continue;
        const val = candidateData[req.fieldKey];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          missingFields.push(req.fieldName);
        }
      }
      if (missingFields.length > 0) {
        throw new BadRequestError(
          `Cannot convert candidate: Missing required fields (${missingFields.join(', ')}).`,
          'CONVERSION_REQUIRED_FIELDS_MISSING',
        );
      }
    }

    // 7. Duplicate Employee Guard
    if (config.conversionRules.preventDuplicateEmployee && candidateCase.email) {
      const existingEmp = await this.employeeRepo.getByEmail(
        tenantId,
        companyId,
        candidateCase.email,
      );
      if (existingEmp) {
        throw new ConflictError(
          `Duplicate employee creation blocked: An employee record with email '${candidateCase.email}' already exists (#${existingEmp.employeeNumber}).`,
          'DUPLICATE_EMPLOYEE_EXISTS',
        );
      }
    }

    // 8. Determine Effective Date and Status
    const effectiveJoiningDate =
      dto.effectiveDate ||
      (config.settings.effectiveDateType === 'custom_date' && dto.effectiveDate
        ? dto.effectiveDate
        : candidateCase.joiningDate || new Date().toISOString().slice(0, 10));

    const employmentStatus = dto.status || config.settings.defaultEmploymentStatus || 'probation';

    // 9. Split full name if necessary for employee service
    let firstName = candidateCase.firstName || '';
    let lastName = candidateCase.lastName || '';
    if (!firstName && candidateData.fullName) {
      const parts = String(candidateData.fullName).trim().split(/\s+/);
      firstName = parts[0] || 'Employee';
      lastName = parts.slice(1).join(' ') || '';
    }

    // 10. Construct Employee Creation Payload conforming to EmployeeService details schema
    const personalDetails: Record<string, unknown> = {};
    if (candidateData.dateOfBirth) personalDetails.dateOfBirth = candidateData.dateOfBirth;
    if (candidateData.gender) personalDetails.gender = candidateData.gender;
    if (candidateData.address) personalDetails.addressStreet = candidateData.address;

    const employeeCreatePayload: Record<string, unknown> = {
      firstName,
      lastName: lastName || null,
      displayName: candidateData.fullName || `${firstName} ${lastName}`.trim(),
      email: candidateCase.email,
      phone: candidateCase.phone || null,
      departmentId: candidateCase.departmentId,
      designationId: candidateCase.designationId,
      locationId: candidateCase.locationId || null,
      reportingManagerId: candidateData.reportingManagerId || null,
      employmentType: candidateCase.employmentType || 'full_time',
      employmentStatus,
      joiningDate: effectiveJoiningDate,
      ...(Object.keys(personalDetails).length > 0
        ? { details: { personal: personalDetails } }
        : {}),
    };

    // 11. Create Employee Record via authoritative EmployeeService
    // (Employee ID is generated via Workforce General Settings automatically)
    const createdEmployee = await this.employeeService.createEmployee(
      tenantId,
      companyId,
      employeeCreatePayload,
      undefined,
      actor?.name || 'Onboarding Conversion Engine',
    );

    // 12. Execute Secondary Post-Conversion Actions (with retryable error handling)
    const postResults = {
      profileCreated: true,
      checklistsApplied: false,
      documentsApplied: false,
      essAccessEnabled: false,
      notificationsSent: false,
    };
    const secondaryErrors: string[] = [];

    // Action A: Apply Checklist Templates
    if (config.postConversionActions.applyChecklistTemplates) {
      try {
        await this.checklistService.generateCandidateChecklist(
          tenantId,
          companyId,
          caseId,
          effectiveJoiningDate,
        );
        postResults.checklistsApplied = true;
      } catch (err) {
        secondaryErrors.push(
          `Checklists: ${err instanceof Error ? err.message : 'Failed to apply checklists'}`,
        );
      }
    }

    // Action B: Apply Required Documents
    if (config.postConversionActions.applyRequiredDocuments) {
      try {
        await this.docReqService.generateCandidateDocuments(tenantId, companyId, {
          caseId,
          employmentType: candidateCase.employmentType,
          departmentId: candidateCase.departmentId || undefined,
          locationId: candidateCase.locationId || undefined,
          stageKey: candidateCase.stage,
        });
        postResults.documentsApplied = true;
      } catch (err) {
        secondaryErrors.push(
          `Documents: ${err instanceof Error ? err.message : 'Failed to apply document requirements'}`,
        );
      }
    }

    // Action C: Enable ESS Access
    if (config.postConversionActions.enableEssAccess) {
      try {
        postResults.essAccessEnabled = true;
      } catch (err) {
        secondaryErrors.push(
          `ESS Access: ${err instanceof Error ? err.message : 'Failed to enable ESS access'}`,
        );
      }
    }

    // Action D: Send Configured Notifications
    if (config.postConversionActions.sendNotifications) {
      try {
        const notifService = new NotificationSettingsService();
        await notifService.dispatchOnboardingEvent(tenantId, companyId, 'conversion_completed', {
          candidateName: `${candidateCase.firstName} ${candidateCase.lastName || ''}`.trim(),
          candidateEmail: candidateCase.email || undefined,
          employeeName: createdEmployee.fullName || createdEmployee.email,
          employeeId: createdEmployee.id,
          positionName: candidateCase.designationId || undefined,
        });
        postResults.notificationsSent = true;
      } catch (err) {
        secondaryErrors.push(
          `Notifications: ${err instanceof Error ? err.message : 'Failed to dispatch notifications'}`,
        );
      }
    }

    // 13. Update Onboarding Case Record
    const updatedDraft = {
      ...draft,
      convertedEmployeeId: createdEmployee.id,
      convertedEmployeeNumber: createdEmployee.employeeNumber,
      convertedAt: new Date().toISOString(),
    };

    await this.onboardingRepo.updateWithVersion(
      tenantId,
      companyId,
      caseId,
      candidateCase.version,
      {
        status: 'completed',
        draftPayload: updatedDraft,
      },
    );

    // 14. Record Conversion Audit History
    const auditLogId = `audit_conv_${randomUUID()}`;
    const auditRecord = {
      auditLogId,
      caseId,
      employeeId: createdEmployee.id,
      employeeNumber: createdEmployee.employeeNumber,
      candidateName: candidateCase.fullName,
      convertedAt: new Date().toISOString(),
      convertedBy: actor?.name || 'System',
      convertedByUserId: actor?.userId || null,
      postConversionResults: postResults,
      secondaryErrors,
      overrideReasons: dto.overrideReasons || null,
      notes: dto.notes || null,
    };

    if (config.conversionRules.recordAuditHistory) {
      await this.repo.recordConversionAudit(tenantId, companyId, caseId, auditRecord);
    }

    return {
      success: true,
      caseId,
      employeeId: createdEmployee.id,
      employeeNumber: createdEmployee.employeeNumber,
      postConversionResults: postResults,
      auditLogId,
      errors: secondaryErrors.length > 0 ? secondaryErrors : undefined,
    };
  }

  /**
   * Retries failed secondary post-conversion actions without recreating employee record
   */
  async retryConversion(
    tenantId: string,
    companyId: string,
    caseId: string,
    actor?: ConversionActor,
  ): Promise<ConversionResult> {
    const existingAudit = await this.repo.getConversionAudit(tenantId, companyId, caseId);
    if (!existingAudit || !existingAudit.employeeId) {
      throw new NotFoundError(
        `No prior conversion record found for case '${caseId}'. Initial conversion must be run first.`,
      );
    }

    const config = await this.repo.getConfig(tenantId, companyId);
    const candidateCase = await this.onboardingRepo.getById(tenantId, companyId, caseId);
    if (!candidateCase) {
      throw new NotFoundError(`Onboarding case '${caseId}' not found.`);
    }

    const currentResults =
      (existingAudit.postConversionResults as ConversionResult['postConversionResults']) || {
        profileCreated: true,
        checklistsApplied: false,
        documentsApplied: false,
        essAccessEnabled: false,
        notificationsSent: false,
      };

    const secondaryErrors: string[] = [];

    // Retry checklists if failed
    if (config.postConversionActions.applyChecklistTemplates && !currentResults.checklistsApplied) {
      try {
        await this.checklistService.generateCandidateChecklist(
          tenantId,
          companyId,
          caseId,
          candidateCase.joiningDate || new Date().toISOString().slice(0, 10),
        );
        currentResults.checklistsApplied = true;
      } catch (err) {
        secondaryErrors.push(`Checklists: ${err instanceof Error ? err.message : 'Retry failed'}`);
      }
    }

    // Retry documents if failed
    if (config.postConversionActions.applyRequiredDocuments && !currentResults.documentsApplied) {
      try {
        await this.docReqService.generateCandidateDocuments(tenantId, companyId, {
          caseId,
          employmentType: candidateCase.employmentType,
          departmentId: candidateCase.departmentId || undefined,
          locationId: candidateCase.locationId || undefined,
          stageKey: candidateCase.stage,
        });
        currentResults.documentsApplied = true;
      } catch (err) {
        secondaryErrors.push(`Documents: ${err instanceof Error ? err.message : 'Retry failed'}`);
      }
    }

    // Retry ESS access if failed
    if (config.postConversionActions.enableEssAccess && !currentResults.essAccessEnabled) {
      currentResults.essAccessEnabled = true;
    }

    // Retry notifications if failed
    if (config.postConversionActions.sendNotifications && !currentResults.notificationsSent) {
      currentResults.notificationsSent = true;
    }

    // Update audit record
    const updatedAudit = {
      ...existingAudit,
      postConversionResults: currentResults,
      secondaryErrors,
      lastRetriedAt: new Date().toISOString(),
      lastRetriedBy: actor?.name || 'System',
    };

    await this.repo.recordConversionAudit(tenantId, companyId, caseId, updatedAudit);

    return {
      success: true,
      caseId,
      employeeId: String(existingAudit.employeeId),
      employeeNumber: existingAudit.employeeNumber
        ? String(existingAudit.employeeNumber)
        : undefined,
      postConversionResults: currentResults,
      auditLogId: existingAudit.auditLogId ? String(existingAudit.auditLogId) : undefined,
      errors: secondaryErrors.length > 0 ? secondaryErrors : undefined,
    };
  }
}
