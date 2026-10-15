import { appConfig } from '../../../app/config/env';
import { authorizedFetch } from '../../../platform/auth';
import type {
  DepartmentRecord,
  DepartmentFilterParams,
} from '../../company-admin/organization/types/department';
import type {
  WorkLocationRecord,
  ListWorkLocationsFilters,
} from '../../company-admin/organization/types/workLocation';

export type WorkLocationFilterParams = ListWorkLocationsFilters;
export type { DepartmentRecord, DepartmentFilterParams, WorkLocationRecord };

/**
 * Organization masters (departments, designations, locations) from the real API — no fallback.
 * Used by HRMS onboarding, employee registration, employee directory, and document modules.
 */
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
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/organization/masters`);
  let body: { data?: OrganizationMasters; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    if (res.status === 403) {
      throw new Error(
        body?.error?.message ??
          'Access denied: You do not have permission to view organization masters in HRMS (403 Forbidden).',
      );
    }
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

/**
 * Fetch departments using authorized HRMS organization read API
 */
export async function fetchHrmsDepartments(
  filters: DepartmentFilterParams = {},
): Promise<DepartmentRecord[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.businessUnitId) query.set('businessUnitId', filters.businessUnitId);
  if (filters.divisionId) query.set('divisionId', filters.divisionId);
  if (filters.parentDepartmentId) query.set('parentDepartmentId', filters.parentDepartmentId);
  if (filters.search) query.set('search', filters.search);

  const qs = query.toString();
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/departments${qs ? `?${qs}` : ''}`,
  );

  let body: { data?: DepartmentRecord[]; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.data) {
    if (res.status === 403) {
      throw new Error(
        body?.error?.message ??
          'Access denied: You do not have permission to view departments in HRMS (403 Forbidden).',
      );
    }
    throw new Error(body?.error?.message ?? `Failed to fetch departments: ${res.status}`);
  }
  return body.data;
}

/**
 * Fetch work locations using authorized HRMS organization read API
 */
export async function fetchHrmsWorkLocations(
  filters: WorkLocationFilterParams = {},
): Promise<WorkLocationRecord[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.locationType) query.set('locationType', filters.locationType);
  if (filters.search) query.set('search', filters.search);

  const qs = query.toString();
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/work-locations${qs ? `?${qs}` : ''}`,
  );

  let body: { data?: WorkLocationRecord[]; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.data) {
    if (res.status === 403) {
      throw new Error(
        body?.error?.message ??
          'Access denied: You do not have permission to view work locations in HRMS (403 Forbidden).',
      );
    }
    throw new Error(body?.error?.message ?? `Failed to fetch work locations: ${res.status}`);
  }
  return body.data;
}

// Aliases for compatibility
export const fetchDepartments = fetchHrmsDepartments;
export const fetchWorkLocations = fetchHrmsWorkLocations;
