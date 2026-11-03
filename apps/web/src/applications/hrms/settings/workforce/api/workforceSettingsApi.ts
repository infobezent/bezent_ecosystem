import { appConfig } from '../../../../../app/config/env';
import { authorizedFetch } from '../../../../../platform/auth';
import type {
  WorkforceSettingsBundle,
  WorkforceGeneralSettings,
  WorkforceEmploymentType,
  WorkforceProbationPolicy,
  WorkforceLifecyclePolicy,
  WorkforceOffboardingPolicy,
  WorkforceClearanceChecklistTemplate,
  FormattedNextIdResult,
  UpdateGeneralSettingsDto,
  CreateEmploymentTypeDto,
  UpdateEmploymentTypeDto,
  UpdateProbationPolicyDto,
  UpdateLifecyclePolicyDto,
  UpdateOffboardingPolicyDto,
  CreateClearanceTemplateDto,
} from '../types/workforceSettings.types';

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    throw new Error(message);
  }
  const json = await res.json();
  return json.data as T;
}

export async function fetchWorkforceSettingsBundle(): Promise<WorkforceSettingsBundle> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/workforce/settings`);
  return handleResponse<WorkforceSettingsBundle>(res, 'Failed to load workforce settings');
}

export async function updateGeneralSettings(
  dto: UpdateGeneralSettingsDto,
): Promise<WorkforceGeneralSettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/workforce/settings/general`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<WorkforceGeneralSettings>(res, 'Failed to update general settings');
}

export async function previewNextEmployeeId(): Promise<FormattedNextIdResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/general/preview-id`,
  );
  return handleResponse<FormattedNextIdResult>(res, 'Failed to preview next employee ID');
}

export async function reserveNextEmployeeId(): Promise<FormattedNextIdResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/general/reserve-id`,
    {
      method: 'POST',
    },
  );
  return handleResponse<FormattedNextIdResult>(res, 'Failed to reserve next employee ID');
}

export async function listEmploymentTypes(activeOnly?: boolean): Promise<WorkforceEmploymentType[]> {
  const url = activeOnly
    ? `${appConfig.apiBaseUrl}/hrms/workforce/settings/employment-types?activeOnly=true`
    : `${appConfig.apiBaseUrl}/hrms/workforce/settings/employment-types`;
  const res = await authorizedFetch(url);
  return handleResponse<WorkforceEmploymentType[]>(res, 'Failed to load employment types');
}

export async function createEmploymentType(
  dto: CreateEmploymentTypeDto,
): Promise<WorkforceEmploymentType> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/employment-types`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );
  return handleResponse<WorkforceEmploymentType>(res, 'Failed to create employment type');
}

export async function updateEmploymentType(
  id: string,
  dto: UpdateEmploymentTypeDto,
): Promise<WorkforceEmploymentType> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/employment-types/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );
  return handleResponse<WorkforceEmploymentType>(res, 'Failed to update employment type');
}

export async function deleteEmploymentType(id: string): Promise<boolean> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/employment-types/${id}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete employment type');
  }
  return true;
}

export async function updateProbationPolicy(
  dto: UpdateProbationPolicyDto,
): Promise<WorkforceProbationPolicy> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/workforce/settings/probation`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<WorkforceProbationPolicy>(res, 'Failed to update probation policy');
}

export async function updateLifecyclePolicy(
  dto: UpdateLifecyclePolicyDto,
): Promise<WorkforceLifecyclePolicy> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/workforce/settings/lifecycle`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<WorkforceLifecyclePolicy>(res, 'Failed to update lifecycle policy');
}

export async function updateOffboardingPolicy(
  dto: UpdateOffboardingPolicyDto,
): Promise<WorkforceOffboardingPolicy> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/workforce/settings/offboarding`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<WorkforceOffboardingPolicy>(res, 'Failed to update offboarding policy');
}

export async function listClearanceTemplates(
  department?: 'it' | 'admin' | 'finance' | 'hr',
): Promise<WorkforceClearanceChecklistTemplate[]> {
  const url = department
    ? `${appConfig.apiBaseUrl}/hrms/workforce/settings/clearance-templates?department=${department}`
    : `${appConfig.apiBaseUrl}/hrms/workforce/settings/clearance-templates`;
  const res = await authorizedFetch(url);
  return handleResponse<WorkforceClearanceChecklistTemplate[]>(
    res,
    'Failed to load clearance templates',
  );
}

export async function createClearanceTemplate(
  dto: CreateClearanceTemplateDto,
): Promise<WorkforceClearanceChecklistTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/clearance-templates`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );
  return handleResponse<WorkforceClearanceChecklistTemplate>(
    res,
    'Failed to create clearance template',
  );
}

export async function updateClearanceTemplate(
  id: string,
  dto: Partial<CreateClearanceTemplateDto>,
): Promise<WorkforceClearanceChecklistTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/clearance-templates/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );
  return handleResponse<WorkforceClearanceChecklistTemplate>(
    res,
    'Failed to update clearance template',
  );
}

export async function deleteClearanceTemplate(id: string): Promise<boolean> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/workforce/settings/clearance-templates/${id}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete clearance template');
  }
  return true;
}
