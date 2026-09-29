import { ValidationError } from '../../../app/errors/AppError.js';
import type { CustomerProvisioningDto } from '../types/provisioning.types.js';
import type { ModuleCode } from '../../modules/types/module.types.js';

const VALID_MODULES: readonly string[] = ['hrms', 'crm', 'project_management'];

export function validateCustomerProvisioning(body: unknown): CustomerProvisioningDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.tenant !== 'object' || data.tenant === null) {
    errors.tenant = 'Tenant configuration is required';
  } else {
    const t = data.tenant as Record<string, unknown>;
    if (typeof t.name !== 'string' || !t.name.trim()) {
      errors['tenant.name'] = 'Customer / Tenant name is required';
    }
    if (typeof t.code !== 'string' || !t.code.trim()) {
      errors['tenant.code'] = 'Tenant code is required';
    } else if (!/^[A-Za-z0-9_-]+$/.test(t.code.trim())) {
      errors['tenant.code'] = 'Tenant code can only contain letters, numbers, hyphens and underscores';
    }
    if (t.contactEmail && typeof t.contactEmail === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.contactEmail.trim())) {
      errors['tenant.contactEmail'] = 'Invalid contact email format';
    }
  }

  if (typeof data.company !== 'object' || data.company === null) {
    errors.company = 'Company configuration is required';
  } else {
    const c = data.company as Record<string, unknown>;
    if (typeof c.name !== 'string' || !c.name.trim()) {
      errors['company.name'] = 'Company name is required';
    }
    if (typeof c.code !== 'string' || !c.code.trim()) {
      errors['company.code'] = 'Company code is required';
    } else if (!/^[A-Za-z0-9_-]+$/.test(c.code.trim())) {
      errors['company.code'] = 'Company code can only contain letters, numbers, hyphens and underscores';
    }
    if (c.businessEmail && typeof c.businessEmail === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.businessEmail.trim())) {
      errors['company.businessEmail'] = 'Invalid business email format';
    }
  }

  if (!Array.isArray(data.modules) || data.modules.length === 0) {
    errors.modules = 'At least one module must be selected for customer provisioning';
  } else {
    for (const m of data.modules) {
      if (typeof m !== 'string' || !VALID_MODULES.includes(m)) {
        errors.modules = `Invalid module code '${m}'. Allowed values: ${VALID_MODULES.join(', ')}`;
        break;
      }
    }
  }

  if (typeof data.admin !== 'object' || data.admin === null) {
    errors.admin = 'Company Administrator details are required';
  } else {
    const a = data.admin as Record<string, unknown>;
    const hasUserId = typeof a.userId === 'string' && a.userId.trim();
    const hasNewUser = typeof a.newUser === 'object' && a.newUser !== null;

    if (!hasUserId && !hasNewUser) {
      errors.admin = 'Either an existing userId or newUser details must be provided for Company Admin';
    }

    if (hasNewUser) {
      const nu = a.newUser as Record<string, unknown>;
      if (typeof nu.email !== 'string' || !nu.email.trim()) {
        errors['admin.newUser.email'] = 'Admin email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nu.email.trim())) {
        errors['admin.newUser.email'] = 'Invalid admin email format';
      }
      if (typeof nu.firstName !== 'string' || !nu.firstName.trim()) {
        errors['admin.newUser.firstName'] = 'Admin first name is required';
      }
      if (typeof nu.lastName !== 'string' || !nu.lastName.trim()) {
        errors['admin.newUser.lastName'] = 'Admin last name is required';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  const t = data.tenant as Record<string, unknown>;
  const c = data.company as Record<string, unknown>;
  const a = data.admin as Record<string, unknown>;

  return {
    tenant: {
      id: typeof t.id === 'string' && t.id.trim() ? t.id.trim() : undefined,
      name: String(t.name).trim(),
      code: String(t.code).trim().toUpperCase(),
      contactEmail: t.contactEmail ? String(t.contactEmail).trim() : null,
      contactPhone: t.contactPhone ? String(t.contactPhone).trim() : null,
    },
    company: {
      id: typeof c.id === 'string' && c.id.trim() ? c.id.trim() : undefined,
      name: String(c.name).trim(),
      code: String(c.code).trim().toUpperCase(),
      legalName: c.legalName ? String(c.legalName).trim() : null,
      businessEmail: c.businessEmail ? String(c.businessEmail).trim() : null,
      contactPhone: c.contactPhone ? String(c.contactPhone).trim() : null,
      country: c.country ? String(c.country).trim() : null,
      timeZone: c.timeZone ? String(c.timeZone).trim() : null,
    },
    modules: data.modules as ModuleCode[],
    admin: {
      userId: typeof a.userId === 'string' && a.userId.trim() ? a.userId.trim() : undefined,
      newUser: a.newUser
        ? {
            email: String((a.newUser as Record<string, unknown>).email).trim().toLowerCase(),
            firstName: String((a.newUser as Record<string, unknown>).firstName).trim(),
            lastName: String((a.newUser as Record<string, unknown>).lastName).trim(),
            phone: (a.newUser as Record<string, unknown>).phone
              ? String((a.newUser as Record<string, unknown>).phone).trim()
              : null,
          }
        : undefined,
    },
    activateImmediately: Boolean(data.activateImmediately),
  };
}
