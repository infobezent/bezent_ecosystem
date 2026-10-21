import type {
  EmployeeAttendance,
  AttendancePunch,
  AttendancePolicy,
  AttendanceGeneralSettings,
  AttendanceRegularizationSettings,
  AttendanceDevice,
  AttendanceImportBatch,
  AttendanceSecuritySettings,
  AttendancePayrollSettings,
  AttendancePeriod,
  AttendancePayrollHandoverBatch,
  AttendanceSettingsAuditLog,
  AttendanceOnDutyRequest,
  NewAttendanceOnDutyRequest,
  AttendanceOnDutyRequestRecord,
  NewAttendanceOnDutyRequestRecord,
  AttendanceOnDutyWorkdayRecord,
  NewAttendanceOnDutyWorkdayRecord,
  AttendanceOnDutyAuditRecord,
  NewAttendanceOnDutyAuditRecord,
  AttendanceRegularization,
  AttendanceAdjustment,
  AttendanceRegularizationAudit,
} from '../../../../db/schema.js';

export type AttendanceStatus =
  'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'incomplete';
export type AttendanceProcessingState =
  'incomplete' | 'pending_review' | 'provisional' | 'finalized' | 'locked';

export type AttendanceGeneralSettingsWithV1 = AttendanceGeneralSettings & {
  dayBoundaryMode?: string;
  unscheduledFallbackCutoff?: string;
  trackingStartDateReason?: string | null;
  trackingStartDateEffectiveFrom?: string | null;
  manualEntryConfig?: ManualEntryConfig | null;
  defaultHistoryView?: string;
  alertSettings?: AttendanceAlertSettings | null;
};

export interface CheckInInput {
  workLocation?: 'office' | 'remote' | 'field' | string;
  notes?: string;
  source?: 'web' | 'mobile' | 'biometric' | 'manual' | 'api';
  deviceMetadata?: Record<string, unknown>;
  /** Set by the server from the request, never from the client body. */
  clientIp?: string;
}

export interface RegularizeAttendanceInput {
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workLocation: string;
  status: AttendanceStatus | string;
  processingState?: AttendanceProcessingState;
  notes: string | null;
  totalHours?: number | null;
  workedMinutes?: number;
  lateMinutes?: number;
  earlyMinutes?: number;
  isLate?: boolean;
  isEarlyExit?: boolean;
  isMissingPunch?: boolean;
  isRegularized?: boolean;
  isPayrollReady?: boolean;
}

export interface ShiftSchedule {
  workingDays: string[];
  startTime: string;
  endTime: string;
  breakMinutes: number;
  lunchMinutes: number;
  timeZone?: string;
  scheduleRef: string;
}

export interface CalculationInput {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  schedule: ShiftSchedule;
  policy: AttendancePolicy;
  isOnApprovedLeave?: boolean;
  isOnApprovedOd?: boolean;
  isToday?: boolean;
}

export interface CalculationResult {
  status: AttendanceStatus;
  processingState: AttendanceProcessingState;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  isLate: boolean;
  isEarlyExit: boolean;
  isMissingPunch: boolean;
  isPayrollReady: boolean;
  shiftScheduleRef: string;
  calculationMetadata: Record<string, unknown>;
}

export interface DailyAttendanceItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  processingState?: AttendanceProcessingState;
  workLocation: string;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  isLate: boolean;
  isEarlyExit: boolean;
  isMissingPunch: boolean;
  isRegularized: boolean;
  isPayrollReady?: boolean;
  shiftScheduleRef: string | null;
  shiftName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  punchSource?: string | null;
  indicators?: string[];
  notes: string | null;
}

export interface DailyLogSummaryCounters {
  scheduled: number;
  present: number;
  absent: number;
  onLeave: number;
  onDuty: number;
  pendingReview: number;
  halfDay?: number;
  holiday?: number;
  unresolved?: number;
}

