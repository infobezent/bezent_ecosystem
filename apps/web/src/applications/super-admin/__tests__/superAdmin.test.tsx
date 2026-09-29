import { describe, expect, it } from 'vitest';
import { ICON_DEFINITIONS } from '../../../design-system/icons/definitions';
import { superAdminApplication } from '../index';
import { SUPER_ADMIN_BASE_PATH } from '../routes/superAdminRoutes';
import { superAdminNavigation } from '../navigation/superAdminNavigation';
import { APPLICATIONS, findApplicationByPath } from '../../../app/config/applications';

const { categories, destinations } = superAdminNavigation;

describe('Super Admin Navigation Catalog', () => {
  it('has unique destination IDs and segments', () => {
    expect(new Set(destinations.map((d) => d.id)).size).toBe(destinations.length);
    expect(new Set(destinations.map((d) => d.segment)).size).toBe(destinations.length);
  });

  it('only references declared categories', () => {
    const known = new Set(categories.map((c) => c.id));
    for (const d of destinations) {
      if (d.categoryId) {
        expect(known.has(d.categoryId)).toBe(true);
      }
    }
  });

  it('resolves every icon against the design-system icon registry', () => {
    const icons = [...categories.map((c) => c.icon), ...destinations.map((d) => d.icon)];
    for (const icon of icons) {
      expect(ICON_DEFINITIONS[icon], `Missing icon: ${icon}`).toBeDefined();
    }
  });

  it('includes required management destinations', () => {
    const ids = destinations.map((d) => d.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('tenants');
    expect(ids).toContain('companies');
    expect(ids).toContain('provisioning');
    expect(ids).toContain('users');
    expect(ids).toContain('company-admins');
    expect(ids).toContain('modules');
    expect(ids).toContain('audit-logs');
    expect(ids).toContain('settings');
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

  it('defines valid routes including dashboard and login', () => {
    const routes = superAdminApplication.routes;
    expect(routes.length).toBeGreaterThan(0);
    const rootRoute = routes[0];
    const childPaths = (rootRoute?.children ?? []).map((c) => c.path);
    expect(childPaths).toContain('dashboard');
    expect(childPaths).toContain('login');
    expect(childPaths).toContain('tenants');
    expect(childPaths).toContain('provisioning');
    expect(childPaths).toContain('modules');
    expect(childPaths).toContain('audit-logs');
  });
});
