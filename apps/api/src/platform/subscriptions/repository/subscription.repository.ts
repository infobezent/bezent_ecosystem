import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenantSubscriptions,
  plans,
  memberships,
  tenantAdmins,
  type TenantSubscription,
  type NewTenantSubscription,
} from '../../../db/schema.js';
import type {
  SubscriptionRecord,
  SubscriptionDetailRecord,
  SubscriptionFilter,
} from '../types/subscription.types.js';
import type { ApplicationCode } from '../../plans/types/plan.types.js';

export class SubscriptionRepository {
  async findById(id: string): Promise<SubscriptionDetailRecord | null> {
    const db = getDb();
    const [sub] = await db
      .select({
        subscription: tenantSubscriptions,
        planName: plans.name,
        planCode: plans.code,
        planTier: plans.tier,
      })
      .from(tenantSubscriptions)
      .leftJoin(plans, eq(tenantSubscriptions.planId, plans.id))
      .where(eq(tenantSubscriptions.id, id));

    if (!sub) return null;

    const seatsUsed = await this.countActiveSeats(sub.subscription.tenantId);

    return {
      ...this.mapRecord(sub.subscription),
      planName: sub.planName || 'Unknown Plan',
      planCode: sub.planCode || 'UNKNOWN',
      planTier: sub.planTier || 'custom',
      currentSeatsUsed: seatsUsed,
    };
  }

  async findActiveByTenantAndApp(
    tenantId: string,
    applicationCode: ApplicationCode,
  ): Promise<SubscriptionRecord | null> {
    const db = getDb();
    const [sub] = await db
      .select()
      .from(tenantSubscriptions)
      .where(
        and(
          eq(tenantSubscriptions.tenantId, tenantId),
          eq(tenantSubscriptions.applicationCode, applicationCode),
          inArray(tenantSubscriptions.status, ['active', 'trial']),
        ),
      );

    return sub ? this.mapRecord(sub) : null;
  }

  async list(filter: SubscriptionFilter): Promise<SubscriptionDetailRecord[]> {
    const db = getDb();
    const conditions = [];

    if (filter.tenantId) {
      conditions.push(eq(tenantSubscriptions.tenantId, filter.tenantId));
    }
    if (filter.applicationCode) {
      conditions.push(eq(tenantSubscriptions.applicationCode, filter.applicationCode));
    }
    if (filter.status) {
      conditions.push(eq(tenantSubscriptions.status, filter.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        subscription: tenantSubscriptions,
        planName: plans.name,
        planCode: plans.code,
        planTier: plans.tier,
      })
      .from(tenantSubscriptions)
      .leftJoin(plans, eq(tenantSubscriptions.planId, plans.id))
      .where(whereClause)
      .orderBy(desc(tenantSubscriptions.createdAt));

    // Get seats used per tenant in result
    const tenantIds = Array.from(new Set(rows.map((r) => r.subscription.tenantId)));
    const seatMap = new Map<string, number>();
    for (const tid of tenantIds) {
      seatMap.set(tid, await this.countActiveSeats(tid));
    }

    return rows.map((r) => ({
      ...this.mapRecord(r.subscription),
      planName: r.planName || 'Unknown Plan',
      planCode: r.planCode || 'UNKNOWN',
      planTier: r.planTier || 'custom',
      currentSeatsUsed: seatMap.get(r.subscription.tenantId) || 0,
    }));
  }

  async create(data: NewTenantSubscription): Promise<SubscriptionRecord> {
    const db = getDb();
    await db.insert(tenantSubscriptions).values(data);
    const [created] = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.id, data.id));
    return this.mapRecord(created!);
  }

  async update(id: string, updates: Partial<NewTenantSubscription>): Promise<SubscriptionRecord> {
    const db = getDb();
    await db
      .update(tenantSubscriptions)
      .set({
        ...updates,
        version: sql`${tenantSubscriptions.version} + 1`,
      })
      .where(eq(tenantSubscriptions.id, id));

    const [updated] = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.id, id));
    return this.mapRecord(updated!);
  }

  /**
   * Calculates distinct active users assigned across companies and tenant admins for a tenant.
   * Prevents double-counting users across multiple companies.
   */
  async countActiveSeats(tenantId: string): Promise<number> {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id) as total_seats
      FROM (
        SELECT user_id FROM memberships WHERE tenant_id = ${tenantId} AND status = 'active'
        UNION
        SELECT user_id FROM tenant_admins WHERE tenant_id = ${tenantId} AND status = 'active'
      ) as combined_users
    `);

    const rows = (result[0] as unknown as Array<{ total_seats: number | string }>) || [];
    const countVal = rows[0]?.total_seats;
    return typeof countVal === 'number' ? countVal : parseInt(String(countVal || '0'), 10);
  }

  private mapRecord(sub: TenantSubscription): SubscriptionRecord {
    return {
      id: sub.id,
      tenantId: sub.tenantId,
      companyId: sub.companyId,
      applicationCode: sub.applicationCode,
      planId: sub.planId,
      status: sub.status,
      accessMode: sub.accessMode,
      billingCycle: sub.billingCycle,
      licensedSeats: sub.licensedSeats,
      scheduledActivationAt: sub.scheduledActivationAt,
      activatedAt: sub.activatedAt,
      trialStartsAt: sub.trialStartsAt,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodStartsAt: sub.currentPeriodStartsAt,
      currentPeriodEndsAt: sub.currentPeriodEndsAt,
      cancelledAt: sub.cancelledAt,
      cancellationReason: sub.cancellationReason,
      renewsAt: sub.renewsAt,
      autoRenew: sub.autoRenew,
      version: sub.version,
      activeSubscriptionScope: sub.activeSubscriptionScope,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }
}

export const subscriptionRepository = new SubscriptionRepository();
