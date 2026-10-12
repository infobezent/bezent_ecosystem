export type OverviewRoleScope = 'hr_admin' | 'hr_executive' | 'manager' | 'employee' | 'payroll_user';

export interface OverviewAccessScope {
  role: OverviewRoleScope;
  isCompanyWide: boolean;
  departmentId?: string;
  employeeId?: string;
  canViewPayrollReadiness: boolean;
}

export interface TodayAttendanceKpis {
  date: string;
  timezone: string;
  totalEligibleEmployees: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  onDutyCount: number;
  lateArrivalsCount: number;
  missingPunchCount: number;
  pendingProcessingCount: number;
  halfDayCount: number;
  attendanceRate: number | null;
  processingCompletenessPercent: number;
  isFuture: boolean;
  asOf: string;
}

export interface AttendanceTrendItem {
  date: string;
  dayOfWeek: string;
  scheduledDayEquivalents: number;
  presentEquivalentDays: number;
  absentEquivalentDays: number;
  leaveCoverageEquivalents: number;
  odCoverageEquivalents: number;
  attendanceRate: number | null;
  absenceRate: number | null;
  lateOccurrences: number;
  isFuture: boolean;
}

export interface AttendanceTrendsResult {
  range: '7d' | '30d' | 'custom';
  startDate: string;
  endDate: string;
  items: AttendanceTrendItem[];
  avgAttendanceRate: number | null;
  avgAbsenceRate: number | null;
  totalLateOccurrences: number;
}

export interface DepartmentComparisonItem {
  departmentId: string;
  departmentName: string;
  eligibleEmployees: number;
  presentEquivalents: number;
  absentEquivalents: number;
  leaveCoverage: number;
  odCoverage: number;
  attendanceRate: number | null;
  missingPunchCount: number;
  unresolvedExceptions: number;
}

export type ActionQueueType =
  | 'pending_regularization'
  | 'pending_on_duty'
  | 'unresolved_exceptions'
  | 'missing_punch_issues'
  | 'pending_monthly_review'
  | 'payroll_readiness_blockers';

export interface ActionQueueItem {
  actionType: ActionQueueType;
  title: string;
  description: string;
  authorizedPendingCount: number;
  severity: 'info' | 'warning' | 'danger';
  oldestPendingAgeDays: number | null;
  targetRoute: string;
  filterParams: Record<string, string>;
  lastUpdated: string;
}

export interface ProcessingHealthResult {
  date: string;
  eligibleWorkdays: number;
  processedWorkdays: number;
  pendingWorkdays: number;
  failedWorkdays: number;
  missingScheduleCount: number;
  unresolvedBlockingExceptions: number;
  staleMonthlySummaries: number;
  processingSuccessRate: number | null;
  denominatorDescription: string;
  status: 'healthy' | 'degraded' | 'critical' | 'upcoming';
  asOf: string;
}

export interface MonthlyPayrollReadinessOverview {
  month: string;
  isAuthorized: boolean;
  totalInScope: number;
  readyCount: number;
  needsReviewCount: number;
  blockedCount: number;
  calculatingCount: number;
  reviewedCount: number;
  pendingReviewCount: number;
  reopenedCount: number;
  lockedCount: number;
  targetRoute: string;
  filterParams: Record<string, string>;
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

