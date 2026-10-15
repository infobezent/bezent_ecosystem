/**
 * BEZENT HRMS — Comp-Off Management Domain Types & Models (V1.0)
 *
 * Implements typed, tenant/company-scoped domain entities for:
 * - Comp-Off Policies and effective-dated policy versions
 * - Comp-Off Earning Requests
 * - Comp-Off Eligibility Context & Deterministic Calculation
 * - Approved Entitlements Register
 * - Leave Module Handoff Contract
 * - Double Benefit Prevention (Overtime vs Comp-Off allocation accounting)
 * - Immutable Audits
 */

import type {
  AttendanceCompOffPolicy,
  NewAttendanceCompOffPolicy,
  AttendanceCompOffRequest,
  NewAttendanceCompOffRequest,
  AttendanceCompOffEntitlement,
  NewAttendanceCompOffEntitlement,
  AttendanceCompOffHandoff,
  NewAttendanceCompOffHandoff,
  AttendanceCompOffAudit,
  NewAttendanceCompOffAudit,
} from '../../../../db/schema.js';

export type {
  AttendanceCompOffPolicy,
  NewAttendanceCompOffPolicy,
  AttendanceCompOffRequest,
  NewAttendanceCompOffRequest,
  AttendanceCompOffEntitlement,
  NewAttendanceCompOffEntitlement,
  AttendanceCompOffHandoff,
  NewAttendanceCompOffHandoff,
  AttendanceCompOffAudit,
  NewAttendanceCompOffAudit,
};

export type CompOffRoundingRule = 'exact' | 'round_down_half_day' | 'round_nearest_half_day';

export type CompOffRequestStatus =
  'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';

export type CompOffEntitlementStatus =
  | 'active'
  | 'pending_handoff'
  | 'credited_to_leave'
  | 'partially_utilized'
  | 'fully_utilized'
  | 'expired'
  | 'reversed';

export type CompOffHandoffStatus =
  'pending_handoff' | 'acknowledged' | 'credited' | 'rejected' | 'failed' | 'reversed';

export type CompOffDayType = 'regular' | 'weekly_off' | 'holiday';

export interface CompOffSourceInterval {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  intervalType?: 'shift_extension' | 'holiday_work' | 'off_day_work';
}

export interface CompOffEvidenceAttachment {
  name: string;
  url: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface CompOffWorkdayContext {
  workDate: string;
  dayType: CompOffDayType;
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  isMissingPunch: boolean;
  isRegularized: boolean;
  hasApprovedOd: boolean;
  odMinutes: number;
  hasOvertimeAllocation?: boolean;
  allocatedOvertimeMinutes?: number;
  allocatedOvertimeType?: 'payable' | 'comp_off';
  employeeEmploymentType?: string;
  employeeDepartmentId?: string;
  priorMonthlyEarnedDays?: number;
  shiftScheduleRef?: string | null;
}

export interface CompOffCalculationResult {
  actualWorkedMinutes: number;
  qualifyingWorkedMinutes: number;
  eligibleCreditDays: number; // 0, 0.5, or 1.0
  eligibleCreditMinutes: number; // e.g. 240 or 480
  isEligible: boolean;
  nonEligibilityReason?: string;
  appliedThreshold?: 'half_day' | 'full_day';
  roundingAdjustmentDays?: number;
  complianceNotes?: string[];
  requiresComplianceReview?: boolean;
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
  dayType: CompOffDayType;
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
  evidenceAttachments: CompOffEvidenceAttachment[];
  status: CompOffRequestStatus;
  currentStage: string;
  assignedTo: string | null;
  assignedToName?: string | null;
  assignedAt: string | Date | null;
  assignedRole: string | null;
  submittedAt: string | Date | null;
  submittedByUserId: string | null;
  submittedByUserName?: string | null;
  reviewedByUserId: string | null;
  reviewedByUserName?: string | null;
  reviewedAt: string | Date | null;
  reviewDecision: 'approved' | 'rejected' | null;
  reviewNotes: string | null;
  cancellationReason: string | null;
  withdrawalReason: string | null;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  status: CompOffEntitlementStatus;
  sourceOvertimeSettlementId: string | null;
  handoffId: string | null;
  creditedLeaveBalanceId: string | null;
  reversalReason: string | null;
  reversedByUserId: string | null;
  reversedByUserName?: string | null;
  reversedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  status: CompOffHandoffStatus;
  payload: Record<string, unknown>;
  retryCount: number;
  lastAttemptAt: string | Date | null;
  responseDetails: Record<string, unknown> | null;
  acknowledgedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  createdAt: string | Date;
}

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

export interface CreateCompOffRequestInput {
  employeeId: string;
  workDate: string;
  dayType?: CompOffDayType;
  requestedCreditDays: number; // 0.5 or 1.0
  reason: string;
  locationOrSite?: string;
  taskOrProject?: string;
  sourceIntervals?: CompOffSourceInterval[];
  evidenceAttachments?: CompOffEvidenceAttachment[];
}

export interface DecideCompOffRequestInput {
  decision: 'approved' | 'rejected';
  approvedCreditDays?: number;
  reviewNotes?: string;
  expectedVersion?: number;
}

export interface CompOffFilterQuery {
  employeeId?: string;
  departmentId?: string;
  status?: CompOffRequestStatus | 'all';
  startDate?: string;
  endDate?: string;
  workDate?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'workDate' | 'createdAt' | 'requestedCreditDays' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CompOffEntitlementFilterQuery {
  id?: string;
  employeeId?: string;
  status?: CompOffEntitlementStatus | 'all';
  page?: number;
  limit?: number;
}

export interface CompOffHandoffFilterQuery {
  employeeId?: string;
  status?: CompOffHandoffStatus | 'all';
  page?: number;
  limit?: number;
}
