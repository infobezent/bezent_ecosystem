import { ValidationError } from '../../../../app/errors/AppError.js';
import type {
  CreateGradeDto,
  UpdateGradeDto,
  ListGradesFilter,
  GradeStatus,
} from '../types/grade.types.js';

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return input as Record<string, unknown>;
}

export function validateCreateGrade(input: unknown): CreateGradeDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  // Name: required, max 255
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Grade name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Grade name cannot exceed 255 characters';
  }

  // Code: required, trimmed, uppercase, max 50
  if (
    data.code === undefined ||
    data.code === null ||
    (typeof data.code === 'string' && !data.code.trim())
  ) {
    errors.code = 'Grade code is required';
  } else if (typeof data.code !== 'string') {
    errors.code = 'Grade code must be a string';
  } else if (data.code.trim().length > 50) {
    errors.code = 'Grade code cannot exceed 50 characters';
  }

  // Rank: required positive integer
  if (data.rank === undefined || data.rank === null || data.rank === '') {
    errors.rank = 'Rank is required';
  } else {
    const num = Number(data.rank);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
      errors.rank = 'Rank must be a positive integer';
    }
  }

  // Description: optional, max 1000
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

  // Status: optional on create
  let status: GradeStatus = 'active';
  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.status = 'Status must be active or inactive';
    } else {
      status = data.status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid grade data', errors);
  }

  return {
    name: (data.name as string).trim(),
    code: (data.code as string).trim().toUpperCase(),
    rank: Number(data.rank),
    description,
    status,
  };
}

export function validateUpdateGrade(input: unknown): UpdateGradeDto {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  let name: string | undefined = undefined;
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Grade name cannot be empty';
    } else if (data.name.trim().length > 255) {
      errors.name = 'Grade name cannot exceed 255 characters';
    } else {
      name = data.name.trim();
    }
  }

  let code: string | undefined = undefined;
  if (data.code !== undefined) {
    if (typeof data.code !== 'string' || !data.code.trim()) {
      errors.code = 'Grade code cannot be empty';
    } else if (data.code.trim().length > 50) {
      errors.code = 'Grade code cannot exceed 50 characters';
    } else {
      code = data.code.trim().toUpperCase();
    }
  }

  let rank: number | undefined = undefined;
  if (data.rank !== undefined) {
    const num = Number(data.rank);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
      errors.rank = 'Rank must be a positive integer';
    } else {
      rank = num;
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

  let status: GradeStatus | undefined = undefined;
  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.status = 'Status must be active or inactive';
    } else {
      status = data.status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid grade update data', errors);
  }

  return {
    name,
    code,
    rank,
    description,
    status,
  };
}

export function validateListGradesFilter(query: Record<string, unknown>): ListGradesFilter {
  const res: ListGradesFilter = {};

  if (query.status && typeof query.status === 'string') {
    if (query.status === 'active' || query.status === 'inactive' || query.status === 'all') {
      res.status = query.status;
    }
  }

  if (query.search && typeof query.search === 'string') {
    res.search = query.search.trim();
  }

  if (query.lookupOnly === 'true' || query.lookupOnly === true) {
    res.lookupOnly = true;
  }

  return res;
}
