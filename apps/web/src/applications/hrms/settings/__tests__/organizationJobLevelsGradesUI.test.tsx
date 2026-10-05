import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { JobLevelsGradesSection } from '../administration/employee-configuration/JobLevelsGradesSection';
import { EmployeeConfigurationSection } from '../administration/employee-configuration/EmployeeConfigurationSection';
import { JobLevelsGradesPage } from '../pages/JobLevelsGradesPage';
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
    'organization.jobLevels.view',
    'organization.jobLevels.manage',
    'organization.grades.view',
    'organization.grades.manage',
    'hrms.jobLevels.view',
    'hrms.jobLevels.manage',
    'hrms.grades.view',
    'hrms.grades.manage',
    'hrms.organization.view',
    'hrms.organization.manage',
    'hrms.settings.view',
    'hrms.settings.manage',
  ],
  workspaces: ['hrms'],
};

const mockReadOnlyCompanyAccess = {
  ...mockCompanyAccess,
  permissions: [
    'organization.jobLevels.view',
    'organization.grades.view',
    'hrms.organization.view',
    'hrms.settings.view',
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

describe('Organization Job Levels & Grades UI', () => {
  it('renders JobLevelsGradesSection with title, master switcher tabs, and actions when user has manage permission', () => {
    const html = renderWithAuth(<JobLevelsGradesSection />);
    expect(html).toContain('Job Levels &amp; Grades');
    expect(html).toContain('Manage company-wide organizational seniority tiers');
    expect(html).toContain('Job Levels');
    expect(html).toContain('Grades');
    expect(html).toContain('Add Job Level');
    expect(html).toContain('Search by name or code...');
    expect(html).toContain('All Statuses');
  });

  it('hides Add Job Level action when user lacks manage permission', () => {
    const html = renderWithAuth(<JobLevelsGradesSection />, mockReadOnlyCompanyAccess.permissions);
    expect(html).toContain('Job Levels &amp; Grades');
    expect(html).not.toContain('Add Job Level');
  });

  it('renders EmployeeConfigurationSection with active Job Levels / Grades tab', () => {
    const html = renderWithAuth(<EmployeeConfigurationSection initialSubSection="job-levels" />);
    expect(html).toContain('Job Levels / Grades');
    expect(html).toContain('id="tab-job-levels"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Manage company-wide organizational seniority tiers');
  });

  it('renders JobLevelsGradesPage wrapper successfully', () => {
    const html = renderWithAuth(<JobLevelsGradesPage />);
    expect(html).toContain('Job Levels &amp; Grades');
  });

  it('verifies route registration in hrmsRoutes', () => {
    // Flatten route hierarchy to check leaf paths
    const paths: string[] = [];
    const collectPaths = (routes: typeof hrmsRoutes) => {
      for (const route of routes) {
        if (route.path) paths.push(route.path);
        if (route.children) collectPaths(route.children as typeof hrmsRoutes);
      }
    };
    collectPaths(hrmsRoutes);

    expect(paths.some((p) => p.includes('settings/organization/job-levels'))).toBe(true);
    expect(paths.some((p) => p.includes('organization/job-levels'))).toBe(true);
  });
});
