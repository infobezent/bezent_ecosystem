import { randomBytes } from 'node:crypto';
import { NotFoundError, ValidationError } from '../../../../../app/errors/AppError.js';
import { FormOverridesRepository } from '../repository/formOverrides.repository.js';
import { CustomFormsRepository } from '../repository/customForms.repository.js';
import { getSystemForm, indexSystemFields, listSystemForms } from '../definitions/systemForms.js';
import { resolveForm } from './formResolver.js';
import { validateUpdateFormOverrides } from '../validation/formOverrides.schema.js';
import { validateSaveFormDefinition } from '../validation/formDefinition.schema.js';
import type {
  CandidateIntakeConfig,
  FormFieldOverrideValues,
  FormOverridesDto,
  FormVersionSnapshot,
  FormCustomizationMetadata,
  ResolvedForm,
  SystemFormDefinition,
} from '../types/form.types.js';

const MAX_FORM_NAME_LENGTH = 100;
const MAX_FORM_DESCRIPTION_LENGTH = 500;

export class FormsService {
  constructor(
    private readonly repo = new FormOverridesRepository(),
    private readonly customFormsRepo = new CustomFormsRepository(),
  ) {}

  /** The BEZENT system forms plus this company's own custom forms (key/name/description only). */
  async listForms(
    tenantId: string,
    companyId: string,
  ): Promise<Pick<SystemFormDefinition, 'key' | 'name' | 'description'>[]> {
    const customForms = await this.customFormsRepo.list(tenantId, companyId);
    return [
      ...listSystemForms(),
      ...customForms.map((f) => ({
        key: f.formKey,
        name: f.name,
        description: f.description ?? '',
      })),
    ];
  }

  /**
   * Creates a new, fully company-defined form shell. Its sections and fields
   * are added afterwards through the same builder (Add Section/Add Field),
   * stored the same way a system form's own custom additions already are.
   */
  async createForm(
    tenantId: string,
    companyId: string,
    name: unknown,
    description: unknown,
  ): Promise<Pick<SystemFormDefinition, 'key' | 'name' | 'description'>> {
    if (typeof name !== 'string' || !name.trim()) {
      throw new ValidationError('Validation failed', { name: 'Form name is required' });
    }
    const trimmedName = name.trim();
    if (trimmedName.length > MAX_FORM_NAME_LENGTH) {
      throw new ValidationError('Validation failed', {
        name: `Form name must be at most ${MAX_FORM_NAME_LENGTH} characters`,
      });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      throw new ValidationError('Validation failed', { description: 'Description must be text' });
    }
    const trimmedDescription =
      typeof description === 'string' && description.trim() ? description.trim() : null;
    if (trimmedDescription && trimmedDescription.length > MAX_FORM_DESCRIPTION_LENGTH) {
      throw new ValidationError('Validation failed', {
        description: `Description must be at most ${MAX_FORM_DESCRIPTION_LENGTH} characters`,
      });
    }

    const formKey = `custom-${randomBytes(8).toString('hex')}`;
    const created = await this.customFormsRepo.create(
      tenantId,
      companyId,
      formKey,
      trimmedName,
      trimmedDescription,
    );
    return { key: created.formKey, name: created.name, description: created.description ?? '' };
  }

