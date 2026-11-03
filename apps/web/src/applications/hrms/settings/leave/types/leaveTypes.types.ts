export type LeaveTypeCategory =
  | 'paid'
  | 'unpaid'
  | 'statutory'
  | 'special_event'
  | 'compensatory'
  | 'optional_holiday'
  | 'loss_of_pay';

export type LeaveTypeUnit = 'days' | 'half_days' | 'hours';

export type LeaveDocumentRequirement = 'none' | 'optional' | 'mandatory' | 'mandatory_after_n_days';

export type PaidClassification = 'paid' | 'unpaid' | 'partly_paid';
export type DayTreatment = 'inherit' | 'count' | 'exclude';
export type GenderEligibility = 'all' | 'female' | 'male';
export type TeamCalendarVisibility = 'leave_type' | 'generic_leave' | 'none';
export type LeaveTypeColorToken = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export interface LeaveTypeItem {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  shortLabel: string;
  colorToken: string;
  description: string | null;
  instructions: string | null;
  category: LeaveTypeCategory;
  visibleToEmployee: boolean;
  isTracked: boolean;
  grantMethod: string;
  unit: LeaveTypeUnit;
  allowHalfDay: boolean;
  minPerRequest: string;
  maxPerRequest: string | null;
  maxPerMonth: string | null;
  maxPerYear: string | null;
  maxConsecutiveDays: number | null;
  countWeeklyOff: boolean;
  countHolidays: boolean;
  weeklyOffTreatment: DayTreatment;
  holidayTreatment: DayTreatment;
  sandwichRuleEnabled: boolean;
  documentRequirement: LeaveDocumentRequirement;
  documentThresholdDays: number | null;
  certificateType: string | null;
  carryForwardEnabled: boolean;
  encashmentEnabled: boolean;
  negativeBalanceEnabled: boolean;
  negativeBalanceLimit: string | null;
  countsTowardService: boolean;
  allowedInProbation: boolean;
  allowedInNoticePeriod: boolean;
  genderEligibility: GenderEligibility;
  attendanceStatusCode: string;
  countsAsPresent: boolean;
  payrollImpact: PaidClassification;
  teamCalendarVisibility: TeamCalendarVisibility;
  workflowId: string | null;
  isActive: boolean;
  isArchived: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
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
  items: LeaveTypeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: LeaveTypeSummary;
}

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  shortLabel?: string;
  colorToken?: LeaveTypeColorToken;
  category?: LeaveTypeCategory;
  description?: string | null;
  instructions?: string | null;
  paidClassification?: PaidClassification;
  isTracked?: boolean;
  visibleToEmployee?: boolean;
  allowHalfDay?: boolean;
  unit?: LeaveTypeUnit;
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
  carryForwardEnabled?: boolean;
  encashmentEnabled?: boolean;
  negativeBalanceEnabled?: boolean;
  negativeBalanceLimit?: number | null;
  allowedInProbation?: boolean;
  allowedInNoticePeriod?: boolean;
  genderEligibility?: GenderEligibility;
  countsAsPresent?: boolean;
  countsTowardService?: boolean;
  teamCalendarVisibility?: TeamCalendarVisibility;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}

export type UpdateLeaveTypeDto = Partial<CreateLeaveTypeDto>;

export interface LeaveTypeStatusChangeResponse {
  leaveType: LeaveTypeItem;
  usage: { inUse: boolean; requestCount: number; balanceCount: number };
  linkedPolicies: Array<{ id: string; name: string; code: string; status: string }>;
  warning?: string;
}
