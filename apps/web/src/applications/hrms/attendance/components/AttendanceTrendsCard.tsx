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

  // Calculate scales and column telemetry
  const { columns, maxVal, yTicks } = useMemo(() => {
    if (rawItems.length === 0) {
      return { columns: [], maxVal: 40, yTicks: [10, 20, 30, 40] };
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
    const colW = Math.min(34, Math.max(18, (plotW / Math.max(n, 7)) * 0.44));

    const computedCols = rawItems.map((item, idx) => {
      const cx = n > 1 ? padLeft + (idx / (n - 1)) * plotW : padLeft + plotW / 2;
      const x = cx - colW / 2;

      const pVal = showPresent ? item.present : 0;
      const aVal = showAbsent ? item.absent : 0;
      const lVal = showLate ? Math.min(item.late, pVal) : 0;
      const totalActive = pVal + aVal;

      const totalH = Math.min(plotH, (totalActive / topLimit) * plotH);
      const yStackTop = baselineY - totalH;

      const presentH = Math.min(plotH, (pVal / topLimit) * plotH);
      const yPresent = baselineY - presentH;

      const absentH = Math.min(plotH, (aVal / topLimit) * plotH);
      const yAbsent = yStackTop;

      const lateH = Math.min(presentH, (lVal / topLimit) * plotH);
      const yLate = baselineY - lateH;

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
        x,
        colW,
        pVal,
        aVal,
        lVal,
        totalActive,
        totalH,
        yStackTop,
        presentH,
        yPresent,
        absentH,
        yAbsent,
        lateH,
        yLate,
        rate,
      };
    });

    return { columns: computedCols, maxVal: topLimit, yTicks: ticks };
  }, [rawItems, plotW, plotH, padLeft, baselineY, showPresent, showAbsent, showLate]);

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

        {/* SVG Segmented Daily Columns Chart or Skeleton */}
        {loading ? (
          <div className="bezent-att-trends-skeleton" aria-label="Loading trends..." />
        ) : (
          <div className="bezent-att-chart-container">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="bezent-att-trend-svg"
              role="img"
              aria-label="Attendance Trends Column Chart"
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
                {columns.map((col) => (
                  <clipPath key={`clip-${col.idx}`} id={`${clipPrefix}-col-${col.idx}`}>
                    <rect
                      x={col.x}
                      y={col.yStackTop}
                      width={col.colW}
                      height={Math.max(0, col.totalH)}
                      rx={6}
                      ry={6}
                    />
                  </clipPath>
                ))}
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

              {/* Segmented Daily Columns */}
              {columns.map((col) => {
                const isHovered = hoveredIdx === col.idx;
                return (
                  <g
                    key={`col-${col.date}`}
                    className={`bezent-att-col-group ${isHovered ? 'is-hovered' : ''}`}
                    onMouseEnter={() => setHoveredIdx(col.idx)}
                  >
                    {/* Hover Halo Background */}
                    {isHovered && (
                      <rect
                        x={col.x - 4}
                        y={padTop - 4}
                        width={col.colW + 8}
                        height={plotH + 8}
                        rx={10}
                        className="bezent-att-col-hover-halo"
                      />
                    )}

                    {/* Column Background Track */}
                    <rect
                      x={col.x}
                      y={padTop}
                      width={col.colW}
                      height={plotH}
                      rx={6}
                      className="bezent-att-col-bg"
                    />

                    {/* Segmented Data Stack (Clipped for smooth capsule corners) */}
                    {col.totalH > 0 && (
                      <g clipPath={`url(#${clipPrefix}-col-${col.idx})`}>
                        {/* Absent Segment (Top) */}
                        {col.absentH > 0 && (
                          <rect
                            x={col.x}
                            y={col.yAbsent}
                            width={col.colW}
                            height={col.absentH}
                            className="bezent-att-col-seg--absent"
                          />
                        )}

                        {/* Present Segment (Bottom) */}
                        {col.presentH > 0 && (
                          <rect
                            x={col.x}
                            y={col.yPresent}
                            width={col.colW}
                            height={col.presentH}
                            className="bezent-att-col-seg--present"
                          />
                        )}

                        {/* Late Arrival Segment (Indicator accent inside Present) */}
                        {col.lateH > 0 && (
                          <rect
                            x={col.x}
                            y={col.yLate}
                            width={col.colW}
                            height={col.lateH}
                            className="bezent-att-col-seg--late"
                          />
                        )}
                      </g>
                    )}

                    {/* Rate text above column */}
                    <text
                      x={col.cx}
                      y={col.totalH > 0 ? col.yStackTop - 5 : baselineY - 5}
                      textAnchor="middle"
                      className={`bezent-att-col-rate ${
                        col.rate >= 90
                          ? 'is-high'
                          : col.rate >= 75
                            ? 'is-mid'
                            : col.totalH === 0
                              ? 'is-empty'
                              : ''
                      }`}
                    >
                      {col.totalH > 0 ? `${col.rate}%` : '0%'}
                    </text>

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

              {/* Interactive Floating Tooltip */}
              {activeCol && (() => {
                const tooltipW = 195;
                const tooltipH = 106;
                let tipX = activeCol.cx + activeCol.colW / 2 + 10;
                if (tipX + tooltipW > chartW - padRight) {
                  tipX = activeCol.cx - activeCol.colW / 2 - tooltipW - 10;
                }
                const tipY = Math.max(
                  padTop,
                  Math.min(baselineY - tooltipH - 4, activeCol.yStackTop - 20),
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
                    <circle cx={20} cy={45} r={4} fill="#2563eb" />
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
                    <circle cx={20} cy={67} r={4} fill="#8b5cf6" />
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
                    <circle cx={20} cy={89} r={4} fill="#10b981" />
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
            Hover over columns to inspect daily headcount
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
