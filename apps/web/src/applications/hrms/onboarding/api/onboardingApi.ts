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
export type OnboardingStatus = 'active' | 'withdrawn' | 'completed';

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
  departmentName: string;
  designationId: string;
  designationName: string;
  locationId?: string | null;
  locationName?: string | null;
  createdAt: string;
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

export async function fetchOrganizationMasters(): Promise<OrganizationMasters> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/organization/masters`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to load organization masters');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchNewHires(): Promise<OnboardingCaseItem[]> {
  const res = await fetch(`${appConfig.apiBaseUrl}/hrms/onboarding/new-hires`);
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to load onboarding cases');
  }
  const json = await res.json();
  return json.data;
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
