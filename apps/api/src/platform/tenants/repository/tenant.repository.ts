import { eq, like, or, and, desc, inArray, count } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  tenantDetails,
  companies,
  memberships,
  tenantModules,
  users,
} from '../../../db/schema.js';
import type {
  CompanyCapacitySummary,
  CreateTenantDto,
  TenantFilter,
  TenantRecord,
  TenantStatus,
  UpdateTenantDto,
} from '../types/tenant.types.js';
import { generateSurrogateId } from '../../auth/security.js';
import {
  evaluateCustomerHealth,
  evaluateSetupProgress,
  type EvaluationAdminInput,
  type EvaluationCompanyInput,
} from '../service/tenantHealth.js';

type DbClient =
  ReturnType<typeof getDb> | Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

export class TenantRepository {
  async findById(id: string): Promise<TenantRecord | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        maxCompanies: tenants.maxCompanies,
        status: tenants.status,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        code: tenantDetails.code,
        contactEmail: tenantDetails.contactEmail,
        contactPhone: tenantDetails.contactPhone,
      })
      .from(tenants)
      .leftJoin(tenantDetails, eq(tenants.id, tenantDetails.tenantId))
      .where(eq(tenants.id, id));

    const row = rows[0];
    if (!row) return null;

    const companyRows = await db
      .select({
        id: companies.id,
        name: companies.name,
        code: companies.code,
        status: companies.status,
      })
      .from(companies)
      .where(eq(companies.tenantId, id));

    const userRows = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.tenantId, id));

    const moduleRows = await db
      .select({ moduleCode: tenantModules.moduleCode, status: tenantModules.status })
      .from(tenantModules)
      .where(and(eq(tenantModules.tenantId, id), eq(tenantModules.status, 'enabled')));

    const adminRows = await db
      .select({
        userId: memberships.userId,
        companyId: memberships.companyId,
        status: memberships.status,
        email: users.email,
        lastLoginAt: users.lastLoginAt,
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.tenantId, id),
          eq(memberships.role, 'company_admin'),
          eq(memberships.status, 'active'),
        ),
      );

    const activeModules = Array.from(new Set(moduleRows.map((m) => m.moduleCode)));
    const tenantInput = {
      id: row.id,
      name: row.name,
      status: row.status as TenantStatus,
      createdAt: row.createdAt,
    };
    const health = evaluateCustomerHealth(tenantInput, companyRows, activeModules, adminRows);
    const setupProgress = evaluateSetupProgress(tenantInput, companyRows, activeModules, adminRows);

    const max = row.maxCompanies ?? 5;
    const used = companyRows.length;
    const remaining = Math.max(0, max - used);
    const companyCapacity: CompanyCapacitySummary = { used, max, remaining };

    return {
      id: row.id,
      name: row.name,
      code: row.code ?? row.id,
      maxCompanies: max,
      contactEmail: row.contactEmail ?? null,
      contactPhone: row.contactPhone ?? null,
      status: row.status as TenantStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      companyCount: companyRows.length,
      companies: companyRows,
      companyCapacity,
      userCount: userRows.length,
      activeModules,
      adminsCount: adminRows.length,
      health,
      setupProgress,
    };
  }

  async findByCode(code: string): Promise<TenantRecord | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        maxCompanies: tenants.maxCompanies,
        status: tenants.status,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        code: tenantDetails.code,
        contactEmail: tenantDetails.contactEmail,
        contactPhone: tenantDetails.contactPhone,
      })
      .from(tenants)
      .leftJoin(tenantDetails, eq(tenants.id, tenantDetails.tenantId))
      .where(or(eq(tenantDetails.code, code), eq(tenants.id, code)));

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      code: row.code ?? row.id,
      maxCompanies: row.maxCompanies ?? 5,
      contactEmail: row.contactEmail ?? null,
      contactPhone: row.contactPhone ?? null,
      status: row.status as TenantStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateTenantDto): Promise<TenantRecord> {
    const db = getDb();
    const tenantId = dto.id?.trim() || generateSurrogateId('tnt');
    const tenantCode = dto.code.trim();

    return await db.transaction(async (tx) => {
      await tx.insert(tenants).values({
        id: tenantId,
        name: dto.name.trim(),
        maxCompanies: dto.maxCompanies ?? 5,
        status: dto.status ?? 'active',
      });

      await tx.insert(tenantDetails).values({
        tenantId,
        code: tenantCode,
        contactEmail: dto.contactEmail?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
      });

      const [created] = await tx
        .select({
          id: tenants.id,
          name: tenants.name,
          maxCompanies: tenants.maxCompanies,
          status: tenants.status,
          createdAt: tenants.createdAt,
          updatedAt: tenants.updatedAt,
          code: tenantDetails.code,
          contactEmail: tenantDetails.contactEmail,
          contactPhone: tenantDetails.contactPhone,
        })
        .from(tenants)
        .leftJoin(tenantDetails, eq(tenants.id, tenantDetails.tenantId))
        .where(eq(tenants.id, tenantId));

      if (!created) throw new Error('Failed to create tenant');

      const tenantInput = {
        id: created.id,
        name: created.name,
        status: created.status as TenantStatus,
        createdAt: created.createdAt,
      };

      const max = created.maxCompanies ?? 5;
      return {
        id: created.id,
        name: created.name,
        code: created.code ?? created.id,
        maxCompanies: max,
        contactEmail: created.contactEmail ?? null,
        contactPhone: created.contactPhone ?? null,
        status: created.status as TenantStatus,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        companyCount: 0,
        companies: [],
        companyCapacity: { used: 0, max, remaining: max },
        userCount: 0,
        activeModules: [],
        adminsCount: 0,
        health: evaluateCustomerHealth(tenantInput, [], [], []),
        setupProgress: evaluateSetupProgress(tenantInput, [], [], []),
      };
    });
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantRecord> {
    const db = getDb();

    await db.transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.update(tenants).set({ name: dto.name.trim() }).where(eq(tenants.id, id));
      }

      const existingDetail = await tx
        .select()
        .from(tenantDetails)
        .where(eq(tenantDetails.tenantId, id));

      if (existingDetail.length > 0) {
        const updateValues: Record<string, unknown> = {};
        if (dto.contactEmail !== undefined) updateValues.contactEmail = dto.contactEmail;
        if (dto.contactPhone !== undefined) updateValues.contactPhone = dto.contactPhone;

        if (Object.keys(updateValues).length > 0) {
          await tx.update(tenantDetails).set(updateValues).where(eq(tenantDetails.tenantId, id));
        }
      } else {
        await tx.insert(tenantDetails).values({
          tenantId: id,
          code: id,
          contactEmail: dto.contactEmail ?? null,
          contactPhone: dto.contactPhone ?? null,
        });
      }
    });

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to load updated tenant');
    return updated;
  }

  async updateStatus(id: string, status: TenantStatus): Promise<TenantRecord> {
    const db = getDb();
    await db.update(tenants).set({ status }).where(eq(tenants.id, id));
    const updated = await this.findById(id);
    if (!updated) throw new Error('Tenant not found');
    return updated;
  }

  async list(filter: TenantFilter): Promise<{ items: TenantRecord[]; total: number }> {
    const db = getDb();
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filter.status) {
      conditions.push(eq(tenants.status, filter.status));
    }
    if (filter.search) {
      const s = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(tenants.name, s),
          like(tenants.id, s),
          like(tenantDetails.code, s),
          like(tenantDetails.contactEmail, s),
        ),
      );
    }
    if (filter.moduleCode) {
      const tenantIdsWithModule = db
        .select({ tenantId: tenantModules.tenantId })
        .from(tenantModules)
        .where(
          and(
            eq(
              tenantModules.moduleCode,
              filter.moduleCode as 'hrms' | 'crm' | 'project_management',
            ),
            eq(tenantModules.status, 'enabled'),
          ),
        );
      conditions.push(inArray(tenants.id, tenantIdsWithModule));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        maxCompanies: tenants.maxCompanies,
        status: tenants.status,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        code: tenantDetails.code,
        contactEmail: tenantDetails.contactEmail,
        contactPhone: tenantDetails.contactPhone,
      })
      .from(tenants)
      .leftJoin(tenantDetails, eq(tenants.id, tenantDetails.tenantId))
      .where(whereClause)
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset);

    const countRows = await db
      .select({ id: tenants.id })
      .from(tenants)
      .leftJoin(tenantDetails, eq(tenants.id, tenantDetails.tenantId))
      .where(whereClause);

    const tenantIds = rows.map((r) => r.id);
    const companyMap = new Map<string, EvaluationCompanyInput[]>();
    const userCountMap = new Map<string, number>();
    const moduleMap = new Map<string, string[]>();
    const adminMap = new Map<string, EvaluationAdminInput[]>();

    if (tenantIds.length > 0) {
      const allCompanies = await db
        .select({
          id: companies.id,
          tenantId: companies.tenantId,
          name: companies.name,
          code: companies.code,
          status: companies.status,
        })
        .from(companies)
        .where(inArray(companies.tenantId, tenantIds));

      for (const c of allCompanies) {
        const list = companyMap.get(c.tenantId) ?? [];
        list.push({ id: c.id, name: c.name, code: c.code, status: c.status });
        companyMap.set(c.tenantId, list);
      }

      const allMembers = await db
        .select({ tenantId: memberships.tenantId })
        .from(memberships)
        .where(inArray(memberships.tenantId, tenantIds));
      for (const m of allMembers) {
        userCountMap.set(m.tenantId, (userCountMap.get(m.tenantId) ?? 0) + 1);
      }

      const allModules = await db
        .select({
          tenantId: tenantModules.tenantId,
          moduleCode: tenantModules.moduleCode,
        })
        .from(tenantModules)
        .where(
          and(inArray(tenantModules.tenantId, tenantIds), eq(tenantModules.status, 'enabled')),
        );
      for (const m of allModules) {
        const list = moduleMap.get(m.tenantId) ?? [];
        if (!list.includes(m.moduleCode)) {
          list.push(m.moduleCode);
        }
        moduleMap.set(m.tenantId, list);
      }

      const allAdmins = await db
        .select({
          tenantId: memberships.tenantId,
          userId: memberships.userId,
          companyId: memberships.companyId,
          status: memberships.status,
          email: users.email,
          lastLoginAt: users.lastLoginAt,
        })
        .from(memberships)
        .leftJoin(users, eq(memberships.userId, users.id))
        .where(
          and(
            inArray(memberships.tenantId, tenantIds),
            eq(memberships.role, 'company_admin'),
            eq(memberships.status, 'active'),
          ),
        );
      for (const a of allAdmins) {
        const list = adminMap.get(a.tenantId) ?? [];
        list.push({
          userId: a.userId,
          companyId: a.companyId,
          status: a.status,
          email: a.email,
          lastLoginAt: a.lastLoginAt,
        });
        adminMap.set(a.tenantId, list);
      }
    }

    let items = rows.map((r) => {
      const comps = companyMap.get(r.id) ?? [];
      const mods = moduleMap.get(r.id) ?? [];
      const adms = adminMap.get(r.id) ?? [];
      const tenantInput = {
        id: r.id,
        name: r.name,
        status: r.status as TenantStatus,
        createdAt: r.createdAt,
      };

      const health = evaluateCustomerHealth(tenantInput, comps, mods, adms);
      const setupProgress = evaluateSetupProgress(tenantInput, comps, mods, adms);

      const max = r.maxCompanies ?? 5;
      const used = comps.length;
      const remaining = Math.max(0, max - used);

      return {
        id: r.id,
        name: r.name,
        code: r.code ?? r.id,
        maxCompanies: max,
        contactEmail: r.contactEmail ?? null,
        contactPhone: r.contactPhone ?? null,
        status: r.status as TenantStatus,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        companyCount: comps.length,
        companies: comps,
        companyCapacity: { used, max, remaining },
        userCount: userCountMap.get(r.id) ?? 0,
        activeModules: mods,
        adminsCount: adms.length,
        health,
        setupProgress,
      };
    });

    if (filter.attention) {
      items = items.filter((item) => item.health?.status === filter.attention);
    }

    return {
      items,
      total: filter.attention ? items.length : countRows.length,
    };
  }

  async getCounts() {
    const db = getDb();
    const all = await db.select({ status: tenants.status }).from(tenants);
    const total = all.length;
    const active = all.filter((t) => t.status === 'active').length;
    const suspended = all.filter((t) => t.status === 'suspended').length;
    return { total, active, suspended };
  }

  async countCapacityConsumingCompanies(tenantId: string, tx?: DbClient): Promise<number> {
    const client = (tx ?? getDb()) as ReturnType<typeof getDb>;
    const [row] = await client
      .select({ total: count() })
      .from(companies)
      .where(eq(companies.tenantId, tenantId));
    return Number(row?.total ?? 0);
  }

  async getCapacity(tenantId: string, tx?: DbClient): Promise<CompanyCapacitySummary> {
    const client = (tx ?? getDb()) as ReturnType<typeof getDb>;
    const [tenantRow] = await client
      .select({ maxCompanies: tenants.maxCompanies })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    const max = tenantRow?.maxCompanies ?? 5;
    const used = await this.countCapacityConsumingCompanies(tenantId, client);
    const remaining = Math.max(0, max - used);
    return { used, max, remaining };
  }

  async updateCapacity(
    tenantId: string,
    maxCompanies: number,
    tx?: DbClient,
  ): Promise<TenantRecord> {
    const client = (tx ?? getDb()) as ReturnType<typeof getDb>;
    await client.update(tenants).set({ maxCompanies }).where(eq(tenants.id, tenantId));
    const updated = await this.findById(tenantId);
    if (!updated) throw new Error('Tenant not found after capacity update');
    return updated;
  }
}

export const tenantRepository = new TenantRepository();
