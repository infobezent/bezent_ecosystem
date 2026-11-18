import { useState } from 'react';
import type { PunchLogItem } from '../types/attendance.types';

export interface PunchTrendSegment {
  label: string;
  shortLabel: string;
  dateLabel?: string;
  count: number;
}

export const WORKDAY_SEGMENTS = [
  { label: 'Morning Rush (08:00–10:00)', shortLabel: '08:00–10:00' },
  { label: 'Mid-Morning (10:00–12:00)', shortLabel: '10:00–12:00' },
  { label: 'Midday / Lunch (12:00–15:00)', shortLabel: '12:00–15:00' },
  { label: 'Afternoon (15:00–18:00)', shortLabel: '15:00–18:00' },
  { label: 'Evening Checkout (18:00+)', shortLabel: '18:00+' },
];

export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '18 Nov 2026';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0]!, 10);
      const m = parseInt(parts[1]!, 10);
      const d = parseInt(parts[2]!, 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const mon = months[m - 1] || 'Nov';
        return `${d} ${mon} ${y}`;
      }
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function extractPunchHour(punch: PunchLogItem): number {
  if (!punch) return 9;
  if (punch.punchTime) {
    try {
      const dt = new Date(punch.punchTime);
      if (!isNaN(dt.getTime())) {
        return dt.getHours();
      }
    } catch {
      // Fallback to string matching below
    }
    const match = punch.punchTime.match(/T?(\d{2}):/);
    if (match && match[1]) {
      const h = parseInt(match[1], 10);
      if (!isNaN(h) && h >= 0 && h <= 23) return h;
    }
  }
  return 9;
}

/**
 * Maps a list of punches to standard trend series (workday time-segments or date series)
 * based on actual timestamps and selected date range.
 */
export function computeWorkdayTrendSegments(
  punches: PunchLogItem[],
  dateFrom?: string,
  dateTo?: string,
): PunchTrendSegment[] {
  // If multi-day range selected (e.g. Nov 14 to Nov 18)
  if (dateFrom && dateTo && dateFrom !== dateTo) {
    try {
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      const daySpan = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (daySpan >= 2 && daySpan <= 14) {
        const dates: string[] = [];
        for (let i = 0; i < Math.min(daySpan, 7); i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          dates.push(d.toISOString().slice(0, 10));
        }
        return dates.map((dStr) => {
          const formatted = formatDisplayDate(dStr);
          const count = (punches || []).filter((p) => {
            if (!p) return false;
            const pDate = p.workday || (p.punchTime ? p.punchTime.slice(0, 10) : '');
            return pDate === dStr;
          }).length;
          return {
            label: formatted,
            shortLabel: dStr.slice(5),
            dateLabel: formatted,
            count,
          };
        });
      }
    } catch {
      // Fallback to standard workday segments
    }
  }

  // Single-day distribution across 5 standard workday segments
  const workdayDate = formatDisplayDate(
    dateFrom || punches?.[0]?.workday || punches?.[0]?.punchTime || '2026-11-18',
  );

  const segments: PunchTrendSegment[] = WORKDAY_SEGMENTS.map((s) => ({
    label: s.label,
    shortLabel: s.shortLabel,
    dateLabel: `${workdayDate} (${s.shortLabel})`,
    count: 0,
  }));

  if (!Array.isArray(punches)) return segments;

  for (const punch of punches) {
    if (!punch) continue;
    const h = extractPunchHour(punch);

    if (h < 10) {
      const seg = segments[0];
      if (seg) seg.count += 1; // Morning Rush (< 10:00)
    } else if (h < 12) {
      const seg = segments[1];
      if (seg) seg.count += 1; // Mid-Morning (10:00 - 12:00)
    } else if (h < 15) {
      const seg = segments[2];
      if (seg) seg.count += 1; // Midday / Lunch (12:00 - 15:00)
    } else if (h < 18) {
      const seg = segments[3];
      if (seg) seg.count += 1; // Afternoon (15:00 - 18:00)
    } else {
      const seg = segments[4];
      if (seg) seg.count += 1; // Evening Checkout (18:00+)
    }
  }

  return segments;
}

