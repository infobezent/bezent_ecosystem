import { ValidationError } from '../../../../app/errors/AppError.js';
import type {
  CreateDesignationDto,
  UpdateDesignationDto,
  ListDesignationsQuery,
  DesignationStatus,
} from '../types/designation.types.js';

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return input as Record<string, unknown>;
}

export function validateCreateDesignation(input: unknown): CreateDesignationDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Designation name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Designation name cannot exceed 255 characters';
  }

  let code: string | null = null;
  if (data.code !== undefined && data.code !== null && data.code !== '') {
    if (typeof data.code !== 'string') {
      errors.code = 'Designation code must be a string';
    } else if (data.code.trim().length > 50) {
      errors.code = 'Designation code cannot exceed 50 characters';
    } else {
      code = data.code.trim().toUpperCase();
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

  let departmentId: string | null = null;
  if (data.departmentId !== undefined && data.departmentId !== null && data.departmentId !== '' && data.departmentId !== 'none') {
    if (typeof data.departmentId !== 'string') {
      errors.departmentId = 'Department ID must be a valid identifier';
    } else {
      departmentId = data.departmentId.trim();
    }
  }

  let status: DesignationStatus = 'active';
  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.status = 'Status must be active or inactive';
    } else {
      status = data.status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid designation data', errors);
  }

  return {
    name: (data.name as string).trim(),
    code,
    description,
    departmentId,
    status,
  };
}

export function validateUpdateDesignation(input: unknown): UpdateDesignationDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  let name: string | undefined = undefined;
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Designation name cannot be empty';
    } else if (data.name.trim().length > 255) {
      errors.name = 'Designation name cannot exceed 255 characters';
    } else {
      name = data.name.trim();
    }
  }

  let code: string | null | undefined = undefined;
  if (data.code !== undefined) {
    if (data.code === null || data.code === '') {
      code = null;
    } else if (typeof data.code !== 'string') {
      errors.code = 'Designation code must be a string';
    } else if (data.code.trim().length > 50) {
      errors.code = 'Designation code cannot exceed 50 characters';
    } else {
      code = data.code.trim().toUpperCase();
    }
  }

  let description: string | null | undefined = undefined;
  if (data.description !== undefined) {
    if (data.description === null || data.description === '') {
      description = null;
    } else if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (data.description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters';
    } else {
      description = data.description.trim();
    }
  }

  let departmentId: string | null | undefined = undefined;
  if (data.departmentId !== undefined) {
    if (data.departmentId === null || data.departmentId === '' || data.departmentId === 'none') {
      departmentId = null;
    } else if (typeof data.departmentId !== 'string') {
      errors.departmentId = 'Department ID must be a valid identifier';
    } else {
      departmentId = data.departmentId.trim();
    }
  }

  let status: DesignationStatus | undefined = undefined;
  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.status = 'Status must be active or inactive';
    } else {
      status = data.status;
    }
  }

  const confirmStructuralMove = Boolean(data.confirmStructuralMove);

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid designation update data', errors);
  }

  return {
    name,
    code,
    description,
    departmentId,
    status,
    confirmStructuralMove,
  };
}

export function validateSetDesignationStatus(input: unknown): { status: DesignationStatus } {
  const data = asObject(input);
  if (data.status !== 'active' && data.status !== 'inactive') {
    throw new ValidationError('Status must be either active or inactive');
  }
  return { status: data.status };
}

export function validateListDesignationsQuery(query: Record<string, unknown>): ListDesignationsQuery {
  const res: ListDesignationsQuery = {};

  if (query.status && typeof query.status === 'string') {
    if (query.status === 'active' || query.status === 'inactive' || query.status === 'all') {
      res.status = query.status;
    }
  }

  if (query.departmentId && typeof query.departmentId === 'string') {
    res.departmentId = query.departmentId.trim();
  }

  if (query.eligibleForDepartmentId && typeof query.eligibleForDepartmentId === 'string') {
    res.eligibleForDepartmentId = query.eligibleForDepartmentId.trim();
  }

  if (query.search && typeof query.search === 'string') {
    res.search = query.search.trim();
  }

  if (query.limit !== undefined) {
    const num = Number(query.limit);
    if (!isNaN(num) && num > 0) res.limit = Math.min(num, 500);
  }

  if (query.offset !== undefined) {
    const num = Number(query.offset);
    if (!isNaN(num) && num >= 0) res.offset = num;
  }

  return res;
}
