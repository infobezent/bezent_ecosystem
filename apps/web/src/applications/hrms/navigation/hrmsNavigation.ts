import type {
  ApplicationNavigation,
  NavCategory,
  NavChild,
  NavDestination,
} from '../../../shared/types/navigation';

/**
 * THE canonical HRMS navigation catalog — the only place HRMS destinations
 * are defined. The sidebar, the More launcher, sub-navigation, routes and
 * search context are all derived from it; no other file may keep its own
 * list. See docs/architecture/HRMS-NAVIGATION.md.
 *
 * Provenance (approved old UI): primary rail = `FIXED_PRIMARY_ITEMS` + the
 * dynamic slot's default (Employees); launcher categories/tools = the final
 * `MORE_CATEGORIES` / `BEZENT_TOOL_REGISTRY` in `MoreLauncher.tsx`;
 * sub-navigation = `MODULE_SUBNAV_MAP`, reduced to concepts that belong to
 * the destination. Deliberate consolidation vs the old prototypes:
 *  - Time Tracker merged into Timesheets (same domain, overlapping sub-nav).
 *  - Job Openings / Candidates / Interviews / Offers are Recruitment
 *    sub-navigation, Goals & OKRs and Appraisals are Performance
 *    sub-navigation — not top-level destinations.
 *  - Workforce Hub and Operations existed only in a dead prototype catalog
 *    and are not carried over; Reports is added (planned HRMS domain).
 *  - Timesheets is the ONE canonical concept (the planned HRMS domain list has
 *    no Time Tracker); "time tracker" survives only as a launcher search
 *    keyword, never as a destination.
 *  - Dashboard is the landing destination with Overview as a child; there is
 *    no separate "Home" (the old primary rail's first item was Dashboard).
 * Full origin classification: docs/architecture/HRMS-NAVIGATION.md.
 * Global utilities (Tasks, Approvals, Calendar, Notes, Notifications) are
 * NOT HRMS destinations.
 */

const view = (id: string) => `hrms.${id}.view`;

const child = (id: string, label: string, icon: NavChild['icon']): NavChild => ({
  id,
  label,
  icon,
});

export const HRMS_NAV_CATEGORIES: readonly NavCategory[] = [
  {
    id: 'people',
    label: 'People',
    description: 'Manage your workforce from hiring to employee records.',
    icon: 'employees',
  },
  {
    id: 'work-time',
    label: 'Work & Time',
    description: 'Manage attendance, leave, schedules and working time.',
    icon: 'timeTracker',
  },
  {
    id: 'growth',
    label: 'Growth',
    description: 'Support employee performance, learning and career development.',
    icon: 'performance',
  },
  {
    id: 'pay-benefits',
    label: 'Pay & Benefits',
    description: 'Manage employee pay, compensation and benefits.',
    icon: 'payroll',
  },
  {
    id: 'workplace',
    label: 'Workplace',
    description: 'Access employee documents, assets and workplace services.',
    icon: 'documents',
  },
  {
    id: 'hr-operations',
    label: 'HR Operations',
    description: 'Configure HR processes, policies and operational standards.',
    icon: 'hrSettings',
  },
];

