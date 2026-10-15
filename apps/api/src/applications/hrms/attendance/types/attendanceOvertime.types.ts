/**
 * BEZENT HRMS — Overtime Domain Types & Models (V1.0)
 *
 * Implements typed, tenant/company-scoped domain entities for:
 * - Overtime Policies and effective-dated versions
 * - Overtime Requests
 * - Overtime Source Intervals / Evidence
 * - Overtime Approval Decisions
 * - Overtime Entitlements & Settlements
 * - Overtime Audits
 *
 * Enforces strict separation of minute metrics:
 * - scheduledMinutes
 * - actualWorkedMinutes
 * - extraWorkedMinutes
 * - eligibleOtMinutes
 * - requestedOtMinutes
 * - approvedOtMinutes
 * - allocatedPayableMinutes / allocatedCompOffMinutes
 */

import type {
  AttendanceOvertimePolicy,
  NewAttendanceOvertimePolicy,
  AttendanceOvertimeRequest,
  NewAttendanceOvertimeRequest,
  AttendanceOvertimeSettlement,
  NewAttendanceOvertimeSettlement,
  AttendanceOvertimeAudit,
  NewAttendanceOvertimeAudit,
} from '../../../../db/schema.js';

export type {
  AttendanceOvertimePolicy,
  NewAttendanceOvertimePolicy,
  AttendanceOvertimeRequest,
  NewAttendanceOvertimeRequest,
  AttendanceOvertimeSettlement,
  NewAttendanceOvertimeSettlement,
  AttendanceOvertimeAudit,
  NewAttendanceOvertimeAudit,
};

export type OvertimeRoundingRule =
  'exact' | 'round_down_15' | 'round_nearest_15' | 'round_down_30' | 'round_nearest_30';

export type OvertimeRequestStatus =
  'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';

export type OvertimeSettlementStatus =
  | 'unallocated'
  | 'partially_allocated'
  | 'fully_allocated'
  | 'pending_handoff'
  | 'settled'
  | 'reversal_pending'
  | 'reversed';

export type OvertimeDayType = 'regular' | 'weekly_off' | 'holiday';
export type OvertimeAllocationType = 'payable' | 'comp_off';
export type OvertimeSettlementRecordStatus =
  'pending_handoff' | 'exported_to_payroll' | 'credited_to_comp_off' | 'reversed' | 'rejected';

export interface OvertimeSourceInterval {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  intervalType?: 'before_shift' | 'after_shift' | 'break_work' | 'off_day_work' | 'holiday_work';
}

export interface OvertimeEvidenceAttachment {
  name: string;
  url: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface OvertimePolicyStatutoryRules {
  statutoryMaxDailyMinutes?: number;
  statutoryMaxWeeklyMinutes?: number;
  statutoryMaxMonthlyMinutes?: number;
  statutoryMaxQuarterlyMinutes?: number;
  statutoryJurisdiction?: string;
  isJurisdictionVerified?: boolean;
  requiresComplianceReview?: boolean;
  complianceLimitationNote?: string;
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
  dayType: OvertimeDayType;
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
  sourceIntervals: OvertimeSourceInterval[];
  reason: string;
  locationOrSite: string | null;
  taskOrProject: string | null;
  evidenceAttachments: OvertimeEvidenceAttachment[];
  status: OvertimeRequestStatus;
  settlementStatus: OvertimeSettlementStatus;
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
  allocationType: OvertimeAllocationType;
  allocatedMinutes: number;
  status:
    'pending_handoff' | 'exported_to_payroll' | 'credited_to_comp_off' | 'reversed' | 'rejected';
  batchReference: string | null;
  allocatedByUserId: string | null;
  allocatedByUserName?: string | null;
  allocatedAt: string | Date;
  notes: string | null;
  reversalReason: string | null;
  reversedByUserId: string | null;
  reversedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  createdAt: string | Date;
}

export interface OvertimeFilterQuery {
  employeeId?: string;
  departmentId?: string;
  status?: OvertimeRequestStatus | 'all';
  settlementStatus?: OvertimeSettlementStatus | 'all';
  startDate?: string;
  endDate?: string;
  workDate?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'workDate' | 'createdAt' | 'requestedOtMinutes' | 'approvedOtMinutes' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OvertimeSettlementFilterQuery {
  employeeId?: string;
  status?: OvertimeSettlementRecordStatus | 'all';
  page?: number;
  limit?: number;
}

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

export interface CreateOvertimeRequestInput {
  employeeId: string;
  workDate: string;
  dayType?: OvertimeDayType;
  requestedOtMinutes: number;
  reason: string;
  locationOrSite?: string;
  taskOrProject?: string;
  sourceIntervals?: OvertimeSourceInterval[];
  evidenceAttachments?: OvertimeEvidenceAttachment[];
}

export interface DecideOvertimeRequestInput {
  decision: 'approved' | 'rejected';
  approvedOtMinutes?: number;
  reviewNotes?: string;
  expectedVersion?: number;
}

export interface AllocateOvertimeSettlementInput {
  payableMinutes?: number;
  compOffMinutes?: number;
  notes?: string;
  batchReference?: string;
}

export interface ReverseOvertimeSettlementInput {
  settlementId: string;
  reversalReason: string;
}

export interface OvertimeWorkdayContext {
  workDate: string;
  dayType: OvertimeDayType;
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  breakDeductedMinutes?: number;
  isMissingPunch: boolean;
  isRegularized: boolean;
  hasApprovedOd: boolean;
  odMinutes: number;
  employeeEmploymentType?: string;
  employeeDepartmentId?: string;
  priorWeeklyApprovedMinutes?: number;
  priorMonthlyApprovedMinutes?: number;
  priorQuarterlyApprovedMinutes?: number;
  hasAuthoritativeBaseline?: boolean;
}

export interface OvertimeCalculationResult {
  scheduledMinutes: number;
  actualWorkedMinutes: number;
  extraWorkedMinutes: number;
  eligibleOtMinutes: number;
  isEligible: boolean;
  nonEligibilityReason?: string;
  appliedCap?: {
    type: 'daily' | 'weekly' | 'monthly' | 'statutory';
    originalMinutes: number;
    cappedMinutes: number;
  };
  roundingAdjustmentMinutes: number;
  complianceNotes?: string[];
  requiresComplianceReview?: boolean;
}
