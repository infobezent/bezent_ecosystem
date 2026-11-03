import type { BadgeVariant } from '../../../../design-system/components';
import type { LeaveRequestStatus, LeaveSession } from '../types/leaveOperations.types';

export const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  cancellation_pending: 'Cancellation Pending',
};

export const STATUS_VARIANTS: Record<LeaveRequestStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  cancellation_pending: 'info',
};

export const sessionLabel = (session: LeaveSession | null) =>
  session === 'first_half' ? 'First half' : session === 'second_half' ? 'Second half' : 'Full day';

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const SHORT_FMT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const DATETIME_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** "05 Nov 2026" for an ISO date (read as a calendar date, no timezone shift). */
export const formatDate = (iso: string) => DATE_FMT.format(new Date(`${iso}T00:00:00`));

/** "05 Nov – 07 Nov 2026", or a single date for one-day leave. */
export function formatRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  return `${SHORT_FMT.format(new Date(`${start}T00:00:00`))} – ${formatDate(end)}`;
}

export const formatDateTime = (iso: string) => DATETIME_FMT.format(new Date(iso));

export const formatDays = (days: number) => `${days} day${days === 1 ? '' : 's'}`;

/** "Due in 5h" / "Overdue 2h" for an approval SLA. */
export function slaLabel(slaDueAt: string | null, slaBreachedAt: string | null, now = Date.now()) {
  if (!slaDueAt) return { text: 'No SLA', overdue: false };
  const diffHours = Math.round((new Date(slaDueAt).getTime() - now) / 3_600_000);
  if (slaBreachedAt || diffHours < 0) {
    return { text: `Overdue ${Math.abs(diffHours)}h`, overdue: true };
  }
  return { text: diffHours === 0 ? 'Due within 1h' : `Due in ${diffHours}h`, overdue: false };
}

export const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
