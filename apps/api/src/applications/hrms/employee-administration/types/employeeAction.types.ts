import type {
  EmployeeDetails,
  EmploymentStatus,
  EmploymentType,
  PaginationMetadata,
} from '../../employees/types/employee.types.js';

/**
 * Employee Administration — employment actions performed on existing employees.
 * Employees own the canonical record; an action is a persistent, auditable
 * request to change it, applied transactionally by the service.
 */
export const EMPLOYEE_ACTION_TYPES = [
  'department_change',
  'designation_change',
  'reporting_manager_change',
  'employment_type_change',
  'confirm_employee',
  'extend_probation',
  'location_transfer',
  'employment_status_change',
  'resignation',
  'termination',
] as const;

export type EmployeeActionType = (typeof EMPLOYEE_ACTION_TYPES)[number];

export const EMPLOYEE_ACTION_STATUSES = ['pending', 'applied', 'cancelled'] as const;
export type EmployeeActionStatus = (typeof EMPLOYEE_ACTION_STATUSES)[number];

export const EMPLOYEE_ACTION_CATEGORIES = [
  'job_changes',
  'probation',
  'transfer',
  'employment_status',
  'separation',
] as const;
export type EmployeeActionCategory = (typeof EMPLOYEE_ACTION_CATEGORIES)[number];

export const ACTION_TYPE_CATEGORY: Record<EmployeeActionType, EmployeeActionCategory> = {
  department_change: 'job_changes',
  designation_change: 'job_changes',
  reporting_manager_change: 'job_changes',
  employment_type_change: 'job_changes',
  confirm_employee: 'probation',
  extend_probation: 'probation',
  location_transfer: 'transfer',
  employment_status_change: 'employment_status',
  resignation: 'separation',
  termination: 'separation',
};

export function actionTypesForCategory(category: EmployeeActionCategory): EmployeeActionType[] {
  return EMPLOYEE_ACTION_TYPES.filter((type) => ACTION_TYPE_CATEGORY[type] === category);
}

/** Canonical employee fields an action may change. */
export type ChangeableEmployeeField =
  | 'departmentId'
  | 'designationId'
  | 'reportingManagerId'
  | 'locationId'
  | 'employmentType'
  | 'employmentStatus'
  | 'probationEndDate'
  | 'confirmationDate'
  | 'lastWorkingDate';

/** Old → new value for one canonical field, with display labels captured at request time. */
export interface EmployeeFieldChange {
  field: ChangeableEmployeeField;
  from: string | null;
  to: string | null;
  fromLabel: string | null;
  toLabel: string | null;
}

/** Typed shape of `employee_actions.change_data`. */
export interface EmployeeActionChangeSet {
  changes: EmployeeFieldChange[];
  /** Separation only: resignation/notice date. Informational, not an employee field. */
  requestDate?: string | null;
}

/** Action-specific requested values. Which keys apply depends on the action type. */
export interface EmployeeActionValues {
  departmentId?: string;
  designationId?: string;
  reportingManagerId?: string;
  locationId?: string;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  probationEndDate?: string;
  requestDate?: string;
  lastWorkingDate?: string;
}

export type EmployeeActionValueKey = keyof EmployeeActionValues;

export interface CreateEmployeeActionDto {
  employeeId: string;
  actionType: EmployeeActionType;
  /** Required except for separations, where it defaults to the last working date. */
  effectiveDate: string | null;
  reason: string;
  values: EmployeeActionValues;
}

export interface UpdateEmployeeActionDto {
  version: number;
  effectiveDate?: string;
  reason?: string;
  /** Replaces the requested values; validated against the action's type. */
  values?: Record<string, unknown>;
}

export interface CancelEmployeeActionDto {
  version: number;
  reason: string | null;
}

export interface ApplyEmployeeActionDto {
  version: number;
}

export interface ListEmployeeActionsParams {
  page: number;
  pageSize: number;
  category?: EmployeeActionCategory;
  actionType?: EmployeeActionType;
  status?: EmployeeActionStatus;
  employeeId?: string;
  search?: string;
}

export interface EmployeeActionListItem {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  actionType: EmployeeActionType;
  category: EmployeeActionCategory;
  status: EmployeeActionStatus;
  effectiveDate: string;
  reason: string;
  changes: EmployeeFieldChange[];
  requestDate: string | null;
  requestedBy: string | null;
  cancellationReason: string | null;
  appliedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeActionHistoryEvent = 'created' | 'updated' | 'applied' | 'cancelled';

export interface EmployeeActionHistoryItem {
  id: string;
  event: EmployeeActionHistoryEvent;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  actor: string | null;
  createdAt: Date;
}

export interface EmployeeActionDetail extends EmployeeActionListItem {
  employee: EmployeeDetails;
  history: EmployeeActionHistoryItem[];
}

export type ActionCategoryCounts = Record<'all' | EmployeeActionCategory, number>;

export interface PaginatedEmployeeActionsResult {
  items: EmployeeActionListItem[];
  pagination: PaginationMetadata;
  counts: ActionCategoryCounts;
}
