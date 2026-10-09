import crypto from 'node:crypto';
import { eq, and, or, like } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  tenantDetails,
  companies,
  tenantSubscriptions,
  tenantModules,
  tenantEntitlementOverrides,
  invitations,
  provisioningJobs,
  transactionalOutbox,
  users,
} from '../../../db/schema.js';
import { generateSurrogateId } from '../../auth/security.js';
import { planService, PlanService } from '../../plans/service/plan.service.js';
import { moduleService, ModuleService } from '../../modules/service/module.service.js';
import { getApplicationModules } from '../../modules/catalog/applicationModuleCatalog.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import {
  ConflictError,
  BadRequestError,
  NotFoundError,
} from '../../../app/errors/AppError.js';
import {
  type TenantOrchestrationDto,
  type TenantOrchestrationPreflightResult,
  validateTenantOrchestration,
} from '../validation/tenantOrchestration.schema.js';

export class TenantCreationOrchestrationService {
  constructor(
    private readonly plans: PlanService = planService,
    private readonly audit: AuditService = auditService,
    private readonly modules: ModuleService = moduleService,
  ) {}

  private generateCode(name: string): string {
    const alphanumeric = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = (alphanumeric.slice(0, 6) || 'TNT').padEnd(3, 'X');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomSuffix}`;
  }

  async preflight(dtoInput: unknown): Promise<TenantOrchestrationPreflightResult> {
    const dto = validateTenantOrchestration(dtoInput);
    const db = getDb();
    const warnings: string[] = [];

    // Check duplicate or similar names
    const existingTenants = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(
        or(
          eq(tenants.name, dto.company.displayName),
          like(tenants.name, `%${dto.company.displayName}%`),
        ),
      )
      .limit(5);

    if (existingTenants.length > 0) {
      warnings.push(
        `Similar tenant name(s) found: ${existingTenants.map((t) => `'${t.name}'`).join(', ')}. Please verify this is not an unintentional duplicate.`,
      );
    }

    const existingCompanies = await db
      .select({ id: companies.id, name: companies.name, legalName: companies.legalName })
      .from(companies)
      .where(
        or(
          eq(companies.name, dto.company.displayName),
          eq(companies.legalName, dto.company.legalName),
        ),
      )
      .limit(5);

    if (existingCompanies.length > 0) {
      warnings.push(
        `Similar company name(s) found: ${existingCompanies.map((c) => `'${c.name}'`).join(', ')}.`,
      );
    }

    // Check primary admin email
    const [existingUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, dto.admin.workEmail));

    if (existingUser) {
      warnings.push(
        `User identity for '${dto.admin.workEmail}' already exists and will be designated as Primary Administrator upon invitation acceptance.`,
      );
    }

    // Validate plans, pricing, seat limits
    const subscriptionSummaries = [];
    const now = new Date();

    for (const sub of dto.subscriptions) {
      const plan = await this.plans.getPlanById(sub.planId);
      if (plan.applicationCode !== sub.applicationCode) {
        throw new BadRequestError(
          `Plan '${plan.code}' belongs to '${plan.applicationCode}', not requested application '${sub.applicationCode}'`,
        );
      }
      if (plan.status !== 'active') {
        throw new BadRequestError(`Plan '${plan.code}' is '${plan.status}' and cannot accept subscriptions`);
      }

      const seats = sub.licensedSeats ?? plan.defaultSeats;
      if (seats < plan.minSeats) {
        throw new BadRequestError(`Seats for '${sub.applicationCode}' (${seats}) cannot be less than plan minimum (${plan.minSeats})`);
      }
      if (plan.maxSeats !== null && seats > plan.maxSeats) {
        throw new BadRequestError(`Seats for '${sub.applicationCode}' (${seats}) exceeds plan maximum (${plan.maxSeats})`);
      }

      if (sub.accessMode === 'trial') {
        if (!plan.trialEligible) {
          throw new BadRequestError(`Plan '${plan.name}' is not eligible for trial access`);
        }
      } else {
        if (!sub.commercialAgreementNotes) {
          const priceValidation = await this.plans.validatePriceForCommercialActivation(
            plan.id,
            'USD',
            sub.billingCycle || 'monthly',
          );
          if (!priceValidation.approved) {
            throw new BadRequestError(priceValidation.reason || `Price not approved for plan '${plan.name}'`);
          }
        }
      }

      // Authoritative module catalog & plan eligibility validation
      const eligibleModules = await this.modules.getPlanModuleEligibility(plan.id);
      const appModules = getApplicationModules(sub.applicationCode);

      // Validate overrides
      if (sub.moduleOverrides && sub.moduleOverrides.length > 0) {
        for (const ovr of sub.moduleOverrides) {
          const modDef = appModules.find((m) => m.key === ovr.moduleCode);
          if (!modDef) {
            throw new BadRequestError(`Cannot override unrecognized module '${ovr.moduleCode}' for application '${sub.applicationCode}'`);
          }
          if (ovr.overrideType === 'disable' && modDef.isMandatory) {
            throw new BadRequestError(`Cannot disable mandatory module '${modDef.name}' (${ovr.moduleCode}) via override`);
          }
          if (!ovr.reason || ovr.reason.trim().length < 3) {
            throw new BadRequestError(`Override for module '${ovr.moduleCode}' requires an authorized reason (min 3 characters)`);
          }
        }
      }

      // If selectedModules provided, validate selections, dependencies, and plan eligibility
      let finalSelected: string[];
      if (sub.selectedModules) {
        for (const modKey of sub.selectedModules) {
          if (!appModules.some((m) => m.key === modKey)) {
            throw new BadRequestError(`Invalid module key '${modKey}' for application '${sub.applicationCode}'`);
          }
        }

        const mandatoryModules = appModules.filter((m) => m.isMandatory);
        for (const mand of mandatoryModules) {
          if (!sub.selectedModules.includes(mand.key)) {
            throw new BadRequestError(`Mandatory module '${mand.name}' (${mand.key}) cannot be deselected`);
          }
        }

        for (const modKey of sub.selectedModules) {
          const def = appModules.find((m) => m.key === modKey);
          if (def && def.dependencies.length > 0) {
            for (const dep of def.dependencies) {
              if (!sub.selectedModules.includes(dep)) {
                const depDef = appModules.find((m) => m.key === dep);
                throw new BadRequestError(
                  `Module '${def.name}' requires dependency '${depDef?.name || dep}', which is not selected`,
                );
              }
            }
          }
        }

        for (const modKey of sub.selectedModules) {
          const eligibility = eligibleModules.find((e) => e.moduleKey === modKey);
          if (eligibility && !eligibility.isIncludedInPlan) {
            const hasOverride = sub.moduleOverrides?.some(
              (o) => o.moduleCode === modKey && o.overrideType === 'enable',
            );
            if (!hasOverride) {
              throw new BadRequestError(
                `Module '${eligibility.name}' (${modKey}) is not included in plan '${plan.name}' and requires an authorized override`,
              );
            }
          }
        }

        finalSelected = sub.selectedModules;
      } else {
        // Default to all plan-included modules
        finalSelected = eligibleModules.filter((e) => e.defaultEnabled).map((e) => e.moduleKey);
      }

      subscriptionSummaries.push({
        applicationCode: sub.applicationCode,
        planId: sub.planId,
        accessMode: sub.accessMode || 'paid',
        seats,
        modulesCount: finalSelected.length,
        selectedModules: finalSelected,
        overridesCount: sub.moduleOverrides?.length || 0,
      });
    }

    return {
      valid: true,
      tenantSetupPolicy: 'ready_to_create',
      warnings,
      summary: {
        companyName: dto.company.legalName,
        tenantName: dto.company.displayName,
        primaryCompanyName: dto.company.displayName,
        adminEmail: dto.admin.workEmail,
        selectedApplications: dto.subscriptions.map((s) => s.applicationCode),
        applicationsCount: dto.subscriptions.length,
        subscriptions: subscriptionSummaries,
      },
    };
  }

  async orchestrate(
    dtoInput: unknown,
    actor?: { id?: string; email?: string },
    idempotencyKey?: string | null,
  ): Promise<Record<string, unknown>> {
    const dto = validateTenantOrchestration(dtoInput);
    const db = getDb();

    // 1. Durable database-backed idempotency check
    const normalizedKey = idempotencyKey?.trim() || dto.idempotencyKey?.trim() || null;
    let requestFingerprint: string | null = null;

    if (normalizedKey) {
      requestFingerprint = crypto
        .createHash('sha256')
        .update(JSON.stringify(dto))
        .digest('hex');

      const [existingJob] = await db
        .select()
        .from(provisioningJobs)
        .where(eq(provisioningJobs.idempotencyKey, normalizedKey));

      if (existingJob) {
        const state = existingJob.stepState as Record<string, unknown> | null;
        if (state && typeof state.requestFingerprint === 'string' && state.requestFingerprint !== requestFingerprint) {
          throw new ConflictError(
            'Idempotency key was previously reused with a different payload',
            'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
          );
        }
        if (state && state.responsePayload && typeof state.responsePayload === 'object') {
          return {
            ...(state.responsePayload as Record<string, unknown>),
            idempotentReplay: true,
          };
        }
      }
    }

    // Run validation checks
    await this.preflight(dto);

    const now = new Date();
    const tenantId = dto.id?.trim() || dto.tenantId?.trim() || generateSurrogateId('tnt');
    const companyId = generateSurrogateId('comp');
    const tenantCode = dto.company.code || this.generateCode(dto.company.displayName);
    const companyCode = tenantCode;

    // Invitation token: 32 raw cryptographically random bytes
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invId = generateSurrogateId('inv');
    const jobId = generateSurrogateId('pjob');
    const invitationExpiry = new Date(now.getTime() + 72 * 3600 * 1000); // Strict 72-hour requirement

    const subscriptionResults: Array<Record<string, unknown>> = [];

    // 2. Atomic Database Transaction
    await db.transaction(async (tx) => {
      // Step 1: Tenant
      await tx.insert(tenants).values({
        id: tenantId,
        name: dto.company.displayName,
        maxCompanies: 5,
        logoUrl: dto.company.logoUrl || null,
        status: 'active',
      });

      // Tenant Details
      await tx.insert(tenantDetails).values({
        tenantId,
        code: tenantCode,
        contactEmail: dto.company.businessEmail,
        contactPhone: dto.company.contactPhone || null,
      });

      // Primary Company
      await tx.insert(companies).values({
        id: companyId,
        tenantId,
        name: dto.company.legalName,
        code: companyCode,
        legalName: dto.company.legalName,
        businessEmail: dto.company.businessEmail,
        contactPhone: dto.company.contactPhone || null,
        country: dto.company.country,
        timeZone: dto.company.timeZone,
        displayName: dto.company.displayName,
        industry: dto.company.industry || null,
        website: dto.company.website || null,
        logoUrl: dto.company.logoUrl || null,
        addressLine1: dto.company.address || null,
        state: dto.company.state || null,
        city: dto.company.city || null,
        postalCode: dto.company.postalCode || null,
        registrationNumber: dto.company.registrationNumber || null,
        status: 'active',
      });

      // Step 2: Primary Administrator Invitation (72-hour expiry, token hash)
      await tx.insert(invitations).values({
        id: invId,
        tenantId,
        companyId,
        email: dto.admin.workEmail,
        role: 'company_admin',
        authorityType: 'tenant_admin',
        isPrimaryAdmin: true,
        token: tokenHash,
        invitedByUserId: actor?.id || null,
        status: 'pending',
        expiresAt: invitationExpiry,
      });

      // Step 3: Applications & Subscriptions
      for (const item of dto.subscriptions) {
        const plan = await this.plans.getPlanById(item.planId);
        const seats = item.licensedSeats ?? plan.defaultSeats;

        let status: 'active' | 'trial' | 'pending_activation' = 'active';
        let trialStartsAt: Date | null = null;
        let trialEndsAt: Date | null = null;
        let scheduledActivationAt: Date | null = null;
        let activatedAt: Date | null = null;
        let currentPeriodStartsAt: Date | null = null;
        let currentPeriodEndsAt: Date | null = null;

        if (item.scheduledActivationAt) {
          const scheduledDate = new Date(item.scheduledActivationAt);
          if (scheduledDate > now) {
            status = 'pending_activation';
            scheduledActivationAt = scheduledDate;
          } else {
            status = 'active';
            activatedAt = now;
            currentPeriodStartsAt = now;
            const cycleDays = item.billingCycle === 'annual' ? 365 : item.billingCycle === 'quarterly' ? 90 : 30;
            currentPeriodEndsAt = new Date(now.getTime() + cycleDays * 86400000);
          }
        } else if (item.accessMode === 'trial') {
          status = 'trial';
          trialStartsAt = now;
          const trialDays = plan.trialDurationDays || 14;
          trialEndsAt = new Date(now.getTime() + trialDays * 86400000);
          currentPeriodStartsAt = trialStartsAt;
          currentPeriodEndsAt = trialEndsAt;
          activatedAt = now;
        } else {
          status = 'active';
          activatedAt = now;
          currentPeriodStartsAt = now;
          const cycleDays = item.billingCycle === 'annual' ? 365 : item.billingCycle === 'quarterly' ? 90 : 30;
          currentPeriodEndsAt = new Date(now.getTime() + cycleDays * 86400000);
        }

        const subId = generateSurrogateId('sub');
        await tx.insert(tenantSubscriptions).values({
          id: subId,
          tenantId,
          applicationCode: item.applicationCode,
          planId: item.planId,
          status,
          accessMode: item.accessMode || 'paid',
          licensedSeats: seats,
          billingCycle: item.billingCycle || 'monthly',
          currentPeriodStartsAt,
          currentPeriodEndsAt,
          trialStartsAt,
          trialEndsAt,
          scheduledActivationAt,
          activatedAt,
          autoRenew: true,
        });

        // Synchronize tenant_modules for legacy runtime compatibility (Slice B)
        const isEnabled = status === 'active' || status === 'trial';
        await tx.insert(tenantModules).values({
          id: generateSurrogateId('mod'),
          tenantId,
          companyId: null, // Tenant-level ceiling
          moduleCode: item.applicationCode,
          status: isEnabled ? 'enabled' : 'disabled',
          enabledAt: now,
          disabledAt: isEnabled ? undefined : now,
        });

        await tx.insert(tenantModules).values({
          id: generateSurrogateId('mod'),
          tenantId,
          companyId, // Primary company access
          moduleCode: item.applicationCode,
          status: isEnabled ? 'enabled' : 'disabled',
          enabledAt: now,
          disabledAt: isEnabled ? undefined : now,
        });

        // Module Entitlements & Overrides Persistence
        const eligibleModules = await this.modules.getPlanModuleEligibility(plan.id);
        const finalSelected = item.selectedModules
          ? item.selectedModules
          : eligibleModules.filter((e) => e.defaultEnabled).map((e) => e.moduleKey);

        const explicitOverrides = item.moduleOverrides || [];
        const seenOvrCodes = new Set<string>();

        let authorizedUserId = actor?.id;
        if (!authorizedUserId) {
          const [saUser] = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.isSuperAdmin, true))
            .limit(1);
          authorizedUserId = saUser?.id || 'usr_superadmin_01';
        }

        for (const ovr of explicitOverrides) {
          seenOvrCodes.add(ovr.moduleCode);
          const overrideId = generateSurrogateId('ovr');
          await tx.insert(tenantEntitlementOverrides).values({
            id: overrideId,
            tenantId,
            companyId: null,
            applicationCode: item.applicationCode,
            moduleCode: ovr.moduleCode,
            overrideType: ovr.overrideType,
            overrideValue: ovr.overrideValue || null,
            reason: ovr.reason,
            authorizedByUserId: authorizedUserId,
            validFrom: now,
            validUntil: null,
          });

          await this.audit.logEvent({
            actorUserId: actor?.id,
            actorEmail: actor?.email,
            action: 'entitlement_override_created',
            targetType: 'entitlement_override',
            targetId: ovr.moduleCode,
            tenantId,
            metadata: {
              applicationCode: item.applicationCode,
              moduleCode: ovr.moduleCode,
              overrideType: ovr.overrideType,
              reason: ovr.reason,
            },
          });
        }

        // If optional modules included in the plan were deselected, persist disable overrides
        if (item.selectedModules) {
          for (const em of eligibleModules) {
            if (
              em.isIncludedInPlan &&
              !item.selectedModules.includes(em.moduleKey) &&
              !seenOvrCodes.has(em.moduleKey)
            ) {
              const overrideId = generateSurrogateId('ovr');
              await tx.insert(tenantEntitlementOverrides).values({
                id: overrideId,
                tenantId,
                companyId: null,
                applicationCode: item.applicationCode,
                moduleCode: em.moduleKey,
                overrideType: 'disable',
                overrideValue: null,
                reason: 'Deselected during tenant provisioning',
                authorizedByUserId: authorizedUserId,
                validFrom: now,
                validUntil: null,
              });
            }
          }
        }

        subscriptionResults.push({
          id: subId,
          applicationCode: item.applicationCode,
          planId: item.planId,
          planName: plan.name,
          status,
          accessMode: item.accessMode || 'paid',
          licensedSeats: seats,
          selectedModules: finalSelected,
          overridesCount: explicitOverrides.length,
        });
      }

      // If HRMS was explicitly not selected, insert disabled tenant ceiling
      if (!dto.subscriptions.some((s) => s.applicationCode === 'hrms')) {
        await tx.insert(tenantModules).values({
          id: generateSurrogateId('mod'),
          tenantId,
          companyId: null,
          moduleCode: 'hrms',
          status: 'disabled',
          enabledAt: now,
          disabledAt: now,
        });
      }

      // Step 4: Durable Provisioning Job & Transactional Outbox
      const setupState = dto.subscriptions.length === 0 ? 'pending_setup' : 'pending_admin_acceptance';
      const responsePayload = {
        tenantId,
        tenantCode,
        primaryCompanyId: companyId,
        businessSetupState: setupState,
        subscriptions: subscriptionResults,
        invitation: {
          id: invId,
          email: dto.admin.workEmail,
          status: 'pending',
          expiresAt: invitationExpiry.toISOString(),
          rawToken,
        },
        provisioningJobId: jobId,
        provisioningStatus: 'pending',
      };

      await tx.insert(provisioningJobs).values({
        id: jobId,
        tenantId,
        companyId,
        jobType: 'tenant_creation',
        status: 'pending',
        idempotencyKey: normalizedKey,
        attemptCount: 0,
        maxAttempts: 3,
        retryEligible: true,
        stepState: {
          requestFingerprint,
          responsePayload,
          steps: {
            tenant_created: true,
            company_created: true,
            subscriptions_initialized: true,
            invitation_staged: true,
          },
        },
      });

      // Transactional Outbox events
      await tx.insert(transactionalOutbox).values({
        id: generateSurrogateId('txo'),
        aggregateType: 'tenant',
        aggregateId: tenantId,
        eventType: 'tenant.invitation.issued',
        payload: {
          invitationId: invId,
          tenantId,
          companyId,
          email: dto.admin.workEmail,
          name: dto.admin.fullName,
          roleLabel: 'Primary Tenant Administrator',
          rawToken,
        },
        status: 'pending',
        attemptCount: 0,
        maxAttempts: 5,
      });

      await tx.insert(transactionalOutbox).values({
        id: generateSurrogateId('txo'),
        aggregateType: 'tenant',
        aggregateId: tenantId,
        eventType: 'tenant.created',
        payload: {
          tenantId,
          name: dto.company.displayName,
          code: tenantCode,
          companyId,
        },
        status: 'pending',
        attemptCount: 0,
        maxAttempts: 5,
      });

      // Audit Log
      await this.audit.logEvent({
        actorUserId: actor?.id,
        actorEmail: actor?.email,
        action: 'tenant_orchestrated_created',
        targetType: 'tenant',
        targetId: tenantId,
        tenantId,
        metadata: {
          name: dto.company.displayName,
          code: tenantCode,
          companyId,
          subscriptionsCount: dto.subscriptions.length,
          primaryAdminEmail: dto.admin.workEmail,
        },
      });
    });

    return {
      tenantId,
      tenantCode,
      primaryCompanyId: companyId,
      businessSetupState: dto.subscriptions.length === 0 ? 'pending_setup' : 'pending_admin_acceptance',
      subscriptions: subscriptionResults,
      invitation: {
        id: invId,
        email: dto.admin.workEmail,
        status: 'pending',
        expiresAt: invitationExpiry.toISOString(),
        rawToken,
      },
      provisioningJobId: jobId,
      provisioningStatus: 'pending',
      idempotentReplay: false,
    };
  }
}

export const tenantCreationOrchestrationService = new TenantCreationOrchestrationService();
