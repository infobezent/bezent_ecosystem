import { getDb } from '../../../../../db/connection.js';
import {
  onboardingGeneralSettings,
  onboardingStageConfigs,
  onboardingFieldConfigs,
  onboardingDocumentRequirements,
  onboardingChecklistTemplates,
  onboardingConversionSettings,
  type OnboardingGeneralSettings,
  type OnboardingStageConfig,
  type OnboardingFieldConfig,
  type OnboardingDocumentRequirement,
  type OnboardingChecklistTemplate,
  type OnboardingConversionSettings,
} from '../../../../../db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { AppError, NotFoundError } from '../../../../../app/errors/AppError.js';
import {
  getDefaultGeneralSettings,
  getDefaultStageConfigs,
  getDefaultFieldConfigs,
  getDefaultDocumentRequirements,
  getDefaultChecklistTemplates,
  getDefaultConversionSettings,
} from '../service/settings.defaults.js';
import type {
  UpdateOnboardingGeneralSettingsDto,
  UpdateOnboardingStageConfigDto,
  UpdateOnboardingFieldConfigDto,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
  CreateOnboardingChecklistTemplateDto,
  UpdateOnboardingChecklistTemplateDto,
  UpdateOnboardingConversionSettingsDto,
} from '../types/settings.types.js';

export class OnboardingSettingsRepository {
  private get db() {
    return getDb();
  }

  // ==================== General Settings ====================

