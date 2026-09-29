import { accessRepository, AccessRepository } from '../repository/access.repository.js';
import { moduleService, ModuleService } from '../../modules/service/module.service.js';
import { AppError, ForbiddenError, NotFoundError } from '../../../app/errors/AppError.js';
import {
  findPermission,
  findSystemRole,
  isRoleAssignablePermission,
  SELF_SERVICE_PERMISSIONS,
  SUPER_ADMIN_COMPANY_OVERSIGHT,
  WORKSPACE_ENTRY_PERMISSIONS,
  type WorkspaceId,
} from '../catalog/accessCatalog.js';
import type { AuthenticatedUser } from '../../auth/types/auth.types.js';
import type { AccessOverview, CompanyAccess } from '../types/access.types.js';

export const FORBIDDEN_COMPANY_ACCESS = 'FORBIDDEN_COMPANY_ACCESS';

/**
 * The ONE effective-permission resolver (ADR-017).
 *
 * Resolution is always for a single, explicitly selected company and is
 * deny-by-default. In order it requires: an authenticated, active user (the
 * session layer), an active membership in the company (or platform Super
 * Admin oversight), a company and tenant that are not suspended, active role
 * assignments on active roles, and the business application entitlement each
 * permission depends on. Self-service permissions additionally require a
 * linked, active Employee record. Permissions from different companies are
 * never combined.
 */
export class AccessResolverService {
  constructor(
    private readonly repo: AccessRepository = accessRepository,
    private readonly modules: ModuleService = moduleService,
  ) {}

  async resolveCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<CompanyAccess> {
    const membership = user.memberships.find(
      (m) => m.companyId === companyId && m.status === 'active',
    );
    if (!membership && !user.isSuperAdmin) {
      throw new ForbiddenError(
        'No active membership in the selected company',
        FORBIDDEN_COMPANY_ACCESS,
      );
    }

    const found = await this.repo.findCompanyWithTenant(companyId);
    if (!found) {
      if (user.isSuperAdmin) throw new NotFoundError(`Company '${companyId}' not found`);
      throw new ForbiddenError(
        'No active membership in the selected company',
        FORBIDDEN_COMPANY_ACCESS,
      );
    }
    const { company, tenant } = found;
    if (membership && membership.tenantId !== company.tenantId) {
      throw new ForbiddenError(
        'No active membership in the selected company',
        FORBIDDEN_COMPANY_ACCESS,
      );
    }
    if (company.status === 'suspended') {
      throw new ForbiddenError(
        'Company account is suspended. Please contact platform administration.',
        'COMPANY_SUSPENDED',
      );
    }
    if (tenant.status === 'suspended') {
      throw new ForbiddenError(
        'Tenant organization is suspended. Please contact platform administration.',
        'TENANT_SUSPENDED',
      );
    }

    const tenantId = company.tenantId;
    const heldRoles = membership
      ? await this.repo.listActiveRolesForUser(user.id, tenantId, companyId)
      : [];
    const enabledModules = await this.modules.getEnabledModules(tenantId, companyId);

    const granted = new Set<string>();
    const customRoleIds: string[] = [];
    for (const role of heldRoles) {
      const system = role.isSystem ? findSystemRole(role.id) : undefined;
      if (system) {
        system.permissions.forEach((p) => granted.add(p));
      } else if (!role.isSystem) {
        customRoleIds.push(role.id);
      }
    }
    const customPermissions = await this.repo.listCustomRolePermissions(
      tenantId,
      companyId,
      customRoleIds,
    );
    // Defence in depth: a stored custom-role permission outside the company
    // scope (platform or self-service) is ignored, never honoured.
    customPermissions
      .filter((p) => isRoleAssignablePermission(p.permissionId))
      .forEach((p) => granted.add(p.permissionId));

    if (user.isSuperAdmin) {
      SUPER_ADMIN_COMPANY_OVERSIGHT.forEach((p) => granted.add(p));
    }

    let employeeId: string | null = null;
    if (membership && enabledModules.has('hrms')) {
      const employee = await this.repo.findEssEligibleEmployee(
        user.id,
        user.email,
        tenantId,
        companyId,
      );
      if (employee) {
        employeeId = employee.id;
        SELF_SERVICE_PERMISSIONS.forEach((p) => granted.add(p));
      }
    }

    // A permission whose business application is not entitled grants nothing.
    const permissions = [...granted]
      .filter((id) => {
        const definition = findPermission(id);
        if (!definition) return false;
        return definition.moduleCode === null || enabledModules.has(definition.moduleCode);
      })
      .sort();

    const essEligible = employeeId !== null;
    const permissionSet = new Set(permissions);
    const workspaces: WorkspaceId[] = [];
    if (WORKSPACE_ENTRY_PERMISSIONS.company_admin.some((p) => permissionSet.has(p))) {
      workspaces.push('company_admin');
    }
    if (WORKSPACE_ENTRY_PERMISSIONS.hrms.some((p) => permissionSet.has(p))) {
      workspaces.push('hrms');
    }
    if (essEligible) {
      workspaces.push('ess');
    }

    return {
      tenantId,
      tenantName: tenant.name,
      companyId: company.id,
      companyName: company.name,
      companyCode: company.code,
      isMember: Boolean(membership),
      isPlatformOversight: !membership && user.isSuperAdmin,
      roles: heldRoles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        isSystem: r.isSystem,
        moduleCode: r.moduleCode,
      })),
      permissions,
      enabledModules: [...enabledModules],
      essEligible,
      employeeId,
      workspaces,
    };
  }

  /**
   * Every company the user can currently enter, each resolved on its own.
   * Companies that deny access (suspended company or tenant) are omitted;
   * any other failure propagates.
   */
  async resolveOverview(user: AuthenticatedUser): Promise<AccessOverview> {
    const companyIds = [
      ...new Set(user.memberships.filter((m) => m.status === 'active').map((m) => m.companyId)),
    ];

    const companies: CompanyAccess[] = [];
    for (const companyId of companyIds) {
      try {
        companies.push(await this.resolveCompanyAccess(user, companyId));
      } catch (err) {
        if (err instanceof AppError && err.statusCode === 403) continue;
        throw err;
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
      },
      platformWorkspaces: user.isSuperAdmin ? ['super_admin'] : [],
      companies,
    };
  }
}

export const accessResolverService = new AccessResolverService();
