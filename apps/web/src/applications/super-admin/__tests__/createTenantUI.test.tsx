import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CreateTenantPage } from '../pages/CreateTenantPage';
import { TenantsPage } from '../pages/TenantsPage';
import { superAdminNavigation } from '../../../administration/super-admin/navigation/superAdminNavigation';
import {
  superAdminApi,
  type PlanRecord,
  type TenantOrchestrationResult,
  type TenantOrchestrationPreflightResult,
} from '../api/superAdminApi';

vi.mock('../api/superAdminApi', () => ({
  superAdminApi: {
    getTenantSummary: vi.fn(),
    listTenants: vi.fn(),
    listPlans: vi.fn(),
    getTenant: vi.fn(),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    activateTenant: vi.fn(),
    suspendTenant: vi.fn(),
    listCompanies: vi.fn(),
    getTenantModules: vi.fn(),
    getModuleCatalog: vi.fn(),
    listCompanyAdmins: vi.fn(),
    listAuditLogs: vi.fn(),
    resendCompanyAdminInvitation: vi.fn(),
    revokeCompanyAdmin: vi.fn(),
    preflightTenantOrchestration: vi.fn(),
    orchestrateTenantCreation: vi.fn(),
  },
}));

describe('Super Admin — Phase 03B Create Tenant Wizard UI', () => {
  const mockPlans: PlanRecord[] = [
    {
      id: 'plan_hrms_growth',
      applicationCode: 'hrms',
      code: 'HRMS-GROWTH',
      name: 'HRMS Growth Plan',
      tier: 'growth',
      status: 'active',
      trialEligible: true,
      trialDurationDays: 14,
      prices: [
        {
          id: 'price_hrms_01',
          currency: 'USD',
          amount: 8,
          billingCycle: 'monthly',
          status: 'approved',
        },
      ],
    },
    {
      id: 'plan_crm_standard',
      applicationCode: 'crm',
      code: 'CRM-STD',
      name: 'CRM Standard',
      tier: 'standard',
      status: 'active',
      trialEligible: true,
      trialDurationDays: 30,
      prices: [
        {
          id: 'price_crm_01',
          currency: 'USD',
          amount: 15,
          billingCycle: 'monthly',
          status: 'approved',
        },
      ],
    },
    {
      id: 'plan_pm_pro',
      applicationCode: 'project_management',
      code: 'PM-PRO',
      name: 'PM Professional',
      tier: 'enterprise',
      status: 'active',
      trialEligible: false,
      trialDurationDays: 0,
      prices: [
        {
          id: 'price_pm_01',
          currency: 'USD',
          amount: 12,
          billingCycle: 'monthly',
          status: 'approved',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(superAdminApi.listPlans).mockResolvedValue(mockPlans);
    vi.mocked(superAdminApi.getTenantSummary).mockResolvedValue({
      totalTenants: 10,
      activeTenants: 8,
      trialTenants: 2,
      suspendedTenants: 0,
    });
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  /* ── 1. Routing & Navigation Invariants ─────────────────────────────────── */
  describe('Routing & Navigation', () => {
    it('verifies Super Admin navigation contains Tenants as direct route item with segment tenants', () => {
      const tenantsGroup = superAdminNavigation.destinations.find((dest) => dest.id === 'tenants');
      expect(tenantsGroup).toBeDefined();
      expect(tenantsGroup?.segment).toBe('tenants');
      expect(tenantsGroup?.children).toBeUndefined();
    });

    it('renders CreateTenantPage header and subtitle under /super-admin/tenants/create', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/create']}>
          <Routes>
            <Route path="/super-admin/tenants/create" element={<CreateTenantPage initialPlans={mockPlans} />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Create Tenant');
      expect(html).toContain('Set up a new customer organization, administrator, and application access.');
    });

    it('renders All Tenants CTA buttons linking to Create Tenant', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants']}>
          <TenantsPage initialTenants={[]} />
        </MemoryRouter>,
      );

      expect(html).toContain('Create Tenant');
    });
  });

  /* ── 2. Four-Step Stepper Progress Indicator ───────────────────────────── */
  describe('Stepper Progress Indicator', () => {
    it('renders all four step labels in the stepper', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={1} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Company Information');
      expect(html).toContain('Primary Administrator');
      expect(html).toContain('Applications &amp; Subscriptions');
      expect(html).toContain('Review &amp; Create');
    });

    it('marks Step 1 as current and steps 2-4 as pending initially', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={1} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Step 1 of 4');
    });
  });

  /* ── 3. Step 1: Company Information ────────────────────────────────────── */
  describe('Step 1: Company Information', () => {
    it('renders required company fields: Legal Name, Display Name, Business Email, Country, Timezone', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={1} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Legal Company Name');
      expect(html).toContain('Display Name');
      expect(html).toContain('Business Email');
      expect(html).toContain('Country');
      expect(html).toContain('IANA Timezone');
    });

    it('displays server-generated immutable Tenant ID notification', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={1} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Tenant ID will be generated automatically.');
      expect(html).toContain('Immutable system identifier assigned by the platform backend upon creation.');
    });

    it('renders location and registration sections with proper IANA timezone options', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={1} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Location &amp; Regional Settings');
      expect(html).toContain('Corporate Identifiers');
      expect(html).toContain('America/New_York');
      expect(html).toContain('UTC');
    });
  });

  /* ── 4. Step 2: Primary Administrator ─────────────────────────────────── */
  describe('Step 2: Primary Administrator', () => {
    it('renders administrator name, work email, phone, and job title fields', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={2} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Primary Administrator');
      expect(html).toContain('Full Name');
      expect(html).toContain('Work Email Address');
      expect(html).toContain('Phone Number');
      expect(html).toContain('Job Title');
    });

    it('does NOT render password or password-confirmation fields (passwordless OTP policy)', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={2} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).not.toContain('type="password"');
      expect(html).not.toContain('Confirm Password');
      expect(html).not.toContain('Temporary Password');
    });

    it('displays 72-hour invitation validity and email OTP security model', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={2} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Invitation validity: 72 hours');
      expect(html).toContain('Passwordless Email OTP');
    });
  });

  /* ── 5. Step 3: Applications & Subscriptions ──────────────────────────── */
  describe('Step 3: Applications & Subscriptions', () => {
    it('renders all three application cards: HRMS, CRM, and Project Management', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage initialStep={3} initialPlans={mockPlans} />
        </MemoryRouter>,
      );

      expect(html).toContain('Human Resource Management');
      expect(html).toContain('Customer Relationship Management');
      expect(html).toContain('Project Management');
    });

    it('supports zero applications configuration and displays informational notice', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={3}
            initialPlans={mockPlans}
            initialSelectedApps={{ hrms: false, crm: false, project_management: false }}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('You can create this tenant without enabling applications. Applications can be configured later.');
      expect(html).toContain('No Applications Selected');
    });

    it('renders plan selection, trial vs paid, seat bounds, and billing cycle for selected application', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={3}
            initialPlans={mockPlans}
            initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('HRMS Growth Plan');
      expect(html).toContain('Commercial Paid License');
      expect(html).toContain('Licensed Seats');
      expect(html).toContain('Billing Cycle');
    });

    it('supports immediate and scheduled activation modes', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={3}
            initialPlans={mockPlans}
            initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Activation Schedule');
      expect(html).toContain('Immediate Activation');
      expect(html).toContain('Scheduled Activation');
    });
  });

  /* ── 6. Step 4: Review & Create ────────────────────────────────────────── */
  describe('Step 4: Review & Create', () => {
    const mockCompany = {
      legalName: 'Apex Innovations LLC',
      displayName: 'Apex Global',
      businessEmail: 'contact@apexglobal.com',
      country: 'United States',
      timeZone: 'America/New_York',
    };

    const mockAdmin = {
      fullName: 'Sarah Connor',
      workEmail: 'sarah.connor@apexglobal.com',
      jobTitle: 'VP Operations',
    };

    it('renders summary review cards for Company, Primary Admin, Applications, and Setup Process', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={4}
            initialPlans={mockPlans}
            initialCompanyData={mockCompany}
            initialAdminData={mockAdmin}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Apex Innovations LLC');
      expect(html).toContain('Apex Global');
      expect(html).toContain('contact@apexglobal.com');
      expect(html).toContain('Sarah Connor');
      expect(html).toContain('sarah.connor@apexglobal.com');
      expect(html).toContain('Transactional Commitment Notice');
      expect(html).toContain('atomic transaction');
    });

    it('displays non-blocking similarity warnings from server preflight when present', () => {
      const mockPreflight: TenantOrchestrationPreflightResult = {
        valid: true,
        tenantSetupPolicy: 'ready_to_create',
        warnings: ['A company with similar name "Apex International" exists in the platform.'],
        summary: {
          companyName: 'Apex Innovations LLC',
          tenantName: 'Apex Innovations LLC',
          primaryCompanyName: 'Apex Innovations LLC',
          adminEmail: 'sarah.connor@apexglobal.com',
          selectedApplications: ['hrms'],
          applicationsCount: 1,
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: 'plan_hrms_growth',
              accessMode: 'paid',
              seats: 25,
            },
          ],
        },
      };

      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={4}
            initialPlans={mockPlans}
            initialCompanyData={mockCompany}
            initialAdminData={mockAdmin}
            initialPreflightResult={mockPreflight}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Preflight Verification Passed');
      expect(html).toContain('Apex International');
    });
  });

  /* ── 7. Success Screen (Dedicated View) ────────────────────────────────── */
  describe('Success Screen', () => {
    const mockSuccessResult: TenantOrchestrationResult = {
      tenantId: 'tnt_apex_98214',
      primaryCompanyId: 'cmp_apex_001',
      tenantCode: 'APEX',
      businessSetupState: 'pending_admin_acceptance',
      invitation: {
        id: 'inv_adm_7718',
        email: 'sarah.connor@apexglobal.com',
        status: 'pending',
        expiresAt: '2026-10-12T00:00:00.000Z',
      },
      provisioningJobId: 'wf_prov_8819',
      provisioningStatus: 'pending',
      idempotentReplay: false,
      provisioning: {
        status: 'pending',
        workflowId: 'wf_prov_8819',
        message: 'Tenant workspace provisioning dispatched to background outbox queue',
      },
      subscriptions: [
        {
          id: 'sub_hrms_01',
          applicationCode: 'hrms',
          planId: 'plan_hrms_growth',
          status: 'active',
          licensedSeats: 25,
          billingCycle: 'monthly',
        },
      ],
    };

    it('renders dedicated success screen with confirmed backend IDs and names', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={5}
            initialCreationResult={mockSuccessResult}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Tenant Created Successfully');
      expect(html).toContain('tnt_apex_98214');
      expect(html).toContain('cmp_apex_001');
      expect(html).toContain('sarah.connor@apexglobal.com');
    });

    it('accurately distinguishes Queued invitation from Delivered', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={5}
            initialCreationResult={mockSuccessResult}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Queued (72-hour validity)');
      expect(html).not.toContain('Invitation Delivered');
    });

    it('accurately distinguishes Provisioning Pending from Provisioning Complete', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={5}
            initialCreationResult={mockSuccessResult}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Pending Asynchronous Worker');
      expect(html).not.toContain('Provisioning Complete');
    });

    it('renders Back to All Tenants CTA button', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CreateTenantPage
            initialStep={5}
            initialCreationResult={mockSuccessResult}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Back to All Tenants');
    });
  });
});
