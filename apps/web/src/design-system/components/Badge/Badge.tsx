import './Badge.css';

export interface BadgeProps {
  /** A count to display. Ignored if `dot` is true. */
  count?: number;
  /** Caps the displayed count, showing `${max}+` beyond it. */
  max?: number;
  /** Renders a small dot instead of a count — for "unread" without a number. */
  dot?: boolean;
}

/**
 * A small circular count/dot indicator, meant to sit on the corner of
 * whatever it's attached to (an icon, an avatar, ...). Source: the old
 * approved UI's notification-bell unread badge (`App.tsx` lines 349-369)
 * — generalized into a standalone, composable primitive (not tied to
 * notifications) per this phase's instructions. A future notification
 * counter wraps this component rather than reimplementing it.
 *
 * Positioning is the consumer's responsibility (Badge renders as a
 * normal inline element) — the old instance's `position: absolute`
 * placement was specific to sitting on a 36px bell button and isn't
 * assumed here.
 *
 * `count={0}` and no `dot` renders nothing, matching the old UI's
 * `unreadCount > 0` guard.
 */
export function Badge({ count, max = 99, dot = false }: BadgeProps) {
  if (dot) {
    return <span className="bezent-badge bezent-badge--dot" aria-hidden="true" />;
  }

  if (!count || count <= 0) {
    return null;
  }

  const display = count > max ? `${max}+` : String(count);

  return (
    <span className="bezent-badge" aria-hidden="true">
      {display}
    </span>
  );
}

export default Badge;
