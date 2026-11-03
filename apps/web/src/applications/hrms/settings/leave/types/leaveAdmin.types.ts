// ── Tab 6: Holidays ───────────────────────────────────────────────────────────

export type HolidayType = 'mandatory' | 'optional';

export interface HolidayItem {
  id: string;
  calendarId: string;
  date: string;
  name: string;
  type: HolidayType;
  description: string | null;
}

export interface HolidayCalendarItem {
  id: string;
  name: string;
  year: number;
  status: 'draft' | 'published';
  isDefault: boolean;
  optionalHolidayQuota: number;
  revision: number;
  publishedAt: string | null;
  holidayCount: number;
  locationIds: string[];
  cycleStart: string;
  cycleEnd: string;
}

export interface HolidayCalendarDetail extends HolidayCalendarItem {
  holidays: HolidayItem[];
}

export interface HolidayCalendarDto {
  name: string;
  year?: number;
  isDefault?: boolean;
  optionalHolidayQuota?: number;
  locationIds?: string[];
}

export interface HolidayImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

// ── Tab 7: Approval workflow ──────────────────────────────────────────────────

export type ApproverType =
  'reporting_manager' | 'department_head' | 'hr_role' | 'specific_employee';
export type SlaAction = 'escalate_to_next' | 'notify_only' | 'auto_approve';

export interface ApprovalLevel {
  approverType: ApproverType;
  approverRef: string | null;
  slaHours: number;
  onSlaBreach: SlaAction;
}

export interface ApprovalWorkflowItem {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  levels: ApprovalLevel[];
  autoApproveUpToDays: number | null;
  skipIfApproverIsApplicant: boolean;
  fallbackApproverRoleId: string | null;
  cancellationRequiresApproval: boolean;
  allowSelfApprovalForHr: boolean;
  leaveTypeCount: number;
}

export type ApprovalWorkflowDto = Omit<ApprovalWorkflowItem, 'id' | 'leaveTypeCount'>;

export interface ApprovalQueueItem {
  approvalId: string;
  requestId: string;
  level: number;
  purpose: 'approval' | 'cancellation';
  slaDueAt: string | null;
  slaBreachedAt: string | null;
  employeeName: string;
  employeeNumber: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  colorToken: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  session: string | null;
  reason: string;
  submittedAt: string;
}

// ── Tab 5: Restrictions ───────────────────────────────────────────────────────

export type RestrictionType =
  'clubbing' | 'blackout' | 'min_notice' | 'min_gap' | 'frequency_cap' | 'team_concurrency';

export interface RestrictionRuleItem {
  id: string;
  ruleKey: string;
  version: number;
  ruleType: RestrictionType;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface RestrictionDto {
  ruleType: RestrictionType;
  name: string;
  config: Record<string, unknown>;
  isActive?: boolean;
}

// ── Tab 4: Accrual & carry forward ────────────────────────────────────────────

export type GrantMethod =
  'upfront_annual' | 'monthly' | 'quarterly' | 'half_yearly' | 'manual_only';
export type AccrualTiming = 'cycle_start' | 'period_start' | 'period_end';

export interface AccrualRule {
  id: string | null;
  leaveTypeId: string;
  effectiveFrom: string;
  grantMethod: GrantMethod;
  accrualTiming: AccrualTiming;
  proRataOnJoining: boolean;
  joiningCutoffDay: number;
  proRataOnExit: boolean;
  accrueDuringProbation: boolean;
  backcreditAfterProbation: boolean;
  accrueDuringLop: boolean;
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number | null;
  maxAccumulationDays: number | null;
  carryForwardExpiryMonths: number | null;
  lapseRemaining: boolean;
  encashmentEnabled: boolean;
  encashmentTrigger: 'cycle_end' | 'exit' | 'both';
  minBalanceToRetain: number;
  maxEncashableDays: number | null;
  encashmentBasis: 'basic' | 'gross';
  isDefault: boolean;
}

export interface AccrualRuleRow {
  leaveType: {
    id: string;
    name: string;
    code: string;
    isTracked: boolean;
    category: string;
    isActive: boolean;
  };
  current: AccrualRule;
  scheduled: AccrualRule[];
  history: AccrualRule[];
}

export interface YearEndPreview {
  cycle: { start: string; end: string; label: string };
  nextCycle: { start: string; end: string; label: string };
  alreadyClosed: boolean;
  rows: Array<{
    employeeId: string;
    leaveTypeId: string;
    leaveTypeName: string;
    available: number;
    encash: number;
    carryForward: number;
    lapse: number;
  }>;
}

export interface YearEndRun {
  id: string;
  cycleStartDate: string;
  cycleEndDate: string;
  summary: { balances?: number; encashed?: number; carriedForward?: number; lapsed?: number };
  createdByUserId: string;
  createdAt: string;
}
