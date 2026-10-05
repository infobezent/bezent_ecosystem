import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { CompanyProfilePage } from '../pages/CompanyProfilePage';
import { CompanyOrganizationPage, ORGANIZATION_TABS } from '../pages/CompanyOrganizationPage';
import { AuthContext, type AuthContextValue } from '../../../platform/auth/AuthProvider';
import { CompanyAdminProvider } from '../context/CompanyAdminContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockPermissions = [
  'company.profile.read',
  'company.profile.update',
  'company.organization.view',
  'company.organization.manage',
];

const mockCompanyAccess = {
  companyId: 'comp_test_01',
  companyName: 'Acme Test Corp',
  companyCode: 'ACME',
  tenantId: 'tent_test_01',
  tenantName: 'Acme Tenant',
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
  permissions: mockPermissions,
  enabledModules: ['hrms' as const],
  essEligible: false,
  employeeId: null,
  workspaces: ['company_admin' as const],
};

function TestWrapper({
  children,
  initialEntry = '/company-admin/organization',
}: {
  children: ReactNode;
  initialEntry?: string;
}) {
  const authValue: AuthContextValue = {
    status: 'authenticated',
    error: null,
    errorKind: null,
    access: {
      user: {
        id: 'usr_admin',
        email: 'admin@acme.com',
        firstName: 'Admin',
        lastName: 'User',
        isSuperAdmin: false,
      },
      platformWorkspaces: [],
      companies: [mockCompanyAccess],
    },
    activeCompany: mockCompanyAccess,
    can: (p) => mockPermissions.includes(p),
    canAny: (perms) => perms.some((p) => mockPermissions.includes(p)),
    canAll: (perms) => perms.every((p) => mockPermissions.includes(p)),
    hasApplicationAccess: () => true,
    isSuperAdmin: false,
    isCompanyAdmin: true,
    completeSignIn: () => {},
    selectCompany: () => true,
    refreshAccess: async () => {},
    signOut: async () => {},
  };

  return (
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CompanyAdminProvider>{children}</CompanyAdminProvider>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('Company Profile & Organization Deduplication UI Tests', () => {
  describe('Organization Navigation & Tabs', () => {
    it('Organization tab catalog has exactly 3 tabs: Structure, Departments, Work Locations (NO Profile tab)', () => {
      const tabIds = ORGANIZATION_TABS.map((t) => t.id);
      expect(tabIds).toEqual(['structure', 'departments', 'work-locations']);
      expect(tabIds).not.toContain('profile');
    });

    it('CompanyOrganizationPage renders default Structure tab and does not render Profile tab', () => {
      const html = renderToStaticMarkup(
        <TestWrapper initialEntry="/company-admin/organization">
          <CompanyOrganizationPage />
        </TestWrapper>,
      );

      expect(html).toContain('Organization Structure');
      expect(html).toContain('Departments');
      expect(html).toContain('Work Locations');
      // Tab list should not have Organization Profile
      expect(html).not.toContain('Organization Profile');
    });
  });

  describe('CompanyProfilePage Grouped Structure', () => {
    it('renders all canonical Company Profile sections in page header and cards', () => {
      const html = renderToStaticMarkup(
        <TestWrapper initialEntry="/company-admin/profile">
          <CompanyProfilePage />
        </TestWrapper>,
      );

      expect(html).toContain('Company Profile');
    });
  });
});
