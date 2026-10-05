import { DesignationRepository } from '../repository/designation.repository.js';
import { DepartmentRepository } from '../../../../platform/organization/repository/department.repository.js';
import { auditRepository } from '../../../../platform/audit/repository/audit.repository.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../../../app/errors/AppError.js';
import type {
  DesignationRecord,
  CreateDesignationDto,
  UpdateDesignationDto,
  ListDesignationsQuery,
  DesignationStatus,
} from '../types/designation.types.js';

export class DesignationService {
  constructor(
    private readonly repo = new DesignationRepository(),
    private readonly deptRepo = new DepartmentRepository(),
  ) {}

  /**
   * List designations for active company.
   */
  async listDesignations(
    tenantId: string,
    companyId: string,
    query: ListDesignationsQuery = {},
  ): Promise<{ items: DesignationRecord[]; total: number }> {
    return this.repo.listDesignations(tenantId, companyId, query);
  }

  /**
   * Get designation by ID. Throws NotFoundError if not found.
   */
  async getDesignationById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DesignationRecord> {
    const desig = await this.repo.findDesignationById(tenantId, companyId, id);
    if (!desig) {
      throw new NotFoundError(`Designation not found for ID: ${id}`);
    }
    return desig;
  }

  /**
   * Create a new company-wide or department-specific designation.
   */
  async createDesignation(
    tenantId: string,
    companyId: string,
    dto: CreateDesignationDto,
    actor?: { userId?: string; email?: string },
  ): Promise<DesignationRecord> {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new ValidationError('Designation name is required');
    }

    const trimmedCode = dto.code?.trim() || null;
    const trimmedDesc = dto.description?.trim() || null;
    const departmentId = dto.departmentId?.trim() || null;

    // 1. Code uniqueness check within company
    if (trimmedCode) {
      const existingWithCode = await this.repo.findDesignationByCode(
        tenantId,
        companyId,
        trimmedCode,
      );
      if (existingWithCode) {
        throw new ConflictError(
          `Designation code "${trimmedCode}" is already in use in this company`,
        );
      }
    }

    // 2. Department validation (if department-specific)
    if (departmentId) {
      const dept = await this.deptRepo.findDepartmentById(
        tenantId,
        companyId,
        departmentId,
      );
      if (!dept) {
        throw new ValidationError(
          `Department not found or does not belong to this company (ID: ${departmentId})`,
        );
      }
      if (dept.status !== 'active') {
        throw new ValidationError(
          `Cannot assign designation to inactive department "${dept.name}"`,
        );
      }
    }

    // 3. Create designation
    const created = await this.repo.createDesignation(tenantId, companyId, {
      name: trimmedName,
      code: trimmedCode,
      description: trimmedDesc,
      departmentId,
      status: dto.status ?? 'active',
    });

