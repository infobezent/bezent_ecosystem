import { eq, and, or, like, desc } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { companies, tenants } from '../../../db/schema.js';
import type {
  CompanyFilter,
  CompanyRecord,
  CompanyStatus,
  CreateCompanyDto,
  UpdateCompanyDto,
} from '../types/company.types.js';
import { generateSurrogateId } from '../../auth/security.js';

export class CompanyRepository {
  async findById(id: string): Promise<CompanyRecord | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: companies.id,
        tenantId: companies.tenantId,
        tenantName: tenants.name,
        name: companies.name,
        code: companies.code,
        legalName: companies.legalName,
        businessEmail: companies.businessEmail,
        contactPhone: companies.contactPhone,
        country: companies.country,
        timeZone: companies.timeZone,
        status: companies.status,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .leftJoin(tenants, eq(companies.tenantId, tenants.id))
      .where(eq(companies.id, id));

    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenantId,
      tenantName: r.tenantName ?? undefined,
      name: r.name,
      code: r.code,
      legalName: r.legalName ?? null,
      businessEmail: r.businessEmail ?? null,
      contactPhone: r.contactPhone ?? null,
      country: r.country ?? null,
      timeZone: r.timeZone ?? null,
      status: r.status as CompanyStatus,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async findByTenantAndCode(tenantId: string, code: string): Promise<CompanyRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.code, code)));

    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      code: r.code,
      legalName: r.legalName ?? null,
      businessEmail: r.businessEmail ?? null,
      contactPhone: r.contactPhone ?? null,
      country: r.country ?? null,
      timeZone: r.timeZone ?? null,
      status: r.status as CompanyStatus,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateCompanyDto): Promise<CompanyRecord> {
    const db = getDb();
    const id = dto.id?.trim() || generateSurrogateId('comp');

    await db.insert(companies).values({
      id,
      tenantId: dto.tenantId,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      legalName: dto.legalName?.trim() || null,
      businessEmail: dto.businessEmail?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      country: dto.country?.trim() || null,
      timeZone: dto.timeZone?.trim() || null,
      status: dto.status ?? 'active',
    });

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to load created company');
    return created;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyRecord> {
    const db = getDb();
    const updateValues: Record<string, unknown> = {};

    if (dto.name !== undefined) updateValues.name = dto.name.trim();
    if (dto.legalName !== undefined)
      updateValues.legalName = dto.legalName ? dto.legalName.trim() : null;
    if (dto.businessEmail !== undefined)
      updateValues.businessEmail = dto.businessEmail ? dto.businessEmail.trim() : null;
    if (dto.contactPhone !== undefined)
      updateValues.contactPhone = dto.contactPhone ? dto.contactPhone.trim() : null;
    if (dto.country !== undefined) updateValues.country = dto.country ? dto.country.trim() : null;
    if (dto.timeZone !== undefined)
      updateValues.timeZone = dto.timeZone ? dto.timeZone.trim() : null;

    if (Object.keys(updateValues).length > 0) {
      await db.update(companies).set(updateValues).where(eq(companies.id, id));
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error('Company not found');
    return updated;
  }

  async updateStatus(id: string, status: CompanyStatus): Promise<CompanyRecord> {
    const db = getDb();
    await db.update(companies).set({ status }).where(eq(companies.id, id));
    const updated = await this.findById(id);
    if (!updated) throw new Error('Company not found');
    return updated;
  }

  async list(filter: CompanyFilter): Promise<{ items: CompanyRecord[]; total: number }> {
    const db = getDb();
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filter.tenantId) {
      conditions.push(eq(companies.tenantId, filter.tenantId));
    }
    if (filter.status) {
      conditions.push(eq(companies.status, filter.status));
    }
    if (filter.search) {
      const s = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(companies.name, s),
          like(companies.code, s),
          like(companies.legalName, s),
          like(companies.businessEmail, s),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: companies.id,
        tenantId: companies.tenantId,
        tenantName: tenants.name,
        name: companies.name,
        code: companies.code,
        legalName: companies.legalName,
        businessEmail: companies.businessEmail,
        contactPhone: companies.contactPhone,
        country: companies.country,
        timeZone: companies.timeZone,
        status: companies.status,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .leftJoin(tenants, eq(companies.tenantId, tenants.id))
      .where(whereClause)
      .orderBy(desc(companies.createdAt))
      .limit(limit)
      .offset(offset);

    const countRows = await db.select({ id: companies.id }).from(companies).where(whereClause);

    return {
      items: rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        tenantName: r.tenantName ?? undefined,
        name: r.name,
        code: r.code,
        legalName: r.legalName ?? null,
        businessEmail: r.businessEmail ?? null,
        contactPhone: r.contactPhone ?? null,
        country: r.country ?? null,
        timeZone: r.timeZone ?? null,
        status: r.status as CompanyStatus,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: countRows.length,
    };
  }

  async getCounts() {
    const db = getDb();
    const all = await db.select({ status: companies.status }).from(companies);
    const total = all.length;
    const active = all.filter((c) => c.status === 'active').length;
    return { total, active };
  }
}

export const companyRepository = new CompanyRepository();
