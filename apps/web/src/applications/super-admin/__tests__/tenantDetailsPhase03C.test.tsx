import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TenantDetailsPage } from '../pages/TenantDetailsPage';
import { TenantsPage } from '../pages/TenantsPage';
import { CreateTenantPage } from '../pages/CreateTenantPage';
import { superAdminNavigation } from '../../../administration/super-admin/navigation/superAdminNavigation';
import {
  superAdminApi,
  type TenantRecord,
  type TenantOverviewData,
  type SubscriptionDetailRecord,
  type EffectiveEntitlementResult,
  type EntitlementOverrideRecord,
  type ProvisioningJobRecord,
  type LifecycleEventRecord,
  type AuditLogEntry,
} from '../api/superAdminApi';

// Mock superAdminApi methods
vi.mock('../api/superAdminApi', () => ({
  superAdminApi: {
    getTenantSummary: vi.fn(),
    listTenants: vi.fn(),
    listPlans: vi.fn(),
    getTenant: vi.fn(),
    getTenantOverview: vi.fn(),
    getTenantSubscriptions: vi.fn(),
    getTenantEntitlements: vi.fn(),
    getTenantOverrides: vi.fn(),
    createTenantOverride: vi.fn(),
    revokeTenantOverride: vi.fn(),
    cancelSubscription: vi.fn(),
    renewSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    listProvisioningJobs: vi.fn(),
    getProvisioningJob: vi.fn(),
    retryProvisioningJob: vi.fn(),
    getWorkerStatus: vi.fn(),
    getTenantLifecycleHistory: vi.fn(),
    activateTenant: vi.fn(),
    reactivateTenant: vi.fn(),
    suspendTenant: vi.fn(),
    terminateTenant: vi.fn(),
    getTenantActivity: vi.fn(),
    downloadTenantActivityCsv: vi.fn(),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    listCompanies: vi.fn(),
    getTenantModules: vi.fn(),
    getModuleCatalog: vi.fn(),
    listCompanyAdmins: vi.fn(),
    listAuditLogs: vi.fn(),
  },
}));

// Mock Auth hook
vi.mock('../../../platform/auth', () => ({
  useAuth: vi.fn(() => ({
    status: 'authenticated',
    access: {
      user: { id: 'usr_sa_01', email: 'superadmin@bezent.com', isSuperAdmin: true },
      platformWorkspaces: ['super_admin'],
    },
  })),
}));

