import type { HTMLAttributes, ReactNode, ElementType } from 'react';
import './Grid.css';

export type GridColumns = 1 | 2 | 3 | 4 | 'auto-fill' | 'auto-fit' | 'sidebar-main';
export type GridMinColWidth = 'sm' | 'md' | 'lg';
export type GridGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface GridProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  columns?: GridColumns;
  minColWidth?: GridMinColWidth;
  gap?: GridGap;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT Grid layout primitive.
 * Clean, responsive CSS Grid layout with responsive breakpoints and tokenized spacing.
 */
export function Grid({
  columns = 2,
  minColWidth = 'md',
  gap = 'md',
  as: Component = 'div',
  className,
  children,
  ...rest
}: GridProps) {
  const colClass =
    typeof columns === 'number'
      ? `bezent-grid--cols-${columns}`
      : `bezent-grid--cols-${columns}-${minColWidth}`;

  const classes = ['bezent-grid', colClass, `bezent-grid--gap-${gap}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}

export default Grid;