  // Enterprise V1.0 operational properties
  timezone?: string;
  asOf?: string;
  dataFreshness?: 'realtime' | 'cached';
  scope?: OverviewAccessScope;
  todayKpis?: TodayAttendanceKpis;
  trends?: AttendanceTrendsResult;
  departments?: DepartmentComparisonItem[];
  actionQueue?: ActionQueueItem[];
  processingHealth?: ProcessingHealthResult;
  monthlyReadiness?: MonthlyPayrollReadinessOverview;
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
  locationId?: string | null;
  locationName?: string | null;
  shiftScheduleRef: string | null;
  shiftName?: string | null;
  punchSource?: string | null;
  indicators?: string[];
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'on_duty' | 'holiday' | 'incomplete';
  processingState?: 'incomplete' | 'pending_review' | 'provisional' | 'finalized' | 'locked';
  workLocation: string;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  isLate: boolean;
  isEarlyExit: boolean;
  isMissingPunch: boolean;
  isRegularized: boolean;
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

export interface DailyLogResponse {
  data: DailyAttendanceItem[];
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
    status: DailyAttendanceItem['status'];
    processingState: DailyAttendanceItem['processingState'];
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
    punchType: 'in' | 'out' | 'break_in' | 'break_out' | 'auto';
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

export interface MonthlySummaryDayDetail {
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'off' | 'incomplete';
  processingState?: 'incomplete' | 'pending_review' | 'provisional' | 'finalized' | 'locked';
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
  createdAt: string;
}

// -------------------------------------------------------------
// Regularization V1.0 Advanced Enterprise Workspace Types
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
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'awaiting_info'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type RegularizationApplicationStatus =
  | 'not_applicable'
  | 'pending_application'
  | 'applied'
  | 'failed'
  | 'blocked';

export type RegularizationSource =
  | 'web'
  | 'ess'
  | 'mobile'
  | 'system'
  | 'biometric'
  | 'kiosk'
  | 'import';

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
  submittedAt: string;
  decidedAt: string | null;
  decidedByUserId: string | null;
  appliedAt: string | null;
  applicationError: string | null;
  applicationBlockedReason: string | null;
}

export interface RegularizationDetailV1 extends RegularizationItemV1 {
  targetPunchId: string | null;
  targetPunchDirection: string | null;
  clarificationRequestedAt: string | null;
  clarificationNotes: string | null;
  clarificationProvidedAt: string | null;
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
    createdAt: string;
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
  | 'open'
  | 'assigned'
  | 'in_review'
  | 'pending_action'
  | 'resolved'
  | 'closed';

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
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
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
      punchTime: string;
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
    createdAt: string;
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

export interface AttendancePolicy {
  id: string;
  tenantId?: string;
  companyId?: string;
  policyName: string;
  version?: number;
  status?: 'draft' | 'published' | 'archived';
  description?: string | null;
  scope?: 'company' | 'department' | 'employee';
  scopeId?: string | null;
  overridesPriority?: number;
  captureMethods: string[];
  breakDeductionMethod?: 'scheduled' | 'actual' | 'none';
  enableLateTracking?: boolean;
  gracePeriodMinutes: number;
  enableEarlyExitTracking?: boolean;
  halfDayThresholdHours: string | number;
  fullDayThresholdHours: string | number;
  missingPunchPolicy: 'mark_absent' | 'half_day' | 'flag_exception' | 'none';
  allowRegularization: boolean;
  regularizationCutoffDays: number;
  requiresApproval: boolean;
  effectiveFrom: string;
  isActive: boolean;
  penaltyRules?: PenaltyRulesConfig | null;
  odRules?: OnDutyRulesConfig | null;
  classificationRules?: ClassificationRulesConfig | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkingHoursConfig {
  workingHoursMode?: 'fixed_policy' | 'shift_based';
  netOrGross?: 'net' | 'gross';
  breakDeductionMethod?: 'scheduled' | 'actual' | 'none';
  fullDayHours?: number;
  halfDayHours?: number;
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
  penaltyUnit: 'warning_only' | 'quarter_day' | 'half_day' | 'full_day' | 'loss_of_pay' | 'half_day_deduction' | 'full_day_deduction';
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
  insufficientHoursAction?: 'absent' | 'mark_absent' | 'half_day' | 'flag_exception';
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

export interface ManualCorrectionPayload {
  employeeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  workLocation?: string;
  notes?: string;
  reason: string;
}

/* ── Attendance Settings V1.0 Types ── */

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

export interface AttendanceGeneralSettings {
  id: string;
  tenantId: string;
  companyId: string;
  timezone: string;
  dayBoundaryTime: string;
  dayBoundaryMode?: string;
  unscheduledFallbackCutoff?: string;
  trackingStartDate: string;
  trackingStartDateReason?: string | null;
  trackingStartDateEffectiveFrom?: string | null;
  processingMode: 'automatic' | 'realtime' | 'daily_batch' | 'manual';
  manualEntryAllowed: boolean;
  manualEntryConfig?: ManualEntryConfig | null;
  employeeVisibility: 'daily_and_monthly' | 'daily_only' | 'monthly_summary_only' | 'self_only' | 'department' | 'company';
  defaultHistoryView?: string;
  defaultHistoryViewDays: number;
  alertPreferences?: Record<string, unknown> | null;
  alertSettings?: AttendanceAlertSettings | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralSettingsInput {
  timezone?: string;
  dayBoundaryTime?: string;
  dayBoundaryMode?: string;
  unscheduledFallbackCutoff?: string;
  trackingStartDate?: string;
  trackingStartDateReason?: string;
  trackingStartDateEffectiveFrom?: string;
  processingMode?: 'automatic' | 'realtime' | 'daily_batch' | 'manual';
  manualEntryAllowed?: boolean;
  manualEntryConfig?: ManualEntryConfig;
  employeeVisibility?: 'daily_and_monthly' | 'daily_only' | 'monthly_summary_only' | 'self_only' | 'department' | 'company';
  defaultHistoryView?: string;
  defaultHistoryViewDays?: number;
  alertPreferences?: Record<string, unknown>;
  alertSettings?: AttendanceAlertSettings;
}

export interface AttendanceRegularizationSettings {
  id: string;
  tenantId: string;
  companyId: string;
  isEnabled: boolean;
  allowedCorrectionTypes?: string[] | null;
  submissionWindowDays: number;
  maxRequestsPerMonth: number;
  requireReason: boolean;
  requireEvidence: boolean;
  approvalHierarchy: 'manager_only' | 'hr_only' | 'manager_then_hr' | 'auto_approve';
  autoApproveGraceMinutes: number;
  blockOnPayrollLock: boolean;
  allowWithdrawal: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface AttendanceDevice {
  id: string;
  tenantId: string;
  companyId: string;
  locationId?: string | null;
  deviceName: string;
  deviceCode: string;
  deviceType: 'biometric_fingerprint' | 'biometric_facial' | 'rfid_card' | 'mobile_kiosk' | 'web_terminal';
  serialNumber?: string | null;
  ipAddress?: string | null;
  port?: number | null;
  status: 'online' | 'offline' | 'disabled' | 'testing';
  lastHeartbeatAt?: string | null;
  firmwareVersion?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceInput {
  id?: string;
  locationId?: string | null;
  deviceName: string;
  deviceCode: string;
  deviceType: 'biometric_fingerprint' | 'biometric_facial' | 'rfid_card' | 'mobile_kiosk' | 'web_terminal';
  serialNumber?: string | null;
  ipAddress?: string | null;
  port?: number | null;
  status?: 'online' | 'offline' | 'disabled' | 'testing';
  firmwareVersion?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DeviceTestResult {
  status: 'online' | 'offline' | 'testing';
  latencyMs: number;
  message: string;
}

export interface AttendanceImportBatch {
  id: string;
  tenantId: string;
  companyId: string;
  batchType: 'raw_punches' | 'historical_summary';
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  duplicateRows: number;
  status: 'pending' | 'processing' | 'completed' | 'reversed' | 'failed';
  importedByUserId?: string | null;
  columnMapping?: Record<string, string> | null;
  errorLog?: Array<{ row: number; reason: string }> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkImportPayload {
  batchType: 'raw_punches' | 'historical_summary';
  fileName: string;
  rows: Array<Record<string, unknown>>;
  columnMapping?: Record<string, string>;
}

export interface GeofenceConfigItem {
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  enforceStrict: boolean;
}

export interface AttendanceSecuritySettings {
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
  createdAt: string;
  updatedAt: string;
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
}

export interface AttendancePayrollSettings {
  id: string;
  tenantId: string;
  companyId: string;
  cycleType: 'calendar_month' | 'custom_cutoff';
  cutoffDay: number;
  requireApprovalBeforeLock: boolean;
  autoLockOnCutoff: boolean;
  blockingSeverity: 'hard_block' | 'warning_only';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollSettingsInput {
  cycleType?: 'calendar_month' | 'custom_cutoff';
  cutoffDay?: number;
  requireApprovalBeforeLock?: boolean;
  autoLockOnCutoff?: boolean;
  blockingSeverity?: 'hard_block' | 'warning_only';
}

export interface AttendancePeriod {
  id: string;
  tenantId: string;
  companyId: string;
  periodCode: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'locked' | 'reopened';
  lockedAt?: string | null;
  lockedByUserId?: string | null;
  reopenedAt?: string | null;
  reopenedByUserId?: string | null;
  reopenReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodLockReadiness {
  canLock: boolean;
  unresolvedMissingPunches: number;
  pendingRegularizations: number;
  warnings: string[];
}

export interface AttendancePayrollHandoverBatch {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  batchNumber: string;
  totalEmployees: number;
  totalPayableDays: string | number;
  totalDeductionUnits: string | number;
  exportedFormat: string;
  generatedByUserId?: string | null;
  summarySnapshot?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AttendanceSettingsAuditLog {
  id: string;
  tenantId: string;
  companyId: string;
  category: 'general' | 'policy' | 'regularization' | 'capture_device' | 'location_security' | 'payroll_locking';
  action: string;
  entityId?: string | null;
  entityType?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changedByUserId?: string | null;
  clientIp?: string | null;
  createdAt: string;
}

export interface SettingsAuditFilter {
  category?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export type OnDutyDurationType = 'full_day' | 'half_day' | 'hourly' | 'multi_day';
export type OnDutyStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'awaiting_info'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'cancelled';

export type OnDutyApprovalStatus = OnDutyStatus;

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
  code?: string;
  description?: string;
  requiresEvidence?: boolean;
  requiresPunch?: boolean;
  creditHours?: number;
  isActive?: boolean;
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

export interface OnDutyRequestItem {
  id: string;
  tenantId?: string;
  companyId?: string;
  requestNumber?: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string | null;
  odTypeId: string;
  odTypeName?: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  dutyPeriodDisplay?: string;
  durationType: OnDutyDurationType;
  durationHours?: number;
  halfDaySession?: 'first_half' | 'second_half' | null;
  requestedDurationHours?: number;
  reason: string;
  purpose?: string;
  locationOrSite?: string | null;
  workLocation?: string | null;
  projectReference?: string | null;
  status: OnDutyStatus;
  approvalStatus?: OnDutyApprovalStatus;
  processingStatus?: OnDutyProcessingStatus;
  currentStage?: string;
  decisionReason?: string | null;
  reviewedBy?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignedRole?: string | null;
  isHighRisk?: boolean;
  riskFactors?: string[] | null;
  evidenceAttachments?: Array<{ name: string; size: string; url?: string }> | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOnDutyRequestPayload {
  employeeId: string;
  odTypeId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  durationType: OnDutyDurationType;
  halfDaySession?: 'first_half' | 'second_half';
  reason?: string;
  purpose?: string;
  locationOrSite?: string;
  workLocation?: string;
  projectReference?: string;
  evidenceAttachments?: Array<{ name: string; size: string; url?: string }>;
  evidenceAttachmentRefs?: string[];
  isDraft?: boolean;
}

export interface ReviewOnDutyRequestPayload {
  action: 'approve' | 'reject';
  decisionReason?: string;
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

export interface PunchLogSummaryCounters {
  total: number;
  valid: number;
  needsReview: number;
  duplicates: number;
  unmatched: number;
  processingFailed: number;
}

export interface PunchLogFilter {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  dateInterpretation?: 'event_timestamp' | 'workday';
  employeeId?: string;
  source?: string;
  punchType?: string;
  validationStatus?: string;
  processingState?: string;
  departmentId?: string;
  locationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PunchLogItem {
  id: string;
  tenantId: string;
  companyId: string;
  employeeId: string | null;
  rawIdentifier?: string | null;
  punchTime: string;
  punchType: 'in' | 'out' | 'break_in' | 'break_out' | 'auto' | 'unknown';
  source: 'web' | 'mobile' | 'biometric' | 'manual' | 'api' | 'kiosk' | 'import';
  deviceMetadata?: unknown;
  workLocation?: string | null;
  workday?: string | null;
  validationStatus: 'pending_validation' | 'valid' | 'duplicate' | 'invalid' | 'needs_review' | 'unmatched';
  validationReason?: string | null;
  processingState: 'received' | 'processing' | 'processed' | 'failed' | 'retry_pending';
  processingError?: string | null;
  retryCount: number;
  investigationStatus: 'none' | 'open' | 'assigned' | 'in_review' | 'resolved' | 'closed';
  assignedTo?: string | null;
  investigationNotes?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
  isDuplicate?: boolean;
  createdAt: string;
  updatedAt: string;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  avatarUrl?: string;
  linkedAttendanceId?: string;
  linkedAttendanceStatus?: string;
  linkedAttendanceProcessingState?: string;
}

export interface PunchAuditRecord {
  id: string;
  tenantId: string;
  companyId: string;
  punchId: string;
  action: 'ingested' | 'validated' | 'processed' | 'retry_attempted' | 'investigation_opened' | 'investigation_assigned' | 'investigation_resolved' | 'identity_mapped';
  actorUserId?: string | null;
  details?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
}

export interface PunchTimelineItem {
  id: string;
  punchTime: string;
  punchType: string;
  source: string;
  validationStatus: string;
  processingState: string;
}

export interface PunchEventDetail extends PunchLogItem {
  timeline: PunchTimelineItem[];
  audits: PunchAuditRecord[];
}

export interface PunchLogResult {
  punches: PunchLogItem[];
  counters: PunchLogSummaryCounters;
  total: number;
}

export interface UpdatePunchInvestigationInput {
  punchId: string;
  investigationStatus: 'open' | 'assigned' | 'in_review' | 'resolved' | 'closed';
  assignedTo?: string;
  investigationNotes?: string;
  resolvedEmployeeId?: string;
  resolutionReason?: string;
}

export interface BulkPunchActionInput {
  action: 'retry' | 'assign_investigation' | 'mark_investigation';
  punchIds: string[];
  assignToUserId?: string;
  notes?: string;
}

// ============================================================================
// Attendance Monthly Summary V1.0 Types
// ============================================================================

export type AttendanceCalculationState = 'pending' | 'calculated' | 'stale' | 'error';
export type AttendanceReviewState =
  | 'not_reviewed'
  | 'in_review'
  | 'needs_correction'
  | 'reviewed'
  | 'reopened';
export type AttendancePayrollReadiness = 'calculating' | 'ready' | 'needs_review' | 'blocked';

export interface MonthlySummaryRow {
  id: string;
  tenantId: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  departmentId?: string;
  month: string;
  timezone: string;
  scheduledDays: number;
  scheduledMinutes: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  onDutyDays: number;
  weeklyOffDays: number;
  holidayDays: number;
  actualWorkedMinutes: number;
  policyCreditedMinutes: number;
  actualWorkedHours: number;
  policyCreditedHours: number;
  lateOccurrences: number;
  lateMinutes: number;
  earlyExitOccurrences: number;
  earlyExitMinutes: number;
  unresolvedExceptions: number;
  pendingCorrections: number;
  processingIssues: number;
  calculationState: AttendanceCalculationState;
  reviewState: AttendanceReviewState;
  payrollReadiness: AttendancePayrollReadiness;
  isLocked: boolean;
  periodLockId?: string | null;
  version: number;
  sourceFingerprint: string;
  assignedReviewerId?: string | null;
  assignedReviewerName?: string | null;
  assignedAt?: string | null;
  reviewedByUserId?: string | null;
  reviewedByUserName?: string | null;
  reviewedAt?: string | null;
  reviewedVersion?: number | null;
  reviewNotes?: string | null;
  correctionRequestNotes?: string | null;
  reopenReason?: string | null;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySummaryCounters {
  totalEmployees: number;
  readyForPayroll: number;
  needsReview: number;
  processingIssues: number;
  locked: number;
  pendingCorrections: number;
}

export interface MonthlySummaryFilter {
  month: string;
  search?: string;
  departmentId?: string;
  payrollReadiness?: AttendancePayrollReadiness;
  branchId?: string;
  locationId?: string;
  reportingManagerId?: string;
  shiftId?: string;
  employmentStatus?: string;
  reviewState?: AttendanceReviewState;
  isLocked?: boolean;
  hasExceptions?: boolean;
  hasPendingCorrections?: boolean;
  hasProcessingIssues?: boolean;
  counterFilter?: 'all' | 'ready' | 'needs_review' | 'issues' | 'locked' | 'corrections';
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MonthlySummaryDailyRecord {
  date: string;
  dayOfWeek: string;
  shiftId?: string;
  shiftName?: string;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  scheduledMinutes: number;
  classification:
    | 'present'
    | 'absent'
    | 'half_day'
    | 'on_leave'
    | 'on_duty'
    | 'weekly_off'
    | 'holiday'
    | 'pending';
  actualWorkedMinutes: number;
  policyCreditedMinutes: number;
  onDutyMinutes: number;
  onDutyStatus?: string;
  leaveType?: string;
  leaveMinutes?: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyExit: boolean;
  earlyExitMinutes: number;
  hasException: boolean;
  exceptionTypes?: string[];
  hasPendingRegularization: boolean;
  isLocked: boolean;
  isFuture: boolean;
  rawAttendanceId?: string;
}

export interface MonthlySummaryReadinessReport {
  monthlySummaryId: string;
  evaluationVersion: number;
  readinessStatus: AttendancePayrollReadiness;
  passedChecks: Array<{ code: string; name: string; details?: string }>;
  warningChecks: Array<{ code: string; name: string; details?: string }>;
  blockingChecks: Array<{ code: string; name: string; details?: string; sourceUrl?: string }>;
  evaluatedAt: string;
}

export interface MonthlySummaryReviewHistoryItem {
  id: string;
  reviewerUserId: string;
  reviewerName?: string;
  reviewStatus: AttendanceReviewState;
  reviewedSummaryVersion: number;
  reviewNotes?: string | null;
  reopenReason?: string | null;
  createdAt: string;
}

export interface MonthlySummaryBulkActionInput {
  action: 'assign' | 'start_review' | 'mark_reviewed' | 'request_correction' | 'recalculate';
  summaryIds: string[];
  reviewerId?: string;
  reviewNotes?: string;
  correctionNotes?: string;
}

export interface MonthlySummaryBulkActionResult {
  action: string;
  totalRequested: number;
  succeeded: string[];
  skipped: Array<{ id: string; reason: string }>;
  failed: Array<{ id: string; error: string }>;
}

export interface MonthlySummaryBulkPreviewResult {
  totalSelected: number;
  eligibleCount: number;
  notEligibleCount: number;
  items: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    currentStatus: string;
    isEligible: boolean;
    reason?: string;
  }>;
}

export interface MonthlySummaryExportInput {
  month: string;
  selectedIds?: string[];
  format: 'csv' | 'excel' | 'pdf';
  level: 'standard' | 'detailed' | 'audit';
  departmentId?: string;
  payrollReadiness?: AttendancePayrollReadiness;
  reviewState?: AttendanceReviewState;
  search?: string;
}

export interface MonthlySummaryQueryResult {
  items: MonthlySummaryRow[];
  counters: MonthlySummaryCounters;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

