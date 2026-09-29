import crypto from 'crypto';
import {
  companyAdminRepository,
  CompanyAdminRepository,
} from '../repository/companyAdmin.repository.js';
import {
  platformUserRepository,
  PlatformUserRepository,
} from '../../users/repository/user.repository.js';
import {
  moduleService,
  ModuleService,
} from '../../modules/service/module.service.js';
import {
  auditService,
  AuditService,
} from '../../audit/service/audit.service.js';
import {
  generateSurrogateId,
} from '../../auth/security.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../../../app/errors/AppError.js';
import type {
  AuthorizedCompanySummary,
  CompanyAdminDashboard,
  CompanyProfile,
  UpdateCompanyProfileInput,
  InviteCompanyUserInput,
  RoleDefinition,
  CompanyModuleStatus,
} from '../types/companyAdmin.types.js';
import type { ModuleCode } from '../../modules/types/module.types.js';

const INVITATION_TTL_DAYS = 7;

export const COMPANY_ROLES_CATALOG: RoleDefinition[] = [
  {
    id: 'company_admin',
    name: 'Company Administrator',
    description:
      'Full administrative authority over the company, including user management, role assignments, company settings, and audit logs.',
    permissions: [
      'company:read',
      'company:write',
      'company.users:read',
      'company.users:write',
      'company.roles:read',
      'company.roles:write',
      'company.modules:read',
      'company.modules:write',
      'company.audit:read',
      'company.organization:read',
      'company.policies:read',
    ],
  },
  {
    id: 'hr_manager',
    name: 'HR Manager',
    description:
      'Workforce management authority: manages employee records, onboarding workflows, document verification, and operational HR administration.',
    permissions: [
      'hrms.workforce:read',
      'hrms.workforce:write',
      'hrms.onboarding:read',
      'hrms.onboarding:write',
      'hrms.documents:read',
      'hrms.documents:write',
    ],
  },
  {
    id: 'employee',
    name: 'Employee',
    description:
      'Standard employee access to Employee Self-Service (ESS): personal profile view, timesheet entry, leave requests, and document viewing.',
    permissions: [
      'ess.profile:read',
      'ess.documents:read',
      'ess.requests:read',
      'ess.requests:write',
    ],
  },
  {
    id: 'user',
    name: 'Platform User',
    description: 'Basic platform identity with self-service view privileges.',
    permissions: ['platform.user:read'],
  },
];

export class CompanyAdminService {
  constructor(
    private readonly repo: CompanyAdminRepository = companyAdminRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly moduleSvc: ModuleService = moduleService,
    private readonly audit: AuditService = auditService,
  ) {}

  async getAuthorizedCompanies(
    userId: string,
    isSuperAdmin: boolean,
  ): Promise<AuthorizedCompanySummary[]> {
    return this.repo.getAuthorizedCompanies(userId, isSuperAdmin);
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
    const comp = await this.repo.getCompanyProfile(companyId);
    if (!comp) {
      throw new NotFoundError(`Company '${companyId}' not found`);
    }

    return {
      id: comp.id,
      tenantId: comp.tenantId,
      name: comp.name,
      legalName: comp.legalName,
      code: comp.code,
      businessEmail: comp.businessEmail,
      contactPhone: comp.contactPhone,
      country: comp.country,
      timeZone: comp.timeZone,
      status: comp.status,
      createdAt: comp.createdAt,
    };
  }

