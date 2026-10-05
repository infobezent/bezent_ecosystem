import { randomUUID } from 'node:crypto';
import { eq, and, or, asc, like, type SQL } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { jobLevels, type JobLevel } from '../../../../db/schema.js';
import type {
  JobLevelRecord,
  CreateJobLevelDto,
  UpdateJobLevelDto,
  ListJobLevelsFilter,
  JobLevelStatus,
} from '../types/jobLevel.types.js';

export class JobLevelRepository {
  private mapRecord(row: JobLevel): JobLevelRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      companyId: row.companyId,
      name: row.name,
      code: row.code,
      rank: row.rank,
      description: row.description,
      status: row.status as JobLevelStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // Deferred relationships
      activeEmployeeCount: 0,
      totalEmployeeCount: 0,
      designationCount: 0,
    };
  }

  async listJobLevels(
    tenantId: string,
    companyId: string,
    filter: ListJobLevelsFilter = {},
  ): Promise<{ items: JobLevelRecord[]; total: number }> {
    const db = getDb();
    const conditions: SQL[] = [
      eq(jobLevels.tenantId, tenantId),
      eq(jobLevels.companyId, companyId),
    ];

    if (filter.lookupOnly) {
      conditions.push(eq(jobLevels.status, 'active'));
    } else if (filter.status && filter.status !== 'all') {
      conditions.push(eq(jobLevels.status, filter.status));
    }

    if (filter.search && filter.search.trim().length > 0) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(or(like(jobLevels.name, term), like(jobLevels.code, term))!);
    }

    const whereClause = and(...conditions);

    const rows = await db.select().from(jobLevels).where(whereClause).orderBy(asc(jobLevels.rank));

    const items = rows.map((r) => this.mapRecord(r));

    return {
      items,
      total: items.length,
    };
  }

  async findJobLevelById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<JobLevelRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(jobLevels)
      .where(
        and(
          eq(jobLevels.tenantId, tenantId),
          eq(jobLevels.companyId, companyId),
          eq(jobLevels.id, id),
        ),
      );

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapRecord(rows[0]);
  }

  async findJobLevelByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<JobLevelRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(jobLevels)
      .where(
        and(
          eq(jobLevels.tenantId, tenantId),
          eq(jobLevels.companyId, companyId),
          eq(jobLevels.code, code.trim().toUpperCase()),
        ),
      );

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapRecord(rows[0]);
  }

  async findJobLevelByRank(
    tenantId: string,
    companyId: string,
    rank: number,
  ): Promise<JobLevelRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(jobLevels)
      .where(
        and(
          eq(jobLevels.tenantId, tenantId),
          eq(jobLevels.companyId, companyId),
          eq(jobLevels.rank, rank),
        ),
      );

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapRecord(rows[0]);
  }

  async createJobLevel(
    tenantId: string,
    companyId: string,
    dto: CreateJobLevelDto,
  ): Promise<JobLevelRecord> {
    const db = getDb();
    const id = 'jl_' + randomUUID().replace(/-/g, '').slice(0, 16);

    await db.insert(jobLevels).values({
      id,
      tenantId,
      companyId,
      name: dto.name,
      code: dto.code.trim().toUpperCase(),
      rank: dto.rank,
      description: dto.description ?? null,
      status: dto.status ?? 'active',
    });

    const created = await this.findJobLevelById(tenantId, companyId, id);
    if (!created) {
      throw new Error(`Failed to retrieve created job level (ID: ${id})`);
    }
    return created;
  }

  async updateJobLevel(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateJobLevelDto,
  ): Promise<JobLevelRecord> {
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
      .update(jobLevels)
      .set(updates)
      .where(
        and(
          eq(jobLevels.tenantId, tenantId),
          eq(jobLevels.companyId, companyId),
          eq(jobLevels.id, id),
        ),
      );

    const updated = await this.findJobLevelById(tenantId, companyId, id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated job level (ID: ${id})`);
    }
    return updated;
  }

  async setJobLevelStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: JobLevelStatus,
  ): Promise<JobLevelRecord> {
    const db = getDb();
    await db
      .update(jobLevels)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(jobLevels.tenantId, tenantId),
          eq(jobLevels.companyId, companyId),
          eq(jobLevels.id, id),
        ),
      );

    const updated = await this.findJobLevelById(tenantId, companyId, id);
    if (!updated) {
      throw new Error(`Failed to retrieve status-updated job level (ID: ${id})`);
    }
    return updated;
  }

  async deleteJobLevel(tenantId: string, companyId: string, id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(jobLevels)
      .where(
        and(
          eq(jobLevels.tenantId, tenantId),
          eq(jobLevels.companyId, companyId),
          eq(jobLevels.id, id),
        ),
      );
  }
}
