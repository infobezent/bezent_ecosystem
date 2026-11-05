import { appConfig } from '../../../../../app/config/env';
import { authorizedFetch } from '../../../../../platform/auth';
import type {
  LeaveTypeItem,
  LeaveTypesListResponse,
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  LeaveTypeStatusChangeResponse,
} from '../types/leaveTypes.types';

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    throw new Error(message);
  }
  const json = await res.json();
  return json.data as T;
}

export async function fetchLeaveTypes(params?: {
  search?: string;
  status?: string;
  category?: string;
  paidClassification?: string;
  page?: number;
  limit?: number;
}): Promise<LeaveTypesListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.category && params.category !== 'all') query.set('category', params.category);
  if (params?.paidClassification && params.paidClassification !== 'all') {
    query.set('paidClassification', params.paidClassification);
  }
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/leave/types${qs ? `?${qs}` : ''}`;

  const res = await authorizedFetch(url);
  return handleResponse<LeaveTypesListResponse>(res, 'Failed to fetch leave types');
}

export async function fetchLeaveTypeById(id: string): Promise<LeaveTypeItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/types/${id}`);
  return handleResponse<LeaveTypeItem>(res, 'Failed to fetch leave type details');
}

export async function createLeaveType(dto: CreateLeaveTypeDto): Promise<LeaveTypeItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<LeaveTypeItem>(res, 'Failed to create leave type');
}

export async function updateLeaveType(id: string, dto: UpdateLeaveTypeDto): Promise<LeaveTypeItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<LeaveTypeItem>(res, 'Failed to update leave type');
}

export async function changeLeaveTypeStatus(
  id: string,
  isActive: boolean,
): Promise<LeaveTypeStatusChangeResponse> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/leave/types/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  return handleResponse<LeaveTypeStatusChangeResponse>(res, 'Failed to update leave type status');
}
