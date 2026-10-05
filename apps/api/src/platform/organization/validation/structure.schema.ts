import { ValidationError } from '../../../app/errors/AppError.js';
import type {
  CreateBusinessUnitDto,
  UpdateBusinessUnitDto,
  CreateDivisionDto,
  UpdateDivisionDto,
  SetStatusDto,
  StructuralStatus,
} from '../types/structure.types.js';

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return input as Record<string, unknown>;
}

export function validateCreateBusinessUnit(input: unknown): CreateBusinessUnitDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Business unit name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Business unit name cannot exceed 255 characters';
  }

  let code: string | null = null;
  if (data.code !== undefined && data.code !== null && data.code !== '') {
    if (typeof data.code !== 'string') {
      errors.code = 'Business unit code must be a string';
    } else if (data.code.trim().length > 50) {
      errors.code = 'Business unit code cannot exceed 50 characters';
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

  let status: StructuralStatus = 'active';
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
    headEmployeeId,
    status,
  };
}

export function validateUpdateBusinessUnit(input: unknown): UpdateBusinessUnitDto {
  return validateCreateBusinessUnit(input);
}

export function validateCreateDivision(input: unknown): CreateDivisionDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  if (
    !data.businessUnitId ||
    typeof data.businessUnitId !== 'string' ||
    !data.businessUnitId.trim()
  ) {
    errors.businessUnitId = 'Parent business unit is required';
  }

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Division name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Division name cannot exceed 255 characters';
  }

  let code: string | null = null;
  if (data.code !== undefined && data.code !== null && data.code !== '') {
    if (typeof data.code !== 'string') {
      errors.code = 'Division code must be a string';
    } else if (data.code.trim().length > 50) {
      errors.code = 'Division code cannot exceed 50 characters';
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

  let status: StructuralStatus = 'active';
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
    businessUnitId: (data.businessUnitId as string).trim(),
    name: (data.name as string).trim(),
    code,
    description,
    headEmployeeId,
    status,
  };
}

export function validateUpdateDivision(input: unknown): UpdateDivisionDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Division name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Division name cannot exceed 255 characters';
  }

  let code: string | null = null;
  if (data.code !== undefined && data.code !== null && data.code !== '') {
    if (typeof data.code !== 'string') {
      errors.code = 'Division code must be a string';
    } else if (data.code.trim().length > 50) {
      errors.code = 'Division code cannot exceed 50 characters';
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

  let status: StructuralStatus = 'active';
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
    headEmployeeId,
    status,
  };
}

export function validateSetStatus(input: unknown): SetStatusDto {
  const data = asObject(input);
  if (!data.status || (data.status !== 'active' && data.status !== 'inactive')) {
    throw new ValidationError('Validation failed', {
      status: "Status must be 'active' or 'inactive'",
    });
  }
  return { status: data.status };
}
