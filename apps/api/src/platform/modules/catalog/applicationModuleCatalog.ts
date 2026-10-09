import type { ApplicationCode } from '../../plans/types/plan.types.js';

export interface ApplicationModuleDefinition {
  key: string;
  code?: string;
  applicationCode: ApplicationCode;
  name: string;
  description: string;
  category: string;
  availability: 'GA' | 'Beta' | 'Planned';
  isMandatory: boolean;
  dependencies: string[];
  includedInPlans: string[]; // tiers: 'starter', 'growth', 'enterprise'
  defaultLimits?: Record<string, unknown> | null;
}

export interface PlanModuleEligibility {
  moduleKey: string;
  name: string;
  description: string;
  category: string;
  applicationCode: ApplicationCode;
  availability: 'GA' | 'Beta' | 'Planned';
  isMandatory: boolean;
  isIncludedInPlan: boolean;
  defaultEnabled: boolean;
  dependencies: string[];
  requiresOverride: boolean;
  limits?: Record<string, unknown> | null;
}

export const APPLICATION_MODULE_CATALOG: readonly ApplicationModuleDefinition[] = [
  // ── HRMS Modules ────────────────────────────────────────────────────────
  {
    key: 'organization',
    applicationCode: 'hrms',
    name: 'Organization Masters',
    description: 'Departments, designations, work locations, job levels, and organizational structure.',
    category: 'Workforce Core',
    availability: 'GA',
    isMandatory: true,
    dependencies: [],
    includedInPlans: ['starter', 'growth', 'enterprise'],
    defaultLimits: { maxDepartments: 20 },
  },
  {
    key: 'employees',
    applicationCode: 'hrms',
    name: 'Employee Directory & Lifecycle',
    description: 'Employee profiles, personal details, employment actions, and personnel records.',
    category: 'Workforce Core',
    availability: 'GA',
    isMandatory: true,
    dependencies: ['organization'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
    defaultLimits: { maxRecords: 100 },
  },
  {
    key: 'settings',
    applicationCode: 'hrms',
    name: 'HR Policies & Configuration',
    description: 'Company-level HR policies, custom onboarding forms, and workflow rules.',
    category: 'Administration',
    availability: 'GA',
    isMandatory: false,
    dependencies: ['organization'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'attendance',
    applicationCode: 'hrms',
    name: 'Attendance & Shift Management',
    description: 'Daily check-in/out tracking, shift scheduling, and attendance regularizations.',
    category: 'Time & Attendance',
    availability: 'GA',
    isMandatory: false,
    dependencies: ['employees'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'leave',
    applicationCode: 'hrms',
    name: 'Leave & Absence Management',
    description: 'Leave balance calculation, leave applications, multi-tier approvals, and holiday calendars.',
    category: 'Time & Attendance',
    availability: 'GA',
    isMandatory: false,
    dependencies: ['employees'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'onboarding',
    applicationCode: 'hrms',
    name: 'Dynamic Onboarding & Preboarding',
    description: 'Pre-hire task lists, candidate verification, stage checklists, and employee conversion.',
    category: 'Talent Acquisition',
    availability: 'GA',
    isMandatory: false,
    dependencies: ['employees'],
    includedInPlans: ['growth', 'enterprise'],
  },
  {
    key: 'recruitment',
    applicationCode: 'hrms',
    name: 'Recruitment & Job Openings',
    description: 'Job requisitions, candidate pipelines, interview workflows, and candidate evaluation.',
    category: 'Talent Acquisition',
    availability: 'GA',
    isMandatory: false,
    dependencies: ['organization'],
    includedInPlans: ['growth', 'enterprise'],
  },
  {
    key: 'documents',
    applicationCode: 'hrms',
    name: 'Workforce Document Management',
    description: 'Compliance document uploads, verification workflows, and employee record attachments.',
    category: 'Workforce Core',
    availability: 'GA',
    isMandatory: false,
    dependencies: ['employees'],
    includedInPlans: ['growth', 'enterprise'],
  },
  {
    key: 'timesheets',
    applicationCode: 'hrms',
    name: 'Timesheets & Project Time Logs',
    description: 'Weekly employee timesheet submission, manager approvals, and billable project hours.',
    category: 'Time & Attendance',
    availability: 'GA',
    isMandatory: false,
    dependencies: ['employees'],
    includedInPlans: ['enterprise'],
  },
  {
    key: 'payroll',
    applicationCode: 'hrms',
    name: 'Payroll & Compensation',
    description: 'Salary structures, bank accounts, monthly payslips, and statutory deductions.',
    category: 'Finance & Compensation',
    availability: 'Beta',
    isMandatory: false,
    dependencies: ['employees', 'attendance'],
    includedInPlans: ['enterprise'],
  },
  {
    key: 'performance',
    applicationCode: 'hrms',
    name: 'Performance & Appraisals',
    description: 'Employee review cycles, OKRs, KPI evaluations, and manager feedback.',
    category: 'Talent Management',
    availability: 'Beta',
    isMandatory: false,
    dependencies: ['employees'],
    includedInPlans: ['enterprise'],
  },

  // ── CRM Modules ─────────────────────────────────────────────────────────
  {
    key: 'contacts',
    applicationCode: 'crm',
    name: 'Contacts & Directory',
    description: 'Client contacts, email interactions, communication logs, and relationship history.',
    category: 'Customer Intelligence',
    availability: 'Planned',
    isMandatory: true,
    dependencies: [],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'accounts',
    applicationCode: 'crm',
    name: 'Accounts & Client Companies',
    description: 'Customer account directory, corporate hierarchy, and account executive assignments.',
    category: 'Customer Intelligence',
    availability: 'Planned',
    isMandatory: true,
    dependencies: [],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'leads',
    applicationCode: 'crm',
    name: 'Lead Intake & Qualification',
    description: 'Lead capture forms, qualification scoring, and account conversion workflows.',
    category: 'Sales Pipeline',
    availability: 'Planned',
    isMandatory: false,
    dependencies: ['contacts'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'deals',
    applicationCode: 'crm',
    name: 'Deals & Opportunities',
    description: 'Sales deal progression, revenue estimations, win probabilities, and expected close dates.',
    category: 'Sales Pipeline',
    availability: 'Planned',
    isMandatory: false,
    dependencies: ['contacts', 'accounts'],
    includedInPlans: ['growth', 'enterprise'],
  },
  {
    key: 'pipelines',
    applicationCode: 'crm',
    name: 'Pipelines & Stage Automation',
    description: 'Customizable stage funnels, transition validation rules, and automated notifications.',
    category: 'Sales Pipeline',
    availability: 'Planned',
    isMandatory: false,
    dependencies: ['deals'],
    includedInPlans: ['growth', 'enterprise'],
  },
  {
    key: 'activities',
    applicationCode: 'crm',
    name: 'Sales Activity Tracking',
    description: 'Call logs, meeting schedules, follow-up task reminders, and outreach history.',
    category: 'Productivity',
    availability: 'Planned',
    isMandatory: false,
    dependencies: ['contacts'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },

  // ── Project Management Modules ──────────────────────────────────────────
  {
    key: 'projects',
    applicationCode: 'project_management',
    name: 'Project Workspaces & Portfolio',
    description: 'Project portfolios, initiative settings, member access, and delivery status.',
    category: 'Project Delivery',
    availability: 'Planned',
    isMandatory: true,
    dependencies: [],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'tasks',
    applicationCode: 'project_management',
    name: 'Task Management & Work Items',
    description: 'Task assignments, sub-tasks, priority tracking, checklists, and delivery deadlines.',
    category: 'Project Delivery',
    availability: 'Planned',
    isMandatory: true,
    dependencies: ['projects'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'milestones',
    applicationCode: 'project_management',
    name: 'Milestones & Release Sprints',
    description: 'Project target milestones, phase deliveries, and release burndown tracking.',
    category: 'Planning & Milestones',
    availability: 'Planned',
    isMandatory: false,
    dependencies: ['projects'],
    includedInPlans: ['starter', 'growth', 'enterprise'],
  },
  {
    key: 'boards',
    applicationCode: 'project_management',
    name: 'Kanban & Scrum Boards',
    description: 'Interactive board swimlanes, drag-and-drop status transitions, and WIP limits.',
    category: 'Agile Execution',
    availability: 'Planned',
    isMandatory: false,
    dependencies: ['tasks'],
    includedInPlans: ['growth', 'enterprise'],
  },
  {
    key: 'timesheets',
    applicationCode: 'project_management',
    name: 'Project Time Logs',
    description: 'Task-level time logging, billable hour tracking, and effort budget burn charts.',
    category: 'Resource Tracking',
    availability: 'Planned',
    isMandatory: false,
    dependencies: ['tasks'],
    includedInPlans: ['growth', 'enterprise'],
  },
];

export function getApplicationModules(appCode: ApplicationCode): ApplicationModuleDefinition[] {
  return APPLICATION_MODULE_CATALOG.filter((m) => m.applicationCode === appCode);
}

export function getModuleDefinition(
  appCode: ApplicationCode,
  moduleKey: string,
): ApplicationModuleDefinition | undefined {
  return APPLICATION_MODULE_CATALOG.find(
    (m) => m.applicationCode === appCode && m.key === moduleKey,
  );
}