  async getGeneralSettings(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingGeneralSettings | null> {
    const rows = await this.db
      .select()
      .from(onboardingGeneralSettings)
      .where(
        and(
          eq(onboardingGeneralSettings.tenantId, tenantId),
          eq(onboardingGeneralSettings.companyId, companyId),
        ),
      );
    return rows[0] ?? null;
  }

  async upsertGeneralSettings(
    tenantId: string,
    companyId: string,
    data: UpdateOnboardingGeneralSettingsDto,
  ): Promise<OnboardingGeneralSettings> {
    const existing = await this.getGeneralSettings(tenantId, companyId);
    if (!existing) {
      const defaults = getDefaultGeneralSettings(tenantId, companyId);
      const toInsert = {
        ...defaults,
        ...data,
      };
      await this.db.insert(onboardingGeneralSettings).values(toInsert);
      const inserted = await this.getGeneralSettings(tenantId, companyId);
      return inserted!;
    }

    await this.db
      .update(onboardingGeneralSettings)
      .set(data)
      .where(
        and(
          eq(onboardingGeneralSettings.tenantId, tenantId),
          eq(onboardingGeneralSettings.companyId, companyId),
        ),
      );

    const updated = await this.getGeneralSettings(tenantId, companyId);
    return updated!;
  }

  // ==================== Stage Configurations ====================

  async getStageConfigs(tenantId: string, companyId: string): Promise<OnboardingStageConfig[]> {
    return this.db
      .select()
      .from(onboardingStageConfigs)
      .where(
        and(
          eq(onboardingStageConfigs.tenantId, tenantId),
          eq(onboardingStageConfigs.companyId, companyId),
        ),
      )
      .orderBy(asc(onboardingStageConfigs.displayOrder));
  }

  async getStageConfigByKey(
    tenantId: string,
    companyId: string,
    stageKey: string,
  ): Promise<OnboardingStageConfig | null> {
    const rows = await this.db
      .select()
      .from(onboardingStageConfigs)
      .where(
        and(
          eq(onboardingStageConfigs.tenantId, tenantId),
          eq(onboardingStageConfigs.companyId, companyId),
          eq(onboardingStageConfigs.stageKey, stageKey),
        ),
      );
    return rows[0] ?? null;
  }

  async upsertStageConfig(
    tenantId: string,
    companyId: string,
    stageKey: string,
    data: UpdateOnboardingStageConfigDto,
  ): Promise<OnboardingStageConfig> {
    const existing = await this.getStageConfigByKey(tenantId, companyId, stageKey);
    if (!existing) {
      const allDefaults = getDefaultStageConfigs(tenantId, companyId);
      const matchDefault = allDefaults.find((s) => s.stageKey === stageKey);
      if (!matchDefault) {
        throw new AppError(`Stage '${stageKey}' is not supported.`, 400, 'INVALID_STAGE');
      }

      const toInsert = {
        ...matchDefault,
        ...data,
      };
      await this.db.insert(onboardingStageConfigs).values(toInsert);
      const inserted = await this.getStageConfigByKey(tenantId, companyId, stageKey);
      return inserted!;
    }

    await this.db
      .update(onboardingStageConfigs)
      .set(data)
      .where(
        and(
          eq(onboardingStageConfigs.tenantId, tenantId),
          eq(onboardingStageConfigs.companyId, companyId),
          eq(onboardingStageConfigs.stageKey, stageKey),
        ),
      );

    const updated = await this.getStageConfigByKey(tenantId, companyId, stageKey);
    return updated!;
  }

  // ==================== Field Configurations ====================

  async getFieldConfigs(tenantId: string, companyId: string): Promise<OnboardingFieldConfig[]> {
    return this.db
      .select()
      .from(onboardingFieldConfigs)
      .where(
        and(
          eq(onboardingFieldConfigs.tenantId, tenantId),
          eq(onboardingFieldConfigs.companyId, companyId),
        ),
      )
      .orderBy(asc(onboardingFieldConfigs.displayOrder));
  }

  async getFieldConfigByKey(
    tenantId: string,
    companyId: string,
    fieldKey: string,
  ): Promise<OnboardingFieldConfig | null> {
    const rows = await this.db
      .select()
      .from(onboardingFieldConfigs)
      .where(
        and(
          eq(onboardingFieldConfigs.tenantId, tenantId),
          eq(onboardingFieldConfigs.companyId, companyId),
          eq(onboardingFieldConfigs.fieldKey, fieldKey),
        ),
      );
    return rows[0] ?? null;
  }

  async upsertFieldConfig(
    tenantId: string,
    companyId: string,
    fieldKey: string,
    data: UpdateOnboardingFieldConfigDto,
  ): Promise<OnboardingFieldConfig> {
    const existing = await this.getFieldConfigByKey(tenantId, companyId, fieldKey);
    if (!existing) {
      const allDefaults = getDefaultFieldConfigs(tenantId, companyId);
      const matchDefault = allDefaults.find((f) => f.fieldKey === fieldKey);
      if (!matchDefault) {
        throw new AppError(
          `Field '${fieldKey}' is not configured for this company.`,
          400,
          'INVALID_FIELD',
        );
      }

      const toInsert = {
        ...matchDefault,
        ...data,
      };
      await this.db.insert(onboardingFieldConfigs).values(toInsert);
      const inserted = await this.getFieldConfigByKey(tenantId, companyId, fieldKey);
      return inserted!;
    }

    await this.db
      .update(onboardingFieldConfigs)
      .set(data)
      .where(
        and(
          eq(onboardingFieldConfigs.tenantId, tenantId),
          eq(onboardingFieldConfigs.companyId, companyId),
          eq(onboardingFieldConfigs.fieldKey, fieldKey),
        ),
      );

    const updated = await this.getFieldConfigByKey(tenantId, companyId, fieldKey);
    return updated!;
  }

  // ==================== Document Requirements ====================

  async getDocumentRequirements(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingDocumentRequirement[]> {
    return this.db
      .select()
      .from(onboardingDocumentRequirements)
      .where(
        and(
          eq(onboardingDocumentRequirements.tenantId, tenantId),
          eq(onboardingDocumentRequirements.companyId, companyId),
        ),
      )
      .orderBy(asc(onboardingDocumentRequirements.displayOrder));
  }

  async getDocumentRequirementById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingDocumentRequirement | null> {
    const rows = await this.db
      .select()
      .from(onboardingDocumentRequirements)
      .where(
        and(
          eq(onboardingDocumentRequirements.tenantId, tenantId),
          eq(onboardingDocumentRequirements.companyId, companyId),
          eq(onboardingDocumentRequirements.id, id),
        ),
      );
    return rows[0] ?? null;
  }

  async getDocumentRequirementByType(
    tenantId: string,
    companyId: string,
    documentType: string,
  ): Promise<OnboardingDocumentRequirement | null> {
    const rows = await this.db
      .select()
      .from(onboardingDocumentRequirements)
      .where(
        and(
          eq(onboardingDocumentRequirements.tenantId, tenantId),
          eq(onboardingDocumentRequirements.companyId, companyId),
          eq(onboardingDocumentRequirements.documentType, documentType),
        ),
      );
    return rows[0] ?? null;
  }

  async createDocumentRequirement(
    tenantId: string,
    companyId: string,
    data: CreateOnboardingDocumentRequirementDto,
  ): Promise<OnboardingDocumentRequirement> {
    const existing = await this.getDocumentRequirementByType(
      tenantId,
      companyId,
      data.documentType,
    );
    if (existing) {
      throw new AppError(
        `Document requirement with type '${data.documentType}' already exists for this company.`,
        409,
        'DUPLICATE_KEY',
      );
    }

    const id = `doc_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await this.db.insert(onboardingDocumentRequirements).values({
      id,
      tenantId,
      companyId,
      documentType: data.documentType,
      name: data.name,
      description: data.description ?? null,
      isRequired: data.isRequired ?? true,
      verificationRequired: data.verificationRequired ?? true,
      expiryTracking: data.expiryTracking ?? false,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    });

    const created = await this.getDocumentRequirementById(tenantId, companyId, id);
    return created!;
  }

  async updateDocumentRequirement(
    tenantId: string,
    companyId: string,
    id: string,
    data: UpdateOnboardingDocumentRequirementDto,
  ): Promise<OnboardingDocumentRequirement> {
    const existing = await this.getDocumentRequirementById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Document requirement with ID '${id}' not found.`);
    }

    await this.db
      .update(onboardingDocumentRequirements)
      .set(data)
      .where(
        and(
          eq(onboardingDocumentRequirements.tenantId, tenantId),
          eq(onboardingDocumentRequirements.companyId, companyId),
          eq(onboardingDocumentRequirements.id, id),
        ),
      );

    const updated = await this.getDocumentRequirementById(tenantId, companyId, id);
    return updated!;
  }

