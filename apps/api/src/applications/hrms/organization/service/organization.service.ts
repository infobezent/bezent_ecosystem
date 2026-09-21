import { OrganizationRepository } from '../repository/organization.repository.js';
import { NotFoundError } from '../../../../app/errors/AppError.js';

export class OrganizationService {
  constructor(private readonly repo = new OrganizationRepository()) {}

  async getMasters(tenantId: string, companyId: string) {
    const masters = await this.repo.getMasters(tenantId, companyId);
    if (!masters.company) {
      throw new NotFoundError(`Company not found for ID: ${companyId}`);
    }
    return masters;
  }
}
