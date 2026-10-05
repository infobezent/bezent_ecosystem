import { DepartmentRepository, departmentRepository } from '../repository/department.repository.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../app/errors/AppError.js';
import { auditRepository } from '../../audit/repository/audit.repository.js';
import type {
  DepartmentRecord,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentStatus,
  DepartmentFilter,
} from '../types/department.types.js';

export interface DepartmentActorContext {
  userId?: string | null;
  email?: string | null;
}

export class DepartmentService {
  constructor(private readonly repo: DepartmentRepository = departmentRepository) {}

  async listDepartments(
    tenantId: string,
    companyId: string,
    filter?: DepartmentFilter,
  ): Promise<DepartmentRecord[]> {
    return this.repo.listDepartments(tenantId, companyId, filter);
  }

  async getDepartmentById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DepartmentRecord> {
    const dept = await this.repo.findDepartmentById(tenantId, companyId, id);
    if (!dept) {
      throw new NotFoundError(`Department not found for ID: ${id}`);
    }
    return dept;
  }

  async createDepartment(
    tenantId: string,
    companyId: string,
    dto: CreateDepartmentDto,
    actor?: DepartmentActorContext,
  ): Promise<DepartmentRecord> {
    const trimmedName = dto.name.trim();
    const trimmedCode = dto.code?.trim() || null;
    let businessUnitId = dto.businessUnitId?.trim() || null;
    const divisionId = dto.divisionId?.trim() || null;
    const parentDepartmentId = dto.parentDepartmentId?.trim() || null;
    const headEmployeeId = dto.headEmployeeId?.trim() || null;

    // 1. Code uniqueness
    if (trimmedCode) {
      const existing = await this.repo.findDepartmentByCode(tenantId, companyId, trimmedCode);
      if (existing) {
        throw new ConflictError(
          `Department code "${trimmedCode}" is already in use in this company`,
        );
      }
    }

    // 2. Division validation (must be validated before or alongside BU)
    if (divisionId) {
      const div = await this.repo.findDivision(tenantId, companyId, divisionId);
      if (!div) {
        throw new BadRequestError('Division does not exist in this company');
      }
      if (div.status === 'inactive') {
        throw new BadRequestError('Cannot assign department to an inactive division');
      }
      if (businessUnitId && div.businessUnitId !== businessUnitId) {
        throw new BadRequestError('Division does not belong to the selected business unit');
      }
      // If division was selected without explicit BU, automatically bind to division's BU
      if (!businessUnitId) {
        businessUnitId = div.businessUnitId;
      }
    }

    // 3. Business Unit validation
    if (businessUnitId) {
      const bu = await this.repo.findBusinessUnit(tenantId, companyId, businessUnitId);
      if (!bu) {
        throw new BadRequestError('Business unit does not exist in this company');
      }
      if (bu.status === 'inactive') {
        throw new BadRequestError('Cannot assign department to an inactive business unit');
      }
    }

    // 4. Parent Department validation & compatible placement
    if (parentDepartmentId) {
      const parent = await this.repo.findDepartmentById(tenantId, companyId, parentDepartmentId);
      if (!parent) {
        throw new BadRequestError('Parent department does not exist in this company');
      }
      if (parent.status === 'inactive') {
        throw new BadRequestError('Cannot assign an inactive department as parent');
      }

      // Check placement compatibility
      if (parent.businessUnitId) {
        if (businessUnitId && businessUnitId !== parent.businessUnitId) {
          throw new BadRequestError(
            'Child department business unit must match parent department business unit',
          );
        }
        if (!businessUnitId) {
          businessUnitId = parent.businessUnitId;
        }
      }

      if (parent.divisionId) {
        if (divisionId && divisionId !== parent.divisionId) {
          throw new BadRequestError(
            'Child department division must match parent department division',
          );
        }
      }
    }

    // 5. Department Head validation
    if (headEmployeeId) {
      const emp = await this.repo.findEmployee(tenantId, companyId, headEmployeeId);
      if (!emp) {
        throw new BadRequestError('Department head employee does not exist in this company');
      }
      if (
        emp.employmentStatus === 'terminated' ||
        emp.employmentStatus === 'suspended' ||
        emp.employmentStatus === 'resigned'
      ) {
        throw new BadRequestError('Department head must be an active employee in this company');
      }
    }

    const created = await this.repo.createDepartment(tenantId, companyId, {
      name: trimmedName,
      code: trimmedCode,
      description: dto.description?.trim() || null,
      businessUnitId,
      divisionId,
      parentDepartmentId,
      headEmployeeId,
      status: dto.status ?? 'active',
    });

    // Audit log
    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'department.create',
      targetType: 'department',
      targetId: created.id,
      tenantId,
      companyId,
      metadata: {
        name: created.name,
        code: created.code,
        businessUnitId: created.businessUnitId,
        divisionId: created.divisionId,
        parentDepartmentId: created.parentDepartmentId,
        headEmployeeId: created.headEmployeeId,
      },
    });

    return created;
  }

  async updateDepartment(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDepartmentDto,
    actor?: DepartmentActorContext,
  ): Promise<DepartmentRecord> {
    const existing = await this.repo.findDepartmentById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Department not found for ID: ${id}`);
    }

    const trimmedName = dto.name.trim();
    const trimmedCode = dto.code?.trim() || null;
    let businessUnitId =
      dto.businessUnitId !== undefined
        ? dto.businessUnitId?.trim() || null
        : existing.businessUnitId;
    const divisionId =
      dto.divisionId !== undefined ? dto.divisionId?.trim() || null : existing.divisionId;
    const parentDepartmentId =
      dto.parentDepartmentId !== undefined
        ? dto.parentDepartmentId?.trim() || null
        : existing.parentDepartmentId;
    const headEmployeeId =
      dto.headEmployeeId !== undefined
        ? dto.headEmployeeId?.trim() || null
        : existing.headEmployeeId;

    // 1. Code uniqueness check
    if (trimmedCode) {
      const codeMatch = await this.repo.findDepartmentByCode(tenantId, companyId, trimmedCode);
      if (codeMatch && codeMatch.id !== id) {
        throw new ConflictError(
          `Department code "${trimmedCode}" is already in use by another department in this company`,
        );
      }
    }

    // 2. Division validation
    if (divisionId) {
      const div = await this.repo.findDivision(tenantId, companyId, divisionId);
      if (!div) {
        throw new BadRequestError('Division does not exist in this company');
      }
      if (div.status === 'inactive' && divisionId !== existing.divisionId) {
        throw new BadRequestError('Cannot assign department to an inactive division');
      }
      if (businessUnitId && div.businessUnitId !== businessUnitId) {
        throw new BadRequestError('Division does not belong to the selected business unit');
      }
      if (!businessUnitId) {
        businessUnitId = div.businessUnitId;
      }
    }

    // 3. Business Unit validation
    if (businessUnitId) {
      const bu = await this.repo.findBusinessUnit(tenantId, companyId, businessUnitId);
      if (!bu) {
        throw new BadRequestError('Business unit does not exist in this company');
      }
      if (bu.status === 'inactive' && businessUnitId !== existing.businessUnitId) {
        throw new BadRequestError('Cannot assign department to an inactive business unit');
      }
    }

    // 4. Parent Department & Cycle & Compatibility validation
    if (parentDepartmentId) {
      if (parentDepartmentId === id) {
        throw new BadRequestError('A department cannot be its own parent');
      }

      const parent = await this.repo.findDepartmentById(tenantId, companyId, parentDepartmentId);
      if (!parent) {
        throw new BadRequestError('Parent department does not exist in this company');
      }
      if (parent.status === 'inactive' && parentDepartmentId !== existing.parentDepartmentId) {
        throw new BadRequestError('Cannot assign an inactive department as parent');
      }

      // Cycle check: verify that this department is not an ancestor of parentDepartmentId
      let currentCheck: DepartmentRecord | null = parent;
      const visited = new Set<string>([id]);
      while (currentCheck && currentCheck.parentDepartmentId) {
        if (visited.has(currentCheck.parentDepartmentId)) {
          throw new BadRequestError(
            'Circular hierarchy detected: a department cannot have its own descendant as parent',
          );
        }
        visited.add(currentCheck.id);
        currentCheck = await this.repo.findDepartmentById(
          tenantId,
          companyId,
          currentCheck.parentDepartmentId,
        );
      }

      // Placement compatibility
      if (parent.businessUnitId) {
        if (businessUnitId && businessUnitId !== parent.businessUnitId) {
          throw new BadRequestError(
            'Child department business unit must match parent department business unit',
          );
        }
        if (!businessUnitId) {
          businessUnitId = parent.businessUnitId;
        }
      }

      if (parent.divisionId) {
        if (divisionId && divisionId !== parent.divisionId) {
          throw new BadRequestError(
            'Child department division must match parent department division',
          );
        }
      }
    }

    // 5. Department Head validation
    if (headEmployeeId) {
      const emp = await this.repo.findEmployee(tenantId, companyId, headEmployeeId);
      if (!emp) {
        throw new BadRequestError('Department head employee does not exist in this company');
      }
      if (
        emp.employmentStatus === 'terminated' ||
        emp.employmentStatus === 'suspended' ||
        emp.employmentStatus === 'resigned'
      ) {
        throw new BadRequestError('Department head must be an active employee in this company');
      }
    }

    const isStructuralMove =
      businessUnitId !== existing.businessUnitId ||
      divisionId !== existing.divisionId ||
      parentDepartmentId !== existing.parentDepartmentId;

    const updated = await this.repo.updateDepartment(tenantId, companyId, id, {
      name: trimmedName,
      code: trimmedCode,
      description:
        dto.description !== undefined ? dto.description?.trim() || null : existing.description,
      businessUnitId,
      divisionId,
      parentDepartmentId,
      headEmployeeId,
      status: dto.status ?? existing.status,
    });

    // Audit log
    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: isStructuralMove ? 'department.move' : 'department.update',
      targetType: 'department',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        isStructuralMove,
        previousPlacement: {
          businessUnitId: existing.businessUnitId,
          divisionId: existing.divisionId,
          parentDepartmentId: existing.parentDepartmentId,
        },
        newPlacement: {
          businessUnitId: updated.businessUnitId,
          divisionId: updated.divisionId,
          parentDepartmentId: updated.parentDepartmentId,
        },
      },
    });

    return updated;
  }

  async setDepartmentStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: DepartmentStatus,
    actor?: DepartmentActorContext,
  ): Promise<DepartmentRecord> {
    const existing = await this.repo.findDepartmentById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Department not found for ID: ${id}`);
    }

    if (existing.status === status) {
      return existing;
    }

    if (status === 'inactive') {
      // Rule: If Department has ACTIVE child departments, BLOCK deactivation in V1
      const activeChildren = await this.repo.countActiveChildDepartments(tenantId, companyId, id);
      if (activeChildren > 0) {
        throw new BadRequestError(
          `Cannot deactivate department with ${activeChildren} active sub-department(s). Deactivate or reassign child departments first.`,
        );
      }
    } else if (status === 'active') {
      // If reactivating, verify parent department (if any) is active
      if (existing.parentDepartmentId) {
        const parent = await this.repo.findDepartmentById(
          tenantId,
          companyId,
          existing.parentDepartmentId,
        );
        if (parent && parent.status === 'inactive') {
          throw new BadRequestError(
            'Cannot activate department because its parent department is inactive. Reactivate parent department first.',
          );
        }
      }

      // Verify business unit (if any) is active
      if (existing.businessUnitId) {
        const bu = await this.repo.findBusinessUnit(tenantId, companyId, existing.businessUnitId);
        if (bu && bu.status === 'inactive') {
          throw new BadRequestError(
            'Cannot activate department because its parent business unit is inactive',
          );
        }
      }

      // Verify division (if any) is active
      if (existing.divisionId) {
        const div = await this.repo.findDivision(tenantId, companyId, existing.divisionId);
        if (div && div.status === 'inactive') {
          throw new BadRequestError(
            'Cannot activate department because its parent division is inactive',
          );
        }
      }
    }

    const updated = await this.repo.setDepartmentStatus(tenantId, companyId, id, status);

    // Audit log
    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: status === 'inactive' ? 'department.deactivate' : 'department.reactivate',
      targetType: 'department',
      targetId: id,
      tenantId,
      companyId,
      metadata: { previousStatus: existing.status, newStatus: status },
    });

    return updated;
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
      // Non-blocking for primary business flow but logged
      console.warn('[DepartmentService] Failed to record audit log:', err);
    }
  }
}

export const departmentService = new DepartmentService();
