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
  'website',
  'toggle_switch',
  'image_upload',
  'signature',
  'address',
  'full_name',
  'govt_id',
  'rating',
  'slider',
  'tags',
  'divider',
  'info_banner',
  'terms_consent',
  'calculated',
  'matrix_grid',
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
  placeholder?: string;
  disallowPast?: boolean;
  disallowFuture?: boolean;
  maxSizeMb?: number;
  entity?: 'employee';
  groupKey?: string;
  readOnly?: boolean;
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

export interface CandidateIntakeConfig {
  formName: string;
  formDescription: string;
  hrManualEntryEnabled: boolean;
  candidateSelfServiceEnabled: boolean;
  allowSaveDraft: boolean;
  candidateEditingAfterSubmission: boolean;
  status: 'draft' | 'published' | 'disabled';
  publishedVersion: number;
  publishedAt?: string;
  publishedBy?: string;
}

export type ConditionalOperator =
  'equals' | 'not_equals' | 'is_empty' | 'is_not_empty' | 'contains';

export interface ConditionalRule {
  targetFieldKey: string;
  operator: ConditionalOperator;
  value?: unknown;
  action: 'show' | 'hide';
}

export interface FieldPermissionRule {
  visibility: 'both' | 'hr_only' | 'candidate_only';
  candidateEditable: boolean;
  hrEditable: boolean;
  readOnly: boolean;
}

export interface FieldValidationRule {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedExtensions?: string[];
  maxSizeMb?: number;
}

export interface FormVersionSnapshot {
  version: number;
  publishedAt: string;
  publishedBy?: string;
  config: CandidateIntakeConfig;
  snapshot: ResolvedForm;
}

export interface FormCustomizationMetadata {
  sections?: Record<string, FormCustomizationSectionMeta>;
  subgroups?: Record<string, { title?: string; description?: string }>;
  fieldSubgroups?: Record<string, string>;
  customSections?: CustomSectionDefinition[];
  sectionOrder?: string[];
  intakeConfig?: CandidateIntakeConfig;
  publishedSnapshots?: Record<number, FormVersionSnapshot>;
  fieldRules?: Record<string, ConditionalRule[]>;
  fieldPermissions?: Record<string, FieldPermissionRule>;
  fieldValidation?: Record<string, FieldValidationRule>;
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
  type?: FormFieldType;
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

export interface SystemFormSummary {
  key: string;
  name: string;
  description: string;
}

/** The registry of BEZENT system forms plus this company's own custom forms. */
export function fetchFormsList(): Promise<SystemFormSummary[]> {
  return request<SystemFormSummary[]>('');
}

/** Creates a new, fully company-defined form shell; add its sections/fields in the builder next. */
export function createForm(name: string, description?: string): Promise<SystemFormSummary> {
  return request<SystemFormSummary>('', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
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

/** Publishes the current draft configuration as a new immutable version snapshot. */
export function publishForm(formKey: string): Promise<{ version: number; snapshot: ResolvedForm }> {
  return request<{ version: number; snapshot: ResolvedForm }>(
    `${encodeURIComponent(formKey)}/publish`,
    {
      method: 'POST',
    },
  );
}

/** Retrieves the list of immutable published version snapshots for a form. */
export function fetchFormVersions(formKey: string): Promise<FormVersionSnapshot[]> {
  return request<FormVersionSnapshot[]>(`${encodeURIComponent(formKey)}/versions`);
}

/** Candidate Intake Workflow API */
export async function submitCandidateManualEntry(payload: Record<string, unknown>): Promise<any> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/candidate-intake/manual-entry`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to submit manual candidate entry');
  }
  return (await res.json()).data;
}

export async function inviteCandidateIntake(payload: Record<string, unknown>): Promise<any> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/candidate-intake/invite`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to send candidate invitation');
  }
  return (await res.json()).data;
}

export async function approveCandidateIntakeCase(caseId: string): Promise<any> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/candidate-intake/${caseId}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to approve candidate intake submission');
  }
  return (await res.json()).data;
}

export async function requestCandidateChanges(caseId: string, notes: string): Promise<any> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/candidate-intake/${caseId}/request-changes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to request candidate changes');
  }
  return (await res.json()).data;
}
