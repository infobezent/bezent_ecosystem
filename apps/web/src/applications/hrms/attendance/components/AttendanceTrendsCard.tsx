import React, { useState, useId, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { AttendanceTrendsResult, AttendanceTrendItem } from '../types/attendance.types';

export interface AttendanceTrendsCardProps {
  trends?: AttendanceTrendsResult;
  recentTrends?: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>;
  loading?: boolean;
}

interface TrendPoint {
  date: string;
  label: string;
  dayOfWeek?: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate?: number;
  x: number;
  yPresent: number;
  yAbsent: number;
  yLate: number;
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

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface Coord {
  x: number;
  y: number;
}

/**
 * Generates a smooth Catmull-Rom to Cubic Bézier SVG path string
 * through points, clamped between minY and maxY.
 */
function createSplinePath(pts: Coord[], minY: number, maxY: number): string {
  const n = pts.length;
  if (n === 0) return '';
  const first = pts[0];
  if (!first) return '';
  if (n === 1) return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  const second = pts[1];
  if (n === 2 && second) {
    return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} L ${second.x.toFixed(1)} ${second.y.toFixed(1)}`;
  }

  const clampY = (val: number) => Math.max(minY, Math.min(maxY, val));

  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1] ?? first;
    const p1 = pts[i] ?? first;
    const p2 = pts[i + 1] ?? p1;
    const p3 = pts[i + 2 < n ? i + 2 : i + 1] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clampY(p2.y - (p3.y - p1.y) / 6);

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export const AttendanceTrendsCard: React.FC<AttendanceTrendsCardProps> = ({
  trends,
  recentTrends,
  loading = false,
}) => {
  const gradPresentId = useId();
  const gradAbsentId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Active series visibility toggles
  const [showPresent, setShowPresent] = useState(true);
  const [showAbsent, setShowAbsent] = useState(true);
  const [showLate, setShowLate] = useState(true);

  // Chart Dimensions (taller viewBox for elegant breathing room and proportion)
  const chartW = 760;
  const chartH = 280;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 38;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const baselineY = chartH - padBottom;

  // Normalize raw data points
  const rawItems = useMemo(() => {
    if (trends?.items && trends.items.length > 0) {
      return trends.items.map((item: AttendanceTrendItem) => ({
        date: item.date,
        dayOfWeek: item.dayOfWeek,
        label: formatDateShort(item.date),
        present: Math.round(item.presentEquivalentDays ?? 0),
        absent: Math.round(item.absentEquivalentDays ?? 0),
        late: Math.round(item.lateOccurrences ?? 0),
        attendanceRate: item.attendanceRate ?? undefined,
      }));
    }

    if (recentTrends && recentTrends.length > 0) {
      return recentTrends.map((rt) => ({
        date: rt.date,
        dayOfWeek: undefined,
        label: formatDateShort(rt.date),
        present: Math.round(rt.present ?? 0),
        absent: Math.round(rt.absent ?? 0),
        late: Math.round(rt.late ?? 0),
        attendanceRate: undefined,
      }));
    }

    return [];
  }, [trends?.items, recentTrends]);

  // Calculate scales and coordinate points
  const { points, maxVal, yTicks } = useMemo(() => {
    if (rawItems.length === 0) {
      return { points: [], maxVal: 100, yTicks: [25, 50, 75, 100] };
    }

    const maxP = Math.max(...rawItems.map((d) => d.present), 0);
    const maxA = Math.max(...rawItems.map((d) => d.absent), 0);
    const maxL = Math.max(...rawItems.map((d) => d.late), 0);
    const highest = Math.max(maxP, maxA, maxL, 10);

    // Calculate a clean rounded max
    const magnitude = Math.pow(10, Math.floor(Math.log10(highest)));
    const normalized = highest / magnitude;
    let cleanTop: number;
    if (normalized <= 1.2) cleanTop = 1.2 * magnitude;
    else if (normalized <= 2) cleanTop = 2 * magnitude;
    else if (normalized <= 5) cleanTop = 5 * magnitude;
    else cleanTop = 10 * magnitude;

    const topLimit = Math.ceil(cleanTop);
    const ticks = [
      Math.round(topLimit * 0.25),
      Math.round(topLimit * 0.5),
      Math.round(topLimit * 0.75),
      topLimit,
    ];

    const n = rawItems.length;
    const computedPoints: TrendPoint[] = rawItems.map((item, idx) => {
      const x = n > 1 ? padLeft + (idx / (n - 1)) * plotW : padLeft + plotW / 2;
      const yPresent = baselineY - (item.present / topLimit) * plotH;
      const yAbsent = baselineY - (item.absent / topLimit) * plotH;
      const yLate = baselineY - (item.late / topLimit) * plotH;

      return {
        ...item,
        x,
        yPresent,
        yAbsent,
        yLate,
      };
    });

    return { points: computedPoints, maxVal: topLimit, yTicks: ticks };
  }, [rawItems, plotW, plotH, padLeft, baselineY]);

  // Pre-extract series coordinate arrays for spline interpolation
  const presentPoints = useMemo(() => points.map((p) => ({ x: p.x, y: p.yPresent })), [points]);
  const absentPoints = useMemo(() => points.map((p) => ({ x: p.x, y: p.yAbsent })), [points]);
  const latePoints = useMemo(() => points.map((p) => ({ x: p.x, y: p.yLate })), [points]);

  // Smooth Catmull-Rom Cubic Bézier Spline Curves
  const presentLinePath = useMemo(() => {
    if (!showPresent || points.length === 0) return '';
    return createSplinePath(presentPoints, padTop, baselineY);
  }, [points, presentPoints, showPresent, padTop, baselineY]);

  const presentAreaPath = useMemo(() => {
    if (!showPresent || points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return '';
    return `${presentLinePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [points, presentLinePath, showPresent, baselineY]);

  const absentLinePath = useMemo(() => {
    if (!showAbsent || points.length === 0) return '';
    return createSplinePath(absentPoints, padTop, baselineY);
  }, [points, absentPoints, showAbsent, padTop, baselineY]);

  const absentAreaPath = useMemo(() => {
    if (!showAbsent || points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return '';
    return `${absentLinePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [points, absentLinePath, showAbsent, baselineY]);

  const lateLinePath = useMemo(() => {
    if (!showLate || points.length === 0) return '';
    return createSplinePath(latePoints, padTop, baselineY);
  }, [points, latePoints, showLate, padTop, baselineY]);

  const activePoint = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;

  // Aggregate stats
  const avgAttendance = trends?.avgAttendanceRate ?? null;
  const totalLate =
    trends?.totalLateOccurrences ?? points.reduce((sum, p) => sum + (p.late || 0), 0);
  const avgAbsence = trends?.avgAbsenceRate ?? null;

  return (
    <Card className="bezent-att-trends-card">
      <CardHeader className="bezent-att-trends-header">
        <div className="bezent-att-trends-header-left">
          <div className="bezent-att-trends-title-group">
            <div className="bezent-att-trends-icon">
              <BezentIcon name="reports" size={16} />
            </div>
            <div>
              <CardTitle className="bezent-att-trends-title">Attendance Trends</CardTitle>
              <span className="bezent-att-trends-subtitle">
                Daily progression of workforce presence, absence, and arrival punctuality
              </span>
            </div>
          </div>
        </div>

        {/* Right Header: Interactive Series Legend Toggles */}
        <div className="bezent-att-trends-legend" role="toolbar" aria-label="Toggle trend lines">
          {/* Present Toggle */}
          <button
            type="button"
            className={`bezent-att-legend-btn ${showPresent ? 'is-active' : 'is-muted'}`}
            onClick={() => setShowPresent((prev) => !prev)}
            aria-pressed={showPresent}
            title="Toggle Present line"
          >
            <span className="bezent-att-legend-pill bezent-att-legend-pill--present" />
            <span className="bezent-att-legend-label">Present</span>
          </button>

          {/* Absent Toggle */}
          <button
            type="button"
            className={`bezent-att-legend-btn ${showAbsent ? 'is-active' : 'is-muted'}`}
            onClick={() => setShowAbsent((prev) => !prev)}
            aria-pressed={showAbsent}
            title="Toggle Absent line"
          >
            <span className="bezent-att-legend-pill bezent-att-legend-pill--absent" />
            <span className="bezent-att-legend-label">Absent</span>
          </button>

          {/* Late Arrival Toggle */}
          <button
            type="button"
            className={`bezent-att-legend-btn ${showLate ? 'is-active' : 'is-muted'}`}
            onClick={() => setShowLate((prev) => !prev)}
            aria-pressed={showLate}
            title="Toggle Late Arrival line"
          >
            <span className="bezent-att-legend-pill bezent-att-legend-pill--late" />
            <span className="bezent-att-legend-label">Late Arrival</span>
          </button>
        </div>
      </CardHeader>

      <CardBody className="bezent-att-trends-body">
        {/* Metric Summary Strip */}
        <div className="bezent-att-trends-summary-strip">
          <div className="bezent-att-summary-item">
            <span className="bezent-att-summary-dot is-present" />
            <div className="bezent-att-summary-meta">
              <span className="bezent-att-summary-label">Average Attendance</span>
              <span className="bezent-att-summary-val bezent-att-summary-val--present">
                {loading ? '—' : avgAttendance !== null ? `${avgAttendance}%` : '—'}
              </span>
            </div>
          </div>
          <div className="bezent-att-summary-divider" />
          <div className="bezent-att-summary-item">
            <span className="bezent-att-summary-dot is-absent" />
            <div className="bezent-att-summary-meta">
              <span className="bezent-att-summary-label">Average Absence</span>
              <span className="bezent-att-summary-val bezent-att-summary-val--absent">
                {loading ? '—' : avgAbsence !== null ? `${avgAbsence}%` : '—'}
              </span>
            </div>
          </div>
          <div className="bezent-att-summary-divider" />
          <div className="bezent-att-summary-item">
            <span className="bezent-att-summary-dot is-late" />
            <div className="bezent-att-summary-meta">
              <span className="bezent-att-summary-label">Total Late Occurrences</span>
              <span className="bezent-att-summary-val bezent-att-summary-val--late">
                {loading ? '—' : totalLate}
              </span>
            </div>
          </div>
        </div>

        {/* SVG Line / Area Trend Chart or Skeleton */}
        {loading ? (
          <div className="bezent-att-trends-skeleton" aria-label="Loading trends..." />
        ) : (
          <div className="bezent-att-chart-container">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="bezent-att-trend-svg"
              role="img"
              aria-label="Attendance Trends Line Chart"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width <= 0 || points.length === 0) return;
                const svgX = ((e.clientX - rect.left) / rect.width) * chartW;
                let bestIdx = 0;
                let bestDist = Infinity;
                points.forEach((pt, idx) => {
                  const dist = Math.abs(pt.x - svgX);
                  if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = idx;
                  }
                });
                setHoveredIdx(bestIdx);
              }}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id={gradPresentId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id={gradAbsentId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.16" />
                  <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>

                <filter id="att-trend-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="8"
                    floodColor="#0f172a"
                    floodOpacity="0.25"
                  />
                </filter>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {yTicks.map((val) => {
                const y = baselineY - (val / maxVal) * plotH;
                return (
                  <g key={val}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartW - padRight}
                      y2={y}
                      strokeDasharray="4 4"
                      className="bezent-att-trend-gridline"
                    />
                    <text
                      x={padLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="bezent-att-trend-axis-label"
                    >
                      {val.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Baseline Line */}
              <line
                x1={padLeft}
                y1={baselineY}
                x2={chartW - padRight}
                y2={baselineY}
                className="bezent-att-trend-baseline"
              />
              <text
                x={padLeft - 12}
                y={baselineY + 4}
                textAnchor="end"
                className="bezent-att-trend-axis-label"
              >
                0
              </text>

              {/* X-Axis Date / Day Labels */}
              {points.map((pt, i) => (
                <text
                  key={pt.date}
                  x={pt.x}
                  y={baselineY + 22}
                  textAnchor="middle"
                  className={`bezent-att-trend-axis-label ${
                    hoveredIdx === i ? 'bezent-att-trend-axis-label--active' : ''
                  }`}
                >
                  {pt.label}
                </text>
              ))}

              {/* Present Area Gradient Glow */}
              {showPresent && presentAreaPath && (
                <path d={presentAreaPath} fill={`url(#${gradPresentId})`} pointerEvents="none" />
              )}

              {/* Absent Area Subtle Tint */}
              {showAbsent && absentAreaPath && (
                <path d={absentAreaPath} fill={`url(#${gradAbsentId})`} pointerEvents="none" />
              )}

              {/* Present Spline Line */}
              {showPresent && presentLinePath && (
                <path
                  d={presentLinePath}
                  className="bezent-att-line bezent-att-line--present"
                  pointerEvents="none"
                />
              )}

              {/* Absent Spline Line */}
              {showAbsent && absentLinePath && (
                <path
                  d={absentLinePath}
                  className="bezent-att-line bezent-att-line--absent"
                  pointerEvents="none"
                />
              )}

              {/* Late Arrival Spline Line */}
              {showLate && lateLinePath && (
                <path
                  d={lateLinePath}
                  className="bezent-att-line bezent-att-line--late"
                  pointerEvents="none"
                />
              )}

              {/* Data Nodes along curves */}
              {showPresent &&
                points.map((pt, i) => (
                  <circle
                    key={`p-node-${pt.date}`}
                    cx={pt.x}
                    cy={pt.yPresent}
                    r={hoveredIdx === i ? 5.5 : 3.2}
                    className="bezent-att-node bezent-att-node--present"
                    pointerEvents="none"
                  />
                ))}

              {showAbsent &&
                points.map((pt, i) => (
                  <circle
                    key={`a-node-${pt.date}`}
                    cx={pt.x}
                    cy={pt.yAbsent}
                    r={hoveredIdx === i ? 5 : 2.8}
                    className="bezent-att-node bezent-att-node--absent"
                    pointerEvents="none"
                  />
                ))}

              {showLate &&
                points.map((pt, i) => (
                  <circle
                    key={`l-node-${pt.date}`}
                    cx={pt.x}
                    cy={pt.yLate}
                    r={hoveredIdx === i ? 5 : 2.8}
                    className="bezent-att-node bezent-att-node--late"
                    pointerEvents="none"
                  />
                ))}

              {/* Vertical Tracker Guide & Markers when Hovered */}
              {activePoint && (
                <g className="bezent-att-trend-tracker" pointerEvents="none">
                  <line
                    x1={activePoint.x}
                    y1={padTop}
                    x2={activePoint.x}
                    y2={baselineY}
                    className="bezent-att-trend-guideline"
                  />

                  {/* Point Dots on Active Series with subtle halo */}
                  {showPresent && (
                    <>
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yPresent}
                        r={10}
                        className="bezent-att-halo bezent-att-halo--present"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yPresent}
                        r={5.5}
                        className="bezent-att-dot bezent-att-dot--present"
                      />
                    </>
                  )}
                  {showAbsent && (
                    <>
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yAbsent}
                        r={9}
                        className="bezent-att-halo bezent-att-halo--absent"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yAbsent}
                        r={5}
                        className="bezent-att-dot bezent-att-dot--absent"
                      />
                    </>
                  )}
                  {showLate && (
                    <>
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yLate}
                        r={9}
                        className="bezent-att-halo bezent-att-halo--late"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.yLate}
                        r={5}
                        className="bezent-att-dot bezent-att-dot--late"
                      />
                    </>
                  )}

                  {/* Interactive Floating Tooltip */}
                  {(() => {
                    const tooltipW = 200;
                    const tooltipH = 110;
                    let tipX = activePoint.x + 14;
                    if (tipX + tooltipW > chartW - padRight) {
                      tipX = activePoint.x - tooltipW - 14;
                    }
                    const tipY = Math.max(
                      padTop,
                      Math.min(baselineY - tooltipH - 6, activePoint.yPresent - 45),
                    );

                    return (
                      <g transform={`translate(${tipX}, ${tipY})`} filter="url(#att-trend-shadow)">
                        <rect
                          width={tooltipW}
                          height={tooltipH}
                          rx={8}
                          className="bezent-att-tooltip-bg"
                        />
                        <text x={14} y={20} className="bezent-att-tooltip-title">
                          {formatDateFull(activePoint.date)}
                        </text>
                        <line
                          x1={14}
                          y1={28}
                          x2={tooltipW - 14}
                          y2={28}
                          className="bezent-att-tooltip-line"
                        />

                        {/* Present Row */}
                        <circle cx={20} cy={46} r={4} fill="#3b82f6" />
                        <text x={30} y={49} className="bezent-att-tooltip-label">
                          Present:
                        </text>
                        <text
                          x={tooltipW - 14}
                          y={49}
                          textAnchor="end"
                          className="bezent-att-tooltip-val--present"
                        >
                          {activePoint.present.toLocaleString()}{' '}
                          {activePoint.attendanceRate ? `(${activePoint.attendanceRate}%)` : ''}
                        </text>

                        {/* Absent Row */}
                        <circle cx={20} cy={69} r={4} fill="#8b5cf6" />
                        <text x={30} y={72} className="bezent-att-tooltip-label">
                          Absent:
                        </text>
                        <text
                          x={tooltipW - 14}
                          y={72}
                          textAnchor="end"
                          className="bezent-att-tooltip-val--absent"
                        >
                          {activePoint.absent.toLocaleString()}
                        </text>

                        {/* Late Arrival Row */}
                        <circle cx={20} cy={92} r={4} fill="#10b981" />
                        <text x={30} y={95} className="bezent-att-tooltip-label">
                          Late Arrival:
                        </text>
                        <text
                          x={tooltipW - 14}
                          y={95}
                          textAnchor="end"
                          className="bezent-att-tooltip-val--late"
                        >
                          {activePoint.late.toLocaleString()}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
            </svg>
          </div>
        )}

        {/* Bottom Trend Metadata & Status Bar */}
        <div className="bezent-att-trends-footer">
          <div className="bezent-att-trends-footer-left">
            <span className="bezent-att-trends-footer-pulse" />
            <span className="bezent-att-trends-footer-text">
              {rawItems.length} Days Active Cycle · Daily Workforce Biometric Flow
            </span>
          </div>
          <div className="bezent-att-trends-footer-right">
            <span className="bezent-att-trends-footer-hint">
              Hover along curves to inspect exact headcount
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
