import {
  accessRepository,
  AccessRepository,
  type DbExecutor,
} from '../repository/access.repository.js';
import { authRepository, AuthRepository } from '../../auth/repository/auth.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { accessResolverService, AccessResolverService } from './accessResolver.service.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../app/errors/AppError.js';
import {
  findPermission,
  findSystemRole,
  isRoleAssignablePermission,
  PERMISSION_CATALOG,
  PERMISSION_GROUP_LABELS,
  systemRoleIdForCode,
  type SystemRoleCode,
} from '../catalog/accessCatalog.js';
import type { Role } from '../../../db/schema.js';
import type { AuthenticatedUser } from '../../auth/types/auth.types.js';
import type {
  AccessActor,
  CompanyAccess,
  CreateCustomRoleInput,
  PermissionDirectoryEntry,
  RoleDirectoryEntry,
  UpdateCustomRoleInput,
  UserCompanyAccess,
} from '../types/access.types.js';

const COMPANY_ADMIN_ROLE_ID = systemRoleIdForCode('company_admin');

/**
 * Role directory, custom roles and role assignments within ONE company
 * (ADR-017). Every operation takes the actor's server-resolved CompanyAccess;
 * nothing here trusts a client-supplied tenant or company.
 *
 * Anti-escalation rules:
 * - Roles only ever contain company-scope permissions (never platform or self-service).
 * - An actor may only grant, revoke or compose Company Administration
 *   permissions they themselves hold in this company.
 * - Nobody assigns roles to themselves (Super Admin oversight excepted).
 * - A role of a business application that is not enabled cannot be assigned.
 */
export class RoleManagementService {
  constructor(
    private readonly repo: AccessRepository = accessRepository,
    private readonly authRepo: AuthRepository = authRepository,
    private readonly resolver: AccessResolverService = accessResolverService,
    private readonly audit: AuditService = auditService,
  ) {}

  /** Permissions an administrator may compose into company roles (never platform-scope). */
  listAssignablePermissions(access: CompanyAccess): PermissionDirectoryEntry[] {
    return PERMISSION_CATALOG.filter(
      (p) =>
        p.scope === 'company' &&
        (p.moduleCode === null || access.enabledModules.includes(p.moduleCode)),
    ).map((p) => ({
      id: p.id,
      group: p.group,
      groupLabel: PERMISSION_GROUP_LABELS[p.group],
      scope: p.scope,
      label: p.label,
      description: p.description,
      moduleCode: p.moduleCode,
    }));
  }

