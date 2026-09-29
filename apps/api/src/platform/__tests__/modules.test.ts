import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleService } from '../modules/service/module.service.js';
import type { ModuleRepository } from '../modules/repository/module.repository.js';
import type { TenantRepository } from '../tenants/repository/tenant.repository.js';
import { NotFoundError } from '../../app/errors/AppError.js';
import type { TenantModuleRecord } from '../modules/types/module.types.js';

describe('Module Catalog & Entitlement Service', () => {
  let mockRepo: Partial<ModuleRepository>;
  let mockTenantRepo: Partial<TenantRepository>;
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };
  let moduleService: ModuleService;

  beforeEach(() => {
    mockRepo = {
      listByTenant: vi.fn(),
      setStatus: vi.fn(),
    };
    mockTenantRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'tenant_01',
        name: 'Test Tenant',
      } as unknown as import('../tenants/types/tenant.types.js').TenantRecord),
    };
    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({
        id: 'aud_1',
      } as unknown as import('../audit/types/audit.types.js').AuditLogRecord),
    };
    moduleService = new ModuleService(
      mockRepo as ModuleRepository,
      mockTenantRepo as TenantRepository,
      mockAudit as unknown as import('../audit/service/audit.service.js').AuditService,
    );
  });

  it('provides a catalog of supported business applications', () => {
    const catalog = moduleService.getCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(3);
    const codes = catalog.map((c) => c.code);
    expect(codes).toContain('hrms');
    expect(codes).toContain('crm');
    expect(codes).toContain('project_management');
  });

  it('enables an application module for a tenant', async () => {
    const updatedRecord: TenantModuleRecord = {
      id: 'mod_2',
      tenantId: 'tenant_01',
      companyId: null,
      moduleCode: 'crm',
      status: 'enabled',
      enabledAt: new Date().toISOString(),
      disabledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(mockRepo.setStatus!).mockResolvedValue(updatedRecord);

    const result = await moduleService.enableModule('tenant_01', 'crm');
    expect(result.status).toBe('enabled');
    expect(mockRepo.setStatus).toHaveBeenCalledWith('tenant_01', 'crm', 'enabled', undefined);
    expect(mockAudit.logEvent).toHaveBeenCalled();
  });

  it('disables an application module for a tenant without deleting data', async () => {
    const updatedRecord: TenantModuleRecord = {
      id: 'mod_2',
      tenantId: 'tenant_01',
      companyId: null,
      moduleCode: 'hrms',
      status: 'disabled',
      enabledAt: new Date().toISOString(),
      disabledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(mockRepo.setStatus!).mockResolvedValue(updatedRecord);

    const result = await moduleService.disableModule('tenant_01', 'hrms');
    expect(result.status).toBe('disabled');
    expect(mockRepo.setStatus).toHaveBeenCalledWith('tenant_01', 'hrms', 'disabled', undefined);
    expect(mockAudit.logEvent).toHaveBeenCalled();
  });

  it('rejects module enabling when tenant does not exist', async () => {
    vi.mocked(mockTenantRepo.findById!).mockResolvedValue(null);

    await expect(moduleService.enableModule('unknown_tenant', 'hrms')).rejects.toThrow(
      NotFoundError,
    );
  });
});
