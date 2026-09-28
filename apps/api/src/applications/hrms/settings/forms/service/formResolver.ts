import type {
  CustomFieldDefinition,
  FormCustomizationState,
  FormFieldOverrideValues,
  ResolvedForm,
  ResolvedFormField,
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

  return {
    form: {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      kind: definition.kind,
      status: definition.status,
      version: state.version,
    },
    sections: definition.sections.map((section, sectionIndex) => ({
      key: section.key,
      label: section.label,
      order: sectionIndex + 1,
      origin: 'system',
      configurable: section.configurable,
      fields: resolveSectionFields(section, overridesByKey, state.customFields).map(
        (field, index) => ({ ...field, order: index + 1 }),
      ),
    })),
  };
}

type Positioned = { field: Omit<ResolvedFormField, 'order'>; position: number | null; tie: number };

function resolveSectionFields(
  section: SystemSectionDefinition,
  overridesByKey: ReadonlyMap<string, FormFieldOverrideValues>,
  customFields: readonly CustomFieldDefinition[],
): Omit<ResolvedFormField, 'order'>[] {
  if (!section.configurable) {
    return section.fields.map((field) => resolveSystemField(field, undefined, false));
  }

  const items: Positioned[] = [
    ...section.fields.map((field, index) => {
      const override = overridesByKey.get(field.key);
      return {
        field: resolveSystemField(field, override, true),
        position: override?.sortOrder ?? null,
        tie: index,
      };
    }),
    ...customFields
      .filter((custom) => custom.sectionKey === section.key)
      .map((custom) => ({
        field: resolveCustomField(custom),
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
): Omit<ResolvedFormField, 'order'> {
  const enabled = field.protected ? true : (override?.enabled ?? field.defaultEnabled);
  const required = field.protected
    ? true
    : enabled && (override?.required ?? field.defaultRequired);

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
    config: field.config,
    defaults: {
      label: field.label,
      enabled: field.defaultEnabled,
      required: field.defaultRequired,
      width: field.width,
    },
    overridden: Boolean(override),
  };
}

function resolveCustomField(custom: CustomFieldDefinition): Omit<ResolvedFormField, 'order'> {
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
    config: custom.config,
    defaults: null,
    overridden: false,
  };
}
