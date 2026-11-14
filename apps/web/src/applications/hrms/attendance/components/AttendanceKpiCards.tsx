import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BezentIcon } from '../../../../design-system/icons';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

export interface AttendanceKpiSegment {
  id: string;
  label: string;
  count: number;
  cssModifier: string;
  hoverIcon?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Number((cx + r * Math.sin(rad)).toFixed(2)),
    y: Number((cy - r * Math.cos(rad)).toFixed(2)),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const diff = endAngle - startAngle;
  const largeArcFlag = diff > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export interface AttendanceGenericKpiCardProps {
  heading: string;
  value: number;
  badgeText?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  segments: AttendanceKpiSegment[];
  defaultIcon: string;
  loading?: boolean;
  onClick?: () => void;
  ariaLabel: string;
  colorScheme?: 'green' | 'blue' | 'rose' | 'amber' | 'orange';
}

export const AttendanceGenericKpiCard: React.FC<AttendanceGenericKpiCardProps> = ({
  heading,
  value,
  badgeText,
  badgeVariant = 'neutral',
  segments,
  defaultIcon,
  loading = false,
  onClick,
  ariaLabel,
  colorScheme = 'blue',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const cx = 39;
  const cy = 39;
  const radius = 32;
  const strokeWidth = 7.2;
  const gap = 6;
  const minAngle = 8;

  const nonZeroSegments = segments.filter((s) => s.count > 0);
  const sumCounts = nonZeroSegments.reduce((sum, s) => sum + s.count, 0);
  const singleSegment = nonZeroSegments.length === 1 ? nonZeroSegments[0] : undefined;

  const k = nonZeroSegments.length;
  const totalGaps = k > 1 ? k * gap : 0;
  const availableAngle = 360 - totalGaps;
  const totalMinimums = k * minAngle;
  const remainingAngle = Math.max(0, availableAngle - totalMinimums);

  let currentAngle = 0;
  const computedArcs = segments.map((seg) => {
    if (seg.count <= 0 || sumCounts <= 0) {
      return { ...seg, pathD: '', isVisible: false };
    }
    const propSpan = (seg.count / sumCounts) * remainingAngle;
    const span = minAngle + propSpan;
    const startAngle = currentAngle + (k > 1 ? gap / 2 : 0);
    const endAngle = startAngle + span;
    currentAngle = endAngle + (k > 1 ? gap / 2 : 0);

    return {
      ...seg,
      pathD: describeArc(cx, cy, radius, startAngle, endAngle),
      isVisible: true,
    };
  });

  const hoveredSegment = segments.find((s) => s.id === hoveredId);
  const hasHover = hoveredSegment !== undefined;
  const activeIcon = hoveredSegment?.hoverIcon || defaultIcon;

  let tooltipText = '';
  if (hoveredSegment) {
    const pct = value > 0 ? Math.round((hoveredSegment.count / value) * 100) : 0;
    tooltipText = `${hoveredSegment.label}: ${hoveredSegment.count.toLocaleString()} (${pct}%)`;
  }

  return (
    <div
      className={`bezent-exec-kpi-card bezent-att-kpi-card bezent-att-kpi-card--${colorScheme}`}
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
        {/* Left Section: Small Heading + Large Primary Number + Badge */}
        <div className="bezent-kpi-employees-left">
          <div className="bezent-kpi-employees-heading">{heading}</div>
          <div className="bezent-kpi-employees-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              value.toLocaleString()
            )}
          </div>
          {badgeText && (
            <div className={`bezent-att-kpi-badge bezent-att-kpi-badge--${badgeVariant}`}>
              <span className="bezent-att-kpi-badge-dot" />
              <span>{badgeText}</span>
            </div>
          )}
        </div>

        {/* Right Section: Compact Circular Segmented Ring */}
        <div
          className="bezent-kpi-employees-right"
          onMouseLeave={() => setHoveredId(null)}
          onPointerLeave={() => setHoveredId(null)}
          aria-label={`${heading} breakdown ring`}
        >
          {/* Floating Hover Badge */}
          <div
            className={`bezent-kpi-flow-badge bezent-kpi-employees-tooltip ${hasHover ? 'is-visible' : ''}`}
            aria-live="polite"
          >
            {tooltipText}
          </div>

          <svg
            className="bezent-kpi-ring-svg"
            viewBox="0 0 78 78"
            role="img"
            aria-label={`${heading} distribution ring`}
          >
            {loading ? (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                strokeWidth={strokeWidth}
                className="bezent-kpi-ring-segment bezent-kpi-ring-segment--loading"
              />
            ) : sumCounts <= 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                strokeWidth={strokeWidth}
                className="bezent-kpi-ring-empty-track"
              />
            ) : singleSegment ? (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                strokeWidth={strokeWidth}
                className={`bezent-kpi-ring-segment bezent-kpi-ring-segment--${singleSegment.cssModifier} ${
                  hoveredId === singleSegment.id ? 'bezent-kpi-ring-segment--hovered' : ''
                }`}
                onMouseEnter={() => setHoveredId(singleSegment.id)}
                onFocus={() => setHoveredId(singleSegment.id)}
                onBlur={() => setHoveredId(null)}
                tabIndex={0}
                role="button"
                aria-label={`${singleSegment.label}: ${singleSegment.count.toLocaleString()}`}
              />
            ) : (
              computedArcs.map((arc) => {
                if (!arc.isVisible) return null;
                const isHovered = hoveredId === arc.id;
                const dynamicStrokeWidth = isHovered ? 8.5 : strokeWidth;

                return (
                  <path
                    key={arc.id}
                    d={arc.pathD}
                    strokeWidth={dynamicStrokeWidth}
                    className={`bezent-kpi-ring-segment bezent-kpi-ring-segment--${arc.cssModifier} ${
                      isHovered ? 'bezent-kpi-ring-segment--hovered' : ''
                    } ${hasHover && !isHovered ? 'bezent-kpi-ring-segment--dimmed' : ''}`}
                    onMouseEnter={() => setHoveredId(arc.id)}
                    onPointerEnter={() => setHoveredId(arc.id)}
                    onFocus={() => setHoveredId(arc.id)}
                    onBlur={() => setHoveredId(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${arc.label}: ${arc.count.toLocaleString()}`}
                  />
                );
              })
            )}
          </svg>

          {/* Ring Center Dynamic Icon */}
          <div className="bezent-kpi-ring-center" aria-hidden="true">
            <div
              className={`bezent-kpi-ring-icon-wrapper ${
                hasHover
                  ? `bezent-kpi-ring-icon-wrapper--${hoveredSegment?.cssModifier}`
                  : 'bezent-kpi-ring-icon-wrapper--default'
              }`}
            >
              <BezentIcon name={activeIcon} size={19} />
            </div>
          </div>
        </div>
      </div>
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
      cssModifier: 'shift-general',
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
      cssModifier: 'exception-orange',
      hoverIcon: 'timeTracker',
    },
    {
      id: 'regularization',
      label: 'Pending Regularization',
      count: safePendingReg,
      cssModifier: 'exception-rose',
      hoverIcon: 'approvals',
    },
  ];

  return (
    <div className="bezent-att-kpi-grid">
      {/* Card 1: Scheduled Workforce */}
      <AttendanceGenericKpiCard
        heading="Scheduled Workforce"
        value={safeExpected}
        badgeText="Shift Roster Active"
        badgeVariant="neutral"
        segments={scheduledSegments}
        defaultIcon="calendar"
        loading={loading}
        colorScheme="blue"
        ariaLabel="Scheduled Workforce KPI Card"
        onClick={() => navigate('/hrms/attendance/shifts')}
      />

      {/* Card 2: Present Today */}
      <AttendanceGenericKpiCard
        heading="Present Today"
        value={safePresent}
        badgeText={`${attendanceRate}% Attendance Rate`}
        badgeVariant="success"
        segments={presentSegments}
        defaultIcon="attendance"
        loading={loading}
        colorScheme="green"
        ariaLabel="Present Today KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log')}
      />

      {/* Card 3: Absent */}
      <AttendanceGenericKpiCard
        heading="Absent"
        value={safeAbsent}
        badgeText={`${absentRate}% Absenteeism`}
        badgeVariant="danger"
        segments={absentSegments}
        defaultIcon="attendance"
        loading={loading}
        colorScheme="rose"
        ariaLabel="Absent KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log')}
      />

      {/* Card 4: On Leave */}
      <AttendanceGenericKpiCard
        heading="On Approved Leave"
        value={safeOnLeave}
        badgeText="Planned Absence"
        badgeVariant="info"
        segments={onLeaveSegments}
        defaultIcon="leave"
        loading={loading}
        colorScheme="blue"
        ariaLabel="On Leave KPI Card"
        onClick={() => navigate('/hrms/leave')}
      />

      {/* Card 5: Exceptions & Requests */}
      <AttendanceGenericKpiCard
        heading="Exceptions & Queue"
        value={totalExceptions}
        badgeText={`${safeMissingPunch} Missing · ${safePendingReg} Pending`}
        badgeVariant={totalExceptions > 0 ? 'warning' : 'neutral'}
        segments={exceptionSegments}
        defaultIcon="approvals"
        loading={loading}
        colorScheme="orange"
        ariaLabel="Attendance Exceptions & Regularization Queue KPI Card"
        onClick={() => navigate('/hrms/attendance/regularizations')}
      />
    </div>
  );
};
