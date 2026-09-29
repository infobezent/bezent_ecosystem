import { ValidationError } from '../../../app/errors/AppError.js';

export function validateLoginPayload(body: unknown): { email: string; password: string } {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const { email, password } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Invalid email format';
  }

  if (typeof password !== 'string' || !password) {
    errors.password = 'Password is required';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    email: (email as string).trim().toLowerCase(),
    password: password as string,
  };
}