export const computePunchTrendBuckets = computeWorkdayTrendSegments;
export const PUNCH_TIME_BUCKETS = WORKDAY_SEGMENTS;
export type PunchTrendBucket = PunchTrendSegment;

/**
 * Generates smooth cubic bezier SVG path across given coordinate points.
 */
function generateSmoothBezier(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  const pStart = pts[0];
  if (!pStart) return '';
  let d = `M ${pStart.x} ${pStart.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    if (p0 && p1) {
      const cpx = (p0.x + p1.x) / 2;
      d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }
  return d;
}

/**
 * Interactive Data-Driven Line Chart Component for Punch Log Category Cards.
 * Features:
 * - Real chart component with distinct, clearly identifiable hoverable data point nodes.
 * - Smooth connected line chart with subtle gradient area fill underneath.
 * - Dynamic tooltip positioning right next to the hovered point with pointing caret.
 * - Highlighted specific point with animated beacon ring and vertical guide crosshair.
 * - Accurate date/interval and category count display from real Punch Log records.
 */
export interface InteractiveMiniLineChartProps {
  data: PunchTrendSegment[];
  total: number;
  color: string;
  categoryLabel: string;
  idPrefix: string;
  metricName: string;
  trendTitle?: string;
}

export function InteractiveMiniLineChart({
  data,
  total,
  color,
  categoryLabel,
  idPrefix,
  metricName,
  trendTitle,
}: InteractiveMiniLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const baselineY = 34;
  const peakY = 8;
  const heightSpan = baselineY - peakY;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  // Distribute point positions across width 88
  const step = data.length > 1 ? 72 / (data.length - 1) : 0;
  const pts = data.map((d, i) => {
    const ratio = total > 0 ? d.count / maxVal : 0;
    const y = total > 0 ? baselineY - Math.round(ratio * heightSpan) : baselineY;
    const x = Math.round(8 + i * step);
    return {
      x,
      y,
      label: d.label,
      shortLabel: d.shortLabel,
      dateLabel: d.dateLabel || d.label,
      count: d.count,
    };
  });

  const linePath = generateSmoothBezier(pts);
  const firstPt = pts[0] ?? {
    x: 8,
    y: baselineY,
    label: '',
    shortLabel: '',
    dateLabel: '',
    count: 0,
  };
  const lastPt = pts[pts.length - 1] ?? {
    x: 80,
    y: baselineY,
    label: '',
    shortLabel: '',
    dateLabel: '',
    count: 0,
  };
  const areaPath = `${linePath} L ${lastPt.x} 38 L ${firstPt.x} 38 Z`;

  const hoveredPt = hoveredIndex !== null ? pts[hoveredIndex] : null;
  const titleText =
    trendTitle || `${categoryLabel} trend: ${total} records across workday periods`;

  return (
    <div
      className="bezent-kpi-graph-wrapper"
      onMouseLeave={() => setHoveredIndex(null)}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      {/* Floating Hover Tooltip: Positioned next to the specific hovered point */}
      <div
        className={`bezent-kpi-graph-tooltip bezent-kpi-graph-tooltip--point-${hoveredIndex ?? 0} ${hoveredPt ? 'is-visible' : ''}`}
        role="tooltip"
        aria-hidden={!hoveredPt}
      >
        {hoveredPt && (
          <div className="bezent-kpi-graph-tooltip-body">
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">Date:</span>
              <span className="bezent-kpi-graph-tooltip-val">{hoveredPt.dateLabel}</span>
            </div>
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">{metricName}:</span>
              <span className="bezent-kpi-graph-tooltip-val">{hoveredPt.count}</span>
            </div>
          </div>
        )}
      </div>

      <svg
        className="bezent-kpi-graph-svg"
        viewBox="0 0 88 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={titleText}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width <= 0 || pts.length === 0) return;
          const svgX = ((e.clientX - rect.left) / rect.width) * 88;
          let bestIdx = 0;
          let bestDist = Infinity;
          pts.forEach((p, idx) => {
            const dist = Math.abs(p.x - svgX);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = idx;
            }
          });
          setHoveredIndex(bestIdx);
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <title>{titleText}</title>
        <defs>
          <linearGradient id={`${idPrefix}-area-grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle Horizon Baseline */}
        <line
          x1="4"
          y1={baselineY + 2}
          x2="84"
          y2={baselineY + 2}
          stroke={color}
          strokeOpacity="0.2"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Translucent Soft Glow Fill under Curve */}
        <path d={areaPath} fill={`url(#${idPrefix}-area-grad)`} />

        {/* Smooth Curved Trend Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Clearly identifiable data point marker dots on the line */}
        {pts.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g key={`marker-${i}`} className="bezent-kpi-chart-point-group">
              {/* Active hover crosshair guide line */}
              {isHovered && (
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={p.x}
                  y2={baselineY + 2}
                  stroke={color}
                  strokeDasharray="2 2"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
              )}

              {/* Hover halo pulse ring */}
              {isHovered && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={8}
                  fill={color}
                  fillOpacity="0.25"
                  className="bezent-kpi-chart-pulse-ring"
                />
              )}

              {/* Visible Point Dot Node on the line */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 4.5 : 3.2}
                fill="#ffffff"
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 2}
                className={`bezent-kpi-chart-node ${isHovered ? 'is-active' : ''}`}
              />
            </g>
          );
        })}

        {/* Peak activity beacon indicator (when not hovering any point) */}
        {hoveredIndex === null && total > 0 && (
          <g className="bezent-kpi-graph-beacon" aria-hidden="true">
            <circle cx={lastPt.x} cy={lastPt.y} r={2.5} fill={color} />
          </g>
        )}

        {/* Vertical slice hit targets spanning the full height for effortless hover */}
        {pts.map((p, i) => {
          const prevX = i === 0 ? 0 : (pts[i - 1]!.x + p.x) / 2;
          const nextX = i === pts.length - 1 ? 88 : (p.x + pts[i + 1]!.x) / 2;
          const sliceWidth = Math.max(12, nextX - prevX);

          return (
            <rect
              key={`slice-${i}`}
              x={prevX}
              y={0}
              width={sliceWidth}
              height={44}
              fill="transparent"
              className="bezent-kpi-graph-point bezent-kpi-graph-hit-target"
              onMouseEnter={() => setHoveredIndex(i)}
              onPointerEnter={() => setHoveredIndex(i)}
              onTouchStart={(e) => {
                e.stopPropagation();
                setHoveredIndex(i);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setHoveredIndex(i);
              }}
              onFocus={() => setHoveredIndex(i)}
              onBlur={() => setHoveredIndex(null)}
              tabIndex={0}
              role="button"
              aria-label={`${metricName}: ${p.count} (${p.dateLabel})`}
            >
              <title>{`${metricName}: ${p.count} (${p.dateLabel})`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 1. All Punches / Total Punches Mini Line Chart (Blue #2563eb)
 */
export function AllPunchesLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  return (
    <InteractiveMiniLineChart
      data={data}
      total={total}
      color="#2563eb"
      categoryLabel="All Punches"
      metricName="Punches"
      idPrefix="total-punches"
      trendTitle={`Punch activity trend: ${total} total punches`}
    />
  );
}

export const TotalPunchesLineChart = AllPunchesLineChart;

/**
 * 2. First In Mini Line Chart (Green #10b981)
 */
export function FirstInLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  return (
    <InteractiveMiniLineChart
      data={data}
      total={total}
      color="#10b981"
      categoryLabel="First In"
      metricName="First In Count"
      idPrefix="first-in"
      trendTitle={`First In arrival trend: ${total} records across workday periods`}
    />
  );
}

/**
 * 3. Last Out Mini Line Chart (Violet #8b5cf6)
 */
export function LastOutLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  return (
    <InteractiveMiniLineChart
      data={data}
      total={total}
      color="#8b5cf6"
      categoryLabel="Last Out"
      metricName="Last Out Count"
      idPrefix="last-out"
      trendTitle={`Last Out departure trend: ${total} records across workday periods`}
    />
  );
}

/**
 * 4. Late Punch Mini Line Chart (Orange #f59e0b)
 */
export function LatePunchLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  return (
    <InteractiveMiniLineChart
      data={data}
      total={total}
      color="#f59e0b"
      categoryLabel="Late Punch"
      metricName="Late Punches"
      idPrefix="late-punch"
      trendTitle={`Late punch trends: ${total} late punches across workday periods`}
    />
  );
}

export const LatePunchMiniBarChart = LatePunchLineChart;

/**
 * 5. Exceptions Mini Line Chart (Red #ef4444)
 */
export function ExceptionsLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  return (
    <InteractiveMiniLineChart
      data={data}
      total={total}
      color="#ef4444"
      categoryLabel="Exceptions"
      metricName="Exceptions"
      idPrefix="exceptions"
      trendTitle={`Exception trends: ${total} exception records across workday periods`}
    />
  );
}

export const ExceptionsMiniBarChart = ExceptionsLineChart;

/**
 * 2. Accepted Circular Progress Visualization (Precision Gauge Widget)
 * Clean emerald circular ring with proportional progress arc and center percentage.
 */
export function AcceptedCircularProgress({
  valid,
  total,
}: {
  valid: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((valid / total) * 100) : 0;
  const radius = 19;
  const circumference = 2 * Math.PI * radius; // ~119.38
  const dashoffset = circumference * (1 - pct / 100);

  return (
    <svg
      className="bezent-kpi-graph-svg bezent-kpi-graph-svg--circular"
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Accepted: ${valid} of ${total} (${pct}%)`}
    >
      <title>{`Accepted: ${valid} of ${total} punches (${pct}%) counted in attendance`}</title>

      {/* Ambient soft glow backdrop */}
      <circle cx="25" cy="25" r="23" fill="rgba(16, 185, 129, 0.08)" />

      {/* Full circular track */}
      <circle
        cx="25"
        cy="25"
        r={radius}
        stroke="rgba(16, 185, 129, 0.22)"
        strokeWidth="3.8"
        fill="none"
      />

      {/* Foreground progress arc */}
      <circle
        cx="25"
        cy="25"
        r={radius}
        stroke="#10b981"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        transform="rotate(-90 25 25)"
        fill="none"
        className="bezent-kpi-graph-progress"
      />

      {/* Center percentage label */}
      <text
        x="25"
        y="29"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#047857"
        className="bezent-kpi-graph-pct"
      >
        {`${pct}%`}
      </text>
    </svg>
  );
}

/**
 * 3. Flagged Punches Mini Bar Chart (Structured Column Widget)
 * Features 5 distinct workday segment columns with translucent background tracks
 * and vibrant orange filled bars.
 */
export function FlaggedMiniBarChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const color = '#f59e0b';
  const baselineY = 32;
  const maxBarHeight = 22;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const xCoords = [10, 25, 40, 55, 70];
  const barWidth = 8;

  return (
    <svg
      className="bezent-kpi-graph-svg"
      viewBox="0 0 88 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Flagged punch trends: ${total} total`}
    >
      <title>{`Flagged punch trends: ${total} flagged punches across workday periods`}</title>

      {/* Horizon Baseline */}
      <line
        x1="6"
        y1={baselineY + 2}
        x2="82"
        y2={baselineY + 2}
        stroke={color}
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {data.map((d, i) => {
        const x = xCoords[i];
        const ratio = total > 0 ? d.count / maxVal : 0;
        const height = d.count > 0 ? Math.max(5, Math.round(ratio * maxBarHeight)) : 0;
        const y = baselineY - height;

        return (
          <g key={i}>
            {/* Structured Background Track */}
            <rect
              x={x}
              y={baselineY - maxBarHeight}
              width={barWidth}
              height={maxBarHeight}
              rx={2}
              fill="rgba(245, 158, 11, 0.15)"
            />

            {/* Filled Active Column */}
            {height > 0 && (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={2}
                fill={color}
                className="bezent-kpi-graph-bar"
              >
                <title>{`${d.label}: ${d.count} flagged`}</title>
              </rect>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 4. Rejected Punches Mini Bar Chart (Structured Column Widget)
 * Features 5 distinct workday segment columns with translucent background tracks
 * and status red filled bars.
 */
export function RejectedMiniBarChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const color = '#ef4444';
  const baselineY = 32;
  const maxBarHeight = 22;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const xCoords = [10, 25, 40, 55, 70];
  const barWidth = 8;

  return (
    <svg
      className="bezent-kpi-graph-svg"
      viewBox="0 0 88 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Rejected punch trends: ${total} total`}
    >
      <title>{`Rejected punch trends: ${total} rejected punches across workday periods`}</title>

      {/* Horizon Baseline */}
      <line
        x1="6"
        y1={baselineY + 2}
        x2="82"
        y2={baselineY + 2}
        stroke={color}
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {data.map((d, i) => {
        const x = xCoords[i];
        const ratio = total > 0 ? d.count / maxVal : 0;
        const height = d.count > 0 ? Math.max(5, Math.round(ratio * maxBarHeight)) : 0;
        const y = baselineY - height;

        return (
          <g key={i}>
            {/* Structured Background Track */}
            <rect
              x={x}
              y={baselineY - maxBarHeight}
              width={barWidth}
              height={maxBarHeight}
              rx={2}
              fill="rgba(239, 68, 68, 0.15)"
            />

            {/* Filled Active Column */}
            {height > 0 && (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={2}
                fill={color}
                className="bezent-kpi-graph-bar"
              >
                <title>{`${d.label}: ${d.count} rejected`}</title>
              </rect>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 5. Failed to Process Mini Line Chart (Reliability Telemetry Monitor)
 * Features a calm baseline wave with a smooth telemetry pulse at the incident window.
 */
export function FailedToProcessLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const color = '#8b5cf6';
  const baselineY = 30;
  const xCoords = [8, 26, 44, 62, 80];

  // Map failure counts to subtle telemetry curve
  const pts = data.map((d, i) => {
    // A single failure is a subtle pulse up to y=16 (not an exaggerated cliff)
    const y = d.count > 0 ? 16 : baselineY;
    const x = xCoords[i] ?? (8 + i * 18);
    return { x, y, label: d.label, count: d.count };
  });

  const linePath = generateSmoothBezier(pts);
  const firstPt = pts[0] ?? { x: 8, y: baselineY, label: '', count: 0 };
  const lastPt = pts[pts.length - 1] ?? { x: 80, y: baselineY, label: '', count: 0 };
  const areaPath = `${linePath} L ${lastPt.x} 36 L ${firstPt.x} 36 Z`;

  // Find the incident point (first segment with count > 0)
  const incidentPt = pts.find((p) => p.count > 0);

  return (
    <svg
      className="bezent-kpi-graph-svg"
      viewBox="0 0 88 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Processing failures: ${total} total`}
    >
      <title>{`Processing failures: ${total} total failures across workday telemetry`}</title>
      <defs>
        <linearGradient id="failed-punches-telemetry-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Horizon Baseline */}
      <line
        x1="4"
        y1={baselineY + 4}
        x2="84"
        y2={baselineY + 4}
        stroke={color}
        strokeOpacity="0.2"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Area fill under telemetry curve */}
      <path d={areaPath} fill="url(#failed-punches-telemetry-grad)" />

      {/* Smooth telemetry line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Incident beacon at failure window */}
      {incidentPt && (
        <g className="bezent-kpi-graph-beacon" aria-hidden="true">
          <circle cx={incidentPt.x} cy={incidentPt.y} r={5.5} fill={color} fillOpacity="0.22" />
          <circle cx={incidentPt.x} cy={incidentPt.y} r={2.5} fill={color} />
          <title>{`Incident Window: ${incidentPt.label} (${incidentPt.count} failed)`}</title>
        </g>
      )}

      {/* Interactive hover targets */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="transparent"
          className="bezent-kpi-graph-point"
        >
          <title>{`${p.label}: ${p.count} failed`}</title>
        </circle>
      ))}
    </svg>
  );
}
