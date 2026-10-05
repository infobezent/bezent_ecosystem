import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  WorkLocationRecord,
  CreateWorkLocationPayload,
  UpdateWorkLocationPayload,
  WorkLocationStatus,
  ListWorkLocationsFilters,
  WorkLocationLifecycleResult,
} from '../types/workLocation';

export async function fetchWorkLocations(
  filters: ListWorkLocationsFilters = {},
): Promise<WorkLocationRecord[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.locationType) query.set('locationType', filters.locationType);
  if (filters.search) query.set('search', filters.search);

  const qs = query.toString();
  const querySuffix = qs ? `?${qs}` : '';
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/work-locations${querySuffix}`,
  );

  let body: { data?: WorkLocationRecord[]; error?: { message?: string } } | null = null;
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

export async function fetchWorkLocationById(id: string): Promise<WorkLocationRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/work-locations/${encodedId}`,
  );

  let body: { data?: WorkLocationRecord; error?: { message?: string } } | null = null;
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

export async function createWorkLocation(
  payload: CreateWorkLocationPayload,
): Promise<WorkLocationRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/work-locations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  let body: { data?: WorkLocationRecord; error?: { message?: string } } | null = null;
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

export async function updateWorkLocation(
  id: string,
  payload: UpdateWorkLocationPayload,
): Promise<WorkLocationRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/work-locations/${encodedId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  let body: { data?: WorkLocationRecord; error?: { message?: string } } | null = null;
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

export async function setWorkLocationStatus(
  id: string,
  status: WorkLocationStatus,
): Promise<WorkLocationRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/work-locations/${encodedId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );

  let body: { data?: WorkLocationRecord; error?: { message?: string } } | null = null;
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

export async function deactivateWorkLocation(
  id: string,
): Promise<WorkLocationLifecycleResult> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/work-locations/${encodedId}/deactivate`,
    {
      method: 'POST',
    },
  );

  let body: {
    data?: WorkLocationRecord;
    affectedEmployeeCount?: number;
    message?: string;
    error?: { message?: string };
  } | null = null;

  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }

  return {
    data: body.data,
    affectedEmployeeCount: body.affectedEmployeeCount ?? 0,
    message: body.message ?? 'Work location deactivated successfully.',
  };
}

export async function reactivateWorkLocation(
  id: string,
): Promise<WorkLocationLifecycleResult> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/work-locations/${encodedId}/reactivate`,
    {
      method: 'POST',
    },
  );

  let body: {
    data?: WorkLocationRecord;
    affectedEmployeeCount?: number;
    message?: string;
    error?: { message?: string };
  } | null = null;

  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }

  return {
    data: body.data,
    affectedEmployeeCount: body.affectedEmployeeCount ?? 0,
    message: body.message ?? 'Work location reactivated successfully.',
  };
}
