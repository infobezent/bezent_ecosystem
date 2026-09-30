import type {
  ApplicationNavigation,
  NavCategory,
  NavDestination,
} from '../../../shared/types/navigation';

export const SUPER_ADMIN_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'super-admin',
    label: 'Super Admin',
    description: 'System-wide metrics, overview and platform operations.',
    icon: 'dashboard',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Multi-tenant customer directory, company entities and provisioning.',
    icon: 'organization',
  },
  {
    id: 'access-apps',
    label: 'Access & Applications',
    description:
      'Platform user directory, company admin assignments and application access entitlements.',
    icon: 'employees',
  },
  {
    id: 'platform',
    label: 'Platform',
    description: 'Immutable administrative audit logging and platform configuration.',
    icon: 'settings',
  },
];

export const SUPER_ADMIN_NAV_DESTINATIONS: readonly NavDestination[] = [
  // Super Admin
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    segment: 'dashboard',
    subtitle: 'Platform Operations Overview',
    description: 'Executive overview of tenants, companies, users and platform activities.',
    categoryId: 'super-admin',
    sidebar: true,
  },

  // Customers
  {
    id: 'tenants',
    label: 'Tenants',
    icon: 'organization',
    segment: 'tenants',
    subtitle: 'Customer Tenants Directory',
    description: 'View, search, create and manage customer tenants across the platform.',
    categoryId: 'customers',
    sidebar: true,
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: 'organization',
    segment: 'companies',
    subtitle: 'Company Entities',
    description: 'Manage legal company records associated with customer tenants.',
    categoryId: 'customers',
    sidebar: true,
  },
  {
    id: 'provisioning',
    label: 'Customer Provisioning',
    icon: 'dashboard',
    segment: 'provisioning',
    subtitle: 'Provision New Customer',
    description:
      'Guided multi-step wizard to create tenant, company, assign admin and entitle modules.',
    categoryId: 'customers',
    sidebar: true,
  },

  // Access & Applications
  {
    id: 'users',
    label: 'Platform Users',
    icon: 'employees',
    segment: 'users',
    subtitle: 'Platform User Directory',
    description: 'View all system users, account statuses and tenant memberships.',
    categoryId: 'access-apps',
    sidebar: true,
  },
  {
    id: 'company-admins',
    label: 'Company Admins',
    icon: 'employees',
    segment: 'company-admins',
    subtitle: 'Company Administrator Assignments',
    description: 'Manage initial and designated company administrators for customer tenants.',
    categoryId: 'access-apps',
    sidebar: true,
  },
  {
    id: 'modules',
    label: 'Application Access',
    icon: 'dashboard',
    segment: 'modules',
    subtitle: 'Application Entitlements',
    description:
      'Configure and enforce application access (HRMS, CRM, Project Management) per customer.',
    categoryId: 'access-apps',
    sidebar: true,
  },

  // Platform
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: 'documents',
    segment: 'audit-logs',
    subtitle: 'Administrative Audit Trail',
    description: 'Searchable, immutable ledger of all administrative platform actions.',
    categoryId: 'platform',
    sidebar: true,
  },
  {
    id: 'settings',
    label: 'Platform Settings',
    icon: 'settings',
    segment: 'settings',
    subtitle: 'Platform System Configuration',
    description:
      'Multi-tenancy isolation policies, authentication rules and platform bootstrap status.',
    categoryId: 'platform',
    sidebar: true,
  },
];

export const superAdminNavigation: ApplicationNavigation = {
  categories: SUPER_ADMIN_NAV_CATEGORIES,
  destinations: SUPER_ADMIN_NAV_DESTINATIONS,
};
