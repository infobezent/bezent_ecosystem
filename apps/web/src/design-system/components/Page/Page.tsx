import type { HTMLAttributes, ReactNode, ElementType } from 'react';
import './Page.css';

export interface PageProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  maxWidth?: 'default' | 'narrow' | 'full';
  gap?: 'none' | 'sm' | 'md' | 'lg';
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT Page layout container.
 * Canonical page workspace canvas providing standard responsive padding and max-widths.
 */
export function Page({
  maxWidth = 'default',
  gap = 'md',
  as: Component = 'div',
  className,
  children,
  ...rest
}: PageProps) {
  const classes = [
    'bezent-page',
    `bezent-page--max-width-${maxWidth}`,
    `bezent-page--gap-${gap}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}

export default Page;
