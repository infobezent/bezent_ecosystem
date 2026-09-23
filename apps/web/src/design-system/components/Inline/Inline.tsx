import type { HTMLAttributes, ReactNode, ElementType } from 'react';
import './Inline.css';

export type InlineGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type InlineAlign = 'start' | 'center' | 'end' | 'baseline';
export type InlineJustify = 'start' | 'center' | 'end' | 'between';

export interface InlineProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  gap?: InlineGap;
  align?: InlineAlign;
  justify?: InlineJustify;
  wrap?: boolean;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT Inline layout primitive.
 * Pure horizontal flex row layout with tokenized gaps and wrap options.
 */
export function Inline({
  gap = 'sm',
  align = 'center',
  justify = 'start',
  wrap = false,
  as: Component = 'div',
  className,
  children,
  ...rest
}: InlineProps) {
  const classes = [
    'bezent-inline',
    wrap ? 'bezent-inline--wrap' : 'bezent-inline--nowrap',
    `bezent-inline--gap-${gap}`,
    `bezent-inline--align-${align}`,
    `bezent-inline--justify-${justify}`,
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

export default Inline;
