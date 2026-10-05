import type { ModuleCode } from '../../modules/types/module.types.js';

/**
 * BEZENT permission catalog (ADR-017 & Section 3/4 RBAC Foundation).
 *
 * Permission identifiers are stable, dotted, and follow the canonical model:
 *   <application>.<module>.<action>
 *
 * e.g.
 *   hrms.employees.view
 *   hrms.employees.create
 *   hrms.employees.edit
 *   hrms.attendance.view
 *   hrms.attendance.regularize
 *   hrms.leave.view
 *   hrms.leave.approve
 *
 * Backward-compatible aliases (e.g. legacy 'read' / 'update') are preserved
 * on definitions so existing tests, code, and database records remain valid.
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
  /** Canonical permission identifier: <application>.<module>.<action> */
  id: string;
  /** Application boundary (e.g. 'hrms', 'company_administration', 'platform', 'crm', 'pm') */
  application: string;
  /** Module/domain inside the application (e.g. 'employees', 'attendance', 'leave', 'roles') */
  module: string;
  /** Action capability (e.g. 'view', 'create', 'edit', 'delete', 'approve', 'regularize') */
  action: string;
  group: PermissionGroup;
  scope: PermissionScope;
  label: string;
  description: string;
  /** Business application entitlement this permission depends on. Null if platform/company admin. */
  moduleCode: ModuleCode | null;
  /** Backward-compatible aliases (e.g. legacy 'hrms.employees.read') */
  aliases?: readonly string[];
  isSystem?: boolean;
  isActive?: boolean;
}

export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
  platform: 'Platform',
  company_administration: 'Company Administration',
  hrms: 'HRMS',
  ess: 'Employee Self-Service',
  crm: 'CRM',
  project_management: 'Project Management',
};

export const APPLICATION_LABELS: Record<string, string> = {
  hrms: 'HRMS',
  company_administration: 'Company Administration',
  platform: 'Platform Administration',
  ess: 'Employee Self-Service',
  crm: 'CRM',
  project_management: 'Project Management',
};

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  administration: 'Administration',
  employees: 'Employees',
  attendance: 'Attendance',
  leave: 'Leave',
  timesheets: 'Timesheets',
  performance: 'Performance',
  onboarding: 'Onboarding',
  documents: 'Documents',
  organization: 'Organization Masters',
  settings: 'Settings',
  team: 'Team Management',
  profile: 'Company Profile',
  users: 'Company Users',
  roles: 'Roles & Permissions',
  modules: 'Application Entitlements',
  policies: 'Company Policies',
  audit: 'Audit Log',
  tenants: 'Tenants',
  companies: 'Companies',
  requests: 'Service Requests',
};

function platform(
  module: string,
  action: string,
  label: string,
  description: string,
  aliases: string[] = [],
): PermissionDefinition {
  return {
    id: `platform.${module}.${action}`,
    application: 'platform',
    module,
    action,
    group: 'platform',
    scope: 'platform',
    label,
    description,
    moduleCode: null,
    aliases,
    isSystem: true,
    isActive: true,
  };
}

function company(
  module: string,
  action: string,
  label: string,
  description: string,
  aliases: string[] = [],
): PermissionDefinition {
  return {
    id: `company.${module}.${action}`,
    application: 'company_administration',
    module,
    action,
    group: 'company_administration',
    scope: 'company',
    label,
    description,
    moduleCode: null,
    aliases,
    isSystem: true,
    isActive: true,
  };
}

function hrms(
  module: string,
  action: string,
  label: string,
  description: string,
  aliases: string[] = [],
): PermissionDefinition {
  return {
    id: `hrms.${module}.${action}`,
    application: 'hrms',
    module,
    action,
    group: 'hrms',
    scope: 'company',
    label,
    description,
    moduleCode: 'hrms',
    aliases,
    isSystem: true,
    isActive: true,
  };
}

function ess(
  module: string,
  action: string,
  label: string,
  description: string,
  aliases: string[] = [],
): PermissionDefinition {
  return {
    id: `ess.${module}.${action}`,
    application: 'ess',
    module,
    action,
    group: 'ess',
    scope: 'self',
    label,
    description,
    moduleCode: 'hrms',
    aliases,
    isSystem: true,
    isActive: true,
  };
}

