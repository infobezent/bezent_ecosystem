import type { PunchLogItem } from '../types/attendance.types';

export interface PunchTrendSegment {
  label: string;
  shortLabel: string;
  count: number;
}

export const WORKDAY_SEGMENTS = [
  { label: 'Morning Rush (08:00–10:00)', shortLabel: '08–10' },
  { label: 'Mid-Morning (10:00–12:00)', shortLabel: '10–12' },
  { label: 'Midday / Lunch (12:00–15:00)', shortLabel: '12–15' },
  { label: 'Afternoon (15:00–18:00)', shortLabel: '15–18' },
  { label: 'Evening Checkout (18:00+)', shortLabel: '18+' },
];

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
 * Maps a list of punches to 5 standard workday segments based on actual timestamps.
 */
export function computeWorkdayTrendSegments(punches: PunchLogItem[]): PunchTrendSegment[] {
  const segments: PunchTrendSegment[] = WORKDAY_SEGMENTS.map((s) => ({
    label: s.label,
    shortLabel: s.shortLabel,
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
 * 1. Total / All Punches Mini Line Chart (Workable Activity Trend Sparkline)
 * Features a smooth diurnal wave curve reflecting real workday entry & exit peaks.
 */
export function TotalPunchesLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const color = '#2563eb';
  const baselineY = 32;
  const peakY = 8;
  const heightSpan = baselineY - peakY;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  // 5 point positions across width 88
  const xCoords = [6, 25, 44, 63, 82];
  const pts = data.map((d, i) => {
    const ratio = total > 0 ? d.count / maxVal : 0;
    const y = total > 0 ? baselineY - Math.round(ratio * heightSpan) : baselineY;
    const x = xCoords[i] ?? (6 + i * 19);
    return { x, y, label: d.label, count: d.count };
  });

  const linePath = generateSmoothBezier(pts);
  const firstPt = pts[0] ?? { x: 6, y: baselineY, label: '', count: 0 };
  const lastPt = pts[pts.length - 1] ?? { x: 82, y: baselineY, label: '', count: 0 };
  const areaPath = `${linePath} L ${lastPt.x} 36 L ${firstPt.x} 36 Z`;

  // Find peak point for accent beacon
  let peakIdx = 0;
  let maxCount = -1;
  pts.forEach((p, idx) => {
    if (p.count > maxCount) {
      maxCount = p.count;
      peakIdx = idx;
    }
  });
  const peakPt = pts[peakIdx] ?? firstPt;

  return (
    <svg
      className="bezent-kpi-graph-svg"
      viewBox="0 0 88 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Punch activity trend: ${total} total punches`}
    >
      <title>{`Punch activity trend: ${total} total punches across 5 workday segments`}</title>
      <defs>
        <linearGradient id="total-punches-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
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
        strokeOpacity="0.18"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Translucent Soft Glow Fill under Curve */}
      <path d={areaPath} fill="url(#total-punches-area-grad)" />

      {/* Crisp Semantic Wave Stroke */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Peak Activity Accent Pin */}
      {total > 0 && (
        <g className="bezent-kpi-graph-beacon" aria-hidden="true">
          <circle cx={peakPt.x} cy={peakPt.y} r={5} fill={color} fillOpacity="0.2" />
          <circle cx={peakPt.x} cy={peakPt.y} r={2.5} fill={color} />
          <title>{`Peak Activity: ${peakPt.label} (${peakPt.count} punches)`}</title>
        </g>
      )}

      {/* Interactive hover targets along segments */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="transparent"
          className="bezent-kpi-graph-point"
        >
          <title>{`${p.label}: ${p.count} punch${p.count === 1 ? '' : 'es'}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export const AllPunchesLineChart = TotalPunchesLineChart;

/**
 * 2. First In Mini Line Chart (Morning Arrival Wave Curve)
 * Features an emerald arrival curve illustrating earliest check-ins across workday segments.
 */
export function FirstInLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const color = '#10b981';
  const baselineY = 32;
  const peakY = 8;
  const heightSpan = baselineY - peakY;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const xCoords = [6, 25, 44, 63, 82];
  const pts = data.map((d, i) => {
    const ratio = total > 0 ? d.count / maxVal : 0;
    const y = total > 0 ? baselineY - Math.round(ratio * heightSpan) : baselineY;
    const x = xCoords[i] ?? (6 + i * 19);
    return { x, y, label: d.label, count: d.count };
  });

  const linePath = generateSmoothBezier(pts);
  const firstPt = pts[0] ?? { x: 6, y: baselineY, label: '', count: 0 };
  const lastPt = pts[pts.length - 1] ?? { x: 82, y: baselineY, label: '', count: 0 };
  const areaPath = `${linePath} L ${lastPt.x} 36 L ${firstPt.x} 36 Z`;

  let peakIdx = 0;
  let maxCount = -1;
  pts.forEach((p, idx) => {
    if (p.count > maxCount) {
      maxCount = p.count;
      peakIdx = idx;
    }
  });
  const peakPt = pts[peakIdx] ?? firstPt;

  return (
    <svg
      className="bezent-kpi-graph-svg"
      viewBox="0 0 88 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`First In arrivals: ${total} total`}
    >
      <title>{`First In arrival trend: ${total} records across workday periods`}</title>
      <defs>
        <linearGradient id="first-in-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

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

      <path d={areaPath} fill="url(#first-in-area-grad)" />

      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {total > 0 && (
        <g className="bezent-kpi-graph-beacon" aria-hidden="true">
          <circle cx={peakPt.x} cy={peakPt.y} r={5} fill={color} fillOpacity="0.2" />
          <circle cx={peakPt.x} cy={peakPt.y} r={2.5} fill={color} />
          <title>{`Peak Check-In: ${peakPt.label} (${peakPt.count} arrivals)`}</title>
        </g>
      )}

      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="transparent"
          className="bezent-kpi-graph-point"
        >
          <title>{`${p.label}: ${p.count} arrival${p.count === 1 ? '' : 's'}`}</title>
        </circle>
      ))}
    </svg>
  );
}

/**
 * 3. Last Out Mini Line Chart (Evening Departure Wave Curve)
 * Features a purple departure curve illustrating latest check-outs across workday segments.
 */
export function LastOutLineChart({
  data,
  total,
}: {
  data: PunchTrendSegment[];
  total: number;
}) {
  const color = '#8b5cf6';
  const baselineY = 32;
  const peakY = 8;
  const heightSpan = baselineY - peakY;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const xCoords = [6, 25, 44, 63, 82];
  const pts = data.map((d, i) => {
    const ratio = total > 0 ? d.count / maxVal : 0;
    const y = total > 0 ? baselineY - Math.round(ratio * heightSpan) : baselineY;
    const x = xCoords[i] ?? (6 + i * 19);
    return { x, y, label: d.label, count: d.count };
  });

  const linePath = generateSmoothBezier(pts);
  const firstPt = pts[0] ?? { x: 6, y: baselineY, label: '', count: 0 };
  const lastPt = pts[pts.length - 1] ?? { x: 82, y: baselineY, label: '', count: 0 };
  const areaPath = `${linePath} L ${lastPt.x} 36 L ${firstPt.x} 36 Z`;

  let peakIdx = 0;
  let maxCount = -1;
  pts.forEach((p, idx) => {
    if (p.count > maxCount) {
      maxCount = p.count;
      peakIdx = idx;
    }
  });
  const peakPt = pts[peakIdx] ?? firstPt;

  return (
    <svg
      className="bezent-kpi-graph-svg"
      viewBox="0 0 88 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Last Out departures: ${total} total`}
    >
      <title>{`Last Out departure trend: ${total} records across workday periods`}</title>
      <defs>
        <linearGradient id="last-out-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

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

      <path d={areaPath} fill="url(#last-out-area-grad)" />

      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {total > 0 && (
        <g className="bezent-kpi-graph-beacon" aria-hidden="true">
          <circle cx={peakPt.x} cy={peakPt.y} r={5} fill={color} fillOpacity="0.2" />
          <circle cx={peakPt.x} cy={peakPt.y} r={2.5} fill={color} />
          <title>{`Peak Check-Out: ${peakPt.label} (${peakPt.count} departures)`}</title>
        </g>
      )}

      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="transparent"
          className="bezent-kpi-graph-point"
        >
          <title>{`${p.label}: ${p.count} departure${p.count === 1 ? '' : 's'}`}</title>
        </circle>
      ))}
    </svg>
  );
}

/**
 * 4. Late Punch Mini Bar Chart
 * Features amber structured column bars across workday periods.
 */
export function LatePunchMiniBarChart({
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
      aria-label={`Late punch trends: ${total} total`}
    >
      <title>{`Late punch trends: ${total} late punches across workday periods`}</title>

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
            <rect
              x={x}
              y={baselineY - maxBarHeight}
              width={barWidth}
              height={maxBarHeight}
              rx={2}
              fill="rgba(245, 158, 11, 0.15)"
            />
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
                <title>{`${d.label}: ${d.count} late`}</title>
              </rect>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 5. Exceptions Mini Bar Chart
 * Features red structured column bars for flagged, rejected, and failed records.
 */
export function ExceptionsMiniBarChart({
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
      aria-label={`Exception trends: ${total} total`}
    >
      <title>{`Exception trends: ${total} exception records across workday periods`}</title>

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
            <rect
              x={x}
              y={baselineY - maxBarHeight}
              width={barWidth}
              height={maxBarHeight}
              rx={2}
              fill="rgba(239, 68, 68, 0.15)"
            />
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
                <title>{`${d.label}: ${d.count} exceptions`}</title>
              </rect>
            )}
          </g>
        );
      })}
    </svg>
  );
}

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