export interface DailyLogFilter {
  date: string;
  employeeId?: string;
  departmentId?: string;
  status?: string;
  search?: string;
  processingState?: string;
  shiftRef?: string;
  locationId?: string;
  indicator?: string;
  punchSource?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'code' | 'department' | 'checkIn' | 'checkOut' | 'workedHours' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface DailyLogResult {
  items: DailyAttendanceItem[];
  counters: DailyLogSummaryCounters;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DailyLogEmployeeDetail {
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string | null;
    email: string;
    departmentName: string | null;
    designationName: string | null;
    locationName: string | null;
    workday: string;
    assignedShift: {
      scheduleRef: string;
      startTime: string;
      endTime: string;
      workingDays: string[];
      breakMinutes: number;
      timeZone: string;
    };
    timeZone: string;
  };
  attendanceSummary: {
    id: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    workedMinutes: number;
    status: AttendanceStatus;
    processingState: AttendanceProcessingState;
    indicators: string[];
    isLate: boolean;
    lateMinutes: number;
    isEarlyExit: boolean;
    earlyMinutes: number;
    isMissingPunch: boolean;
    isRegularized: boolean;
    effectivePolicy: {
      id: string;
      policyName: string;
      version: number;
      gracePeriodMinutes: number;
      missingPunchPolicy: string;
    } | null;
  };
  punchTimeline: Array<{
    id: string;
    punchTime: string;
    punchType: 'in' | 'out' | 'break_in' | 'break_out' | 'auto' | 'unknown';
    source: string;
    workLocation: string;
    notes: string | null;
    deviceMetadata?: Record<string, unknown> | null;
    isDuplicate: boolean;
  }>;
  relatedRecords: {
    leave: {
      id: string;
      status: string;
      startDate: string;
      endDate: string;
      reason?: string | null;
    } | null;
    onDuty: {
      id: string;
      odTypeName: string;
      status: string;
      startDate: string;
      endDate: string;
      reason: string;
    } | null;
    regularizations: Array<{
      id: string;
      status: string;
      requestedCheckIn: string;
      requestedCheckOut: string;
      reason: string;
      reviewerNotes: string | null;
    }>;
    exceptions: Array<{
      type: string;
      details: string;
    }>;
  };
  historyAndActions: {
    calculationMetadata: Record<string, unknown> | null;
    shiftScheduleRef: string | null;
    notes: string | null;
    isLocked: boolean;
    canManualCorrect: boolean;
    canRegularize: boolean;
    canRecalculate: boolean;
  };
}

export interface MonthlySummaryFilter {
  year: number;
  month: number;
  departmentId?: string;
  search?: string;
}

export interface MonthlySummaryDayDetail {
  status: AttendanceStatus | 'off';
  processingState?: AttendanceProcessingState;
  checkInTime: string | null;
  checkOutTime: string | null;
  workedMinutes: number;
  isLate: boolean;
  isMissingPunch: boolean;
}

export interface MonthlySummaryEmployeeRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  designationName: string | null;
  days: Record<string, MonthlySummaryDayDetail>;
  totals: {
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    holiday: number;
    totalWorkedMinutes: number;
    totalLateMinutes: number;
  };
}

export interface PunchLogSummaryCounters {
  total: number;
  totalEvents?: number;
  valid: number;
  needsReview: number;
  duplicates: number;
  unmatched: number;
  processingFailed: number;
}

export interface PunchLogItem {
  id: string;
  tenantId: string;
  companyId: string;
  employeeId: string | null;
  employeeName: string;
  employeeCode: string;
  departmentName?: string | null;
  avatarUrl?: string;
  rawIdentifier?: string | null;
  punchTime: string | Date;
  workday?: string | null;
  punchType: 'in' | 'out' | 'break_in' | 'break_out' | 'auto' | 'unknown';
  source: 'web' | 'mobile' | 'biometric' | 'manual' | 'api' | 'kiosk' | 'import';
  workLocation?: string | null;
  deviceMetadata?: Record<string, unknown> | null | unknown;
  notes?: string | null;
  isDuplicate?: boolean;
  validationStatus:
    | 'pending'
    | 'pending_validation'
    | 'valid'
    | 'duplicate'
    | 'invalid'
    | 'needs_review'
    | 'unmatched';
  validationReason?: string | null;
  processingState: 'received' | 'processing' | 'processed' | 'failed' | 'retry_pending';
  processingError?: string | null;
  retryCount?: number;
  investigationStatus: 'none' | 'open' | 'assigned' | 'in_review' | 'resolved' | 'closed';
  assignedTo?: string | null;
  assignedToName?: string | null;
  investigationNotes?: string | null;
  resolvedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  linkedAttendanceId?: string;
  linkedAttendanceStatus?: string;
  linkedAttendanceProcessingState?: string;
  linkedAttendance?: {
    id: string;
    status: string;
    processingState: string;
    workedMinutes: number;
  } | null;
}

export interface PunchLogFilter {
  dateFrom?: string;
  dateTo?: string;
  date?: string;
  dateInterpretation?: 'event_timestamp' | 'workday';
  employeeId?: string;
  search?: string;
  source?: string;
  validationStatus?: string;
  punchType?: string;
  processingState?: string;
  departmentId?: string;
  locationId?: string;
  deviceId?: string;
  importBatchId?: string;
  syncJobId?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | 'punchTime'
    | 'employeeName'
    | 'punchType'
    | 'source'
    | 'validationStatus'
    | 'processingState'
    | 'workday';
  sortOrder?: 'asc' | 'desc';
}

export interface PunchLogResult {
  punches: PunchLogItem[];
  counters: PunchLogSummaryCounters;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PunchEventDetail extends PunchLogItem {
  timeline: Array<{
    id: string;
    punchTime: string | Date;
    punchType: string;
    source: string;
    validationStatus: string;
    processingState?: string;
  }>;
  audits: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    actorName?: string | null;
    details: Record<string, unknown> | null;
    notes: string | null;
    createdAt: string | Date;
  }>;
}

export interface UpdatePunchInvestigationInput {
  punchId: string;
  status?: 'open' | 'assigned' | 'in_review' | 'resolved' | 'closed';
  investigationStatus?: 'open' | 'assigned' | 'in_review' | 'resolved' | 'closed';
  assignedTo?: string;
  notes?: string;
  investigationNotes?: string;
  resolvedEmployeeId?: string;
  resolutionReason?: string;
}

