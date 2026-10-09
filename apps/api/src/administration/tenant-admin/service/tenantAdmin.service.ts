import {
  tenantAdminRepository,
  TenantAdminRepository,
} from '../repository/tenantAdmin.repository.js';
import {
  platformUserRepository,
  PlatformUserRepository,
} from '../../../platform/users/repository/user.repository.js';
import { tenantRepository, TenantRepository } from '../../../platform/tenants/repository/tenant.repository.js';
import {
  companyRepository,
  CompanyRepository,
} from '../../../platform/companies/repository/company.repository.js';
import { moduleRepository, ModuleRepository } from '../../../platform/modules/repository/module.repository.js';
import { moduleService, ModuleService } from '../../../platform/modules/service/module.service.js';
import { companyService, CompanyService } from '../../../platform/companies/service/company.service.js';
import type { CreateTenantAdminCompanyDto } from '../../../platform/companies/types/company.types.js';
import { auditService, AuditService } from '../../../platform/audit/service/audit.service.js';
import { generateSurrogateId } from '../../../platform/auth/security.js';
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
  TenantMemberListFilter,
  TenantMemberRecord,
  InviteTenantMemberDto,
  GrantCompanyAccessDto,
  AssignCompanyRolesDto,
  TenantApplicationDistribution,
  CompanyApplicationStatus,
  UpdateTenantProfileDto,
  CompanyAccessRole,
  CompanyAccessUserItem,
  AvailableTenantUserItem,
  AssignCompanyUserDto,
  InviteCompanyUserDto,
  UpdateCompanyUserRoleDto,
  CompanyRoleOverviewItem,
} from '../types/tenantAdmin.types.js';
import {
  validateInviteTenantMember,
  validateGrantCompanyAccess,
  validateAssignCompanyRoles,
  validateAssignCompanyUser,
  validateInviteCompanyUser,
  validateUpdateCompanyUserRole,
} from '../validation/tenantAdmin.schema.js';
import { MODULE_CATALOG, type ModuleCode } from '../../../platform/modules/types/module.types.js';
import { getDb } from '../../../db/connection.js';
import { memberships, roleAssignments, roles, invitations } from '../../../db/schema.js';
import { and, eq, or, count } from 'drizzle-orm';
import crypto from 'node:crypto';
import { systemRoleIdForCode } from '../../../platform/access/catalog/accessCatalog.js';
import { emailService, EmailService } from '../../../platform/email/service/email.service.js';

export class TenantAdminService {
  constructor(
    private readonly repo: TenantAdminRepository = tenantAdminRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly companyRepo: CompanyRepository = companyRepository,
    private readonly moduleRepo: ModuleRepository = moduleRepository,
    private readonly moduleSvc: ModuleService = moduleService,
    private readonly audit: AuditService = auditService,
    private readonly companySvc: CompanyService = companyService,
    private readonly emailSvc: EmailService = emailService,
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
    const enabledModules = modules.filter((m) => m.status === 'enabled').map((m) => m.moduleCode);

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
        logoUrl: tenant.logoUrl ?? null,
        bannerUrl: tenant.bannerUrl ?? null,
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
      logoUrl: tenant.logoUrl ?? null,
      bannerUrl: tenant.bannerUrl ?? null,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async updateTenantProfile(
    tenantId: string,
    dto: UpdateTenantProfileDto,
    actor?: { id?: string; email?: string },
  ) {
    const existing = await this.tenantRepo.findById(tenantId);
    if (!existing) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    const updated = await this.tenantRepo.update(tenantId, {
      name: dto.name,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
    });

    const updatedFields: string[] = [];
    if (dto.name !== undefined) updatedFields.push('name');
    if (dto.contactEmail !== undefined) updatedFields.push('contactEmail');
    if (dto.contactPhone !== undefined) updatedFields.push('contactPhone');

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_profile_updated',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      metadata: {
        updatedFields,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code ?? null,
      status: updated.status,
      contactEmail: updated.contactEmail ?? null,
      contactPhone: updated.contactPhone ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
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

  /* ── Phase 2D: Tenant Members Directory & Invitations ───────────────── */

  async listMembers(tenantId: string, filter: TenantMemberListFilter = {}) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}' not found`);
    return this.repo.listTenantMembers(tenantId, filter);
  }

