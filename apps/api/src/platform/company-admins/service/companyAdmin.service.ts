import { companyAdminRepository, CompanyAdminRepository } from '../repository/companyAdmin.repository.js';
import { platformUserRepository, PlatformUserRepository } from '../../users/repository/user.repository.js';
import { companyRepository, CompanyRepository } from '../../companies/repository/company.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { roleManagementService } from '../../access/service/roleManagement.service.js';
import { emailService, EmailService } from '../../email/service/email.service.js';
import { getDb } from '../../../db/connection.js';
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
    private readonly email: EmailService = emailService,
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
        // Passwordless identity (ADR-018): the administrator signs in with Email OTP.
        const createdUser = await this.userRepo.create({
          email: dto.newUser.email,
          firstName: dto.newUser.firstName,
          lastName: dto.newUser.lastName,
          phone: dto.newUser.phone,
          isSuperAdmin: false,
        });
        targetUserId = createdUser.id;
      }
    } else {
      throw new BadRequestError('Either userId or newUser details must be provided');
    }

    // Membership and role assignment are one decision: written atomically.
    const membershipId = await getDb().transaction(async (tx) => {
      const id = await this.repo.createMembership(dto.tenantId, dto.companyId, targetUserId, tx);
      await roleManagementService.syncMembershipRole(tx, {
        userId: targetUserId,
        tenantId: dto.tenantId,
        companyId: dto.companyId,
        role: 'company_admin',
        actorId: actor?.id ?? null,
      });
      return id;
    });
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

    const delivery = await this.email.sendSignInInvitation({
      to: assignment.email,
      firstName: assignment.firstName,
      companyName: company.name,
      roleLabel: 'Company Administrator',
    });

    return {
      assignment,
      invitationDelivery:
        delivery === 'sent'
          ? {
              status: 'INVITATION_EMAILED',
              message: `${assignment.email} was assigned as Company Administrator and emailed sign-in instructions (Email OTP).`,
            }
          : {
              status: 'INVITATION_EMAIL_FAILED',
              message: `${assignment.email} was assigned as Company Administrator, but the sign-in email could not be sent. They can still sign in with Email OTP at the BEZENT login page.`,
            },
    };
  }

  async revokeCompanyAdmin(membershipId: string, actor?: { id?: string; email?: string }): Promise<void> {
    const membership = await this.repo.findMembershipById(membershipId);
    if (!membership) {
      throw new NotFoundError(`Membership '${membershipId}' not found`);
    }

    await getDb().transaction(async (tx) => {
      await this.repo.revokeMembership(membershipId, tx);
      await roleManagementService.revokeSystemRole(tx, {
        userId: membership.userId,
        tenantId: membership.tenantId,
        companyId: membership.companyId,
        role: 'company_admin',
        actorId: actor?.id ?? null,
      });
    });

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
