import type {
  CustomFieldDefinition,
  FormCustomizationState,
  FormFieldOverrideValues,
  ResolvedForm,
  ResolvedFormField,
  ResolvedFormSection,
  SystemFieldDefinition,
  SystemFormDefinition,
  SystemSectionDefinition,
} from '../types/form.types.js';

/**
 * The Form Engine resolver — the single place a form's effective definition
 * is computed:
 *
 *   system definition + company field overrides + company custom fields
 *     = resolved form
 *
 * - Iterates the SYSTEM definition, so a section or field BEZENT adds later
 *   appears for every company, whatever the company customised.
 * - Overrides and custom fields apply only in configurable sections; custom
 *   fields of unknown / non-configurable sections and overrides of fields no
 *   longer defined are ignored (never resurrected).
 * - Protected fields always resolve enabled + required, whatever is stored.
 * - An override property of `null` inherits the system definition.
 * - A disabled field is never required.
 * - Field order within a configurable section: fields with a stored position
 *   (sort order) first, by position; then system fields without one (e.g.
 *   added by a later BEZENT release) in definition order.
 * - Section order is the system definition's (fixed for system forms).
 */
const MANDATORY_SYSTEM_SECTIONS = new Set(['general', 'personal', 'online_access', 'review']);

export function resolveForm(
  definition: SystemFormDefinition,
  customization: FormCustomizationState | FormFieldOverrideValues[] = {
    version: 0,
    overrides: [],
    customFields: [],
  },
): ResolvedForm {
  const state: FormCustomizationState = Array.isArray(customization)
    ? { version: 0, overrides: customization, customFields: [] }
    : customization;
  const overridesByKey = new Map(state.overrides.map((o) => [o.fieldKey, o]));

  // 1. Resolve system sections
  const systemResolved: ResolvedFormSection[] = definition.sections.map((section, sectionIndex) => {
    const sectionMeta = state.metadata?.sections?.[section.key];
    const isProtected = MANDATORY_SYSTEM_SECTIONS.has(section.key);
    const visible = isProtected ? true : sectionMeta?.visible !== false;
    return {
      key: section.key,
      label: sectionMeta?.title || section.label,
      description:
        sectionMeta?.description !== undefined
          ? sectionMeta.description
          : (section.description ?? null),
      order: sectionIndex + 1,
      origin: 'system' as const,
      configurable: section.configurable,
      visible,
      protected: isProtected,
      fields: resolveSectionFields(section, overridesByKey, state.customFields, state.metadata).map(
        (field, index) => ({ ...field, order: index + 1 }),
      ),
    };
  });

  // 2. Resolve custom sections from metadata
  const customSectionsMeta = state.metadata?.customSections ?? [];
  const customResolved: ResolvedFormSection[] = customSectionsMeta.map((cs, csIndex) => {
    const sectionMeta = state.metadata?.sections?.[cs.key];
    const visible = sectionMeta?.visible !== undefined ? sectionMeta.visible : cs.visible !== false;
    const customFieldsForSection = state.customFields
      .filter((custom) => custom.sectionKey === cs.key)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((custom) => resolveCustomField(custom, state.metadata))
      .map((field, index) => ({ ...field, order: index + 1 }));

    return {
      key: cs.key,
      label: sectionMeta?.title || cs.title,
      description:
        sectionMeta?.description !== undefined ? sectionMeta.description : (cs.description ?? null),
      order: systemResolved.length + csIndex + 1,
      origin: 'custom' as const,
      configurable: true,
      visible,
      protected: false,
      fields: customFieldsForSection,
    };
  });

  // 3. Combine and apply section ordering if specified
  const allSections = [...systemResolved, ...customResolved];
  let orderedSections = allSections;
  const sectionOrder = state.metadata?.sectionOrder;
  if (Array.isArray(sectionOrder) && sectionOrder.length > 0) {
    const orderIndex = new Map(sectionOrder.map((key, i) => [key, i]));
    orderedSections = [...allSections].sort((a, b) => {
      const idxA = orderIndex.has(a.key) ? orderIndex.get(a.key)! : 9999;
      const idxB = orderIndex.has(b.key) ? orderIndex.get(b.key)! : 9999;
      return idxA - idxB;
    });
  }

  const finalSections = orderedSections.map((sec, idx) => ({
    ...sec,
    order: idx + 1,
  }));

  return {
    form: {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      kind: definition.kind,
      status: definition.status,
      version: state.version,
      metadata: state.metadata,
    },
    sections: finalSections,
  };
}

type Positioned = { field: Omit<ResolvedFormField, 'order'>; position: number | null; tie: number };

function resolveSectionFields(
  section: SystemSectionDefinition,
  overridesByKey: ReadonlyMap<string, FormFieldOverrideValues>,
  customFields: readonly CustomFieldDefinition[],
  metadata?: FormCustomizationState['metadata'],
): Omit<ResolvedFormField, 'order'>[] {
  if (!section.configurable) {
    return section.fields.map((field) => resolveSystemField(field, undefined, false, metadata));
  }

  const items: Positioned[] = [
    ...section.fields.map((field, index) => {
      const override = overridesByKey.get(field.key);
      return {
        field: resolveSystemField(field, override, true, metadata),
        position: override?.sortOrder ?? null,
        tie: index,
      };
    }),
    ...customFields
      .filter((custom) => custom.sectionKey === section.key)
      .map((custom) => ({
        field: resolveCustomField(custom, metadata),
        position: custom.sortOrder,
        tie: section.fields.length,
      })),
  ];

  const positioned = items
    .filter((item) => item.position !== null)
    .sort((a, b) => a.position! - b.position! || a.tie - b.tie);
  const unpositioned = items.filter((item) => item.position === null);
  return [...positioned, ...unpositioned].map((item) => item.field);
}

function resolveSystemField(
  field: SystemFieldDefinition,
  override: FormFieldOverrideValues | undefined,
  configurable: boolean,
  metadata?: FormCustomizationState['metadata'],
): Omit<ResolvedFormField, 'order'> {
  const enabled = field.protected ? true : (override?.enabled ?? field.defaultEnabled);
  const required = field.protected
    ? true
    : enabled && (override?.required ?? field.defaultRequired);

  const fieldSubgroup = metadata?.fieldSubgroups?.[field.key];
  const config = fieldSubgroup ? { ...field.config, groupKey: fieldSubgroup } : field.config;

  return {
    key: field.key,
    type: field.type,
    label: override?.label ?? field.label,
    description: override?.description ?? field.description ?? null,
    origin: 'system',
    protected: field.protected,
    protectedReason: field.protectedReason ?? null,
    configurable,
    enabled,
    required,
    width: override?.width ?? field.width,
    config,
    defaults: {
      label: field.label,
      enabled: field.defaultEnabled,
      required: field.defaultRequired,
      width: field.width,
    },
    overridden: Boolean(override),
  };
}

function resolveCustomField(
  custom: CustomFieldDefinition,
  metadata?: FormCustomizationState['metadata'],
): Omit<ResolvedFormField, 'order'> {
  const fieldSubgroup = metadata?.fieldSubgroups?.[custom.key];
  const config = fieldSubgroup ? { ...custom.config, groupKey: fieldSubgroup } : custom.config;

  return {
    key: custom.key,
    type: custom.type,
    label: custom.label,
    description: custom.description,
    origin: 'custom',
    protected: false,
    protectedReason: null,
    configurable: true,
    enabled: custom.enabled,
    required: custom.enabled && custom.required,
    width: custom.width,
    config,
    defaults: null,
    overridden: false,
  };
}
