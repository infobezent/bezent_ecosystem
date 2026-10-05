import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { OrganizationStructureSection } from '../organization/OrganizationStructureSection';
import { AuthContext, type AuthContextValue } from '../../../platform/auth/AuthProvider';
import type { OrganizationHierarchy } from '../organization/types/structure';

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
          name: 'Client Engineering',
          code: 'ENG',
          description: 'Custom client engineering projects',
          headEmployeeId: null,
          headEmployeeName: null,
          headEmployeeNumber: null,
          status: 'active',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
    {
      id: 'bu_corp_01',
      tenantId: 'tenant_demo_01',
      companyId: 'comp_apj3d_01',
      name: 'Corporate Services',
      code: 'CORP',
      description: 'Administrative, finance and operations',
      headEmployeeId: null,
      headEmployeeName: null,
      headEmployeeNumber: null,
      status: 'active',
      divisionCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      divisions: [
        {
          id: 'div_ops_01',
          tenantId: 'tenant_demo_01',
          companyId: 'comp_apj3d_01',
          businessUnitId: 'bu_corp_01',
          businessUnitName: 'Corporate Services',
          name: 'Central Operations',
          code: 'OPS',
          description: 'Facilities and internal operations',
          headEmployeeId: null,
          headEmployeeName: null,
          headEmployeeNumber: null,
          status: 'active',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
  ],
};

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
  permissions: ['company.organization.view', 'company.organization.manage'],
  enabledModules: ['hrms' as const],
  essEligible: false,
  employeeId: null,
  workspaces: ['company_admin' as const],
};

function createMockAuthContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'authenticated',
    error: null,
    errorKind: null,
    access: {
      user: {
        id: 'usr_test',
        email: 'admin@apj3d.com',
        firstName: 'Admin',
        lastName: 'User',
        isSuperAdmin: false,
      },
      platformWorkspaces: ['company_admin' as const],
      companies: [mockCompanyAccess],
    },
    activeCompany: mockCompanyAccess,
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    hasApplicationAccess: () => true,
    isSuperAdmin: false,
    isCompanyAdmin: true,
    completeSignIn: () => {},
    selectCompany: () => true,
    refreshAccess: async () => {},
    signOut: async () => {},
    ...overrides,
  };
}

function TestAuthProvider({
  children,
  context = createMockAuthContext(),
}: {
  children: ReactNode;
  context?: AuthContextValue;
}) {
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

describe('Company Admin — Organization Structure UI', () => {
  it('renders hierarchy tree with business units and divisions', () => {
    const html = renderToStaticMarkup(
      <TestAuthProvider>
        <OrganizationStructureSection initialHierarchy={mockHierarchy} />
      </TestAuthProvider>,
    );

    expect(html).toContain('Organization Structure');
    expect(html).toContain('Software Solutions');
    expect(html).toContain('Corporate Services');
    expect(html).toContain('Product Development');
    expect(html).toContain('Client Engineering');
    expect(html).toContain('Central Operations');
    expect(html).toContain('Dr. APJ Kalam');
  });

  it('renders stats counters accurately', () => {
    const html = renderToStaticMarkup(
      <TestAuthProvider>
        <OrganizationStructureSection initialHierarchy={mockHierarchy} />
      </TestAuthProvider>,
    );

    expect(html).toContain('Business Units');
    expect(html).toContain('Divisions');
  });
});
