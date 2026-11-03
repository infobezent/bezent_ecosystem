import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

const API_BASE = `${appConfig.apiBaseUrl}/api/v1/hrms`;

export interface FrontendShift {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  workingDays: string[];
  breakMinutes: number;
  lunchMinutes: number;
  graceMinutes: number;
  isOvernight: boolean;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftInput {
  name: string;
  code: string;
  description?: string;
  startTime: string;
  endTime: string;
  workingDays: string[];
  breakMinutes?: number;
  lunchMinutes?: number;
  graceMinutes?: number;
  color?: string;
  isActive?: boolean;
}

export type UpdateShiftInput = Partial<CreateShiftInput>;

export interface FrontendShiftAssignment {
  id: string;
  tenantId: string;
  companyId: string;
  shiftId: string;
  assignmentScope: 'employee' | 'department' | 'location';
  employeeId?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
  isActive: boolean;
  notes?: string | null;
  shiftName: string;
  shiftCode: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftIsOvernight: boolean;
  targetName: string;
  targetCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftAssignmentInput {
  shiftId: string;
  assignmentScope: 'employee' | 'department' | 'location';
  targetId: string;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
  notes?: string;
}

export interface ResolvedShiftResult {
  shift: FrontendShift | null;
  resolutionSource:
    'employee' | 'department' | 'location' | 'auto_allocated' | 'legacy_schedule' | 'default_shift';
  date: string;
  schedule: {
    workingDays: string[];
    startTime: string;
    endTime: string;
    breakMinutes: number;
    lunchMinutes: number;
    scheduleRef: string;
    graceMinutes?: number;
    isOvernight?: boolean;
  };
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let errMessage = fallbackMessage;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errMessage = errJson.error.message;
      } else if (errJson?.message) {
        errMessage = errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

// -----------------------------------------------------------------------------
// Shift Definitions
// -----------------------------------------------------------------------------

export async function fetchShifts(params?: {
  status?: 'all' | 'active' | 'inactive';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: FrontendShift[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const res = await authorizedFetch(`${API_BASE}/shifts${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new Error('Failed to fetch shifts');
  }
  const json = await res.json();
  return {
    items: json.data ?? [],
    total: json.pagination?.total ?? json.data?.length ?? 0,
  };
}

export async function fetchShiftById(id: string): Promise<FrontendShift> {
  const res = await authorizedFetch(`${API_BASE}/shifts/${encodeURIComponent(id)}`);
  return handleResponse<FrontendShift>(res, 'Failed to fetch shift');
}

export async function createShift(dto: CreateShiftInput): Promise<FrontendShift> {
  const res = await authorizedFetch(`${API_BASE}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<FrontendShift>(res, 'Failed to create shift');
}

export async function updateShift(id: string, dto: UpdateShiftInput): Promise<FrontendShift> {
  const res = await authorizedFetch(`${API_BASE}/shifts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<FrontendShift>(res, 'Failed to update shift');
}

export async function setShiftStatus(id: string, isActive: boolean): Promise<FrontendShift> {
  const res = await authorizedFetch(`${API_BASE}/shifts/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  return handleResponse<FrontendShift>(res, 'Failed to update shift status');
}

export async function deleteShift(id: string): Promise<{ success: boolean }> {
  const res = await authorizedFetch(`${API_BASE}/shifts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(res, 'Failed to delete shift');
}

// -----------------------------------------------------------------------------
// Shift Assignments
// -----------------------------------------------------------------------------

export async function fetchShiftAssignments(params?: {
  scope?: string;
  shiftId?: string;
  status?: string;
  effectiveDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: FrontendShiftAssignment[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.scope && params.scope !== 'all') query.set('scope', params.scope);
  if (params?.shiftId) query.set('shiftId', params.shiftId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.effectiveDate) query.set('effectiveDate', params.effectiveDate);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const res = await authorizedFetch(`${API_BASE}/shift-assignments${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new Error('Failed to fetch shift assignments');
  }
  const json = await res.json();
  return {
    items: json.data ?? [],
    total: json.pagination?.total ?? json.data?.length ?? 0,
  };
}

export async function createShiftAssignment(
  dto: CreateShiftAssignmentInput,
): Promise<FrontendShiftAssignment> {
  const res = await authorizedFetch(`${API_BASE}/shift-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<FrontendShiftAssignment>(res, 'Failed to create shift assignment');
}

export async function endShiftAssignment(
  id: string,
  effectiveEndDate: string,
  notes?: string,
): Promise<FrontendShiftAssignment> {
  const res = await authorizedFetch(`${API_BASE}/shift-assignments/${encodeURIComponent(id)}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ effectiveEndDate, notes }),
  });
  return handleResponse<FrontendShiftAssignment>(res, 'Failed to end shift assignment');
}

export async function deleteShiftAssignment(id: string): Promise<{ success: boolean }> {
  const res = await authorizedFetch(`${API_BASE}/shift-assignments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(res, 'Failed to delete shift assignment');
}

export async function resolveEmployeeShift(
  employeeId: string,
  date?: string,
): Promise<ResolvedShiftResult> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await authorizedFetch(
    `${API_BASE}/shifts/employee/${encodeURIComponent(employeeId)}${query}`,
  );
  return handleResponse<ResolvedShiftResult>(res, 'Failed to resolve employee shift');
}
