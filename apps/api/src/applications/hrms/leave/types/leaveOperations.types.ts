import type { ScheduleBreakdownItem } from '../rules/leaveCalendar.js';
import type { LeaveCalculationSnapshot } from './leave.types.js';

export type LeaveRequestStatus =
  'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancellation_pending';

/** Whose data an Operations page may show: the whole company, or a manager's reportees. */
export type LeaveDataScope =
  { kind: 'company' } | { kind: 'team'; managerEmployeeId: string | null };

export interface LeaveRequestFilters {
  status?: LeaveRequestStatus;
  leaveTypeId?: string;
  departmentId?: string;
  locationId?: string;
  from?: string;
  to?: string;
  search?: string;
  appliedByHr?: boolean;
  page: number;
  pageSize: number;
}

export type LeaveRequestStatusCounts = Record<LeaveRequestStatus, number>;

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
  session: string | null;
  status: LeaveRequestStatus;
  currentLevel: number | null;
  submittedAt: Date;
  appliedOnBehalf: boolean;
}

export interface LeaveRequestList {
  items: LeaveRequestListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: LeaveRequestStatusCounts;
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
  actedAt: Date | null;
  slaDueAt: Date | null;
  slaBreachedAt: Date | null;
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
  session: string | null;
  reason: string;
  status: LeaveRequestStatus;
  currentLevel: number | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  submittedAt: Date;
  submittedBy: string | null;
  appliedOnBehalf: boolean;
  policyId: string | null;
  workflowId: string | null;
  calculation: LeaveCalculationSnapshot | null;
  approvals: LeaveRequestApprovalStep[];
  /** Filled by the service: the viewer's open step on this request, if any. */
  myPendingApprovalId?: string | null;
}

/** A request row used by the overview aggregations. */
export interface OperationsLeaveRow {
  requestId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorToken: string;
  payrollImpact: 'paid' | 'unpaid' | 'partly_paid';
  startDate: string;
  endDate: string;
  totalDays: number;
  session: string | null;
  status: LeaveRequestStatus;
  breakdown: ScheduleBreakdownItem[];
}

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
  session: string | null;
  /** First date after the leave the employee is back. */
  returnsOn: string;
}

export interface LeaveOverviewAttention {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
  /** Where the user fixes it: an Operations page or a Settings tab. */
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

export interface ApprovalStats {
  awaitingMe: number;
  overdue: number;
  cancellations: number;
  approvedToday: number;
}

export interface ApplyOnBehalfInput {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  session?: 'first_half' | 'second_half' | null;
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
  session: string | null;
  /** Charged days per date inside the window (0 for weekly offs / holidays). */
  days: Array<{ date: string; charged: number }>;
}

export interface CalendarDay {
  date: string;
  isWeekend: boolean;
  holiday: { name: string; type: string } | null;
  /** Employees on approved leave that day. */
  out: number;
  pending: number;
  /** True when an active team-concurrency rule's limit is exceeded. */
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

export interface BalanceRegisterRow {
  employee: CalendarEmployee;
  /** Keyed by leave type id; missing = no balance row yet this cycle. */
  balances: Record<string, BalanceCell>;
}

export interface BalanceRegister {
  cycle: { start: string; end: string; label: string };
  leaveTypes: Array<{ id: string; name: string; code: string; colorToken: string }>;
  rows: BalanceRegisterRow[];
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
  /** Signed effect on the available balance. */
  effect: number;
  days: number;
  runningAvailable: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface EmployeeLedger {
  employee: CalendarEmployee;
  cycle: { start: string; end: string; label: string };
  balances: Array<
    { leaveTypeId: string; leaveTypeName: string; leaveTypeCode: string } & BalanceCell
  >;
  entries: LedgerEntry[];
}

export interface BalanceAdjustmentInput {
  employeeId: string;
  leaveTypeId: string;
  direction: 'credit' | 'debit';
  days: number;
  reason: string;
  effectiveDate?: string;
}

// ── P3: Holiday calendar (read view) ────────────────────────────────────────

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
    /** Employees (in scope) who booked this optional holiday. */
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

// ── P3: Year-end & encashment ───────────────────────────────────────────────

export interface YearEndRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  leaveTypeId: string;
  leaveTypeName: string;
  available: number;
  encash: number;
  carryForward: number;
  lapse: number;
}

export interface YearEndView {
  cycle: { start: string; end: string; label: string };
  nextCycle: { start: string; end: string; label: string };
  alreadyClosed: boolean;
  /** True when the leave year has ended and is not yet closed. */
  canClose: boolean;
  /** Date the nightly sweep closes this year automatically. */
  autoCloseOn: string;
  totals: { employees: number; encash: number; carryForward: number; lapse: number };
  rows: YearEndRow[];
  runs: Array<{
    id: string;
    cycleStartDate: string;
    cycleEndDate: string;
    summary: Record<string, unknown>;
    closedBy: string;
    createdAt: Date;
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
    createdAt: Date;
  }>;
}
