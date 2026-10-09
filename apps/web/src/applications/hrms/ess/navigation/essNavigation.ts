import type {
  ApplicationNavigation,
  NavCategory,
  NavDestination,
} from '../../../../shared/types/navigation';

export const ESS_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'my-workspace',
    label: 'My Workspace',
    description: 'Personal dashboard and employee profile.',
    icon: 'dashboard',
  },
  {
    id: 'time-attendance',
    label: 'Time & Attendance',
    description: 'Track attendance, manage leave and log timesheets.',
    icon: 'attendance',
  },
  {
    id: 'my-services',
    label: 'My Services',
    description: 'Documents, personal requests and payslips.',
    icon: 'documents',
  },
  {
    id: 'productivity',
    label: 'Productivity',
    description: 'Assigned tasks and personal notifications.',
    icon: 'tasks',
  },
];

export const ESS_NAV_DESTINATIONS: readonly NavDestination[] = [
  // My Workspace
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    segment: 'dashboard',
    subtitle: 'My Personal Overview',
    description:
      "Punch in/out, today's attendance, leave balances, notifications and pending tasks.",
    categoryId: 'my-workspace',
    sidebar: true,
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: 'employees',
    segment: 'profile',
    subtitle: 'Personal & Employment Details',
    description:
      'View and update personal information, emergency contacts, bank account and skills.',
    categoryId: 'my-workspace',
    sidebar: true,
  },

  // Time & Attendance
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'attendance',
    segment: 'attendance',
    subtitle: 'Daily Attendance Log',
    description:
      "View today's punch status, attendance history and submit regularization requests.",
    categoryId: 'time-attendance',
    sidebar: true,
  },
  {
    id: 'leave',
    label: 'Leave',
    icon: 'leave',
    segment: 'leave',
    subtitle: 'Leave Balances & Requests',
    description:
      'Apply for leave, view remaining balance, manage requests and view holiday calendar.',
    categoryId: 'time-attendance',
    sidebar: true,
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    icon: 'timesheets',
    segment: 'timesheets',
    subtitle: 'Work Hours Log',
    description:
      'Log daily work hours against projects, review submitted timesheets and submit drafts.',
    categoryId: 'time-attendance',
    sidebar: true,
  },

  // My Services
  {
    id: 'documents',
    label: 'Documents',
    icon: 'documents',
    segment: 'documents',
    subtitle: 'Personal Document Vault',
    description:
      'Upload and track personal identity, address proof, education and employment documents.',
    categoryId: 'my-services',
    sidebar: true,
  },
  {
    id: 'requests',
    label: 'Requests',
    icon: 'requests',
    segment: 'requests',
    subtitle: 'Service Request Ledger',
    description:
      'Track all personal HR requests including profile changes and general service requests.',
    categoryId: 'my-services',
    sidebar: true,
  },
  {
    id: 'payslips',
    label: 'Payslips',
    icon: 'payroll',
    segment: 'payslips',
    subtitle: 'Salary Statements',
    description: 'Download monthly payslips and salary statements when payroll is configured.',
    categoryId: 'my-services',
    sidebar: true,
  },

  // Productivity
  {
    id: 'tasks',
    label: 'My Tasks',
    icon: 'tasks',
    segment: 'tasks',
    subtitle: 'Assigned Action Items',
    description:
      'View tasks assigned to you, update statuses from pending to in progress to completed.',
    categoryId: 'productivity',
    sidebar: true,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    segment: 'notifications',
    subtitle: 'Personal Alerts',
    description:
      'Stay up to date with attendance confirmations, leave updates and HR announcements.',
    categoryId: 'productivity',
    sidebar: true,
  },
];

export const essNavigation: ApplicationNavigation = {
  categories: ESS_NAV_CATEGORIES,
  destinations: ESS_NAV_DESTINATIONS,
};
