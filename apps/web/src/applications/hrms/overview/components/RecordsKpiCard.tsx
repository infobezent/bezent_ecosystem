import React, { useState } from 'react';

export type RecordStatusId = 'verified' | 'pending' | 'expiring' | 'expired';

export interface RecordStatusItem {
  id: RecordStatusId;
  name: string;
  count: number;
  percentage?: number;
}

export interface RecordsKpiCardProps {
  /** Total centralized employee records */
  total?: number;
  /** Verified/Valid records count */
  verifiedCount?: number;
  /** Pending verification records count */
  pendingCount?: number;
  /** Expiring soon (within 30 days) count */
  expiringCount?: number;
  /** Expired records count */
  expiredCount?: number;
  /** Loading state indicator */
  loading?: boolean;
  /** Controlled hovered target for verification/testing ('verified' | 'pending' | 'expiring' | 'expired') */
  hoveredFolder?: RecordStatusId | null;
  /** Card click handler */
  onClick?: () => void;
  /** Folder click handler */
  onFolderClick?: (folder: RecordStatusItem) => void;
}

export const DEFAULT_RECORDS_TOTAL = 128;
export const DEFAULT_VERIFIED_COUNT = 96;
export const DEFAULT_PENDING_COUNT = 18;
export const DEFAULT_EXPIRING_COUNT = 10;
export const DEFAULT_EXPIRED_COUNT = 4;

/**
 * Premium Enterprise Records KPI Card (3D Isometric File Folders Stack)
 *
 * Minimal Heading + Big Number + 3D Isometric Folder Stack on the right.
 * - Left: "Records" heading + large total count
 * - Right: 60px × 60px 3D Isometric Folder Stack (4 diagonally staggered folders)
 *   - Folder 1 (Back, Top-Left): Expired Records (Coral Orange #F97316)
 *   - Folder 2 (Mid-Back): Expiring Soon (Sky Blue #0EA5E9)
 *   - Folder 3 (Mid-Front): Verified Records (Fresh Green #22C55E)
 *   - Folder 4 (Front, Bottom-Right): Pending Verification (Sunny Yellow #EAB308)
 * - Ultra-Stable Hover Architecture:
 *   - Stationary hit areas guarantee zero flicker/jitter during translation
 *   - Visual layer smoothly lifts translateY(-4px) with custom ambient glow
 *   - Unclipped Floating Badge displays exact count & status
 * - Zero application CSS, 100% design-system compliant
 */
