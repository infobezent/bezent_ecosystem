import React, { useState, useId, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

export interface AttendanceKpiSegment {
  id: string;
  label: string;
  count: number;
  cssModifier: string;
  hoverIcon?: string;
}

export interface SparklinePoint {
  date: string;
  formattedDate: string;
  value: number;
  rate?: number;
  detail?: string;
}

interface NormalizedTrendPoint {
  date: string;
  scheduled: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
  absenceRate: number;
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
  points?: SparklinePoint[];
  sparklineData?: number[];
  graphType?: 'sparkline' | 'bar' | 'step' | 'donut' | 'pulse';
}

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Generates an interactive smooth Catmull-Rom to Cubic Bézier SVG sparkline line & area path.
 * Handles all-zero, constant non-zero, and fluctuating series gracefully.
 */
function generateSparkline(
  pointList: SparklinePoint[],
  width = 100,
  height = 44,
  padX = 5,
  padY = 6,
): {
  linePath: string;
  areaPath: string;
  pts: Array<{ x: number; y: number; point: SparklinePoint }>;
  endX: number;
  endY: number;
} {
  const n = pointList.length;
  if (n === 0) {
    return { linePath: '', areaPath: '', pts: [], endX: width - padX, endY: height / 2 };
  }

  const values = pointList.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const allZero = maxVal === 0 && minVal === 0;
  const allEqual = maxVal === minVal && !allZero;

  const baselineY = height - padY;

  let pts: Array<{ x: number; y: number; point: SparklinePoint }>;

  if (allZero) {
    // Clean straight baseline at bottom
    pts = pointList.map((p, i) => ({
      x: padX + (i / Math.max(1, n - 1)) * (width - 2 * padX),
      y: baselineY,
      point: p,
    }));
  } else if (allEqual) {
    // Constant non-zero value: placed stably in upper-middle leaving room for gradient area
    const midY = Math.round(height * 0.45);
    pts = pointList.map((p, i) => ({
      x: padX + (i / Math.max(1, n - 1)) * (width - 2 * padX),
      y: midY,
      point: p,
    }));
  } else {
    // Normalization with dynamic variance
    const effectiveMin = Math.min(0, minVal);
    const effectiveMax = Math.max(maxVal, 1);
    const range = effectiveMax - effectiveMin || 1;

    pts = pointList.map((p, i) => {
      const x = padX + (i / Math.max(1, n - 1)) * (width - 2 * padX);
      const normalized = (p.value - effectiveMin) / range;
      const y = baselineY - normalized * (baselineY - padY);
      return { x, y: Math.max(padY, Math.min(baselineY, y)), point: p };
    });
  }

  const first = pts[0] ?? { x: padX, y: baselineY, point: pointList[0]! };
  const last = pts[n - 1] ?? first;

  if (n === 1) {
    return {
      linePath: `M ${padX} ${first.y.toFixed(1)} L ${width - padX} ${first.y.toFixed(1)}`,
      areaPath: `M ${padX} ${first.y.toFixed(1)} L ${width - padX} ${first.y.toFixed(1)} L ${width - padX} ${baselineY} L ${padX} ${baselineY} Z`,
      pts,
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

  const area = `${line} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;

  return {
    linePath: line,
    areaPath: area,
    pts,
    endX: last.x,
    endY: last.y,
  };
}

/** Step (staircase) path — horizontal then vertical segments */
function generateStepPath(
  pointList: SparklinePoint[],
  width = 100,
  height = 44,
  padX = 5,
  padY = 6,
): { stepPath: string; pts: Array<{ x: number; y: number; point: SparklinePoint }> } {
  const n = pointList.length;
  if (n === 0) return { stepPath: '', pts: [] };
  const values = pointList.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const allZero = maxVal === 0 && minVal === 0;
  const baselineY = height - padY;
  const range = allZero ? 1 : Math.max(maxVal, 1) - Math.min(0, minVal);
  const effectiveMin = allZero ? 0 : Math.min(0, minVal);
  const pts = pointList.map((p, i) => ({
    x: padX + (i / Math.max(1, n - 1)) * (width - 2 * padX),
    y: allZero
      ? baselineY
      : Math.max(padY, baselineY - ((p.value - effectiveMin) / range) * (baselineY - padY)),
    point: p,
  }));
  let path = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    path += ` H ${pts[i]!.x.toFixed(1)} V ${pts[i]!.y.toFixed(1)}`;
  }
  return { stepPath: path, pts };
}

/** Bar chart data — returns rect geometry for each point */
function generateBarData(
  pointList: SparklinePoint[],
  width = 100,
  height = 44,
  padX = 5,
  padY = 6,
): Array<{ x: number; barH: number; y: number; barW: number; point: SparklinePoint }> {
  const n = pointList.length;
  if (n === 0) return [];
  const maxVal = Math.max(...pointList.map((p) => p.value), 1);
  const plotH = height - padY - padY;
  const totalW = width - 2 * padX;
  const step = totalW / n;
  const barW = Math.max(2, step - 3);
  return pointList.map((p, i) => {
    const barH = Math.max(2, (p.value / maxVal) * plotH);
    const x = padX + i * step + (step - barW) / 2;
    return { x, barH, y: height - padY - barH, barW, point: p };
  });
}

/** ECG-style pulse path — baseline with spikes at each data point */
function generatePulsePath(
  pointList: SparklinePoint[],
  width = 100,
  height = 44,
  padX = 5,
  padY = 6,
): { pulsePath: string; pts: Array<{ x: number; y: number; point: SparklinePoint }> } {
  const n = pointList.length;
  if (n === 0) return { pulsePath: '', pts: [] };
  const values = pointList.map((p) => p.value);
  const maxVal = Math.max(...values, 1);
  const baselineY = height - padY;
  const midY = height / 2;
  const pts = pointList.map((p, i) => ({
    x: padX + (i / Math.max(1, n - 1)) * (width - 2 * padX),
    y:
      p.value === 0
        ? midY
        : Math.max(padY, baselineY - (p.value / maxVal) * (baselineY - padY)),
    point: p,
  }));
  let path = `M ${pts[0]!.x.toFixed(1)} ${midY}`;
  pts.forEach((pt, i) => {
    if (i === 0) return;
    const prev = pts[i - 1]!;
    const midX = (prev.x + pt.x) / 2;
    path += ` L ${midX.toFixed(1)} ${midY}`;
    path += ` L ${(midX + 2).toFixed(1)} ${pt.y.toFixed(1)}`;
    path += ` L ${(pt.x - 2).toFixed(1)} ${pt.y.toFixed(1)}`;
    path += ` L ${pt.x.toFixed(1)} ${midY}`;
  });
  return { pulsePath: path, pts };
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
  points,
  sparklineData,
  graphType = 'sparkline',
}) => {
  const gradId = useId();
  const navigate = useNavigate();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  // Resolve 7-point array
  const effectivePoints: SparklinePoint[] = useMemo(() => {
    if (points && points.length > 0) return points;
    if (sparklineData && sparklineData.length > 0) {
      return sparklineData.map((val, idx) => ({
        date: '',
        formattedDate: `Day ${idx + 1}`,
        value: val,
      }));
    }
    const num = typeof value === 'number' ? value : 0;
    const baseDate = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      return {
        date: dateStr,
        formattedDate: formatDateShort(dateStr),
        value: num,
      };
    });
  }, [points, sparklineData, value]);

  const { linePath, areaPath, pts, endX, endY } = useMemo(
    () => generateSparkline(effectivePoints, 100, 44),
    [effectivePoints],
  );

  const barData = useMemo(
    () => (graphType === 'bar' ? generateBarData(effectivePoints, 100, 44) : []),
    [graphType, effectivePoints],
  );

  const { stepPath, pts: stepPts } = useMemo(
    () =>
      graphType === 'step'
        ? generateStepPath(effectivePoints, 100, 44)
        : { stepPath: '', pts: [] },
    [graphType, effectivePoints],
  );

  const { pulsePath, pts: pulsePts } = useMemo(
    () =>
      graphType === 'pulse'
        ? generatePulsePath(effectivePoints, 100, 44)
        : { pulsePath: '', pts: [] },
    [graphType, effectivePoints],
  );

  // Resolve the active point source depending on graph type
  const activePts: Array<{ x: number; y: number; point: SparklinePoint }> =
    graphType === 'step'
      ? stepPts
      : graphType === 'pulse'
        ? pulsePts
        : graphType === 'bar'
          ? barData.map((b) => ({ x: b.x + b.barW / 2, y: b.y, point: b.point }))
          : pts;

  const activePt = hoveredIdx !== null && activePts[hoveredIdx] ? activePts[hoveredIdx] : null;

  const displayValue = activePt ? activePt.point.value : value;
  const displayPillText = activePt
    ? `${activePt.point.formattedDate} · ${activePt.point.detail || activePt.point.value}`
    : effectivePillText;

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
      {/* Left Column: Heading, Value (with live scrub on hover), Subtitle Pill */}
      <div className="bezent-att-kpi-left">
        <div className="bezent-att-kpi-heading">{heading}</div>
        <div className="bezent-att-kpi-value">
          {loading ? (
            <span className="bezent-att-kpi-val-skeleton" aria-hidden="true" />
          ) : typeof displayValue === 'number' ? (
            displayValue.toLocaleString()
          ) : (
            displayValue
          )}
        </div>
        {displayPillText && (
          <div
            className={`bezent-att-kpi-sub bezent-att-kpi-sub--${variantKey} ${
              activePt ? 'is-scrubbing' : ''
            }`}
          >
            <span className="bezent-att-kpi-sub-dot" />
            {loading ? (
              <span className="bezent-att-kpi-pill-skeleton" aria-hidden="true" />
            ) : (
              <span>{displayPillText}</span>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Inset Graph Panel with Interactive Scrubbing */}
      <div
        className={`bezent-att-kpi-right bezent-att-kpi-right--${variantKey}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width <= 0 || activePts.length === 0) return;
          const relX = (e.clientX - rect.left) / rect.width;
          const svgX = relX * 100;
          let bestIdx = 0;
          let bestDist = Infinity;
          activePts.forEach((pt, idx) => {
            const dist = Math.abs(pt.x - svgX);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = idx;
            }
          });
          setHoveredIdx(bestIdx);
        }}
        onMouseLeave={() => setHoveredIdx(null)}
        onClick={(e) => {
          if (activePt && activePt.point.date) {
            e.stopPropagation();
            navigate(`/hrms/attendance/daily-log?date=${activePt.point.date}`);
          }
        }}
        title="Hover along curve to inspect daily numbers · Click point to open daily log"
      >
        <div className="bezent-att-kpi-right-top">
          <span
            className={`bezent-att-kpi-graph-tag ${activePt ? 'is-scrubbing' : ''}`}
          >
            {activePt
              ? `${activePt.point.formattedDate}: ${activePt.point.value}`
              : graphTag || '7D Trend'}
          </span>
          <span
            className={`bezent-att-kpi-graph-indicator bezent-att-kpi-graph-indicator--${variantKey}`}
          />
        </div>

        {loading ? (
          <div className="bezent-att-kpi-graph-skeleton" aria-hidden="true" />
        ) : graphType === 'bar' ? (
          /* ── Card 1: Vertical Bar Chart (blue / Scheduled Workforce) ── */
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stopColorHex} stopOpacity="0.9" />
                <stop offset="100%" stopColor={stopColorHex} stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {barData.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.barW}
                height={b.barH}
                rx={2}
                className={`bezent-att-sparkline-bar${hoveredIdx === i ? ' is-active' : ''}`}
                fill={hoveredIdx === i ? stopColorHex : `url(#${gradId})`}
                opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.45 : 1}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            ))}
            {activePt && (() => {
              const tipW = 48; const tipH = 12;
              let tipX = activePt.x - tipW / 2;
              if (tipX < 2) tipX = 2;
              if (tipX + tipW > 98) tipX = 98 - tipW;
              const tipY = Math.max(1, activePt.y - tipH - 4);
              return (
                <g transform={`translate(${tipX}, ${tipY})`} pointerEvents="none">
                  <rect width={tipW} height={tipH} rx={3} className="bezent-att-sparkline-tip-bg" />
                  <text x={tipW / 2} y={8.5} textAnchor="middle" className="bezent-att-sparkline-tip-text">
                    {activePt.point.formattedDate}: {activePt.point.value}
                  </text>
                </g>
              );
            })()}
          </svg>
        ) : graphType === 'step' ? (
          /* ── Card 3: Step (Staircase) Chart (rose / Absent) ── */
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            <line x1={4} y1={38} x2={96} y2={38} className="bezent-att-sparkline-baseline" strokeDasharray="2 2" />
            {stepPath && (
              <path d={stepPath} className="bezent-att-sparkline-step" pointerEvents="none" />
            )}
            {stepPts.map((pt, i) => (
              <polygon
                key={i}
                points={`${pt.x},${pt.y - 4} ${pt.x + 3.5},${pt.y} ${pt.x},${pt.y + 4} ${pt.x - 3.5},${pt.y}`}
                className={`bezent-att-sparkline-diamond${hoveredIdx === i ? ' is-active' : ''}`}
                fill={hoveredIdx === i ? '#f43f5e' : '#fff'}
                stroke="#f43f5e"
                strokeWidth="1.5"
                onMouseEnter={() => setHoveredIdx(i)}
              />
            ))}
            {activePt && (() => {
              const tipW = 48; const tipH = 12;
              let tipX = activePt.x - tipW / 2;
              if (tipX < 2) tipX = 2;
              if (tipX + tipW > 98) tipX = 98 - tipW;
              const tipY = Math.max(1, activePt.y - tipH - 8);
              return (
                <g transform={`translate(${tipX}, ${tipY})`} pointerEvents="none">
                  <rect width={tipW} height={tipH} rx={3} className="bezent-att-sparkline-tip-bg" />
                  <text x={tipW / 2} y={8.5} textAnchor="middle" className="bezent-att-sparkline-tip-text">
                    {activePt.point.formattedDate}: {activePt.point.value}
                  </text>
                </g>
              );
            })()}
          </svg>
        ) : graphType === 'donut' ? (
          /* ── Card 4: Donut Ring Gauge (amber / On Approved Leave) ── */
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            {(() => {
              const cx = 22; const cy = 22; const r = 15;
              const circumference = 2 * Math.PI * r;
              const numericValue = typeof value === 'number' ? value : 0;
              const totalExpected = Math.max(effectivePoints.reduce((s, p) => s + p.value, 0), numericValue, 1);
              const rate = Math.min(100, (numericValue / (totalExpected > 0 ? totalExpected : 1)) * 100);
              const fillLen = (rate / 100) * circumference;
              const offset = circumference / 4;
              return (
                <>
                  <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={6} className="bezent-att-sparkline-donut-bg" />
                  <circle
                    cx={cx} cy={cy} r={r} fill="none"
                    stroke="#f59e0b" strokeWidth={6}
                    strokeDasharray={`${fillLen.toFixed(2)} ${circumference.toFixed(2)}`}
                    strokeLinecap="round"
                    strokeDashoffset={offset}
                    className="bezent-att-sparkline-donut-fill"
                    transform={`rotate(-90 ${cx} ${cy})`}
                  />
                  <text x={cx} y={cy + 3.5} textAnchor="middle" className="bezent-att-sparkline-donut-text" fontSize={9} fontWeight={800}>
                    {numericValue}
                  </text>
                  {/* Pip dots for each day around the ring bottom */}
                  {effectivePoints.slice(-7).map((p, i, arr) => {
                    const angle = ((i / Math.max(arr.length - 1, 1)) * 180 - 90) * (Math.PI / 180);
                    const px = cx + (r + 7) * Math.cos(angle);
                    const py = cy + (r + 7) * Math.sin(angle);
                    return (
                      <circle
                        key={i}
                        cx={px}
                        cy={py}
                        r={2}
                        className={p.value > 0 ? 'bezent-att-sparkline-pip-active' : 'bezent-att-sparkline-pip-inactive'}
                      />
                    );
                  })}
                  {/* Mini sparkline on the right 55% */}
                  {effectivePoints.length > 1 && (() => {
                    const sx = 48; const sw = 48; const sy = 6; const sh = 32;
                    const maxV = Math.max(...effectivePoints.map((p) => p.value), 1);
                    const spPts = effectivePoints.map((p, i) => ({
                      x: sx + (i / Math.max(effectivePoints.length - 1, 1)) * sw,
                      y: sy + sh - (p.value / maxV) * sh,
                    }));
                    const lineD = spPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
                    return (
                      <path
                        d={lineD}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                        pointerEvents="none"
                      />
                    );
                  })()}
                </>
              );
            })()}
          </svg>
        ) : graphType === 'pulse' ? (
          /* ── Card 5: ECG Pulse Telemetry (purple / Exceptions & Queue) ── */
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            <line x1={4} y1={22} x2={96} y2={22} className="bezent-att-sparkline-baseline" strokeDasharray="2 2" />
            {pulsePath && (
              <path d={pulsePath} className="bezent-att-sparkline-pulse" pointerEvents="none" />
            )}
            {!activePt && pulsePts.length > 0 && (() => {
              const last = pulsePts[pulsePts.length - 1]!;
              return (
                <>
                  <circle
                    cx={last.x} cy={last.y} r={7}
                    className={`bezent-att-sparkline-halo bezent-att-sparkline-halo--${variantKey} bezent-att-sparkline-alert-beacon`}
                  />
                  <circle
                    cx={last.x} cy={last.y} r={2.5}
                    className={`bezent-att-sparkline-dot bezent-att-sparkline-dot--${variantKey}`}
                  />
                </>
              );
            })()}
            {activePt && (
              <g className="bezent-att-sparkline-tracker" pointerEvents="none">
                <line x1={activePt.x} y1={2} x2={activePt.x} y2={38} className="bezent-att-sparkline-guideline" />
                <circle cx={activePt.x} cy={activePt.y} r={6} className={`bezent-att-sparkline-halo bezent-att-sparkline-halo--${variantKey}`} />
                <circle cx={activePt.x} cy={activePt.y} r={2.8} className={`bezent-att-sparkline-dot bezent-att-sparkline-dot--${variantKey}`} />
                {(() => {
                  const tipW = 48; const tipH = 12;
                  let tipX = activePt.x - tipW / 2;
                  if (tipX < 2) tipX = 2;
                  if (tipX + tipW > 98) tipX = 98 - tipW;
                  const tipY = Math.max(1, activePt.y - tipH - 4);
                  return (
                    <g transform={`translate(${tipX}, ${tipY})`}>
                      <rect width={tipW} height={tipH} rx={3} className="bezent-att-sparkline-tip-bg" />
                      <text x={tipW / 2} y={8.5} textAnchor="middle" className="bezent-att-sparkline-tip-text">
                        {activePt.point.formattedDate}: {activePt.point.value}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}
          </svg>
        ) : (
          /* ── Cards 2 (green / Present Today): Smooth Sparkline (default) ── */
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

            <line
              x1={4}
              y1={38}
              x2={96}
              y2={38}
              className="bezent-att-sparkline-baseline"
              strokeDasharray="2 2"
            />

            {areaPath && (
              <path d={areaPath} fill={`url(#${gradId})`} pointerEvents="none" />
            )}

            {linePath && (
              <path
                d={linePath}
                className={`bezent-att-sparkline-line bezent-att-sparkline-line--${variantKey}`}
                pointerEvents="none"
              />
            )}

            {!activePt && linePath && (
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

            {activePt && (
              <g className="bezent-att-sparkline-tracker" pointerEvents="none">
                <line
                  x1={activePt.x}
                  y1={2}
                  x2={activePt.x}
                  y2={38}
                  className="bezent-att-sparkline-guideline"
                />
                <circle
                  cx={activePt.x}
                  cy={activePt.y}
                  r={6}
                  className={`bezent-att-sparkline-halo bezent-att-sparkline-halo--${variantKey}`}
                />
                <circle
                  cx={activePt.x}
                  cy={activePt.y}
                  r={2.8}
                  className={`bezent-att-sparkline-dot bezent-att-sparkline-dot--${variantKey}`}
                />

                {(() => {
                  const tipW = 48;
                  const tipH = 12;
                  let tipX = activePt.x - tipW / 2;
                  if (tipX < 2) tipX = 2;
                  if (tipX + tipW > 98) tipX = 98 - tipW;
                  let tipY = activePt.y - tipH - 4;
                  if (tipY < 1) tipY = activePt.y + 6;

                  return (
                    <g transform={`translate(${tipX}, ${tipY})`}>
                      <rect
                        width={tipW}
                        height={tipH}
                        rx={3}
                        className="bezent-att-sparkline-tip-bg"
                      />
                      <text
                        x={tipW / 2}
                        y={8.5}
                        textAnchor="middle"
                        className="bezent-att-sparkline-tip-text"
                      >
                        {activePt.point.formattedDate}: {activePt.point.value}
                      </text>
                    </g>
                  );
                })()}
              </g>
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

  // Extract source trend items
  const trendItems = useMemo<NormalizedTrendPoint[]>(() => {
    if (overviewData?.trends?.items && overviewData.trends.items.length > 0) {
      return overviewData.trends.items.map((item) => {
        const scheduled = item.scheduledHeadcount ?? item.scheduledDayEquivalents ?? safeExpected;
        const present = item.presentHeadcount ?? item.presentEquivalentDays ?? 0;
        const absent = item.absentEquivalentDays ?? 0;
        const late = item.lateOccurrences ?? 0;
        const attRate = item.attendanceRate ?? (scheduled > 0 ? Math.round((present / scheduled) * 100) : 0);
        const absRate = item.absenceRate ?? (scheduled > 0 ? Number(((absent / scheduled) * 100).toFixed(1)) : 0);
        return {
          date: item.date,
          scheduled,
          present,
          absent,
          late,
          attendanceRate: attRate,
          absenceRate: absRate,
        };
      });
    }
    if (overviewData?.recentTrends && overviewData.recentTrends.length > 0) {
      return overviewData.recentTrends.map((rt) => ({
        date: rt.date,
        scheduled: safeExpected,
        present: rt.present,
        absent: rt.absent,
        late: rt.late,
        attendanceRate: safeExpected > 0 ? Math.round((rt.present / safeExpected) * 100) : 0,
        absenceRate: safeExpected > 0 ? Number(((rt.absent / safeExpected) * 100).toFixed(1)) : 0,
      }));
    }
    // Fallback: 7 days leading to today
    const baseDate = new Date(overviewData?.date || new Date().toISOString().slice(0, 10));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      return {
        date: dateStr,
        scheduled: safeExpected,
        present: safePresent,
        absent: safeAbsent,
        late: totalExceptions,
        attendanceRate,
        absenceRate: Number(absentRate),
      };
    });
  }, [
    overviewData?.trends?.items,
    overviewData?.recentTrends,
    overviewData?.date,
    safeExpected,
    safePresent,
    safeAbsent,
    totalExceptions,
    attendanceRate,
    absentRate,
  ]);

  // 1. Scheduled Workforce (Roster)
  const scheduledPoints: SparklinePoint[] = useMemo(() => {
    return trendItems.map((t) => ({
      date: t.date,
      formattedDate: formatDateShort(t.date),
      value: t.scheduled,
      detail: `${t.scheduled} Rostered Shifts`,
    }));
  }, [trendItems]);

  // 2. Present Today (Presence & Rate)
  const presentPoints: SparklinePoint[] = useMemo(() => {
    return trendItems.map((t) => ({
      date: t.date,
      formattedDate: formatDateShort(t.date),
      value: Math.round(t.present),
      rate: t.attendanceRate,
      detail: `${Math.round(t.present)} Present (${t.attendanceRate}%)`,
    }));
  }, [trendItems]);

  // 3. Absent (Absence & Absenteeism)
  const absentPoints: SparklinePoint[] = useMemo(() => {
    return trendItems.map((t) => ({
      date: t.date,
      formattedDate: formatDateShort(t.date),
      value: Math.round(t.absent),
      rate: t.absenceRate,
      detail: `${Math.round(t.absent)} Absent (${t.absenceRate}%)`,
    }));
  }, [trendItems]);

  // 4. On Approved Leave
  const leavePoints: SparklinePoint[] = useMemo(() => {
    return trendItems.map((t, idx) => {
      const isToday = idx === trendItems.length - 1;
      const val = isToday ? safeOnLeave : 0;
      return {
        date: t.date,
        formattedDate: formatDateShort(t.date),
        value: val,
        detail: `${val} on Approved Leave`,
      };
    });
  }, [trendItems, safeOnLeave]);

  // 5. Exceptions & Queue
  const exceptionPoints: SparklinePoint[] = useMemo(() => {
    return trendItems.map((t, idx) => {
      const isToday = idx === trendItems.length - 1;
      const val = isToday ? totalExceptions : t.late;
      return {
        date: t.date,
        formattedDate: formatDateShort(t.date),
        value: val,
        detail: `${val} Pending Action`,
      };
    });
  }, [trendItems, totalExceptions]);

  return (
    <div className="bezent-att-kpi-grid">
      {/* Card 1: Scheduled Workforce */}
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
        points={scheduledPoints}
        ariaLabel="Scheduled Workforce KPI Card"
        onClick={() => navigate('/hrms/attendance/shifts')}
        graphType="bar"
      />

      {/* Card 2: Present Today */}
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
        points={presentPoints}
        ariaLabel="Present Today KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log')}
        graphType="sparkline"
      />

      {/* Card 3: Absent */}
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
        points={absentPoints}
        ariaLabel="Absent KPI Card"
        onClick={() => navigate('/hrms/attendance/daily-log?status=absent')}
        graphType="step"
      />

      {/* Card 4: On Approved Leave */}
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
        points={leavePoints}
        ariaLabel="On Approved Leave KPI Card"
        onClick={() => navigate('/hrms/leave/records')}
        graphType="donut"
      />

      {/* Card 5: Exceptions & Queue */}
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
        points={exceptionPoints}
        ariaLabel="Attendance Exceptions & Regularization Queue KPI Card"
        onClick={() => navigate('/hrms/attendance/regularization')}
        graphType="pulse"
      />
    </div>
  );
};
