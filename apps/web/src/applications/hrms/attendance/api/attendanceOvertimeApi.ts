/**
 * BEZENT HRMS — Overtime API Client (V1.0)
 *
 * REST client for Overtime Management:
 * - Overview metrics
 * - Eligibility checks
 * - Requests list, detail, create, withdraw, cancel
 * - Approval decisions
 * - Settlement allocations & reversals
 * - Policy management
 */

import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

export interface OvertimeOverviewMetrics {
  totalRequests: number;
  pendingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalRequestedMinutes: number;
  totalApprovedMinutes: number;
  totalAllocatedPayableMinutes: number;
  totalAllocatedCompOffMinutes: number;
  unallocatedApprovedMinutes: number;
  pendingHandoffCount: number;
}

export interface OvertimeRequestItem {
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
  extraWorkedMinutes: number;
  eligibleOtMinutes: number;
  requestedOtMinutes: number;
  approvedOtMinutes: number;
  allocatedPayableMinutes: number;
  allocatedCompOffMinutes: number;
  unallocatedMinutes: number;
  sourceIntervals: Array<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
    intervalType?: string;
  }>;
  reason: string;
  locationOrSite: string | null;
  taskOrProject: string | null;
  evidenceAttachments: Array<{
    name: string;
    url?: string;
    sizeBytes?: number;
    size?: string;
    uploadedAt?: string;
  }>;
  status:
    | 'draft'
    | 'submitted'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'withdrawn'
    | 'cancelled';
  settlementStatus:
    | 'unallocated'
    | 'partially_allocated'
    | 'fully_allocated'
    | 'pending_handoff'
    | 'settled'
    | 'reversal_pending'
    | 'reversed';
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

export interface OvertimeSettlementItem {
  id: string;
  tenantId: string;
  companyId: string;
  requestId: string;
  requestNumber?: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  workDate?: string;
  allocationType: 'payable' | 'comp_off';
  allocatedMinutes: number;
  status:
    'pending_handoff' | 'exported_to_payroll' | 'credited_to_comp_off' | 'reversed' | 'rejected';
  batchReference: string | null;
  allocatedByUserId: string | null;
  allocatedByUserName?: string | null;
  allocatedAt: string;
  notes: string | null;
  reversalReason: string | null;
  reversedByUserId: string | null;
  reversedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeAuditItem {
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

export interface OvertimePolicyItem {
  id: string;
  tenantId: string;
  companyId: string;
  policyName: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  description: string | null;
  scope: 'company' | 'department' | 'employee';
  scopeId: string | null;
  overridesPriority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isEnabled: boolean;
  eligibleEmploymentTypes: string[] | null;
  eligibleDepartments: string[] | null;
  workdayEligibility: { regularWorkday?: boolean; weeklyOff?: boolean; holiday?: boolean } | null;
  minimumQualifyingMinutes: number;
  dailyCapMinutes: number;
  weeklyCapMinutes: number;
  monthlyCapMinutes: number;
  roundingRule:
    'exact' | 'round_down_15' | 'round_nearest_15' | 'round_down_30' | 'round_nearest_30';
  requiresPreApproval: boolean;
  submissionWindowDays: number;
  allowPayable: boolean;
  allowCompOff: boolean;
  defaultSettlementPreference: 'payable' | 'comp_off';
  approvalHierarchy: string;
  statutoryRules: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeFilterParams {
  employeeId?: string;
  departmentId?: string;
  status?: string;
  settlementStatus?: string;
  startDate?: string;
  endDate?: string;
  workDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchOvertimeOverview(params?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  employeeId?: string;
}): Promise<OvertimeOverviewMetrics> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.employeeId) query.set('employeeId', params.employeeId);

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/overview${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch overview: ${res.status}`);
  }
  return body.data;
}

export interface OvertimeEligibilityCalculation {
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  extraWorkedMinutes: number;
  eligibleOtMinutes: number;
  isEligible: boolean;
  nonEligibilityReason?: string;
  roundingAdjustmentMinutes: number;
  cappedByDailyLimit?: boolean;
  cappedByWeeklyLimit?: boolean;
  cappedByMonthlyLimit?: boolean;
  cappedByQuarterlyLimit?: boolean;
}

export interface OvertimeWorkdayContextInfo {
  workDate: string;
  dayType: 'regular' | 'weekly_off' | 'holiday';
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  isMissingPunch: boolean;
  isRegularized: boolean;
  hasApprovedOd: boolean;
  odMinutes: number;
  employeeEmploymentType: string;
  employeeDepartmentId?: string;
  priorWeeklyApprovedMinutes: number;
  priorMonthlyApprovedMinutes: number;
}

export async function checkOvertimeEligibility(
  employeeId: string,
  workDate: string,
): Promise<{
  context: OvertimeWorkdayContextInfo;
  policy: OvertimePolicyItem | null;
  calculation: OvertimeEligibilityCalculation;
}> {
  const query = new URLSearchParams({ employeeId, workDate });
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/eligibility?${query.toString()}`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to check eligibility: ${res.status}`);
  }
  return body.data;
}

export async function fetchOvertimeRequests(
  params?: OvertimeFilterParams,
): Promise<{ items: OvertimeRequestItem[]; meta: { total: number; page: number; limit: number } }> {
  const query = new URLSearchParams();
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.status) query.set('status', params.status);
  if (params?.settlementStatus) query.set('settlementStatus', params.settlementStatus);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.workDate) query.set('workDate', params.workDate);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/requests${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch requests: ${res.status}`);
  }
  return {
    items: body.data,
    meta: body.meta ?? { total: body.data.length, page: 1, limit: 20 },
  };
}

