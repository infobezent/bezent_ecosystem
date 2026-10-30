/**
 * BEZENT HRMS — Attendance Overview V1.0 Types
 * Strongly typed contracts for the Enterprise Operational Control Center.
 */

export type OverviewRoleScope =
  'hr_admin' | 'hr_executive' | 'manager' | 'employee' | 'payroll_user';

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
  presentHeadcount: number; // Integer count of unique employees with recognized presence
  presentCount: number; // Present equivalents (1.0 for full, 0.5 for half) - maintained for backward compatibility
  presentEquivalentDays: number; // Weighted attendance-day equivalents
  absentCount: number; // Absent equivalents
  onLeaveCount: number; // Leave coverage equivalents
  onDutyCount: number; // OD coverage equivalents
  lateArrivalsCount: number;
  missingPunchCount: number;
  pendingProcessingCount: number;
  halfDayCount: number;
  attendanceRate: number | null; // (present / eligible) * 100
  processingCompletenessPercent: number; // (finalized / eligible) * 100
  isFuture: boolean;
  asOf: string;
}

export interface AttendanceTrendItem {
  date: string;
  dayOfWeek: string;
  scheduledDayEquivalents: number;
  scheduledHeadcount?: number;
  presentEquivalentDays: number;
  presentHeadcount?: number;
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
  presentHeadcount?: number;
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
  | 'pending_overtime_claims'
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
  processedWorkdays: number; // Finalized workdays
  pendingWorkdays: number;
  failedWorkdays: number;

  // Metric A: Processing Success Rate (Successful Attempts / Completed Attempts * 100)
  attemptedWorkdays: number;
  processingSuccessRate: number | null; // null if attemptedWorkdays === 0

  // Metric B: Reconciliation Completion Rate (Finalized / Eligible Workdays * 100)
  reconciliationCompletionRate: number | null;

  // Schedule Integrity
  assignedScheduleCount: number;
  fallbackScheduleCount: number;
  unresolvedScheduleCount: number;
  missingScheduleCount: number; // backward compatibility alias for unresolvedScheduleCount

  // Blocking Exceptions
  unresolvedBlockingExceptions: number;
  workdayBlockingExceptions?: number;
  cumulativeBlockingExceptions?: number;
  historicalBlockingExceptions?: number;

  staleMonthlySummaries: number;
  denominatorDescription: string;
  status:
    | 'healthy'
    | 'in_progress'
    | 'attention_required'
    | 'degraded'
    | 'critical'
    | 'upcoming'
    | 'unknown';
  operationalStage?:
    'not_started' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'attention_required';
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

export interface AttendanceOverviewResult {
  date: string;
  timezone: string;
  asOf: string;
  dataFreshness: 'realtime' | 'cached';
  scope: OverviewAccessScope;

  todayKpis: TodayAttendanceKpis;
  trends: AttendanceTrendsResult;
  departments: DepartmentComparisonItem[];
  actionQueue: ActionQueueItem[];
  processingHealth: ProcessingHealthResult;
  monthlyReadiness: MonthlyPayrollReadinessOverview;

  // Backwards compatibility for legacy frontend consumers
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

export interface OverviewFilterParams {
  date?: string;
  month?: string;
  trendRange?: '7d' | '30d' | 'custom';
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}
