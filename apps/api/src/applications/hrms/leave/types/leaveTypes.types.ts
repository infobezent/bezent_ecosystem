import type { LeaveTypeRecord } from '../../../../db/schema.js';

export const LEAVE_TYPE_CATEGORIES = [
  'paid',
  'unpaid',
  'statutory',
  'special_event',
  'compensatory',
  'optional_holiday',
  'loss_of_pay',
] as const;
export type LeaveTypeCategory = (typeof LEAVE_TYPE_CATEGORIES)[number];

export const PAYROLL_IMPACTS = ['paid', 'unpaid', 'partly_paid'] as const;
export type PaidClassification = (typeof PAYROLL_IMPACTS)[number];

/** V1 supports day-based leave only; `half_days`/`hours` exist in the DB enum for later phases. */
export const LEAVE_TYPE_UNITS_V1 = ['days'] as const;
export type LeaveTypeUnit = 'days' | 'half_days' | 'hours';

export const DOCUMENT_REQUIREMENTS = [
  'none',
  'optional',
  'mandatory',
  'mandatory_after_n_days',
] as const;
export type LeaveDocumentRequirement = (typeof DOCUMENT_REQUIREMENTS)[number];

export const DAY_TREATMENTS = ['inherit', 'count', 'exclude'] as const;
export type DayTreatment = (typeof DAY_TREATMENTS)[number];

export const GENDER_ELIGIBILITIES = ['all', 'female', 'male'] as const;
export type GenderEligibility = (typeof GENDER_ELIGIBILITIES)[number];

export const TEAM_CALENDAR_VISIBILITIES = ['leave_type', 'generic_leave', 'none'] as const;
export type TeamCalendarVisibility = (typeof TEAM_CALENDAR_VISIBILITIES)[number];

/** Design System badge tokens a leave type may use. */
export const LEAVE_TYPE_COLOR_TOKENS = ['success', 'warning', 'info', 'danger', 'neutral'] as const;

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  shortLabel?: string;
  colorToken?: string;
  description?: string | null;
  instructions?: string | null;
  category?: LeaveTypeCategory;
  paidClassification?: PaidClassification;
  isTracked?: boolean;
  visibleToEmployee?: boolean;
  unit?: LeaveTypeUnit;
  allowHalfDay?: boolean;
  minPerRequest?: number;
  maxPerRequest?: number | null;
  maxConsecutiveDays?: number | null;
  maxPerMonth?: number | null;
  maxPerYear?: number | null;
  weeklyOffTreatment?: DayTreatment;
  holidayTreatment?: DayTreatment;
  sandwichRuleEnabled?: boolean;
  documentRequirement?: LeaveDocumentRequirement;
  documentThresholdDays?: number | null;
  certificateType?: string | null;
  allowedInProbation?: boolean;
  allowedInNoticePeriod?: boolean;
  genderEligibility?: GenderEligibility;
  negativeBalanceEnabled?: boolean;
  negativeBalanceLimit?: number | null;
  carryForwardEnabled?: boolean;
  encashmentEnabled?: boolean;
  attendanceStatusCode?: string;
  countsAsPresent?: boolean;
  countsTowardService?: boolean;
  teamCalendarVisibility?: TeamCalendarVisibility;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}

export type UpdateLeaveTypeDto = Partial<CreateLeaveTypeDto>;

export interface LeaveTypesQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  category?: LeaveTypeCategory | 'all';
  paidClassification?: PaidClassification | 'all';
  page?: number;
  limit?: number;
}

export interface LeaveTypeSummary {
  total: number;
  active: number;
  inactive: number;
  paid: number;
  unpaid: number;
  partlyPaid: number;
}

export interface LeaveTypesListResponse {
  items: LeaveTypeRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: LeaveTypeSummary;
}

export interface LeaveTypeStatusChangeResult {
  leaveType: LeaveTypeRecord;
  usage: { inUse: boolean; requestCount: number; balanceCount: number };
  linkedPolicies: Array<{ id: string; name: string; code: string; status: string }>;
  warning?: string;
}
