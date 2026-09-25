import type {
  ActionValueKey,
  ChangeableEmployeeField,
  CreateEmployeeActionPayload,
  EmployeeActionCategory,
  EmployeeActionStatus,
  EmployeeActionType,
  EmployeeFieldChange,
  EmployeeRecord,
  EmploymentStatus,
} from '../api/employeeAdministrationApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  employmentTypeLabel,
  formatDate,
} from '../../employees/model/employeeModel';

// Employment vocabulary is owned by the Employees domain; re-exported for this module.
export {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE_OPTIONS,
  employmentStatusVariant,
  employmentTypeLabel,
  formatDate,
} from '../../employees/model/employeeModel';

/**
 * Employee Administration action catalog. One data-driven definition per
 * action type drives the tabs, the generic action form, client-side required
 * checks, and display labels — no per-action forms.
 */

export type ActionTabId = 'all' | EmployeeActionCategory;

export const ACTION_TABS: { id: ActionTabId; label: string }[] = [
  { id: 'all', label: 'All Actions' },
  { id: 'job_changes', label: 'Job Changes' },
  { id: 'probation', label: 'Probation & Confirmation' },
  { id: 'transfer', label: 'Transfers' },
  { id: 'employment_status', label: 'Employment Status' },
  { id: 'separation', label: 'Separation' },
];

/** How a requested value is picked in the generic form. */
export type ActionFieldKind =
  | 'department'
  | 'designation'
  | 'location'
  | 'employee'
  | 'employmentType'
  | 'employmentStatus'
  | 'date';

export interface ActionFieldDefinition {
  key: ActionValueKey;
  label: string;
  kind: ActionFieldKind;
  required: boolean;
  helperText?: string;
}

/** Read-only "current value" rows shown for context before the requested values. */
export type CurrentValueKey =
  | 'departmentName'
  | 'designationName'
  | 'locationName'
  | 'reportingManagerName'
  | 'employmentType'
  | 'employmentStatus'
  | 'joiningDate'
  | 'probationEndDate';

export interface ActionTypeDefinition {
  type: EmployeeActionType;
  label: string;
  category: EmployeeActionCategory;
  description: string;
  current: { key: CurrentValueKey; label: string }[];
  fields: ActionFieldDefinition[];
  /** Separations take their effective date from the last working date. */
  effectiveDate: 'required' | 'fromLastWorkingDate';
}

