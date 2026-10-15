import { ValidationError } from '../../../app/errors/AppError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Invalid request body');
  }
  return body as Record<string, unknown>;
}

export function validateOtpRequestPayload(body: unknown): { email: string } {
  const { email } = asObject(body);
  if (typeof email !== 'string' || !email.trim()) {
    throw new ValidationError('Validation failed', { email: 'Email is required' });
  }
  if (email.length > 255 || !EMAIL_PATTERN.test(email.trim())) {
    throw new ValidationError('Validation failed', { email: 'Invalid email format' });
  }
  return { email: email.trim().toLowerCase() };
}

export function validateOtpVerifyPayload(body: unknown): { challengeId: string; code: string } {
  const { challengeId, code } = asObject(body);
  const errors: Record<string, string> = {};
  if (typeof challengeId !== 'string' || !challengeId.trim() || challengeId.length > 64) {
    errors.challengeId = 'Challenge ID is required';
  }
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    errors.code = 'Code must be 6 digits';
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
  return { challengeId: (challengeId as string).trim(), code: (code as string).trim() };
}

export function validatePasswordLoginPayload(body: unknown): { email: string; password: string } {
  const { email, password } = asObject(body);
  const errors: Record<string, string> = {};
  if (typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email is required';
  } else if (email.length > 255 || !EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Invalid email format';
  }
  if (typeof password !== 'string' || !password) {
    errors.password = 'Password is required';
  } else if (password.length > 255) {
    errors.password = 'Password exceeds maximum length';
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
  return { email: (email as string).trim().toLowerCase(), password: password as string };
}

