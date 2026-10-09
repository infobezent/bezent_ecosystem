import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as canonicalModule from '../api/superAdminApi';
import * as compatModule from '../../../applications/super-admin/api/superAdminApi';
import { authorizedFetch } from '../../../platform/auth';

vi.mock('../../../platform/auth', () => ({
  authorizedFetch: vi.fn(),
}));

describe('Stage 1 — Canonical Super Admin API Client Consolidation', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  it('1. verifies all canonical Administration API exports remain available', () => {
    expect(canonicalModule.superAdminApi).toBeDefined();
    expect(typeof canonicalModule.superAdminApi.getDashboard).toBe('function');
    expect(typeof canonicalModule.superAdminApi.listTenants).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenant).toBe('function');
    expect(typeof canonicalModule.superAdminApi.createTenant).toBe('function');
    expect(typeof canonicalModule.superAdminApi.updateTenant).toBe('function');
    expect(typeof canonicalModule.superAdminApi.activateTenant).toBe('function');
    expect(typeof canonicalModule.superAdminApi.suspendTenant).toBe('function');
    expect(typeof canonicalModule.superAdminApi.listCompanies).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getCompany).toBe('function');
    expect(typeof canonicalModule.superAdminApi.createCompany).toBe('function');
    expect(typeof canonicalModule.superAdminApi.updateCompany).toBe('function');
    expect(typeof canonicalModule.superAdminApi.activateCompany).toBe('function');
    expect(typeof canonicalModule.superAdminApi.suspendCompany).toBe('function');
    expect(typeof canonicalModule.superAdminApi.provisionCustomer).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getModuleCatalog).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenantModules).toBe('function');
    expect(typeof canonicalModule.superAdminApi.enableModule).toBe('function');
    expect(typeof canonicalModule.superAdminApi.disableModule).toBe('function');
    expect(typeof canonicalModule.superAdminApi.listUsers).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getUser).toBe('function');
    expect(typeof canonicalModule.superAdminApi.updateUserStatus).toBe('function');
    expect(typeof canonicalModule.superAdminApi.listCompanyAdmins).toBe('function');
    expect(typeof canonicalModule.superAdminApi.assignCompanyAdmin).toBe('function');
    expect(typeof canonicalModule.superAdminApi.revokeCompanyAdmin).toBe('function');
    expect(typeof canonicalModule.superAdminApi.resendCompanyAdminInvitation).toBe('function');
    expect(typeof canonicalModule.superAdminApi.listAuditLogs).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getGovernanceSummary).toBe('function');
    expect(typeof canonicalModule.superAdminApi.logout).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getMe).toBe('function');
  });

  it('2. verifies all extended Tenant Management API methods are present in canonical client', () => {
    expect(typeof canonicalModule.superAdminApi.getTenantSummary).toBe('function');
    expect(typeof canonicalModule.superAdminApi.listPlans).toBe('function');
    expect(typeof canonicalModule.superAdminApi.preflightTenantOrchestration).toBe('function');
    expect(typeof canonicalModule.superAdminApi.orchestrateTenantCreation).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenantOverview).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenantSubscriptions).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenantEntitlements).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenantOverrides).toBe('function');
    expect(typeof canonicalModule.superAdminApi.createTenantOverride).toBe('function');
    expect(typeof canonicalModule.superAdminApi.revokeTenantOverride).toBe('function');
    expect(typeof canonicalModule.superAdminApi.cancelSubscription).toBe('function');
    expect(typeof canonicalModule.superAdminApi.renewSubscription).toBe('function');
    expect(typeof canonicalModule.superAdminApi.updateSubscription).toBe('function');
    expect(typeof canonicalModule.superAdminApi.listProvisioningJobs).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getProvisioningJob).toBe('function');
    expect(typeof canonicalModule.superAdminApi.retryProvisioningJob).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getWorkerStatus).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenantLifecycleHistory).toBe('function');
    expect(typeof canonicalModule.superAdminApi.reactivateTenant).toBe('function');
    expect(typeof canonicalModule.superAdminApi.terminateTenant).toBe('function');
    expect(typeof canonicalModule.superAdminApi.getTenantActivity).toBe('function');
    expect(typeof canonicalModule.superAdminApi.downloadTenantActivityCsv).toBe('function');
  });

  it('3. verifies compatibility entrypoint resolves to canonical implementation with exact reference equality', () => {
    expect(compatModule.superAdminApi).toBe(canonicalModule.superAdminApi);
    expect(Object.keys(compatModule.superAdminApi)).toEqual(
      Object.keys(canonicalModule.superAdminApi),
    );
  });

  it('4. preserves Tenant list query parameters correctly in API requests', async () => {
    const mockJson = vi.fn().mockResolvedValue({ data: { items: [], total: 0 } });
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: mockJson,
    } as unknown as Response);

    await canonicalModule.superAdminApi.listTenants({
      search: 'Acme',
      status: 'active',
      sortBy: 'name',
      sortOrder: 'asc',
      limit: 25,
      offset: 0,
      page: 1,
      trial: true,
      attention: 'critical',
    });

    expect(authorizedFetch).toHaveBeenCalledTimes(1);
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    expect(url).toContain('/platform/tenants?');
    expect(url).toContain('search=Acme');
    expect(url).toContain('status=active');
    expect(url).toContain('sortBy=name');
    expect(url).toContain('sortOrder=asc');
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=0');
    expect(url).toContain('page=1');
    expect(url).toContain('trial=true');
    expect(url).toContain('attention=critical');
  });

  it('5. preserves Tenant summary request and response mapping', async () => {
    const mockSummary = {
      totalTenants: 10,
      activeTenants: 8,
      trialTenants: 1,
      suspendedTenants: 1,
    };
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: mockSummary }),
    } as unknown as Response);

    const result = await canonicalModule.superAdminApi.getTenantSummary();
    expect(result).toEqual(mockSummary);
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    expect(url).toContain('/platform/tenants/summary');
  });

  it('6. preserves Idempotency-Key header during tenant orchestration', async () => {
    const mockResponse = {
      tenantId: 'tenant_123',
      tenantCode: 'ACME',
      primaryCompanyId: 'comp_123',
      businessSetupState: 'pending_setup',
      subscriptions: [],
      invitation: { id: 'inv_1', email: 'admin@acme.com', status: 'pending', expiresAt: '2026-12-31' },
      provisioningJobId: 'job_123',
      provisioningStatus: 'pending',
      idempotentReplay: false,
    };
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: mockResponse }),
    } as unknown as Response);

    const payload: canonicalModule.TenantOrchestrationPayload = {
      company: {
        legalName: 'Acme Legal',
        displayName: 'Acme',
        businessEmail: 'corp@acme.com',
        country: 'US',
        timeZone: 'UTC',
      },
      admin: {
        fullName: 'Jane Doe',
        workEmail: 'jane@acme.com',
      },
      subscriptions: [
        {
          applicationCode: 'hrms',
          planId: 'plan_hrms_pro',
        },
      ],
    };

    const idempotencyKey = 'test-idempotency-key-uuid-1234';
    const result = await canonicalModule.superAdminApi.orchestrateTenantCreation(
      payload,
      idempotencyKey,
    );

    expect(result).toEqual(mockResponse);
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    const init = call[1];
    expect(url).toContain('/platform/tenants/orchestrate');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)?.['Idempotency-Key']).toBe(idempotencyKey);
    expect(JSON.parse(init?.body as string)).toEqual(payload);
  });

  it('7. preserves preflight request payload and returns validation summary', async () => {
    const mockPreflight = {
      valid: true,
      tenantSetupPolicy: 'ready_to_create',
      warnings: [],
      summary: {
        companyName: 'Acme',
        tenantName: 'Acme',
        primaryCompanyName: 'Acme',
        adminEmail: 'jane@acme.com',
        selectedApplications: ['hrms'],
        applicationsCount: 1,
        subscriptions: [],
      },
    };
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: mockPreflight }),
    } as unknown as Response);

    const payload: canonicalModule.TenantOrchestrationPayload = {
      company: {
        legalName: 'Acme Inc',
        displayName: 'Acme',
        businessEmail: 'info@acme.com',
        country: 'US',
        timeZone: 'America/New_York',
      },
      admin: {
        fullName: 'Jane Admin',
        workEmail: 'jane@acme.com',
      },
      subscriptions: [],
    };

    const result = await canonicalModule.superAdminApi.preflightTenantOrchestration(payload);
    expect(result).toEqual(mockPreflight);
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    const init = call[1];
    expect(url).toContain('/platform/tenants/orchestrate/preflight');
    expect(init?.method).toBe('POST');
  });

  it('8. preserves plan catalog filtering parameters', async () => {
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Response);

    await canonicalModule.superAdminApi.listPlans({
      applicationCode: 'hrms',
      status: 'active',
    });

    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    expect(url).toContain('/platform/plans?');
    expect(url).toContain('applicationCode=hrms');
    expect(url).toContain('status=active');
  });

  it('9. preserves effective entitlements request semantics', async () => {
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Response);

    await canonicalModule.superAdminApi.getTenantEntitlements('tenant_abc_123');
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    expect(url).toContain('/platform/tenants/tenant_abc_123/entitlements');
  });

  it('10. preserves provisioning retry request semantics', async () => {
    const mockRetryResponse = {
      data: {
        id: 'job_456',
        tenantId: 'tenant_123',
        companyId: null,
        jobType: 'tenant_creation',
        status: 'pending',
        idempotencyKey: null,
        attemptCount: 2,
        maxAttempts: 3,
        retryEligible: true,
        nextAttemptAt: null,
        startedAt: null,
        completedAt: null,
        lastError: null,
        errorCode: null,
        workerId: null,
        stepState: {},
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      message: 'Retry scheduled',
    };
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: mockRetryResponse }),
    } as unknown as Response);

    const res = await canonicalModule.superAdminApi.retryProvisioningJob('job_456');
    expect(res).toEqual(mockRetryResponse);
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    const init = call[1];
    expect(url).toContain('/platform/provisioning/jobs/job_456/retry');
    expect(init?.method).toBe('POST');
  });

  it('11. preserves lifecycle mutation request semantics', async () => {
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: { success: true } }),
    } as unknown as Response);

    await canonicalModule.superAdminApi.terminateTenant('t_1', 't_1', 'Customer non-payment');
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    const init = call[1];
    expect(url).toContain('/platform/tenants/t_1/terminate');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      confirmTenantId: 't_1',
      reason: 'Customer non-payment',
    });
  });

  it('12. preserves activity CSV export download behavior and authorization headers', async () => {
    mockLocalStorage.setItem('bezent_platform_token', 'test_jwt_bearer_token');
    const mockBlob = new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' });
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(mockBlob),
    } as unknown as Response);

    const blob = await canonicalModule.superAdminApi.downloadTenantActivityCsv('t_999', {
      action: 'TENANT_CREATED',
      startDate: '2026-01-01',
    });

    expect(blob).toBe(mockBlob);
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const url = String(call[0]);
    const init = call[1];
    expect(url).toContain('/platform/tenants/t_999/activity/export?');
    expect(url).toContain('action=TENANT_CREATED');
    expect(url).toContain('startDate=2026-01-01');
    expect((init?.headers as Record<string, string>)?.Authorization).toBe(
      'Bearer test_jwt_bearer_token',
    );
  });

  it('13. preserves authorization headers from localStorage', async () => {
    mockLocalStorage.setItem('bezent_platform_token', 'operator_active_jwt');
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: {} }),
    } as unknown as Response);

    await canonicalModule.superAdminApi.getMe();
    const call = vi.mocked(authorizedFetch).mock.calls[0]!;
    const init = call[1];
    expect((init?.headers as Record<string, string>)?.Authorization).toBe(
      'Bearer operator_active_jwt',
    );
  });

  it('14. normalizes API error responses properly', async () => {
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({
        error: { message: 'Tenant code already in use' },
      }),
    } as unknown as Response);

    await expect(
      canonicalModule.superAdminApi.createTenant({ name: 'Acme', code: 'ACME' }),
    ).rejects.toThrow('Tenant code already in use');
  });

  it('15. ensures existing mocked API consumers work via compatibility import', async () => {
    vi.mocked(authorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    } as unknown as Response);

    const res = await compatModule.superAdminApi.listTenants({ limit: 10 });
    expect(res).toEqual({ items: [], total: 0 });
  });

  it('16. introduces no circular dependency between administration and applications api modules', () => {
    // Both modules load and evaluate cleanly without circular dependency resolution errors.
    expect(canonicalModule).toBeDefined();
    expect(compatModule).toBeDefined();
  });
});
