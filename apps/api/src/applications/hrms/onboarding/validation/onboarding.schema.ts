import { ValidationError } from '../../../../app/errors/AppError.js';
import type { CreateNewHireDto, EmploymentType } from '../types/onboarding.types.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contract', 'intern'];

export function validateCreateNewHire(input: unknown): CreateNewHireDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

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

  // Company ID
  if (!data.companyId || typeof data.companyId !== 'string' || !data.companyId.trim()) {
    errors.companyId = 'Company selection is required';
  }

  // Department ID
  if (!data.departmentId || typeof data.departmentId !== 'string' || !data.departmentId.trim()) {
    errors.departmentId = 'Department selection is required';
  }

  // Designation ID
  if (!data.designationId || typeof data.designationId !== 'string' || !data.designationId.trim()) {
    errors.designationId = 'Designation selection is required';
  }

  // Location ID
  if (data.locationId !== undefined && data.locationId !== null && data.locationId !== '') {
    if (typeof data.locationId !== 'string') {
      errors.locationId = 'Location must be a string';
    }
  }

  // Joining Date
  if (!data.joiningDate || typeof data.joiningDate !== 'string' || !data.joiningDate.trim()) {
    errors.joiningDate = 'Joining date is required';
  } else if (!DATE_REGEX.test(data.joiningDate.trim())) {
    errors.joiningDate = 'Joining date must be in YYYY-MM-DD format';
  }

  // Employment Type
  let employmentType: EmploymentType = 'full_time';
  if (
    data.employmentType !== undefined &&
    data.employmentType !== null &&
    data.employmentType !== ''
  ) {
    if (
      typeof data.employmentType !== 'string' ||
      !VALID_EMPLOYMENT_TYPES.includes(data.employmentType as EmploymentType)
    ) {
      errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
    } else {
      employmentType = data.employmentType as EmploymentType;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for new hire submission', errors);
  }

  return {
    firstName: (data.firstName as string).trim(),
    lastName: data.lastName ? (data.lastName as string).trim() : undefined,
    email: (data.email as string).trim().toLowerCase(),
    phone: data.phone ? (data.phone as string).trim() : undefined,
    companyId: (data.companyId as string).trim(),
    departmentId: (data.departmentId as string).trim(),
    designationId: (data.designationId as string).trim(),
    locationId: data.locationId ? (data.locationId as string).trim() : undefined,
    joiningDate: (data.joiningDate as string).trim(),
    employmentType,
  };
}

