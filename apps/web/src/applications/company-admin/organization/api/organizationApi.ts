import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  OrganizationProfile,
  UpdateOrganizationProfilePayload,
} from '../types/organization';

export type { OrganizationProfile, UpdateOrganizationProfilePayload };

export async function fetchOrganizationProfile(): Promise<OrganizationProfile> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/profile`,
  );
  let body: { data?: OrganizationProfile; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function updateOrganizationProfile(
  payload: UpdateOrganizationProfilePayload,
): Promise<OrganizationProfile> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/profile`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: {
    data?: OrganizationProfile;
    error?: { message?: string; details?: Record<string, string> };
  } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}
