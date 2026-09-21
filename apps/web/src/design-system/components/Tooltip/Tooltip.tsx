import './Tooltip.css';

export type TooltipDirection = 'left' | 'right' | 'up' | 'down';

export interface TooltipProps {
  label: string;
  direction?: TooltipDirection;
}

/**
 * BEZENT Tooltip — small floating label, positioned relative to a
 * `position: relative` parent via plain CSS (no positioning library).
 * Faithfully extracted from the old approved UI's `App.tsx` `Tooltip`
 * (lines 200-222) — see docs/architecture/DESIGN-SYSTEM-COMPONENTS.md.
 *
 * This component only renders the floating label — it does not manage its
 * own visibility. The consumer (e.g. `IconButton`) decides when to mount
 * it, typically on hover, and must not use it as a replacement for a real
 * accessible name (see docs/architecture/DESIGN-SYSTEM-COMPONENTS.md
 * §accessibility).
 *
 * The old UI never used a positioning library (no such dependency existed
 * in its `package.json`) — plain CSS offsets relative to the parent are
 * exactly what's evidenced, so none is introduced here either.
 */
export function Tooltip({ label, direction = 'left' }: TooltipProps) {
  return (
    <div role="tooltip" className={`bezent-tooltip bezent-tooltip--${direction}`}>
      {label}
    </div>
  );
}

export default Tooltip;
