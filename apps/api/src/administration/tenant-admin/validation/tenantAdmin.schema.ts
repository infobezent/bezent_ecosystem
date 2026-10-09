import { ValidationError } from '../../../app/errors/AppError.js';
import type {
  InviteTenantMemberDto,
  GrantCompanyAccessDto,
  AssignCompanyRolesDto,
  TenantMemberAuthority,
  UpdateTenantProfileDto,
  AssignCompanyUserDto,
  InviteCompanyUserDto,
  UpdateCompanyUserRoleDto,
  CompanyAccessRole,
} from '../types/tenantAdmin.types.js';

export function validateInviteTenantMember(body: unknown): InviteTenantMemberDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.email !== 'string' || !data.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Valid email address is required';
  }

  if (typeof data.firstName !== 'string' || !data.firstName.trim()) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.trim().length > 100) {
    errors.firstName = 'First name cannot exceed 100 characters';
  }

  if (typeof data.lastName !== 'string' || !data.lastName.trim()) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.trim().length > 100) {
    errors.lastName = 'Last name cannot exceed 100 characters';
  }

  let phone: string | undefined;
  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string' || data.phone.trim().length > 50) {
      errors.phone = 'Phone number cannot exceed 50 characters';
    } else {
      phone = data.phone.trim();
    }
  }

  let authority: TenantMemberAuthority = 'standard';
  if (data.authority !== undefined && data.authority !== null) {
    if (data.authority !== 'standard' && data.authority !== 'tenant_admin') {
      errors.authority = "Authority must be either 'standard' or 'tenant_admin'";
    } else {
      authority = data.authority;
    }
  }

  let companyAccess:
    Array<{ companyId: string; roleCodes?: string[]; roles?: string[] }> | undefined;

  if (authority === 'standard') {
    if (
      data.companyAccess === undefined ||
      data.companyAccess === null ||
      !Array.isArray(data.companyAccess) ||
      data.companyAccess.length === 0
    ) {
      // Also support single companyId shorthand for convenience
      if (typeof data.companyId === 'string' && data.companyId.trim()) {
        const roleCodes = Array.isArray(data.roleCodes)
          ? data.roleCodes.map((r) => String(r).trim())
          : Array.isArray(data.roles)
            ? data.roles.map((r) => String(r).trim())
            : undefined;
        companyAccess = [{ companyId: data.companyId.trim(), roleCodes }];
      } else {
        errors.companyAccess = 'Standard users require explicit access to at least one company';
      }
    } else {
      companyAccess = [];
      for (let i = 0; i < data.companyAccess.length; i++) {
        const item = data.companyAccess[i];
        if (typeof item !== 'object' || item === null) {
          errors[`companyAccess.${i}`] = 'Invalid company access item';
          continue;
        }
        const itemObj = item as Record<string, unknown>;
        if (typeof itemObj.companyId !== 'string' || !itemObj.companyId.trim()) {
          errors[`companyAccess.${i}.companyId`] = 'companyId is required';
          continue;
        }
        const roleCodes = Array.isArray(itemObj.roleCodes)
          ? itemObj.roleCodes.map((r) => String(r).trim())
          : Array.isArray(itemObj.roles)
            ? itemObj.roles.map((r) => String(r).trim())
            : undefined;
        companyAccess.push({ companyId: itemObj.companyId.trim(), roleCodes });
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    email: (data.email as string).toLowerCase().trim(),
    firstName: (data.firstName as string).trim(),
    lastName: (data.lastName as string).trim(),
    phone,
    authority,
    companyAccess,
  };
}

export function validateGrantCompanyAccess(body: unknown): GrantCompanyAccessDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.companyId !== 'string' || !data.companyId.trim()) {
    errors.companyId = 'companyId is required';
  }

  const roleCodes = Array.isArray(data.roleCodes)
    ? data.roleCodes.map((r) => String(r).trim())
    : Array.isArray(data.roles)
      ? data.roles.map((r) => String(r).trim())
      : undefined;

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    companyId: (data.companyId as string).trim(),
    roleCodes,
  };
}

export function validateAssignCompanyRoles(body: unknown): AssignCompanyRolesDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const roleIds = Array.isArray(data.roleIds)
    ? data.roleIds.map((r) => String(r).trim())
    : undefined;
  const roleCodes = Array.isArray(data.roleCodes)
    ? data.roleCodes.map((r) => String(r).trim())
    : Array.isArray(data.roles)
      ? data.roles.map((r) => String(r).trim())
      : undefined;

  if ((!roleIds || roleIds.length === 0) && (!roleCodes || roleCodes.length === 0)) {
    throw new ValidationError('Validation failed', {
      roles: 'At least one roleId or roleCode must be provided',
    });
  }

  return {
    roleIds,
    roleCodes,
  };
}

export function validateUpdateTenantProfile(body: unknown): UpdateTenantProfileDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Tenant name cannot be empty';
    } else if (data.name.trim().length > 255) {
      errors.name = 'Tenant name cannot exceed 255 characters';
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

  if (data.contactPhone !== undefined && data.contactPhone !== null && data.contactPhone !== '') {
    if (typeof data.contactPhone !== 'string' || data.contactPhone.trim().length > 50) {
      errors.contactPhone = 'Phone number cannot exceed 50 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  const dto: UpdateTenantProfileDto = {};
  if (data.name !== undefined) {
    dto.name = (data.name as string).trim();
  }
  if (data.contactEmail !== undefined) {
    dto.contactEmail = data.contactEmail ? String(data.contactEmail).trim() : null;
  }
  if (data.contactPhone !== undefined) {
    dto.contactPhone = data.contactPhone ? String(data.contactPhone).trim() : null;
  }

  return dto;
}

export function validateAssignCompanyUser(body: unknown): AssignCompanyUserDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }
  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.userId !== 'string' || !data.userId.trim()) {
    errors.userId = 'User ID is required';
  }

  const role = data.role as string;
  if (!role || (role !== 'company_admin' && role !== 'member')) {
    errors.role = "Role must be either 'member' or 'company_admin'";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    userId: (data.userId as string).trim(),
    role: role as CompanyAccessRole,
  };
}

export function validateInviteCompanyUser(body: unknown): InviteCompanyUserDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }
  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.email !== 'string' || !data.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Valid email address is required';
  }

  const firstName =
    typeof data.firstName === 'string' && data.firstName.trim() ? data.firstName.trim() : undefined;
  const lastName =
    typeof data.lastName === 'string' && data.lastName.trim() ? data.lastName.trim() : undefined;

  const role = data.role as string;
  if (!role || (role !== 'company_admin' && role !== 'member')) {
    errors.role = "Role must be either 'member' or 'company_admin'";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    email: (data.email as string).toLowerCase().trim(),
    firstName,
    lastName,
    role: role as CompanyAccessRole,
  };
}

export function validateUpdateCompanyUserRole(body: unknown): UpdateCompanyUserRoleDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }
  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const role = data.role as string;
  if (!role || (role !== 'company_admin' && role !== 'member')) {
    errors.role = "Role must be either 'member' or 'company_admin'";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    role: role as CompanyAccessRole,
  };
}

