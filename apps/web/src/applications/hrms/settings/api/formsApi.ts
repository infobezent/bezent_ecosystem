import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

/**
 * Form Engine API — a company's resolved form (BEZENT system definition +
 * company overrides + custom fields). Real backend only; failures are surfaced,
 * never replaced with local defaults. See docs/architecture/FORM-ENGINE.md.
 */

export type FormKind = 'system' | 'custom';
export type FormStatus = 'active';
export type FormElementOrigin = 'system' | 'custom';

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
export type FormFieldType = CustomFieldType | 'reference' | 'text' | 'select';

export const FORM_FIELD_WIDTHS = ['half', 'full'] as const;
export type FormFieldWidth = (typeof FORM_FIELD_WIDTHS)[number];

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldConfig {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  decimalPlaces?: number;
  options?: FormFieldOption[];
  defaultValue?: string;
  disallowPast?: boolean;
  disallowFuture?: boolean;
  maxSizeMb?: number;
  entity?: 'employee';
  groupKey?: string;
}

export interface ResolvedFormField {
  key: string;
  type: FormFieldType;
  label: string;
  description: string | null;
  origin: FormElementOrigin;
  protected: boolean;
  protectedReason: string | null;
  configurable: boolean;
  enabled: boolean;
  required: boolean;
  order: number;
  width: FormFieldWidth;
  config: FormFieldConfig;
  defaults: { label: string; enabled: boolean; required: boolean; width: FormFieldWidth } | null;
  overridden: boolean;
}

export interface FormCustomizationSectionMeta {
  title?: string;
  description?: string;
  visible?: boolean;
  order?: number;
}

export interface CustomSectionDefinition {
  key: string;
  title: string;
  description?: string | null;
  visible?: boolean;
  order?: number;
}

export interface FormCustomizationMetadata {
  sections?: Record<string, FormCustomizationSectionMeta>;
  subgroups?: Record<string, { title?: string; description?: string }>;
  fieldSubgroups?: Record<string, string>;
  customSections?: CustomSectionDefinition[];
  sectionOrder?: string[];
}

export interface ResolvedFormSection {
  key: string;
  label: string;
  description?: string | null;
  order: number;
  origin: FormElementOrigin;
  configurable: boolean;
  visible?: boolean;
  protected?: boolean;
  fields: ResolvedFormField[];
}

export interface ResolvedForm {
  form: {
    key: string;
    name: string;
    description: string;
    kind: FormKind;
    status: FormStatus;
    version: number;
    metadata?: FormCustomizationMetadata;
  };
  sections: ResolvedFormSection[];
}

/** Legacy Phase 1 toggle inputs for backward compatibility. */
export interface FormFieldSettingInput {
  key: string;
  enabled: boolean;
  required: boolean;
}

export interface FormFieldInput {
  key: string;
  origin: FormElementOrigin;
  label: string;
  description: string | null;
  enabled: boolean;
  required: boolean;
  width: FormFieldWidth;
  type?: CustomFieldType;
  config?: FormFieldConfig;
}

export interface FormSectionInput {
  key: string;
  label?: string;
  description?: string | null;
  visible?: boolean;
  order?: number;
  fields: FormFieldInput[];
}

export interface SaveFormDefinitionDto {
  version: number;
  metadata?: FormCustomizationMetadata;
  sections: FormSectionInput[];
}

export class FormsApiError extends Error {
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(message: string, status: number, details?: Record<string, string>) {
    super(message);
    this.name = 'FormsApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/settings/forms/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const error = (
      body as { error?: { message?: string; details?: Record<string, string> } } | null
    )?.error;
    throw new FormsApiError(
      error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      error?.details,
    );
  }
  return (body as { data: T }).data;
}

export function fetchResolvedForm(formKey: string): Promise<ResolvedForm> {
  return request<ResolvedForm>(encodeURIComponent(formKey));
}

/** Legacy Phase 1: Saves the listed fields' settings; returns the newly resolved form. */
export function saveFormOverrides(
  formKey: string,
  fields: FormFieldSettingInput[],
): Promise<ResolvedForm> {
  return request<ResolvedForm>(`${encodeURIComponent(formKey)}/overrides`, {
    method: 'PUT',
    body: JSON.stringify({ fields }),
  });
}

/** Phase 2: Saves the full form definition with optimistic concurrency; returns the newly resolved form. */
export function saveFormDefinition(
  formKey: string,
  dto: SaveFormDefinitionDto,
): Promise<ResolvedForm> {
  return request<ResolvedForm>(encodeURIComponent(formKey), {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}
