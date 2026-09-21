import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip, type TooltipDirection } from '../Tooltip';
import './IconButton.css';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'children'
> {
  /** Icon content — typically a `<BezentIcon>`, but not required to be. */
  children: ReactNode;
  /**
   * Accessible name. Required — an icon-only control has no other text
   * content for assistive technology, and this is also shown as the
   * hover tooltip (see docs/architecture/DESIGN-SYSTEM-COMPONENTS.md).
   */
  label: string;
  /** Selected/open state (e.g. the panel this button toggles is open). */
  active?: boolean;
  tooltipDirection?: TooltipDirection;
  /**
   * `ghost` (default): transparent 36px control (old NavIconBtn).
   * `solid`: 34px brand-filled control (old Quick Create "+" button).
   */
  variant?: 'ghost' | 'solid';
}

/**
 * The canonical BEZENT icon-only button. Source: the old approved UI's
 * `NavIconBtn` (`App.tsx` lines 515-546) — 36×36, 10px radius,
 * default/hover/selected background states, and a built-in tooltip on
 * hover (suppressed while `active`, matching the old behavior). Used for
 * every icon-only top-nav control (Settings, App Launcher) in the old UI.
 *
 * Deliberately generic: it carries no navigation-specific behavior (no
 * routing, no knowledge of what it toggles) — the consumer supplies an
 * icon and an `onClick`.
 */
export function IconButton({
  children,
  label,
  active = false,
  tooltipDirection = 'down',
  variant = 'ghost',
  onMouseEnter,
  onMouseLeave,
  ...rest
}: IconButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="bezent-icon-btn-anchor">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={`bezent-icon-btn bezent-icon-btn--${variant} ${active ? 'is-active' : ''}`.trim()}
        onMouseEnter={(event) => {
          setHovered(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          setHovered(false);
          onMouseLeave?.(event);
        }}
        {...rest}
      >
        {children}
      </button>
      {hovered && !active && <Tooltip label={label} direction={tooltipDirection} />}
    </div>
  );
}

export default IconButton;
