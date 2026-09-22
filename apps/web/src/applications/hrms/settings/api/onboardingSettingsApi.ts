import { appConfig } from '../../../../app/config/env';
import type {
  OnboardingSettingsAggregate,
  OnboardingGeneralSettings,
  UpdateOnboardingGeneralSettingsDto,
  OnboardingStageConfig,
  UpdateOnboardingStageConfigDto,
  OnboardingFieldConfig,
  UpdateOnboardingFieldConfigDto,
  OnboardingDocumentRequirement,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
  OnboardingChecklistTemplate,
  CreateOnboardingChecklistTemplateDto,
  UpdateOnboardingChecklistTemplateDto,
  OnboardingConversionSettings,
  UpdateOnboardingConversionSettingsDto,
} from '../types/settings';

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    const details = errorJson.error?.details
      ? Object.values(errorJson.error.details).join(', ')
      : '';
    throw new Error(details ? `${message}: ${details}` : message);
  }
  const json = await res.json();
  return json.data as T;
}

// ==================== Aggregate & Initialization ====================

export async function fetchAggregateSettings(): Promise<OnboardingSettingsAggregate> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding`);
  return handleResponse<OnboardingSettingsAggregate>(res, 'Failed to load onboarding settings');
}

export async function initializeSettings(): Promise<OnboardingSettingsAggregate> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/initialize`, {
    method: 'POST',
  });
  return handleResponse<OnboardingSettingsAggregate>(res, 'Failed to initialize settings');
}

// ==================== General Settings ====================

export async function fetchGeneralSettings(): Promise<OnboardingGeneralSettings> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/general`);
  return handleResponse<OnboardingGeneralSettings>(res, 'Failed to load general settings');
}

export async function updateGeneralSettings(
  payload: UpdateOnboardingGeneralSettingsDto,
): Promise<OnboardingGeneralSettings> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/general`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<OnboardingGeneralSettings>(res, 'Failed to update general settings');
}

// ==================== Stage Configurations ====================

export async function fetchStageConfigs(): Promise<OnboardingStageConfig[]> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/stages`);
  return handleResponse<OnboardingStageConfig[]>(res, 'Failed to load stage configurations');
}

export async function updateStageConfig(
  stageKey: string,
  payload: UpdateOnboardingStageConfigDto,
): Promise<OnboardingStageConfig> {
  const res = await fetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/stages/${encodeURIComponent(stageKey)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<OnboardingStageConfig>(res, 'Failed to update stage configuration');
}

// ==================== Field Configurations ====================

export async function fetchFieldConfigs(): Promise<OnboardingFieldConfig[]> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/fields`);
  return handleResponse<OnboardingFieldConfig[]>(res, 'Failed to load field configurations');
}

export async function updateFieldConfig(
  fieldKey: string,
  payload: UpdateOnboardingFieldConfigDto,
): Promise<OnboardingFieldConfig> {
  const res = await fetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/fields/${encodeURIComponent(fieldKey)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<OnboardingFieldConfig>(res, 'Failed to update field configuration');
}

// ==================== Document Requirements ====================

export async function fetchDocumentRequirements(): Promise<OnboardingDocumentRequirement[]> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/documents`);
  return handleResponse<OnboardingDocumentRequirement[]>(
    res,
    'Failed to load document requirements',
  );
}

export async function createDocumentRequirement(
  payload: CreateOnboardingDocumentRequirementDto,
): Promise<OnboardingDocumentRequirement> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<OnboardingDocumentRequirement>(
    res,
    'Failed to create document requirement',
  );
}

export async function updateDocumentRequirement(
  id: string,
  payload: UpdateOnboardingDocumentRequirementDto,
): Promise<OnboardingDocumentRequirement> {
  const res = await fetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/documents/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<OnboardingDocumentRequirement>(
    res,
    'Failed to update document requirement',
  );
}

export async function deleteDocumentRequirement(id: string): Promise<void> {
  const res = await fetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/documents/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete document requirement');
  }
}

// ==================== Checklist Templates ====================

export async function fetchChecklistTemplates(
  stageKey?: string,
): Promise<OnboardingChecklistTemplate[]> {
  const url = stageKey
    ? `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklists?stageKey=${encodeURIComponent(stageKey)}`
    : `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklists`;
  const res = await fetch(url);
  return handleResponse<OnboardingChecklistTemplate[]>(res, 'Failed to load checklist templates');
}

export async function createChecklistTemplate(
  payload: CreateOnboardingChecklistTemplateDto,
): Promise<OnboardingChecklistTemplate> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<OnboardingChecklistTemplate>(res, 'Failed to create checklist template');
}

export async function updateChecklistTemplate(
  id: string,
  payload: UpdateOnboardingChecklistTemplateDto,
): Promise<OnboardingChecklistTemplate> {
  const res = await fetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklists/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<OnboardingChecklistTemplate>(res, 'Failed to update checklist template');
}

export async function deleteChecklistTemplate(id: string): Promise<void> {
  const res = await fetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklists/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete checklist template');
  }
}

// ==================== Conversion Settings ====================

export async function fetchConversionSettings(): Promise<OnboardingConversionSettings> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/conversion`);
  return handleResponse<OnboardingConversionSettings>(res, 'Failed to load conversion settings');
}

export async function updateConversionSettings(
  payload: UpdateOnboardingConversionSettingsDto,
): Promise<OnboardingConversionSettings> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/conversion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<OnboardingConversionSettings>(res, 'Failed to update conversion settings');
}