  async updateProfile(
    tenantId: string,
    companyId: string,
    input: UpdateCompanyProfileInput,
    actor: { id: string; email: string },
  ): Promise<CompanyProfile> {
    const comp = await this.repo.getCompanyProfile(companyId);
    if (!comp) {
      throw new NotFoundError(`Company '${companyId}' not found`);
    }

    if (input.businessEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.businessEmail.trim())) {
        throw new BadRequestError('Invalid business email address');
      }
    }

    const updated = await this.repo.updateCompanyProfile(companyId, {
      legalName: input.legalName !== undefined ? input.legalName : comp.legalName,
      businessEmail: input.businessEmail !== undefined ? input.businessEmail?.trim() : comp.businessEmail,
      contactPhone: input.contactPhone !== undefined ? input.contactPhone?.trim() : comp.contactPhone,
      country: input.country !== undefined ? input.country?.trim() : comp.country,
      timeZone: input.timeZone !== undefined ? input.timeZone?.trim() : comp.timeZone,
    });

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'company_profile_updated',
      targetType: 'company',
      targetId: companyId,
      tenantId,
      companyId,
      metadata: { fieldsUpdated: Object.keys(input) },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      legalName: updated.legalName,
      code: updated.code,
      businessEmail: updated.businessEmail,
      contactPhone: updated.contactPhone,
      country: updated.country,
      timeZone: updated.timeZone,
      status: updated.status,
      createdAt: updated.createdAt,
    };
  }

  async listUsers(companyId: string, options: { search?: string; role?: string; status?: string; page?: number; limit?: number } = {}) {
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
    if (!['company_admin', 'hr_manager', 'employee', 'user'].includes(input.role)) {
      throw new BadRequestError(`Invalid role '${input.role}'`);
    }

    // Check if user already exists
    let user = await this.userRepo.findByEmail(email);
    let userId: string;

    if (user) {
      userId = user.id;
      // Check existing membership in this company
      const existingMem = await this.repo.findMembership(companyId, userId);
      if (existingMem && existingMem.status === 'active') {
        throw new ConflictError(`User '${email}' is already an active member of this company`);
      }

      if (existingMem) {
        // Reactivate membership with the requested role
        await this.repo.updateMembershipRole(existingMem.id, input.role);
        await this.repo.updateMembershipStatus(existingMem.id, 'active');
      } else {
        // Create new membership in this company
        await this.repo.createMembership({
          id: generateSurrogateId('mem'),
          userId,
          tenantId,
          companyId,
          role: input.role,
          status: 'active',
        });
      }
    } else {
      // Create user identity
      const tempPassword = crypto.randomBytes(16).toString('hex') + '!Aa1';

      user = await this.userRepo.create(
        {
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          status: 'active',
          isSuperAdmin: false,
        },
        tempPassword,
      );
      userId = user.id;

      // Create membership
      await this.repo.createMembership({
        id: generateSurrogateId('mem'),
        userId,
        tenantId,
        companyId,
        role: input.role,
        status: 'active',
      });
    }

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

    return {
      invitation: inv,
      userId,
      emailDeliveryStatus: 'not_configured' as const,
      message:
        'User membership created and invitation generated. (External email delivery is not configured in this environment; invitation token is recorded in system).',
    };
  }

  async updateUserRole(
    tenantId: string,
    companyId: string,
    targetUserId: string,
    newRole: 'company_admin' | 'hr_manager' | 'employee' | 'user',
    actor: { id: string; email: string },
  ) {
    if (!['company_admin', 'hr_manager', 'employee', 'user'].includes(newRole)) {
      throw new BadRequestError(`Invalid role '${newRole}'`);
    }

    const mem = await this.repo.findMembership(companyId, targetUserId);
    if (!mem) {
      throw new NotFoundError('User membership in this company not found');
    }

    // Safety rule: Cannot demote last active company admin
    if (mem.role === 'company_admin' && newRole !== 'company_admin') {
      const activeAdminCount = await this.repo.countActiveCompanyAdmins(companyId);
      if (activeAdminCount <= 1) {
        throw new BadRequestError(
          'Cannot demote the sole active Company Administrator. Assign another Company Administrator first.',
        );
      }
    }

    const updated = await this.repo.updateMembershipRole(mem.id, newRole);

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
    if (mem.role === 'company_admin' && newStatus !== 'active') {
      const activeAdminCount = await this.repo.countActiveCompanyAdmins(companyId);
      if (activeAdminCount <= 1) {
        throw new BadRequestError(
          'Cannot deactivate or revoke the sole active Company Administrator.',
        );
      }
    }

    const updated = await this.repo.updateMembershipStatus(mem.id, newStatus);

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

    return {
      invitation: updated,
      emailDeliveryStatus: 'not_configured' as const,
      message: 'Invitation expiration extended by 7 days.',
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

  getRoles(): RoleDefinition[] {
    return COMPANY_ROLES_CATALOG;
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
