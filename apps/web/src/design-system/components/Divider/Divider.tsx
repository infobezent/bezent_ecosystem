import type { HTMLAttributes } from 'react';
import './Divider.css';

export interface DividerProps extends Omit<HTMLAttributes<HTMLHRElement>, 'className'> {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Standard BEZENT Divider primitive.
 * Semantic separator line using token colors without inline CSS.
 */
export function Divider({
  orientation = 'horizontal',
  spacing = 'none',
  className,
  ...rest
}: DividerProps) {
  return (
    <hr
      className={`bezent-divider bezent-divider--${orientation} bezent-divider--spacing-${spacing} ${className || ''}`.trim()}
      {...rest}
    />
  );
}

export default Divider;
