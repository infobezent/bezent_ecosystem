import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  OnboardingGeneralSettingsConfig,
  UpdateOnboardingGeneralSettingsConfigDto,
} from '../types/onboardingGeneralSettings.types';

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
 * Fetches the current general settings configuration
 */
export async function fetchGeneralConfig(): Promise<OnboardingGeneralSettingsConfig> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/general-config`,
  );
  return handleResponse<OnboardingGeneralSettingsConfig>(
    res,
    'Failed to fetch general settings',
  );
}

/**
 * Updates general settings configuration
 */
export async function updateGeneralConfig(
  dto: UpdateOnboardingGeneralSettingsConfigDto,
): Promise<OnboardingGeneralSettingsConfig> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/general-config`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    },
  );
  return handleResponse<OnboardingGeneralSettingsConfig>(
    res,
    'Failed to save general settings',
  );
}

/**
 * Resets general settings configuration to system defaults
 */
export async function resetGeneralConfig(): Promise<OnboardingGeneralSettingsConfig> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/general-config/reset`,
    {
      method: 'POST',
    },
  );
  return handleResponse<OnboardingGeneralSettingsConfig>(
    res,
    'Failed to reset general settings',
  );
}
