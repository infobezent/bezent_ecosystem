import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import {
  formCustomizations,
  formCustomFields,
  formFieldOverrides,
  type FormFieldOverride,
} from '../../../../../db/schema.js';
import { ConflictError } from '../../../../../app/errors/AppError.js';
import type {
  CustomFieldDefinition,
  FormCustomizationState,
  FormFieldConfig,
  FormFieldOverrideValues,
  SaveFormDefinitionDto,
  SystemFormDefinition,
} from '../types/form.types.js';

/** Company form field overrides and custom fields; every query is tenant/company/form scoped. */
export class FormOverridesRepository {
  async listFieldOverrides(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<FormFieldOverride[]> {
    return getDb()
      .select()
      .from(formFieldOverrides)
      .where(
        and(
          eq(formFieldOverrides.tenantId, tenantId),
          eq(formFieldOverrides.companyId, companyId),
          eq(formFieldOverrides.formKey, formKey),
        ),
      );
  }

  async getCustomizationState(
    tenantId: string,
    companyId: string,
    formKey: string,
  ): Promise<FormCustomizationState> {
    const db = getDb();
    const [customization] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, formKey),
        ),
      );

    const overridesRows = await db
      .select()
      .from(formFieldOverrides)
      .where(
        and(
          eq(formFieldOverrides.tenantId, tenantId),
          eq(formFieldOverrides.companyId, companyId),
          eq(formFieldOverrides.formKey, formKey),
        ),
      );

    const customFieldsRows = await db
      .select()
      .from(formCustomFields)
      .where(
        and(
          eq(formCustomFields.tenantId, tenantId),
          eq(formCustomFields.companyId, companyId),
          eq(formCustomFields.formKey, formKey),
        ),
      );

    return {
      version: customization?.version ?? 0,
      overrides: overridesRows.map((r) => ({
        fieldKey: r.fieldKey,
        enabled: r.isEnabled,
        required: r.isRequired,
        label: r.label,
        description: r.description,
        width: r.width,
        sortOrder: r.sortOrder,
      })),
      customFields: customFieldsRows.map((r) => ({
        key: r.fieldKey,
        sectionKey: r.sectionKey,
        type: r.fieldType,
        label: r.label,
        description: r.description,
        enabled: r.isEnabled,
        required: r.isRequired,
        width: r.width,
        sortOrder: r.sortOrder,
        config: r.config as FormFieldConfig,
      })),
    };
  }

  /**
   * Applies an editor save in one atomic transaction with optimistic concurrency.
   */
  async saveFormDefinition(
    tenantId: string,
    companyId: string,
    form: SystemFormDefinition,
    dto: SaveFormDefinitionDto,
  ): Promise<void> {
    await getDb().transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(formCustomizations)
        .where(
          and(
            eq(formCustomizations.tenantId, tenantId),
            eq(formCustomizations.companyId, companyId),
            eq(formCustomizations.formKey, form.key),
          ),
        );

      const currentVersion = existing?.version ?? 0;
      if (currentVersion !== dto.version) {
        throw new ConflictError(
          `Form was modified by another session (expected version ${dto.version}, but current version is ${currentVersion})`,
          'CONCURRENCY_CONFLICT',
        );
      }

      if (existing) {
        await tx
          .update(formCustomizations)
          .set({ version: currentVersion + 1 })
          .where(eq(formCustomizations.id, existing.id));
      } else {
        await tx.insert(formCustomizations).values({
          id: `fc_${randomUUID()}`,
          tenantId,
          companyId,
          formKey: form.key,
          version: 1,
        });
      }

      const overridesToInsert: {
        id: string;
        tenantId: string;
        companyId: string;
        formKey: string;
        fieldKey: string;
        isEnabled: boolean | null;
        isRequired: boolean | null;
        label: string | null;
        description: string | null;
        width: 'half' | 'full' | null;
        sortOrder: number | null;
      }[] = [];

      const customFieldsToInsert: {
        id: string;
        tenantId: string;
        companyId: string;
        formKey: string;
        fieldKey: string;
        sectionKey: string;
        fieldType: CustomFieldDefinition['type'];
        label: string;
        description: string | null;
        isEnabled: boolean;
        isRequired: boolean;
        width: 'half' | 'full';
        sortOrder: number;
        config: Record<string, unknown>;
      }[] = [];

      for (const sectionInput of dto.sections) {
        const sysSection = form.sections.find((s) => s.key === sectionInput.key);
        if (!sysSection) continue;

        sectionInput.fields.forEach((fieldInput, idx) => {
          const position = idx + 1;
          if (fieldInput.origin === 'system') {
            const sysIndex = sysSection.fields.findIndex((f) => f.key === fieldInput.key);
            const sysField = sysIndex >= 0 ? sysSection.fields[sysIndex] : undefined;
            if (!sysField) return;

            const enabled = fieldInput.enabled === sysField.defaultEnabled ? null : fieldInput.enabled;
            const required =
              fieldInput.required === sysField.defaultRequired ? null : fieldInput.required;
            const label = fieldInput.label === sysField.label ? null : fieldInput.label;
            const description =
              fieldInput.description === (sysField.description ?? null) ? null : fieldInput.description;
            const width = fieldInput.width === sysField.width ? null : fieldInput.width;
            const isPositionOverridden = idx !== sysIndex;
            const sortOrder = isPositionOverridden ? position : null;

            if (
              enabled !== null ||
              required !== null ||
              label !== null ||
              description !== null ||
              width !== null ||
              sortOrder !== null
            ) {
              overridesToInsert.push({
                id: `ffo_${randomUUID()}`,
                tenantId,
                companyId,
                formKey: form.key,
                fieldKey: fieldInput.key,
                isEnabled: enabled,
                isRequired: required,
                label,
                description,
                width,
                sortOrder: position, // preserve explicit order in section
              });
            }
          } else {
            customFieldsToInsert.push({
              id: `fcf_${randomUUID()}`,
              tenantId,
              companyId,
              formKey: form.key,
              fieldKey: fieldInput.key,
              sectionKey: sectionInput.key,
              fieldType: fieldInput.type!,
              label: fieldInput.label,
              description: fieldInput.description,
              isEnabled: fieldInput.enabled,
              isRequired: fieldInput.required,
              width: fieldInput.width,
              sortOrder: position,
              config: (fieldInput.config as Record<string, unknown>) ?? {},
            });
          }
        });
      }

      await tx
        .delete(formFieldOverrides)
        .where(
          and(
            eq(formFieldOverrides.tenantId, tenantId),
            eq(formFieldOverrides.companyId, companyId),
            eq(formFieldOverrides.formKey, form.key),
          ),
        );

      if (overridesToInsert.length > 0) {
        await tx.insert(formFieldOverrides).values(overridesToInsert);
      }

      await tx
        .delete(formCustomFields)
        .where(
          and(
            eq(formCustomFields.tenantId, tenantId),
            eq(formCustomFields.companyId, companyId),
            eq(formCustomFields.formKey, form.key),
          ),
        );

      if (customFieldsToInsert.length > 0) {
        await tx.insert(formCustomFields).values(customFieldsToInsert);
      }
    });
  }

  /**
   * Applies a settings change in one transaction: `upserts` become (or update)
   * overrides; `resetKeys` return to the system default by removing their row.
   */
  async saveFieldOverrides(
    tenantId: string,
    companyId: string,
    formKey: string,
    upserts: FormFieldOverrideValues[],
    resetKeys: string[],
  ): Promise<void> {
    await getDb().transaction(async (tx) => {
      if (resetKeys.length > 0) {
        await tx
          .delete(formFieldOverrides)
          .where(
            and(
              eq(formFieldOverrides.tenantId, tenantId),
              eq(formFieldOverrides.companyId, companyId),
              eq(formFieldOverrides.formKey, formKey),
              inArray(formFieldOverrides.fieldKey, resetKeys),
            ),
          );
      }
      for (const override of upserts) {
        await tx
          .insert(formFieldOverrides)
          .values({
            id: `ffo_${randomUUID()}`,
            tenantId,
            companyId,
            formKey,
            fieldKey: override.fieldKey,
            isEnabled: override.enabled,
            isRequired: override.required,
            label: override.label,
            description: override.description,
            width: override.width,
            sortOrder: override.sortOrder,
          })
          .onDuplicateKeyUpdate({
            set: {
              isEnabled: override.enabled,
              isRequired: override.required,
              label: override.label,
              description: override.description,
              width: override.width,
              sortOrder: override.sortOrder,
            },
          });
      }
    });
  }
}
