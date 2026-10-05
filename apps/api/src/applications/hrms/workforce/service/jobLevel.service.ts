import { JobLevelRepository } from '../repository/jobLevel.repository.js';
import { auditRepository } from '../../../../platform/audit/repository/audit.repository.js';
import { NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';
import type {
  JobLevelRecord,
  CreateJobLevelDto,
  UpdateJobLevelDto,
  ListJobLevelsFilter,
  JobLevelLifecycleResult,
  JobLevelStatus,
} from '../types/jobLevel.types.js';

export class JobLevelService {
  constructor(private readonly repo: JobLevelRepository = new JobLevelRepository()) {}

  private async safeRecordAudit(params: {
    actorUserId?: string;
    actorEmail?: string;
    action: string;
    targetType: string;
    targetId: string;
    tenantId: string;
    companyId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await auditRepository.record({
        actorUserId: params.actorUserId ?? null,
        actorEmail: params.actorEmail ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        tenantId: params.tenantId,
        companyId: params.companyId,
        metadata: params.metadata ?? {},
      });
    } catch (err) {
      console.warn('[JobLevelService] Failed to record audit log:', err);
    }
  }

  async listJobLevels(
    tenantId: string,
    companyId: string,
    filter: ListJobLevelsFilter = {},
  ): Promise<{ items: JobLevelRecord[]; total: number }> {
    return this.repo.listJobLevels(tenantId, companyId, filter);
  }

  async getJobLevelById(tenantId: string, companyId: string, id: string): Promise<JobLevelRecord> {
    const record = await this.repo.findJobLevelById(tenantId, companyId, id);
    if (!record) {
      throw new NotFoundError(`Job level not found (ID: ${id})`);
    }
    return record;
  }

  async createJobLevel(
    tenantId: string,
    companyId: string,
    dto: CreateJobLevelDto,
    actor?: { userId?: string; email?: string },
  ): Promise<JobLevelRecord> {
    const normalizedCode = dto.code.trim().toUpperCase();

    // 1. Check code uniqueness within company
    const existingWithCode = await this.repo.findJobLevelByCode(
      tenantId,
      companyId,
      normalizedCode,
    );
    if (existingWithCode) {
      throw new ConflictError(
        `Job level code "${normalizedCode}" is already in use in this company`,
      );
    }

    // 2. Check rank uniqueness within company
    const existingWithRank = await this.repo.findJobLevelByRank(tenantId, companyId, dto.rank);
    if (existingWithRank) {
      throw new ConflictError(`Job level rank ${dto.rank} is already in use in this company`);
    }

    try {
      const created = await this.repo.createJobLevel(tenantId, companyId, {
        ...dto,
        code: normalizedCode,
      });

      await this.safeRecordAudit({
        actorUserId: actor?.userId,
        actorEmail: actor?.email,
        action: 'job_level.create',
        targetType: 'job_level',
        targetId: created.id,
        tenantId,
        companyId,
        metadata: {
          name: created.name,
          code: created.code,
          rank: created.rank,
          status: created.status,
        },
      });

      return created;
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'ER_DUP_ENTRY' || error?.message?.includes('Duplicate entry')) {
        if (error.message?.includes('idx_job_levels_company_code')) {
          throw new ConflictError(
            `Job level code "${normalizedCode}" is already in use in this company`,
          );
        }
        if (error.message?.includes('idx_job_levels_company_rank')) {
          throw new ConflictError(`Job level rank ${dto.rank} is already in use in this company`);
        }
      }
      throw err;
    }
  }

  async updateJobLevel(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateJobLevelDto,
    actor?: { userId?: string; email?: string },
  ): Promise<JobLevelRecord> {
    const existing = await this.repo.findJobLevelById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Job level not found (ID: ${id})`);
    }

    const normalizedCode = dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined;

    // Check code uniqueness if changed
    if (normalizedCode !== undefined && normalizedCode !== existing.code) {
      const existingWithCode = await this.repo.findJobLevelByCode(
        tenantId,
        companyId,
        normalizedCode,
      );
      if (existingWithCode && existingWithCode.id !== id) {
        throw new ConflictError(
          `Job level code "${normalizedCode}" is already in use in this company`,
        );
      }
    }

    // Check rank uniqueness if changed
    if (dto.rank !== undefined && dto.rank !== existing.rank) {
      const existingWithRank = await this.repo.findJobLevelByRank(tenantId, companyId, dto.rank);
      if (existingWithRank && existingWithRank.id !== id) {
        throw new ConflictError(`Job level rank ${dto.rank} is already in use in this company`);
      }
    }

    try {
      const updated = await this.repo.updateJobLevel(tenantId, companyId, id, {
        ...dto,
        code: normalizedCode,
      });

      await this.safeRecordAudit({
        actorUserId: actor?.userId,
        actorEmail: actor?.email,
        action: 'job_level.update',
        targetType: 'job_level',
        targetId: id,
        tenantId,
        companyId,
        metadata: {
          previous: {
            name: existing.name,
            code: existing.code,
            rank: existing.rank,
            description: existing.description,
            status: existing.status,
          },
          updated: {
            name: updated.name,
            code: updated.code,
            rank: updated.rank,
            description: updated.description,
            status: updated.status,
          },
        },
      });

      return updated;
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'ER_DUP_ENTRY' || error?.message?.includes('Duplicate entry')) {
        if (error.message?.includes('idx_job_levels_company_code') && normalizedCode) {
          throw new ConflictError(
            `Job level code "${normalizedCode}" is already in use in this company`,
          );
        }
        if (error.message?.includes('idx_job_levels_company_rank') && dto.rank !== undefined) {
          throw new ConflictError(`Job level rank ${dto.rank} is already in use in this company`);
        }
      }
      throw err;
    }
  }

  async setJobLevelStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: JobLevelStatus,
    actor?: { userId?: string; email?: string },
  ): Promise<JobLevelLifecycleResult> {
    const existing = await this.repo.findJobLevelById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Job level not found (ID: ${id})`);
    }

    const updated = await this.repo.setJobLevelStatus(tenantId, companyId, id, status);

    const isDeactivation = status === 'inactive';
    const action = isDeactivation ? 'job_level.deactivate' : 'job_level.reactivate';

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action,
      targetType: 'job_level',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        previousStatus: existing.status,
        newStatus: status,
        name: updated.name,
        code: updated.code,
        rank: updated.rank,
      },
    });

    const message = isDeactivation
      ? 'Existing references will remain unchanged. This job level will no longer be available for new assignments.'
      : 'Job level successfully reactivated and restored for new assignments.';

    return {
      data: updated,
      affectedEmployeeCount: 0,
      affectedDesignationCount: 0,
      message,
    };
  }

  async deactivateJobLevel(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<JobLevelLifecycleResult> {
    return this.setJobLevelStatus(tenantId, companyId, id, 'inactive', actor);
  }

  async reactivateJobLevel(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<JobLevelLifecycleResult> {
    return this.setJobLevelStatus(tenantId, companyId, id, 'active', actor);
  }
}

export const jobLevelService = new JobLevelService();
