import { appConfig } from '../../../../app/config/env';

export interface CompanyMaster {
  id: string;
  name: string;
  code: string;
}

export interface DepartmentMaster {
  id: string;
  name: string;
  code: string;
}

export interface DesignationMaster {
  id: string;
  name: string;
  code: string;
}

export interface LocationMaster {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  country?: string | null;
}

export interface OrganizationMasters {
  company: CompanyMaster;
  departments: DepartmentMaster[];
  designations: DesignationMaster[];
  locations: LocationMaster[];
}

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type OnboardingStage = 'preboarding' | 'documents' | 'induction' | 'completed';
export type OnboardingStatus = 'draft' | 'active' | 'withdrawn' | 'completed';

export interface OnboardingCaseItem {
  id: string;
  tenantId: string;
  companyId: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  joiningDate: string;
  employmentType: EmploymentType;
  stage: OnboardingStage;
  status: OnboardingStatus;
  departmentId: string;
  departmentName?: string | null;
  designationId: string;
  designationName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateNewHirePayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  companyId: string;
  departmentId: string;
  designationId: string;
  locationId?: string;
  joiningDate: string;
  employmentType?: EmploymentType;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface StageCounts {
  all: number;
  preboarding: number;
  documents: number;
  completed: number;
}

export interface FetchNewHiresOptions {
  page?: number;
  pageSize?: number;
  stage?: string;
  search?: string;
}

export interface PaginatedNewHiresResponse {
  data: OnboardingCaseItem[];
  pagination: PaginationMetadata;
  counts: StageCounts;
}

export async function fetchOrganizationMasters(): Promise<OrganizationMasters> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/organization/masters`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to fetch organization masters');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchNewHiresPaginated(
  options: FetchNewHiresOptions = {},
): Promise<PaginatedNewHiresResponse> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.stage && options.stage !== 'all') params.set('stage', options.stage);
  if (options.search) params.set('search', options.search);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/onboarding/new-hires${queryString}`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to fetch onboarding cases');
  }
  const json = await res.json();
  return {
    data: json.data || [],
    pagination: json.pagination || {
      page: options.page || 1,
      pageSize: options.pageSize || 25,
      totalItems: 0,
      totalPages: 0,
    },
    counts: json.counts || {
      all: 0,
      preboarding: 0,
      documents: 0,
      completed: 0,
    },
  };
}

export async function fetchNewHires(): Promise<OnboardingCaseItem[]> {
  const res = await fetchNewHiresPaginated({ pageSize: 100 });
  return res.data;
}

export async function createNewHire(payload: CreateNewHirePayload): Promise<OnboardingCaseItem> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/onboarding/new-hires`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || 'Failed to create new hire';
    const details = errorJson.error?.details
      ? Object.values(errorJson.error.details).join(', ')
      : '';
    throw new Error(details ? `${message}: ${details}` : message);
  }

  const json = await res.json();
  return json.data;
}
