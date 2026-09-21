import { randomUUID } from 'node:crypto';
import { OnboardingRepository } from '../repository/onboarding.repository.js';
import type { CreateNewHireDto, OnboardingCaseListItem } from '../types/onboarding.types.js';
import { NotFoundError } from '../../../../app/errors/AppError.js';

export class OnboardingService {
  constructor(private readonly repo = new OnboardingRepository()) {}

  async listNewHires(tenantId: string, companyId: string): Promise<OnboardingCaseListItem[]> {
    return this.repo.listByCompany(tenantId, companyId);
  }

  async getNewHireById(
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
    });

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve newly created onboarding case');
    }
    return fullRecord;
  }
}
