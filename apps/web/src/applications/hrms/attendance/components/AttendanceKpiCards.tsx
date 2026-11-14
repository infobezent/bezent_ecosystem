import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

export interface AttendanceKpiSegment {
  id: string;
  label: string;
  count: number;
  cssModifier: string;
  hoverIcon?: string;
}

export interface AttendanceGenericKpiCardProps {
  heading: string;
  value: number;
  subPillText?: string;
  subPillVariant?: 'onboarding' | 'active' | 'transfers' | 'promotions' | 'offboarding';
  badgeText?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  segments?: AttendanceKpiSegment[];
  defaultIcon?: string;
  loading?: boolean;
  onClick?: () => void;
  ariaLabel: string;
  colorScheme?:
    | 'blue'
    | 'employees'
    | 'offboarding'
    | 'transfers'
    | 'promotions'
    | 'green'
    | 'amber'
    | 'purple'
    | 'rose'
    | 'orange';
}

export const AttendanceGenericKpiCard: React.FC<AttendanceGenericKpiCardProps> = ({
  heading,
  value,
  subPillText,
  subPillVariant = 'active',
  badgeText,
  loading = false,
  onClick,
  ariaLabel,
  colorScheme = 'blue',
}) => {
  const effectivePillText = subPillText ?? badgeText;

  return (
    <div
      className={`bezent-exec-kpi-card bezent-exec-kpi-card--${colorScheme}`}
      onClick={onClick}
      role="region"
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="bezent-kpi-employees-layout">
        {/* Left Section: Small Heading + Large Primary Number */}
        <div className="bezent-kpi-employees-left">
          <div className="bezent-kpi-employees-heading">{heading}</div>
          <div className="bezent-kpi-employees-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              value.toLocaleString()
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Sub-Pill Badge Matching Workforce ── */}
      {effectivePillText && (
        <div className={`bezent-kpi-sub-pill bezent-kpi-sub-pill--${subPillVariant}`}>
          <span className="bezent-kpi-sub-pill-dot" />
          {loading ? (
            <span className="bezent-kpi-pill-skeleton" aria-hidden="true" />
          ) : (
            <span>{effectivePillText}</span>
          )}
        </div>
      )}
    </div>
  );
};

export interface AttendanceKpiDeckProps {
  overviewData: AttendanceOverviewKpis | null;
  loading?: boolean;
}

