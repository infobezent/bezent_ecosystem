import React, { useState } from 'react';

export type PromotionTypeId = 'designation' | 'grade' | 'level' | 'department';

export interface PromotionTypeItem {
  id: PromotionTypeId;
  label: string;
  count: number;
  colorClass: string;
}

export interface CareerProgressionItem {
  fromRole: string;
  toRole: string;
}

export interface PromotionsKpiCardProps {
  /** Total promotion records */
  total?: number;
  /** Count of promotions awaiting approval */
  pendingApproval?: number;
  /**
   * Active promotion role progression (e.g. Junior → Senior).
   * Pass `null` (not `undefined`) to indicate "no real progression data" —
   * `undefined` falls back to the demo default for prop-less usage.
   */
  progression?: CareerProgressionItem | null;
  /** Breakdown of the four promotion categories */
  promotionTypes?: PromotionTypeItem[];
  /** Loading state indicator */
  loading?: boolean;
  /** Controlled hovered target for verification/testing ('designation' | 'grade' | 'level' | 'department' | 'arrow' | 'step-0' etc.) */
  hoveredNode?: string | null;
  /** Card click handler */
  onClick?: () => void;
  /** Segment click handler */
  onTypeClick?: (type: PromotionTypeItem) => void;
}

/** Fallback enterprise distribution per approved BEZENT specification */
const DEFAULT_PROMOTION_TYPES: PromotionTypeItem[] = [
  { id: 'department', label: 'Department-based Promotion', count: 2, colorClass: 'department' },
  { id: 'level', label: 'Job Level Change', count: 3, colorClass: 'level' },
  { id: 'grade', label: 'Salary Grade Change', count: 3, colorClass: 'grade' },
  { id: 'designation', label: 'Designation Change', count: 4, colorClass: 'designation' },
];

const DEFAULT_PROGRESSION: CareerProgressionItem = {
  fromRole: 'Junior',
  toRole: 'Senior',
};

/**
 * Premium Enterprise Promotions KPI Card
 *
 * Minimal Heading + Big Number + Ascending Career Steps on the right.
 * - Left: "Promotions" heading + large total count
 * - Right: Compact Ascending Career Steps ( ▂▃▄ ) + Upward Elevation Arrow ( ↗ )
 * - Interactive Hover: Tooltip highlights promotion types, counts, percentages, and career progression
 * - Zero application CSS, 100% design-system compliant
 */
