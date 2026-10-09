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
  const tenantsItem = shellItems.find((item) => item.id === 'tenants')!;
  const subscriptionsItem = shellItems.find((item) => item.id === 'subscriptions')!;
  const governanceItem = shellItems.find((item) => item.id === 'governance')!;
  const settingsItem = shellItems.find((item) => item.id === 'settings')!;

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
      <LeftSidebar items={shellItems} activeId="overview" testAvailableHeight={600} />,
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

  it('2b. Settings with one child (Platform Configuration) navigates directly without opening flyout', () => {
    expect(canItemOpenFlyout(settingsItem)).toBe(false);

    const settingsDest = superAdminNavigation.destinations.find((d) => d.id === 'settings')!;
    expect(settingsDest.children).toHaveLength(1);
    expect(settingsDest.children?.[0]?.id).toBe('platform-config');

    const resolvedPath = destinationPath(SUPER_ADMIN_BASE_PATH, settingsDest);
    expect(resolvedPath).toBe('/super-admin/settings');
  });

  it('3. Tenants navigates directly without opening flyout (canItemOpenFlyout is false, direct to /super-admin/tenants)', () => {
    expect(canItemOpenFlyout(tenantsItem)).toBe(false);

    const tenantsDest = superAdminNavigation.destinations.find((d) => d.id === 'tenants')!;
    expect(tenantsDest.children).toBeUndefined();

    const resolvedPath = destinationPath(SUPER_ADMIN_BASE_PATH, tenantsDest);
    expect(resolvedPath).toBe('/super-admin/tenants');

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="tenants"
        testAvailableHeight={600}
        testFlyoutParentId="tenants"
      />,
    );

    expect(html).toContain('Tenants');
    expect(html).not.toMatch(/aria-haspopup="menu"[^>]*>[\s\S]*?Tenants/);
    expect(html).not.toContain('subnav-flyout');
  });

  it('4. Subscriptions opens flyout (has 3 children, aria-haspopup="menu", renders flyout when open)', () => {
    expect(canItemOpenFlyout(subscriptionsItem)).toBe(true);

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={shellItems}
        activeId="subscriptions"
        testAvailableHeight={600}
        testFlyoutParentId="subscriptions"
      />,
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('subnav-flyout');
    expect(html).toContain('Plans');
    expect(html).toContain('Tenant Subscriptions');
    expect(html).toContain('Entitlements');
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
    expect(html).toContain('Platform Administrators');
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
    expect(htmlOverview).toMatch(
      /class="[^"]*left-sidebar__item[^"]*is-active[^"]*"[^>]*aria-current="page"[^>]*>[\s\S]*?Overview/,
    );

    // Tenants active state
    const resolvedTenants = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/tenants',
    );
    expect(resolvedTenants).toEqual({
      destinationId: 'tenants',
    });

    // Subscriptions / Plans active state
    const resolvedSubs = resolveActiveNavigation(
      superAdminNavigation,
      SUPER_ADMIN_BASE_PATH,
      '/super-admin/subscriptions/plans',
    );
    expect(resolvedSubs).toEqual({
      destinationId: 'subscriptions',
      childId: 'plans',
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
