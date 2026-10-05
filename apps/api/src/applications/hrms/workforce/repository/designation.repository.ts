import { randomUUID } from 'node:crypto';
import { eq, and, or, sql, asc, isNull, like, type SQL } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { designations, departments, employees, type Designation } from '../../../../db/schema.js';
import type {
  DesignationRecord,
  CreateDesignationDto,
  UpdateDesignationDto,
  ListDesignationsQuery,
  DesignationStatus,
} from '../types/designation.types.js';

export class DesignationRepository {
  /**
   * List designations with tenant and company isolation, joined department names,
   * active employee counts, and optional eligibility / department / search filters.
   */
  async listDesignations(
    tenantId: string,
    companyId: string,
    query: ListDesignationsQuery = {},
  ): Promise<{ items: DesignationRecord[]; total: number }> {
    const db = getDb();
    const conditions: SQL[] = [
      eq(designations.tenantId, tenantId),
      eq(designations.companyId, companyId),
    ];

    // Status filter
    if (query.status && query.status !== 'all') {
      conditions.push(eq(designations.status, query.status));
    }

    // Eligibility filter: for a given department D, return active company-wide (dept null)
    // + department-specific (dept = D) designations
    if (query.eligibleForDepartmentId) {
      conditions.push(eq(designations.status, 'active'));
      conditions.push(
        or(
          isNull(designations.departmentId),
          eq(designations.departmentId, query.eligibleForDepartmentId),
        )!,
      );
    } else if (query.departmentId !== undefined && query.departmentId !== '') {
      if (query.departmentId === 'none' || query.departmentId === 'null') {
        conditions.push(isNull(designations.departmentId));
      } else {
        conditions.push(eq(designations.departmentId, query.departmentId));
      }
    }

    // Search filter
    if (query.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      conditions.push(or(like(designations.name, term), like(designations.code, term))!);
    }

    const whereClause = and(...conditions);

    // Active employee count subquery per designation
    const activeEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.designationId} = ${designations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
        AND ${employees.employmentStatus} NOT IN ('terminated', 'resigned')
    )`;

    const totalEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.designationId} = ${designations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
    )`;

    const rows = await db
      .select({
        id: designations.id,
        tenantId: designations.tenantId,
        companyId: designations.companyId,
        name: designations.name,
        code: designations.code,
        description: designations.description,
        departmentId: designations.departmentId,
        status: designations.status,
        createdAt: designations.createdAt,
        updatedAt: designations.updatedAt,
        departmentName: departments.name,
        departmentCode: departments.code,
        activeEmployeeCount: activeEmpCountSql,
        totalEmployeeCount: totalEmpCountSql,
      })
      .from(designations)
      .leftJoin(departments, eq(designations.departmentId, departments.id))
      .where(whereClause)
      .orderBy(asc(designations.name))
      .limit(query.limit ?? 100)
      .offset(query.offset ?? 0);

    const items: DesignationRecord[] = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      name: r.name,
      code: r.code,
      description: r.description,
      departmentId: r.departmentId,
      departmentName: r.departmentName ?? null,
      departmentCode: r.departmentCode ?? null,
      status: r.status as DesignationStatus,
      activeEmployeeCount: Number(r.activeEmployeeCount ?? 0),
      totalEmployeeCount: Number(r.totalEmployeeCount ?? 0),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      items,
      total: items.length,
    };
  }

  /**
   * Find a single designation by ID scoped strictly to tenant and company.
   */
  async findDesignationById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DesignationRecord | null> {
    const db = getDb();

    const activeEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.designationId} = ${designations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
        AND ${employees.employmentStatus} NOT IN ('terminated', 'resigned')
    )`;

    const totalEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.designationId} = ${designations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
    )`;

    const rows = await db
      .select({
        id: designations.id,
        tenantId: designations.tenantId,
        companyId: designations.companyId,
        name: designations.name,
        code: designations.code,
        description: designations.description,
        departmentId: designations.departmentId,
        status: designations.status,
        createdAt: designations.createdAt,
        updatedAt: designations.updatedAt,
        departmentName: departments.name,
        departmentCode: departments.code,
        activeEmployeeCount: activeEmpCountSql,
        totalEmployeeCount: totalEmpCountSql,
      })
      .from(designations)
      .leftJoin(departments, eq(designations.departmentId, departments.id))
      .where(
        and(
          eq(designations.tenantId, tenantId),
          eq(designations.companyId, companyId),
          eq(designations.id, id),
        ),
      )
      .limit(1);

    if (!rows.length || !rows[0]) return null;

    const r = rows[0];
    return {
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      name: r.name,
      code: r.code,
      description: r.description,
      departmentId: r.departmentId,
      departmentName: r.departmentName ?? null,
      departmentCode: r.departmentCode ?? null,
      status: r.status as DesignationStatus,
      activeEmployeeCount: Number(r.activeEmployeeCount ?? 0),
      totalEmployeeCount: Number(r.totalEmployeeCount ?? 0),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  /**
   * Find designation by code within the same company.
   */
  async findDesignationByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<Designation | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(designations)
      .where(
        and(
          eq(designations.tenantId, tenantId),
          eq(designations.companyId, companyId),
          eq(designations.code, code),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Count active employees currently referencing this designation.
   */
  async countActiveEmployees(
    tenantId: string,
    companyId: string,
    designationId: string,
  ): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.designationId, designationId),
          sql`${employees.employmentStatus} NOT IN ('terminated', 'resigned')`,
        ),
      );

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Create new designation record.
   */
  async createDesignation(
    tenantId: string,
    companyId: string,
    data: CreateDesignationDto,
  ): Promise<DesignationRecord> {
    const db = getDb();
    const id = randomUUID();

    await db.insert(designations).values({
      id,
      tenantId,
      companyId,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      departmentId: data.departmentId ?? null,
      status: data.status ?? 'active',
    });

    const created = await this.findDesignationById(tenantId, companyId, id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created designation ${id}`);
    }
    return created;
  }

  /**
   * Update existing designation record.
   */
  async updateDesignation(
    tenantId: string,
    companyId: string,
    id: string,
    data: UpdateDesignationDto,
  ): Promise<DesignationRecord | null> {
    const db = getDb();

    const updateSet: Partial<typeof designations.$inferInsert> = {};
    if (data.name !== undefined) updateSet.name = data.name;
    if (data.code !== undefined) updateSet.code = data.code;
    if (data.description !== undefined) updateSet.description = data.description;
    if (data.departmentId !== undefined) updateSet.departmentId = data.departmentId;
    if (data.status !== undefined) updateSet.status = data.status;

    if (Object.keys(updateSet).length > 0) {
      await db
        .update(designations)
        .set(updateSet)
        .where(
          and(
            eq(designations.tenantId, tenantId),
            eq(designations.companyId, companyId),
            eq(designations.id, id),
          ),
        );
    }

    return this.findDesignationById(tenantId, companyId, id);
  }

  /**
   * Update designation status.
   */
  async setStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: DesignationStatus,
  ): Promise<DesignationRecord | null> {
    const db = getDb();
    await db
      .update(designations)
      .set({ status })
      .where(
        and(
          eq(designations.tenantId, tenantId),
          eq(designations.companyId, companyId),
          eq(designations.id, id),
        ),
      );

    return this.findDesignationById(tenantId, companyId, id);
  }
}
