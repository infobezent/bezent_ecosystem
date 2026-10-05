import {
  tenantAdminRepository,
  TenantAdminRepository,
} from '../repository/tenantAdmin.repository.js';
import {
  platformUserRepository,
  PlatformUserRepository,
} from '../../users/repository/user.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import {
  companyRepository,
  CompanyRepository,
} from '../../companies/repository/company.repository.js';
import {
  moduleRepository,
  ModuleRepository,
} from '../../modules/repository/module.repository.js';
import {
  companyService,
  CompanyService,
} from '../../companies/service/company.service.js';
import type { CreateTenantAdminCompanyDto } from '../../companies/types/company.types.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { generateSurrogateId } from '../../auth/security.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from '../../../app/errors/AppError.js';
import type {
  AssignTenantAdminDto,
  TenantAdminAssignmentResult,
  TenantAdminRecord,
  TenantAdminContextSummary,
} from '../types/tenantAdmin.types.js';

export class TenantAdminService {
  constructor(
    private readonly repo: TenantAdminRepository = tenantAdminRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly companyRepo: CompanyRepository = companyRepository,
    private readonly moduleRepo: ModuleRepository = moduleRepository,
    private readonly audit: AuditService = auditService,
    private readonly companySvc: CompanyService = companyService,
  ) {}

  /** Answers whether a user holds active tenant-level administrative authority. */
  async isTenantAdmin(userId: string, tenantId: string): Promise<boolean> {
    if (!userId || !tenantId) return false;
    return this.repo.hasActiveTenantAdmin(tenantId, userId);
  }

  /**
   * Resolves the full context for the authenticated Tenant Administrator.
   * Derives tenant authority server-side.
   */
  async getTenantAdminContext(
    userId: string,
    claimedTenantId?: string,
  ): Promise<TenantAdminContextSummary> {
    const activeAdmins = await this.repo.listActiveByUser(userId);
    if (!activeAdmins || activeAdmins.length === 0) {
      throw new ForbiddenError(
        'Tenant Administrator authority required',
        'TENANT_ADMIN_AUTHORITY_REQUIRED',
      );
    }

    let targetAdmin: TenantAdminRecord;
    if (claimedTenantId) {
      const match = activeAdmins.find((a) => a.tenantId === claimedTenantId);
      if (!match) {
        throw new ForbiddenError(
          `User is not an authorized Tenant Administrator for tenant '${claimedTenantId}'`,
          'TENANT_ADMIN_AUTHORITY_REQUIRED',
        );
      }
      targetAdmin = match;
    } else {
      targetAdmin = activeAdmins[0]!;
    }

    const tenantId = targetAdmin.tenantId;
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError(`User '${userId}' not found`);
    }

    const companiesResult = await this.companyRepo.list({ tenantId, limit: 100 });

    // Fetch tenant-level entitlements ceiling
    const modules = await this.moduleRepo.listByTenant(tenantId, null);
    const enabledModules = modules
      .filter((m) => m.status === 'enabled')
      .map((m) => m.moduleCode);

    // HRMS default ceiling rule
    const hrmsDisabled = modules.some((m) => m.moduleCode === 'hrms' && m.status === 'disabled');
    const finalEntitlements = [...enabledModules];
    if (!hrmsDisabled && !finalEntitlements.includes('hrms')) {
      finalEntitlements.unshift('hrms');
    }