export function validateCreateCase(
  input: unknown,
): import('../types/onboarding.types.js').CreateCaseDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (data.firstName !== undefined && data.firstName !== null) {
    if (typeof data.firstName !== 'string') {
      errors.firstName = 'First name must be a string';
    } else if (data.firstName.trim().length > 100) {
      errors.firstName = 'First name must not exceed 100 characters';
    }
  }

  if (data.lastName !== undefined && data.lastName !== null) {
    if (typeof data.lastName !== 'string') {
      errors.lastName = 'Last name must be a string';
    } else if (data.lastName.trim().length > 100) {
      errors.lastName = 'Last name must not exceed 100 characters';
    }
  }

  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (typeof data.email !== 'string') {
      errors.email = 'Email must be a string';
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = 'Invalid email format';
    } else if (data.email.trim().length > 255) {
      errors.email = 'Email must not exceed 255 characters';
    }
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.phone = 'Phone must be a string';
    } else if (data.phone.trim().length > 50) {
      errors.phone = 'Phone must not exceed 50 characters';
    }
  }

  if (data.joiningDate !== undefined && data.joiningDate !== null && data.joiningDate !== '') {
    if (typeof data.joiningDate !== 'string') {
      errors.joiningDate = 'Joining date must be a string';
    } else if (!DATE_REGEX.test(data.joiningDate.trim())) {
      errors.joiningDate = 'Joining date must be in YYYY-MM-DD format';
    }
  }

  let employmentType: EmploymentType | undefined;
  if (
    data.employmentType !== undefined &&
    data.employmentType !== null &&
    data.employmentType !== ''
  ) {
    if (
      typeof data.employmentType !== 'string' ||
      !VALID_EMPLOYMENT_TYPES.includes(data.employmentType as EmploymentType)
    ) {
      errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
    } else {
      employmentType = data.employmentType as EmploymentType;
    }
  }

  let status: 'draft' | 'active' | undefined;
  if (data.status !== undefined && data.status !== null) {
    if (data.status !== 'draft' && data.status !== 'active') {
      errors.status = "Status must be either 'draft' or 'active'";
    } else {
      status = data.status;
    }
  }

  if (data.draftPayload !== undefined && data.draftPayload !== null) {
    if (typeof data.draftPayload !== 'object' || Array.isArray(data.draftPayload)) {
      errors.draftPayload = 'draftPayload must be a JSON object';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for case creation', errors);
  }

  return {
    firstName: typeof data.firstName === 'string' ? data.firstName.trim() : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName.trim() : undefined,
    email:
      typeof data.email === 'string' && data.email.trim()
        ? data.email.trim().toLowerCase()
        : undefined,
    phone: typeof data.phone === 'string' ? data.phone.trim() : undefined,
    departmentId: typeof data.departmentId === 'string' ? data.departmentId.trim() : undefined,
    designationId: typeof data.designationId === 'string' ? data.designationId.trim() : undefined,
    locationId: typeof data.locationId === 'string' ? data.locationId.trim() : undefined,
    joiningDate: typeof data.joiningDate === 'string' ? data.joiningDate.trim() : undefined,
    employmentType,
    status: status ?? 'draft',
    draftPayload: data.draftPayload as Record<string, unknown> | undefined,
  };
}

export function validateUpdateDraft(
  input: unknown,
): import('../types/onboarding.types.js').UpdateDraftDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (data.firstName !== undefined && data.firstName !== null) {
    if (typeof data.firstName !== 'string') {
      errors.firstName = 'First name must be a string';
    } else if (data.firstName.trim().length > 100) {
      errors.firstName = 'First name must not exceed 100 characters';
    }
  }

  if (data.lastName !== undefined && data.lastName !== null) {
    if (typeof data.lastName !== 'string') {
      errors.lastName = 'Last name must be a string';
    } else if (data.lastName.trim().length > 100) {
      errors.lastName = 'Last name must not exceed 100 characters';
    }
  }

  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (typeof data.email !== 'string') {
      errors.email = 'Email must be a string';
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = 'Invalid email format';
    } else if (data.email.trim().length > 255) {
      errors.email = 'Email must not exceed 255 characters';
    }
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.phone = 'Phone must be a string';
    } else if (data.phone.trim().length > 50) {
      errors.phone = 'Phone must not exceed 50 characters';
    }
  }

  if (data.joiningDate !== undefined && data.joiningDate !== null && data.joiningDate !== '') {
    if (typeof data.joiningDate !== 'string') {
      errors.joiningDate = 'Joining date must be a string';
    } else if (!DATE_REGEX.test(data.joiningDate.trim())) {
      errors.joiningDate = 'Joining date must be in YYYY-MM-DD format';
    }
  }

  let employmentType: EmploymentType | undefined;
  if (
    data.employmentType !== undefined &&
    data.employmentType !== null &&
    data.employmentType !== ''
  ) {
    if (
      typeof data.employmentType !== 'string' ||
      !VALID_EMPLOYMENT_TYPES.includes(data.employmentType as EmploymentType)
    ) {
      errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
    } else {
      employmentType = data.employmentType as EmploymentType;
    }
  }

  if (data.version !== undefined && data.version !== null) {
    if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
      errors.version = 'Version must be a positive integer';
    }
  }

  if (data.draftPayload !== undefined && data.draftPayload !== null) {
    if (typeof data.draftPayload !== 'object' || Array.isArray(data.draftPayload)) {
      errors.draftPayload = 'draftPayload must be a JSON object';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for draft update', errors);
  }

  return {
    firstName: typeof data.firstName === 'string' ? data.firstName.trim() : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName.trim() : undefined,
    email:
      typeof data.email === 'string' && data.email.trim()
        ? data.email.trim().toLowerCase()
        : undefined,
    phone: typeof data.phone === 'string' ? data.phone.trim() : undefined,
    departmentId: typeof data.departmentId === 'string' ? data.departmentId.trim() : undefined,
    designationId: typeof data.designationId === 'string' ? data.designationId.trim() : undefined,
    locationId: typeof data.locationId === 'string' ? data.locationId.trim() : undefined,
    joiningDate: typeof data.joiningDate === 'string' ? data.joiningDate.trim() : undefined,
    employmentType,
    draftPayload: data.draftPayload as Record<string, unknown> | undefined,
    version: typeof data.version === 'number' ? data.version : undefined,
  };
}

