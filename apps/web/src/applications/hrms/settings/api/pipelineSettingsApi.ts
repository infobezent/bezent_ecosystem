import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  OnboardingPipeline,
  CreatePipelineDto,
  UpdatePipelineDto,
  PipelineStageConfig,
  PipelineAssignmentRule,
} from '../types/pipeline.types';

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

export async function fetchPipelines(): Promise<OnboardingPipeline[]> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipelines`);
  return handleResponse<OnboardingPipeline[]>(res, 'Failed to fetch onboarding pipelines');
}

export async function getPipeline(pipelineId: string): Promise<OnboardingPipeline> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipelines/${encodeURIComponent(pipelineId)}`,
  );
  return handleResponse<OnboardingPipeline>(res, 'Failed to fetch pipeline details');
}

export async function createPipeline(payload: CreatePipelineDto): Promise<OnboardingPipeline> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipelines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<OnboardingPipeline>(res, 'Failed to create pipeline');
}

export async function updatePipeline(
  pipelineId: string,
  payload: UpdatePipelineDto,
): Promise<OnboardingPipeline> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipelines/${encodeURIComponent(pipelineId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<OnboardingPipeline>(res, 'Failed to update pipeline');
}

export async function savePipelineStages(
  pipelineId: string,
  stages: PipelineStageConfig[],
): Promise<OnboardingPipeline> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipelines/${encodeURIComponent(pipelineId)}/stages`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages }),
    },
  );
  return handleResponse<OnboardingPipeline>(res, 'Failed to save pipeline stages');
}

export async function duplicatePipeline(pipelineId: string): Promise<OnboardingPipeline> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipelines/${encodeURIComponent(pipelineId)}/duplicate`,
    {
      method: 'POST',
    },
  );
  return handleResponse<OnboardingPipeline>(res, 'Failed to duplicate pipeline');
}

export async function deletePipeline(pipelineId: string): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipelines/${encodeURIComponent(pipelineId)}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || 'Failed to delete pipeline';
    throw new Error(message);
  }
}

export async function fetchPipelineRules(): Promise<PipelineAssignmentRule[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipeline-rules`,
  );
  return handleResponse<PipelineAssignmentRule[]>(res, 'Failed to fetch pipeline assignment rules');
}

export async function savePipelineRules(
  rules: Omit<PipelineAssignmentRule, 'tenantId' | 'companyId' | 'createdAt' | 'updatedAt'>[],
): Promise<PipelineAssignmentRule[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/pipeline-rules`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    },
  );
  return handleResponse<PipelineAssignmentRule[]>(res, 'Failed to save pipeline assignment rules');
}
