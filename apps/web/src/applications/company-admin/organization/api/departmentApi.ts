import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  DepartmentRecord,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  DepartmentStatus,
  DepartmentFilterParams,
} from '../types/department';

export async function fetchDepartments(
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
    `${appConfig.apiBaseUrl}/company-admin/organization/departments${qs ? `?${qs}` : ''}`,
  );

  let body: { data?: DepartmentRecord[]; error?: { message?: string } } | null = null;
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

export async function fetchDepartmentById(id: string): Promise<DepartmentRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/departments/${encodedId}`,
  );

  let body: { data?: DepartmentRecord; error?: { message?: string } } | null = null;
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

export async function createDepartment(
  payload: CreateDepartmentPayload,
): Promise<DepartmentRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/departments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  let body: { data?: DepartmentRecord; error?: { message?: string } } | null = null;
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

export async function updateDepartment(
  id: string,
  payload: UpdateDepartmentPayload,
): Promise<DepartmentRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/departments/${encodedId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  let body: { data?: DepartmentRecord; error?: { message?: string } } | null = null;
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

export async function setDepartmentStatus(
  id: string,
  status: DepartmentStatus,
): Promise<DepartmentRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/departments/${encodedId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );

  let body: { data?: DepartmentRecord; error?: { message?: string } } | null = null;
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

export async function deactivateDepartment(
  id: string,
): Promise<{ department: DepartmentRecord; message?: string }> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/departments/${encodedId}/deactivate`,
    {
      method: 'POST',
    },
  );

  let body: { data?: DepartmentRecord; message?: string; error?: { message?: string } } | null =
    null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return { department: body.data, message: body.message };
}

export async function reactivateDepartment(
  id: string,
): Promise<{ department: DepartmentRecord; message?: string }> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/departments/${encodedId}/reactivate`,
    {
      method: 'POST',
    },
  );

  let body: { data?: DepartmentRecord; message?: string; error?: { message?: string } } | null =
    null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return { department: body.data, message: body.message };
}