export interface RetryPunchProcessingInput {
  punchIds: string[];
}

export interface BulkPunchActionInput {
  punchIds: string[];
  action: 'retry' | 'mark_investigation' | 'assign_investigation';
  assignedTo?: string;
  assignToUserId?: string;
  notes?: string;
}

export interface RegularizationFilter {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  employeeId?: string;
}

export interface RegularizationItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  date: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewerNotes: string | null;
  reviewedByUserId: string | null;
  createdAt: Date;
}

export type ExceptionType =
  | 'missing_in'
  | 'missing_out'
  | 'late_arrival'
  | 'early_exit'
  | 'insufficient_hours'
  | 'shift_mismatch'
  | 'duplicate_punch'
  | 'unmatched_employee'
  | 'invalid_punch'
  | 'device_sync_failure'
  | 'leave_conflict'
  | 'on_duty_conflict'
  | 'regularization_conflict';

export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ExceptionStatus =
  'open' | 'assigned' | 'in_review' | 'pending_action' | 'resolved' | 'closed';

export type ExceptionSource =
  | 'biometric'
  | 'web'
  | 'mobile'
  | 'kiosk'
  | 'import'
  | 'engine'
  | 'leave_system'
  | 'od_system'
  | 'regularization_system'
  | 'system';

export interface ExceptionSummaryCounters {
  activeCases: number;
  critical: number;
  highPriority: number;
  unassigned: number;
  pendingAction: number;
  resolvedToday: number;
}

export interface ExceptionFilter {
  dateFrom?: string;
  dateTo?: string;
  dateInterpretation?: 'workday' | 'detected_at';
  status?: string;
  severity?: string;
  exceptionType?: string;
  source?: string;
  assignment?: string;
  assignedTo?: string;
  departmentId?: string;
  locationId?: string;
  pendingActionReason?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'severity' | 'detectedAt' | 'workday' | 'employeeName' | 'status' | 'exceptionType';
  sortOrder?: 'asc' | 'desc';
}

export interface AttendanceExceptionCaseItem {
  id: string;
  tenantId: string;
  companyId: string;
  employeeId: string | null;
  employeeName: string;
  employeeCode: string;
  departmentName?: string | null;
  workday: string | null;
  exceptionType: ExceptionType;
  severity: ExceptionSeverity;
  source: ExceptionSource;
  sourceRecordType: string;
  sourceRecordId: string;
  title: string;
  description: string | null;
  status: ExceptionStatus;
  assignedTo: string | null;
  assignedToName?: string | null;
  assignedQueue: string | null;
  pendingActionReason: string | null;
  pendingActionAwaitedFrom: string | null;
  resolutionType: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | Date | null;
  resolvedByUserId: string | null;
  closedAt: string | Date | null;
  closedByUserId: string | null;
  detectedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  relatedRecordSummary?: {
    type: string;
    id: string;
    label: string;
    details?: string;
  } | null;
}

export interface ExceptionCaseDetail extends AttendanceExceptionCaseItem {
  evidence: {
    punches?: Array<{
      id: string;
      punchTime: string | Date;
      punchType: string;
      source: string;
      validationStatus?: string;
    }>;
    dailyLog?: {
      id: string;
      status: string;
      processingState: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      workedMinutes: number;
      isLate: boolean;
      lateMinutes: number;
      isEarlyExit: boolean;
      earlyMinutes: number;
      isMissingPunch: boolean;
    } | null;
    shift?: {
      startTime: string;
      endTime: string;
      scheduleRef: string;
      timeZone: string;
    } | null;
    policy?: {
      policyName: string;
      version: number;
      gracePeriodMinutes: number;
      missingPunchPolicy: string;
    } | null;
    relatedRequest?: Record<string, unknown> | null;
  };
  audits: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    actorName?: string | null;
    oldState: Record<string, unknown> | null;
    newState: Record<string, unknown> | null;
    notes: string | null;
    createdAt: string | Date;
  }>;
}

export interface ExceptionQueryResult {
  items: AttendanceExceptionCaseItem[];
  counters: ExceptionSummaryCounters;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignExceptionInput {
  exceptionId: string;
  assignedTo?: string;
  assignedQueue?: string;
  notes?: string;
}

export interface UpdateExceptionStatusInput {
  exceptionId: string;
  status: ExceptionStatus;
  pendingActionReason?: string;
  pendingActionAwaitedFrom?: string;
  notes?: string;
  resolutionNotes?: string;
  resolutionType?: string;
}

export interface OverrideExceptionSeverityInput {
  exceptionId: string;
  severity: ExceptionSeverity;
  reason: string;
}

export interface BulkExceptionActionInput {
  exceptionIds: string[];
  action: 'assign' | 'start_review' | 'mark_pending_action' | 'request_correction';
  assignedTo?: string;
  assignedQueue?: string;
  pendingActionReason?: string;
  pendingActionAwaitedFrom?: string;
  notes?: string;
}

export interface AttendanceExceptionItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  exceptionType: 'missing_punch' | 'late_arrival' | 'early_exit' | 'short_hours';
  details: string;
  status: string;
  isRegularized: boolean;
}

