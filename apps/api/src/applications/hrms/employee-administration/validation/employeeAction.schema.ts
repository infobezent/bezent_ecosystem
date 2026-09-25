import { ValidationError } from '../../../../app/errors/AppError.js';
import { VALID_EMPLOYMENT_TYPES } from '../../employees/validation/employee.schema.js';
import type { EmploymentStatus, EmploymentType } from '../../employees/types/employee.types.js';
import {
  EMPLOYEE_ACTION_CATEGORIES,
  EMPLOYEE_ACTION_STATUSES,
  EMPLOYEE_ACTION_TYPES,
  type ApplyEmployeeActionDto,
  type CancelEmployeeActionDto,
  type CreateEmployeeActionDto,
  type EmployeeActionCategory,
  type EmployeeActionStatus,
  type EmployeeActionType,
  type EmployeeActionValueKey,
  type EmployeeActionValues,
  type ListEmployeeActionsParams,
  type UpdateEmployeeActionDto,
} from '../types/employeeAction.types.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REASON_LENGTH = 1000;

/** Target statuses an Employment Status Change may set. Probation and separation have dedicated actions. */
export const STATUS_CHANGE_TARGETS: EmploymentStatus[] = ['active', 'suspended', 'notice'];

interface ActionValueRule {
  required: EmployeeActionValueKey[];
  optional: EmployeeActionValueKey[];
}

/**
 * Which requested values each action type accepts. Anything outside
 * `required` + `optional` is rejected, so an action can never smuggle in
 * changes to unrelated employee fields.
 */
export const ACTION_VALUE_RULES: Record<EmployeeActionType, ActionValueRule> = {
  department_change: {
    required: ['departmentId'],
    optional: ['designationId', 'reportingManagerId'],
  },
  designation_change: { required: ['designationId'], optional: [] },
  reporting_manager_change: { required: ['reportingManagerId'], optional: [] },
  employment_type_change: { required: ['employmentType'], optional: [] },
  confirm_employee: { required: [], optional: [] },
  extend_probation: { required: ['probationEndDate'], optional: [] },
  location_transfer: { required: ['locationId'], optional: [] },
  employment_status_change: { required: ['employmentStatus'], optional: [] },
  resignation: { required: ['lastWorkingDate'], optional: ['requestDate'] },
  termination: { required: ['lastWorkingDate'], optional: ['requestDate'] },
};

const ID_KEYS: EmployeeActionValueKey[] = [
  'departmentId',
  'designationId',
  'reportingManagerId',
  'locationId',
];
const DATE_KEYS: EmployeeActionValueKey[] = ['probationEndDate', 'requestDate', 'lastWorkingDate'];

const VALUE_LABELS: Record<EmployeeActionValueKey, string> = {
  departmentId: 'Department',
  designationId: 'Designation',
  reportingManagerId: 'Reporting manager',
  locationId: 'Location',
  employmentType: 'Employment type',
  employmentStatus: 'Employment status',
  probationEndDate: 'Probation end date',
  requestDate: 'Request date',
  lastWorkingDate: 'Last working date',
};

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isSeparationType(actionType: EmployeeActionType): boolean {
  return actionType === 'resignation' || actionType === 'termination';
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim());
}

function parseVersion(value: unknown, errors: Record<string, string>): number {
  const version = typeof value === 'string' ? Number(value) : value;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    errors.version = 'Version is required and must be a positive integer';
    return 0;
  }
  return version;
}

function parseReason(value: unknown, errors: Record<string, string>, required: boolean) {
  if (isBlank(value)) {
    if (required) errors.reason = 'Reason is required';
    return null;
  }
  if (typeof value !== 'string') {
    errors.reason = 'Reason must be a string';
    return null;
  }
  if (value.trim().length > MAX_REASON_LENGTH) {
    errors.reason = `Reason must not exceed ${MAX_REASON_LENGTH} characters`;
    return null;
  }
  return value.trim();
}

/**
 * Validates the requested values for an action type: required keys present,
 * no foreign keys, and each value well-formed. Throws ValidationError.
 */
export function validateActionValues(
  actionType: EmployeeActionType,
  input: unknown,
): EmployeeActionValues {
  const raw =
    input === undefined || input === null
      ? {}
      : typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : null;

  if (!raw) {
    throw new ValidationError('Validation failed for employee action', {
      values: 'Values must be an object',
    });
  }

  const rule = ACTION_VALUE_RULES[actionType];
  const allowed = new Set<string>([...rule.required, ...rule.optional]);
  const errors: Record<string, string> = {};
  const values: EmployeeActionValues = {};

  for (const [key, value] of Object.entries(raw)) {
    if (isBlank(value)) continue;
    if (!allowed.has(key)) {
      errors[`values.${key}`] = `'${key}' is not applicable to ${actionType}`;
    }
  }

  for (const key of rule.required) {
    if (isBlank(raw[key])) {
      errors[`values.${key}`] = `${VALUE_LABELS[key]} is required`;
    }
  }

  for (const key of allowed as Set<EmployeeActionValueKey>) {
    const value = raw[key];
    if (isBlank(value)) continue;
    const errorKey = `values.${key}`;

    if (typeof value !== 'string') {
      errors[errorKey] = `${VALUE_LABELS[key]} must be a string`;
      continue;
    }
    const trimmed = value.trim();

    if (ID_KEYS.includes(key)) {
      if (trimmed.length > 64) {
        errors[errorKey] = `${VALUE_LABELS[key]} must not exceed 64 characters`;
        continue;
      }
    } else if (DATE_KEYS.includes(key)) {
      if (!isValidIsoDate(trimmed)) {
        errors[errorKey] = `${VALUE_LABELS[key]} must be a valid date in YYYY-MM-DD format`;
        continue;
      }
    } else if (key === 'employmentType') {
      if (!VALID_EMPLOYMENT_TYPES.includes(trimmed as EmploymentType)) {
        errors[errorKey] = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
        continue;
      }
    } else if (key === 'employmentStatus') {
      if (!STATUS_CHANGE_TARGETS.includes(trimmed as EmploymentStatus)) {
        errors[errorKey] = `Employment status must be one of: ${STATUS_CHANGE_TARGETS.join(', ')}`;
        continue;
      }
    }

    (values as Record<string, string>)[key] = trimmed;
  }

  if (values.requestDate && values.lastWorkingDate && values.requestDate > values.lastWorkingDate) {
    errors['values.requestDate'] = 'Request date must be on or before the last working date';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee action', errors);
  }

  return values;
}

