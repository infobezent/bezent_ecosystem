import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ICON_DEFINITIONS } from '../../../design-system/icons/definitions';
import { companyAdminApplication } from '../index';
import { COMPANY_ADMIN_BASE_PATH } from '../routes/companyAdminRoutes';
import { companyAdminNavigation } from '../navigation/companyAdminNavigation';
import { APPLICATIONS, findApplicationByPath } from '../../../app/config/applications';
import { toShellNavItems } from '../../../app/router/shellNavigation';
import { LeftSidebar, canItemOpenFlyout } from '../../../layouts/app-shell/LeftSidebar';
import { destinationPath, resolveActiveNavigation } from '../../../shared/utils/navigation';

const { categories, destinations } = companyAdminNavigation;

// ─── Catalog Integrity ───────────────────────────────────────────────────────

describe('Company Admin Navigation Catalog — Integrity', () => {
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
});

// ─── Main Rail ───────────────────────────────────────────────────────────────

describe('Company Admin Navigation — Main Rail (Section 1)', () => {
  it('1. Main rail has Overview', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).toContain('overview');
  });

  it('2. Main rail has Company', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).toContain('company');
  });

  it('3. Main rail has Access', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).toContain('access');
  });

  it('4. Main rail has Applications', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).toContain('applications');
  });

  it('5. Main rail has Governance', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).toContain('governance');
  });

  it('6. Dashboard is NOT a separate main rail item', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).not.toContain('dashboard');
  });

  it('7. Company Profile is NOT a separate main rail item', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).not.toContain('profile');
  });

  it('8. Organization is NOT a separate main rail item', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).not.toContain('organization');
  });

  it('9. Company Policies is NOT visible in main rail', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).not.toContain('policies');
  });

  it('10. Users is NOT a separate main rail item', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).not.toContain('users');
  });

  it('11. Invitations is NOT a separate main rail item', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).not.toContain('invitations');
  });

  it('12. Roles & Permissions is NOT a separate main rail item', () => {
    const ids = destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(ids).not.toContain('roles');
  });

  it('13. Main rail has exactly 5 items (Overview, Company, Access, Applications, Governance)', () => {
    const sidebarItems = destinations.filter((d) => d.sidebar);
    expect(sidebarItems).toHaveLength(5);
  });
});

// ─── Single-Destination Rule (Direct Navigation) ─────────────────────────────

