import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CustomerProvisioningPage } from '../pages/CustomerProvisioningPage';
import { superAdminNavigation } from '../navigation/superAdminNavigation';
import { SUPER_ADMIN_BASE_PATH } from '../routes/superAdminRoutes';
import { resolveActiveNavigation } from '../../../shared/utils/navigation';

vi.mock('../api/superAdminApi', async () => {
  const actual =
    await vi.importActual<typeof import('../api/superAdminApi')>('../api/superAdminApi');
  return {
    ...actual,
    superAdminApi: {
      ...actual.superAdminApi,
      provisionCustomer: vi.fn(),
    },
  };
});

describe('Super Admin Customer Provisioning — Frontend UI & Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProvisioningPage = () => {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={['/super-admin/provisioning']}>
        <Routes>
          <Route path="/super-admin/provisioning" element={<CustomerProvisioningPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('1. renders PageHeader with Title and canonical subtitle', () => {
    const html = renderProvisioningPage();
    expect(html).toContain('Customer Provisioning');
    expect(html).toContain('Onboard a new BEZENT customer');
    expect(html).toContain('Cancel');
  });

  it('2. displays all 5 canonical onboarding steps in the progress header', () => {
    const html = renderProvisioningPage();
    expect(html).toContain('1. Customer');
    expect(html).toContain('2. Primary Company');
    expect(html).toContain('3. Applications');
    expect(html).toContain('4. Initial Administrator');
    expect(html).toContain('5. Review &amp; Provision');
    expect(html).toContain('Step 1 of 5');
  });

  it('3. renders Step 1 (Customer Identity) canonical fields', () => {
    const html = renderProvisioningPage();
    expect(html).toContain('Step 1: Customer Tenant Identity');
    expect(html).toContain('Customer Name *');
    expect(html).toContain('Customer Code *');
    expect(html).toContain('Primary Contact Email');
    expect(html).toContain('Primary Contact Phone');
    expect(html).toContain('Continue →');
  });

  it('4. ensures no application CSS imports or inline style tags exist', () => {
    const html = renderProvisioningPage();
    expect(html).not.toContain('style="');
    expect(html).not.toContain('<style');
  });

  it('5. resolves navigation correctly for /super-admin/tenants/create', () => {
    const resolved = resolveActiveNavigation(
       superAdminNavigation,
       SUPER_ADMIN_BASE_PATH,
       '/super-admin/tenants/create',
    );
    expect(resolved).toEqual({
      destinationId: 'tenants',
    });
  });

  it('6. validates that Super Admin Main Nav contains 8 canonical entries and Tenants is direct item', () => {
    const mainNavIds = superAdminNavigation.destinations.filter((d) => d.sidebar).map((d) => d.id);
    expect(mainNavIds).toEqual([
      'overview',
      'tenants',
      'subscriptions',
      'applications',
      'governance',
      'operations',
      'support',
      'settings',
    ]);

    const tenantsDest = superAdminNavigation.destinations.find((d) => d.id === 'tenants');
    expect(tenantsDest).toBeDefined();
    expect(tenantsDest?.children).toBeUndefined();
    expect(tenantsDest?.segment).toBe('tenants');
  });
});
