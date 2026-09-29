import type { ModuleCode } from '../../modules/types/module.types.js';

/**
 * BEZENT permission catalog (ADR-017).
 *
 * Permission identifiers are stable, dotted, and defined here in code — the
 * database only stores references to them (`role_permissions.permission_id`).
 * Renaming an identifier is a breaking change; add a new one instead.
 *
 * Scopes:
 * - `platform` — held only through `users.is_super_admin`; never assignable to
 *   a company role.
 * - `company`  — granted through company roles (system or custom).
 * - `self`     — self-service over the caller's OWN employee record. Granted by
 *   ESS eligibility (a linked, active Employee record), never by a role, so no
 *   role can expand self-service into another employee's data.
 */

export type PermissionGroup =
  'platform' | 'company_administration' | 'hrms' | 'ess' | 'crm' | 'project_management';

export type PermissionScope = 'platform' | 'company' | 'self';

export interface PermissionDefinition {
  id: string;
  group: PermissionGroup;
  scope: PermissionScope;
  label: string;
  description: string;
  /** Business application entitlement this permission depends on. */
  moduleCode: ModuleCode | null;
}

export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
  platform: 'Platform',
  company_administration: 'Company Administration',
  hrms: 'HRMS',
  ess: 'Employee Self-Service',
  crm: 'CRM',
  project_management: 'Project Management',
};

function platform(id: string, label: string, description: string): PermissionDefinition {
  return { id, group: 'platform', scope: 'platform', label, description, moduleCode: null };
}

function company(id: string, label: string, description: string): PermissionDefinition {
  return {
    id,
    group: 'company_administration',
    scope: 'company',
    label,
    description,
    moduleCode: null,
  };
}

function hrms(id: string, label: string, description: string): PermissionDefinition {
  return { id, group: 'hrms', scope: 'company', label, description, moduleCode: 'hrms' };
}

function ess(id: string, label: string, description: string): PermissionDefinition {
  return { id, group: 'ess', scope: 'self', label, description, moduleCode: 'hrms' };
}

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  // Platform (Super Admin only)
  platform('platform.tenants.read', 'View tenants', 'View customer tenants and their status.'),
  platform('platform.tenants.create', 'Create tenants', 'Provision new customer tenants.'),
  platform('platform.tenants.update', 'Update tenants', 'Edit or suspend customer tenants.'),
  platform('platform.companies.manage', 'Manage companies', 'Create, edit and suspend companies.'),
  platform('platform.users.manage', 'Manage platform users', 'Manage platform identities.'),
  platform(
    'platform.modules.manage',
    'Manage entitlements',
    'Enable or disable applications per tenant.',
  ),
  platform('platform.audit.read', 'View platform audit', 'View the platform-wide audit trail.'),

  // Company Administration
  company(
    'company.profile.read',
    'View company profile',
    'View the company profile and dashboard.',
  ),
  company('company.profile.update', 'Update company profile', 'Edit company profile details.'),
  company('company.users.read', 'View company users', 'View company users and invitations.'),
  company('company.users.invite', 'Invite users', 'Invite users and manage pending invitations.'),
  company(
    'company.users.manage',
    'Manage user access',
    'Suspend, reactivate or revoke company access.',
  ),
  company(
    'company.roles.read',
    'View roles',
    'View roles, their permissions and user assignments.',
  ),
  company('company.roles.assign', 'Assign roles', 'Assign and revoke roles for company users.'),
  company(
    'company.roles.manage',
    'Manage custom roles',
    'Create, edit and deactivate custom roles.',
  ),
  company('company.modules.read', 'View applications', 'View enabled business applications.'),
  company(
    'company.modules.manage',
    'Manage applications',
    'Enable or disable entitled applications.',
  ),
  company('company.organization.read', 'View organization', 'View organization structure summary.'),
  company('company.policies.read', 'View policies', 'View company policy and settings summary.'),
  company('company.audit.read', 'View company audit', 'View the company audit trail.'),

  // HRMS (administrative)
  hrms('hrms.employees.read', 'View employees', 'View employee records and the directory.'),
  hrms('hrms.employees.create', 'Create employees', 'Register new employees.'),
  hrms(
    'hrms.employees.update',
    'Update employees',
    'Edit employee records and apply employee actions.',
  ),
  hrms('hrms.onboarding.read', 'View onboarding', 'View onboarding cases.'),
  hrms('hrms.onboarding.manage', 'Manage onboarding', 'Create and progress onboarding cases.'),
  hrms('hrms.documents.read', 'View employee documents', 'View employee documents.'),
  hrms(
    'hrms.documents.manage',
    'Manage employee documents',
    'Record and verify employee documents.',
  ),
  hrms(
    'hrms.organization.read',
    'View organization masters',
    'View departments, designations and locations.',
  ),
  hrms(
    'hrms.organization.manage',
    'Manage organization masters',
    'Edit departments, designations and locations.',
  ),
  hrms('hrms.settings.manage', 'Manage HR settings', 'Configure onboarding settings and forms.'),
  hrms('hrms.attendance.read', 'View attendance', 'View workforce attendance.'),
  hrms('hrms.attendance.manage', 'Administer attendance', 'Correct and regularize attendance.'),
  hrms('hrms.leave.read', 'View leave', 'View workforce leave requests and balances.'),
  hrms('hrms.leave.approve', 'Approve leave', 'Approve or reject leave requests.'),
  hrms('hrms.team.read', 'View my team', 'View the members of teams the user manages.'),

  // Employee Self-Service (own record only)
  ess('ess.profile.read', 'View own profile', 'View the linked employee profile.'),
  ess('ess.profile.change_request', 'Request profile changes', 'Submit profile change requests.'),
  ess('ess.attendance.read', 'View own attendance', 'View own attendance.'),
  ess('ess.attendance.mark', 'Mark attendance', 'Check in, check out and request regularization.'),
  ess('ess.leave.read', 'View own leave', 'View own leave balances and requests.'),
  ess('ess.leave.apply', 'Apply for leave', 'Apply for and cancel own leave.'),
  ess('ess.timesheets.manage', 'Manage own timesheets', 'Log and submit own timesheets.'),
  ess('ess.documents.read', 'View own documents', 'View and submit own documents.'),
  ess('ess.requests.manage', 'Manage own requests', 'Raise and cancel own service requests.'),
];

