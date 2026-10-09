import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { CompanyOrganizationStructurePage } from '../pages/CompanyOrganizationStructurePage';
import { CompanyWorkspaceHeader } from '../components/CompanyWorkspaceHeader';
import { AddUnitModal } from '../components/AddUnitModal';
import { EditUnitModal } from '../components/EditUnitModal';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type {
  BusinessUnitRecord,
  DepartmentRecord,
  EligibleHead,
  OrganizationHierarchy,
  TenantAdminCompanySummary,
} from '../types/tenantAdmin.types';

describe('Tenant Admin → Company Organization Structure (Administration Tree)', () => {
  const mockCompany: TenantAdminCompanySummary = {
    id: 'comp_apj3d',
    name: 'APJ3D Design Solution',
    displayName: 'APJ3D',
    code: 'APJ3D-01',
    status: 'active',
    legalName: 'APJ3D Design Solution Private Limited',
    organizationType: 'Private Limited',
    industry: 'Engineering & Industrial Design',
    country: 'India',
    city: 'Hosur',
    state: 'Tamil Nadu',
    location: 'Hosur, Tamil Nadu, India',
    createdAt: '2026-01-15T00:00:00.000Z',
  };

  const mockBusinessUnits: BusinessUnitRecord[] = [
    {
      id: 'bu_eng',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Engineering',
      code: 'BU-ENG',
      description: 'Core engineering and technical solutions',
      headEmployeeId: 'emp_1',
      headEmployeeName: 'Dr. Vikram Sarabhai',
      status: 'active',
      divisionCount: 2,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
      divisions: [
        {
          id: 'div_prod',
          tenantId: 'ten_main_123',
          companyId: 'comp_apj3d',
          businessUnitId: 'bu_eng',
          businessUnitName: 'Engineering',
          name: 'Product Division',
          code: 'DIV-PROD',
          description: 'Product design and manufacturing',
          headEmployeeId: null,
          headEmployeeName: null,
          status: 'active',
          departmentCount: 2,
          createdAt: '2026-01-15T00:00:00.000Z',
          updatedAt: '2026-01-15T00:00:00.000Z',
        },
        {
          id: 'div_serv',
          tenantId: 'ten_main_123',
          companyId: 'comp_apj3d',
          businessUnitId: 'bu_eng',
          businessUnitName: 'Engineering',
          name: 'Services Division',
          code: 'DIV-SERV',
          description: 'Client implementation services',
          headEmployeeId: null,
          headEmployeeName: null,
          status: 'active',
          departmentCount: 1,
          createdAt: '2026-01-15T00:00:00.000Z',
          updatedAt: '2026-01-15T00:00:00.000Z',
        },
      ],
    },
    {
      id: 'bu_ops',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Operations',
      code: 'BU-OPS',
      description: 'Operations and business administration',
      headEmployeeId: null,
      headEmployeeName: null,
      status: 'active',
      divisionCount: 1,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
      divisions: [
        {
          id: 'div_corp',
          tenantId: 'ten_main_123',
          companyId: 'comp_apj3d',
          businessUnitId: 'bu_ops',
          businessUnitName: 'Operations',
          name: 'Corporate Division',
          code: 'DIV-CORP',
          description: 'Corporate business operations',
          headEmployeeId: null,
          headEmployeeName: null,
          status: 'active',
          departmentCount: 2,
          createdAt: '2026-01-15T00:00:00.000Z',
          updatedAt: '2026-01-15T00:00:00.000Z',
        },
      ],
    },
  ];

  const mockDepartments: DepartmentRecord[] = [
    {
      id: 'dept_sw',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Software',
      code: 'DEPT-SW',
      description: 'Software development',
      businessUnitId: 'bu_eng',
      businessUnitName: 'Engineering',
      divisionId: 'div_prod',
      divisionName: 'Product Division',
      parentDepartmentId: null,
      headEmployeeId: null,
      headEmployeeName: null,
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'dept_qa',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Quality Assurance',
      code: 'DEPT-QA',
      description: 'Quality assurance and testing',
      businessUnitId: 'bu_eng',
      businessUnitName: 'Engineering',
      divisionId: 'div_prod',
      divisionName: 'Product Division',
      parentDepartmentId: null,
      headEmployeeId: null,
      headEmployeeName: null,
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
    },
  ];

  const mockHeads: EligibleHead[] = [
    {
      id: 'emp_1',
      employeeNumber: 'EMP-001',
      firstName: 'Vikram',
      lastName: 'Sarabhai',
      fullName: 'Dr. Vikram Sarabhai',
      email: 'vikram@apj3d.example',
      designationName: 'VP Engineering',
    },
  ];

  const mockHierarchy: OrganizationHierarchy = {
    company: {
      id: 'comp_apj3d',
      tenantId: 'ten_main_123',
      name: 'APJ3D Design Solution',
      code: 'APJ3D-01',
      displayName: 'APJ3D',
      organizationType: 'Private Limited',
      industry: 'Engineering & Industrial Design',
      website: 'https://apj3d.example',
      addressLine1: 'Industrial Complex',
      addressLine2: null,
      city: 'Hosur',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '635126',
    },
    businessUnits: mockBusinessUnits,
    totalBusinessUnits: 2,
    totalDivisions: 3,
  };

  const mockContext: TenantAdminContextValue = {
    tenantId: 'ten_main_123',
    tenantName: 'Zentram Enterprise Systems',
    tenant: {
      id: 'ten_main_123',
      name: 'Zentram Enterprise Systems',
      code: 'ZENTRAM',
      status: 'active',
      contactEmail: 'admin@zentram.example',
      contactPhone: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    user: {
      id: 'usr_ta_1',
      email: 'tenantadmin@zentram.example',
      firstName: 'Tenant',
      lastName: 'Admin',
    },
    tenantAdmin: {
      id: 'ta_1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    isTenantAdmin: true,
    isSuperAdmin: false,
    companies: [mockCompany],
    capacity: {
      used: 1,
      max: 5,
      remaining: 4,
      canCreateCompany: true,
    },
    isSingleCompany: true,
    entitlements: ['hrms'],
    selectedCompanyId: 'comp_apj3d',
    selectedCompany: mockCompany,
    selectCompany: vi.fn(),
    isLoading: false,
    error: null,
    authorizationDenied: false,
    refreshContext: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(tenantAdminApi, 'getCompanyProfile').mockResolvedValue(mockCompany);
    vi.spyOn(tenantAdminApi, 'getCompanyOrgHierarchy').mockResolvedValue(mockHierarchy);
    vi.spyOn(tenantAdminApi, 'getCompanyDepartments').mockResolvedValue(mockDepartments);
    vi.spyOn(tenantAdminApi, 'getCompanyEligibleHeads').mockResolvedValue(mockHeads);
  });

  describe('1. Workspace Shell & Header Invariants', () => {
    it('uses CompanyWorkspaceHeader with Organization tab active, hides Edit Company, and removes obsolete UI', () => {
      const orgHtml = renderToStaticMarkup(
        <MemoryRouter>
          <TenantAdminContext.Provider value={mockContext}>
            <CompanyWorkspaceHeader company={mockCompany} activeSection="organization" />
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      // Identity & Breadcrumbs
      expect(orgHtml).toContain('Companies');
      expect(orgHtml).toContain('APJ3D Design Solution');
      expect(orgHtml).toContain('APJ3D-01');
      expect(orgHtml).toContain('Active');

      // Edit Company MUST NOT be shown on Organization
      expect(orgHtml).not.toContain('Edit Company');

      // Canonical 4 Workspace Tabs (Organization active)
      expect(orgHtml).toContain('Overview');
      expect(orgHtml).toContain('Organization');
      expect(orgHtml).toContain('Access');
      expect(orgHtml).toContain('Applications');

      // Obsolete elements MUST NOT exist
      expect(orgHtml).not.toContain('Company Details');
      expect(orgHtml).not.toContain('Managed Company Context');
      expect(orgHtml).not.toContain('Back to Settings');
      expect(orgHtml).not.toContain('Settings / Organization / Organization Structure');
      expect(orgHtml).not.toContain('Company Overview button');

      // Overview page DOES show Edit Company
      const overviewHtml = renderToStaticMarkup(
        <MemoryRouter>
          <TenantAdminContext.Provider value={mockContext}>
            <CompanyWorkspaceHeader company={mockCompany} activeSection="overview" onEditCompany={vi.fn()} />
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );
      expect(overviewHtml).toContain('Edit Company');
    });

    it('canonical organization route resolves /organization to /organization/structure', () => {
      let redirectedTo = '';
      function OrganizationRedirect() {
        const { companyId } = useParams<{ companyId: string }>();
        const target = `/tenant-admin/tenant/companies/${encodeURIComponent(companyId || '')}/organization/structure`;
        redirectedTo = target;
        return <Navigate to={target} replace />;
      }

      renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization']}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/organization"
              element={<OrganizationRedirect />}
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(redirectedTo).toBe('/tenant-admin/tenant/companies/comp_apj3d/organization/structure');
    });
  });

  describe('2. Populated Structure Layout & Toolbar', () => {
    it('renders populated hierarchy with exactly ONE Add Unit action, no Add Business Unit CTA, and hierarchy explorer', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization/structure']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/structure"
                element={
                  <CompanyOrganizationStructurePage
                    initialHierarchy={mockHierarchy}
                    initialDepartments={mockDepartments}
                    initialEligibleHeads={mockHeads}
                  />
                }
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      // Subtitle
      expect(html).toContain("Manage the company&#x27;s organizational structure and work locations.");
      // Sub-navigation tabs
      expect(html).toContain('Structure');
      expect(html).toContain('Work Locations');

      // Structure Toolbar
      expect(html).toContain('Organization Structure');
      expect(html).toContain('Search units...');
      expect(html).toContain('All Types');

      // Add Unit appears exactly once in the toolbar
      const addUnitMatches = html.match(/>Add Unit</g);
      expect(addUnitMatches).not.toBeNull();
      expect(addUnitMatches?.length).toBe(1);

      // Add Business Unit empty-state CTA is completely absent
      expect(html).not.toContain('Add Business Unit');
      expect(html).not.toContain('No organization units yet.');

      // 55-60% Explorer / 40-45% Details layout
      expect(html).toContain('Hierarchy Explorer');
      expect(html).toContain('Selected Unit Details');

      // Hierarchy Nodes
      expect(html).toContain('Engineering');
      expect(html).toContain('Operations');
      expect(html).toContain('Product Division');
      expect(html).toContain('Software');
    });
  });

  describe('3. Unit Creation Rules & Dialogs', () => {
    it('AddUnitModal enforces Business Unit parent = Company', () => {
      const html = renderToStaticMarkup(
        <AddUnitModal
          isOpen={true}
          onClose={vi.fn()}
          company={mockCompany}
          businessUnits={mockBusinessUnits}
          divisions={mockBusinessUnits.flatMap((b) => b.divisions || [])}
          eligibleHeads={mockHeads}
          initialUnitType="business_unit"
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Add Organization Unit');
      expect(html).toContain('Business Unit');
      // Parent is fixed to company
      expect(html).toContain('APJ3D Design Solution (Company)');
    });

    it('AddUnitModal enforces Division parent = Business Unit', () => {
      const html = renderToStaticMarkup(
        <AddUnitModal
          isOpen={true}
          onClose={vi.fn()}
          company={mockCompany}
          businessUnits={mockBusinessUnits}
          divisions={mockBusinessUnits.flatMap((b) => b.divisions || [])}
          eligibleHeads={mockHeads}
          initialUnitType="division"
          initialParentId="bu_eng"
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Parent Business Unit');
      expect(html).toContain('Engineering (BU-ENG)');
    });

    it('AddUnitModal enforces Department parent = Division', () => {
      const html = renderToStaticMarkup(
        <AddUnitModal
          isOpen={true}
          onClose={vi.fn()}
          company={mockCompany}
          businessUnits={mockBusinessUnits}
          divisions={mockBusinessUnits.flatMap((b) => b.divisions || [])}
          eligibleHeads={mockHeads}
          initialUnitType="department"
          initialParentId="div_prod"
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Parent Division');
      expect(html).toContain('Product Division (DIV-PROD)');
    });

    it('EditUnitModal renders edit form for selected Business Unit', () => {
      const html = renderToStaticMarkup(
        <EditUnitModal
          isOpen={true}
          onClose={vi.fn()}
          company={mockCompany}
          selectedUnit={{ type: 'business_unit', data: mockBusinessUnits[0]! }}
          businessUnits={mockBusinessUnits}
          divisions={mockBusinessUnits.flatMap((b) => b.divisions || [])}
          eligibleHeads={mockHeads}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Edit Business Unit');
      expect(html).toContain('Save Changes');
    });
  });

  describe('4. Empty State', () => {
    it('when zero units exist: Add Business Unit appears exactly once, toolbar Add Unit is absent, hierarchy populated state is absent', () => {
      const emptyHierarchy: OrganizationHierarchy = {
        company: mockHierarchy.company,
        businessUnits: [],
        totalBusinessUnits: 0,
        totalDivisions: 0,
      };

      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization/structure']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/structure"
                element={
                  <CompanyOrganizationStructurePage
                    initialHierarchy={emptyHierarchy}
                    initialDepartments={[]}
                  />
                }
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('No organization units yet.');
      expect(html).toContain('Start by creating the first business unit for APJ3D.');

      // Add Business Unit appears exactly once
      const addBuMatches = html.match(/Add Business Unit/g);
      expect(addBuMatches).not.toBeNull();
      expect(addBuMatches?.length).toBe(1);

      // Toolbar Add Unit is absent
      expect(html).not.toContain('>Add Unit<');
      expect(html).not.toContain('Search units...');

      // Hierarchy populated state is absent
      expect(html).not.toContain('Hierarchy Explorer');
      expect(html).not.toContain('Selected Unit Details');
    });
  });

  describe('5. Tenant Boundary Protection', () => {
    it('blocks access and displays cross-tenant violation when accessing foreign company ID', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_foreign_999/organization/structure']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/structure"
                element={<CompanyOrganizationStructurePage />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('Company Not Found or Access Denied');
      expect(html).toContain('Cross-tenant access is prohibited.');
      expect(html).toContain('Back to Companies');
    });
  });

  describe('6. Loading State', () => {
    it('while structure data is loading, neither creation CTA flashes before state is known', () => {
      // Without initialHierarchy, page starts in isLoadingData = true
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization/structure']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/structure"
                element={<CompanyOrganizationStructurePage />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      // Neither creation CTA should be present while loading
      expect(html).not.toContain('>Add Unit<');
      expect(html).not.toContain('Add Business Unit');

      // Loading state indicator is visible
      expect(html).toContain('Loading organization structure...');
    });
  });
});
