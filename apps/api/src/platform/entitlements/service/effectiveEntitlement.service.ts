import { entitlementOverrideRepository, EntitlementOverrideRepository } from '../repository/entitlementOverride.repository.js';
import { subscriptionRepository, SubscriptionRepository } from '../../subscriptions/repository/subscription.repository.js';
import { planRepository, PlanRepository } from '../../plans/repository/plan.repository.js';
import { moduleRepository, ModuleRepository } from '../../modules/repository/module.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import {
  NotFoundError,
  BadRequestError,
} from '../../../app/errors/AppError.js';
import { generateSurrogateId } from '../../auth/security.js';
import type {
  EffectiveEntitlementResult,
  EffectiveModuleEntitlement,
  EntitlementOverrideRecord,
  CreateOverrideDto,
  RevokeOverrideDto,
  ReconciliationReport,
  MismatchItem,
} from '../types/entitlement.types.js';
import type { ApplicationCode } from '../../plans/types/plan.types.js';
import { getDb } from '../../../db/connection.js';
import { users, type NewTenantEntitlementOverride } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export class EffectiveEntitlementService {
  constructor(
    private readonly overrideRepo: EntitlementOverrideRepository = entitlementOverrideRepository,
    private readonly subRepo: SubscriptionRepository = subscriptionRepository,
    private readonly planRepo: PlanRepository = planRepository,
    private readonly moduleRepo: ModuleRepository = moduleRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async resolveEffectiveEntitlements(
    tenantId: string,
    applicationCode: ApplicationCode,
    companyId?: string | null,
  ): Promise<EffectiveEntitlementResult> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    if (tenant.status === 'suspended') {
      return {
        tenantId,
        companyId: companyId || null,
        applicationCode,
        isEntitled: false,
        source: 'none',
        modules: [],
      };
    }

    // 1. Check Commercial Subscription
    const activeSub = await this.subRepo.findActiveByTenantAndApp(tenantId, applicationCode);
    const overrides = await this.overrideRepo.listActive(tenantId, applicationCode);

    let planEntitlementsList: Array<{ moduleCode: string; isEnabled: boolean; limits?: Record<string, unknown> | null }> = [];
    let planName: string | null = null;
    let planCode: string | null = null;

    if (activeSub) {
      const plan = await this.planRepo.findById(activeSub.planId);
      if (plan) {
        planName = plan.name;
        planCode = plan.code;
        planEntitlementsList = plan.entitlements.map((e) => ({
          moduleCode: e.moduleCode,
          isEnabled: e.isEnabled,
          limits: e.limits,
        }));
      }
    }

    // 2. Determine base entitlement & source
    let isEntitled = false;
    let source: EffectiveEntitlementResult['source'] = 'none';

    if (activeSub) {
      isEntitled = true;
      source = 'commercial_subscription';
    } else {
      // Check if there is an active override granting access
      const enablingOverride = overrides.find((o) => o.overrideType === 'enable');
      if (enablingOverride) {
        isEntitled = true;
        source = 'override';
      } else {
        // Fallback: Check legacy tenant_modules for backwards compatibility during migration
        const anyTenantSubs = await this.subRepo.list({ tenantId });
        if (anyTenantSubs.length > 0) {
          // Explicitly migrated commercial tenant: do NOT fall back to legacy access if subscription is inactive/expired/cancelled/scheduled or unpurchased
          isEntitled = false;
          source = 'none';
        } else {
          // Legacy tenant without commercial subscriptions
          const legacyTenantEntitlement = await this.moduleRepo.findEntitlement(tenantId, applicationCode as any, null);
          if (legacyTenantEntitlement) {
            if (legacyTenantEntitlement.status === 'enabled') {
              isEntitled = true;
              source = 'legacy_fallback';
            }
          } else if (applicationCode === 'hrms') {
            // Established BEZENT convention: HRMS defaults to entitled when no tenant record exists
            isEntitled = true;
            source = 'legacy_fallback';
          }
        }
      }
    }

    // If company specified, check if company is within tenant ceiling
    if (companyId) {
      const legacyCompanyEntitlement = await this.moduleRepo.findEntitlement(tenantId, applicationCode as any, companyId);
      if (legacyCompanyEntitlement?.status === 'disabled') {
        isEntitled = false;
      }
    }

    // 3. Assemble module entitlements
    const moduleMap = new Map<string, EffectiveModuleEntitlement>();

    // Seed from plan entitlements
    for (const pe of planEntitlementsList) {
      moduleMap.set(pe.moduleCode, {
        moduleCode: pe.moduleCode,
        isEnabled: pe.isEnabled,
        source: 'plan',
        limits: pe.limits,
      });
    }

    // Apply active overrides
    for (const ov of overrides) {
      if (ov.companyId && companyId && ov.companyId !== companyId) {
        continue; // override scoped to a different company
      }

      const existing = moduleMap.get(ov.moduleCode);
      if (ov.overrideType === 'enable') {
        moduleMap.set(ov.moduleCode, {
          moduleCode: ov.moduleCode,
          isEnabled: true,
          source: 'override',
          overrideReason: ov.reason,
          limits: ov.overrideValue || existing?.limits || null,
        });
      } else if (ov.overrideType === 'disable') {
        moduleMap.set(ov.moduleCode, {
          moduleCode: ov.moduleCode,
          isEnabled: false,
          source: 'override',
          overrideReason: ov.reason,
          limits: null,
        });
      } else if (ov.overrideType === 'limit') {
        if (existing) {
          existing.limits = { ...(existing.limits || {}), ...(ov.overrideValue || {}) };
          existing.overrideReason = ov.reason;
        }
      }
    }

    return {
      tenantId,
      companyId: companyId || null,
      applicationCode,
      isEntitled,
      source,
      subscriptionId: activeSub?.id || null,
      subscriptionStatus: activeSub?.status || null,
      planId: activeSub?.planId || null,
      planName,
      licensedSeats: activeSub?.licensedSeats,
      modules: Array.from(moduleMap.values()),
    };
  }

  async createOverride(
    dto: CreateOverrideDto,
    actor?: { id?: string; email?: string },
  ): Promise<EntitlementOverrideRecord> {
    const tenant = await this.tenantRepo.findById(dto.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${dto.tenantId}' not found`);
    }

    const overrideId = generateSurrogateId('ovr');
    const validUntilDate = dto.validUntil ? new Date(dto.validUntil) : null;

    let authorizedByUserId = actor?.id;
    if (!authorizedByUserId) {
      const db = getDb();
      const [sa] = await db.select({ id: users.id }).from(users).where(eq(users.isSuperAdmin, true)).limit(1);
      authorizedByUserId = sa?.id || 'usr_superadmin_01';
    }

    const data: NewTenantEntitlementOverride = {
      id: overrideId,
      tenantId: dto.tenantId,
      companyId: dto.companyId || null,
      applicationCode: dto.applicationCode,
      moduleCode: dto.moduleCode,
      overrideType: dto.overrideType,
      overrideValue: dto.overrideValue || null,
      reason: dto.reason,
      authorizedByUserId,
      validFrom: new Date(),
      validUntil: validUntilDate,
    };

    const created = await this.overrideRepo.create(data);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'entitlement_override_created',
      targetType: 'entitlement_override',
      targetId: created.id,
      tenantId: created.tenantId,
      companyId: created.companyId,
      metadata: {
        applicationCode: created.applicationCode,
        moduleCode: created.moduleCode,
        overrideType: created.overrideType,
        reason: created.reason,
        validUntil: created.validUntil,
      },
    });

    return created;
  }

  async revokeOverride(
    overrideId: string,
    dto: RevokeOverrideDto,
    actor?: { id?: string; email?: string },
  ): Promise<EntitlementOverrideRecord> {
    const existing = await this.overrideRepo.findById(overrideId);
    if (!existing) {
      throw new NotFoundError(`Entitlement override '${overrideId}' not found`);
    }

    if (existing.revokedAt) {
      throw new BadRequestError('Override is already revoked');
    }

    let revokedByUserId = actor?.id;
    if (!revokedByUserId) {
      const db = getDb();
      const [sa] = await db.select({ id: users.id }).from(users).where(eq(users.isSuperAdmin, true)).limit(1);
      revokedByUserId = sa?.id || 'usr_superadmin_01';
    }

    const revoked = await this.overrideRepo.revoke(
      overrideId,
      revokedByUserId,
      dto.reason,
    );

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'entitlement_override_revoked',
      targetType: 'entitlement_override',
      targetId: overrideId,
      tenantId: revoked.tenantId,
      metadata: {
        revocationReason: dto.reason,
        revokedAt: revoked.revokedAt,
      },
    });

    return revoked;
  }

  async listOverrides(tenantId: string): Promise<EntitlementOverrideRecord[]> {
    return this.overrideRepo.listAllByTenant(tenantId);
  }

  async reconcile(tenantId: string, applicationCode: ApplicationCode): Promise<ReconciliationReport> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    const activeSub = await this.subRepo.findActiveByTenantAndApp(tenantId, applicationCode);
    const overrides = await this.overrideRepo.listActive(tenantId, applicationCode);
    const legacyRecords = await this.moduleRepo.listByTenant(tenantId, null);

    let plan: any = null;
    let commercialModules: string[] = [];

    if (activeSub) {
      plan = await this.planRepo.findById(activeSub.planId);
      if (plan) {
        commercialModules = plan.entitlements
          .filter((e: any) => e.isEnabled)
          .map((e: any) => e.moduleCode);
      }
    }

    const legacyModules = legacyRecords
      .filter((r) => r.status === 'enabled')
      .map((r) => r.moduleCode);

    const activeOverrideCodes = overrides
      .filter((o) => o.overrideType === 'enable')
      .map((o) => o.moduleCode);

    const mismatches: MismatchItem[] = [];

    // Check modules in commercial plan vs legacy
    for (const mod of commercialModules) {
      const inLegacy = (legacyModules as string[]).includes(mod);
      if (!inLegacy) {
        mismatches.push({
          moduleCode: mod,
          commercialStatus: 'enabled',
          legacyStatus: 'missing',
          mismatchType: 'commercial_without_legacy',
          recommendedAction: `Grant legacy tenant_module entitlement for '${mod}' to match commercial plan '${plan?.name}'`,
        });
      }
    }

    // Check modules in legacy vs commercial plan
    for (const mod of legacyModules) {
      const inCommercial = commercialModules.includes(mod);
      const inOverride = activeOverrideCodes.includes(mod);

      if (!inCommercial && !inOverride) {
        mismatches.push({
          moduleCode: mod,
          commercialStatus: 'not_in_plan',
          legacyStatus: 'enabled',
          mismatchType: 'legacy_without_commercial',
          recommendedAction: `Legacy module '${mod}' active without commercial plan coverage. Either upgrade plan or create authorized override.`,
        });
      }
    }

    return {
      tenantId,
      applicationCode,
      hasCommercialSubscription: !!activeSub,
      commercialSubscriptionStatus: activeSub?.status,
      commercialPlanId: activeSub?.planId || null,
      commercialPlanName: plan?.name || null,
      commercialModules,
      legacyModules,
      activeOverrides: overrides.map((o) => `${o.moduleCode}:${o.overrideType}`),
      mismatches,
      reconciledAt: new Date(),
    };
  }
}

export const effectiveEntitlementService = new EffectiveEntitlementService();
