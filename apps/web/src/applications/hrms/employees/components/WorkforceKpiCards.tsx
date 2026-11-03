import { useId, useMemo } from 'react';
import { Grid } from '../../../../design-system/components';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import type { EmployeeRecord } from '../api/employeesApi';

export interface WorkforceKpiSummary {
  total: number | null;
  active: number | null;
  pendingActivation: number | null;
  inactive: number | null;
  loading?: boolean;
  error?: boolean;
}

export interface WorkforceKpiCardsProps {
  kpis: WorkforceKpiSummary;
  employees?: EmployeeRecord[];
  activeStatusTab?: string;
  onSelectStatusTab?: (tabId: string) => void;
  referenceDate?: Date;
}

export interface TrendCalculationResult {
  trendData: number[] | null;
  trendChange: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  } | null;
}

/**
 * Computes genuine monthly historical trends from real employee records.
 * Returns null when insufficient historical date data is present (never fakes data).
 */
export function computeWorkforceMonthlyTrends(
  employees: EmployeeRecord[] = [],
  referenceDate: Date = new Date(),
): {
  total: TrendCalculationResult;
  active: TrendCalculationResult;
  pendingActivation: TrendCalculationResult;
  inactive: TrendCalculationResult;
} {
  const emptyResult: TrendCalculationResult = { trendData: null, trendChange: null };

  if (!employees || employees.length === 0) {
    return {
      total: emptyResult,
      active: emptyResult,
      pendingActivation: emptyResult,
      inactive: emptyResult,
    };
  }

  // Filter employees with valid joiningDate (YYYY-MM-DD)
  const validDatedEmployees = employees.filter(
    (e) => typeof e.joiningDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.joiningDate),
  );

  if (validDatedEmployees.length === 0) {
    return {
      total: emptyResult,
      active: emptyResult,
      pendingActivation: emptyResult,
      inactive: emptyResult,
    };
  }

  // Build the last 6 calendar month cutoff points (YYYY-MM)
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-based
  const monthKeys: string[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(refYear, refMonth - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    monthKeys.push(`${y}-${m}`);
  }

  // Compute metric snapshots for each of the 6 months
  const totalSeries: number[] = [];
  const activeSeries: number[] = [];
  const pendingSeries: number[] = [];
  const inactiveSeries: number[] = [];

  for (const monthKey of monthKeys) {
    // Count records joined on or before the end of this month
    const countTotal = validDatedEmployees.filter(
      (e) => e.joiningDate.slice(0, 7) <= monthKey,
    ).length;
    const countActive = validDatedEmployees.filter(
      (e) =>
        e.joiningDate.slice(0, 7) <= monthKey &&
        (e.employmentStatus === 'active' || e.employmentStatus === 'probation'),
    ).length;
    const countPending = validDatedEmployees.filter(
      (e) => e.joiningDate.slice(0, 7) <= monthKey && e.employmentStatus === 'pending_activation',
    ).length;
    const countInactive = validDatedEmployees.filter(
      (e) =>
        e.joiningDate.slice(0, 7) <= monthKey &&
        (e.employmentStatus === 'terminated' ||
          e.employmentStatus === 'suspended' ||
          e.employmentStatus === 'resigned'),
    ).length;

    totalSeries.push(countTotal);
    activeSeries.push(countActive);
    pendingSeries.push(countPending);
    inactiveSeries.push(countInactive);
  }

  function resolveSeriesResult(series: number[]): TrendCalculationResult {
    // Check if there is actual historical data with records
    const maxVal = Math.max(...series);
    if (maxVal === 0 && series.every((v) => v === 0)) {
      return emptyResult;
    }

    const current = series[series.length - 1] ?? 0;
    const previous = series[series.length - 2] ?? 0;
    const delta = current - previous;

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    let label = 'Stable this month';

    if (delta > 0) {
      direction = 'up';
      label = `+${delta} this month`;
    } else if (delta < 0) {
      direction = 'down';
      label = `${delta} this month`;
    }

    return {
      trendData: series,
      trendChange: {
        direction,
        label,
      },
    };
  }

  return {
    total: resolveSeriesResult(totalSeries),
    active: resolveSeriesResult(activeSeries),
    pendingActivation: resolveSeriesResult(pendingSeries),
    inactive: resolveSeriesResult(inactiveSeries),
  };
}

