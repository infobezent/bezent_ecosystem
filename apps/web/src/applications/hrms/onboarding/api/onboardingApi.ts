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

const DEV_MOCK_MASTERS: OrganizationMasters = {
  company: { id: 'comp_bezent_demo', name: 'BEZENT Demo Pvt Ltd', code: 'BZDEMO' },
  departments: [
    { id: 'dept_eng', name: 'Engineering', code: 'ENG' },
    { id: 'dept_hr', name: 'Human Resources', code: 'HR' },
    { id: 'dept_fin', name: 'Finance', code: 'FIN' },
  ],
  designations: [
    { id: 'desig_fa', name: 'Financial Analyst', code: 'FA' },
    { id: 'desig_se', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_hr_spec', name: 'Senior HR Specialist', code: 'SHRS' },
  ],
  locations: [
    { id: 'loc_blr', name: 'Bengaluru', code: 'BLR', city: 'Bengaluru', country: 'India' },
    { id: 'loc_chn', name: 'Chennai (HQ)', code: 'MAA', city: 'Chennai', country: 'India' },
  ],
};

let DEV_MOCK_CASES: OnboardingCaseItem[] = [
  {
    id: 'c1',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Test',
    lastName: 'Candidate',
    fullName: 'Test Candidate',
    email: 'candidate.1789983414265@example.com',
    joiningDate: '2026-11-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_fa',
    designationName: 'Financial Analyst',
    locationId: 'loc_blr',
    locationName: 'Bengaluru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c2',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Test',
    lastName: 'Candidate',
    fullName: 'Test Candidate',
    email: 'candidate.1789982968927@example.com',
    joiningDate: '2026-11-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_fa',
    designationName: 'Financial Analyst',
    locationId: 'loc_blr',
    locationName: 'Bengaluru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c3',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Test',
    lastName: 'Candidate',
    fullName: 'Test Candidate',
    email: 'candidate.1789982753567@example.com',
    joiningDate: '2026-11-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_fa',
    designationName: 'Financial Analyst',
    locationId: 'loc_blr',
    locationName: 'Bengaluru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c4',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Test',
    lastName: 'Candidate',
    fullName: 'Test Candidate',
    email: 'candidate.1789982676224@example.com',
    joiningDate: '2026-11-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_fa',
    designationName: 'Financial Analyst',
    locationId: 'loc_blr',
    locationName: 'Bengaluru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c5',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Test',
    lastName: 'Candidate',
    fullName: 'Test Candidate',
    email: 'candidate.1789982586830@example.com',
    joiningDate: '2026-11-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_fa',
    designationName: 'Financial Analyst',
    locationId: 'loc_blr',
    locationName: 'Bengaluru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c6',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Karthik',
    lastName: 'Raman',
    fullName: 'Karthik Raman',
    email: 'karthik.raman@example.com',
    joiningDate: '2026-11-15',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_fa',
    designationName: 'Financial Analyst',
    locationId: 'loc_blr',
    locationName: 'Bengaluru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c7',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Test',
    lastName: 'Candidate',
    fullName: 'Test Candidate',
    email: 'candidate.1789982181396@example.com',
    joiningDate: '2026-11-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_fa',
    designationName: 'Financial Analyst',
    locationId: 'loc_blr',
    locationName: 'Bengaluru',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c8',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Arun',
    lastName: 'Kumar',
    fullName: 'Arun Kumar',
    email: 'arun.kumar@example.com',
    joiningDate: '2026-10-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_se',
    designationName: 'Software Engineer',
    locationId: 'loc_chn',
    locationName: 'Chennai (HQ)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c9',
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: 'Priya',
    lastName: 'S',
    fullName: 'Priya S',
    email: 'priya.s@example.com',
    joiningDate: '2026-10-15',
    employmentType: 'full_time',
    stage: 'documents',
    status: 'active',
    departmentId: 'dept_hr',
    departmentName: 'Human Resources',
    designationId: 'desig_hr_spec',
    designationName: 'Senior HR Specialist',
    locationId: 'loc_chn',
    locationName: 'Chennai (HQ)',
    createdAt: new Date().toISOString(),
  },
];

export async function fetchOrganizationMasters(): Promise<OrganizationMasters> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/hrms/organization/masters`);
    if (!res.ok) {
      return DEV_MOCK_MASTERS;
    }
    const json = await res.json();
    return json.data || DEV_MOCK_MASTERS;
  } catch {
    return DEV_MOCK_MASTERS;
  }
}

export async function fetchNewHires(): Promise<OnboardingCaseItem[]> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/hrms/onboarding/new-hires`);
    if (!res.ok) {
      return DEV_MOCK_CASES;
    }
    const json = await res.json();
    return json.data || DEV_MOCK_CASES;
  } catch {
    return DEV_MOCK_CASES;
  }
}

export async function createNewHire(payload: CreateNewHirePayload): Promise<OnboardingCaseItem> {
  try {
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
  } catch {
    const newCase: OnboardingCaseItem = {
      id: `case_${Date.now()}`,
      tenantId: 'tenant_default',
      companyId: payload.companyId || 'comp_bezent_demo',
      firstName: payload.firstName,
      lastName: payload.lastName || null,
      fullName: payload.lastName ? `${payload.firstName} ${payload.lastName}` : payload.firstName,
      email: payload.email,
      phone: payload.phone || null,
      joiningDate: payload.joiningDate,
      employmentType: payload.employmentType || 'full_time',
      stage: 'preboarding',
      status: 'active',
      departmentId: payload.departmentId,
      departmentName:
        DEV_MOCK_MASTERS.departments.find((d) => d.id === payload.departmentId)?.name ||
        'Engineering',
      designationId: payload.designationId,
      designationName:
        DEV_MOCK_MASTERS.designations.find((d) => d.id === payload.designationId)?.name ||
        'Financial Analyst',
      locationId: payload.locationId || null,
      locationName:
        DEV_MOCK_MASTERS.locations.find((l) => l.id === payload.locationId)?.name || 'Bengaluru',
      createdAt: new Date().toISOString(),
    };
    DEV_MOCK_CASES = [newCase, ...DEV_MOCK_CASES];
    return newCase;
  }
}
