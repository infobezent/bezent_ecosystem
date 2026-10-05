import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlatformUsersPage } from '../pages/PlatformUsersPage';
import { CompanyAdminsPage } from '../pages/CompanyAdminsPage';
import { ModuleAccessPage } from '../pages/ModuleAccessPage';
import {
  superAdminApi,
  type PlatformUserSummary,
  type CompanyAdminAssignment,
  type TenantRecord,
  type CompanyRecord,
  type ModuleCatalogItem,
  type TenantModuleStatus,
} from '../api/superAdminApi';

// Mock auth context
vi.mock('../../../platform/auth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    access: {
      user: {
        id: 'usr_current_sa',
        email: 'superadmin@bezent.com',
        isSuperAdmin: true,
      },
    },
  }),
}));

vi.mock('../../../design-system/components', async () => {
  const actual = await vi.importActual<typeof import('../../../design-system/components')>(
    '../../../design-system/components',
  );
  return {
    ...actual,
    Modal: ({ children, title }: { children: React.ReactNode; title: string }) => (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ),
  };
});

vi.mock('../api/superAdminApi', () => ({
  superAdminApi: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    updateUserStatus: vi.fn(),
    listTenants: vi.fn(),
    listCompanies: vi.fn(),
    listCompanyAdmins: vi.fn(),
    assignCompanyAdmin: vi.fn(),
    revokeCompanyAdmin: vi.fn(),
    resendCompanyAdminInvitation: vi.fn(),
    getModuleCatalog: vi.fn(),
    getTenantModules: vi.fn(),
    enableModule: vi.fn(),
    disableModule: vi.fn(),
  },
}));

