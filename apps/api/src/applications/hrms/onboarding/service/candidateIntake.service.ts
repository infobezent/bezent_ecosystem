import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  onboardingCases,
  employees,
  type OnboardingCase,
} from '../../../../db/schema.js';
import { FormsService } from '../../settings/forms/service/forms.service.js';
import { NotificationSettingsService } from '../../settings/onboarding/service/notificationSettings.service.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../app/errors/AppError.js';
import type {
  CandidateIntakeConfig,
  FormVersionSnapshot,
  ResolvedForm,
} from '../../settings/forms/types/form.types.js';

export interface ManualEntryDto {
  saveAsDraft?: boolean;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
  joiningDate?: string;
  answers: Record<string, unknown>;
}

export interface CandidateInviteDto {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
  joiningDate?: string;
  notes?: string;
}

export type CandidateIntakeStatus =
  | 'draft'
  | 'invited'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved';

export class CandidateIntakeService {
  constructor(private readonly formsService = new FormsService()) {}

  /**
   * Helper to retrieve the latest published or current candidate intake form snapshot.
   */
  async getLatestIntakeForm(
    tenantId: string,
    companyId: string,
  ): Promise<{ version: number; form: ResolvedForm; config: CandidateIntakeConfig }> {
    const versions = await this.formsService.getFormVersions(
      tenantId,
      companyId,
      'candidate-intake',
    );
    if (versions.length > 0 && versions[0]) {
      return {
        version: versions[0].version,
        form: versions[0].snapshot,
        config: versions[0].config,
      };
    }

    const currentForm = await this.formsService.getResolvedForm(
      tenantId,
      companyId,
      'candidate-intake',
    );
    const config: CandidateIntakeConfig = (currentForm.form.metadata?.intakeConfig as CandidateIntakeConfig) ?? {
      formName: 'Candidate Intake Form',
      formDescription: 'Pre-hire registration and information collection form.',
      hrManualEntryEnabled: true,
      candidateSelfServiceEnabled: true,
      allowSaveDraft: true,
      candidateEditingAfterSubmission: false,
      status: 'published',
      publishedVersion: 1,
    };

    return {
      version: config.publishedVersion || 1,
      form: currentForm,
      config,
    };
  }

