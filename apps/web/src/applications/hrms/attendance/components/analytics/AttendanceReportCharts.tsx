import type { JSX } from 'react';
import type {
  ChartDataGroup,
  StatusDistributionSlice,
  ReportKpiItem,
} from '../../types/attendanceReports.types';
import { Card, Stack, Inline, Badge, Grid, Button } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';

// ════════════════════════════════════════════════════════════════════════
// 1. KPI SUMMARY GRID
// ════════════════════════════════════════════════════════════════════════

export interface KpiSummaryGridProps {
  kpis: ReportKpiItem[];
}

export function KpiSummaryGrid({ kpis }: KpiSummaryGridProps) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <Grid columns="auto-fit" minColWidth="sm" gap="md">
      {kpis.map((kpi) => (
        <Card key={kpi.id} padding="md" variant="default">
          <Stack gap="xs">
            <span className="bezent-card__desc">{kpi.label}</span>
            <Inline justify="between" align="center">
              <h2 className="bezent-card__title">{kpi.value}</h2>
              {kpi.variant ? <Badge variant={kpi.variant}>{kpi.subtext || 'Metric'}</Badge> : null}
            </Inline>
            {kpi.subtext && !kpi.variant ? (
              <span className="bezent-card__desc">{kpi.subtext}</span>
            ) : null}
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 2. DONUT CHART COMPONENT
// ════════════════════════════════════════════════════════════════════════

export interface DonutChartProps {
  data: ChartDataGroup;
  onSliceClick?: (slice: StatusDistributionSlice) => void;
}

export function DonutChart({ data, onSliceClick }: DonutChartProps) {
  const slices = data.slices || [];
  const total = slices.reduce((acc, s) => acc + s.value, 0);

  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <Card padding="lg" variant="default">
      <Stack gap="md">
        <Inline justify="between" align="center">
          <h3 className="bezent-card__title">{data.title}</h3>
          <Badge variant="neutral">Total: {total}</Badge>
        </Inline>

        {slices.length === 0 || total === 0 ? (
          <div className="bezent-card__desc">No distribution data available</div>
        ) : (
          <Inline gap="xl" align="center" justify="between">
            {/* SVG Donut */}
            <svg width={180} height={180} viewBox="0 0 180 180" aria-label={data.title} role="img">
              <circle
                cx={90}
                cy={90}
                r={radius}
                fill="transparent"
                stroke="var(--border-subtle)"
                strokeWidth={strokeWidth}
              />
              {slices.map((slice, idx) => {
                const percent = slice.value / total;
                const strokeDasharray = `${percent * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;

                return (
                  <circle
                    key={idx}
                    cx={90}
                    cy={90}
                    r={radius}
                    fill="transparent"
                    stroke={slice.colorToken}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 90 90)"
                    onClick={() => onSliceClick?.(slice)}
                    cursor={onSliceClick ? 'pointer' : 'default'}
                  />
                );
              })}
              {/* Center Total Text */}
              <text
                x="50%"
                y="48%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="22"
                fontWeight="700"
              >
                {total}
              </text>
              <text
                x="50%"
                y="62%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="11"
              >
                Total
              </text>
            </svg>

            {/* Interactive Legend */}
            <Stack gap="xs">
              {slices.map((slice, idx) => {
                const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
                return (
                  <Inline
                    key={idx}
                    justify="between"
                    align="center"
                    gap="md"
                    role={onSliceClick ? 'button' : undefined}
                    tabIndex={onSliceClick ? 0 : undefined}
                    onClick={() => onSliceClick?.(slice)}
                  >
                    <Inline gap="xs" align="center">
                      <svg width={10} height={10}>
                        <rect width={10} height={10} rx={2} fill={slice.colorToken} />
                      </svg>
                      <span className="bezent-card__desc">{slice.label}</span>
                    </Inline>
                    <Inline gap="xs" align="center">
                      <strong>{slice.value}</strong>
                      <Badge variant="neutral">{pct}%</Badge>
                    </Inline>
                  </Inline>
                );
              })}
            </Stack>
          </Inline>
        )}
      </Stack>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 3. BAR CHART & GROUPED BAR CHART
// ════════════════════════════════════════════════════════════════════════

export interface BarChartProps {
  data: ChartDataGroup;
  onBarClick?: (category: string, value: number, seriesName?: string) => void;
}

export function BarChart({ data, onBarClick }: BarChartProps) {
  const categories = data.categories || [];
  const seriesList = data.series || [];

  if (categories.length === 0 || seriesList.length === 0) {
    return (
      <Card padding="lg" variant="default">
        <Stack gap="sm">
          <h3 className="bezent-card__title">{data.title}</h3>
          <span className="bezent-card__desc">No data available for comparison</span>
        </Stack>
      </Card>
    );
  }

  // Find max value
  let maxVal = 0;
  for (const s of seriesList) {
    for (const v of s.values || []) {
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 1;

  const svgHeight = 180;
  const svgWidth = 480;
  const paddingLeft = 50;
  const paddingBottom = 30;
  const chartHeight = svgHeight - paddingBottom - 10;
  const chartWidth = svgWidth - paddingLeft - 20;

  const numCategories = categories.length;
  const categoryWidth = chartWidth / numCategories;
  const numSeries = seriesList.length;
  const barWidth = Math.max(8, Math.min(24, (categoryWidth * 0.7) / numSeries));

  return (
    <Card padding="lg" variant="default">
      <Stack gap="md">
        <Inline justify="between" align="center">
          <h3 className="bezent-card__title">{data.title}</h3>
          {seriesList.length > 1 && (
            <Inline gap="md">
              {seriesList.map((s, idx) => (
                <Inline key={idx} gap="xs" align="center">
                  <svg width={10} height={10}>
                    <rect width={10} height={10} rx={2} fill={s.colorToken} />
                  </svg>
                  <span className="bezent-card__desc">{s.name}</span>
                </Inline>
              ))}
            </Inline>
          )}
        </Inline>

        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          aria-label={data.title}
          role="img"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = 10 + chartHeight * (1 - pct);
            const valLabel = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - 20}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="9"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Categories and Bars */}
          {categories.map((cat, cIdx) => {
            const catX = paddingLeft + cIdx * categoryWidth;
            const clusterWidth = numSeries * barWidth;
            const startX = catX + (categoryWidth - clusterWidth) / 2;

            return (
              <g key={cIdx}>
                {seriesList.map((s, sIdx) => {
                  const val = s.values?.[cIdx] ?? 0;
                  const barH = (val / maxVal) * chartHeight;
                  const barX = startX + sIdx * barWidth;
                  const barY = 10 + chartHeight - barH;

                  return (
                    <rect
                      key={sIdx}
                      x={barX}
                      y={barY}
                      width={barWidth - 2}
                      height={Math.max(1, barH)}
                      fill={s.colorToken}
                      rx={2}
                      onClick={() => onBarClick?.(cat, val, s.name)}
                      cursor={onBarClick ? 'pointer' : 'default'}
                    >
                      <title>{`${cat} - ${s.name}: ${val}`}</title>
                    </rect>
                  );
                })}

                {/* Category X Label */}
                <text
                  x={catX + categoryWidth / 2}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="9"
                >
                  {cat.length > 10 ? `${cat.slice(0, 8)}..` : cat}
                </text>
              </g>
            );
          })}
        </svg>
      </Stack>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 4. STACKED BAR CHART COMPONENT
// ════════════════════════════════════════════════════════════════════════

export interface StackedBarChartProps {
  data: ChartDataGroup;
  onSegmentClick?: (category: string, seriesName: string, value: number) => void;
}

export function StackedBarChart({ data, onSegmentClick }: StackedBarChartProps) {
  const categories = data.categories || [];
  const seriesList = data.series || [];

  if (categories.length === 0 || seriesList.length === 0) {
    return (
      <Card padding="lg" variant="default">
        <Stack gap="sm">
          <h3 className="bezent-card__title">{data.title}</h3>
          <span className="bezent-card__desc">No stacked composition data available</span>
        </Stack>
      </Card>
    );
  }

  // Calculate total for each category
  const categoryTotals: number[] = categories.map((_, cIdx) => {
    return seriesList.reduce((sum, s) => sum + (s.values?.[cIdx] ?? 0), 0);
  });

  const maxTotal = Math.max(1, ...categoryTotals);

  const svgHeight = 180;
  const svgWidth = 480;
  const paddingLeft = 50;
  const paddingBottom = 30;
  const chartHeight = svgHeight - paddingBottom - 10;
  const chartWidth = svgWidth - paddingLeft - 20;

  const numCategories = categories.length;
  const categoryWidth = chartWidth / numCategories;
  const barWidth = Math.max(12, Math.min(32, categoryWidth * 0.6));

  return (
    <Card padding="lg" variant="default">
      <Stack gap="md">
        <Inline justify="between" align="center">
          <h3 className="bezent-card__title">{data.title}</h3>
          <Inline gap="md">
            {seriesList.map((s, idx) => (
              <Inline key={idx} gap="xs" align="center">
                <svg width={10} height={10}>
                  <rect width={10} height={10} rx={2} fill={s.colorToken} />
                </svg>
                <span className="bezent-card__desc">{s.name}</span>
              </Inline>
            ))}
          </Inline>
        </Inline>

        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          aria-label={data.title}
          role="img"
        >
          {/* Grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = 10 + chartHeight * (1 - pct);
            const valLabel = Math.round(maxTotal * pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - 20}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="9"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Stacked Bars */}
          {categories.map((cat, cIdx) => {
            const barX = paddingLeft + cIdx * categoryWidth + (categoryWidth - barWidth) / 2;
            let currentBottom = 10 + chartHeight;

            return (
              <g key={cIdx}>
                {seriesList.map((s, sIdx) => {
                  const val = s.values?.[cIdx] ?? 0;
                  const segHeight = (val / maxTotal) * chartHeight;
                  const segY = currentBottom - segHeight;
                  currentBottom = segY;

                  return (
                    <rect
                      key={sIdx}
                      x={barX}
                      y={segY}
                      width={barWidth}
                      height={Math.max(0, segHeight)}
                      fill={s.colorToken}
                      onClick={() => onSegmentClick?.(cat, s.name, val)}
                      cursor={onSegmentClick ? 'pointer' : 'default'}
                    >
                      <title>{`${cat} - ${s.name}: ${val}`}</title>
                    </rect>
                  );
                })}

                <text
                  x={barX + barWidth / 2}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize="9"
                >
                  {cat.length > 10 ? `${cat.slice(0, 8)}..` : cat}
                </text>
              </g>
            );
          })}
        </svg>
      </Stack>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 5. LINE CHART COMPONENT
// ════════════════════════════════════════════════════════════════════════

export interface LineChartProps {
  data: ChartDataGroup;
  onPointClick?: (point: { label: string; value: number }, seriesName: string) => void;
}

export function LineChart({ data, onPointClick }: LineChartProps) {
  const seriesList = data.series || [];
  const primarySeries = seriesList[0];
  const points = primarySeries?.points || [];

  if (points.length === 0) {
    return (
      <Card padding="lg" variant="default">
        <Stack gap="sm">
          <h3 className="bezent-card__title">{data.title}</h3>
          <span className="bezent-card__desc">No trend points available for this period</span>
        </Stack>
      </Card>
    );
  }

  // Calculate min and max
  let maxVal = Math.max(...points.map((p) => p.value));
  let minVal = Math.min(...points.map((p) => p.value));
  if (maxVal === minVal) {
    maxVal += 10;
    minVal = Math.max(0, minVal - 10);
  }
  const valRange = maxVal - minVal || 1;

  const svgHeight = 180;
  const svgWidth = 480;
  const paddingLeft = 50;
  const paddingBottom = 30;
  const chartHeight = svgHeight - paddingBottom - 10;
  const chartWidth = svgWidth - paddingLeft - 20;

  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth / 2;

  // Build SVG path
  const polyPoints = points.map((p, idx) => {
    const x = paddingLeft + idx * stepX;
    const y = 10 + chartHeight - ((p.value - minVal) / valRange) * chartHeight;
    return `${x},${y}`;
  });
  const pathD = `M ${polyPoints.join(' L ')}`;

  return (
    <Card padding="lg" variant="default">
      <Stack gap="md">
        <Inline justify="between" align="center">
          <h3 className="bezent-card__title">{data.title}</h3>
          <Badge variant="neutral">{primarySeries?.name || 'Trend'}</Badge>
        </Inline>

        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          aria-label={data.title}
          role="img"
        >
          {/* Grid lines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = 10 + chartHeight * (1 - pct);
            const valLabel = Math.round(minVal + valRange * pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - 20}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="9"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={primarySeries?.colorToken || 'var(--accent-primary)'}
            strokeWidth={2.5}
          />

          {/* Data Points */}
          {points.map((p, idx) => {
            const x = paddingLeft + idx * stepX;
            const y = 10 + chartHeight - ((p.value - minVal) / valRange) * chartHeight;

            return (
              <g key={idx}>
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill="var(--bg-surface)"
                  stroke={primarySeries?.colorToken || 'var(--accent-primary)'}
                  strokeWidth={2}
                  onClick={() => onPointClick?.(p, primarySeries?.name || '')}
                  cursor={onPointClick ? 'pointer' : 'default'}
                >
                  <title>{`${p.label}: ${p.value}`}</title>
                </circle>

                {/* X labels (skip every other if too many) */}
                {points.length <= 10 || idx % Math.ceil(points.length / 8) === 0 ? (
                  <text
                    x={x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize="9"
                  >
                    {p.label.length > 5 ? p.label.slice(5) : p.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </Stack>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 6. DRILL-DOWN BANNER COMPONENT
// ════════════════════════════════════════════════════════════════════════

export interface ActiveDrillDownProps {
  dimension: string;
  value: string | number;
  onClear: () => void;
}

export function ActiveDrillDownBanner({
  dimension,
  value,
  onClear,
}: ActiveDrillDownProps): JSX.Element {
  return (
    <Card padding="sm" variant="flat">
      <Inline justify="between" align="center">
        <Inline gap="xs" align="center">
          <BezentIcon name="search" size={14} color="var(--accent-primary)" />
          <span>
            Active Chart Filter: <strong>{dimension}</strong> = <strong>{value}</strong>
          </span>
          <Badge variant="info">Filtered Preview</Badge>
        </Inline>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear Chart Filter
        </Button>
      </Inline>
    </Card>
  );
}
