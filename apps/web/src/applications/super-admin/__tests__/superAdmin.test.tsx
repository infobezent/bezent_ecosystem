import { describe, expect, it } from 'vitest';
import { ICON_DEFINITIONS } from '../../../design-system/icons/definitions';
import { superAdminApplication } from '../index';
import { SUPER_ADMIN_BASE_PATH } from '../routes/superAdminRoutes';
import { superAdminNavigation } from '../navigation/superAdminNavigation';
import { APPLICATIONS, findApplicationByPath } from '../../../app/config/applications';
import { destinationPath, resolveActiveNavigation } from '../../../shared/utils/navigation';

const { categories, destinations } = superAdminNavigation;

describe('Super Admin Main Nav → Sub Nav Information Architecture', () => {
  it('1. Super Admin Main Nav contains exactly 4 entries: Overview, Customers, Access, Governance', () => {
    const mainNavIds = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(mainNavIds).toEqual(['overview', 'customers', 'access', 'governance']);

    const labels = destinations.map((d) => d.label);
    expect(labels).toEqual(['Overview', 'Customers', 'Access', 'Governance']);

    // Access compact label with flyoutTitle override
    const accessDest = destinations.find((d) => d.id === 'access');
    expect(accessDest?.label).toBe('Access');
    expect(accessDest?.flyoutTitle).toBe('Access & Applications');
  });

  it('1b. Overview has exactly one child (Dashboard) and resolves directly without flyout', () => {
    const overview = destinations.find((d) => d.id === 'overview');
    expect(overview).toBeDefined();
    expect(overview?.children).toHaveLength(1);
    expect(overview?.children?.[0]?.id).toBe('dashboard');
    expect(overview?.children?.[0]?.path).toBe('dashboard');

    const path = destinationPath(SUPER_ADMIN_BASE_PATH, overview!);
    expect(path).toBe('/super-admin/dashboard');
  });

  it('2. Customers exposes: Tenants, Companies, Customer Provisioning', () => {
    const customers = destinations.find((d) => d.id === 'customers');
    expect(customers).toBeDefined();
    const childIds = customers?.children?.map((c) => c.id);
    expect(childIds).toEqual(['tenants', 'companies', 'provisioning']);
    const childLabels = customers?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Tenants', 'Companies', 'Customer Provisioning']);
  });

  it('3. Access exposes: Platform Users, Company Admins, Application Access', () => {
    const access = destinations.find((d) => d.id === 'access');
    expect(access).toBeDefined();
    const childIds = access?.children?.map((c) => c.id);
    expect(childIds).toEqual(['users', 'company-admins', 'modules']);
    const childLabels = access?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Platform Users', 'Company Admins', 'Application Access']);
  });

  it('4. Governance exposes: Audit Logs, Platform Settings', () => {
    const governance = destinations.find((d) => d.id === 'governance');
    expect(governance).toBeDefined();
    const childIds = governance?.children?.map((c) => c.id);
    expect(childIds).toEqual(['audit-logs', 'settings']);
    const childLabels = governance?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Audit Logs', 'Platform Settings']);
  });

  it('has unique destination IDs and category references', () => {
    expect(new Set(destinations.map((d) => d.id)).size).toBe(destinations.length);
    const knownCategories = new Set(categories.map((c) => c.id));
    for (const d of destinations) {
      if (d.categoryId) {
        expect(knownCategories.has(d.categoryId)).toBe(true);
      }
    }
  });

  it('resolves every icon against the design-system icon registry', () => {
    const icons = [
      ...categories.map((c) => c.icon),
      ...destinations.map((d) => d.icon),
      ...destinations.flatMap((d) => (d.children ? d.children.map((c) => c.icon) : [])),
    ];
    for (const icon of icons) {
      expect(ICON_DEFINITIONS[icon], `Missing icon: ${icon}`).toBeDefined();
    }
  });
});

