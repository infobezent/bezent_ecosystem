import type {
  ApplicationNavigation,
  NavCategory,
  NavDestination,
} from '../../../shared/types/navigation';

/**
 * Super Admin Information Architecture
 *
 * Exactly 4 canonical top-level navigation groups:
 * 1. Overview (Dashboard)
 * 2. Customers (Tenants, Companies, Customer Provisioning)
 * 3. Access (Platform Users, Company Admins, Application Access) — Flyout Title: "Access & Applications"
 * 4. Governance (Audit Logs, Platform Settings)
 */

export const SUPER_ADMIN_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Executive overview and platform operational health.',
    icon: 'dashboard',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Multi-tenant customer directory, company entities, and provisioning.',
    icon: 'organization',
  },
  {
    id: 'access',
    label: 'Access & Applications',
    description: 'Platform user directory, company admin assignments, and application entitlements.',
    icon: 'employees',
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Immutable administrative audit logging and platform configuration.',
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

  // 02. Customers
  {
    id: 'customers',
    label: 'Customers',
    icon: 'organization',
    segment: 'tenants',
    subtitle: 'Customers',
    description: 'Multi-tenant customer directory, company entities, and provisioning.',
    categoryId: 'customers',
    sidebar: true,
    children: [
      {
        id: 'tenants',
        label: 'Tenants',
        icon: 'organization',
        path: 'tenants',
      },
      {
        id: 'companies',
        label: 'Companies',
        icon: 'organization',
        path: 'companies',
      },
      {
        id: 'provisioning',
        label: 'Customer Provisioning',
        icon: 'dashboard',
        path: 'provisioning',
      },
    ],
  },

  // 03. Access & Applications
  {
    id: 'access',
    label: 'Access',
    flyoutTitle: 'Access & Applications',
    icon: 'employees',
    segment: 'users',
    subtitle: 'Access & Applications',
    description: 'Platform user directory, company admin assignments, and application entitlements.',
    categoryId: 'access',
    sidebar: true,
    children: [
      {
        id: 'users',
        label: 'Platform Users',
        icon: 'employees',
        path: 'users',
      },
      {
        id: 'company-admins',
        label: 'Company Admins',
        icon: 'employees',
        path: 'company-admins',
      },
      {
        id: 'modules',
        label: 'Application Access',
        icon: 'dashboard',
        path: 'modules',
      },
    ],
  },

  // 04. Governance
  {
    id: 'governance',
    label: 'Governance',
    icon: 'settings',
    segment: 'audit-logs',
    subtitle: 'Governance',
    description: 'Immutable administrative audit logging and platform configuration.',
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
        id: 'settings',
        label: 'Platform Settings',
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
