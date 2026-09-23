import type { HTMLAttributes, ReactNode } from 'react';
import './FormGrid.css';

export interface FormGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT FormGrid primitive.
 * Automatically aligns form inputs in 1, 2, or 3 columns with responsive stacking on tablet/mobile.
 */
export function FormGrid({ columns = 2, gap = 'md', className, children, ...rest }: FormGridProps) {
  const classes = [
    'bezent-form-grid',
    `bezent-form-grid--cols-${columns}`,
    `bezent-form-grid--gap-${gap}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export interface FieldGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  label?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  helperText?: ReactNode;
  error?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT FieldGroup primitive.
 * Consistent layout for label, required indicator, input control, and helper/error feedback.
 */
export function FieldGroup({
  label,
  required,
  htmlFor,
  helperText,
  error,
  className,
  children,
  ...rest
}: FieldGroupProps) {
  return (
    <div className={`bezent-field-group ${className || ''}`.trim()} {...rest}>
      {label && (
        <label htmlFor={htmlFor} className="bezent-field-group__label">
          {label}
          {required && (
            <span className="bezent-field-group__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <div className="bezent-field-group__error" role="alert">
          {error}
        </div>
      ) : helperText ? (
        <div className="bezent-field-group__helper">{helperText}</div>
      ) : null}
    </div>
  );
}

export default FormGrid;
