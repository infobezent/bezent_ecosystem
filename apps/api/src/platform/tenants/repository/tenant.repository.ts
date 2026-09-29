import { eq, like, or, and, desc, inArray } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  tenantDetails,
  companies,
  memberships,
  tenantModules,
} from '../../../db/schema.js';
import type {
  CreateTenantDto,
  TenantFilter,
  TenantRecord,
  TenantStatus,
  UpdateTenantDto,
} from '../types/tenant.types.js';
import { generateSurrogateId } from '../../auth/security.js';

export class TenantRepository {
  async findById(id: string): Promise<TenantRecord | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
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
      .select({ id: companies.id })
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

    return {
      id: row.id,
      name: row.name,
      code: row.code ?? row.id,
      contactEmail: row.contactEmail ?? null,
      contactPhone: row.contactPhone ?? null,
      status: row.status as TenantStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      companyCount: companyRows.length,
      userCount: userRows.length,
      activeModules: moduleRows.map((m) => m.moduleCode),
    };
  }

  async findByCode(code: string): Promise<TenantRecord | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
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

      return {
        id: created.id,
        name: created.name,
        code: created.code ?? created.id,
        contactEmail: created.contactEmail ?? null,
        contactPhone: created.contactPhone ?? null,
        status: created.status as TenantStatus,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        companyCount: 0,
        userCount: 0,
        activeModules: [],
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
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

    // Fetch counts for the returned page
    const tenantIds = rows.map((r) => r.id);
    const companyCountMap = new Map<string, number>();
    const userCountMap = new Map<string, number>();

    if (tenantIds.length > 0) {
      const allCompanies = await db
        .select({ tenantId: companies.tenantId })
        .from(companies)
        .where(inArray(companies.tenantId, tenantIds));
      for (const c of allCompanies) {
        companyCountMap.set(c.tenantId, (companyCountMap.get(c.tenantId) ?? 0) + 1);
      }

      const allMembers = await db
        .select({ tenantId: memberships.tenantId })
        .from(memberships)
        .where(inArray(memberships.tenantId, tenantIds));
      for (const m of allMembers) {
        userCountMap.set(m.tenantId, (userCountMap.get(m.tenantId) ?? 0) + 1);
      }
    }

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code ?? r.id,
        contactEmail: r.contactEmail ?? null,
        contactPhone: r.contactPhone ?? null,
        status: r.status as TenantStatus,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        companyCount: companyCountMap.get(r.id) ?? 0,
        userCount: userCountMap.get(r.id) ?? 0,
      })),
      total: countRows.length,
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
}

export const tenantRepository = new TenantRepository();
