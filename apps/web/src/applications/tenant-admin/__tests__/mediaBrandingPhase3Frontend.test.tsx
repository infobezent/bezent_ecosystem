/**
 * BEZENT Common Data Engine - Phase 3 Frontend Tests
 * Persistent Media Architecture + Branding + Hardening
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { TenantProfilePage } from '../pages/TenantProfilePage';
import { EditTenantProfileDrawer, type ProfileGeneralData } from '../components/EditTenantProfileDrawer';
import { CreateCompanyPage } from '../pages/CreateCompanyPage';
import { CompanyDetailsPage } from '../pages/CompanyDetailsPage';

describe('Phase 3 Media & Branding Frontend Integration', () => {
  const baseTenant = {
    id: 'ten_main_123',
    name: 'Acme Enterprise',
    code: 'ACME-01',
    status: 'active',
    contactEmail: 'admin@acme.com',
    contactPhone: '+1-555-0100',
    logoUrl: 'http://localhost:4000/api/v1/platform/media/tenants/ten_main_123/logo/logo1.png',
    bannerUrl: 'http://localhost:4000/api/v1/platform/media/tenants/ten_main_123/banner/banner1.jpg',
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  const baseContext: TenantAdminContextValue = {
    tenantId: 'ten_main_123',
    tenantName: 'Acme Enterprise',
    tenant: baseTenant,
    user: {
      id: 'usr_001',
      email: 'admin@acme.com',
      firstName: 'Alice',
      lastName: 'Smith',
    },
    tenantAdmin: {
      id: 'ta_001',
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    companies: [
      {
        id: 'comp_1',
        name: 'Acme Operations',
        code: 'ACME-OPS',
        status: 'active',
        brandingMode: 'own_logo',
        logoUrl: 'http://localhost:4000/api/v1/platform/media/tenants/ten_main_123/companies/comp_1/logo/c1.png',
      },
      {
        id: 'comp_2',
        name: 'Acme Logistics',
        code: 'ACME-LOG',
        status: 'active',
        brandingMode: 'tenant_logo',
        logoUrl: 'http://localhost:4000/api/v1/platform/media/tenants/ten_main_123/logo/logo1.png',
      },
      {
        id: 'comp_3',
        name: 'Acme Finance',
        code: 'ACME-FIN',
        status: 'active',
        brandingMode: 'initials',
        logoUrl: null,
      },
    ],
    selectedCompanyId: null,
    selectedCompany: null,
    capacity: {
      used: 3,
      max: 5,
      remaining: 2,
      canCreateCompany: true,
      currentCompanies: 3,
      maxCompanies: 5,
      availableCapacity: 2,
      isAtCapacity: false,
    },
    entitlements: ['hrms'],
    isLoading: false,
    error: null,
    isTenantAdmin: true,
    isSuperAdmin: false,
    isSingleCompany: false,
    authorizationDenied: false,
    refresh: vi.fn().mockResolvedValue(undefined),
    refreshContext: vi.fn().mockResolvedValue(undefined),
    selectCompany: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Tenant Profile & Media Display', () => {
    it('renders persisted tenant logo and banner from canonical URLs', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantAdminContext.Provider value={baseContext}>
            <TenantProfilePage />
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('src="http://localhost:4000/api/v1/platform/media/tenants/ten_main_123/logo/logo1.png"');
      expect(html).toContain('src="http://localhost:4000/api/v1/platform/media/tenants/ten_main_123/banner/banner1.jpg"');
      expect(html).toContain('Change Cover');
    });

    it('renders fallback initials when tenant has no custom logo', () => {
      const contextWithoutLogo: TenantAdminContextValue = {
        ...baseContext,
        tenant: {
          ...baseTenant,
          logoUrl: null,
          bannerUrl: null,
        },
      };

      const html = renderToStaticMarkup(
        <MemoryRouter>
          <TenantAdminContext.Provider value={contextWithoutLogo}>
            <TenantProfilePage />
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      // Acme Enterprise initials -> AE
      expect(html).toContain('bezent-profile-logo-fallback');
      expect(html).toContain('AE');
    });

    it('EditTenantProfileDrawer renders logo and cover customization sections', () => {
      const initialData: ProfileGeneralData = {
        name: 'Acme Enterprise',
        industry: 'Technology',
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        contactName: 'Alice Smith',
        contactEmail: 'admin@acme.com',
        contactPhone: '+1-555-0100',
        logoUrl: baseTenant.logoUrl,
        bannerUrl: baseTenant.bannerUrl,
      };

      const html = renderToStaticMarkup(
        <EditTenantProfileDrawer
          isOpen={true}
          onClose={() => {}}
          tenant={baseTenant}
          initialData={initialData}
        />,
      );

      expect(html).toContain('Tenant Logo');
      expect(html).toContain('Change Logo');
      expect(html).toContain('Remove');
      expect(html).toContain('Cover / Banner Image');
      expect(html).toContain('Change Cover');
    });
  });

  describe('2. Add Company Wizard Branding & Creation Separation', () => {
    it('renders branding options and initials preview in Step 1', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/new']}>
          <TenantAdminContext.Provider value={baseContext}>
            <CreateCompanyPage />
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('Company Logo (Optional)');
      expect(html).toContain('Upload Company Logo');
      expect(html).toContain('Use Tenant Logo');
      expect(html).toContain('Use Company Initials');
    });
  });

  describe('3. Company Details Branding Modes & Presentation', () => {
    it('renders Custom Logo mode and avatar for own_logo company', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_1/details']}>
          <TenantAdminContext.Provider value={baseContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/details"
                element={<CompanyDetailsPage />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('Acme Operations — Company Details');
      expect(html).toContain('Custom Logo');
      expect(html).toContain('src="http://localhost:4000/api/v1/platform/media/tenants/ten_main_123/companies/comp_1/logo/c1.png"');
    });

    it('renders Tenant Logo mode badge for tenant_logo company', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_2/details']}>
          <TenantAdminContext.Provider value={baseContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/details"
                element={<CompanyDetailsPage />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('Acme Logistics — Company Details');
      expect(html).toContain('Tenant Logo');
    });

    it('renders Initials mode badge and fallback initials for company with initials mode', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_3/details']}>
          <TenantAdminContext.Provider value={baseContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/details"
                element={<CompanyDetailsPage />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('Acme Finance — Company Details');
      expect(html).toContain('Initials');
      // Initials for Acme Finance -> AC
      expect(html).toContain('AC');
    });
  });
});
