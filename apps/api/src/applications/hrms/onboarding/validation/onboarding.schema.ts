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
