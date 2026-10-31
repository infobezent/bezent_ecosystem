/** `custom` may appear on legacy records but cannot be chosen in V1. */
export type PolicyScope = 'company' | 'department' | 'location' | 'employment_type' | 'custom';
export type PolicyScopeV1 = Exclude<PolicyScope, 'custom'>;

export type PolicyStatus = 'draft' | 'active' | 'scheduled' | 'archived';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export interface PolicyEntitlement {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  isTracked: boolean;
  /** null = unlimited (untracked types only). */
  annualQuota: number | null;
  maxPerYearOverride: number | null;
}

export interface LeavePolicyItem {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  description: string | null;
  status: PolicyStatus;
  scope: PolicyScope;
  scopeId: string | null;
  scopeName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  /** Deprecated mirror of `entitlements`; kept for read compatibility. */
  linkedLeaveTypeIds: string[];
  entitlements: PolicyEntitlement[];
  priority: number;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEntitlementInput {
  leaveTypeId: string;
  annualQuota: number | null;
  maxPerYearOverride?: number | null;
}

export interface CreateLeavePolicyDto {
  name: string;
  code: string;
  description?: string;
  status?: PolicyStatus;
  scope?: PolicyScopeV1;
  scopeId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  entitlements?: PolicyEntitlementInput[];
  priority?: number;
}

export type UpdateLeavePolicyDto = Partial<CreateLeavePolicyDto>;

export interface LeavePoliciesSummary {
  total: number;
  active: number;
  draft: number;
  scheduled: number;
  archived: number;
  employeesWithoutPolicy: number;
}

export interface LeavePoliciesListResponse {
  items: LeavePolicyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: LeavePoliciesSummary;
}

/** Options for the scope picker. */
export interface PolicyScopeOptions {
  departments: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
}
