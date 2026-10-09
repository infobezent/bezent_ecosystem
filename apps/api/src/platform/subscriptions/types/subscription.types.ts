import type { ApplicationCode } from '../../plans/types/plan.types.js';

export type SubscriptionStatus =
  | 'pending_activation'
  | 'active'
  | 'trial'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export type AccessMode = 'trial' | 'paid';
export type BillingCycle = 'monthly' | 'annual' | 'quarterly' | 'custom';

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  companyId: string | null;
  applicationCode: ApplicationCode;
  planId: string;
  status: SubscriptionStatus;
  accessMode: AccessMode;
  billingCycle: BillingCycle;
  licensedSeats: number;
  scheduledActivationAt: Date | null;
  activatedAt: Date | null;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStartsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  renewsAt: Date | null;
  autoRenew: boolean;
  version: number;
  activeSubscriptionScope: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionDetailRecord extends SubscriptionRecord {
  planName: string;
  planCode: string;
  planTier: string;
  currentSeatsUsed: number;
}

export interface SubscriptionFilter {
  tenantId?: string;
  applicationCode?: ApplicationCode;
  status?: SubscriptionStatus;
}

export interface CreateSubscriptionDto {
  id?: string;
  tenantId: string;
  companyId?: string | null;
  applicationCode: ApplicationCode;
  planId: string;
  accessMode: AccessMode;
  billingCycle?: BillingCycle;
  licensedSeats?: number;
  scheduledActivationAt?: Date | string | null;
  autoRenew?: boolean;
  currency?: string;
  commercialAgreementNotes?: string;
}

export interface UpdateSubscriptionDto {
  licensedSeats?: number;
  autoRenew?: boolean;
  billingCycle?: BillingCycle;
}

export interface CancelSubscriptionDto {
  reason: string;
}

export interface RenewSubscriptionDto {
  periodDays?: number;
}
