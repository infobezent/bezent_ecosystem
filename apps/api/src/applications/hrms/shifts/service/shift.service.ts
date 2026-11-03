import { ShiftRepository, shiftRepository } from '../repository/shift.repository.js';
import { ShiftResolutionService, shiftResolutionService } from './shiftResolution.service.js';
import { AuditService } from '../../../../platform/audit/service/audit.service.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '../../../../app/errors/AppError.js';
import type {
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFilterQuery,
  CreateShiftAssignmentDto,
  UpdateShiftAssignmentDto,
  EndShiftAssignmentDto,
  AssignmentFilterQuery,
  ResolvedShiftDetail,
  EnrichedShiftAssignment,
} from '../types/shift.types.js';
import type { HrmsShift, HrmsShiftAssignment } from '../../../../db/schema.js';
import {
  validateCreateShift,
  validateUpdateShift,
  validateCreateAssignment,
  validateUpdateAssignment,
  validateEndAssignment,
} from '../validation/shift.schema.js';
import { DEFAULT_COMPANY_SHIFTS } from '../../attendance/repository/attendanceSettings.repository.js';

export class ShiftService {
  constructor(
    private readonly repo: ShiftRepository = shiftRepository,
    private readonly resolutionService: ShiftResolutionService = shiftResolutionService,
    private readonly auditService: AuditService = new AuditService(),
  ) {}

  // ---------------------------------------------------------------------------
  // Shift Definitions
  // ---------------------------------------------------------------------------

  async createShift(
    tenantId: string,
    companyId: string,
    input: unknown,
    userId?: string,
  ): Promise<HrmsShift> {
    const validated = validateCreateShift(input);

    const existingCode = await this.repo.getShiftByCode(tenantId, companyId, validated.code);
    if (existingCode) {
      throw new ConflictError(
        `A shift with code '${validated.code}' already exists in this company`,
      );
    }

    const shift = await this.repo.createShift({
      id: validated.id || undefined,
      tenantId,
      companyId,
      name: validated.name,
      code: validated.code,
      description: validated.description,
      startTime: validated.startTime,
      endTime: validated.endTime,
      workingDays: validated.workingDays,
      breakMinutes: validated.breakMinutes ?? 60,
      lunchMinutes: validated.lunchMinutes ?? 30,
      graceMinutes: validated.graceMinutes ?? 15,
      color: validated.color ?? '#2563EB',
      isActive: validated.isActive !== false,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift.created',
      targetType: 'shift',
      targetId: shift.id,
      metadata: {
        name: shift.name,
        code: shift.code,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isOvernight: shift.isOvernight,
      },
    });

    return shift;
  }

  async getShiftById(tenantId: string, companyId: string, id: string): Promise<HrmsShift> {
    const shift = await this.repo.getShiftById(tenantId, companyId, id);
    if (!shift) {
      throw new NotFoundError(`Shift with ID '${id}' was not found`);
    }
    return shift;
  }

  async listShifts(
    tenantId: string,
    companyId: string,
    query: ShiftFilterQuery = {},
  ): Promise<{ items: HrmsShift[]; total: number }> {
    // If company has no shifts seeded yet, seed defaults from DEFAULT_COMPANY_SHIFTS
    let result = await this.repo.listShifts(tenantId, companyId, query);
    if (
      result.total === 0 &&
      (!query.search || !query.search.trim()) &&
      (!query.status || query.status === 'all')
    ) {
      await this.seedDefaultCompanyShifts(tenantId, companyId);
      result = await this.repo.listShifts(tenantId, companyId, query);
    }
    return result;
  }

  async updateShift(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    userId?: string,
  ): Promise<HrmsShift> {
    const validated = validateUpdateShift(input);
    const existing = await this.getShiftById(tenantId, companyId, id);

    if (validated.code && validated.code !== existing.code) {
      const codeClash = await this.repo.getShiftByCode(tenantId, companyId, validated.code);
      if (codeClash && codeClash.id !== id) {
        throw new ConflictError(`A shift with code '${validated.code}' already exists`);
      }
    }

    const updated = await this.repo.updateShift(tenantId, companyId, id, {
      ...validated,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundError(`Shift with ID '${id}' was not found`);
    }

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift.updated',
      targetType: 'shift',
      targetId: id,
      metadata: {
        previous: {
          name: existing.name,
          code: existing.code,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isActive: existing.isActive,
        },
        current: {
          name: updated.name,
          code: updated.code,
          startTime: updated.startTime,
          endTime: updated.endTime,
          isActive: updated.isActive,
        },
      },
    });

