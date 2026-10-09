import type {
  ApplicationNavigation,
  NavCategory,
  NavDestination,
} from '../../../shared/types/navigation';

/**
 * Tenant Administration Navigation Catalog
 *
 * Exactly 5 canonical top-level navigation groups matching the Frozen Tenant Admin V1 IA:
 *
 * 01. Overview     (1 child  → direct navigate to /tenant-admin/dashboard, no flyout)
 * 02. Tenant       (2 children → flyout: Tenant Details, Companies)
 * 03. Access       (2 children → flyout: Users, Roles & Permissions)
 * 04. Applications (2 children → flyout: Application Access, Application Setup)
 * 05. Governance   (1 child  → direct navigate to /tenant-admin/governance/audit-logs, no flyout)
 *
 * Single-destination rule (canItemOpenFlyout in LeftSidebar):
 *   children.length <= 1  → direct navigation, no flyout opened.
 *   children.length  >= 2 → SubNavFlyout opens on hover/click.
 */

export const TENANT_ADMIN_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Tenant overview, health and managed entities summary.',
    icon: 'dashboard',
  },
  {
    id: 'tenant',
    label: 'Tenant',
    description: 'Tenant details, legal entities and company management.',
    icon: 'organization',
  },
  {
    id: 'access',
    label: 'Access',
    description: 'Tenant user directory and role-based access management.',
    icon: 'employees',
  },
  {
    id: 'applications',
    label: 'Applications',
    description: 'Application entitlements and company-level access setup.',
    icon: 'apps',
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Tenant-wide audit logging and administrative governance.',
    icon: 'settings',
  },
];

export const TENANT_ADMIN_NAV_DESTINATIONS: readonly NavDestination[] = [
  // 01. Overview — single child → direct navigate to /tenant-admin/dashboard
  {
    id: 'overview',
    label: 'Overview',
    icon: 'dashboard',
    segment: 'dashboard',
    subtitle: 'Tenant Operations Overview',
    description: 'Overview of tenant entities, companies, users, and platform activities.',
    categoryId: 'overview',
    sidebar: true,
    children: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        path: 'dashboard',
      },
    ],
  },

  // 02. Tenant — two children → SubNavFlyout
  {
    id: 'tenant',
    label: 'Tenant',
    flyoutTitle: 'TENANT',
    icon: 'organization',
    segment: 'tenant',
    subtitle: 'Tenant Organization & Companies',
    description: 'Manage tenant details, legal configuration, and company entities.',
    categoryId: 'tenant',
    sidebar: true,
    children: [
      {
        id: 'tenant-details',
        label: 'Tenant Profile',
        icon: 'organization',
        path: 'tenant/details',
      },
      {
        id: 'companies',
        label: 'Companies',
        icon: 'organization',
        path: 'tenant/companies',
      },
    ],
  },

  // 03. Access — two children → SubNavFlyout
  {
    id: 'access',
    label: 'Access',
    flyoutTitle: 'ACCESS',
    icon: 'employees',
    segment: 'access',
    subtitle: 'Users & Permissions',
    description: 'Tenant member directory, invitations, and role authorizations.',
    categoryId: 'access',
    sidebar: true,
    children: [
      {
        id: 'users',
        label: 'Users',
        icon: 'employees',
        path: 'access/users/members',
      },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        icon: 'settings',
        path: 'access/roles',
      },
    ],
  },

  // 04. Applications — two children → SubNavFlyout
  {
    id: 'applications',
    label: 'Applications',
    flyoutTitle: 'APPLICATIONS',
    icon: 'apps',
    segment: 'applications',
    subtitle: 'Enterprise Applications',
    description: 'Application entitlements, distribution across companies, and setup.',
    categoryId: 'applications',
    sidebar: true,
    children: [
      {
        id: 'application-access',
        label: 'Application Access',
        icon: 'apps',
        path: 'applications/access',
      },
      {
        id: 'application-setup',
        label: 'Application Setup',
        icon: 'settings',
        path: 'applications/setup',
      },
    ],
  },

  // 05. Governance — single child → direct navigate to /tenant-admin/governance/audit-logs
  {
    id: 'governance',
    label: 'Governance',
    icon: 'settings',
    segment: 'governance',
    subtitle: 'Audit & Compliance',
    description: 'Tenant-wide audit logs, security events, and compliance tracking.',
    categoryId: 'governance',
    sidebar: true,
    children: [
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: 'settings',
        path: 'governance/audit-logs',
      },
    ],
  },
];

export const tenantAdminNavigation: ApplicationNavigation = {
  categories: TENANT_ADMIN_NAV_CATEGORIES,
  destinations: TENANT_ADMIN_NAV_DESTINATIONS,
};
