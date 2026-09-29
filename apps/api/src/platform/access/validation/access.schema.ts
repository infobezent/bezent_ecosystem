import { ValidationError } from '../../../app/errors/AppError.js';
import type { ModuleCode } from '../../modules/types/module.types.js';
import type { CreateCustomRoleInput, UpdateCustomRoleInput } from '../types/access.types.js';

const MODULE_CODES: readonly ModuleCode[] = ['hrms', 'crm', 'project_management'];

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Invalid request body');
  }
  return body as Record<string, unknown>;
}

function readPermissions(value: unknown, errors: Record<string, string>): string[] | undefined {
  if (!Array.isArray(value) || value.some((p) => typeof p !== 'string' || !p.trim())) {
    errors.permissions = 'Permissions must be a list of permission identifiers';
    return undefined;
  }
  return value.map((p: string) => p.trim());
}

function readName(value: unknown, errors: Record<string, string>): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    errors.name = 'Role name is required';
    return undefined;
  }
  if (value.trim().length > 100) {
    errors.name = 'Role name must be at most 100 characters';
    return undefined;
  }
  return value.trim();
}

function readDescription(
  value: unknown,
  errors: Record<string, string>,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 500) {
    errors.description = 'Description must be text of at most 500 characters';
    return undefined;
  }
  return value;
}

export function validateCreateCustomRole(body: unknown): CreateCustomRoleInput {
  const data = asObject(body);
  const errors: Record<string, string> = {};

  const name = readName(data.name, errors);
  const description = readDescription(data.description, errors);
  const permissions = readPermissions(data.permissions, errors);

  let moduleCode: ModuleCode | null = null;
  if (data.moduleCode !== undefined && data.moduleCode !== null) {
    if (!MODULE_CODES.includes(data.moduleCode as ModuleCode)) {
      errors.moduleCode = 'Unknown application';
    } else {
      moduleCode = data.moduleCode as ModuleCode;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
  return { name: name!, description, moduleCode, permissions: permissions! };
}

export function validateUpdateCustomRole(body: unknown): UpdateCustomRoleInput {
  const data = asObject(body);
  const errors: Record<string, string> = {};
  const input: UpdateCustomRoleInput = {};

  if (data.name !== undefined) input.name = readName(data.name, errors);
  if (data.description !== undefined) input.description = readDescription(data.description, errors);
  if (data.permissions !== undefined) input.permissions = readPermissions(data.permissions, errors);

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
  if (Object.keys(input).length === 0) {
    throw new ValidationError('Nothing to update');
  }
  return input;
}

export function validateRoleStatus(body: unknown): 'active' | 'inactive' {
  const data = asObject(body);
  if (data.status !== 'active' && data.status !== 'inactive') {
    throw new ValidationError('Validation failed', {
      status: "Status must be 'active' or 'inactive'",
    });
  }
  return data.status;
}

export function validateAssignRole(body: unknown): string {
  const data = asObject(body);
  if (typeof data.roleId !== 'string' || !data.roleId.trim()) {
    throw new ValidationError('Validation failed', { roleId: 'Role ID is required' });
  }
  return data.roleId.trim();
}
