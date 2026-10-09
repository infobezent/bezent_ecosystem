import { moduleRepository, ModuleRepository } from '../repository/module.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, BadRequestError } from '../../../app/errors/AppError.js';
import {
  MODULE_CATALOG,
  getApplicationModules,
  type ModuleCatalogItem,
  type ModuleCode,
  type TenantModuleRecord,
  type ApplicationModuleDefinition,
  type PlanModuleEligibility,
} from '../types/module.types.js';
import { effectiveEntitlementService } from '../../entitlements/service/effectiveEntitlement.service.js';
import { planRepository, PlanRepository } from '../../plans/repository/plan.repository.js';
import type { ApplicationCode } from '../../plans/types/plan.types.js';

export class ModuleService {
  constructor(
    private readonly repo: ModuleRepository = moduleRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
    private readonly planRepo: PlanRepository = planRepository,
  ) {}

  getCatalog(): readonly ModuleCatalogItem[];
  getCatalog(applicationCode: string): ApplicationModuleDefinition[];
  getCatalog(applicationCode?: string): readonly ModuleCatalogItem[] | ApplicationModuleDefinition[] {
    if (applicationCode) {
      return getApplicationModules(applicationCode as ApplicationCode);
    }
    return MODULE_CATALOG;
  }

  getApplicationModules(applicationCode: ApplicationCode): ApplicationModuleDefinition[] {
    return getApplicationModules(applicationCode);
  }

  async getPlanModuleEligibility(planId: string): Promise<PlanModuleEligibility[]> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new NotFoundError(`Plan '${planId}' not found`);
    }

    const appModules = getApplicationModules(plan.applicationCode);
    const hasAllModulesEntitlement = plan.entitlements.some(
      (e) => e.moduleCode === 'all_modules' && e.isEnabled,
    );
    const isEnterprise = plan.tier.toLowerCase() === 'enterprise';

    return appModules.map((m) => {
      const explicitEntitlement = plan.entitlements.find(
        (e) => e.moduleCode === m.key,
      );

      let isIncludedInPlan = false;
      if (hasAllModulesEntitlement || isEnterprise) {
        isIncludedInPlan = true;
      } else if (explicitEntitlement) {
        isIncludedInPlan = explicitEntitlement.isEnabled;
      } else if (
        m.includedInPlans.includes(plan.tier.toLowerCase()) ||
        m.includedInPlans.includes(plan.code.toLowerCase())
      ) {
        isIncludedInPlan = true;
      }

      const defaultEnabled = isIncludedInPlan;
      const requiresOverride = !isIncludedInPlan;
      const limits = explicitEntitlement?.limits || m.defaultLimits || null;

      return {
        moduleKey: m.key,
        name: m.name,
        description: m.description,
        category: m.category,
        applicationCode: plan.applicationCode,
        availability: m.availability,
        isMandatory: m.isMandatory,
        isIncludedInPlan,
        defaultEnabled,
        dependencies: m.dependencies,
        requiresOverride,
        limits,
      };
    });
  }

  async isTenantEntitled(tenantId: string, moduleCode: ModuleCode): Promise<boolean> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant || tenant.status === 'suspended') return false;
    const eff = await effectiveEntitlementService.resolveEffectiveEntitlements(tenantId, moduleCode as any, null);
    return eff.isEntitled;
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
    if (!companyId && catalogItem?.availability === 'Planned') {
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

    const eff = await effectiveEntitlementService.resolveEffectiveEntitlements(
      tenantId,
      moduleCode as any,
      companyId,
    );
    if (!eff.isEntitled) {
      return false;
    }

    if (companyId) {
      const companyRecord = await this.repo.findEntitlement(tenantId, moduleCode, companyId);
      if (companyRecord && companyRecord.status !== 'enabled') {
        return false;
      }
    }

    return true;
  }

  /** Every module enabled for a company, from effective entitlements and company ceilings. Suspended tenants get none. */
  async getEnabledModules(tenantId: string, companyId: string): Promise<Set<ModuleCode>> {
    const enabled = new Set<ModuleCode>();
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant || tenant.status === 'suspended') {
      return enabled;
    }

    const records = await this.repo.listByTenant(tenantId);
    for (const item of MODULE_CATALOG) {
      const eff = await effectiveEntitlementService.resolveEffectiveEntitlements(
        tenantId,
        item.code as any,
        companyId,
      );
      if (eff.isEntitled) {
        const companyRecord =
          records.find((r) => r.moduleCode === item.code && r.companyId === companyId) ?? null;
        if (!companyRecord || companyRecord.status === 'enabled') {
          enabled.add(item.code);
        }
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
