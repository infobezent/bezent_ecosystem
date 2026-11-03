import { appConfig } from '../../../../../app/config/env';
import { authorizedFetch } from '../../../../../platform/auth';
import type {
  LeavePolicyItem,
  LeavePoliciesListResponse,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  PolicyStatus,
} from '../types/leavePolicies.types';

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    throw new Error(message);
  }
  const json = await res.json();
  return json.data as T;
}

export async function fetchLeavePolicies(params?: {
  search?: string;
  status?: string;
  scope?: string;
  page?: number;
  limit?: number;
}): Promise<LeavePoliciesListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.scope && params.scope !== 'all') query.set('scope', params.scope);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/leave/policies${qs ? `?${qs}` : ''}`;

  const res = await authorizedFetch(url);
  return handleResponse<LeavePoliciesListResponse>(res, 'Failed to fetch leave policies');
}

export async function fetchLeavePolicyById(id: string): Promise<LeavePolicyItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/policies/${id}`);
  return handleResponse<LeavePolicyItem>(res, 'Failed to fetch leave policy details');
}

export async function createLeavePolicy(dto: CreateLeavePolicyDto): Promise<LeavePolicyItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/policies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<LeavePolicyItem>(res, 'Failed to create leave policy');
}

export async function updateLeavePolicy(
  id: string,
  dto: UpdateLeavePolicyDto,
): Promise<LeavePolicyItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/policies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<LeavePolicyItem>(res, 'Failed to update leave policy');
}

export async function changeLeavePolicyStatus(
  id: string,
  status: PolicyStatus,
): Promise<{ policy: LeavePolicyItem; warning?: string }> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/policies/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse<{ policy: LeavePolicyItem; warning?: string }>(
    res,
    'Failed to update leave policy status',
  );
}
