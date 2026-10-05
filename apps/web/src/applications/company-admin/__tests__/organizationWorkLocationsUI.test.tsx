import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { WorkLocationsSection } from '../organization/WorkLocationsSection';
import { AuthContext, type AuthContextValue } from '../../../platform/auth/AuthProvider';

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
    'organization.workLocations.view',
    'organization.workLocations.manage',
    'organization.locations.view',
    'organization.locations.manage',
    'company.organization.view',
    'company.organization.manage',
  ],
  workspaces: ['company-admin'],
};

const mockReadOnlyCompanyAccess = {
  ...mockCompanyAccess,
  permissions: [
    'organization.workLocations.view',
    'organization.locations.view',
    'company.organization.view',
  ],
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

describe('Company Admin Organization Work Locations UI', () => {
  it('renders WorkLocationsSection with title and actions when user has manage permission', () => {
    const html = renderWithAuth(<WorkLocationsSection />);
    expect(html).toContain('Work Locations');
    expect(html).toContain('Define organizational work locations');
    expect(html).toContain('Add Work Location');
    expect(html).toContain('Search work locations...');
  });

  it('hides Add Work Location action when user lacks manage permission', () => {
    const html = renderWithAuth(<WorkLocationsSection />, mockReadOnlyCompanyAccess.permissions);
    expect(html).toContain('Work Locations');
    expect(html).not.toContain('Add Work Location');
  });
});
