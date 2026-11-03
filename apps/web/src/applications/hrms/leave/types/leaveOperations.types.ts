export type LeaveRequestStatus =
  'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancellation_pending';

export type LeaveSession = 'first_half' | 'second_half';

export interface LeaveOverviewPerson {
  requestId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string | null;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorToken: string;
  startDate: string;
  endDate: string;
  session: LeaveSession | null;
  returnsOn: string;
}

export interface LeaveOverviewAttention {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
  target: { page: 'approvals' | 'requests' | 'settings'; tab?: string };
}

export interface LeaveOverview {
  date: string;
  scope: 'company' | 'team';
  metrics: {
    onLeaveToday: number;
    workforce: number;
    pendingApprovals: number;
    overdueApprovals: number;
    upcomingWeek: number;
    lopDaysThisMonth: number;
  };
  outToday: LeaveOverviewPerson[];
  upcoming: LeaveOverviewPerson[];
  attention: LeaveOverviewAttention[];
  leaveMix: Array<{
    leaveTypeId: string;
    name: string;
    code: string;
    colorToken: string;
    days: number;
  }>;
  upcomingHolidays: Array<{ date: string; name: string; type: string }>;
}

export interface LeaveRequestListItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string | null;
  locationName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorToken: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  session: LeaveSession | null;
  status: LeaveRequestStatus;
  currentLevel: number | null;
  submittedAt: string;
  appliedOnBehalf: boolean;
}

export interface LeaveRequestList {
  items: LeaveRequestListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<LeaveRequestStatus, number>;
}

export interface LeaveRequestQuery {
  status?: LeaveRequestStatus | '';
  leaveTypeId?: string;
  departmentId?: string;
  locationId?: string;
  from?: string;
  to?: string;
  search?: string;
  appliedByHr?: boolean;
  page?: number;
  pageSize?: number;
}

export interface LeaveBreakdownDay {
  date: string;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayCode: string | null;
  chargedDays: number;
  exclusionReasons: string[];
}

export interface LeaveRequestApprovalStep {
  id: string;
  purpose: 'approval' | 'cancellation';
  level: number;
  action: string;
  approverEmployeeId: string | null;
  approverName: string | null;
  actedBy: string | null;
  comment: string | null;
  actedAt: string | null;
  slaDueAt: string | null;
  slaBreachedAt: string | null;
}

export interface LeaveRequestDetail {
  id: string;
  employee: {
    id: string;
    name: string;
    employeeNumber: string;
    departmentName: string | null;
    locationName: string | null;
  };
  leaveType: { id: string; name: string; code: string; colorToken: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  session: LeaveSession | null;
  reason: string;
  status: LeaveRequestStatus;
  currentLevel: number | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  submittedAt: string;
  submittedBy: string | null;
  appliedOnBehalf: boolean;
  calculation: {
    versionNumber: number;
    dayCountingMethod: 'working_days' | 'calendar_days';
    calculatedDurationDays: number;
    scheduleSource: 'employee_schedule' | 'company_default';
    warnings: string[];
    scheduleBreakdown: LeaveBreakdownDay[];
  } | null;
  approvals: LeaveRequestApprovalStep[];
  myPendingApprovalId: string | null;
}

export interface ApprovalQueueItem {
  approvalId: string;
  requestId: string;
  level: number;
  purpose: 'approval' | 'cancellation';
  slaDueAt: string | null;
  slaBreachedAt: string | null;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorToken: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  session: LeaveSession | null;
  reason: string;
  submittedAt: string;
}

export interface ApprovalStats {
  awaitingMe: number;
  overdue: number;
  cancellations: number;
  approvedToday: number;
}

export interface EmployeeLeaveBalance {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  colorToken: string;
  isTracked: boolean;
  allowHalfDay: boolean;
  availableDays: number | null;
}

export interface EmployeeLeaveWorkspace {
  balances: EmployeeLeaveBalance[];
}

export interface ApplyOnBehalfDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  session?: LeaveSession | null;
  backdatedOverride?: boolean;
  payrollLockOverride?: boolean;
}

// ── P2: Team calendar ───────────────────────────────────────────────────────

export interface CalendarEmployee {
  id: string;
  name: string;
  employeeNumber: string;
  departmentName: string | null;
}

