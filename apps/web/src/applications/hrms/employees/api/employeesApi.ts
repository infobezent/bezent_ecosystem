import { appConfig } from '../../../../app/config/env';

/**
 * Employees API client — canonical HRMS employee records (Employee ≠ User ≠
 * Candidate). Every call hits the real backend; failures surface as
 * `EmployeesApiError`, never as fallback data.
 */

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type EmploymentStatus =
  'active' | 'probation' | 'notice' | 'terminated' | 'suspended' | 'resigned';

export interface EmployeeRecord {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  locationId: string | null;
  locationName: string | null;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  joiningDate: string;
  probationEndDate: string | null;
  confirmationDate: string | null;
  lastWorkingDate: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface EmployeeListResponse {
  data: EmployeeRecord[];
  pagination: PaginationMetadata;
}

export interface ListEmployeesQuery {
  search?: string;
  departmentId?: string;
  locationId?: string;
  employmentStatus?: EmploymentStatus;
  page?: number;
  pageSize?: number;
}

export class EmployeesApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'EmployeesApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${appConfig.apiBaseUrl}${path}`);

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const error = (body as { error?: { message?: string; code?: string } } | null)?.error;
    throw new EmployeesApiError(
      error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      error?.code ?? 'REQUEST_FAILED',
    );
  }

  return body as T;
}

export async function fetchEmployees(
  query: ListEmployeesQuery = {},
): Promise<EmployeeListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return request<EmployeeListResponse>(`/hrms/employees${qs ? `?${qs}` : ''}`);
}

export async function fetchEmployee(id: string): Promise<EmployeeRecord> {
  const body = await request<{ data: EmployeeRecord }>(`/hrms/employees/${encodeURIComponent(id)}`);
  return body.data;
}
