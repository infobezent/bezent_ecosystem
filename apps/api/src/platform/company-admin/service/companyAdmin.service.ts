import crypto from 'crypto';
import {
  companyAdminRepository,
  CompanyAdminRepository,
} from '../repository/companyAdmin.repository.js';
import {
  platformUserRepository,
  PlatformUserRepository,
} from '../../users/repository/user.repository.js';
import { moduleService, ModuleService } from '../../modules/service/module.service.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { generateSurrogateId } from '../../auth/security.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../../../app/errors/AppError.js';
import {
  accessResolverService,
  AccessResolverService,
} from '../../access/service/accessResolver.service.js';
import { roleManagementService, RoleManagementService } from '../../access/service/roleManagement.service.js';
import { emailService, EmailService } from '../../email/service/email.service.js';
import { companyService, CompanyService } from '../../companies/service/company.service.js';
import { getDb } from '../../../db/connection.js';
import type {
  AuthorizedCompanySummary,
  CompanyAdminDashboard,
  CompanyProfile,
  UpdateCompanyProfileInput,
  InviteCompanyUserInput,
  CompanyModuleStatus,
} from '../types/companyAdmin.types.js';
import type { ModuleCode } from '../../modules/types/module.types.js';
import { systemRoleIdForCode, type SystemRoleCode } from '../../access/catalog/accessCatalog.js';
import type { AuthenticatedUser } from '../../auth/types/auth.types.js';

const INVITATION_TTL_DAYS = 7;
const MEMBERSHIP_ROLES: readonly SystemRoleCode[] = [
  'company_admin',
  'hr_manager',
  'employee',
  'user',
];
const ROLE_LABELS: Record<SystemRoleCode, string> = {
  company_admin: 'Company Administrator',
  hr_manager: 'HR',
  manager: 'Manager',
  employee: 'Employee',
  user: 'Member',
};

export class CompanyAdminService {
  constructor(
    private readonly repo: CompanyAdminRepository = companyAdminRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly moduleSvc: ModuleService = moduleService,
    private readonly audit: AuditService = auditService,
    private readonly resolver: AccessResolverService = accessResolverService,
    private readonly roleMgmt: RoleManagementService = roleManagementService,
    private readonly email: EmailService = emailService,
    private readonly companySvc: CompanyService = companyService,
  ) {}

  /**
   * Companies whose Company Admin workspace the user may open. Super Admin
   * keeps platform oversight of every active company; everyone else gets the
   * companies where their effective permissions grant the workspace.
   */
  async getAuthorizedCompanies(user: AuthenticatedUser): Promise<AuthorizedCompanySummary[]> {
    if (user.isSuperAdmin) {
      return this.repo.listActiveCompaniesForOversight();
    }
    const overview = await this.resolver.resolveOverview(user);
    return overview.companies
      .filter((c) => c.workspaces.includes('company_admin'))
      .map((c) => ({
        id: c.companyId,
        name: c.companyName,
        code: c.companyCode,
        status: 'active' as const,
        tenantId: c.tenantId,
        tenantName: c.tenantName ?? '',
        role: 'company_admin',
      }));
  }

  async getDashboard(tenantId: string, companyId: string): Promise<CompanyAdminDashboard> {
    const comp = await this.repo.getCompanyProfile(companyId);
    if (!comp) {
      throw new NotFoundError(`Company '${companyId}' not found`);
    }

    const metrics = await this.repo.getDashboardMetrics(tenantId, companyId);
    const modules = await this.getModules(tenantId, companyId);
    const recentAudit = await this.repo.listCompanyAuditLogs(companyId, { page: 1, limit: 10 });

    return {
      company: {
        id: comp.id,
        tenantId: comp.tenantId,
        name: comp.name,
        code: comp.code,
        status: comp.status,
        tenantName: comp.name,
      },
      metrics: {
        ...metrics,
        enabledModulesCount: modules.filter((m) => m.companyEnabled).length,
      },
      modules,
      recentActivities: recentAudit.items.map((a) => ({
        id: a.id,
        action: a.action,
        actorEmail: a.actorEmail,
        targetType: a.targetType,
        targetId: a.targetId,
        createdAt: a.createdAt,
      })),
    };
  }

