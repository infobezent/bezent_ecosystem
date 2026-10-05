import { ValidationError } from '../../../app/errors/AppError.js';
import type {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  SetDepartmentStatusDto,
  DepartmentStatus,
} from '../types/department.types.js';

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return input as Record<string, unknown>;
}

export function validateCreateDepartment(input: unknown): CreateDepartmentDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Department name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Department name cannot exceed 255 characters';
  }

  let code: string | null = null;
  if (data.code !== undefined && data.code !== null && data.code !== '') {
    if (typeof data.code !== 'string') {
      errors.code = 'Department code must be a string';
    } else if (data.code.trim().length > 50) {
      errors.code = 'Department code cannot exceed 50 characters';
    } else {
      code = data.code.trim();
    }
  }

  let description: string | null = null;
  if (data.description !== undefined && data.description !== null && data.description !== '') {
    if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (data.description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters';
    } else {
      description = data.description.trim();
    }
  }

  let businessUnitId: string | null = null;
  if (
    data.businessUnitId !== undefined &&
    data.businessUnitId !== null &&
    data.businessUnitId !== ''
  ) {
    if (typeof data.businessUnitId !== 'string') {
      errors.businessUnitId = 'Business unit ID must be a valid identifier';
    } else {
      businessUnitId = data.businessUnitId.trim();
    }
  }

  let divisionId: string | null = null;
  if (data.divisionId !== undefined && data.divisionId !== null && data.divisionId !== '') {
    if (typeof data.divisionId !== 'string') {
      errors.divisionId = 'Division ID must be a valid identifier';
    } else {
      divisionId = data.divisionId.trim();
    }
  }

  let parentDepartmentId: string | null = null;
  if (
    data.parentDepartmentId !== undefined &&
    data.parentDepartmentId !== null &&
    data.parentDepartmentId !== ''
  ) {
    if (typeof data.parentDepartmentId !== 'string') {
      errors.parentDepartmentId = 'Parent department ID must be a valid identifier';
    } else {
      parentDepartmentId = data.parentDepartmentId.trim();
    }
  }

  let headEmployeeId: string | null = null;
  if (
    data.headEmployeeId !== undefined &&
    data.headEmployeeId !== null &&
    data.headEmployeeId !== ''
  ) {
    if (typeof data.headEmployeeId !== 'string') {
      errors.headEmployeeId = 'Head employee ID must be a valid identifier';
    } else {
      headEmployeeId = data.headEmployeeId.trim();
    }
  }

  let status: DepartmentStatus = 'active';
  if (data.status !== undefined && data.status !== null) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.status = "Status must be 'active' or 'inactive'";
    } else {
      status = data.status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    name: (data.name as string).trim(),
    code,
    description,
    businessUnitId,
    divisionId,
    parentDepartmentId,
    headEmployeeId,
    status,
  };
}

export function validateUpdateDepartment(input: unknown): UpdateDepartmentDto {
  return validateCreateDepartment(input);
}

export function validateSetDepartmentStatus(input: unknown): SetDepartmentStatusDto {
  const data = asObject(input);
  if (!data.status || (data.status !== 'active' && data.status !== 'inactive')) {
    throw new ValidationError('Validation failed', {
      status: "Status must be 'active' or 'inactive'",
    });
  }
  return { status: data.status };
}
