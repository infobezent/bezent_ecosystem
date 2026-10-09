import { ValidationError } from '../../../app/errors/AppError.js';
import {
  validateText,
  validateEmail,
  validatePhone,
  validateIdentifier,
  validatePostalCode,
  normalizeCountryCode,
} from '../../data/index.js';
import type {
  CreateCompanyDto,
  CreateTenantAdminCompanyDto,
  UpdateCompanyDto,
} from '../types/company.types.js';

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

  // Validate optional modules
  let validatedModules: Array<'hrms' | 'crm' | 'project_management'> | undefined = undefined;
  if (data.modules !== undefined && data.modules !== null) {
    if (!Array.isArray(data.modules)) {
      errors.modules = 'Modules must be an array of module codes';
    } else {
      const allowed = new Set(['hrms', 'crm', 'project_management']);
      const invalid = data.modules.filter((m) => typeof m !== 'string' || !allowed.has(m));
      if (invalid.length > 0) {
        errors.modules = `Invalid module codes: ${invalid.join(', ')}`;
      } else {
        validatedModules = Array.from(new Set(data.modules)) as Array<
          'hrms' | 'crm' | 'project_management'
        >;
      }
    }
  }

  // Validate optional admin
  let validatedAdmin: CreateCompanyDto['admin'] = undefined;
  if (data.admin !== undefined && data.admin !== null) {
    if (typeof data.admin !== 'object') {
      errors.admin = 'Admin must be an object';
    } else {
      const adminData = data.admin as Record<string, unknown>;
      if (adminData.userId) {
        if (typeof adminData.userId !== 'string' || !adminData.userId.trim()) {
          errors.adminUserId = 'Admin userId must be a non-empty string';
        } else {
          validatedAdmin = { userId: adminData.userId.trim() };
        }
      } else if (adminData.newUser) {
        if (typeof adminData.newUser !== 'object' || adminData.newUser === null) {
          errors.adminNewUser = 'Admin newUser must be an object';
        } else {
          const nu = adminData.newUser as Record<string, unknown>;
          if (typeof nu.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nu.email.trim())) {
            errors.adminEmail = 'Valid admin email is required';
          }
          if (typeof nu.firstName !== 'string' || !nu.firstName.trim()) {
            errors.adminFirstName = 'Admin first name is required';
          }
          if (typeof nu.lastName !== 'string' || !nu.lastName.trim()) {
            errors.adminLastName = 'Admin last name is required';
          }
          if (!errors.adminEmail && !errors.adminFirstName && !errors.adminLastName) {
            validatedAdmin = {
              newUser: {
                email: (nu.email as string).trim().toLowerCase(),
                firstName: (nu.firstName as string).trim(),
                lastName: (nu.lastName as string).trim(),
                phone:
                  typeof nu.phone === 'string' && nu.phone.trim() ? nu.phone.trim() : undefined,
              },
            };
          }
        }
      }
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
    modules: validatedModules,
    admin: validatedAdmin,
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

export function validateCreateTenantAdminCompany(body: unknown): CreateTenantAdminCompanyDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Company Name *
  if (typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Company Name is required';
  } else {
    const textRes = validateText(data.name, { required: true, minLength: 2, maxLength: 150 });
    if (!textRes.isValid) {
      errors.name = textRes.error || 'Invalid Company Name';
    }
  }

  // Company Code *
  if (typeof data.code !== 'string' || !data.code.trim()) {
    errors.code = 'Company Code is required';
  } else {
    const idRes = validateIdentifier(data.code, {
      required: true,
      minLength: 1,
      maxLength: 50,
      uppercase: true,
    });
    if (!idRes.isValid) {
      errors.code =
        idRes.error ||
        'Company Code can only contain letters, numbers, hyphens and underscores';
    }
  }

  // Legal Name (Optional, max 150)
  if (data.legalName !== undefined && data.legalName !== null && data.legalName !== '') {
    const legalRes = validateText(data.legalName, { maxLength: 150 });
    if (!legalRes.isValid) {
      errors.legalName = legalRes.error || 'Invalid Legal Name';
    }
  }

  // Display Name (Optional, max 80)
  if (data.displayName !== undefined && data.displayName !== null && data.displayName !== '') {
    const dispRes = validateText(data.displayName, { maxLength: 80 });
    if (!dispRes.isValid) {
      errors.displayName = dispRes.error || 'Invalid Display Name';
    }
  }

  // Business Email (Optional)
  if (
    data.businessEmail !== undefined &&
    data.businessEmail !== null &&
    data.businessEmail !== ''
  ) {
    const emailRes = validateEmail(data.businessEmail);
    if (!emailRes.isValid) {
      errors.businessEmail = 'Invalid business email format';
    }
  }

  // Contact Phone (Optional)
  const normCountry = typeof data.country === 'string' ? normalizeCountryCode(data.country) : undefined;
  if (
    data.contactPhone !== undefined &&
    data.contactPhone !== null &&
    data.contactPhone !== ''
  ) {
    const phoneRes = validatePhone(data.contactPhone, {
      countryCode: normCountry ?? undefined,
    });
    if (!phoneRes.isValid) {
      errors.contactPhone = phoneRes.error || 'Invalid phone number format';
    }
  }

  // Postal Code (Optional)
  if (
    data.postalCode !== undefined &&
    data.postalCode !== null &&
    data.postalCode !== ''
  ) {
    const postalRes = validatePostalCode(data.postalCode, {
      countryCode: normCountry ?? undefined,
    });
    if (!postalRes.isValid) {
      errors.postalCode = postalRes.error || 'Invalid postal code format';
    }
  }

  // Registration Number (Optional)
  if (
    data.registrationNumber !== undefined &&
    data.registrationNumber !== null &&
    data.registrationNumber !== ''
  ) {
    const regRes = validateText(data.registrationNumber, { maxLength: 100 });
    if (!regRes.isValid) {
      errors.registrationNumber = regRes.error || 'Invalid registration number';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    name: (data.name as string).trim(),
    code: (data.code as string).trim().toUpperCase(),
    displayName: data.displayName ? String(data.displayName).trim() : null,
    legalName: data.legalName ? String(data.legalName).trim() : null,
    organizationType: data.organizationType ? String(data.organizationType).trim() : null,
    industry: data.industry ? String(data.industry).trim() : null,
    businessEmail: data.businessEmail ? String(data.businessEmail).trim() : null,
    contactPhone: data.contactPhone ? String(data.contactPhone).trim() : null,
    country: data.country ? String(data.country).trim() : null,
    addressLine1: data.addressLine1 ? String(data.addressLine1).trim() : null,
    addressLine2: data.addressLine2 ? String(data.addressLine2).trim() : null,
    city: data.city ? String(data.city).trim() : null,
    state: data.state ? String(data.state).trim() : null,
    postalCode: data.postalCode ? String(data.postalCode).trim() : null,
    timeZone: data.timeZone ? String(data.timeZone).trim() : null,
    registrationNumber: data.registrationNumber ? String(data.registrationNumber).trim() : null,
    currency: data.currency ? String(data.currency).trim().toUpperCase() : null,
    locale: data.locale ? String(data.locale).trim() : null,
    dateFormat: data.dateFormat ? String(data.dateFormat).trim() : null,
    weekStartsOn: data.weekStartsOn ? String(data.weekStartsOn).trim().toLowerCase() : null,
    financialYearStart: data.financialYearStart ? String(data.financialYearStart).trim() : null,
    logoUrl: data.logoUrl ? String(data.logoUrl).trim() : null,
    brandingMode:
      data.brandingMode === 'own_logo' || data.brandingMode === 'tenant_logo' || data.brandingMode === 'initials'
        ? data.brandingMode
        : undefined,
  };
}

