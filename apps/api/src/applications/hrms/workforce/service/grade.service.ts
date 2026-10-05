import { GradeRepository } from '../repository/grade.repository.js';
import { auditRepository } from '../../../../platform/audit/repository/audit.repository.js';
import { NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';
import type {
  GradeRecord,
  CreateGradeDto,
  UpdateGradeDto,
  ListGradesFilter,
  GradeLifecycleResult,
  GradeStatus,
} from '../types/grade.types.js';

export class GradeService {
  constructor(private readonly repo: GradeRepository = new GradeRepository()) {}

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
      console.warn('[GradeService] Failed to record audit log:', err);
    }
  }

  async listGrades(
    tenantId: string,
    companyId: string,
    filter: ListGradesFilter = {},
  ): Promise<{ items: GradeRecord[]; total: number }> {
    return this.repo.listGrades(tenantId, companyId, filter);
  }

  async getGradeById(tenantId: string, companyId: string, id: string): Promise<GradeRecord> {
    const record = await this.repo.findGradeById(tenantId, companyId, id);
    if (!record) {
      throw new NotFoundError(`Grade not found (ID: ${id})`);
    }
    return record;
  }

  async createGrade(
    tenantId: string,
    companyId: string,
    dto: CreateGradeDto,
    actor?: { userId?: string; email?: string },
  ): Promise<GradeRecord> {
    const normalizedCode = dto.code.trim().toUpperCase();

    // 1. Check code uniqueness within company
    const existingWithCode = await this.repo.findGradeByCode(tenantId, companyId, normalizedCode);
    if (existingWithCode) {
      throw new ConflictError(`Grade code "${normalizedCode}" is already in use in this company`);
    }

    // 2. Check rank uniqueness within company
    const existingWithRank = await this.repo.findGradeByRank(tenantId, companyId, dto.rank);
    if (existingWithRank) {
      throw new ConflictError(`Grade rank ${dto.rank} is already in use in this company`);
    }

    try {
      const created = await this.repo.createGrade(tenantId, companyId, {
        ...dto,
        code: normalizedCode,
      });

      await this.safeRecordAudit({
        actorUserId: actor?.userId,
        actorEmail: actor?.email,
        action: 'grade.create',
        targetType: 'grade',
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
        if (error.message?.includes('idx_grades_company_code')) {
          throw new ConflictError(
            `Grade code "${normalizedCode}" is already in use in this company`,
          );
        }
        if (error.message?.includes('idx_grades_company_rank')) {
          throw new ConflictError(`Grade rank ${dto.rank} is already in use in this company`);
        }
      }
      throw err;
    }
  }

  async updateGrade(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateGradeDto,
    actor?: { userId?: string; email?: string },
  ): Promise<GradeRecord> {
    const existing = await this.repo.findGradeById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Grade not found (ID: ${id})`);
    }

    const normalizedCode = dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined;

    // Check code uniqueness if changed
    if (normalizedCode !== undefined && normalizedCode !== existing.code) {
      const existingWithCode = await this.repo.findGradeByCode(tenantId, companyId, normalizedCode);
      if (existingWithCode && existingWithCode.id !== id) {
        throw new ConflictError(`Grade code "${normalizedCode}" is already in use in this company`);
      }
    }

    // Check rank uniqueness if changed
    if (dto.rank !== undefined && dto.rank !== existing.rank) {
      const existingWithRank = await this.repo.findGradeByRank(tenantId, companyId, dto.rank);
      if (existingWithRank && existingWithRank.id !== id) {
        throw new ConflictError(`Grade rank ${dto.rank} is already in use in this company`);
      }
    }

    try {
      const updated = await this.repo.updateGrade(tenantId, companyId, id, {
        ...dto,
        code: normalizedCode,
      });

      await this.safeRecordAudit({
        actorUserId: actor?.userId,
        actorEmail: actor?.email,
        action: 'grade.update',
        targetType: 'grade',
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
      const errAny = err as { code?: string; message?: string };
      if (errAny?.code === 'ER_DUP_ENTRY' || errAny?.message?.includes('Duplicate entry')) {
        if (errAny.message?.includes('idx_grades_company_code') && normalizedCode) {
          throw new ConflictError(
            `Grade code "${normalizedCode}" is already in use in this company`,
          );
        }
        if (errAny.message?.includes('idx_grades_company_rank') && dto.rank !== undefined) {
          throw new ConflictError(`Grade rank ${dto.rank} is already in use in this company`);
        }
      }
      throw err;
    }
  }

  async setGradeStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: GradeStatus,
    actor?: { userId?: string; email?: string },
  ): Promise<GradeLifecycleResult> {
    const existing = await this.repo.findGradeById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Grade not found (ID: ${id})`);
    }

    const updated = await this.repo.setGradeStatus(tenantId, companyId, id, status);

    const isDeactivation = status === 'inactive';
    const action = isDeactivation ? 'grade.deactivate' : 'grade.reactivate';

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action,
      targetType: 'grade',
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
      ? 'Existing references will remain unchanged. This grade will no longer be available for new assignments.'
      : 'Grade successfully reactivated and restored for new assignments.';

    return {
      data: updated,
      affectedEmployeeCount: 0,
      affectedDesignationCount: 0,
      message,
    };
  }

  async deactivateGrade(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<GradeLifecycleResult> {
    return this.setGradeStatus(tenantId, companyId, id, 'inactive', actor);
  }

  async reactivateGrade(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<GradeLifecycleResult> {
    return this.setGradeStatus(tenantId, companyId, id, 'active', actor);
  }
}

export const gradeService = new GradeService();
