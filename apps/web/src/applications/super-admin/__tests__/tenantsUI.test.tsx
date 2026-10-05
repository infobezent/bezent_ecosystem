import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TenantsPage } from '../pages/TenantsPage';
import { TenantDetailsPage } from '../pages/TenantDetailsPage';
import { superAdminApi, type TenantRecord } from '../api/superAdminApi';

vi.mock('../api/superAdminApi', () => ({
  superAdminApi: {
    listTenants: vi.fn(),
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

describe('Super Admin - TenantsPage UI', () => {
  const mockTenants: TenantRecord[] = [
    {
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
        milestones: [],
        isComplete: true,
      },
    },
    {
      id: 'tenant_beta_02',
      name: 'Beta Tech',
      code: 'BETA',
      contactEmail: 'contact@beta.io',
      contactPhone: null,
      status: 'suspended',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      activeModules: [],
      companiesCount: 0,
      health: {
        status: 'critical',
        reasons: ['Tenant is suspended. Users are restricted from accessing all applications.'],
        nextBestAction: {
          action: 'reactivate_tenant',
          label: 'Reactivate Tenant',
          targetTab: 'overview',
        },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders TenantsPage structure with header, filters, and Add Customer CTA', () => {
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: mockTenants,
      total: 2,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Tenants / Customers');
    expect(html).toContain('Add Customer');
    expect(html).toContain('Search by customer name or code...');
    expect(html).toContain('All Statuses');
    expect(html).toContain('All Applications');
    expect(html).toContain('All Attention States');
  });

  it('renders loading state initially during data retrieval', () => {
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: mockTenants,
      total: 2,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Loading customer tenants...');
    expect(html).toContain('Add Customer');
    expect(html).toContain('All Attention States');
  });

  it('renders safely when health payload is completely missing (neutral fallback)', () => {
    const tenantNoHealth: TenantRecord = {
      ...mockTenants[0]!,
      id: 'tenant_no_health',
      name: 'No Health Corp',
      health: undefined,
    };
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: [tenantNoHealth],
      total: 1,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage initialTenants={[tenantNoHealth]} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('Cannot read properties of undefined');
    expect(html).toContain('Tenants / Customers');
    expect(html).toContain('No Health Corp');
    expect(html).toContain('Health unavailable');
  });

  it('renders safely when health reasons array is missing (undefined)', () => {
    const tenantMissingReasons = {
      ...mockTenants[0]!,
      id: 'tenant_missing_reasons',
      name: 'Missing Reasons Corp',
      health: {
        status: 'critical' as const,
        // reasons is undefined (legacy backend shape)
        reason: 'Legacy single reason field from backend',
      } as unknown as TenantRecord['health'],
    };
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: [tenantMissingReasons as TenantRecord],
      total: 1,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage initialTenants={[tenantMissingReasons as TenantRecord]} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('Cannot read properties of undefined');
    expect(html).toContain('Missing Reasons Corp');
    expect(html).toContain('Critical');
    expect(html).toContain('Legacy single reason field from backend');
  });

  it('renders safely when health reasons array is empty', () => {
    const tenantEmptyReasons: TenantRecord = {
      ...mockTenants[0]!,
      id: 'tenant_empty_reasons',
      name: 'Empty Reasons Corp',
      health: {
        status: 'needs_attention',
        reasons: [],
        nextBestAction: null,
      },
    };
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: [tenantEmptyReasons],
      total: 1,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage initialTenants={[tenantEmptyReasons]} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('Cannot read properties of undefined');
    expect(html).toContain('Empty Reasons Corp');
    expect(html).toContain('Needs Attention');
  });

  it('renders legacy tenant created before health implementation', () => {
    const legacyTenant: TenantRecord = {
      id: 'tenant_legacy_001',
      name: 'Legacy 2023 Tenant',
      code: 'LEGACY',
      contactEmail: null,
      contactPhone: null,
      status: 'active',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: [legacyTenant],
      total: 1,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage initialTenants={[legacyTenant]} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('Cannot read properties of undefined');
    expect(html).toContain('Legacy 2023 Tenant');
    expect(html).toContain('Health unavailable');
    expect(html).toContain('0 companies');
    expect(html).toContain('No active apps');
  });

  it('renders tenant with no companies, no apps, no admin, or suspended state', () => {
    const variedTenants: TenantRecord[] = [
      {
        ...mockTenants[0]!,
        id: 't_no_company',
        name: 'No Company Tenant',
        companiesCount: 0,
        companies: [],
        health: {
          status: 'critical',
          reasons: ['No legal company entity created.'],
          nextBestAction: null,
        },
      },
      {
        ...mockTenants[0]!,
        id: 't_no_apps',
        name: 'No Apps Tenant',
        activeModules: [],
        health: {
          status: 'needs_attention',
          reasons: ['No active application entitlements.'],
          nextBestAction: null,
        },
      },
      {
        ...mockTenants[0]!,
        id: 't_suspended',
        name: 'Suspended Tenant',
        status: 'suspended',
        health: { status: 'critical', reasons: ['Tenant suspended.'], nextBestAction: null },
      },
    ];
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: variedTenants,
      total: 3,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage initialTenants={variedTenants} />
      </MemoryRouter>,
    );

    expect(html).toContain('No Company Tenant');
    expect(html).toContain('No Apps Tenant');
    expect(html).toContain('Suspended Tenant');
    expect(html).toContain('Critical');
    expect(html).toContain('Needs Attention');
  });

  it('renders neutral fallback when health status is malformed or unknown', () => {
    const malformedTenant = {
      ...mockTenants[0]!,
      id: 't_malformed',
      name: 'Malformed Health Corp',
      health: {
        status: 'unknown_status_val' as unknown,
        reasons: ['corrupted data'],
      } as unknown as TenantRecord['health'],
    };
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({
      items: [malformedTenant as TenantRecord],
      total: 1,
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantsPage initialTenants={[malformedTenant as TenantRecord]} />
      </MemoryRouter>,
    );

    expect(html).toContain('Malformed Health Corp');
    expect(html).toContain('Health unavailable');
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
      {
        code: 'crm',
        name: 'CRM',
        description: 'Customer relations',
        category: 'Sales',
        version: '1.0.0',
        availability: 'Beta',
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
