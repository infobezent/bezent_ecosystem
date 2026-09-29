import type {
  ApplicationNavigation,
  NavCategory,
  NavDestination,
} from '../../../shared/types/navigation';

export const COMPANY_ADMIN_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'company-admin',
    label: 'Company Admin',
    description: 'Company overview, operational metrics and administrative actions.',
    icon: 'dashboard',
  },
  {
    id: 'company',
    label: 'Company',
    description: 'Company profile, organizational units and corporate policies.',
    icon: 'organization',
  },
  {
    id: 'people-access',
    label: 'People & Access',
    description: 'User directory, pending invitations and role permission management.',
    icon: 'employees',
  },
  {
    id: 'applications',
    label: 'Applications',
    description: 'Application catalog, module enablement and access controls.',
    icon: 'dashboard',
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Company-scoped audit logs and administrative configuration.',
    icon: 'settings',
  },
];

export const COMPANY_ADMIN_NAV_DESTINATIONS: readonly NavDestination[] = [
  // Company Admin
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    segment: 'dashboard',
    subtitle: 'Company Operations & Metrics',
    description: 'Overview of company users, assigned roles, provisioned modules and recent activities.',
    categoryId: 'company-admin',
    sidebar: true,
  },

  // Company
  {
    id: 'profile',
    label: 'Company Profile',
    icon: 'organization',
    segment: 'profile',
    subtitle: 'Legal Entity & Details',
    description: 'View and update company metadata, business contacts, country and time zone.',
    categoryId: 'company',
    sidebar: true,
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: 'organization',
    segment: 'organization',
    subtitle: 'Structure & Departments',
    description: 'Overview and administration of departments, designations, levels and locations.',
    categoryId: 'company',
    sidebar: true,
  },
  {
    id: 'policies',
    label: 'Company Policies',
    icon: 'documents',
    segment: 'policies',
    subtitle: 'HRMS Configuration & Policies',
    description: 'Configure employment types, probation, leave, shifts and onboarding form fields.',
    categoryId: 'company',
    sidebar: true,
  },

  // People & Access
  {
    id: 'users',
    label: 'Users',
    icon: 'employees',
    segment: 'users',
    subtitle: 'Company User Directory',
    description: 'Manage company users, view statuses, assign roles and handle access memberships.',
    categoryId: 'people-access',
    sidebar: true,
  },
  {
    id: 'invitations',
    label: 'Invitations',
    icon: 'employees',
    segment: 'invitations',
    subtitle: 'Pending User Invites',
    description: 'Track outstanding invitations, resend invitation tokens and cancel expired invites.',
    categoryId: 'people-access',
    sidebar: true,
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    icon: 'settings',
    segment: 'roles',
    subtitle: 'Access Control Catalog',
    description: 'Inspect available company roles, view granular permissions and privilege boundaries.',
    categoryId: 'people-access',
    sidebar: true,
  },

  // Applications
  {
    id: 'modules',
    label: 'Module Access',
    icon: 'dashboard',
    segment: 'modules',
    subtitle: 'Provisioned Applications',
    description: 'View applications provisioned by Super Admin and configure company-level access.',
    categoryId: 'applications',
    sidebar: true,
  },

  // Governance
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: 'documents',
    segment: 'audit-logs',
    subtitle: 'Company Activity Ledger',
    description: 'Audit trail of administrative actions strictly scoped to this company.',
    categoryId: 'governance',
    sidebar: true,
  },
  {
    id: 'settings',
    label: 'Company Settings',
    icon: 'settings',
    segment: 'settings',
    subtitle: 'Administrative Settings',
    description: 'Company-specific administrative controls, security settings and operational defaults.',
    categoryId: 'governance',
    sidebar: true,
  },
];

export const companyAdminNavigation: ApplicationNavigation = {
  categories: COMPANY_ADMIN_NAV_CATEGORIES,
  destinations: COMPANY_ADMIN_NAV_DESTINATIONS,
};
