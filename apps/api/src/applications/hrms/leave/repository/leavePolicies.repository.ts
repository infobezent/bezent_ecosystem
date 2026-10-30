import { eq, and, sql, desc, or, like, inArray, ne, lt, lte, isNull, gte } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  companies,
  departments,
  employees,
  leavePolicies,
  leavePolicyEntitlements,
  leaveTypes,
  locations,
  type LeavePolicyRecord,
  type LeaveTypeRecord,
  type NewLeavePolicyRecord,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { localDateInTimezone } from '../rules/leaveValidation.js';
import type {
  LeavePoliciesQuery,
  LeavePolicyView,
  PolicyEntitlementInput,
  PolicyEntitlementView,
  PolicyScope,
  PolicyStatus,
} from '../types/leavePolicies.types.js';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const IN_FORCE_STATUSES: PolicyStatus[] = ['active', 'scheduled'];

function toNumberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function affectedRows(result: unknown): number {
  const [header] = result as [{ affectedRows?: number }, unknown];
  return header?.affectedRows ?? 0;
}

export class LeavePoliciesRepository {
  async findMany(
    tenantId: string,
    companyId: string,
    query: LeavePoliciesQuery,
  ): Promise<{ items: LeavePolicyView[]; total: number }> {
    const db = getDb();
    const conditions = [
      eq(leavePolicies.tenantId, tenantId),
      eq(leavePolicies.companyId, companyId),
    ];

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      const codeTerm = `%${query.search.trim().toUpperCase()}%`;
      conditions.push(
        or(
          like(sql`LOWER(${leavePolicies.name})`, term),
          like(sql`UPPER(${leavePolicies.code})`, codeTerm),
        )!,
      );
    }
    if (query.status && query.status !== 'all') {
      conditions.push(eq(leavePolicies.status, query.status));
    }
    if (query.scope && query.scope !== 'all') {
      conditions.push(eq(leavePolicies.scope, query.scope));
    }