  async deleteDocumentRequirement(tenantId: string, companyId: string, id: string): Promise<void> {
    const existing = await this.getDocumentRequirementById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Document requirement with ID '${id}' not found.`);
    }

    await this.db
      .delete(onboardingDocumentRequirements)
      .where(
        and(
          eq(onboardingDocumentRequirements.tenantId, tenantId),
          eq(onboardingDocumentRequirements.companyId, companyId),
          eq(onboardingDocumentRequirements.id, id),
        ),
      );
  }

  // ==================== Checklist Templates ====================

  async getChecklistTemplates(
    tenantId: string,
    companyId: string,
    stageKey?: string,
  ): Promise<OnboardingChecklistTemplate[]> {
    const conditions = [
      eq(onboardingChecklistTemplates.tenantId, tenantId),
      eq(onboardingChecklistTemplates.companyId, companyId),
    ];

    if (stageKey) {
      conditions.push(eq(onboardingChecklistTemplates.stageKey, stageKey));
    }

    return this.db
      .select()
      .from(onboardingChecklistTemplates)
      .where(and(...conditions))
      .orderBy(asc(onboardingChecklistTemplates.displayOrder));
  }

  async getChecklistTemplateById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingChecklistTemplate | null> {
    const rows = await this.db
      .select()
      .from(onboardingChecklistTemplates)
      .where(
        and(
          eq(onboardingChecklistTemplates.tenantId, tenantId),
          eq(onboardingChecklistTemplates.companyId, companyId),
          eq(onboardingChecklistTemplates.id, id),
        ),
      );
    return rows[0] ?? null;
  }

  async createChecklistTemplate(
    tenantId: string,
    companyId: string,
    data: CreateOnboardingChecklistTemplateDto,
  ): Promise<OnboardingChecklistTemplate> {
    const id = `chk_tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await this.db.insert(onboardingChecklistTemplates).values({
      id,
      tenantId,
      companyId,
      name: data.name,
      description: data.description ?? null,
      stageKey: data.stageKey,
      assigneeType: data.assigneeType ?? 'hr',
      dueOffsetDays: data.dueOffsetDays ?? 0,
      isRequired: data.isRequired ?? true,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    });

    const created = await this.getChecklistTemplateById(tenantId, companyId, id);
    return created!;
  }

