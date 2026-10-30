/**
 * BEZENT HRMS — Comp-Off Management API Client (V1.0)
 *
 * REST client for Compensatory Off (Comp-Off) Management:
 * - Overview metrics
 * - Workday eligibility & qualifying minutes evaluation
 * - Earning requests list, detail, submit, withdraw, cancel
 * - Manager & HR approval queue & decision
 * - Approved entitlements register & reversal
 * - Canonical Leave credit handoff ledger & retry
 * - Overtime settlement to Comp-Off conversion
 * - Comp-Off policies catalog
 */

import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

export interface CompOffOverviewMetrics {
  totalRequests: number;
  pendingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalEarnedDays: number;
  pendingHandoffCount: number;
  creditedLeaveCount: number;
  activeEntitlementsCount: number;
}

export interface CompOffSourceInterval {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  intervalType?: string;
}

export interface CompOffRequestItem {
  id: string;
  requestNumber: string;
  tenantId: string;
  companyId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  workDate: string;
  dayType: 'regular' | 'weekly_off' | 'holiday';
  sourceRecordType: string;
  sourceRecordId: string | null;
  policyId: string | null;
  policyName?: string | null;
  policyVersion: number;
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  qualifyingWorkedMinutes: number;
  requestedCreditDays: number;
  approvedCreditDays: number;
  sourceIntervals: CompOffSourceInterval[];
  reason: string;
  locationOrSite: string | null;
  taskOrProject: string | null;
  evidenceAttachments: Array<{
    name: string;
    url?: string;
    sizeBytes?: number;
  }>;
  status:
    | 'draft'
    | 'submitted'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'withdrawn'
    | 'cancelled';
  currentStage: string;
  assignedTo: string | null;
  assignedToName?: string | null;
  assignedAt: string | null;
  assignedRole: string | null;
  submittedAt: string | null;
  submittedByUserId: string | null;
  submittedByUserName?: string | null;
  reviewedByUserId: string | null;
  reviewedByUserName?: string | null;
  reviewedAt: string | null;
  reviewDecision: 'approved' | 'rejected' | null;
  reviewNotes: string | null;
  cancellationReason: string | null;
  withdrawalReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompOffEntitlementItem {
  id: string;
  tenantId: string;
  companyId: string;
  requestId: string;
  requestNumber?: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  workDate: string;
  earnedDays: number;
  earnedMinutes: number;
  validFrom: string;
  expiresAt: string;
  status:
    | 'active'
    | 'pending_handoff'
    | 'credited_to_leave'
    | 'partially_utilized'
    | 'fully_utilized'
    | 'expired'
    | 'reversed';
  sourceOvertimeSettlementId: string | null;
  handoffId: string | null;
  creditedLeaveBalanceId: string | null;
  reversalReason: string | null;
  reversedByUserId: string | null;
  reversedByUserName?: string | null;
  reversedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompOffHandoffItem {
  id: string;
  tenantId: string;
  companyId: string;
  entitlementId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  idempotencyKey: string;
  creditDays: number;
  creditMinutes: number;
  leaveTypeCode: string;
  validFrom: string;
  validUntil: string;
  status: 'pending_handoff' | 'transmitted' | 'acknowledged' | 'failed' | 'reversed';
  payload: Record<string, unknown>;
  retryCount: number;
  lastAttemptAt: string | null;
  responseDetails: Record<string, unknown> | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompOffAuditItem {
  id: string;
  tenantId: string;
  companyId: string;
  requestId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  performedByUserId: string;
  performedByUserName?: string | null;
  performedByRole: string | null;
  details: Record<string, unknown> | null;
  clientIp: string | null;
  createdAt: string;
}

export interface CompOffPolicyItem {
  id: string;
  policyName: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  effectiveFrom: string;
  effectiveTo: string | null;
  isEnabled: boolean;
  eligibleEmploymentTypes: string[];
  eligibleDepartments: string[];
  eligibleWorkdayScenarios: {
    weeklyOff?: boolean;
    holiday?: boolean;
    approvedExtraWork?: boolean;
  };
  minimumQualifyingMinutes: number;
  halfDayThresholdMinutes: number;
  fullDayThresholdMinutes: number;
  conversionRate: string | number;
  roundingRule: string;
  submissionDeadlineDays: number;
  approvalRouting: string;
  validityDays: number;
  maxEarningLimitPerMonthDays: string | number;
  allowCarryForward: boolean;
  isActive: boolean;
}

export interface CompOffEligibilityCalculation {
  actualWorkedMinutes: number;
  qualifyingWorkedMinutes: number;
  eligibleCreditDays: number;
  eligibleCreditMinutes: number;
  isEligible: boolean;
  appliedThreshold?: 'half_day' | 'full_day';
  nonEligibilityReason?: string;
  complianceNotes?: string[];
}

export interface CompOffWorkdayContextInfo {
  workDate: string;
  dayType: 'regular' | 'weekly_off' | 'holiday';
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  isMissingPunch: boolean;
  isRegularized: boolean;
  hasApprovedOd: boolean;
  odMinutes: number;
  hasOvertimeAllocation: boolean;
  allocatedOvertimeMinutes: number;
  employeeEmploymentType: string;
  employeeDepartmentId?: string;
  priorMonthlyEarnedDays: number;
  shiftScheduleRef: string | null;
}

interface ApiResponseEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  error?: {
    message?: string;
    code?: string;
  };
}

function normalizePagedList<T>(
  body:
    | ApiResponseEnvelope<T[] | { items?: T[]; total?: number; page?: number; limit?: number }>
    | null
    | undefined,
  fallbackLimit = 20,
): { items: T[]; total: number; page: number; limit: number } {
  if (Array.isArray(body?.data)) {
    return {
      items: body.data,
      total: typeof body.pagination?.total === 'number' ? body.pagination.total : body.data.length,
      page: typeof body.pagination?.page === 'number' ? body.pagination.page : 1,
      limit: typeof body.pagination?.limit === 'number' ? body.pagination.limit : fallbackLimit,
    };
  }
  if (
    body?.data &&
    typeof body.data === 'object' &&
    'items' in body.data &&
    Array.isArray((body.data as { items: T[] }).items)
  ) {
    const dataObj = body.data as { items: T[]; total?: number; page?: number; limit?: number };
    return {
      items: dataObj.items,
      total: typeof dataObj.total === 'number' ? dataObj.total : dataObj.items.length,
      page: typeof dataObj.page === 'number' ? dataObj.page : 1,
      limit: typeof dataObj.limit === 'number' ? dataObj.limit : fallbackLimit,
    };
  }
  return {
    items: [],
    total: 0,
    page: 1,
    limit: fallbackLimit,
  };
}

function handleApiError(
  res: Response,
  body: ApiResponseEnvelope | null | undefined,
  fallbackMessage: string,
): never {
  if (res.status === 403) {
    throw new Error(
      body?.error?.message ??
        'Access denied: You do not have permission to access Comp-Off resources (403 Forbidden).',
    );
  }
  if (res.status === 401) {
    throw new Error(
      body?.error?.message ??
        'Authentication required. Please sign in to access Comp-Off resources (401 Unauthorized).',
    );
  }
  throw new Error(body?.error?.message ?? `${fallbackMessage}: ${res.status}`);
}

/**
 * Fetch Comp-Off Overview Metrics
 */
export async function fetchCompOffOverview(params?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  employeeId?: string;
}): Promise<CompOffOverviewMetrics> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.employeeId) query.set('employeeId', params.employeeId);

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/overview${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<CompOffOverviewMetrics> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffOverviewMetrics>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to fetch Comp-Off overview');
  }
  return body.data;
}