export function validateSubmitCase(
  input: unknown,
): import('../types/onboarding.types.js').SubmitCaseDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.firstName || typeof data.firstName !== 'string' || !data.firstName.trim()) {
    errors.firstName = 'First name is required to submit onboarding case';
  } else if (data.firstName.trim().length > 100) {
    errors.firstName = 'First name must not exceed 100 characters';
  }

  if (data.lastName !== undefined && data.lastName !== null && data.lastName !== '') {
    if (typeof data.lastName !== 'string') {
      errors.lastName = 'Last name must be a string';
    } else if (data.lastName.trim().length > 100) {
      errors.lastName = 'Last name must not exceed 100 characters';
    }
  }

  if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
    errors.email = 'Email address is required to submit onboarding case';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Invalid email format';
  } else if (data.email.trim().length > 255) {
    errors.email = 'Email must not exceed 255 characters';
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.phone = 'Phone must be a string';
    } else if (data.phone.trim().length > 50) {
      errors.phone = 'Phone must not exceed 50 characters';
    }
  }

  if (!data.departmentId || typeof data.departmentId !== 'string' || !data.departmentId.trim()) {
    errors.departmentId = 'Department is required to submit onboarding case';
  }

  if (!data.designationId || typeof data.designationId !== 'string' || !data.designationId.trim()) {
    errors.designationId = 'Designation is required to submit onboarding case';
  }

  if (data.locationId !== undefined && data.locationId !== null && data.locationId !== '') {
    if (typeof data.locationId !== 'string') {
      errors.locationId = 'Location must be a string';
    }
  }

  if (!data.joiningDate || typeof data.joiningDate !== 'string' || !data.joiningDate.trim()) {
    errors.joiningDate = 'Joining date is required to submit onboarding case';
  } else if (!DATE_REGEX.test(data.joiningDate.trim())) {
    errors.joiningDate = 'Joining date must be in YYYY-MM-DD format';
  }

  let employmentType: EmploymentType = 'full_time';
  if (
    data.employmentType !== undefined &&
    data.employmentType !== null &&
    data.employmentType !== ''
  ) {
    if (
      typeof data.employmentType !== 'string' ||
      !VALID_EMPLOYMENT_TYPES.includes(data.employmentType as EmploymentType)
    ) {
      errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
    } else {
      employmentType = data.employmentType as EmploymentType;
    }
  }

  if (data.version !== undefined && data.version !== null) {
    if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
      errors.version = 'Version must be a positive integer';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for case submission', errors);
  }

  return {
    firstName: (data.firstName as string).trim(),
    lastName: data.lastName ? (data.lastName as string).trim() : undefined,
    email: (data.email as string).trim().toLowerCase(),
    phone: data.phone ? (data.phone as string).trim() : undefined,
    departmentId: (data.departmentId as string).trim(),
    designationId: (data.designationId as string).trim(),
    locationId: data.locationId ? (data.locationId as string).trim() : undefined,
    joiningDate: (data.joiningDate as string).trim(),
    employmentType,
    version: typeof data.version === 'number' ? data.version : undefined,
  };
}