describe('Company Admin Navigation — Single-Destination Rule (Sections 12, 14-16)', () => {
  const shellItems = toShellNavItems(companyAdminApplication);

  it('14. Overview directly navigates to /company-admin/dashboard', () => {
    const overviewDest = destinations.find((d) => d.id === 'overview')!;
    expect(overviewDest.children).toHaveLength(1);
    const resolvedPath = destinationPath(COMPANY_ADMIN_BASE_PATH, overviewDest);
    expect(resolvedPath).toBe('/company-admin/dashboard');
  });

  it('15. Overview does NOT open flyout (canItemOpenFlyout is false)', () => {
    const overviewItem = shellItems.find((item) => item.id === 'overview')!;
    expect(canItemOpenFlyout(overviewItem)).toBe(false);

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="overview"
        testAvailableHeight={600}
        testFlyoutParentId="overview"
      />,
    );
    expect(html).not.toContain('left-sidebar__flyout');
  });

  it('16. Company opens flyout (canItemOpenFlyout is true, has 2+ children)', () => {
    const companyItem = shellItems.find((item) => item.id === 'company')!;
    expect(canItemOpenFlyout(companyItem)).toBe(true);

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="company"
        testAvailableHeight={600}
        testFlyoutParentId="company"
      />,
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('subnav-flyout');
  });

  it('17. Company flyout contains Company Profile', () => {
    const companyDest = destinations.find((d) => d.id === 'company')!;
    const labels = companyDest.children?.map((c) => c.label) ?? [];
    expect(labels).toContain('Company Profile');
  });

  it('18. Company flyout contains Organization', () => {
    const companyDest = destinations.find((d) => d.id === 'company')!;
    const labels = companyDest.children?.map((c) => c.label) ?? [];
    expect(labels).toContain('Organization');
  });

  it('19. Access opens flyout (canItemOpenFlyout is true)', () => {
    const accessItem = shellItems.find((item) => item.id === 'access')!;
    expect(canItemOpenFlyout(accessItem)).toBe(true);

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="access"
        testAvailableHeight={600}
        testFlyoutParentId="access"
      />,
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('subnav-flyout');
  });

  it('20. Access flyout contains Users', () => {
    const accessDest = destinations.find((d) => d.id === 'access')!;
    const labels = accessDest.children?.map((c) => c.label) ?? [];
    expect(labels).toContain('Users');
  });

  it('21. Access flyout contains Roles & Permissions', () => {
    const accessDest = destinations.find((d) => d.id === 'access')!;
    const labels = accessDest.children?.map((c) => c.label) ?? [];
    expect(labels).toContain('Roles & Permissions');
  });

  it('22. Applications directly navigates to Application Access (/company-admin/modules)', () => {
    const appDest = destinations.find((d) => d.id === 'applications')!;
    expect(appDest.children).toHaveLength(1);
    const resolvedPath = destinationPath(COMPANY_ADMIN_BASE_PATH, appDest);
    expect(resolvedPath).toBe('/company-admin/modules');
  });

  it('23. Applications does NOT open flyout', () => {
    const appItem = shellItems.find((item) => item.id === 'applications')!;
    expect(canItemOpenFlyout(appItem)).toBe(false);
  });

  it('24. Governance directly navigates to Audit Logs (/company-admin/audit-logs)', () => {
    const govDest = destinations.find((d) => d.id === 'governance')!;
    expect(govDest.children).toHaveLength(1);
    const resolvedPath = destinationPath(COMPANY_ADMIN_BASE_PATH, govDest);
    expect(resolvedPath).toBe('/company-admin/audit-logs');
  });

  it('25. Governance does NOT open flyout', () => {
    const govItem = shellItems.find((item) => item.id === 'governance')!;
    expect(canItemOpenFlyout(govItem)).toBe(false);
  });
});

// ─── Active Route Resolution ──────────────────────────────────────────────────

describe('Company Admin Navigation — Active Route Resolution (Section 14)', () => {
  function resolve(pathname: string) {
    return resolveActiveNavigation(companyAdminNavigation, COMPANY_ADMIN_BASE_PATH, pathname);
  }

  it('26. /company-admin/dashboard → Overview active', () => {
    expect(resolve('/company-admin/dashboard')).toEqual({
      destinationId: 'overview',
      childId: 'dashboard',
    });
  });

  it('27. /company-admin/profile → Company → Company Profile active', () => {
    expect(resolve('/company-admin/profile')).toEqual({
      destinationId: 'company',
      childId: 'profile',
    });
  });

  it('28. /company-admin/organization → Company → Organization active', () => {
    expect(resolve('/company-admin/organization')).toEqual({
      destinationId: 'company',
      childId: 'organization',
    });
  });

  it('29. /company-admin/organization/structure → Company → Organization active (nested)', () => {
    expect(resolve('/company-admin/organization/structure')).toEqual({
      destinationId: 'company',
      childId: 'organization',
    });
  });

  it('30. /company-admin/organization/departments → Company → Organization active (nested)', () => {
    expect(resolve('/company-admin/organization/departments')).toEqual({
      destinationId: 'company',
      childId: 'organization',
    });
  });

  it('31. /company-admin/organization/work-locations → Company → Organization active (nested)', () => {
    expect(resolve('/company-admin/organization/work-locations')).toEqual({
      destinationId: 'company',
      childId: 'organization',
    });
  });

  it('32. /company-admin/users → Access → Users active', () => {
    expect(resolve('/company-admin/users')).toEqual({
      destinationId: 'access',
      childId: 'users',
    });
  });

  it('33. /company-admin/invitations → Access → Invitations active (compat route)', () => {
    expect(resolve('/company-admin/invitations')).toEqual({
      destinationId: 'access',
      childId: 'invitations',
    });
  });

  it('34. /company-admin/roles → Access → Roles & Permissions active', () => {
    expect(resolve('/company-admin/roles')).toEqual({
      destinationId: 'access',
      childId: 'roles',
    });
  });

  it('35. /company-admin/modules → Applications active', () => {
    expect(resolve('/company-admin/modules')).toEqual({
      destinationId: 'applications',
      childId: 'application-access',
    });
  });

  it('36. /company-admin/audit-logs → Governance active', () => {
    expect(resolve('/company-admin/audit-logs')).toEqual({
      destinationId: 'governance',
      childId: 'audit-logs',
    });
  });
});