interface MiniChartProps {
  data: number[] | null;
  accent: 'blue' | 'green' | 'amber' | 'coral';
  type: 'smooth-area' | 'vertical-bars' | 'mini-area' | 'subtle-line';
  chartId: string;
}

const ACCENT_COLORS: Record<'blue' | 'green' | 'amber' | 'coral', string> = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  coral: '#f97373',
};

function MiniChart({ data, accent, type, chartId }: MiniChartProps) {
  const accentHex = ACCENT_COLORS[accent];

  // If no trend data or insufficient points, render clean neutral placeholder
  if (!data || data.length < 2) {
    return (
      <svg
        className="bezent-trend-kpi-card__chart-svg"
        viewBox="0 0 88 42"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <line
          x1="6"
          y1="24"
          x2="82"
          y2="24"
          stroke="var(--border-default, #cbd5e1)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
          opacity="0.65"
        />
        <circle cx="82" cy="24" r="2.5" fill="var(--border-default, #cbd5e1)" opacity="0.8" />
      </svg>
    );
  }

  if (type === 'vertical-bars') {
    const max = Math.max(...data, 1);
    const count = data.length;
    const barWidth = 7;
    const totalBarWidth = count * barWidth;
    const gap = (88 - totalBarWidth) / (count + 1);

    return (
      <svg
        className="bezent-trend-kpi-card__chart-svg"
        viewBox="0 0 88 42"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        {data.map((val, idx) => {
          const height = val > 0 ? Math.max(5, (val / max) * 30) : 3;
          const x = gap + idx * (barWidth + gap);
          const y = 38 - height;
          const opacity = idx === count - 1 ? 1 : 0.35 + (idx / count) * 0.55;

          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx="2"
              fill={accentHex}
              fillOpacity={opacity}
            />
          );
        })}
      </svg>
    );
  }

  // Smooth Area & Line charts
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => ({
    x: 4 + (idx / (data.length - 1)) * 80,
    y: max === min ? 21 : 34 - ((val - min) / range) * 24,
  }));

  let pathD = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const cpx = (p0.x + p1.x) / 2;
    pathD += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const linePath = pathD;
  const lastPt = points[points.length - 1]!;
  const firstPt = points[0]!;
  const areaPath = `${linePath} L ${lastPt.x} 42 L ${firstPt.x} 42 Z`;
  const gradId = `kpi-grad-${chartId}`;

  return (
    <svg
      className="bezent-trend-kpi-card__chart-svg"
      viewBox="0 0 88 42"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentHex} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accentHex} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={accentHex}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={accentHex} />
    </svg>
  );
}

interface SingleKpiCardProps {
  id: string;
  title: string;
  value: number | null;
  subtitle: string;
  accent: 'blue' | 'green' | 'amber' | 'coral';
  icon: BezentIconName;
  tooltip: string;
  chartType: 'smooth-area' | 'vertical-bars' | 'mini-area' | 'subtle-line';
  trendResult: TrendCalculationResult;
  loading: boolean;
  isActive: boolean;
  onClick?: () => void;
}

