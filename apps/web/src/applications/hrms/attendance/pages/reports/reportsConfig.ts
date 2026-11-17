/**
 * Attendance Reports Configuration & URL Contract Specification
 *
 * CANONICAL URL CONTRACT:
 * - `period`: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'
 * - `from`: string (YYYY-MM-DD)
 * - `to`: string (YYYY-MM-DD)
 * - `month`: string (YYYY-MM)
 * - `departmentId`: string
 * - `date`: string (YYYY-MM-DD) — specifically accepted by R01 (Daily Attendance)
 *
 * MAPPING CONTRACT FOR R12 (Absenteeism):
 * - Today: R12 reads no URL query parameters (local state only).
 * - Contract: reads `period`, `from`, `to`, `departmentId`.
 */

import type { ReportId } from '../../types/attendanceReports.types';

export type ReportPeriodPreset =
  'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface ReportUiConfig {
  id: ReportId;
  iconName: string;
  targetRoute: string;
  order: number;
  validPeriods: ReportPeriodPreset[];
  defaultPeriod: ReportPeriodPreset;
  shortSubtitle: string;
}

export interface ReportFallbackCopy {
  name: string;
  tag: string;
  description: string;
}

export const CANONICAL_REPORT_IDS = ['R01', 'R02', 'R13', 'R05', 'R10', 'R06', 'R12'] as const;

export type CanonicalReportId = (typeof CANONICAL_REPORT_IDS)[number];

export const REPORT_UI_CONFIGS: Record<CanonicalReportId, ReportUiConfig> = {
  R01: {
    id: 'R01',
    iconName: 'attendance',
    targetRoute: '/hrms/attendance/daily-log',
    order: 1,
    validPeriods: ['today', 'yesterday', 'custom'],
    defaultPeriod: 'today',
    shortSubtitle: 'Check-in, check-out & punctuality',
  },
  R02: {
    id: 'R02',
    iconName: 'calendar',
    targetRoute: '/hrms/attendance/monthly-summary?view=grid',
    order: 2,
    validPeriods: ['this_month', 'last_month', 'custom'],
    defaultPeriod: 'this_month',
    shortSubtitle: 'Monthly day-wise attendance status',
  },
  R13: {
    id: 'R13',
    iconName: 'payroll',
    targetRoute: '/hrms/attendance/monthly-summary?view=summary',
    order: 3,
    validPeriods: ['this_month', 'last_month', 'custom'],
    defaultPeriod: 'this_month',
    shortSubtitle: 'Payable days for payroll handover',
  },
  R05: {
    id: 'R05',
    iconName: 'timeTracker',
    targetRoute: '/hrms/attendance/punch-logs',
    order: 4,
    validPeriods: ['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'],
    defaultPeriod: 'today',
    shortSubtitle: 'Punctuality flags & missed punches',
  },
  R10: {
    id: 'R10',
    iconName: 'approvals',
    targetRoute: '/hrms/attendance/regularization',
    order: 5,
    validPeriods: ['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'],
    defaultPeriod: 'this_month',
    shortSubtitle: 'Requests, approvals & turnaround',
  },
  R06: {
    id: 'R06',
    iconName: 'shifts',
    targetRoute: '/hrms/attendance/overtime',
    order: 6,
    validPeriods: ['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'],
    defaultPeriod: 'this_month',
    shortSubtitle: 'OT hours & comp-off balances',
  },
  R12: {
    id: 'R12',
    iconName: 'reports',
    targetRoute: '/hrms/attendance/reports?report=R12',
    order: 7,
    validPeriods: ['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'],
    defaultPeriod: 'this_month',
    shortSubtitle: 'Absence rate trends & analytics',
  },
};

/**
 * Offline / Fallback Copy used strictly if GET /reports/catalog fails to load
 */
export const REPORT_FALLBACK_COPY: Record<CanonicalReportId, ReportFallbackCopy> = {
  R01: {
    name: 'Daily Attendance',
    tag: 'Daily Operations',
    description: 'Status, in and out times, hours, late and early minutes for each employee.',
  },
  R02: {
    name: 'Monthly Muster Roll',
    tag: 'Monthly Registers',
    description:
      'Status grid for the month with totals for present, absent, leave and payable days.',
  },
  R13: {
    name: 'Attendance Summary',
    tag: 'Payroll Handover',
    description: 'Present, absent, leave and payable days for each employee.',
  },
  R05: {
    name: 'Late, Early and Missed Punch',
    tag: 'Exceptions & Compliance',
    description: 'Late marks, early-outs, missed punches and their regularization status.',
  },
  R10: {
    name: 'Regularization',
    tag: 'Operational Workflows',
    description: 'Requests raised, approved and rejected, with approver and turnaround.',
  },
  R06: {
    name: 'Overtime and Comp-Off',
    tag: 'Operational Workflows',
    description:
      'Overtime hours, rate type and cost, with comp-off earned, used, expired and balance.',
  },
  R12: {
    name: 'Absenteeism',
    tag: 'Trends & Analytics',
    description: 'Absence rate by employee, department and month.',
  },
};
