import React, { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export interface TransferLocationDetails {
  fromLocation?: string;
  fromCount?: number;
  toLocation?: string;
  toCount?: number;
  summary?: string;
}

export type TransferTypeId = 'branch' | 'location' | 'department' | 'designation';

export interface TransferTypeItem {
  id: TransferTypeId;
  label: string;
  count: number;
  colorClass: string;
}

export interface TransfersKpiCardProps {
  /** Total transfer records */
  total?: number;
  /** Count of transfers awaiting approval */
  pendingApproval?: number;
  /** Count of approved/completed transfers (defaults to total - pendingApproval) */
  approved?: number;
  /** Legacy transfer types breakdown for backward compatibility */
  transferTypes?: TransferTypeItem[];
  /** Detailed location transfer info (from/to locations & counts) */
  locationDetails?: TransferLocationDetails;
  /** Loading state indicator */
  loading?: boolean;
  /** Controlled hovered target for verification/testing ('approved' | 'pending' | 'center' | 'from' | 'to' | 'top' | 'bottom') */
  hoveredNode?: string | null;
  /** Card click handler */
  onClick?: () => void;
  /** Flow target click handler */
  onNodeClick?: (target: string) => void;
}

/**
 * Premium Enterprise Transfers KPI Card
 *
 * Minimal Heading + Big Number + Circular Flow Loop on the right.
 * - Left: "Transfers" heading + large total count
 * - Right: Circular Flow Loop with 2 interactive curved arrows
 *   - Top Arrow: Approved / Completed Transfers (Green #16A36A)
 *   - Bottom Arrow: Pending Approval Transfers (Amber #E5A43B)
 * - Dynamic Center Icon: Crossfades between Sync, UserRoundCheck (Approved), and UserRoundClock (Pending)
 * - Floating Hover Badge: Displays exact count, status & percentage with zero clipping
 * - Zero application CSS, 100% design-system compliant
 */
export const TransfersKpiCard: React.FC<TransfersKpiCardProps> = ({
  total,
  pendingApproval,
  approved,
  transferTypes,
  locationDetails,
  loading = false,
  hoveredNode,
  onClick,
  onNodeClick,
}) => {
  const [internalHovered, setInternalHovered] = useState<string | null>(null);
  const activeHovered = hoveredNode !== undefined ? hoveredNode : internalHovered;

  const effectiveTotal =
    total !== undefined ? total : (transferTypes?.reduce((sum, t) => sum + (t.count || 0), 0) ?? 0);

  const effectivePending = pendingApproval !== undefined ? pendingApproval : 0;

  const effectiveApproved =
    approved !== undefined ? approved : Math.max(0, effectiveTotal - effectivePending);

  const approvedPercent =
    effectiveTotal > 0 ? Math.round((effectiveApproved / effectiveTotal) * 100) : 0;

  const pendingPercent =
    effectiveTotal > 0 ? Math.round((effectivePending / effectiveTotal) * 100) : 0;

  const fromLabel =
    locationDetails?.fromLocation ||
    (locationDetails?.fromCount !== undefined
      ? `${locationDetails.fromCount} outgoing`
      : effectiveTotal > 0
        ? 'Head Office'
        : '0 records');

  const centerLabel =
    locationDetails?.summary ||
    (effectivePending > 0
      ? `${effectiveTotal} total (${effectivePending} pending)`
      : `${effectiveTotal} transfers`);

  const toLabel =
    locationDetails?.toLocation ||
    (locationDetails?.toCount !== undefined
      ? `${locationDetails.toCount} incoming`
      : effectiveTotal > 0
        ? 'Branch Locations'
        : '0 records');

  const isTopHovered =
    activeHovered === 'approved' ||
    activeHovered === 'top' ||
    activeHovered === 'outgoing' ||
    activeHovered === 'from';

  const isBottomHovered =
    activeHovered === 'pending' ||
    activeHovered === 'bottom' ||
    activeHovered === 'incoming' ||
    activeHovered === 'to';

  const isCenterHovered = activeHovered === 'center' || activeHovered === 'total';

  const hasHover = isTopHovered || isBottomHovered || isCenterHovered;

  let tooltipText = '';
  let activeIcon: 'sync' | 'userRoundCheck' | 'userRoundClock' | 'location' = 'sync';
  let iconModifierClass = 'bezent-kpi-flow-icon--default';

  if (isTopHovered) {
    if (locationDetails?.fromLocation) {
      tooltipText = `From: ${fromLabel}`;
      activeIcon = 'location';
    } else {
      tooltipText = `Approved: ${effectiveApproved} (${approvedPercent}%)`;
      activeIcon = 'userRoundCheck';
    }
    iconModifierClass = 'bezent-kpi-flow-icon--approved';
  } else if (isBottomHovered) {
    if (locationDetails?.toLocation) {
      tooltipText = `To: ${toLabel}`;
      activeIcon = 'location';
    } else {
      tooltipText = `Pending: ${effectivePending} (${pendingPercent}%)`;
      activeIcon = 'userRoundClock';
    }
    iconModifierClass = 'bezent-kpi-flow-icon--pending';
  } else if (isCenterHovered) {
    if (locationDetails?.summary) {
      tooltipText = `Transfers: ${centerLabel}`;
    } else {
      tooltipText = `Transfers: ${effectiveTotal} (${effectiveApproved} Approved · ${effectivePending} Pending)`;
    }
    activeIcon = 'sync';
    iconModifierClass = 'bezent-kpi-flow-icon--center';
  }

  let dynamicColorModifier = 'bezent-exec-kpi-card--amber';
  if (isTopHovered) {
    dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-active';
  } else if (isBottomHovered) {
    dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-probation';
  }

  return (
    <div
      className={`bezent-exec-kpi-card bezent-exec-kpi-card--transfers ${dynamicColorModifier}`}
      onClick={onClick}
      role="region"
      aria-label="Total Transfers"
      title="Total Transfers"
    >
      <div className="bezent-kpi-transfers-layout">
        {/* Left Section: Small Heading at Top, Large Primary Number Below */}
        <div className="bezent-kpi-transfers-left">
          <div className="bezent-kpi-transfers-heading">Transfers</div>
          <div className="bezent-kpi-transfers-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              effectiveTotal.toLocaleString()
            )}
          </div>
        </div>

        {/* Right Section: Circular Flow Loop Visual (2 Interactive Curved Arrows) */}
        <div
          className="bezent-kpi-transfers-right"
          onMouseLeave={() => setInternalHovered(null)}
          onPointerLeave={() => setInternalHovered(null)}
          aria-label="Transfers circular flow loop"
        >
          <div className="bezent-kpi-ambient-glow bezent-kpi-ambient-glow--amber" />
          {/* Floating Hover Badge: 100% visible, outside-card clipping resolved */}
          <div
            className={`bezent-kpi-flow-badge bezent-kpi-transfer-tooltip ${hasHover ? 'is-visible' : ''}`}
            aria-live="polite"
          >
            {tooltipText}
          </div>

          {/* SVG Circular Flow Loop with 2 curved arrows */}
          <svg
            className="bezent-kpi-flow-svg bezent-kpi-transfer-svg"
            viewBox="0 0 60 60"
            role="img"
            aria-label="Approved and Pending transfer flow"
          >
            {/* Top / Approved Curved Arrow (Green #16A36A) */}
            <g
              className={`bezent-kpi-flow-group bezent-kpi-flow-group--out bezent-kpi-flow-group--approved bezent-kpi-transfer-node--from ${
                isTopHovered ? 'is-hovered' : ''
              } ${hasHover && !isTopHovered ? 'is-dimmed' : ''}`}
              onMouseEnter={() => setInternalHovered('approved')}
              onMouseOver={() => setInternalHovered('approved')}
              onPointerEnter={() => setInternalHovered('approved')}
              onFocus={() => setInternalHovered('approved')}
              onBlur={() => setInternalHovered(null)}
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick?.('approved');
                onClick?.();
              }}
              tabIndex={0}
              role="button"
              aria-label={`Approved Transfers: ${effectiveApproved}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onNodeClick?.('approved');
                  onClick?.();
                }
              }}
            >
              {/* Transparent fat hit area to guarantee effortless hover anywhere near top arc */}
              <path
                d="M 10.7 24.8 A 20 20 0 0 1 49.3 24.8"
                strokeWidth={14}
                stroke="transparent"
                fill="none"
              />
              <path
                d="M 10.7 24.8 A 20 20 0 0 1 49.3 24.8"
                strokeWidth={4.8}
                className="bezent-kpi-flow-arc bezent-kpi-flow-arc--out bezent-kpi-flow-arc--approved"
              />
              <polygon
                points="49.3,29.5 45.5,24.5 53.5,24.5"
                className="bezent-kpi-flow-arrowhead bezent-kpi-flow-arrowhead--out bezent-kpi-flow-arrowhead--approved"
              />
            </g>

            {/* Bottom / Pending Curved Arrow (Amber #E5A43B) */}
            <g
              className={`bezent-kpi-flow-group bezent-kpi-flow-group--in bezent-kpi-flow-group--pending bezent-kpi-transfer-node--to ${
                isBottomHovered ? 'is-hovered' : ''
              } ${hasHover && !isBottomHovered ? 'is-dimmed' : ''}`}
              onMouseEnter={() => setInternalHovered('pending')}
              onMouseOver={() => setInternalHovered('pending')}
              onPointerEnter={() => setInternalHovered('pending')}
              onFocus={() => setInternalHovered('pending')}
              onBlur={() => setInternalHovered(null)}
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick?.('pending');
                onClick?.();
              }}
              tabIndex={0}
              role="button"
              aria-label={`Pending Transfers: ${effectivePending}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onNodeClick?.('pending');
                  onClick?.();
                }
              }}
            >
              {/* Transparent fat hit area to guarantee effortless hover anywhere near bottom arc */}
              <path
                d="M 49.3 35.2 A 20 20 0 0 1 10.7 35.2"
                strokeWidth={14}
                stroke="transparent"
                fill="none"
              />
              <path
                d="M 49.3 35.2 A 20 20 0 0 1 10.7 35.2"
                strokeWidth={4.8}
                className="bezent-kpi-flow-arc bezent-kpi-flow-arc--in bezent-kpi-flow-arc--pending"
              />
              <polygon
                points="10.7,30.5 6.9,35.5 14.9,35.5"
                className="bezent-kpi-flow-arrowhead bezent-kpi-flow-arrowhead--in bezent-kpi-flow-arrowhead--pending"
              />
            </g>
          </svg>

          {/* Center Dynamic Icon with Crossfade */}
          <div
            className={`bezent-kpi-flow-center bezent-kpi-transfer-node--center ${
              isCenterHovered ? 'is-hovered' : ''
            }`}
            aria-live="polite"
            onMouseEnter={() => setInternalHovered('center')}
            onPointerEnter={() => setInternalHovered('center')}
            onFocus={() => setInternalHovered('center')}
            onBlur={() => setInternalHovered(null)}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.('center');
              onClick?.();
            }}
          >
            <div
              key={activeHovered ?? 'default'}
              className={`bezent-kpi-flow-icon-wrapper ${iconModifierClass}`}
            >
              <BezentIcon name={activeIcon} size={15} color="currentColor" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Pill: Full card width, single line with zero-CLS skeleton */}
      <div
        className={`bezent-kpi-sub-pill bezent-kpi-sub-pill--transfers ${
          loading ? 'bezent-kpi-sub-pill--loading' : ''
        }`}
      >
        {loading ? (
          <span className="bezent-kpi-pill-skeleton" />
        ) : (
          <>
            <span className="bezent-kpi-sub-pill-dot" />
            Mobility
          </>
        )}
      </div>
    </div>
  );
};
