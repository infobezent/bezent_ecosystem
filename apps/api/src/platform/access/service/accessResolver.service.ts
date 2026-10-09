import { accessRepository, AccessRepository } from '../repository/access.repository.js';
import {
  tenantAdminRepository,
  TenantAdminRepository,
} from '../../../administration/tenant-admin/repository/tenantAdmin.repository.js';
import { moduleService, ModuleService } from '../../modules/service/module.service.js';
import { effectiveEntitlementService } from '../../entitlements/service/effectiveEntitlement.service.js';
import { AppError, ForbiddenError, NotFoundError } from '../../../app/errors/AppError.js';
import {
  expandPermissionKeys,
  findPermission,
  findSystemRole,
  isRoleAssignablePermission,
  SELF_SERVICE_PERMISSIONS,
  SUPER_ADMIN_COMPANY_OVERSIGHT,
  COMPANY_ADMINISTRATION_PERMISSIONS,
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
 * session layer), an active membership in the company, tenant-level administrative
 * authority (or platform Super Admin oversight), a company and tenant that are
 * not suspended, active role assignments on active roles, and the business
 * application entitlement each permission depends on. Self-service permissions
 * additionally require a linked, active Employee record. Permissions from
 * different companies are never combined.
 */
export class AccessResolverService {
  constructor(
    private readonly repo: AccessRepository = accessRepository,
    private readonly modules: ModuleService = moduleService,
    private readonly tenantAdminRepo: TenantAdminRepository = tenantAdminRepository,
  ) {}

  async resolveCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<CompanyAccess> {
    const found = await this.repo.findCompanyWithTenant(companyId);
    if (!found) {
      if (user.isSuperAdmin) throw new NotFoundError(`Company '${companyId}' not found`);
      throw new ForbiddenError(
        'No active membership in the selected company',
        FORBIDDEN_COMPANY_ACCESS,
      );
    }
    const { company, tenant } = found;

    const membership = user.memberships.find(
      (m) => m.companyId === companyId && m.status === 'active',
    );
    if (membership && membership.tenantId !== company.tenantId) {
      throw new ForbiddenError(
        'No active membership in the selected company',
        FORBIDDEN_COMPANY_ACCESS,
      );
    }

    // Check tenant-level administrative authority (Phase 1)
    const isTenantAdmin = await this.tenantAdminRepo.hasActiveTenantAdmin(
      company.tenantId,
      user.id,
    );

    if (!membership && !user.isSuperAdmin && !isTenantAdmin) {
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

    if (isTenantAdmin) {
      COMPANY_ADMINISTRATION_PERMISSIONS.forEach((p) => granted.add(p));
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

    // Expand granted permissions to include both canonical keys and aliases for seamless backward-compatibility
    const allGranted = expandPermissionKeys([...granted]);

    // Check effective module-level entitlements across applications
    const disabledApplicationModules = new Set<string>();
    for (const appCode of enabledModules) {
      try {
        const eff = await effectiveEntitlementService.resolveEffectiveEntitlements(
          tenantId,
          appCode as any,
          companyId,
        );
        for (const m of eff.modules) {
          if (!m.isEnabled) {
            disabledApplicationModules.add(`${appCode}:${m.moduleCode}`);
          }
        }
      } catch {
        // Safe fallback if tenant is not commercial
      }
    }

    // A permission whose business application or module is not entitled grants nothing.
    const permissions = allGranted
      .filter((id) => {
        const definition = findPermission(id);
        if (!definition) return false;
        if (definition.moduleCode !== null && !enabledModules.has(definition.moduleCode)) {
          return false;
        }
        if (definition.moduleCode !== null) {
          const modKey = definition.module === 'profile' ? 'employees' : definition.module;
          if (disabledApplicationModules.has(`${definition.moduleCode}:${modKey}`)) {
            return false;
          }
        }
        return true;
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
      isTenantAdmin: Boolean(isTenantAdmin),
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
    const memberCompanyIds = user.memberships
      .filter((m) => m.status === 'active')
      .map((m) => m.companyId);

    // Active companies belonging to tenants where the user holds Tenant Admin authority
    const tenantAdminRows = await this.tenantAdminRepo.listActiveByUser(user.id);
    const tenantIds = tenantAdminRows.map((r) => r.tenantId);
    const tenantCompanyIds = await this.repo.listActiveCompanyIdsForTenants(tenantIds);

    const companyIds = [...new Set([...memberCompanyIds, ...tenantCompanyIds])];

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
      isTenantAdmin: tenantAdminRows.length > 0,
      companies,
    };
  }
}

export const accessResolverService = new AccessResolverService();
