import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompanyContextBar } from '../components/CompanyContextBar';
import { CompanyAdminContext } from '../context/CompanyAdminContext';
import type { AuthorizedCompanySummary } from '../api/companyAdminApi';

describe('CompanyContextBar — Authority Label Separation', () => {
  const baseCompany: AuthorizedCompanySummary = {
    id: 'comp_demo_01',
    name: 'APJ3D Pvt Ltd',
    code: 'APJ3D',
    status: 'active',
    tenantId: 'tenant_demo_01',
    tenantName: 'BEZENT Demo',
    role: 'tenant_admin',
  };

  it('1. Displays "Tenant Admin" label when access comes from Tenant Admin authority without Company Admin role', () => {
    const activeCompany: AuthorizedCompanySummary = {
      ...baseCompany,
      role: 'tenant_admin',
      assignedRoles: [],
      authoritySource: 'tenant_admin',
      authorityLabel: 'Tenant Admin',
      isTenantAdmin: true,
      isMember: false,
    };

    const html = renderToStaticMarkup(
      <CompanyAdminContext.Provider
        value={{
          activeCompanyId: activeCompany.id,
          activeCompany,
          authorizedCompanies: [activeCompany],
          isLoadingCompanies: false,
          companyError: null,
          switchCompany: () => {},
          refreshCompanies: async () => {},
          isCompanyAdmin: true,
        }}
      >
        <CompanyContextBar />
      </CompanyAdminContext.Provider>,
    );

    expect(html).toContain('Tenant Admin');
    expect(html).not.toContain('Role: company_admin');
    expect(html).not.toContain('Role: tenant_admin');
    expect(html).toContain('Tenant Admin');
    expect(html).not.toContain('Role: company_admin');
    expect(html).not.toContain('Role: tenant_admin');
  });

  it('2. Displays "Company Admin" label when the user actually holds that company role', () => {
    const activeCompany: AuthorizedCompanySummary = {
      ...baseCompany,
      role: 'company_admin',
      assignedRoles: ['company_admin'],
      authoritySource: 'company_admin',
      authorityLabel: 'Company Admin',
      isTenantAdmin: false,
      isMember: true,
    };

    const html = renderToStaticMarkup(
      <CompanyAdminContext.Provider
        value={{
          activeCompanyId: activeCompany.id,
          activeCompany,
          authorizedCompanies: [activeCompany],
          isLoadingCompanies: false,
          companyError: null,
          switchCompany: () => {},
          refreshCompanies: async () => {},
          isCompanyAdmin: true,
        }}
      >
        <CompanyContextBar />
      </CompanyAdminContext.Provider>,
    );

    expect(html).toContain('Company Admin');
    expect(html).not.toContain('Role: company_admin');
    expect(html).not.toContain('Tenant Admin');
  });

  it('3. Displays accurate dual authority information when both authorities are explicitly held', () => {
    const activeCompany: AuthorizedCompanySummary = {
      ...baseCompany,
      role: 'company_admin',
      assignedRoles: ['company_admin'],
      authoritySource: 'dual',
      authorityLabel: 'Tenant Admin • Company Admin',
      isTenantAdmin: true,
      isMember: true,
    };

    const html = renderToStaticMarkup(
      <CompanyAdminContext.Provider
        value={{
          activeCompanyId: activeCompany.id,
          activeCompany,
          authorizedCompanies: [activeCompany],
          isLoadingCompanies: false,
          companyError: null,
          switchCompany: () => {},
          refreshCompanies: async () => {},
          isCompanyAdmin: true,
        }}
      >
        <CompanyContextBar />
      </CompanyAdminContext.Provider>,
    );

    expect(html).toContain('Tenant Admin • Company Admin');
    expect(html).not.toContain('Role: company_admin');
  });
});