export interface CalendarEntry {
  requestId: string;
  employeeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorToken: string;
  status: 'approved' | 'pending' | 'cancellation_pending';
  session: LeaveSession | null;
  days: Array<{ date: string; charged: number }>;
}

export interface CalendarDay {
  date: string;
  isWeekend: boolean;
  holiday: { name: string; type: string } | null;
  out: number;
  pending: number;
  overLimit: boolean;
}

export interface TeamCalendar {
  from: string;
  to: string;
  scope: 'company' | 'team';
  workforce: number;
  employees: CalendarEmployee[];
  entries: CalendarEntry[];
  days: CalendarDay[];
}

// ── P2: Balances ────────────────────────────────────────────────────────────

export interface BalanceCell {
  balanceId: string;
  entitled: number;
  used: number;
  pending: number;
  available: number;
  carriedForward: number;
  carryForwardExpiresOn: string | null;
}

export interface BalanceRegister {
  cycle: { start: string; end: string; label: string };
  leaveTypes: Array<{ id: string; name: string; code: string; colorToken: string }>;
  rows: Array<{ employee: CalendarEmployee; balances: Record<string, BalanceCell> }>;
  total: number;
  page: number;
  pageSize: number;
  metrics: {
    employees: number;
    totalAvailable: number;
    negativeBalances: number;
    expiringCarryForward: number;
  };
}

export interface LedgerEntry {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  txnType: string;
  effect: number;
  days: number;
  runningAvailable: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface EmployeeLedger {
  employee: CalendarEmployee;
  cycle: { start: string; end: string; label: string };
  balances: Array<
    { leaveTypeId: string; leaveTypeName: string; leaveTypeCode: string } & BalanceCell
  >;
  entries: LedgerEntry[];
}

export interface BalanceAdjustmentDto {
  employeeId: string;
  leaveTypeId: string;
  direction: 'credit' | 'debit';
  days: number;
  reason: string;
  effectiveDate?: string;
}

// ── P3: Holiday calendar & year-end ─────────────────────────────────────────

export interface HolidayCalendarView {
  year: number;
  cycle: { start: string; end: string; label: string };
  calendar: {
    id: string;
    name: string;
    revision: number;
    isDefault: boolean;
    optionalHolidayQuota: number;
  } | null;
  holidays: Array<{
    date: string;
    name: string;
    type: 'mandatory' | 'optional';
    weekday: string;
    optedCount: number;
    isPast: boolean;
  }>;
  metrics: {
    total: number;
    mandatory: number;
    optional: number;
    optionalQuota: number;
    next: { date: string; name: string } | null;
  };
}

export interface YearEndView {
  cycle: { start: string; end: string; label: string };
  nextCycle: { start: string; end: string; label: string };
  alreadyClosed: boolean;
  canClose: boolean;
  autoCloseOn: string;
  totals: { employees: number; encash: number; carryForward: number; lapse: number };
  rows: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    leaveTypeId: string;
    leaveTypeName: string;
    available: number;
    encash: number;
    carryForward: number;
    lapse: number;
  }>;
  runs: Array<{
    id: string;
    cycleStartDate: string;
    cycleEndDate: string;
    summary: { balances?: number; encashed?: number; carriedForward?: number; lapsed?: number };
    closedBy: string;
    createdAt: string;
  }>;
  encashments: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    leaveTypeName: string;
    days: number;
    basis: string;
    trigger: string;
    status: string;
    createdAt: string;
  }>;
}

// ── P4: Reports ─────────────────────────────────────────────────────────────

export type LeaveReportId =
  'utilisation' | 'lop' | 'liability' | 'absenteeism' | 'approval_sla' | 'audit';

export interface LeaveReport {
  reportId: LeaveReportId;
  title: string;
  description: string;
  range: { from: string; to: string };
  columns: Array<{ key: string; label: string; numeric: boolean }>;
  rows: Array<Record<string, string | number | null>>;
  summary: Array<{ label: string; value: string | number }>;
  truncated: boolean;
  generatedAt: string;
}

export interface LeaveReportQuery {
  from?: string;
  to?: string;
  departmentId?: string;
  locationId?: string;
  leaveTypeId?: string;
}
