import React, { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export type WorkforceStatusId = 'active' | 'probation' | 'pending' | 'separated';

export interface WorkforceStatusSegment {
  id: WorkforceStatusId;
  label: string;
  count: number;
  cssModifier: string;
  queryStatus?: string;
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
  /** Card click handler */
  onClick?: () => void;
  /** Segment click handler (optional status filter) */
  onSegmentClick?: (segmentId: WorkforceStatusId, queryStatus?: string) => void;
}

/** Fallback enterprise distribution per BEZENT design specification */
const DEFAULT_DISTRIBUTION = {
  total: 1248,
  active: 1186,
  probation: 32,
  pending: 12,
  separated: 18,
};

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
  onClick,
  onSegmentClick,
}) => {
  const [hoveredId, setHoveredId] = useState<WorkforceStatusId | null>(null);

  // Resolve counts (using project backend data if available, otherwise approved specification values)
  const effectiveTotal = total ?? DEFAULT_DISTRIBUTION.total;
  const effectiveActive = active ?? DEFAULT_DISTRIBUTION.active;
  const effectiveProbation = probation ?? DEFAULT_DISTRIBUTION.probation;
  const effectivePending = pending ?? DEFAULT_DISTRIBUTION.pending;
  const effectiveSeparated = separated ?? DEFAULT_DISTRIBUTION.separated;

  const segments: WorkforceStatusSegment[] = [
    {
      id: 'active',
      label: 'Active Employees',
      count: effectiveActive,
      cssModifier: 'active',
      queryStatus: 'active',
    },
    {
      id: 'probation',
      label: 'Probation',
      count: effectiveProbation,
      cssModifier: 'probation',
      queryStatus: 'probation',
    },
    {
      id: 'pending',
      label: 'Pending Activation',
      count: effectivePending,
      cssModifier: 'pending',
      queryStatus: 'pending_activation',
    },
    {
      id: 'separated',
      label: 'Separated',
      count: effectiveSeparated,
      cssModifier: 'separated',
      queryStatus: 'resigned',
    },
  ];

  // Ring geometry: center at (39, 39), radius 32 in a 78x78 viewBox
  const cx = 39;
  const cy = 39;
  const radius = 32;
  const gap = 6; // 6 degree angular gap between segments
  const minAngle = 16; // Minimum visual arc for non-zero segments

  const nonZeroSegments = segments.filter((s) => s.count > 0);
  const totalGaps = nonZeroSegments.length * gap;
  const availableAngle = 360 - totalGaps;
  const totalMinimums = nonZeroSegments.length * minAngle;
  const remainingAngle = Math.max(0, availableAngle - totalMinimums);
  const sumCounts = nonZeroSegments.reduce((sum, s) => sum + s.count, 0) || 1;

  let currentAngle = 0;
  const computedArcs = segments.map((seg) => {
    if (seg.count <= 0) {
      return { ...seg, pathD: '', isVisible: false };
    }
    const propSpan = (seg.count / sumCounts) * remainingAngle;
    const span = minAngle + propSpan;
    const startAngle = currentAngle + gap / 2;
    const endAngle = startAngle + span;
    currentAngle = endAngle + gap / 2;

    return {
      ...seg,
      pathD: describeArc(cx, cy, radius, startAngle, endAngle),
      isVisible: true,
    };
  });

  const hoveredSegment = segments.find((s) => s.id === hoveredId);
  const hasHover = hoveredId !== null;

  return (
    <div
      className="bezent-exec-kpi-card bezent-exec-kpi-card--employees"
      onClick={onClick}
      role="region"
      aria-label="Employees KPI Summary"
      title="Complete registered workforce status distribution"
    >
      <div className="bezent-kpi-employees-layout">
        {/* Left Section */}
        <div className="bezent-kpi-employees-left">
          <div className="bezent-kpi-employees-heading">Employees</div>
          <div className="bezent-kpi-employees-value">
            {loading ? '—' : effectiveTotal.toLocaleString()}
          </div>
          <div className="bezent-kpi-employees-label">Total Employees</div>
        </div>

        {/* Right Section: Circular Workforce Status Ring */}
        <div
          className="bezent-kpi-employees-right"
          onMouseLeave={() => setHoveredId(null)}
          onPointerLeave={() => setHoveredId(null)}
          aria-label="Employee status distribution ring"
        >
          <svg
            className="bezent-kpi-ring-svg"
            viewBox="0 0 78 78"
            role="img"
            aria-label="Workforce status distribution ring"
          >
            {computedArcs.map((arc) => {
              if (!arc.isVisible) return null;
              const isHovered = hoveredId === arc.id;
              const strokeWidth = isHovered ? 8.5 : 6.5;

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
                  onMouseMove={() => setHoveredId(arc.id)}
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
            })}
          </svg>

          {/* Ring Center: Default Person Icon or Smooth Hover Details */}
          <div className="bezent-kpi-ring-center" aria-live="polite">
            {hoveredSegment ? (
              <div className="bezent-kpi-ring-info" key={hoveredSegment.id}>
                <span
                  className={`bezent-kpi-ring-count bezent-kpi-ring-count--${hoveredSegment.cssModifier}`}
                >
                  {hoveredSegment.count.toLocaleString()}
                </span>
                <span className="bezent-kpi-ring-status">{hoveredSegment.label}</span>
              </div>
            ) : (
              <div className="bezent-kpi-ring-default">
                <BezentIcon name="employees" size={19} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