const BASE_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Platform (Super Admin only)
  platform('tenants', 'view', 'View tenants', 'View customer tenants and their status.', [
    'platform.tenants.read',
  ]),
  platform('tenants', 'create', 'Create tenants', 'Provision new customer tenants.'),
  platform('tenants', 'edit', 'Update tenants', 'Edit or suspend customer tenants.', [
    'platform.tenants.update',
  ]),
  platform('companies', 'manage', 'Manage companies', 'Create, edit and suspend companies.'),
  platform('users', 'manage', 'Manage platform users', 'Manage platform identities.'),
  platform(
    'modules',
    'manage',
    'Manage entitlements',
    'Enable or disable applications per tenant.',
  ),
  platform('audit', 'view', 'View platform audit', 'View the platform-wide audit trail.', [
    'platform.audit.read',
  ]),

  // Company Administration
  company('profile', 'view', 'View company profile', 'View the company profile and dashboard.', [
    'company.profile.read',
  ]),
  company('profile', 'edit', 'Update company profile', 'Edit company profile details.', [
    'company.profile.update',
  ]),
  company('users', 'view', 'View company users', 'View company users and invitations.', [
    'company.users.read',
  ]),
  company('users', 'invite', 'Invite users', 'Invite users and manage pending invitations.'),
  company('users', 'manage', 'Manage user access', 'Suspend, reactivate or revoke company access.'),
  company('roles', 'view', 'View roles', 'View roles, their permissions and user assignments.', [
    'company.roles.read',
  ]),
  company('roles', 'assign', 'Assign roles', 'Assign and revoke roles for company users.'),
  company('roles', 'manage', 'Manage custom roles', 'Create, edit and deactivate custom roles.'),
  company('modules', 'view', 'View applications', 'View enabled business applications.', [
    'company.modules.read',
  ]),
  company('modules', 'manage', 'Manage applications', 'Enable or disable entitled applications.'),
  company(
    'organization',
    'view',
    'View organization masters',
    'View organization structure, departments, and work locations.',
    ['company.organization.read'],
  ),
  company(
    'organization',
    'manage',
    'Manage organization masters',
    'Create and edit company departments, work locations, and organization structure.',
    ['company.organization.edit'],
  ),
  company('policies', 'view', 'View policies', 'View company policy and settings summary.', [
    'company.policies.read',
  ]),
  company('audit', 'view', 'View company audit', 'View the company audit trail.', [
    'company.audit.read',
  ]),

  // HRMS (administrative)
  hrms('dashboard', 'view', 'View HR dashboard', 'View HRMS overview, analytics and activity.', [
    'hrms.dashboard.read',
  ]),
  hrms(
    'administration',
    'view',
    'View workforce administration',
    'Access employee directory, employee administration, onboarding, and workforce documents.',
    ['hrms.administration.read', 'hrms.employees.read', 'hrms.employees.view'],
  ),
  hrms('employees', 'view', 'View employees', 'View employee records and the directory.', [
    'hrms.employees.read',
    'hrms.administration.view',
    'hrms.administration.read',
  ]),
  hrms('employees', 'create', 'Create employees', 'Register new employees.'),
  hrms(
    'employees',
    'edit',
    'Update employees',
    'Edit employee records and apply employee actions.',
    ['hrms.employees.update'],
  ),
  hrms('onboarding', 'view', 'View onboarding', 'View onboarding cases.', ['hrms.onboarding.read']),
  hrms('onboarding', 'manage', 'Manage onboarding', 'Create and progress onboarding cases.'),
  hrms('documents', 'view', 'View employee documents', 'View employee documents.', [
    'hrms.documents.read',
  ]),
  hrms('documents', 'manage', 'Manage employee documents', 'Record and verify employee documents.'),
  hrms(
    'workforce',
    'view',
    'View workforce configuration',
    'View designations, job levels and grades.',
    [
      'hrms.workforce.view',
      'hrms.workforce.read',
      'hrms.organization.view',
      'hrms.organization.read',
      'organization.designations.view',
      'organization.jobLevels.view',
      'organization.grades.view',
    ],
  ),
  hrms(
    'workforce',
    'manage',
    'Manage workforce configuration',
    'Edit designations, job levels and grades.',
    [
      'hrms.workforce.manage',
      'hrms.organization.manage',
      'organization.designations.manage',
      'organization.jobLevels.manage',
      'organization.grades.manage',
    ],
  ),
  hrms('jobLevels', 'view', 'View job levels', 'View organizational job levels and seniority ranks.'),
  hrms('jobLevels', 'manage', 'Manage job levels', 'Create, edit, and deactivate job levels.'),
  hrms('grades', 'view', 'View grades', 'View employee grades and classification ranks.'),
  hrms('grades', 'manage', 'Manage grades', 'Create, edit, and deactivate grades.'),
  hrms(
    'settings',
    'view',
    'View HR settings',
    'View HR policies, forms and settings configuration.',
    ['hrms.settings.read'],
  ),
  hrms('settings', 'manage', 'Manage HR settings', 'Configure onboarding settings and forms.'),
  hrms('attendance', 'view', 'View attendance', 'View workforce attendance.', [
    'hrms.attendance.read',
  ]),
  hrms('attendance', 'regularize', 'Administer attendance', 'Correct and regularize attendance.', [
    'hrms.attendance.manage',
  ]),
  hrms('leave', 'view', 'View leave', 'View workforce leave requests and balances.', [
    'hrms.leave.read',
  ]),
  hrms('leave', 'approve', 'Approve leave', 'Approve or reject leave requests.'),
  hrms(
    'timesheets',
    'view',
    'View timesheets',
    'View workforce time logs, weekly timesheets and project hours.',
    ['hrms.timesheets.read'],
  ),
  hrms(
    'performance',
    'view',
    'View performance',
    'View goals, OKRs, appraisals and feedback cycles.',
    ['hrms.performance.read'],
  ),
  hrms('team', 'view', 'View my team', 'View the members of teams the user manages.', [
    'hrms.team.read',
  ]),

  // Employee Self-Service (own record only)
  ess('profile', 'view', 'View own profile', 'View the linked employee profile.', [
    'ess.profile.read',
  ]),
  ess('profile', 'change_request', 'Request profile changes', 'Submit profile change requests.'),
  ess('attendance', 'view', 'View own attendance', 'View own attendance.', ['ess.attendance.read']),
  ess('attendance', 'mark', 'Mark attendance', 'Check in, check out and request regularization.'),
  ess('leave', 'view', 'View own leave', 'View own leave balances and requests.', [
    'ess.leave.read',
  ]),
  ess('leave', 'apply', 'Apply for leave', 'Apply for and cancel own leave.'),
  ess('timesheets', 'manage', 'Manage own timesheets', 'Log and submit own timesheets.'),
  ess('documents', 'view', 'View own documents', 'View and submit own documents.', [
    'ess.documents.read',
  ]),
  ess('requests', 'manage', 'Manage own requests', 'Raise and cancel own service requests.'),
];

