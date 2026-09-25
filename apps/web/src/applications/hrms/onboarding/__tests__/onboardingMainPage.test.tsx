import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from '../pages/OnboardingPage';
import { NewHireModal } from '../components/NewHireModal';
import {
  fetchNewHiresPaginated,
  createNewHire,
  fetchOrganizationMasters,
  type OrganizationMasters,
  type OnboardingCaseItem,
} from '../api/onboardingApi';
import { EmployeeRegistration } from '../components/EmployeeRegistration';

const mockMasters: OrganizationMasters = {
  company: { id: 'comp_01', name: 'BEZENT Demo Pvt Ltd', code: 'BEZENT_DEMO' },
  departments: [
    { id: 'dept_01', name: 'Engineering', code: 'ENG' },
    { id: 'dept_02', name: 'Human Resources', code: 'HR' },
  ],
  designations: [
    { id: 'desig_01', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_02', name: 'Senior HR Specialist', code: 'SHR' },
  ],
  locations: [
    { id: 'loc_01', name: 'Chennai (HQ)', code: 'CHN', city: 'Chennai', country: 'India' },
    { id: 'loc_02', name: 'Bengaluru', code: 'BLR', city: 'Bengaluru', country: 'India' },
  ],
};

const mockCases: OnboardingCaseItem[] = [
  {
    id: 'case_101',
    tenantId: 'tenant_01',
    companyId: 'comp_01',
    firstName: 'Arun',
    lastName: 'Kumar',
    fullName: 'Arun Kumar',
    email: 'arun.kumar@example.com',
    phone: '+91 9876543210',
    joiningDate: '2026-10-15',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_01',
    departmentName: 'Engineering',
    designationId: 'desig_01',
    designationName: 'Software Engineer',
    locationId: 'loc_01',
    locationName: 'Chennai (HQ)',
    createdAt: '2026-09-25T10:00:00.000Z',
  },
  {
    id: 'case_102',
    tenantId: 'tenant_01',
    companyId: 'comp_01',
    firstName: 'Priya',
    lastName: 'Raman',
    fullName: 'Priya Raman',
    email: 'priya.raman@example.com',
    phone: '+91 9876543211',
    joiningDate: '2026-11-01',
    employmentType: 'full_time',
    stage: 'completed',
    status: 'completed',
    departmentId: 'dept_02',
    departmentName: 'Human Resources',
    designationId: 'desig_02',
    designationName: 'Senior HR Specialist',
    locationId: 'loc_02',
    locationName: 'Bengaluru',
    createdAt: '2026-09-20T10:00:00.000Z',
  },
];

describe('Onboarding Main Page Architecture & Components', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders page header, accurate description, and Add New Hire primary action', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Onboarding');
    expect(html).toContain('Manage new hires from pre-joining through employee creation.');
    expect(html).toContain('Add New Hire');
  });

  it('renders real summary metric cards and omits unreliable cards (joining soon / attention required)', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    // Derived strictly from case count data
    expect(html).toContain('Total New Hires');
    expect(html).toContain('In Progress');
    expect(html).toContain('Completed');

    // Omitted for V1 because they cannot be reliably derived from the current domain model
    expect(html).not.toContain('Joining Soon');
    expect(html).not.toContain('Attention Required');
  });

  it('renders New Hires workspace section with tabs, search, and loading state', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    expect(html).toContain('New Hires');
    expect(html).toContain('All');
    expect(html).toContain('Preboarding');
    expect(html).toContain('Documents');
    expect(html).toContain('Completed');
    expect(html).toContain('Search by name, email, department...');
    expect(html).toContain('Loading new hire records');
  });

  it('contains zero localStorage draft references and zero fake progress percentages', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );

    expect(html).not.toContain('View Drafts');
    expect(html).not.toContain('35%');
    expect(html).not.toContain('60%');
    expect(html).not.toContain('90%');
  });

  it('NewHireModal renders a compact intake modal without embedding the 10-step wizard', () => {
    const html = renderToStaticMarkup(
      <NewHireModal
        isOpen={true}
        onClose={() => {}}
        masters={mockMasters}
        onSubmit={async () => {}}
      />,
    );

    expect(html).toContain('Add New Hire');
    expect(html).toContain('Personal Details');
    expect(html).toContain('First Name *');
    expect(html).toContain('Last Name');
    expect(html).toContain('Email Address *');
    expect(html).toContain('Employment Details');
    expect(html).toContain('Department *');
    expect(html).toContain('Designation *');
    expect(html).toContain('Joining Date *');
    expect(html).toContain('Employment Type *');
    expect(html).toContain('Create New Hire');

    // Wizard-specific 10-step JourneyNav components MUST NOT be inside intake modal
    expect(html).not.toContain('Emergency Contact');
    expect(html).not.toContain('Working Hours');
    expect(html).not.toContain('Online Access');
  });

  it('Employee Registration wizard remains completely frozen and intact', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EmployeeRegistration onCancel={() => {}} initialDraft={null} />
      </MemoryRouter>,
    );

    expect(html).toContain('Employee Registration');
    expect(html).toContain('General');
    expect(html).toContain('Personal Information');
    expect(html).toContain('Administration');
    expect(html).toContain('Skills');
    expect(html).toContain('Emergency Contact');
    expect(html).toContain('Accounts');
    expect(html).toContain('Online Access');
    expect(html).toContain('Working Hours');
    expect(html).toContain('Documents');
    expect(html).toContain('Review');
  });

  describe('Onboarding API Client Contract & Error Handling', () => {
    it('fetchNewHiresPaginated makes genuine API calls and returns pagination and counts', async () => {
      let requestedUrl = '';
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: mockCases,
            pagination: { page: 1, pageSize: 25, totalItems: 2, totalPages: 1 },
            counts: { all: 2, preboarding: 1, documents: 0, completed: 1 },
          }),
        });
      });

      const res = await fetchNewHiresPaginated({ page: 1, pageSize: 25, stage: 'preboarding', search: 'Arun' });

      expect(requestedUrl).toContain('/hrms/onboarding/new-hires');
      expect(requestedUrl).toContain('page=1');
      expect(requestedUrl).toContain('pageSize=25');
      expect(requestedUrl).toContain('stage=preboarding');
      expect(requestedUrl).toContain('search=Arun');
      expect(res.data.length).toBe(2);
      expect(res.counts.all).toBe(2);
      expect(res.counts.preboarding).toBe(1);
    });

    it('fetchNewHiresPaginated throws on HTTP error without mock data fallback', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } }),
      });

      await expect(fetchNewHiresPaginated()).rejects.toThrow('Internal server error');
    });

    it('createNewHire posts payload to /hrms/onboarding/new-hires and returns created case', async () => {
      let requestBody: unknown = null;
      let requestUrl = '';
      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        requestUrl = url;
        requestBody = JSON.parse((init?.body as string) || '{}');
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              id: 'case_999',
              fullName: 'Karthik Raja',
              firstName: 'Karthik',
              lastName: 'Raja',
              email: 'karthik@example.com',
              stage: 'preboarding',
              status: 'active',
            },
          }),
        });
      });

      const payload = {
        firstName: 'Karthik',
        lastName: 'Raja',
        email: 'karthik@example.com',
        companyId: 'comp_01',
        departmentId: 'dept_01',
        designationId: 'desig_01',
        joiningDate: '2026-11-15',
        employmentType: 'full_time' as const,
      };

      const result = await createNewHire(payload);

      expect(requestUrl).toContain('/hrms/onboarding/new-hires');
      expect(requestBody).toEqual(payload);
      expect(result.id).toBe('case_999');
      expect(result.fullName).toBe('Karthik Raja');
    });

    it('createNewHire throws on validation failure without fallback', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Validation failed',
            details: { firstName: 'First name is required' },
          },
        }),
      });

      await expect(
        createNewHire({
          firstName: '',
          email: 'invalid',
          companyId: 'comp_01',
          departmentId: 'dept_01',
          designationId: 'desig_01',
          joiningDate: '2026-11-15',
        }),
      ).rejects.toThrow('Validation failed: First name is required');
    });

    it('fetchOrganizationMasters throws on network failure without mock data fallback', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(fetchOrganizationMasters()).rejects.toThrow('Connection refused');
    });
  });
});
