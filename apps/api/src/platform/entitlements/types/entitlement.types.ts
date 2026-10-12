import type { ApplicationCode } from '../../plans/types/plan.types.js';

export type { ApplicationCode };

export type OverrideType = 'enable' | 'disable' | 'limit';

export interface EntitlementOverrideRecord {
  id: string;
  tenantId: string;
  companyId: string | null;
  applicationCode: ApplicationCode;
  moduleCode: string;
  overrideType: OverrideType;
  overrideValue: Record<string, unknown> | null;
  reason: string;
  authorizedByUserId: string;
  validFrom: Date;
  validUntil: Date | null;
  revokedAt: Date | null;
  revokedByUserId: string | null;
  revocationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EffectiveModuleEntitlement {
  moduleCode: string;
  isEnabled: boolean;
  source: 'plan' | 'override' | 'legacy';
  limits?: Record<string, unknown> | null;
  overrideReason?: string | null;
}

export interface EffectiveEntitlementResult {
  tenantId: string;
  companyId: string | null;
  applicationCode: ApplicationCode;
  isEntitled: boolean;
  source: 'commercial_subscription' | 'override' | 'legacy_fallback' | 'none';
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  planId?: string | null;
  planName?: string | null;
  licensedSeats?: number;
  modules: EffectiveModuleEntitlement[];
}

export interface CreateOverrideDto {
  tenantId: string;
  companyId?: string | null;
  applicationCode: ApplicationCode;
  moduleCode: string;
  overrideType: OverrideType;
  overrideValue?: Record<string, unknown>;
  reason: string;
  validUntil?: Date | string | null;
}

export interface RevokeOverrideDto {
  reason: string;
}

export interface MismatchItem {
  moduleCode: string;
  commercialStatus: 'enabled' | 'disabled' | 'not_in_plan';
  legacyStatus: 'enabled' | 'disabled' | 'missing';
  mismatchType: 'commercial_without_legacy' | 'legacy_without_commercial' | 'status_conflict';
  recommendedAction: string;
}

export interface ReconciliationReport {
  tenantId: string;
  applicationCode: ApplicationCode;
  hasCommercialSubscription: boolean;
  commercialSubscriptionStatus?: string;
  commercialPlanId?: string | null;
  commercialPlanName?: string | null;
  commercialModules: string[];
  legacyModules: string[];
  activeOverrides: string[];
  mismatches: MismatchItem[];
  reconciledAt: Date;
}
