import { describe, expect, it } from 'vitest';
import { ICON_DEFINITIONS } from '../../../design-system/icons/definitions';
import { superAdminApplication } from '../index';
import { SUPER_ADMIN_BASE_PATH } from '../routes/superAdminRoutes';
import { superAdminNavigation } from '../navigation/superAdminNavigation';
import { APPLICATIONS, findApplicationByPath } from '../../../app/config/applications';
import { destinationPath, resolveActiveNavigation } from '../../../shared/utils/navigation';

const { categories, destinations } = superAdminNavigation;

describe('Super Admin Main Nav → Sub Nav Information Architecture', () => {
  it('1. Super Admin Main Nav contains exactly 8 entries in exact order: Overview, Tenants, Subscriptions, Applications, Governance, Operations, Support, Settings', () => {
    const mainNavIds = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(mainNavIds).toEqual([
      'overview',
      'tenants',
      'subscriptions',
      'applications',
      'governance',
      'operations',
      'support',
      'settings',
    ]);

    const labels = destinations.map((d) => d.label);
    expect(labels).toEqual([
      'Overview',
      'Tenants',
      'Subscriptions',
      'Applications',
      'Governance',
      'Operations',
      'Support',
      'Settings',
    ]);
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

  it('2. Tenants is a direct navigation destination with no flyout children', () => {
    const tenants = destinations.find((d) => d.id === 'tenants');
    expect(tenants).toBeDefined();
    expect(tenants?.children).toBeUndefined();
    expect(tenants?.sidebar).toBe(true);
    expect(tenants?.segment).toBe('tenants');
    expect(tenants?.label).toBe('Tenants');
    expect(destinationPath(SUPER_ADMIN_BASE_PATH, tenants!)).toBe('/super-admin/tenants');
  });

  it('3. Subscriptions exposes: Plans, Tenant Subscriptions, Entitlements', () => {
    const subs = destinations.find((d) => d.id === 'subscriptions');
    expect(subs).toBeDefined();
    const childIds = subs?.children?.map((c) => c.id);
    expect(childIds).toEqual(['plans', 'tenant-subscriptions', 'entitlements']);
    const childLabels = subs?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Plans', 'Tenant Subscriptions', 'Entitlements']);
  });

  it('4. Applications exposes: Application Catalog, Module Catalog', () => {
    const apps = destinations.find((d) => d.id === 'applications');
    expect(apps).toBeDefined();
    const childIds = apps?.children?.map((c) => c.id);
    expect(childIds).toEqual(['app-catalog', 'module-catalog']);
    const childLabels = apps?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Application Catalog', 'Module Catalog']);
  });

  it('5. Governance exposes: Audit Logs, Platform Administrators', () => {
    const governance = destinations.find((d) => d.id === 'governance');
    expect(governance).toBeDefined();
    const childIds = governance?.children?.map((c) => c.id);
    expect(childIds).toEqual(['audit-logs', 'platform-admins']);
    const childLabels = governance?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Audit Logs', 'Platform Administrators']);
  });

  it('6. Operations exposes: Tenant Health, Provisioning Jobs', () => {
    const operations = destinations.find((d) => d.id === 'operations');
    expect(operations).toBeDefined();
    const childIds = operations?.children?.map((c) => c.id);
    expect(childIds).toEqual(['tenant-health', 'provisioning-jobs']);
    const childLabels = operations?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Tenant Health', 'Provisioning Jobs']);
  });

  it('7. Support exposes: Support Cases, Controlled Support Access', () => {
    const support = destinations.find((d) => d.id === 'support');
    expect(support).toBeDefined();
    const childIds = support?.children?.map((c) => c.id);
    expect(childIds).toEqual(['support-cases', 'controlled-access']);
    const childLabels = support?.children?.map((c) => c.label);
    expect(childLabels).toEqual(['Support Cases', 'Controlled Support Access']);
  });

  it('8. Settings exposes: Platform Configuration (single child, direct navigate)', () => {
    const settings = destinations.find((d) => d.id === 'settings');
    expect(settings).toBeDefined();
    expect(settings?.children).toHaveLength(1);
    expect(settings?.children?.[0]?.id).toBe('platform-config');
    expect(settings?.children?.[0]?.label).toBe('Platform Configuration');
    expect(settings?.children?.[0]?.path).toBe('settings');
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
  it('1. /super-admin/dashboard → Overview + Dashboard active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/dashboard',
    );
    expect(resolved).toEqual({
      destinationId: 'overview',
      childId: 'dashboard',
    });
  });

  it('2. /super-admin/tenants → Tenants active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/tenants',
    );
    expect(resolved).toEqual({
      destinationId: 'tenants',
    });
  });

  it('3. /super-admin/tenants/create → Tenants active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/tenants/create',
    );
    expect(resolved).toEqual({
      destinationId: 'tenants',
    });
  });

  it('4. /super-admin/tenants/details → preserves Tenants context', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/tenants/details',
    );
    expect(resolved).toEqual({
      destinationId: 'tenants',
    });
  });

  it('5. /super-admin/subscriptions/plans → Subscriptions + Plans active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/subscriptions/plans',
    );
    expect(resolved).toEqual({
      destinationId: 'subscriptions',
      childId: 'plans',
    });
  });

  it('6. /super-admin/subscriptions/tenants → Subscriptions + Tenant Subscriptions active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/subscriptions/tenants',
    );
    expect(resolved).toEqual({
      destinationId: 'subscriptions',
      childId: 'tenant-subscriptions',
    });
  });

  it('7. /super-admin/subscriptions/entitlements → Subscriptions + Entitlements active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/subscriptions/entitlements',
    );
    expect(resolved).toEqual({
      destinationId: 'subscriptions',
      childId: 'entitlements',
    });
  });

  it('8. /super-admin/applications/catalog → Applications + Application Catalog active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/applications/catalog',
    );
    expect(resolved).toEqual({
      destinationId: 'applications',
      childId: 'app-catalog',
    });
  });

  it('9. /super-admin/applications/modules → Applications + Module Catalog active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/applications/modules',
    );
    expect(resolved).toEqual({
      destinationId: 'applications',
      childId: 'module-catalog',
    });
  });

  it('10. /super-admin/audit-logs → Governance + Audit Logs active', () => {
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

  it('11. /super-admin/platform-admins → Governance + Platform Administrators active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/platform-admins',
    );
    expect(resolved).toEqual({
      destinationId: 'governance',
      childId: 'platform-admins',
    });
  });

  it('12. /super-admin/operations/health → Operations + Tenant Health active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/operations/health',
    );
    expect(resolved).toEqual({
      destinationId: 'operations',
      childId: 'tenant-health',
    });
  });

  it('13. /super-admin/operations/jobs → Operations + Provisioning Jobs active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/operations/jobs',
    );
    expect(resolved).toEqual({
      destinationId: 'operations',
      childId: 'provisioning-jobs',
    });
  });

  it('14. /super-admin/support/cases → Support + Support Cases active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/support/cases',
    );
    expect(resolved).toEqual({
      destinationId: 'support',
      childId: 'support-cases',
    });
  });

  it('15. /super-admin/support/access → Support + Controlled Support Access active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/support/access',
    );
    expect(resolved).toEqual({
      destinationId: 'support',
      childId: 'controlled-access',
    });
  });

  it('16. /super-admin/settings → Settings + Platform Configuration active', () => {
    const resolved = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/settings',
    );
    expect(resolved).toEqual({
      destinationId: 'settings',
      childId: 'platform-config',
    });
  });

  it('17. Direct URL refresh preserves correct navigation hierarchy across all routes', () => {
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

    // Create Tenant
    expect(
      resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/tenants/create',
      ),
    ).toEqual({
      destinationId: 'tenants',
    });

    // Deep nested detail routes under tenants
    expect(
      resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/tenants/tenant_xyz/details',
      ),
    ).toEqual({
      destinationId: 'tenants',
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
    expect(childPaths).toContain('tenants/details');
    expect(childPaths).toContain('provisioning');
    expect(childPaths).toContain('subscriptions/plans');
    expect(childPaths).toContain('subscriptions/tenants');
    expect(childPaths).toContain('subscriptions/entitlements');
    expect(childPaths).toContain('applications/catalog');
    expect(childPaths).toContain('applications/modules');
    expect(childPaths).toContain('audit-logs');
    expect(childPaths).toContain('platform-admins');
    expect(childPaths).toContain('operations/health');
    expect(childPaths).toContain('operations/jobs');
    expect(childPaths).toContain('support/cases');
    expect(childPaths).toContain('support/access');
    expect(childPaths).toContain('settings');
    expect(childPaths).toContain('companies');
    expect(childPaths).toContain('users');
    expect(childPaths).toContain('company-admins');
    expect(childPaths).toContain('modules');
  });
});