/**
 * Dynamic registry backing PERMISSION_CATALOG.
 * Modules register their real permissions incrementally as functional completeness is achieved.
 */
const dynamicCatalog: PermissionDefinition[] = [...BASE_PERMISSION_DEFINITIONS];
const dynamicIndex = new Map<string, PermissionDefinition>();

function indexPermission(def: PermissionDefinition): void {
  dynamicIndex.set(def.id, def);
  if (def.aliases) {
    for (const alias of def.aliases) {
      dynamicIndex.set(alias, def);
    }
  }
}

// Initialize index
dynamicCatalog.forEach(indexPermission);

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = dynamicCatalog;

export function getPermissionCatalog(): readonly PermissionDefinition[] {
  return dynamicCatalog;
}

/** Looks up a permission definition by canonical key or legacy alias. */
export function findPermission(idOrAlias: string): PermissionDefinition | undefined {
  return dynamicIndex.get(idOrAlias);
}

/** Returns the canonical permission key for any given key or alias. */
export function normalizePermissionKey(idOrAlias: string): string {
  const def = findPermission(idOrAlias);
  return def ? def.id : idOrAlias;
}

/**
 * Expands an array of permission keys to include both canonical keys and aliases.
 * Ensures zero breakage across legacy checks and database records.
 */
export function expandPermissionKeys(keys: readonly string[]): string[] {
  const expanded = new Set<string>();
  for (const k of keys) {
    expanded.add(k);
    const def = findPermission(k);
    if (def) {
      expanded.add(def.id);
      if (def.aliases) {
        def.aliases.forEach((a) => expanded.add(a));
      }
    }
  }
  return [...expanded].sort();
}

/**
 * Incremental registration API: allows completed HRMS or future business modules
 * to register their real permissions without modifying the RBAC core engine.
 */
export function registerPermission(def: PermissionDefinition): void {
  const existing = dynamicCatalog.findIndex((p) => p.id === def.id);
  if (existing >= 0) {
    dynamicCatalog[existing] = def;
  } else {
    dynamicCatalog.push(def);
  }
  indexPermission(def);
}

export function registerPermissions(defs: readonly PermissionDefinition[]): void {
  defs.forEach(registerPermission);
}

export const SELF_SERVICE_PERMISSIONS: readonly string[] = expandPermissionKeys(
  PERMISSION_CATALOG.filter((p) => p.scope === 'self').map((p) => p.id),
);

/** Permissions a company role (system or custom) may contain. */
export function isRoleAssignablePermission(id: string): boolean {
  return findPermission(id)?.scope === 'company';
}

export const COMPANY_ADMINISTRATION_PERMISSIONS: readonly string[] = expandPermissionKeys(
  PERMISSION_CATALOG.filter((p) => p.group === 'company_administration').map((p) => p.id),
);

