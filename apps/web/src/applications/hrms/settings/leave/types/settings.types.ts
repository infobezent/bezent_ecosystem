/**
 * BEZENT HRMS Leave Domain — Frontend Settings Types
 */

export type LeaveYearCycle = 'calendar_year' | 'financial_year' | 'custom';
export type DayCountingMethod = 'working_days' | 'calendar_days';
export type BalancePrecision = 'whole_numbers' | 'half' | 'two_decimals';
export type BalanceRoundingRule = 'nearest' | 'round_up' | 'round_down';
export type LeaveSettingsStatus = 'pre_activation' | 'activated';

/** `id`/timestamps are null until the company's settings are first published. */
export interface LeaveGeneralSettings {
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
  createdAt: string | null;
  updatedAt: string | null;
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

export interface LeaveGeneralSettingsVersion {
  id: string;
  versionNumber: number;
  effectiveFrom: string;
  changeReason: string;
  settingsPayload: LeaveGeneralSettingsSnapshot;
  createdByUserId: string;
  createdAt: string;
}

export interface LeaveGeneralSettingsResponse {
  settings: LeaveGeneralSettings;
  activeVersion: LeaveGeneralSettingsVersion | null;
  latestPublishedVersion: LeaveGeneralSettingsVersion | null;
  hasScheduledFutureVersion: boolean;
}

export interface UpdateLeaveGeneralSettingsDto {
  leaveYearCycle: LeaveYearCycle;
  customYearStartDate?: string | null;
  goLiveDate: string;
  dayCountingMethod: DayCountingMethod;
  balancePrecision: BalancePrecision;
  balanceRoundingRule: BalanceRoundingRule;
  maxBackdatedDays: number;
  maxAdvanceBookingDays: number;
  changeReason: string;
  effectiveFrom?: string;
  expectedCurrentVersionNumber: number;
}
