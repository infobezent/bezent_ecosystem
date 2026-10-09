import { ValidationError } from '../../../app/errors/AppError.js';
import type {
  CreateOverrideDto,
  RevokeOverrideDto,
  OverrideType,
} from '../types/entitlement.types.js';
import type { ApplicationCode } from '../../plans/types/plan.types.js';

export function validateCreateOverride(body: unknown): CreateOverrideDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.tenantId || typeof data.tenantId !== 'string') {
    errors.tenantId = 'tenantId is required';
  }
  if (!data.applicationCode || !['hrms', 'crm', 'project_management'].includes(String(data.applicationCode))) {
    errors.applicationCode = 'applicationCode must be hrms, crm, or project_management';
  }
  if (!data.moduleCode || typeof data.moduleCode !== 'string' || !data.moduleCode.trim()) {
    errors.moduleCode = 'moduleCode is required';
  }
  if (!data.overrideType || !['enable', 'disable', 'limit'].includes(String(data.overrideType))) {
    errors.overrideType = 'overrideType must be enable, disable, or limit';
  }
  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 5) {
    errors.reason = 'Reason must be at least 5 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    tenantId: String(data.tenantId).trim(),
    companyId: data.companyId ? String(data.companyId).trim() : null,
    applicationCode: data.applicationCode as ApplicationCode,
    moduleCode: String(data.moduleCode).trim(),
    overrideType: data.overrideType as OverrideType,
    overrideValue: data.overrideValue && typeof data.overrideValue === 'object'
      ? (data.overrideValue as Record<string, unknown>)
      : undefined,
    reason: String(data.reason).trim(),
    validUntil: data.validUntil ? new Date(String(data.validUntil)) : null,
  };
}

export function validateRevokeOverride(body: unknown): RevokeOverrideDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 5) {
    throw new ValidationError('Validation failed', {
      reason: 'Revocation reason must be at least 5 characters',
    });
  }

  return {
    reason: data.reason.trim(),
  };
}