  /**
   * Server-side type-aware and required validation for candidate answers.
   */
  validateAnswers(
    form: ResolvedForm,
    answers: Record<string, unknown>,
    role: 'hr' | 'candidate',
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    const rules = (form.form.metadata?.fieldRules as Record<string, any[]>) || {};
    const permissions = (form.form.metadata?.fieldPermissions as Record<string, any>) || {};

    for (const section of form.sections) {
      if (section.visible === false) continue;

      for (const field of section.fields) {
        if (!field.enabled) continue;

        const perm = permissions[field.key];
        if (role === 'candidate') {
          if (perm?.visibility === 'hr_only') continue;
          if (perm?.candidateEditable === false) continue;
        }

        // Evaluate conditional visibility (e.g. permanent address hidden when sameAsCurrent is checked)
        const fieldRules = rules[field.key] || [];
        let isFieldVisible = true;
        for (const rule of fieldRules) {
          const triggerValue = answers[rule.targetFieldKey];
          let matched = false;
          if (rule.operator === 'equals') matched = triggerValue === rule.value;
          else if (rule.operator === 'not_equals') matched = triggerValue !== rule.value;
          else if (rule.operator === 'is_empty')
            matched = triggerValue === undefined || triggerValue === null || triggerValue === '';
          else if (rule.operator === 'is_not_empty')
            matched = triggerValue !== undefined && triggerValue !== null && triggerValue !== '';

          if (rule.action === 'hide' && matched) isFieldVisible = false;
          if (rule.action === 'show' && !matched) isFieldVisible = false;
        }

        if (!isFieldVisible) continue;

        const value = answers[field.key];
        const isEmpty =
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0);

        if (field.required && isEmpty) {
          errors[field.key] = `${field.label} is required`;
          continue;
        }

        if (isEmpty) continue;

        // Type-aware validation
        if (field.type === 'email' && typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            errors[field.key] = 'Invalid email address format';
          }
        } else if (field.type === 'phone' && typeof value === 'string') {
          const phoneClean = value.replace(/[\s\-\(\)\+]/g, '');
          if (!/^\d{7,15}$/.test(phoneClean)) {
            errors[field.key] = 'Invalid phone number (must be 7-15 digits)';
          }
        } else if (field.type === 'date' && typeof value === 'string') {
          if (isNaN(Date.parse(value))) {
            errors[field.key] = 'Invalid calendar date';
          }
        } else if (field.type === 'dropdown' || field.type === 'radio') {
          const options = field.config?.options || [];
          if (options.length > 0 && !options.some((o) => o.value === value)) {
            errors[field.key] = `Value must be one of configured options`;
          }
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * HR Manual Entry
   */
  async createManualEntry(
    tenantId: string,
    companyId: string,
    dto: ManualEntryDto,
    authorUser?: { id?: string; name?: string },
  ): Promise<OnboardingCase> {
    const { version, form, config } = await this.getLatestIntakeForm(tenantId, companyId);

    if (!config.hrManualEntryEnabled) {
      throw new BadRequestError('HR manual entry is currently disabled in form configuration');
    }

    const answers = dto.answers || {};

    if (!dto.saveAsDraft) {
      const validation = this.validateAnswers(form, answers, 'hr');
      if (!validation.valid) {
        throw new ValidationError('Validation failed on required intake fields', validation.errors);
      }
    }

    const email = (answers['contact.personalEmail'] as string) || null;
    const phone = (answers['contact.mobileNumber'] as string) || null;
    const firstName = (answers['personal.firstName'] as string) || 'Candidate';
    const lastName = (answers['personal.lastName'] as string) || null;
    const joiningDate = (answers['employment.expectedJoiningDate'] as string) || dto.joiningDate || null;
    const departmentId = (answers['employment.department'] as string) || dto.departmentId || null;
    const designationId = (answers['employment.position'] as string) || dto.designationId || null;
    const locationId = (answers['employment.workLocation'] as string) || dto.locationId || null;
    const employmentType =
      (answers['employment.employmentType'] as any) || dto.employmentType || 'full_time';

    // Verify duplicate active employee
    if (email) {
      const db = getDb();
      const [existingEmp] = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.email, email),
          ),
        );
      if (existingEmp) {
        throw new ConflictError(`An active employee with email '${email}' already exists`);
      }
    }

    const caseId = `case_${randomUUID()}`;
    const candidateStatus: CandidateIntakeStatus = dto.saveAsDraft ? 'draft' : 'submitted';

    const draftPayload = {
      intakeFormKey: 'candidate-intake',
      intakeFormVersion: version,
      candidateStatus,
      answers,
      submissionHistory: [
        {
          action: dto.saveAsDraft ? 'draft_saved' : 'manual_entry_submitted',
          by: authorUser?.name || 'HR Administrator',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const db = getDb();
    await db.insert(onboardingCases).values({
      id: caseId,
      tenantId,
      companyId,
      firstName,
      lastName,
      email,
      phone,
      departmentId,
      designationId,
      locationId,
      joiningDate,
      employmentType,
      stage: 'preboarding',
      status: 'draft',
      version: 1,
      draftPayload,
    });

    const [created] = await db
      .select()
      .from(onboardingCases)
      .where(
        and(
          eq(onboardingCases.tenantId, tenantId),
          eq(onboardingCases.companyId, companyId),
          eq(onboardingCases.id, caseId),
        ),
      );

    if (!created) throw new AppError('Failed to create candidate onboarding record', 500);
    return created;
  }

  /**
   * Candidate Self-Service: Invite Candidate
   */
  async inviteCandidate(
    tenantId: string,
    companyId: string,
    dto: CandidateInviteDto,
    authorUser?: { id?: string; name?: string },
  ): Promise<{ caseId: string; token: string; invitationUrl: string }> {
    const { version, config } = await this.getLatestIntakeForm(tenantId, companyId);

    if (!config.candidateSelfServiceEnabled) {
      throw new BadRequestError('Candidate self-service is currently disabled in form configuration');
    }

    // Verify duplicate active employee
    const db = getDb();
    const [existingEmp] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.email, dto.email),
        ),
      );
    if (existingEmp) {
      throw new ConflictError(`An employee with email '${dto.email}' already exists`);
    }

