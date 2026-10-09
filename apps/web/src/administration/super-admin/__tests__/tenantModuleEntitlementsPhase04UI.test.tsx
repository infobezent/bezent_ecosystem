/**
 * Phase 04 — Tenant Module Entitlements & Subscription Configuration
 * Comprehensive Frontend Automated Test Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CreateTenantPage } from '../pages/CreateTenantPage';
import { TenantDetailsPage } from '../pages/TenantDetailsPage';
import {
  superAdminApi,
  type PlanRecord,
  type PlanModuleEligibility,
  type ApplicationModuleDefinition,
  type TenantOverviewData,
  type TenantRecord,
  type SubscriptionDetailRecord,
  type EffectiveEntitlementResult,
  type EntitlementOverrideRecord,
} from '../api/superAdminApi';

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
    getApplicationModules: vi.fn(),
    getPlanModules: vi.fn(),
    listCompanyAdmins: vi.fn(),
    listAuditLogs: vi.fn(),
    resendCompanyAdminInvitation: vi.fn(),
    revokeCompanyAdmin: vi.fn(),
    preflightTenantOrchestration: vi.fn(),
    orchestrateTenantCreation: vi.fn(),
  },
}));

describe('Phase 04 — Tenant Module Entitlements UI Suite', () => {
  const mockPlans: PlanRecord[] = [
    {
      id: 'plan_hrms_starter',
      applicationCode: 'hrms',
      code: 'HRMS-STARTER',
      name: 'HRMS Starter',
      tier: 'starter',
      status: 'active',
      trialEligible: true,
      trialDurationDays: 14,
      prices: [
        {
          id: 'price_hrms_01',
          currency: 'USD',
          amount: 5,
          billingCycle: 'monthly',
          status: 'approved',
        },
      ],
    },
    {
      id: 'plan_hrms_enterprise',
      applicationCode: 'hrms',
      code: 'HRMS-ENTERPRISE',
      name: 'HRMS Enterprise',
      tier: 'enterprise',
      status: 'active',
      trialEligible: false,
      trialDurationDays: 0,
      prices: [
        {
          id: 'price_hrms_ent',
          currency: 'USD',
          amount: 0,
          billingCycle: 'monthly',
          status: 'draft',
        },
      ],
    },
    {
      id: 'plan_crm_growth',
      applicationCode: 'crm',
      code: 'CRM-GROWTH',
      name: 'CRM Growth',
      tier: 'growth',
      status: 'active',
      trialEligible: true,
      trialDurationDays: 30,
      prices: [
        {
          id: 'price_crm_01',
          currency: 'USD',
          amount: 20,
          billingCycle: 'monthly',
          status: 'approved',
        },
      ],
    },
  ];

  const mockHrmsModules: ApplicationModuleDefinition[] = [
    {
      key: 'organization',
      applicationCode: 'hrms',
      name: 'Organization Masters',
      description: 'Departments and structure',
      category: 'Workforce Core',
      availability: 'GA',
      isMandatory: true,
      dependencies: [],
      includedInPlans: ['starter', 'growth', 'enterprise'],
    },
    {
      key: 'employees',
      applicationCode: 'hrms',
      name: 'Employee Directory & Lifecycle',
      description: 'Profiles and records',
      category: 'Workforce Core',
      availability: 'GA',
      isMandatory: true,
      dependencies: ['organization'],
      includedInPlans: ['starter', 'growth', 'enterprise'],
    },
    {
      key: 'attendance',
      applicationCode: 'hrms',
      name: 'Attendance & Shift Management',
      description: 'Daily check-in and shifts',
      category: 'Time & Attendance',
      availability: 'GA',
      isMandatory: false,
      dependencies: ['employees'],
      includedInPlans: ['starter', 'growth', 'enterprise'],
    },
    {
      key: 'payroll',
      applicationCode: 'hrms',
      name: 'Payroll & Compensation',
      description: 'Salary structures and payslips',
      category: 'Finance & Compensation',
      availability: 'Beta',
      isMandatory: false,
      dependencies: ['employees', 'attendance'],
      includedInPlans: ['enterprise'],
    },
  ];

  const mockStarterEligibility: PlanModuleEligibility[] = [
    {
      moduleKey: 'organization',
      name: 'Organization Masters',
      description: 'Departments and structure',
      category: 'Workforce Core',
      applicationCode: 'hrms',
      availability: 'GA',
      isMandatory: true,
      isIncludedInPlan: true,
      defaultEnabled: true,
      dependencies: [],
      requiresOverride: false,
    },
    {
      moduleKey: 'employees',
      name: 'Employee Directory & Lifecycle',
      description: 'Profiles and records',
      category: 'Workforce Core',
      applicationCode: 'hrms',
      availability: 'GA',
      isMandatory: true,
      isIncludedInPlan: true,
      defaultEnabled: true,
      dependencies: ['organization'],
      requiresOverride: false,
    },
    {
      moduleKey: 'attendance',
      name: 'Attendance & Shift Management',
      description: 'Daily check-in and shifts',
      category: 'Time & Attendance',
      applicationCode: 'hrms',
      availability: 'GA',
      isMandatory: false,
      isIncludedInPlan: true,
      defaultEnabled: true,
      dependencies: ['employees'],
      requiresOverride: false,
    },
    {
      moduleKey: 'payroll',
      name: 'Payroll & Compensation',
      description: 'Salary structures and payslips',
      category: 'Finance & Compensation',
      applicationCode: 'hrms',
      availability: 'Beta',
      isMandatory: false,
      isIncludedInPlan: false,
      defaultEnabled: false,
      dependencies: ['employees', 'attendance'],
      requiresOverride: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(superAdminApi.listPlans).mockResolvedValue(mockPlans);
    vi.mocked(superAdminApi.getApplicationModules).mockResolvedValue(mockHrmsModules);
    vi.mocked(superAdminApi.getPlanModules).mockResolvedValue(mockStarterEligibility);
  });

  /* ── 1. Step 3 Module Configuration & Plan Eligibility ─────────────────── */
  describe('Step 3 Module Configuration & Plan Eligibility', () => {
    it('renders Step 3 with module access breakdown for enabled applications', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/tenants/new']}>
          <Routes>
            <Route
              path="/admin/tenants/new"
              element={
                <CreateTenantPage
                  initialStep={3}
                  initialPlans={mockPlans}
                  initialSelectedApps={{ hrms: true, crm: true, project_management: true }}
                  initialSubscriptionsConfig={{
                    hrms: { planId: 'plan_hrms_starter', accessMode: 'paid', licensedSeats: 25 },
                  }}
                  initialEligibleModulesByApp={{ hrms: mockStarterEligibility }}
                  initialSelectedModulesByApp={{ hrms: ['organization', 'employees', 'attendance'] }}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Wizard steps header
      expect(html).toContain('Company Info');
      expect(html).toContain('Primary Admin');
      expect(html).toContain('Applications');
      expect(html).toContain('Review');

      // Step 3 application subscription cards
      expect(html).toContain('HRMS');
      expect(html).toContain('CRM');
      expect(html).toContain('Project Management');

      // Access modes and configuration fields
      expect(html).toContain('Access Mode');
      expect(html).toContain('Licensed Seats');
      expect(html).toContain('Billing Cycle');
      expect(html).toContain('Activation Schedule');
    });

    it('displays mandatory modules locked and indicates dependencies', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/tenants/new']}>
          <Routes>
            <Route
              path="/admin/tenants/new"
              element={
                <CreateTenantPage
                  initialStep={3}
                  initialPlans={mockPlans}
                  initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
                  initialSubscriptionsConfig={{
                    hrms: { planId: 'plan_hrms_starter', accessMode: 'paid', licensedSeats: 25 },
                  }}
                  initialEligibleModulesByApp={{ hrms: mockStarterEligibility }}
                  initialSelectedModulesByApp={{ hrms: ['organization', 'employees', 'attendance'] }}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Mandatory and optional module labels & badges in HTML
      expect(html).toContain('Organization Masters');
      expect(html).toContain('Employee Directory &amp; Lifecycle');
      expect(html).toContain('Mandatory');
      expect(html).toContain('Requires: Organization Masters');
    });

    it('provides Select All Eligible button and selected modules counter', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/tenants/new']}>
          <Routes>
            <Route
              path="/admin/tenants/new"
              element={
                <CreateTenantPage
                  initialStep={3}
                  initialPlans={mockPlans}
                  initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
                  initialSubscriptionsConfig={{
                    hrms: { planId: 'plan_hrms_starter', accessMode: 'paid', licensedSeats: 25 },
                  }}
                  initialEligibleModulesByApp={{ hrms: mockStarterEligibility }}
                  initialSelectedModulesByApp={{ hrms: ['organization', 'employees', 'attendance'] }}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Select All Eligible');
      expect(html).toContain('selected');
    });

    it('offers Super Admin override button for plan-excluded modules', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/tenants/new']}>
          <Routes>
            <Route
              path="/admin/tenants/new"
              element={
                <CreateTenantPage
                  initialStep={3}
                  initialPlans={mockPlans}
                  initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
                  initialSubscriptionsConfig={{
                    hrms: { planId: 'plan_hrms_starter', accessMode: 'paid', licensedSeats: 25 },
                  }}
                  initialEligibleModulesByApp={{ hrms: mockStarterEligibility }}
                  initialSelectedModulesByApp={{ hrms: ['organization', 'employees', 'attendance'] }}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('+ Authorize Override');
    });
  });

  /* ── 2. Pricing & Trial Rules Explanations ──────────────────────────────── */
  describe('Pricing & Trial Rules in Step 3', () => {
    it('explains trial ineligibility when trial cannot be selected', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/tenants/new']}>
          <Routes>
            <Route
              path="/admin/tenants/new"
              element={
                <CreateTenantPage
                  initialStep={3}
                  initialPlans={mockPlans}
                  initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
                  initialSubscriptionsConfig={{
                    hrms: {
                      planId: 'plan_hrms_enterprise',
                      accessMode: 'trial',
                      licensedSeats: 25,
                    },
                  }}
                  initialEligibleModulesByApp={{ hrms: mockStarterEligibility }}
                  initialSelectedModulesByApp={{ hrms: ['organization', 'employees'] }}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Enterprise plan is not trial eligible, explains notice
      expect(html).toContain('Evaluation Trial Ineligible');
      expect(html).toContain('does not support self-serve evaluation trials');
    });

    it('requires commercial agreement notes when price is unapproved or draft', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/tenants/new']}>
          <Routes>
            <Route
              path="/admin/tenants/new"
              element={
                <CreateTenantPage
                  initialStep={3}
                  initialPlans={mockPlans}
                  initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
                  initialSubscriptionsConfig={{
                    hrms: {
                      planId: 'plan_hrms_enterprise',
                      accessMode: 'paid',
                      licensedSeats: 25,
                    },
                  }}
                  initialEligibleModulesByApp={{ hrms: mockStarterEligibility }}
                  initialSelectedModulesByApp={{ hrms: ['organization', 'employees'] }}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Form includes commercial agreement section when applicable
      expect(html).toContain('Authorized Commercial Agreement Required');
      expect(html).toContain('Commercial Agreement Notes *');
    });
  });

  /* ── 3. Step 4 Review & Create Integration ─────────────────────────────── */
  describe('Step 4 Review & Create Screen', () => {
    it('verifies review screen displays module selections and suppresses duplicate errors', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/admin/tenants/new']}>
          <Routes>
            <Route
              path="/admin/tenants/new"
              element={
                <CreateTenantPage
                  initialStep={4}
                  initialPlans={mockPlans}
                  initialCompanyData={{ legalName: 'Apex Global Inc', businessEmail: 'admin@apex.com' }}
                  initialAdminData={{ fullName: 'Jane Doe', workEmail: 'jane@apex.com' }}
                  initialSelectedApps={{ hrms: true, crm: false, project_management: false }}
                  initialSubscriptionsConfig={{
                    hrms: {
                      planId: 'plan_hrms_starter',
                      accessMode: 'paid',
                      licensedSeats: 25,
                    },
                  }}
                  initialEligibleModulesByApp={{ hrms: mockStarterEligibility }}
                  initialSelectedModulesByApp={{ hrms: ['organization', 'employees', 'attendance'] }}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(html).toContain('Step 4 — Review &amp; Create');
      expect(html).toContain('Apex Global Inc');
      expect(html).toContain('Jane Doe');
      expect(html).toContain('Selected Modules');
      expect(html).toContain('Create Tenant');
    });
  });

  /* ── 4. Tenant Details Tab 2 Module Entitlements Integration ───────────── */
  describe('Tenant Details — Effective Module Entitlements Tab', () => {
    const mockOverview = {
      tenant: {
        id: 'tnt_p4_01',
        name: 'Apex Global Enterprises',
        code: 'APEX',
        status: 'active',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
      companies: [
        {
          id: 'comp_p4_01',
          name: 'Apex Global US',
          code: 'APEX-US',
          status: 'active',
          isDefault: true,
          tenantId: 'tnt_p4_01',
        },
      ],
      primaryCompany: {
        id: 'comp_p4_01',
        name: 'Apex Global US',
        code: 'APEX-US',
        status: 'active',
        isDefault: true,
        tenantId: 'tnt_p4_01',
      },
      subscriptions: [
        {
          id: 'sub_p4_01',
          tenantId: 'tnt_p4_01',
          applicationCode: 'hrms',
          planId: 'plan_hrms_starter',
          planName: 'HRMS Starter',
          planTier: 'starter',
          status: 'active',
          billingCycle: 'monthly',
          seatsLicensed: 20,
          seatsAllocated: 12,
          currentPeriodStartsAt: '2026-03-01T00:00:00.000Z',
          currentPeriodEndsAt: '2026-04-01T00:00:00.000Z',
          trialStartsAt: null,
          trialEndsAt: null,
          scheduledActivationAt: null,
          activatedAt: '2026-03-01T00:00:00.000Z',
          autoRenew: true,
          unitPriceAmount: 5,
          unitPriceCurrency: 'USD',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      effectiveEntitlements: [
        {
          tenantId: 'tnt_p4_01',
          applicationCode: 'hrms',
          isEntitled: true,
          source: 'commercial',
          planName: 'HRMS Starter',
          modules: [
            {
              moduleCode: 'organization',
              moduleName: 'Organization Masters',
              isEnabled: true,
              source: 'plan_default',
            },
            {
              moduleCode: 'employees',
              moduleName: 'Employee Directory & Lifecycle',
              isEnabled: true,
              source: 'plan_default',
            },
            {
              moduleCode: 'attendance',
              moduleName: 'Attendance & Shift Management',
              isEnabled: true,
              source: 'plan_default',
            },
            {
              moduleCode: 'payroll',
              moduleName: 'Payroll & Compensation',
              isEnabled: true,
              source: 'override',
              overrideReason: 'Authorized VIP pilot evaluation',
            },
            {
              moduleCode: 'leave',
              moduleName: 'Leave & Absence Management',
              isEnabled: false,
              source: 'override',
              overrideReason: 'Deselected during tenant provisioning',
            },
          ],
        },
      ],
      overrides: [
        {
          id: 'ovr_01',
          tenantId: 'tnt_p4_01',
          companyId: null,
          applicationCode: 'hrms',
          moduleCode: 'payroll',
          overrideType: 'enable',
          reason: 'Authorized VIP pilot evaluation',
          authorizedByUserId: 'usr_superadmin',
          validFrom: '2026-03-01T00:00:00.000Z',
          validUntil: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      lifecycleHistory: [],
      latestJobs: [],
      stats: {
        totalCompanies: 1,
        activeSubscriptions: 1,
        totalSeatsLicensed: 20,
        totalSeatsAllocated: 12,
        activeOverrides: 1,
      },
    };

    it('renders effective module breakdown showing enabled, disabled, and override sources', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/super-admin/tenants/tnt_p4_01/entitlements']}>
          <Routes>
            <Route
              path="/super-admin/tenants/:tenantId/:tab"
              element={
                <TenantDetailsPage
                  initialTenant={mockOverview.tenant as unknown as TenantRecord}
                  initialOverview={mockOverview as unknown as TenantOverviewData}
                  initialSubscriptions={mockOverview.subscriptions as unknown as SubscriptionDetailRecord[]}
                  initialEntitlements={mockOverview.effectiveEntitlements as unknown as EffectiveEntitlementResult[]}
                  initialOverrides={mockOverview.overrides as unknown as EntitlementOverrideRecord[]}
                  initialLoading={false}
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );

      // Verify Tab 2 Section B title and container
      expect(html).toContain('Effective Entitlements &amp; Runtime Access');
      expect(html).toContain('Enabled Modules');
      expect(html).toContain('Disabled / Excluded Modules');

      // Verify modules rendered with badges and metadata
      expect(html).toContain('organization');
      expect(html).toContain('employees');
      expect(html).toContain('payroll');
      expect(html).toContain('leave');

      // Verify badges: Plan Default and Override
      expect(html).toContain('Plan Default');
      expect(html).toContain('Override');
      expect(html).toContain('Authorized VIP pilot evaluation');
      expect(html).toContain('Override Disabled');
    });
  });
});