/**
 * Check Comp-Off Eligibility for an Employee on a specific work date
 */
export async function checkCompOffEligibility(
  employeeId: string,
  workDate: string,
): Promise<{
  context: CompOffWorkdayContextInfo;
  policy: CompOffPolicyItem | null;
  calculation: CompOffEligibilityCalculation;
}> {
  const query = new URLSearchParams({ employeeId, workDate });
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/eligibility?${query.toString()}`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<{
    context: CompOffWorkdayContextInfo;
    policy: CompOffPolicyItem | null;
    calculation: CompOffEligibilityCalculation;
  }> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<{
      context: CompOffWorkdayContextInfo;
      policy: CompOffPolicyItem | null;
      calculation: CompOffEligibilityCalculation;
    }>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Eligibility evaluation failed');
  }
  return body.data;
}

/**
 * Fetch Comp-Off Requests Catalog
 */
export async function fetchCompOffRequests(filter?: {
  status?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: CompOffRequestItem[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (filter?.status && filter.status !== 'all') query.set('status', filter.status);
  if (filter?.employeeId) query.set('employeeId', filter.employeeId);
  if (filter?.startDate) query.set('startDate', filter.startDate);
  if (filter?.endDate) query.set('endDate', filter.endDate);
  if (filter?.search) query.set('search', filter.search);
  if (filter?.page) query.set('page', String(filter.page));
  if (filter?.limit) query.set('limit', String(filter.limit));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/requests${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<
    | CompOffRequestItem[]
    | { items?: CompOffRequestItem[]; total?: number; page?: number; limit?: number }
  > | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<
      | CompOffRequestItem[]
      | { items?: CompOffRequestItem[]; total?: number; page?: number; limit?: number }
    >;
  } catch {
    body = null;
  }
  if (!res.ok) {
    handleApiError(res, body, 'Failed to fetch Comp-Off requests');
  }
  return normalizePagedList<CompOffRequestItem>(body, filter?.limit ?? 20);
}

/**
 * Fetch Request Detail with Audit Trail
 */
export async function fetchCompOffRequestDetail(
  id: string,
): Promise<CompOffRequestItem & { audits: CompOffAuditItem[] }> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/requests/${id}`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<CompOffRequestItem & { audits?: CompOffAuditItem[] }> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<
      CompOffRequestItem & { audits?: CompOffAuditItem[] }
    >;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to fetch request detail');
  }
  return {
    ...body.data,
    audits: Array.isArray(body.data.audits) ? body.data.audits : [],
  };
}

