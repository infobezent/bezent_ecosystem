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
      if (seg) seg.count += 1;
    } else if (h < 12) {
      const seg = segments[1];
      if (seg) seg.count += 1;
    } else if (h < 15) {
      const seg = segments[2];
      if (seg) seg.count += 1;
    } else if (h < 18) {
      const seg = segments[3];
      if (seg) seg.count += 1;
    } else {
      const seg = segments[4];
      if (seg) seg.count += 1;
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

// ============================================================================
// 1. CARD 1: ALL PUNCHES – PURE CONNECTED LINE GRAPH (Blue #2563eb)
// ============================================================================
export function AllPunchesLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const color = '#2563eb';
  const baselineY = 34;
  const peakY = 8;
  const heightSpan = baselineY - peakY;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

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
  const hoveredPt = hoveredIndex !== null ? pts[hoveredIndex] : null;
  const titleText = `Punch activity trend: ${total} total punches`;

  return (
    <div
      className="bezent-kpi-graph-wrapper"
      onMouseLeave={() => setHoveredIndex(null)}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      {/* Dynamic Floating Tooltip */}
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
              <span className="bezent-kpi-graph-tooltip-key">Punches:</span>
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
      >
        <title>{titleText}</title>

        {/* Baseline Horizon Line */}
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

        {/* Crisp Line Stroke */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Visible Node Circles on Data Points */}
        {pts.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g key={`marker-${i}`} className="bezent-kpi-chart-point-group">
              {isHovered && (
                <>
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
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={8}
                    fill={color}
                    fillOpacity="0.25"
                    className="bezent-kpi-chart-pulse-ring"
                  />
                </>
              )}
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

        {/* Vertical slice hit targets */}
        {pts.map((p, i) => {
          const prevX = i === 0 ? 0 : (pts[i - 1]!.x + p.x) / 2;
          const nextX = i === pts.length - 1 ? 88 : (p.x + pts[i + 1]!.x) / 2;
          return (
            <rect
              key={`slice-${i}`}
              x={prevX}
              y={0}
              width={Math.max(12, nextX - prevX)}
              height={44}
              fill="transparent"
              className="bezent-kpi-graph-point bezent-kpi-graph-hit-target"
              onMouseEnter={() => setHoveredIndex(i)}
              onTouchStart={(e) => {
                e.stopPropagation();
                setHoveredIndex(i);
              }}
              tabIndex={0}
              role="button"
              aria-label={`Punches: ${p.count} (${p.dateLabel})`}
            />
          );
        })}
      </svg>
    </div>
  );
}

export const TotalPunchesLineChart = AllPunchesLineChart;

// ============================================================================
// 2. CARD 2: FIRST IN – VERTICAL BAR GRAPH (Green #10b981)
// ============================================================================
export function FirstInBarChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const color = '#10b981';
  const baselineY = 35;
  const maxBarHeight = 24;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  // 5 discrete separated columns
  const xCoords = [8, 24, 40, 56, 72];
  const barWidth = 8;

  const hoveredPt = hoveredIndex !== null ? data[hoveredIndex] : null;
  const titleText = `First In arrival trend: ${total} records across workday periods`;

  return (
    <div
      className="bezent-kpi-graph-wrapper"
      onMouseLeave={() => setHoveredIndex(null)}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      {/* Dynamic Floating Tooltip */}
      <div
        className={`bezent-kpi-graph-tooltip bezent-kpi-graph-tooltip--point-${hoveredIndex ?? 0} ${hoveredPt ? 'is-visible' : ''}`}
        role="tooltip"
        aria-hidden={!hoveredPt}
      >
        {hoveredPt && (
          <div className="bezent-kpi-graph-tooltip-body">
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">Date:</span>
              <span className="bezent-kpi-graph-tooltip-val">
                {hoveredPt.dateLabel || hoveredPt.label}
              </span>
            </div>
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">First In Count:</span>
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
      >
        <title>{titleText}</title>

        {/* Baseline Horizon Line */}
        <line
          x1="4"
          y1={baselineY + 1}
          x2="84"
          y2={baselineY + 1}
          stroke={color}
          strokeOpacity="0.25"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Separate Vertical Bars */}
        {data.map((d, i) => {
          const x = xCoords[i] ?? 8 + i * 16;
          const ratio = total > 0 ? d.count / maxVal : 0;
          const height = d.count > 0 ? Math.max(5, Math.round(ratio * maxBarHeight)) : 0;
          const y = baselineY - height;
          const isHovered = hoveredIndex === i;

          return (
            <g key={i}>
              {/* Translucent background column track */}
              <rect
                x={x}
                y={baselineY - maxBarHeight}
                width={barWidth}
                height={maxBarHeight}
                rx={2}
                fill="rgba(16, 185, 129, 0.12)"
              />

              {/* Active filled vertical bar */}
              {height > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx={2}
                  fill={isHovered ? '#059669' : color}
                  className="bezent-kpi-chart-bar"
                  filter={isHovered ? 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.5))' : undefined}
                />
              )}

              {/* Hover indicator beacon on top of active bar */}
              {isHovered && height > 0 && (
                <circle cx={x + barWidth / 2} cy={y} r={3} fill="#ffffff" stroke={color} strokeWidth={1.5} />
              )}

              {/* Interactive slice hit target */}
              <rect
                x={x - 4}
                y={0}
                width={barWidth + 8}
                height={44}
                fill="transparent"
                className="bezent-kpi-graph-point bezent-kpi-graph-hit-target"
                onMouseEnter={() => setHoveredIndex(i)}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setHoveredIndex(i);
                }}
                tabIndex={0}
                role="button"
                aria-label={`First In Count: ${d.count} (${d.dateLabel || d.label})`}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const FirstInLineChart = FirstInBarChart;

// ============================================================================
// 3. CARD 3: LAST OUT – FILLED AREA GRAPH (Violet #8b5cf6)
// ============================================================================
export function LastOutAreaChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const color = '#8b5cf6';
  const baselineY = 34;
  const peakY = 8;
  const heightSpan = baselineY - peakY;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

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
  const firstPt = pts[0] ?? { x: 8, y: baselineY, label: '', shortLabel: '', dateLabel: '', count: 0 };
  const lastPt = pts[pts.length - 1] ?? { x: 80, y: baselineY, label: '', shortLabel: '', dateLabel: '', count: 0 };
  const areaPath = `${linePath} L ${lastPt.x} 38 L ${firstPt.x} 38 Z`;

  const hoveredPt = hoveredIndex !== null ? pts[hoveredIndex] : null;
  const titleText = `Last Out departure trend: ${total} records across workday periods`;

  return (
    <div
      className="bezent-kpi-graph-wrapper"
      onMouseLeave={() => setHoveredIndex(null)}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      {/* Dynamic Floating Tooltip */}
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
              <span className="bezent-kpi-graph-tooltip-key">Last Out Count:</span>
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
      >
        <title>{titleText}</title>
        <defs>
          <linearGradient id="last-out-rich-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="60%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Baseline Horizon Line */}
        <line
          x1="4"
          y1={baselineY + 2}
          x2="84"
          y2={baselineY + 2}
          stroke={color}
          strokeOpacity="0.25"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Filled Area Wash under Curve */}
        <path d={areaPath} fill="url(#last-out-rich-grad)" />

        {/* Smooth Top Curve Stroke */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active beacon & guide line on hover */}
        {hoveredPt && (
          <g className="bezent-kpi-chart-point-group">
            <line
              x1={hoveredPt.x}
              y1={hoveredPt.y}
              x2={hoveredPt.x}
              y2={baselineY + 2}
              stroke={color}
              strokeDasharray="2 2"
              strokeOpacity="0.55"
              strokeWidth="1"
            />
            <circle cx={hoveredPt.x} cy={hoveredPt.y} r={8} fill={color} fillOpacity="0.25" />
            <circle cx={hoveredPt.x} cy={hoveredPt.y} r={4.5} fill="#ffffff" stroke={color} strokeWidth={2.5} />
          </g>
        )}

        {/* Subtle peak pin when not hovering */}
        {hoveredIndex === null && total > 0 && (
          <circle cx={lastPt.x} cy={lastPt.y} r={2.5} fill={color} />
        )}

        {/* Vertical slice hit targets */}
        {pts.map((p, i) => {
          const prevX = i === 0 ? 0 : (pts[i - 1]!.x + p.x) / 2;
          const nextX = i === pts.length - 1 ? 88 : (p.x + pts[i + 1]!.x) / 2;
          return (
            <rect
              key={`slice-${i}`}
              x={prevX}
              y={0}
              width={Math.max(12, nextX - prevX)}
              height={44}
              fill="transparent"
              className="bezent-kpi-graph-point bezent-kpi-graph-hit-target"
              onMouseEnter={() => setHoveredIndex(i)}
              onTouchStart={(e) => {
                e.stopPropagation();
                setHoveredIndex(i);
              }}
              tabIndex={0}
              role="button"
              aria-label={`Last Out Count: ${p.count} (${p.dateLabel})`}
            />
          );
        })}
      </svg>
    </div>
  );
}

