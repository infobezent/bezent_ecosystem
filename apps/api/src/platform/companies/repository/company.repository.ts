import { eq, and, or, like, desc, inArray, isNotNull } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  companies,
  tenants,
  tenantModules,
  memberships,
  users,
  type Company,
} from '../../../db/schema.js';
import type {
  CompanyFilter,
  CompanyRecord,
  CompanyStatus,
  CreateCompanyDto,
  UpdateCompanyDto,
  UpdateCompanyProfileInput,
} from '../types/company.types.js';
import { generateSurrogateId } from '../../auth/security.js';

export class CompanyRepository {
  private async enrichCompanies(
    companiesList: Array<{
      id: string;
      tenantId: string;
      tenantName?: string | null;
      name: string;
      code: string;
      legalName: string | null;
      businessEmail: string | null;
      contactPhone: string | null;
      country: string | null;
      timeZone: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): Promise<CompanyRecord[]> {
    if (companiesList.length === 0) return [];

    const db = getDb();
    const companyIds = companiesList.map((c) => c.id);
    const tenantIds = Array.from(new Set(companiesList.map((c) => c.tenantId)));

    // 1. Fetch tenant modules for these tenants
    const moduleRows = await db
      .select({
        id: tenantModules.id,
        tenantId: tenantModules.tenantId,
        companyId: tenantModules.companyId,
        moduleCode: tenantModules.moduleCode,
        status: tenantModules.status,
      })
      .from(tenantModules)
      .where(inArray(tenantModules.tenantId, tenantIds));

    // 2. Fetch active company admins for these companies
    const adminRows = await db
      .select({
        companyId: memberships.companyId,
        userId: users.id,
        lastLoginAt: users.lastLoginAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          inArray(memberships.companyId, companyIds),
          eq(memberships.role, 'company_admin'),
          eq(memberships.status, 'active'),
        ),
      );

    const adminsByCompany = new Map<string, typeof adminRows>();
    for (const a of adminRows) {
      if (!a.companyId) continue;
      const list = adminsByCompany.get(a.companyId) ?? [];
      list.push(a);
      adminsByCompany.set(a.companyId, list);
    }

    return companiesList.map((c) => {
      // Determine enabled modules respecting Tenant Entitlement Ceiling
      const tenantMods = moduleRows.filter(
        (m) => m.tenantId === c.tenantId && m.companyId === null,
      );
      const compMods = moduleRows.filter((m) => m.tenantId === c.tenantId && m.companyId === c.id);

      const allCodes: Array<'hrms' | 'crm' | 'project_management'> = [
        'hrms',
        'crm',
        'project_management',
      ];
      const enabledModules: string[] = [];

      for (const code of allCodes) {
        const tenantRecord = tenantMods.find((m) => m.moduleCode === code);
        const tenantEntitled =
          code === 'hrms'
            ? tenantRecord?.status !== 'disabled'
            : tenantRecord?.status === 'enabled';

        if (tenantEntitled) {
          const compRecord = compMods.find((m) => m.moduleCode === code);
          if (compRecord && compRecord.status === 'enabled') {
            enabledModules.push(code);
          }
        }
      }

      // Determine admin access
      const companyAdmins = adminsByCompany.get(c.id) ?? [];
      const adminsCount = companyAdmins.length;
      const activeAdminsCount = companyAdmins.filter((a) => a.lastLoginAt !== null).length;
      const pendingAdminsCount = companyAdmins.filter((a) => a.lastLoginAt === null).length;

      let adminAccessStatus: 'active' | 'pending' | 'none' = 'none';
      if (adminsCount > 0) {
        adminAccessStatus = activeAdminsCount > 0 ? 'active' : 'pending';
      }

      return {
        id: c.id,
        tenantId: c.tenantId,
        tenantName: c.tenantName ?? undefined,
        name: c.name,
        code: c.code,
        legalName: c.legalName ?? null,
        businessEmail: c.businessEmail ?? null,
        contactPhone: c.contactPhone ?? null,
        country: c.country ?? null,
        timeZone: c.timeZone ?? null,
        status: c.status as CompanyStatus,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        enabledModules,
        adminsCount,
        activeAdminsCount,
        pendingAdminsCount,
        adminAccessStatus,
      };
    });
  }

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
    const enriched = await this.enrichCompanies([r]);
    return enriched[0] ?? null;
  }

  async findByTenantAndCode(tenantId: string, code: string): Promise<CompanyRecord | null> {
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
      .where(and(eq(companies.tenantId, tenantId), eq(companies.code, code)));

    const r = rows[0];
    if (!r) return null;
    const enriched = await this.enrichCompanies([r]);
    return enriched[0] ?? null;
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
    if (filter.moduleCode) {
      const companyIdsWithModule = db
        .select({ companyId: tenantModules.companyId })
        .from(tenantModules)
        .where(
          and(
            eq(
              tenantModules.moduleCode,
              filter.moduleCode as 'hrms' | 'crm' | 'project_management',
            ),
            eq(tenantModules.status, 'enabled'),
            isNotNull(tenantModules.companyId),
          ),
        );
      conditions.push(inArray(companies.id, companyIdsWithModule));
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

    const enrichedItems = await this.enrichCompanies(rows);

    return {
      items: enrichedItems,
      total: countRows.length,
    };
  }

  async getCounts() {
    const db = getDb();
    const all = await db.select({ status: companies.status }).from(companies);
    const total = all.length;
    const active = all.filter((c) => c.status === 'active').length;
    const suspended = all.filter((c) => c.status === 'suspended').length;
    return { total, active, suspended };
  }

  async getCompanyProfile(companyId: string): Promise<Company | null> {
    const db = getDb();
    const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));
    return comp ?? null;
  }

  async updateCompanyProfile(
    companyId: string,
    input: UpdateCompanyProfileInput,
  ): Promise<Company> {
    const db = getDb();
    const updateSet: Partial<typeof companies.$inferInsert> = {};

    if (input.displayName !== undefined) updateSet.displayName = input.displayName;
    if (input.legalName !== undefined) updateSet.legalName = input.legalName;
    if (input.organizationType !== undefined) updateSet.organizationType = input.organizationType;
    if (input.industry !== undefined) updateSet.industry = input.industry;
    if (input.website !== undefined) updateSet.website = input.website;
    if (input.logoUrl !== undefined) updateSet.logoUrl = input.logoUrl;
    if (input.businessEmail !== undefined) updateSet.businessEmail = input.businessEmail;
    if (input.contactPhone !== undefined) updateSet.contactPhone = input.contactPhone;
    if (input.alternateEmail !== undefined) updateSet.alternateEmail = input.alternateEmail;
    if (input.alternatePhone !== undefined) updateSet.alternatePhone = input.alternatePhone;
    if (input.addressLine1 !== undefined) updateSet.addressLine1 = input.addressLine1;
    if (input.addressLine2 !== undefined) updateSet.addressLine2 = input.addressLine2;
    if (input.city !== undefined) updateSet.city = input.city;
    if (input.state !== undefined) updateSet.state = input.state;
    if (input.country !== undefined) updateSet.country = input.country;
    if (input.postalCode !== undefined) updateSet.postalCode = input.postalCode;
    if (input.timeZone !== undefined) updateSet.timeZone = input.timeZone;

    if (Object.keys(updateSet).length > 0) {
      await db.update(companies).set(updateSet).where(eq(companies.id, companyId));
    }

    const [updated] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!updated) throw new Error('Company not found after update');
    return updated;
  }
}

export const companyRepository = new CompanyRepository();
