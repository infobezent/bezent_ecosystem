import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  ChecklistTemplate,
  CreateChecklistTemplateDto,
  UpdateChecklistTemplateDto,
  SaveChecklistTasksDto,
  CandidateChecklistTaskInstance,
} from '../types/checklist.types';

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

export async function fetchChecklistTemplates(): Promise<ChecklistTemplate[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/templates`,
  );
  return handleResponse<ChecklistTemplate[]>(res, 'Failed to fetch checklist templates');
}

export async function getChecklistTemplate(templateId: string): Promise<ChecklistTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/templates/${encodeURIComponent(
      templateId,
    )}`,
  );
  return handleResponse<ChecklistTemplate>(res, 'Failed to fetch checklist template');
}

export async function createChecklistTemplate(
  payload: CreateChecklistTemplateDto,
): Promise<ChecklistTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/templates`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<ChecklistTemplate>(res, 'Failed to create checklist template');
}

export async function updateChecklistTemplate(
  templateId: string,
  payload: UpdateChecklistTemplateDto,
): Promise<ChecklistTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/templates/${encodeURIComponent(
      templateId,
    )}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<ChecklistTemplate>(res, 'Failed to update checklist template');
}

export async function duplicateChecklistTemplate(templateId: string): Promise<ChecklistTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/templates/${encodeURIComponent(
      templateId,
    )}/duplicate`,
    {
      method: 'POST',
    },
  );
  return handleResponse<ChecklistTemplate>(res, 'Failed to duplicate checklist template');
}

export async function deleteChecklistTemplate(templateId: string): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/templates/${encodeURIComponent(
      templateId,
    )}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete checklist template');
  }
}

export async function saveChecklistTasks(
  templateId: string,
  payload: SaveChecklistTasksDto,
): Promise<ChecklistTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/templates/${encodeURIComponent(
      templateId,
    )}/tasks`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<ChecklistTemplate>(res, 'Failed to save checklist tasks');
}

export async function generateCandidateChecklist(payload: {
  caseId: string;
  joiningDate: string;
  templateId?: string;
}): Promise<CandidateChecklistTaskInstance[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/checklist-builder/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<CandidateChecklistTaskInstance[]>(
    res,
    'Failed to generate candidate checklist',
  );
}
