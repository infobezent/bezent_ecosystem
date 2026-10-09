import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CompaniesPage } from '../pages/CompaniesPage';
import { CompanyDetailsPage } from '../pages/CompanyDetailsPage';
import { superAdminApi, type CompanyRecord, type TenantRecord } from '../api/superAdminApi';
import { superAdminNavigation } from '../navigation/superAdminNavigation';
import { superAdminRoutes } from '../routes/superAdminRoutes';

vi.mock('../api/superAdminApi', async () => {
  const actual =
    await vi.importActual<typeof import('../api/superAdminApi')>('../api/superAdminApi');
  return {
    ...actual,
    superAdminApi: {
      ...actual.superAdminApi,
      listCompanies: vi.fn(),
      getCompany: vi.fn(),
      createCompany: vi.fn(),
      updateCompany: vi.fn(),
      activateCompany: vi.fn(),
      suspendCompany: vi.fn(),
      listTenants: vi.fn(),
      getTenant: vi.fn(),
      getTenantModules: vi.fn(),
      listCompanyAdmins: vi.fn(),
      assignCompanyAdmin: vi.fn(),
      revokeCompanyAdmin: vi.fn(),
      resendCompanyAdminInvitation: vi.fn(),
      listAuditLogs: vi.fn(),
      listUsers: vi.fn(),
    },
  };
});

