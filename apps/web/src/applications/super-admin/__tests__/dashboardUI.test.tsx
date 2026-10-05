import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SuperAdminDashboardPage } from '../pages/SuperAdminDashboardPage';
import { type DashboardOverview } from '../api/superAdminApi';

vi.mock('../api/superAdminApi', () => ({
  superAdminApi: {
    getDashboard: vi.fn(),
  },
}));

const mockOverview: DashboardOverview = {
  metrics: {
    customers: {
      total: 12,
      active: 10,
      suspended: 2,
    },
    companies: {
      total: 15,
      active: 14,
      suspended: 1,
      withoutAdmin: 1,
    },
    platformUsers: {
      total: 45,
      active: 42,
      suspended: 3,
    },
    companyAdmins: {
      uniqueAdmins: 8,
      totalAssignments: 10,
      companiesWithoutAdmin: 1,
    },
    healthSummary: {
      healthy: 9,
      needsAttention: 2,
      critical: 1,
    },
    totalTenants: 12,
    activeTenants: 10,
    suspendedTenants: 2,
    totalCompanies: 15,
    activeCompanies: 14,
    suspendedCompanies: 1,
    totalUsers: 45,
    activeUsers: 42,
    suspendedUsers: 3,
    uniqueAdmins: 8,
    adminAssignments: 10,
    companiesWithoutAdmin: 1,
  },
  customerHealth: {
    health: {
      healthy: 9,
      needsAttention: 2,
      critical: 1,
    },
    lifecycle: {
      active: 10,
      suspended: 2,
    },
  },
  applications: [
    {
      code: 'hrms',
      name: 'HRMS (Human Resource Management System)',
      availability: 'GA',
      entitledTenantsCount: 10,
    },
    {
      code: 'crm',
      name: 'CRM (Customer Relationship Management)',
      availability: 'Planned',
      entitledTenantsCount: 0,
    },
    {
      code: 'project_management',
      name: 'Project Management',
      availability: 'Planned',
      entitledTenantsCount: 0,
    },
  ],
  needsAttention: [
    {
      tenantId: 'tent_crit',
      tenantName: 'Stark Industries',
      status: 'critical',
      reason: 'Tenant is suspended. Users are restricted from accessing all applications.',
      reasons: ['Tenant is suspended. Users are restricted from accessing all applications.'],
      nextBestAction: {
        label: 'Reactivate Tenant',
        actionType: 'reactivate_tenant',
        targetTab: 'overview',
        description: 'Restore platform access for all companies and users under this customer.',
      },
    },
    {
      tenantId: 'tent_warn',
      tenantName: 'Wayne Enterprises',
      status: 'needs_attention',
      reason: 'No business application entitlements are active for this customer.',
      reasons: ['No business application entitlements are active for this customer.'],
      nextBestAction: {
        label: 'Configure Applications',
        actionType: 'configure_applications',
        targetTab: 'applications',
        description: 'Enable HRMS or other platform modules.',
      },
    },
  ],
  totalNeedsAttention: 2,
  recentTenants: [
    {
      id: 'tent_1',
      name: 'Acme Global',
      code: 'ACME',
      contactEmail: 'admin@acme.com',
      contactPhone: null,
      status: 'active',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
      companyCount: 2,
      activeModules: ['hrms'],
      health: {
        status: 'healthy',
        reasons: ['Account is fully configured.'],
        nextBestAction: null,
      },
    },
  ],
  recentAuditLogs: [
    {
      id: 'aud_1',
      actorUserId: 'usr_admin',
      actorEmail: 'superadmin@bezent.io',
      action: 'company_admin_assigned',
      targetType: 'company_admin',
      targetId: 'mem_1',
      tenantId: 'tent_1',
      tenantName: 'Acme Global',
      companyId: 'comp_1',
      companyName: 'Acme Operations',
      metadata: { adminEmail: 'ca@acme.com', firstName: 'John', lastName: 'Doe' },
      createdAt: '2026-03-04T12:00:00.000Z',
    },
    {
      id: 'aud_2',
      actorUserId: 'usr_admin',
      actorEmail: 'superadmin@bezent.io',
      action: 'module_enabled',
      targetType: 'module',
      targetId: 'hrms',
      tenantId: 'tent_1',
      tenantName: 'Acme Global',
      companyId: null,
      companyName: null,
      metadata: { moduleCode: 'hrms' },
      createdAt: '2026-03-04T11:45:00.000Z',
    },
  ],
};

