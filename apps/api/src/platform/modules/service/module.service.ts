import { moduleRepository, ModuleRepository } from '../repository/module.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError } from '../../../app/errors/AppError.js';
import {
  MODULE_CATALOG,
  type ModuleCatalogItem,
  type ModuleCode,
  type TenantModuleRecord,
} from '../types/module.types.js';

export class ModuleService {
  constructor(
    private readonly repo: ModuleRepository = moduleRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  getCatalog(): readonly ModuleCatalogItem[] {
    return MODULE_CATALOG;
  }

  async getTenantModules(tenantId: string, companyId?: string | null): Promise<TenantModuleRecord[]> {
    return this.repo.listByTenant(tenantId, companyId);
  }

  async enableModule(
    tenantId: string,
    moduleCode: ModuleCode,
    companyId?: string | null,
    actor?: { id?: string; email?: string },
  ): Promise<TenantModuleRecord> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    const record = await this.repo.setStatus(tenantId, moduleCode, 'enabled', companyId);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'module_enabled',
      targetType: 'module',
      targetId: moduleCode,
      tenantId,
      companyId: companyId ?? null,
      metadata: { moduleCode, status: 'enabled' },
    });

    return record;
  }

  async disableModule(
    tenantId: string,
    moduleCode: ModuleCode,
    companyId?: string | null,
    actor?: { id?: string; email?: string },
  ): Promise<TenantModuleRecord> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    const record = await this.repo.setStatus(tenantId, moduleCode, 'disabled', companyId);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'module_disabled',
      targetType: 'module',
      targetId: moduleCode,
      tenantId,
      companyId: companyId ?? null,
      metadata: { moduleCode, status: 'disabled' },
    });

    return record;
  }

  async isModuleEnabled(
    tenantId: string,
    moduleCode: ModuleCode,
    companyId?: string | null,
  ): Promise<boolean> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (tenant && tenant.status === 'suspended') {
      return false;
    }

    if (!tenant) {
      return moduleCode === 'hrms';
    }

    // Check company-specific entitlement if companyId provided
    if (companyId) {
      const companyEntitlement = await this.repo.findEntitlement(tenantId, moduleCode, companyId);
      if (companyEntitlement) {
        return companyEntitlement.status === 'enabled';
      }
    }

    // Fall back to tenant-wide entitlement
    const tenantEntitlement = await this.repo.findEntitlement(tenantId, moduleCode, null);
    if (tenantEntitlement) {
      return tenantEntitlement.status === 'enabled';
    }

    // For backwards-compatibility with un-entitled tenants: HRMS defaults to enabled if no explicit record
    if (moduleCode === 'hrms') {
      return true;
    }

    return false;
  }
}

export const moduleService = new ModuleService();
