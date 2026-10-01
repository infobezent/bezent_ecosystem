import { randomUUID } from 'node:crypto';
import { eq, and, sql, asc, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { getDb } from '../../../../db/connection.js';
import {
  businessUnits,
  divisions,
  employees,
  designations,
  type BusinessUnit,
  type Division,
} from '../../../../db/schema.js';
import type {
  BusinessUnitRecord,
  DivisionRecord,
  CompanySummary,
  EligibleHead,
  CreateBusinessUnitDto,
  UpdateBusinessUnitDto,
  CreateDivisionDto,
  UpdateDivisionDto,
  StructuralStatus,
} from '../types/structure.types.js';

import { OrganizationRepository } from './organization.repository.js';

const buHead = alias(employees, 'bu_head');
const divHead = alias(employees, 'div_head');

export class OrganizationStructureRepository {
  constructor(private readonly orgRepo = new OrganizationRepository()) {}

  async getCompanySummary(tenantId: string, companyId: string): Promise<CompanySummary | null> {
    const profile = await this.orgRepo.getProfile(tenantId, companyId);
    if (!profile) return null;

    return {
      id: profile.id,
      tenantId: profile.tenantId,
      name: profile.name,
      code: profile.code,
      displayName: profile.displayName,
      organizationType: profile.organizationType,
      industry: profile.industry,
      website: profile.website,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      postalCode: profile.postalCode,
    };
  }

  async listBusinessUnits(tenantId: string, companyId: string): Promise<BusinessUnitRecord[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: businessUnits.id,
        tenantId: businessUnits.tenantId,
        companyId: businessUnits.companyId,
        name: businessUnits.name,
        code: businessUnits.code,
        description: businessUnits.description,
        headEmployeeId: businessUnits.headEmployeeId,
        headFirstName: buHead.firstName,
        headLastName: buHead.lastName,
        headEmployeeNumber: buHead.employeeNumber,
        status: businessUnits.status,
        createdAt: businessUnits.createdAt,
        updatedAt: businessUnits.updatedAt,
      })
      .from(businessUnits)
      .leftJoin(buHead, eq(businessUnits.headEmployeeId, buHead.id))
      .where(and(eq(businessUnits.tenantId, tenantId), eq(businessUnits.companyId, companyId)))
      .orderBy(asc(businessUnits.name));

    // Calculate division count for each BU
    const divisionCounts = await db
      .select({
        businessUnitId: divisions.businessUnitId,
        count: sql<number>`count(${divisions.id})`.as('count'),
      })
      .from(divisions)
      .where(and(eq(divisions.tenantId, tenantId), eq(divisions.companyId, companyId)))
      .groupBy(divisions.businessUnitId);

    const countMap = new Map<string, number>();
    for (const dc of divisionCounts) {
      countMap.set(dc.businessUnitId, Number(dc.count) || 0);
    }

    return rows.map((r) => {
      const headName = r.headFirstName
        ? `${r.headFirstName} ${r.headLastName ?? ''}`.trim()
        : null;

      return {
        id: r.id,
        tenantId: r.tenantId,
        companyId: r.companyId,
        name: r.name,
        code: r.code,
        description: r.description,
        headEmployeeId: r.headEmployeeId,
        headEmployeeName: headName,
        headEmployeeNumber: r.headEmployeeNumber ?? null,
        status: r.status as StructuralStatus,
        divisionCount: countMap.get(r.id) ?? 0,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
      };
    });
  }

  async findBusinessUnitById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<BusinessUnitRecord | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: businessUnits.id,
        tenantId: businessUnits.tenantId,
        companyId: businessUnits.companyId,
        name: businessUnits.name,
        code: businessUnits.code,
        description: businessUnits.description,
        headEmployeeId: businessUnits.headEmployeeId,
        headFirstName: buHead.firstName,
        headLastName: buHead.lastName,
        headEmployeeNumber: buHead.employeeNumber,
        status: businessUnits.status,
        createdAt: businessUnits.createdAt,
        updatedAt: businessUnits.updatedAt,
      })
      .from(businessUnits)
      .leftJoin(buHead, eq(businessUnits.headEmployeeId, buHead.id))
      .where(
        and(
          eq(businessUnits.tenantId, tenantId),
          eq(businessUnits.companyId, companyId),
          eq(businessUnits.id, id),
        ),
      )
      .limit(1);

    if (!rows[0]) return null;
    const r = rows[0];

    const divCountRes = await db
      .select({ count: sql<number>`count(${divisions.id})`.as('count') })
      .from(divisions)
      .where(
        and(
          eq(divisions.tenantId, tenantId),
          eq(divisions.companyId, companyId),
          eq(divisions.businessUnitId, id),
        ),
      );

    const headName = r.headFirstName
      ? `${r.headFirstName} ${r.headLastName ?? ''}`.trim()
      : null;

    return {
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      name: r.name,
      code: r.code,
      description: r.description,
      headEmployeeId: r.headEmployeeId,
      headEmployeeName: headName,
      headEmployeeNumber: r.headEmployeeNumber ?? null,
      status: r.status as StructuralStatus,
      divisionCount: Number(divCountRes[0]?.count) || 0,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    };
  }

  async findBusinessUnitByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<BusinessUnit | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(businessUnits)
      .where(
        and(
          eq(businessUnits.tenantId, tenantId),
          eq(businessUnits.companyId, companyId),
          sql`LOWER(${businessUnits.code}) = LOWER(${code})`,
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async createBusinessUnit(
    tenantId: string,
    companyId: string,
    dto: CreateBusinessUnitDto,
  ): Promise<BusinessUnitRecord> {
    const db = getDb();
    const id = `bu_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await db.insert(businessUnits).values({
      id,
      tenantId,
      companyId,
      name: dto.name,
      code: dto.code ?? null,
      description: dto.description ?? null,
      headEmployeeId: dto.headEmployeeId ?? null,
      status: dto.status ?? 'active',
    });

    const created = await this.findBusinessUnitById(tenantId, companyId, id);
    if (!created) {
      throw new Error('Failed to retrieve created business unit');
    }
    return created;
  }

  async updateBusinessUnit(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateBusinessUnitDto,
  ): Promise<BusinessUnitRecord> {
    const db = getDb();
    await db
      .update(businessUnits)
      .set({
        name: dto.name,
        code: dto.code ?? null,
        description: dto.description ?? null,
        headEmployeeId: dto.headEmployeeId ?? null,
        status: dto.status ?? 'active',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessUnits.tenantId, tenantId),
          eq(businessUnits.companyId, companyId),
          eq(businessUnits.id, id),
        ),
      );

    const updated = await this.findBusinessUnitById(tenantId, companyId, id);
    if (!updated) {
      throw new Error('Failed to retrieve updated business unit');
    }
    return updated;
  }

  async setBusinessUnitStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: StructuralStatus,
  ): Promise<BusinessUnitRecord> {
    const db = getDb();
    await db
      .update(businessUnits)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(businessUnits.tenantId, tenantId),
          eq(businessUnits.companyId, companyId),
          eq(businessUnits.id, id),
        ),
      );

    const updated = await this.findBusinessUnitById(tenantId, companyId, id);
    if (!updated) {
      throw new Error('Business unit not found');
    }
    return updated;
  }

  async listDivisions(
    tenantId: string,
    companyId: string,
    businessUnitId?: string,
  ): Promise<DivisionRecord[]> {
    const db = getDb();
    const conditions: SQL[] = [
      eq(divisions.tenantId, tenantId),
      eq(divisions.companyId, companyId),
    ];

    if (businessUnitId) {
      conditions.push(eq(divisions.businessUnitId, businessUnitId));
    }

    const rows = await db
      .select({
        id: divisions.id,
        tenantId: divisions.tenantId,
        companyId: divisions.companyId,
        businessUnitId: divisions.businessUnitId,
        businessUnitName: businessUnits.name,
        name: divisions.name,
        code: divisions.code,
        description: divisions.description,
        headEmployeeId: divisions.headEmployeeId,
        headFirstName: divHead.firstName,
        headLastName: divHead.lastName,
        headEmployeeNumber: divHead.employeeNumber,
        status: divisions.status,
        createdAt: divisions.createdAt,
        updatedAt: divisions.updatedAt,
      })
      .from(divisions)
      .innerJoin(businessUnits, eq(divisions.businessUnitId, businessUnits.id))
      .leftJoin(divHead, eq(divisions.headEmployeeId, divHead.id))
      .where(and(...conditions))
      .orderBy(asc(divisions.name));

    return rows.map((r) => {
      const headName = r.headFirstName
        ? `${r.headFirstName} ${r.headLastName ?? ''}`.trim()
        : null;

      return {
        id: r.id,
        tenantId: r.tenantId,
        companyId: r.companyId,
        businessUnitId: r.businessUnitId,
        businessUnitName: r.businessUnitName,
        name: r.name,
        code: r.code,
        description: r.description,
        headEmployeeId: r.headEmployeeId,
        headEmployeeName: headName,
        headEmployeeNumber: r.headEmployeeNumber ?? null,
        status: r.status as StructuralStatus,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
      };
    });
  }

  async findDivisionById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DivisionRecord | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: divisions.id,
        tenantId: divisions.tenantId,
        companyId: divisions.companyId,
        businessUnitId: divisions.businessUnitId,
        businessUnitName: businessUnits.name,
        name: divisions.name,
        code: divisions.code,
        description: divisions.description,
        headEmployeeId: divisions.headEmployeeId,
        headFirstName: divHead.firstName,
        headLastName: divHead.lastName,
        headEmployeeNumber: divHead.employeeNumber,
        status: divisions.status,
        createdAt: divisions.createdAt,
        updatedAt: divisions.updatedAt,
      })
      .from(divisions)
      .innerJoin(businessUnits, eq(divisions.businessUnitId, businessUnits.id))
      .leftJoin(divHead, eq(divisions.headEmployeeId, divHead.id))
      .where(
        and(
          eq(divisions.tenantId, tenantId),
          eq(divisions.companyId, companyId),
          eq(divisions.id, id),
        ),
      )
      .limit(1);

    if (!rows[0]) return null;
    const r = rows[0];

    const headName = r.headFirstName
      ? `${r.headFirstName} ${r.headLastName ?? ''}`.trim()
      : null;

    return {
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      businessUnitId: r.businessUnitId,
      businessUnitName: r.businessUnitName,
      name: r.name,
      code: r.code,
      description: r.description,
      headEmployeeId: r.headEmployeeId,
      headEmployeeName: headName,
      headEmployeeNumber: r.headEmployeeNumber ?? null,
      status: r.status as StructuralStatus,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    };
  }

  async findDivisionByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<Division | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(divisions)
      .where(
        and(
          eq(divisions.tenantId, tenantId),
          eq(divisions.companyId, companyId),
          sql`LOWER(${divisions.code}) = LOWER(${code})`,
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async createDivision(
    tenantId: string,
    companyId: string,
    dto: CreateDivisionDto,
  ): Promise<DivisionRecord> {
    const db = getDb();
    const id = `div_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await db.insert(divisions).values({
      id,
      tenantId,
      companyId,
      businessUnitId: dto.businessUnitId,
      name: dto.name,
      code: dto.code ?? null,
      description: dto.description ?? null,
      headEmployeeId: dto.headEmployeeId ?? null,
      status: dto.status ?? 'active',
    });

    const created = await this.findDivisionById(tenantId, companyId, id);
    if (!created) {
      throw new Error('Failed to retrieve created division');
    }
    return created;
  }

  async updateDivision(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDivisionDto,
  ): Promise<DivisionRecord> {
    const db = getDb();
    await db
      .update(divisions)
      .set({
        name: dto.name,
        code: dto.code ?? null,
        description: dto.description ?? null,
        headEmployeeId: dto.headEmployeeId ?? null,
        status: dto.status ?? 'active',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(divisions.tenantId, tenantId),
          eq(divisions.companyId, companyId),
          eq(divisions.id, id),
        ),
      );

    const updated = await this.findDivisionById(tenantId, companyId, id);
    if (!updated) {
      throw new Error('Failed to retrieve updated division');
    }
    return updated;
  }

  async setDivisionStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: StructuralStatus,
  ): Promise<DivisionRecord> {
    const db = getDb();
    await db
      .update(divisions)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(divisions.tenantId, tenantId),
          eq(divisions.companyId, companyId),
          eq(divisions.id, id),
        ),
      );

    const updated = await this.findDivisionById(tenantId, companyId, id);
    if (!updated) {
      throw new Error('Division not found');
    }
    return updated;
  }

  async listEligibleHeads(tenantId: string, companyId: string): Promise<EligibleHead[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        designationName: designations.name,
      })
      .from(employees)
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(and(eq(employees.tenantId, tenantId), eq(employees.companyId, companyId)))
      .orderBy(asc(employees.firstName), asc(employees.lastName));

    return rows.map((r) => ({
      id: r.id,
      employeeNumber: r.employeeNumber,
      firstName: r.firstName,
      lastName: r.lastName ?? null,
      fullName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
      email: r.email,
      designationName: r.designationName ?? null,
    }));
  }
}

export const organizationStructureRepository = new OrganizationStructureRepository();