const PERMISSION_INDEX = new Map(PERMISSION_CATALOG.map((p) => [p.id, p]));

export function findPermission(id: string): PermissionDefinition | undefined {
  return PERMISSION_INDEX.get(id);
}

export const SELF_SERVICE_PERMISSIONS: readonly string[] = PERMISSION_CATALOG.filter(
  (p) => p.scope === 'self',
).map((p) => p.id);

/** Permissions a company role (system or custom) may contain. */
export function isRoleAssignablePermission(id: string): boolean {
  return findPermission(id)?.scope === 'company';
}

const COMPANY_ADMINISTRATION_PERMISSIONS = PERMISSION_CATALOG.filter(
  (p) => p.group === 'company_administration',
).map((p) => p.id);

const HRMS_ADMIN_PERMISSIONS = PERMISSION_CATALOG.filter(
  (p) => p.group === 'hrms' && p.id !== 'hrms.team.read',
).map((p) => p.id);

export type SystemRoleCode = 'company_admin' | 'hr_manager' | 'manager' | 'employee' | 'user';

export interface SystemRoleDefinition {
  id: string;
  code: SystemRoleCode;
  moduleCode: ModuleCode | null;
  permissions: readonly string[];
}

/**
 * System roles. Row identity lives in the `roles` table (migration 0017);
 * their permission sets live here so they cannot be edited at runtime.
 * `employee` intentionally carries no permissions: self-service follows the
 * linked employee record, not the role.
 */
export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  {
    id: 'role_sys_company_admin',
    code: 'company_admin',
    moduleCode: null,
    permissions: COMPANY_ADMINISTRATION_PERMISSIONS,
  },
  {
    id: 'role_sys_hr_manager',
    code: 'hr_manager',
    moduleCode: 'hrms',
    permissions: HRMS_ADMIN_PERMISSIONS,
  },
  {
    id: 'role_sys_manager',
    code: 'manager',
    moduleCode: 'hrms',
    permissions: [
      'hrms.team.read',
      'hrms.employees.read',
      'hrms.attendance.read',
      'hrms.leave.read',
      'hrms.leave.approve',
    ],
  },
  { id: 'role_sys_employee', code: 'employee', moduleCode: 'hrms', permissions: [] },
  { id: 'role_sys_user', code: 'user', moduleCode: null, permissions: [] },
];

const SYSTEM_ROLE_INDEX = new Map(SYSTEM_ROLES.map((r) => [r.id, r]));

export function findSystemRole(roleId: string): SystemRoleDefinition | undefined {
  return SYSTEM_ROLE_INDEX.get(roleId);
}

export function systemRoleIdForCode(code: SystemRoleCode): string {
  return `role_sys_${code}`;
}

/**
 * Permissions a platform Super Admin holds inside a company WITHOUT a
 * membership: company-administration oversight only (Phase 2 behaviour).
 * Super Admin never receives HRMS or ESS access this way.
 */
export const SUPER_ADMIN_COMPANY_OVERSIGHT: readonly string[] = COMPANY_ADMINISTRATION_PERMISSIONS;

/** Workspaces a user can launch. CRM / Project Management join when implemented. */
export type WorkspaceId = 'super_admin' | 'company_admin' | 'hrms' | 'ess';

/** Permission whose presence makes a company-scoped workspace available. */
export const WORKSPACE_ENTRY_PERMISSIONS: Record<'company_admin' | 'hrms', readonly string[]> = {
  company_admin: ['company.profile.read'],
  hrms: HRMS_ADMIN_PERMISSIONS.concat('hrms.team.read'),
};
