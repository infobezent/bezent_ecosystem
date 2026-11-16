import React, { useId, useMemo } from 'react';
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
  value: number | string;
  subPillText?: string;
  subPillVariant?:
    | 'onboarding'
    | 'active'
    | 'transfers'
    | 'promotions'
    | 'offboarding'
    | 'blue'
    | 'green'
    | 'amber'
    | 'purple'
    | 'rose';
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
  graphTag?: string;
  sparklineData?: number[];
}

/**
 * Generates a smooth Catmull-Rom to Cubic Bézier SVG sparkline line & area path.
 */
function generateSparkline(
  values: number[],
  width = 100,
  height = 44,
  padX = 4,
  padY = 6,
): { linePath: string; areaPath: string; endX: number; endY: number } {
  const n = values.length;
  if (n === 0) {
    return { linePath: '', areaPath: '', endX: width - padX, endY: height / 2 };
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const effectiveMin = Math.min(0, minVal);
  const effectiveMax = Math.max(maxVal, 5);
  const range = effectiveMax - effectiveMin || 1;

  const pts = values.map((v, i) => {
    const x = padX + (i / Math.max(1, n - 1)) * (width - 2 * padX);
    const normalized = (v - effectiveMin) / range;
    const y = height - padY - normalized * (height - 2 * padY);
    return { x, y: Math.max(padY, Math.min(height - padY, y)) };
  });

  const first = pts[0] ?? { x: padX, y: height / 2 };
  if (n === 1) {
    return {
      linePath: `M ${padX} ${first.y.toFixed(1)} L ${width - padX} ${first.y.toFixed(1)}`,
      areaPath: `M ${padX} ${first.y.toFixed(1)} L ${width - padX} ${first.y.toFixed(1)} L ${width - padX} ${height} L ${padX} ${height} Z`,
      endX: width - padX,
      endY: first.y,
    };
  }

  let line = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1] ?? first;
    const p1 = pts[i] ?? first;
    const p2 = pts[i + 1] ?? p1;
    const p3 = pts[i + 2 < n ? i + 2 : i + 1] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    line += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const last = pts[n - 1] ?? first;
  const area = `${line} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;

  return {
    linePath: line,
    areaPath: area,
    endX: last.x,
    endY: last.y,
  };
}

export const AttendanceGenericKpiCard: React.FC<AttendanceGenericKpiCardProps> = ({
  heading,
  value,
  subPillText,
  badgeText,
  loading = false,
  onClick,
  ariaLabel,
  colorScheme = 'blue',
  graphTag,
  sparklineData,
}) => {
  const gradId = useId();
  const effectivePillText = subPillText ?? badgeText;

  const variantKey: 'blue' | 'green' | 'rose' | 'amber' | 'purple' =
    colorScheme === 'employees' || colorScheme === 'green'
      ? 'green'
      : colorScheme === 'offboarding' || colorScheme === 'rose'
        ? 'rose'
        : colorScheme === 'transfers' || colorScheme === 'amber'
          ? 'amber'
          : colorScheme === 'promotions' || colorScheme === 'purple'
            ? 'purple'
            : 'blue';

  const stopColorHex = {
    blue: '#3b82f6',
    green: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    purple: '#8b5cf6',
  }[variantKey];

  const effectiveData = useMemo(() => {
    if (sparklineData && sparklineData.length > 0) return sparklineData;
    const num = typeof value === 'number' ? value : 0;
    return num > 0
      ? [Math.max(0, num - 2), num - 1, num, num - 1, num, num, num]
      : [0, 0, 0, 0, 0, 0, 0];
  }, [sparklineData, value]);

  const { linePath, areaPath, endX, endY } = useMemo(
    () => generateSparkline(effectiveData, 100, 44),
    [effectiveData],
  );

  return (
    <div
      className={`bezent-att-kpi-card bezent-att-kpi-card--${variantKey}`}
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
      {/* Left Column: Heading, Big Number, Subtitle / Status Pill */}
      <div className="bezent-att-kpi-left">
        <div className="bezent-att-kpi-heading">{heading}</div>
        <div className="bezent-att-kpi-value">
          {loading ? (
            <span className="bezent-att-kpi-val-skeleton" aria-hidden="true" />
          ) : typeof value === 'number' ? (
            value.toLocaleString()
          ) : (
            value
          )}
        </div>
        {effectivePillText && (
          <div className={`bezent-att-kpi-sub bezent-att-kpi-sub--${variantKey}`}>
            <span className="bezent-att-kpi-sub-dot" />
            {loading ? (
              <span className="bezent-att-kpi-pill-skeleton" aria-hidden="true" />
            ) : (
              <span>{effectivePillText}</span>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Inset Graph Panel with Sparkline Area Chart */}
      <div className={`bezent-att-kpi-right bezent-att-kpi-right--${variantKey}`}>
        <div className="bezent-att-kpi-right-top">
          <span className="bezent-att-kpi-graph-tag">{graphTag || '7D Trend'}</span>
          <span
            className={`bezent-att-kpi-graph-indicator bezent-att-kpi-graph-indicator--${variantKey}`}
          />
        </div>

        {loading ? (
          <div className="bezent-att-kpi-graph-skeleton" aria-hidden="true" />
        ) : (
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stopColorHex} stopOpacity="0.32" />
                <stop offset="100%" stopColor={stopColorHex} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline Guide */}
            <line
              x1={4}
              y1={38}
              x2={96}
              y2={38}
              className="bezent-att-sparkline-baseline"
              strokeDasharray="2 2"
            />

            {/* Glowing Gradient Area */}
            {areaPath && (
              <path d={areaPath} fill={`url(#${gradId})`} pointerEvents="none" />
            )}

            {/* Smooth Spline Curve Line */}
            {linePath && (
              <path
                d={linePath}
                className={`bezent-att-sparkline-line bezent-att-sparkline-line--${variantKey}`}
                pointerEvents="none"
              />
            )}

            {/* End Live Beacon Node */}
            {linePath && (
              <>
                <circle
                  cx={endX}
                  cy={endY}
                  r={5}
                  className={`bezent-att-sparkline-halo bezent-att-sparkline-halo--${variantKey}`}
                />
                <circle
                  cx={endX}
                  cy={endY}
                  r={2.5}
                  className={`bezent-att-sparkline-dot bezent-att-sparkline-dot--${variantKey}`}
                />
              </>
            )}
          </svg>
        )}
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

  const recentTrends = overviewData?.recentTrends ?? [];

  // Trend series for each card's right-side graph
  const scheduledTrend = useMemo(() => {
    if (recentTrends.length > 0) {
      return recentTrends.map((t) => Math.max(safeExpected, t.present + t.absent));
    }
    return safeExpected > 0
      ? [Math.max(0, safeExpected - 1), safeExpected, safeExpected, safeExpected, safeExpected, safeExpected, safeExpected]
      : [0, 0, 0, 0, 0, 0, 0];
  }, [recentTrends, safeExpected]);

  const presentTrend = useMemo(() => {
    if (recentTrends.length > 0) {
      return recentTrends.map((t) => t.present);
    }
    return safePresent > 0
      ? [Math.max(0, safePresent - 2), safePresent - 1, safePresent, safePresent - 1, safePresent, safePresent, safePresent]
      : [0, 0, 0, 0, 0, 0, 0];
  }, [recentTrends, safePresent]);

  const absentTrend = useMemo(() => {
    if (recentTrends.length > 0) {
      return recentTrends.map((t) => t.absent);
    }
    return safeAbsent > 0
      ? [safeAbsent + 1, safeAbsent, safeAbsent + 1, safeAbsent, safeAbsent, safeAbsent, safeAbsent]
      : [0, 0, 0, 0, 0, 0, 0];
  }, [recentTrends, safeAbsent]);

  const leaveTrend = useMemo(() => {
    return safeOnLeave > 0
      ? [Math.max(0, safeOnLeave - 1), safeOnLeave, safeOnLeave, safeOnLeave + 1, safeOnLeave, safeOnLeave, safeOnLeave]
      : [0, 0, 0, 0, 0, 0, 0];
  }, [safeOnLeave]);

  const exceptionsTrend = useMemo(() => {
    return totalExceptions > 0
      ? [
          totalExceptions + 2,
          totalExceptions + 1,
          totalExceptions + 3,
          totalExceptions + 1,
          totalExceptions + 2,
          totalExceptions,
          totalExceptions,
        ]
      : [0, 0, 0, 0, 0, 0, 0];
  }, [totalExceptions]);

  return (
    <div className="bezent-att-kpi-grid">
      {/* Card 1: Scheduled Workforce (Pastel Sky / Royal Blue) */}
      <AttendanceGenericKpiCard
        heading="Scheduled Workforce"
        value={safeExpected}
        subPillText="Shift Roster Active"
        subPillVariant="blue"
        segments={scheduledSegments}
        defaultIcon="calendar"
        loading={loading}
        colorScheme="blue"
        graphTag="Roster"
        sparklineData={scheduledTrend}
        ariaLabel="Scheduled Workforce KPI Card"
        onClick={() => navigate('/hrms/attendance/shifts')}
      />

      {/* Card 2: Present Today (Pastel Mint / Emerald Green) */}
      <AttendanceGenericKpiCard
        heading="Present Today"
        value={safePresent}
        subPillText={`${attendanceRate}% Attendance Rate`}
        subPillVariant="green"
        segments={presentSegments}
        defaultIcon="attendance"
        loading={loading}
        colorScheme="green"
        graphTag={`${attendanceRate}% Rate`}
        sparklineData={presentTrend}
        ariaLabel="Present Today KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log')}
      />

      {/* Card 3: Absent (Pastel Rose / Blush Red) */}
      <AttendanceGenericKpiCard
        heading="Absent"
        value={safeAbsent}
        subPillText={`${absentRate}% Absenteeism`}
        subPillVariant="rose"
        segments={absentSegments}
        defaultIcon="attendance"
        loading={loading}
        colorScheme="rose"
        graphTag={`${absentRate}% Rate`}
        sparklineData={absentTrend}
        ariaLabel="Absent KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log')}
      />

      {/* Card 4: On Approved Leave (Pastel Amber / Peach Warmth) */}
      <AttendanceGenericKpiCard
        heading="On Approved Leave"
        value={safeOnLeave}
        subPillText="Approved in Leave"
        subPillVariant="amber"
        segments={onLeaveSegments}
        defaultIcon="leave"
        loading={loading}
        colorScheme="amber"
        graphTag="Approved"
        sparklineData={leaveTrend}
        ariaLabel="On Approved Leave KPI Card"
        onClick={() => navigate('/hrms/leave/records')}
      />

      {/* Card 5: Exceptions & Queue (Pastel Lavender / Purple) */}
      <AttendanceGenericKpiCard
        heading="Exceptions & Queue"
        value={totalExceptions}
        subPillText={`${safePendingReg} Pending Action`}
        subPillVariant="purple"
        segments={exceptionSegments}
        defaultIcon="approvals"
        loading={loading}
        colorScheme="purple"
        graphTag="Queue"
        sparklineData={exceptionsTrend}
        ariaLabel="Attendance Exceptions & Regularization Queue KPI Card"
        onClick={() => navigate('/hrms/attendance/regularization')}
      />
    </div>
  );
};