export const RecordsKpiCard: React.FC<RecordsKpiCardProps> = ({
  total,
  verifiedCount,
  pendingCount,
  expiringCount,
  expiredCount,
  loading = false,
  hoveredFolder,
  onClick,
  onFolderClick,
}) => {
  const [internalHovered, setInternalHovered] = useState<RecordStatusId | null>(null);
  const activeHovered = hoveredFolder !== undefined ? hoveredFolder : internalHovered;

  const effectiveVerified = verifiedCount !== undefined ? verifiedCount : DEFAULT_VERIFIED_COUNT;
  const effectivePending = pendingCount !== undefined ? pendingCount : DEFAULT_PENDING_COUNT;
  const effectiveExpiring = expiringCount !== undefined ? expiringCount : DEFAULT_EXPIRING_COUNT;
  const effectiveExpired = expiredCount !== undefined ? expiredCount : DEFAULT_EXPIRED_COUNT;

  const computedTotal = effectiveVerified + effectivePending + effectiveExpiring + effectiveExpired;
  const effectiveTotal = total !== undefined ? total : computedTotal || DEFAULT_RECORDS_TOTAL;

  const getPercentage = (count: number) => {
    if (effectiveTotal <= 0) return 0;
    return Math.round((count / effectiveTotal) * 100);
  };

  const expiredFolder: RecordStatusItem = {
    id: 'expired',
    name: 'Expired Records',
    count: effectiveExpired,
    percentage: getPercentage(effectiveExpired),
  };

  const expiringFolder: RecordStatusItem = {
    id: 'expiring',
    name: 'Expiring Soon (< 30 days)',
    count: effectiveExpiring,
    percentage: getPercentage(effectiveExpiring),
  };

  const verifiedFolder: RecordStatusItem = {
    id: 'verified',
    name: 'Verified Records',
    count: effectiveVerified,
    percentage: getPercentage(effectiveVerified),
  };

  const pendingFolder: RecordStatusItem = {
    id: 'pending',
    name: 'Pending Verification',
    count: effectivePending,
    percentage: getPercentage(effectivePending),
  };

  const folders: RecordStatusItem[] = [
    expiredFolder,
    expiringFolder,
    verifiedFolder,
    pendingFolder,
  ];

  const hasHover = activeHovered !== null && activeHovered !== undefined;
  const hoveredItem = folders.find((f) => f.id === activeHovered);

  let tooltipText = '';
  if (hoveredItem) {
    if (hoveredItem.id === 'verified') {
      tooltipText = `Verified Records: ${hoveredItem.count.toLocaleString()} (${hoveredItem.percentage}%)`;
    } else if (hoveredItem.id === 'pending') {
      tooltipText = `Pending Verification: ${hoveredItem.count.toLocaleString()}`;
    } else if (hoveredItem.id === 'expiring') {
      tooltipText = `Expiring Soon (< 30 days): ${hoveredItem.count.toLocaleString()}`;
    } else {
      tooltipText = `Expired Records: ${hoveredItem.count.toLocaleString()} (Action Required)`;
    }
  }

  return (
    <div
      className="bezent-exec-kpi-card bezent-exec-kpi-card--records"
      onClick={onClick}
      role="region"
      aria-label="Workforce Compliance and Records"
    >
      <div className="bezent-kpi-records-layout">
        {/* Left Section: Small Heading at Top, Large Primary Number Below */}
        <div className="bezent-kpi-records-left">
          <div className="bezent-kpi-records-heading">
            {loading ? (
              <>
                <span className="bezent-sr-only">Records</span>
                <span className="bezent-wf-skeleton-shimmer bezent-wf-skeleton-kpi-heading" />
              </>
            ) : (
              'Records'
            )}
          </div>
          <div className="bezent-kpi-records-value">
            {loading ? (
              <span className="bezent-kpi-value-skeleton" aria-hidden="true" />
            ) : (
              effectiveTotal.toLocaleString()
            )}
          </div>
        </div>

        {/* Right Section: 3D Isometric File Folders Stack (60px × 60px) */}
        <div
          className="bezent-kpi-records-right"
          onMouseLeave={() => setInternalHovered(null)}
          onPointerLeave={() => setInternalHovered(null)}
          aria-label="File folders stack breakdown"
        >
          {loading ? (
            <span className="bezent-wf-skeleton-shimmer bezent-wf-skeleton-kpi-graphic--rect" />
          ) : (
            <>
              <div className="bezent-kpi-ambient-glow bezent-kpi-ambient-glow--amber" />
              {/* Floating Hover Badge: 100% unclipped, outside-card visibility */}
              <div
                className={`bezent-kpi-flow-badge bezent-kpi-records-tooltip ${hasHover ? 'is-visible' : ''}`}
                aria-live="polite"
              >
                {tooltipText}
              </div>

              {/* SVG Flat 2D Executive Folder + Status Index Tabs + Document Sheet */}
              <svg
                className="bezent-kpi-records-svg"
                viewBox="0 0 60 60"
                role="img"
                aria-label={`Records: ${folders.map((f) => `${f.name}: ${f.count}`).join(', ')}`}
              >
                <defs>
                  {/* Folder Back Plate Gradient */}
                  <linearGradient id="bezent-kpi-folder-back-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047857" />
                    <stop offset="100%" stopColor="#065f46" />
                  </linearGradient>
                  {/* Folder Front Pocket Gradient */}
                  <linearGradient id="bezent-kpi-folder-front-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>

                {/* Folder Base Back Cover */}
                <rect
                  x={8}
                  y={15}
                  width={44}
                  height={36}
                  rx={4}
                  className="bezent-kpi-folder-back-base"
                />

                {/* ── Tab 1: Expired Records (Coral Red) ── */}
                <g
                  className={`bezent-kpi-folder-item bezent-kpi-folder-item--expired ${
                    activeHovered === 'expired' ? 'is-hovered' : ''
                  } ${hasHover && activeHovered !== 'expired' ? 'is-dimmed' : ''}`}
                  onMouseEnter={() => setInternalHovered('expired')}
                  onMouseOver={() => setInternalHovered('expired')}
                  onPointerEnter={() => setInternalHovered('expired')}
                  onFocus={() => setInternalHovered('expired')}
                  onBlur={() => setInternalHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderClick?.(expiredFolder);
                    onClick?.();
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Expired Records: ${effectiveExpired} records`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onFolderClick?.(expiredFolder);
                      onClick?.();
                    }
                  }}
                >
                  {/* Stationary Fat Hit Area */}
                  <rect x={8} y={7} width={11} height={19} fill="transparent" />
                  <g className="bezent-kpi-folder-tab-visual bezent-kpi-folder-tab-visual--expired">
                    {/* Tab top */}
                    <path
                      d="M 9.5 15 L 9.5 11.5 C 9.5 10.1 10.6 9 12 9 L 16.5 9 C 17.9 9 19 10.1 19 11.5 L 19 15 Z"
                      className="bezent-kpi-folder-tab bezent-kpi-folder-tab--expired"
                    />
                    <circle cx={14.2} cy={12} r={1.2} fill="#ffffff" opacity={0.9} />
                  </g>
                </g>

                {/* ── Tab 2: Expiring Soon (< 30 days) (Amber) ── */}
                <g
                  className={`bezent-kpi-folder-item bezent-kpi-folder-item--expiring ${
                    activeHovered === 'expiring' ? 'is-hovered' : ''
                  } ${hasHover && activeHovered !== 'expiring' ? 'is-dimmed' : ''}`}
                  onMouseEnter={() => setInternalHovered('expiring')}
                  onMouseOver={() => setInternalHovered('expiring')}
                  onPointerEnter={() => setInternalHovered('expiring')}
                  onFocus={() => setInternalHovered('expiring')}
                  onBlur={() => setInternalHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderClick?.(expiringFolder);
                    onClick?.();
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Expiring Soon: ${effectiveExpiring} records`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onFolderClick?.(expiringFolder);
                      onClick?.();
                    }
                  }}
                >
                  <rect x={19} y={7} width={11} height={19} fill="transparent" />
                  <g className="bezent-kpi-folder-tab-visual bezent-kpi-folder-tab-visual--expiring">
                    <path
                      d="M 20 15 L 20 11.5 C 20 10.1 21.1 9 22.5 9 L 27 9 C 28.4 9 29.5 10.1 29.5 11.5 L 29.5 15 Z"
                      className="bezent-kpi-folder-tab bezent-kpi-folder-tab--expiring"
                    />
                    <circle cx={24.7} cy={12} r={1.2} fill="#ffffff" opacity={0.9} />
                  </g>
                </g>

                {/* ── Tab 3: Pending Verification (Sky Blue) ── */}
                <g
                  className={`bezent-kpi-folder-item bezent-kpi-folder-item--pending ${
                    activeHovered === 'pending' ? 'is-hovered' : ''
                  } ${hasHover && activeHovered !== 'pending' ? 'is-dimmed' : ''}`}
                  onMouseEnter={() => setInternalHovered('pending')}
                  onMouseOver={() => setInternalHovered('pending')}
                  onPointerEnter={() => setInternalHovered('pending')}
                  onFocus={() => setInternalHovered('pending')}
                  onBlur={() => setInternalHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderClick?.(pendingFolder);
                    onClick?.();
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Pending Verification: ${effectivePending} records`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onFolderClick?.(pendingFolder);
                      onClick?.();
                    }
                  }}
                >
                  <rect x={29.5} y={7} width={11} height={19} fill="transparent" />
                  <g className="bezent-kpi-folder-tab-visual bezent-kpi-folder-tab-visual--pending">
                    <path
                      d="M 30.5 15 L 30.5 11.5 C 30.5 10.1 31.6 9 33 9 L 37.5 9 C 38.9 9 40 10.1 40 11.5 L 40 15 Z"
                      className="bezent-kpi-folder-tab bezent-kpi-folder-tab--pending"
                    />
                    <circle cx={35.2} cy={12} r={1.2} fill="#ffffff" opacity={0.9} />
                  </g>
                </g>

                {/* ── Tab 4 & Primary Verified Records (Emerald Green) ── */}
                <g
                  className={`bezent-kpi-folder-item bezent-kpi-folder-item--verified ${
                    activeHovered === 'verified' ? 'is-hovered' : ''
                  } ${hasHover && activeHovered !== 'verified' ? 'is-dimmed' : ''}`}
                  onMouseEnter={() => setInternalHovered('verified')}
                  onMouseOver={() => setInternalHovered('verified')}
                  onPointerEnter={() => setInternalHovered('verified')}
                  onFocus={() => setInternalHovered('verified')}
                  onBlur={() => setInternalHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderClick?.(verifiedFolder);
                    onClick?.();
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Verified Records: ${effectiveVerified} records`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onFolderClick?.(verifiedFolder);
                      onClick?.();
                    }
                  }}
                >
                  <rect x={40} y={7} width={12} height={19} fill="transparent" />
                  <g className="bezent-kpi-folder-tab-visual bezent-kpi-folder-tab-visual--verified">
                    <path
                      d="M 41 15 L 41 11.5 C 41 10.1 42.1 9 43.5 9 L 48 9 C 49.4 9 50.5 10.1 50.5 11.5 L 50.5 15 Z"
                      className="bezent-kpi-folder-tab bezent-kpi-folder-tab--verified"
                    />
                    <path
                      d="M 44.2 12 L 45.2 13 L 47.2 11"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </g>

                {/* 📄 Document Paper Sheet: Always visible like Image 4, lifts smoothly on interaction */}
                <g
                  className={`bezent-kpi-folder-paper-sheet bezent-kpi-folder-sheet-peek ${
                    activeHovered ? `is-${activeHovered} is-lifted` : ''
                  }`}
                >
                  <rect
                    x={11}
                    y={11}
                    width={38}
                    height={28}
                    rx={2.5}
                    className="bezent-kpi-folder-doc-paper doc-card"
                  />
                  <rect x={14} y={14} width={11} height={2.2} rx={1} className="doc-badge" />
                  <rect x={40} y={14} width={6} height={2.2} rx={1} className="doc-chip" />
                  <rect
                    x={14}
                    y={18.5}
                    width={32}
                    height={1.2}
                    rx={0.6}
                    className="bezent-kpi-folder-doc-line"
                  />
                  <rect
                    x={14}
                    y={21.5}
                    width={25}
                    height={1.2}
                    rx={0.6}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                  <rect
                    x={14}
                    y={24.5}
                    width={18}
                    height={1.2}
                    rx={0.6}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                </g>

                {/* ── Front Pocket Cover (Scooped Executive Cut) ── */}
                <path
                  d="M 8 28.5 C 8 26.8 9.2 25.5 10.8 25.5 L 21 25.5 C 23.2 25.5 24.6 27 27 27 L 33 27 C 35.4 27 36.8 25.5 39 25.5 L 49.2 25.5 C 50.8 25.5 52 26.8 52 28.5 L 52 47.5 C 52 49.4 50.4 51 48.5 51 L 11.5 51 C 9.6 51 8 49.4 8 47.5 Z"
                  className="bezent-kpi-folder-front-pocket"
                />
                {/* Pocket Top Rim Highlight */}
                <path
                  d="M 10.8 26 L 21 26 C 23 26 24.4 27.5 27 27.5 L 33 27.5 C 35.6 27.5 37 26 39 26 L 49.2 26"
                  className="bezent-kpi-folder-front-rim"
                />

                {/* ── Executive Circular Verified Seal Badge (Center) ── */}
                <g
                  className="bezent-kpi-folder-seal"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderClick?.(verifiedFolder);
                    onClick?.();
                  }}
                  role="presentation"
                >
                  <circle cx={30} cy={39} r={6.5} className="bezent-kpi-folder-seal-bg" />
                  <circle cx={30} cy={39} r={5} className="bezent-kpi-folder-seal-inner" />
                  <path
                    d="M 28 39 L 29.4 40.4 L 32.5 37.3"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </>
          )}
        </div>
      </div>

      {/* Bottom Status Pill: Full card width, single line with zero-CLS skeleton */}
      <div
        className={`bezent-kpi-sub-pill bezent-kpi-sub-pill--records ${
          loading ? 'bezent-kpi-sub-pill--loading' : ''
        }`}
      >
        {loading ? (
          <span className="bezent-kpi-pill-skeleton" />
        ) : (
          <>
            <span className="bezent-kpi-sub-pill-dot" />
            {effectivePending + effectiveExpiring + effectiveExpired === 0
              ? 'All compliant'
              : `${effectivePending + effectiveExpiring + effectiveExpired} need attention`}
          </>
        )}
      </div>
    </div>
  );
};
