/**
 * BEZENT HRMS Leave Domain — General Settings V1 Types & Contracts
 */

export type LeaveYearCycle = 'calendar_year' | 'financial_year' | 'custom';
export type DayCountingMethod = 'working_days' | 'calendar_days';
export type BalancePrecision = 'whole_numbers' | 'half' | 'two_decimals';
export type BalanceRoundingRule = 'nearest' | 'round_up' | 'round_down';
export type LeaveSettingsStatus = 'pre_activation' | 'activated';
export type HalfDaySession = 'first_half' | 'second_half';

/** `id`/timestamps are null until the company's settings are first published. */
export interface LeaveGeneralSettingsData {
  id: string | null;
  tenantId: string;
  companyId: string;
  leaveYearCycle: LeaveYearCycle;
  customYearStartDate: string | null;
  goLiveDate: string;
  dayCountingMethod: DayCountingMethod;
  balancePrecision: BalancePrecision;
  balanceRoundingRule: BalanceRoundingRule;
  maxBackdatedDays: number;
  maxAdvanceBookingDays: number;
  currentVersionNumber: number;
  status: LeaveSettingsStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface LeaveGeneralSettingsSnapshot {
  leaveYearCycle: LeaveYearCycle;
  customYearStartDate: string | null;
  goLiveDate: string;
  dayCountingMethod: DayCountingMethod;
  balancePrecision: BalancePrecision;
  balanceRoundingRule: BalanceRoundingRule;
  maxBackdatedDays: number;
  maxAdvanceBookingDays: number;
}

export interface LeaveGeneralSettingsVersionData {
  id: string;
  tenantId: string;
  companyId: string;
  versionNumber: number;
  effectiveFrom: Date;
  changeReason: string;
  settingsPayload: LeaveGeneralSettingsSnapshot;
  createdByUserId: string;
  createdAt: Date;
}

export interface UpdateLeaveGeneralSettingsInput {
  leaveYearCycle: LeaveYearCycle;
  customYearStartDate?: string | null;
  goLiveDate: string;
  dayCountingMethod: DayCountingMethod;
  balancePrecision: BalancePrecision;
  balanceRoundingRule: BalanceRoundingRule;
  maxBackdatedDays: number;
  maxAdvanceBookingDays: number;
  changeReason: string;
  effectiveFrom?: string | Date;
  expectedCurrentVersionNumber: number;
}

export interface ScheduleBreakdownItem {
  date: string;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayCode: string | null;
  chargedDays: number;
  exclusionReasons: string[];
}

export interface LeaveCalculationSnapshot {
  calculationId: string;
  settingsVersionId: string;
  versionNumber: number;
  calculationTimestampUtc: string;
  companyTimezone: string;
  dayCountingMethod: DayCountingMethod;
  calculatedDurationDays: number;
  halfDaySession: HalfDaySession | null;
  requestedStartDate: string;
  requestedEndDate: string;
  scheduleBreakdown: ScheduleBreakdownItem[];
}
