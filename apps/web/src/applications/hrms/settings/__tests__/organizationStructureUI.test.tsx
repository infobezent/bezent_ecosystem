import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';
import { OrganizationStructureSection } from '../organization/OrganizationStructureSection';
import { OrganizationSettingsWorkspace } from '../organization/OrganizationSettingsWorkspace';
import { OrganizationStructurePage } from '../pages/OrganizationStructurePage';
import { SettingsPage, SettingsPageInner } from '../pages/SettingsPage';
import { SETTINGS_MODULE_CARDS } from '../types/settingsCenter';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import { AuthContext, type AuthContextValue } from '../../../../platform/auth/AuthProvider';
import type { OrganizationHierarchy } from '../../organization/types/structure';
import type { OrganizationProfile } from '../../organization/api/organizationApi';

const mockCompanySummary = {
  id: 'comp_apj3d_01',
  tenantId: 'tenant_demo_01',
  name: 'APJ3D Design Solution Pvt Ltd',
  code: 'APJ3D',
  displayName: 'APJ3D',
  organizationType: 'Private Limited',
  industry: 'Engineering & Design',
  website: 'https://www.apj3d.com',
  addressLine1: 'Industrial Estate Phase II',
  addressLine2: 'SIPCOT',
  city: 'Hosur',
  state: 'Tamil Nadu',
  country: 'India',
  postalCode: '635126',
};

