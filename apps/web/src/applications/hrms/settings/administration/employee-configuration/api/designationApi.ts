import { appConfig } from '../../../../../../app/config/env';
import { authorizedFetch } from '../../../../../../platform/auth';
import type {
  DesignationRecord,
  CreateDesignationPayload,
  UpdateDesignationPayload,
  DesignationStatus,
  ListDesignationsFilters,
} from '../types/designation';

export async function fetchDesignations(
  filters: ListDesignationsFilters = {},
): Promise<DesignationRecord[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.departmentId) query.set('departmentId', filters.departmentId);
  if (filters.eligibleForDepartmentId) query.set('eligibleForDepartmentId', filters.eligibleForDepartmentId);
  if (filters.search) query.set('search', filters.search);
  if (filters.limit) query.set('limit', String(filters.limit));
  if (filters.offset) query.set('offset', String(filters.offset));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/organization/designations${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);

  let body: { data?: DesignationRecord[]; error?: { message?: string } } | null = null;
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

export async function fetchDesignationById(id: string): Promise<DesignationRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/designations/${encodeURIComponent(id)}`,
  );
  let body: { data?: DesignationRecord; error?: { message?: string } } | null = null;
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

export async function createDesignation(
  payload: CreateDesignationPayload,
): Promise<DesignationRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/designations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: DesignationRecord; error?: { message?: string } } | null = null;
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

export async function updateDesignation(
  id: string,
  payload: UpdateDesignationPayload,
): Promise<DesignationRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/designations/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: {
    data?: DesignationRecord;
    error?: { message?: string; details?: { code?: string } };
  } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    const err = new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
    if (body?.error?.details?.code) {
      (err as unknown as { code: string }).code = body.error.details.code;
    }
    throw err;
  }
  return body.data;
}

export async function setDesignationStatus(
  id: string,
  status: DesignationStatus,
): Promise<DesignationRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/designations/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  let body: { data?: DesignationRecord; error?: { message?: string } } | null = null;
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

export async function deactivateDesignation(
  id: string,
): Promise<{ designation: DesignationRecord; affectedEmployeeCount: number; message: string }> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/designations/${encodeURIComponent(id)}/deactivate`,
    {
      method: 'POST',
    },
  );
  let body: {
    data?: DesignationRecord;
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
    designation: body.data,
    affectedEmployeeCount: body.affectedEmployeeCount ?? 0,
    message: body.message ?? 'Designation deactivated successfully.',
  };
}

export async function reactivateDesignation(
  id: string,
): Promise<{ designation: DesignationRecord; message: string }> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/designations/${encodeURIComponent(id)}/reactivate`,
    {
      method: 'POST',
    },
  );
  let body: {
    data?: DesignationRecord;
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
    designation: body.data,
    message: body.message ?? 'Designation reactivated successfully.',
  };
}
