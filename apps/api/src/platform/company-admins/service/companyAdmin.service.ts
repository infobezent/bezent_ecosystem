import crypto from 'node:crypto';
import { companyAdminRepository, CompanyAdminRepository } from '../repository/companyAdmin.repository.js';
import { platformUserRepository, PlatformUserRepository } from '../../users/repository/user.repository.js';
import { companyRepository, CompanyRepository } from '../../companies/repository/company.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, BadRequestError } from '../../../app/errors/AppError.js';
import type {
  AssignCompanyAdminDto,
  AssignmentResult,
  CompanyAdminAssignment,
} from '../types/companyAdmin.types.js';

export class CompanyAdminService {
  constructor(
    private readonly repo: CompanyAdminRepository = companyAdminRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly companyRepo: CompanyRepository = companyRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async listCompanyAdmins(tenantId?: string, companyId?: string): Promise<CompanyAdminAssignment[]> {
    return this.repo.list(tenantId, companyId);
  }

  async assignCompanyAdmin(
    dto: AssignCompanyAdminDto,
    actor?: { id?: string; email?: string },
  ): Promise<AssignmentResult> {
    const tenant = await this.tenantRepo.findById(dto.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${dto.tenantId}' not found`);
    }

    const company = await this.companyRepo.findById(dto.companyId);
    if (!company) {
      throw new NotFoundError(`Company '${dto.companyId}' not found`);
    }

    // Enforce tenant/company integrity: prevent invalid cross-tenant assignments
    if (company.tenantId !== dto.tenantId) {
      throw new BadRequestError(
        `Company '${company.name}' does not belong to tenant '${tenant.name}'`,
      );
    }

    let targetUserId: string;
    let temporaryPassword: string | undefined;
    let isNewUser = false;

    if (dto.userId) {
      const user = await this.userRepo.findById(dto.userId);
      if (!user) {
        throw new NotFoundError(`User '${dto.userId}' not found`);
      }
      // Check if user has active memberships in another tenant to prevent invalid cross-tenant assignments
      if (user.memberships && user.memberships.length > 0) {
        const otherTenant = user.memberships.find((m) => m.tenantId !== dto.tenantId);
        if (otherTenant) {
          throw new BadRequestError(
            `User '${user.email}' is already associated with a different tenant. Cross-tenant admin assignment is prohibited.`,
          );
        }
      }
      targetUserId = user.id;
    } else if (dto.newUser) {
      const existingUser = await this.userRepo.findByEmail(dto.newUser.email);
      if (existingUser) {
        if (existingUser.memberships && existingUser.memberships.length > 0) {
          const otherTenant = existingUser.memberships.find((m) => m.tenantId !== dto.tenantId);
          if (otherTenant) {
            throw new BadRequestError(
              `User with email '${dto.newUser.email}' already exists in another tenant.`,
            );
          }
        }
        targetUserId = existingUser.id;
      } else {
        temporaryPassword = dto.newUser.tempPassword || `Admin!${crypto.randomBytes(4).toString('hex')}`;
        const createdUser = await this.userRepo.create(
          {
            email: dto.newUser.email,
            firstName: dto.newUser.firstName,
            lastName: dto.newUser.lastName,
            phone: dto.newUser.phone,
            isSuperAdmin: false,
          },
          temporaryPassword,
        );
        targetUserId = createdUser.id;
        isNewUser = true;
      }
    } else {
      throw new BadRequestError('Either userId or newUser details must be provided');
    }

    const membershipId = await this.repo.createMembership(dto.tenantId, dto.companyId, targetUserId);
    const assignedUser = await this.userRepo.findById(targetUserId);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_admin_assigned',
      targetType: 'company_admin',
      targetId: membershipId,
      tenantId: dto.tenantId,
      companyId: dto.companyId,
      metadata: { userId: targetUserId, email: assignedUser?.email },
    });

    const assignment: CompanyAdminAssignment = {
      membershipId,
      userId: targetUserId,
      email: assignedUser?.email || '',
      firstName: assignedUser?.firstName || '',
      lastName: assignedUser?.lastName || '',
      phone: assignedUser?.phone || null,
      tenantId: dto.tenantId,
      tenantName: tenant.name,
      companyId: dto.companyId,
      companyName: company.name,
      role: 'company_admin',
      status: 'active',
      assignedAt: new Date().toISOString(),
    };

    return {
      assignment,
      invitationDelivery: {
        status: isNewUser ? 'MANUAL_DELIVERY_REQUIRED' : 'ALREADY_ASSIGNED',
        message: isNewUser
          ? 'Email delivery integration is not configured. Provide these initial credentials securely to the company administrator.'
          : 'User has been assigned as Company Administrator.',
        temporaryPassword,
      },
    };
  }

  async revokeCompanyAdmin(membershipId: string, actor?: { id?: string; email?: string }): Promise<void> {
    const membership = await this.repo.findMembershipById(membershipId);
    if (!membership) {
      throw new NotFoundError(`Membership '${membershipId}' not found`);
    }

    await this.repo.revokeMembership(membershipId);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_admin_revoked',
      targetType: 'company_admin',
      targetId: membershipId,
      tenantId: membership.tenantId,
      companyId: membership.companyId,
      metadata: { userId: membership.userId },
    });
  }
}

export const companyAdminService = new CompanyAdminService();