export function validateCreateEmployeeAction(input: unknown): CreateEmployeeActionDto {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.employeeId !== 'string' || !data.employeeId.trim()) {
    errors.employeeId = 'Employee is required';
  } else if (data.employeeId.trim().length > 64) {
    errors.employeeId = 'Employee ID must not exceed 64 characters';
  }

  const actionType = data.actionType as EmployeeActionType;
  const validType = EMPLOYEE_ACTION_TYPES.includes(actionType);
  if (!validType) {
    errors.actionType = `Action type must be one of: ${EMPLOYEE_ACTION_TYPES.join(', ')}`;
  }

  let effectiveDate: string | null = null;
  if (isBlank(data.effectiveDate)) {
    if (!validType || !isSeparationType(actionType)) {
      errors.effectiveDate = 'Effective date is required';
    }
  } else if (
    !isValidIsoDate(
      typeof data.effectiveDate === 'string' ? data.effectiveDate.trim() : data.effectiveDate,
    )
  ) {
    errors.effectiveDate = 'Effective date must be a valid date in YYYY-MM-DD format';
  } else {
    effectiveDate = (data.effectiveDate as string).trim();
  }

  const reason = parseReason(data.reason, errors, true);

  let values: EmployeeActionValues = {};
  if (validType) {
    try {
      values = validateActionValues(actionType, data.values);
    } catch (err) {
      if (err instanceof ValidationError && err.details) {
        Object.assign(errors, err.details);
      } else {
        throw err;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee action', errors);
  }

  return {
    employeeId: (data.employeeId as string).trim(),
    actionType,
    effectiveDate,
    reason: reason!,
    values,
  };
}

export function validateUpdateEmployeeAction(input: unknown): UpdateEmployeeActionDto {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const version = parseVersion(data.version, errors);
  const result: UpdateEmployeeActionDto = { version };

  if (data.effectiveDate !== undefined) {
    const value =
      typeof data.effectiveDate === 'string' ? data.effectiveDate.trim() : data.effectiveDate;
    if (!isValidIsoDate(value)) {
      errors.effectiveDate = 'Effective date must be a valid date in YYYY-MM-DD format';
    } else {
      result.effectiveDate = value;
    }
  }

  if (data.reason !== undefined) {
    const reason = parseReason(data.reason, errors, true);
    if (reason) result.reason = reason;
  }

  if (data.values !== undefined) {
    if (!data.values || typeof data.values !== 'object' || Array.isArray(data.values)) {
      errors.values = 'Values must be an object';
    } else {
      result.values = data.values as Record<string, unknown>;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee action update', errors);
  }

  return result;
}

export function validateCancelEmployeeAction(input: unknown): CancelEmployeeActionDto {
  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const version = parseVersion(data.version, errors);
  const reason = parseReason(data.reason, errors, false);

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee action cancellation', errors);
  }

  return { version, reason };
}

export function validateApplyEmployeeAction(input: unknown): ApplyEmployeeActionDto {
  const data = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const version = parseVersion(data.version, errors);

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee action application', errors);
  }

  return { version };
}

export function validateListEmployeeActionsQuery(
  input: Record<string, unknown>,
): ListEmployeeActionsParams {
  const pageNum = Number(input.page);
  const sizeNum = Number(input.pageSize);

  const params: ListEmployeeActionsParams = {
    page: Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1,
    pageSize: Number.isInteger(sizeNum) && sizeNum > 0 && sizeNum <= 100 ? sizeNum : 25,
  };

  if (
    typeof input.category === 'string' &&
    EMPLOYEE_ACTION_CATEGORIES.includes(input.category as EmployeeActionCategory)
  ) {
    params.category = input.category as EmployeeActionCategory;
  }

  if (
    typeof input.actionType === 'string' &&
    EMPLOYEE_ACTION_TYPES.includes(input.actionType as EmployeeActionType)
  ) {
    params.actionType = input.actionType as EmployeeActionType;
  }

  if (
    typeof input.status === 'string' &&
    EMPLOYEE_ACTION_STATUSES.includes(input.status as EmployeeActionStatus)
  ) {
    params.status = input.status as EmployeeActionStatus;
  }

  if (typeof input.employeeId === 'string' && input.employeeId.trim()) {
    params.employeeId = input.employeeId.trim();
  }

  if (typeof input.search === 'string' && input.search.trim()) {
    params.search = input.search.trim();
  }

  return params;
}
