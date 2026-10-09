import { ValidationError } from '../../../app/errors/AppError.js';
import type {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  RenewSubscriptionDto,
  SubscriptionFilter,
  SubscriptionStatus,
  AccessMode,
  BillingCycle,
} from '../types/subscription.types.js';
import type { ApplicationCode } from '../../plans/types/plan.types.js';

export function validateCreateSubscription(body: unknown): CreateSubscriptionDto {
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
  if (!data.planId || typeof data.planId !== 'string') {
    errors.planId = 'planId is required';
  }
  if (!data.accessMode || !['trial', 'paid'].includes(String(data.accessMode))) {
    errors.accessMode = 'accessMode must be trial or paid';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    id: typeof data.id === 'string' ? data.id.trim() : undefined,
    tenantId: String(data.tenantId).trim(),
    companyId: data.companyId ? String(data.companyId).trim() : null,
    applicationCode: data.applicationCode as ApplicationCode,
    planId: String(data.planId).trim(),
    accessMode: data.accessMode as AccessMode,
    billingCycle: data.billingCycle ? (String(data.billingCycle) as BillingCycle) : 'monthly',
    licensedSeats: typeof data.licensedSeats === 'number' ? data.licensedSeats : undefined,
    scheduledActivationAt: data.scheduledActivationAt ? new Date(String(data.scheduledActivationAt)) : null,
    autoRenew: data.autoRenew !== undefined ? Boolean(data.autoRenew) : true,
    currency: data.currency ? String(data.currency).trim().toUpperCase() : 'USD',
    commercialAgreementNotes: data.commercialAgreementNotes ? String(data.commercialAgreementNotes).trim() : undefined,
  };
}

export function validateUpdateSubscription(body: unknown): UpdateSubscriptionDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  return {
    licensedSeats: typeof data.licensedSeats === 'number' ? data.licensedSeats : undefined,
    autoRenew: data.autoRenew !== undefined ? Boolean(data.autoRenew) : undefined,
    billingCycle: data.billingCycle ? (String(data.billingCycle) as BillingCycle) : undefined,
  };
}

export function validateCancelSubscription(body: unknown): CancelSubscriptionDto {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Invalid request body');
  }

  const data = body as Record<string, unknown>;
  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 3) {
    throw new ValidationError('Validation failed', { reason: 'Cancellation reason is required (min 3 chars)' });
  }

  return {
    reason: data.reason.trim(),
  };
}

export function validateRenewSubscription(body: unknown): RenewSubscriptionDto {
  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const data = body as Record<string, unknown>;
  return {
    periodDays: typeof data.periodDays === 'number' ? data.periodDays : undefined,
  };
}

export function parseSubscriptionFilter(query: Record<string, unknown>): SubscriptionFilter {
  return {
    tenantId: query.tenantId ? String(query.tenantId) : undefined,
    applicationCode: query.applicationCode ? (String(query.applicationCode) as ApplicationCode) : undefined,
    status: query.status ? (String(query.status) as SubscriptionStatus) : undefined,
  };
}
