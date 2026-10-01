/**
 * Label — generic form control label.
 *
 * Wraps <label> with BEZENT design tokens and required-asterisk support.
 * Use inside <FormField> or standalone whenever a visible label is needed.
 */

import type { LabelHTMLAttributes, ElementType } from 'react';
import './Label.css';

export type LabelSize = 'sm' | 'md';
export type LabelWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface LabelProps extends Omit<LabelHTMLAttributes<HTMLElement>, 'className'> {
  /** Renders a required asterisk after the label text */
  required?: boolean;
  /** Dims the label for disabled contexts */
  disabled?: boolean;
  size?: LabelSize;
  weight?: LabelWeight;
  as?: ElementType;
  className?: string;
}

export function Label({
  required,
  disabled,
  size = 'md',
  weight = 'semibold',
  as: Component = 'label',
  className,
  children,
  ...rest
}: LabelProps) {
  const classes = [
    'bezent-label',
    `bezent-label--${size}`,
    `bezent-label--${weight}`,
    disabled ? 'bezent-label--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...rest}>
      {children}
      {required && (
        <span className="bezent-label__required" aria-hidden="true">
          *
        </span>
      )}
    </Component>
  );
}

export default Label;