export interface AttendanceExceptionFilter {
  date?: string;
  type?: 'missing_punch' | 'late' | 'early_exit' | 'short_hours' | 'all';
  departmentId?: string;
}

export interface AttendanceOverviewKpis {
  date: string;
  expectedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onLeaveCount: number;
  missingPunchCount: number;
  halfDayCount: number;
  pendingRegularizationCount: number;
  attendanceRate: number;
  departmentBreakdown: Array<{
    departmentId: string;
    departmentName: string;
    present: number;
    total: number;
  }>;
  recentTrends: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>;
}

export interface ManualCorrectionInput {
  employeeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  workLocation?: string;
  status?: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
  notes?: string;
  reason: string;
}

export interface WorkingHoursConfig {
  workingHoursMode?: 'fixed_policy' | 'shift_based';
  netOrGross?: 'net' | 'gross';
  breakDeductionMethod?: 'scheduled' | 'actual' | 'none';
  fullDayHours?: number;
  halfDayHours?: number;
  shiftAssignmentMode?: 'roster_assigned' | 'auto_detect_punch';
  enableAutoShiftAllocation?: boolean;
  shiftMatchingWindowMinutes?: number;
  fallbackShiftName?: string;
  allowOvernightSpanning?: boolean;
}

export interface LateArrivalConfig {
  enabled: boolean;
  graceMinutes: number;
  countingMode?: 'after_grace' | 'from_start';
  extendedLateThresholdMinutes?: number;
  extendedLateAction?: 'flag_review' | 'half_day' | 'mark_absent' | 'none';
  reconcileApprovedExceptions?: boolean;
}

export interface EarlyExitConfig {
  enabled: boolean;
  graceMinutes: number;
  extendedEarlyExitThresholdMinutes?: number;
  extendedEarlyExitAction?: 'flag_review' | 'half_day' | 'mark_absent' | 'none';
  reconcileApprovedExceptions?: boolean;
}

export interface PenaltyRulesConfig {
  enabled: boolean;
  lateMarksThreshold: number;
  penaltyUnit: 'warning_only' | 'quarter_day' | 'half_day' | 'full_day' | 'loss_of_pay';
  period: 'calendar_month' | 'payroll_period' | 'custom_cycle' | 'monthly' | 'payroll_cycle';
  isRepeating?: boolean;
  maxPenaltyUnits?: number | null;
  warningOnly?: boolean;
}

export interface OnDutyRulesConfig {
  enabled: boolean;
  odTypes: string[];
  allowFullDay?: boolean;
  allowHalfDay?: boolean;
  allowHourly?: boolean;
  allowMultiDay?: boolean;
  creditTreatment?: 'count_as_present' | 'verified_hours';
  punchRule?: 'exempt' | 'required_at_location';
  exemptFromGeofence?: boolean;
  advanceSubmissionDays?: number;
  backdatedAllowedDays?: number;
  requiresApproval?: boolean;
  requiresReason?: boolean;
  requiresEvidence?: boolean;
  // Legacy compatibility fields
  allowBackdated?: boolean;
  maxBackdatedDays?: number;
  countAsPresent?: boolean;
}

export interface ClassificationRulesConfig {
  thresholdMode?: 'fixed_hours' | 'percentage_of_shift';
  fullDayPercentage?: number;
  halfDayPercentage?: number;
  minHoursForPresent?: number;
  minHoursForHalfDay?: number;
  insufficientHoursAction?: 'absent' | 'half_day' | 'flag_exception';
  missingPunchPolicy?: 'mark_absent' | 'half_day' | 'flag_exception' | 'none';
  workingHoursConfig?: WorkingHoursConfig;
  lateArrivalConfig?: LateArrivalConfig;
  earlyExitConfig?: EarlyExitConfig;
}

export interface EffectivePolicyResolution {
  policy: AttendancePolicy;
  provenance: Record<string, 'employee' | 'department' | 'company' | 'default'>;
  activeOverridesCount: number;
  effectiveDate: string;
}

export interface PublishPolicyInput {
  changeReason: string;
  effectiveFrom?: string;
}

export interface UpdateAttendancePolicyInput {
  id?: string;
  policyName?: string;
  version?: number;
  status?: 'draft' | 'published' | 'archived';
  description?: string | null;
  scope?: 'company' | 'department' | 'employee';
  scopeId?: string | null;
  overridesPriority?: number;
  captureMethods?: string[];
  breakDeductionMethod?: 'scheduled' | 'actual' | 'none';
  enableLateTracking?: boolean;
  gracePeriodMinutes?: number;
  enableEarlyExitTracking?: boolean;
  halfDayThresholdHours?: number | string;
  fullDayThresholdHours?: number | string;
  missingPunchPolicy?: 'mark_absent' | 'half_day' | 'flag_exception' | 'none';
  allowRegularization?: boolean;
  regularizationCutoffDays?: number;
  requiresApproval?: boolean;
  effectiveFrom?: string;
  penaltyRules?: PenaltyRulesConfig | null;
  odRules?: OnDutyRulesConfig | null;
  classificationRules?: ClassificationRulesConfig | null;
  changeReason?: string;
}

