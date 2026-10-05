import type {
  ApplicationNavigation,
  NavCategory,
  NavDestination,
} from '../../../shared/types/navigation';

/**
 * Company Administration Navigation Catalog
 *
 * Exactly 5 canonical top-level navigation groups (Main Nav → SubNavFlyout pattern):
 *
 * 01. Overview     (1 child  → direct navigate to /company-admin/dashboard, no flyout)
 * 02. Company      (2 children → flyout: Company Profile, Organization)
 * 03. Access       (2 children → flyout: Users, Roles & Permissions)
 * 04. Applications (1 child  → direct navigate to /company-admin/modules, no flyout)
 * 05. Governance   (1 child  → direct navigate to /company-admin/audit-logs, no flyout)
 *
 * Single-destination rule (canItemOpenFlyout in LeftSidebar):
 *   children.length <= 1  → direct navigation, no flyout opened.
 *   children.length  >= 2 → SubNavFlyout opens on hover/click.
 *
 * Removed from nav (routes preserved for compatibility):
 *   - Company Policies (policies): HRMS-owned config, not canonical Company Admin.
 *   - Invitations: conceptually Access → Users child; route kept for compat.
 *   - Company Settings (settings): not in final IA; route kept for compat.
 */

export const COMPANY_ADMIN_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Company overview and operational health.',
    icon: 'dashboard',
  },
  {
    id: 'company',
    label: 'Company',
    description: 'Company profile, organizational units and corporate structure.',
    icon: 'organization',
  },
  {
    id: 'access',
    label: 'Access',
    description: 'User directory and role-based access management.',
    icon: 'employees',
  },
  {
    id: 'applications',
    label: 'Applications',
    description: 'Application catalog and company-level access entitlements.',
    icon: 'apps',
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Company-scoped audit logs and administrative governance.',
    icon: 'settings',
  },
];

export const COMPANY_ADMIN_NAV_DESTINATIONS: readonly NavDestination[] = [
  // 01. Overview — single child → direct navigate (no flyout)
  {
    id: 'overview',
    label: 'Overview',
    icon: 'dashboard',
    segment: 'dashboard',
    subtitle: 'Company Operations Overview',
    description:
      'Overview of company users, assigned roles, provisioned applications and recent activities.',
    categoryId: 'overview',
    sidebar: true,
    children: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        path: 'dashboard',
        permissionKey: 'company.profile.read',
      },
    ],
  },

  // 02. Company — two children → SubNavFlyout
  {
    id: 'company',
    label: 'Company',
    flyoutTitle: 'COMPANY',
    icon: 'organization',
    segment: 'profile',
    subtitle: 'Company Details',
    description: 'Company identity, organizational structure and corporate details.',
    categoryId: 'company',
    sidebar: true,
    children: [
      {
        id: 'profile',
        label: 'Company Profile',
        icon: 'organization',
        path: 'profile',
        permissionKey: 'company.profile.read',
      },
      {
        id: 'organization',
        label: 'Organization',
        icon: 'organization',
        path: 'organization',
        permissionKey: 'company.organization.view',
      },
    ],
  },

  // 03. Access — two+ children → SubNavFlyout
  {
    id: 'access',
    label: 'Access',
    flyoutTitle: 'ACCESS',
    icon: 'employees',
    segment: 'users',
    subtitle: 'Access Management',
    description: 'User directory, role assignments and permission boundaries.',
    categoryId: 'access',
    sidebar: true,
    children: [
      {
        id: 'users',
        label: 'Users',
        icon: 'employees',
        path: 'users',
        permissionKey: 'company.users.view',
      },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        icon: 'settings',
        path: 'roles',
        permissionKey: 'company.roles.view',
      },
      // Invitations: legacy compat child — route preserved, active state resolves to Access.
      // Shown in flyout temporarily; final Access/Users page UX review will merge or hide it.
      {
        id: 'invitations',
        label: 'Invitations',
        icon: 'employees',
        path: 'invitations',
        permissionKey: 'company.users.view',
      },
    ],
  },

  // 04. Applications — single child → direct navigate (no flyout)
  {
    id: 'applications',
    label: 'Applications',
    icon: 'apps',
    segment: 'modules',
    subtitle: 'Application Access',
    description:
      'View applications provisioned by Super Admin and configure company-level access.',
    categoryId: 'applications',
    sidebar: true,
    permissionKey: 'company.modules.view',
    children: [
      {
        id: 'application-access',
        label: 'Application Access',
        icon: 'apps',
        path: 'modules',
        permissionKey: 'company.modules.view',
      },
    ],
  },

  // 05. Governance — single child → direct navigate (no flyout)
  {
    id: 'governance',
    label: 'Governance',
    icon: 'settings',
    segment: 'audit-logs',
    subtitle: 'Company Governance',
    description: 'Audit trail of administrative actions strictly scoped to this company.',
    categoryId: 'governance',
    sidebar: true,
    permissionKey: 'company.audit.view',
    children: [
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: 'documents',
        path: 'audit-logs',
        permissionKey: 'company.audit.view',
      },
    ],
  },
];

export const companyAdminNavigation: ApplicationNavigation = {
  categories: COMPANY_ADMIN_NAV_CATEGORIES,
  destinations: COMPANY_ADMIN_NAV_DESTINATIONS,
};
