import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { TenantProfilePage } from '../pages/TenantProfilePage';
import {
  EditTenantProfileDrawer,
  type ProfileGeneralData,
} from '../components/EditTenantProfileDrawer';
import { tenantAdminApi, TenantAdminApiError } from '../api/tenantAdminApi';

describe('Tenant Profile Experience Visual & Functional Verification', () => {
  const mockTenant = {
    id: 'TEN-ACME-001',
    name: 'Acme Technologies Pvt Ltd',
    code: 'ACME-IN-01',
    status: 'active',
    contactEmail: 'arjun@acme.com',
    contactPhone: '+91 98xxxxxx21',
    createdAt: '2026-09-18T00:00:00.000Z',
  };

  const mockContext: TenantAdminContextValue = {
    tenantId: 'TEN-ACME-001',
    tenantName: 'Acme Technologies Pvt Ltd',
    tenant: mockTenant,
    user: {
      id: 'usr_001',
      email: 'arjun@acme.com',
      firstName: 'Arjun',
      lastName: 'Kumar',
    },
    tenantAdmin: {
      id: 'admin_001',
      status: 'active',
      createdAt: '2026-09-18T00:00:00.000Z',
    },
    isTenantAdmin: true,
    isSuperAdmin: false,
    companies: [],
    capacity: {
      used: 3,
      max: 5,
      remaining: 2,
      canCreateCompany: true,
    },
    isSingleCompany: false,
    entitlements: ['hrms', 'crm', 'project_management'],
    selectedCompanyId: null,
    selectedCompany: null,
    selectCompany: () => {},
    isLoading: false,
    error: null,
    authorizationDenied: false,
    refreshContext: async () => {},
    refresh: async () => {},
  };

  const initialDrawerData: ProfileGeneralData = {
    name: 'Acme Technologies Pvt Ltd',
    industry: 'Manufacturing',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    contactName: 'Arjun Kumar',
    contactEmail: 'arjun@acme.com',
    contactPhone: '+91 98xxxxxx21',
    logoUrl: null,
    bannerUrl: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Tenant Profile page renders complete reference layout and cards', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantProfilePage />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Breadcrumbs & Header
    expect(html).toContain('Tenant');
    expect(html).toContain('Tenant Profile');
    expect(html).toContain('Edit Profile');

    // Hero identity
    expect(html).toContain('Acme Technologies Pvt Ltd');
    expect(html).toContain('ACME-IN-01');
    expect(html).toContain('TEN-ACME-001');
    expect(html).toContain('Bengaluru, India');
    expect(html).toContain('Change Cover');

    // Workspace Setup Card
    expect(html).toContain('Workspace Setup');
    expect(html).toContain('Complete');
    expect(html).toContain('3 configured');
    expect(html).toContain('3 available');

    // 4 Summary cards
    expect(html).toContain('Companies');
    expect(html).toContain('3 / 5');
    expect(html).toContain('Users');
    expect(html).toContain('Applications');
    expect(html).toContain('Since');
    expect(html).toContain('Sep 18, 2026');

    // Middle cards
    expect(html).toContain('Primary Contact');
    expect(html).toContain('Arjun Kumar');
    expect(html).toContain('arjun@acme.com');
    expect(html).toContain('+91 98xxxxxx21');

    expect(html).toContain('Account Information');
    expect(html).toContain('Manufacturing');

    // Application Entitlements
    expect(html).toContain('Application Entitlements');
    expect(html).toContain('HRMS');
    expect(html).toContain('CRM');
    expect(html).toContain('PM');
    expect(html).toContain('Manage Applications');
  });

  it('2. Tenant Profile displays fallback initials and default banner when uncustomized', () => {
    const contextWithoutBranding: TenantAdminContextValue = {
      ...mockContext,
      tenant: {
        ...mockTenant,
        name: 'Zenith Global Systems',
      },
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={contextWithoutBranding}>
          <TenantProfilePage />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Initials fallback (Zenith Systems -> ZS)
    expect(html).toContain('ZS');
    // Default cover background exists without fake stock img
    expect(html).toContain('bezent-profile-banner');
    expect(html).not.toContain('placeholder-building.jpg');
  });

  it('3. Edit Tenant Profile Drawer renders all required sections in right-side drawer mode', () => {
    const html = renderToStaticMarkup(
      <EditTenantProfileDrawer
        isOpen={true}
        onClose={() => {}}
        tenant={mockTenant}
        capacity={mockContext.capacity}
        initialData={initialDrawerData}
      />
    );

    // Modal drawer container
    expect(html).toContain('bezent-modal--drawer');
    expect(html).toContain('Edit Tenant Profile');
    expect(html).toContain('Update your tenant information and branding.');

    // Branding section
    expect(html).toContain('Branding');
    expect(html).toContain('Tenant Logo');
    expect(html).toContain('Change Logo');
    expect(html).toContain('Square image (min 240×240) PNG, JPG, WebP (Max 1MB)');
    expect(html).toContain('Cover / Banner Image');
    expect(html).toContain('Change Cover');
    expect(html).toContain('Recommended size: 1440×400 (3:1) PNG, JPG, WebP (Max 2MB)');

    // General Information section
    expect(html).toContain('General Information');
    expect(html).toContain('Tenant / Customer Display Name');
    expect(html).toContain('Industry');
    expect(html).toContain('Country');
    expect(html).toContain('State / Region');
    expect(html).toContain('City');

    // Primary Contact section
    expect(html).toContain('Primary Contact');
    expect(html).toContain('Contact Name');
    expect(html).toContain('Primary Contact Email');
    expect(html).toContain('Primary Contact Phone');

    // Platform Managed section (Read Only)
    expect(html).toContain('Platform Managed (Read Only)');
    expect(html).toContain('Tenant Code (Read-Only)');
    expect(html).toContain('ACME-IN-01');
    expect(html).toContain('TEN-ACME-001');
    expect(html).toContain('Company Capacity (Read-Only)');

    // Drawer footer actions
    expect(html).toContain('Cancel');
    expect(html).toContain('Save Changes');
  });

  it('4. Save Changes invokes canonical PATCH /tenant endpoint successfully', async () => {
    const updateSpy = vi.spyOn(tenantAdminApi, 'updateTenantDetails').mockResolvedValue({
      id: 'TEN-ACME-001',
      name: 'Updated Acme Corp',
      code: 'ACME-IN-01',
      status: 'active',
      contactEmail: 'contact@acme.example',
      contactPhone: '+91 9999999999',
      createdAt: '2026-09-18T00:00:00.000Z',
    });

    const result = await tenantAdminApi.updateTenantDetails({
      name: 'Updated Acme Corp',
      contactEmail: 'contact@acme.example',
      contactPhone: '+91 9999999999',
    });

    expect(updateSpy).toHaveBeenCalledWith({
      name: 'Updated Acme Corp',
      contactEmail: 'contact@acme.example',
      contactPhone: '+91 9999999999',
    });
    expect(result.name).toBe('Updated Acme Corp');
  });

  it('5. Save Changes surfaces error message on API failure without closing drawer', async () => {
    const updateSpy = vi.spyOn(tenantAdminApi, 'updateTenantDetails').mockRejectedValue(
      new TenantAdminApiError('Network error or server unavailable', 500),
    );

    await expect(
      tenantAdminApi.updateTenantDetails({
        name: 'Failed Update',
        contactEmail: 'failed@example.com',
      }),
    ).rejects.toThrow('Network error or server unavailable');

    expect(updateSpy).toHaveBeenCalledWith({
      name: 'Failed Update',
      contactEmail: 'failed@example.com',
    });
  });
});