    return updated;
  }

  async setShiftStatus(
    tenantId: string,
    companyId: string,
    id: string,
    isActive: boolean,
    userId?: string,
  ): Promise<HrmsShift> {
    const existing = await this.getShiftById(tenantId, companyId, id);
    const updated = await this.repo.updateShift(tenantId, companyId, id, {
      isActive,
      updatedBy: userId,
    });
    if (!updated) {
      throw new NotFoundError(`Shift with ID '${id}' was not found`);
    }

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift.status_changed',
      targetType: 'shift',
      targetId: id,
      metadata: {
        previousActive: existing.isActive,
        currentActive: updated.isActive,
      },
    });

    return updated;
  }

  async deleteShift(
    tenantId: string,
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const existing = await this.getShiftById(tenantId, companyId, id);

    // Prevent deletion if active assignments reference this shift
    const assignments = await this.repo.listAssignments(tenantId, companyId, {
      shiftId: id,
      status: 'active',
      limit: 1,
    });
    if (assignments.total > 0) {
      throw new ConflictError(
        'Cannot delete shift while active shift assignments are currently assigned to it',
      );
    }

    await this.repo.deleteShift(tenantId, companyId, id);

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift.deleted',
      targetType: 'shift',
      targetId: id,
      metadata: {
        name: existing.name,
        code: existing.code,
      },
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Shift Assignments
  // ---------------------------------------------------------------------------

  async createAssignment(
    tenantId: string,
    companyId: string,
    input: unknown,
    userId?: string,
  ): Promise<HrmsShiftAssignment> {
    const validated = validateCreateAssignment(input);

    // 1. Verify shift existence & tenancy
    const shift = await this.getShiftById(tenantId, companyId, validated.shiftId);
    if (!shift.isActive) {
      throw new BadRequestError(`Cannot assign inactive shift '${shift.name}'`);
    }

    // 2. Validate target existence within company
    const targetId = validated.targetId!;
    if (validated.assignmentScope === 'employee') {
      const org = await this.repo.getEmployeeWithOrg(tenantId, companyId, targetId);
      if (!org) {
        throw new NotFoundError(`Employee '${targetId}' was not found in this company`);
      }
    } else if (validated.assignmentScope === 'department') {
      const dept = await this.repo.getDepartment(tenantId, companyId, targetId);
      if (!dept) {
        throw new NotFoundError(`Department '${targetId}' was not found in this company`);
      }
    } else if (validated.assignmentScope === 'location') {
      const loc = await this.repo.getLocation(tenantId, companyId, targetId);
      if (!loc) {
        throw new NotFoundError(`Location '${targetId}' was not found in this company`);
      }
    }

    // 3. Check for overlapping active assignments
    const overlaps = await this.repo.findOverlappingAssignments(
      tenantId,
      companyId,
      validated.assignmentScope,
      targetId,
      validated.effectiveStartDate,
      validated.effectiveEndDate ?? null,
    );

    if (overlaps.length > 0) {
      throw new ConflictError(
        `Active shift assignment already exists for this ${validated.assignmentScope} within the specified effective period (${validated.effectiveStartDate} to ${validated.effectiveEndDate || 'Indefinite'})`,
      );
    }

    // 4. Create assignment
    const assignment = await this.repo.createAssignment({
      tenantId,
      companyId,
      shiftId: validated.shiftId,
      assignmentScope: validated.assignmentScope,
      employeeId: validated.employeeId ?? null,
      departmentId: validated.departmentId ?? null,
      locationId: validated.locationId ?? null,
      effectiveStartDate: validated.effectiveStartDate,
      effectiveEndDate: validated.effectiveEndDate ?? null,
      isActive: validated.isActive !== false,
      notes: validated.notes,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift_assignment.created',
      targetType: 'shift_assignment',
      targetId: assignment.id,
      metadata: {
        shiftId: assignment.shiftId,
        scope: assignment.assignmentScope,
        effectiveStartDate: assignment.effectiveStartDate,
        effectiveEndDate: assignment.effectiveEndDate,
      },
    });

    return assignment;
  }

  async getAssignmentById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<HrmsShiftAssignment> {
    const asgn = await this.repo.getAssignmentById(tenantId, companyId, id);
    if (!asgn) {
      throw new NotFoundError(`Shift assignment '${id}' was not found`);
    }
    return asgn;
  }

  async listAssignments(
    tenantId: string,
    companyId: string,
    query: AssignmentFilterQuery = {},
  ): Promise<{ items: EnrichedShiftAssignment[]; total: number }> {
    return this.repo.listAssignments(tenantId, companyId, query);
  }

  async updateAssignment(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    userId?: string,
  ): Promise<HrmsShiftAssignment> {
    const validated = validateUpdateAssignment(input);
    const existing = await this.getAssignmentById(tenantId, companyId, id);

    const targetId = existing.employeeId || existing.departmentId || existing.locationId || '';
    const newStart = validated.effectiveStartDate ?? existing.effectiveStartDate;
    const newEnd =
      validated.effectiveEndDate !== undefined
        ? validated.effectiveEndDate
        : existing.effectiveEndDate;

    if (newStart || newEnd !== undefined) {
      const overlaps = await this.repo.findOverlappingAssignments(
        tenantId,
        companyId,
        existing.assignmentScope,
        targetId,
        newStart,
        newEnd ?? null,
        id,
      );
      if (overlaps.length > 0) {
        throw new ConflictError('Updated assignment period overlaps with an existing assignment');
      }
    }

    const updated = await this.repo.updateAssignment(tenantId, companyId, id, {
      ...validated,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundError(`Shift assignment '${id}' was not found`);
    }

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift_assignment.updated',
      targetType: 'shift_assignment',
      targetId: id,
      metadata: {
        previous: {
          shiftId: existing.shiftId,
          effectiveStartDate: existing.effectiveStartDate,
          effectiveEndDate: existing.effectiveEndDate,
        },
        current: {
          shiftId: updated.shiftId,
          effectiveStartDate: updated.effectiveStartDate,
          effectiveEndDate: updated.effectiveEndDate,
        },
      },
    });

    return updated;
  }

  async endAssignment(
    tenantId: string,
    companyId: string,
    id: string,
    input: unknown,
    userId?: string,
  ): Promise<HrmsShiftAssignment> {
    const validated = validateEndAssignment(input);
    const existing = await this.getAssignmentById(tenantId, companyId, id);

    if (validated.effectiveEndDate < existing.effectiveStartDate) {
      throw new ValidationError('End date cannot precede assignment effective start date');
    }

    const updated = await this.repo.endAssignment(
      tenantId,
      companyId,
      id,
      validated.effectiveEndDate,
      userId,
    );

    if (!updated) {
      throw new NotFoundError(`Shift assignment '${id}' was not found`);
    }

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift_assignment.ended',
      targetType: 'shift_assignment',
      targetId: id,
      metadata: {
        previousEndDate: existing.effectiveEndDate,
        effectiveEndDate: updated.effectiveEndDate,
      },
    });

    return updated;
  }

  async deleteAssignment(
    tenantId: string,
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const existing = await this.getAssignmentById(tenantId, companyId, id);
    await this.repo.deleteAssignment(tenantId, companyId, id);

    await this.auditService.logEvent({
      actorUserId: userId,
      tenantId,
      companyId,
      action: 'shift_assignment.deleted',
      targetType: 'shift_assignment',
      targetId: id,
      metadata: {
        shiftId: existing.shiftId,
        scope: existing.assignmentScope,
      },
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Shift Resolution
  // ---------------------------------------------------------------------------

  async resolveEmployeeShift(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    punchInTime?: string,
    enableAutoShiftAllocation?: boolean,
    shiftMatchingWindowMinutes?: number,
  ): Promise<ResolvedShiftDetail> {
    return this.resolutionService.resolveEmployeeShift(
      tenantId,
      companyId,
      employeeId,
      date,
      punchInTime,
      enableAutoShiftAllocation,
      shiftMatchingWindowMinutes,
    );
  }

  // ---------------------------------------------------------------------------
  // Seeding Helpers
  // ---------------------------------------------------------------------------

  private async seedDefaultCompanyShifts(tenantId: string, companyId: string): Promise<void> {
    for (const s of DEFAULT_COMPANY_SHIFTS) {
      await this.repo
        .createShift({
          id: s.id,
          tenantId,
          companyId,
          name: s.name,
          code: s.code,
          description: s.description,
          startTime: s.startTime,
          endTime: s.endTime,
          workingDays: s.workingDays,
          breakMinutes: s.breakMinutes,
          lunchMinutes: s.lunchMinutes,
          graceMinutes: s.graceMinutes,
          isOvernight: s.isOvernight,
          color: s.color || '#2563EB',
          isActive: s.isActive,
        })
        .catch(() => null); // Ignore if exists
    }
  }
}

export const shiftService = new ShiftService();
