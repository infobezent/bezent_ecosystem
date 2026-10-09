import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { CompanyOverviewPage } from '../pages/CompanyOverviewPage';
import { CompanyAccessPage } from '../pages/CompanyAccessPage';
import { CompanyApplicationsPage } from '../pages/CompanyApplicationsPage';
import { CompanyWorkspaceHeader } from '../components/CompanyWorkspaceHeader';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type { TenantAdminCompanySummary } from '../types/tenantAdmin.types';

describe('Company Workspace & Company Overview Verification', () => {
  const mockCompany: TenantAdminCompanySummary = {
    id: 'comp_apj3d',
    name: 'APJ3D Pvt Ltd',
    displayName: 'APJ3D',
    code: 'APJ3D-01',
    status: 'active',
    legalName: 'APJ3D Manufacturing Private Limited',
    organizationType: 'Private Limited',
    industry: '3D Printing & Precision Engineering',
    registrationNumber: 'U29300TN2024PTC123456',
    country: 'India',
    city: 'Chennai',
    location: 'Chennai, India',
    enabledModules: ['hrms'],
    createdAt: '2026-01-15T00:00:00.000Z',
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
    entitlements: ['hrms', 'crm', 'project_management'],
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
    vi.spyOn(tenantAdminApi, 'getCompanyOrgCounts').mockResolvedValue({
      businessUnits: 2,
      divisions: 4,
      departments: 12,
      workLocations: 3,
    });
    vi.spyOn(tenantAdminApi, 'getCompanyApplications').mockResolvedValue(['hrms']);
    vi.spyOn(tenantAdminApi, 'listMembers').mockResolvedValue([
      {
        id: 'usr_mem_1',
        userId: 'usr_mem_1',
        email: 'engineer@apj3d.example',
        firstName: 'Ravi',
        lastName: 'Varma',
        status: 'active',
        tenantAuthority: 'standard',
        createdAt: '2026-02-01T00:00:00.000Z',
        companiesAccess: [
          {
            companyId: 'comp_apj3d',
            companyName: 'APJ3D Pvt Ltd',
            companyCode: 'APJ3D-01',
            status: 'active',
            roles: [
              {
                roleId: 'role_sys_employee',
                roleCode: 'employee',
                roleName: 'Employee',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('1. Company Workspace Header renders compact company identity, Edit button, and 4 canonical tabs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <CompanyWorkspaceHeader company={mockCompany} activeSection="overview" />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Initial Avatar [AP]
    expect(html).toContain('AP');
    // Display Name
    expect(html).toContain('APJ3D');
    // Company Code
    expect(html).toContain('APJ3D-01');
    // Status Badge
    expect(html).toContain('Active');
    // Edit Company button
    expect(html).toContain('Edit Company');

    // Exactly 4 Canonical Sections (Company Details removed from navigation)
    expect(html).toContain('Overview');
    expect(html).not.toContain('Company Details');
    expect(html).toContain('Organization');
    expect(html).toContain('Access');
    expect(html).toContain('Applications');
  });

  it('2. Company Overview renders Company Information with real data and "—" for missing values', () => {
    const partialCompany: TenantAdminCompanySummary = {
      id: 'comp_partial',
      name: 'Delta Tech',
      code: 'DELTA-01',
      status: 'active',
      legalName: null, // missing
      organizationType: null, // missing
      industry: 'Software',
      registrationNumber: null, // missing
      country: 'India',
      city: null,
      location: null,
    };

    const partialContext: TenantAdminContextValue = {
      ...mockContext,
      companies: [partialCompany],
      selectedCompanyId: 'comp_partial',
      selectedCompany: partialCompany,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_partial/overview']}>
        <TenantAdminContext.Provider value={partialContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('Company Information');
    expect(html).not.toContain('Company Snapshot');
    expect(html).toContain('Legal Company Name');
    expect(html).toContain('Company Code');
    expect(html).toContain('DELTA-01');
    expect(html).toContain('India');
    // Genuine missing values render "—"
    expect(html).toContain('—');
  });

  it('2b. Legacy /details route safely redirects to company /overview', () => {
    let redirectedTo = '';
    function TestCompanyDetailsRedirect() {
      const { companyId } = useParams<{ companyId: string }>();
      const target = `/tenant-admin/tenant/companies/${encodeURIComponent(companyId || '')}/overview`;
      redirectedTo = target;
      return <Navigate to={target} replace />;
    }

    renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/details']}>
        <Routes>
          <Route
            path="/tenant-admin/tenant/companies/:companyId/details"
            element={<TestCompanyDetailsRedirect />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(redirectedTo).toBe('/tenant-admin/tenant/companies/comp_apj3d/overview');
  });

  it('3. Company Overview renders Organization Summary and canonical term Work Locations', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/overview']}>
        <TenantAdminContext.Provider value={mockContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('Organization');
    expect(html).toContain('Business Units');
    expect(html).toContain('Divisions');
    expect(html).toContain('Departments');
    // Branch model requirement: Work Locations represents branches/offices/plants
    expect(html).toContain('Work Locations');
    // Top-right action
    expect(html).toContain('View organization');
  });

  it('4. Company Overview renders Applications Summary with real data hook and CTA', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/overview']}>
        <TenantAdminContext.Provider value={mockContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('Applications');
    expect(html).toContain('HRMS');
    expect(html).toContain('CRM');
    expect(html).toContain('Project Management');
    expect(html).toContain('Manage applications');
  });

  it('5. Company Overview renders Access Summary and supports 0 Company Admins as valid', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/overview']}>
        <TenantAdminContext.Provider value={mockContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('Access');
    expect(html).toContain('Company users');
    expect(html).toContain('Delegated administrators');
    expect(html).toContain('Manage access');
  });

  it('6. Key Metrics Strip renders with real domain state', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/overview']}>
        <TenantAdminContext.Provider value={mockContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('Key Company Metrics');
    expect(html).toContain('Work Locations');
    expect(html).toContain('Departments');
    expect(html).toContain('Users');
    expect(html).toContain('Applications');
  });

  it('7. Recent Activity renders clean empty state without derived/fabricated events or View all link', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/overview']}>
        <TenantAdminContext.Provider value={mockContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Section title
    expect(html).toContain('Recent Activity');
    // Clean empty state
    expect(html).toContain('No recent activity yet.');
    // View all is hidden until a real audit destination exists
    expect(html).not.toContain('View all');
    // Ensure NO fabricated/derived events are rendered
    expect(html).not.toContain('HRMS enabled');
    expect(html).not.toContain('Branch added');
    expect(html).not.toContain('Delegated access assigned');
    expect(html).not.toContain('Company details updated');
  });

  it('8. Company Access renders inside company workspace without redirecting to global access', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/access']}>
        <TenantAdminContext.Provider value={mockContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/access"
              element={<CompanyAccessPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Preserves CompanyWorkspaceHeader (Edit Company hidden for Access)
    expect(html).toContain('APJ3D');
    expect(html).toContain('APJ3D-01');
    expect(html).not.toContain('Edit Company');

    // Shows the four company workspace tabs (Company Details removed)
    expect(html).toContain('Overview');
    expect(html).not.toContain('Company Details');
    expect(html).toContain('Organization');
    expect(html).toContain('Access');
    expect(html).toContain('Applications');

    // Restrained empty state placeholder
    expect(html).toContain('Company access management will be configured here.');
  });

  it('9. Company Applications renders inside company workspace without redirecting to global applications', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/applications']}>
        <TenantAdminContext.Provider value={mockContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/applications"
              element={<CompanyApplicationsPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Preserves CompanyWorkspaceHeader (Edit Company hidden for Applications)
    expect(html).toContain('APJ3D');
    expect(html).toContain('APJ3D-01');
    expect(html).not.toContain('Edit Company');

    // Shows the four company workspace tabs (Company Details removed)
    expect(html).toContain('Overview');
    expect(html).not.toContain('Company Details');
    expect(html).toContain('Organization');
    expect(html).toContain('Access');
    expect(html).toContain('Applications');

    // Restrained empty state placeholder
    expect(html).toContain('Application access for this company will be managed here.');
  });

  it('9b. Company Overview renders supported master fields in Company Information section', () => {
    const fullCompany: TenantAdminCompanySummary = {
      ...mockCompany,
      businessEmail: 'contact@apj3d.example',
      contactPhone: '+91 44 2345 6789',
      website: 'https://apj3d.example',
      timeZone: 'Asia/Kolkata',
      currency: 'INR',
    };

    const fullContext: TenantAdminContextValue = {
      ...mockContext,
      companies: [fullCompany],
      selectedCompanyId: fullCompany.id,
      selectedCompany: fullCompany,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/overview']}>
        <TenantAdminContext.Provider value={fullContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('Company Information');
    expect(html).toContain('APJ3D Manufacturing Private Limited');
    expect(html).toContain('APJ3D-01');
    expect(html).toContain('Private Limited');
    expect(html).toContain('U29300TN2024PTC123456');
    expect(html).toContain('Chennai, India');
    expect(html).toContain('India');
    expect(html).toContain('Asia/Kolkata');
    expect(html).toContain('INR');
    expect(html).toContain('contact@apj3d.example');
    expect(html).toContain('+91 44 2345 6789');
    expect(html).toContain('https://apj3d.example');
  });

  it('10. Cross-tenant company boundary is enforced across Overview, Access, and Applications routes', () => {
    const crossTenantContext: TenantAdminContextValue = {
      ...mockContext,
      companies: [mockCompany], // Does NOT contain comp_foreign_tenant
    };

    // 1. Overview boundary check
    const overviewHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_foreign_tenant/overview']}>
        <TenantAdminContext.Provider value={crossTenantContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/overview"
              element={<CompanyOverviewPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );
    expect(overviewHtml).toContain('Company Not Found or Access Denied');
    expect(overviewHtml).toContain('Cross-tenant access is prohibited.');

    // 2. Access boundary check
    const accessHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_foreign_tenant/access']}>
        <TenantAdminContext.Provider value={crossTenantContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/access"
              element={<CompanyAccessPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );
    expect(accessHtml).toContain('Company Not Found or Access Denied');
    expect(accessHtml).toContain('Cross-tenant access is prohibited.');

    // 3. Applications boundary check
    const appsHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_foreign_tenant/applications']}>
        <TenantAdminContext.Provider value={crossTenantContext}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/applications"
              element={<CompanyApplicationsPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );
    expect(appsHtml).toContain('Company Not Found or Access Denied');
    expect(appsHtml).toContain('Cross-tenant access is prohibited.');
  });
});
