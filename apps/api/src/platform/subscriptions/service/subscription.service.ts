import { subscriptionRepository, SubscriptionRepository } from '../repository/subscription.repository.js';
import { planService, PlanService } from '../../plans/service/plan.service.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../../app/errors/AppError.js';
import { generateSurrogateId } from '../../auth/security.js';
import type {
  SubscriptionRecord,
  SubscriptionDetailRecord,
  SubscriptionFilter,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  RenewSubscriptionDto,
} from '../types/subscription.types.js';
import type { NewTenantSubscription } from '../../../db/schema.js';
import { moduleRepository, ModuleRepository } from '../../modules/repository/module.repository.js';

export class SubscriptionService {
  constructor(
    private readonly repo: SubscriptionRepository = subscriptionRepository,
    private readonly plans: PlanService = planService,
    private readonly tenants: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
    private readonly moduleRepo: ModuleRepository = moduleRepository,
  ) {}

  async listSubscriptions(filter: SubscriptionFilter): Promise<SubscriptionDetailRecord[]> {
    return this.repo.list(filter);
  }

  async getSubscriptionById(id: string): Promise<SubscriptionDetailRecord> {
    const sub = await this.repo.findById(id);
    if (!sub) {
      throw new NotFoundError(`Subscription '${id}' not found`);
    }
    return sub;
  }

