import { randomUUID } from 'node:crypto';
import { OnboardingRepository } from '../repository/onboarding.repository.js';
import type {
  CreateNewHireDto,
  CreateCaseDto,
  UpdateDraftDto,
  SubmitCaseDto,
  OnboardingCaseListItem,
} from '../types/onboarding.types.js';
import { NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';

export class OnboardingService {
  constructor(private readonly repo = new OnboardingRepository()) {}

  async listNewHires(tenantId: string, companyId: string): Promise<OnboardingCaseListItem[]> {
    return this.repo.listByCompany(tenantId, companyId);
  }

  async listCases(
    tenantId: string,
    companyId: string,
    filters?: { status?: string },
  ): Promise<OnboardingCaseListItem[]> {
    return this.repo.listByCompany(tenantId, companyId, filters);
  }

  async getCaseById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingCaseListItem> {
    const item = await this.repo.getById(tenantId, companyId, id);
    if (!item) {
      throw new NotFoundError(`Onboarding case not found for ID: ${id}`);
    }
    return item;
  }

  async getNewHireById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingCaseListItem> {
    return this.getCaseById(tenantId, companyId, id);
  }

  async createNewHire(
    tenantId: string,
    companyId: string,
    dto: CreateNewHireDto,
  ): Promise<OnboardingCaseListItem> {
    const id = `case_${randomUUID()}`;

    await this.repo.create({
      id,
      tenantId,
      companyId,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      locationId: dto.locationId ?? null,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      email: dto.email,
      phone: dto.phone ?? null,
      joiningDate: dto.joiningDate,
      employmentType: dto.employmentType ?? 'full_time',
      stage: 'preboarding',
      status: 'active',
      version: 1,
    });

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve newly created onboarding case');
    }
    return fullRecord;
  }

  async createCase(
    tenantId: string,
    companyId: string,
    dto: CreateCaseDto,
  ): Promise<OnboardingCaseListItem> {
    const id = `case_${randomUUID()}`;
    const status = dto.status ?? 'draft';

    await this.repo.create({
      id,
      tenantId,
      companyId,
      departmentId: dto.departmentId ?? null,
      designationId: dto.designationId ?? null,
      locationId: dto.locationId ?? null,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      joiningDate: dto.joiningDate ?? null,
      employmentType: dto.employmentType ?? 'full_time',
      stage: 'preboarding',
      status,
      version: 1,
      draftPayload: dto.draftPayload ?? null,
    });

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve newly created onboarding case');
    }
    return fullRecord;
  }

  async updateDraft(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDraftDto,
  ): Promise<OnboardingCaseListItem> {
    const existing = await this.getCaseById(tenantId, companyId, id);
    if (existing.status !== 'draft') {
      throw new ConflictError(
        `Cannot update draft: Case ${id} is in '${existing.status}' status, not 'draft'`,
      );
    }

    const expectedVersion = dto.version ?? existing.version;

    const updated = await this.repo.updateWithVersion(tenantId, companyId, id, expectedVersion, {
      firstName: dto.firstName !== undefined ? dto.firstName : existing.firstName,
      lastName: dto.lastName !== undefined ? dto.lastName : existing.lastName,
      email: dto.email !== undefined ? dto.email : existing.email,
      phone: dto.phone !== undefined ? dto.phone : existing.phone,
      departmentId: dto.departmentId !== undefined ? dto.departmentId : existing.departmentId,
      designationId: dto.designationId !== undefined ? dto.designationId : existing.designationId,
      locationId: dto.locationId !== undefined ? dto.locationId : existing.locationId,
      joiningDate: dto.joiningDate !== undefined ? dto.joiningDate : existing.joiningDate,
      employmentType:
        dto.employmentType !== undefined ? dto.employmentType : existing.employmentType,
      draftPayload: dto.draftPayload !== undefined ? dto.draftPayload : existing.draftPayload,
    });

    if (!updated) {
      throw new ConflictError(
        `Optimistic lock conflict: Case ${id} has been modified by another operation (expected version ${expectedVersion})`,
      );
    }

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve updated onboarding case');
    }
    return fullRecord;
  }

  async submitCase(
    tenantId: string,
    companyId: string,
    id: string,
    dto: SubmitCaseDto,
  ): Promise<OnboardingCaseListItem> {
    const existing = await this.getCaseById(tenantId, companyId, id);
    if (existing.status !== 'draft') {
      throw new ConflictError(
        `Cannot submit case: Case ${id} is in '${existing.status}' status, not 'draft'`,
      );
    }

    const expectedVersion = dto.version ?? existing.version;

    const updated = await this.repo.updateWithVersion(tenantId, companyId, id, expectedVersion, {
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      email: dto.email,
      phone: dto.phone ?? null,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      locationId: dto.locationId ?? null,
      joiningDate: dto.joiningDate,
      employmentType: dto.employmentType ?? 'full_time',
      status: 'active',
    });

    if (!updated) {
      throw new ConflictError(
        `Optimistic lock conflict: Case ${id} has been modified by another operation (expected version ${expectedVersion})`,
      );
    }

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve submitted onboarding case');
    }
    return fullRecord;
  }

  async deleteDraft(tenantId: string, companyId: string, id: string): Promise<void> {
    const existing = await this.getCaseById(tenantId, companyId, id);
    if (existing.status !== 'draft') {
      throw new ConflictError(
        `Cannot delete case: Only 'draft' cases can be discarded (case is in '${existing.status}' status)`,
      );
    }

    const deleted = await this.repo.deleteDraft(tenantId, companyId, id);
    if (!deleted) {
      throw new NotFoundError(`Draft case not found or not in draft status: ${id}`);
    }
  }
}