export const PromotionsKpiCard: React.FC<PromotionsKpiCardProps> = ({
  total,
  pendingApproval,
  progression,
  promotionTypes,
  loading = false,
  hoveredNode,
  onClick,
  onTypeClick,
}) => {
  const [internalHovered, setInternalHovered] = useState<string | null>(null);
  const activeHovered = hoveredNode !== undefined ? hoveredNode : internalHovered;

  // `promotionTypes` is only defaulted when the caller omits the prop entirely; an
  // explicitly-passed empty array means "zero real promotions" and must render as such.
  const effectiveTypes = promotionTypes ?? DEFAULT_PROMOTION_TYPES;

  const effectiveTotal =
    total !== undefined ? total : effectiveTypes.reduce((sum, t) => sum + (t.count || 0), 0);

  const effectivePending = pendingApproval !== undefined ? pendingApproval : 0;

  // `undefined` (prop omitted) falls back to the demo default; `null` means the
  // caller has real data and there is genuinely no progression to show.
  const effectiveProgression = progression === undefined ? DEFAULT_PROGRESSION : progression;

  // 4 Graduated Staircase Steps Geometry (viewBox="0 0 60 60")
  // Separated design: constant 10px breathing room between arrow and steps (zero overlap)
  const stepConfigs = [
    { x: 6.8, y: 38, width: 8.2, height: 12 },
    { x: 18.8, y: 31, width: 8.2, height: 19 },
    { x: 30.8, y: 24, width: 8.2, height: 26 },
    { x: 42.8, y: 17, width: 8.2, height: 33 },
  ];

  const steps = effectiveTypes.slice(0, 4).map((type, idx) => {
    const geom = stepConfigs[idx] || {
      x: 6 + idx * 12.5,
      y: 36 - idx * 8,
      width: 8.5,
      height: 12 + idx * 8,
    };
    const percent = effectiveTotal > 0 ? Math.round((type.count / effectiveTotal) * 100) : 0;
    const isHovered =
      activeHovered === type.id ||
      activeHovered === `step-${idx}` ||
      activeHovered === type.colorClass;

    return {
      ...type,
      ...geom,
      percent,
      isHovered,
    };
  });

  const isArrowHovered = activeHovered === 'arrow' || activeHovered === 'progression';
  const hasHover = activeHovered !== null && activeHovered !== undefined;
  const hoveredStep = steps.find((s) => s.isHovered);

  let tooltipText = '';
  if (hoveredStep) {
    tooltipText = `${hoveredStep.label}: ${hoveredStep.count} promotions (${hoveredStep.percent}%)`;
  } else if (isArrowHovered) {
    tooltipText = effectiveProgression
      ? `Career Progression: ${effectiveProgression.fromRole} → ${effectiveProgression.toRole}`
      : 'No recent career progression';
  } else if (hasHover) {
    tooltipText = `Promotions: ${effectiveTotal} total (${effectivePending} pending)`;
  }

  return (
    <div
      className="bezent-exec-kpi-card bezent-exec-kpi-card--promotions"
      onClick={onClick}
      role="region"
      aria-label="Total Promotions"
      title="Total Promotions"
    >
      <div className="bezent-kpi-promotions-layout">
        {/* Left Section: Small Heading at Top, Large Primary Number Below */}
        <div className="bezent-kpi-promotions-left">
          <div className="bezent-kpi-promotions-heading">Promotions</div>
          <div className="bezent-kpi-promotions-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              effectiveTotal.toLocaleString()
            )}
          </div>
        </div>

        {/* Right Section: Compact Ascending Career Steps (60px × 60px) */}
        <div
          className="bezent-kpi-promotions-right"
          onMouseLeave={() => setInternalHovered(null)}
          onPointerLeave={() => setInternalHovered(null)}
          aria-label="Ascending career steps progression"
        >
          <div className="bezent-kpi-ambient-glow bezent-kpi-ambient-glow--purple" />
          {/* Floating Hover Badge: 100% unclipped, outside-card visibility */}
          <div
            className={`bezent-kpi-flow-badge bezent-kpi-promotion-tooltip ${hasHover ? 'is-visible' : ''}`}
            aria-live="polite"
          >
            {tooltipText}
          </div>

          {/* SVG Ascending Steps ( ▂▃▄ ) + Upward Arrow ( ↗ ) */}
          <svg
            className="bezent-kpi-promotions-svg"
            viewBox="0 0 60 60"
            role="img"
            aria-label={`Promotions breakdown: ${steps.map((s) => `${s.label}: ${s.count}`).join(', ')}`}
          >
            {/* Ground Baseline (Pill-shaped rounded bar) */}
            <rect
              x={4.5}
              y={50}
              width={51}
              height={1.6}
              rx={0.8}
              className="bezent-kpi-promotions-baseline"
            />

            {/* Ascending Steps */}
            {steps.map((step, _idx) => (
              <g
                key={step.id}
                className={`bezent-kpi-promotion-step bezent-kpi-promotion-step--${step.colorClass} bezent-kpi-promotion-segment--${step.colorClass} ${
                  step.isHovered ? 'is-hovered' : ''
                } ${hasHover && !step.isHovered ? 'is-dimmed' : ''}`}
                onMouseEnter={() => setInternalHovered(step.id)}
                onMouseOver={() => setInternalHovered(step.id)}
                onPointerEnter={() => setInternalHovered(step.id)}
                onFocus={() => setInternalHovered(step.id)}
                onBlur={() => setInternalHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onTypeClick?.(step);
                  onClick?.();
                }}
                tabIndex={0}
                role="button"
                aria-label={`${step.label}: ${step.count} promotions`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onTypeClick?.(step);
                    onClick?.();
                  }
                }}
              >
                {/* Invisible wide hit area so hover triggers effortlessly */}
                <rect
                  x={step.x - 2}
                  y={step.y - 6}
                  width={step.width + 4}
                  height={step.height + 8}
                  fill="transparent"
                />
                {/* Visible rounded pill step */}
                <rect
                  x={step.x}
                  y={step.y}
                  width={step.width}
                  height={step.height}
                  rx={3.5}
                  ry={3.5}
                  className={`bezent-kpi-promotion-bar bezent-kpi-promotion-bar--${step.colorClass}`}
                />
              </g>
            ))}

            {/* Upward Elevation Straight Arrow ( ↗ ) - Floating 10px cleanly ABOVE the steps, zero overlap */}
            <g
              className={`bezent-kpi-promotions-arrow-group ${isArrowHovered ? 'is-hovered' : ''} ${
                hasHover && !isArrowHovered ? 'is-dimmed' : ''
              }`}
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
              aria-label={
                effectiveProgression
                  ? `Career Progression: ${effectiveProgression.fromRole} to ${effectiveProgression.toRole}`
                  : 'Career Progression: no recent role change'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick?.();
                }
              }}
            >
              {/* Stationary Fat Hit Area: Guarantees zero hover flicker */}
              <line
                x1={6}
                y1={30}
                x2={52}
                y2={4}
                strokeWidth={14}
                stroke="transparent"
                strokeLinecap="round"
              />

              {/* Visual Arrow Layer (floating parallel 10px above the staircase steps, zero overlap) */}
              <g className="bezent-kpi-promotions-arrow-visual">
                {/* Arrow Shaft: straight bold elevation line */}
                <line
                  x1={8}
                  y1={28}
                  x2={45}
                  y2={6.9}
                  className="bezent-kpi-promotions-arrow-shaft"
                />
                {/* Arrowhead: crisp symmetrical dart pointer meeting the shaft notch */}
                <polygon
                  points="49.5,4.4 44.0,3.3 44.8,7.0 47.6,9.5"
                  className="bezent-kpi-promotions-arrowhead"
                />
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* Bottom Status Pill: Full card width, single line with zero-CLS skeleton */}
      <div
        className={`bezent-kpi-sub-pill bezent-kpi-sub-pill--promotions ${
          loading ? 'bezent-kpi-sub-pill--loading' : ''
        }`}
      >
        {loading ? (
          <span className="bezent-kpi-pill-skeleton" />
        ) : (
          <>
            <span className="bezent-kpi-sub-pill-icon">↗</span>
            Advancement
          </>
        )}
      </div>
    </div>
  );
};
