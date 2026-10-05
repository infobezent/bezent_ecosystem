import { ValidationError } from '../../../app/errors/AppError.js';
import type {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateCompanyCapacityDto,
} from '../types/tenant.types.js';

export function validateCreateTenant(body: unknown): CreateTenantDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Customer / Tenant Name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Tenant name cannot exceed 255 characters';
  }

  if (typeof data.code !== 'string' || !data.code.trim()) {
    errors.code = 'Tenant Code is required';
  } else if (!/^[A-Za-z0-9_-]+$/.test(data.code.trim())) {
    errors.code = 'Tenant Code can only contain letters, numbers, hyphens and underscores';
  } else if (data.code.trim().length > 50) {
    errors.code = 'Tenant Code cannot exceed 50 characters';
  }

  if (data.contactEmail !== undefined && data.contactEmail !== null && data.contactEmail !== '') {
    if (
      typeof data.contactEmail !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail.trim())
    ) {
      errors.contactEmail = 'Invalid contact email format';
    }
  }

  let validatedMaxCompanies: number | undefined = undefined;
  if (data.maxCompanies !== undefined && data.maxCompanies !== null) {
    if (
      typeof data.maxCompanies !== 'number' ||
      !Number.isInteger(data.maxCompanies) ||
      data.maxCompanies < 1
    ) {
      errors.maxCompanies = 'maxCompanies must be a positive integer';
    } else {
      validatedMaxCompanies = data.maxCompanies;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    id: typeof data.id === 'string' && data.id.trim() ? data.id.trim() : undefined,
    name: (data.name as string).trim(),
    code: (data.code as string).trim().toUpperCase(),
    maxCompanies: validatedMaxCompanies,
    contactEmail: data.contactEmail ? (data.contactEmail as string).trim() : null,
    contactPhone: data.contactPhone ? String(data.contactPhone).trim() : null,
    status: (data.status as CreateTenantDto['status']) ?? 'active',
  };
}

export function validateUpdateTenant(body: unknown): UpdateTenantDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Tenant name cannot be empty';
    }
  }

  if (data.contactEmail !== undefined && data.contactEmail !== null && data.contactEmail !== '') {
    if (
      typeof data.contactEmail !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail.trim())
    ) {
      errors.contactEmail = 'Invalid contact email format';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    name: data.name ? (data.name as string).trim() : undefined,
    contactEmail:
      data.contactEmail !== undefined
        ? data.contactEmail
          ? String(data.contactEmail).trim()
          : null
        : undefined,
    contactPhone:
      data.contactPhone !== undefined
        ? data.contactPhone
          ? String(data.contactPhone).trim()
          : null
        : undefined,
  };
}

export function validateUpdateCompanyCapacity(body: unknown): UpdateCompanyCapacityDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (data.maxCompanies === undefined || data.maxCompanies === null) {
    errors.maxCompanies = 'maxCompanies is required';
  } else if (
    typeof data.maxCompanies !== 'number' ||
    !Number.isInteger(data.maxCompanies) ||
    data.maxCompanies < 1
  ) {
    errors.maxCompanies = 'maxCompanies must be a positive integer';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    maxCompanies: data.maxCompanies as number,
  };
}

