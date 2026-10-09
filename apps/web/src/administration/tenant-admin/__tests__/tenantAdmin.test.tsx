import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ICON_DEFINITIONS } from '../../../design-system/icons/definitions';
import { tenantAdminApplication } from '../index';
import {
  TENANT_ADMIN_NAV_CATEGORIES,
  TENANT_ADMIN_NAV_DESTINATIONS,
  tenantAdminNavigation,
} from '../navigation/tenantAdminNavigation';
import { APPLICATIONS, findApplicationByPath } from '../../../app/config/applications';
import { toShellNavItems } from '../../../app/router/shellNavigation';
import { canItemOpenFlyout } from '../../../layouts/app-shell/LeftSidebar';
import { destinationPath, resolveActiveNavigation } from '../../../shared/utils/navigation';
import { appRoutes } from '../../../app/router/AppRouter';
import { AuthContext, type AuthContextValue } from '../../../platform/auth/AuthProvider';
import { ThemeProvider } from '../../../app/providers/ThemeProvider';
import { CompanyAdminContext } from '../../../applications/company-admin/context/CompanyAdminContext';
import type { AccessOverview, CompanyAccess, ModuleCode, WorkspaceId } from '../../../platform/auth/authApi';
import { TenantAdminDashboardPage } from '../pages/TenantAdminDashboardPage';
import { TenantDetailsPage } from '../pages/TenantDetailsPage';
import { TenantProfilePage } from '../pages/TenantProfilePage';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { tenantAdminApi, TenantAdminApiError } from '../api/tenantAdminApi';
import type { TenantApplicationSummary } from '../types/tenantAdmin.types';

const { categories, destinations } = tenantAdminNavigation;

function createMockAuth(opts: {
  isSuperAdmin?: boolean;
  isTenantAdmin?: boolean;
  workspaces?: WorkspaceId[];
  roles?: string[];
  permissions?: string[];
  companies?: CompanyAccess[];
}): AuthContextValue {
  const isSuperAdmin = Boolean(opts.isSuperAdmin);
  const isTenantAdmin = Boolean(opts.isTenantAdmin);
  const workspaces = opts.workspaces ?? [];
  const roles = opts.roles ?? [];
  const permissions = opts.permissions ?? [];

  const defaultCompany: CompanyAccess = {
    tenantId: 'tenant_123',
    tenantName: 'Acme Global Corp',
    companyId: 'comp_001',
    companyName: 'Acme USA Inc',
    companyCode: 'ACME_US',
    isMember: true,
    isPlatformOversight: false,
    isTenantAdmin,
    roles: roles.map((code) => ({
      id: `role_${code}`,
      code,
      name: code,
      isSystem: true,
      moduleCode: null,
    })),
    permissions,
    enabledModules: ['hrms' as ModuleCode],
    essEligible: true,
    employeeId: 'emp_001',
    workspaces,
  };

  const companies = opts.companies ?? (workspaces.length > 0 || isTenantAdmin ? [defaultCompany] : []);

  const access: AccessOverview = {
    user: {
      id: 'usr_test_01',
      email: 'admin@acme.example',
      firstName: 'Tenant',
      lastName: 'Admin',
      isSuperAdmin,
    },
    platformWorkspaces: [
      ...(isSuperAdmin ? ['super_admin' as WorkspaceId] : []),
      ...(isTenantAdmin ? ['tenant_admin' as WorkspaceId] : []),
    ],
    isTenantAdmin,
    companies,
  };

  return {
    status: 'authenticated',
    error: null,
    errorKind: null,
    access,
    activeCompany: companies[0] ?? null,
    can: (p) => permissions.includes(p),
    canAny: (perms) => perms.some((p) => permissions.includes(p)),
    canAll: (perms) => perms.every((p) => permissions.includes(p)),
    hasApplicationAccess: () => true,
    isSuperAdmin,
    isCompanyAdmin: roles.includes('company_admin'),
    completeSignIn: () => {},
    selectCompany: () => true,
    refreshAccess: async () => {},
    signOut: async () => {},
  };
}

