import { companyRepository, CompanyRepository } from '../repository/company.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../app/errors/AppError.js';
import type {
  CompanyFilter,
  CompanyRecord,
  CreateCompanyDto,
  UpdateCompanyDto,
} from '../types/company.types.js';

export class CompanyService {
  constructor(
    private readonly repo: CompanyRepository = companyRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async listCompanies(filter: CompanyFilter): Promise<{ items: CompanyRecord[]; total: number }> {
    return this.repo.list(filter);
  }

  async getCompanyById(id: string): Promise<CompanyRecord> {
    const company = await this.repo.findById(id);
    if (!company) {
      throw new NotFoundError(`Company '${id}' not found`);
    }
    return company;
  }

  async createCompany(
    dto: CreateCompanyDto,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const tenant = await this.tenantRepo.findById(dto.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${dto.tenantId}' not found`);
    }
    if (tenant.status === 'suspended') {
      throw new BadRequestError(`Cannot create company under suspended tenant '${tenant.name}'`);
    }

    const existingCode = await this.repo.findByTenantAndCode(dto.tenantId, dto.code);
    if (existingCode) {
      throw new ConflictError(`Company with code '${dto.code}' already exists for this tenant`);
    }

    const created = await this.repo.create(dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_created',
      targetType: 'company',
      targetId: created.id,
      tenantId: dto.tenantId,
      companyId: created.id,
      metadata: { name: created.name, code: created.code },
    });

    return created;
  }

  async updateCompany(
    id: string,
    dto: UpdateCompanyDto,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const existing = await this.getCompanyById(id);
    const updated = await this.repo.update(id, dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_updated',
      targetType: 'company',
      targetId: id,
      tenantId: existing.tenantId,
      companyId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async activateCompany(
    id: string,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const existing = await this.getCompanyById(id);
    const updated = await this.repo.updateStatus(id, 'active');

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_reactivated',
      targetType: 'company',
      targetId: id,
      tenantId: existing.tenantId,
      companyId: id,
    });

    return updated;
  }

  async suspendCompany(
    id: string,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const existing = await this.getCompanyById(id);
    const updated = await this.repo.updateStatus(id, 'suspended');

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_suspended',
      targetType: 'company',
      targetId: id,
      tenantId: existing.tenantId,
      companyId: id,
    });

    return updated;
  }
}

export const companyService = new CompanyService();
