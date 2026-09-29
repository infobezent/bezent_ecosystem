import { ValidationError } from '../../../app/errors/AppError.js';
import type { CreateCompanyDto, UpdateCompanyDto } from '../types/company.types.js';

export function validateCreateCompany(body: unknown): CreateCompanyDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.tenantId !== 'string' || !data.tenantId.trim()) {
    errors.tenantId = 'Tenant ID is required';
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Company Name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Company Name cannot exceed 255 characters';
  }

  if (typeof data.code !== 'string' || !data.code.trim()) {
    errors.code = 'Company Code is required';
  } else if (!/^[A-Za-z0-9_-]+$/.test(data.code.trim())) {
    errors.code = 'Company Code can only contain letters, numbers, hyphens and underscores';
  } else if (data.code.trim().length > 50) {
    errors.code = 'Company Code cannot exceed 50 characters';
  }

  if (
    data.businessEmail !== undefined &&
    data.businessEmail !== null &&
    data.businessEmail !== ''
  ) {
    if (
      typeof data.businessEmail !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.businessEmail.trim())
    ) {
      errors.businessEmail = 'Invalid business email format';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    id: typeof data.id === 'string' && data.id.trim() ? data.id.trim() : undefined,
    tenantId: (data.tenantId as string).trim(),
    name: (data.name as string).trim(),
    code: (data.code as string).trim().toUpperCase(),
    legalName: data.legalName ? String(data.legalName).trim() : null,
    businessEmail: data.businessEmail ? String(data.businessEmail).trim() : null,
    contactPhone: data.contactPhone ? String(data.contactPhone).trim() : null,
    country: data.country ? String(data.country).trim() : null,
    timeZone: data.timeZone ? String(data.timeZone).trim() : null,
    status: (data.status as CreateCompanyDto['status']) ?? 'active',
  };
}

export function validateUpdateCompany(body: unknown): UpdateCompanyDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Company Name cannot be empty';
    }
  }

  if (
    data.businessEmail !== undefined &&
    data.businessEmail !== null &&
    data.businessEmail !== ''
  ) {
    if (
      typeof data.businessEmail !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.businessEmail.trim())
    ) {
      errors.businessEmail = 'Invalid business email format';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    name: data.name ? (data.name as string).trim() : undefined,
    legalName:
      data.legalName !== undefined
        ? data.legalName
          ? String(data.legalName).trim()
          : null
        : undefined,
    businessEmail:
      data.businessEmail !== undefined
        ? data.businessEmail
          ? String(data.businessEmail).trim()
          : null
        : undefined,
    contactPhone:
      data.contactPhone !== undefined
        ? data.contactPhone
          ? String(data.contactPhone).trim()
          : null
        : undefined,
    country:
      data.country !== undefined ? (data.country ? String(data.country).trim() : null) : undefined,
    timeZone:
      data.timeZone !== undefined
        ? data.timeZone
          ? String(data.timeZone).trim()
          : null
        : undefined,
  };
}
