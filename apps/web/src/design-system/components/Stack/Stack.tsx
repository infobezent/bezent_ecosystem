import type { HTMLAttributes, ReactNode, ElementType } from 'react';
import './Stack.css';

export type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between';

export interface StackProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT Stack layout primitive.
 * Pure vertical flex layout consuming tokenized gaps without inline CSS.
 */
export function Stack({
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  as: Component = 'div',
  className,
  children,
  ...rest
}: StackProps) {
  const classes = [
    'bezent-stack',
    `bezent-stack--gap-${gap}`,
    `bezent-stack--align-${align}`,
    `bezent-stack--justify-${justify}`,
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

export default Stack;
