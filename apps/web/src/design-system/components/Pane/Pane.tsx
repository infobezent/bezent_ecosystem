import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import './Pane.css';

export type PaneMaxHeight = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type PaneSurface = 'default' | 'neutral' | 'canvas' | 'white';
export type PaneBorder = 'none' | 'left' | 'right' | 'x' | 'all';
export type PaneSize = 'auto' | 'toolbox' | 'inspector' | 'fluid';

export interface PaneProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  /**
   * `y`: the pane scrolls vertically on its own (use together with
   * `maxHeight`); the page does not grow with its content.
   */
  scroll?: 'none' | 'y';
  /** Maximum height before the pane scrolls — tokenised sizes, never pixels. */
  maxHeight?: PaneMaxHeight;
  /** Keeps the pane in view while its scrolling ancestor scrolls. */
  sticky?: boolean;
  /** Visual surface variant */
  surface?: PaneSurface;
  /** Border positioning */
  border?: PaneBorder;
  /** Flex/sizing preset for editor panes */
  size?: PaneSize;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * Pane — a layout region that can scroll independently and/or stay in view.
 * Typical use: list/detail editors where a long list scrolls inside its pane
 * while the detail pane stays visible. A scrolling pane is keyboard-focusable
 * and should be given an accessible name (`aria-label`).
 */
export function Pane({
  scroll = 'none',
  maxHeight = 'none',
  sticky = false,
  surface = 'default',
  border = 'none',
  size = 'auto',
  as: Component = 'div',
  className,
  children,
  ...rest
}: PaneProps) {
  const scrolls = scroll === 'y';
  return (
    <Component
      className={[
        'bezent-pane',
        scrolls ? 'bezent-pane--scroll-y' : '',
        maxHeight !== 'none' ? `bezent-pane--max-${maxHeight}` : '',
        sticky ? 'bezent-pane--sticky' : '',
        surface !== 'default' ? `bezent-pane--surface-${surface}` : '',
        border !== 'none' ? `bezent-pane--border-${border}` : '',
        size !== 'auto' ? `bezent-pane--size-${size}` : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      // A scrollable region must be reachable by keyboard (axe: scrollable-region-focusable).
      tabIndex={scrolls ? 0 : undefined}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default Pane;
