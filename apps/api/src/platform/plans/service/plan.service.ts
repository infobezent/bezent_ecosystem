import { planRepository, PlanRepository } from '../repository/plan.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../app/errors/AppError.js';
import { generateSurrogateId } from '../../auth/security.js';
import type {
  PlanDetailRecord,
  PlanFilter,
  CreatePlanDto,
  UpdatePlanDto,
  CreatePlanPriceDto,
  UpdatePlanPriceDto,
  PlanPriceItem,
} from '../types/plan.types.js';
import type { NewPlan, NewPlanPrice, NewPlanEntitlement } from '../../../db/schema.js';

export class PlanService {
  constructor(
    private readonly repo: PlanRepository = planRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async listPlans(filter: PlanFilter = {}): Promise<PlanDetailRecord[]> {
    return this.repo.list(filter);
  }

  async getPlanById(id: string): Promise<PlanDetailRecord> {
    const plan = await this.repo.findById(id);
    if (!plan) {
      throw new NotFoundError(`Plan '${id}' not found`);
    }
    return plan;
  }

  async createPlan(
    dto: CreatePlanDto,
    actor?: { id?: string; email?: string },
  ): Promise<PlanDetailRecord> {
    const existing = await this.repo.findByCode(dto.applicationCode, dto.code);
    if (existing) {
      throw new ConflictError(
        `Plan with code '${dto.code}' already exists for application '${dto.applicationCode}'`,
      );
    }

    const planId = dto.id || generateSurrogateId('plan');

    const planData: NewPlan = {
      id: planId,
      applicationCode: dto.applicationCode,
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      tier: dto.tier,
      status: dto.status || 'active',
      defaultSeats: dto.defaultSeats ?? 10,
      minSeats: dto.minSeats ?? 1,
      maxSeats: dto.maxSeats ?? null,
      trialEligible: dto.trialEligible ?? true,
      trialDurationDays: dto.trialDurationDays ?? 14,
      isCustom: dto.isCustom ?? false,
    };

    const pricesData: NewPlanPrice[] = (dto.initialPrices || []).map((p) => ({
      id: generateSurrogateId('price'),
      planId,
      currency: p.currency.toUpperCase(),
      billingInterval: p.billingInterval,
      amountMinorUnits: p.amountMinorUnits,
      effectiveFrom: new Date(),
      status: 'active',
    }));

    const entitlementsData: NewPlanEntitlement[] = (dto.entitlements || []).map((e) => ({
      id: generateSurrogateId('ent'),
      planId,
      applicationCode: dto.applicationCode,
      moduleCode: e.moduleCode,
      isEnabled: e.isEnabled ?? true,
      limits: e.limits ?? null,
    }));

    const created = await this.repo.create(planData, pricesData, entitlementsData);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'plan_created',
      targetType: 'plan',
      targetId: created.id,
      metadata: {
        applicationCode: created.applicationCode,
        code: created.code,
        tier: created.tier,
        status: created.status,
      },
    });

    return created;
  }

  async updatePlan(
    id: string,
    dto: UpdatePlanDto,
    actor?: { id?: string; email?: string },
  ): Promise<PlanDetailRecord> {
    await this.getPlanById(id);

    const updates: Partial<NewPlan> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.tier !== undefined) updates.tier = dto.tier;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.defaultSeats !== undefined) updates.defaultSeats = dto.defaultSeats;
    if (dto.minSeats !== undefined) updates.minSeats = dto.minSeats;
    if (dto.maxSeats !== undefined) updates.maxSeats = dto.maxSeats;
    if (dto.trialEligible !== undefined) updates.trialEligible = dto.trialEligible;
    if (dto.trialDurationDays !== undefined) updates.trialDurationDays = dto.trialDurationDays;

    const updated = await this.repo.update(id, updates);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'plan_updated',
      targetType: 'plan',
      targetId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async addPrice(
    planId: string,
    dto: CreatePlanPriceDto,
    actor?: { id?: string; email?: string },
  ): Promise<PlanPriceItem> {
    const plan = await this.getPlanById(planId);

    // Business rule: Pricing cannot be negative
    if (dto.amountMinorUnits < 0) {
      throw new BadRequestError('Price amount in minor units cannot be negative');
    }

    const priceId = dto.id || generateSurrogateId('price');
    const priceData: NewPlanPrice = {
      id: priceId,
      planId: plan.id,
      currency: dto.currency.toUpperCase(),
      billingInterval: dto.billingInterval,
      amountMinorUnits: dto.amountMinorUnits,
      effectiveFrom: dto.effectiveFrom || new Date(),
      effectiveTo: dto.effectiveTo || null,
      status: dto.status || 'active',
    };

    const created = await this.repo.addPrice(priceData);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'plan_price_added',
      targetType: 'plan',
      targetId: planId,
      metadata: {
        priceId: created.id,
        currency: created.currency,
        billingInterval: created.billingInterval,
        amountMinorUnits: created.amountMinorUnits,
      },
    });

    return {
      id: created.id,
      planId: created.planId,
      currency: created.currency,
      billingInterval: created.billingInterval,
      amountMinorUnits: created.amountMinorUnits,
      effectiveFrom: created.effectiveFrom,
      effectiveTo: created.effectiveTo,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updatePrice(
    priceId: string,
    dto: UpdatePlanPriceDto,
    actor?: { id?: string; email?: string },
  ): Promise<PlanPriceItem> {
    const price = await this.repo.findPriceById(priceId);
    if (!price) {
      throw new NotFoundError(`Plan price '${priceId}' not found`);
    }

    const updates: Partial<NewPlanPrice> = {};
    if (dto.amountMinorUnits !== undefined) {
      if (dto.amountMinorUnits < 0) {
        throw new BadRequestError('Price amount cannot be negative');
      }
      updates.amountMinorUnits = dto.amountMinorUnits;
    }
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.effectiveTo !== undefined) updates.effectiveTo = dto.effectiveTo;

    const updated = await this.repo.updatePrice(priceId, updates);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'plan_price_updated',
      targetType: 'plan',
      targetId: updated.planId,
      metadata: { priceId, changes: dto },
    });

    return {
      id: updated.id,
      planId: updated.planId,
      currency: updated.currency,
      billingInterval: updated.billingInterval,
      amountMinorUnits: updated.amountMinorUnits,
      effectiveFrom: updated.effectiveFrom,
      effectiveTo: updated.effectiveTo,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Helper to validate if a commercial price is approved for paid activation.
   * Template prices with 0 amount are NOT treated as approved commercial offers unless explicitly approved.
   */
  async validatePriceForCommercialActivation(
    planId: string,
    currency: string,
    interval: string,
  ): Promise<{ approved: boolean; amountMinorUnits: number; reason?: string }> {
    const prices = await this.repo.listPricesByPlanId(planId);
    const matched = prices.find(
      (p) =>
        p.currency.toUpperCase() === currency.toUpperCase() &&
        p.billingInterval === interval &&
        p.status === 'active',
    );

    if (!matched) {
      return {
        approved: false,
        amountMinorUnits: 0,
        reason: `No active price configured for plan '${planId}' in currency '${currency}' and interval '${interval}'`,
      };
    }

    if (matched.amountMinorUnits === 0) {
      return {
        approved: false,
        amountMinorUnits: 0,
        reason: `Unapproved template pricing (amount = 0) cannot be used for commercial paid activation without authorized manual pricing agreement`,
      };
    }

    return {
      approved: true,
      amountMinorUnits: matched.amountMinorUnits,
    };
  }
}

export const planService = new PlanService();