describe('Super Admin Route → Main Nav → Sub Nav Active State Resolution', () => {
  it('5. /super-admin/companies → Customers + Companies active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/companies',
    );
    expect(resolved).toEqual({
      destinationId: 'customers',
      childId: 'companies',
    });
  });

  it('6. /super-admin/companies/:companyId → Customers + Companies active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/companies/comp_apj3d_01',
    );
    expect(resolved).toEqual({
      destinationId: 'customers',
      childId: 'companies',
    });
  });

  it('7. /super-admin/tenants → Customers + Tenants active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/tenants',
    );
    expect(resolved).toEqual({
      destinationId: 'customers',
      childId: 'tenants',
    });
  });

  it('8. /super-admin/tenants/:tenantId → Customers + Tenants active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/tenants/tenant_acme_01',
    );
    expect(resolved).toEqual({
      destinationId: 'customers',
      childId: 'tenants',
    });
  });

  it('9. /super-admin/users → Access + Platform Users active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/users',
    );
    expect(resolved).toEqual({
      destinationId: 'access',
      childId: 'users',
    });
  });

  it('10. /super-admin/company-admins → Access + Company Admins active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/company-admins',
    );
    expect(resolved).toEqual({
      destinationId: 'access',
      childId: 'company-admins',
    });
  });

  it('11. /super-admin/modules → Access + Application Access active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/modules',
    );
    expect(resolved).toEqual({
      destinationId: 'access',
      childId: 'modules',
    });
  });

  it('12. /super-admin/audit-logs → Governance + Audit Logs active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/audit-logs',
    );
    expect(resolved).toEqual({
      destinationId: 'governance',
      childId: 'audit-logs',
    });
  });

  it('13. /super-admin/settings → Governance + Platform Settings active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/settings',
    );
    expect(resolved).toEqual({
      destinationId: 'governance',
      childId: 'settings',
    });
  });

  it('14. Direct URL refresh preserves correct navigation hierarchy across all routes', () => {
    // Overview / Dashboard
    expect(
      resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/dashboard',
      ),
    ).toEqual({
      destinationId: 'overview',
      childId: 'dashboard',
    });

    // Customer Provisioning
    expect(
      resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/provisioning',
      ),
    ).toEqual({
      destinationId: 'customers',
      childId: 'provisioning',
    });

    // Deep nested detail routes
    expect(
      resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/tenants/tenant_xyz/details',
      ),
    ).toEqual({
      destinationId: 'customers',
      childId: 'tenants',
    });

    expect(
      resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/companies/comp_xyz/overview',
      ),
    ).toEqual({
      destinationId: 'customers',
      childId: 'companies',
    });
  });
});

describe('Super Admin Application Registration', () => {
  it('is registered in global APPLICATIONS list', () => {
    const registered = APPLICATIONS.find((app) => app.id === 'super-admin');
    expect(registered).toBeDefined();
    expect(registered?.basePath).toBe(SUPER_ADMIN_BASE_PATH);
  });

  it('is resolved by path matcher for super-admin routes', () => {
    const app = findApplicationByPath('/super-admin/tenants');
    expect(app).toBeDefined();
    expect(app?.id).toBe('super-admin');
  });

  it('defines valid routes including dashboard and management pages', () => {
    const routes = superAdminApplication.routes;
    expect(routes.length).toBeGreaterThan(0);
    const rootRoute = routes[0];
    const childPaths = (rootRoute?.children ?? []).map((c) => c.path);
    expect(childPaths).toContain('dashboard');
    expect(childPaths).toContain('login');
    expect(childPaths).toContain('tenants');
    expect(childPaths).toContain('companies');
    expect(childPaths).toContain('provisioning');
    expect(childPaths).toContain('users');
    expect(childPaths).toContain('company-admins');
    expect(childPaths).toContain('modules');
    expect(childPaths).toContain('audit-logs');
    expect(childPaths).toContain('settings');
  });
});
