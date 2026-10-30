import type { LeavePolicyRecord } from '../../../../db/schema.js';

/** `custom` remains in the DB enum for later phases but is not accepted in V1 (Decision D3). */
export type PolicyScope = 'company' | 'department' | 'location' | 'employment_type' | 'custom';
export const POLICY_SCOPES_V1 = ['company', 'department', 'location', 'employment_type'] as const;
export type PolicyScopeV1 = (typeof POLICY_SCOPES_V1)[number];

export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export type PolicyStatus = 'draft' | 'active' | 'scheduled' | 'archived';
export const POLICY_STATUSES = ['draft', 'active', 'scheduled', 'archived'] as const;

/** Resolution order, most specific first (Decision D4). */
export const SCOPE_SPECIFICITY: Record<PolicyScope, number> = {
  employment_type: 4,
  location: 3,
  department: 2,
  company: 1,
  custom: 0,
};

export interface PolicyEntitlementInput {
  leaveTypeId: string;
  /** null = unlimited; only allowed for untracked leave types. */
  annualQuota?: number | null;
  maxPerYearOverride?: number | null;
}

export interface CreateLeavePolicyDto {
  name: string;
  code: string;
  description?: string;
  status?: PolicyStatus;
  scope?: PolicyScope;
  scopeId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  entitlements?: PolicyEntitlementInput[];
  priority?: number;
}

export type UpdateLeavePolicyDto = Partial<CreateLeavePolicyDto>;

export interface LeavePoliciesQuery {
  search?: string;
  status?: PolicyStatus | 'all';
  scope?: PolicyScope | 'all';
  page?: number;
  limit?: number;
}

export interface LeavePoliciesSummary {
  total: number;
  active: number;
  draft: number;
  scheduled: number;
  archived: number;
  /** Active employees with no policy in force today (they cannot apply for leave). */
  employeesWithoutPolicy: number;
}

export interface PolicyEntitlementView {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  isTracked: boolean;
  annualQuota: number | null;
  maxPerYearOverride: number | null;
}

export type LeavePolicyView = LeavePolicyRecord & { entitlements: PolicyEntitlementView[] };

export interface LeavePoliciesListResponse {
  items: LeavePolicyView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: LeavePoliciesSummary;
}

/** Org attributes used to resolve which policy applies to an employee. */
export interface PolicyResolutionSubject {
  departmentId: string | null;
  locationId: string | null;
  employmentType: EmploymentType;
}
