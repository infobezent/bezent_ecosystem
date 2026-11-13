import React, { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export interface WorkforceComplianceKpiCardProps {
  /** Compliance rate percentage (0 - 100) */
  complianceRate?: number;
  /** Compliant records count */
  compliantCount?: number;
  /** Attention required records count */
  attentionCount?: number;
  /** Total records evaluated */
  totalRecords?: number;
  /** Loading state indicator */
  loading?: boolean;
  /** Card click handler */
  onClick?: () => void;
  /** Segment click handler ('compliant' | 'attention') */
  onSegmentClick?: (segment: 'compliant' | 'attention') => void;
}

export const DEFAULT_COMPLIANCE_RATE = 94;
export const DEFAULT_TOTAL_RECORDS = 100;
export const DEFAULT_COMPLIANT_COUNT = 94;
export const DEFAULT_ATTENTION_COUNT = 6;

/**
 * Interactive Workforce Compliance KPI Card (Compliance Health Design)
 *
 * Implements approved Executive Workforce Overview Card 6:
 * - Top Section: Title "Workforce Compliance", Main Percentage ("94%"), Subtitle "Compliance Completion", Emerald Shield Icon
 * - Middle Section: Simple horizontal progress indicator representing actual compliance health
 *   - Green: Compliant Records
 *   - Amber: Requires Attention
 * - Interactive: Hovering highlights corresponding section, reveals category name, percentage and count
 * - Bottom Indicator: Single clean "Requires Attention: [Count]" indicator
 * - 100% Zero-App-CSS compliant, full keyboard accessibility, dark mode support
 */
export const WorkforceComplianceKpiCard: React.FC<WorkforceComplianceKpiCardProps> = ({
  complianceRate,
  compliantCount,
  attentionCount,
  totalRecords,
  loading = false,
  onClick,
  onSegmentClick,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<'compliant' | 'attention' | null>(null);

  const effectiveTotal =
    totalRecords !== undefined
      ? totalRecords
      : compliantCount !== undefined && attentionCount !== undefined
        ? compliantCount + attentionCount
        : DEFAULT_TOTAL_RECORDS;

  let effectiveRate = complianceRate;
  if (effectiveRate === undefined) {
    if (compliantCount !== undefined && effectiveTotal > 0) {
      effectiveRate = Math.round((compliantCount / effectiveTotal) * 100);
    } else {
      effectiveRate = DEFAULT_COMPLIANCE_RATE;
    }
  }

  // Ensure 0 <= effectiveRate <= 100
  const clampedRate = Math.max(0, Math.min(100, effectiveRate));
  const remainingPct = 100 - clampedRate;

  const effectiveCompliantCount =
    compliantCount !== undefined
      ? compliantCount
      : Math.round((clampedRate / 100) * effectiveTotal) || DEFAULT_COMPLIANT_COUNT;

  const effectiveAttentionCount =
    attentionCount !== undefined
      ? attentionCount
      : Math.max(0, effectiveTotal - effectiveCompliantCount);

  // Proportional SVG bar calculations (viewBox 0 0 100 6)
  const gap = clampedRate > 0 && remainingPct > 0 ? 2 : 0;
  const availableWidth = 100 - gap;

  let compliantWidth = 0;
  let attentionWidth = 0;
  let attentionX = 0;

  if (clampedRate === 100) {
    compliantWidth = 100;
  } else if (clampedRate === 0) {
    attentionWidth = 100;
    attentionX = 0;
  } else {
    compliantWidth = Math.max(3, (clampedRate / 100) * availableWidth);
    attentionWidth = Math.max(3, 100 - compliantWidth - gap);
    attentionX = compliantWidth + gap;
  }

  const hasHover = hoveredSegment !== null;

  return (
    <div
      className="bezent-exec-kpi-card bezent-exec-kpi-card--compliance"
      onClick={onClick}
      role="region"
      aria-label="Workforce Compliance KPI Summary"
      title="Workforce compliance health and completeness"
    >
      {/* ── Top Section ── */}
      <div className="bezent-kpi-compliance-top">
        <div className="bezent-kpi-compliance-heading-group">
          <div className="bezent-kpi-compliance-heading">Compliance</div>
          <div className="bezent-kpi-compliance-value">{loading ? '—' : `${clampedRate}%`}</div>
          <div className="bezent-kpi-compliance-label">Workforce Compliance</div>
        </div>

        <div className="bezent-kpi-compliance-icon" aria-hidden="true">
          <BezentIcon name="security" size={17} />
        </div>
      </div>

      {/* ── Middle Section: Compliance Progress ── */}
      <div
        className="bezent-kpi-compliance-section"
        onMouseLeave={() => setHoveredSegment(null)}
        onPointerLeave={() => setHoveredSegment(null)}
      >
        {/* Subtle hover detail label / category header */}
        <div className="bezent-kpi-compliance-header-row" aria-live="polite">
          {hoveredSegment === 'compliant' ? (
            <div className="bezent-kpi-compliance-hover-label" key="compliant">
              <div className="bezent-kpi-compliance-hover-left">
                <span className="bezent-kpi-compliance-dot bezent-kpi-compliance-dot--compliant" />
                <span className="bezent-kpi-compliance-hover-name">Compliant Records</span>
                <span className="bezent-kpi-compliance-hover-sep">·</span>
                <span className="bezent-kpi-compliance-hover-rate bezent-kpi-compliance-hover-rate--compliant">
                  {clampedRate}%
                </span>
              </div>
              <span className="bezent-kpi-compliance-hover-count">
                {effectiveCompliantCount.toLocaleString()}
              </span>
            </div>
          ) : hoveredSegment === 'attention' ? (
            <div className="bezent-kpi-compliance-hover-label" key="attention">
              <div className="bezent-kpi-compliance-hover-left">
                <span className="bezent-kpi-compliance-dot bezent-kpi-compliance-dot--attention" />
                <span className="bezent-kpi-compliance-hover-name">Requires Attention</span>
                <span className="bezent-kpi-compliance-hover-sep">·</span>
                <span className="bezent-kpi-compliance-hover-rate bezent-kpi-compliance-hover-rate--attention">
                  {remainingPct}%
                </span>
              </div>
              <span className="bezent-kpi-compliance-hover-count">
                {effectiveAttentionCount.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="bezent-kpi-compliance-meta-label">
              <span>Compliant Records</span>
              <span className="bezent-kpi-compliance-meta-sub">{clampedRate}%</span>
            </div>
          )}
        </div>

        {/* Proportional Compliance Horizontal Bar */}
        <div
          className="bezent-kpi-compliance-bar-container"
          role="group"
          aria-label="Workforce compliance health breakdown"
        >
          <svg
            className="bezent-kpi-compliance-bar-svg"
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Compliance: ${clampedRate}% compliant, ${remainingPct}% requires attention`}
          >
            {clampedRate > 0 && (
              <rect
                x={0}
                y={0}
                width={compliantWidth}
                height={6}
                rx={2.5}
                className={`bezent-kpi-compliance-segment bezent-kpi-compliance-segment--compliant ${
                  hoveredSegment === 'compliant' ? 'bezent-kpi-compliance-segment--hovered' : ''
                } ${hasHover && hoveredSegment !== 'compliant' ? 'bezent-kpi-compliance-segment--dimmed' : ''}`}
                onMouseEnter={() => setHoveredSegment('compliant')}
                onMouseOver={() => setHoveredSegment('compliant')}
                onPointerEnter={() => setHoveredSegment('compliant')}
                onPointerOver={() => setHoveredSegment('compliant')}
                onMouseMove={() => setHoveredSegment('compliant')}
                onFocus={() => setHoveredSegment('compliant')}
                onBlur={() => setHoveredSegment(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSegmentClick?.('compliant');
                  onClick?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSegmentClick?.('compliant');
                    onClick?.();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Compliant Records: ${clampedRate}%, ${effectiveCompliantCount.toLocaleString()} records`}
              />
            )}

            {remainingPct > 0 && (
              <rect
                x={attentionX}
                y={0}
                width={attentionWidth}
                height={6}
                rx={2.5}
                className={`bezent-kpi-compliance-segment bezent-kpi-compliance-segment--attention ${
                  hoveredSegment === 'attention' ? 'bezent-kpi-compliance-segment--hovered' : ''
                } ${hasHover && hoveredSegment !== 'attention' ? 'bezent-kpi-compliance-segment--dimmed' : ''}`}
                onMouseEnter={() => setHoveredSegment('attention')}
                onMouseOver={() => setHoveredSegment('attention')}
                onPointerEnter={() => setHoveredSegment('attention')}
                onPointerOver={() => setHoveredSegment('attention')}
                onMouseMove={() => setHoveredSegment('attention')}
                onFocus={() => setHoveredSegment('attention')}
                onBlur={() => setHoveredSegment(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSegmentClick?.('attention');
                  onClick?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSegmentClick?.('attention');
                    onClick?.();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Requires Attention: ${remainingPct}%, ${effectiveAttentionCount.toLocaleString()} records`}
              />
            )}
          </svg>
        </div>
      </div>

      {/* ── Bottom Section: Requires Attention ── */}
      <div className="bezent-kpi-compliance-footer">
        <span className="bezent-kpi-compliance-pending-text">
          Requires Attention:{' '}
          <strong className="bezent-kpi-compliance-pending-count">
            {effectiveAttentionCount.toLocaleString()}
          </strong>
        </span>
      </div>
    </div>
  );
};
