import { OrganizationRepository } from '../repository/organization.repository.js';
import { NotFoundError } from '../../../app/errors/AppError.js';
import type { UpdateOrganizationProfileDto } from '../types/organization.types.js';

export class OrganizationService {
  constructor(private readonly repo = new OrganizationRepository()) {}

  async getMasters(tenantId: string, companyId: string) {
    const masters = await this.repo.getMasters(tenantId, companyId);
    if (!masters.company) {
      throw new NotFoundError(`Company not found for ID: ${companyId}`);
    }
    return masters;
  }

  async getProfile(tenantId: string, companyId: string) {
    const profile = await this.repo.getProfile(tenantId, companyId);
    if (!profile) {
      throw new NotFoundError(`Company not found for ID: ${companyId}`);
    }
    return profile;
  }

  async updateProfile(tenantId: string, companyId: string, data: UpdateOrganizationProfileDto) {
    const updated = await this.repo.updateProfile(tenantId, companyId, data);
    if (!updated) {
      throw new NotFoundError(`Company not found for ID: ${companyId}`);
    }
    return updated;
  }

  async getSummary(companyId: string) {
    return this.repo.getSummary(companyId);
  }
}

export const organizationService = new OrganizationService();
