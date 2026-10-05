import { randomUUID } from 'node:crypto';
import { eq, and, or, asc, like, type SQL } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { grades, type Grade } from '../../../../db/schema.js';
import type {
  GradeRecord,
  CreateGradeDto,
  UpdateGradeDto,
  ListGradesFilter,
  GradeStatus,
} from '../types/grade.types.js';

export class GradeRepository {
  private mapRecord(row: Grade): GradeRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      companyId: row.companyId,
      name: row.name,
      code: row.code,
      rank: row.rank,
      description: row.description,
      status: row.status as GradeStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // Deferred relationships
      activeEmployeeCount: 0,
      totalEmployeeCount: 0,
      designationCount: 0,
    };
  }

  async listGrades(
    tenantId: string,
    companyId: string,
    filter: ListGradesFilter = {},
  ): Promise<{ items: GradeRecord[]; total: number }> {
    const db = getDb();
    const conditions: SQL[] = [
      eq(grades.tenantId, tenantId),
      eq(grades.companyId, companyId),
    ];

    if (filter.lookupOnly) {
      conditions.push(eq(grades.status, 'active'));
    } else if (filter.status && filter.status !== 'all') {
      conditions.push(eq(grades.status, filter.status));
    }

    if (filter.search && filter.search.trim().length > 0) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(grades.name, term),
          like(grades.code, term),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const rows = await db
      .select()
      .from(grades)
      .where(whereClause)
      .orderBy(asc(grades.rank));

    const items = rows.map((r) => this.mapRecord(r));

    return {
      items,
      total: items.length,
    };
  }

  async findGradeById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<GradeRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(grades)
      .where(
        and(
          eq(grades.tenantId, tenantId),
          eq(grades.companyId, companyId),
          eq(grades.id, id),
        ),
      );

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapRecord(rows[0]);
  }

  async findGradeByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<GradeRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(grades)
      .where(
        and(
          eq(grades.tenantId, tenantId),
          eq(grades.companyId, companyId),
          eq(grades.code, code.trim().toUpperCase()),
        ),
      );

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapRecord(rows[0]);
  }

  async findGradeByRank(
    tenantId: string,
    companyId: string,
    rank: number,
  ): Promise<GradeRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(grades)
      .where(
        and(
          eq(grades.tenantId, tenantId),
          eq(grades.companyId, companyId),
          eq(grades.rank, rank),
        ),
      );

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapRecord(rows[0]);
  }

  async createGrade(
    tenantId: string,
    companyId: string,
    dto: CreateGradeDto,
  ): Promise<GradeRecord> {
    const db = getDb();
    const id = 'grd_' + randomUUID().replace(/-/g, '').slice(0, 16);

    await db.insert(grades).values({
      id,
      tenantId,
      companyId,
      name: dto.name,
      code: dto.code.trim().toUpperCase(),
      rank: dto.rank,
      description: dto.description ?? null,
      status: dto.status ?? 'active',
    });

    const created = await this.findGradeById(tenantId, companyId, id);
    if (!created) {
      throw new Error(`Failed to retrieve created grade (ID: ${id})`);
    }
    return created;
  }

  async updateGrade(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateGradeDto,
  ): Promise<GradeRecord> {
    const db = getDb();
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.code !== undefined) updates.code = dto.code.trim().toUpperCase();
    if (dto.rank !== undefined) updates.rank = dto.rank;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.status !== undefined) updates.status = dto.status;

    await db
      .update(grades)
      .set(updates)
      .where(
        and(
          eq(grades.tenantId, tenantId),
          eq(grades.companyId, companyId),
          eq(grades.id, id),
        ),
      );

    const updated = await this.findGradeById(tenantId, companyId, id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated grade (ID: ${id})`);
    }
    return updated;
  }

  async setGradeStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: GradeStatus,
  ): Promise<GradeRecord> {
    const db = getDb();
    await db
      .update(grades)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(grades.tenantId, tenantId),
          eq(grades.companyId, companyId),
          eq(grades.id, id),
        ),
      );

    const updated = await this.findGradeById(tenantId, companyId, id);
    if (!updated) {
      throw new Error(`Failed to retrieve status-updated grade (ID: ${id})`);
    }
    return updated;
  }

  async deleteGrade(tenantId: string, companyId: string, id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(grades)
      .where(
        and(
          eq(grades.tenantId, tenantId),
          eq(grades.companyId, companyId),
          eq(grades.id, id),
        ),
      );
  }
}
