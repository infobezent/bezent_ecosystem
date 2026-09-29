import { describe, expect, it } from 'vitest';
import { ICON_DEFINITIONS } from '../../../design-system/icons/definitions';
import { companyAdminApplication } from '../index';
import { COMPANY_ADMIN_BASE_PATH } from '../routes/companyAdminRoutes';
import { companyAdminNavigation } from '../navigation/companyAdminNavigation';
import { APPLICATIONS, findApplicationByPath } from '../../../app/config/applications';

const { categories, destinations } = companyAdminNavigation;

describe('Company Admin Navigation Catalog', () => {
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

  it('includes all required Phase 2 workspace destinations', () => {
    const ids = destinations.map((d) => d.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('profile');
    expect(ids).toContain('organization');
    expect(ids).toContain('policies');
    expect(ids).toContain('users');
    expect(ids).toContain('invitations');
    expect(ids).toContain('roles');
    expect(ids).toContain('modules');
    expect(ids).toContain('audit-logs');
    expect(ids).toContain('settings');
  });
});

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

    const profileApp = findApplicationByPath('/company-admin/profile');
    expect(profileApp?.id).toBe('company-admin');
  });

  it('defines all required page routes', () => {
    const routes = companyAdminApplication.routes;
    expect(routes.length).toBeGreaterThan(0);
    const rootRoute = routes[0];
    const childPaths = (rootRoute?.children ?? []).map((c) => c.path);
    expect(childPaths).toContain('dashboard');
    expect(childPaths).toContain('profile');
    expect(childPaths).toContain('organization');
    expect(childPaths).toContain('policies');
    expect(childPaths).toContain('users');
    expect(childPaths).toContain('invitations');
    expect(childPaths).toContain('roles');
    expect(childPaths).toContain('modules');
    expect(childPaths).toContain('audit-logs');
    expect(childPaths).toContain('settings');
  });
});
