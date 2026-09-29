import { ValidationError } from '../../../app/errors/AppError.js';
import type { AssignCompanyAdminDto } from '../types/companyAdmin.types.js';

export function validateAssignCompanyAdmin(body: unknown): AssignCompanyAdminDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.tenantId !== 'string' || !data.tenantId.trim()) {
    errors.tenantId = 'Tenant ID is required';
  }

  if (typeof data.companyId !== 'string' || !data.companyId.trim()) {
    errors.companyId = 'Company ID is required';
  }

  const hasUserId = typeof data.userId === 'string' && data.userId.trim();
  const hasNewUser = typeof data.newUser === 'object' && data.newUser !== null;

  if (!hasUserId && !hasNewUser) {
    errors.user = 'Either userId or newUser details must be provided';
  }

  if (hasNewUser) {
    const nu = data.newUser as Record<string, unknown>;
    if (typeof nu.email !== 'string' || !nu.email.trim()) {
      errors['newUser.email'] = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nu.email.trim())) {
      errors['newUser.email'] = 'Invalid email format';
    }
    if (typeof nu.firstName !== 'string' || !nu.firstName.trim()) {
      errors['newUser.firstName'] = 'First name is required';
    }
    if (typeof nu.lastName !== 'string' || !nu.lastName.trim()) {
      errors['newUser.lastName'] = 'Last name is required';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    tenantId: (data.tenantId as string).trim(),
    companyId: (data.companyId as string).trim(),
    userId: hasUserId ? (data.userId as string).trim() : undefined,
    newUser: hasNewUser
      ? {
          email: String((data.newUser as Record<string, unknown>).email).trim().toLowerCase(),
          firstName: String((data.newUser as Record<string, unknown>).firstName).trim(),
          lastName: String((data.newUser as Record<string, unknown>).lastName).trim(),
          phone: (data.newUser as Record<string, unknown>).phone
            ? String((data.newUser as Record<string, unknown>).phone).trim()
            : undefined,
          tempPassword: (data.newUser as Record<string, unknown>).tempPassword
            ? String((data.newUser as Record<string, unknown>).tempPassword)
            : undefined,
        }
      : undefined,
  };
}