    const whereClause = and(...conditions);
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leavePolicies)
      .where(whereClause);
    const total = Number(countRow?.count || 0);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const rows = await db
      .select()
      .from(leavePolicies)
      .where(whereClause)
      .orderBy(desc(leavePolicies.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return { items: await this.attachEntitlements(rows), total };
  }

  async getStatusCounts(
    tenantId: string,
    companyId: string,
  ): Promise<{
    total: number;
    active: number;
    draft: number;
    scheduled: number;
    archived: number;
  }> {
    const db = getDb();
    const [row] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${leavePolicies.status} = 'active' then 1 else 0 end)`,
        draft: sql<number>`sum(case when ${leavePolicies.status} = 'draft' then 1 else 0 end)`,
        scheduled: sql<number>`sum(case when ${leavePolicies.status} = 'scheduled' then 1 else 0 end)`,
        archived: sql<number>`sum(case when ${leavePolicies.status} = 'archived' then 1 else 0 end)`,
      })
      .from(leavePolicies)
      .where(and(eq(leavePolicies.tenantId, tenantId), eq(leavePolicies.companyId, companyId)));

    return {
      total: Number(row?.total || 0),
      active: Number(row?.active || 0),
      draft: Number(row?.draft || 0),
      scheduled: Number(row?.scheduled || 0),
      archived: Number(row?.archived || 0),
    };
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<LeavePolicyView | null> {
    const db = getDb();
    const [record] = await db
      .select()
      .from(leavePolicies)
      .where(
        and(
          eq(leavePolicies.tenantId, tenantId),
          eq(leavePolicies.companyId, companyId),
          eq(leavePolicies.id, id),
        ),
      )
      .limit(1);
    if (!record) return null;
    const [view] = await this.attachEntitlements([record]);
    return view!;
  }

  async findByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<LeavePolicyRecord | null> {
    const db = getDb();
    const [record] = await db
      .select()
      .from(leavePolicies)
      .where(
        and(
          eq(leavePolicies.tenantId, tenantId),
          eq(leavePolicies.companyId, companyId),
          eq(leavePolicies.code, code.toUpperCase()),
        ),
      )
      .limit(1);
    return record || null;
  }

  async findByName(
    tenantId: string,
    companyId: string,
    name: string,
  ): Promise<LeavePolicyRecord | null> {
    const db = getDb();
    const [record] = await db
      .select()
      .from(leavePolicies)
      .where(
        and(
          eq(leavePolicies.tenantId, tenantId),
          eq(leavePolicies.companyId, companyId),
          eq(sql`LOWER(${leavePolicies.name})`, name.toLowerCase()),
        ),
      )
      .limit(1);
    return record || null;
  }

  /**
   * Finds an active or scheduled policy with the same scope + scope id whose dates overlap.
   * Different scope ids (e.g. two departments) never conflict.
   */
  async findOverlappingScope(
    tenantId: string,
    companyId: string,
    scope: PolicyScope,
    scopeId: string | null,
    effectiveFrom: string,
    effectiveTo: string | null,
    excludeId?: string,
  ): Promise<LeavePolicyRecord | null> {
    const db = getDb();
    const conditions = [
      eq(leavePolicies.tenantId, tenantId),
      eq(leavePolicies.companyId, companyId),
      inArray(leavePolicies.status, IN_FORCE_STATUSES),
      eq(leavePolicies.scope, scope),
      scopeId
        ? eq(leavePolicies.scopeId, scopeId)
        : sql`(${leavePolicies.scopeId} IS NULL OR ${leavePolicies.scopeId} = '')`,
      sql`(${leavePolicies.effectiveTo} IS NULL OR ${leavePolicies.effectiveTo} >= ${effectiveFrom})`,
    ];
    if (effectiveTo) {
      conditions.push(lte(leavePolicies.effectiveFrom, effectiveTo));
    }
    if (excludeId) {
      conditions.push(ne(leavePolicies.id, excludeId));
    }

    const [record] = await db
      .select()
      .from(leavePolicies)
      .where(and(...conditions))
      .limit(1);
    return record || null;
  }

  async createWithEntitlements(
    record: NewLeavePolicyRecord,
    entitlements: PolicyEntitlementInput[],
  ): Promise<LeavePolicyView> {
    await getDb().transaction(async (tx) => {
      await tx.insert(leavePolicies).values(record);
      await this.replaceEntitlements(
        tx,
        record.tenantId,
        record.companyId,
        record.id,
        entitlements,
      );
    });
    return (await this.findById(record.tenantId, record.companyId, record.id))!;
  }

  /** Updates the policy row and, when given, replaces its entitlements atomically. */
  async updateWithEntitlements(
    tenantId: string,
    companyId: string,
    id: string,
    payload: Partial<NewLeavePolicyRecord>,
    entitlements?: PolicyEntitlementInput[],
  ): Promise<LeavePolicyView> {
    await getDb().transaction(async (tx) => {
      if (Object.keys(payload).length > 0) {
        await tx
          .update(leavePolicies)
          .set(payload)
          .where(
            and(
              eq(leavePolicies.tenantId, tenantId),
              eq(leavePolicies.companyId, companyId),
              eq(leavePolicies.id, id),
            ),
          );
      }
      if (entitlements) {
        await this.replaceEntitlements(tx, tenantId, companyId, id, entitlements);
      }
    });
    return (await this.findById(tenantId, companyId, id))!;
  }

  private async replaceEntitlements(
    tx: Tx,
    tenantId: string,
    companyId: string,
    policyId: string,
    entitlements: PolicyEntitlementInput[],
  ): Promise<void> {
    await tx.delete(leavePolicyEntitlements).where(eq(leavePolicyEntitlements.policyId, policyId));
    if (entitlements.length > 0) {
      await tx.insert(leavePolicyEntitlements).values(
        entitlements.map((e) => ({
          id: generateSurrogateId('lpe'),
          tenantId,
          companyId,
          policyId,
          leaveTypeId: e.leaveTypeId,
          annualQuota:
            e.annualQuota === null || e.annualQuota === undefined ? null : e.annualQuota.toFixed(2),
          maxPerYearOverride:
            e.maxPerYearOverride === null || e.maxPerYearOverride === undefined
              ? null
              : e.maxPerYearOverride.toFixed(2),
        })),
      );
    }
    // Keep the deprecated JSON mirror in sync for read compatibility until P2 drops it.
    await tx
      .update(leavePolicies)
      .set({ linkedLeaveTypeIds: entitlements.map((e) => e.leaveTypeId) })
      .where(eq(leavePolicies.id, policyId));
  }

  async updateStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: PolicyStatus,
  ): Promise<LeavePolicyView> {
    return this.updateWithEntitlements(tenantId, companyId, id, {
      status,
      isActive: IN_FORCE_STATUSES.includes(status),
    });
  }

  private async attachEntitlements(rows: LeavePolicyRecord[]): Promise<LeavePolicyView[]> {
    if (rows.length === 0) return [];
    const db = getDb();
    const ents = await db
      .select({
        policyId: leavePolicyEntitlements.policyId,
        leaveTypeId: leavePolicyEntitlements.leaveTypeId,
        annualQuota: leavePolicyEntitlements.annualQuota,
        maxPerYearOverride: leavePolicyEntitlements.maxPerYearOverride,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        isTracked: leaveTypes.isTracked,
      })
      .from(leavePolicyEntitlements)
      .innerJoin(leaveTypes, eq(leaveTypes.id, leavePolicyEntitlements.leaveTypeId))
      .where(
        inArray(
          leavePolicyEntitlements.policyId,
          rows.map((r) => r.id),
        ),
      );

    const byPolicy = new Map<string, PolicyEntitlementView[]>();
    for (const e of ents) {
      const list = byPolicy.get(e.policyId) ?? [];
      list.push({
        leaveTypeId: e.leaveTypeId,
        leaveTypeName: e.leaveTypeName,
        leaveTypeCode: e.leaveTypeCode,
        isTracked: e.isTracked,
        annualQuota: toNumberOrNull(e.annualQuota),
        maxPerYearOverride: toNumberOrNull(e.maxPerYearOverride),
      });
      byPolicy.set(e.policyId, list);
    }
    return rows.map((r) => ({ ...r, entitlements: byPolicy.get(r.id) ?? [] }));
  }

  // ── Lookups used for validation ────────────────────────────────────────────

  async findLeaveTypesByIds(
    tenantId: string,
    companyId: string,
    ids: string[],
  ): Promise<LeaveTypeRecord[]> {
    if (ids.length === 0) return [];
    return getDb()
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.isArchived, false),
          inArray(leaveTypes.id, ids),
        ),
      );
  }

  async findDepartmentName(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<string | null> {
    const [row] = await getDb()
      .select({ name: departments.name })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          eq(departments.id, id),
          eq(departments.status, 'active'),
        ),
      );
    return row?.name ?? null;
  }

  async findLocationName(tenantId: string, companyId: string, id: string): Promise<string | null> {
    const [row] = await getDb()
      .select({ name: locations.name })
      .from(locations)
      .where(
        and(
          eq(locations.tenantId, tenantId),
          eq(locations.companyId, companyId),
          eq(locations.id, id),
          eq(locations.status, 'active'),
        ),
      );
    return row?.name ?? null;
  }

  /** Active or scheduled policies linking the leave type (for deactivation warnings). */
  async findInForcePoliciesLinkingLeaveType(
    tenantId: string,
    companyId: string,
    leaveTypeId: string,
  ): Promise<Array<{ id: string; name: string; code: string; status: string }>> {
    return getDb()
      .select({
        id: leavePolicies.id,
        name: leavePolicies.name,
        code: leavePolicies.code,
        status: leavePolicies.status,
      })
      .from(leavePolicyEntitlements)
      .innerJoin(leavePolicies, eq(leavePolicies.id, leavePolicyEntitlements.policyId))
      .where(
        and(
          eq(leavePolicies.tenantId, tenantId),
          eq(leavePolicies.companyId, companyId),
          eq(leavePolicyEntitlements.leaveTypeId, leaveTypeId),
          inArray(leavePolicies.status, IN_FORCE_STATUSES),
        ),
      );
  }

  // ── Resolution & lifecycle ─────────────────────────────────────────────────

  /** Active/scheduled policies whose date range covers `date` (status sweeps may lag). */
  async findPoliciesInForceOn(
    tenantId: string,
    companyId: string,
    date: string,
  ): Promise<LeavePolicyRecord[]> {
    return getDb()
      .select()
      .from(leavePolicies)
      .where(
        and(
          eq(leavePolicies.tenantId, tenantId),
          eq(leavePolicies.companyId, companyId),
          inArray(leavePolicies.status, IN_FORCE_STATUSES),
          lte(leavePolicies.effectiveFrom, date),
          or(isNull(leavePolicies.effectiveTo), gte(leavePolicies.effectiveTo, date)),
        ),
      );
  }

  async findEmployeesForResolution(
    tenantId: string,
    companyId: string,
  ): Promise<
    Array<{
      id: string;
      departmentId: string | null;
      locationId: string | null;
      employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
    }>
  > {
    return getDb()
      .select({
        id: employees.id,
        departmentId: employees.departmentId,
        locationId: employees.locationId,
        employmentType: employees.employmentType,
      })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          inArray(employees.employmentStatus, ['active', 'probation', 'notice']),
        ),
      );
  }

  async getCompanyTimezone(tenantId: string, companyId: string): Promise<string | null> {
    const [row] = await getDb()
      .select({ timeZone: companies.timeZone })
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.id, companyId)));
    return row?.timeZone ?? null;
  }

  /**
   * Applies date-driven lifecycle transitions in each company's local date:
   * scheduled → active once `effective_from` is reached, and active/scheduled → archived once
   * `effective_to` has passed. Idempotent.
   */
  async runLifecycleSweep(
    options: { tenantId?: string; companyId?: string; now?: Date } = {},
  ): Promise<{ activated: number; archived: number }> {
    const db = getDb();
    const companyConditions = [];
    if (options.tenantId) companyConditions.push(eq(leavePolicies.tenantId, options.tenantId));
    if (options.companyId) companyConditions.push(eq(leavePolicies.companyId, options.companyId));

    const targets = await db
      .selectDistinct({
        tenantId: leavePolicies.tenantId,
        companyId: leavePolicies.companyId,
        timeZone: companies.timeZone,
      })
      .from(leavePolicies)
      .innerJoin(companies, eq(companies.id, leavePolicies.companyId))
      .where(and(inArray(leavePolicies.status, IN_FORCE_STATUSES), ...companyConditions));

    let activated = 0;
    let archived = 0;
    for (const t of targets) {
      const today = localDateInTimezone(t.timeZone, options.now);
      const scope = and(
        eq(leavePolicies.tenantId, t.tenantId),
        eq(leavePolicies.companyId, t.companyId),
      );

      const archivedRes = await db
        .update(leavePolicies)
        .set({ status: 'archived', isActive: false })
        .where(
          and(
            scope,
            inArray(leavePolicies.status, IN_FORCE_STATUSES),
            lt(leavePolicies.effectiveTo, today),
          ),
        );
      const activatedRes = await db
        .update(leavePolicies)
        .set({ status: 'active', isActive: true })
        .where(
          and(
            scope,
            eq(leavePolicies.status, 'scheduled'),
            lte(leavePolicies.effectiveFrom, today),
          ),
        );
      archived += affectedRows(archivedRes);
      activated += affectedRows(activatedRes);
    }
    return { activated, archived };
  }
}

export const leavePoliciesRepository = new LeavePoliciesRepository();
