import type { ReactNode } from 'react';
import { Badge, type BadgeVariant } from './Badge';

export type EmploymentStatusKey =
  | 'active'
  | 'pending_activation'
  | 'probation'
  | 'notice'
  | 'terminated'
  | 'suspended'
  | 'resigned'
  | 'inactive'
  | (string & {});

export interface StatusBadgeProps {
  /** The semantic status key (e.g. 'active', 'pending_activation', 'probation', 'inactive') */
  status: EmploymentStatusKey;
  /** Optional custom label override. If omitted, a clean title-cased label is used. */
  label?: ReactNode;
  /** Whether to show the subtle semantic dot indicator. Defaults to true. */
  showDot?: boolean;
  /** Size scale: sm (dense tables, 20px) or md (default, 22px). */
  size?: 'sm' | 'md';
  /** Additional CSS class */
  className?: string;
}

const STATUS_CONFIGS: Record<string, { variant: BadgeVariant; defaultLabel: string }> = {
  active: { variant: 'success', defaultLabel: 'Active' },
  pending_activation: { variant: 'warning', defaultLabel: 'Pending Activation' },
  probation: { variant: 'info', defaultLabel: 'Probation' },
  notice: { variant: 'warning', defaultLabel: 'Notice Period' },
  terminated: { variant: 'danger', defaultLabel: 'Terminated' },
  suspended: { variant: 'neutral', defaultLabel: 'Suspended' },
  resigned: { variant: 'neutral', defaultLabel: 'Resigned' },
  inactive: { variant: 'neutral', defaultLabel: 'Inactive' },
  present: { variant: 'success', defaultLabel: 'Present' },
  absent: { variant: 'danger', defaultLabel: 'Absent' },
  half_day: { variant: 'warning', defaultLabel: 'Half Day' },
  on_leave: { variant: 'info', defaultLabel: 'On Leave' },
  on_duty: { variant: 'info', defaultLabel: 'On-Duty' },
  holiday: { variant: 'neutral', defaultLabel: 'Holiday / Off' },
  incomplete: { variant: 'danger', defaultLabel: 'Incomplete' },
  not_checked_in: { variant: 'neutral', defaultLabel: 'Not Checked In' },
  finalized: { variant: 'success', defaultLabel: 'Finalized' },
  pending_review: { variant: 'warning', defaultLabel: 'Pending Review' },
  provisional: { variant: 'info', defaultLabel: 'Provisional' },
  locked: { variant: 'neutral', defaultLabel: 'Locked' },
};

/**
 * Reusable generic StatusBadge component.
 * Maps application statuses strictly to design token colors (WCAG AA compliant):
 * - Active = green (success token)
 * - Pending Activation = amber (warning token)
 * - Inactive / Terminated / Resigned = neutral/rose (danger/neutral token)
 * - Probation = info token
 */
export function StatusBadge({
  status,
  label,
  showDot = true,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  const normKey = status.toLowerCase().replace(/[\s-]+/g, '_');
  const config = STATUS_CONFIGS[normKey] ?? {
    variant: 'neutral' as BadgeVariant,
    defaultLabel: status.replace(/_/g, ' '),
  };

  return (
    <span
      className={`bezent-status-pill bezent-status-pill--${config.variant} bezent-status-pill--${size} ${className || ''}`.trim()}
    >
      {showDot && <span className="bezent-status-pill__dot" aria-hidden="true" />}
      <span className="bezent-status-pill__label">{label ?? config.defaultLabel}</span>
    </span>
  );
}

export default StatusBadge;
