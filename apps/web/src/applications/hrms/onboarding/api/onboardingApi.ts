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

const FIRST_NAMES = [
  'Arun',
  'Priya',
  'Karthik',
  'Divya',
  'Suresh',
  'Ananya',
  'Rohan',
  'Meera',
  'Vikram',
  'Sneha',
  'Deepak',
  'Pooja',
  'Rahul',
  'Neha',
  'Aditya',
];
const LAST_NAMES = [
  'Kumar',
  'S',
  'Raman',
  'Nair',
  'Sharma',
  'Patel',
  'Reddy',
  'Iyer',
  'Menon',
  'Verma',
  'Gupta',
  'Singh',
];
const MOCK_DEPTS = [
  { id: 'dept_eng', name: 'Engineering' },
  { id: 'dept_hr', name: 'Human Resources' },
  { id: 'dept_fin', name: 'Finance' },
];
const MOCK_DESIGS = [
  { id: 'desig_se', name: 'Software Engineer' },
  { id: 'desig_hr_spec', name: 'Senior HR Specialist' },
  { id: 'desig_fa', name: 'Financial Analyst' },
];
const MOCK_LOCS = [
  { id: 'loc_chn', name: 'Chennai (HQ)' },
  { id: 'loc_blr', name: 'Bengaluru' },
];
const MOCK_STAGES: ('preboarding' | 'documents' | 'completed')[] = [
  ...Array(35).fill('preboarding'),
  ...Array(18).fill('documents'),
  ...Array(7).fill('completed'),
];

let DEV_MOCK_CASES: OnboardingCaseItem[] = MOCK_STAGES.map((stg, i) => {
  const fn = FIRST_NAMES[i % FIRST_NAMES.length] ?? 'Candidate';
  const ln = LAST_NAMES[i % LAST_NAMES.length] ?? 'User';
  const dept = MOCK_DEPTS[i % MOCK_DEPTS.length] ?? { id: 'dept_eng', name: 'Engineering' };
  const desig = MOCK_DESIGS[i % MOCK_DESIGS.length] ?? {
    id: 'desig_se',
    name: 'Software Engineer',
  };
  const loc = MOCK_LOCS[i % MOCK_LOCS.length] ?? { id: 'loc_chn', name: 'Chennai (HQ)' };
  return {
    id: `c_${i + 1}`,
    tenantId: 'tenant_default',
    companyId: 'comp_bezent_demo',
    firstName: fn,
    lastName: ln,
    fullName: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@example.com`,
    joiningDate: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
    employmentType: 'full_time',
    stage: stg,
    status: 'active',
    departmentId: dept.id,
    departmentName: dept.name,
    designationId: desig.id,
    designationName: desig.name,
    locationId: loc.id,
    locationName: loc.name,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  };
});

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

function getDevMockPaginatedResponse(
  options: FetchNewHiresOptions = {},
): PaginatedNewHiresResponse {
  const page = options.page || 1;
  const pageSize = options.pageSize || 25;
  const stage = options.stage;
  const search = options.search?.toLowerCase().trim();

  const counts: StageCounts = {
    all: DEV_MOCK_CASES.length,
    preboarding: DEV_MOCK_CASES.filter((c) => c.stage === 'preboarding').length,
    documents: DEV_MOCK_CASES.filter((c) => c.stage === 'documents').length,
    completed: DEV_MOCK_CASES.filter((c) => c.stage === 'completed').length,
  };

  let filtered = [...DEV_MOCK_CASES];
  if (stage && stage !== 'all') {
    filtered = filtered.filter((c) => c.stage === stage);
  }
  if (search) {
    filtered = filtered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(search) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.departmentName && c.departmentName.toLowerCase().includes(search)) ||
        (c.designationName && c.designationName.toLowerCase().includes(search)),
    );
  }

  const totalItems = filtered.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;
  const data = filtered.slice(offset, offset + pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
    counts,
  };
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

  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/hrms/onboarding/new-hires${queryString}`);
    if (!res.ok) {
      return getDevMockPaginatedResponse(options);
    }
    const json = await res.json();
    return {
      data: json.data || [],
      pagination: json.pagination || {
        page: options.page || 1,
        pageSize: options.pageSize || 25,
        totalItems: (json.data || []).length,
        totalPages: Math.max(1, Math.ceil((json.data || []).length / (options.pageSize || 25))),
      },
      counts: json.counts || {
        all: (json.data || []).length,
        preboarding: 0,
        documents: 0,
        completed: 0,
      },
    };
  } catch {
    return getDevMockPaginatedResponse(options);
  }
}

export async function fetchNewHires(): Promise<OnboardingCaseItem[]> {
  const res = await fetchNewHiresPaginated({ pageSize: 100 });
  return res.data;
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