/**
 * Submit Comp-Off Earning Claim
 */
export async function createCompOffRequest(payload: {
  employeeId: string;
  workDate: string;
  requestedCreditDays: number;
  reason: string;
  locationOrSite?: string;
  taskOrProject?: string;
  sourceIntervals?: CompOffSourceInterval[];
}): Promise<CompOffRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/requests`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body: ApiResponseEnvelope<CompOffRequestItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffRequestItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to submit Comp-Off claim');
  }
  return body.data;
}

/**
 * Withdraw Comp-Off Request
 */
export async function withdrawCompOffRequest(
  id: string,
  reason: string,
): Promise<CompOffRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/requests/${id}/withdraw`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  let body: ApiResponseEnvelope<CompOffRequestItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffRequestItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to withdraw Comp-Off claim');
  }
  return body.data;
}

/**
 * Cancel Comp-Off Request
 */
export async function cancelCompOffRequest(
  id: string,
  reason: string,
): Promise<CompOffRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/requests/${id}/cancel`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  let body: ApiResponseEnvelope<CompOffRequestItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffRequestItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to cancel Comp-Off claim');
  }
  return body.data;
}

/**
 * Fetch Reviewer Approval Queue
 */
export async function fetchCompOffApprovalQueue(): Promise<CompOffRequestItem[]> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/approvals`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<CompOffRequestItem[] | { items?: CompOffRequestItem[] }> | null =
    null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<
      CompOffRequestItem[] | { items?: CompOffRequestItem[] }
    >;
  } catch {
    body = null;
  }
  if (!res.ok) {
    handleApiError(res, body, 'Failed to fetch approval queue');
  }
  if (Array.isArray(body?.data)) {
    return body.data;
  }
  if (
    body?.data &&
    typeof body.data === 'object' &&
    'items' in body.data &&
    Array.isArray((body.data as { items: CompOffRequestItem[] }).items)
  ) {
    return (body.data as { items: CompOffRequestItem[] }).items;
  }
  return [];
}

/**
 * Decide (Approve / Reject) Comp-Off Request
 */
export async function decideCompOffRequest(
  id: string,
  payload: {
    decision: 'approved' | 'rejected';
    approvedCreditDays?: number;
    reviewNotes?: string;
    expectedVersion?: number;
  },
): Promise<CompOffRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/requests/${id}/decision`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body: ApiResponseEnvelope<CompOffRequestItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffRequestItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Review decision failed');
  }
  return body.data;
}

/**
 * List Approved Comp-Off Entitlements
 */
export async function fetchCompOffEntitlements(filter?: {
  employeeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: CompOffEntitlementItem[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (filter?.employeeId) query.set('employeeId', filter.employeeId);
  if (filter?.status && filter.status !== 'all') query.set('status', filter.status);
  if (filter?.page) query.set('page', String(filter.page));
  if (filter?.limit) query.set('limit', String(filter.limit));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/entitlements${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<
    | CompOffEntitlementItem[]
    | { items?: CompOffEntitlementItem[]; total?: number; page?: number; limit?: number }
  > | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<
      | CompOffEntitlementItem[]
      | { items?: CompOffEntitlementItem[]; total?: number; page?: number; limit?: number }
    >;
  } catch {
    body = null;
  }
  if (!res.ok) {
    handleApiError(res, body, 'Failed to fetch entitlements');
  }
  return normalizePagedList<CompOffEntitlementItem>(body, filter?.limit ?? 20);
}

/**
 * Reverse an Entitlement
 */
export async function reverseCompOffEntitlement(
  id: string,
  reversalReason: string,
): Promise<CompOffEntitlementItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/entitlements/${id}/reverse`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reversalReason }),
  });
  let body: ApiResponseEnvelope<CompOffEntitlementItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffEntitlementItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to reverse entitlement');
  }
  return body.data;
}

