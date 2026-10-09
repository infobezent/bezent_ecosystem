/**
 * Workspace Shell & Navigation Isolation Regression Tests
 *
 * Asserts that:
 * 1. Unauthorized WORKSPACE SHELL/NAVIGATION does NOT render for any cross-workspace attempt.
 * 2. Unauthorized PAGE CONTENT does NOT render (no page-level 'Access denied' within an unauthorized shell).
 * 3. The workspace guards immediately redirect unauthorized users to their authorized workspace.
 * 4. Authorized users render their own workspace shell and navigation without leakage.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider, MemoryRouter } from 'react-router-dom';
import { appRoutes } from '../../../app/router/AppRouter';
import { AuthContext, type AuthContextValue } from '../AuthProvider';
import { ThemeProvider } from '../../../app/providers/ThemeProvider';
import { CompanyAdminContext } from '../../../applications/company-admin/context/CompanyAdminContext';
import { RequireSuperAdminWorkspace } from '../../../administration/super-admin/routes/superAdminRoutes';
import { RequireTenantAdminWorkspace } from '../../../administration/tenant-admin/routes/tenantAdminRoutes';
import { RequireCompanyAdminWorkspace } from '../../../applications/company-admin/routes/companyAdminRoutes';
import { RequireHrmsWorkspace } from '../../../applications/hrms/routes/hrmsRoutes';
import { RequireEssWorkspace } from '../../../applications/hrms/ess/routes/essRoutes';
import type { AccessOverview, CompanyAccess, ModuleCode, WorkspaceId } from '../authApi';

function makeMockAuth(
  email: string,
  opts: {
    isSuperAdmin?: boolean;
    isTenantAdmin?: boolean;
    workspaces?: WorkspaceId[];
    roles?: string[];
    permissions?: string[];
    essEligible?: boolean;
    companies?: CompanyAccess[];
  } = {},
): AuthContextValue {
  const isSuperAdmin = Boolean(opts.isSuperAdmin);
  const isTenantAdmin = Boolean(opts.isTenantAdmin);
  const workspaces: WorkspaceId[] = opts.workspaces ?? [];
  const roles = opts.roles ?? [];
  const permissions = opts.permissions ?? [];
  const essEligible = Boolean(opts.essEligible);

  const defaultCompany: CompanyAccess | null =
    workspaces.length > 0 || roles.length > 0 || isTenantAdmin
      ? {
          tenantId: 't1',
          tenantName: 'Demo Tenant',
          companyId: 'comp_demo_01',
          companyName: 'BEZENT Demo Pvt Ltd',
          companyCode: 'DEMO',
          isMember: !isTenantAdmin || roles.length > 0,
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
          essEligible,
          employeeId: essEligible ? 'emp_01' : null,
          workspaces: isTenantAdmin && !workspaces.includes('company_admin')
            ? ['company_admin', ...workspaces]
            : workspaces,
        }
      : null;

  const companies = opts.companies ?? (defaultCompany ? [defaultCompany] : []);

  const access: AccessOverview = {
    user: {
      id: `usr_${email.replace(/[^a-z0-9]/gi, '_')}`,
      email,
      firstName: 'Demo',
      lastName: 'User',
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

describe('Workspace & Shell Isolation Boundaries', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderAt(initialUrl: string, auth: AuthContextValue): string {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: [initialUrl],
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

    return renderToStaticMarkup(
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <CompanyAdminContext.Provider value={mockCompanyAdminContext}>
            <RouterProvider router={router} />
          </CompanyAdminContext.Provider>
        </AuthContext.Provider>
      </ThemeProvider>,
    );
  }

  function testGuardRedirect(
    GuardComponent: () => React.ReactElement | null,
    authVal: AuthContextValue,
    initialPath = '/',
  ): { to?: string; replace?: boolean } | null {
    let captured: React.ReactElement | null = null;
    function Probe() {
      captured = GuardComponent();
      return null;
    }
    renderToStaticMarkup(
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthContext.Provider value={authVal}>
          <Probe />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    if (!captured) return null;
    const props = (captured as React.ReactElement<{ to?: string; replace?: boolean }>).props;
    if (!props?.to) return null;
    return { to: props.to, replace: props.replace };
  }

  describe('HR Identity (hr@bezent.com) attempting unauthorized access and full HRMS access', () => {
    const hrAuth = makeMockAuth('hr@bezent.com', {
      workspaces: ['hrms'],
      roles: ['hr_manager'],
      permissions: [
        'hrms.dashboard.view',
        'hrms.administration.view',
        'hrms.employees.view',
        'hrms.onboarding.view',
        'hrms.documents.view',
        'hrms.leave.view',
        'hrms.attendance.view',
        'hrms.timesheets.view',
        'hrms.performance.view',
        'hrms.organization.view',
        'hrms.settings.view',
      ],
    });

    it('DENIES /super-admin/provisioning without rendering Super Admin shell or navigation', () => {
      const html = renderAt('/super-admin/provisioning', hrAuth);

      // 1. Super Admin shell navigation labels must be strictly ABSENT
      expect(html).not.toContain('Customer Provisioning');
      expect(html).not.toContain('Platform Users');
      expect(html).not.toContain('Company Admins');
      expect(html).not.toContain('Platform Settings');
      expect(html).not.toContain('Tenants');

      // 2. Must NOT render page-level "Access denied" alert inside Super Admin shell
      expect(html).not.toContain(
        'Platform administration is available to BEZENT Super Admins only',
      );
    });

    it('redirects HR user from RequireSuperAdminWorkspace directly to /hrms/dashboard', () => {
      const res = testGuardRedirect(RequireSuperAdminWorkspace, hrAuth);
      expect(res).toEqual({ to: '/hrms/dashboard', replace: true });
    });

    it('DENIES /company-admin without rendering Company Admin shell or navigation', () => {
      const html = renderAt('/company-admin/roles', hrAuth);

      // Company Admin navigation labels must be strictly ABSENT
      expect(html).not.toContain('Company Invitations');
      expect(html).not.toContain('Company Roles');
      expect(html).not.toContain('Company Modules');
    });

    it('redirects HR user from RequireCompanyAdminWorkspace directly to /hrms/dashboard', () => {
      const res = testGuardRedirect(RequireCompanyAdminWorkspace, hrAuth);
      expect(res).toEqual({ to: '/hrms/dashboard', replace: true });
    });

    it('ALLOWS authorized HRMS administration route /hrms/dashboard and renders full HRMS sidebar navigation', () => {
      const html = renderAt('/hrms/dashboard', hrAuth);
      expect(html).toContain('HRMS');

      // Full representative HRMS sidebar navigation must be present
      expect(html).toContain('Dashboard');
      expect(html).toContain('Administration');
      expect(html).toContain('Leave');
      expect(html).toContain('Attendance');
      expect(html).toContain('Timesheets');
      expect(html).toContain('Performance');
    });

    it('ALLOWS direct URL /hrms/employees and renders HRMS shell without access denied', () => {
      const html = renderAt('/hrms/employees', hrAuth);
      expect(html).not.toContain('Access Denied');
      expect(html).not.toContain('Unauthorized');
      expect(html).toContain('Administration');
    });

    it('ALLOWS canonical URL /hrms/administration/employees and renders employee directory with subnav', () => {
      const html = renderAt('/hrms/administration/employees', hrAuth);
      expect(html).not.toContain('Access Denied');
      expect(html).not.toContain('Unauthorized');
      expect(html).toContain('Administration');
      expect(html).toContain('Employees');
      expect(html).toContain('Find employees and view their employment information');
    });

    it('ALLOWS direct URL /hrms/onboarding and renders onboarding without access denied', () => {
      const html = renderAt('/hrms/onboarding', hrAuth);
      expect(html).not.toContain('Access Denied');
      expect(html).not.toContain('Unauthorized');
      expect(html).toContain('Onboarding');
    });

    it('ALLOWS direct URL /hrms/leave and renders leave without access denied', () => {
      const html = renderAt('/hrms/leave', hrAuth);
      expect(html).not.toContain('Access Denied');
      expect(html).toContain('Leave');
    });

    it('ALLOWS direct URL /hrms/attendance and renders attendance without access denied', () => {
      const html = renderAt('/hrms/attendance', hrAuth);
      expect(html).not.toContain('Access Denied');
      expect(html).toContain('Attendance');
    });

    it('ALLOWS direct URL /hrms/timesheets and renders timesheets without access denied', () => {
      const html = renderAt('/hrms/timesheets', hrAuth);
      expect(html).not.toContain('Access Denied');
      expect(html).toContain('Timesheets');
    });

    it('ALLOWS direct URL /hrms/performance and renders performance without access denied', () => {
      const html = renderAt('/hrms/performance', hrAuth);
      expect(html).not.toContain('Access Denied');
      expect(html).toContain('Performance');
    });
  });

  describe('Employee Identity (employee@bezent.com) attempting unauthorized access', () => {
    const employeeAuth = makeMockAuth('employee@bezent.com', {
      workspaces: ['ess'],
      roles: ['employee'],
      essEligible: true,
    });

    it('DENIES /hrms/leave without rendering HRMS Administration shell or navigation', () => {
      const html = renderAt('/hrms/leave', employeeAuth);

      // HRMS Administration navigation labels must be ABSENT
      expect(html).not.toContain('Employee Directory');
      expect(html).not.toContain('Employee Administration');
      expect(html).not.toContain('Direct Employee Registration');
    });

    it('redirects Employee from RequireHrmsWorkspace directly to /ess', () => {
      const res = testGuardRedirect(RequireHrmsWorkspace, employeeAuth);
      expect(res).toEqual({ to: '/ess', replace: true });
    });

    it('DENIES /super-admin without rendering Super Admin shell or navigation', () => {
      const html = renderAt('/super-admin/tenants', employeeAuth);

      expect(html).not.toContain('Customer Provisioning');
      expect(html).not.toContain('Platform Users');
      expect(html).not.toContain('Platform Settings');
    });

    it('redirects Employee from RequireSuperAdminWorkspace directly to /ess', () => {
      const res = testGuardRedirect(RequireSuperAdminWorkspace, employeeAuth);
      expect(res).toEqual({ to: '/ess', replace: true });
    });

    it('DENIES /company-admin without rendering Company Admin shell or navigation', () => {
      const html = renderAt('/company-admin/dashboard', employeeAuth);

      expect(html).not.toContain('Company Invitations');
      expect(html).not.toContain('Company Modules');
    });

    it('redirects Employee from RequireCompanyAdminWorkspace directly to /ess', () => {
      const res = testGuardRedirect(RequireCompanyAdminWorkspace, employeeAuth);
      expect(res).toEqual({ to: '/ess', replace: true });
    });

    it('ALLOWS authorized ESS workspace route /ess/dashboard and renders ESS shell', () => {
      const html = renderAt('/ess/dashboard', employeeAuth);
      expect(html).toContain('Attendance');
    });
  });

  describe('Company Admin Identity (companyadmin@bezent.com) attempting unauthorized access', () => {
    const companyAdminAuth = makeMockAuth('companyadmin@bezent.com', {
      workspaces: ['company_admin'],
      roles: ['company_admin'],
    });

    it('DENIES /super-admin/provisioning without rendering Super Admin shell or navigation', () => {
      const html = renderAt('/super-admin/provisioning', companyAdminAuth);

      // Super Admin navigation labels must be absent
      expect(html).not.toContain('Customer Provisioning');
      expect(html).not.toContain('Platform Users');
      expect(html).not.toContain('Platform Settings');
    });

    it('redirects Company Admin from RequireSuperAdminWorkspace directly to /company-admin', () => {
      const res = testGuardRedirect(RequireSuperAdminWorkspace, companyAdminAuth);
      expect(res).toEqual({ to: '/company-admin', replace: true });
    });

    it('ALLOWS authorized Company Admin workspace route /company-admin/dashboard', () => {
      const html = renderAt('/company-admin/dashboard', companyAdminAuth);
      expect(html).toContain('Company Admin');
    });
  });

  describe('Super Admin Identity (superadmin@bezent.com)', () => {
    const superAdminAuth = makeMockAuth('superadmin@bezent.com', {
      isSuperAdmin: true,
    });

    it('ALLOWS /super-admin/provisioning and renders Super Admin shell and navigation', () => {
      const html = renderAt('/super-admin/provisioning', superAdminAuth);

      // Super Admin navigation labels are present
      expect(html).toContain('Tenants');
      expect(html).toContain('Subscriptions');
    });

    it('DENIES /tenant-admin/dashboard for Super Admin without Tenant Admin authority', () => {
      const res = testGuardRedirect(RequireTenantAdminWorkspace, superAdminAuth);
      expect(res).toEqual({ to: '/super-admin', replace: true });
    });

    it('DENIES /company-admin/dashboard for Super Admin without company authority', () => {
      const res = testGuardRedirect(RequireCompanyAdminWorkspace, superAdminAuth);
      expect(res).toEqual({ to: '/super-admin', replace: true });
    });

    it('DENIES /ess for Super Admin without linked employee record', () => {
      const html = renderAt('/ess/dashboard', superAdminAuth);

      expect(html).not.toContain('My Personal Overview');
    });

    it('redirects Super Admin without linked employee from RequireEssWorkspace to /super-admin', () => {
      const res = testGuardRedirect(RequireEssWorkspace, superAdminAuth);
      expect(res).toEqual({ to: '/super-admin', replace: true });
    });
  });

  describe('Tenant Admin Identity (tenantadmin@bezent.com)', () => {
    const tenantAdminAuth = makeMockAuth('tenantadmin@bezent.com', {
      isTenantAdmin: true,
    });

    it('ALLOWS /tenant-admin/dashboard for Tenant Admin', () => {
      const res = testGuardRedirect(RequireTenantAdminWorkspace, tenantAdminAuth);
      expect(res).toBeNull();
    });

    it('DENIES /super-admin/dashboard for Tenant Admin without Super Admin authority', () => {
      const res = testGuardRedirect(RequireSuperAdminWorkspace, tenantAdminAuth);
      expect(res).toEqual({ to: '/tenant-admin', replace: true });
    });

    it('ALLOWS company administration for own-tenant company', () => {
      const res = testGuardRedirect(RequireCompanyAdminWorkspace, tenantAdminAuth);
      expect(res).toBeNull();
    });
  });

  describe('Explicit Dual Authority (dual@bezent.com)', () => {
    const dualAuth = makeMockAuth('dual@bezent.com', {
      isSuperAdmin: true,
      isTenantAdmin: true,
    });

    it('ALLOWS Super Admin workspace for dual authority user', () => {
      const res = testGuardRedirect(RequireSuperAdminWorkspace, dualAuth);
      expect(res).toBeNull();
    });

    it('ALLOWS Tenant Admin workspace for dual authority user', () => {
      const res = testGuardRedirect(RequireTenantAdminWorkspace, dualAuth);
      expect(res).toBeNull();
    });
  });

  describe('Cross-Workspace Navigation Isolation: Company Admin to Tenant Admin', () => {
    const companyAdminAuth = makeMockAuth('companyadmin@bezent.com', {
      workspaces: ['company_admin'],
      roles: ['company_admin'],
    });

    it('DENIES /tenant-admin/dashboard for Company Admin', () => {
      const res = testGuardRedirect(RequireTenantAdminWorkspace, companyAdminAuth);
      expect(res).toEqual({ to: '/company-admin', replace: true });
    });
  });
});
