import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TenantsPage } from '../pages/TenantsPage';
import { TenantDetailsPage } from '../pages/TenantDetailsPage';
import { superAdminApi, type TenantRecord, type TenantSummaryMetrics } from '../api/superAdminApi';

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
  },
}));

describe('Super Admin - Phase 03A TenantsPage UI', () => {
  const mockSummary: TenantSummaryMetrics = {
    totalTenants: 12,
    activeTenants: 8,
    trialTenants: 3,
    suspendedTenants: 1,
  };

  const mockTenants: TenantRecord[] = [
    {
      id: 'tnt_acme_01',
      name: 'Acme Corporation',
      code: 'ACME',
      contactEmail: 'admin@acme.com',
      contactPhone: '+1-555-0100',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      activeModules: ['hrms', 'crm'],
      companiesCount: 2,
      userCount: 42,
      primaryAdmin: {
        id: 'usr_pa_01',
        name: 'Jane Doe',
        email: 'jane.doe@acme.com',
        status: 'active',
        invitedAt: null,
        acceptedAt: '2026-01-02T00:00:00.000Z',
      },
      subscriptionSummary: {
        activePlans: ['Enterprise Growth'],
        totalSeats: 50,
        hasTrial: false,
      },
      derivedCommercialClassification: 'active',
    },
    {
      id: 'tnt_beta_02',
      name: 'Beta Labs',
      code: 'BETA',
      contactEmail: 'contact@betalabs.com',
      contactPhone: null,
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      activeModules: ['hrms'],
      companiesCount: 1,
      userCount: 5,
      primaryAdmin: {
        id: '',
        name: 'Alex Pending',
        email: 'alex@betalabs.com',
        status: 'pending',
        invitedAt: '2026-02-01T00:00:00.000Z',
        acceptedAt: null,
      },
      subscriptionSummary: {
        activePlans: ['Starter Trial'],
        totalSeats: 10,
        hasTrial: true,
      },
      derivedCommercialClassification: 'trial',
    },
    {
      id: 'tnt_gamma_03',
      name: 'Gamma Tech',
      code: 'GAMMA',
      contactEmail: 'support@gammatech.io',
      contactPhone: null,
      status: 'suspended',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      activeModules: [],
      companiesCount: 0,
      userCount: 0,
      primaryAdmin: null,
      derivedCommercialClassification: 'suspended',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(superAdminApi.getTenantSummary).mockResolvedValue(mockSummary);
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: mockTenants,
      total: 3,
    });
    vi.mocked(superAdminApi.listPlans).mockResolvedValue([
      {
        id: 'plan_hrms_growth',
        applicationCode: 'hrms',
        code: 'HRMS-GROWTH',
        name: 'Growth Plan',
        tier: 'growth',
        status: 'active',
        trialEligible: true,
        trialDurationDays: 14,
      },
    ]);
  });

  /* ── 1. Summary Metrics ─────────────────────────────────────────────────── */
  describe('Summary Metrics (Slice E / Prompt Section 6)', () => {
    it('renders all four primary metrics: Total, Active, Trial, and Suspended Tenants', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Total Tenants');
      expect(html).toContain('Active Tenants');
      expect(html).toContain('Trial Tenants');
      expect(html).toContain('Suspended Tenants');
    });

    it('displays exact numerical values from getTenantSummary', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} initialSummary={mockSummary} />
        </MemoryRouter>,
      );

      expect(html).toContain('12'); // Total
      expect(html).toContain('8');  // Active
      expect(html).toContain('3');  // Trial
      expect(html).toContain('1');  // Suspended
    });

    it('renders helper description text for each metric card', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('All registered customer accounts');
      expect(html).toContain('Operational customer accounts');
      expect(html).toContain('Active trial with zero paid');
      expect(html).toContain('Restricted administrative state');
    });
  });

  /* ── 2. Page Header & Actions ───────────────────────────────────────────── */
  describe('Page Header (Prompt Section 5)', () => {
    it('renders All Tenants title and standard enterprise subtitle', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('All Tenants');
      expect(html).toContain(
        'Manage customer organizations, application access, subscriptions, and tenant lifecycle.',
      );
    });

    it('renders Refresh and Create Tenant buttons in header', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Refresh');
      expect(html).toContain('Create Tenant');
    });
  });

  /* ── 3. Search & Filter Toolbar ─────────────────────────────────────────── */
  describe('Search & Filter Toolbar (Prompt Section 7)', () => {
    it('renders search input with required placeholder', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Search tenants by name, ID, or admin email');
    });

    it('renders all required status filter options', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('All Statuses');
      expect(html).toContain('Pending Setup');
    });

    it('renders all required application filter options', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('All Applications');
      expect(html).toContain('HRMS');
      expect(html).toContain('CRM');
      expect(html).toContain('Project Management');
    });

    it('renders created date filter options', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('All Time');
      expect(html).toContain('Last 7 Days');
      expect(html).toContain('Last 30 Days');
      expect(html).toContain('Last 90 Days');
    });
  });

  /* ── 4. Tenant Management Table ─────────────────────────────────────────── */
  describe('Tenant Management Table (Prompt Section 8)', () => {
    it('renders semantic table headers', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Tenant');
      expect(html).toContain('Primary Admin');
      expect(html).toContain('Applications');
      expect(html).toContain('Subscription');
      expect(html).toContain('Users');
      expect(html).toContain('Created');
      expect(html).toContain('Status');
      expect(html).toContain('Actions');
    });

    it('renders tenant name, code, and avatar initials', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Acme Corporation');
      expect(html).toContain('ACME');
      expect(html).toContain('tnt_acme_01');
      expect(html).toContain('AC'); // Avatar initials
    });

    it('renders active Primary Admin name and email', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Jane Doe');
      expect(html).toContain('jane.doe@acme.com');
    });

    it('renders Pending Invitation badge for unaccepted admin invitations', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Pending Invitation');
      expect(html).toContain('alex@betalabs.com');
    });

    it('renders Not assigned when no primary admin exists', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Not assigned');
    });

    it('renders enabled Application badges (HRMS, CRM, PM)', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('HRMS');
      expect(html).toContain('CRM');
    });

    it('renders No applications for unentitled tenants', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('No applications');
    });

    it('renders Paid and Trial badges for subscriptions', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('Paid');
      expect(html).toContain('Trial');
      expect(html).toContain('Enterprise Growth');
    });

    it('renders active users vs licensed seats ratio', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('42');
      expect(html).toContain('50');
    });

    it('renders lifecycle actions: View Tenant, Suspend, and Reactivate', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={mockTenants} />
        </MemoryRouter>,
      );

      expect(html).toContain('View Tenant');
      expect(html).toContain('Suspend');
      expect(html).toContain('Reactivate');
    });
  });

  /* ── 5. Empty & Loading States ─────────────────────────────────────────── */
  describe('States (Prompt Section 11)', () => {
    it('renders loading state when initialLoading is true', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialLoading={true} />
        </MemoryRouter>,
      );

      expect(html).toContain('Loading customer tenants...');
    });

    it('renders EmptyState when tenant list is empty', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantsPage initialTenants={[]} />
        </MemoryRouter>,
      );

      expect(html).toContain('No customer tenants found');
    });
  });
});

