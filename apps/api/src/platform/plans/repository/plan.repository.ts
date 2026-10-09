import { eq, and, desc, like, or } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  plans,
  planPrices,
  planEntitlements,
  type Plan,
  type NewPlan,
  type PlanPrice,
  type NewPlanPrice,
  type PlanEntitlement,
  type NewPlanEntitlement,
} from '../../../db/schema.js';
import type {
  PlanDetailRecord,
  PlanFilter,
  PlanPriceItem,
  PlanEntitlementItem,
  ApplicationCode,
} from '../types/plan.types.js';

export class PlanRepository {
  async findById(id: string): Promise<PlanDetailRecord | null> {
    const db = getDb();
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    if (!plan) return null;

    const prices = await db
      .select()
      .from(planPrices)
      .where(eq(planPrices.planId, id))
      .orderBy(desc(planPrices.effectiveFrom));

    const entitlements = await db
      .select()
      .from(planEntitlements)
      .where(eq(planEntitlements.planId, id));

    return this.mapToDetail(plan, prices, entitlements);
  }

  async findByCode(applicationCode: ApplicationCode, code: string): Promise<PlanDetailRecord | null> {
    const db = getDb();
    const [plan] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.applicationCode, applicationCode), eq(plans.code, code)));

    if (!plan) return null;

    const prices = await db
      .select()
      .from(planPrices)
      .where(eq(planPrices.planId, plan.id))
      .orderBy(desc(planPrices.effectiveFrom));

    const entitlements = await db
      .select()
      .from(planEntitlements)
      .where(eq(planEntitlements.planId, plan.id));

    return this.mapToDetail(plan, prices, entitlements);
  }

  async list(filter: PlanFilter = {}): Promise<PlanDetailRecord[]> {
    const db = getDb();
    const conditions = [];

    if (filter.applicationCode) {
      conditions.push(eq(plans.applicationCode, filter.applicationCode));
    }
    if (filter.status) {
      conditions.push(eq(plans.status, filter.status));
    }
    if (filter.tier) {
      conditions.push(eq(plans.tier, filter.tier));
    }
    if (filter.search) {
      conditions.push(
        or(like(plans.name, `%${filter.search}%`), like(plans.code, `%${filter.search}%`)),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const planRows = await db
      .select()
      .from(plans)
      .where(whereClause)
      .orderBy(desc(plans.createdAt));

    if (planRows.length === 0) return [];

    const allPrices = await db.select().from(planPrices);
    const allEntitlements = await db.select().from(planEntitlements);

    return planRows.map((p) => {
      const pPrices = allPrices.filter((pr) => pr.planId === p.id);
      const pEntitlements = allEntitlements.filter((e) => e.planId === p.id);
      return this.mapToDetail(p, pPrices, pEntitlements);
    });
  }

  async create(
    planData: NewPlan,
    pricesData: NewPlanPrice[] = [],
    entitlementsData: NewPlanEntitlement[] = [],
  ): Promise<PlanDetailRecord> {
    const db = getDb();

    await db.transaction(async (tx) => {
      await tx.insert(plans).values(planData);
      if (pricesData.length > 0) {
        await tx.insert(planPrices).values(pricesData);
      }
      if (entitlementsData.length > 0) {
        await tx.insert(planEntitlements).values(entitlementsData);
      }
    });

    const result = await this.findById(planData.id);
    if (!result) {
      throw new Error(`Failed to retrieve newly created plan '${planData.id}'`);
    }
    return result;
  }

  async update(id: string, updates: Partial<NewPlan>): Promise<PlanDetailRecord> {
    const db = getDb();
    await db.update(plans).set(updates).where(eq(plans.id, id));
    const result = await this.findById(id);
    if (!result) {
      throw new Error(`Failed to retrieve updated plan '${id}'`);
    }
    return result;
  }

  async findPriceById(priceId: string): Promise<PlanPrice | null> {
    const db = getDb();
    const [price] = await db.select().from(planPrices).where(eq(planPrices.id, priceId));
    return price || null;
  }

  async addPrice(priceData: NewPlanPrice): Promise<PlanPrice> {
    const db = getDb();
    await db.insert(planPrices).values(priceData);
    const [price] = await db.select().from(planPrices).where(eq(planPrices.id, priceData.id));
    return price!;
  }

  async updatePrice(priceId: string, updates: Partial<NewPlanPrice>): Promise<PlanPrice> {
    const db = getDb();
    await db.update(planPrices).set(updates).where(eq(planPrices.id, priceId));
    const [price] = await db.select().from(planPrices).where(eq(planPrices.id, priceId));
    return price!;
  }

  async listPricesByPlanId(planId: string): Promise<PlanPrice[]> {
    const db = getDb();
    return db
      .select()
      .from(planPrices)
      .where(eq(planPrices.planId, planId))
      .orderBy(desc(planPrices.effectiveFrom));
  }

  async addEntitlement(entitlementData: NewPlanEntitlement): Promise<PlanEntitlement> {
    const db = getDb();
    await db.insert(planEntitlements).values(entitlementData);
    const [entitlement] = await db
      .select()
      .from(planEntitlements)
      .where(eq(planEntitlements.id, entitlementData.id));
    return entitlement!;
  }

  async updateEntitlement(
    id: string,
    updates: Partial<NewPlanEntitlement>,
  ): Promise<PlanEntitlement> {
    const db = getDb();
    await db.update(planEntitlements).set(updates).where(eq(planEntitlements.id, id));
    const [entitlement] = await db
      .select()
      .from(planEntitlements)
      .where(eq(planEntitlements.id, id));
    return entitlement!;
  }

  async deleteEntitlement(id: string): Promise<void> {
    const db = getDb();
    await db.delete(planEntitlements).where(eq(planEntitlements.id, id));
  }

  private mapToDetail(
    plan: Plan,
    prices: PlanPrice[],
    entitlements: PlanEntitlement[],
  ): PlanDetailRecord {
    const mappedPrices: PlanPriceItem[] = prices.map((pr) => ({
      id: pr.id,
      planId: pr.planId,
      currency: pr.currency,
      billingInterval: pr.billingInterval,
      amountMinorUnits: pr.amountMinorUnits,
      effectiveFrom: pr.effectiveFrom,
      effectiveTo: pr.effectiveTo,
      status: pr.status,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
    }));

    const mappedEntitlements: PlanEntitlementItem[] = entitlements.map((e) => ({
      id: e.id,
      planId: e.planId,
      applicationCode: e.applicationCode,
      moduleCode: e.moduleCode,
      isEnabled: e.isEnabled,
      limits: e.limits,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return {
      id: plan.id,
      applicationCode: plan.applicationCode,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      tier: plan.tier,
      status: plan.status,
      version: plan.version,
      defaultSeats: plan.defaultSeats,
      minSeats: plan.minSeats,
      maxSeats: plan.maxSeats,
      trialEligible: plan.trialEligible,
      trialDurationDays: plan.trialDurationDays,
      isCustom: plan.isCustom,
      prices: mappedPrices,
      entitlements: mappedEntitlements,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}

export const planRepository = new PlanRepository();
