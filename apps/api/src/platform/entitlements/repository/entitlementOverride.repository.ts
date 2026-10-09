import { eq, and, isNull, gt, or, desc } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenantEntitlementOverrides,
  type TenantEntitlementOverride,
  type NewTenantEntitlementOverride,
} from '../../../db/schema.js';
import type {
  EntitlementOverrideRecord,
  ApplicationCode,
} from '../types/entitlement.types.js';

export class EntitlementOverrideRepository {
  async findById(id: string): Promise<EntitlementOverrideRecord | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(tenantEntitlementOverrides)
      .where(eq(tenantEntitlementOverrides.id, id));
    return row ? this.mapRow(row) : null;
  }

  async listActive(
    tenantId: string,
    applicationCode?: ApplicationCode,
  ): Promise<EntitlementOverrideRecord[]> {
    const db = getDb();
    const now = new Date();
    const conditions = [
      eq(tenantEntitlementOverrides.tenantId, tenantId),
      isNull(tenantEntitlementOverrides.revokedAt),
      or(
        isNull(tenantEntitlementOverrides.validUntil),
        gt(tenantEntitlementOverrides.validUntil, now),
      ),
    ];

    if (applicationCode) {
      conditions.push(eq(tenantEntitlementOverrides.applicationCode, applicationCode));
    }

    const rows = await db
      .select()
      .from(tenantEntitlementOverrides)
      .where(and(...conditions))
      .orderBy(desc(tenantEntitlementOverrides.createdAt));

    return rows.map((r) => this.mapRow(r));
  }

  async listAllByTenant(tenantId: string): Promise<EntitlementOverrideRecord[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(tenantEntitlementOverrides)
      .where(eq(tenantEntitlementOverrides.tenantId, tenantId))
      .orderBy(desc(tenantEntitlementOverrides.createdAt));

    return rows.map((r) => this.mapRow(r));
  }

  async create(data: NewTenantEntitlementOverride): Promise<EntitlementOverrideRecord> {
    const db = getDb();
    await db.insert(tenantEntitlementOverrides).values(data);
    const [row] = await db
      .select()
      .from(tenantEntitlementOverrides)
      .where(eq(tenantEntitlementOverrides.id, data.id));
    return this.mapRow(row!);
  }

  async revoke(
    id: string,
    revokedByUserId: string,
    revocationReason: string,
  ): Promise<EntitlementOverrideRecord> {
    const db = getDb();
    const now = new Date();
    await db
      .update(tenantEntitlementOverrides)
      .set({
        revokedAt: now,
        revokedByUserId,
        revocationReason,
      })
      .where(eq(tenantEntitlementOverrides.id, id));

    const [row] = await db
      .select()
      .from(tenantEntitlementOverrides)
      .where(eq(tenantEntitlementOverrides.id, id));
    return this.mapRow(row!);
  }

  private mapRow(r: TenantEntitlementOverride): EntitlementOverrideRecord {
    return {
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      applicationCode: r.applicationCode,
      moduleCode: r.moduleCode,
      overrideType: r.overrideType,
      overrideValue: r.overrideValue,
      reason: r.reason,
      authorizedByUserId: r.authorizedByUserId,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      revokedAt: r.revokedAt,
      revokedByUserId: r.revokedByUserId,
      revocationReason: r.revocationReason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

export const entitlementOverrideRepository = new EntitlementOverrideRepository();
