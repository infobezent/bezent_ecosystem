import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  EmployeeConversionConfig,
  UpdateEmployeeConversionConfigDto,
  ConversionCandidatePreview,
  ExecuteConversionDto,
  ConversionResult,
} from '../types/employeeConversion.types';

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

/**
 * Fetches the current employee conversion configuration
 */
export async function fetchConversionConfig(): Promise<EmployeeConversionConfig> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/conversion-config`,
  );
  return handleResponse<EmployeeConversionConfig>(res, 'Failed to fetch conversion settings');
}

/**
 * Updates conversion configuration
 */
export async function updateConversionConfig(
  dto: UpdateEmployeeConversionConfigDto,
): Promise<EmployeeConversionConfig> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/conversion-config`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );
  return handleResponse<EmployeeConversionConfig>(res, 'Failed to save conversion configuration');
}

/**
 * Resets conversion configuration to system defaults
 */
export async function resetConversionConfig(): Promise<EmployeeConversionConfig> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/conversion-config/reset`,
    {
      method: 'POST',
    },
  );
  return handleResponse<EmployeeConversionConfig>(res, 'Failed to reset conversion configuration');
}

/**
 * Evaluates candidate conversion readiness
 */
export async function fetchConversionPreview(caseId: string): Promise<ConversionCandidatePreview> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${caseId}/conversion-preview`,
  );
  return handleResponse<ConversionCandidatePreview>(res, 'Failed to evaluate conversion preview');
}

/**
 * Executes conversion of a candidate case to an employee
 */
export async function executeCandidateConversion(
  caseId: string,
  dto: ExecuteConversionDto = {},
): Promise<ConversionResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${caseId}/convert`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );
  return handleResponse<ConversionResult>(res, 'Failed to convert candidate to employee');
}

/**
 * Retries secondary post-conversion actions
 */
export async function retryConversionActions(caseId: string): Promise<ConversionResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${caseId}/conversion-retry`,
    {
      method: 'POST',
    },
  );
  return handleResponse<ConversionResult>(res, 'Failed to retry post-conversion actions');
}