  async getMember(tenantId: string, userId: string): Promise<TenantMemberRecord> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}' not found`);
    const member = await this.repo.getTenantMemberDetails(tenantId, userId);
    if (!member) {
      throw new NotFoundError(`Tenant member with ID '${userId}' not found in this tenant`);
    }
    return member;
  }

  async inviteMember(
    tenantId: string,
    input: InviteTenantMemberDto,
    actor?: { id?: string; email?: string },
  ): Promise<{ member: TenantMemberRecord; message: string }> {
    const dto = validateInviteTenantMember(input);
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}' not found`);

    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.userRepo.findByEmail(email);

    // Cross-tenant protection: check memberships
    if (existingUser?.memberships && existingUser.memberships.length > 0) {
      const otherTenant = existingUser.memberships.find((m) => m.tenantId !== tenantId);
      if (otherTenant) {
        throw new BadRequestError(
          `User with email '${email}' is already associated with another tenant. Cross-tenant user invitation is prohibited.`,
          'CROSS_TENANT_INVITATION_PROHIBITED',
        );
      }
    }

    // Cross-tenant protection: check tenant_admins
    if (existingUser) {
      const otherTAs = await this.repo.listActiveByUser(existingUser.id);
      if (otherTAs.some((ta) => ta.tenantId !== tenantId)) {
        throw new BadRequestError(
          `User with email '${email}' already holds Tenant Admin authority in another tenant. Cross-tenant user invitation is prohibited.`,
          'CROSS_TENANT_INVITATION_PROHIBITED',
        );
      }
    }

    // Cross-tenant protection: check pending invitations across all tenants
    const db = getDb();
    const allPendingInvites = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.email, email), eq(invitations.status, 'pending')));
    if (allPendingInvites.some((inv) => inv.tenantId !== tenantId)) {
      throw new BadRequestError(
        `User with email '${email}' is already associated with another tenant. Cross-tenant user invitation is prohibited.`,
        'CROSS_TENANT_INVITATION_PROHIBITED',
      );
    }

    if (dto.authority === 'tenant_admin') {
      const res = await this.assignTenantAdmin(
        {
          tenantId,
          userId: existingUser?.id,
          newUser: existingUser
            ? undefined
            : {
                email,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
              },
        },
        actor,
      );
      const member = await this.getMember(tenantId, res.tenantAdmin.userId);
      return { member, message: 'Tenant Administrator invited successfully' };
    }

    // Standard User Authority: Requires explicit company access
    if (!dto.companyAccess || dto.companyAccess.length === 0) {
      throw new BadRequestError(
        'Standard users require explicit access to at least one company',
        'COMPANY_ACCESS_REQUIRED',
      );
    }

    // Validate that all specified companies belong to this tenant
    for (const compAccess of dto.companyAccess) {
      const comp = await this.companyRepo.findById(compAccess.companyId);
      if (!comp || comp.tenantId !== tenantId) {
        throw new BadRequestError(
          `Company '${compAccess.companyId}' does not belong to this tenant`,
          'COMPANY_TENANT_MISMATCH',
        );
      }
    }

    const user =
      existingUser ??
      (await this.userRepo.create({
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: 'active',
        isSuperAdmin: false,
      }));

    await db.transaction(async (tx) => {
      for (const compAccess of dto.companyAccess!) {
        const [existingMem] = await tx
          .select()
          .from(memberships)
          .where(
            and(eq(memberships.userId, user.id), eq(memberships.companyId, compAccess.companyId)),
          );

        if (existingMem) {
          await tx
            .update(memberships)
            .set({ status: 'active' })
            .where(eq(memberships.id, existingMem.id));
        } else {
          await tx.insert(memberships).values({
            id: generateSurrogateId('mem'),
            userId: user.id,
            tenantId,
            companyId: compAccess.companyId,
            role: 'user',
            status: 'active',
          });
        }

        const roleCodes =
          compAccess.roleCodes && compAccess.roleCodes.length > 0
            ? compAccess.roleCodes
            : compAccess.roles && compAccess.roles.length > 0
              ? compAccess.roles
              : ['user'];

        for (const code of roleCodes) {
          const [roleRow] = await tx
            .select()
            .from(roles)
            .where(
              and(
                eq(roles.code, code),
                or(
                  and(eq(roles.tenantId, tenantId), eq(roles.companyId, compAccess.companyId)),
                  eq(roles.isSystem, true),
                ),
              ),
            );

          if (roleRow) {
            const [existingAssign] = await tx
              .select()
              .from(roleAssignments)
              .where(
                and(
                  eq(roleAssignments.userId, user.id),
                  eq(roleAssignments.companyId, compAccess.companyId),
                  eq(roleAssignments.roleId, roleRow.id),
                ),
              );

            if (existingAssign) {
              await tx
                .update(roleAssignments)
                .set({ status: 'active', revokedAt: null, revokedBy: null })
                .where(eq(roleAssignments.id, existingAssign.id));
            } else {
              await tx.insert(roleAssignments).values({
                id: generateSurrogateId('ras'),
                userId: user.id,
                roleId: roleRow.id,
                tenantId,
                companyId: compAccess.companyId,
                status: 'active',
                assignedBy: actor?.id ?? null,
              });
            }
          }
        }
      }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(invitations).values({
      id: generateSurrogateId('inv'),
      tenantId,
      companyId: dto.companyAccess[0]!.companyId,
      email,
      role: 'user',
      token,
      invitedByUserId: actor?.id ?? null,
      status: 'pending',
      expiresAt,
    });

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'tenant_member_invited',
      targetType: 'user',
      targetId: user.id,
      tenantId,
      companyId: dto.companyAccess[0]!.companyId,
      metadata: {
        email: user.email,
        authority: 'standard',
        companies: dto.companyAccess.map((c) => c.companyId),
      },
    });

    const member = await this.getMember(tenantId, user.id);
    return { member, message: 'Tenant member invited successfully' };
  }

  async grantCompanyAccess(
    tenantId: string,
    userId: string,
    input: GrantCompanyAccessDto,
    actor?: { id?: string; email?: string },
  ): Promise<{ member: TenantMemberRecord; message: string }> {
    const dto = validateGrantCompanyAccess(input);
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError(`User '${userId}' not found`);

    const comp = await this.companyRepo.findById(dto.companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new BadRequestError(
        `Company '${dto.companyId}' does not belong to this tenant`,
        'COMPANY_TENANT_MISMATCH',
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      const [existingMem] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.companyId, dto.companyId)));

      if (existingMem) {
        await tx
          .update(memberships)
          .set({ status: 'active' })
          .where(eq(memberships.id, existingMem.id));
      } else {
        await tx.insert(memberships).values({
          id: generateSurrogateId('mem'),
          userId,
          tenantId,
          companyId: dto.companyId,
          role: 'user',
          status: 'active',
        });
      }

      const roleCodes = dto.roleCodes ?? ['user'];
      for (const code of roleCodes) {
        const [roleRow] = await tx
          .select()
          .from(roles)
          .where(
            and(
              eq(roles.code, code),
              or(
                and(eq(roles.tenantId, tenantId), eq(roles.companyId, dto.companyId)),
                eq(roles.isSystem, true),
              ),
            ),
          );

        if (roleRow) {
          const [existingAssign] = await tx
            .select()
            .from(roleAssignments)
            .where(
              and(
                eq(roleAssignments.userId, userId),
                eq(roleAssignments.companyId, dto.companyId),
                eq(roleAssignments.roleId, roleRow.id),
              ),
            );

          if (existingAssign) {
            await tx
              .update(roleAssignments)
              .set({ status: 'active', revokedAt: null, revokedBy: null })
              .where(eq(roleAssignments.id, existingAssign.id));
          } else {
            await tx.insert(roleAssignments).values({
              id: generateSurrogateId('ras'),
              userId,
              roleId: roleRow.id,
              tenantId,
              companyId: dto.companyId,
              status: 'active',
              assignedBy: actor?.id ?? null,
            });
          }
        }
      }
    });

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'company_access_granted',
      targetType: 'user',
      targetId: userId,
      tenantId,
      companyId: dto.companyId,
      metadata: { roles: dto.roleCodes },
    });

    const member = await this.getMember(tenantId, userId);
    return { member, message: `Access granted to company '${comp.name}' successfully` };
  }

  async revokeCompanyAccess(
    tenantId: string,
    userId: string,
    companyId: string,
    actor?: { id?: string; email?: string },
  ): Promise<{ message: string }> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new BadRequestError(
        `Company '${companyId}' does not belong to this tenant`,
        'COMPANY_TENANT_MISMATCH',
      );
    }

    const db = getDb();
    const COMPANY_ADMIN_ROLE_ID = systemRoleIdForCode('company_admin');

    const [userAdminAssignment] = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.companyId, companyId),
          eq(roleAssignments.roleId, COMPANY_ADMIN_ROLE_ID),
          eq(roleAssignments.status, 'active'),
        ),
      );

    if (userAdminAssignment) {
      const [countRow] = await db
        .select({ total: count() })
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.companyId, companyId),
            eq(roleAssignments.roleId, COMPANY_ADMIN_ROLE_ID),
            eq(roleAssignments.status, 'active'),
          ),
        );

      if ((countRow?.total ?? 0) <= 1) {
        throw new BadRequestError(
          'Cannot remove or revoke the sole active Company Administrator for this company',
          'CANNOT_REMOVE_LAST_COMPANY_ADMIN',
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(memberships)
        .set({ status: 'revoked' })
        .where(and(eq(memberships.userId, userId), eq(memberships.companyId, companyId)));

      await tx
        .update(roleAssignments)
        .set({
          status: 'revoked',
          revokedBy: actor?.id ?? null,
          revokedAt: new Date(),
        })
        .where(
          and(
            eq(roleAssignments.userId, userId),
            eq(roleAssignments.companyId, companyId),
            eq(roleAssignments.status, 'active'),
          ),
        );
    });

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'company_access_revoked',
      targetType: 'user',
      targetId: userId,
      tenantId,
      companyId,
      metadata: { userId },
    });

    return { message: `Access to company '${comp.name}' revoked successfully` };
  }

  async assignCompanyRoles(
    tenantId: string,
    userId: string,
    companyId: string,
    input: AssignCompanyRolesDto,
    actor?: { id?: string; email?: string },
  ): Promise<{ member: TenantMemberRecord; message: string }> {
    const dto = validateAssignCompanyRoles(input);
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new BadRequestError(
        `Company '${companyId}' does not belong to this tenant`,
        'COMPANY_TENANT_MISMATCH',
      );
    }

    const db = getDb();
    const [mem] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.companyId, companyId),
          eq(memberships.status, 'active'),
        ),
      );

    if (!mem) {
      throw new BadRequestError(
        'User does not hold active access to this company',
        'ACTIVE_MEMBERSHIP_REQUIRED',
      );
    }

    await db.transaction(async (tx) => {
      if (dto.roleCodes && dto.roleCodes.length > 0) {
        for (const code of dto.roleCodes) {
          const [roleRow] = await tx
            .select()
            .from(roles)
            .where(
              and(
                eq(roles.code, code),
                or(
                  and(eq(roles.tenantId, tenantId), eq(roles.companyId, companyId)),
                  eq(roles.isSystem, true),
                ),
              ),
            );

          if (roleRow) {
            const [existing] = await tx
              .select()
              .from(roleAssignments)
              .where(
                and(
                  eq(roleAssignments.userId, userId),
                  eq(roleAssignments.companyId, companyId),
                  eq(roleAssignments.roleId, roleRow.id),
                ),
              );

            if (existing) {
              await tx
                .update(roleAssignments)
                .set({ status: 'active', revokedAt: null, revokedBy: null })
                .where(eq(roleAssignments.id, existing.id));
            } else {
              await tx.insert(roleAssignments).values({
                id: generateSurrogateId('ras'),
                userId,
                roleId: roleRow.id,
                tenantId,
                companyId,
                status: 'active',
                assignedBy: actor?.id ?? null,
              });
            }
          }
        }
      }

      if (dto.roleIds && dto.roleIds.length > 0) {
        for (const roleId of dto.roleIds) {
          const [roleRow] = await tx
            .select()
            .from(roles)
            .where(
              and(
                eq(roles.id, roleId),
                or(
                  and(eq(roles.tenantId, tenantId), eq(roles.companyId, companyId)),
                  eq(roles.isSystem, true),
                ),
              ),
            );

          if (roleRow) {
            const [existing] = await tx
              .select()
              .from(roleAssignments)
              .where(
                and(
                  eq(roleAssignments.userId, userId),
                  eq(roleAssignments.companyId, companyId),
                  eq(roleAssignments.roleId, roleRow.id),
                ),
              );

            if (existing) {
              await tx
                .update(roleAssignments)
                .set({ status: 'active', revokedAt: null, revokedBy: null })
                .where(eq(roleAssignments.id, existing.id));
            } else {
              await tx.insert(roleAssignments).values({
                id: generateSurrogateId('ras'),
                userId,
                roleId: roleRow.id,
                tenantId,
                companyId,
                status: 'active',
                assignedBy: actor?.id ?? null,
              });
            }
          }
        }
      }
    });

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'role_assigned',
      targetType: 'user',
      targetId: userId,
      tenantId,
      companyId,
      metadata: { roleCodes: dto.roleCodes, roleIds: dto.roleIds },
    });

    const member = await this.getMember(tenantId, userId);
    return { member, message: 'Roles assigned successfully' };
  }

  async revokeCompanyRole(
    tenantId: string,
    userId: string,
    companyId: string,
    roleId: string,
    actor?: { id?: string; email?: string },
  ): Promise<{ member: TenantMemberRecord; message: string }> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new BadRequestError(
        `Company '${companyId}' does not belong to this tenant`,
        'COMPANY_TENANT_MISMATCH',
      );
    }

    const db = getDb();
    const COMPANY_ADMIN_ROLE_ID = systemRoleIdForCode('company_admin');

    if (roleId === COMPANY_ADMIN_ROLE_ID) {
      const [countRow] = await db
        .select({ total: count() })
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.companyId, companyId),
            eq(roleAssignments.roleId, COMPANY_ADMIN_ROLE_ID),
            eq(roleAssignments.status, 'active'),
          ),
        );

      if ((countRow?.total ?? 0) <= 1) {
        throw new BadRequestError(
          'Cannot remove or revoke the sole active Company Administrator for this company',
          'CANNOT_REMOVE_LAST_COMPANY_ADMIN',
        );
      }
    }

    await db
      .update(roleAssignments)
      .set({
        status: 'revoked',
        revokedBy: actor?.id ?? null,
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.companyId, companyId),
          eq(roleAssignments.roleId, roleId),
          eq(roleAssignments.status, 'active'),
        ),
      );

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'role_revoked',
      targetType: 'user',
      targetId: userId,
      tenantId,
      companyId,
      metadata: { roleId },
    });

    const member = await this.getMember(tenantId, userId);
    return { member, message: 'Role revoked successfully' };
  }

  /* ── Phase 2E: Application Distribution ────────────────────────────── */

  async listApplications(tenantId: string): Promise<TenantApplicationDistribution[]> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}' not found`);

    const allCompaniesResult = await this.companyRepo.list({ tenantId, limit: 100 });
    const allTenantModules = await this.moduleRepo.listByTenant(tenantId);

    const result: TenantApplicationDistribution[] = [];
    for (const item of MODULE_CATALOG) {
      const isEntitled = await this.moduleSvc.isTenantEntitled(tenantId, item.code);

      const companiesStatus = allCompaniesResult.items.map((c) => {
        const companyRecord = allTenantModules.find(
          (m) => m.companyId === c.id && m.moduleCode === item.code,
        );
        let status: 'enabled' | 'disabled';
        if (companyRecord) {
          status = companyRecord.status === 'enabled' ? 'enabled' : 'disabled';
        } else {
          // If no company record exists, default for entitled HRMS is enabled
          status = item.code === 'hrms' && isEntitled ? 'enabled' : 'disabled';
        }
        return {
          companyId: c.id,
          companyName: c.name,
          companyCode: c.code,
          status,
        };
      });

      const enabledCompanyCount = companiesStatus.filter((c) => c.status === 'enabled').length;

      result.push({
        moduleCode: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
        availability: item.availability,
        tenantEntitled: isEntitled,
        companyCount: allCompaniesResult.total,
        enabledCompanyCount,
        companies: companiesStatus,
      });
    }

    return result;
  }

  async getCompanyApplications(
    tenantId: string,
    companyId: string,
  ): Promise<CompanyApplicationStatus[]> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const allApps = await this.listApplications(tenantId);
    return allApps.map((app) => {
      const compInfo = app.companies.find((c) => c.companyId === companyId);
      const companyStatus = compInfo?.status ?? 'disabled';
      const canEnable = app.tenantEntitled && companyStatus !== 'enabled';
      return {
        moduleCode: app.moduleCode,
        name: app.name,
        description: app.description,
        category: app.category,
        availability: app.availability,
        tenantEntitled: app.tenantEntitled,
        companyStatus,
        canEnable,
      };
    });
  }

  async enableCompanyApplication(
    tenantId: string,
    companyId: string,
    moduleCode: ModuleCode,
    actor?: { id?: string; email?: string },
  ) {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const isEntitled = await this.moduleSvc.isTenantEntitled(tenantId, moduleCode);
    if (!isEntitled) {
      throw new BadRequestError(
        `Cannot enable application '${moduleCode}': parent tenant is not entitled to it`,
        'APP_NOT_ENTITLED_BY_TENANT',
      );
    }

    const record = await this.moduleSvc.enableModule(tenantId, moduleCode, companyId, actor);
    return {
      companyId,
      moduleCode,
      status: record.status,
      message: `Application '${moduleCode}' enabled for company '${comp.name}'`,
    };
  }

  async disableCompanyApplication(
    tenantId: string,
    companyId: string,
    moduleCode: ModuleCode,
    actor?: { id?: string; email?: string },
  ) {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const record = await this.moduleSvc.disableModule(tenantId, moduleCode, companyId, actor);
    return {
      companyId,
      moduleCode,
      status: record.status,
      message: `Application '${moduleCode}' disabled for company '${comp.name}'`,
    };
  }

  /* ── Company Access V1 Methods ──────────────────────────────────────── */

  async listCompanyAccessUsers(
    tenantId: string,
    companyId: string,
    filter?: { search?: string; role?: string; status?: string },
  ): Promise<CompanyAccessUserItem[]> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }
    return this.repo.listCompanyMembersAndInvitations(tenantId, companyId, filter);
  }

  async listAvailableTenantUsers(
    tenantId: string,
    companyId: string,
    search?: string,
  ): Promise<AvailableTenantUserItem[]> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }
    return this.repo.listAvailableTenantUsersForCompany(tenantId, companyId, search);
  }

  async assignExistingTenantUser(
    tenantId: string,
    companyId: string,
    input: AssignCompanyUserDto,
    actor?: { id?: string; email?: string },
  ): Promise<{
    message: string;
    user?: { userId: string; email: string; name: string; role: CompanyAccessRole };
  }> {
    const dto = validateAssignCompanyUser(input);
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new NotFoundError(`User '${dto.userId}' not found`);
    }

    // Cross-tenant check: ensure user is not tied to another tenant
    if (user.memberships && user.memberships.length > 0) {
      const foreign = user.memberships.find((m) => m.tenantId !== tenantId);
      if (foreign) {
        throw new BadRequestError(
          `User '${user.email}' is associated with another tenant. Cross-tenant user assignment is prohibited.`,
          'CROSS_TENANT_USER_ASSIGNMENT_PROHIBITED',
        );
      }
    }

    const db = getDb();
    const isCompAdmin = dto.role === 'company_admin';
    const roleCode = isCompAdmin ? 'company_admin' : 'user';
    const targetRoleId = systemRoleIdForCode(roleCode);

    await db.transaction(async (tx) => {
      const [existingMem] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, user.id), eq(memberships.companyId, companyId)));

      if (existingMem) {
        await tx
          .update(memberships)
          .set({ status: 'active', role: roleCode })
          .where(eq(memberships.id, existingMem.id));
      } else {
        await tx.insert(memberships).values({
          id: generateSurrogateId('mem'),
          userId: user.id,
          tenantId,
          companyId,
          role: roleCode,
          status: 'active',
        });
      }

      // Sync role assignments
      const [existingTargetAssign] = await tx
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.userId, user.id),
            eq(roleAssignments.companyId, companyId),
            eq(roleAssignments.roleId, targetRoleId),
          ),
        );

      if (existingTargetAssign) {
        await tx
          .update(roleAssignments)
          .set({ status: 'active', revokedAt: null, revokedBy: null })
          .where(eq(roleAssignments.id, existingTargetAssign.id));
      } else {
        await tx.insert(roleAssignments).values({
          id: generateSurrogateId('ras'),
          userId: user.id,
          roleId: targetRoleId,
          tenantId,
          companyId,
          status: 'active',
          assignedBy: actor?.id ?? null,
        });
      }

      // If assigning member, revoke company_admin role assignment if present
      if (!isCompAdmin) {
        const compAdminRoleId = systemRoleIdForCode('company_admin');
        await tx
          .update(roleAssignments)
          .set({
            status: 'revoked',
            revokedAt: new Date(),
            revokedBy: actor?.id ?? null,
          })
          .where(
            and(
              eq(roleAssignments.userId, user.id),
              eq(roleAssignments.companyId, companyId),
              eq(roleAssignments.roleId, compAdminRoleId),
              eq(roleAssignments.status, 'active'),
            ),
          );
      }
    });

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'company_access_granted',
      targetType: 'user',
      targetId: user.id,
      tenantId,
      companyId,
      metadata: { role: dto.role },
    });

    return {
      message: `Access granted to '${user.firstName} ${user.lastName}' as ${isCompAdmin ? 'Company Administrator' : 'Member'}`,
      user: {
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: dto.role,
      },
    };
  }

  async inviteUserToCompany(
    tenantId: string,
    companyId: string,
    input: InviteCompanyUserDto,
    actor?: { id?: string; email?: string },
  ): Promise<{
    message: string;
    invitationId?: string;
    invitation?: { id: string; email: string; role: CompanyAccessRole; status: string };
  }> {
    const dto = validateInviteCompanyUser(input);
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.userRepo.findByEmail(email);

    // Cross-tenant check 1: memberships
    if (existingUser?.memberships && existingUser.memberships.length > 0) {
      const foreign = existingUser.memberships.find((m) => m.tenantId !== tenantId);
      if (foreign) {
        throw new BadRequestError(
          `User with email '${email}' is already associated with another tenant. Cross-tenant user invitation is prohibited.`,
          'CROSS_TENANT_INVITATION_PROHIBITED',
        );
      }
    }

    // Cross-tenant check 2: pending invitations in other tenants
    const db = getDb();
    const allPendingInvites = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.email, email), eq(invitations.status, 'pending')));
    if (allPendingInvites.some((inv) => inv.tenantId !== tenantId)) {
      throw new BadRequestError(
        `User with email '${email}' is already associated with another tenant. Cross-tenant user invitation is prohibited.`,
        'CROSS_TENANT_INVITATION_PROHIBITED',
      );
    }

    // Check if user is already an active member of this company
    if (existingUser) {
      const [existingMem] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, existingUser.id),
            eq(memberships.companyId, companyId),
            eq(memberships.status, 'active'),
          ),
        );
      if (existingMem) {
        throw new ConflictError(`User '${email}' is already an active member of this company`);
      }
    }

    // Check if pending invitation already exists for this email in this company
    const existingCompInvite = allPendingInvites.find((inv) => inv.companyId === companyId);
    if (existingCompInvite) {
      // Resend invitation
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.repo.resendCompanyInvitation(existingCompInvite.id, expiresAt);
      await this.emailSvc.sendSignInInvitation({
        to: email,
        firstName: dto.firstName || '',
        companyName: comp.name,
        roleLabel: dto.role === 'company_admin' ? 'Company Administrator' : 'Member',
      });
      return {
        message: `Invitation extended and re-sent to ${email}`,
        invitationId: existingCompInvite.id,
      };
    }

    // Create user record if not present (Passwordless identity ADR-018)
    const user =
      existingUser ??
      (await this.userRepo.create({
        email,
        firstName: dto.firstName || '',
        lastName: dto.lastName || '',
        status: 'active',
        isSuperAdmin: false,
      }));

    const isCompAdmin = dto.role === 'company_admin';
    const roleCode = isCompAdmin ? 'company_admin' : 'user';
    const targetRoleId = systemRoleIdForCode(roleCode);

    // Atomically establish membership + role assignment + invitation
    const invitationId = generateSurrogateId('inv');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      const [existingMem] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, user.id), eq(memberships.companyId, companyId)));

      if (existingMem) {
        await tx
          .update(memberships)
          .set({ status: 'active', role: roleCode })
          .where(eq(memberships.id, existingMem.id));
      } else {
        await tx.insert(memberships).values({
          id: generateSurrogateId('mem'),
          userId: user.id,
          tenantId,
          companyId,
          role: roleCode,
          status: 'active',
        });
      }

      // Sync role assignments
      const [existingAssign] = await tx
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.userId, user.id),
            eq(roleAssignments.companyId, companyId),
            eq(roleAssignments.roleId, targetRoleId),
          ),
        );

      if (existingAssign) {
        await tx
          .update(roleAssignments)
          .set({ status: 'active', revokedAt: null, revokedBy: null })
          .where(eq(roleAssignments.id, existingAssign.id));
      } else {
        await tx.insert(roleAssignments).values({
          id: generateSurrogateId('ras'),
          userId: user.id,
          roleId: targetRoleId,
          tenantId,
          companyId,
          status: 'active',
          assignedBy: actor?.id ?? null,
        });
      }

      await tx.insert(invitations).values({
        id: invitationId,
        tenantId,
        companyId,
        email,
        role: roleCode,
        token,
        invitedByUserId: actor?.id ?? null,
        status: 'pending',
        expiresAt,
      });
    });

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'company_user_invited',
      targetType: 'user',
      targetId: user.id,
      tenantId,
      companyId,
      metadata: { email, role: dto.role, invitationId },
    });

    await this.emailSvc.sendSignInInvitation({
      to: email,
      firstName: dto.firstName || '',
      companyName: comp.name,
      roleLabel: isCompAdmin ? 'Company Administrator' : 'Member',
    });

    return {
      message: `Invitation sent to ${email}`,
      invitationId,
      invitation: {
        id: invitationId,
        email,
        role: dto.role,
        status: 'pending',
      },
    };
  }

  async updateCompanyUserRole(
    tenantId: string,
    companyId: string,
    targetUserId: string,
    newRole: CompanyAccessRole,
    actor?: { id?: string; email?: string },
  ): Promise<{ message: string }> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const user = await this.userRepo.findById(targetUserId);
    if (!user) throw new NotFoundError(`User '${targetUserId}' not found`);

    const db = getDb();
    const isDemotion = newRole === 'member';
    const COMPANY_ADMIN_ROLE_ID = systemRoleIdForCode('company_admin');
    const USER_ROLE_ID = systemRoleIdForCode('user');

    if (isDemotion) {
      // Check last company admin safety rule
      const [userAdminAssignment] = await db
        .select()
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.userId, targetUserId),
            eq(roleAssignments.companyId, companyId),
            eq(roleAssignments.roleId, COMPANY_ADMIN_ROLE_ID),
            eq(roleAssignments.status, 'active'),
          ),
        );

      if (userAdminAssignment) {
        const [countRow] = await db
          .select({ total: count() })
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.companyId, companyId),
              eq(roleAssignments.roleId, COMPANY_ADMIN_ROLE_ID),
              eq(roleAssignments.status, 'active'),
            ),
          );

        if ((countRow?.total ?? 0) <= 1) {
          throw new BadRequestError(
            'Cannot remove or revoke the sole active Company Administrator for this company',
            'CANNOT_REMOVE_LAST_COMPANY_ADMIN',
          );
        }
      }
    }

    const targetMembershipRole = newRole === 'company_admin' ? 'company_admin' : 'user';

    await db.transaction(async (tx) => {
      await tx
        .update(memberships)
        .set({ role: targetMembershipRole })
        .where(and(eq(memberships.userId, targetUserId), eq(memberships.companyId, companyId)));

      if (newRole === 'company_admin') {
        const [existingAdminAssign] = await tx
          .select()
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.userId, targetUserId),
              eq(roleAssignments.companyId, companyId),
              eq(roleAssignments.roleId, COMPANY_ADMIN_ROLE_ID),
            ),
          );

        if (existingAdminAssign) {
          await tx
            .update(roleAssignments)
            .set({ status: 'active', revokedAt: null, revokedBy: null })
            .where(eq(roleAssignments.id, existingAdminAssign.id));
        } else {
          await tx.insert(roleAssignments).values({
            id: generateSurrogateId('ras'),
            userId: targetUserId,
            roleId: COMPANY_ADMIN_ROLE_ID,
            tenantId,
            companyId,
            status: 'active',
            assignedBy: actor?.id ?? null,
          });
        }
      } else {
        // Demoting to member: revoke company_admin role assignment
        await tx
          .update(roleAssignments)
          .set({
            status: 'revoked',
            revokedAt: new Date(),
            revokedBy: actor?.id ?? null,
          })
          .where(
            and(
              eq(roleAssignments.userId, targetUserId),
              eq(roleAssignments.companyId, companyId),
              eq(roleAssignments.roleId, COMPANY_ADMIN_ROLE_ID),
              eq(roleAssignments.status, 'active'),
            ),
          );

        // Ensure user role assignment
        const [existingUserAssign] = await tx
          .select()
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.userId, targetUserId),
              eq(roleAssignments.companyId, companyId),
              eq(roleAssignments.roleId, USER_ROLE_ID),
            ),
          );

        if (existingUserAssign) {
          await tx
            .update(roleAssignments)
            .set({ status: 'active', revokedAt: null, revokedBy: null })
            .where(eq(roleAssignments.id, existingUserAssign.id));
        } else {
          await tx.insert(roleAssignments).values({
            id: generateSurrogateId('ras'),
            userId: targetUserId,
            roleId: USER_ROLE_ID,
            tenantId,
            companyId,
            status: 'active',
            assignedBy: actor?.id ?? null,
          });
        }
      }
    });

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'company_role_changed',
      targetType: 'user',
      targetId: targetUserId,
      tenantId,
      companyId,
      metadata: { newRole },
    });

    return {
      message: `Role updated to ${newRole === 'company_admin' ? 'Company Administrator' : 'Member'}`,
    };
  }

  async resendCompanyInvitation(
    tenantId: string,
    companyId: string,
    invitationId: string,
    actor?: { id?: string; email?: string },
  ): Promise<{ message: string }> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const inv = await this.repo.findCompanyInvitationById(companyId, invitationId);
    if (!inv || inv.tenantId !== tenantId) {
      throw new NotFoundError('Invitation not found');
    }

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repo.resendCompanyInvitation(invitationId, newExpiresAt);

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'company_invitation_resent',
      targetType: 'invitation',
      targetId: invitationId,
      tenantId,
      companyId,
      metadata: { email: inv.email },
    });

    const user = await this.userRepo.findByEmail(inv.email);
    await this.emailSvc.sendSignInInvitation({
      to: inv.email,
      firstName: user?.firstName ?? '',
      companyName: comp.name,
      roleLabel: inv.role === 'company_admin' ? 'Company Administrator' : 'Member',
    });

    return { message: `Invitation extended and re-sent to ${inv.email}` };
  }

  async cancelCompanyInvitation(
    tenantId: string,
    companyId: string,
    invitationId: string,
    actor?: { id?: string; email?: string },
  ): Promise<{ message: string }> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const inv = await this.repo.findCompanyInvitationById(companyId, invitationId);
    if (!inv || inv.tenantId !== tenantId) {
      throw new NotFoundError('Invitation not found');
    }

    await this.repo.updateCompanyInvitationStatus(invitationId, 'cancelled');

    await this.audit.logEvent({
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action: 'company_invitation_cancelled',
      targetType: 'invitation',
      targetId: invitationId,
      tenantId,
      companyId,
      metadata: { email: inv.email },
    });

    return { message: `Invitation for ${inv.email} cancelled successfully` };
  }

  async getCompanyRolesOverview(
    tenantId: string,
    companyId: string,
  ): Promise<CompanyRoleOverviewItem[]> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp || comp.tenantId !== tenantId) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    return [
      {
        code: 'member',
        name: 'Member',
        scope: 'Company Member',
        description: 'Standard authenticated member of the legal company entity.',
        administrativeCapabilities: [
          'Access company self-service interfaces and personal workspace',
          'View company directory and public organizational structure',
          'Receive company notifications and announcements',
        ],
        disclaimer:
          'Application permissions (HRMS, CRM, Project Management) are provisioned and managed separately.',
      },
      {
        code: 'company_admin',
        name: 'Company Administrator',
        scope: 'Company Administration',
        description:
          'Delegated operational administrator for company masters, workforce organization, and access.',
        administrativeCapabilities: [
          'Manage company overview profile, regional settings, and visual branding',
          'Manage organizational structure (Business Units, Divisions, Departments, Work Locations)',
          'Manage company user directory, invitations, and role assignments',
          'View company administrative audit trail',
        ],
        disclaimer:
          'Does not grant Tenant Administrator authority across other companies. Business application permissions are governed separately.',
      },
    ];
  }
}

export const tenantAdminService = new TenantAdminService();