export async function fetchOvertimeRequestDetail(id: string): Promise<
  OvertimeRequestItem & {
    settlements: OvertimeSettlementItem[];
    audits: OvertimeAuditItem[];
  }
> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/requests/${id}`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch request detail: ${res.status}`);
  }
  return body.data;
}

export async function createOvertimeRequest(payload: {
  employeeId: string;
  workDate: string;
  dayType?: 'regular' | 'weekly_off' | 'holiday';
  requestedOtMinutes: number;
  reason: string;
  locationOrSite?: string;
  taskOrProject?: string;
  sourceIntervals?: Array<{ startTime: string; endTime: string; durationMinutes: number }>;
  evidenceAttachments?: Array<{ name: string; url?: string; sizeBytes?: number }>;
}): Promise<OvertimeRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/requests`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to create overtime request: ${res.status}`);
  }
  return body.data;
}

export async function decideOvertimeRequest(
  id: string,
  payload: {
    decision: 'approved' | 'rejected';
    approvedOtMinutes?: number;
    reviewNotes?: string;
    expectedVersion?: number;
  },
): Promise<OvertimeRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/requests/${id}/decision`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to review overtime request: ${res.status}`);
  }
  return body.data;
}

export async function withdrawOvertimeRequest(
  id: string,
  reason: string,
): Promise<OvertimeRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/requests/${id}/withdraw`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to withdraw overtime request: ${res.status}`);
  }
  return body.data;
}

export async function cancelOvertimeRequest(
  id: string,
  reason: string,
): Promise<OvertimeRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/requests/${id}/cancel`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to cancel overtime request: ${res.status}`);
  }
  return body.data;
}

export async function allocateOvertimeSettlement(
  id: string,
  payload: {
    payableMinutes?: number;
    compOffMinutes?: number;
    notes?: string;
    batchReference?: string;
  },
): Promise<OvertimeRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/requests/${id}/settle`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to allocate settlement: ${res.status}`);
  }
  return body.data;
}

export async function fetchOvertimeSettlements(params?: {
  employeeId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: OvertimeSettlementItem[];
  meta: { total: number; page: number; limit: number };
}> {
  const query = new URLSearchParams();
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/settlements${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch settlements: ${res.status}`);
  }
  return {
    items: body.data,
    meta: body.meta ?? { total: body.data.length, page: 1, limit: 20 },
  };
}

export async function reverseOvertimeSettlement(
  settlementId: string,
  reversalReason: string,
): Promise<OvertimeRequestItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/settlements/${settlementId}/reverse`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reversalReason }),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to reverse settlement: ${res.status}`);
  }
  return body.data;
}

export async function fetchOvertimePolicies(): Promise<OvertimePolicyItem[]> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/policies`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch policies: ${res.status}`);
  }
  return body.data;
}

export async function fetchOvertimePolicyDetail(id: string): Promise<OvertimePolicyItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/policies/${id}`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch policy: ${res.status}`);
  }
  return body.data;
}

export async function createOvertimePolicy(
  payload: Partial<OvertimePolicyItem>,
): Promise<OvertimePolicyItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/policies`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to create overtime policy: ${res.status}`);
  }
  return body.data;
}

export async function updateOvertimePolicy(
  id: string,
  payload: Partial<OvertimePolicyItem>,
): Promise<OvertimePolicyItem> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overtime/policies/${id}`;
  const res = await authorizedFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update overtime policy: ${res.status}`);
  }
  return body.data;
}