  async updateChecklistTemplate(
    tenantId: string,
    companyId: string,
    id: string,
    data: UpdateOnboardingChecklistTemplateDto,
  ): Promise<OnboardingChecklistTemplate> {
    const existing = await this.getChecklistTemplateById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Checklist template with ID '${id}' not found.`);
    }

    await this.db
      .update(onboardingChecklistTemplates)
      .set(data)
      .where(
        and(
          eq(onboardingChecklistTemplates.tenantId, tenantId),
          eq(onboardingChecklistTemplates.companyId, companyId),
          eq(onboardingChecklistTemplates.id, id),
        ),
      );

    const updated = await this.getChecklistTemplateById(tenantId, companyId, id);
    return updated!;
  }

  async deleteChecklistTemplate(tenantId: string, companyId: string, id: string): Promise<void> {
    const existing = await this.getChecklistTemplateById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Checklist template with ID '${id}' not found.`);
    }

    await this.db
      .delete(onboardingChecklistTemplates)
      .where(
        and(
          eq(onboardingChecklistTemplates.tenantId, tenantId),
          eq(onboardingChecklistTemplates.companyId, companyId),
          eq(onboardingChecklistTemplates.id, id),
        ),
      );
  }

  // ==================== Conversion Settings ====================

  async getConversionSettings(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingConversionSettings | null> {
    const rows = await this.db
      .select()
      .from(onboardingConversionSettings)
      .where(
        and(
          eq(onboardingConversionSettings.tenantId, tenantId),
          eq(onboardingConversionSettings.companyId, companyId),
        ),
      );
    return rows[0] ?? null;
  }

  async upsertConversionSettings(
    tenantId: string,
    companyId: string,
    data: UpdateOnboardingConversionSettingsDto,
  ): Promise<OnboardingConversionSettings> {
    const existing = await this.getConversionSettings(tenantId, companyId);
    if (!existing) {
      const defaults = getDefaultConversionSettings(tenantId, companyId);
      const toInsert = {
        ...defaults,
        ...data,
      };
      await this.db.insert(onboardingConversionSettings).values(toInsert);
      const inserted = await this.getConversionSettings(tenantId, companyId);
      return inserted!;
    }

    await this.db
      .update(onboardingConversionSettings)
      .set(data)
      .where(
        and(
          eq(onboardingConversionSettings.tenantId, tenantId),
          eq(onboardingConversionSettings.companyId, companyId),
        ),
      );

    const updated = await this.getConversionSettings(tenantId, companyId);
    return updated!;
  }

  // ==================== Idempotent Company Initialization ====================

  async initializeCompanySettings(tenantId: string, companyId: string): Promise<void> {
    // 1. General
    const gen = await this.getGeneralSettings(tenantId, companyId);
    if (!gen) {
      await this.db
        .insert(onboardingGeneralSettings)
        .values(getDefaultGeneralSettings(tenantId, companyId));
    }

    // 2. Stages
    const stages = await this.getStageConfigs(tenantId, companyId);
    if (stages.length === 0) {
      const defaultStages = getDefaultStageConfigs(tenantId, companyId);
      for (const s of defaultStages) {
        await this.db.insert(onboardingStageConfigs).values(s);
      }
    }

    // 3. Fields
    const fields = await this.getFieldConfigs(tenantId, companyId);
    if (fields.length === 0) {
      const defaultFields = getDefaultFieldConfigs(tenantId, companyId);
      for (const f of defaultFields) {
        await this.db.insert(onboardingFieldConfigs).values(f);
      }
    }

    // 4. Documents
    const docs = await this.getDocumentRequirements(tenantId, companyId);
    if (docs.length === 0) {
      const defaultDocs = getDefaultDocumentRequirements(tenantId, companyId);
      for (const d of defaultDocs) {
        await this.db.insert(onboardingDocumentRequirements).values(d);
      }
    }

    // 5. Checklists
    const chks = await this.getChecklistTemplates(tenantId, companyId);
    if (chks.length === 0) {
      const defaultChks = getDefaultChecklistTemplates(tenantId, companyId);
      for (const c of defaultChks) {
        await this.db.insert(onboardingChecklistTemplates).values(c);
      }
    }

    // 6. Conversion
    const conv = await this.getConversionSettings(tenantId, companyId);
    if (!conv) {
      await this.db
        .insert(onboardingConversionSettings)
        .values(getDefaultConversionSettings(tenantId, companyId));
    }
  }
}
