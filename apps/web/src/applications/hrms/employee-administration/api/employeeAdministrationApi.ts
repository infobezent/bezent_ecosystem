import { appConfig } from '../../../../app/config/env';
import type { EmployeeRecord, PaginationMetadata } from '../../employees/api/employeesApi';

/**
 * Employee Administration API client. Every call hits the real backend and
 * surfaces failures as `EmployeeAdministrationApiError` — there is no mock or
 * cached fallback.
 */

// Canonical employee records and organization masters are owned by their own
// domains; re-exported here so Employee Administration keeps one import surface.
export type {
  EmployeeListResponse,
  EmployeeRecord,
  EmploymentStatus,
  EmploymentType,
  ListEmployeesQuery,
  PaginationMetadata,
} from '../../employees/api/employeesApi';
export { fetchEmployees } from '../../employees/api/employeesApi';
export type { MasterOption, OrganizationMasters } from '../../organization/api/organizationApi';
export { fetchOrganizationMasters } from '../../organization/api/organizationApi';

export type EmployeeActionType =
  | 'department_change'
  | 'designation_change'
  | 'reporting_manager_change'
  | 'employment_type_change'
  | 'confirm_employee'
  | 'extend_probation'
  | 'location_transfer'
  | 'employment_status_change'
  | 'resignation'
  | 'termination';

export type EmployeeActionCategory =
  'job_changes' | 'probation' | 'transfer' | 'employment_status' | 'separation';

export type EmployeeActionStatus = 'pending' | 'applied' | 'cancelled';

export type ChangeableEmployeeField =
  | 'departmentId'
  | 'designationId'
  | 'reportingManagerId'
  | 'locationId'
  | 'employmentType'
  | 'employmentStatus'
  | 'probationEndDate'
  | 'confirmationDate'
  | 'lastWorkingDate';

export interface EmployeeFieldChange {
  field: ChangeableEmployeeField;
  from: string | null;
  to: string | null;
  fromLabel: string | null;
  toLabel: string | null;
}

export interface EmployeeActionListItem {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  actionType: EmployeeActionType;
  category: EmployeeActionCategory;
  status: EmployeeActionStatus;
  effectiveDate: string;
  reason: string;
  changes: EmployeeFieldChange[];
  requestDate: string | null;
  requestedBy: string | null;
  cancellationReason: string | null;
  appliedAt: string | null;
  cancelledAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeActionHistoryItem {
  id: string;
  event: 'created' | 'updated' | 'applied' | 'cancelled';
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  actor: string | null;
  createdAt: string;
}

export interface EmployeeActionDetail extends EmployeeActionListItem {
  employee: EmployeeRecord;
  history: EmployeeActionHistoryItem[];
}

export type ActionCategoryCounts = Record<'all' | EmployeeActionCategory, number>;

export interface EmployeeActionListResponse {
  data: EmployeeActionListItem[];
  pagination: PaginationMetadata;
  counts: ActionCategoryCounts;
}

export type ActionValueKey =
  | 'departmentId'
  | 'designationId'
  | 'reportingManagerId'
  | 'locationId'
  | 'employmentType'
  | 'employmentStatus'
  | 'probationEndDate'
  | 'requestDate'
  | 'lastWorkingDate';

export type EmployeeActionValues = Partial<Record<ActionValueKey, string>>;

export interface CreateEmployeeActionPayload {
  employeeId: string;
  actionType: EmployeeActionType;
  effectiveDate?: string;
  reason: string;
  values: EmployeeActionValues;
}

export interface ListEmployeeActionsQuery {
  category?: EmployeeActionCategory;
  status?: EmployeeActionStatus;
  employeeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class EmployeeAdministrationApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string>;

  constructor(message: string, status: number, code: string, details?: Record<string, string>) {
    super(message);
    this.name = 'EmployeeAdministrationApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { message?: string; code?: string; details?: Record<string, string> };
}

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const error = (body as ErrorBody | null)?.error;
    throw new EmployeeAdministrationApiError(
      error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.details,
    );
  }

  return body as T;
}

export async function fetchEmployeeActions(
  query: ListEmployeeActionsQuery = {},
): Promise<EmployeeActionListResponse> {
  return request<EmployeeActionListResponse>(`/hrms/employee-actions${toQueryString(query)}`);
}

export async function fetchEmployeeAction(id: string): Promise<EmployeeActionDetail> {
  const body = await request<{ data: EmployeeActionDetail }>(
    `/hrms/employee-actions/${encodeURIComponent(id)}`,
  );
  return body.data;
}

export async function createEmployeeAction(
  payload: CreateEmployeeActionPayload,
): Promise<EmployeeActionDetail> {
  const body = await request<{ data: EmployeeActionDetail }>('/hrms/employee-actions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data;
}

export async function applyEmployeeAction(
  id: string,
  version: number,
): Promise<EmployeeActionDetail> {
  const body = await request<{ data: EmployeeActionDetail }>(
    `/hrms/employee-actions/${encodeURIComponent(id)}/apply`,
    { method: 'POST', body: JSON.stringify({ version }) },
  );
  return body.data;
}

export async function cancelEmployeeAction(
  id: string,
  version: number,
  reason?: string,
): Promise<EmployeeActionDetail> {
  const body = await request<{ data: EmployeeActionDetail }>(
    `/hrms/employee-actions/${encodeURIComponent(id)}/cancel`,
    { method: 'POST', body: JSON.stringify({ version, reason: reason || undefined }) },
  );
  return body.data;
}