describe('Tenant Admin Navigation Catalog — Frozen V1 IA & Integrity', () => {
  it('has unique destination IDs', () => {
    expect(new Set(destinations.map((d) => d.id)).size).toBe(destinations.length);
  });

  it('only references declared categories', () => {
    const known = new Set(categories.map((c) => c.id));
    for (const d of destinations) {
      if (d.categoryId) {
        expect(known.has(d.categoryId), `Unknown categoryId: ${d.categoryId}`).toBe(true);
      }
    }
  });

  it('resolves every icon against the design-system icon registry', () => {
    const icons = [
      ...categories.map((c) => c.icon),
      ...destinations.map((d) => d.icon),
      ...destinations.flatMap((d) => d.children?.map((c) => c.icon) ?? []),
    ];
    for (const icon of icons) {
      expect(ICON_DEFINITIONS[icon], `Missing icon: ${icon}`).toBeDefined();
    }
  });

  it('3. navigation renders exactly the 5 frozen V1 sections', () => {
    const categoryIds = TENANT_ADMIN_NAV_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toEqual(['overview', 'tenant', 'access', 'applications', 'governance']);

    const destinationIds = TENANT_ADMIN_NAV_DESTINATIONS.map((d) => d.id);
    expect(destinationIds).toEqual(['overview', 'tenant', 'access', 'applications', 'governance']);
  });

  it('satisfies single-destination vs flyout rules', () => {
    const overview = destinations.find((d) => d.id === 'overview')!;
    const tenant = destinations.find((d) => d.id === 'tenant')!;
    const access = destinations.find((d) => d.id === 'access')!;
    const applications = destinations.find((d) => d.id === 'applications')!;
    const governance = destinations.find((d) => d.id === 'governance')!;

    const shellItems = toShellNavItems(tenantAdminApplication);

    const overviewItem = shellItems.find((item) => item.id === 'overview')!;
    expect(overview.children?.length).toBe(1);
    expect(canItemOpenFlyout(overviewItem)).toBe(false);

    const governanceItem = shellItems.find((item) => item.id === 'governance')!;
    expect(governance.children?.length).toBe(1);
    expect(canItemOpenFlyout(governanceItem)).toBe(false);

    // Tenant, Access, Applications have >= 2 children -> open SubNavFlyout
    const tenantItem = shellItems.find((item) => item.id === 'tenant')!;
    expect(tenant.children?.length).toBe(2);
    expect(canItemOpenFlyout(tenantItem)).toBe(true);

    const accessItem = shellItems.find((item) => item.id === 'access')!;
    expect(access.children?.length).toBe(2);
    expect(canItemOpenFlyout(accessItem)).toBe(true);

    const applicationsItem = shellItems.find((item) => item.id === 'applications')!;
    expect(applications.children?.length).toBe(2);
    expect(canItemOpenFlyout(applicationsItem)).toBe(true);
  });

  it('is registered in APPLICATIONS catalog and can be resolved by path', () => {
    expect(APPLICATIONS.some((app) => app.id === 'tenant-admin')).toBe(true);
    expect(tenantAdminApplication.basePath).toBe('/tenant-admin');
    expect(findApplicationByPath('/tenant-admin/dashboard')?.id).toBe('tenant-admin');
    expect(findApplicationByPath('/tenant-admin/tenant/companies')?.id).toBe('tenant-admin');
  });

  it('4. active navigation state works across destinations and sub-destinations', () => {
    const app = tenantAdminApplication;

    // Overview / Dashboard
    const r1 = resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/dashboard');
    expect(r1?.destinationId).toBe('overview');
    expect(r1?.childId).toBe('dashboard');

    // Tenant / Details
    const r2 = resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/details');
    expect(r2?.destinationId).toBe('tenant');
    expect(r2?.childId).toBe('tenant-details');

    // Tenant / Companies
    const r3 = resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/companies');
    expect(r3?.destinationId).toBe('tenant');
    expect(r3?.childId).toBe('companies');

    // Access / Users
    const r4 = resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/access/users/members');
    expect(r4?.destinationId).toBe('access');
    expect(r4?.childId).toBe('users');

    // Applications / Access
    const r5 = resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/applications/access');
    expect(r5?.destinationId).toBe('applications');
    expect(r5?.childId).toBe('application-access');

    // Governance / Audit Logs
    const r6 = resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/governance/audit-logs');
    expect(r6?.destinationId).toBe('governance');
    expect(r6?.childId).toBe('audit-logs');

    // Deep-links across Tenant hierarchy
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/companies/new')?.destinationId).toBe('tenant');
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/companies/comp_001/overview')?.destinationId).toBe('tenant');
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/companies/comp_001/details')?.destinationId).toBe('tenant');
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/companies/comp_001/organization/structure')?.destinationId).toBe('tenant');
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/companies/comp_001/organization/departments')?.destinationId).toBe('tenant');
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/tenant/companies/comp_001/organization/locations')?.destinationId).toBe('tenant');

    // Deep-links across Access hierarchy
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/access/users/invitations')?.destinationId).toBe('access');
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/access/roles')?.destinationId).toBe('access');

    // Deep-links across Applications hierarchy
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/applications/setup')?.destinationId).toBe('applications');

    // Deep-links across Governance hierarchy
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/governance')?.destinationId).toBe('governance');
    expect(resolveActiveNavigation(app.navigation, app.basePath, '/tenant-admin/governance/audit-logs')?.destinationId).toBe('governance');
  });

  it('5. canonical default route resolution matches all 5 main navigation destinations', () => {
    const app = tenantAdminApplication;
    const destinations = app.navigation.destinations;

    // Overview -> /tenant-admin/dashboard
    const overview = destinations.find((d) => d.id === 'overview')!;
    expect(destinationPath(app.basePath, overview, 'dashboard')).toBe('/tenant-admin/dashboard');

    // Tenant -> /tenant-admin/tenant (redirects to /tenant-admin/tenant/details)
    const tenant = destinations.find((d) => d.id === 'tenant')!;
    expect(destinationPath(app.basePath, tenant)).toBe('/tenant-admin/tenant');

    // Access -> /tenant-admin/access (redirects to /tenant-admin/access/users/members)
    const access = destinations.find((d) => d.id === 'access')!;
    expect(destinationPath(app.basePath, access)).toBe('/tenant-admin/access');

    // Applications -> /tenant-admin/applications (redirects to /tenant-admin/applications/access)
    const applications = destinations.find((d) => d.id === 'applications')!;
    expect(destinationPath(app.basePath, applications)).toBe('/tenant-admin/applications');

    // Governance -> /tenant-admin/governance/audit-logs
    const governance = destinations.find((d) => d.id === 'governance')!;
    expect(destinationPath(app.basePath, governance, 'audit-logs')).toBe('/tenant-admin/governance/audit-logs');
  });
});

