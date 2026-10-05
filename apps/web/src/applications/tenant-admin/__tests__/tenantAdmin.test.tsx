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
import { resolveActiveNavigation } from '../../../shared/utils/navigation';
import { appRoutes } from '../../../app/router/AppRouter';
import { AuthContext, type AuthContextValue } from '../../../platform/auth/AuthProvider';
import { ThemeProvider } from '../../../app/providers/ThemeProvider';
import { CompanyAdminContext } from '../../../applications/company-admin/context/CompanyAdminContext';
import type { AccessOverview, CompanyAccess, ModuleCode, WorkspaceId } from '../../../platform/auth/authApi';

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
    expect(html).toContain('Tenant Overview');
    expect(html).toContain('Tenant Identity &amp; Authority');
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
    expect(html).toContain('Company Profile Summary');
    expect(html).toContain('Organizational Units');
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
