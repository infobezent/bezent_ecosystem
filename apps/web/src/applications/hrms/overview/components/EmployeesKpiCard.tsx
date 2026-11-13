import React, { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export type WorkforceStatusId = 'active' | 'probation' | 'pending' | 'separated' | 'center' | 'total';

export interface WorkforceStatusSegment {
  id: WorkforceStatusId;
  label: string;
  count: number;
  cssModifier: string;
  queryStatus?: string;
  hoverIcon: string;
}

export interface EmployeesKpiCardProps {
  /** Total employee workforce count */
  total?: number;
  /** Active employees count */
  active?: number;
  /** Probation employees count */
  probation?: number;
  /** Pending activation employees count */
  pending?: number;
  /** Separated / resigned / terminated employees count */
  separated?: number;
  /** Loading state indicator */
  loading?: boolean;
  /** Custom default center icon when unhovered (defaults to 'employees') */
  defaultIcon?: string;
  /** Controlled or initial hovered segment for verification (optional) */
  hoveredSegmentId?: WorkforceStatusId | null;
  /** Stroke thickness of the circular ring (defaults to 7.2) */
  strokeWidth?: number;
  /** Card click handler */
  onClick?: () => void;
  /** Segment click handler (optional status filter) */
  onSegmentClick?: (segmentId: WorkforceStatusId, queryStatus?: string) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const diff = endAngle - startAngle;
  const largeArcFlag = diff > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const EmployeesKpiCard: React.FC<EmployeesKpiCardProps> = ({
  total,
  active,
  probation,
  pending,
  separated,
  loading = false,
  defaultIcon = 'employees',
  hoveredSegmentId,
  strokeWidth: customStrokeWidth,
  onClick,
  onSegmentClick,
}) => {
  const [internalHoveredId, setInternalHoveredId] = useState<WorkforceStatusId | null>(null);
  const hoveredId = hoveredSegmentId !== undefined ? hoveredSegmentId : internalHoveredId;
  const setHoveredId = (id: WorkforceStatusId | null) => setInternalHoveredId(id);

  // Derive counts cleanly from props without injecting hardcoded mock fallback data
  const safeActive = active ?? 0;
  const safeProbation = probation ?? 0;
  const safePending = pending ?? 0;
  const safeSeparated = separated ?? 0;
  const categorySum = safeActive + safeProbation + safePending + safeSeparated;
  const effectiveTotal = total !== undefined ? total : categorySum;

  const segments: WorkforceStatusSegment[] = [
    {
      id: 'active',
      label: 'Active Employees',
      count: safeActive,
      cssModifier: 'active',
      queryStatus: 'active',
      hoverIcon: 'user-round-check',
    },
    {
      id: 'probation',
      label: 'Probation',
      count: safeProbation,
      cssModifier: 'probation',
      queryStatus: 'probation',
      hoverIcon: 'user-round-clock',
    },
    {
      id: 'pending',
      label: 'Pending Activation',
      count: safePending,
      cssModifier: 'pending',
      queryStatus: 'pending_activation',
      hoverIcon: 'user-round-plus',
    },
    {
      id: 'separated',
      label: 'Separated',
      count: safeSeparated,
      cssModifier: 'separated',
      queryStatus: 'resigned',
      hoverIcon: 'user-round-minus',
    },
  ];

  // Ring geometry: center at (39, 39), radius 32 in a 78x78 viewBox (rich, prominent 7.2px stroke)
  const cx = 39;
  const cy = 39;
  const radius = 32;
  const strokeWidth = customStrokeWidth ?? 7.2;
  const gap = 6; // 6 degree angular gap between segments
  const minAngle = 8; // Minimum visual arc for non-zero segments to allow hover

  const nonZeroSegments = segments.filter((s) => s.count > 0);
  const sumCounts = nonZeroSegments.reduce((sum, s) => sum + s.count, 0);
  const singleSegment = nonZeroSegments.length === 1 ? nonZeroSegments[0] : undefined;

  const k = nonZeroSegments.length;
  const totalGaps = k > 1 ? k * gap : 0;
  const availableAngle = 360 - totalGaps;
  const totalMinimums = k * minAngle;
  const remainingAngle = Math.max(0, availableAngle - totalMinimums);

  let currentAngle = 0;
  const computedArcs = segments.map((seg) => {
    if (seg.count <= 0 || sumCounts <= 0) {
      return { ...seg, pathD: '', isVisible: false };
    }
    const propSpan = (seg.count / sumCounts) * remainingAngle;
    const span = minAngle + propSpan;
    const startAngle = currentAngle + (k > 1 ? gap / 2 : 0);
    const endAngle = startAngle + span;
    currentAngle = endAngle + (k > 1 ? gap / 2 : 0);

    return {
      ...seg,
      pathD: describeArc(cx, cy, radius, startAngle, endAngle),
      isVisible: true,
    };
  });

  const hoveredSegment = segments.find((s) => s.id === hoveredId);
  const isCenterHovered = hoveredId === 'center' || hoveredId === 'total';
  const hasHover = hoveredSegment !== undefined || isCenterHovered;
  const activeIcon = hoveredSegment ? hoveredSegment.hoverIcon : defaultIcon;
  const iconModifierClass = hoveredSegment
    ? `bezent-kpi-ring-icon-wrapper--${hoveredSegment.cssModifier}`
    : isCenterHovered
      ? 'bezent-kpi-ring-icon-wrapper--active bezent-kpi-ring-active'
      : 'bezent-kpi-ring-icon-wrapper--default bezent-kpi-ring-default';

  // Dynamic card color modifier: matches hovered segment color, defaults to green (100% active)
  const dynamicColorModifier = hoveredSegment
    ? `bezent-exec-kpi-card--dynamic-${hoveredSegment.id}`
    : 'bezent-exec-kpi-card--green';

  let tooltipText = '';
  if (hoveredSegment) {
    const pct = effectiveTotal > 0 ? Math.round((hoveredSegment.count / effectiveTotal) * 100) : 0;
    tooltipText = `${hoveredSegment.label}: ${hoveredSegment.count.toLocaleString()} (${pct}%)`;
  } else if (isCenterHovered) {
    tooltipText = `Workforce: ${effectiveTotal.toLocaleString()} Total (${safeActive} Active · ${safeProbation} Probation)`;
  }

  return (
    <div
      className={`bezent-exec-kpi-card bezent-exec-kpi-card--employees ${dynamicColorModifier}`}
      onClick={onClick}
      role="region"
      aria-label="Total Employees"
      title="Total Employees"
    >
      <div className="bezent-kpi-employees-layout">
        {/* Left Section: Small Heading at Top, Large Primary Number Below */}
        <div className="bezent-kpi-employees-left">
          <div className="bezent-kpi-employees-heading">Employees</div>
          <div className="bezent-kpi-employees-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              effectiveTotal.toLocaleString()
            )}
          </div>
        </div>

        {/* Right Section: Compact Circular Segmented Ring Centered on the Right */}
        <div
          className="bezent-kpi-employees-right"
          onMouseLeave={() => setHoveredId(null)}
          onPointerLeave={() => setHoveredId(null)}
          aria-label="Employee status distribution ring"
        >
          <div className="bezent-kpi-ambient-glow bezent-kpi-ambient-glow--emerald" />

          {/* Floating Hover Badge: 100% visible, outside-card clipping resolved */}
          <div
            className={`bezent-kpi-flow-badge bezent-kpi-employees-tooltip ${hasHover ? 'is-visible' : ''}`}
            aria-live="polite"
          >
            {tooltipText}
          </div>

          <svg
            className="bezent-kpi-ring-svg"
            viewBox="0 0 78 78"
            role="img"
            aria-label="Workforce status distribution ring"
          >
            {loading ? (
              /* Active emerald ring with breathing pulse during loading — consistent with Cards 2-6 */
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                strokeWidth={strokeWidth}
                className="bezent-kpi-ring-segment bezent-kpi-ring-segment--active bezent-kpi-ring-segment--loading"
              />
            ) : sumCounts <= 0 ? (
              /* Clean empty track ring when total workforce is 0 */
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                strokeWidth={strokeWidth}
                className="bezent-kpi-ring-empty-track"
              />
            ) : singleSegment ? (
              /* Single category takes 100% of the ring */
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                strokeWidth={strokeWidth}
                className={`bezent-kpi-ring-segment bezent-kpi-ring-segment--${singleSegment.cssModifier} ${
                  hoveredId === singleSegment.id ? 'bezent-kpi-ring-segment--hovered' : ''
                }`}
                onMouseEnter={() => setHoveredId(singleSegment.id)}
                onMouseOver={() => setHoveredId(singleSegment.id)}
                onPointerEnter={() => setHoveredId(singleSegment.id)}
                onPointerOver={() => setHoveredId(singleSegment.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSegmentClick?.(singleSegment.id, singleSegment.queryStatus);
                  onClick?.();
                }}
                tabIndex={0}
                role="button"
                aria-label={`${singleSegment.label}: ${singleSegment.count.toLocaleString()} employees`}
                onFocus={() => setHoveredId(singleSegment.id)}
                onBlur={() => setHoveredId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSegmentClick?.(singleSegment.id, singleSegment.queryStatus);
                    onClick?.();
                  }
                }}
              />
            ) : (
              /* Multi-segment proportional circular ring */
              computedArcs.map((arc) => {
                if (!arc.isVisible) return null;
                const isHovered = hoveredId === arc.id;

                return (
                  <path
                    key={arc.id}
                    d={arc.pathD}
                    strokeWidth={strokeWidth}
                    className={`bezent-kpi-ring-segment bezent-kpi-ring-segment--${arc.cssModifier} ${
                      isHovered ? 'bezent-kpi-ring-segment--hovered' : ''
                    } ${hasHover && !isHovered ? 'bezent-kpi-ring-segment--dimmed' : ''}`}
                    onMouseEnter={() => setHoveredId(arc.id)}
                    onMouseOver={() => setHoveredId(arc.id)}
                    onPointerEnter={() => setHoveredId(arc.id)}
                    onPointerOver={() => setHoveredId(arc.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSegmentClick?.(arc.id, arc.queryStatus);
                      onClick?.();
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${arc.label}: ${arc.count.toLocaleString()} employees`}
                    onFocus={() => setHoveredId(arc.id)}
                    onBlur={() => setHoveredId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onSegmentClick?.(arc.id, arc.queryStatus);
                        onClick?.();
                      }
                    }}
                  />
                );
              })
            )}
          </svg>

          {/* Ring Center: Dynamic Employee Icon with Crossfade */}
          <div
            className={`bezent-kpi-ring-center ${isCenterHovered ? 'is-hovered' : ''}`}
            aria-live="polite"
            onMouseEnter={() => setHoveredId('center')}
            onMouseOver={() => setHoveredId('center')}
            onPointerEnter={() => setHoveredId('center')}
            onFocus={() => setHoveredId('center')}
            onBlur={() => setHoveredId(null)}
            tabIndex={0}
            role="button"
            aria-label={`Workforce: ${effectiveTotal.toLocaleString()} total`}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onClick?.();
              }
            }}
          >
            <div
              key={hoveredId ?? 'default'}
              className={`bezent-kpi-ring-icon-wrapper ${iconModifierClass}`}
            >
              <BezentIcon name={activeIcon} size={16} color="currentColor" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Pill: Full card width, single line with zero-CLS skeleton */}
      <div
        className={`bezent-kpi-sub-pill bezent-kpi-sub-pill--active ${
          loading ? 'bezent-kpi-sub-pill--loading' : ''
        }`}
      >
        {loading ? (
          <span className="bezent-kpi-pill-skeleton" />
        ) : (
          <>
            <span className="bezent-kpi-sub-pill-dot" />
            100% Active
          </>
        )}
      </div>
    </div>
  );
};