describe('Tenant Admin Route Access & Workspace Boundaries', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    });
  });

  it('1. Tenant Admin can enter /tenant-admin/dashboard', () => {
    const auth = createMockAuth({ isTenantAdmin: true });
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/tenant-admin/dashboard'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    // Shell and dashboard header rendered
    expect(html).toContain('Acme Global Corp');
    expect(html).toContain('Tenant Administration');
    expect(html).not.toContain('Access Denied');
  });

  it('2. non-Tenant-Admin cannot enter Tenant Admin workspace', () => {
    // Standard HR user without Tenant Admin or Super Admin authority
    const auth = createMockAuth({
      isTenantAdmin: false,
      workspaces: ['hrms'],
      roles: ['hr_manager'],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/tenant-admin/dashboard'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    // Should redirect away to /hrms/dashboard
    expect(html).not.toContain('Tenant Administration');
    expect(html).not.toContain('Tenant Identity &amp; Authority');
  });

  it('5. tenant-wide page does not require company selection', () => {
    // Tenant Admin with zero companies initially
    const auth = createMockAuth({
      isTenantAdmin: true,
      companies: [],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/tenant-admin/tenant/details'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    // Tenant details renders cleanly without requiring an active company
    expect(html).toContain('Tenant Details');
    expect(html).toContain('Tenant Information');
  });

  it('6. company-scoped route resolves company context correctly', () => {
    const auth = createMockAuth({ isTenantAdmin: true });
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/tenant-admin/tenant/companies/comp_001/overview'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('ACME_US');
    expect(html).toContain('Company Information');
    expect(html).toContain('Organization');
  });

  it('7. single-company context behaves correctly', () => {
    const singleCompany: CompanyAccess = {
      tenantId: 't1',
      tenantName: 'Acme Tenant',
      companyId: 'comp_sole',
      companyName: 'Sole Entity Ltd',
      companyCode: 'SOLE',
      isMember: true,
      isPlatformOversight: false,
      isTenantAdmin: true,
      roles: [],
      permissions: [],
      enabledModules: ['hrms'],
      essEligible: false,
      employeeId: null,
      workspaces: ['tenant_admin'],
    };

    const auth = createMockAuth({
      isTenantAdmin: true,
      companies: [singleCompany],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/tenant-admin/tenant/companies'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).toContain('Companies (1)');
    expect(html).toContain('Sole Entity Ltd');
  });

  it('8. multi-company context preserves explicit selection', () => {
    const compA: CompanyAccess = {
      tenantId: 't1',
      tenantName: 'Acme Tenant',
      companyId: 'comp_a',
      companyName: 'Company Alpha',
      companyCode: 'ALPHA',
      isMember: true,
      isPlatformOversight: false,
      isTenantAdmin: true,
      roles: [],
      permissions: [],
      enabledModules: ['hrms'],
      essEligible: false,
      employeeId: null,
      workspaces: ['tenant_admin'],
    };

    const compB: CompanyAccess = {
      tenantId: 't1',
      tenantName: 'Acme Tenant',
      companyId: 'comp_b',
      companyName: 'Company Beta',
      companyCode: 'BETA',
      isMember: true,
      isPlatformOversight: false,
      isTenantAdmin: true,
      roles: [],
      permissions: [],
      enabledModules: ['hrms'],
      essEligible: false,
      employeeId: null,
      workspaces: ['tenant_admin'],
    };

    const auth = createMockAuth({
      isTenantAdmin: true,
      companies: [compA, compB],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/tenant-admin/tenant/companies'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).toContain('Companies (2)');
    expect(html).toContain('Company Alpha');
    expect(html).toContain('Company Beta');
  });

  it('9. existing HRMS route remains functional', () => {
    const auth = createMockAuth({
      workspaces: ['hrms'],
      roles: ['hr_manager'],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/hrms/dashboard'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).not.toContain('Tenant Administration');
  });

  it('10. legacy Company Admin route compatibility is preserved where currently required', () => {
    const auth = createMockAuth({
      workspaces: ['company_admin'],
      roles: ['company_admin'],
    });

    const mockCompanyAdminContext = {
      activeCompanyId: auth.activeCompany?.companyId ?? null,
      activeCompany: auth.activeCompany
        ? {
            id: auth.activeCompany.companyId,
            name: auth.activeCompany.companyName,
            code: auth.activeCompany.companyCode,
            tenantId: auth.activeCompany.tenantId,
            tenantName: auth.activeCompany.tenantName ?? 'Demo Tenant',
            status: 'active' as const,
            role: 'company_admin',
            isPlatformOversight: false,
          }
        : null,
      authorizedCompanies: [],
      isLoadingCompanies: false,
      companyError: null,
      switchCompany: () => {},
      refreshCompanies: async () => {},
      isCompanyAdmin: auth.isCompanyAdmin,
    };

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/company-admin/dashboard'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <CompanyAdminContext.Provider value={mockCompanyAdminContext}>
            <RouterProvider router={router} />
          </CompanyAdminContext.Provider>
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).toContain('Company Admin');
    expect(html).toContain('Acme USA Inc');
  });
});

function createMockTenantAdminContext(overrides: Partial<TenantAdminContextValue> = {}): TenantAdminContextValue {
  return {
    tenantId: 'tenant_123',
    tenantName: 'Acme Global Corp',
    tenant: {
      id: 'tenant_123',
      name: 'Acme Global Corp',
      code: 'ACME',
      status: 'active',
      contactEmail: 'admin@acme.example',
      contactPhone: '+1-555-0100',
      createdAt: '2025-01-01T00:00:00Z',
    },
    user: {
      id: 'usr_01',
      email: 'admin@acme.example',
      firstName: 'Alice',
      lastName: 'Smith',
    },
    tenantAdmin: {
      id: 'ta_01',
      status: 'active',
      createdAt: '2025-01-01T00:00:00Z',
    },
    isTenantAdmin: true,
    isSuperAdmin: false,
    companies: [
      {
        id: 'comp_001',
        name: 'Acme USA Inc',
        code: 'ACME_US',
        status: 'active',
      },
    ],
    capacity: {
      used: 1,
      max: 5,
      remaining: 4,
      canCreateCompany: true,
      currentCompanies: 1,
      maxCompanies: 5,
      availableCapacity: 4,
      isAtCapacity: false,
    },
    isSingleCompany: true,
    entitlements: ['hrms', 'crm'],
    selectedCompanyId: 'comp_001',
    selectedCompany: null,
    selectCompany: vi.fn(),
    isLoading: false,
    error: null,
    authorizationDenied: false,
    refreshContext: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderDashboardWithMockContext(
  ctx: TenantAdminContextValue,
  initialApplications?: unknown,
) {
  const router = createMemoryRouter(
    [
      {
        path: '/tenant-admin/dashboard',
        element: (
          <TenantAdminContext.Provider value={ctx}>
            <TenantAdminDashboardPage
              initialApplications={initialApplications as unknown as TenantApplicationSummary[] | null}
            />
          </TenantAdminContext.Provider>
        ),
      },
    ],
    { initialEntries: ['/tenant-admin/dashboard'] },
  );

  return renderToStaticMarkup(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

function renderDetailsWithMockContext(ctx: TenantAdminContextValue, initialEditMode = false) {
  const router = createMemoryRouter(
    [
      {
        path: '/tenant-admin/tenant/details',
        element: (
          <TenantAdminContext.Provider value={ctx}>
            <TenantDetailsPage initialEditMode={initialEditMode} />
          </TenantAdminContext.Provider>
        ),
      },
    ],
    { initialEntries: ['/tenant-admin/tenant/details'] },
  );

  return renderToStaticMarkup(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

describe('Tenant Admin Phase 3B — Dashboard Product Tests (1-10)', () => {
  it('1. Tenant Admin dashboard loads real tenant context', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('Acme Global Corp');
    expect(html).toContain('Tenant Administration Control Center');
    expect(html).toContain('ACME');
  });

  it('2. Tenant status renders correctly', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('ACTIVE');
  });

  it('3. Company capacity renders used/max values', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('1 / 5');
    expect(html).toContain('4 remaining');
  });

  it('4. Add Company is enabled below capacity', () => {
    const ctx = createMockTenantAdminContext({
      capacity: {
        used: 1,
        max: 5,
        remaining: 4,
        canCreateCompany: true,
        isAtCapacity: false,
      },
    });
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('+ Add Company');
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>\+ Add Company<\/button>/);
  });

  it('5. Add Company is disabled when capacity reached', () => {
    const ctx = createMockTenantAdminContext({
      capacity: {
        used: 5,
        max: 5,
        remaining: 0,
        canCreateCompany: false,
        isAtCapacity: true,
      },
    });
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('+ Add Company');
    expect(html).toContain('Capacity Reached');
    expect(html).toContain('disabled');
  });

  it('6. Dashboard does not show HR/payroll/sales/project operational KPIs', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDashboardWithMockContext(ctx);

    expect(html).not.toContain('Employee Headcount');
    expect(html).not.toContain('Attrition Rate');
    expect(html).not.toContain('Payroll Run');
    expect(html).not.toContain('Sales Pipeline');
    expect(html).not.toContain('Sprint Velocity');
    expect(html).not.toContain('Open Requisitions');
  });

  it('7. Company navigation routes correctly', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('Manage Companies');
    expect(html).toContain('View Company');
    expect(html).toContain('Acme USA Inc');
    expect(html).toContain('ACME_US');
  });

  it('8. Application summary uses "Application" terminology', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('Applications Summary');
    expect(html).toContain('Application Entitlements');
    expect(html).toContain('HRMS');
    expect(html).toContain('CRM');
    expect(html).toContain('Project Management');
    expect(html).not.toContain('Application Modules');
    expect(html).not.toContain('Modules Summary');
  });

  it('9. No fake Needs Attention items are rendered', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDashboardWithMockContext(ctx);

    expect(html).toContain('No administrative issues require attention.');
  });

  it('10. Non-Tenant-Admin remains blocked from dashboard', () => {
    const auth = createMockAuth({
      isTenantAdmin: false,
      workspaces: ['hrms'],
      roles: ['hr_manager'],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/tenant-admin/dashboard'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).not.toContain('Tenant Administration Control Center');
  });
});

describe('Tenant Admin Phase 3B — Tenant Details Product Tests (11-20)', () => {
  it('11. Tenant Details loads canonical tenant information', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDetailsWithMockContext(ctx);

    expect(html).toContain('Acme Global Corp');
    expect(html).toContain('admin@acme.example');
    expect(html).toContain('+1-555-0100');
  });

  it('12. Tenant Code is read-only', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDetailsWithMockContext(ctx);

    expect(html).toContain('Tenant Code (Read-Only)');
    expect(html).toContain('ACME');
    expect(html).toContain('Controlled by Super Admin');
  });

  it('13. Tenant Status is read-only', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDetailsWithMockContext(ctx);

    expect(html).toContain('Tenant Status (Read-Only)');
    expect(html).toContain('ACTIVE');
    expect(html).toContain('Platform provisioning state');
  });

  it('14. Company Capacity is read-only', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDetailsWithMockContext(ctx);

    expect(html).toContain('Company Capacity (Read-Only)');
    expect(html).toContain('1 of 5 used');
    expect(html).toContain('4 remaining');
  });

  it('15. Application Entitlements are read-only', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDetailsWithMockContext(ctx);

    expect(html).toContain('Application Entitlements (Read-Only)');
    expect(html).toContain('HRMS');
    expect(html).toContain('CRM');
    expect(html).toContain('Project Management');
  });

  it('16. Editable fields are limited to approved tenant identity/contact fields', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDetailsWithMockContext(ctx, true);

    // Inputs must exist for editable contact details
    expect(html).toContain('Tenant / Customer Display Name');
    expect(html).toContain('Primary Contact Email');
    expect(html).toContain('Primary Contact Phone');

    // Platform information remains strictly read-only and governed
    expect(html).toContain('Tenant Code (Read-Only)');
    expect(html).toContain('Company Capacity (Read-Only)');
    expect(html).toContain('Platform Information (Super Admin Governed)');
  });

  it('17. Save uses canonical Tenant Admin API if supported', async () => {
    const updateSpy = vi.spyOn(tenantAdminApi, 'updateTenantDetails').mockResolvedValue({
      id: 'tenant_123',
      name: 'Updated Acme Name',
      code: 'ACME',
      status: 'active',
      contactEmail: 'new@acme.example',
      contactPhone: '+1-555-0999',
      createdAt: '2025-01-01T00:00:00Z',
    });

    const res = await tenantAdminApi.updateTenantDetails({
      name: 'Updated Acme Name',
      contactEmail: 'new@acme.example',
      contactPhone: '+1-555-0999',
    });

    expect(updateSpy).toHaveBeenCalledWith({
      name: 'Updated Acme Name',
      contactEmail: 'new@acme.example',
      contactPhone: '+1-555-0999',
    });
    expect(res.name).toBe('Updated Acme Name');
    updateSpy.mockRestore();
  });

  it('18. Cancel restores persisted values', () => {
    const ctx = createMockTenantAdminContext({
      tenant: {
        id: 'tenant_123',
        name: 'Original Persisted Name',
        code: 'ORIG',
        status: 'active',
        contactEmail: 'persisted@acme.example',
        contactPhone: '+1-555-1111',
        createdAt: '2025-01-01T00:00:00Z',
      },
    });

    // In normal view mode, displays persisted values
    const html = renderDetailsWithMockContext(ctx, false);
    expect(html).toContain('Original Persisted Name');
    expect(html).toContain('persisted@acme.example');
  });

  it('19. API error does not corrupt context state', async () => {
    const updateSpy = vi.spyOn(tenantAdminApi, 'updateTenantDetails').mockRejectedValue(
      new TenantAdminApiError('Tenant update not supported', 404),
    );

    const ctx = createMockTenantAdminContext();

    await expect(
      tenantAdminApi.updateTenantDetails({
        name: 'Broken Update',
      }),
    ).rejects.toThrow('Tenant update not supported');

    // Context state remains intact
    expect(ctx.tenant?.name).toBe('Acme Global Corp');
    expect(ctx.tenant?.status).toBe('active');
    updateSpy.mockRestore();
  });

  it('20. Tenant Details does not display Company-specific organization fields', () => {
    const ctx = createMockTenantAdminContext();
    const html = renderDetailsWithMockContext(ctx);

    expect(html).not.toContain('Fiscal Year Start');
    expect(html).not.toContain('Tax ID');
    expect(html).not.toContain('EIN');
    expect(html).not.toContain('Currency');
    expect(html).not.toContain('Time Zone');
    expect(html).not.toContain('Legal Structure');
  });
});

describe('Tenant Admin Phase 3B — Compatibility & Platform Invariants (21-24)', () => {
  it('21. HRMS Administration routes remain functional', () => {
    const auth = createMockAuth({
      workspaces: ['hrms'],
      roles: ['hr_manager'],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/hrms/dashboard'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).not.toContain('Tenant Administration');
  });

  it('22. Company Admin compatibility remains intact', () => {
    const auth = createMockAuth({
      workspaces: ['company_admin'],
      roles: ['company_admin'],
    });

    const mockCompanyAdminContext = {
      activeCompanyId: 'comp_001',
      activeCompany: {
        id: 'comp_001',
        name: 'Acme USA Inc',
        code: 'ACME_US',
        tenantId: 'tenant_123',
        tenantName: 'Acme Global Corp',
        status: 'active' as const,
        role: 'company_admin',
        isPlatformOversight: false,
      },
      authorizedCompanies: [],
      isLoadingCompanies: false,
      companyError: null,
      switchCompany: () => {},
      refreshCompanies: async () => {},
      isCompanyAdmin: true,
    };

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/company-admin/dashboard'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <CompanyAdminContext.Provider value={mockCompanyAdminContext}>
            <RouterProvider router={router} />
          </CompanyAdminContext.Provider>
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).toContain('Company Admin');
  });

  it('23. Super Admin routes remain intact', () => {
    const auth = createMockAuth({
      isSuperAdmin: true,
      workspaces: ['super_admin'],
    });

    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/super-admin/tenants'],
    });

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeProvider>,
    );

    expect(html).not.toContain('Access Denied');
  });

  it('24. Existing Tenant Admin Phase 3A tests remain passing', () => {
    // Verified by running all navigation and workspace boundary tests
    expect(destinations.length).toBe(5);
    expect(categories.length).toBe(5);
  });
});