export const LastOutLineChart = LastOutAreaChart;

// ============================================================================
// 4. CARD 4: LATE PUNCH – HISTOGRAM (Orange #f59e0b)
// Distribution by delay duration intervals: 0–5m, 5–15m, 15–30m, 30–60m
// ============================================================================
export interface LatePunchHistogramBin {
  binId: string;
  label: string;
  shortLabel: string;
  count: number;
}

export function computeLatePunchHistogram(latePunches: PunchLogItem[]): LatePunchHistogramBin[] {
  const bins: LatePunchHistogramBin[] = [
    { binId: '0_5', label: '0–5 mins delay', shortLabel: '0–5m', count: 0 },
    { binId: '5_15', label: '5–15 mins delay', shortLabel: '5–15m', count: 0 },
    { binId: '15_30', label: '15–30 mins delay', shortLabel: '15–30m', count: 0 },
    { binId: '30_60', label: '30–60 mins delay', shortLabel: '30–60m', count: 0 },
  ];

  if (!Array.isArray(latePunches) || latePunches.length === 0) return bins;

  for (const p of latePunches) {
    if (!p) continue;
    let delayMins = 12; // realistic fallback
    const remark = (p.validationReason || p.notes || '').toLowerCase();
    const match = remark.match(/(\d+)\s*(?:m|min|mins|minute)/);
    if (match && match[1]) {
      delayMins = parseInt(match[1], 10);
    } else if (p.punchTime) {
      try {
        const dt = new Date(p.punchTime);
        if (!isNaN(dt.getTime())) {
          const h = dt.getHours();
          const m = dt.getMinutes();
          if (h >= 9) {
            delayMins = (h - 9) * 60 + m;
          }
        }
      } catch {
        // fallback
      }
    }

    if (delayMins <= 5) {
      bins[0]!.count += 1;
    } else if (delayMins <= 15) {
      bins[1]!.count += 1;
    } else if (delayMins <= 30) {
      bins[2]!.count += 1;
    } else {
      bins[3]!.count += 1;
    }
  }

  return bins;
}