// ─── Application Registration ─────────────────────────────────────────────────

describe('Company Admin Application Registration', () => {
  it('is registered in global APPLICATIONS list', () => {
    const registered = APPLICATIONS.find((app) => app.id === 'company-admin');
    expect(registered).toBeDefined();
    expect(registered?.basePath).toBe(COMPANY_ADMIN_BASE_PATH);
  });

  it('is resolved by path matcher for company-admin routes', () => {
    const app = findApplicationByPath('/company-admin/dashboard');
    expect(app).toBeDefined();
    expect(app?.id).toBe('company-admin');
  });

  it('defines all required page routes (business logic preserved)', () => {
    const routes = companyAdminApplication.routes;
    expect(routes.length).toBeGreaterThan(0);
    const rootRoute = routes[0];
    const childPaths = (rootRoute?.children ?? []).map((c) => c.path);
    // Removed from nav but routes preserved:
    expect(childPaths).toContain('dashboard');
    expect(childPaths).toContain('profile');
    expect(childPaths).toContain('organization');
    expect(childPaths).toContain('policies'); // nav-removed, route preserved
    expect(childPaths).toContain('users');
    expect(childPaths).toContain('invitations'); // nav-removed from main, kept in access flyout
    expect(childPaths).toContain('roles');
    expect(childPaths).toContain('modules');
    expect(childPaths).toContain('audit-logs');
    expect(childPaths).toContain('settings'); // nav-removed, route preserved
  });
});

// ─── Section 8: Final Overview & Permission Filtering Verification ─────────────

