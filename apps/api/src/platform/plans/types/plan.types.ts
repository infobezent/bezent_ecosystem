export type ApplicationCode = 'hrms' | 'crm' | 'project_management';
export type PlanStatus = 'active' | 'deprecated' | 'draft';
export type BillingInterval = 'monthly' | 'annual' | 'quarterly' | 'custom';
export type PlanTier = 'starter' | 'growth' | 'enterprise' | string;

export interface PlanPriceItem {
  id: string;
  planId: string;
  currency: string;
  billingInterval: BillingInterval;
  amountMinorUnits: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: 'active' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanEntitlementItem {
  id: string;
  planId: string;
  applicationCode: ApplicationCode;
  moduleCode: string;
  isEnabled: boolean;
  limits: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanDetailRecord {
  id: string;
  applicationCode: ApplicationCode;
  code: string;
  name: string;
  description: string | null;
  tier: PlanTier;
  status: PlanStatus;
  version: number;
  defaultSeats: number;
  minSeats: number;
  maxSeats: number | null;
  trialEligible: boolean;
  trialDurationDays: number;
  isCustom: boolean;
  prices: PlanPriceItem[];
  entitlements: PlanEntitlementItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFilter {
  applicationCode?: ApplicationCode;
  status?: PlanStatus;
  tier?: string;
  search?: string;
}

export interface CreatePlanDto {
  id?: string;
  applicationCode: ApplicationCode;
  code: string;
  name: string;
  description?: string;
  tier: PlanTier;
  status?: PlanStatus;
  defaultSeats?: number;
  minSeats?: number;
  maxSeats?: number | null;
  trialEligible?: boolean;
  trialDurationDays?: number;
  isCustom?: boolean;
  initialPrices?: Array<{
    currency: string;
    billingInterval: BillingInterval;
    amountMinorUnits: number;
    isApproved?: boolean;
  }>;
  entitlements?: Array<{
    moduleCode: string;
    isEnabled?: boolean;
    limits?: Record<string, unknown>;
  }>;
}

export interface UpdatePlanDto {
  name?: string;
  description?: string;
  tier?: PlanTier;
  status?: PlanStatus;
  defaultSeats?: number;
  minSeats?: number;
  maxSeats?: number | null;
  trialEligible?: boolean;
  trialDurationDays?: number;
}

export interface CreatePlanPriceDto {
  id?: string;
  currency: string;
  billingInterval: BillingInterval;
  amountMinorUnits: number;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  status?: 'active' | 'deprecated';
}

export interface UpdatePlanPriceDto {
  amountMinorUnits?: number;
  status?: 'active' | 'deprecated';
  effectiveTo?: Date | null;
}