  async listRoles(access: CompanyAccess): Promise<RoleDirectoryEntry[]> {
    const rows = await this.repo.listRoles(access.tenantId, access.companyId);
    const counts = await this.repo.countActiveAssignmentsByRole(access.tenantId, access.companyId);
    const customPermissions = await this.repo.listCustomRolePermissions(
      access.tenantId,
      access.companyId,
      rows.filter((r) => !r.isSystem).map((r) => r.id),
    );

    return rows
      .map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        moduleCode: role.moduleCode,
        isSystem: role.isSystem,
        status: role.status,
        permissions: this.permissionsOf(role, customPermissions),
        activeAssignmentCount: counts.get(role.id) ?? 0,
      }))
      .sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name));
  }

  async createCustomRole(
    access: CompanyAccess,
    actor: AccessActor,
    input: CreateCustomRoleInput,
  ): Promise<RoleDirectoryEntry> {
    const name = input.name.trim();
    const moduleCode = input.moduleCode ?? null;
    if (moduleCode && !access.enabledModules.includes(moduleCode)) {
      throw new ForbiddenError(`Application '${moduleCode}' is not enabled`, 'MODULE_NOT_ENABLED');
    }
    const permissions = this.validateRolePermissions(access, input.permissions);

    const code = `custom_${slugify(name)}`;
    if (await this.repo.findCustomRoleByCode(access.tenantId, access.companyId, code)) {
      throw new ConflictError(`A role named '${name}' already exists`, 'ROLE_EXISTS');
    }

    const roleId = await this.repo.transaction((tx) =>
      this.repo.createCustomRole(
        tx,
        {
          tenantId: access.tenantId,
          companyId: access.companyId,
          code,
          name,
          description: input.description?.trim() || null,
          moduleCode,
          actorId: actor.id,
        },
        permissions,
      ),
    );

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'custom_role_created',
      targetType: 'role',
      targetId: roleId,
      tenantId: access.tenantId,
      companyId: access.companyId,
      metadata: { code, name, moduleCode, permissions },
    });

    return this.getRole(access, roleId);
  }

  async updateCustomRole(
    access: CompanyAccess,
    actor: AccessActor,
    roleId: string,
    input: UpdateCustomRoleInput,
  ): Promise<RoleDirectoryEntry> {
    const role = await this.requireCustomRole(access, roleId);
    const before = await this.getRole(access, roleId);
    const permissions =
      input.permissions !== undefined
        ? this.validateRolePermissions(access, input.permissions)
        : undefined;
    // Editing a role that already holds administration permissions the actor
    // lacks would let them reshape a more powerful role.
    this.assertCanAdminister(access, before.permissions);

    await this.repo.transaction(async (tx) => {
      await this.repo.updateCustomRole(tx, role.id, access.tenantId, access.companyId, {
        name: input.name?.trim(),
        description:
          input.description === undefined ? undefined : input.description?.trim() || null,
        actorId: actor.id,
      });
      if (permissions) {
        await this.repo.replaceRolePermissions(
          tx,
          role.id,
          access.tenantId,
          access.companyId,
          permissions,
        );
      }
    });

    const context = { tenantId: access.tenantId, companyId: access.companyId };
    if (input.name !== undefined || input.description !== undefined) {
      await this.audit.logEvent({
        actorUserId: actor.id,
        actorEmail: actor.email,
        action: 'custom_role_updated',
        targetType: 'role',
        targetId: role.id,
        ...context,
        metadata: {
          fieldsUpdated: Object.keys(input).filter((k) => k !== 'permissions'),
          previousName: before.name,
        },
      });
    }
    if (permissions) {
      const added = permissions.filter((p) => !before.permissions.includes(p));
      const removed = before.permissions.filter((p) => !permissions.includes(p));
      if (added.length > 0 || removed.length > 0) {
        await this.audit.logEvent({
          actorUserId: actor.id,
          actorEmail: actor.email,
          action: 'role_permissions_changed',
          targetType: 'role',
          targetId: role.id,
          ...context,
          metadata: { added, removed },
        });
      }
    }

    return this.getRole(access, roleId);
  }

  async setCustomRoleStatus(
    access: CompanyAccess,
    actor: AccessActor,
    roleId: string,
    status: 'active' | 'inactive',
  ): Promise<RoleDirectoryEntry> {
    const role = await this.requireCustomRole(access, roleId);
    const current = await this.getRole(access, roleId);
    this.assertCanAdminister(access, current.permissions);

    if (status === 'inactive' && current.activeAssignmentCount > 0) {
      throw new ConflictError(
        'This role is assigned to active users. Revoke those assignments before deactivating it.',
        'ROLE_IN_USE',
      );
    }
    if (role.status === status) {
      return current;
    }

    await this.repo.setCustomRoleStatus(
      role.id,
      access.tenantId,
      access.companyId,
      status,
      actor.id,
    );
    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: status === 'inactive' ? 'custom_role_deactivated' : 'custom_role_reactivated',
      targetType: 'role',
      targetId: role.id,
      tenantId: access.tenantId,
      companyId: access.companyId,
      metadata: { previousStatus: role.status, status },
    });
    return this.getRole(access, roleId);
  }

  /** Roles and effective permissions of one user in the actor's company. */
  async getUserAccess(access: CompanyAccess, targetUserId: string): Promise<UserCompanyAccess> {
    const target = await this.repo.findCompanyUser(targetUserId, access.tenantId, access.companyId);
    if (!target) {
      throw new NotFoundError('User membership in this company not found');
    }

    const heldRoles = await this.repo.listActiveRolesForUser(
      targetUserId,
      access.tenantId,
      access.companyId,
    );

    let effectivePermissions: string[] = [];
    let essEligible = false;
    const targetIdentity = await this.loadIdentity(targetUserId);
    if (targetIdentity && target.membershipStatus === 'active') {
      const resolved = await this.resolver.resolveCompanyAccess(targetIdentity, access.companyId);
      effectivePermissions = resolved.permissions;
      essEligible = resolved.essEligible;
    }

    return {
      userId: target.id,
      email: target.email,
      firstName: target.firstName,
      lastName: target.lastName,
      membershipStatus: target.membershipStatus,
      roles: heldRoles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        isSystem: r.isSystem,
        moduleCode: r.moduleCode,
      })),
      effectivePermissions,
      essEligible,
    };
  }

  async assignRole(
    access: CompanyAccess,
    actor: AccessActor,
    targetUserId: string,
    roleId: string,
  ): Promise<UserCompanyAccess> {
    const role = await this.requireAssignableRole(access, actor, targetUserId, roleId);
    if (role.status !== 'active') {
      throw new BadRequestError('Inactive roles cannot be assigned', 'ROLE_INACTIVE');
    }
    if (role.moduleCode && !access.enabledModules.includes(role.moduleCode)) {
      throw new ForbiddenError(
        `Application '${role.moduleCode}' is not enabled for this company`,
        'MODULE_NOT_ENABLED',
      );
    }

    const existing = await this.repo.findAssignment(
      targetUserId,
      role.id,
      access.tenantId,
      access.companyId,
    );
    if (existing?.status === 'active') {
      throw new ConflictError('The user already holds this role', 'ROLE_ALREADY_ASSIGNED');
    }

    await this.repo.transaction((tx) =>
      this.repo.activateAssignment(tx, {
        userId: targetUserId,
        roleId: role.id,
        tenantId: access.tenantId,
        companyId: access.companyId,
        actorId: actor.id,
      }),
    );

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'role_assigned',
      targetType: 'user',
      targetId: targetUserId,
      tenantId: access.tenantId,
      companyId: access.companyId,
      metadata: { roleId: role.id, roleCode: role.code, roleName: role.name },
    });

    return this.getUserAccess(access, targetUserId);
  }

  async revokeRole(
    access: CompanyAccess,
    actor: AccessActor,
    targetUserId: string,
    roleId: string,
  ): Promise<UserCompanyAccess> {
    const role = await this.requireAssignableRole(access, actor, targetUserId, roleId);
    const existing = await this.repo.findAssignment(
      targetUserId,
      role.id,
      access.tenantId,
      access.companyId,
    );
    if (existing?.status !== 'active') {
      throw new NotFoundError('The user does not hold this role');
    }
    await this.assertNotLastCompanyAdmin(access, role.id);

    await this.repo.transaction((tx) =>
      this.repo.revokeAssignment(tx, {
        userId: targetUserId,
        roleId: role.id,
        tenantId: access.tenantId,
        companyId: access.companyId,
        actorId: actor.id,
      }),
    );

    await this.audit.logEvent({
      actorUserId: actor.id,
      actorEmail: actor.email,
      action: 'role_revoked',
      targetType: 'user',
      targetId: targetUserId,
      tenantId: access.tenantId,
      companyId: access.companyId,
      metadata: { roleId: role.id, roleCode: role.code, roleName: role.name },
    });

    return this.getUserAccess(access, targetUserId);
  }

  /**
   * Keeps role assignments in step with a legacy single-role membership write
   * (provisioning, invitations, the Phase 2 "change role" endpoint).
   * Run inside the caller's transaction when one exists.
   */
  async syncMembershipRole(
    executor: DbExecutor,
    input: {
      userId: string;
      tenantId: string;
      companyId: string;
      role: SystemRoleCode;
      previousRole?: SystemRoleCode | null;
      actorId: string | null;
    },
  ): Promise<void> {
    if (input.previousRole && input.previousRole !== input.role) {
      await this.repo.revokeAssignment(executor, {
        userId: input.userId,
        roleId: systemRoleIdForCode(input.previousRole),
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorId: input.actorId,
      });
    }
    await this.repo.activateAssignment(executor, {
      userId: input.userId,
      roleId: systemRoleIdForCode(input.role),
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorId: input.actorId,
    });
  }

  /** Escalation and entitlement guard for the legacy single-role endpoints (invite, change role). */
  assertCanGrantSystemRole(access: CompanyAccess, code: SystemRoleCode): void {
    const system = findSystemRole(systemRoleIdForCode(code));
    if (!system) {
      throw new BadRequestError(`Invalid role '${code}'`);
    }
    if (system.moduleCode && !access.enabledModules.includes(system.moduleCode)) {
      throw new ForbiddenError(
        `Application '${system.moduleCode}' is not enabled for this company`,
        'MODULE_NOT_ENABLED',
      );
    }
    this.assertCanAdminister(access, [...system.permissions]);
  }

  /** Suspending or revoking a user's company access must not remove the last Company Administrator. */
  async assertCanRemoveCompanyAccess(
    scope: Pick<CompanyAccess, 'tenantId' | 'companyId'>,
    targetUserId: string,
  ): Promise<void> {
    const assignment = await this.repo.findAssignment(
      targetUserId,
      COMPANY_ADMIN_ROLE_ID,
      scope.tenantId,
      scope.companyId,
    );
    if (assignment?.status === 'active') {
      await this.assertNotLastCompanyAdmin(scope, COMPANY_ADMIN_ROLE_ID);
    }
  }

  /** Revokes one system role in a company (platform Super Admin revoking a Company Admin). */
  async revokeSystemRole(
    executor: DbExecutor,
    input: {
      userId: string;
      tenantId: string;
      companyId: string;
      role: SystemRoleCode;
      actorId: string | null;
    },
  ): Promise<void> {
    await this.repo.revokeAssignment(executor, {
      userId: input.userId,
      roleId: systemRoleIdForCode(input.role),
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorId: input.actorId,
    });
  }

  /** Throws when removing this role would leave the company without a Company Administrator. */
  async assertNotLastCompanyAdmin(
    access: Pick<CompanyAccess, 'tenantId' | 'companyId'>,
    roleId: string,
  ): Promise<void> {
    if (roleId !== COMPANY_ADMIN_ROLE_ID) return;
    const holders = await this.repo.countActiveHolders(
      COMPANY_ADMIN_ROLE_ID,
      access.tenantId,
      access.companyId,
    );
    if (holders <= 1) {
      throw new BadRequestError(
        'Cannot remove the sole active Company Administrator. Assign another Company Administrator first.',
      );
    }
  }

  private async getRole(access: CompanyAccess, roleId: string): Promise<RoleDirectoryEntry> {
    const role = (await this.listRoles(access)).find((r) => r.id === roleId);
    if (!role) throw new NotFoundError('Role not found');
    return role;
  }

  private async requireCustomRole(access: CompanyAccess, roleId: string): Promise<Role> {
    const role = await this.repo.findRoleForCompany(roleId, access.tenantId, access.companyId);
    if (!role) throw new NotFoundError('Role not found');
    if (role.isSystem) {
      throw new ForbiddenError('System roles cannot be modified', 'SYSTEM_ROLE_PROTECTED');
    }
    return role;
  }

  private async requireAssignableRole(
    access: CompanyAccess,
    actor: AccessActor,
    targetUserId: string,
    roleId: string,
  ): Promise<Role> {
    if (targetUserId === actor.id && !access.isPlatformOversight) {
      throw new ForbiddenError(
        'You cannot change your own role assignments',
        'SELF_ASSIGNMENT_FORBIDDEN',
      );
    }
    const target = await this.repo.findCompanyUser(targetUserId, access.tenantId, access.companyId);
    if (!target || target.membershipStatus !== 'active') {
      throw new NotFoundError('Active user membership in this company not found');
    }
    const role = await this.repo.findRoleForCompany(roleId, access.tenantId, access.companyId);
    if (!role) throw new NotFoundError('Role not found');

    const customPermissions = role.isSystem
      ? []
      : await this.repo.listCustomRolePermissions(access.tenantId, access.companyId, [role.id]);
    this.assertCanAdminister(access, this.permissionsOf(role, customPermissions));
    return role;
  }

  private permissionsOf(
    role: Role,
    customPermissions: Array<{ roleId: string; permissionId: string }>,
  ): string[] {
    if (role.isSystem) {
      return [...(findSystemRole(role.id)?.permissions ?? [])];
    }
    return customPermissions
      .filter((p) => p.roleId === role.id)
      .map((p) => p.permissionId)
      .sort();
  }

  private validateRolePermissions(access: CompanyAccess, requested: string[]): string[] {
    const unique = [...new Set(requested)];
    if (unique.length === 0) {
      throw new BadRequestError('A role must contain at least one permission');
    }
    for (const id of unique) {
      const definition = findPermission(id);
      if (!definition) {
        throw new BadRequestError(`Unknown permission '${id}'`, 'UNKNOWN_PERMISSION');
      }
      if (!isRoleAssignablePermission(id)) {
        throw new ForbiddenError(
          `Permission '${id}' cannot be granted through a company role`,
          'PERMISSION_NOT_ASSIGNABLE',
        );
      }
      if (definition.moduleCode && !access.enabledModules.includes(definition.moduleCode)) {
        throw new ForbiddenError(
          `Permission '${id}' requires an application that is not enabled`,
          'MODULE_NOT_ENABLED',
        );
      }
    }
    this.assertCanAdminister(access, unique);
    return unique.sort();
  }

  /** Company Administration permissions may only be granted by someone who holds them. */
  private assertCanAdminister(access: CompanyAccess, permissions: string[]): void {
    const missing = permissions.filter(
      (p) =>
        findPermission(p)?.group === 'company_administration' && !access.permissions.includes(p),
    );
    if (missing.length > 0) {
      throw new ForbiddenError(
        'You cannot grant or change administrative permissions you do not hold',
        'ROLE_ESCALATION',
      );
    }
  }

  private async loadIdentity(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.authRepo.findUserById(userId);
    if (!user || user.status !== 'active') return null;
    const memberships = await this.authRepo.getUserMemberships(userId);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      memberships: memberships.map((m) => ({
        tenantId: m.tenantId,
        companyId: m.companyId,
        role: m.role,
        status: m.status,
      })),
    };
  }
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  if (!slug) {
    throw new BadRequestError('Role name must contain letters or digits');
  }
  return slug;
}

export const roleManagementService = new RoleManagementService();
