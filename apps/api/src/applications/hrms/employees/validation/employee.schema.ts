import { ValidationError } from '../../../../app/errors/AppError.js';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListEmployeesParams,
  EmploymentType,
  EmploymentStatus,
  SourceOfHire,
} from '../types/employee.types.js';

export const VALID_SOURCES_OF_HIRE: SourceOfHire[] = [
  'direct_applicant',
  'referral',
  'agency',
  'campus',
  'linkedin',
  'other',
];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const VALID_EMPLOYMENT_TYPES: EmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'intern',
];
export const VALID_EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  'active',
  'probation',
  'notice',
  'terminated',
  'suspended',
  'resigned',
];

/** Optional nullable ID reference (e.g. reporting manager). Returns an error message or null. */
function checkOptionalId(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > 64) {
    return `${label} must be a string of at most 64 characters`;
  }
  return null;
}

/** Optional nullable YYYY-MM-DD date. Returns an error message or null. */
function checkOptionalDate(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE_REGEX.test(value.trim())) {
    return `${label} must be in YYYY-MM-DD format`;
  }
  return null;
}

function normalizeOptional(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function validateCreateEmployee(input: unknown): CreateEmployeeDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Employee Number
  if (
    !data.employeeNumber ||
    typeof data.employeeNumber !== 'string' ||
    !data.employeeNumber.trim()
  ) {
    errors.employeeNumber = 'Employee number is required';
  } else if (data.employeeNumber.trim().length > 50) {
    errors.employeeNumber = 'Employee number must not exceed 50 characters';
  }

  // First Name
  if (!data.firstName || typeof data.firstName !== 'string' || !data.firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.trim().length > 100) {
    errors.firstName = 'First name must not exceed 100 characters';
  }

  // Last Name
  if (data.lastName !== undefined && data.lastName !== null && data.lastName !== '') {
    if (typeof data.lastName !== 'string') {
      errors.lastName = 'Last name must be a string';
    } else if (data.lastName.trim().length > 100) {
      errors.lastName = 'Last name must not exceed 100 characters';
    }
  }

  // Email
  if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Invalid email format';
  } else if (data.email.trim().length > 255) {
    errors.email = 'Email must not exceed 255 characters';
  }

  // Phone
  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.phone = 'Phone must be a string';
    } else if (data.phone.trim().length > 50) {
      errors.phone = 'Phone must not exceed 50 characters';
    }
  }

  // Joining Date
  if (!data.joiningDate || typeof data.joiningDate !== 'string' || !data.joiningDate.trim()) {
    errors.joiningDate = 'Joining date is required';
  } else if (!DATE_REGEX.test(data.joiningDate.trim())) {
    errors.joiningDate = 'Joining date must be in YYYY-MM-DD format';
  }

  // Confirmed Joining Date
  if (
    data.confirmedJoiningDate !== undefined &&
    data.confirmedJoiningDate !== null &&
    data.confirmedJoiningDate !== ''
  ) {
    if (typeof data.confirmedJoiningDate !== 'string') {
      errors.confirmedJoiningDate = 'Confirmed joining date must be a string';
    } else if (!DATE_REGEX.test(data.confirmedJoiningDate.trim())) {
      errors.confirmedJoiningDate = 'Confirmed joining date must be in YYYY-MM-DD format';
    }
  }

  // Department ID
  if (data.departmentId !== undefined && data.departmentId !== null && data.departmentId !== '') {
    if (typeof data.departmentId !== 'string') {
      errors.departmentId = 'Department ID must be a string';
    } else if (data.departmentId.trim().length > 64) {
      errors.departmentId = 'Department ID must not exceed 64 characters';
    }
  }

  // Designation ID
  if (
    data.designationId !== undefined &&
    data.designationId !== null &&
    data.designationId !== ''
  ) {
    if (typeof data.designationId !== 'string') {
      errors.designationId = 'Designation ID must be a string';
    } else if (data.designationId.trim().length > 64) {
      errors.designationId = 'Designation ID must not exceed 64 characters';
    }
  }

  // Location ID
  if (data.locationId !== undefined && data.locationId !== null && data.locationId !== '') {
    if (typeof data.locationId !== 'string') {
      errors.locationId = 'Location ID must be a string';
    } else if (data.locationId.trim().length > 64) {
      errors.locationId = 'Location ID must not exceed 64 characters';
    }
  }

  // Employment Type
  if (
    data.employmentType !== undefined &&
    data.employmentType !== null &&
    data.employmentType !== ''
  ) {
    if (!VALID_EMPLOYMENT_TYPES.includes(data.employmentType as EmploymentType)) {
      errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
    }
  }

  // Employment Status
  if (
    data.employmentStatus !== undefined &&
    data.employmentStatus !== null &&
    data.employmentStatus !== ''
  ) {
    if (!VALID_EMPLOYMENT_STATUSES.includes(data.employmentStatus as EmploymentStatus)) {
      errors.employmentStatus = `Employment status must be one of: ${VALID_EMPLOYMENT_STATUSES.join(', ')}`;
    }
  }

  // User ID (nullable bridge for future IAM integration)
  if (data.userId !== undefined && data.userId !== null && data.userId !== '') {
    if (typeof data.userId !== 'string') {
      errors.userId = 'User ID must be a string';
    } else if (data.userId.trim().length > 64) {
      errors.userId = 'User ID must not exceed 64 characters';
    }
  }

  const probationEndDateError = checkOptionalDate(data.probationEndDate, 'Probation end date');
  if (probationEndDateError) errors.probationEndDate = probationEndDateError;

  const reportingManagerError = checkOptionalId(data.reportingManagerId, 'Reporting manager ID');
  if (reportingManagerError) errors.reportingManagerId = reportingManagerError;

  if (
    data.sourceOfHire !== undefined &&
    data.sourceOfHire !== null &&
    data.sourceOfHire !== '' &&
    !VALID_SOURCES_OF_HIRE.includes(data.sourceOfHire as SourceOfHire)
  ) {
    errors.sourceOfHire = `Source of hire must be one of: ${VALID_SOURCES_OF_HIRE.join(', ')}`;
  }

  if (data.noticePeriodDays !== undefined && data.noticePeriodDays !== null) {
    const days = data.noticePeriodDays;
    if (typeof days !== 'number' || !Number.isInteger(days) || days < 0 || days > 365) {
      errors.noticePeriodDays = 'Notice period must be a whole number of days between 0 and 365';
    }
  }

  const contractEndDateError = checkOptionalDate(data.contractEndDate, 'Contract end date');
  if (contractEndDateError) errors.contractEndDate = contractEndDateError;

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee creation', errors);
  }

  return {
    employeeNumber: (data.employeeNumber as string).trim(),
    userId: data.userId ? (data.userId as string).trim() : null,
    firstName: (data.firstName as string).trim(),
    lastName: data.lastName ? (data.lastName as string).trim() : null,
    email: (data.email as string).trim().toLowerCase(),
    phone: data.phone ? (data.phone as string).trim() : null,
    departmentId: data.departmentId ? (data.departmentId as string).trim() : null,
    designationId: data.designationId ? (data.designationId as string).trim() : null,
    locationId: data.locationId ? (data.locationId as string).trim() : null,
    reportingManagerId: normalizeOptional(data.reportingManagerId),
    joiningDate: (data.joiningDate as string).trim(),
    confirmedJoiningDate: data.confirmedJoiningDate
      ? (data.confirmedJoiningDate as string).trim()
      : null,
    probationEndDate: normalizeOptional(data.probationEndDate),
    sourceOfHire: (normalizeOptional(data.sourceOfHire) as SourceOfHire | null) ?? null,
    noticePeriodDays: typeof data.noticePeriodDays === 'number' ? data.noticePeriodDays : null,
    contractEndDate: normalizeOptional(data.contractEndDate),
    employmentType: (data.employmentType as EmploymentType) ?? 'full_time',
    employmentStatus: (data.employmentStatus as EmploymentStatus) ?? 'probation',
  };
}

