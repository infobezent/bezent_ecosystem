import type { HTMLAttributes, ReactNode } from 'react';
import './Actions.css';

export interface ActionsProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end' | 'between';
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  wrap?: boolean;
  children: ReactNode;
}

/**
 * Domain-neutral Actions primitive for clustering action buttons,
 * dialog footers, or toolbar action groups.
 */
export function Actions({
  align = 'end',
  gap = 'md',
  wrap = true,
  className,
  children,
  ...rest
}: ActionsProps) {
  return (
    <div
      className={`bezent-actions bezent-actions--align-${align} bezent-actions--gap-${gap} ${wrap ? 'is-wrapped' : ''} ${className || ''}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Actions;