describe('Super Admin Dashboard UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders Page Title, Live Subtitle, Refresh button, and Provision Customer CTA', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    expect(html).toContain('Super Admin Dashboard');
    expect(html).toContain('Live customer and platform operations');
    expect(html).toContain('Refresh');
    expect(html).toContain('Provision Customer');
  });

  it('2. Renders 4 Platform Metric Cards with live counts and active/suspended breakdowns', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    // Customers
    expect(html).toContain('Customers');
    expect(html).toContain('12');
    expect(html).toContain('10 Active');
    expect(html).toContain('2 Suspended');
    expect(html).toContain('View Customers →');

    // Companies
    expect(html).toContain('Companies');
    expect(html).toContain('15');
    expect(html).toContain('14 Active');
    expect(html).toContain('1 Suspended');
    expect(html).toContain('1 Without Admin');
    expect(html).toContain('Manage Companies →');

    // Platform Users (ensuring activeUsers is no longer undefined)
    expect(html).toContain('Platform Users');
    expect(html).toContain('45');
    expect(html).toContain('42 Active');
    expect(html).toContain('3 Suspended');
    expect(html).not.toContain('undefined Active');
    expect(html).toContain('Manage Users →');

    // Company Administrators
    expect(html).toContain('Company Administrators');
    expect(html).toContain('8'); // Unique Admins
    expect(html).toContain('10 Assignments');
    expect(html).toContain('Manage Admins →');
  });

  it('3. Renders Needs Attention Queue with canonical rules, severities, and next best actions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    expect(html).toContain('Needs Attention');
    expect(html).toContain('Stark Industries');
    expect(html).toContain('Tenant is suspended');
    expect(html).toContain('Critical');
    expect(html).toContain('Reactivate Tenant →');

    expect(html).toContain('Wayne Enterprises');
    expect(html).toContain('No business application entitlements');
    expect(html).toContain('Configure Applications →');
  });

  it('4. Handles empty Needs Attention state cleanly', () => {
    const emptyAttentionData: DashboardOverview = {
      ...mockOverview,
      needsAttention: [],
      totalNeedsAttention: 0,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={emptyAttentionData} />
      </MemoryRouter>,
    );

    expect(html).toContain('All customer accounts healthy');
    expect(html).toContain('Everything requiring customer attention is currently resolved.');
  });

  it('5. Renders Customer Health breakdown and Application Overview', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    // Customer Health
    expect(html).toContain('Customer Health');
    expect(html).toContain('OPERATIONAL HEALTH');
    expect(html).toContain('9 Healthy');
    expect(html).toContain('2 Needs Attention');
    expect(html).toContain('1 Critical');
    expect(html).toContain('ACCOUNT LIFECYCLE');
    expect(html).toContain('10 Active');

    // Applications Overview
    expect(html).toContain('Applications');
    expect(html).toContain('HRMS (Human Resource Management System)');
    expect(html).toContain('Generally Available');
    expect(html).toContain('10 Customers');

    expect(html).toContain('CRM (Customer Relationship Management)');
    expect(html).toContain('Coming Soon');

    expect(html).toContain('Project Management');
  });

  it('6. Renders Recent Customers without technical CODE column, displaying Companies, Apps, and Health', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    expect(html).toContain('Recent Customers');
    expect(html).toContain('Acme Global');
    expect(html).toContain('2 Companies');
    expect(html).toContain('HRMS');
    expect(html).toContain('Healthy');
    expect(html).toContain('Manage →');
  });

  it('7. Renders Recent Activity using human-readable action badges, context, and timestamps', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    expect(html).toContain('Recent Activity');
    expect(html).toContain('Company Administrator Assigned');
    expect(html).toContain('Application Enabled');
    expect(html).toContain('Acme Global');
    expect(html).toContain('superadmin@bezent.io');
    expect(html).toContain('View Audit Logs →');

    // Raw action codes should NOT be primary content
    expect(html).not.toContain('company_admin_assigned');
    expect(html).not.toContain('module_enabled');
  });

  it('8. Verifies redundant quick-link toolbar is removed', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('Module Entitlements');
    expect(html).not.toContain('Audit Trail');
  });

  it('9. Verifies zero fake commercial metrics or chart canvases', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage initialData={mockOverview} />
      </MemoryRouter>,
    );

    expect(html).not.toContain('MRR');
    expect(html).not.toContain('ARR');
    expect(html).not.toContain('Revenue');
    expect(html).not.toContain('Conversion');
    expect(html).not.toContain('Uptime');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('chart-container');
  });

  it('10. Renders clean loading state when data is not yet loaded', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SuperAdminDashboardPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Loading live operational metrics...');
  });
});