export const ACTION_TYPES: ActionTypeDefinition[] = [
  {
    type: 'department_change',
    label: 'Department Change',
    category: 'job_changes',
    description: 'Move the employee to another department.',
    current: [
      { key: 'departmentName', label: 'Current Department' },
      { key: 'designationName', label: 'Current Designation' },
      { key: 'reportingManagerName', label: 'Current Reporting Manager' },
    ],
    fields: [
      { key: 'departmentId', label: 'New Department', kind: 'department', required: true },
      { key: 'designationId', label: 'New Designation', kind: 'designation', required: false },
      { key: 'reportingManagerId', label: 'Reporting Manager', kind: 'employee', required: false },
    ],
    effectiveDate: 'required',
  },
  {
    type: 'designation_change',
    label: 'Designation Change',
    category: 'job_changes',
    description: 'Change the employee’s designation.',
    current: [{ key: 'designationName', label: 'Current Designation' }],
    fields: [
      { key: 'designationId', label: 'New Designation', kind: 'designation', required: true },
    ],
    effectiveDate: 'required',
  },
  {
    type: 'reporting_manager_change',
    label: 'Reporting Manager Change',
    category: 'job_changes',
    description: 'Assign a new reporting manager.',
    current: [{ key: 'reportingManagerName', label: 'Current Reporting Manager' }],
    fields: [
      {
        key: 'reportingManagerId',
        label: 'New Reporting Manager',
        kind: 'employee',
        required: true,
      },
    ],
    effectiveDate: 'required',
  },
  {
    type: 'employment_type_change',
    label: 'Employment Type Change',
    category: 'job_changes',
    description: 'Change the employment type, e.g. contract to full time.',
    current: [{ key: 'employmentType', label: 'Current Employment Type' }],
    fields: [
      {
        key: 'employmentType',
        label: 'New Employment Type',
        kind: 'employmentType',
        required: true,
      },
    ],
    effectiveDate: 'required',
  },
  {
    type: 'confirm_employee',
    label: 'Confirm Employee',
    category: 'probation',
    description: 'End probation and confirm the employee.',
    current: [
      { key: 'joiningDate', label: 'Joining Date' },
      { key: 'probationEndDate', label: 'Current Probation End' },
    ],
    fields: [],
    effectiveDate: 'required',
  },
  {
    type: 'extend_probation',
    label: 'Extend Probation',
    category: 'probation',
    description: 'Extend the probation period to a new end date.',
    current: [
      { key: 'joiningDate', label: 'Joining Date' },
      { key: 'probationEndDate', label: 'Current Probation End' },
    ],
    fields: [
      { key: 'probationEndDate', label: 'New Probation End Date', kind: 'date', required: true },
    ],
    effectiveDate: 'required',
  },
  {
    type: 'location_transfer',
    label: 'Location Transfer',
    category: 'transfer',
    description: 'Transfer the employee to another work location.',
    current: [{ key: 'locationName', label: 'Current Location' }],
    fields: [{ key: 'locationId', label: 'New Location', kind: 'location', required: true }],
    effectiveDate: 'required',
  },
  {
    type: 'employment_status_change',
    label: 'Employment Status Change',
    category: 'employment_status',
    description: 'Change the employment status, e.g. suspend or reinstate.',
    current: [{ key: 'employmentStatus', label: 'Current Status' }],
    fields: [
      { key: 'employmentStatus', label: 'New Status', kind: 'employmentStatus', required: true },
    ],
    effectiveDate: 'required',
  },
  {
    type: 'resignation',
    label: 'Resignation',
    category: 'separation',
    description: 'Record an employee resignation.',
    current: [
      { key: 'employmentStatus', label: 'Current Status' },
      { key: 'joiningDate', label: 'Joining Date' },
    ],
    fields: [
      { key: 'requestDate', label: 'Resignation Date', kind: 'date', required: false },
      {
        key: 'lastWorkingDate',
        label: 'Last Working Date',
        kind: 'date',
        required: true,
        helperText: 'The separation becomes effective on this date.',
      },
    ],
    effectiveDate: 'fromLastWorkingDate',
  },
  {
    type: 'termination',
    label: 'Termination',
    category: 'separation',
    description: 'Record an employee termination.',
    current: [
      { key: 'employmentStatus', label: 'Current Status' },
      { key: 'joiningDate', label: 'Joining Date' },
    ],
    fields: [
      { key: 'requestDate', label: 'Notice Date', kind: 'date', required: false },
      {
        key: 'lastWorkingDate',
        label: 'Last Working Date',
        kind: 'date',
        required: true,
        helperText: 'The separation becomes effective on this date.',
      },
    ],
    effectiveDate: 'fromLastWorkingDate',
  },
];

export const CATEGORY_LABELS: Record<EmployeeActionCategory, string> = {
  job_changes: 'Job Changes',
  probation: 'Probation',
  transfer: 'Transfer',
  employment_status: 'Employment Status',
  separation: 'Separation',
};

/** Targets an Employment Status Change may set (probation and separation have dedicated actions). */
export const STATUS_CHANGE_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'notice', label: 'Notice Period' },
];

export const ACTION_STATUS_LABELS: Record<EmployeeActionStatus, string> = {
  pending: 'Pending',
  applied: 'Applied',
  cancelled: 'Cancelled',
};

export const FIELD_LABELS: Record<ChangeableEmployeeField, string> = {
  departmentId: 'Department',
  designationId: 'Designation',
  reportingManagerId: 'Reporting Manager',
  locationId: 'Location',
  employmentType: 'Employment Type',
  employmentStatus: 'Employment Status',
  probationEndDate: 'Probation End Date',
  confirmationDate: 'Confirmation Date',
  lastWorkingDate: 'Last Working Date',
};

const SEPARATED: EmploymentStatus[] = ['resigned', 'terminated'];