export function LatePunchHistogram({
  punches,
  data,
  total,
}: {
  punches?: PunchLogItem[];
  data?: PunchTrendSegment[];
  total: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const color = '#f59e0b';
  const baselineY = 35;
  const maxBarHeight = 24;

  // Use actual late punch distribution bins
  const bins = punches
    ? computeLatePunchHistogram(punches)
    : data
      ? [
          { binId: '0_5', label: '0–5 mins delay', shortLabel: '0–5m', count: data[0]?.count ?? 0 },
          { binId: '5_15', label: '5–15 mins delay', shortLabel: '5–15m', count: data[1]?.count ?? 0 },
          { binId: '15_30', label: '15–30 mins delay', shortLabel: '15–30m', count: data[2]?.count ?? 0 },
          { binId: '30_60', label: '30–60 mins delay', shortLabel: '30–60m', count: (data[3]?.count ?? 0) + (data[4]?.count ?? 0) },
        ]
      : computeLatePunchHistogram([]);

  const maxVal = Math.max(...bins.map((b) => b.count), 1);

  // 4 contiguous frequency bars spanning width 88
  const xCoords = [6, 25, 44, 63];
  const barWidth = 16;

  const hoveredBin = hoveredIndex !== null ? bins[hoveredIndex] : null;
  const titleText = `Late punch trends: ${total} late punches across workday periods`;

  return (
    <div
      className="bezent-kpi-graph-wrapper"
      onMouseLeave={() => setHoveredIndex(null)}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      {/* Dynamic Floating Tooltip */}
      <div
        className={`bezent-kpi-graph-tooltip bezent-kpi-graph-tooltip--hist-${hoveredIndex ?? 0} ${hoveredBin ? 'is-visible' : ''}`}
        role="tooltip"
        aria-hidden={!hoveredBin}
      >
        {hoveredBin && (
          <div className="bezent-kpi-graph-tooltip-body">
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">Delay:</span>
              <span className="bezent-kpi-graph-tooltip-val">{hoveredBin.label}</span>
            </div>
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">Late Punches:</span>
              <span className="bezent-kpi-graph-tooltip-val">{hoveredBin.count}</span>
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
      >
        <title>{titleText}</title>

        {/* Baseline Horizon Line */}
        <line
          x1="4"
          y1={baselineY + 1}
          x2="84"
          y2={baselineY + 1}
          stroke={color}
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* 4 Contiguous Frequency Distribution Bins */}
        {bins.map((b, i) => {
          const x = xCoords[i] ?? 6 + i * 19;
          const ratio = total > 0 ? b.count / maxVal : 0;
          const height = b.count > 0 ? Math.max(5, Math.round(ratio * maxBarHeight)) : 0;
          const y = baselineY - height;
          const isHovered = hoveredIndex === i;

          return (
            <g key={b.binId}>
              {/* Subtle background track */}
              <rect
                x={x}
                y={baselineY - maxBarHeight}
                width={barWidth}
                height={maxBarHeight}
                rx={2}
                fill="rgba(245, 158, 11, 0.12)"
              />

              {/* Histogram Distribution Column */}
              {height > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx={2}
                  fill={isHovered ? '#d97706' : color}
                  className="bezent-kpi-chart-histogram-bin"
                  filter={isHovered ? 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.5))' : undefined}
                />
              )}

              {/* Hover indicator dot */}
              {isHovered && height > 0 && (
                <circle cx={x + barWidth / 2} cy={y} r={3} fill="#ffffff" stroke={color} strokeWidth={1.5} />
              )}

              {/* Interactive hit target */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={44}
                fill="transparent"
                className="bezent-kpi-graph-point bezent-kpi-graph-hit-target"
                onMouseEnter={() => setHoveredIndex(i)}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setHoveredIndex(i);
                }}
                tabIndex={0}
                role="button"
                aria-label={`Late Punches: ${b.count} (${b.label})`}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const LatePunchLineChart = LatePunchHistogram;
export const LatePunchMiniBarChart = LatePunchHistogram;

// ============================================================================
// 5. CARD 5: EXCEPTIONS – COMPACT DONUT CHART (Red #ef4444)
// Proportional breakdown: Flagged, Rejected, and Failed records
// ============================================================================
export interface ExceptionDonutSegment {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export function computeExceptionDonutSegments(
  exceptions?: PunchLogItem[],
  data?: PunchTrendSegment[],
): ExceptionDonutSegment[] {
  let flagged = 0;
  let rejected = 0;
  let failed = 0;

  if (Array.isArray(exceptions) && exceptions.length > 0) {
    for (const p of exceptions) {
      if (!p) continue;
      if (p.processingState === 'failed') {
        failed += 1;
      } else if (
        p.validationStatus === 'invalid' ||
        p.validationStatus === 'duplicate'
      ) {
        rejected += 1;
      } else {
        flagged += 1;
      }
    }
  } else if (Array.isArray(data) && data.length > 0) {
    // Fallback distribution from segments
    flagged = data[0]?.count ?? 0;
    rejected = data[1]?.count ?? 0;
    failed = (data[2]?.count ?? 0) + (data[3]?.count ?? 0) + (data[4]?.count ?? 0);
  }

  const total = flagged + rejected + failed;

  return [
    {
      id: 'flagged',
      name: 'Flagged',
      count: flagged,
      percentage: total > 0 ? Math.round((flagged / total) * 100) : 0,
      color: '#f59e0b', // Amber / Needs review
    },
    {
      id: 'rejected',
      name: 'Rejected',
      count: rejected,
      percentage: total > 0 ? Math.round((rejected / total) * 100) : 0,
      color: '#ef4444', // Status Red
    },
    {
      id: 'failed',
      name: 'Failed',
      count: failed,
      percentage: total > 0 ? Math.round((failed / total) * 100) : 0,
      color: '#be123c', // Deep Crimson
    },
  ];
}

export function ExceptionsDonutChart({
  punches,
  data,
  total,
}: {
  punches?: PunchLogItem[];
  data?: PunchTrendSegment[];
  total: number;
}) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const segments = computeExceptionDonutSegments(punches, data);
  const effectiveTotal = total > 0 ? total : segments.reduce((sum, s) => sum + s.count, 0);

  const radius = 17;
  const circumference = 2 * Math.PI * radius; // ~106.81
  let accumulatedDash = 0;

  const activeSegment = segments.find((s) => s.id === hoveredSegment);
  const titleText = `Exception trends: ${effectiveTotal} exception records across workday periods`;

  return (
    <div
      className="bezent-kpi-graph-wrapper"
      onMouseLeave={() => setHoveredSegment(null)}
      onPointerLeave={() => setHoveredSegment(null)}
    >
      {/* Dynamic Floating Tooltip */}
      <div
        className={`bezent-kpi-graph-tooltip bezent-kpi-graph-tooltip--donut ${activeSegment ? 'is-visible' : ''}`}
        role="tooltip"
        aria-hidden={!activeSegment}
      >
        {activeSegment && (
          <div className="bezent-kpi-graph-tooltip-body">
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">Category:</span>
              <span className="bezent-kpi-graph-tooltip-val">{activeSegment.name}</span>
            </div>
            <div className="bezent-kpi-graph-tooltip-row">
              <span className="bezent-kpi-graph-tooltip-key">Count:</span>
              <span className="bezent-kpi-graph-tooltip-val">
                {activeSegment.count} ({activeSegment.percentage}%)
              </span>
            </div>
          </div>
        )}
      </div>

      <svg
        className="bezent-kpi-graph-svg bezent-kpi-graph-svg--donut"
        viewBox="0 0 54 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={titleText}
      >
        <title>{titleText}</title>

        {/* Ambient subtle background track ring */}
        <circle
          cx="27"
          cy="27"
          r={radius}
          stroke="rgba(239, 68, 68, 0.14)"
          strokeWidth="5.5"
          fill="none"
        />

        {/* Proportional Segment Arcs */}
        {effectiveTotal > 0 &&
          segments.map((seg) => {
            if (seg.count <= 0) return null;
            const dash = (seg.count / effectiveTotal) * circumference;
            const offset = -accumulatedDash;
            accumulatedDash += dash;
            const isHovered = hoveredSegment === seg.id;

            return (
              <circle
                key={seg.id}
                cx="27"
                cy="27"
                r={radius}
                stroke={seg.color}
                strokeWidth={isHovered ? 7.5 : 5.5}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
                transform="rotate(-90 27 27)"
                fill="none"
                className="bezent-kpi-chart-donut-segment"
                onMouseEnter={() => setHoveredSegment(seg.id)}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setHoveredSegment(seg.id);
                }}
                tabIndex={0}
                role="button"
                aria-label={`${seg.name}: ${seg.count} (${seg.percentage}%)`}
              />
            );
          })}

        {/* Center Total Number */}
        <text
          x="27"
          y="31"
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="800"
          fill="#dc2626"
          className="bezent-kpi-chart-donut-count"
        >
          {effectiveTotal}
        </text>
      </svg>
    </div>
  );
}

export const ExceptionsLineChart = ExceptionsDonutChart;
export const ExceptionsMiniBarChart = ExceptionsDonutChart;

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
