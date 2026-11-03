import { NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';
import {
  WorkforceSettingsRepository,
  workforceSettingsRepository,
} from '../repository/workforceSettings.repository.js';
import type {
  WorkforceSettingsBundle,
  FormattedNextIdResult,
  UpdateGeneralSettingsInput,
  CreateEmploymentTypeInput,
  UpdateEmploymentTypeInput,
  UpdateProbationPolicyInput,
  UpdateLifecyclePolicyInput,
  UpdateOffboardingPolicyInput,
  CreateClearanceTemplateInput,
} from '../types/workforceSettings.types.js';
import type {
  WorkforceGeneralSettings,
  WorkforceEmploymentType,
  WorkforceProbationPolicy,
  WorkforceLifecyclePolicy,
  WorkforceOffboardingPolicy,
  WorkforceClearanceChecklistTemplate,
} from '../../../../db/schema.js';

export class WorkforceSettingsService {
  constructor(
    private readonly repository: WorkforceSettingsRepository = workforceSettingsRepository,
  ) {}

  // =========================================================================
  // BUNDLE (ALL-IN-ONE)
  // =========================================================================

  async getSettingsBundle(tenantId: string, companyId: string): Promise<WorkforceSettingsBundle> {
    const general = await this.getGeneralSettings(tenantId, companyId);
    const employmentTypes = await this.listEmploymentTypes(tenantId, companyId, false);
    const probation = await this.getProbationPolicy(tenantId, companyId);
    const lifecycle = await this.getLifecyclePolicy(tenantId, companyId);
    const offboarding = await this.getOffboardingPolicy(tenantId, companyId);
    const clearanceTemplates = await this.listClearanceTemplates(tenantId, companyId);

    return {
      general,
      employmentTypes,
      probation,
      lifecycle,
      offboarding,
      clearanceTemplates,
    };
  }

  // =========================================================================
  // 1. GENERAL SETTINGS & SEQUENCE
  // =========================================================================

  async getGeneralSettings(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceGeneralSettings & { nextSuggestedId: string }> {
    let settings = await this.repository.getGeneralSettings(tenantId, companyId);
    if (!settings) {
      settings = await this.repository.seedDefaultGeneralSettings(tenantId, companyId);
    }
    const preview = await this.repository.peekNextSequence(tenantId, companyId);
    return {
      ...settings,
      nextSuggestedId: preview.nextId,
    };
  }

  async updateGeneralSettings(
    tenantId: string,
    companyId: string,
    input: UpdateGeneralSettingsInput,
  ): Promise<WorkforceGeneralSettings & { nextSuggestedId: string }> {
    const updated = await this.repository.updateGeneralSettings(tenantId, companyId, input);
    const preview = await this.repository.peekNextSequence(tenantId, companyId);
    return {
      ...updated,
      nextSuggestedId: preview.nextId,
    };
  }

  async previewNextEmployeeId(tenantId: string, companyId: string): Promise<FormattedNextIdResult> {
    return this.repository.peekNextSequence(tenantId, companyId);
  }

  async reserveNextEmployeeId(
    tenantId: string,
    companyId: string,
    tx?: unknown,
  ): Promise<FormattedNextIdResult> {
    return this.repository.getNextSequenceAndIncrement(tenantId, companyId, tx);
  }

  // =========================================================================
  // 2. EMPLOYMENT TYPES
  // =========================================================================

  async listEmploymentTypes(
    tenantId: string,
    companyId: string,
    activeOnly: boolean = false,
  ): Promise<WorkforceEmploymentType[]> {
    return this.repository.listEmploymentTypes(tenantId, companyId, activeOnly);
  }

  async createEmploymentType(
    tenantId: string,
    companyId: string,
    input: CreateEmploymentTypeInput,
  ): Promise<WorkforceEmploymentType> {
    const existing = await this.repository.getEmploymentTypeByCode(tenantId, companyId, input.code);
    if (existing) {
      throw new ConflictError(
        `Employment type with code "${input.code}" already exists for this company.`,
        'EMPLOYMENT_TYPE_CODE_EXISTS',
      );
    }
    return this.repository.createEmploymentType(tenantId, companyId, input);
  }

  async updateEmploymentType(
    tenantId: string,
    companyId: string,
    id: string,
    input: UpdateEmploymentTypeInput,
  ): Promise<WorkforceEmploymentType> {
    const existing = await this.repository.getEmploymentTypeById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Employment type with id "${id}" was not found.`);
    }
    return this.repository.updateEmploymentType(tenantId, companyId, id, input);
  }

  async deleteEmploymentType(tenantId: string, companyId: string, id: string): Promise<boolean> {
    const existing = await this.repository.getEmploymentTypeById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Employment type with id "${id}" was not found.`);
    }
    return this.repository.deleteEmploymentType(tenantId, companyId, id);
  }

  // =========================================================================
  // 3. PROBATION POLICY
  // =========================================================================

  async getProbationPolicy(tenantId: string, companyId: string): Promise<WorkforceProbationPolicy> {
    let policy = await this.repository.getProbationPolicy(tenantId, companyId);
    if (!policy) {
      policy = await this.repository.seedDefaultProbationPolicy(tenantId, companyId);
    }
    return policy;
  }

  async updateProbationPolicy(
    tenantId: string,
    companyId: string,
    input: UpdateProbationPolicyInput,
  ): Promise<WorkforceProbationPolicy> {
    return this.repository.updateProbationPolicy(tenantId, companyId, input);
  }

  // =========================================================================
  // 4. LIFECYCLE & TRANSFER POLICY
  // =========================================================================

  async getLifecyclePolicy(tenantId: string, companyId: string): Promise<WorkforceLifecyclePolicy> {
    let policy = await this.repository.getLifecyclePolicy(tenantId, companyId);
    if (!policy) {
      policy = await this.repository.seedDefaultLifecyclePolicy(tenantId, companyId);
    }
    return policy;
  }

  async updateLifecyclePolicy(
    tenantId: string,
    companyId: string,
    input: UpdateLifecyclePolicyInput,
  ): Promise<WorkforceLifecyclePolicy> {
    return this.repository.updateLifecyclePolicy(tenantId, companyId, input);
  }

  // =========================================================================
  // 5. OFFBOARDING POLICY
  // =========================================================================

  async getOffboardingPolicy(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceOffboardingPolicy> {
    let policy = await this.repository.getOffboardingPolicy(tenantId, companyId);
    if (!policy) {
      policy = await this.repository.seedDefaultOffboardingPolicy(tenantId, companyId);
    }
    return policy;
  }

  async updateOffboardingPolicy(
    tenantId: string,
    companyId: string,
    input: UpdateOffboardingPolicyInput,
  ): Promise<WorkforceOffboardingPolicy> {
    return this.repository.updateOffboardingPolicy(tenantId, companyId, input);
  }

  // =========================================================================
  // 6. CLEARANCE CHECKLIST TEMPLATES
  // =========================================================================

  async listClearanceTemplates(
    tenantId: string,
    companyId: string,
    department?: 'it' | 'admin' | 'finance' | 'hr',
  ): Promise<WorkforceClearanceChecklistTemplate[]> {
    return this.repository.listClearanceTemplates(tenantId, companyId, department);
  }

  async createClearanceTemplate(
    tenantId: string,
    companyId: string,
    input: CreateClearanceTemplateInput,
  ): Promise<WorkforceClearanceChecklistTemplate> {
    return this.repository.createClearanceTemplate(tenantId, companyId, input);
  }

  async updateClearanceTemplate(
    tenantId: string,
    companyId: string,
    id: string,
    input: Partial<CreateClearanceTemplateInput>,
  ): Promise<WorkforceClearanceChecklistTemplate> {
    const existing = await this.repository.getClearanceTemplateById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Clearance checklist template with id "${id}" was not found.`);
    }
    return this.repository.updateClearanceTemplate(tenantId, companyId, id, input);
  }

  async deleteClearanceTemplate(tenantId: string, companyId: string, id: string): Promise<boolean> {
    const existing = await this.repository.getClearanceTemplateById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Clearance checklist template with id "${id}" was not found.`);
    }
    return this.repository.deleteClearanceTemplate(tenantId, companyId, id);
  }
}

export const workforceSettingsService = new WorkforceSettingsService();
