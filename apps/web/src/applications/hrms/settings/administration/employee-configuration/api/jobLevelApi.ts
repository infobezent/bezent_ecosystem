import { appConfig } from '../../../../../../app/config/env';
import { authorizedFetch } from '../../../../../../platform/auth';
import type {
  JobLevel,
  CreateJobLevelPayload,
  UpdateJobLevelPayload,
  JobLevelStatus,
  ListJobLevelsFilters,
  JobLevelLifecycleResult,
} from '../types/jobLevel';

export async function fetchJobLevels(
  filters: ListJobLevelsFilters = {},
): Promise<JobLevel[]> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.search) query.set('search', filters.search);
  if (filters.lookupOnly) query.set('lookupOnly', 'true');

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/organization/job-levels${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);

  let body: { data?: JobLevel[]; error?: { message?: string } } | null = null;
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

export async function fetchJobLevelById(id: string): Promise<JobLevel> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/job-levels/${encodeURIComponent(id)}`,
  );
  let body: { data?: JobLevel; error?: { message?: string } } | null = null;
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

export async function createJobLevel(
  payload: CreateJobLevelPayload,
): Promise<JobLevel> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/job-levels`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: JobLevel; error?: { message?: string; details?: { code?: string } } } | null = null;
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

export async function updateJobLevel(
  id: string,
  payload: UpdateJobLevelPayload,
): Promise<JobLevel> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/job-levels/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: JobLevel; error?: { message?: string; details?: { code?: string } } } | null = null;
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

export async function setJobLevelStatus(
  id: string,
  status: JobLevelStatus,
): Promise<JobLevelLifecycleResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/job-levels/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  let body: { data?: JobLevel; message?: string; error?: { message?: string } } | null = null;
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

export async function deactivateJobLevel(
  id: string,
): Promise<JobLevelLifecycleResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/job-levels/${encodeURIComponent(id)}/deactivate`,
    {
      method: 'POST',
    },
  );
  let body: {
    data?: JobLevel;
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
    message: body.message ?? 'Job level deactivated successfully.',
  };
}

export async function reactivateJobLevel(
  id: string,
): Promise<JobLevelLifecycleResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/organization/job-levels/${encodeURIComponent(id)}/reactivate`,
    {
      method: 'POST',
    },
  );
  let body: {
    data?: JobLevel;
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
    message: body.message ?? 'Job level reactivated successfully.',
  };
}
