import { appConfig } from '../../../../../../app/config/env';
import { authorizedFetch } from '../../../../../../platform/auth';
import type {
  Grade,
  CreateGradePayload,
  UpdateGradePayload,
  GradeStatus,
  ListGradesFilters,
  GradeLifecycleResult,
} from '../types/grade';

export async function fetchGrades(
  filters: ListGradesFilters = {},
): Promise<Grade[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.search) query.set('search', filters.search);
  if (filters.lookupOnly) query.set('lookupOnly', 'true');

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/organization/grades${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);

  let body: { data?: Grade[]; error?: { message?: string } } | null = null;
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

export async function fetchGradeById(id: string): Promise<Grade> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/grades/${encodeURIComponent(id)}`,
  );
  let body: { data?: Grade; error?: { message?: string } } | null = null;
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

export async function createGrade(
  payload: CreateGradePayload,
): Promise<Grade> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/grades`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: Grade; error?: { message?: string; details?: { code?: string } } } | null = null;
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

export async function updateGrade(
  id: string,
  payload: UpdateGradePayload,
): Promise<Grade> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/grades/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: Grade; error?: { message?: string; details?: { code?: string } } } | null = null;
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

export async function setGradeStatus(
  id: string,
  status: GradeStatus,
): Promise<GradeLifecycleResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/grades/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  let body: { data?: Grade; message?: string; error?: { message?: string } } | null = null;
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
    affectedEmployeeCount: 0,
    affectedDesignationCount: 0,
    message: body.message ?? 'Status updated successfully.',
  };
}

export async function deactivateGrade(
  id: string,
): Promise<GradeLifecycleResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/grades/${encodeURIComponent(id)}/deactivate`,
    {
      method: 'POST',
    },
  );
  let body: {
    data?: Grade;
    affectedEmployeeCount?: number;
    affectedDesignationCount?: number;
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
    affectedDesignationCount: body.affectedDesignationCount ?? 0,
    message: body.message ?? 'Grade deactivated successfully.',
  };
}

export async function reactivateGrade(
  id: string,
): Promise<GradeLifecycleResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/grades/${encodeURIComponent(id)}/reactivate`,
    {
      method: 'POST',
    },
  );
  let body: {
    data?: Grade;
    affectedEmployeeCount?: number;
    affectedDesignationCount?: number;
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
    affectedDesignationCount: body.affectedDesignationCount ?? 0,
    message: body.message ?? 'Grade reactivated successfully.',
  };
}