export function isSeparatedEmployee(employee: Pick<EmployeeRecord, 'employmentStatus'>): boolean {
  return SEPARATED.includes(employee.employmentStatus);
}

export function getActionDefinition(
  type: EmployeeActionType | '',
): ActionTypeDefinition | undefined {
  return ACTION_TYPES.find((definition) => definition.type === type);
}

export function actionTypeLabel(type: EmployeeActionType): string {
  return getActionDefinition(type)?.label ?? type;
}

// ============================================================================
// Form model
// ============================================================================

export interface ActionFormState {
  employeeId: string;
  actionType: EmployeeActionType | '';
  effectiveDate: string;
  reason: string;
  values: Partial<Record<ActionValueKey, string>>;
}

export const EMPTY_ACTION_FORM: ActionFormState = {
  employeeId: '',
  actionType: '',
  effectiveDate: '',
  reason: '',
  values: {},
};

export type ActionFormErrors = Partial<Record<string, string>>;

/** Client-side required checks. The server remains the authority on business rules. */
export function validateActionForm(form: ActionFormState): ActionFormErrors {
  const errors: ActionFormErrors = {};
  const definition = getActionDefinition(form.actionType);

  if (!form.employeeId) errors.employeeId = 'Select an employee';
  if (!definition) {
    errors.actionType = 'Select an action type';
    return errors;
  }

  for (const field of definition.fields) {
    if (field.required && !form.values[field.key]?.trim()) {
      errors[`values.${field.key}`] = `${field.label} is required`;
    }
  }

  if (definition.effectiveDate === 'required' && !form.effectiveDate) {
    errors.effectiveDate = 'Effective date is required';
  }

  if (!form.reason.trim()) errors.reason = 'Reason is required';

  return errors;
}

/** Builds the create payload, sending only values that belong to the selected action type. */
export function buildCreatePayload(form: ActionFormState): CreateEmployeeActionPayload {
  const definition = getActionDefinition(form.actionType);
  if (!definition) {
    throw new Error('Action type is required');
  }

  const values: CreateEmployeeActionPayload['values'] = {};
  for (const field of definition.fields) {
    const value = form.values[field.key]?.trim();
    if (value) values[field.key] = value;
  }

  return {
    employeeId: form.employeeId,
    actionType: definition.type,
    ...(definition.effectiveDate === 'required' ? { effectiveDate: form.effectiveDate } : {}),
    reason: form.reason.trim(),
    values,
  };
}

// ============================================================================
// Display helpers
// ============================================================================

const DATE_FIELDS: ChangeableEmployeeField[] = [
  'probationEndDate',
  'confirmationDate',
  'lastWorkingDate',
];

export function changeValueLabel(change: EmployeeFieldChange, side: 'from' | 'to'): string {
  const value = side === 'from' ? change.from : change.to;
  const label = side === 'from' ? change.fromLabel : change.toLabel;
  if (value === null) return 'Not set';
  if (DATE_FIELDS.includes(change.field)) return formatDate(value);
  return label ?? value;
}

/** One-line "Current → New" summary of the primary change, for the queue. */
export function summarizeChange(changes: EmployeeFieldChange[]): string {
  const primary = changes[0];
  if (!primary) return '—';
  const summary = `${changeValueLabel(primary, 'from')} → ${changeValueLabel(primary, 'to')}`;
  return changes.length > 1 ? `${summary} (+${changes.length - 1} more)` : summary;
}

export function currentValueLabel(employee: EmployeeRecord, key: CurrentValueKey): string {
  switch (key) {
    case 'employmentType':
      return employmentTypeLabel(employee.employmentType);
    case 'employmentStatus':
      return EMPLOYMENT_STATUS_LABELS[employee.employmentStatus];
    case 'joiningDate':
    case 'probationEndDate':
      return formatDate(employee[key]);
    default:
      return employee[key] ?? 'Not set';
  }
}

export function actionStatusVariant(
  status: EmployeeActionStatus,
): 'warning' | 'success' | 'neutral' {
  if (status === 'pending') return 'warning';
  if (status === 'applied') return 'success';
  return 'neutral';
}
