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
  classification: 'present' | 'absent' | 'half_day' | 'on_leave' | 'on_duty' | 'weekly_off' | 'holiday' | 'pending';
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
