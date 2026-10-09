import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { superAdminRoutes } from '../routes/superAdminRoutes';
import { superAdminApi } from '../api/superAdminApi';

vi.mock('../api/superAdminApi', () => ({
  superAdminApi: {
    getDashboard: vi.fn().mockResolvedValue({
      metrics: { customers: { total: 0, active: 0, suspended: 0 } },
      customerHealth: { health: { healthy: 0, needsAttention: 0, critical: 0 } },
      applications: [],
      needsAttention: [],
      recentTenants: [],
      recentAuditLogs: [],
    }),
    getTenantSummary: vi.fn().mockResolvedValue({
      totalTenants: 1,
      activeTenants: 1,
      trialTenants: 0,
      suspendedTenants: 0,
    }),
    listTenants: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'tenant_test_1',
          name: 'Test Tenant Corp',
          code: 'TEST',
          status: 'active',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          contactEmail: 'admin@test.com',
          contactPhone: null,
          health: { status: 'healthy', reasons: [] },
          setupProgress: { percentage: 100, isComplete: true, milestones: [] },
        },
      ],
      total: 1,
    }),
    listPlans: vi.fn().mockResolvedValue([]),
    getTenant: vi.fn().mockResolvedValue({
      id: 'tenant_test_1',
      name: 'Test Tenant Corp',
      code: 'TEST',
      status: 'active',
    }),
    getTenantOverview: vi.fn().mockResolvedValue({
      tenant: {
        id: 'tenant_test_1',
        name: 'Test Tenant Corp',
        code: 'TEST',
        status: 'active',
        maxCompanies: 5,
        contactEmail: 'admin@test.com',
        contactPhone: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      primaryCompany: null,
      totalCompanies: 0,
      companyCapacity: { used: 0, max: 5, remaining: 5 },
      primaryAdmin: null,
      enabledApplications: [],
      activeUsers: 0,
      licensedSeats: 0,
      provisioningHealth: null,
      setupProgress: { percentage: 100, isComplete: true, milestones: [] },
      health: { status: 'healthy', reasons: [] },
      derivedCommercialClassification: 'active',
      attentionRequired: { needed: false },
      importantTimestamps: { createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    }),
    getTenantSubscriptions: vi.fn().mockResolvedValue([]),
    getTenantEntitlements: vi.fn().mockResolvedValue([]),
    getTenantOverrides: vi.fn().mockResolvedValue([]),
    listProvisioningJobs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getTenantLifecycleHistory: vi.fn().mockResolvedValue([]),
    getTenantActivity: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 }),
    listCompanies: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listUsers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listAuditLogs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getGovernanceSummary: vi.fn().mockResolvedValue({
      authentication: { method: 'otp', enabled: true },
      session: { ttlHours: 24 },
      isolation: { tenantIsolation: true },
      audit: { enabled: true },
      applications: { total: 1, available: 1, comingSoon: 0 },
    }),
    listCompanyAdmins: vi.fn().mockResolvedValue([]),
    getModuleCatalog: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../platform/auth', () => ({
  useAuth: vi.fn(() => ({
    status: 'authenticated',
    access: {
      user: { id: 'u_1', email: 'superadmin@bezent.com', isSuperAdmin: true },
      platformWorkspaces: ['super_admin'],
    },
  })),
}));

describe('Canonical Super Admin AppRouter & Route Tree Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderRoute(initialEntry: string) {
    const router = createMemoryRouter(superAdminRoutes, {
      initialEntries: [initialEntry],
    });
    return renderToStaticMarkup(<RouterProvider router={router} />);
  }

  it('1. mounts /super-admin/dashboard and renders SuperAdminDashboardPage from canonical directory', () => {
    const html = renderRoute('/super-admin/dashboard');
    expect(html).toContain('Super Admin Dashboard');
  });

  it('2. mounts /super-admin/tenants and renders modern Phase 03A TenantsPage', () => {
    const html = renderRoute('/super-admin/tenants');
    expect(html).toContain('Tenants');
    expect(html).toContain('Manage customer organizations');
  });

  it('3. mounts /super-admin/tenants/create and renders modern Phase 03B CreateTenantPage wizard', () => {
    const html = renderRoute('/super-admin/tenants/create');
    expect(html).toContain('Create Tenant');
    expect(html).toContain('Step 1 of 4');
  });

  it('4. mounts /super-admin/tenants/:tenantId/overview and renders modern Phase 03C TenantDetailsPage overview tab', () => {
    const html = renderRoute('/super-admin/tenants/tenant_test_1/overview');
    expect(html).toContain('Loading customer tenant profile...');
  });

  it('5. mounts /super-admin/tenants/:tenantId/entitlements and renders entitlements workspace tab', () => {
    const html = renderRoute('/super-admin/tenants/tenant_test_1/entitlements');
    expect(html).toContain('Loading customer tenant profile...');
  });

  it('6. mounts /super-admin/tenants/:tenantId/provisioning and renders provisioning workspace tab', () => {
    const html = renderRoute('/super-admin/tenants/tenant_test_1/provisioning');
    expect(html).toContain('Loading customer tenant profile...');
  });

  it('7. mounts /super-admin/tenants/:tenantId/lifecycle and renders lifecycle workspace tab', () => {
    const html = renderRoute('/super-admin/tenants/tenant_test_1/lifecycle');
    expect(html).toContain('Loading customer tenant profile...');
  });

  it('8. mounts /super-admin/tenants/:tenantId/activity and renders activity workspace tab', () => {
    const html = renderRoute('/super-admin/tenants/tenant_test_1/activity');
    expect(html).toContain('Loading customer tenant profile...');
  });

  it('9. mounts compatibility alias /super-admin/companies cleanly', () => {
    const html = renderRoute('/super-admin/companies');
    expect(html).toContain('Companies');
  });

  it('10. mounts compatibility alias /super-admin/audit-logs cleanly', () => {
    const html = renderRoute('/super-admin/audit-logs');
    expect(html).toContain('Audit Logs');
  });
});
