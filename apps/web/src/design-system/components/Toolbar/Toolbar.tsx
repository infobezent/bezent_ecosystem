import type { HTMLAttributes, ReactNode } from 'react';
import './Toolbar.css';

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  left?: ReactNode;
  right?: ReactNode;
  align?: 'center' | 'start' | 'end';
  children?: ReactNode;
}

/**
 * Domain-neutral Toolbar primitive for grouping filter controls,
 * search bars, tabs, or bulk actions across any BEZENT application.
 */
export function Toolbar({
  left,
  right,
  align = 'center',
  className,
  children,
  ...rest
}: ToolbarProps) {
  return (
    <div
      className={`bezent-toolbar bezent-toolbar--align-${align} ${className || ''}`.trim()}
      {...rest}
    >
      {left && <div className="bezent-toolbar__left">{left}</div>}
      {children}
      {right && <div className="bezent-toolbar__right">{right}</div>}
    </div>
  );
}

export default Toolbar;
