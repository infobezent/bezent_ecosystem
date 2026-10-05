import { moduleRepository, ModuleRepository } from '../repository/module.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, BadRequestError } from '../../../app/errors/AppError.js';
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

  async isTenantEntitled(tenantId: string, moduleCode: ModuleCode): Promise<boolean> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant || tenant.status === 'suspended') return false;
    const tenantEntitlement = await this.repo.findEntitlement(tenantId, moduleCode, null);
    return moduleCode === 'hrms'
      ? tenantEntitlement?.status !== 'disabled'
      : tenantEntitlement?.status === 'enabled';
  }

  async getTenantModules(
    tenantId: string,
    companyId?: string | null,
  ): Promise<TenantModuleRecord[]> {
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

    const catalogItem = MODULE_CATALOG.find((m) => m.code === moduleCode);
    if (catalogItem?.availability === 'Planned') {
      throw new BadRequestError(
        'This application is planned and is not yet available for customer entitlement',
      );
    }

    if (companyId) {
      const isEntitled = await this.isTenantEntitled(tenantId, moduleCode);
      if (!isEntitled) {
        throw new BadRequestError(
          `Cannot enable application '${moduleCode}' for company: parent tenant '${tenant.name}' is not entitled to it`,
        );
      }
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

    const tenantEntitlement = await this.repo.findEntitlement(tenantId, moduleCode, null);
    const companyEntitlement = companyId
      ? await this.repo.findEntitlement(tenantId, moduleCode, companyId)
      : null;
    return evaluateEntitlement(moduleCode, tenantEntitlement, companyEntitlement);
  }

  /** Every module enabled for a company, from one query. Suspended tenants get none. */
  async getEnabledModules(tenantId: string, companyId: string): Promise<Set<ModuleCode>> {
    const enabled = new Set<ModuleCode>();
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant || tenant.status === 'suspended') {
      return enabled;
    }

    const records = await this.repo.listByTenant(tenantId);
    for (const item of MODULE_CATALOG) {
      const tenantRecord =
        records.find((r) => r.moduleCode === item.code && r.companyId === null) ?? null;
      const companyRecord =
        records.find((r) => r.moduleCode === item.code && r.companyId === companyId) ?? null;
      if (evaluateEntitlement(item.code, tenantRecord, companyRecord)) {
        enabled.add(item.code);
      }
    }
    return enabled;
  }
}

/**
 * The tenant-wide (platform-controlled) entitlement is the ceiling. HRMS
 * defaults to entitled when no tenant record exists (backwards compatibility);
 * every other module requires an explicit enabled record. A company-level
 * record may only narrow the tenant entitlement, never widen it.
 */
function evaluateEntitlement(
  moduleCode: ModuleCode,
  tenantRecord: TenantModuleRecord | null,
  companyRecord: TenantModuleRecord | null,
): boolean {
  const tenantEntitled =
    moduleCode === 'hrms'
      ? tenantRecord?.status !== 'disabled'
      : tenantRecord?.status === 'enabled';
  if (!tenantEntitled) {
    return false;
  }
  return companyRecord ? companyRecord.status === 'enabled' : true;
}

export const moduleService = new ModuleService();
