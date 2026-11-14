import React, { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export type ExitStageStatus = 'completed' | 'in_progress' | 'active' | 'pending';

export interface ExitProcessStageItem {
  id: string;
  name: string;
  status: ExitStageStatus;
  count: number;
}

export interface OffboardingKpiCardProps {
  /** Total employees currently in offboarding */
  total?: number;
  /** Pending exit clearance count */
  pendingClearance?: number;
  /** Four-stage exit process breakdown */
  stages?: ExitProcessStageItem[];
  /** Loading state indicator */
  loading?: boolean;
  /** Controlled hovered target for verification/testing ('notice_period' | 'handover' | 'clearance' | 'final_settlement' | 'arrow' | 'center' etc.) */
  hoveredNode?: string | null;
  /** Card click handler */
  onClick?: () => void;
  /** Stage segment click handler */
  onStageClick?: (stage: ExitProcessStageItem) => void;
}

/** Fallback enterprise exit process distribution per approved BEZENT design specification */
export const DEFAULT_EXIT_STAGES: ExitProcessStageItem[] = [
  { id: 'notice_period', name: 'Notice Period', status: 'active', count: 5 },
  { id: 'handover', name: 'Handover', status: 'completed', count: 4 },
  { id: 'clearance', name: 'Clearance', status: 'in_progress', count: 3 },
  { id: 'final_settlement', name: 'Final Settlement', status: 'pending', count: 3 },
];

const DEFAULT_PENDING_CLEARANCE = 3;

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: Number((centerX + radius * Math.cos(angleInRadians)).toFixed(2)),
    y: Number((centerY + radius * Math.sin(angleInRadians)).toFixed(2)),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${arcSweep} 1 ${end.x} ${end.y}`;
}

/**
 * Premium Enterprise Offboarding KPI Card
 *
 * Minimal Heading + Big Number + Circular Departure Ring with Integrated Curved Arrow.
 * - Left: "Offboarding" heading + large total count
 * - Right: Circular Departure Ring with integrated curved arrowhead on the circumference
 * - Center Hub: Dynamic Icon crossfading between UserRoundMinus, UserRoundClock, Sync, Tasks, and LogOut
 * - Floating Hover Badge: Displays exact stage, count, status & pending clearance
 * - Zero application CSS, 100% design-system compliant
 */
export const OffboardingKpiCard: React.FC<OffboardingKpiCardProps> = ({
  total,
  pendingClearance,
  stages = DEFAULT_EXIT_STAGES,
  loading = false,
  hoveredNode,
  onClick,
  onStageClick,
}) => {
  const [internalHovered, setInternalHovered] = useState<string | null>(null);
  const activeHovered = hoveredNode !== undefined ? hoveredNode : internalHovered;

  // `stages` is only defaulted when the caller omits the prop entirely; an
  // explicitly-passed empty array means "zero real stages" and must render as such.
  const effectiveStages = stages ?? DEFAULT_EXIT_STAGES;

  const effectiveTotal =
    total !== undefined ? total : effectiveStages.reduce((sum, s) => sum + (s.count || 0), 0);

  const effectivePendingClearance =
    pendingClearance !== undefined ? pendingClearance : DEFAULT_PENDING_CLEARANCE;

  // Proportional arc distribution across a 285° span with 5° gaps (viewBox="0 0 60 60", R=21)
  // Opening is at top-right between 295° and 345°
  const totalArcSpan = 285;
  const gap = 5;
  const numStages = effectiveStages.length || 4;
  const totalGaps = (numStages - 1) * gap;
  const availableSpan = Math.max(60, totalArcSpan - totalGaps);

  let currentAngle = 345;
  const arcs = effectiveStages.map((stage) => {
    const fraction = effectiveTotal > 0 ? stage.count / effectiveTotal : 1 / numStages;
    const sweep = Math.max(16, fraction * availableSpan);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle + gap;

    const pathD = describeArc(30, 30, 21, startAngle, endAngle);
    const isHovered =
      activeHovered === stage.id ||
      activeHovered === stage.status ||
      activeHovered === `step-${stage.id}`;

    return {
      ...stage,
      pathD,
      isHovered,
    };
  });

  const isArrowHovered = activeHovered === 'arrow' || activeHovered === 'exit';
  const isCenterHovered = activeHovered === 'center' || activeHovered === 'total';
  const hasHover = activeHovered !== null && activeHovered !== undefined;
  const hoveredArc = arcs.find((a) => a.isHovered);

  const formatStatus = (s: ExitStageStatus) => {
    switch (s) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      default:
        return s;
    }
  };

  let tooltipText = '';
  let activeIcon: 'userRoundMinus' | 'userRoundClock' | 'sync' | 'tasks' | 'check' | 'logOut' =
    'userRoundMinus';
  let iconModifierClass = 'bezent-kpi-departure-icon--default';

  if (hoveredArc) {
    tooltipText = `${hoveredArc.name}: ${formatStatus(hoveredArc.status)}, ${hoveredArc.count} employees`;
    if (hoveredArc.id === 'notice_period') {
      activeIcon = 'userRoundClock';
      iconModifierClass = 'bezent-kpi-departure-icon--notice';
    } else if (hoveredArc.id === 'handover') {
      activeIcon = 'sync';
      iconModifierClass = 'bezent-kpi-departure-icon--handover';
    } else if (hoveredArc.id === 'clearance') {
      activeIcon = 'tasks';
      iconModifierClass = 'bezent-kpi-departure-icon--clearance';
    } else {
      activeIcon = 'check';
      iconModifierClass = 'bezent-kpi-departure-icon--settlement';
    }
  } else if (isArrowHovered) {
    tooltipText = `Pending Exit Clearance: ${effectivePendingClearance} (${effectiveTotal} total)`;
    activeIcon = 'logOut';
    iconModifierClass = 'bezent-kpi-departure-icon--arrow';
  } else if (isCenterHovered) {
    tooltipText = `Offboarding: ${effectiveTotal} total (${effectivePendingClearance} pending clearance)`;
    activeIcon = 'userRoundMinus';
    iconModifierClass = 'bezent-kpi-departure-icon--center';
  }

  let dynamicColorModifier = 'bezent-exec-kpi-card--red';
  if (hoveredArc) {
    if (hoveredArc.id === 'notice_period') {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-probation';
    } else if (hoveredArc.id === 'handover') {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-pending';
    } else if (hoveredArc.id === 'clearance') {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-probation';
    } else {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-separated';
    }
  } else if (isArrowHovered) {
    dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-separated';
  }

  return (
    <div
      className={`bezent-exec-kpi-card bezent-exec-kpi-card--offboarding ${dynamicColorModifier}`}
      onClick={onClick}
      role="region"
      aria-label="Employees in Offboarding"
      title="Employees in Offboarding"
    >
      <div className="bezent-kpi-offboarding-layout">
        {/* Left Section: Small Heading at Top, Large Primary Number Below */}
        <div className="bezent-kpi-offboarding-left">
          <div className="bezent-kpi-offboarding-heading">Offboarding</div>
          <div className="bezent-kpi-offboarding-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              effectiveTotal.toLocaleString()
            )}
          </div>
        </div>

        {/* Right Section: Circular Departure Ring (60px × 60px) */}
        <div
          className="bezent-kpi-offboarding-right"
          onMouseLeave={() => setInternalHovered(null)}
          onPointerLeave={() => setInternalHovered(null)}
          aria-label="Circular departure ring with exit vector"
        >
          <div className="bezent-kpi-ambient-glow bezent-kpi-ambient-glow--red" />
          {/* Floating Hover Badge: 100% unclipped, outside-card visibility */}
          <div
            className={`bezent-kpi-flow-badge bezent-kpi-offboarding-tooltip ${hasHover ? 'is-visible' : ''}`}
            aria-live="polite"
          >
            {tooltipText}
          </div>

          {/* SVG Circular Departure Ring (4 Proportional Arcs + Integrated Curved Arrowhead) */}
          <svg
            className="bezent-kpi-offboarding-svg bezent-kpi-departure-svg"
            viewBox="0 0 60 60"
            role="img"
            aria-label={`Offboarding stages: ${arcs.map((a) => `${a.name}: ${a.count}`).join(', ')}`}
          >
            {/* 4 Stage Proportional Arcs */}
            {arcs.map((arc) => (
              <g
                key={arc.id}
                className={`bezent-kpi-departure-group bezent-kpi-offboarding-node--${arc.id} bezent-kpi-offboarding-segment--${arc.status} ${
                  arc.isHovered ? 'is-hovered' : ''
                } ${hasHover && !arc.isHovered ? 'is-dimmed' : ''}`}
                onMouseEnter={() => setInternalHovered(arc.id)}
                onMouseOver={() => setInternalHovered(arc.id)}
                onPointerEnter={() => setInternalHovered(arc.id)}
                onFocus={() => setInternalHovered(arc.id)}
                onBlur={() => setInternalHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onStageClick?.(arc);
                  onClick?.();
                }}
                tabIndex={0}
                role="button"
                aria-label={`${arc.name}: ${formatStatus(arc.status)}, ${arc.count} employees`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onStageClick?.(arc);
                    onClick?.();
                  }
                }}
              >
                {/* Wide invisible hit area so hover triggers effortlessly */}
                <path d={arc.pathD} strokeWidth={14} stroke="transparent" fill="none" />

                {/* Visible sleek curved arc */}
                <path
                  d={arc.pathD}
                  strokeWidth={4.8}
                  strokeLinecap="round"
                  className={`bezent-kpi-departure-arc bezent-kpi-departure-arc--${arc.id} bezent-kpi-departure-arc--${arc.status}`}
                />
              </g>
            ))}

            {/* Top Horizontal Exit Arrow → (Stem + Arrowhead pointing right at 12 o'clock apex) */}
            <g
              className={`bezent-kpi-departure-arrow-group bezent-kpi-offboarding-arrow-group ${
                isArrowHovered ? 'is-hovered' : ''
              } ${hasHover && !isArrowHovered ? 'is-dimmed' : ''}`}
              onMouseEnter={() => setInternalHovered('arrow')}
              onMouseOver={() => setInternalHovered('arrow')}
              onPointerEnter={() => setInternalHovered('arrow')}
              onFocus={() => setInternalHovered('arrow')}
              onBlur={() => setInternalHovered(null)}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              tabIndex={0}
              role="button"
              aria-label={`Pending Exit Clearance: ${effectivePendingClearance}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick?.();
                }
              }}
            >
              {/* Wide invisible hit area */}
              <circle cx={44} cy={9} r={12} fill="transparent" />

              {/* Horizontal departure stem shooting straight right along the top tangent */}
              <line
                x1={31}
                y1={9}
                x2={47}
                y2={9}
                strokeWidth={4.8}
                strokeLinecap="round"
                className="bezent-kpi-departure-arrow-stem bezent-kpi-offboarding-arrow-stem"
              />

              {/* Sleek, solid horizontal arrowhead pointing right */}
              <polygon
                points="53.5,9 46.5,5.2 46.5,12.8"
                className="bezent-kpi-departure-arrowhead bezent-kpi-offboarding-arrowhead"
              />
            </g>
          </svg>

          {/* Dynamic Center Icon Hub */}
          <div
            className={`bezent-kpi-departure-center ${isCenterHovered ? 'is-hovered' : ''}`}
            aria-live="polite"
            onMouseEnter={() => setInternalHovered('center')}
            onPointerEnter={() => setInternalHovered('center')}
            onFocus={() => setInternalHovered('center')}
            onBlur={() => setInternalHovered(null)}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <div
              key={activeHovered ?? 'default'}
              className={`bezent-kpi-departure-icon-wrapper ${iconModifierClass}`}
            >
              <BezentIcon name={activeIcon} size={15} color="currentColor" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Pill: Full card width, single line with zero-CLS skeleton */}
      <div
        className={`bezent-kpi-sub-pill bezent-kpi-sub-pill--offboarding ${
          loading ? 'bezent-kpi-sub-pill--loading' : ''
        }`}
      >
        {loading ? (
          <span className="bezent-kpi-pill-skeleton" />
        ) : (
          <>
            <span className="bezent-kpi-sub-pill-dot" />
            Outflow
          </>
        )}
      </div>
    </div>
  );
};
