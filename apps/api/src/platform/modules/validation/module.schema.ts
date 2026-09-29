import { ValidationError } from '../../../app/errors/AppError.js';
import type { ModuleCode } from '../types/module.types.js';

const VALID_MODULES: readonly string[] = ['hrms', 'crm', 'project_management'];

export function validateModuleTogglePayload(body: unknown): {
  tenantId: string;
  moduleCode: ModuleCode;
  companyId?: string | null;
} {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.tenantId !== 'string' || !data.tenantId.trim()) {
    errors.tenantId = 'Tenant ID is required';
  }

  if (typeof data.moduleCode !== 'string' || !VALID_MODULES.includes(data.moduleCode.trim())) {
    errors.moduleCode = `Invalid moduleCode. Allowed values: ${VALID_MODULES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    tenantId: (data.tenantId as string).trim(),
    moduleCode: (data.moduleCode as string).trim() as ModuleCode,
    companyId: data.companyId ? String(data.companyId).trim() : null,
  };
}
