import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { DesignationsSection } from '../administration/employee-configuration/DesignationsSection';
import { EmployeeConfigurationSection } from '../administration/employee-configuration/EmployeeConfigurationSection';
import { DesignationsPage } from '../pages/DesignationsPage';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import { AuthContext, type AuthContextValue } from '../../../../platform/auth/AuthProvider';

const mockCompanyAccess = {
  companyId: 'comp_apj3d_01',
  companyName: 'APJ3D Design Solution Pvt Ltd',
  companyCode: 'APJ3D',
  tenantId: 'tenant_demo_01',
  tenantName: 'Demo Tenant',
  isMember: true,
  isPlatformOversight: false,
  roles: [
    {
      id: 'role_admin',
      name: 'Company Admin',
      code: 'company_admin',
      isSystem: true,
      moduleCode: null,
    },
  ],
  permissions: [
    'organization.designations.view',
    'organization.designations.manage',
    'hrms.organization.view',
    'hrms.organization.manage',
    'hrms.settings.view',
    'hrms.settings.manage',
  ],
  workspaces: ['hrms'],
};

const mockReadOnlyCompanyAccess = {
  ...mockCompanyAccess,
  permissions: ['organization.designations.view', 'hrms.organization.view', 'hrms.settings.view'],
};

function createMockAuthContext(permissions: string[]): AuthContextValue {
  const companyAccess = {
    ...mockCompanyAccess,
    permissions,
  };

  return {
    status: 'authenticated',
    user: {
      id: 'usr_admin_01',
      email: 'admin@apj3d.com',
      firstName: 'Admin',
      lastName: 'User',
      status: 'active',
      isGlobalPlatformAdmin: false,
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    tenants: [],
    companies: [],
    activeTenant: {
      id: 'tenant_demo_01',
      name: 'Demo Tenant',
      code: 'demo',
      status: 'active',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    activeCompany: companyAccess,
    access: {
      userId: 'usr_admin_01',
      tenantId: 'tenant_demo_01',
      isGlobalPlatformAdmin: false,
      roles: [],
      permissions,
      hasCompanyContext: true,
      company: companyAccess,
    },
    switchTenant: vi.fn(),
    switchCompany: vi.fn(),
    logout: vi.fn(),
    refreshAccess: vi.fn(),
    can: (perm: string) => permissions.includes(perm),
    canAny: (perms: readonly string[]) => perms.some((p) => permissions.includes(p)),
    canAll: (perms: readonly string[]) => perms.every((p) => permissions.includes(p)),
    hasApplicationAccess: () => true,
  } as unknown as AuthContextValue;
}

function renderWithAuth(ui: ReactNode, permissions = mockCompanyAccess.permissions) {
  const contextValue = createMockAuthContext(permissions);
  return renderToStaticMarkup(
    <AuthContext.Provider value={contextValue}>{ui}</AuthContext.Provider>,
  );
}

describe('Organization Designations UI', () => {
  it('renders DesignationsSection with title and actions when user has manage permission', () => {
    const html = renderWithAuth(<DesignationsSection />);
    expect(html).toContain('Designations');
    expect(html).toContain('Define organizational job titles');
    expect(html).toContain('Add Designation');
    expect(html).toContain('Search designations...');
    expect(html).toContain('All Scopes');
    expect(html).toContain('All Statuses');
  });

  it('hides Add Designation action when user lacks manage permission', () => {
    const html = renderWithAuth(<DesignationsSection />, mockReadOnlyCompanyAccess.permissions);
    expect(html).toContain('Designations');
    expect(html).not.toContain('Add Designation');
  });

  it('renders EmployeeConfigurationSection with active Designations tab', () => {
    const html = renderWithAuth(<EmployeeConfigurationSection initialSubSection="designations" />);
    expect(html).toContain('Designations');
    expect(html).toContain('id="tab-designations"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Define organizational job titles');
  });

  it('renders DesignationsPage wrapper successfully', () => {
    const html = renderWithAuth(<DesignationsPage />);
    expect(html).toContain('Designations');
  });

  it('verifies route registration in hrmsRoutes', () => {
    // Check that hrmsRoutes includes settings and designations route
    const settingsRoute = hrmsRoutes[0]?.children?.find((r) => r.path?.includes('settings'));
    expect(settingsRoute).toBeDefined();

    // Flatten route hierarchy to check leaf paths
    const paths: string[] = [];
    const collectPaths = (routes: typeof hrmsRoutes) => {
      for (const route of routes) {
        if (route.path) paths.push(route.path);
        if (route.children) collectPaths(route.children as typeof hrmsRoutes);
      }
    };
    collectPaths(hrmsRoutes);

    expect(paths.some((p) => p.includes('settings/organization/designations'))).toBe(true);
    expect(paths.some((p) => p.includes('organization/designations'))).toBe(true);
  });
});
