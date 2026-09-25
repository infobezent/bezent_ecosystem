import { appConfig } from '../../../../app/config/env';

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

export async function fetchOrganizationMasters(): Promise<OrganizationMasters> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/organization/masters`);
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
