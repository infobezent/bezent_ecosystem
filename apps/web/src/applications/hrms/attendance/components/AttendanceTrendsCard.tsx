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

interface TrendDayItem {
  date: string;
  label: string;
  dayOfWeek?: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate?: number;
}

interface Point {
  x: number;
  y: number;
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

/**
 * Generates a crisp, sharp polyline:
 * Direct linear segments between data points with sharp vertex angles.
 */
function generateSharpPolyline(points: Point[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function generateSharpArea(points: Point[], baselineY: number): string {
  if (points.length < 2) return '';
  const linePath = generateSharpPolyline(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

export const AttendanceTrendsCard: React.FC<AttendanceTrendsCardProps> = ({
  trends,
  recentTrends,
  loading = false,
}) => {
  const clipPrefix = useId().replace(/:/g, '');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Active series visibility toggles
  const [showPresent, setShowPresent] = useState(true);
  const [showAbsent, setShowAbsent] = useState(true);
  const [showLate, setShowLate] = useState(true);

  // Chart Dimensions (compact viewBox for streamlined card height)
  const chartW = 760;
  const chartH = 150;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 18;
  const padBottom = 26;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const baselineY = chartH - padBottom;

  // Normalize raw data points
  const rawItems: TrendDayItem[] = useMemo(() => {
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

  // Calculate scales, coordinates, and filleted paths
  const { columns, maxVal, yTicks, paths } = useMemo(() => {
    if (rawItems.length === 0) {
      return {
        columns: [],
        maxVal: 40,
        yTicks: [10, 20, 30, 40],
        paths: {
          presentLine: '',
          presentArea: '',
          absentLine: '',
          absentArea: '',
          lateLine: '',
          lateArea: '',
        },
      };
    }

    const maxTotal = Math.max(...rawItems.map((d) => d.present + d.absent), 10);

    // Calculate a clean rounded max scale
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxTotal)));
    const normalized = maxTotal / magnitude;
    let cleanTop: number;
    if (normalized <= 1.2) cleanTop = 1.2 * magnitude;
    else if (normalized <= 2) cleanTop = 2 * magnitude;
    else if (normalized <= 3) cleanTop = 3 * magnitude;
    else if (normalized <= 5) cleanTop = 5 * magnitude;
    else cleanTop = 10 * magnitude;

    const topLimit = Math.max(Math.ceil(cleanTop), 20);
    const step = topLimit / 4;
    const ticks = [
      Math.round(step),
      Math.round(step * 2),
      Math.round(step * 3),
      topLimit,
    ];

    const n = rawItems.length;
    const colStep = n > 1 ? plotW / (n - 1) : plotW;

    const computedCols = rawItems.map((item, idx) => {
      const cx = n > 1 ? padLeft + idx * colStep : padLeft + plotW / 2;
      const rate =
        item.attendanceRate !== undefined
          ? Math.round(item.attendanceRate)
          : item.present + item.absent > 0
            ? Math.round((item.present / (item.present + item.absent)) * 100)
            : 0;

      const pY = baselineY - Math.min(plotH, (item.present / topLimit) * plotH);
      const aY = baselineY - Math.min(plotH, (item.absent / topLimit) * plotH);
      const lY = baselineY - Math.min(plotH, (item.late / topLimit) * plotH);

      return {
        ...item,
        idx,
        cx,
        rate,
        pY,
        aY,
        lY,
      };
    });

    const pPts = computedCols.map((c) => ({ x: c.cx, y: c.pY }));
    const aPts = computedCols.map((c) => ({ x: c.cx, y: c.aY }));
    const lPts = computedCols.map((c) => ({ x: c.cx, y: c.lY }));

    const computedPaths = {
      presentLine: generateSharpPolyline(pPts),
      presentArea: generateSharpArea(pPts, baselineY),
      absentLine: generateSharpPolyline(aPts),
      absentArea: generateSharpArea(aPts, baselineY),
      lateLine: generateSharpPolyline(lPts),
      lateArea: generateSharpArea(lPts, baselineY),
    };

    return {
      columns: computedCols,
      maxVal: topLimit,
      yTicks: ticks,
      paths: computedPaths,
    };
  }, [rawItems, plotW, plotH, padLeft, baselineY]);

  const activeCol = hoveredIdx !== null && columns[hoveredIdx] ? columns[hoveredIdx] : null;

  // Aggregate stats
  const avgAttendance = trends?.avgAttendanceRate ?? null;
  const totalLate =
    trends?.totalLateOccurrences ?? rawItems.reduce((sum, p) => sum + (p.late || 0), 0);
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
                Workforce presence, absence &amp; arrival punctuality
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
            title="Toggle Present series"
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
            title="Toggle Absent series"
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
            title="Toggle Late Arrival series"
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

        {/* SVG Filleted Polyline Chart or Skeleton */}
        {loading ? (
          <div className="bezent-att-trends-skeleton" aria-label="Loading trends..." />
        ) : (
          <div className="bezent-att-chart-container">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="bezent-att-trend-svg"
              role="img"
              aria-label="Attendance Trends Line Chart"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <filter id="att-trend-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="8"
                    floodColor="#0f172a"
                    floodOpacity="0.25"
                  />
                </filter>
                <linearGradient id={`${clipPrefix}-grad-present`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                  <stop offset="85%" stopColor="#2563eb" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${clipPrefix}-grad-absent`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
                  <stop offset="85%" stopColor="#7c3aed" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${clipPrefix}-grad-late`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
                  <stop offset="85%" stopColor="#10b981" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
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

              {/* Vertical Hover Guideline */}
              {activeCol && (
                <line
                  x1={activeCol.cx}
                  y1={padTop}
                  x2={activeCol.cx}
                  y2={baselineY}
                  className="bezent-att-trend-guideline"
                />
              )}

              {/* Subtle Gradient Areas */}
              {showAbsent && paths.absentArea && (
                <path
                  d={paths.absentArea}
                  fill={`url(#${clipPrefix}-grad-absent)`}
                  className="bezent-att-area"
                />
              )}
              {showPresent && paths.presentArea && (
                <path
                  d={paths.presentArea}
                  fill={`url(#${clipPrefix}-grad-present)`}
                  className="bezent-att-area"
                />
              )}
              {showLate && paths.lateArea && (
                <path
                  d={paths.lateArea}
                  fill={`url(#${clipPrefix}-grad-late)`}
                  className="bezent-att-area"
                />
              )}

              {/* Sharp Polyline Tracks */}
              {showAbsent && paths.absentLine && (
                <path
                  d={paths.absentLine}
                  className="bezent-att-line bezent-att-line--absent"
                />
              )}
              {showPresent && paths.presentLine && (
                <path
                  d={paths.presentLine}
                  className="bezent-att-line bezent-att-line--present"
                />
              )}
              {showLate && paths.lateLine && (
                <path
                  d={paths.lateLine}
                  className="bezent-att-line bezent-att-line--late"
                />
              )}

              {/* Active Hover Data Point Indicators (Scrub only, no resting markers) */}
              {activeCol && (
                <g className="bezent-att-trend-tracker">
                  {showAbsent && (
                    <circle
                      cx={activeCol.cx}
                      cy={activeCol.aY}
                      r={4.5}
                      className="bezent-att-hover-dot bezent-att-hover-dot--absent"
                    />
                  )}
                  {showPresent && (
                    <circle
                      cx={activeCol.cx}
                      cy={activeCol.pY}
                      r={4.5}
                      className="bezent-att-hover-dot bezent-att-hover-dot--present"
                    />
                  )}
                  {showLate && (
                    <circle
                      cx={activeCol.cx}
                      cy={activeCol.lY}
                      r={4.5}
                      className="bezent-att-hover-dot bezent-att-hover-dot--late"
                    />
                  )}
                </g>
              )}

              {/* X-Axis Date / Day Labels */}
              {columns.map((col) => {
                const isHovered = hoveredIdx === col.idx;
                return (
                  <text
                    key={`label-${col.date}`}
                    x={col.cx}
                    y={baselineY + 18}
                    textAnchor="middle"
                    className={`bezent-att-trend-axis-label ${
                      isHovered ? 'bezent-att-trend-axis-label--active' : ''
                    }`}
                  >
                    {col.label}
                  </text>
                );
              })}

              {/* Invisible Interactive Scrub Columns */}
              {columns.map((col, idx) => {
                const colW = rawItems.length > 1 ? plotW / (rawItems.length - 1) : plotW;
                const colX = col.cx - colW / 2;
                return (
                  <rect
                    key={`scrub-${col.date}`}
                    x={Math.max(padLeft, colX)}
                    y={padTop}
                    width={colW}
                    height={plotH}
                    className="bezent-att-scrub-col"
                    onMouseEnter={() => setHoveredIdx(idx)}
                  />
                );
              })}

              {/* Interactive Floating Tooltip */}
              {activeCol && (() => {
                const tooltipW = 195;
                const tooltipH = 106;
                let tipX = activeCol.cx + 14;
                if (tipX + tooltipW > chartW - padRight) {
                  tipX = activeCol.cx - tooltipW - 14;
                }
                const tipY = Math.max(
                  padTop,
                  Math.min(baselineY - tooltipH - 4, Math.min(activeCol.pY, activeCol.aY) - 30),
                );

                return (
                  <g
                    transform={`translate(${tipX}, ${tipY})`}
                    filter="url(#att-trend-shadow)"
                    pointerEvents="none"
                  >
                    <rect
                      width={tooltipW}
                      height={tooltipH}
                      rx={8}
                      className="bezent-att-tooltip-bg"
                    />
                    <text x={14} y={20} className="bezent-att-tooltip-title">
                      {formatDateFull(activeCol.date)}
                    </text>
                    <line
                      x1={14}
                      y1={28}
                      x2={tooltipW - 14}
                      y2={28}
                      className="bezent-att-tooltip-line"
                    />

                    {/* Present Row */}
                    <circle
                      cx={20}
                      cy={45}
                      r={3.5}
                      className="bezent-att-tooltip-dot--present"
                    />
                    <text x={30} y={48} className="bezent-att-tooltip-label">
                      Present:
                    </text>
                    <text
                      x={tooltipW - 14}
                      y={48}
                      textAnchor="end"
                      className="bezent-att-tooltip-val--present"
                    >
                      {activeCol.present.toLocaleString()}{' '}
                      {activeCol.attendanceRate !== undefined
                        ? `(${Math.round(activeCol.attendanceRate)}%)`
                        : ''}
                    </text>

                    {/* Absent Row */}
                    <circle
                      cx={20}
                      cy={67}
                      r={3.5}
                      className="bezent-att-tooltip-dot--absent"
                    />
                    <text x={30} y={70} className="bezent-att-tooltip-label">
                      Absent:
                    </text>
                    <text
                      x={tooltipW - 14}
                      y={70}
                      textAnchor="end"
                      className="bezent-att-tooltip-val--absent"
                    >
                      {activeCol.absent.toLocaleString()}
                    </text>

                    {/* Late Arrival Row */}
                    <circle
                      cx={20}
                      cy={89}
                      r={3.5}
                      className="bezent-att-tooltip-dot--late"
                    />
                    <text x={30} y={92} className="bezent-att-tooltip-label">
                      Late Arrival:
                    </text>
                    <text
                      x={tooltipW - 14}
                      y={92}
                      textAnchor="end"
                      className="bezent-att-tooltip-val--late"
                    >
                      {activeCol.late.toLocaleString()}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        )}

        {/* Bottom Trend Metadata & Status Bar */}
        <div className="bezent-att-trends-footer">
          <div className="bezent-att-trends-footer-left">
            <span className="bezent-att-trends-footer-pulse" />
            <span className="bezent-att-trends-footer-text">
              {rawItems.length} Days Active Cycle · Daily Workforce Flow
            </span>
          </div>
          <div className="bezent-att-trends-footer-hint">
            Hover over data points to inspect daily headcount
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