export const HRMS_NAV_DESTINATIONS: readonly NavDestination[] = [
  // ── Primary sidebar (old fixed rail + dynamic-slot default) ──────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    segment: 'dashboard',
    subtitle: 'Overview & Insights',
    sidebar: true,
    permissionKey: view('dashboard'),
    children: [
      child('overview', 'Overview', 'dashboard'),
      child('analytics', 'Analytics', 'reports'),
      child('activity', 'Activity', 'clock'),
    ],
  },
  {
    id: 'onboarding',
    label: 'Administration',
    icon: 'onboarding',
    segment: 'onboarding',
    subtitle: 'Administration',
    description: 'Welcome new hires and track their administration tasks',
    keywords: ['joiner', 'new hire', 'checklist'],
    categoryId: 'people',
    sidebar: true,
    permissionKey: view('onboarding'),
    children: [
      child('new-hires', 'New Hires', 'employees'),
      child('checklists', 'Task Checklists', 'tasks'),
      child('documents', 'Document Collection', 'documents'),
      child('workflow-settings', 'Workflow Settings', 'hrSettings'),
    ],
  },
  {
    id: 'leave',
    label: 'Leave',
    icon: 'leave',
    segment: 'leave',
    subtitle: 'Leave Management',
    description: 'Manage time-off requests, balances, and holidays',
    keywords: ['time off', 'holiday', 'vacation'],
    categoryId: 'work-time',
    sidebar: true,
    quickAccess: true,
    permissionKey: view('leave'),
    children: [
      child('summary', 'Leave Summary', 'leave'),
      child('apply', 'Apply Leave', 'plusSign'),
      child('approvals', 'Leave Approvals', 'approvals'),
      child('holidays', 'Holiday Calendar', 'calendar'),
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'attendance',
    segment: 'attendance',
    subtitle: 'Attendance Management',
    description: 'Track employee attendance and regularization',
    keywords: ['check in', 'late', 'regularization'],
    categoryId: 'work-time',
    sidebar: true,
    quickAccess: true,
    permissionKey: view('attendance'),
    children: [
      child('daily-log', 'Daily Log', 'clock'),
      child('monthly-summary', 'Monthly Summary', 'calendar'),
      child('regularization', 'Regularization', 'requests'),
      child('policies', 'Policies', 'sop'),
    ],
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    // The old primary rail used the clock glyph for this slot.
    icon: 'timeTracker',
    segment: 'timesheets',
    subtitle: 'Time & Work Tracking',
    description: 'Live timer, weekly time cards and project hours',
    keywords: ['time tracker', 'timer', 'hours', 'time card'],
    categoryId: 'work-time',
    sidebar: true,
    permissionKey: view('timesheets'),
    children: [
      child('time-log', 'Timer & Log', 'clock'),
      child('weekly', 'Weekly Timesheets', 'timesheets'),
      child('project-hours', 'Project Hours', 'reports'),
      child('approvals', 'Approvals', 'approvals'),
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: 'performance',
    segment: 'performance',
    subtitle: 'Performance Management',
    description: 'Appraisals, reviews, and 360 feedback cycles',
    keywords: ['appraisal', 'review', 'goals', 'okr'],
    categoryId: 'growth',
    sidebar: true,
    permissionKey: view('performance'),
    children: [
      child('goals', 'Goals & OKRs', 'goals'),
      child('appraisals', 'Appraisals', 'reviews'),
      child('feedback', '360 Feedback', 'employees'),
    ],
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: 'employees',
    segment: 'employees',
    subtitle: 'Employee Management',
    description: 'Manage employee profiles, roles, and employment records',
    keywords: ['staff', 'directory', 'people', 'headcount'],
    categoryId: 'people',
    sidebar: true,
    quickAccess: true,
    permissionKey: view('employees'),
  },

  // ── More launcher only ────────────────────────────────────────────────
  {
    id: 'organization',
    label: 'Organization',
    icon: 'organization',
    segment: 'organization',
    description: 'Company structure, departments, and reporting hierarchy',
    keywords: ['departments', 'hierarchy', 'teams', 'structure'],
    categoryId: 'people',
    permissionKey: view('organization'),
    children: [
      child('departments', 'Departments', 'employees'),
      child('org-chart', 'Org Chart', 'organization'),
    ],
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    icon: 'recruitment',
    segment: 'recruitment',
    description: 'Manage hiring workflows and candidate pipelines',
    keywords: ['hire', 'talent', 'jobs', 'applicants', 'openings'],
    categoryId: 'people',
    permissionKey: view('recruitment'),
    children: [
      child('job-openings', 'Job Openings', 'jobOpenings'),
      child('candidates', 'Candidates', 'candidates'),
      child('interviews', 'Interviews', 'interviews'),
      child('offers', 'Offers', 'offers'),
    ],
  },
  {
    id: 'shifts',
    label: 'Shifts',
    icon: 'shifts',
    segment: 'shifts',
    description: 'Schedule work shifts, rotations, and rosters',
    keywords: ['roster', 'rotation', 'schedule'],
    categoryId: 'work-time',
    permissionKey: view('shifts'),
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: 'learning',
    segment: 'learning',
    description: 'Courses, training programs, and skill development',
    keywords: ['training', 'courses', 'skills'],
    categoryId: 'growth',
    permissionKey: view('learning'),
  },
  {
    id: 'career',
    label: 'Career Paths',
    icon: 'career',
    segment: 'career',
    description: 'Career progression, competencies, and promotion tracks',
    keywords: ['promotion', 'competency'],
    categoryId: 'growth',
    permissionKey: view('career'),
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: 'payroll',
    segment: 'payroll',
    description: 'Manage payroll processing and employee pay',
    keywords: ['salary', 'payslip', 'pay run'],
    categoryId: 'pay-benefits',
    quickAccess: true,
    permissionKey: view('payroll'),
  },
  {
    id: 'compensation',
    label: 'Compensation',
    icon: 'compensation',
    segment: 'compensation',
    description: 'Salary structures, bonuses, and compensation bands',
    keywords: ['bonus', 'bands', 'salary structure'],
    categoryId: 'pay-benefits',
    permissionKey: view('compensation'),
  },
  {
    id: 'benefits',
    label: 'Benefits',
    icon: 'benefits',
    segment: 'benefits',
    description: 'Health insurance, employee perks, and allowances',
    keywords: ['insurance', 'perks', 'allowance'],
    categoryId: 'pay-benefits',
    permissionKey: view('benefits'),
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: 'documents',
    segment: 'documents',
    description: 'Store and manage HR documents, letters, and policies',
    keywords: ['letters', 'policies', 'files'],
    categoryId: 'workplace',
    permissionKey: view('documents'),
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'assets',
    segment: 'assets',
    description: 'Track company equipment, laptops, and hardware licenses',
    keywords: ['equipment', 'laptop', 'hardware'],
    categoryId: 'workplace',
    permissionKey: view('assets'),
  },
  {
    id: 'requests',
    label: 'Employee Requests',
    icon: 'requests',
    segment: 'requests',
    description: 'Helpdesk, letter requests, and workplace services',
    keywords: ['helpdesk', 'service desk', 'letters'],
    categoryId: 'workplace',
    permissionKey: view('requests'),
  },
  {
    id: 'sop',
    label: 'Standard Operations',
    icon: 'sop',
    segment: 'sop',
    description: 'Standard operating procedures, policies, and operational workflows',
    keywords: ['procedures', 'policies', 'sop'],
    categoryId: 'hr-operations',
    permissionKey: view('sop'),
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'reports',
    segment: 'reports',
    description: 'HR reports and analytics across every module',
    keywords: ['analytics', 'insights', 'export'],
    categoryId: 'hr-operations',
    permissionKey: view('reports'),
  },
  {
    id: 'settings',
    label: 'HR Settings',
    icon: 'hrSettings',
    segment: 'settings',
    description: 'Configure HR processes, policies, and operational standards',
    keywords: ['configuration', 'preferences'],
    categoryId: 'hr-operations',
    permissionKey: view('settings'),
  },
];

export const hrmsNavigation: ApplicationNavigation = {
  categories: HRMS_NAV_CATEGORIES,
  destinations: HRMS_NAV_DESTINATIONS,
};