/**
 * Trigger Comp-Off Auto-Lapse Background Sweep
 */
export async function triggerCompOffAutoLapse(): Promise<{ lapsedCount: number }> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/entitlements/auto-lapse`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  let body: ApiResponseEnvelope<{ lapsedCount: number }> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<{ lapsedCount: number }>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to trigger comp-off auto-lapse');
  }
  return body.data;
}

/**
 * List Leave Handoff Contract Records
 */
export async function fetchCompOffHandoffs(filter?: {
  employeeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: CompOffHandoffItem[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (filter?.employeeId) query.set('employeeId', filter.employeeId);
  if (filter?.status && filter.status !== 'all') query.set('status', filter.status);
  if (filter?.page) query.set('page', String(filter.page));
  if (filter?.limit) query.set('limit', String(filter.limit));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/handoffs${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<
    | CompOffHandoffItem[]
    | { items?: CompOffHandoffItem[]; total?: number; page?: number; limit?: number }
  > | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<
      | CompOffHandoffItem[]
      | { items?: CompOffHandoffItem[]; total?: number; page?: number; limit?: number }
    >;
  } catch {
    body = null;
  }
  if (!res.ok) {
    handleApiError(res, body, 'Failed to fetch handoff ledger');
  }
  return normalizePagedList<CompOffHandoffItem>(body, filter?.limit ?? 20);
}

/**
 * Convert an Overtime settlement with allocationType = comp_off to an Entitlement
 */
export async function convertOvertimeSettlementToCompOff(
  settlementId: string,
): Promise<CompOffEntitlementItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/from-overtime/${settlementId}`;
  const res = await authorizedFetch(url, {
    method: 'POST',
  });
  let body: ApiResponseEnvelope<CompOffEntitlementItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffEntitlementItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to convert overtime settlement');
  }
  return body.data;
}

/**
 * List Comp-Off Policies
 */
export async function fetchCompOffPolicies(status?: string): Promise<CompOffPolicyItem[]> {
  const query = new URLSearchParams();
  if (status && status !== 'all') query.set('status', status);

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/policies${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<CompOffPolicyItem[] | { items?: CompOffPolicyItem[] }> | null =
    null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<
      CompOffPolicyItem[] | { items?: CompOffPolicyItem[] }
    >;
  } catch {
    body = null;
  }
  if (!res.ok) {
    handleApiError(res, body, 'Failed to fetch policies');
  }
  if (Array.isArray(body?.data)) {
    return body.data;
  }
  if (
    body?.data &&
    typeof body.data === 'object' &&
    'items' in body.data &&
    Array.isArray((body.data as { items: CompOffPolicyItem[] }).items)
  ) {
    return (body.data as { items: CompOffPolicyItem[] }).items;
  }
  return [];
}

/**
 * Fetch Request Audits
 */
export async function fetchCompOffAudits(requestId: string): Promise<CompOffAuditItem[]> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/requests/${requestId}/audits`;
  const res = await authorizedFetch(url);
  let body: ApiResponseEnvelope<CompOffAuditItem[]> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffAuditItem[]>;
  } catch {
    body = null;
  }
  if (!res.ok) {
    handleApiError(res, body, 'Failed to fetch audits');
  }
  return Array.isArray(body?.data) ? body.data : [];
}

/**
 * Create Comp-Off Policy
 */
export async function createCompOffPolicy(
  payload: Partial<CompOffPolicyItem>,
): Promise<CompOffPolicyItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/policies`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body: ApiResponseEnvelope<CompOffPolicyItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffPolicyItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to create comp-off policy');
  }
  return body.data;
}

/**
 * Update Comp-Off Policy
 */
export async function updateCompOffPolicy(
  id: string,
  payload: Partial<CompOffPolicyItem>,
): Promise<CompOffPolicyItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/comp-off/policies/${id}`;
  const res = await authorizedFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body: ApiResponseEnvelope<CompOffPolicyItem> | null = null;
  try {
    body = (await res.json()) as ApiResponseEnvelope<CompOffPolicyItem>;
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    handleApiError(res, body, 'Failed to update comp-off policy');
  }
  return body.data;
}
