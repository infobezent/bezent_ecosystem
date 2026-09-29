import { ValidationError } from '../../../app/errors/AppError.js';
import type { CreateUserDto } from '../types/user.types.js';

export function validateCreateUser(body: unknown): CreateUserDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.email !== 'string' || !data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Invalid email format';
  }

  if (typeof data.firstName !== 'string' || !data.firstName.trim()) {
    errors.firstName = 'First Name is required';
  }

  if (typeof data.lastName !== 'string' || !data.lastName.trim()) {
    errors.lastName = 'Last Name is required';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    email: (data.email as string).trim().toLowerCase(),
    firstName: (data.firstName as string).trim(),
    lastName: (data.lastName as string).trim(),
    phone: data.phone ? String(data.phone).trim() : null,
    status: (data.status as CreateUserDto['status']) ?? 'active',
    isSuperAdmin: Boolean(data.isSuperAdmin),
  };
}