export interface ManualEntryConfig {
  allowedRoles: string[];
  allowedMethods: ('actual_times' | 'full_day_admin' | 'half_day_admin')[];
  approvalMode: 'approval_required' | 'direct_finalization';
  requireReason: boolean;
  requireAttachment?: boolean;
}

export interface AttendanceAlertEventConfig {
  enabled: boolean;
  recipients: ('employee' | 'reporting_manager' | 'assigned_approver' | 'hr' | 'device_admin')[];
  channels: ('in_app' | 'email' | 'push' | 'sms')[];
}

export interface AttendanceAlertSettings {
  events: {
    missingPunch?: AttendanceAlertEventConfig;
    lateArrival?: AttendanceAlertEventConfig;
    earlyExit?: AttendanceAlertEventConfig;
    regularizationPending?: AttendanceAlertEventConfig;
    exceptions?: AttendanceAlertEventConfig;
    onDutyPending?: AttendanceAlertEventConfig;
    deviceSyncFailure?: AttendanceAlertEventConfig;
  };
  timing: {
    missingPunchDelayMinutes?: number;
    digestFrequency: 'instant' | 'daily' | 'weekly' | 'none';
    reminderIntervalHours?: number;
  };
  escalation: {
    enabled: boolean;
    deadlineHours?: number;
    targetRole?: 'next_level_manager' | 'hr_manager';
  };
}

export interface GeneralSettingsInput {
  timezone?: string;
  dayBoundaryTime?: string;
  dayBoundaryMode?: 'shift_workday_based' | string;
  unscheduledFallbackCutoff?: string;
  trackingStartDate?: string;
  trackingStartDateReason?: string;
  trackingStartDateEffectiveFrom?: string;
  processingMode?: 'automatic' | 'realtime' | 'daily_batch' | 'manual';
  manualEntryAllowed?: boolean;
  manualEntryConfig?: ManualEntryConfig;
  employeeVisibility?:
    | 'daily_and_monthly'
    | 'daily_only'
    | 'monthly_summary_only'
    | 'self_only'
    | 'department'
    | 'company';
  defaultHistoryView?: string;
  defaultHistoryViewDays?: number;
  alertPreferences?: Record<string, unknown>;
  alertSettings?: AttendanceAlertSettings;
}

export interface RegularizationSettingsInput {
  isEnabled?: boolean;
  allowedCorrectionTypes?: string[];
  submissionWindowDays?: number;
  maxRequestsPerMonth?: number;
  requireReason?: boolean;
  requireEvidence?: boolean;
  approvalHierarchy?: 'manager_only' | 'hr_only' | 'manager_then_hr' | 'auto_approve';
  autoApproveGraceMinutes?: number;
  blockOnPayrollLock?: boolean;
  allowWithdrawal?: boolean;
}