export function validateUpdateEmployee(input: unknown): UpdateEmployeeDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateEmployeeDto = {};

  if (data.firstName !== undefined) {
    if (typeof data.firstName !== 'string' || !data.firstName.trim()) {
      errors.firstName = 'First name must not be empty';
    } else if (data.firstName.trim().length > 100) {
      errors.firstName = 'First name must not exceed 100 characters';
    } else {
      result.firstName = data.firstName.trim();
    }
  }

  if (data.lastName !== undefined) {
    if (data.lastName === null || data.lastName === '') {
      result.lastName = null;
    } else if (typeof data.lastName !== 'string') {
      errors.lastName = 'Last name must be a string';
    } else if (data.lastName.trim().length > 100) {
      errors.lastName = 'Last name must not exceed 100 characters';
    } else {
      result.lastName = data.lastName.trim();
    }
  }

  if (data.email !== undefined) {
    if (typeof data.email !== 'string' || !data.email.trim()) {
      errors.email = 'Email address must not be empty';
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = 'Invalid email format';
    } else if (data.email.trim().length > 255) {
      errors.email = 'Email must not exceed 255 characters';
    } else {
      result.email = data.email.trim().toLowerCase();
    }
  }

  if (data.phone !== undefined) {
    if (data.phone === null || data.phone === '') {
      result.phone = null;
    } else if (typeof data.phone !== 'string') {
      errors.phone = 'Phone must be a string';
    } else if (data.phone.trim().length > 50) {
      errors.phone = 'Phone must not exceed 50 characters';
    } else {
      result.phone = data.phone.trim();
    }
  }

  if (data.joiningDate !== undefined) {
    if (typeof data.joiningDate !== 'string' || !DATE_REGEX.test(data.joiningDate.trim())) {
      errors.joiningDate = 'Joining date must be in YYYY-MM-DD format';
    } else {
      result.joiningDate = data.joiningDate.trim();
    }
  }

  if (data.confirmedJoiningDate !== undefined) {
    if (data.confirmedJoiningDate === null || data.confirmedJoiningDate === '') {
      result.confirmedJoiningDate = null;
    } else if (
      typeof data.confirmedJoiningDate !== 'string' ||
      !DATE_REGEX.test(data.confirmedJoiningDate.trim())
    ) {
      errors.confirmedJoiningDate = 'Confirmed joining date must be in YYYY-MM-DD format';
    } else {
      result.confirmedJoiningDate = data.confirmedJoiningDate.trim();
    }
  }

  if (data.probationEndDate !== undefined) {
    const err = checkOptionalDate(data.probationEndDate, 'Probation end date');
    if (err) errors.probationEndDate = err;
    else result.probationEndDate = normalizeOptional(data.probationEndDate);
  }

  if (data.reportingManagerId !== undefined) {
    const err = checkOptionalId(data.reportingManagerId, 'Reporting manager ID');
    if (err) errors.reportingManagerId = err;
    else result.reportingManagerId = normalizeOptional(data.reportingManagerId);
  }

  if (data.departmentId !== undefined) {
    if (data.departmentId === null || data.departmentId === '') {
      result.departmentId = null;
    } else if (typeof data.departmentId !== 'string' || data.departmentId.trim().length > 64) {
      errors.departmentId = 'Department ID must be a string of at most 64 characters';
    } else {
      result.departmentId = data.departmentId.trim();
    }
  }

  if (data.designationId !== undefined) {
    if (data.designationId === null || data.designationId === '') {
      result.designationId = null;
    } else if (typeof data.designationId !== 'string' || data.designationId.trim().length > 64) {
      errors.designationId = 'Designation ID must be a string of at most 64 characters';
    } else {
      result.designationId = data.designationId.trim();
    }
  }

  if (data.locationId !== undefined) {
    if (data.locationId === null || data.locationId === '') {
      result.locationId = null;
    } else if (typeof data.locationId !== 'string' || data.locationId.trim().length > 64) {
      errors.locationId = 'Location ID must be a string of at most 64 characters';
    } else {
      result.locationId = data.locationId.trim();
    }
  }

  if (data.employmentType !== undefined) {
    if (!VALID_EMPLOYMENT_TYPES.includes(data.employmentType as EmploymentType)) {
      errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
    } else {
      result.employmentType = data.employmentType as EmploymentType;
    }
  }

  if (data.employmentStatus !== undefined) {
    if (!VALID_EMPLOYMENT_STATUSES.includes(data.employmentStatus as EmploymentStatus)) {
      errors.employmentStatus = `Employment status must be one of: ${VALID_EMPLOYMENT_STATUSES.join(', ')}`;
    } else {
      result.employmentStatus = data.employmentStatus as EmploymentStatus;
    }
  }

  if (data.userId !== undefined) {
    if (data.userId === null || data.userId === '') {
      result.userId = null;
    } else if (typeof data.userId !== 'string' || data.userId.trim().length > 64) {
      errors.userId = 'User ID must be a string of at most 64 characters';
    } else {
      result.userId = data.userId.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee update', errors);
  }

  return result;
}