function SingleKpiCard({
  id,
  title,
  value,
  subtitle,
  accent,
  icon,
  tooltip,
  chartType,
  trendResult,
  loading,
  isActive,
  onClick,
}: SingleKpiCardProps) {
  const chartId = useId().replace(/:/g, '');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="region"
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value !== null ? value : 'Loading'}`}
      className={`bezent-trend-kpi-card ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Top Header: Icon + Title (Left) and Tooltip Info (Right) */}
      <div className="bezent-trend-kpi-card__header">
        <div className="bezent-trend-kpi-card__title-group">
          <div
            className={`bezent-trend-kpi-card__icon-badge bezent-trend-kpi-card__icon-badge--${accent}`}
            aria-hidden="true"
          >
            <BezentIcon name={icon} size={16} />
          </div>
          <span className="bezent-trend-kpi-card__title">{title}</span>
        </div>

        <button
          type="button"
          className="bezent-trend-kpi-card__info-btn"
          title={tooltip}
          aria-label={`Information: ${tooltip}`}
          onClick={(e) => e.stopPropagation()}
        >
          <BezentIcon name="help" size={14} />
        </button>
      </div>

      {/* Middle/Bottom: Prominent Value + Trend/Subtitle (Left) & Mini Chart (Right) */}
      <div className="bezent-trend-kpi-card__body">
        <div className="bezent-trend-kpi-card__metrics">
          <div className="bezent-trend-kpi-card__value">
            {loading ? (
              <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
            ) : value !== null ? (
              value
            ) : (
              '—'
            )}
          </div>

          {trendResult.trendChange ? (
            <div
              className={`bezent-trend-kpi-card__trend bezent-trend-kpi-card__trend--${trendResult.trendChange.direction}`}
            >
              {trendResult.trendChange.direction === 'up' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 9.5V2.5M6 2.5L2.5 6M6 2.5L9.5 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {trendResult.trendChange.direction === 'down' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 2.5V9.5M6 9.5L2.5 6M6 9.5L9.5 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span>{trendResult.trendChange.label}</span>
            </div>
          ) : (
            <span className="bezent-trend-kpi-card__caption">{subtitle}</span>
          )}
        </div>

        <div className="bezent-trend-kpi-card__chart">
          <MiniChart
            data={trendResult.trendData}
            accent={accent}
            type={chartType}
            chartId={`${id}-${chartId}`}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Workforce KPI Cards Redesign
 * Number + Mini Trend Chart (Premium Enterprise UI)
 *
 * Implements the 4 canonical workforce KPI cards:
 * 1. Total Employees (Blue #3B82F6, smooth line/area chart)
 * 2. Active Employees (Green #10B981, vertical bar chart)
 * 3. Pending Activation (Amber #F59E0B, compact line/area chart)
 * 4. Inactive Employees (Coral #F97373, subtle line chart)
 */
export function WorkforceKpiCards({
  kpis,
  employees = [],
  activeStatusTab,
  onSelectStatusTab,
  referenceDate,
}: WorkforceKpiCardsProps) {
  const trends = useMemo(
    () => computeWorkforceMonthlyTrends(employees, referenceDate),
    [employees, referenceDate],
  );

  const cards = [
    {
      id: 'total',
      title: 'Total Employees',
      value: kpis.total,
      subtitle: 'Total recorded workforce',
      accent: 'blue' as const,
      icon: 'employees' as BezentIconName,
      tooltip: 'Total count of all recorded employees across all statuses.',
      chartType: 'smooth-area' as const,
      trendResult: trends.total,
      statusTab: 'all',
    },
    {
      id: 'active',
      title: 'Active Employees',
      value: kpis.active,
      subtitle: 'Confirmed active employees',
      accent: 'green' as const,
      icon: 'userCheck' as BezentIconName,
      tooltip: 'Employees with confirmed active or probation status eligible for daily operations.',
      chartType: 'vertical-bars' as const,
      trendResult: trends.active,
      statusTab: 'active',
    },
    {
      id: 'pendingActivation',
      title: 'Pending Activation',
      value: kpis.pendingActivation,
      subtitle: 'Employees awaiting activation',
      accent: 'amber' as const,
      icon: 'onboarding' as BezentIconName,
      tooltip: 'Pre-boarded employees awaiting account activation and first sign-in.',
      chartType: 'mini-area' as const,
      trendResult: trends.pendingActivation,
      statusTab: 'pending_activation',
    },
    {
      id: 'inactive',
      title: 'Inactive Employees',
      value: kpis.inactive,
      subtitle: 'Terminated, suspended or resigned',
      accent: 'coral' as const,
      icon: 'userX' as BezentIconName,
      tooltip: 'Separated employees (terminated, suspended, or resigned) preserved for compliance.',
      chartType: 'subtle-line' as const,
      trendResult: trends.inactive,
      statusTab: 'inactive',
    },
  ];

  return (
    <Grid columns={4} gap="md" role="region" aria-label="Workforce key metrics">
      {cards.map((c) => (
        <SingleKpiCard
          key={c.id}
          id={c.id}
          title={c.title}
          value={c.value}
          subtitle={c.subtitle}
          accent={c.accent}
          icon={c.icon}
          tooltip={c.tooltip}
          chartType={c.chartType}
          trendResult={c.trendResult}
          loading={Boolean(kpis.loading)}
          isActive={activeStatusTab === c.statusTab}
          onClick={onSelectStatusTab ? () => onSelectStatusTab(c.statusTab) : undefined}
        />
      ))}
    </Grid>
  );
}
