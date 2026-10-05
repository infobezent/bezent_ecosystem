import { tenantRepository, TenantRepository } from '../repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../app/errors/AppError.js';
import type {
  CompanyCapacitySummary,
  CreateTenantDto,
  TenantFilter,
  TenantRecord,
  UpdateTenantDto,
} from '../types/tenant.types.js';

export class TenantService {
  constructor(
    private readonly repo: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async listTenants(filter: TenantFilter): Promise<{ items: TenantRecord[]; total: number }> {
    return this.repo.list(filter);
  }

  async getTenantById(id: string): Promise<TenantRecord> {
    const tenant = await this.repo.findById(id);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${id}' not found`);
    }
    return tenant;
  }

  async createTenant(
    dto: CreateTenantDto,
    actor?: { id?: string; email?: string },
  ): Promise<TenantRecord> {
    const existingCode = await this.repo.findByCode(dto.code);
    if (existingCode) {
      throw new ConflictError(`Tenant with code '${dto.code}' already exists`);
    }

    if (dto.id) {
      const existingId = await this.repo.findById(dto.id);
      if (existingId) {
        throw new ConflictError(`Tenant with ID '${dto.id}' already exists`);
      }
    }

    const created = await this.repo.create(dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_created',
      targetType: 'tenant',
      targetId: created.id,
      tenantId: created.id,
      metadata: { name: created.name, code: created.code, status: created.status },
    });

    return created;
  }

  async updateTenant(
    id: string,
    dto: UpdateTenantDto,
    actor?: { id?: string; email?: string },
  ): Promise<TenantRecord> {
    await this.getTenantById(id);
    const updated = await this.repo.update(id, dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_updated',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async activateTenant(id: string, actor?: { id?: string; email?: string }): Promise<TenantRecord> {
    await this.getTenantById(id);
    const updated = await this.repo.updateStatus(id, 'active');

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_reactivated',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      metadata: { previousStatus: 'suspended', newStatus: 'active' },
    });

    return updated;
  }

  async suspendTenant(id: string, actor?: { id?: string; email?: string }): Promise<TenantRecord> {
    await this.getTenantById(id);
    const updated = await this.repo.updateStatus(id, 'suspended');

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_suspended',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      metadata: { previousStatus: 'active', newStatus: 'suspended' },
    });

    return updated;
  }

  async getCompanyCapacity(id: string): Promise<CompanyCapacitySummary> {
    const tenant = await this.getTenantById(id);
    return this.repo.getCapacity(tenant.id);
  }

  async updateCompanyCapacity(
    id: string,
    maxCompanies: number,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyCapacitySummary> {
    const tenant = await this.getTenantById(id);

    if (!Number.isInteger(maxCompanies) || maxCompanies < 1) {
      throw new BadRequestError(
        'maxCompanies must be a positive integer',
        'INVALID_COMPANY_CAPACITY',
      );
    }

    const currentUsage = await this.repo.countCapacityConsumingCompanies(id);
    if (maxCompanies < currentUsage) {
      throw new ConflictError(
        `Cannot set company capacity to ${maxCompanies}. Tenant already has ${currentUsage} companies consuming capacity.`,
        'COMPANY_CAPACITY_BELOW_CURRENT_USAGE',
      );
    }

    const previousMax = tenant.maxCompanies;
    await this.repo.updateCapacity(id, maxCompanies);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_company_capacity_updated',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      companyId: null,
      metadata: {
        previousMaxCompanies: previousMax,
        newMaxCompanies: maxCompanies,
        currentUsage,
      },
    });

    return {
      used: currentUsage,
      max: maxCompanies,
      remaining: maxCompanies - currentUsage,
    };
  }
}

export const tenantService = new TenantService();