  async createSubscription(
    dto: CreateSubscriptionDto,
    actor?: { id?: string; email?: string },
  ): Promise<SubscriptionRecord> {
    const tenant = await this.tenants.findById(dto.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${dto.tenantId}' not found`);
    }

    const plan = await this.plans.getPlanById(dto.planId);
    if (plan.applicationCode !== dto.applicationCode) {
      throw new BadRequestError(
        `Plan '${plan.code}' belongs to '${plan.applicationCode}', not requested application '${dto.applicationCode}'`,
      );
    }

    if (plan.status !== 'active') {
      throw new BadRequestError(`Plan '${plan.code}' is '${plan.status}' and cannot accept new subscriptions`);
    }

    // Seat limits validation
    const licensedSeats = dto.licensedSeats ?? plan.defaultSeats;
    if (licensedSeats < plan.minSeats) {
      throw new BadRequestError(`Licensed seats (${licensedSeats}) cannot be less than plan minimum (${plan.minSeats})`);
    }
    if (plan.maxSeats !== null && licensedSeats > plan.maxSeats) {
      throw new BadRequestError(`Licensed seats (${licensedSeats}) exceeds plan maximum (${plan.maxSeats})`);
    }

    const currentSeatsUsed = await this.repo.countActiveSeats(dto.tenantId);
    if (licensedSeats < currentSeatsUsed) {
      throw new ConflictError(
        `Cannot allocate ${licensedSeats} seats. Tenant currently has ${currentSeatsUsed} active user assignments.`,
      );
    }

    const now = new Date();
    let status: SubscriptionRecord['status'] = 'active';
    let trialStartsAt: Date | null = null;
    let trialEndsAt: Date | null = null;
    let scheduledActivationAt: Date | null = null;
    let activatedAt: Date | null = null;
    let currentPeriodStartsAt: Date | null = null;
    let currentPeriodEndsAt: Date | null = null;
    let renewsAt: Date | null = null;

    if (dto.accessMode === 'trial') {
      if (!plan.trialEligible) {
        throw new BadRequestError(`Plan '${plan.name}' is not eligible for trial access`);
      }
      status = 'trial';
      trialStartsAt = now;
      const trialDays = plan.trialDurationDays || 14;
      trialEndsAt = new Date(now.getTime() + trialDays * 86400000);
      currentPeriodStartsAt = trialStartsAt;
      currentPeriodEndsAt = trialEndsAt;
      renewsAt = trialEndsAt;
    } else {
      // Paid access mode commercial validation
      if (!dto.commercialAgreementNotes) {
        const currency = dto.currency || 'USD';
        const interval = dto.billingCycle || 'monthly';
        const priceValidation = await this.plans.validatePriceForCommercialActivation(
          plan.id,
          currency,
          interval,
        );
        if (!priceValidation.approved) {
          throw new BadRequestError(priceValidation.reason || 'Price not approved for paid activation');
        }
      }

      if (dto.scheduledActivationAt) {
        const scheduledDate = new Date(dto.scheduledActivationAt);
        if (scheduledDate > now) {
          status = 'pending_activation';
          scheduledActivationAt = scheduledDate;
        } else {
          status = 'active';
          activatedAt = now;
          currentPeriodStartsAt = now;
          const periodDays = (dto.billingCycle === 'annual') ? 365 : (dto.billingCycle === 'quarterly') ? 90 : 30;
          currentPeriodEndsAt = new Date(now.getTime() + periodDays * 86400000);
          renewsAt = currentPeriodEndsAt;
        }
      } else {
        status = 'active';
        activatedAt = now;
        currentPeriodStartsAt = now;
        const periodDays = (dto.billingCycle === 'annual') ? 365 : (dto.billingCycle === 'quarterly') ? 90 : 30;
        currentPeriodEndsAt = new Date(now.getTime() + periodDays * 86400000);
        renewsAt = currentPeriodEndsAt;
      }
    }

    // Check existing active subscription if trying to create an immediately active/trial subscription
    if (status === 'active' || status === 'trial') {
      const activeExisting = await this.repo.findActiveByTenantAndApp(dto.tenantId, dto.applicationCode);
      if (activeExisting) {
        throw new ConflictError(
          `Tenant '${dto.tenantId}' already has an active subscription for application '${dto.applicationCode}'. Schedule renewal or cancel existing first.`,
        );
      }
    }

    const subId = dto.id || generateSurrogateId('sub');
    const newSubData: NewTenantSubscription = {
      id: subId,
      tenantId: dto.tenantId,
      companyId: dto.companyId || null,
      applicationCode: dto.applicationCode,
      planId: dto.planId,
      status,
      accessMode: dto.accessMode,
      billingCycle: dto.billingCycle || 'monthly',
      licensedSeats,
      scheduledActivationAt,
      activatedAt,
      trialStartsAt,
      trialEndsAt,
      currentPeriodStartsAt,
      currentPeriodEndsAt,
      renewsAt,
      autoRenew: dto.autoRenew ?? true,
    };

    const created = await this.repo.create(newSubData);

    const isEnabled = created.status === 'active' || created.status === 'trial';
    try {
      await this.moduleRepo.setStatus(
        created.tenantId,
        created.applicationCode,
        isEnabled ? 'enabled' : 'disabled',
        null,
      );
    } catch {}

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'subscription_created',
      targetType: 'subscription',
      targetId: created.id,
      tenantId: created.tenantId,
      metadata: {
        applicationCode: created.applicationCode,
        planId: created.planId,
        status: created.status,
        accessMode: created.accessMode,
        licensedSeats: created.licensedSeats,
        commercialAgreementNotes: dto.commercialAgreementNotes,
      },
    });

    return created;
  }

  async activateSubscription(
    id: string,
    actor?: { id?: string; email?: string },
  ): Promise<SubscriptionRecord> {
    const sub = await this.getSubscriptionById(id);

    if (sub.status === 'active') {
      // Idempotent: already active
      return sub;
    }

    if (sub.status !== 'pending_activation') {
      throw new BadRequestError(
        `Subscription cannot be activated from current status '${sub.status}'`,
      );
    }

    // Check if another subscription is currently active for this tenant & application
    const activeExisting = await this.repo.findActiveByTenantAndApp(sub.tenantId, sub.applicationCode);
    if (activeExisting && activeExisting.id !== sub.id) {
      throw new ConflictError(
        `Cannot activate subscription '${sub.id}'. Tenant already has active subscription '${activeExisting.id}' for application '${sub.applicationCode}'`,
      );
    }

    const now = new Date();
    const periodDays = (sub.billingCycle === 'annual') ? 365 : (sub.billingCycle === 'quarterly') ? 90 : 30;
    const currentPeriodEndsAt = new Date(now.getTime() + periodDays * 86400000);

    const updated = await this.repo.update(id, {
      status: 'active',
      activatedAt: now,
      currentPeriodStartsAt: now,
      currentPeriodEndsAt,
      renewsAt: currentPeriodEndsAt,
    });

    try {
      await this.moduleRepo.setStatus(updated.tenantId, updated.applicationCode, 'enabled', null);
    } catch {}

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'subscription_activated',
      targetType: 'subscription',
      targetId: id,
      tenantId: updated.tenantId,
      metadata: {
        previousStatus: 'pending_activation',
        newStatus: 'active',
        activatedAt: now,
      },
    });

    return updated;
  }

  async renewSubscription(
    id: string,
    dto: RenewSubscriptionDto,
    actor?: { id?: string; email?: string },
  ): Promise<SubscriptionRecord> {
    const sub = await this.getSubscriptionById(id);

    if (sub.status !== 'active' && sub.status !== 'trial') {
      throw new BadRequestError(
        `Subscription with status '${sub.status}' cannot be renewed. Only active or trialing subscriptions can be renewed.`,
      );
    }

    const now = new Date();
    const defaultDays = (sub.billingCycle === 'annual') ? 365 : (sub.billingCycle === 'quarterly') ? 90 : 30;
    const extensionDays = dto.periodDays || defaultDays;

    const baseStart = (sub.currentPeriodEndsAt && sub.currentPeriodEndsAt > now)
      ? sub.currentPeriodEndsAt
      : now;
    const newPeriodEndsAt = new Date(baseStart.getTime() + extensionDays * 86400000);

    const updated = await this.repo.update(id, {
      status: 'active',
      accessMode: 'paid', // Trial renewal transitions into paid active subscription
      currentPeriodStartsAt: baseStart,
      currentPeriodEndsAt: newPeriodEndsAt,
      renewsAt: newPeriodEndsAt,
    });

    try {
      await this.moduleRepo.setStatus(updated.tenantId, updated.applicationCode, 'enabled', null);
    } catch {}

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'subscription_renewed',
      targetType: 'subscription',
      targetId: id,
      tenantId: updated.tenantId,
      metadata: {
        previousPeriodEndsAt: sub.currentPeriodEndsAt,
        newPeriodEndsAt,
        extensionDays,
      },
    });

    return updated;
  }

  async cancelSubscription(
    id: string,
    dto: CancelSubscriptionDto,
    actor?: { id?: string; email?: string },
  ): Promise<SubscriptionRecord> {
    const sub = await this.getSubscriptionById(id);

    if (sub.status === 'cancelled') {
      throw new BadRequestError('Subscription is already cancelled');
    }
    if (sub.status === 'expired') {
      throw new BadRequestError('Subscription is already expired');
    }

    const now = new Date();
    const updated = await this.repo.update(id, {
      status: 'cancelled',
      cancelledAt: now,
      cancellationReason: dto.reason,
      autoRenew: false,
    });

    try {
      await this.moduleRepo.setStatus(updated.tenantId, updated.applicationCode, 'disabled', null);
    } catch {}

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'subscription_cancelled',
      targetType: 'subscription',
      targetId: id,
      tenantId: updated.tenantId,
      metadata: {
        reason: dto.reason,
        cancelledAt: now,
      },
    });

    return updated;
  }

  async updateSubscription(
    id: string,
    dto: UpdateSubscriptionDto,
    actor?: { id?: string; email?: string },
  ): Promise<SubscriptionRecord> {
    const sub = await this.getSubscriptionById(id);

    const updates: Partial<NewTenantSubscription> = {};

    if (dto.licensedSeats !== undefined) {
      const plan = await this.plans.getPlanById(sub.planId);
      if (dto.licensedSeats < plan.minSeats) {
        throw new BadRequestError(
          `Licensed seats cannot be less than plan minimum (${plan.minSeats})`,
        );
      }
      if (plan.maxSeats !== null && dto.licensedSeats > plan.maxSeats) {
        throw new BadRequestError(
          `Licensed seats cannot exceed plan maximum (${plan.maxSeats})`,
        );
      }
      const currentUsage = await this.repo.countActiveSeats(sub.tenantId);
      if (dto.licensedSeats < currentUsage) {
        throw new ConflictError(
          `Cannot reduce licensed seats to ${dto.licensedSeats}. Current active usage is ${currentUsage} seats.`,
        );
      }
      updates.licensedSeats = dto.licensedSeats;
    }

    if (dto.autoRenew !== undefined) {
      updates.autoRenew = dto.autoRenew;
    }
    if (dto.billingCycle !== undefined) {
      updates.billingCycle = dto.billingCycle;
    }

    const updated = await this.repo.update(id, updates);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'subscription_updated',
      targetType: 'subscription',
      targetId: id,
      tenantId: updated.tenantId,
      metadata: { changes: dto },
    });

    return updated;
  }
}

export const subscriptionService = new SubscriptionService();