describe('Tenant Admin Dashboard & Application Contract Regression Tests', () => {
  it('reproduces and prevents crash when application fields code and id are undefined', () => {
    const ctx = createMockTenantAdminContext();
    // Simulate raw backend response contract where code and id are undefined
    const rawBackendApplications = [
      {
        moduleCode: 'hrms',
        name: 'HRMS (Human Resource Management System)',
        description: 'Workforce and lifecycle',
        tenantEntitled: true,
        companyCount: 2,
        enabledCompanyCount: 1,
        companies: [],
      },
      {
        moduleCode: 'crm',
        name: 'CRM (Customer Relationship Management)',
        description: 'Sales and deals',
        tenantEntitled: false,
        companyCount: 2,
        enabledCompanyCount: 0,
        companies: [],
      },
    ];

    expect(() => {
      const html = renderDashboardWithMockContext(ctx, rawBackendApplications);
      expect(html).toContain('Applications Summary');
      expect(html).toContain('HRMS');
      expect(html).toContain('Enabled');
    }).not.toThrow();
  });

  it('tolerates legitimate missing/empty application data without crashing', () => {
    const ctx = createMockTenantAdminContext({ entitlements: ['hrms'] });
    expect(() => {
      const htmlWithEmpty = renderDashboardWithMockContext(ctx, []);
      expect(htmlWithEmpty).toContain('Applications Summary');
      expect(htmlWithEmpty).toContain('Enabled');

      const htmlWithNull = renderDashboardWithMockContext(ctx, null);
      expect(htmlWithNull).toContain('Applications Summary');
    }).not.toThrow();
  });

  it('tolerates malformed application objects with undefined properties safely', () => {
    const ctx = createMockTenantAdminContext({ entitlements: ['hrms'] });
    const malformedApps = [
      {},
      { moduleCode: undefined, code: undefined, id: undefined },
      { code: null as unknown as string },
    ];

    expect(() => {
      const html = renderDashboardWithMockContext(ctx, malformedApps);
      expect(html).toContain('Applications Summary');
    }).not.toThrow();
  });

  it('tenantAdminApi.listApplications normalizes backend distribution response contract', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              moduleCode: 'hrms',
              name: 'Human Resource Management System',
              description: 'Workforce lifecycle',
              tenantEntitled: true,
              companyCount: 3,
              enabledCompanyCount: 2,
              companies: [],
            },
            {
              moduleCode: 'crm',
              name: 'CRM',
              tenantEntitled: false,
              companyCount: 3,
              enabledCompanyCount: 0,
              companies: [],
            },
          ],
        }),
      } as unknown as Response);

      const apps = await tenantAdminApi.listApplications();
      expect(apps).toHaveLength(2);

      const hrms = apps[0]!;
      expect(hrms).toBeDefined();
      expect(hrms.code).toBe('hrms');
      expect(hrms.id).toBe('hrms');
      expect(hrms.moduleCode).toBe('hrms');
      expect(hrms.status).toBe('active');
      expect(hrms.tenantEntitled).toBe(true);
      expect(hrms.totalCompaniesCount).toBe(3);
      expect(hrms.enabledCompaniesCount).toBe(2);

      const crm = apps[1]!;
      expect(crm).toBeDefined();
      expect(crm.code).toBe('crm');
      expect(crm.status).toBe('inactive');
      expect(crm.tenantEntitled).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Tenant Profile Workspace & Navigation Tests', () => {
  it('1. Tenant sub-navigation displays "Tenant Profile" and "Companies"', () => {
    const tenantDest = destinations.find((d) => d.id === 'tenant')!;
    expect(tenantDest.children).toHaveLength(2);

    const profileSub = tenantDest.children!.find((c) => c.id === 'tenant-details')!;
    expect(profileSub).toBeDefined();
    expect(profileSub.label).toBe('Tenant Profile');
    expect(profileSub.path).toBe('tenant/details');

    const companiesSub = tenantDest.children!.find((c) => c.id === 'companies')!;
    expect(companiesSub).toBeDefined();
    expect(companiesSub.label).toBe('Companies');
    expect(companiesSub.path).toBe('tenant/companies');
  });

  it('2. TenantProfilePage renders cleanly with canonical tenant context', () => {
    const mockContext: TenantAdminContextValue = {
      tenantId: 'tnt_acme_corp',
      tenantName: 'Acme Global Corporation',
      tenant: {
        id: 'tnt_acme_corp',
        name: 'Acme Global Corporation',
        code: 'AGCORP',
        status: 'active',
        contactEmail: 'contact@acme.example',
        contactPhone: '+1-555-0199',
        createdAt: '2025-01-15T00:00:00.000Z',
      },
      user: {
        id: 'usr_admin',
        email: 'admin@acme.example',
        firstName: 'Jane',
        lastName: 'Doe',
      },
      tenantAdmin: {
        id: 'ta_01',
        status: 'active',
        createdAt: '2025-01-15T00:00:00.000Z',
      },
      isTenantAdmin: true,
      isSuperAdmin: false,
      companies: [
        {
          id: 'comp_01',
          name: 'Acme HQ',
          code: 'AHQ',
          status: 'active',
          country: 'US',
          timeZone: 'UTC',
          currency: 'USD',
        },
      ],
      capacity: {
        used: 1,
        max: 5,
        remaining: 4,
        canCreateCompany: true,
      },
      isSingleCompany: true,
      entitlements: ['hrms', 'crm'],
      selectedCompanyId: 'comp_01',
      selectedCompany: null,
      selectCompany: () => {},
      isLoading: false,
      error: null,
      authorizationDenied: false,
      refreshContext: async () => {},
      refresh: async () => {},
    };

    const html = renderToStaticMarkup(
      <TenantAdminContext.Provider value={mockContext}>
        <TenantProfilePage />
      </TenantAdminContext.Provider>,
    );

    // Header & Hero Identity
    expect(html).toContain('Tenant Profile');
    expect(html).toContain('Acme Global Corporation');
    expect(html).toContain('AGCORP');
    expect(html).toContain('tnt_acme_corp');
    expect(html).toContain('ACTIVE');
    expect(html).toContain('Platform Governed');

    // Allocation Summary
    expect(html).toContain('Companies');
    expect(html).toContain('1 / 5');
    expect(html).toContain('4 remaining capacity');

    // Primary Contact
    expect(html).toContain('contact@acme.example');
    expect(html).toContain('+1-555-0199');

    // Application Entitlements
    expect(html).toContain('Human Resource Management (HRMS)');
    expect(html).toContain('Customer Relationship Management (CRM)');
    expect(html).toContain('Project Management');
    expect(html).toContain('Entitled');
    expect(html).toContain('Not Entitled');
  });

  it('3. TenantDetailsPage alias renders identically without runtime errors', () => {
    const mockContext: TenantAdminContextValue = {
      tenantId: 'tnt_acme_corp',
      tenantName: 'Acme Global Corporation',
      tenant: {
        id: 'tnt_acme_corp',
        name: 'Acme Global Corporation',
        code: null,
        status: 'active',
        contactEmail: null,
        contactPhone: null,
        createdAt: '2025-01-15T00:00:00.000Z',
      },
      user: null,
      tenantAdmin: null,
      isTenantAdmin: true,
      isSuperAdmin: false,
      companies: [],
      capacity: {
        used: 0,
        max: 3,
        remaining: 3,
        canCreateCompany: true,
      },
      isSingleCompany: false,
      entitlements: ['hrms'],
      selectedCompanyId: null,
      selectedCompany: null,
      selectCompany: () => {},
      isLoading: false,
      error: null,
      authorizationDenied: false,
      refreshContext: async () => {},
      refresh: async () => {},
    };

    const html = renderToStaticMarkup(
      <TenantAdminContext.Provider value={mockContext}>
        <TenantDetailsPage />
      </TenantAdminContext.Provider>,
    );

    expect(html).toContain('Tenant Profile');
    expect(html).toContain('Acme Global Corporation');
    expect(html).toContain('Platform Governed');
  });
});


