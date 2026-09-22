import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type CommonStatus =
  | 'new'
  | 'in_progress'
  | 'in-progress'
  | 'inProgress'
  | 'completed'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'on_hold'
  | 'on-hold'
  | 'onHold'
  | 'cancelled';

export interface BadgeProps {
  /** A count to display. Ignored if `dot` is true or `children` is provided. */
  count?: number;
  /** Caps the displayed count, showing `${max}+` beyond it. */
  max?: number;
  /** Renders a small dot instead of a count — for "unread" without a number. */
  dot?: boolean;
  /** Semantic color variant for status pills or labeled badges. */
  variant?: BadgeVariant;
  /** Size variant */
  size?: 'sm' | 'md';
  /** High-level business status name, automatically mapped to semantic variant and formatting. */
  status?: CommonStatus | string;
  /** Shows a subtle colored status dot next to label. */
  showDot?: boolean;
  /** Custom label content inside the pill. */
  children?: ReactNode;
  className?: string;
}

/** Map common business statuses to standard semantic design token variants */
function mapStatusToVariant(status: string): { variant: BadgeVariant; label: string } {
  const norm = status.toLowerCase().replace(/[\s_-]+/g, '');
  switch (norm) {
    case 'completed':
    case 'approved':
    case 'active':
    case 'done':
      return { variant: 'success', label: status.replace(/_/g, ' ') };

    case 'pending':
    case 'inprogress':
    case 'review':
    case 'onhold':
      return { variant: 'warning', label: status.replace(/_/g, ' ') };

    case 'rejected':
    case 'cancelled':
    case 'inactive':
    case 'failed':
      return { variant: 'danger', label: status.replace(/_/g, ' ') };

    case 'new':
    case 'open':
    case 'info':
      return { variant: 'info', label: status.replace(/_/g, ' ') };

    case 'draft':
    default:
      return { variant: 'neutral', label: status.replace(/_/g, ' ') };
  }
}

/**
 * Standard BEZENT Badge & StatusPill component.
 * Supports:
 *  - Classic unread dot / notification counter badge
 *  - Semantic StatusPill (e.g. Completed, Pending, Approved, Rejected)
 *  - Custom labeled pill with variants
 */
export function Badge({
  count,
  max = 99,
  dot,
  variant,
  size = 'md',
  status,
  showDot,
  children,
  className,
}: BadgeProps) {
  // If status is provided, render mapped pill
  if (status) {
    const { variant: mappedVariant, label } = mapStatusToVariant(status);
    return (
      <span
        className={`bezent-status-pill bezent-status-pill--${mappedVariant} bezent-status-pill--${size} ${className || ''}`.trim()}
      >
        {showDot && <span className="bezent-status-pill__dot" aria-hidden="true" />}
        <span className="bezent-status-pill__label">{label}</span>
      </span>
    );
  }

  // Classic corner unread dot
  if (dot) {
    return (
      <span
        className={`bezent-badge bezent-badge--dot ${className || ''}`.trim()}
        aria-hidden="true"
      />
    );
  }

  // Count badge
  if (typeof count === 'number') {
    if (count <= 0) {
      return null;
    }
    const display = count > max ? `${max}+` : String(count);
    return (
      <span
        className={`bezent-badge bezent-badge--${variant || 'danger'} bezent-badge--${size} ${className || ''}`.trim()}
        aria-hidden="true"
      >
        {display}
      </span>
    );
  }

  // If labeled pill with variant or children
  if (children || variant) {
    return (
      <span
        className={`bezent-status-pill bezent-status-pill--${variant || 'neutral'} bezent-status-pill--${size} ${className || ''}`.trim()}
      >
        {showDot && <span className="bezent-status-pill__dot" aria-hidden="true" />}
        <span className="bezent-status-pill__label">{children}</span>
      </span>
    );
  }

  return null;
}

/** Convenient alias for semantic status pills */
export const StatusPill = Badge;

export default Badge;
