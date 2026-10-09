import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { CompanyAccessPage } from '../pages/CompanyAccessPage';
import { CompanyRolesOverviewTab } from '../components/CompanyRolesOverviewTab';
import { AddCompanyUserModal } from '../components/AddCompanyUserModal';
import type { TenantAdminCompanySummary } from '../types/tenantAdmin.types';

describe('Tenant Admin → Company Workspace → Access V1 Frontend (Administration Mirror)', () => {
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
    timeZone: 'Asia/Kolkata',
    createdAt: '2026-01-15T00:00:00.000Z',
  };

  const mockContextValue: TenantAdminContextValue = {
    companies: [mockCompany],
    activeCompany: mockCompany,
    setActiveCompany: vi.fn(),
    refreshCompanies: vi.fn(),
    isLoading: false,
    error: null,
    totalCompanies: 1,
    activeCompaniesCount: 1,
    maxCompanies: 5,
  } as unknown as TenantAdminContextValue;

  it('1. Renders CompanyAccessPage with CompanyWorkspaceHeader and internal tabs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/access']}>
        <TenantAdminContext.Provider value={mockContextValue}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/access"
              element={<CompanyAccessPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Header and company identity
    expect(html).toContain('APJ3D');
    expect(html).toContain('Access');
    expect(html).toContain('Users');
    expect(html).toContain('Roles &amp; Permissions');
  });

  it('2. Renders CompanyRolesOverviewTab with canonical role cards and disclaimers', () => {
    const html = renderToStaticMarkup(
      <CompanyRolesOverviewTab companyId="comp_apj3d" />,
    );

    // Canonical role definitions
    expect(html).toContain('Member');
    expect(html).toContain('Company Administrator');
    expect(html).toContain('Company Scope &amp; Application Boundary');
    expect(html).toContain('Administrative Capabilities');
    expect(html).toContain('Application permissions (HRMS, CRM, Project Management) are provisioned and managed separately');
    expect(html).toContain('Does not grant Tenant Administrator authority across other companies');
  });

  it('3. Renders AddCompanyUserModal with dual tabs (Existing User & Invite)', () => {
    const html = renderToStaticMarkup(
      <AddCompanyUserModal
        isOpen={true}
        onClose={vi.fn()}
        companyId="comp_apj3d"
        companyName="APJ3D"
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('Add User to Company');
    expect(html).toContain('Existing Tenant User');
    expect(html).toContain('Invite New User');
    expect(html).toContain('Assign User');
  });

  it('4. Renders EmptyState when company is not found or cross-tenant access is attempted', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_nonexistent/access']}>
        <TenantAdminContext.Provider value={mockContextValue}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/access"
              element={<CompanyAccessPage />}
            />
          </Routes>
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('Company Not Found or Access Denied');
    expect(html).toContain('Cross-tenant access is prohibited');
  });
});