const mockHierarchy: OrganizationHierarchy = {
  company: mockCompanySummary,
  totalBusinessUnits: 2,
  totalDivisions: 3,
  businessUnits: [
    {
      id: 'bu_sw_01',
      tenantId: 'tenant_demo_01',
      companyId: 'comp_apj3d_01',
      name: 'Software Solutions',
      code: 'SW',
      description: 'Core software engineering & digital products',
      headEmployeeId: 'emp_01',
      headEmployeeName: 'Dr. APJ Kalam',
      headEmployeeNumber: 'EMP-001',
      status: 'active',
      divisionCount: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      divisions: [
        {
          id: 'div_prod_01',
          tenantId: 'tenant_demo_01',
          companyId: 'comp_apj3d_01',
          businessUnitId: 'bu_sw_01',
          businessUnitName: 'Software Solutions',
          name: 'Product Development',
          code: 'PROD',
          description: 'SaaS products and architecture',
          headEmployeeId: 'emp_01',
          headEmployeeName: 'Dr. APJ Kalam',
          headEmployeeNumber: 'EMP-001',
          status: 'active',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'div_client_01',
          tenantId: 'tenant_demo_01',
          companyId: 'comp_apj3d_01',
          businessUnitId: 'bu_sw_01',
          businessUnitName: 'Software Solutions',
          name: 'Client Solutions',
          code: 'CLIENT',
          description: 'Client delivery & enterprise solutions',
          headEmployeeId: null,
          headEmployeeName: null,
          status: 'active',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
    {
      id: 'bu_eng_02',
      tenantId: 'tenant_demo_01',
      companyId: 'comp_apj3d_01',
      name: 'Engineering Services',
      code: 'ENG',
      description: 'Physical & 3D engineering services',
      headEmployeeId: null,
      headEmployeeName: null,
      headEmployeeNumber: null,
      status: 'inactive',
      divisionCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      divisions: [
        {
          id: 'div_design_02',
          tenantId: 'tenant_demo_01',
          companyId: 'comp_apj3d_01',
          businessUnitId: 'bu_eng_02',
          businessUnitName: 'Engineering Services',
          name: 'Design Engineering',
          code: 'DESIGN',
          description: '3D CAD design',
          headEmployeeId: null,
          headEmployeeName: null,
          status: 'active',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
  ],
};

const mockEmptyHierarchy: OrganizationHierarchy = {
  company: mockCompanySummary,
  totalBusinessUnits: 0,
  totalDivisions: 0,
  businessUnits: [],
};

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
    'organization.structure.view',
    'organization.structure.manage',
    'hrms.organization.view',
    'hrms.organization.manage',
    'hrms.settings.view',
    'hrms.settings.manage',
  ],
  enabledModules: ['hrms' as const],
  essEligible: true,
  employeeId: null,
  workspaces: ['hrms' as const],
};

function createMockAuthContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'authenticated',
    error: null,
    access: {
      user: {
        id: 'usr_admin_01',
        email: 'admin@apj3d.com',
        firstName: 'Admin',
        lastName: 'User',
        isSuperAdmin: false,
      },
      platformWorkspaces: ['hrms' as const],
      companies: [mockCompanyAccess],
    },
    activeCompany: mockCompanyAccess,
    isSuperAdmin: false,
    isCompanyAdmin: true,
    completeSignIn: () => {},
    selectCompany: () => true,
    refreshAccess: async () => {},
    signOut: async () => {},
    can: (perm: string) => mockCompanyAccess.permissions.includes(perm),
    canAny: (perms: readonly string[]) => perms.some((p) => mockCompanyAccess.permissions.includes(p)),
    canAll: (perms: readonly string[]) => perms.every((p) => mockCompanyAccess.permissions.includes(p)),
    hasApplicationAccess: () => true,
    ...overrides,
  };
}

function TestAuthProvider({
  children,
  authContextValue = createMockAuthContext(),
}: {
  children: ReactNode;
  authContextValue?: AuthContextValue;
}) {
  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
}

describe('BEZENT HRMS — Organization Structure UI & Logic', () => {
  describe('Organization Hierarchy Explorer Rendering', () => {
    it('renders the fixed Company root node', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationStructureSection initialHierarchy={mockHierarchy} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Organization Structure');
      expect(html).toContain('Define how business units and divisions are organized within your company.');
      expect(html).toContain('APJ3D Design Solution Pvt Ltd');
      expect(html).toContain('Company (Root Entity)');
    });

    it('renders Business Units with codes, status badges, and division counts', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationStructureSection initialHierarchy={mockHierarchy} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Software Solutions');
      expect(html).toContain('SW');
      expect(html).toContain('Engineering Services');
      expect(html).toContain('ENG');
      expect(html).toContain('Inactive');
      expect(html).toContain('2 divisions');
      expect(html).toContain('1 division');
    });

    it('renders nested Divisions under expanded Business Units', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationStructureSection initialHierarchy={mockHierarchy} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Product Development');
      expect(html).toContain('PROD');
      expect(html).toContain('Client Solutions');
      expect(html).toContain('CLIENT');
      expect(html).toContain('Design Engineering');
      expect(html).toContain('DESIGN');
    });

    it('renders empty state when no Business Units exist without implying BU is mandatory', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationStructureSection initialHierarchy={mockEmptyHierarchy} />
        </TestAuthProvider>,
      );

      expect(html).toContain('APJ3D Design Solution Pvt Ltd');
      expect(html).toContain('No business units created yet.');
      expect(html).toContain(
        'Business units are optional. Create them when your organization needs another structural level.',
      );
      expect(html).toContain('Add Business Unit');
    });
  });

  describe('Selected Node Details Panel', () => {
    it('displays Company summary details by default', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationStructureSection initialHierarchy={mockHierarchy} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Company Details');
      expect(html).toContain('Organization Name');
      expect(html).toContain('Display Name');
      expect(html).toContain('Organization Type');
      expect(html).toContain('Industry');
      expect(html).toContain('Website');
      expect(html).toContain('Registered Address');
      expect(html).toContain('Engineering &amp; Design');
      expect(html).toContain('Hosur, Tamil Nadu, India, 635126');
    });
  });

  describe('RBAC Control', () => {
    it('hides Add Business Unit action when user lacks manage permissions', () => {
      const readOnlyAccess = {
        ...mockCompanyAccess,
        permissions: ['organization.structure.view', 'hrms.organization.view'],
      };
      const readOnlyAuth = createMockAuthContext({
        activeCompany: readOnlyAccess,
        can: (p) => readOnlyAccess.permissions.includes(p),
        canAny: (perms: readonly string[]) => perms.some((p) => readOnlyAccess.permissions.includes(p)),
      });

      const html = renderToStaticMarkup(
        <TestAuthProvider authContextValue={readOnlyAuth}>
          <OrganizationStructureSection initialHierarchy={mockHierarchy} />
        </TestAuthProvider>,
      );

      // Primary header action button should not be rendered
      expect(html).not.toContain('class="bezent-btn bezent-btn--primary');
    });
  });

  describe('Settings Center Integration & Navigation', () => {
    it('SETTINGS_MODULE_CARDS has top-level Organization card', () => {
      const orgCard = SETTINGS_MODULE_CARDS.find((card) => card.id === 'organization');
      expect(orgCard).toBeDefined();
      expect(orgCard?.name).toBe('Organization');
      expect(orgCard?.description).toBe(
        'Manage organization profile, structure, departments, designations, locations, and related master data.',
      );
    });

    it('OrganizationSettingsWorkspace renders subnavigation with Profile and Structure tabs', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationSettingsWorkspace initialTab="structure" initialHierarchy={mockHierarchy} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Organization Profile');
      expect(html).toContain('Organization Structure');
      expect(html).toContain('Departments');
      expect(html).toContain('Designations');
      expect(html).toContain('Work Locations');
      expect(html).toContain('Job Levels / Grades');
      expect(html).toContain('Cost Centers');
      expect(html).toContain('Reporting Structure');
      expect(html).toContain('Software Solutions');
    });

    it('OrganizationStructurePage standalone page renders hierarchy correctly', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationStructurePage initialHierarchy={mockHierarchy} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Organization Structure');
      expect(html).toContain('Software Solutions');
    });

    it('hrmsRoutes contains settings/organization/structure route', () => {
      const hrmsBaseRoute = hrmsRoutes.find((r) => r.path === 'hrms');
      expect(hrmsBaseRoute).toBeDefined();
      expect(hrmsBaseRoute?.children).toBeDefined();

      const children = hrmsBaseRoute!.children!;
      const structureRoute = children.find((r) => r.path === 'settings/organization/structure');
      expect(structureRoute).toBeDefined();

      const profileRoute = children.find((r) => r.path === 'settings/organization/profile');
      expect(profileRoute).toBeDefined();
    });
  });
});
