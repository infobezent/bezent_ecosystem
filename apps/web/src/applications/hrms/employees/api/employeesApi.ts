import { appConfig } from '../../../../app/config/env';

/**
 * Employees API client — canonical HRMS employee records (Employee ≠ User ≠
 * Candidate). Every call hits the real backend; failures surface as
 * `EmployeesApiError`, never as fallback data.
 */

export type SourceOfHire =
  'direct_applicant' | 'referral' | 'agency' | 'campus' | 'linkedin' | 'other';
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
  sourceOfHire: SourceOfHire | null;
  noticePeriodDays: number | null;
  contractEndDate: string | null;
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

// ---------------------------------------------------------------------------
// Canonical Employee Profile (current record + employee-owned details)
// ---------------------------------------------------------------------------

export interface PersonalDetails {
  middleName: string | null;
  preferredName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  nationality: string | null;
  nativeLanguage: string | null;
  fatherName: string | null;
  guardianName: string | null;
  personalEmail: string | null;
  homePhone: string | null;
  businessPhone: string | null;
  workPhone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressDistrict: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth: string | null;
  phone: string | null;
}

export interface Nominee {
  id: string;
  name: string;
  relationship: string;
  sharePercentage: number;
}

export interface EmergencyContact {
  id: string;
  priority: 'primary' | 'secondary';
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  address: string | null;
  isPrivate: boolean;
}

export interface BankAccount {
  accountHolderName: string;
  /** The API never returns the full account number. */
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
  branchName: string | null;
  bankLocation: string | null;
}

export interface Skill {
  id: string;
  skillName: string;
  skillType: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  level: string | null;
  assessedOn: string | null;
  yearsOfExperience: number | null;
  examinerEmployeeId: string | null;
  verifiedByEmployeeId: string | null;
  mentorEmployeeId: string | null;
  examinerName: string | null;
  verifiedByName: string | null;
  mentorName: string | null;
}

export interface WorkSchedule {
  workingCalendar: string | null;
  workSchedule: string | null;
  workingDays: string[];
  startTime: string;
  endTime: string;
  breakMinutes: number;
  lunchMinutes: number;
  timeZone: string | null;
}

export interface EmployeeProfile {
  employee: EmployeeRecord;
  personal: PersonalDetails | null;
  familyMembers: FamilyMember[];
  nominees: Nominee[];
  emergencyContacts: EmergencyContact[];
  bankAccount: BankAccount | null;
  skills: Skill[];
  workSchedule: WorkSchedule | null;
}

export async function fetchEmployeeProfile(id: string): Promise<EmployeeProfile> {
  const body = await request<{ data: EmployeeProfile }>(
    `/hrms/employees/${encodeURIComponent(id)}/profile`,
  );
  return body.data;
}
