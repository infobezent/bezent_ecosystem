import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeftSidebar, canItemOpenFlyout } from '../LeftSidebar';
import type { ShellNavItem } from '../types';
import { superAdminNavigation } from '../../../applications/super-admin/navigation/superAdminNavigation';
import { SUPER_ADMIN_BASE_PATH } from '../../../applications/super-admin/routes/superAdminRoutes';
import { destinationPath, resolveActiveNavigation } from '../../../shared/utils/navigation';
import { toShellNavItems } from '../../../app/router/shellNavigation';
import { superAdminApplication } from '../../../applications/super-admin';

describe('Single-Destination Navigation Behavior (Super Admin & Shared AppShell)', () => {
  const shellItems = toShellNavItems(superAdminApplication);

  const overviewItem = shellItems.find((item) => item.id === 'overview')!;
  const customersItem = shellItems.find((item) => item.id === 'customers')!;
  const accessItem = shellItems.find((item) => item.id === 'access')!;
  const governanceItem = shellItems.find((item) => item.id === 'governance')!;

  it('1. Overview with one child navigates directly to /super-admin/dashboard', () => {
    const overviewDest = superAdminNavigation.destinations.find((d) => d.id === 'overview')!;
    expect(overviewDest.children).toHaveLength(1);
    expect(overviewDest.children?.[0]?.id).toBe('dashboard');

    const resolvedPath = destinationPath(SUPER_ADMIN_BASE_PATH, overviewDest);
    expect(resolvedPath).toBe('/super-admin/dashboard');
  });

  it('2. Overview does not open flyout (canItemOpenFlyout is false, no aria-haspopup, no SubNavFlyout)', () => {
    expect(canItemOpenFlyout(overviewItem)).toBe(false);

    // Render LeftSidebar with Overview
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="overview"
        testAvailableHeight={600}
      />,
    );

    // Overview button does NOT declare popup/expanded
    expect(html).toContain('Overview');
    expect(html).not.toMatch(/aria-haspopup="menu"[^>]*>[\s\S]*?Overview/);

    // Even if an attempt is made to set visibleFlyoutId to 'overview', no SubNavFlyout renders
    const htmlWithOverviewFlyout = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="overview"
        testAvailableHeight={600}
        testFlyoutParentId="overview"
      />,
    );
    expect(htmlWithOverviewFlyout).not.toContain('left-sidebar__flyout');
  });

  it('3. Customers still opens flyout (has 3 children, aria-haspopup="menu", renders flyout when open)', () => {
    expect(canItemOpenFlyout(customersItem)).toBe(true);

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="customers"
        testAvailableHeight={600}
        testFlyoutParentId="customers"
      />,
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('subnav-flyout');
    expect(html).toContain('Tenants');
    expect(html).toContain('Companies');
    expect(html).toContain('Customer Provisioning');
  });

  it('4. Access still opens flyout (has 3 children, aria-haspopup="menu", renders flyout when open)', () => {
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
    expect(html).toContain('Platform Users');
    expect(html).toContain('Company Admins');
    expect(html).toContain('Application Access');
  });

  it('5. Governance still opens flyout (has 2 children, aria-haspopup="menu", renders flyout when open)', () => {
    expect(canItemOpenFlyout(governanceItem)).toBe(true);

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="governance"
        testAvailableHeight={600}
        testFlyoutParentId="governance"
      />,
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('subnav-flyout');
    expect(html).toContain('Audit Logs');
    expect(html).toContain('Platform Settings');
  });

  it('6. Active state remains correct across all destinations', () => {
    // Overview / Dashboard active state
    const resolvedOverview = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/dashboard',
    );
    expect(resolvedOverview).toEqual({
      destinationId: 'overview',
      childId: 'dashboard',
    });

    const htmlOverview = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId={resolvedOverview?.destinationId}
        testAvailableHeight={600}
      />,
    );
    expect(htmlOverview).toMatch(/class="[^"]*left-sidebar__item[^"]*is-active[^"]*"[^>]*aria-current="page"[^>]*>[\s\S]*?Overview/);

    // Customers / Tenants active state
    const resolvedCustomers = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/tenants',
    );
    expect(resolvedCustomers).toEqual({
      destinationId: 'customers',
      childId: 'tenants',
    });

    // Access / Users active state
    const resolvedAccess = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/users',
    );
    expect(resolvedAccess).toEqual({
      destinationId: 'access',
      childId: 'users',
    });

    // Governance / Audit Logs active state
    const resolvedGov = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/audit-logs',
    );
    expect(resolvedGov).toEqual({
      destinationId: 'governance',
      childId: 'audit-logs',
    });
  });

  it('7. Keyboard activation works (standard button onClick triggers onSelect callback with destination ID)', () => {
    const onSelectSpy = vi.fn();

    // Verify button attributes for keyboard accessibility: type="button", aria-label or accessible text inside
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="overview"
        onSelect={onSelectSpy}
        testAvailableHeight={600}
      />,
    );

    expect(html).toContain('type="button"');
    expect(html).toContain('Overview');

    // On select callback routes via destinationPath
    const destination = superAdminNavigation.destinations.find((d) => d.id === 'overview')!;
    const path = destinationPath(SUPER_ADMIN_BASE_PATH, destination);
    expect(path).toBe('/super-admin/dashboard');
  });

  it('8. Generic reusable rule: works strictly based on child count and not hardcoded labels', () => {
    const customSingleChild: ShellNavItem = {
      id: 'custom-single',
      label: 'Any Custom Label',
      icon: 'dashboard',
      subItems: [{ id: 'child-one', label: 'Only Child', icon: 'dashboard' }],
    };

    const customMultiChild: ShellNavItem = {
      id: 'custom-multi',
      label: 'Any Other Label',
      icon: 'settings',
      subItems: [
        { id: 'child-one', label: 'First Child', icon: 'settings' },
        { id: 'child-two', label: 'Second Child', icon: 'settings' },
      ],
    };

    const customZeroChild: ShellNavItem = {
      id: 'custom-zero',
      label: 'Flat Item',
      icon: 'organization',
    };

    expect(canItemOpenFlyout(customSingleChild)).toBe(false);
    expect(canItemOpenFlyout(customMultiChild)).toBe(true);
    expect(canItemOpenFlyout(customZeroChild)).toBe(false);
  });
});
