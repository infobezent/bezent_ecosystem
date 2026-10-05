import { randomUUID } from 'node:crypto';
import { eq, and, or, sql, asc, like, type SQL } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { locations, employees } from '../../../db/schema.js';
import type {
  WorkLocationRecord,
  CreateWorkLocationDto,
  UpdateWorkLocationDto,
  ListWorkLocationsFilter,
  LocationType,
  WorkLocationStatus,
} from '../types/workLocation.types.js';

export class WorkLocationRepository {
  /**
   * List work locations with tenant and company isolation, active employee counts,
   * and optional status / type / search filters.
   */
  async listWorkLocations(
    tenantId: string,
    companyId: string,
    filter: ListWorkLocationsFilter = {},
  ): Promise<{ items: WorkLocationRecord[]; total: number }> {
    const db = getDb();
    const conditions: SQL[] = [
      eq(locations.tenantId, tenantId),
      eq(locations.companyId, companyId),
    ];

    // Status filter
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(locations.status, filter.status));
    }

    // Location Type filter
    if (filter.locationType && filter.locationType !== 'all') {
      conditions.push(eq(locations.type, filter.locationType));
    }

    // Search filter (name, code, city)
    if (filter.search && filter.search.trim().length > 0) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(
        or(like(locations.name, term), like(locations.code, term), like(locations.city, term))!,
      );
    }

    const whereClause = and(...conditions);

    // Active employee count subquery per work location
    const activeEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.locationId} = ${locations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
        AND ${employees.employmentStatus} NOT IN ('terminated', 'resigned')
    )`;

    const totalEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.locationId} = ${locations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
    )`;

    const rows = await db
      .select({
        id: locations.id,
        tenantId: locations.tenantId,
        companyId: locations.companyId,
        name: locations.name,
        code: locations.code,
        type: locations.type,
        addressLine1: locations.addressLine1,
        addressLine2: locations.addressLine2,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        postalCode: locations.postalCode,
        timezone: locations.timezone,
        description: locations.description,
        status: locations.status,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt,
        activeEmployeeCount: activeEmpCountSql,
        totalEmployeeCount: totalEmpCountSql,
      })
      .from(locations)
      .where(whereClause)
      .orderBy(asc(locations.name));

    const items: WorkLocationRecord[] = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      name: r.name,
      code: r.code,
      type: r.type as LocationType,
      addressLine1: r.addressLine1,
      addressLine2: r.addressLine2,
      city: r.city,
      state: r.state,
      country: r.country,
      postalCode: r.postalCode,
      timezone: r.timezone,
      description: r.description,
      status: r.status as WorkLocationStatus,
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
   * Find a single work location by ID within company and tenant boundary.
   */
  async findWorkLocationById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<WorkLocationRecord | null> {
    const db = getDb();

    const activeEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.locationId} = ${locations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
        AND ${employees.employmentStatus} NOT IN ('terminated', 'resigned')
    )`;

    const totalEmpCountSql = sql<number>`(
      SELECT COUNT(*)
      FROM ${employees}
      WHERE ${employees.locationId} = ${locations.id}
        AND ${employees.tenantId} = ${tenantId}
        AND ${employees.companyId} = ${companyId}
    )`;

    const [row] = await db
      .select({
        id: locations.id,
        tenantId: locations.tenantId,
        companyId: locations.companyId,
        name: locations.name,
        code: locations.code,
        type: locations.type,
        addressLine1: locations.addressLine1,
        addressLine2: locations.addressLine2,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        postalCode: locations.postalCode,
        timezone: locations.timezone,
        description: locations.description,
        status: locations.status,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt,
        activeEmployeeCount: activeEmpCountSql,
        totalEmployeeCount: totalEmpCountSql,
      })
      .from(locations)
      .where(
        and(
          eq(locations.id, id),
          eq(locations.tenantId, tenantId),
          eq(locations.companyId, companyId),
        ),
      );

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      companyId: row.companyId,
      name: row.name,
      code: row.code,
      type: row.type as LocationType,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postalCode,
      timezone: row.timezone,
      description: row.description,
      status: row.status as WorkLocationStatus,
      activeEmployeeCount: Number(row.activeEmployeeCount ?? 0),
      totalEmployeeCount: Number(row.totalEmployeeCount ?? 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Find a work location by code within company and tenant boundary.
   */
  async findWorkLocationByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<WorkLocationRecord | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.tenantId, tenantId),
          eq(locations.companyId, companyId),
          eq(locations.code, code),
        ),
      );

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      companyId: row.companyId,
      name: row.name,
      code: row.code,
      type: row.type as LocationType,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postalCode,
      timezone: row.timezone,
      description: row.description,
      status: row.status as WorkLocationStatus,
      activeEmployeeCount: 0,
      totalEmployeeCount: 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Create a new work location.
   */
  async createWorkLocation(
    tenantId: string,
    companyId: string,
    dto: CreateWorkLocationDto,
  ): Promise<WorkLocationRecord> {
    const db = getDb();
    const id = `loc_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await db.insert(locations).values({
      id,
      tenantId,
      companyId,
      name: dto.name,
      code: dto.code ?? null,
      type: dto.type,
      addressLine1: dto.addressLine1 ?? null,
      addressLine2: dto.addressLine2 ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? null,
      postalCode: dto.postalCode ?? null,
      timezone: dto.timezone ?? null,
      description: dto.description ?? null,
      status: dto.status ?? 'active',
    });

    const created = await this.findWorkLocationById(tenantId, companyId, id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created work location ${id}`);
    }
    return created;
  }

  /**
   * Update work location record.
   */
  async updateWorkLocation(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateWorkLocationDto,
  ): Promise<WorkLocationRecord> {
    const db = getDb();
    const updateValues: Record<string, unknown> = {};

    if (dto.name !== undefined) updateValues.name = dto.name;
    if (dto.code !== undefined) updateValues.code = dto.code;
    if (dto.type !== undefined) updateValues.type = dto.type;
    if (dto.addressLine1 !== undefined) updateValues.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) updateValues.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) updateValues.city = dto.city;
    if (dto.state !== undefined) updateValues.state = dto.state;
    if (dto.country !== undefined) updateValues.country = dto.country;
    if (dto.postalCode !== undefined) updateValues.postalCode = dto.postalCode;
    if (dto.timezone !== undefined) updateValues.timezone = dto.timezone;
    if (dto.description !== undefined) updateValues.description = dto.description;
    if (dto.status !== undefined) updateValues.status = dto.status;

    if (Object.keys(updateValues).length > 0) {
      await db
        .update(locations)
        .set(updateValues)
        .where(
          and(
            eq(locations.id, id),
            eq(locations.tenantId, tenantId),
            eq(locations.companyId, companyId),
          ),
        );
    }

    const updated = await this.findWorkLocationById(tenantId, companyId, id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated work location ${id}`);
    }
    return updated;
  }

  /**
   * Set status directly (active / inactive).
   */
  async setWorkLocationStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: WorkLocationStatus,
  ): Promise<WorkLocationRecord> {
    return this.updateWorkLocation(tenantId, companyId, id, { status });
  }

  /**
   * Count active employees referencing this work location.
   */
  async countActiveEmployees(
    tenantId: string,
    companyId: string,
    locationId: string,
  ): Promise<number> {
    const db = getDb();
    const [result] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(employees)
      .where(
        and(
          eq(employees.locationId, locationId),
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          sql`${employees.employmentStatus} NOT IN ('terminated', 'resigned')`,
        ),
      );

    return Number(result?.count ?? 0);
  }
}
