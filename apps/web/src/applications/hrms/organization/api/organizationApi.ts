import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

/** Organization masters (departments, designations, locations) from the real API — no fallback. */

export interface MasterOption {
  id: string;
  name: string;
  code: string;
}

export interface OrganizationMasters {
  company: { id: string; name: string; code: string };
  departments: MasterOption[];
  designations: MasterOption[];
  locations: MasterOption[];
}

export interface OrganizationProfile {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  displayName: string | null;
  organizationType: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  primaryEmail: string | null;
  phoneNumber: string | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationProfilePayload {
  name: string;
  displayName?: string | null;
  organizationType: string;
  industry?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  primaryEmail: string;
  phoneNumber?: string | null;
  alternateEmail?: string | null;
  alternatePhone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  country: string;
  state: string;
  city: string;
  postalCode: string;
}

export async function fetchOrganizationMasters(): Promise<OrganizationMasters> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/organization/masters`);
  let body: { data?: OrganizationMasters; error?: { message?: string } } | null = null;
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

export async function fetchOrganizationProfile(): Promise<OrganizationProfile> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/organization/profile`);
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
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/organization/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
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

