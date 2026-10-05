import { WorkLocationRepository } from '../repository/workLocation.repository.js';
import {
  type WorkLocationRecord,
  type CreateWorkLocationDto,
  type UpdateWorkLocationDto,
  type ListWorkLocationsFilter,
  type WorkLocationLifecycleResult,
} from '../types/workLocation.types.js';
import { NotFoundError, ConflictError, ValidationError } from '../../../app/errors/AppError.js';
import { auditRepository, AuditRepository } from '../../audit/repository/audit.repository.js';

export class WorkLocationService {
  constructor(
    private readonly repo = new WorkLocationRepository(),
    private readonly auditRepo: AuditRepository = auditRepository,
  ) {}

  /**
   * Safe audit recording helper.
   */
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
      await this.auditRepo.record({
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
      console.warn('[WorkLocationService] Failed to record audit log:', err);
    }
  }

  /**
   * List work locations with filtering.
   */
  async listWorkLocations(
    tenantId: string,
    companyId: string,
    filter: ListWorkLocationsFilter = {},
  ): Promise<{ items: WorkLocationRecord[]; total: number }> {
    return this.repo.listWorkLocations(tenantId, companyId, filter);
  }

  /**
   * Get single work location by ID.
   */
  async getWorkLocationById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<WorkLocationRecord> {
    const record = await this.repo.findWorkLocationById(tenantId, companyId, id);
    if (!record) {
      throw new NotFoundError(`Work location not found (ID: ${id})`);
    }
    return record;
  }

  /**
   * Create work location with company-scoped code uniqueness enforcement.
   */
  async createWorkLocation(
    tenantId: string,
    companyId: string,
    dto: CreateWorkLocationDto,
    actor?: { userId?: string; email?: string },
  ): Promise<WorkLocationRecord> {
    // 1. Check code uniqueness within company if provided
    if (dto.code) {
      const existingWithCode = await this.repo.findWorkLocationByCode(
        tenantId,
        companyId,
        dto.code,
      );
      if (existingWithCode) {
        throw new ConflictError(`Location code "${dto.code}" is already in use in this company`);
      }
    }

    // 2. Persist
    const created = await this.repo.createWorkLocation(tenantId, companyId, dto);

    // 3. Audit log
    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'work_location.create',
      targetType: 'work_location',
      targetId: created.id,
      tenantId,
      companyId,
      metadata: {
        name: created.name,
        code: created.code,
        type: created.type,
        city: created.city,
        country: created.country,
        status: created.status,
      },
    });

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
    actor?: { userId?: string; email?: string },
  ): Promise<WorkLocationRecord> {
    const existing = await this.repo.findWorkLocationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Work location not found (ID: ${id})`);
    }

    // Check code uniqueness if changed
    if (dto.code !== undefined && dto.code !== null && dto.code !== existing.code) {
      const existingWithCode = await this.repo.findWorkLocationByCode(
        tenantId,
        companyId,
        dto.code,
      );
      if (existingWithCode && existingWithCode.id !== id) {
        throw new ConflictError(`Location code "${dto.code}" is already in use in this company`);
      }
    }

    // Validate effective type and physical address
    const targetType = dto.type ?? existing.type;
    if (targetType !== 'remote') {
      const effAddr1 = dto.addressLine1 !== undefined ? dto.addressLine1 : existing.addressLine1;
      const effCountry = dto.country !== undefined ? dto.country : existing.country;
      const effState = dto.state !== undefined ? dto.state : existing.state;
      const effCity = dto.city !== undefined ? dto.city : existing.city;
      const effPostal = dto.postalCode !== undefined ? dto.postalCode : existing.postalCode;

      if (!effAddr1 || !effCountry || !effState || !effCity || !effPostal) {
        throw new ValidationError(
          'Physical locations require Address Line 1, Country, State, City, and Postal Code',
        );
      }
    }

    const updated = await this.repo.updateWorkLocation(tenantId, companyId, id, dto);

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'work_location.update',
      targetType: 'work_location',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        before: {
          name: existing.name,
          code: existing.code,
          type: existing.type,
          city: existing.city,
          country: existing.country,
        },
        after: {
          name: updated.name,
          code: updated.code,
          type: updated.type,
          city: updated.city,
          country: updated.country,
        },
      },
    });

    return updated;
  }

  /**
   * Deactivate work location.
   * Preserves all employee records and exposes active employee impact.
   */
  async deactivateWorkLocation(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<WorkLocationLifecycleResult> {
    const existing = await this.repo.findWorkLocationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Work location not found (ID: ${id})`);
    }

    const affectedCount = await this.repo.countActiveEmployees(tenantId, companyId, id);

    if (existing.status === 'inactive') {
      return {
        data: existing,
        affectedEmployeeCount: affectedCount,
        message: 'Work location is already inactive',
      };
    }

    const updated = await this.repo.setWorkLocationStatus(tenantId, companyId, id, 'inactive');

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'work_location.deactivate',
      targetType: 'work_location',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        affectedEmployeeCount: affectedCount,
        employeeRecordsMutated: false,
      },
    });

    return {
      data: updated,
      affectedEmployeeCount: affectedCount,
      message:
        affectedCount > 0
          ? `${affectedCount} active employee(s) currently reference this location. Existing assignments are preserved, but this location is now excluded from new assignments.`
          : 'Work location deactivated successfully',
    };
  }

  /**
   * Reactivate work location.
   */
  async reactivateWorkLocation(
    tenantId: string,
    companyId: string,
    id: string,
    actor?: { userId?: string; email?: string },
  ): Promise<WorkLocationLifecycleResult> {
    const existing = await this.repo.findWorkLocationById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Work location not found (ID: ${id})`);
    }

    const affectedCount = await this.repo.countActiveEmployees(tenantId, companyId, id);

    if (existing.status === 'active') {
      return {
        data: existing,
        affectedEmployeeCount: affectedCount,
        message: 'Work location is already active',
      };
    }

    const updated = await this.repo.setWorkLocationStatus(tenantId, companyId, id, 'active');

    await this.safeRecordAudit({
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: 'work_location.reactivate',
      targetType: 'work_location',
      targetId: id,
      tenantId,
      companyId,
      metadata: {
        affectedEmployeeCount: affectedCount,
      },
    });

    return {
      data: updated,
      affectedEmployeeCount: affectedCount,
      message: 'Work location reactivated successfully',
    };
  }
}
