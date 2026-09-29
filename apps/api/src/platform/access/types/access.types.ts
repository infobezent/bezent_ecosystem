import type { ModuleCode } from '../../modules/types/module.types.js';
import type { PermissionGroup, PermissionScope, WorkspaceId } from '../catalog/accessCatalog.js';

/**
 * The server-verified tenant/company of a request (req.companyContext). Set
 * only by access middleware after membership, status and entitlement checks;
 * never taken from client headers.
 */
export interface CompanyContext {
  tenantId: string;
  companyId: string;
}

export interface AccessRoleSummary {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  moduleCode: ModuleCode | null;
}

/**
 * The effective, server-resolved access of one User in ONE company.
 * Never merged across companies.
 */
export interface CompanyAccess {
  tenantId: string;
  tenantName: string | null;
  companyId: string;
  companyName: string;
  companyCode: string;
  /** True when the user holds an active membership in the company. */
  isMember: boolean;
  /** True when access comes only from platform Super Admin oversight. */
  isPlatformOversight: boolean;
  roles: AccessRoleSummary[];
  permissions: string[];
  enabledModules: ModuleCode[];
  essEligible: boolean;
  /** Linked Employee record id when ESS-eligible. */
  employeeId: string | null;
  workspaces: WorkspaceId[];
}

export interface AccessOverview {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isSuperAdmin: boolean;
  };
  /** Platform-level workspaces (currently Super Admin only). */
  platformWorkspaces: WorkspaceId[];
  /** Companies where the user holds an active membership, each resolved independently. */
  companies: CompanyAccess[];
}

export interface PermissionDirectoryEntry {
  id: string;
  group: PermissionGroup;
  groupLabel: string;
  scope: PermissionScope;
  label: string;
  description: string;
  moduleCode: ModuleCode | null;
}

export interface RoleDirectoryEntry {
  id: string;
  code: string;
  name: string;
  description: string | null;
  moduleCode: ModuleCode | null;
  isSystem: boolean;
  status: 'active' | 'inactive';
  permissions: string[];
  activeAssignmentCount: number;
}

export interface UserCompanyAccess {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipStatus: 'active' | 'inactive' | 'revoked' | null;
  roles: AccessRoleSummary[];
  effectivePermissions: string[];
  essEligible: boolean;
}

export interface CreateCustomRoleInput {
  name: string;
  description?: string | null;
  moduleCode?: ModuleCode | null;
  permissions: string[];
}

export interface UpdateCustomRoleInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
}

export interface AccessActor {
  id: string;
  email: string;
}
