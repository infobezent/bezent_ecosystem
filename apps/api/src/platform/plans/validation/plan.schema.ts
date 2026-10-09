import { ValidationError } from '../../../app/errors/AppError.js';
import type {
  CreatePlanDto,
  UpdatePlanDto,
  CreatePlanPriceDto,
  UpdatePlanPriceDto,
  PlanFilter,
  ApplicationCode,
  PlanTier,
  BillingInterval,
  PlanStatus,
} from '../types/plan.types.js';

export function validateCreatePlan(body: unknown): CreatePlanDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.applicationCode || !['hrms', 'crm', 'project_management'].includes(String(data.applicationCode))) {
    errors.applicationCode = 'applicationCode must be hrms, crm, or project_management';
  }
  if (!data.code || typeof data.code !== 'string' || !data.code.trim()) {
    errors.code = 'Plan code is required';
  }
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Plan name is required';
  }
  if (!data.tier || typeof data.tier !== 'string' || !data.tier.trim()) {
    errors.tier = 'Plan tier is required';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    id: typeof data.id === 'string' ? data.id.trim() : undefined,
    applicationCode: data.applicationCode as ApplicationCode,
    code: String(data.code).trim().toLowerCase(),
    name: String(data.name).trim(),
    description: data.description ? String(data.description).trim() : undefined,
    tier: String(data.tier).trim() as PlanTier,
    status: data.status ? (String(data.status).trim() as PlanStatus) : 'active',
    defaultSeats: typeof data.defaultSeats === 'number' ? data.defaultSeats : 10,
    minSeats: typeof data.minSeats === 'number' ? data.minSeats : 1,
    maxSeats: typeof data.maxSeats === 'number' ? data.maxSeats : null,
    trialEligible: data.trialEligible !== undefined ? Boolean(data.trialEligible) : true,
    trialDurationDays: typeof data.trialDurationDays === 'number' ? data.trialDurationDays : 14,
    isCustom: Boolean(data.isCustom),
    initialPrices: Array.isArray(data.initialPrices) ? (data.initialPrices as any) : undefined,
    entitlements: Array.isArray(data.entitlements) ? (data.entitlements as any) : undefined,
  };
}

export function validateUpdatePlan(body: unknown): UpdatePlanDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  return {
    name: data.name ? String(data.name).trim() : undefined,
    description: data.description !== undefined ? String(data.description).trim() : undefined,
    tier: data.tier ? (String(data.tier).trim() as PlanTier) : undefined,
    status: data.status ? (String(data.status).trim() as PlanStatus) : undefined,
    defaultSeats: typeof data.defaultSeats === 'number' ? data.defaultSeats : undefined,
    minSeats: typeof data.minSeats === 'number' ? data.minSeats : undefined,
    maxSeats: typeof data.maxSeats === 'number' || data.maxSeats === null ? data.maxSeats : undefined,
    trialEligible: data.trialEligible !== undefined ? Boolean(data.trialEligible) : undefined,
    trialDurationDays: typeof data.trialDurationDays === 'number' ? data.trialDurationDays : undefined,
  };
}

export function validateCreatePlanPrice(body: unknown): CreatePlanPriceDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.currency || typeof data.currency !== 'string') {
    errors.currency = 'Currency is required';
  }
  if (!data.billingInterval || !['monthly', 'annual', 'quarterly', 'custom'].includes(String(data.billingInterval))) {
    errors.billingInterval = 'billingInterval must be monthly, annual, quarterly, or custom';
  }
  if (typeof data.amountMinorUnits !== 'number' || data.amountMinorUnits < 0) {
    errors.amountMinorUnits = 'amountMinorUnits must be a non-negative number';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    id: typeof data.id === 'string' ? data.id.trim() : undefined,
    currency: String(data.currency).trim().toUpperCase(),
    billingInterval: data.billingInterval as BillingInterval,
    amountMinorUnits: data.amountMinorUnits as number,
    effectiveFrom: data.effectiveFrom ? new Date(String(data.effectiveFrom)) : undefined,
    effectiveTo: data.effectiveTo ? new Date(String(data.effectiveTo)) : null,
    status: data.status ? (String(data.status) as 'active' | 'deprecated') : 'active',
  };
}

export function validateUpdatePlanPrice(body: unknown): UpdatePlanPriceDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  return {
    amountMinorUnits: typeof data.amountMinorUnits === 'number' ? data.amountMinorUnits : undefined,
    status: data.status ? (String(data.status) as 'active' | 'deprecated') : undefined,
    effectiveTo: data.effectiveTo !== undefined ? (data.effectiveTo ? new Date(String(data.effectiveTo)) : null) : undefined,
  };
}

export function parsePlanFilter(query: Record<string, unknown>): PlanFilter {
  return {
    applicationCode: query.applicationCode ? (String(query.applicationCode) as ApplicationCode) : undefined,
    status: query.status ? (String(query.status) as PlanStatus) : undefined,
    tier: query.tier ? String(query.tier) : undefined,
    search: query.search ? String(query.search) : undefined,
  };
}
