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

  let dynamicColorModifier = 'bezent-exec-kpi-card--green';
  if (hoveredItem) {
    if (hoveredItem.id === 'verified') {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-active';
    } else if (hoveredItem.id === 'pending') {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-probation';
    } else if (hoveredItem.id === 'expiring') {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-pending';
    } else {
      dynamicColorModifier = 'bezent-exec-kpi-card--dynamic-separated';
    }
  }

  return (
    <div
      className={`bezent-exec-kpi-card bezent-exec-kpi-card--records ${dynamicColorModifier}`}
      onClick={onClick}
      role="region"
      aria-label="Workforce Compliance and Records"
      title="Workforce Compliance, Records and Document Management"
    >
      <div className="bezent-kpi-records-layout">
        {/* Left Section: Small Heading at Top, Large Primary Number Below */}
        <div className="bezent-kpi-records-left">
          <div className="bezent-kpi-records-heading">Records</div>
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
          <div className="bezent-kpi-ambient-glow bezent-kpi-ambient-glow--amber" />
          {/* Floating Hover Badge: 100% unclipped, outside-card visibility */}
          <div
            className={`bezent-kpi-flow-badge bezent-kpi-records-tooltip ${hasHover ? 'is-visible' : ''}`}
            aria-live="polite"
          >
            {tooltipText}
          </div>

          {/* SVG Flat Vector Folder Stack (Simple, Premium, User-Friendly) */}
          <svg
            className="bezent-kpi-records-svg"
            viewBox="0 0 60 60"
            role="img"
            aria-label={`Records: ${folders.map((f) => `${f.name}: ${f.count}`).join(', ')}`}
          >
            <defs>
              {/* Folder Back Plate Path: rounded top-left tab, smooth slope */}
              <path
                id="bezent-kpi-folder-back-shape"
                d="M 0 3.5 C 0 1.6 1.6 0 3.5 0 L 14 0 C 15.8 0 17 1 18.2 2.5 L 19.5 4 C 20.3 5 21.2 5.5 22.8 5.5 L 31.5 5.5 C 33.4 5.5 35 7.1 35 9 L 35 29 C 35 30.7 33.7 32 32 32 L 3 32 C 1.3 32 0 30.7 0 29 Z"
              />
              {/* Folder Top Rim Highlight */}
              <path
                id="bezent-kpi-folder-back-rim"
                d="M 3.5 1 L 13.8 1 C 15.4 1 16.5 1.8 17.5 3 L 18.8 4.6 C 19.8 5.8 21 6.5 22.8 6.5 L 31.5 6.5"
              />
              {/* Front Pocket Flap: scooped profile covering bottom 60% */}
              <path
                id="bezent-kpi-folder-front-shape"
                d="M 0 14 C 0 12.5 1.2 11.2 2.8 11.2 L 13 11.2 C 14.5 11.2 15.6 12 16.6 13.2 L 18 14.8 C 19 16 20.2 16.8 22 16.8 L 32.2 16.8 C 33.8 16.8 35 18 35 19.6 L 35 29 C 35 30.7 33.7 32 32 32 L 3 32 C 1.3 32 0 30.7 0 29 Z"
              />
              {/* Front Pocket Top Rim Highlight */}
              <path
                id="bezent-kpi-folder-front-rim"
                d="M 3 12.2 L 12.8 12.2 C 14.2 12.2 15.2 12.9 16.1 14 L 17.4 15.5 C 18.4 16.7 19.7 17.5 21.8 17.5 L 32 17.5"
              />
            </defs>

            {/* Subtle Ground Contact Shadow */}
            <ellipse cx={29} cy={53} rx={23} ry={3} className="bezent-kpi-folder-ground-shadow" />

            {/* ── Folder 1 (Back, Top-Left): Expired Records (Coral Orange) ── */}
            <g
              className={`bezent-kpi-folder-item bezent-kpi-folder-item--expired ${
                activeHovered === 'expired' ? 'is-hovered' : ''
              } ${hasHover && activeHovered !== 'expired' ? 'is-dimmed' : ''}`}
              transform="translate(6, 6)"
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
              {/* Stationary Fat Hit Area: Guarantees zero hover flicker */}
              <rect x={0} y={0} width={35} height={32} fill="transparent" />

              <g className="bezent-kpi-folder-visual">
                <use href="#bezent-kpi-folder-back-shape" className="folder-back" />
                <use href="#bezent-kpi-folder-back-rim" className="bezent-kpi-folder-rim" />

                {/* 📄 Document Paper Sheet: Tucked inside, peeks out smoothly on hover */}
                <g className="bezent-kpi-folder-paper-sheet bezent-kpi-folder-sheet-peek">
                  <rect
                    x={6.5}
                    y={11.5}
                    width={22}
                    height={17}
                    rx={2}
                    className="bezent-kpi-folder-doc-paper doc-card"
                  />
                  <rect x={9} y={14} width={7} height={1.6} rx={0.8} className="doc-badge" />
                  <rect
                    x={9}
                    y={17.2}
                    width={17}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line"
                  />
                  <rect
                    x={9}
                    y={19.7}
                    width={13}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                  <rect
                    x={9}
                    y={22.2}
                    width={15}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                </g>

                <use href="#bezent-kpi-folder-front-shape" className="folder-front" />
                <use href="#bezent-kpi-folder-front-rim" className="bezent-kpi-folder-rim" />
              </g>
            </g>

            {/* ── Folder 2 (Mid-Back): Expiring Soon (Sky Blue) ── */}
            <g
              className={`bezent-kpi-folder-item bezent-kpi-folder-item--expiring ${
                activeHovered === 'expiring' ? 'is-hovered' : ''
              } ${hasHover && activeHovered !== 'expiring' ? 'is-dimmed' : ''}`}
              transform="translate(9.5, 9.5)"
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
              <rect x={0} y={0} width={35} height={32} fill="transparent" />

              <g className="bezent-kpi-folder-visual">
                <use href="#bezent-kpi-folder-back-shape" className="folder-back" />
                <use href="#bezent-kpi-folder-back-rim" className="bezent-kpi-folder-rim" />

                <g className="bezent-kpi-folder-paper-sheet bezent-kpi-folder-sheet-peek">
                  <rect
                    x={6.5}
                    y={11.5}
                    width={22}
                    height={17}
                    rx={2}
                    className="bezent-kpi-folder-doc-paper doc-card"
                  />
                  <rect x={9} y={14} width={7} height={1.6} rx={0.8} className="doc-badge" />
                  <rect
                    x={9}
                    y={17.2}
                    width={17}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line"
                  />
                  <rect
                    x={9}
                    y={19.7}
                    width={13}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                  <rect
                    x={9}
                    y={22.2}
                    width={15}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                </g>

                <use href="#bezent-kpi-folder-front-shape" className="folder-front" />
                <use href="#bezent-kpi-folder-front-rim" className="bezent-kpi-folder-rim" />
              </g>
            </g>

            {/* ── Folder 3 (Mid-Front): Verified Records (Fresh Green) ── */}
            <g
              className={`bezent-kpi-folder-item bezent-kpi-folder-item--verified ${
                activeHovered === 'verified' ? 'is-hovered' : ''
              } ${hasHover && activeHovered !== 'verified' ? 'is-dimmed' : ''}`}
              transform="translate(13, 13)"
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
              <rect x={0} y={0} width={35} height={32} fill="transparent" />

              <g className="bezent-kpi-folder-visual">
                <use href="#bezent-kpi-folder-back-shape" className="folder-back" />
                <use href="#bezent-kpi-folder-back-rim" className="bezent-kpi-folder-rim" />

                <g className="bezent-kpi-folder-paper-sheet bezent-kpi-folder-sheet-peek">
                  <rect
                    x={6.5}
                    y={11.5}
                    width={22}
                    height={17}
                    rx={2}
                    className="bezent-kpi-folder-doc-paper doc-card"
                  />
                  <rect x={9} y={14} width={7} height={1.6} rx={0.8} className="doc-badge" />
                  <rect
                    x={9}
                    y={17.2}
                    width={17}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line"
                  />
                  <rect
                    x={9}
                    y={19.7}
                    width={13}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                  <rect
                    x={9}
                    y={22.2}
                    width={15}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                </g>

                <use href="#bezent-kpi-folder-front-shape" className="folder-front" />
                <use href="#bezent-kpi-folder-front-rim" className="bezent-kpi-folder-rim" />
              </g>
            </g>

            {/* ── Folder 4 (Front, Bottom-Right): Pending Verification (Sunny Yellow) ── */}
            <g
              className={`bezent-kpi-folder-item bezent-kpi-folder-item--pending ${
                activeHovered === 'pending' ? 'is-hovered' : ''
              } ${hasHover && activeHovered !== 'pending' ? 'is-dimmed' : ''}`}
              transform="translate(16.5, 16.5)"
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
              <rect x={0} y={0} width={35} height={32} fill="transparent" />

              <g className="bezent-kpi-folder-visual">
                <use href="#bezent-kpi-folder-back-shape" className="folder-back" />
                <use href="#bezent-kpi-folder-back-rim" className="bezent-kpi-folder-rim" />

                <g className="bezent-kpi-folder-paper-sheet bezent-kpi-folder-sheet-peek">
                  <rect
                    x={6.5}
                    y={11.5}
                    width={22}
                    height={17}
                    rx={2}
                    className="bezent-kpi-folder-doc-paper doc-card"
                  />
                  <rect x={9} y={14} width={7} height={1.6} rx={0.8} className="doc-badge" />
                  <rect
                    x={9}
                    y={17.2}
                    width={17}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line"
                  />
                  <rect
                    x={9}
                    y={19.7}
                    width={13}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                  <rect
                    x={9}
                    y={22.2}
                    width={15}
                    height={1.1}
                    rx={0.55}
                    className="bezent-kpi-folder-doc-line--muted"
                  />
                </g>

                <use href="#bezent-kpi-folder-front-shape" className="folder-front" />
                <use href="#bezent-kpi-folder-front-rim" className="bezent-kpi-folder-rim" />
              </g>
            </g>
          </svg>
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
            Compliant
          </>
        )}
      </div>
    </div>
  );
};
