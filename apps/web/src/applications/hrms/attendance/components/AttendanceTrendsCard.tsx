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
 * Generates an architectural filleted polyline path:
 * Straight connecting lines with smoothly rounded corner bends (quadratic Bézier fillets).
 * Neither a continuously curved wave spline nor sharp jagged needle vertices.
 */
function generateFilletedPath(
  pts: Point[],
  baselineY: number,
  radius = 10,
): { linePath: string; areaPath: string } {
  if (pts.length === 0) return { linePath: '', areaPath: '' };
  if (pts.length === 1) {
    const p = pts[0];
    return {
      linePath: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      areaPath: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${p.x.toFixed(1)} ${baselineY.toFixed(1)} Z`,
    };
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);

    if (len1 === 0 || len2 === 0) {
      d += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      continue;
    }

    // Limit fillet radius to at most 45% of neighboring segments to preserve straight segments
    const rEff = Math.min(radius, len1 * 0.45, len2 * 0.45);

    const startX = curr.x - (v1.x / len1) * rEff;
    const startY = curr.y - (v1.y / len1) * rEff;
    const endX = curr.x + (v2.x / len2) * rEff;
    const endY = curr.y + (v2.y / len2) * rEff;

    d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  const areaD = `${d} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${pts[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

  return { linePath: d, areaPath: areaD };
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

  // Calculate scales and column points
  const { columns, maxVal, yTicks } = useMemo(() => {
    if (rawItems.length === 0) {
      return { columns: [], maxVal: 40, yTicks: [10, 20, 30, 40] };
    }

    const maxValCalculated = Math.max(
      ...rawItems.map((d) => Math.max(d.present, d.absent, d.late)),
      10,
    );

    // Calculate a clean rounded max scale with comfortable headroom
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValCalculated)));
    const normalized = maxValCalculated / magnitude;
    let cleanTop: number;
    if (normalized <= 1.2) cleanTop = 1.2 * magnitude;
    else if (normalized <= 2) cleanTop = 2 * magnitude;
    else if (normalized <= 3) cleanTop = 3 * magnitude;
    else if (normalized <= 5) cleanTop = 5 * magnitude;
    else cleanTop = 10 * magnitude;

    const topLimit = Math.max(Math.ceil(cleanTop), 10);
    const step = topLimit / 4;
    const ticks = [
      Math.round(step),
      Math.round(step * 2),
      Math.round(step * 3),
      topLimit,
    ];

    const n = rawItems.length;

    const computedCols = rawItems.map((item, idx) => {
      const cx = n > 1 ? padLeft + (idx / (n - 1)) * plotW : padLeft + plotW / 2;

      const yPresent = baselineY - (Math.min(item.present, topLimit) / topLimit) * plotH;
      const yAbsent = baselineY - (Math.min(item.absent, topLimit) / topLimit) * plotH;
      const yLate = baselineY - (Math.min(item.late, topLimit) / topLimit) * plotH;

      const rate =
        item.attendanceRate !== undefined
          ? Math.round(item.attendanceRate)
          : item.present + item.absent > 0
            ? Math.round((item.present / (item.present + item.absent)) * 100)
            : 0;

      return {
        ...item,
        idx,
        cx,
        yPresent,
        yAbsent,
        yLate,
        rate,
      };
    });

    return { columns: computedCols, maxVal: topLimit, yTicks: ticks };
  }, [rawItems, plotW, plotH, padLeft, baselineY]);

  // Compute filleted line and area paths for active series
  const presentPts = useMemo(
    () => columns.map((c) => ({ x: c.cx, y: c.yPresent })),
    [columns],
  );
  const absentPts = useMemo(
    () => columns.map((c) => ({ x: c.cx, y: c.yAbsent })),
    [columns],
  );
  const latePts = useMemo(
    () => columns.map((c) => ({ x: c.cx, y: c.yLate })),
    [columns],
  );

  const presentPaths = useMemo(
    () => (showPresent ? generateFilletedPath(presentPts, baselineY, 10) : null),
    [showPresent, presentPts, baselineY],
  );
  const absentPaths = useMemo(
    () => (showAbsent ? generateFilletedPath(absentPts, baselineY, 10) : null),
    [showAbsent, absentPts, baselineY],
  );
  const latePaths = useMemo(
    () => (showLate ? generateFilletedPath(latePts, baselineY, 10) : null),
    [showLate, latePts, baselineY],
  );

  const activeCol = hoveredIdx !== null && columns[hoveredIdx] ? columns[hoveredIdx] : null;

  // Aggregate stats
  const avgAttendance = trends?.avgAttendanceRate ?? null;
  const totalLate =
    trends?.totalLateOccurrences ?? rawItems.reduce((sum, p) => sum + (p.late || 0), 0);
  const avgAbsence = trends?.avgAbsenceRate ?? null;

  const hoverZoneW = rawItems.length > 1 ? plotW / (rawItems.length - 1) : plotW;

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

        {/* SVG Chamfered Precision Line Graph or Skeleton */}
        {loading ? (
          <div className="bezent-att-trends-skeleton" aria-label="Loading trends..." />
        ) : (
          <div className="bezent-att-chart-container">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="bezent-att-trend-svg"
              role="img"
              aria-label="Attendance Trends Line Graph"
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

                {/* Subtle series area gradients */}
                <linearGradient id={`${clipPrefix}-grad-present`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.16" />
                  <stop offset="80%" stopColor="#2563eb" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>

                <linearGradient id={`${clipPrefix}-grad-absent`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.14" />
                  <stop offset="80%" stopColor="#7c3aed" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>

                <linearGradient id={`${clipPrefix}-grad-late`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                  <stop offset="80%" stopColor="#10b981" stopOpacity="0.02" />
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

              {/* Active Column Background Hover Beam */}
              {activeCol && (
                <rect
                  x={activeCol.cx - 18}
                  y={padTop}
                  width={36}
                  height={plotH}
                  rx={6}
                  className="bezent-att-col-hover-beam"
                />
              )}

              {/* Vertical Dashed Guideline for Hovered Column */}
              {activeCol && (
                <line
                  x1={activeCol.cx}
                  y1={padTop}
                  x2={activeCol.cx}
                  y2={baselineY}
                  className="bezent-att-trend-guideline"
                />
              )}

              {/* Gradient Area Fills */}
              {latePaths && latePaths.areaPath && (
                <path d={latePaths.areaPath} fill={`url(#${clipPrefix}-grad-late)`} />
              )}
              {absentPaths && absentPaths.areaPath && (
                <path d={absentPaths.areaPath} fill={`url(#${clipPrefix}-grad-absent)`} />
              )}
              {presentPaths && presentPaths.areaPath && (
                <path d={presentPaths.areaPath} fill={`url(#${clipPrefix}-grad-present)`} />
              )}

              {/* Chamfered Filleted Lines */}
              {latePaths && latePaths.linePath && (
                <path d={latePaths.linePath} className="bezent-att-line bezent-att-line--late" />
              )}
              {absentPaths && absentPaths.linePath && (
                <path
                  d={absentPaths.linePath}
                  className="bezent-att-line bezent-att-line--absent"
                />
              )}
              {presentPaths && presentPaths.linePath && (
                <path
                  d={presentPaths.linePath}
                  className="bezent-att-line bezent-att-line--present"
                />
              )}

              {/* Diamond Data Nodes (No circles, rotated squares with smooth rounded corners) */}
              {columns.map((col) => {
                const isHovered = hoveredIdx === col.idx;

                return (
                  <g key={`nodes-${col.date}`}>
                    {/* Late Arrival Diamond */}
                    {showLate && (
                      <g transform={`translate(${col.cx}, ${col.yLate}) rotate(45)`}>
                        {isHovered && (
                          <rect
                            x={-7}
                            y={-7}
                            width={14}
                            height={14}
                            rx={3}
                            className="bezent-att-diamond-halo bezent-att-diamond-halo--late"
                          />
                        )}
                        <rect
                          x={isHovered ? -4.5 : -3.5}
                          y={isHovered ? -4.5 : -3.5}
                          width={isHovered ? 9 : 7}
                          height={isHovered ? 9 : 7}
                          rx={1.5}
                          className={`bezent-att-diamond-node bezent-att-diamond-node--late ${isHovered ? 'is-active' : ''}`}
                        />
                      </g>
                    )}

                    {/* Absent Diamond */}
                    {showAbsent && (
                      <g transform={`translate(${col.cx}, ${col.yAbsent}) rotate(45)`}>
                        {isHovered && (
                          <rect
                            x={-7}
                            y={-7}
                            width={14}
                            height={14}
                            rx={3}
                            className="bezent-att-diamond-halo bezent-att-diamond-halo--absent"
                          />
                        )}
                        <rect
                          x={isHovered ? -4.5 : -3.5}
                          y={isHovered ? -4.5 : -3.5}
                          width={isHovered ? 9 : 7}
                          height={isHovered ? 9 : 7}
                          rx={1.5}
                          className={`bezent-att-diamond-node bezent-att-diamond-node--absent ${isHovered ? 'is-active' : ''}`}
                        />
                      </g>
                    )}

                    {/* Present Diamond */}
                    {showPresent && (
                      <g transform={`translate(${col.cx}, ${col.yPresent}) rotate(45)`}>
                        {isHovered && (
                          <rect
                            x={-7}
                            y={-7}
                            width={14}
                            height={14}
                            rx={3}
                            className="bezent-att-diamond-halo bezent-att-diamond-halo--present"
                          />
                        )}
                        <rect
                          x={isHovered ? -4.5 : -3.5}
                          y={isHovered ? -4.5 : -3.5}
                          width={isHovered ? 9 : 7}
                          height={isHovered ? 9 : 7}
                          rx={1.5}
                          className={`bezent-att-diamond-node bezent-att-diamond-node--present ${isHovered ? 'is-active' : ''}`}
                        />
                      </g>
                    )}

                    {/* X-Axis Date / Day Label */}
                    <text
                      x={col.cx}
                      y={baselineY + 20}
                      textAnchor="middle"
                      className={`bezent-att-trend-axis-label ${
                        isHovered ? 'bezent-att-trend-axis-label--active' : ''
                      }`}
                    >
                      {col.label}
                    </text>
                  </g>
                );
              })}

              {/* Invisible Interactive Scrub Zones for smooth mouse tracking */}
              {columns.map((col) => (
                <rect
                  key={`scrub-${col.idx}`}
                  x={col.cx - hoverZoneW / 2}
                  y={padTop}
                  width={hoverZoneW}
                  height={plotH + padBottom}
                  fill="transparent"
                  cursor="pointer"
                  onMouseEnter={() => setHoveredIdx(col.idx)}
                />
              ))}

              {/* Interactive Floating Tooltip (Using Diamond Icons instead of Circles) */}
              {activeCol && (() => {
                const tooltipW = 196;
                const tooltipH = 104;
                let tipX = activeCol.cx + 14;
                if (tipX + tooltipW > chartW - padRight) {
                  tipX = activeCol.cx - tooltipW - 14;
                }
                const activeYs = [
                  showPresent ? activeCol.yPresent : 999,
                  showAbsent ? activeCol.yAbsent : 999,
                  showLate ? activeCol.yLate : 999,
                ].filter((y) => y !== 999);
                const minY = activeYs.length > 0 ? Math.min(...activeYs) : baselineY;
                const tipY = Math.max(
                  padTop - 6,
                  Math.min(baselineY - tooltipH - 4, minY - 24),
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

                    {/* Present Row (Diamond indicator) */}
                    <rect
                      x={16.5}
                      y={38.5}
                      width={7}
                      height={7}
                      rx={1.5}
                      transform="rotate(45 20 42)"
                      fill="#2563eb"
                    />
                    <text x={30} y={45} className="bezent-att-tooltip-label">
                      Present:
                    </text>
                    <text
                      x={tooltipW - 14}
                      y={45}
                      textAnchor="end"
                      className="bezent-att-tooltip-val--present"
                    >
                      {activeCol.present.toLocaleString()}{' '}
                      {activeCol.attendanceRate !== undefined
                        ? `(${Math.round(activeCol.attendanceRate)}%)`
                        : ''}
                    </text>

                    {/* Absent Row (Diamond indicator) */}
                    <rect
                      x={16.5}
                      y={60.5}
                      width={7}
                      height={7}
                      rx={1.5}
                      transform="rotate(45 20 64)"
                      fill="#7c3aed"
                    />
                    <text x={30} y={67} className="bezent-att-tooltip-label">
                      Absent:
                    </text>
                    <text
                      x={tooltipW - 14}
                      y={67}
                      textAnchor="end"
                      className="bezent-att-tooltip-val--absent"
                    >
                      {activeCol.absent.toLocaleString()}
                    </text>

                    {/* Late Arrival Row (Diamond indicator) */}
                    <rect
                      x={16.5}
                      y={82.5}
                      width={7}
                      height={7}
                      rx={1.5}
                      transform="rotate(45 20 86)"
                      fill="#10b981"
                    />
                    <text x={30} y={89} className="bezent-att-tooltip-label">
                      Late Arrival:
                    </text>
                    <text
                      x={tooltipW - 14}
                      y={89}
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
            Hover along graph to inspect daily headcount
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
