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
  leave?: number;
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
  graphType?:
    | 'bar'
    | 'spline'
    | 'step'
    | 'square'
    | 'microbar'
    | 'pin'
    | 'telemetry'
    | 'sparkline'
    | 'area'
    | 'lollipop'
    | 'dot'
    | 'donut'
    | 'pulse';
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

/** Linear / Sharp geometric polyline & area path */
function generateLinearSparkline(
  pts: Array<{ x: number; y: number; point: SparklinePoint }>,
  baselineY: number,
): { linePath: string; areaPath: string } {
  const n = pts.length;
  if (n === 0) return { linePath: '', areaPath: '' };
  if (n === 1) {
    return {
      linePath: `M 4 ${pts[0]!.y.toFixed(1)} L 96 ${pts[0]!.y.toFixed(1)}`,
      areaPath: `M 4 ${pts[0]!.y.toFixed(1)} L 96 ${pts[0]!.y.toFixed(1)} L 96 ${baselineY} L 4 ${baselineY} Z`,
    };
  }
  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const first = pts[0]!;
  const last = pts[n - 1]!;
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  return { linePath, areaPath };
}

/** Bar & Pin chart data — returns geometry for each point */
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
  const baselineY = height - padY;
  const plotH = height - padY - padY;
  const totalW = width - 2 * padX;
  const step = totalW / n;
  const barW = Math.max(2, step - 3);
  return pointList.map((p, i) => {
    const barH = p.value === 0 ? 2.5 : Math.max(3, (p.value / maxVal) * plotH);
    const x = padX + i * step + (step - barW) / 2;
    return { x, barH, y: baselineY - barH, barW, point: p };
  });
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

  const { linePath, areaPath, pts } = useMemo(
    () => generateSparkline(effectivePoints, 100, 44),
    [effectivePoints],
  );

  const { linePath: sharpLinePath, areaPath: sharpAreaPath } = useMemo(
    () => generateLinearSparkline(pts, 38),
    [pts],
  );

  const barData = useMemo(
    () =>
      graphType === 'bar' || graphType === 'microbar' || graphType === 'pin' || graphType === 'lollipop'
        ? generateBarData(effectivePoints, 100, 44)
        : [],
    [graphType, effectivePoints],
  );

  // Resolve the active point source depending on graph type
  const activePts: Array<{ x: number; y: number; point: SparklinePoint }> =
    graphType === 'square'
      ? effectivePoints.map((p, i) => ({
          x: 6 + i * (88 / Math.max(1, effectivePoints.length - 1)),
          y: 22,
          point: p,
        }))
      : graphType === 'bar' || graphType === 'microbar' || graphType === 'pin' || graphType === 'lollipop'
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
          /* ── Graph 1: Wide Rounded Columns (Scheduled Workforce - Blue) ── */
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stopColorHex} stopOpacity="0.9" />
                <stop offset="100%" stopColor={stopColorHex} stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <line x1={4} y1={38} x2={96} y2={38} className="bezent-att-sparkline-baseline" strokeDasharray="2 2" />
            {barData.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.barW}
                height={b.barH}
                rx={2.5}
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
                <g pointerEvents="none">
                  <line x1={activePt.x} y1={2} x2={activePt.x} y2={38} className="bezent-att-sparkline-guideline" />
                  <g transform={`translate(${tipX}, ${tipY})`}>
                    <rect width={tipW} height={tipH} rx={3} className="bezent-att-sparkline-tip-bg" />
                    <text x={tipW / 2} y={8.5} textAnchor="middle" className="bezent-att-sparkline-tip-text">
                      {activePt.point.formattedDate}: {activePt.point.value}
                    </text>
                  </g>
                </g>
              );
            })()}
          </svg>
        ) : graphType === 'sharp' || graphType === 'dotted' || graphType === 'step' ? (
          /* ── Graph 3: Sharp Geometric Trendline with Soft Gradient Fill (Absent - Rose) ── */
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stopColorHex} stopOpacity="0.25" />
                <stop offset="85%" stopColor={stopColorHex} stopOpacity="0.02" />
                <stop offset="100%" stopColor={stopColorHex} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line x1={4} y1={38} x2={96} y2={38} className="bezent-att-sparkline-baseline" strokeDasharray="2 2" />
            {sharpAreaPath && (
              <path d={sharpAreaPath} fill={`url(#${gradId})`} pointerEvents="none" />
            )}
            {sharpLinePath && (
              <path
                d={sharpLinePath}
                className="bezent-att-sparkline-sharp"
                pointerEvents="none"
              />
            )}
            {/* Interactive scrub columns */}
            {pts.map((pt, i) => {
              const colW = pts.length > 1 ? 88 / (pts.length - 1) : 88;
              return (
                <rect
                  key={i}
                  x={pt.x - colW / 2}
                  y={2}
                  width={colW}
                  height={36}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                />
              );
            })}
            {activePt && (() => {
              const tipW = 48;
              const tipH = 12;
              let tipX = activePt.x - tipW / 2;
              if (tipX < 2) tipX = 2;
              if (tipX + tipW > 98) tipX = 98 - tipW;
              const tipY = Math.max(1, activePt.y - tipH - 4);
              return (
                <g pointerEvents="none">
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
                    r={3}
                    fill={stopColorHex}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="bezent-att-sparkline-dot is-active"
                  />
                  <g transform={`translate(${tipX}, ${tipY})`}>
                    <rect width={tipW} height={tipH} rx={3} className="bezent-att-sparkline-tip-bg" />
                    <text x={tipW / 2} y={8.5} textAnchor="middle" className="bezent-att-sparkline-tip-text">
                      {activePt.point.formattedDate}: {activePt.point.value}
                    </text>
                  </g>
                </g>
              );
            })()}
          </svg>
        ) : graphType === 'square' || graphType === 'microbar' || graphType === 'pin' ? (
          /* ── Graph 4: 7-Day Square Date Tiles (On Approved Leave - Amber) ── */
          <svg
            className="bezent-att-kpi-sparkline-svg"
            viewBox="0 0 100 44"
            role="img"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stopColorHex} stopOpacity="0.85" />
                <stop offset="100%" stopColor={stopColorHex} stopOpacity="0.25" />
              </linearGradient>
            </defs>
            <line x1={4} y1={38} x2={96} y2={38} className="bezent-att-sparkline-baseline" strokeDasharray="2 2" />
            {effectivePoints.map((p, i) => {
              const totalW = 88;
              const step = totalW / Math.max(1, effectivePoints.length - 1);
              const cx = 6 + i * step;
              const isHovered = hoveredIdx === i;
              const hasVal = p.value > 0;
              const sqSize = isHovered ? 10 : 8.5;
              const cy = 20;
              return (
                <rect
                  key={i}
                  x={cx - sqSize / 2}
                  y={cy - sqSize / 2}
                  width={sqSize}
                  height={sqSize}
                  rx={2}
                  className={`bezent-att-sparkline-bar${isHovered ? ' is-active' : ''}`}
                  fill={isHovered ? stopColorHex : hasVal ? stopColorHex : `url(#${gradId})`}
                  opacity={hoveredIdx !== null && !isHovered ? 0.35 : hasVal ? 1 : 0.45}
                  stroke={hasVal ? stopColorHex : 'none'}
                  strokeWidth="1"
                  onMouseEnter={() => setHoveredIdx(i)}
                />
              );
            })}
            {activePt && (() => {
              const tipW = 48; const tipH = 12;
              let tipX = activePt.x - tipW / 2;
              if (tipX < 2) tipX = 2;
              if (tipX + tipW > 98) tipX = 98 - tipW;
              const tipY = Math.max(1, activePt.y - tipH - 4);
              return (
                <g pointerEvents="none">
                  <line x1={activePt.x} y1={2} x2={activePt.x} y2={38} className="bezent-att-sparkline-guideline" />
                  <g transform={`translate(${tipX}, ${tipY})`}>
                    <rect width={tipW} height={tipH} rx={3} className="bezent-att-sparkline-tip-bg" />
                    <text x={tipW / 2} y={8.5} textAnchor="middle" className="bezent-att-sparkline-tip-text">
                      {activePt.point.formattedDate}: {activePt.point.value}
                    </text>
                  </g>
                </g>
              );
            })()}
          </svg>
        ) : graphType === 'telemetry' ? (
          /* ── Graph 5: Geometric Polyline with Threshold (Exceptions & Queue - Purple) ── */
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
            {/* Threshold Line */}
            <line x1={4} y1={22} x2={96} y2={22} stroke={stopColorHex} strokeOpacity="0.25" strokeDasharray="2 3" />
            <line x1={4} y1={38} x2={96} y2={38} className="bezent-att-sparkline-baseline" strokeDasharray="2 2" />
            {pts.length > 1 && (
              <polygon
                points={`4,38 ${pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')} 96,38`}
                fill={`url(#${gradId})`}
                pointerEvents="none"
              />
            )}
            {pts.length > 1 && (
              <polyline
                points={pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')}
                fill="none"
                stroke={stopColorHex}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            )}
            {activePt && (() => {
              const tipW = 48; const tipH = 12;
              let tipX = activePt.x - tipW / 2;
              if (tipX < 2) tipX = 2;
              if (tipX + tipW > 98) tipX = 98 - tipW;
              const tipY = Math.max(1, activePt.y - tipH - 4);
              return (
                <g pointerEvents="none">
                  <line x1={activePt.x} y1={2} x2={activePt.x} y2={38} className="bezent-att-sparkline-guideline" />
                  <g transform={`translate(${tipX}, ${tipY})`}>
                    <rect width={tipW} height={tipH} rx={3} className="bezent-att-sparkline-tip-bg" />
                    <text x={tipW / 2} y={8.5} textAnchor="middle" className="bezent-att-sparkline-tip-text">
                      {activePt.point.formattedDate}: {activePt.point.value}
                    </text>
                  </g>
                </g>
              );
            })()}
          </svg>
        ) : (
          /* ── Graph 2: Smooth Fluid Spline Wave Area (Present Today - Green / Default) ── */
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

            {activePt && (() => {
              const tipW = 48;
              const tipH = 12;
              let tipX = activePt.x - tipW / 2;
              if (tipX < 2) tipX = 2;
              if (tipX + tipW > 98) tipX = 98 - tipW;
              const tipY = Math.max(1, activePt.y - tipH - 4);

              return (
                <g pointerEvents="none">
                  <line
                    x1={activePt.x}
                    y1={2}
                    x2={activePt.x}
                    y2={38}
                    className="bezent-att-sparkline-guideline"
                  />
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
                </g>
              );
            })()}
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
        const leave = item.leaveCoverageEquivalents ?? 0;
        const attRate = item.attendanceRate ?? (scheduled > 0 ? Math.round((present / scheduled) * 100) : 0);
        const absRate = item.absenceRate ?? (scheduled > 0 ? Number(((absent / scheduled) * 100).toFixed(1)) : 0);
        return {
          date: item.date,
          scheduled,
          present,
          absent,
          late,
          leave,
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
      const val = isToday ? safeOnLeave : (t.leave ?? 0);
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
        graphType="spline"
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
        graphType="sharp"
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
        graphType="square"
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
        graphType="telemetry"
      />
    </div>
  );
};