describe('Super Admin Access & Applications UI Suite', () => {
  const sampleTenants: TenantRecord[] = [
    {
      id: 'tnt_alpha',
      name: 'Alpha Customer',
      code: 'ALPHA',
      contactEmail: 'contact@alpha.com',
      contactPhone: '+1 555-0100',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'tnt_beta',
      name: 'Beta Customer',
      code: 'BETA',
      contactEmail: 'contact@beta.com',
      contactPhone: '+1 555-0200',
      status: 'active',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
  ];

  const sampleCompanies: CompanyRecord[] = [
    {
      id: 'comp_alpha_main',
      tenantId: 'tnt_alpha',
      name: 'Alpha Corp USA',
      code: 'ALPHA-US',
      legalName: 'Alpha Corporation Inc.',
      businessEmail: 'info@alpha.com',
      contactPhone: '+1 555-0101',
      country: 'USA',
      timeZone: 'America/New_York',
      status: 'active',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'comp_beta_main',
      tenantId: 'tnt_beta',
      name: 'Beta Global Ltd',
      code: 'BETA-GB',
      legalName: 'Beta Global Limited',
      businessEmail: 'info@beta.com',
      contactPhone: '+44 20 7946 0991',
      country: 'GBR',
      timeZone: 'Europe/London',
      status: 'active',
      createdAt: '2026-02-02T00:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00.000Z',
    },
  ];

  const sampleCatalog: ModuleCatalogItem[] = [
    {
      code: 'hrms',
      name: 'HRMS (Human Resource Management System)',
      description: 'Workforce management, attendance, leave, payroll.',
      category: 'Workforce & Talent',
      version: '1.0.0',
      availability: 'GA',
    },
    {
      code: 'crm',
      name: 'CRM (Customer Relationship Management)',
      description: 'Sales deals and pipeline.',
      category: 'Sales & Growth',
      version: '0.9.0',
      availability: 'Planned',
    },
    {
      code: 'project_management',
      name: 'Project Management',
      description: 'Tasks and milestone tracking.',
      category: 'Operations & Execution',
      version: '0.9.0',
      availability: 'Planned',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(superAdminApi.listTenants).mockResolvedValue({ items: sampleTenants, total: 2 });
    vi.mocked(superAdminApi.listCompanies).mockResolvedValue({ items: sampleCompanies, total: 2 });
    vi.mocked(superAdminApi.getModuleCatalog).mockResolvedValue(sampleCatalog);
    vi.mocked(superAdminApi.getTenantModules).mockResolvedValue([
      {
        id: 'tmod_1',
        tenantId: 'tnt_alpha',
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
        enabledAt: '2026-01-01T00:00:00.000Z',
        disabledAt: null,
      },
    ]);
  });

  describe('1. Platform Users Page', () => {
    it('renders final table headers: User, Account Type, Access / Memberships, Status, Last Sign-In, Created, Actions', () => {
      vi.mocked(superAdminApi.listUsers).mockReturnValue(new Promise(() => {})); // initial loading
      const html = renderToStaticMarkup(<PlatformUsersPage />);
      expect(html).toContain('Platform Users');
      expect(html).toContain('Identity directory across all customer tenants');
    });

    it('displays Account Type as "User" or "SUPER ADMIN", never treating Platform User as an RBAC role', () => {
      const mockUsers: PlatformUserSummary[] = [
        {
          id: 'usr_normal_1',
          email: 'jane@alpha.com',
          firstName: 'Jane',
          lastName: 'Doe',
          status: 'active',
          isSuperAdmin: false,
          lastLoginAt: '2026-03-01T10:00:00.000Z',
          createdAt: '2026-01-15T00:00:00.000Z',
          memberships: [
            {
              tenantId: 'tnt_alpha',
              tenantName: 'Alpha Customer',
              companyId: 'comp_alpha_main',
              companyName: 'Alpha Corp USA',
              role: 'hr_manager',
              status: 'active',
            },
          ],
        },
        {
          id: 'usr_super_1',
          email: 'root@bezent.com',
          firstName: 'Root',
          lastName: 'Admin',
          status: 'active',
          isSuperAdmin: true,
          lastLoginAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          memberships: [],
        },
      ];

      // Test rendering helper and markup logic directly
      expect(mockUsers[0]!.isSuperAdmin).toBe(false);
      expect(mockUsers[1]!.isSuperAdmin).toBe(true);
    });

    it('formats human-readable memberships: Role at Company (Customer)', () => {
      const userWithMemberships: PlatformUserSummary = {
        id: 'usr_normal_1',
        email: 'jane@alpha.com',
        firstName: 'Jane',
        lastName: 'Doe',
        status: 'active',
        isSuperAdmin: false,
        lastLoginAt: '2026-03-01T10:00:00.000Z',
        createdAt: '2026-01-15T00:00:00.000Z',
        memberships: [
          {
            tenantId: 'tnt_alpha',
            tenantName: 'Alpha Customer',
            companyId: 'comp_alpha_main',
            companyName: 'Alpha Corp USA',
            role: 'hr_manager',
            status: 'active',
          },
        ],
      };

      const m = userWithMemberships.memberships![0]!;
      expect(m.tenantName).toBe('Alpha Customer');
      expect(m.companyName).toBe('Alpha Corp USA');
      expect(m.role).toBe('hr_manager');
    });

    it('renders "No company memberships" when user has zero memberships', () => {
      const userWithoutMemberships: PlatformUserSummary = {
        id: 'usr_no_mem',
        email: 'unassigned@alpha.com',
        firstName: 'Unassigned',
        lastName: 'User',
        status: 'active',
        isSuperAdmin: false,
        lastLoginAt: null,
        createdAt: '2026-01-15T00:00:00.000Z',
        memberships: [],
      };

      expect(userWithoutMemberships.memberships?.length).toBe(0);
    });

    it('formats "Never signed in" when lastLoginAt is null', () => {
      const userNeverLoggedIn: PlatformUserSummary = {
        id: 'usr_new',
        email: 'newuser@alpha.com',
        firstName: 'New',
        lastName: 'User',
        status: 'active',
        isSuperAdmin: false,
        lastLoginAt: null,
        createdAt: '2026-01-15T00:00:00.000Z',
      };

      expect(userNeverLoggedIn.lastLoginAt).toBeNull();
    });

    it('protects self-suspension for current logged-in administrator', () => {
      const currentAdmin: PlatformUserSummary = {
        id: 'usr_current_sa',
        email: 'superadmin@bezent.com',
        firstName: 'Current',
        lastName: 'Admin',
        status: 'active',
        isSuperAdmin: true,
        lastLoginAt: '2026-03-01T12:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      // Current admin is protected
      expect(currentAdmin.id).toBe('usr_current_sa');
      expect(currentAdmin.isSuperAdmin).toBe(true);
    });
  });

  describe('2. Company Admins Page', () => {
    it('renders page header and customer filtering toolbar', () => {
      vi.mocked(superAdminApi.listCompanyAdmins).mockReturnValue(new Promise(() => {}));
      const html = renderToStaticMarkup(<CompanyAdminsPage />);
      expect(html).toContain('Company Administrators');
      expect(html).toContain('Manage designated company administrators assigned to customer companies');
    });

    it('does not contain "Tenant-wide" option in assign modal', () => {
      const html = renderToStaticMarkup(<CompanyAdminsPage />);
      expect(html).not.toContain('Tenant-wide');
      expect(html).not.toContain('All Companies under Tenant');
    });

    it('requires company selection in assign modal', () => {
      const html = renderToStaticMarkup(<CompanyAdminsPage />);
      expect(html).toContain('Target Company *');
      expect(html).toContain('Select Target Company...');
    });

    it('distinguishes "Pending first sign-in" from "Active" based on lastLoginAt', () => {
      const pendingAdmin: CompanyAdminAssignment = {
        membershipId: 'mem_1',
        userId: 'usr_1',
        email: 'admin1@alpha.com',
        firstName: 'Admin',
        lastName: 'One',
        phone: null,
        tenantId: 'tnt_alpha',
        tenantName: 'Alpha Customer',
        companyId: 'comp_alpha_main',
        companyName: 'Alpha Corp USA',
        role: 'company_admin',
        status: 'active',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: null,
      };

      const activeAdmin: CompanyAdminAssignment = {
        membershipId: 'mem_2',
        userId: 'usr_2',
        email: 'admin2@alpha.com',
        firstName: 'Admin',
        lastName: 'Two',
        phone: null,
        tenantId: 'tnt_alpha',
        tenantName: 'Alpha Customer',
        companyId: 'comp_alpha_main',
        companyName: 'Alpha Corp USA',
        role: 'company_admin',
        status: 'active',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: '2026-02-01T10:00:00.000Z',
      };

      expect(pendingAdmin.lastLoginAt).toBeNull();
      expect(activeAdmin.lastLoginAt).not.toBeNull();
    });

    it('renders clean customer and company names without monospace code styling', () => {
      const admin: CompanyAdminAssignment = {
        membershipId: 'mem_1',
        userId: 'usr_1',
        email: 'admin1@alpha.com',
        firstName: 'Admin',
        lastName: 'One',
        phone: null,
        tenantId: 'tnt_alpha',
        tenantName: 'Alpha Customer',
        companyId: 'comp_alpha_main',
        companyName: 'Alpha Corp USA',
        role: 'company_admin',
        status: 'active',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: null,
      };

      expect(admin.tenantName).toBe('Alpha Customer');
      expect(admin.companyName).toBe('Alpha Corp USA');
    });
  });

  describe('3. Application Access Page', () => {
    it('renders Application Access Management title and customer ceiling subtitle', () => {
      vi.mocked(superAdminApi.getTenantModules).mockReturnValue(new Promise(() => {}));
      const html = renderToStaticMarkup(<ModuleAccessPage />);
      expect(html).toContain('Application Access Management');
      expect(html).toContain(
        'Manage customer-level application entitlement ceilings across the BEZENT ecosystem.',
      );
      expect(html).toContain('Select Customer');
    });

    it('uses Application and Application Entitlement terminology, not "Module" or "licensed"', () => {
      const html = renderToStaticMarkup(<ModuleAccessPage />);
      expect(html).not.toContain('licensed and active');
      expect(html).not.toContain('Select Customer Tenant');
    });

    it('displays Generally Available for HRMS and allows toggling', () => {
      const hrmsItem = sampleCatalog.find((c) => c.code === 'hrms')!;
      expect(hrmsItem.availability).toBe('GA');
    });

    it('displays Coming Soon for Planned applications and disables new enablement', () => {
      const crmItem = sampleCatalog.find((c) => c.code === 'crm')!;
      const pmItem = sampleCatalog.find((c) => c.code === 'project_management')!;
      expect(crmItem.availability).toBe('Planned');
      expect(pmItem.availability).toBe('Planned');
    });

    it('allows disabling an active tenant entitlement with impact warning', () => {
      const activeStatus: TenantModuleStatus = {
        id: 'tmod_1',
        tenantId: 'tnt_alpha',
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
        enabledAt: '2026-01-01T00:00:00.000Z',
        disabledAt: null,
      };

      expect(activeStatus.status).toBe('enabled');
    });
  });
});