    const token = `cintake_${randomUUID().replace(/-/g, '')}`;
    const caseId = `case_${randomUUID()}`;

    const initialAnswers: Record<string, unknown> = {
      'personal.firstName': dto.firstName,
      'personal.lastName': dto.lastName || '',
      'contact.personalEmail': dto.email,
      'contact.mobileNumber': dto.phone || '',
      'employment.department': dto.departmentId || '',
      'employment.position': dto.designationId || '',
      'employment.workLocation': dto.locationId || '',
      'employment.employmentType': dto.employmentType || 'full_time',
      'employment.expectedJoiningDate': dto.joiningDate || '',
      'additional.additionalNotes': dto.notes || '',
    };

    const draftPayload = {
      intakeFormKey: 'candidate-intake',
      intakeFormVersion: version,
      candidateStatus: 'invited' as CandidateIntakeStatus,
      invitationToken: token,
      invitationSentAt: new Date().toISOString(),
      invitedBy: authorUser?.name || 'HR Administrator',
      answers: initialAnswers,
      submissionHistory: [
        {
          action: 'invitation_sent',
          by: authorUser?.name || 'HR Administrator',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await db.insert(onboardingCases).values({
      id: caseId,
      tenantId,
      companyId,
      firstName: dto.firstName,
      lastName: dto.lastName || null,
      email: dto.email,
      phone: dto.phone || null,
      departmentId: dto.departmentId || null,
      designationId: dto.designationId || null,
      locationId: dto.locationId || null,
      joiningDate: dto.joiningDate || null,
      employmentType: dto.employmentType || 'full_time',
      stage: 'preboarding',
      status: 'draft',
      version: 1,
      draftPayload,
    });

    const invitationUrl = `/candidate-intake?token=${token}`;

    try {
      const notifService = new NotificationSettingsService();
      await notifService.dispatchOnboardingEvent(tenantId, companyId, 'candidate_invited', {
        candidateName: `${dto.firstName} ${dto.lastName || ''}`.trim(),
        candidateEmail: dto.email,
        companyName: 'BEZENT',
        positionName: 'Team Member',
        joiningDate: dto.joiningDate || undefined,
        registrationLink: invitationUrl,
      });
    } catch {
      // Non-blocking notification dispatch
    }

    return {
      caseId,
      token,
      invitationUrl,
    };
  }

  /**
   * Candidate Self-Service: Load Form via Token
   */
  async getCandidateIntakeByToken(token: string): Promise<{
    caseId: string;
    token: string;
    form: ResolvedForm;
    config: CandidateIntakeConfig;
    answers: Record<string, unknown>;
    status: CandidateIntakeStatus;
  }> {
    const db = getDb();
    // Search onboarding cases by draftPayload.invitationToken
    const allCases = await db.select().from(onboardingCases).where(eq(onboardingCases.status, 'draft'));
    const matched = allCases.find((c: OnboardingCase) => {
      const payload = c.draftPayload as any;
      return payload && payload.invitationToken === token;
    });

    if (!matched) {
      throw new NotFoundError('Invalid or expired candidate intake invitation token');
    }

    const payload = matched.draftPayload as any;
    const versionNumber = payload.intakeFormVersion || 1;

    // Load form version snapshot from metadata
    const versions = await this.formsService.getFormVersions(
      matched.tenantId,
      matched.companyId,
      'candidate-intake',
    );
    const snapshot = versions.find((v) => v.version === versionNumber);

    let resolvedForm: ResolvedForm;
    let intakeConfig: CandidateIntakeConfig;

    if (snapshot) {
      resolvedForm = snapshot.snapshot;
      intakeConfig = snapshot.config;
    } else {
      const current = await this.formsService.getResolvedForm(
        matched.tenantId,
        matched.companyId,
        'candidate-intake',
      );
      resolvedForm = current;
      intakeConfig = (current.form.metadata?.intakeConfig as CandidateIntakeConfig) ?? {
        formName: 'Candidate Intake Form',
        formDescription: 'Pre-hire registration and information collection form.',
        hrManualEntryEnabled: true,
        candidateSelfServiceEnabled: true,
        allowSaveDraft: true,
        candidateEditingAfterSubmission: false,
        status: 'published',
        publishedVersion: 1,
      };
    }

    return {
      caseId: matched.id,
      token,
      form: resolvedForm,
      config: intakeConfig,
      answers: (payload.answers as Record<string, unknown>) || {},
      status: (payload.candidateStatus as CandidateIntakeStatus) || 'invited',
    };
  }

  /**
   * Candidate Self-Service: Save Draft
   */
  async saveCandidateDraft(token: string, answers: Record<string, unknown>): Promise<void> {
    const db = getDb();
    const allCases = await db.select().from(onboardingCases).where(eq(onboardingCases.status, 'draft'));
    const matched = allCases.find((c: OnboardingCase) => {
      const payload = c.draftPayload as any;
      return payload && payload.invitationToken === token;
    });

    if (!matched) {
      throw new NotFoundError('Invalid or expired candidate intake invitation token');
    }

    const payload = (matched.draftPayload as any) || {};
    const nextAnswers = { ...(payload.answers || {}), ...answers };
    const history = payload.submissionHistory || [];

    history.push({
      action: 'candidate_draft_saved',
      by: 'Candidate',
      timestamp: new Date().toISOString(),
    });

    const nextPayload = {
      ...payload,
      candidateStatus: 'in_progress',
      answers: nextAnswers,
      submissionHistory: history,
    };

    await db
      .update(onboardingCases)
      .set({
        draftPayload: nextPayload,
        firstName: (nextAnswers['personal.firstName'] as string) || matched.firstName,
        lastName: (nextAnswers['personal.lastName'] as string) || matched.lastName,
        email: (nextAnswers['contact.personalEmail'] as string) || matched.email,
        phone: (nextAnswers['contact.mobileNumber'] as string) || matched.phone,
      })
      .where(eq(onboardingCases.id, matched.id));
  }

  /**
   * Candidate Self-Service: Submit Form
   */
  async submitCandidateIntake(
    token: string,
    answers: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const data = await this.getCandidateIntakeByToken(token);

    if (data.status === 'submitted' && !data.config.candidateEditingAfterSubmission) {
      throw new ConflictError('This registration has already been submitted and is under review');
    }

    const mergedAnswers = { ...(data.answers || {}), ...answers };
    const validation = this.validateAnswers(data.form, mergedAnswers, 'candidate');
    if (!validation.valid) {
      throw new ValidationError('Validation failed on candidate submission', validation.errors);
    }

    const db = getDb();
    const [caseRecord] = await db
      .select()
      .from(onboardingCases)
      .where(eq(onboardingCases.id, data.caseId));

    if (!caseRecord) throw new NotFoundError('Onboarding case not found');

    const payload = (caseRecord.draftPayload as any) || {};
    const history = payload.submissionHistory || [];
    history.push({
      action: 'candidate_submitted',
      by: 'Candidate',
      timestamp: new Date().toISOString(),
    });

    const nextPayload = {
      ...payload,
      candidateStatus: 'submitted',
      submittedAt: new Date().toISOString(),
      answers: mergedAnswers,
      submissionHistory: history,
    };

    await db
      .update(onboardingCases)
      .set({
        draftPayload: nextPayload,
        firstName: (mergedAnswers['personal.firstName'] as string) || caseRecord.firstName,
        lastName: (mergedAnswers['personal.lastName'] as string) || caseRecord.lastName,
        email: (mergedAnswers['contact.personalEmail'] as string) || caseRecord.email,
        phone: (mergedAnswers['contact.mobileNumber'] as string) || caseRecord.phone,
      })
      .where(eq(onboardingCases.id, caseRecord.id));

    return {
      success: true,
      message: 'Candidate registration submitted successfully. Your details are now under HR review.',
    };
  }

  /**
   * HR Review: Approve Candidate Intake & Transition Case into Active Onboarding
   */
  async approveCandidateIntake(
    tenantId: string,
    companyId: string,
    caseId: string,
    reviewerUser?: { name?: string; email?: string },
  ): Promise<OnboardingCase> {
    const db = getDb();
    const [caseRecord] = await db
      .select()
      .from(onboardingCases)
      .where(
        and(
          eq(onboardingCases.tenantId, tenantId),
          eq(onboardingCases.companyId, companyId),
          eq(onboardingCases.id, caseId),
        ),
      );

    if (!caseRecord) {
      throw new NotFoundError(`Onboarding case ${caseId} not found`);
    }

    const payload = (caseRecord.draftPayload as any) || {};
    const answers = (payload.answers as Record<string, unknown>) || {};
    const history = payload.submissionHistory || [];

    history.push({
      action: 'approved_by_hr',
      by: reviewerUser?.name || 'HR Administrator',
      timestamp: new Date().toISOString(),
    });

    const nextPayload = {
      ...payload,
      candidateStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: reviewerUser?.name || 'HR Administrator',
      submissionHistory: history,
    };

    // Promote case to active onboarding status
    await db
      .update(onboardingCases)
      .set({
        status: 'active',
        stage: 'preboarding',
        firstName: (answers['personal.firstName'] as string) || caseRecord.firstName,
        lastName: (answers['personal.lastName'] as string) || caseRecord.lastName,
        email: (answers['contact.personalEmail'] as string) || caseRecord.email,
        phone: (answers['contact.mobileNumber'] as string) || caseRecord.phone,
        departmentId: (answers['employment.department'] as string) || caseRecord.departmentId,
        designationId: (answers['employment.position'] as string) || caseRecord.designationId,
        locationId: (answers['employment.workLocation'] as string) || caseRecord.locationId,
        joiningDate: (answers['employment.expectedJoiningDate'] as string) || caseRecord.joiningDate,
        employmentType: (answers['employment.employmentType'] as any) || caseRecord.employmentType,
        draftPayload: nextPayload,
      })
      .where(eq(onboardingCases.id, caseRecord.id));

    const [updated] = await db
      .select()
      .from(onboardingCases)
      .where(eq(onboardingCases.id, caseRecord.id));

    return updated!;
  }

  /**
   * HR Review: Request Changes / Corrections
   */
  async requestCandidateChanges(
    tenantId: string,
    companyId: string,
    caseId: string,
    notes: string,
    reviewerUser?: { name?: string; email?: string },
  ): Promise<OnboardingCase> {
    const db = getDb();
    const [caseRecord] = await db
      .select()
      .from(onboardingCases)
      .where(
        and(
          eq(onboardingCases.tenantId, tenantId),
          eq(onboardingCases.companyId, companyId),
          eq(onboardingCases.id, caseId),
        ),
      );

    if (!caseRecord) {
      throw new NotFoundError(`Onboarding case ${caseId} not found`);
    }

    const payload = (caseRecord.draftPayload as any) || {};
    const corrections = payload.corrections || [];
    const history = payload.submissionHistory || [];

    corrections.push({
      notes,
      requestedAt: new Date().toISOString(),
      requestedBy: reviewerUser?.name || 'HR Administrator',
    });

    history.push({
      action: 'changes_requested',
      by: reviewerUser?.name || 'HR Administrator',
      notes,
      timestamp: new Date().toISOString(),
    });

    const nextPayload = {
      ...payload,
      candidateStatus: 'changes_requested',
      corrections,
      submissionHistory: history,
    };

    await db
      .update(onboardingCases)
      .set({
        draftPayload: nextPayload,
      })
      .where(eq(onboardingCases.id, caseRecord.id));

    const [updated] = await db
      .select()
      .from(onboardingCases)
      .where(eq(onboardingCases.id, caseRecord.id));

    return updated!;
  }
}