export interface DeviceInput {
  id?: string;
  locationId?: string | null;
  deviceName: string;
  deviceCode: string;
  deviceType:
    'biometric_fingerprint' | 'biometric_facial' | 'rfid_card' | 'mobile_kiosk' | 'web_terminal';
  serialNumber?: string | null;
  ipAddress?: string | null;
  port?: number | null;
  status?: 'online' | 'offline' | 'disabled' | 'testing';
  firmwareVersion?: string | null;
  lastHeartbeatAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface GeofenceConfigItem {
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enforceStrict: boolean;
}

export interface SecuritySettingsInput {
  enableGps?: boolean;
  geofenceConfigs?: GeofenceConfigItem[];
  ipAllowlist?: string[];
  enforceIpRestriction?: boolean;
  maxDevicesPerEmployee?: number;
  allowSharedKiosk?: boolean;
  detectMockLocation?: boolean;
  detectImpossibleTravel?: boolean;
  rapidPunchThrottlingSeconds?: number;
  flagVpnProxy?: boolean;
  allowWebPunch?: boolean;
  allowMobilePunch?: boolean;
  requireSelfiePunch?: boolean;
  allowPunchOutsideGeofence?: boolean;
}

export interface AttendanceSecuritySettingsWithRemote {
  id: string;
  tenantId: string;
  companyId: string;
  enableGps: boolean;
  geofenceConfigs?: GeofenceConfigItem[] | null;
  ipAllowlist?: string[] | null;
  enforceIpRestriction: boolean;
  maxDevicesPerEmployee: number;
  allowSharedKiosk: boolean;
  detectMockLocation: boolean;
  detectImpossibleTravel: boolean;
  rapidPunchThrottlingSeconds: number;
  flagVpnProxy: boolean;
  allowWebPunch?: boolean;
  allowMobilePunch?: boolean;
  requireSelfiePunch?: boolean;
  allowPunchOutsideGeofence?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollSettingsInput {
  cycleType?: 'calendar_month' | 'custom_cutoff';
  cutoffDay?: number;
  requireApprovalBeforeLock?: boolean;
  autoLockOnCutoff?: boolean;
  blockingSeverity?: 'hard_block' | 'warning_only';
}

export interface PeriodLockInput {
  periodCode: string;
  startDate?: string;
  endDate?: string;
}

export interface PeriodUnlockInput {
  periodCode: string;
  reason: string;
}

export interface SettingsAuditFilter {
  category?:
    | 'general'
    | 'policy'
    | 'shifts'
    | 'regularization'
    | 'overtime_compoff'
    | 'capture_device'
    | 'location_security'
    | 'payroll_locking';
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface CompanyShiftTemplate {
  id: string;
  name: string;
  code: string;
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  workingDays: string[]; // ['Monday', 'Tuesday', ...]
  breakMinutes: number;
  lunchMinutes: number;
  graceMinutes: number;
  isOvernight: boolean;
  color?: string;
  description?: string;
  isActive: boolean;
  assignedEmployeesCount?: number;
}

export interface ShiftRosterSettings {
  shifts: CompanyShiftTemplate[];
  autoShiftAllocation: {
    enabled: boolean;
    matchingWindowMinutes: number;
    fallbackShiftId?: string;
    allowOvernightSpanning: boolean;
  };
  shiftSwapRules: {
    allowEmployeeRequests: boolean;
    cutoffHours: number;
    requireManagerApproval: boolean;
  };
}

export type UpdateShiftRosterSettingsInput = Partial<ShiftRosterSettings>;
export type CreateShiftInput = Omit<CompanyShiftTemplate, 'id' | 'assignedEmployeesCount'> & {
  id?: string;
};
export type UpdateShiftInput = Partial<CreateShiftInput>;

export interface CreateOnDutyRequestInput {
  employeeId: string;
  odTypeId: string;
  odTypeName?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  durationType?: 'full_day' | 'half_day' | 'hourly' | 'multi_day';
  halfDaySession?: 'first_half' | 'second_half';
  durationHours?: number;
  reason: string;
  locationOrSite?: string;
  workLocation?: string;
  attachmentUrl?: string;
}

export interface ReviewOnDutyRequestInput {
  status?: 'approved' | 'rejected';
  action?: 'approve' | 'reject';
  decisionReason?: string;
}

export interface OnDutyFilter {
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

export interface OnDutyRequestItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  odTypeId: string;
  odTypeName: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  durationType: 'full_day' | 'half_day' | 'hourly' | 'multi_day';
  halfDaySession: 'first_half' | 'second_half' | null;
  durationHours: number;
  reason: string;
  locationOrSite: string | null;
  attachmentUrl: string | null;
  status:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'awaiting_info'
    | 'approved'
    | 'rejected'
    | 'withdrawn'
    | 'cancelled';
  currentStage: string;
  decisionReason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface AttendancePayrollHandoverSummary {
  totalDays: number;
  scheduledDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  approvedLeaveDays: number;
  approvedOdDays: number;
  verifiedWorkedMinutes: number;
  eligibleWorkDays: number;
}

export interface AttendancePenaltyRecommendation {
  policyVersionId: string;
  reasonCode: string;
  occurrenceCount: number;
  dayEquivalentUnits: number;
}

export interface AttendanceReadinessStatus {
  status: 'ready' | 'blocked' | 'requires_review';
  unresolvedExceptionCount: number;
}

export interface AttendancePayrollHandoverRecord {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  attendanceSummary: AttendancePayrollHandoverSummary;
  penaltyRecommendations: AttendancePenaltyRecommendation[];
  readiness: AttendanceReadinessStatus;
  calculationVersion: string;
}

// -------------------------------------------------------------
// Regularization V1.0 Domain Types
// -------------------------------------------------------------

export type RegularizationRequestType =
  | 'missing_in'
  | 'missing_out'
  | 'incorrect_time'
  | 'status_correction'
  | 'worked_hours'
  | 'both_missing'
  | 'wrong_direction';

export type RegularizationApprovalStatus =
  'draft' | 'submitted' | 'under_review' | 'awaiting_info' | 'approved' | 'rejected' | 'cancelled';

export type RegularizationApplicationStatus =
  'not_applicable' | 'pending_application' | 'applied' | 'failed' | 'blocked';

export type RegularizationSource =
  'web' | 'ess' | 'mobile' | 'system' | 'biometric' | 'kiosk' | 'import';

export interface RegularizationSummaryCounters {
  pendingReview: number;
  underReview: number;
  awaitingInfo: number;
  approvedToday: number;
  applicationIssues: number;
  rejectedToday: number;
}

export interface RegularizationItemV1 {
  id: string;
  requestNumber: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  workday: string;
  requestType: RegularizationRequestType;
  approvalStatus: RegularizationApprovalStatus;
  applicationStatus: RegularizationApplicationStatus;
  source: RegularizationSource;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedQueue: string | null;
  relatedExceptionId: string | null;
  requestedChange: string;
  recordedCheckIn: string | null;
  recordedCheckOut: string | null;
  recordedStatus: string | null;
  proposedCheckIn: string | null;
  proposedCheckOut: string | null;
  proposedStatus: string | null;
  claimedHours: number | null;
  reason: string;
  evidenceAttachments: Array<{ name: string; size: string; url?: string }>;
  isHighRisk: boolean;
  submittedAt: string | Date;
  decidedAt: string | Date | null;
  decidedByUserId: string | null;
  appliedAt: string | Date | null;
  applicationError: string | null;
  applicationBlockedReason: string | null;
}

export interface RegularizationDetailV1 extends RegularizationItemV1 {
  targetPunchId: string | null;
  targetPunchDirection: string | null;
  clarificationRequestedAt: string | Date | null;
  clarificationNotes: string | null;
  clarificationProvidedAt: string | Date | null;
  clarificationResponse: string | null;
  decisionReason: string | null;
  riskFactors: string[];
  appliedAdjustmentId: string | null;
  evidenceContext: {
    recordedAttendance: {
      date: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      status: string;
      workedMinutes: number;
      isMissingPunch: boolean;
      isLate: boolean;
      isEarlyExit: boolean;
      isRegularized: boolean;
    } | null;
    punchTimeline: Array<{
      id: string;
      punchTime: string;
      punchType: string;
      source: string;
      workLocation: string;
      notes: string | null;
    }>;
    shiftSchedule: {
      name: string;
      startTime: string;
      endTime: string;
      isOvernight: boolean;
    } | null;
    policyRules: {
      policyName: string;
      gracePeriodMinutes: number;
      missingPunchPolicy: string;
      allowRegularization: boolean;
      submissionWindowDays: number;
    } | null;
    leaveConflict: {
      hasConflict: boolean;
      details?: string;
    };
    onDutyConflict: {
      hasConflict: boolean;
      details?: string;
    };
    payrollLockState: {
      isLocked: boolean;
      periodCode?: string;
    };
  };
  audits: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    actorName?: string | null;
    oldState: Record<string, unknown> | null;
    newState: Record<string, unknown> | null;
    notes: string | null;
    createdAt: string | Date;
  }>;
}

export interface RegularizationFilterV1 {
  search?: string;
  approvalStatus?: string;
  applicationStatus?: string;
  requestType?: string;
  workdayFrom?: string;
  workdayTo?: string;
  submittedFrom?: string;
  submittedTo?: string;
  assignedTo?: string;
  departmentId?: string;
  locationId?: string;
  relatedException?: string;
  source?: string;
  employeeId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RegularizationQueryResultV1 {
  items: RegularizationItemV1[];
  counters: RegularizationSummaryCounters;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RegularizationSubmissionInput {
  employeeId?: string;
  workday: string;
  requestType: RegularizationRequestType;
  proposedCheckIn?: string;
  proposedCheckOut?: string;
  proposedStatus?: string;
  claimedHours?: number;
  targetPunchId?: string;
  targetPunchDirection?: string;
  reason: string;
  evidenceAttachments?: Array<{ name: string; size: string; url?: string }>;
  relatedExceptionId?: string;
  isDraft?: boolean;
}

export interface RegularizationEligibilityCheckInput {
  employeeId: string;
  workday: string;
  requestType: RegularizationRequestType;
}

export interface RegularizationEligibilityCheckResult {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  isHighRisk: boolean;
  riskFactors: string[];
  context: {
    workday: string;
    trackingStartDate: string;
    employeeJoiningDate: string | null;
    submissionWindowDays: number;
    monthlyRequestLimit: number;
    currentMonthRequestCount: number;
    existingAttendance: {
      status: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      workedMinutes: number;
    } | null;
    hasLeaveConflict: boolean;
    hasOdConflict: boolean;
    isPayrollLocked: boolean;
    activeRequestExists: boolean;
  };
}

export interface RegularizationDecisionInput {
  status: 'approved' | 'rejected';
  reason?: string;
  remarks?: string;
}

export interface RegularizationClarificationRequestInput {
  notes: string;
}

export interface RegularizationClarificationResponseInput {
  response: string;
  attachments?: Array<{ name: string; size: string; url?: string }>;
}

export interface BulkRegularizationActionInput {
  action: 'assign' | 'start_review' | 'request_info' | 'bulk_approve' | 'bulk_reject';
  requestIds: string[];
  assignedTo?: string;
  notes?: string;
  reason?: string;
}

export interface BulkRegularizationActionResult {
  action: string;
  totalRequested: number;
  succeeded: string[];
  skipped: Array<{ id: string; reason: string }>;
  failed: Array<{ id: string; error: string }>;
}

export interface RegularizationExportFilter extends RegularizationFilterV1 {
  selectedIds?: string[];
  format?: 'csv' | 'excel' | 'pdf';
  level?: 'standard' | 'detailed' | 'audit';
}

/* ══════════════════════════════════════════════════════════════════════
   ON-DUTY (OD) WORKSPACE V1.0 DOMAIN TYPES
   ══════════════════════════════════════════════════════════════════════ */

export type OnDutyTypeKey =
  'client_visit' | 'site_visit' | 'training' | 'travel' | 'branch_visit' | 'assignment' | 'other';

export type OnDutyDurationType = 'hourly' | 'half_day' | 'full_day' | 'multi_day';

export type OnDutyApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'awaiting_info'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'withdrawn';

export type OnDutyProcessingStatus =
  | 'not_applicable'
  | 'pending'
  | 'applied'
  | 'partially_applied'
  | 'processing_issues'
  | 'blocked'
  | 'failed';

export interface OnDutyTypeConfig {
  id: string;
  name: string;
  description: string;
  enabled?: boolean;
}

export interface OnDutySummaryCounters {
  pendingReview: number;
  underReview: number;
  awaitingInfo: number;
  approvedToday: number;
  processingIssues: number;
  upcomingOd: number;
}

export interface OnDutyFilterV1 {
  search?: string;
  startDate?: string;
  endDate?: string;
  approvalStatus?: string;
  odTypeId?: string;
  processingStatus?: string;
  durationType?: string;
  assignedTo?: string;
  departmentId?: string;
  locationId?: string;
  submittedFrom?: string;
  submittedTo?: string;
  conflictStatus?: string;
  source?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface OnDutyItemV1 {
  id: string;
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  odTypeId: string;
  odTypeName: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  dutyPeriodDisplay: string;
  durationType: OnDutyDurationType;
  durationHours: number;
  halfDaySession?: 'first_half' | 'second_half' | null;
  locationOrSite?: string | null;
  purpose: string;
  projectReference?: string | null;
  submittedAt: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedRole?: string | null;
  approvalStatus: OnDutyApprovalStatus;
  status?: OnDutyApprovalStatus;
  currentStage?: string;
  processingStatus: OnDutyProcessingStatus;
  isHighRisk: boolean;
  riskFactors?: string[] | null;
  evidenceAttachments?: Array<{ name: string; size: string; url?: string }> | null;
}

export interface OnDutyDetailV1 extends OnDutyItemV1 {
  submittedByUserId?: string | null;
  decisionReason?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  clarificationNotes?: string | null;
  clarificationRequestedAt?: string | null;
  clarificationResponse?: string | null;
  clarificationProvidedAt?: string | null;
  appliedAt?: string | null;
  appliedByUserId?: string | null;
  processingError?: string | null;
  processingBlockedReason?: string | null;
  attendanceContext: {
    shiftSchedule: { startTime: string; endTime: string; shiftName: string } | null;
    recordedPunchesSummary: string;
    leaveConflict: string | null;
    otherOdOverlap: string | null;
    regularizationConflict: string | null;
    isPayrollLocked: boolean;
  };
  workdays: Array<{
    id: string;
    workday: string;
    durationType: string;
    durationHours: number;
    halfDaySession?: string | null;
    creditedStatus: string;
    creditedWorkedMinutes: number;
    processingStatus: string;
    errorMessage?: string | null;
    blockedReason?: string | null;
    appliedAt?: string | null;
  }>;
  audits: Array<{
    id: string;
    action: string;
    actorUserId?: string | null;
    notes?: string | null;
    createdAt: string;
  }>;
}

export interface CreateOnDutyRequestPayload {
  employeeId: string;
  odTypeId: string;
  durationType: OnDutyDurationType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  halfDaySession?: 'first_half' | 'second_half';
  locationOrSite?: string;
  workLocation?: string;
  purpose?: string;
  reason?: string;
  projectReference?: string;
  evidenceAttachments?: Array<{ name: string; size: string; url?: string }>;
  isDraft?: boolean;
}

export interface ReviewOnDutyDecisionInput {
  action: 'approved' | 'rejected' | 'clarify';
  reason?: string;
  notes?: string;
}

export interface BulkOnDutyActionInput {
  action: 'assign' | 'start_review' | 'request_info' | 'bulk_approve' | 'bulk_reject';
  requestIds: string[];
  assignedTo?: string;
  notes?: string;
  reason?: string;
}

export interface BulkOnDutyActionResult {
  action: string;
  totalRequested: number;
  succeeded: string[];
  skipped: Array<{ id: string; reason: string }>;
  failed: Array<{ id: string; error: string }>;
}

export interface BulkOnDutyEligibilityPreview {
  totalSelected: number;
  eligibleCount: number;
  notEligibleCount: number;
  items: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    odTypeName: string;
    durationType: string;
    isEligible: boolean;
    reason?: string;
  }>;
}

export interface OnDutyExportFilter extends OnDutyFilterV1 {
  selectedIds?: string[];
  format?: 'csv' | 'excel' | 'pdf';
  level?: 'standard' | 'detailed' | 'audit';
}

export interface OnDutyQueryResultV1 {
  items: OnDutyItemV1[];
  counters: OnDutySummaryCounters;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type {
  EmployeeAttendance,
  AttendancePunch,
  AttendancePolicy,
  AttendanceGeneralSettings,
  AttendanceRegularizationSettings,
  AttendanceDevice,
  AttendanceImportBatch,
  AttendanceSecuritySettings,
  AttendancePayrollSettings,
  AttendancePeriod,
  AttendancePayrollHandoverBatch,
  AttendanceSettingsAuditLog,
  AttendanceRegularization,
  AttendanceAdjustment,
  AttendanceRegularizationAudit,
  AttendanceOnDutyRequest,
  NewAttendanceOnDutyRequest,
  AttendanceOnDutyRequestRecord,
  NewAttendanceOnDutyRequestRecord,
  AttendanceOnDutyWorkdayRecord,
  NewAttendanceOnDutyWorkdayRecord,
  AttendanceOnDutyAuditRecord,
  NewAttendanceOnDutyAuditRecord,
};

export * from './attendanceOvertime.types.js';