  private async requireForm(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<SystemFormDefinition> {
    const systemForm = getSystemForm(formKey);
    if (systemForm) return systemForm;

    const customForm = await this.customFormsRepo.getByKey(tenantId, companyId, formKey);
    if (!customForm) throw new NotFoundError(`Form '${formKey}' not found`);
    return {
      key: customForm.formKey,
      name: customForm.name,
      description: customForm.description ?? '',
      kind: 'custom',
      status: 'active',
      // Entirely company-defined: every section and field is added through the
      // builder's custom-section/custom-field mechanism (metadata.customSections
      // + form_custom_fields), the same path a system form's own additions use.
      sections: [],
    };
  }

  /** The company's resolved form: system definition + company overrides + custom fields. */
  async getResolvedForm(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<ResolvedForm> {
    const form = await this.requireForm(tenantId, companyId, formKey);
    const state = await this.repo.getCustomizationState(tenantId, companyId, form.key);
    return resolveForm(form, state);
  }

  /** The company's stored overrides and custom fields. */
  async getOverrides(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<FormOverridesDto> {
    const form = await this.requireForm(tenantId, companyId, formKey);
    const state = await this.repo.getCustomizationState(tenantId, companyId, form.key);
    return {
      formKey: form.key,
      version: state.version,
      fields: state.overrides
        .map((override) => ({ ...override, updatedAt: new Date().toISOString() }))
        .sort((a, b) => a.fieldKey.localeCompare(b.fieldKey)),
      customFields: state.customFields
        .map((custom) => ({ ...custom, updatedAt: new Date().toISOString() }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  /**
   * Saves the listed fields' settings (unlisted fields are untouched). Each
   * property equal to the system default is stored as `null` (inherit), and a
   * field with nothing left to override loses its row — so later changes to
   * BEZENT defaults still reach the company.
   */
  async updateOverrides(
    tenantId: string,
    companyId: string,
    formKey: string,
    input: unknown,
  ): Promise<ResolvedForm> {
    const form = await this.requireForm(tenantId, companyId, formKey);
    const dto = validateUpdateFormOverrides(form, input);
    const fieldsByKey = indexSystemFields(form);

    const upserts: FormFieldOverrideValues[] = [];
    const resetKeys: string[] = [];
    for (const setting of dto.fields) {
      const { field } = fieldsByKey.get(setting.key)!;
      const enabled = setting.enabled === field.defaultEnabled ? null : setting.enabled;
      const required = setting.required === field.defaultRequired ? null : setting.required;
      if (enabled === null && required === null) resetKeys.push(setting.key);
      else
        upserts.push({
          fieldKey: setting.key,
          enabled,
          required,
          label: null,
          description: null,
          width: null,
          sortOrder: null,
        });
    }

    await this.repo.saveFieldOverrides(tenantId, companyId, form.key, upserts, resetKeys);
    return this.getResolvedForm(tenantId, companyId, form.key);
  }

  /**
   * Saves the complete editor state (overrides, ordering, width, custom fields)
   * in one atomic transaction with optimistic concurrency.
   */
  async saveFormDefinition(
    tenantId: string,
    companyId: string,
    formKey: string,
    input: unknown,
  ): Promise<ResolvedForm> {
    const form = await this.requireForm(tenantId, companyId, formKey);
    const dto = validateSaveFormDefinition(form, input);
    await this.repo.saveFormDefinition(tenantId, companyId, form, dto);
    return this.getResolvedForm(tenantId, companyId, form.key);
  }

  async publishForm(
    tenantId: string,
    companyId: string,
    formKey: string,
    user?: { name?: string; email?: string },
  ): Promise<{ version: number; snapshot: ResolvedForm }> {
    const form = await this.requireForm(tenantId, companyId, formKey);
    const resolved = await this.getResolvedForm(tenantId, companyId, form.key);
    const state = await this.repo.getCustomizationState(tenantId, companyId, form.key);

    const currentPublished = state.metadata?.intakeConfig?.publishedVersion ?? 0;
    const nextPublishedVersion = currentPublished + 1;
    const now = new Date().toISOString();
    const publishedBy = user?.name || user?.email || 'HR Administrator';

    const currentConfig: CandidateIntakeConfig = {
      formName: state.metadata?.intakeConfig?.formName || form.name,
      formDescription: state.metadata?.intakeConfig?.formDescription || form.description,
      hrManualEntryEnabled: state.metadata?.intakeConfig?.hrManualEntryEnabled ?? true,
      candidateSelfServiceEnabled:
        state.metadata?.intakeConfig?.candidateSelfServiceEnabled ?? true,
      allowSaveDraft: state.metadata?.intakeConfig?.allowSaveDraft ?? true,
      candidateEditingAfterSubmission:
        state.metadata?.intakeConfig?.candidateEditingAfterSubmission ?? false,
      status: 'published',
      publishedVersion: nextPublishedVersion,
      publishedAt: now,
      publishedBy,
    };

    const versionSnapshot: FormVersionSnapshot = {
      version: nextPublishedVersion,
      publishedAt: now,
      publishedBy,
      config: currentConfig,
      snapshot: resolved,
    };

    const nextMetadata: FormCustomizationMetadata = {
      ...(state.metadata || {}),
      intakeConfig: currentConfig,
      publishedSnapshots: {
        ...(state.metadata?.publishedSnapshots || {}),
        [nextPublishedVersion]: versionSnapshot,
      },
    };

    await this.repo.updateMetadata(tenantId, companyId, form.key, nextMetadata);
    return {
      version: nextPublishedVersion,
      snapshot: resolved,
    };
  }

  async getFormVersions(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<FormVersionSnapshot[]> {
    const form = await this.requireForm(tenantId, companyId, formKey);
    const state = await this.repo.getCustomizationState(tenantId, companyId, form.key);
    const snapshots = state.metadata?.publishedSnapshots ?? {};
    return Object.values(snapshots).sort((a, b) => b.version - a.version);
  }
}
