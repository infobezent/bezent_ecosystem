import type {
  ApplicationNavigation,
  NavCategory,
  NavDestination,
} from '../../../shared/types/navigation';

/**
 * Super Admin Information Architecture
 *
 * Exactly 8 canonical top-level navigation groups:
 * 1. Overview (Dashboard)
 * 2. Tenants (All Tenants, Create Tenant, Tenant Details)
 * 3. Subscriptions (Plans, Tenant Subscriptions, Entitlements)
 * 4. Applications (Application Catalog, Module Catalog)
 * 5. Governance (Audit Logs, Platform Administrators)
 * 6. Operations (Tenant Health, Provisioning Jobs)
 * 7. Support (Support Cases, Controlled Support Access)
 * 8. Settings (Platform Configuration)
 */

export const SUPER_ADMIN_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Executive overview and platform operational health.',
    icon: 'dashboard',
  },
  {
    id: 'tenants',
    label: 'Tenants',
    description: 'Multi-tenant customer directory, provisioning, and details.',
    icon: 'organization',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    description: 'Commercial plans, tenant subscriptions, and entitlements.',
    icon: 'documents',
  },
  {
    id: 'applications',
    label: 'Applications',
    description: 'Platform application catalog and module capability registry.',
    icon: 'apps',
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Administrative audit logging and platform administrator directory.',
    icon: 'security',
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Tenant health monitoring and provisioning jobs.',
    icon: 'operations',
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Support cases and controlled time-bound customer access.',
    icon: 'support',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Global platform configuration and environment parameters.',
    icon: 'settings',
  },
];

export const SUPER_ADMIN_NAV_DESTINATIONS: readonly NavDestination[] = [
  // 01. Overview
  {
    id: 'overview',
    label: 'Overview',
    icon: 'dashboard',
    segment: 'dashboard',
    subtitle: 'Platform Operations Overview',
    description: 'Executive overview of tenants, companies, users, and platform activities.',
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

  // 02. Tenants (Direct navigation item — no flyout/sub-navigation)
  {
    id: 'tenants',
    label: 'Tenants',
    subtitle: 'Manage customer organizations and tenant access.',
    icon: 'organization',
    segment: 'tenants',
    description: 'Manage customer organizations and tenant access.',
    categoryId: 'tenants',
    sidebar: true,
  },

  // 03. Subscriptions
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    flyoutTitle: 'Subscriptions',
    subtitle: 'Plans, tenant subscriptions, and entitlements',
    icon: 'documents',
    segment: 'subscriptions',
    description: 'Commercial subscription plans, customer subscriptions, and application entitlements.',
    categoryId: 'subscriptions',
    sidebar: true,
    children: [
      {
        id: 'plans',
        label: 'Plans',
        icon: 'documents',
        path: 'subscriptions/plans',
      },
      {
        id: 'tenant-subscriptions',
        label: 'Tenant Subscriptions',
        icon: 'organization',
        path: 'subscriptions/tenants',
      },
      {
        id: 'entitlements',
        label: 'Entitlements',
        icon: 'apps',
        path: 'subscriptions/entitlements',
      },
    ],
  },

  // 04. Applications
  {
    id: 'applications',
    label: 'Applications',
    flyoutTitle: 'Applications',
    subtitle: 'Application catalog and module registry',
    icon: 'apps',
    segment: 'applications',
    description: 'Platform application catalog and business module registry.',
    categoryId: 'applications',
    sidebar: true,
    children: [
      {
        id: 'app-catalog',
        label: 'Application Catalog',
        icon: 'apps',
        path: 'applications/catalog',
      },
      {
        id: 'module-catalog',
        label: 'Module Catalog',
        icon: 'dashboard',
        path: 'applications/modules',
      },
    ],
  },

  // 05. Governance
  {
    id: 'governance',
    label: 'Governance',
    flyoutTitle: 'Governance',
    subtitle: 'Audit logs and platform administrators',
    icon: 'security',
    segment: 'governance',
    description: 'Immutable administrative audit logging and platform administrator directory.',
    categoryId: 'governance',
    sidebar: true,
    children: [
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: 'documents',
        path: 'audit-logs',
      },
      {
        id: 'platform-admins',
        label: 'Platform Administrators',
        icon: 'employees',
        path: 'platform-admins',
      },
    ],
  },

  // 06. Operations
  {
    id: 'operations',
    label: 'Operations',
    flyoutTitle: 'Operations',
    subtitle: 'Tenant health and provisioning jobs',
    icon: 'operations',
    segment: 'operations',
    description: 'Platform operational health and background provisioning execution.',
    categoryId: 'operations',
    sidebar: true,
    children: [
      {
        id: 'tenant-health',
        label: 'Tenant Health',
        icon: 'operations',
        path: 'operations/health',
      },
      {
        id: 'provisioning-jobs',
        label: 'Provisioning Jobs',
        icon: 'tasks',
        path: 'operations/jobs',
      },
    ],
  },

  // 07. Support
  {
    id: 'support',
    label: 'Support',
    flyoutTitle: 'Support',
    subtitle: 'Support cases and controlled support access',
    icon: 'support',
    segment: 'support',
    description: 'Customer support tickets and time-bound controlled support access.',
    categoryId: 'support',
    sidebar: true,
    children: [
      {
        id: 'support-cases',
        label: 'Support Cases',
        icon: 'support',
        path: 'support/cases',
      },
      {
        id: 'controlled-access',
        label: 'Controlled Support Access',
        icon: 'security',
        path: 'support/access',
      },
    ],
  },

  // 08. Settings
  {
    id: 'settings',
    label: 'Settings',
    flyoutTitle: 'Settings',
    subtitle: 'Platform Configuration',
    icon: 'settings',
    segment: 'settings',
    description: 'Platform configuration and environment settings.',
    categoryId: 'settings',
    sidebar: true,
    children: [
      {
        id: 'platform-config',
        label: 'Platform Configuration',
        icon: 'settings',
        path: 'settings',
      },
    ],
  },
];

export const superAdminNavigation: ApplicationNavigation = {
  categories: SUPER_ADMIN_NAV_CATEGORIES,
  destinations: SUPER_ADMIN_NAV_DESTINATIONS,
};
