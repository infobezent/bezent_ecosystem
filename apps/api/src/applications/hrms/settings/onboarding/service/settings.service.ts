import { OnboardingSettingsRepository } from '../repository/settings.repository.js';
import {
  getDefaultGeneralSettings,
  getDefaultStageConfigs,
  getDefaultFieldConfigs,
  getDefaultDocumentRequirements,
  getDefaultChecklistTemplates,
  getDefaultConversionSettings,
} from './settings.defaults.js';
import type {
  OnboardingGeneralSettingsDto,
  UpdateOnboardingGeneralSettingsDto,
  OnboardingStageConfigDto,
  UpdateOnboardingStageConfigDto,
  OnboardingFieldConfigDto,
  UpdateOnboardingFieldConfigDto,
  OnboardingDocumentRequirementDto,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
  OnboardingChecklistTemplateDto,
  CreateOnboardingChecklistTemplateDto,
  UpdateOnboardingChecklistTemplateDto,
  OnboardingConversionSettingsDto,
  UpdateOnboardingConversionSettingsDto,
  OnboardingSettingsAggregateDto,
} from '../types/settings.types.js';

export class OnboardingSettingsService {
  constructor(private readonly repository = new OnboardingSettingsRepository()) {}

  // ==================== General Settings ====================

  async getGeneralSettings(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingGeneralSettingsDto> {
    const existing = await this.repository.getGeneralSettings(tenantId, companyId);
    if (existing) {
      return existing;
    }
    // Return deterministic defaults without write side-effects
    return getDefaultGeneralSettings(tenantId, companyId);
  }

  async updateGeneralSettings(
    tenantId: string,
    companyId: string,
    data: UpdateOnboardingGeneralSettingsDto,
  ): Promise<OnboardingGeneralSettingsDto> {
    return this.repository.upsertGeneralSettings(tenantId, companyId, data);
  }

  // ==================== Stage Configurations ====================

  async getStageConfigs(tenantId: string, companyId: string): Promise<OnboardingStageConfigDto[]> {
    const existing = await this.repository.getStageConfigs(tenantId, companyId);
    if (existing.length > 0) {
      return existing;
    }
    // Return deterministic defaults without write side-effects
    return getDefaultStageConfigs(tenantId, companyId);
  }

  async updateStageConfig(
    tenantId: string,
    companyId: string,
    stageKey: string,
    data: UpdateOnboardingStageConfigDto,
  ): Promise<OnboardingStageConfigDto> {
    return this.repository.upsertStageConfig(tenantId, companyId, stageKey, data);
  }

  // ==================== Field Configurations ====================

  async getFieldConfigs(tenantId: string, companyId: string): Promise<OnboardingFieldConfigDto[]> {
    const existing = await this.repository.getFieldConfigs(tenantId, companyId);
    if (existing.length > 0) {
      return existing;
    }
    // Return deterministic defaults without write side-effects
    return getDefaultFieldConfigs(tenantId, companyId);
  }

  async updateFieldConfig(
    tenantId: string,
    companyId: string,
    fieldKey: string,
    data: UpdateOnboardingFieldConfigDto,
  ): Promise<OnboardingFieldConfigDto> {
    return this.repository.upsertFieldConfig(tenantId, companyId, fieldKey, data);
  }

  // ==================== Document Requirements ====================

  async getDocumentRequirements(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingDocumentRequirementDto[]> {
    const existing = await this.repository.getDocumentRequirements(tenantId, companyId);
    if (existing.length > 0) {
      return existing;
    }
    return getDefaultDocumentRequirements(tenantId, companyId);
  }

  async getDocumentRequirementById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingDocumentRequirementDto | null> {
    const doc = await this.repository.getDocumentRequirementById(tenantId, companyId, id);
    if (doc) {
      return doc;
    }
    const defaultDoc = getDefaultDocumentRequirements(tenantId, companyId).find((d) => d.id === id);
    return defaultDoc ?? null;
  }

  async createDocumentRequirement(
    tenantId: string,
    companyId: string,
    data: CreateOnboardingDocumentRequirementDto,
  ): Promise<OnboardingDocumentRequirementDto> {
    return this.repository.createDocumentRequirement(tenantId, companyId, data);
  }

  async updateDocumentRequirement(
    tenantId: string,
    companyId: string,
    id: string,
    data: UpdateOnboardingDocumentRequirementDto,
  ): Promise<OnboardingDocumentRequirementDto> {
    return this.repository.updateDocumentRequirement(tenantId, companyId, id, data);
  }

  async deleteDocumentRequirement(tenantId: string, companyId: string, id: string): Promise<void> {
    await this.repository.deleteDocumentRequirement(tenantId, companyId, id);
  }

  // ==================== Checklist Templates ====================

  async getChecklistTemplates(
    tenantId: string,
    companyId: string,
    stageKey?: string,
  ): Promise<OnboardingChecklistTemplateDto[]> {
    const existing = await this.repository.getChecklistTemplates(tenantId, companyId, stageKey);
    if (existing.length > 0) {
      return existing;
    }
    const defaults = getDefaultChecklistTemplates(tenantId, companyId);
    if (stageKey) {
      return defaults.filter((c) => c.stageKey === stageKey);
    }
    return defaults;
  }

  async getChecklistTemplateById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingChecklistTemplateDto | null> {
    const chk = await this.repository.getChecklistTemplateById(tenantId, companyId, id);
    if (chk) {
      return chk;
    }
    const defaultChk = getDefaultChecklistTemplates(tenantId, companyId).find((c) => c.id === id);
    return defaultChk ?? null;
  }

  async createChecklistTemplate(
    tenantId: string,
    companyId: string,
    data: CreateOnboardingChecklistTemplateDto,
  ): Promise<OnboardingChecklistTemplateDto> {
    return this.repository.createChecklistTemplate(tenantId, companyId, data);
  }

  async updateChecklistTemplate(
    tenantId: string,
    companyId: string,
    id: string,
    data: UpdateOnboardingChecklistTemplateDto,
  ): Promise<OnboardingChecklistTemplateDto> {
    return this.repository.updateChecklistTemplate(tenantId, companyId, id, data);
  }

  async deleteChecklistTemplate(tenantId: string, companyId: string, id: string): Promise<void> {
    await this.repository.deleteChecklistTemplate(tenantId, companyId, id);
  }

  // ==================== Conversion Settings ====================

  async getConversionSettings(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingConversionSettingsDto> {
    const existing = await this.repository.getConversionSettings(tenantId, companyId);
    if (existing) {
      return existing;
    }
    // Return deterministic defaults without write side-effects
    return getDefaultConversionSettings(tenantId, companyId);
  }

  async updateConversionSettings(
    tenantId: string,
    companyId: string,
    data: UpdateOnboardingConversionSettingsDto,
  ): Promise<OnboardingConversionSettingsDto> {
    return this.repository.upsertConversionSettings(tenantId, companyId, data);
  }

  // ==================== Aggregate & Initialization ====================

  async getAggregateSettings(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingSettingsAggregateDto> {
    const [general, stages, fields, documents, checklists, conversion] = await Promise.all([
      this.getGeneralSettings(tenantId, companyId),
      this.getStageConfigs(tenantId, companyId),
      this.getFieldConfigs(tenantId, companyId),
      this.getDocumentRequirements(tenantId, companyId),
      this.getChecklistTemplates(tenantId, companyId),
      this.getConversionSettings(tenantId, companyId),
    ]);

    return {
      general,
      stages,
      fields,
      documents,
      checklists,
      conversion,
    };
  }

  async initializeCompanySettings(tenantId: string, companyId: string): Promise<void> {
    await this.repository.initializeCompanySettings(tenantId, companyId);
  }
}