describe('BEZENT Phase 03C — Super Admin Tenant Details Automated Test Suite', () => {
  const mockTenant: TenantRecord = {
    id: 'tnt_solaris_01',
    name: 'Solaris Technologies Inc',
    code: 'SOLARIS',
    contactEmail: 'corp@solaris.io',
    contactPhone: '+1-555-0199',
    status: 'active',
    derivedCommercialClassification: 'active',
    companies: [
      {
        id: 'cmp_solaris_primary',
        name: 'Solaris Global Corp',
        code: 'SGC',
        status: 'active',
        enabledModules: ['hrms', 'crm'],
        createdAt: '2026-03-01T10:00:00.000Z',
      },
    ],
    primaryAdmin: {
      id: 'usr_admin_01',
      name: 'Clara Oswald',
      email: 'clara.oswald@solaris.io',
      status: 'pending',
      invitedAt: '2026-10-09T00:00:00.000Z',
      acceptedAt: null,
    },
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  };

  const mockOverview: TenantOverviewData = {
    tenant: {
      id: 'tnt_solaris_01',
      name: 'Solaris Technologies Inc',
      code: 'SOLARIS',
      status: 'active',
      maxCompanies: 5,
      contactEmail: 'corp@solaris.io',
      contactPhone: '+1-555-0199',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    primaryCompany: {
      id: 'cmp_solaris_primary',
      name: 'Solaris Global Corp',
      code: 'SGC',
      status: 'active',
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    totalCompanies: 1,
    companyCapacity: {
      used: 1,
      max: 5,
      remaining: 4,
    },
    primaryAdmin: {
      id: 'usr_admin_01',
      name: 'Clara Oswald',
      email: 'clara.oswald@solaris.io',
      status: 'pending',
      invitedAt: '2026-10-09T00:00:00.000Z',
      acceptedAt: null,
    },
    enabledApplications: [
      {
        applicationCode: 'hrms',
        planId: 'Enterprise Growth',
        status: 'active',
        isTrial: false,
        seats: 150,
      },
      {
        applicationCode: 'crm',
        planId: 'Standard Sales',
        status: 'trial',
        isTrial: true,
        seats: 25,
      },
    ],
    activeUsers: 84,
    licensedSeats: 175,
    provisioningHealth: {
      status: 'completed',
      jobType: 'initial_provisioning',
      stepTimeline: {},
      attemptCount: 1,
      maxAttempts: 3,
      retryEligible: false,
    },
    setupProgress: {
      totalMilestones: 4,
      completedMilestones: 1,
      percentage: 25,
      milestones: [
        {
          key: 'init',
          title: 'Organization Setup',
          description: 'Basic info provisioned',
          completed: true,
        },
      ],
      isComplete: false,
    },
    health: {
      status: 'healthy',
      reasons: [],
    },
    derivedCommercialClassification: 'active',
    attentionRequired: {
      needed: true,
      reason: 'Primary Admin Invitation Pending: Clara Oswald has not yet accepted their invitation credentials.',
      action: {
        action: 'resend_invitation',
        label: 'Resend Invitation',
        href: '#',
      },
    },
    importantTimestamps: {
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
  };

  const mockSubscriptions: SubscriptionDetailRecord[] = [
    {
      id: 'sub_hrms_01',
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      applicationCode: 'hrms',
      planId: 'plan_hrms_ent',
      planName: 'Enterprise Growth',
      planTier: 'enterprise',
      status: 'active',
      accessMode: 'paid',
      billingCycle: 'monthly',
      licensedSeats: 150,
      scheduledActivationAt: null,
      activatedAt: '2026-03-01T00:00:00.000Z',
      trialStartsAt: null,
      trialEndsAt: null,
      currentPeriodStartsAt: '2026-03-01T00:00:00.000Z',
      currentPeriodEndsAt: '2027-03-01T00:00:00.000Z',
      cancelledAt: null,
      cancellationReason: null,
      renewsAt: '2027-03-01T00:00:00.000Z',
      autoRenew: true,
      version: 1,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'sub_pm_scheduled',
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      applicationCode: 'project_management',
      planId: 'plan_pm_pro',
      planName: 'PM Pro Scheduled',
      planTier: 'professional',
      status: 'pending_activation',
      accessMode: 'paid',
      billingCycle: 'annual',
      licensedSeats: 50,
      scheduledActivationAt: '2026-11-01T00:00:00.000Z',
      activatedAt: null,
      trialStartsAt: null,
      trialEndsAt: null,
      currentPeriodStartsAt: '2026-11-01T00:00:00.000Z',
      currentPeriodEndsAt: '2027-11-01T00:00:00.000Z',
      cancelledAt: null,
      cancellationReason: null,
      renewsAt: '2027-11-01T00:00:00.000Z',
      autoRenew: true,
      version: 1,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  const mockEntitlements: EffectiveEntitlementResult[] = [
    {
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      applicationCode: 'hrms',
      isEntitled: true,
      source: 'commercial_subscription',
      planId: 'plan_hrms_ent',
      planName: 'Enterprise Growth',
      licensedSeats: 150,
      modules: [
        {
          moduleCode: 'core_hr',
          isEnabled: true,
          source: 'plan',
        },
        {
          moduleCode: 'payroll',
          isEnabled: true,
          source: 'plan',
        },
      ],
    },
  ];

  const mockOverrides: EntitlementOverrideRecord[] = [
    {
      id: 'ovr_seat_01',
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      applicationCode: 'hrms',
      moduleCode: 'recruitment',
      overrideType: 'enable',
      overrideValue: { seats: 20 },
      reason: 'Enterprise contract expansion Q1',
      authorizedByUserId: 'usr_superadmin_01',
      validFrom: '2026-03-01T12:00:00.000Z',
      validUntil: null,
      revokedAt: null,
      revokedByUserId: null,
      revocationReason: null,
      createdAt: '2026-03-01T12:00:00.000Z',
      updatedAt: '2026-03-01T12:00:00.000Z',
    },
  ];

  const mockJobs: ProvisioningJobRecord[] = [
    {
      id: 'job_prov_01',
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      jobType: 'tenant_creation',
      status: 'completed',
      idempotencyKey: 'idemp_01',
      attemptCount: 1,
      maxAttempts: 3,
      retryEligible: false,
      nextAttemptAt: null,
      startedAt: '2026-03-01T10:00:00.000Z',
      completedAt: '2026-03-01T10:02:00.000Z',
      lastError: null,
      errorCode: null,
      workerId: 'worker_01',
      stepState: { schema: 'done', roles: 'done' },
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:02:00.000Z',
    },
    {
      id: 'job_prov_failed_02',
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      jobType: 'module_provisioning',
      status: 'failed',
      idempotencyKey: 'idemp_02',
      attemptCount: 2,
      maxAttempts: 3,
      retryEligible: true,
      nextAttemptAt: null,
      startedAt: '2026-03-01T11:00:00.000Z',
      completedAt: null,
      lastError: 'External sync worker timed out connecting to database replica',
      errorCode: 'TIMEOUT',
      workerId: 'worker_02',
      stepState: { queue: 'done', replica: 'failed' },
      createdAt: '2026-03-01T11:00:00.000Z',
      updatedAt: '2026-03-01T11:05:00.000Z',
    },
  ];

  const mockLifecycleHistory: LifecycleEventRecord[] = [
    {
      id: 'lce_02',
      tenantId: 'tnt_solaris_01',
      eventType: 'activated',
      previousStatus: 'pending_setup',
      newStatus: 'active',
      reason: 'Initial tenant activation following automated provisioning',
      actorUserId: 'usr_superadmin_01',
      actorEmail: 'superadmin@bezent.com',
      createdAt: '2026-03-01T10:05:00.000Z',
    },
    {
      id: 'lce_01',
      tenantId: 'tnt_solaris_01',
      eventType: 'activated',
      previousStatus: 'created',
      newStatus: 'pending_setup',
      reason: 'Tenant created via Super Admin wizard',
      actorUserId: 'usr_superadmin_01',
      actorEmail: 'superadmin@bezent.com',
      createdAt: '2026-03-01T10:00:00.000Z',
    },
  ];

  const mockAuditLogs: AuditLogEntry[] = [
    {
      id: 'aud_01',
      actorUserId: 'usr_sa_01',
      actorEmail: 'superadmin@bezent.com',
      action: 'tenant.create',
      targetType: 'tenant',
      targetId: 'tnt_solaris_01',
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      metadata: { name: 'Solaris Technologies Inc', code: 'SOLARIS' },
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'aud_02',
      actorUserId: 'usr_sa_01',
      actorEmail: 'superadmin@bezent.com',
      action: 'subscription.assign',
      targetType: 'subscription',
      targetId: 'sub_hrms_01',
      tenantId: 'tnt_solaris_01',
      companyId: 'cmp_solaris_primary',
      metadata: { applicationCode: 'hrms', plan: 'Enterprise Growth' },
      createdAt: '2026-03-01T10:01:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── ROUTING & WORKSPACE STRUCTURE (SECTION 4) ──────────────────────
  describe('Routing & Workspace Structure', () => {
    it('1. valid tenant route renders the canonical workspace with all 5 tabs', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                  initialJobs={mockJobs}
                  initialLifecycleHistory={mockLifecycleHistory}
                  initialAuditLogs={mockAuditLogs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Verify Shared Header
      expect(html).toContain('Solaris Technologies Inc');
      expect(html).toContain('tnt_solaris_01');
      expect(html).toContain('Solaris Global Corp');
      expect(html).toContain('Lifecycle: active');
      expect(html).toContain('Commercial: active');

      // Verify All 5 Tabs exist in navigation
      expect(html).toContain('Overview');
      expect(html).toContain('Entitlements');
      expect(html).toContain('Provisioning');
      expect(html).toContain('Lifecycle');
      expect(html).toContain('Activity');
    });

    it('2. unknown tenant shows canonical Not Found empty state', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_unknown_999']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId"
              element={
                <TenantDetailsPage
                  initialTenant={undefined}
                  initialOverview={undefined}
                  initialLoading={false}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Customer Tenant Not Found');
      expect(html).toContain('tnt_unknown_999');
      expect(html).toContain('Back to All Tenants');
    });

    it('3. deep-linked tab route renders Entitlements tab directly', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/entitlements']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                  initialJobs={mockJobs}
                  initialLifecycleHistory={mockLifecycleHistory}
                  initialAuditLogs={mockAuditLogs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Entitlements tab content rendered
      expect(html).toContain('Application Subscriptions');
      expect(html).toContain('Enterprise Growth');
      expect(html).toContain('Effective Entitlements &amp; Runtime Access');
      expect(html).toContain('Administrative Entitlement Overrides');
    });

    it('4. deep-linked tab route renders Provisioning tab directly', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/provisioning']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                  initialJobs={mockJobs}
                  initialLifecycleHistory={mockLifecycleHistory}
                  initialAuditLogs={mockAuditLogs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Provisioning Execution Jobs');
      expect(html).toContain('job_prov_01');
      expect(html).toContain('job_prov_failed_02');
      expect(html).toContain('Worker &amp; Queue Health');
    });

    it('5. deep-linked tab route renders Lifecycle tab directly', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/lifecycle']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                  initialJobs={mockJobs}
                  initialLifecycleHistory={mockLifecycleHistory}
                  initialAuditLogs={mockAuditLogs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Current Operational Lifecycle State');
      expect(html).toContain('ACTIVE');
      expect(html).toContain('Suspend Tenant');
      expect(html).toContain('Lifecycle History Timeline');
    });

    it('6. deep-linked tab route renders Activity tab directly', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/activity']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                  initialJobs={mockJobs}
                  initialLifecycleHistory={mockLifecycleHistory}
                  initialAuditLogs={mockAuditLogs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Audit Trail');
      expect(html).toContain('Export CSV');
      expect(html).toContain('tenant.create');
      expect(html).toContain('superadmin@bezent.com');
    });
  });

  // ── TAB 1: OVERVIEW (SECTION 7) ───────────────────────────────────
  describe('Tab 1 — Overview', () => {
    it('7. renders Tenant Identity details correctly', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/overview']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Solaris Technologies Inc');
      expect(html).toContain('tnt_solaris_01');
      expect(html).toContain('SOLARIS');
      expect(html).toContain('corp@solaris.io');
      expect(html).toContain('Solaris Global Corp');
    });

    it('8. renders Primary Admin in pending state with expiration notice', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/overview']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Clara Oswald');
      expect(html).toContain('clara.oswald@solaris.io');
      expect(html).toContain('Pending Invitation (72-hour validity)');
    });

    it('9. renders multiple Applications independently without conflating HRMS and CRM', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/overview']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // HRMS is active Enterprise with 150 seats
      expect(html).toContain('HRMS');
      expect(html).toContain('Enterprise Growth');
      expect(html).toContain('Licensed Seats: 150');

      // CRM is active Standard Trial with 25 seats
      expect(html).toContain('CRM');
      expect(html).toContain('14-Day Free Trial');
      expect(html).toContain('Licensed Seats: 25');
    });

    it('10. renders capacity and setup metrics separately from technical provisioning', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/overview']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Active Users');
      expect(html).toContain('84');
      expect(html).toContain('Licensed Seats');
      expect(html).toContain('175');
      expect(html).toContain('COMPLETED');
      expect(html).toContain('25%');
    });

    it('11. renders Attention Required alerts when items exist', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/overview']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Attention Required');
      expect(html).toContain('Primary Admin Invitation Pending');
      expect(html).toContain('Resend Invitation');
    });
  });

  // ── TAB 2: ENTITLEMENTS (SECTION 8) ───────────────────────────────
  describe('Tab 2 — Entitlements & Subscriptions', () => {
    it('12. distinguishes active vs scheduled subscriptions clearly', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/entitlements']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Active HRMS subscription
      expect(html).toContain('Enterprise Growth');
      expect(html).toContain('ACTIVE');

      // Scheduled Project Management subscription
      expect(html).toContain('PM Pro Scheduled');
      expect(html).toContain('PENDING_ACTIVATION');
    });

    it('13. renders effective entitlement values with base and override values', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/entitlements']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('HRMS');
      expect(html).toContain('Entitled');
      expect(html).toContain('Administrative Entitlement Overrides');
      expect(html).toContain('recruitment');
      expect(html).toContain('Enterprise contract expansion Q1');
      expect(html).toContain('Revoke');
    });

    it('14. displays Create Override action button', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/entitlements']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialSubscriptions={mockSubscriptions}
                  initialEntitlements={mockEntitlements}
                  initialOverrides={mockOverrides}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Create Override');
    });
  });

  // ── TAB 3: PROVISIONING (SECTION 9) ────────────────────────────────
  describe('Tab 3 — Provisioning Jobs & Pipeline', () => {
    it('15. renders Provisioning Jobs table and metric cards', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/provisioning']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialJobs={mockJobs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('job_prov_01');
      expect(html).toContain('TENANT CREATION');
      expect(html).toContain('COMPLETED');

      expect(html).toContain('job_prov_failed_02');
      expect(html).toContain('MODULE PROVISIONING');
      expect(html).toContain('FAILED');
      expect(html).toContain('Retry');
    });

    it('16. renders worker health and processing metrics', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/provisioning']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialJobs={mockJobs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Worker &amp; Queue Health');
      expect(html).toContain('Provisioning Worker Pool');
      expect(html).toContain('Operational');
      expect(html).toContain('Active Processing Capacity');
    });
  });

  // ── TAB 4: LIFECYCLE (SECTION 10) ─────────────────────────────────
  describe('Tab 4 — Operational Lifecycle', () => {
    it('17. renders current operational lifecycle state and action buttons', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/lifecycle']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialLifecycleHistory={mockLifecycleHistory}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Current Operational Lifecycle State');
      expect(html).toContain('ACTIVE');
      expect(html).toContain('Suspend Tenant');
    });

    it('18. renders Reactivate Tenant button when tenant is suspended', () => {
      const suspendedTenant: TenantRecord = {
        ...mockTenant,
        status: 'suspended',
        derivedCommercialClassification: 'suspended',
      };
      const suspendedOverview: TenantOverviewData = {
        ...mockOverview,
        tenant: {
          ...mockOverview.tenant,
          status: 'suspended',
        },
        derivedCommercialClassification: 'suspended',
      };

      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/lifecycle']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={suspendedTenant}
                  initialOverview={suspendedOverview}
                  initialLifecycleHistory={mockLifecycleHistory}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Reactivate Tenant');
    });

    it('19. renders lifecycle audit timeline with historical transitions', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/lifecycle']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialLifecycleHistory={mockLifecycleHistory}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Lifecycle History Timeline');
      expect(html).toContain('Initial tenant activation following automated provisioning');
      expect(html).toContain('Tenant created via Super Admin wizard');
    });
  });

  // ── TAB 5: ACTIVITY (SECTION 11) ───────────────────────────────────
  describe('Tab 5 — Activity & Audit Trail', () => {
    it('20. renders audit logs table and filter controls', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_solaris_01/activity']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockTenant}
                  initialOverview={mockOverview}
                  initialAuditLogs={mockAuditLogs}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Audit Trail');
      expect(html).toContain('Filter by action...');
      expect(html).toContain('Filter by actor email...');
      expect(html).toContain('tenant.create');
      expect(html).toContain('subscription.assign');
      expect(html).toContain('superadmin@bezent.com');
      expect(html).toContain('Details');
      expect(html).toContain('Export CSV');
    });
  });

  // ── REGRESSION & ZERO APPLICATION CSS (SECTIONS 13 & 16) ───────────
  describe('Regression & Compliance Checks', () => {
    it('21. All Tenants page remains completely functional', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants']}>
          <Routes>
            <Route
              path="/super-admin/tenants"
              element={
                <TenantsPage
                  initialTenants={[mockTenant]}
                  initialSummary={{
                    totalTenants: 1,
                    activeTenants: 1,
                    trialTenants: 0,
                    suspendedTenants: 0,
                  }}
                  initialLoading={false}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Total Tenants');
      expect(html).toContain('Solaris Technologies Inc');
      expect(html).toContain('Create Tenant');
    });

    it('22. Create Tenant Wizard remains functional', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/create']}>
          <Routes>
            <Route path="/super-admin/tenants/create" element={<CreateTenantPage initialPlans={[]} />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Create Tenant');
      expect(html).toContain('Set up a new customer organization, administrator, and application access.');
    });

    it('23. Super Admin Navigation includes Customer Tenants item', () => {
      const tenantsDestination = superAdminNavigation.destinations.find((d) => d.id === 'tenants');
      expect(tenantsDestination).toBeDefined();
      expect(tenantsDestination?.segment).toBe('tenants');
      expect(tenantsDestination?.children).toBeUndefined();
    });
  });
});