export const AttendanceKpiDeck: React.FC<AttendanceKpiDeckProps> = ({
  overviewData,
  loading = false,
}) => {
  const navigate = useNavigate();

  // 1. Scheduled Workforce (Total Expected)
  const safeExpected = overviewData?.expectedCount ?? 0;
  const scheduledSegments: AttendanceKpiSegment[] = [
    {
      id: 'scheduled',
      label: 'Rostered Shifts',
      count: safeExpected,
      cssModifier: 'scheduled',
      hoverIcon: 'calendar',
    },
  ];

  // 2. Present Today (Punctuality breakdown: On-Time, Late, Half-Day)
  const safePresent = overviewData?.presentCount ?? 0;
  const safeLate = overviewData?.lateCount ?? 0;
  const safeHalfDay = overviewData?.halfDayCount ?? 0;
  const safeOnTime = Math.max(0, safePresent - safeLate - safeHalfDay);
  const attendanceRate = overviewData?.attendanceRate ?? 0;

  const presentSegments: AttendanceKpiSegment[] = [
    {
      id: 'ontime',
      label: 'On-Time',
      count: safeOnTime,
      cssModifier: 'ontime',
      hoverIcon: 'attendance',
    },
    {
      id: 'late',
      label: 'Late Arrival',
      count: safeLate,
      cssModifier: 'late',
      hoverIcon: 'timeTracker',
    },
    {
      id: 'halfday',
      label: 'Half Day',
      count: safeHalfDay,
      cssModifier: 'halfday',
      hoverIcon: 'timeTracker',
    },
  ];

  // 3. Absent (Unplanned Absence)
  const safeAbsent = overviewData?.absentCount ?? 0;
  const absentRate = safeExpected > 0 ? ((safeAbsent / safeExpected) * 100).toFixed(1) : '0';
  const absentSegments: AttendanceKpiSegment[] = [
    {
      id: 'absent',
      label: 'Unplanned Absent',
      count: safeAbsent,
      cssModifier: 'absent',
      hoverIcon: 'attendance',
    },
  ];

  // 4. On Leave (Approved Leaves)
  const safeOnLeave = overviewData?.onLeaveCount ?? 0;
  const onLeaveSegments: AttendanceKpiSegment[] = [
    {
      id: 'leave',
      label: 'Approved Leave',
      count: safeOnLeave,
      cssModifier: 'leave',
      hoverIcon: 'leave',
    },
  ];

  // 5. Exceptions & Requests Queue
  const safeMissingPunch = overviewData?.missingPunchCount ?? 0;
  const safePendingReg = overviewData?.pendingRegularizationCount ?? 0;
  const totalExceptions = safeMissingPunch + safePendingReg;

  const exceptionSegments: AttendanceKpiSegment[] = [
    {
      id: 'missing_punch',
      label: 'Missing Punches',
      count: safeMissingPunch,
      cssModifier: 'missing-punch',
      hoverIcon: 'timeTracker',
    },
    {
      id: 'regularization',
      label: 'Pending Regularization',
      count: safePendingReg,
      cssModifier: 'regularization',
      hoverIcon: 'approvals',
    },
  ];

  return (
    <div className="bezent-att-kpi-grid">
      {/* Card 1: Scheduled Workforce (Pastel Sky / Royal Blue) */}
      <AttendanceGenericKpiCard
        heading="Scheduled Workforce"
        value={safeExpected}
        subPillText="Shift Roster Active"
        subPillVariant="onboarding"
        segments={scheduledSegments}
        defaultIcon="calendar"
        loading={loading}
        colorScheme="blue"
        ariaLabel="Scheduled Workforce KPI Card"
        onClick={() => navigate('/hrms/attendance/shifts')}
      />

      {/* Card 2: Present Today (Pastel Mint / Emerald Green) */}
      <AttendanceGenericKpiCard
        heading="Present Today"
        value={safePresent}
        subPillText={`${attendanceRate}% Attendance Rate`}
        subPillVariant="active"
        segments={presentSegments}
        defaultIcon="attendance"
        loading={loading}
        colorScheme="employees"
        ariaLabel="Present Today KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log')}
      />

      {/* Card 3: Absent (Pastel Rose / Blush Red) */}
      <AttendanceGenericKpiCard
        heading="Absent"
        value={safeAbsent}
        subPillText={`${absentRate}% Absenteeism`}
        subPillVariant="offboarding"
        segments={absentSegments}
        defaultIcon="attendance"
        loading={loading}
        colorScheme="offboarding"
        ariaLabel="Absent KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log')}
      />

      {/* Card 4: On Approved Leave (Pastel Amber / Peach Warmth) */}
      <AttendanceGenericKpiCard
        heading="On Approved Leave"
        value={safeOnLeave}
        subPillText="Approved in Leave"
        subPillVariant="transfers"
        segments={onLeaveSegments}
        defaultIcon="leave"
        loading={loading}
        colorScheme="transfers"
        ariaLabel="On Approved Leave KPI Card"
        onClick={() => navigate('/hrms/leave/records')}
      />

      {/* Card 5: Exceptions & Queue (Pastel Lavender / Purple) */}
      <AttendanceGenericKpiCard
        heading="Exceptions & Queue"
        value={totalExceptions}
        subPillText={`${safePendingReg} Pending Action`}
        subPillVariant="promotions"
        segments={exceptionSegments}
        defaultIcon="approvals"
        loading={loading}
        colorScheme="promotions"
        ariaLabel="Attendance Exceptions & Regularization Queue KPI Card"
        onClick={() => navigate('/hrms/attendance/regularization')}
      />
    </div>
  );
};
