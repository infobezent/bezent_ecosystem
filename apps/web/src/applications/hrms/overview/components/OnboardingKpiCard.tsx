import React, { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export type OnboardingStageStatus = 'completed' | 'in_progress' | 'pending' | 'active';

export interface OnboardingStageItem {
  id: string;
  name: string;
  status: OnboardingStageStatus;
  count: number;
}

export interface OnboardingActivityBar {
  id: string;
  period: string;
  count: number;
}

export interface OnboardingKpiCardProps {
  /** Total employees currently in onboarding */
  total?: number;
  /** Active onboarding stages (Documents, Verification, Induction, Ready) */
  stages?: OnboardingStageItem[];
  /** Legacy activity bars for backward compatibility */
  bars?: OnboardingActivityBar[];
  /** Loading state indicator */
  loading?: boolean;
  /** Controlled hovered target for verification/testing ('documents' | 'verification' | 'induction' | 'completed' | 'arrow' | 'center' | 'w1' etc.) */
  hoveredNode?: string | null;
  /** Legacy controlled hovered bar id ('w1' | 'documents' etc.) */
  hoveredBarId?: string | null;
  /** Card click handler */
  onClick?: () => void;
  /** Stage segment click handler */
  onStageClick?: (stage: OnboardingStageItem) => void;
  /** Legacy bar click handler */
  onBarClick?: (bar: OnboardingActivityBar) => void;
}

/** Fallback enterprise onboarding stages distribution */
export const DEFAULT_ONBOARDING_STAGES: OnboardingStageItem[] = [
  { id: 'documents', name: 'Documents', status: 'completed', count: 10 },
  { id: 'verification', name: 'Verification', status: 'in_progress', count: 12 },
  { id: 'induction', name: 'Account Setup', status: 'pending', count: 6 },
  { id: 'completed', name: 'Ready for Day 1', status: 'active', count: 4 },
];

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

const STAGE_FALLBACK_COLORS = ['#3b82f6', '#0ea5e9', '#f59e0b', '#8b5cf6'];

/**
 * Premium Enterprise Onboarding KPI Card (Circular Arrival Ring)
 * Exact Reciprocal Mirror to Offboarding (Card 5 Departure Ring)
 *
 * Minimal Heading + Big Number + Circular Arrival Ring with Integrated Arrow.
 * - Left: "Onboarding" heading + large total count
 * - Right: Circular Arrival Ring (Exact horizontal mirror of Offboarding)
 *   - Arcs sweep around nearly 300° (Blue → Cyan → Amber/Orange → Purple/Violet)
 *   - At the top, arrow continues along top tangent shooting LEFT ← in Fresh Green (#10b981)
 * - Center Hub: Dynamic Icon crossfading between UserRoundPlus, Documents, UserRoundCheck, Tasks, and Sparkles
 * - Floating Hover Badge: Displays exact stage, count, status & percentage
 * - Zero application CSS, 100% design-system compliant
 */
export const OnboardingKpiCard: React.FC<OnboardingKpiCardProps> = ({
  total,
  stages: passedStages,
  bars,
  loading = false,
  hoveredNode,
  hoveredBarId,
  onClick,
  onStageClick,
  onBarClick,
}) => {
  const [internalHovered, setInternalHovered] = useState<string | null>(null);

  // Normalize controlled hover state across both new and legacy props
  const activeHovered =
    hoveredNode !== undefined
      ? hoveredNode
      : hoveredBarId !== undefined
        ? hoveredBarId
        : internalHovered;

  // Resolve stages: prioritize passed stages, fallback to converting legacy bars if provided, else default stages
  const effectiveStages: OnboardingStageItem[] = React.useMemo(() => {
    // `passedStages` is only defaulted when the caller omits the prop entirely; an
    // explicitly-passed empty array means "zero real stages" and must render as such.
    if (passedStages !== undefined) {
      return passedStages;
    }
    if (bars && bars.length > 0) {
      const statuses: OnboardingStageStatus[] = ['completed', 'in_progress', 'pending', 'active'];
      return bars.map((b, idx) => ({
        id: b.id,
        name: b.period,
        status: statuses[idx % statuses.length] ?? 'in_progress',
        count: b.count ?? 0,
      }));
    }
    return DEFAULT_ONBOARDING_STAGES;
  }, [passedStages, bars]);

  const effectiveTotal =
    total !== undefined ? total : effectiveStages.reduce((sum, s) => sum + (s.count || 0), 0);

  // Proportional arc distribution across a 285° span with 5° gaps (viewBox="0 0 60 60", R=21)
  // Mirrors Offboarding geometry: currentAngle starts at 345° and sweeps clockwise
  const totalArcSpan = 285;
  const gap = 5;
  const numStages = effectiveStages.length || 4;
  const totalGaps = (numStages - 1) * gap;
  const availableSpan = Math.max(60, totalArcSpan - totalGaps);

  let currentAngle = 345;
  const arcs = effectiveStages.map((stage, idx) => {
    const fraction = effectiveTotal > 0 ? stage.count / effectiveTotal : 1 / numStages;
    const sweep = Math.max(16, fraction * availableSpan);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle + gap;

    const pathD = describeArc(30, 30, 21, startAngle, endAngle);
    const percent = effectiveTotal > 0 ? Math.round((stage.count / effectiveTotal) * 100) : 0;
    const isHovered =
      activeHovered === stage.id ||
      activeHovered === stage.status ||
      activeHovered === `step-${idx}` ||
      activeHovered === `step-${stage.id}`;

    return {
      ...stage,
      pathD,
      percent,
      isHovered,
      stepIndex: idx,
    };
  });

  const isArrowHovered = activeHovered === 'arrow' || activeHovered === 'entrance';
  const isCenterHovered = activeHovered === 'center' || activeHovered === 'total';
  const hasHover = activeHovered !== null && activeHovered !== undefined;
  const hoveredArc = arcs.find((a) => a.isHovered);

  const formatStatus = (s: OnboardingStageStatus) => {
    switch (s) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'active':
        return 'Active';
      default:
        return s;
    }
  };

  let tooltipText = '';
  let activeIcon: 'userRoundPlus' | 'documents' | 'userRoundCheck' | 'tasks' | 'sparkles' =
    'userRoundPlus';
  let iconModifierClass = 'bezent-kpi-arrival-icon--default';

  if (hoveredArc) {
    tooltipText = `${hoveredArc.name}: ${hoveredArc.count}`;
    if (hoveredArc.id === 'documents' || hoveredArc.id.includes('w1')) {
      activeIcon = 'documents';
      iconModifierClass = 'bezent-kpi-arrival-icon--documents';
    } else if (hoveredArc.id === 'verification' || hoveredArc.id.includes('w2')) {
      activeIcon = 'userRoundCheck';
      iconModifierClass = 'bezent-kpi-arrival-icon--verification';
    } else if (
      hoveredArc.id === 'induction' ||
      hoveredArc.id.includes('w3') ||
      hoveredArc.id === 'setup'
    ) {
      activeIcon = 'tasks';
      iconModifierClass = 'bezent-kpi-arrival-icon--induction';
    } else {
      activeIcon = 'sparkles';
      iconModifierClass = 'bezent-kpi-arrival-icon--completed';
    }
  } else if (isArrowHovered) {
    tooltipText = `New Hires: ${effectiveTotal} in onboarding (Arrival & Inflow)`;
    activeIcon = 'userRoundPlus';
    iconModifierClass = 'bezent-kpi-arrival-icon--arrow';
  } else if (isCenterHovered) {
    tooltipText = `Onboarding: ${effectiveTotal} total (${numStages} stages in progress)`;
    activeIcon = 'userRoundPlus';
    iconModifierClass = 'bezent-kpi-arrival-icon--center';
  }

  let dynamicColorModifier = 'bezent-exec-kpi-card--teal';
  if (isArrowHovered) {
    dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-active';
  } else if (hoveredArc) {
    if (hoveredArc.id === 'documents' || hoveredArc.id.includes('w1')) {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-pending';
    } else if (hoveredArc.id === 'verification' || hoveredArc.id.includes('w2')) {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-teal';
    } else if (
      hoveredArc.id === 'induction' ||
      hoveredArc.id.includes('w3') ||
      hoveredArc.id === 'setup'
    ) {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-probation';
    } else {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-promotions';
    }
  }

  return (
    <div
      className={`bezent-exec-kpi-card bezent-exec-kpi-card--onboarding ${dynamicColorModifier}`}
      onClick={onClick}
      role="region"
      aria-label="Employees Onboarding"
      title="Employees Onboarding"
    >
      <div className="bezent-kpi-onboarding-layout">
        {/* Left Section: Small Heading at Top, Large Primary Number Below */}
        <div className="bezent-kpi-onboarding-left">
          <div className="bezent-kpi-onboarding-heading">Onboarding</div>
          <div className="bezent-kpi-onboarding-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              effectiveTotal.toLocaleString()
            )}
          </div>
        </div>

        {/* Right Section: Circular Arrival Ring (60px × 60px) */}
        <div
          className="bezent-kpi-onboarding-right"
          onMouseLeave={() => setInternalHovered(null)}
          onPointerLeave={() => setInternalHovered(null)}
          aria-label="Circular arrival ring with entrance vector"
        >
          <div className="bezent-kpi-ambient-glow bezent-kpi-ambient-glow--cyan" />
          {/* Floating Hover Badge: 100% unclipped, outside-card visibility */}
          <div
            className={`bezent-kpi-flow-badge bezent-kpi-onboarding-tooltip bezent-kpi-bar-tooltip ${
              hasHover ? 'is-visible' : ''
            }`}
            aria-live="polite"
          >
            {tooltipText}
          </div>

          {/* SVG Circular Arrival Ring (Exact Horizontal Mirror of Offboarding) */}
          <svg
            className="bezent-kpi-onboarding-svg bezent-kpi-arrival-svg"
            viewBox="0 0 60 60"
            role="img"
            aria-label={`Onboarding stages: ${arcs.map((a) => `${a.name}: ${a.count}`).join(', ')}`}
          >
            {/* Mirrored Group across x=30: Creates exact reciprocal balance to Card 5 */}
            <g transform="translate(60, 0) scale(-1, 1)">
              {/* 4 Stage Proportional Arcs */}
              {arcs.map((arc, idx) => {
                const fallbackStroke = STAGE_FALLBACK_COLORS[idx % STAGE_FALLBACK_COLORS.length];
                return (
                  <g
                    key={arc.id}
                    className={`bezent-kpi-arrival-group bezent-kpi-onboarding-node--${arc.id} bezent-kpi-onboarding-node--step-${idx} ${
                      arc.isHovered ? 'is-hovered bezent-kpi-activity-bar--hovered' : ''
                    } ${hasHover && !arc.isHovered ? 'is-dimmed' : ''}`}
                    onMouseEnter={() => setInternalHovered(arc.id)}
                    onMouseOver={() => setInternalHovered(arc.id)}
                    onPointerEnter={() => setInternalHovered(arc.id)}
                    onFocus={() => setInternalHovered(arc.id)}
                    onBlur={() => setInternalHovered(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStageClick?.(arc);
                      onBarClick?.({ id: arc.id, period: arc.name, count: arc.count });
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
                        onBarClick?.({ id: arc.id, period: arc.name, count: arc.count });
                        onClick?.();
                      }
                    }}
                  >
                    {/* Wide invisible hit area so hover triggers effortlessly */}
                    <path d={arc.pathD} strokeWidth={14} stroke="transparent" fill="none" />

                    {/* Visible sleek curved arc with guaranteed fallback color */}
                    <path
                      d={arc.pathD}
                      stroke={fallbackStroke}
                      strokeWidth={4.8}
                      strokeLinecap="round"
                      className={`bezent-kpi-arrival-arc bezent-kpi-arrival-arc--step-${idx} bezent-kpi-arrival-arc--${arc.id} bezent-kpi-onboarding-arc--${arc.id}`}
                    />
                  </g>
                );
              })}

              {/* Top Horizontal Arrow pointing left (in mirrored coordinates, line x1=31..47, polygon tip at 53.5) */}
              <g
                className={`bezent-kpi-arrival-arrow-group bezent-kpi-onboarding-arrow-group ${
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
                aria-label={`New Hires Arrival: ${effectiveTotal} in onboarding`}
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

                {/* Horizontal arrival stem */}
                <line
                  x1={31}
                  y1={9}
                  x2={47}
                  y2={9}
                  stroke="#10b981"
                  strokeWidth={4.8}
                  strokeLinecap="round"
                  className="bezent-kpi-arrival-arrow-stem bezent-kpi-onboarding-arrow-stem"
                />

                {/* Sleek, solid horizontal arrowhead pointing towards the left in visual space */}
                <polygon
                  points="53.5,9 46.5,5.2 46.5,12.8"
                  fill="#10b981"
                  className="bezent-kpi-arrival-arrowhead bezent-kpi-onboarding-arrowhead"
                />
              </g>
            </g>
          </svg>

          {/* Dynamic Center Icon Hub (Un-mirrored, perfectly centered) */}
          <div
            className={`bezent-kpi-arrival-center ${isCenterHovered ? 'is-hovered' : ''}`}
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
              className={`bezent-kpi-arrival-icon-wrapper ${iconModifierClass}`}
            >
              <BezentIcon name={activeIcon} size={15} color="currentColor" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Pill: Full card width, single line with zero-CLS skeleton */}
      <div
        className={`bezent-kpi-sub-pill bezent-kpi-sub-pill--onboarding ${
          loading ? 'bezent-kpi-sub-pill--loading' : ''
        }`}
      >
        {loading ? (
          <span className="bezent-kpi-pill-skeleton" />
        ) : (
          <>
            <span className="bezent-kpi-sub-pill-dot" />
            Inflow
          </>
        )}
      </div>
    </div>
  );
};