    // 4. Audit log
    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'designation.create',
      targetType: 'designation',
      targetId: created.id,
      tenantId,
      companyId,
      metadata: {
        name: created.name,
        code: created.code,
        departmentId: created.departmentId,
        status: created.status,
      },
    });

    return created;
  }

  /**
   * Update designation metadata or structural department mapping.
   */
  async updateDesignation(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDesignationDto,
    actor?: { userId?: string; email?: string },
  ): Promise<DesignationRecord> {
    const existing = await this.repo.findDesignationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Designation not found for ID: ${id}`);
    }

    const trimmedName = dto.name !== undefined ? dto.name.trim() : existing.name;
    if (!trimmedName) {
      throw new ValidationError('Designation name cannot be empty');
    }

    const trimmedCode =
      dto.code !== undefined ? dto.code?.trim() || null : existing.code;
    const trimmedDesc =
      dto.description !== undefined
        ? dto.description?.trim() || null
        : existing.description;
    const targetDepartmentId =
      dto.departmentId !== undefined
        ? dto.departmentId?.trim() || null
        : existing.departmentId;

    // 1. Code uniqueness check
    if (trimmedCode && trimmedCode !== existing.code) {
      const existingWithCode = await this.repo.findDesignationByCode(
        tenantId,
        companyId,
        trimmedCode,
      );
      if (existingWithCode && existingWithCode.id !== id) {
        throw new ConflictError(
          `Designation code "${trimmedCode}" is already in use in this company`,
        );
      }
    }

    // 2. Department validation & Structural Move
    const isDepartmentMove = targetDepartmentId !== existing.departmentId;
    if (isDepartmentMove && targetDepartmentId !== null) {
      const dept = await this.deptRepo.findDepartmentById(
        tenantId,
        companyId,
        targetDepartmentId,
      );
      if (!dept) {
        throw new ValidationError(
          `Target department not found or does not belong to this company (ID: ${targetDepartmentId})`,
        );
      }
      if (dept.status !== 'active') {
        throw new ValidationError(
          `Cannot move designation to inactive department "${dept.name}"`,
        );
      }
    }

    // 3. Structural Move Impact Check (NO SILENT EMPLOYEE MUTATION)
    let affectedEmployeeCount = 0;
    if (isDepartmentMove) {
      affectedEmployeeCount = await this.repo.countActiveEmployees(
        tenantId,
        companyId,
        id,
      );

      // If active employees use this designation and caller has not explicitly confirmed:
      if (affectedEmployeeCount > 0 && !dto.confirmStructuralMove) {
        throw new ConflictError(
          `${affectedEmployeeCount} active employee(s) currently use this designation. Changing the department mapping will not move or modify those employees. Please confirm to proceed.`,
          'STRUCTURAL_MOVE_CONFIRMATION_REQUIRED',
        );
      }
    }

    // 4. Update designation
    const updated = await this.repo.updateDesignation(tenantId, companyId, id, {
      name: trimmedName,
      code: trimmedCode,
      description: trimmedDesc,
      departmentId: targetDepartmentId,
      status: dto.status,
    });

    if (!updated) {
      throw new NotFoundError(`Designation not found for ID: ${id}`);
    }

    // 5. Audit log
    const auditAction = isDepartmentMove
      ? 'designation.structural_move'
      : 'designation.update';

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: auditAction,
      targetType: 'designation',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        name: updated.name,
        code: updated.code,
        previousDepartmentId: existing.departmentId,
        newDepartmentId: targetDepartmentId,
        affectedEmployeeCount,
        status: updated.status,
      },
    });

    return updated;
  }

  /**
   * Deactivate designation (safe lifecycle: preserves employee records and history).
   */
  async deactivateDesignation(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<{ designation: DesignationRecord; affectedEmployeeCount: number }> {
    const existing = await this.repo.findDesignationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Designation not found for ID: ${id}`);
    }

    const affectedEmployeeCount = await this.repo.countActiveEmployees(
      tenantId,
      companyId,
      id,
    );

    const updated = await this.repo.setStatus(tenantId, companyId, id, 'inactive');
    if (!updated) {
      throw new NotFoundError(`Designation not found for ID: ${id}`);
    }

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'designation.deactivate',
      targetType: 'designation',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        name: updated.name,
        code: updated.code,
        affectedEmployeeCount,
      },
    });

    return {
      designation: updated,
      affectedEmployeeCount,
    };
  }

  /**
   * Reactivate an inactive designation.
   */
  async reactivateDesignation(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<DesignationRecord> {
    const existing = await this.repo.findDesignationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Designation not found for ID: ${id}`);
    }

    const updated = await this.repo.setStatus(tenantId, companyId, id, 'active');
    if (!updated) {
      throw new NotFoundError(`Designation not found for ID: ${id}`);
    }

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'designation.reactivate',
      targetType: 'designation',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        name: updated.name,
        code: updated.code,
      },
    });

    return updated;
  }

  /**
   * Set status directly.
   */
  async setStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: DesignationStatus,
    actor?: { userId?: string; email?: string },
  ): Promise<DesignationRecord> {
    if (status === 'inactive') {
      const res = await this.deactivateDesignation(tenantId, companyId, id, actor);
      return res.designation;
    }
    return this.reactivateDesignation(tenantId, companyId, id, actor);
  }

  private async safeRecordAudit(input: {
    actorUserId?: string | null;
    actorEmail?: string | null;
    action: string;
    targetType: string;
    targetId: string;
    tenantId: string;
    companyId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await auditRepository.record(input);
    } catch (err) {
      console.warn('[DesignationService] Failed to record audit log:', err);
    }
  }
}

export const designationService = new DesignationService();