const HRMS_ADMIN_PERMISSIONS = expandPermissionKeys(
  PERMISSION_CATALOG.filter((p) => p.group === 'hrms' && p.id !== 'hrms.team.view').map(
    (p) => p.id,
  ),
);

export type SystemRoleCode = 'company_admin' | 'hr_manager' | 'manager' | 'employee' | 'user';

export interface SystemRoleDefinition {
  id: string;
  code: SystemRoleCode;
  moduleCode: ModuleCode | null;
  permissions: string[];
}

/**
 * System roles. Row identity lives in the `roles` table (migration 0017);
 * their permission sets live here so they cannot be edited at runtime.
 * `employee` intentionally carries no permissions: self-service follows the
 * linked employee record, not the role.
 */
export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    id: 'role_sys_company_admin',
    code: 'company_admin',
    moduleCode: null,
    permissions: [...COMPANY_ADMINISTRATION_PERMISSIONS],
  },
  {
    id: 'role_sys_hr_manager',
    code: 'hr_manager',
    moduleCode: 'hrms',
    permissions: [...HRMS_ADMIN_PERMISSIONS],
  },
  {
    id: 'role_sys_manager',
    code: 'manager',
    moduleCode: 'hrms',
    permissions: expandPermissionKeys([
      'hrms.team.view',
      'hrms.employees.view',
      'hrms.attendance.view',
      'hrms.leave.view',
      'hrms.leave.approve',
    ]),
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
 * Safely appends permissions to default system roles as new modules are completed.
 */
export function registerRolePermissions(
  roleCode: SystemRoleCode,
  newPermissions: readonly string[],
): void {
  const role = SYSTEM_ROLES.find((r) => r.code === roleCode);
  if (!role) return;
  const current = new Set(role.permissions);
  expandPermissionKeys(newPermissions).forEach((p) => current.add(p));
  role.permissions = [...current].sort();
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
  company_admin: ['company.profile.view', 'company.profile.read'],
  hrms: [...HRMS_ADMIN_PERMISSIONS, 'hrms.team.view', 'hrms.team.read'],
};

/* ── Hierarchical Permission Tree for UI Rendering ───────────────── */

export interface PermissionTreeAction {
  id: string;
  action: string;
  label: string;
  description: string;
  scope: PermissionScope;
  isSystem: boolean;
  aliases: readonly string[];
}

export interface PermissionTreeModule {
  module: string;
  label: string;
  permissions: PermissionTreeAction[];
}

export interface PermissionTreeApplication {
  application: string;
  label: string;
  moduleCode: ModuleCode | null;
  modules: PermissionTreeModule[];
}

/**
 * Builds a hierarchical tree of permissions: Application -> Module -> Actions.
 * Can be filtered for Company Admin role management (assignableOnly = true).
 */
export function getPermissionTree(options?: {
  moduleCode?: ModuleCode | null;
  scope?: PermissionScope;
  assignableOnly?: boolean;
  enabledModules?: readonly (ModuleCode | string)[];
}): PermissionTreeApplication[] {
  const apps = new Map<
    string,
    { label: string; moduleCode: ModuleCode | null; modules: Map<string, PermissionTreeModule> }
  >();

  for (const def of dynamicCatalog) {
    if (def.isActive === false) continue;
    if (options?.assignableOnly && def.scope !== 'company') continue;
    if (options?.scope && def.scope !== options.scope) continue;
    if (options?.moduleCode !== undefined && def.moduleCode !== options.moduleCode) continue;
    if (
      options?.enabledModules &&
      def.moduleCode &&
      !options.enabledModules.includes(def.moduleCode)
    ) {
      continue;
    }

    if (!apps.has(def.application)) {
      apps.set(def.application, {
        label: APPLICATION_LABELS[def.application] || def.application.toUpperCase(),
        moduleCode: def.moduleCode,
        modules: new Map(),
      });
    }

    const appEntry = apps.get(def.application)!;
    if (!appEntry.modules.has(def.module)) {
      appEntry.modules.set(def.module, {
        module: def.module,
        label:
          MODULE_LABELS[def.module] || def.module.charAt(0).toUpperCase() + def.module.slice(1),
        permissions: [],
      });
    }

    const modEntry = appEntry.modules.get(def.module)!;
    modEntry.permissions.push({
      id: def.id,
      action: def.action,
      label: def.label,
      description: def.description,
      scope: def.scope,
      isSystem: def.isSystem ?? true,
      aliases: def.aliases ?? [],
    });
  }

  return Array.from(apps.entries()).map(([appKey, appVal]) => ({
    application: appKey,
    label: appVal.label,
    moduleCode: appVal.moduleCode,
    modules: Array.from(appVal.modules.values()),
  }));
}