  async getProfile(companyId: string): Promise<CompanyProfile> {
    return this.companySvc.getCompanyProfile(companyId);
  }

  async updateProfile(
    tenantId: string,
    companyId: string,
    input: UpdateCompanyProfileInput,
    actor: { id: string; email: string },
  ): Promise<CompanyProfile> {
    return this.companySvc.updateCompanyProfile(tenantId, companyId, input, actor);
  }

  async listUsers(
    companyId: string,
    options: {
      search?: string;
      role?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return this.repo.listCompanyUsers(companyId, options);
  }

  async inviteUser(
    tenantId: string,
    companyId: string,
    input: InviteCompanyUserInput,
    actor: { id: string; email: string },
  ) {
    const email = input.email.toLowerCase().trim();
    if (!email || !email.includes('@')) {
      throw new BadRequestError('Valid email address is required');
    }
    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new BadRequestError('First name and last name are required');
    }
    if (!MEMBERSHIP_ROLES.includes(input.role)) {
      throw new BadRequestError(`Invalid role '${input.role}'`);
    }

    // The identity is shared across companies within the same tenant; a new one
    // is passwordless and signs in with Email OTP (ADR-018).
    const existingUser = await this.userRepo.findByEmail(email);

    // Cross-tenant invariant check (Phase 0):
    // A normal customer user must not be silently associated with multiple customer tenants.
    // 1. If an existing user identity has memberships in another tenant, reject.
    if (existingUser?.memberships && existingUser.memberships.length > 0) {
      const otherTenant = existingUser.memberships.find((m) => m.tenantId !== tenantId);
      if (otherTenant) {
        throw new BadRequestError(
          `User with email '${email}' is already associated with another tenant. Cross-tenant user invitation is prohibited.`,
          'CROSS_TENANT_INVITATION_PROHIBITED',
        );
      }
    }

    // 2. If a pending invitation for this email exists in another tenant, reject.
    const pendingInvites = await this.repo.findActiveInvitationsByEmail(email);
    const otherTenantInvite = pendingInvites.find((inv) => inv.tenantId !== tenantId);
    if (otherTenantInvite) {
      throw new BadRequestError(
        `User with email '${email}' is already associated with another tenant. Cross-tenant user invitation is prohibited.`,
        'CROSS_TENANT_INVITATION_PROHIBITED',
      );
    }

    const existingMem = existingUser
      ? await this.repo.findMembership(companyId, existingUser.id)
      : null;
    if (existingMem && existingMem.status === 'active') {
      throw new ConflictError(`User '${email}' is already an active member of this company`);
    }
    const user =
      existingUser ??
      (await this.userRepo.create({
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        status: 'active',
        isSuperAdmin: false,
      }));
    const userId = user.id;

    // Company access and the invited role are one decision: written atomically.
    // The role is additive to any other roles the user holds in this company.
    await getDb().transaction(async (tx) => {
      if (existingMem) {
        await this.repo.updateMembershipRole(existingMem.id, input.role, tx);
        await this.repo.updateMembershipStatusForUser(companyId, userId, 'active', tx);
      } else {
        await this.repo.createMembership(
          {
            id: generateSurrogateId('mem'),
            userId,
            tenantId,
            companyId,
            role: input.role,
            status: 'active',
          },
          tx,
        );
      }
      await this.roleMgmt.syncMembershipRole(tx, {
        userId,
        tenantId,
        companyId,
        role: input.role,
        actorId: actor.id,
      });
    });

    // Generate secure invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const inv = await this.repo.createInvitation({
      id: generateSurrogateId('inv'),
      tenantId,
      companyId,
      email,
      role: input.role,
      token,
      invitedByUserId: actor.id,
      status: 'pending',
      expiresAt,
    });

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'company_user_invited',
      targetType: 'user',
      targetId: userId,
      tenantId,
      companyId,
      metadata: { email, role: input.role, invitationId: inv?.id },
    });

    const delivery = await this.sendInvitationEmail(companyId, email, user.firstName, input.role);

    return {
      invitation: inv,
      userId,
      emailDeliveryStatus: delivery,
      message:
        delivery === 'sent'
          ? `${email} now has access and was emailed sign-in instructions (Email OTP).`
          : `${email} now has access, but the sign-in email could not be sent. They can still sign in with Email OTP at the BEZENT login page.`,
    };
  }

  /** Emails an invited user how to sign in (Email OTP; no password is ever issued). */
  private async sendInvitationEmail(
    companyId: string,
    email: string,
    firstName: string,
    role: SystemRoleCode,
  ): Promise<'sent' | 'failed'> {
    const company = await this.repo.getCompanyProfile(companyId);
    return this.email.sendSignInInvitation({
      to: email,
      firstName,
      companyName: company?.name ?? 'your company',
      roleLabel: ROLE_LABELS[role],
    });
  }

  async updateUserRole(
    tenantId: string,
    companyId: string,
    targetUserId: string,
    newRole: 'company_admin' | 'hr_manager' | 'employee' | 'user',
    actor: { id: string; email: string },
  ) {
    if (!MEMBERSHIP_ROLES.includes(newRole)) {
      throw new BadRequestError(`Invalid role '${newRole}'`);
    }

    const mem = await this.repo.findMembership(companyId, targetUserId);
    if (!mem) {
      throw new NotFoundError('User membership in this company not found');
    }

    // Safety rule: Cannot demote last active company admin
    if (mem.role === 'company_admin' && newRole !== 'company_admin') {
      await this.roleMgmt.assertNotLastCompanyAdmin(
        { tenantId, companyId },
        systemRoleIdForCode('company_admin'),
      );
    }

    // Legacy "change role" semantics: the previous primary role is replaced.
    // Other role assignments the user holds in this company are untouched.
    const updated = await getDb().transaction(async (tx) => {
      await this.roleMgmt.syncMembershipRole(tx, {
        userId: targetUserId,
        tenantId,
        companyId,
        role: newRole,
        previousRole: mem.role,
        actorId: actor.id,
      });
      return this.repo.updateMembershipRole(mem.id, newRole, tx);
    });

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'company_user_role_updated',
      targetType: 'user',
      targetId: targetUserId,
      tenantId,
      companyId,
      metadata: { previousRole: mem.role, newRole },
    });

    return updated;
  }

  async updateUserStatus(
    tenantId: string,
    companyId: string,
    targetUserId: string,
    newStatus: 'active' | 'inactive' | 'revoked',
    actor: { id: string; email: string },
  ) {
    const mem = await this.repo.findMembership(companyId, targetUserId);
    if (!mem) {
      throw new NotFoundError('User membership in this company not found');
    }

    // Safety rule: Cannot deactivate or revoke last active company admin
    if (newStatus !== 'active') {
      await this.roleMgmt.assertCanRemoveCompanyAccess({ tenantId, companyId }, targetUserId);
    }

    // Company access is one decision: every membership row of the user in this
    // company changes together (legacy data may hold one row per role).
    const updated = await this.repo.updateMembershipStatusForUser(
      companyId,
      targetUserId,
      newStatus,
    );

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'company_user_status_updated',
      targetType: 'user',
      targetId: targetUserId,
      tenantId,
      companyId,
      metadata: { previousStatus: mem.status, newStatus },
    });

    return updated;
  }

  async revokeMembership(
    tenantId: string,
    companyId: string,
    targetUserId: string,
    actor: { id: string; email: string },
  ) {
    return this.updateUserStatus(tenantId, companyId, targetUserId, 'revoked', actor);
  }

  async listInvitations(companyId: string) {
    return this.repo.listInvitations(companyId);
  }

  async resendInvitation(
    tenantId: string,
    companyId: string,
    invitationId: string,
    actor: { id: string; email: string },
  ) {
    const inv = await this.repo.findInvitationById(invitationId);
    if (!inv || inv.companyId !== companyId) {
      throw new NotFoundError('Invitation not found');
    }

    const newExpiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const updated = await this.repo.resendInvitation(invitationId, newExpiresAt);

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'company_invitation_resent',
      targetType: 'invitation',
      targetId: invitationId,
      tenantId,
      companyId,
      metadata: { email: inv.email },
    });

    const invitee = await this.userRepo.findByEmail(inv.email);
    const delivery = await this.sendInvitationEmail(
      companyId,
      inv.email,
      invitee?.firstName ?? '',
      inv.role,
    );

    return {
      invitation: updated,
      emailDeliveryStatus: delivery,
      message:
        delivery === 'sent'
          ? 'Invitation extended by 7 days and sign-in instructions emailed again.'
          : 'Invitation extended by 7 days, but the sign-in email could not be sent.',
    };
  }

  async cancelInvitation(
    tenantId: string,
    companyId: string,
    invitationId: string,
    actor: { id: string; email: string },
  ) {
    const inv = await this.repo.findInvitationById(invitationId);
    if (!inv || inv.companyId !== companyId) {
      throw new NotFoundError('Invitation not found');
    }

    const updated = await this.repo.updateInvitationStatus(invitationId, 'cancelled');

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'company_invitation_cancelled',
      targetType: 'invitation',
      targetId: invitationId,
      tenantId,
      companyId,
      metadata: { email: inv.email },
    });

    return updated;
  }

  async getModules(tenantId: string, companyId: string): Promise<CompanyModuleStatus[]> {
    const catalog = this.moduleSvc.getCatalog();
    const { tenantEntitlements, companyEntitlements } = await this.repo.getModulesStatus(
      tenantId,
      companyId,
    );

    return catalog.map((item) => {
      // HRMS is provisioned by default unless explicitly disabled
      const tenantRecord = tenantEntitlements.find((t) => t.moduleCode === item.code);
      const tenantEntitled =
        item.code === 'hrms'
          ? tenantRecord?.status !== 'disabled'
          : tenantRecord?.status === 'enabled';

      const companyRecord = companyEntitlements.find((c) => c.moduleCode === item.code);
      const companyEnabled = tenantEntitled
        ? companyRecord
          ? companyRecord.status === 'enabled'
          : true
        : false;

      return {
        code: item.code,
        name: item.name,
        description: item.description,
        tenantEntitled,
        companyEnabled,
      };
    });
  }

  async setModuleStatus(
    tenantId: string,
    companyId: string,
    moduleCode: ModuleCode,
    enabled: boolean,
    actor: { id: string; email: string },
  ) {
    const modules = await this.getModules(tenantId, companyId);
    const mod = modules.find((m) => m.code === moduleCode);
    if (!mod) {
      throw new NotFoundError(`Module '${moduleCode}' not recognized`);
    }

    if (!mod.tenantEntitled && enabled) {
      throw new ForbiddenError(
        `Application '${mod.name}' is not entitled at the tenant organization level by Super Admin.`,
        'MODULE_NOT_ENTITLED',
      );
    }

    const status = enabled ? 'enabled' : 'disabled';
    const record = enabled
      ? await this.moduleSvc.enableModule(tenantId, moduleCode, companyId, actor)
      : await this.moduleSvc.disableModule(tenantId, moduleCode, companyId, actor);

    return {
      code: moduleCode,
      name: mod.name,
      tenantEntitled: mod.tenantEntitled,
      companyEnabled: status === 'enabled',
      record,
    };
  }

  async getOrganizationSummary(companyId: string) {
    return this.repo.getOrganizationSummary(companyId);
  }

  async getPoliciesSummary(companyId: string) {
    return this.repo.getPoliciesSummary(companyId);
  }

  async listAuditLogs(
    companyId: string,
    options: { page?: number; limit?: number; action?: string } = {},
  ) {
    return this.repo.listCompanyAuditLogs(companyId, options);
  }
}

export const companyAdminService = new CompanyAdminService();
