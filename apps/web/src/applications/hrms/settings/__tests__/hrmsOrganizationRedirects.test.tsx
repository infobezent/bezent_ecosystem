import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { SETTINGS_MODULE_CARDS } from '../types/settingsCenter';
import { SettingsPage } from '../pages/SettingsPage';
import { DepartmentsPage } from '../pages/DepartmentsPage';
import { WorkLocationsPage } from '../pages/WorkLocationsPage';
import { OrganizationProfilePage } from '../pages/OrganizationProfilePage';
import { OrganizationStructurePage } from '../pages/OrganizationStructurePage';
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
  roles: [{ id: 'role_admin', name: 'Company Admin', code: 'company_admin', isSystem: true, moduleCode: null }],
  permissions: [
    'company.organization.view',
    'company.organization.manage',
    'hrms.organization.view',
    'hrms.organization.manage',
    'hrms.settings.view',
    'hrms.settings.manage',
  ],
  workspaces: ['hrms'],
};

function createMockAuthContext(): AuthContextValue {
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
    activeTenant: { id: 'tenant_demo_01', name: 'Demo Tenant', code: 'demo', status: 'active', isDefault: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    activeCompany: mockCompanyAccess,
    access: {
      userId: 'usr_admin_01',
      tenantId: 'tenant_demo_01',
      isGlobalPlatformAdmin: false,
      roles: [],
      permissions: mockCompanyAccess.permissions,
      hasCompanyContext: true,
      company: mockCompanyAccess,
    },
    switchTenant: vi.fn(),
    switchCompany: vi.fn(),
    logout: vi.fn(),
    refreshAccess: vi.fn(),
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    hasApplicationAccess: () => true,
  } as unknown as AuthContextValue;
}

function renderWithAuth(ui: ReactNode) {
  const contextValue = createMockAuthContext();
  return renderToStaticMarkup(
    <AuthContext.Provider value={contextValue}>
      {ui}
    </AuthContext.Provider>
  );
}

describe('HRMS Settings — Organization Redirects & Compatibility Wrappers', () => {
  it('SETTINGS_MODULE_CARDS does not include Organization (moved to Company Admin)', () => {
    const orgCard = SETTINGS_MODULE_CARDS.find((card) => (card.id as string) === 'organization');
    expect(orgCard).toBeUndefined();
  });

  it('SettingsPage does not show Organization card', () => {
    const html = renderWithAuth(<SettingsPage />);
    expect(html).not.toContain('Manage organization profile, structure');
  });

  it('DepartmentsPage wrapper renders cleanly', () => {
    const html = renderWithAuth(<DepartmentsPage />);
    expect(html).toContain('Departments');
  });

  it('WorkLocationsPage wrapper renders cleanly', () => {
    const html = renderWithAuth(<WorkLocationsPage />);
    expect(html).toContain('Work Locations');
  });

  it('OrganizationProfilePage wrapper renders cleanly', () => {
    const html = renderWithAuth(<OrganizationProfilePage />);
    expect(html).toBeDefined();
  });

  it('OrganizationStructurePage wrapper renders cleanly', () => {
    const html = renderWithAuth(<OrganizationStructurePage />);
    expect(html).toBeDefined();
  });

  it('verifies legacy redirect routes registration in hrmsRoutes', () => {
    const hrmsBaseRoute = hrmsRoutes.find((r) => r.path === 'hrms');
    expect(hrmsBaseRoute).toBeDefined();
    expect(hrmsBaseRoute?.children).toBeDefined();

    const children = hrmsBaseRoute!.children!;
    expect(children.find((r) => r.path === 'settings/organization/profile')).toBeDefined();
    expect(children.find((r) => r.path === 'settings/organization/structure')).toBeDefined();
    expect(children.find((r) => r.path === 'settings/organization/departments')).toBeDefined();
    expect(children.find((r) => r.path === 'settings/organization/locations')).toBeDefined();
    expect(children.find((r) => r.path === 'settings/organization/designations')).toBeDefined();
    expect(children.find((r) => r.path === 'settings/organization/job-levels')).toBeDefined();
  });
});