describe('Super Admin Companies — Frontend UI & Regression Suite', () => {
  const sampleTenant: TenantRecord = {
    id: 'tnt_abc_01',
    name: 'ABC Group',
    code: 'ABC',
    contactEmail: 'contact@abc.com',
    contactPhone: '+1 555-0100',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleCompany: CompanyRecord = {
    id: 'comp_abc_01',
    tenantId: 'tnt_abc_01',
    tenantName: 'ABC Group',
    name: 'ABC Manufacturing Pvt Ltd',
    code: 'ABC-MFG',
    legalName: 'ABC Manufacturing Private Limited',
    businessEmail: 'contact@abc-mfg.com',
    contactPhone: '+1 555-0199',
    country: 'US',
    timeZone: 'America/New_York',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enabledModules: ['hrms', 'project_management'],
    adminsCount: 2,
    activeAdminsCount: 2,
    pendingAdminsCount: 0,
    adminAccessStatus: 'active',
  };

  const samplePendingCompany: CompanyRecord = {
    id: 'comp_abc_02',
    tenantId: 'tnt_abc_01',
    tenantName: 'ABC Group',
    name: 'ABC Technologies Pvt Ltd',
    code: 'ABC-TECH',
    legalName: null,
    businessEmail: null,
    contactPhone: null,
    country: null,
    timeZone: null,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enabledModules: ['hrms'],
    adminsCount: 1,
    activeAdminsCount: 0,
    pendingAdminsCount: 1,
    adminAccessStatus: 'pending',
  };

  const sampleNoAdminCompany: CompanyRecord = {
    id: 'comp_abc_03',
    tenantId: 'tnt_abc_01',
    tenantName: 'ABC Group',
    name: 'ABC Engineering Pvt Ltd',
    code: 'ABC-ENG',
    legalName: null,
    businessEmail: null,
    contactPhone: null,
    country: null,
    timeZone: null,
    status: 'suspended',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enabledModules: [],
    adminsCount: 0,
    activeAdminsCount: 0,
    pendingAdminsCount: 0,
    adminAccessStatus: 'none',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Companies List (/super-admin/companies)', () => {
    it('1 & 2. renders company name, code, and parent customer', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage initialCompanies={[sampleCompany]} initialTenants={[sampleTenant]} />
        </MemoryRouter>,
      );

      expect(html).toContain('ABC Manufacturing Pvt Ltd');
      expect(html).toContain('ABC-MFG');
      expect(html).toContain('ABC Group');
    });

    it('3. renders company-level enabled applications', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage
            initialCompanies={[sampleCompany, sampleNoAdminCompany]}
            initialTenants={[sampleTenant]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('HRMS');
      expect(html).toContain('PM');
      expect(html).toContain('None');
    });

    it('4. renders active admin state with count', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage initialCompanies={[sampleCompany]} initialTenants={[sampleTenant]} />
        </MemoryRouter>,
      );

      expect(html).toContain('2 Active Admins');
    });

    it('5. renders pending first sign-in admin state', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage
            initialCompanies={[samplePendingCompany]}
            initialTenants={[sampleTenant]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Pending Sign-in');
    });

    it('6. renders no admin state', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage
            initialCompanies={[sampleNoAdminCompany]}
            initialTenants={[sampleTenant]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('No Admin');
    });

    it('7. renders active and suspended status correctly', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage
            initialCompanies={[sampleCompany, sampleNoAdminCompany]}
            initialTenants={[sampleTenant]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Active');
      expect(html).toContain('Suspended');
    });

    it('8, 9, 10, 11. renders search and filter controls (search, tenant, status, application)', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage initialCompanies={[sampleCompany]} initialTenants={[sampleTenant]} />
        </MemoryRouter>,
      );

      expect(html).toContain('Search companies...');
      expect(html).toContain('All Customer Tenants');
      expect(html).toContain('All Statuses');
      expect(html).toContain('All Applications');
    });

    it('12. renders legacy/incomplete company without crash', () => {
      const legacyCompany: CompanyRecord = {
        id: 'comp_legacy_01',
        tenantId: 'tnt_abc_01',
        name: 'Legacy Co',
        code: 'LEGACY',
        legalName: null,
        businessEmail: null,
        contactPhone: null,
        country: null,
        timeZone: null,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompaniesPage initialCompanies={[legacyCompany]} initialTenants={[sampleTenant]} />
        </MemoryRouter>,
      );

      expect(html).toContain('Legacy Co');
      expect(html).toContain('LEGACY');
      expect(html).toContain('No Admin');
      expect(html).toContain('None');
    });
  });

  describe('Company Details (/super-admin/companies/:companyId)', () => {
    it('21. Overview renders real company information and summary stats', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompanyDetailsPage
            initialCompany={sampleCompany}
            initialTenant={sampleTenant}
            initialModules={[
              {
                id: 'mod_1',
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                moduleCode: 'hrms',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
              {
                id: 'mod_2',
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                moduleCode: 'project_management',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
            ]}
            initialTenantModules={[
              {
                id: 'tmod_1',
                tenantId: 'tnt_abc_01',
                companyId: null,
                moduleCode: 'hrms',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
              {
                id: 'tmod_2',
                tenantId: 'tnt_abc_01',
                companyId: null,
                moduleCode: 'project_management',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
            ]}
            initialAdmins={[
              {
                membershipId: 'mem_01',
                userId: 'usr_01',
                email: 'priya@abc.com',
                firstName: 'Priya',
                lastName: 'Kumar',
                phone: null,
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                role: 'company_admin',
                status: 'active',
                assignedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              },
            ]}
            initialAuditLogs={[]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('ABC Manufacturing Pvt Ltd');
      expect(html).toContain('ABC-MFG');
      expect(html).toContain('ABC Group');
      expect(html).toContain('contact@abc-mfg.com');
      expect(html).toContain('Company Setup Status');
    });

    it('22. Setup Status displays Complete when all 4 milestones are achieved', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompanyDetailsPage
            initialCompany={sampleCompany}
            initialTenant={sampleTenant}
            initialModules={[
              {
                id: 'mod_1',
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                moduleCode: 'hrms',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
            ]}
            initialTenantModules={[
              {
                id: 'tmod_1',
                tenantId: 'tnt_abc_01',
                companyId: null,
                moduleCode: 'hrms',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
            ]}
            initialAdmins={[
              {
                membershipId: 'mem_01',
                userId: 'usr_01',
                email: 'priya@abc.com',
                firstName: 'Priya',
                lastName: 'Kumar',
                phone: null,
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                role: 'company_admin',
                status: 'active',
                assignedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              },
            ]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Setup Complete');
    });

    it('23. Setup Status indicates missing application and provides next action', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompanyDetailsPage
            initialCompany={{ ...sampleCompany, enabledModules: [] }}
            initialTenant={sampleTenant}
            initialModules={[]}
            initialTenantModules={[]}
            initialAdmins={[]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Manage Applications');
    });

    it('24. Setup Status indicates missing admin and provides next action', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompanyDetailsPage
            initialCompany={sampleCompany}
            initialTenant={sampleTenant}
            initialModules={[
              {
                id: 'mod_1',
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                moduleCode: 'hrms',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
            ]}
            initialTenantModules={[]}
            initialAdmins={[]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Assign Administrator');
    });

    it('25. Setup Status indicates pending first sign-in and provides next action', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompanyDetailsPage
            initialCompany={sampleCompany}
            initialTenant={sampleTenant}
            initialModules={[
              {
                id: 'mod_1',
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                moduleCode: 'hrms',
                status: 'enabled',
                enabledAt: new Date().toISOString(),
                disabledAt: null,
              },
            ]}
            initialTenantModules={[]}
            initialAdmins={[
              {
                membershipId: 'mem_01',
                userId: 'usr_01',
                email: 'arun@abc.com',
                firstName: 'Arun',
                lastName: 'Kumar',
                phone: null,
                tenantId: 'tnt_abc_01',
                companyId: 'comp_abc_01',
                role: 'company_admin',
                status: 'active',
                assignedAt: new Date().toISOString(),
                lastLoginAt: null, // never signed in
              },
            ]}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Resend Invitation');
    });

    it('31. renders suspended company safely with reactivation option', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <CompanyDetailsPage initialCompany={sampleNoAdminCompany} initialTenant={sampleTenant} />
        </MemoryRouter>,
      );

      expect(html).toContain('Reactivate Company');
    });
  });

  describe('Navigation & Information Architecture Invariants', () => {
    it('36 & 37. Super Admin deep link preserves companies route', () => {
      const rootRoute = superAdminRoutes[0];
      const childPaths = (rootRoute?.children ?? []).map((c) => c.path);
      expect(childPaths).toContain('companies');
      expect(childPaths).toContain('companies/:companyId');
    });

    it('38 & 39. Super Admin Main Nav count matches the 8 canonical groups', () => {
      expect(superAdminNavigation.destinations.length).toBe(8);
      expect(superAdminNavigation.destinations.map((g) => g.id)).toEqual([
        'overview',
        'tenants',
        'subscriptions',
        'applications',
        'governance',
        'operations',
        'support',
        'settings',
      ]);
    });
  });
});
