import type { EmployeeLeaveBalance, EmployeeLeaveRequest } from '../../../../db/schema.js';
import type { HalfDaySession } from './settings.types.js';
import type { ScheduleBreakdownItem } from '../rules/leaveCalendar.js';

export interface ApplyLeaveInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  /** Set for a single-date half-day request. */
  session?: HalfDaySession | null;
}

/** A leave type the employee may apply for, with its balance in the current cycle. */
export interface LeaveBalanceSummary {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  colorToken: string;
  isTracked: boolean;
  allowHalfDay: boolean;
  instructions: string | null;
  cycleStartDate: string;
  cycleEndDate: string;
  /** Entitlement for the cycle; null when the type is not tracked (unlimited). */
  totalDays: number | null;
  usedDays: number;
  pendingDays: number;
  availableDays: number | null;
}

export interface LeaveRequestView extends Omit<EmployeeLeaveRequest, 'totalDays'> {
  totalDays: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  colorToken: string;
}

export interface EmployeeHoliday {
  name: string;
  date: string;
  dayOfWeek: string;
  type: string;
}

export interface LeaveWorkspace {
  policy: { id: string; name: string } | null;
  cycle: { start: string; end: string; label: string };
  balances: LeaveBalanceSummary[];
  requests: LeaveRequestView[];
  holidays: EmployeeHoliday[];
  /** No published holiday calendar covers this employee for the current leave year. */
  holidayCalendarMissing: boolean;
  optionalHolidayQuota: number;
}

/** Sealed on the request at submission (General Settings spec §E.3). Never recalculated. */
export interface LeaveCalculationSnapshot {
  calculationId: string;
  rulesEngineVersion: string;
  settingsVersionId: string;
  versionNumber: number;
  calculationTimestampUtc: string;
  companyTimezone: string;
  dayCountingMethod: 'working_days' | 'calendar_days';
  leaveTypeId: string;
  policyId: string;
  calculatedDurationDays: number;
  halfDaySession: HalfDaySession | null;
  requestedStartDate: string;
  requestedEndDate: string;
  cycleStartDate: string;
  scheduleSource: 'employee_schedule' | 'company_default';
  workingDays: string[];
  /** Published calendar used, or null when holidays did not affect the count. */
  holidayCalendarId: string | null;
  holidayCalendarRevision: number | null;
  documentRequired: boolean;
  workflowId: string;
  /** Active restriction rule versions evaluated (step 8). */
  restrictionRuleIds: string[];
  /** Non-blocking findings, e.g. team concurrency (Decision D7). */
  warnings: string[];
  scheduleBreakdown: ScheduleBreakdownItem[];
}

export type { EmployeeLeaveBalance, EmployeeLeaveRequest };
