import { NotFoundError } from '../../../../../app/errors/AppError.js';
import { FormOverridesRepository } from '../repository/formOverrides.repository.js';
import { getSystemForm, indexSystemFields } from '../definitions/systemForms.js';
import { resolveForm } from './formResolver.js';
import { validateUpdateFormOverrides } from '../validation/formOverrides.schema.js';
import { validateSaveFormDefinition } from '../validation/formDefinition.schema.js';
import type {
  FormFieldOverrideValues,
  FormOverridesDto,
  ResolvedForm,
  SystemFormDefinition,
} from '../types/form.types.js';

export class FormsService {
  constructor(private readonly repo = new FormOverridesRepository()) {}

  private requireForm(formKey: string): SystemFormDefinition {
    const form = getSystemForm(formKey);
    if (!form) throw new NotFoundError(`Form '${formKey}' not found`);
    return form;
  }

  /** The company's resolved form: system definition + company overrides + custom fields. */
  async getResolvedForm(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<ResolvedForm> {
    const form = this.requireForm(formKey);
    const state = await this.repo.getCustomizationState(tenantId, companyId, form.key);
    return resolveForm(form, state);
  }

  /** The company's stored overrides and custom fields. */
  async getOverrides(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<FormOverridesDto> {
    const form = this.requireForm(formKey);
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
    const form = this.requireForm(formKey);
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
    const form = this.requireForm(formKey);
    const dto = validateSaveFormDefinition(form, input);
    await this.repo.saveFormDefinition(tenantId, companyId, form, dto);
    return this.getResolvedForm(tenantId, companyId, form.key);
  }
}
