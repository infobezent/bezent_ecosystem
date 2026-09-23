export type SettingsModuleId =
  | 'overview'
  | 'dashboard'
  | 'onboarding'
  | 'leave'
  | 'attendance'
  | 'timesheets'
  | 'performance'
  | 'employees'
  | 'hr-settings';

export interface SettingsModuleCard {
  id: SettingsModuleId;
  name: string;
  description: string;
  icon: string;
}

export const SETTINGS_MODULE_CARDS: SettingsModuleCard[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Configure dashboard content, widgets, layout, and visibility settings.',
    icon: 'dashboard',
  },
  {
    id: 'onboarding',
    name: 'Administration',
    description: 'Customize employee registration sections, fields, options, and requirements.',
    icon: 'onboarding',
  },
  {
    id: 'leave',
    name: 'Leave',
    description: 'Configure leave types, policies, balances, and options.',
    icon: 'leave',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Configure attendance rules, statuses, and settings.',
    icon: 'attendance',
  },
  {
    id: 'timesheets',
    name: 'Timesheets',
    description: 'Configure timesheet fields, rules, and options.',
    icon: 'timeTracker',
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Configure performance fields, rating options, review cycles, and goals.',
    icon: 'performance',
  },
  {
    id: 'employees',
    name: 'Employees',
    description: 'Configure employee information, custom fields, designations, and options.',
    icon: 'employees',
  },
  {
    id: 'hr-settings',
    name: 'HR Settings',
    description: 'Manage employee change requests and published company policies.',
    icon: 'hrSettings',
  },
];

// --- Onboarding Customization Types ---
export interface OnboardingSectionConfig {
  id: string;
  title: string;
  hidden: boolean;
  isCustom: boolean;
}

export interface OnboardingCardConfig {
  id: string;
  sectionId: string;
  title: string;
  isCustom?: boolean;
  order?: number;
}

export interface OnboardingFieldConfig {
  id: string;
  sectionId: string;
  cardId: string;
  label: string;
  fieldType: 'text' | 'select' | 'date' | 'number' | 'file';
  required: boolean;
  readOnly: boolean;
  defaultValue?: string;
  options?: string[];
  isSystem?: boolean;
  isCustom?: boolean;
  order?: number;
}

// --- Leave Settings Types ---
export interface LeaveTypeConfig {
  id: string;
  name: string;
  isPaid: boolean;
  annualBalance: number;
  eligibility: string;
  halfDayAllowed: boolean;
  docRequired: boolean;
  approvalFlow: string;
}

// --- Attendance Settings Types ---
export interface AttendanceTypeConfig {
  id: string;
  name: string;
  checkInRequired: boolean;
  lateGraceMins: number;
  earlyCheckoutAllowed: boolean;
  workingHours: string;
  status: 'Active' | 'Inactive';
}

// --- Timesheet Settings Types ---
export interface TimesheetRuleConfig {
  id: string;
  categoryName: string;
  requiredFields: string[];
  entryType: 'Daily Log' | 'Weekly Grid' | 'Timer';
  approvalRequired: boolean;
}

// --- Performance Settings Types ---
export interface PerformanceRatingConfig {
  id: string;
  scaleType: '5-Point Rating' | '360 Competency' | 'Pass/Fail';
  cycles: string[];
  goalCategories: string[];
}

// --- Employee Settings Types ---
export interface EmployeeCategoryConfig {
  id: string;
  name: string;
  employmentType: string;
  gradeLevel: string;
  departments: string[];
}

// --- HR Settings Types ---
export interface EmployeeChangeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  fieldLabel: string;
  oldValue: string;
  requestedValue: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
}

export interface CompanyPolicy {
  id: string;
  title: string;
  category: string;
  effectiveDate: string;
  status: 'Published' | 'Draft' | 'Archived';
  documentName?: string;
}
