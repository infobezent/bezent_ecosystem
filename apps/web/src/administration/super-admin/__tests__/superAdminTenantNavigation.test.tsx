import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeftSidebar, canItemOpenFlyout } from '../../../layouts/app-shell/LeftSidebar';
import { SubNavFlyout } from '../../../layouts/app-shell/SubNavFlyout';
import { superAdminNavigation } from '../navigation/superAdminNavigation';
import { SUPER_ADMIN_BASE_PATH } from '../routes/superAdminRoutes';
import { destinationPath, resolveActiveNavigation } from '../../../shared/utils/navigation';
import { toShellNavItems } from '../../../app/router/shellNavigation';
import { superAdminApplication } from '../index';

describe('Super Admin — Direct Tenants Navigation & Routing Verification', () => {
  const shellItems = toShellNavItems(superAdminApplication);
  const tenantsItem = shellItems.find((item) => item.id === 'tenants')!;

  describe('1. Confirmed UX — Direct Tenants Navigation Item', () => {
    it('Tenants appears as a single direct navigation item with NO flyout children', () => {
      const tenantsDestination = superAdminNavigation.destinations.find((d) => d.id === 'tenants');
      expect(tenantsDestination).toBeDefined();
      expect(tenantsDestination?.children).toBeUndefined();
      expect(tenantsDestination?.sidebar).toBe(true);
      expect(tenantsDestination?.segment).toBe('tenants');
      expect(tenantsDestination?.label).toBe('Tenants');
    });

    it('Tenants sidebar item does NOT open a flyout (canItemOpenFlyout is false)', () => {
      expect(canItemOpenFlyout(tenantsItem)).toBe(false);
      expect(tenantsItem.subItems).toBeUndefined();
    });

    it('Hovering or focusing Tenants displays normal icon tooltip when collapsed and opens NO flyout', () => {
      const html = renderToStaticMarkup(
        <LeftSidebar
          items={shellItems}
          activeId="tenants"
          testAvailableHeight={600}
          testFlyoutParentId="tenants"
        />,
      );

      // Button has native title attribute for collapsed tooltip
      expect(html).toContain('title="Tenants"');
      // Button does NOT declare popup or submenu
      expect(html).not.toMatch(/aria-haspopup="menu"[^>]*>[\s\S]*?Tenants/);
      // No Tenants flyout, submenu, or child entries rendered
      expect(html).not.toContain('All Tenants');
      expect(html).not.toContain('Create Tenant');
      expect(html).not.toContain('subnav-flyout');
    });

    it('Clicking Tenants navigates directly to /super-admin/tenants', () => {
      const tenantsDestination = superAdminNavigation.destinations.find((d) => d.id === 'tenants')!;
      const resolvedPath = destinationPath(SUPER_ADMIN_BASE_PATH, tenantsDestination);
      expect(resolvedPath).toBe('/super-admin/tenants');
    });
  });

  describe('2. Navigation Active States & Resolution', () => {
    it('/super-admin/tenants highlights Tenants primary nav directly', () => {
      const resolved = resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/tenants',
      );

      expect(resolved).toEqual({
        destinationId: 'tenants',
      });
    });

    it('/super-admin/tenants/create keeps Tenants primary nav active', () => {
      const resolved = resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/tenants/create',
      );

      expect(resolved).toEqual({
        destinationId: 'tenants',
      });
    });

    it('/super-admin/tenants/:tenantId preserves Tenants primary nav active', () => {
      const resolved = resolveActiveNavigation(
        superAdminNavigation,
        SUPER_ADMIN_BASE_PATH,
        '/super-admin/tenants/tnt_alpha_123',
      );

      expect(resolved).toEqual({
        destinationId: 'tenants',
      });
    });

    it('nested tab routes retain Tenants primary nav active across all five tabs', () => {
      const tabs = ['overview', 'entitlements', 'provisioning', 'lifecycle', 'activity'];
      for (const tab of tabs) {
        const resolved = resolveActiveNavigation(
          superAdminNavigation,
          SUPER_ADMIN_BASE_PATH,
          `/super-admin/tenants/tnt_alpha_123/${tab}`,
        );

        expect(resolved).toEqual({
          destinationId: 'tenants',
        });
      }
    });
  });

  describe('3. Regression Protection for Other Navigation Groups', () => {
    it('All other 7 navigation groups remain intact and unaffected', () => {
      const destinationIds = superAdminNavigation.destinations.map((d) => d.id);
      expect(destinationIds).toEqual([
        'overview',
        'tenants',
        'subscriptions',
        'applications',
        'governance',
        'operations',
        'support',
        'settings',
      ]);
    });

    it('Subscriptions flyout retains Plans, Tenant Subscriptions, and Entitlements', () => {
      const subs = superAdminNavigation.destinations.find((d) => d.id === 'subscriptions')!;
      expect(subs.children?.map((c) => c.label)).toEqual([
        'Plans',
        'Tenant Subscriptions',
        'Entitlements',
      ]);
      const subsItem = shellItems.find((i) => i.id === 'subscriptions')!;
      expect(canItemOpenFlyout(subsItem)).toBe(true);
    });

    it('Governance flyout retains Audit Logs and Platform Administrators', () => {
      const gov = superAdminNavigation.destinations.find((d) => d.id === 'governance')!;
      expect(gov.children?.map((c) => c.label)).toEqual([
        'Audit Logs',
        'Platform Administrators',
      ]);
      const govItem = shellItems.find((i) => i.id === 'governance')!;
      expect(canItemOpenFlyout(govItem)).toBe(true);
    });

    it('Direct items (Tenants, Overview, Settings) do not open flyout', () => {
      const overview = shellItems.find((i) => i.id === 'overview')!;
      const settings = shellItems.find((i) => i.id === 'settings')!;
      expect(canItemOpenFlyout(overview)).toBe(false);
      expect(canItemOpenFlyout(tenantsItem)).toBe(false);
      expect(canItemOpenFlyout(settings)).toBe(false);
    });
  });
});