describe('Super Admin - TenantDetailsPage UI', () => {
  const mockTenant: TenantRecord = {
    id: 'tenant_acme_01',
    name: 'Acme Corporation',
    code: 'ACME',
    contactEmail: 'admin@acme.com',
    contactPhone: '+1-555-0100',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activeModules: ['hrms'],
    companiesCount: 1,
    health: {
      status: 'healthy',
      reasons: [
        'Account is fully configured with active administrators and application entitlements.',
      ],
      nextBestAction: null,
    },
    setupProgress: {
      totalMilestones: 5,
      completedMilestones: 5,
      percentage: 100,
      milestones: [
        {
          key: 'tenant_created',
          title: 'Customer Tenant Created',
          description: 'Tenant account created',
          completed: true,
          completedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      isComplete: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(superAdminApi.getTenant).mockResolvedValue(mockTenant);
    vi.mocked(superAdminApi.listCompanies).mockResolvedValue({
      items: [
        {
          id: 'comp_1',
          tenantId: 'tenant_acme_01',
          name: 'Acme India',
          code: 'ACME-IN',
          legalName: 'Acme Technologies Pvt Ltd',
          businessEmail: 'info@acme.com',
          contactPhone: null,
          country: 'India',
          timeZone: 'Asia/Kolkata',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    vi.mocked(superAdminApi.getTenantModules).mockResolvedValue([
      {
        id: 'tm_1',
        tenantId: 'tenant_acme_01',
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
        enabledAt: '2026-01-01T00:00:00.000Z',
        disabledAt: null,
      },
    ]);
    vi.mocked(superAdminApi.getModuleCatalog).mockResolvedValue([
      {
        code: 'hrms',
        name: 'HRMS & Employee Self-Service',
        description: 'Complete workforce management',
        category: 'Workforce',
        version: '1.0.0',
        availability: 'GA',
      },
    ]);
    vi.mocked(superAdminApi.listCompanyAdmins).mockResolvedValue([
      {
        membershipId: 'mem_1',
        userId: 'usr_1',
        email: 'admin@acme.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: null,
        tenantId: 'tenant_acme_01',
        companyId: 'comp_1',
        companyName: 'Acme India',
        role: 'company_admin',
        status: 'active',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
    vi.mocked(superAdminApi.listAuditLogs).mockResolvedValue({
      items: [
        {
          id: 'aud_1',
          actorUserId: 'usr_super',
          actorEmail: 'superadmin@bezent.com',
          action: 'customer_provisioned',
          targetType: 'tenant',
          targetId: 'tenant_acme_01',
          tenantId: 'tenant_acme_01',
          companyId: 'comp_1',
          metadata: { note: 'Initial onboarding' },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
  });

  it('renders initial loading state for tenant details', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/super-admin/tenants/tenant_acme_01']}>
        <Routes>
          <Route path="/super-admin/tenants/:tenantId" element={<TenantDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain('Loading customer tenant profile...');
  });

  it('renders TenantDetailsPage safely when health and setupProgress are missing or empty', () => {
    const tenantWithoutHealth: TenantRecord = {
      ...mockTenant,
      health: undefined,
      setupProgress: undefined,
    };
    vi.mocked(superAdminApi.getTenant).mockResolvedValue(tenantWithoutHealth);

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/super-admin/tenants/tenant_acme_01']}>
        <Routes>
          <Route
            path="/super-admin/tenants/:tenantId"
            element={<TenantDetailsPage initialTenant={tenantWithoutHealth} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).not.toContain('Cannot read properties of undefined');
    expect(html).not.toContain('Unexpected Application Error');
    expect(html).toContain('Acme Corporation');
  });
});