describe('Company Admin — Overview Restoration & Invariants (Section 8 Requirements)', () => {
  const shellItems = toShellNavItems(companyAdminApplication);

  it('1. Company Admin main rail contains Overview', () => {
    expect(shellItems.map((i) => i.id)).toContain('overview');
  });

  it('2. Overview is first', () => {
    expect(shellItems[0]?.id).toBe('overview');
  });

  it('3. Overview has Dashboard as its destination', () => {
    const overviewDest = destinations.find((d) => d.id === 'overview')!;
    expect(overviewDest.children).toHaveLength(1);
    expect(overviewDest.children?.[0]?.id).toBe('dashboard');
    expect(destinationPath(COMPANY_ADMIN_BASE_PATH, overviewDest)).toBe('/company-admin/dashboard');
  });

  it('4. Overview is visible when Dashboard is authorized', () => {
    const canDashboard = (perm: string) => perm === 'company.profile.read';
    const items = toShellNavItems(companyAdminApplication, undefined, canDashboard);
    expect(items.map((i) => i.id)).toContain('overview');
  });

  it('5. Overview click navigates to /company-admin/dashboard', () => {
    const overviewDest = destinations.find((d) => d.id === 'overview')!;
    const path = destinationPath(COMPANY_ADMIN_BASE_PATH, overviewDest, 'dashboard');
    expect(path).toBe('/company-admin/dashboard');
  });

  it('6. Overview does NOT open SubNavFlyout', () => {
    const overviewItem = shellItems.find((i) => i.id === 'overview')!;
    expect(canItemOpenFlyout(overviewItem)).toBe(false);
  });

  it('7. /company-admin/dashboard resolves active parent = Overview', () => {
    const active = resolveActiveNavigation(
      companyAdminNavigation,
      COMPANY_ADMIN_BASE_PATH,
      '/company-admin/dashboard',
    );
    expect(active?.destinationId).toBe('overview');
    expect(active?.childId).toBe('dashboard');
  });

  it('8. browser refresh on Dashboard keeps Overview active', () => {
    // Re-resolving pathname simulates browser reload with current URL
    const active = resolveActiveNavigation(
      companyAdminNavigation,
      COMPANY_ADMIN_BASE_PATH,
      '/company-admin/dashboard',
    );
    expect(active?.destinationId).toBe('overview');
  });

  it('9. Company still opens its flyout', () => {
    const companyItem = shellItems.find((i) => i.id === 'company')!;
    expect(canItemOpenFlyout(companyItem)).toBe(true);
  });

  it('10. Access still opens its flyout', () => {
    const accessItem = shellItems.find((i) => i.id === 'access')!;
    expect(canItemOpenFlyout(accessItem)).toBe(true);
  });

  it('11. Applications still direct navigates', () => {
    const appItem = shellItems.find((i) => i.id === 'applications')!;
    expect(canItemOpenFlyout(appItem)).toBe(false);
    const appDest = destinations.find((d) => d.id === 'applications')!;
    expect(destinationPath(COMPANY_ADMIN_BASE_PATH, appDest)).toBe('/company-admin/modules');
  });

  it('12. Governance still direct navigates', () => {
    const govItem = shellItems.find((i) => i.id === 'governance')!;
    expect(canItemOpenFlyout(govItem)).toBe(false);
    const govDest = destinations.find((d) => d.id === 'governance')!;
    expect(destinationPath(COMPANY_ADMIN_BASE_PATH, govDest)).toBe('/company-admin/audit-logs');
  });

  it('13. permission filtering does not accidentally remove Overview', () => {
    const companyAdminPerms = new Set([
      'company.profile.read',
      'company.organization.view',
      'company.users.view',
      'company.roles.view',
      'company.modules.view',
      'company.audit.view',
    ]);
    const items = toShellNavItems(companyAdminApplication, undefined, (p) =>
      companyAdminPerms.has(p),
    );
    const itemIds = items.map((i) => i.id);
    expect(itemIds).toEqual(['overview', 'company', 'access', 'applications', 'governance']);
  });

  it('14. zero-child parents remain hidden', () => {
    const mockApp = {
      ...companyAdminApplication,
      navigation: {
        categories,
        destinations: [
          {
            id: 'empty-parent',
            label: 'Empty Parent',
            icon: 'settings' as const,
            segment: 'empty',
            sidebar: true,
            children: [],
          },
          {
            id: 'denied-parent',
            label: 'Denied Parent',
            icon: 'settings' as const,
            segment: 'denied',
            sidebar: true,
            children: [
              {
                id: 'denied-child',
                label: 'Denied Child',
                icon: 'settings' as const,
                path: 'denied',
                permissionKey: 'forbidden.permission',
              },
            ],
          },
        ],
      },
    };
    const items = toShellNavItems(mockApp, undefined, () => false);
    expect(items).toHaveLength(0);
  });

  it('15. one-child parent remains visible and direct-navigable', () => {
    const mockApp = {
      ...companyAdminApplication,
      navigation: {
        categories,
        destinations: [
          {
            id: 'single-child-parent',
            label: 'Single Child Parent',
            icon: 'dashboard' as const,
            segment: 'single',
            sidebar: true,
            children: [
              {
                id: 'allowed-child',
                label: 'Allowed Child',
                icon: 'dashboard' as const,
                path: 'single-allowed',
                permissionKey: 'allowed.permission',
              },
            ],
          },
        ],
      },
    };
    const items = toShellNavItems(mockApp, undefined, (p) => p === 'allowed.permission');
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('single-child-parent');
    expect(canItemOpenFlyout(items[0]!)).toBe(false);
    expect(
      destinationPath('/app', mockApp.navigation.destinations[0]!, items[0]?.subItems?.[0]?.id),
    ).toBe('/app/single-allowed');
  });
});