    // Company capacity visibility
    const max = tenant.maxCompanies ?? 5;
    const used = companiesResult.total;
    const remaining = Math.max(0, max - used);
    const canCreateCompany = used < max;
    const companyCapacity = {
      used,
      max,
      remaining: used >= max ? 0 : remaining,
      canCreateCompany,
    };

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code ?? null,
        status: tenant.status,
        contactEmail: tenant.contactEmail ?? null,
        contactPhone: tenant.contactPhone ?? null,
        createdAt: tenant.createdAt,
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenantAdmin: {
        id: targetAdmin.id,
        status: targetAdmin.status,
        createdAt:
          targetAdmin.createdAt instanceof Date
            ? targetAdmin.createdAt.toISOString()
            : String(targetAdmin.createdAt),
      },
      companies: companiesResult.items.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status,
        legalName: c.legalName,
        country: c.country,
        timeZone: c.timeZone,
      })),
      companyCapacity,
      entitlements: finalEntitlements,
    };
  }

  async getTenantDetails(tenantId: string) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}' not found`);
    return {
      id: tenant.id,
      name: tenant.name,
      code: tenant.code ?? null,
      status: tenant.status,
      contactEmail: tenant.contactEmail ?? null,
      contactPhone: tenant.contactPhone ?? null,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async listCompanies(tenantId: string) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}' not found`);
    const result = await this.companyRepo.list({ tenantId, limit: 100 });
    const max = tenant.maxCompanies ?? 5;
    const used = result.total;
    const remaining = Math.max(0, max - used);
    const canCreateCompany = used < max;
    return {
      items: result.items,
      capacity: {
        used,
        max,
        remaining: used >= max ? 0 : remaining,
        canCreateCompany,
      },
    };
  }

  async createCompany(
    tenantId: string,
    dto: CreateTenantAdminCompanyDto,
    actor?: { id?: string; email?: string },
  ) {
    return this.companySvc.createCompanyForTenantAdmin(tenantId, dto, actor);
  }

  async listTenantAdmins(tenantId: string): Promise<TenantAdminRecord[]> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}' not found`);
    return this.repo.listByTenant(tenantId);
  }

  async assignTenantAdmin(
    dto: AssignTenantAdminDto,
    actor?: { id?: string; email?: string },
  ): Promise<TenantAdminAssignmentResult> {
    const tenant = await this.tenantRepo.findById(dto.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${dto.tenantId}' not found`);
    }

    let targetUserId: string;

    if (dto.userId) {
      const user = await this.userRepo.findById(dto.userId);
      if (!user) {
        throw new NotFoundError(`User '${dto.userId}' not found`);
      }

      // Cross-tenant protection: check memberships
      if (user.memberships && user.memberships.length > 0) {
        const otherTenant = user.memberships.find((m) => m.tenantId !== dto.tenantId);
        if (otherTenant) {
          throw new BadRequestError(
            `User '${user.email}' is already associated with another tenant. Cross-tenant administrator assignment is prohibited.`,
            'CROSS_TENANT_ADMIN_PROHIBITED',
          );
        }
      }

      // Cross-tenant protection: check existing tenant_admins
      const otherTenantAdmins = await this.repo.listActiveByUser(user.id);
      const foreignAdmin = otherTenantAdmins.find((ta) => ta.tenantId !== dto.tenantId);
      if (foreignAdmin) {
        throw new BadRequestError(
          `User '${user.email}' already holds Tenant Admin authority in another tenant. Cross-tenant administrator assignment is prohibited.`,
          'CROSS_TENANT_ADMIN_PROHIBITED',
        );
      }

      targetUserId = user.id;
    } else if (dto.newUser) {
      const email = dto.newUser.email.toLowerCase().trim();
      const existingUser = await this.userRepo.findByEmail(email);

      if (existingUser) {
        if (existingUser.memberships && existingUser.memberships.length > 0) {
          const otherTenant = existingUser.memberships.find((m) => m.tenantId !== dto.tenantId);
          if (otherTenant) {
            throw new BadRequestError(
              `User with email '${email}' already exists in another tenant. Cross-tenant administrator assignment is prohibited.`,
              'CROSS_TENANT_ADMIN_PROHIBITED',
            );
          }
        }

        const otherTenantAdmins = await this.repo.listActiveByUser(existingUser.id);
        const foreignAdmin = otherTenantAdmins.find((ta) => ta.tenantId !== dto.tenantId);
        if (foreignAdmin) {
          throw new BadRequestError(
            `User with email '${email}' already holds Tenant Admin authority in another tenant. Cross-tenant administrator assignment is prohibited.`,
            'CROSS_TENANT_ADMIN_PROHIBITED',
          );
        }

        targetUserId = existingUser.id;
      } else {
        const createdUser = await this.userRepo.create({
          email,
          firstName: dto.newUser.firstName.trim(),
          lastName: dto.newUser.lastName.trim(),
          phone: dto.newUser.phone?.trim(),
          isSuperAdmin: false,
        });
        targetUserId = createdUser.id;
      }
    } else {
      throw new BadRequestError('Either userId or newUser details must be provided');
    }

    const existingRecord = await this.repo.findByTenantAndUser(dto.tenantId, targetUserId);
    if (existingRecord && existingRecord.status === 'active') {
      throw new ConflictError(
        'User is already an active Tenant Administrator for this tenant',
        'TENANT_ADMIN_ALREADY_EXISTS',
      );
    }

    let record: TenantAdminRecord;
    if (existingRecord) {
      record = await this.repo.updateStatus(existingRecord.id, 'active');
    } else {
      record = await this.repo.create({
        id: generateSurrogateId('ta'),
        tenantId: dto.tenantId,
        userId: targetUserId,
        status: 'active',
      });
    }

    const assignedUser = await this.userRepo.findById(targetUserId);

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'tenant_admin_assigned',
      targetType: 'tenant_admin',
      targetId: record.id,
      tenantId: dto.tenantId,
      companyId: null,
      metadata: { userId: targetUserId, email: assignedUser?.email },
    });

    return {
      tenantAdmin: record,
      message: 'Tenant Administrator assigned successfully',
    };
  }

  async revokeTenantAdmin(
    tenantId: string,
    targetUserId: string,
    actor?: { id?: string; email?: string },
  ): Promise<void> {
    const record = await this.repo.findActiveByTenantAndUser(tenantId, targetUserId);
    if (!record) {
      throw new NotFoundError('Active Tenant Administrator assignment not found');
    }

    // Last Tenant Admin Safety Rule: cannot revoke sole active tenant administrator
    const activeCount = await this.repo.countActiveByTenant(tenantId);
    if (activeCount <= 1) {
      throw new BadRequestError(
        'Cannot revoke or deactivate the sole active Tenant Administrator for this tenant',
        'CANNOT_REMOVE_LAST_TENANT_ADMIN',
      );
    }

    await this.repo.updateStatus(record.id, 'revoked');

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'tenant_admin_revoked',
      targetType: 'tenant_admin',
      targetId: record.id,
      tenantId,
      companyId: null,
      metadata: { userId: targetUserId },
    });
  }
}

export const tenantAdminService = new TenantAdminService();
