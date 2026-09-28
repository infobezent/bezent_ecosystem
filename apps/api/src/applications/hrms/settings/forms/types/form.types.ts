/**
 * Form Engine types. See docs/architecture/FORM-ENGINE.md.
 *
 *   system definition (code)
 *     + company field overrides + company custom fields (DB)
 *     = resolved form
 *
 * Every form, section and field has a stable key. Keys are opaque identifiers:
 * a field key such as `personal.firstName` names the field, not its location,
 * and never changes once shipped (company data references it).
 */

/** SYSTEM forms are defined by BEZENT; CUSTOM forms (later) are company-owned. */
export type FormKind = 'system' | 'custom';
export type FormStatus = 'active';
/** Who defines a section/field: BEZENT (system) or the company (custom). */
export type FormElementOrigin = 'system' | 'custom';

/** Field types a company may add as custom fields. */
export const CUSTOM_FIELD_TYPES = [
  'single_line',
  'multi_line',
  'email',
  'phone',
  'number',
  'decimal',
  'dropdown',
  'radio',
  'checkbox',
  'multi_select',
  'date',
  'time',
  'datetime',
  'file_upload',
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
/** `reference` (a link to another record) exists on system fields only. */
export type FormFieldType = CustomFieldType | 'reference';

/** Layout width within a section's two-column grid. */
export const FORM_FIELD_WIDTHS = ['half', 'full'] as const;
export type FormFieldWidth = (typeof FORM_FIELD_WIDTHS)[number];

export interface FormFieldOption {
  /** Stable option value (stored with answers later) — never derived from the label. */
  value: string;
  label: string;
}

/**
 * Type-specific configuration. Only the keys relevant to a field's type are
 * allowed (enforced by validation). System fields render through their
 * dedicated components, so theirs is usually empty.
 */
export interface FormFieldConfig {
  /** single_line, multi_line */
  minLength?: number;
  maxLength?: number;
  /** number, decimal */
  min?: number;
  max?: number;
  /** decimal */
  decimalPlaces?: number;
  /** dropdown, radio, checkbox, multi_select */
  options?: FormFieldOption[];
  /** dropdown, radio: a value from `options` */
  defaultValue?: string;
  /** date, datetime */
  disallowPast?: boolean;
  disallowFuture?: boolean;
  /** file_upload */
  maxSizeMb?: number;
  /** reference (system fields only) */
  entity?: 'employee';
}

// ── System definitions (code) ──────────────────────────────────────────────

export interface SystemFieldDefinition {
  key: string;
  type: FormFieldType;
  label: string;
  description?: string;
  /**
   * Required by the owning domain (e.g. the employee record). Always enabled
   * and required; no company change can alter that.
   */
  protected: boolean;
  protectedReason?: string;
  defaultEnabled: boolean;
  defaultRequired: boolean;
  width: FormFieldWidth;
  config: FormFieldConfig;
}

export interface SystemSectionDefinition {
  key: string;
  label: string;
  /**
   * Companies may customise this section in the current release: override its
   * system fields, reorder them, and add custom fields. Section order itself
   * is fixed for system forms.
   */
  configurable: boolean;
  /** In display order. */
  fields: readonly SystemFieldDefinition[];
}

export interface SystemFormDefinition {
  key: string;
  name: string;
  description: string;
  kind: 'system';
  status: FormStatus;
  /** In display order (fixed). */
  sections: readonly SystemSectionDefinition[];
}

// ── Company customisation (DB) ─────────────────────────────────────────────

/** A company's override of one system field; `null` = inherit the system definition. */
export interface FormFieldOverrideValues {
  fieldKey: string;
  enabled: boolean | null;
  required: boolean | null;
  label: string | null;
  description: string | null;
  width: FormFieldWidth | null;
  sortOrder: number | null;
}

/** A company-owned custom field definition. */
export interface CustomFieldDefinition {
  key: string;
  sectionKey: string;
  type: CustomFieldType;
  label: string;
  description: string | null;
  enabled: boolean;
  required: boolean;
  width: FormFieldWidth;
  sortOrder: number;
  config: FormFieldConfig;
}

export interface FormCustomizationState {
  /** 0 when the company has never saved this form. */
  version: number;
  overrides: FormFieldOverrideValues[];
  customFields: CustomFieldDefinition[];
}

export interface FormOverridesDto {
  formKey: string;
  version: number;
  fields: (FormFieldOverrideValues & { updatedAt: string })[];
  customFields: (CustomFieldDefinition & { updatedAt: string })[];
}

/** Legacy Phase 1 toggle inputs for backward compatibility. */
export interface FormFieldSettingInput {
  key: string;
  enabled: boolean;
  required: boolean;
}

export interface UpdateFormOverridesDto {
  fields: FormFieldSettingInput[];
}

// ── Save request (editor → server) ─────────────────────────────────────────

/** A field as the editor wants it; position = index within its section. */
export interface FormFieldInput {
  key: string;
  origin: FormElementOrigin;
  label: string;
  description: string | null;
  enabled: boolean;
  required: boolean;
  width: FormFieldWidth;
  /** Custom fields only. */
  type?: CustomFieldType;
  /** Custom fields only. */
  config?: FormFieldConfig;
}

export interface FormSectionInput {
  key: string;
  fields: FormFieldInput[];
}

/**
 * Full desired state of the company's customisation: every configurable
 * section with its complete, ordered field list. Anything absent is removed
 * (custom fields) or returned to the system default (overrides).
 */
export interface SaveFormDefinitionDto {
  /** The version the editor loaded (optimistic concurrency). */
  version: number;
  sections: FormSectionInput[];
}

// ── Resolved form (API output) ─────────────────────────────────────────────

export interface ResolvedFormField {
  key: string;
  type: FormFieldType;
  label: string;
  description: string | null;
  origin: FormElementOrigin;
  protected: boolean;
  protectedReason: string | null;
  /** Its section is configurable (protected fields still accept no enabled/required change). */
  configurable: boolean;
  enabled: boolean;
  required: boolean;
  /** 1-based position within the section. */
  order: number;
  width: FormFieldWidth;
  config: FormFieldConfig;
  /** The system definition's values; `null` for custom fields (they have no system default). */
  defaults: { label: string; enabled: boolean; required: boolean; width: FormFieldWidth } | null;
  /** True when the company changed a system field (always false for custom fields). */
  overridden: boolean;
}

export interface ResolvedFormSection {
  key: string;
  label: string;
  /** 1-based position within the form. */
  order: number;
  origin: FormElementOrigin;
  configurable: boolean;
  fields: ResolvedFormField[];
}

export interface ResolvedForm {
  form: {
    key: string;
    name: string;
    description: string;
    kind: FormKind;
    status: FormStatus;
    /** The company's customisation version (0 = never saved); send it back when saving. */
    version: number;
  };
  sections: ResolvedFormSection[];
}
