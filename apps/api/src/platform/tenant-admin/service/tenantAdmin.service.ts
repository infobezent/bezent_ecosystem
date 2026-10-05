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
  moduleService,
  ModuleService,
} from '../../modules/service/module.service.js';
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
  TenantMemberListFilter,
  TenantMemberRecord,
  InviteTenantMemberDto,
  GrantCompanyAccessDto,
  AssignCompanyRolesDto,
  TenantApplicationDistribution,
  CompanyApplicationStatus,
} from '../types/tenantAdmin.types.js';
import {
  validateInviteTenantMember,
  validateGrantCompanyAccess,
  validateAssignCompanyRoles,
} from '../validation/tenantAdmin.schema.js';
import { MODULE_CATALOG, type ModuleCode } from '../../modules/types/module.types.js';
import { getDb } from '../../../db/connection.js';
import { memberships, roleAssignments, roles, invitations } from '../../../db/schema.js';
import { and, eq, or, count } from 'drizzle-orm';
import crypto from 'node:crypto';
import { systemRoleIdForCode } from '../../access/catalog/accessCatalog.js';

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
            and(
              eq(memberships.userId, user.id),
              eq(memberships.companyId, compAccess.companyId),
            ),
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
}

export const tenantAdminService = new TenantAdminService();

