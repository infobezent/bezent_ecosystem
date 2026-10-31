import { appConfig } from '../../../../../app/config/env';
import { authorizedFetch } from '../../../../../platform/auth';
import type {
  LeaveGeneralSettingsResponse,
  LeaveGeneralSettingsVersion,
  UpdateLeaveGeneralSettingsDto,
} from '../types/settings.types';

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    throw new Error(message);
  }
  const json = await res.json();
  return json.data as T;
}

export async function fetchLeaveGeneralSettings(): Promise<LeaveGeneralSettingsResponse> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/settings/general`);
  return handleResponse<LeaveGeneralSettingsResponse>(res, 'Failed to load leave general settings');
}

export async function updateLeaveGeneralSettings(dto: UpdateLeaveGeneralSettingsDto): Promise<{
  settings: LeaveGeneralSettingsResponse['settings'];
  version: LeaveGeneralSettingsVersion;
}> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/settings/general`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<{
    settings: LeaveGeneralSettingsResponse['settings'];
    version: LeaveGeneralSettingsVersion;
  }>(res, 'Failed to update leave general settings');
}

export async function fetchLeaveSettingsVersions(): Promise<LeaveGeneralSettingsVersion[]> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/settings/general/versions`);
  return handleResponse<LeaveGeneralSettingsVersion[]>(
    res,
    'Failed to load leave settings versions',
  );
}