export function validateListEmployeesParams(input: Record<string, unknown>): ListEmployeesParams {
  const params: ListEmployeesParams = {};

  if (input.page !== undefined) {
    const pageNum = Number(input.page);
    params.page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  }

  if (input.pageSize !== undefined) {
    const sizeNum = Number(input.pageSize);
    params.pageSize = Number.isInteger(sizeNum) && sizeNum > 0 && sizeNum <= 100 ? sizeNum : 25;
  }

  if (typeof input.search === 'string' && input.search.trim()) {
    params.search = input.search.trim();
  }

  if (typeof input.departmentId === 'string' && input.departmentId.trim()) {
    params.departmentId = input.departmentId.trim();
  }

  if (typeof input.designationId === 'string' && input.designationId.trim()) {
    params.designationId = input.designationId.trim();
  }

  if (typeof input.locationId === 'string' && input.locationId.trim()) {
    params.locationId = input.locationId.trim();
  }

  if (
    typeof input.employmentType === 'string' &&
    VALID_EMPLOYMENT_TYPES.includes(input.employmentType as EmploymentType)
  ) {
    params.employmentType = input.employmentType as EmploymentType;
  }

  if (
    typeof input.employmentStatus === 'string' &&
    VALID_EMPLOYMENT_STATUSES.includes(input.employmentStatus as EmploymentStatus)
  ) {
    params.employmentStatus = input.employmentStatus as EmploymentStatus;
  }

  return params;
}
