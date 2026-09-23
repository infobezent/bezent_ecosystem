/**
 * Label — generic form control label.
 *
 * Wraps <label> with BEZENT design tokens and required-asterisk support.
 * Use inside <FormField> or standalone whenever a visible label is needed.
 */

import type { LabelHTMLAttributes } from 'react';
import './Label.css';

export type LabelSize = 'sm' | 'md';

export interface LabelProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'className'> {
  /** Renders a required asterisk after the label text */
  required?: boolean;
  /** Dims the label for disabled contexts */
  disabled?: boolean;
  size?: LabelSize;
  className?: string;
}

export function Label({
  required,
  disabled,
  size = 'md',
  className,
  children,
  ...rest
}: LabelProps) {
  const classes = [
    'bezent-label',
    `bezent-label--${size}`,
    disabled ? 'bezent-label--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={classes} {...rest}>
      {children}
      {required && (
        <span className="bezent-label__required" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export default Label;
