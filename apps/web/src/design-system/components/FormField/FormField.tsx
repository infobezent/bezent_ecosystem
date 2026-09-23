/**
 * FormField — composes Label + control slot + helper text + error message.
 *
 * This is the canonical wrapper for every form control in BEZENT.
 * It eliminates 100+ ad-hoc `__field` / `__label` / `__required` patterns
 * scattered across EmployeeRegistration and other large forms.
 *
 * Usage:
 *   <FormField label="First Name" htmlFor="firstName" required error={errors.firstName}>
 *     <Input id="firstName" ... />
 *   </FormField>
 */

import type { ReactNode } from 'react';
import { Label } from '../Label';
import './FormField.css';

export interface FormFieldProps {
  /** Visible label text */
  label?: string;
  /** Custom label node — overrides `label` string when provided */
  labelNode?: ReactNode;
  /** Associates the label with the control via htmlFor */
  htmlFor?: string;
  /** Appends a required asterisk to the label */
  required?: boolean;
  /** Displays helper text below the control */
  helperText?: string;
  /** Displays an error message below the control (overrides helperText) */
  error?: string;
  /** Dims the label for disabled controls */
  disabled?: boolean;
  /** Layout orientation — 'vertical' stacks label above control (default) */
  orientation?: 'vertical' | 'horizontal';
  /** Passed to the wrapping element */
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  labelNode,
  htmlFor,
  required,
  helperText,
  error,
  disabled,
  orientation = 'vertical',
  className,
  children,
}: FormFieldProps) {
  const hasError = Boolean(error);
  const classes = [
    'bezent-form-field',
    `bezent-form-field--${orientation}`,
    hasError ? 'bezent-form-field--error' : '',
    disabled ? 'bezent-form-field--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const helperOrError = hasError ? error : helperText;
  const helperClass = hasError
    ? 'bezent-form-field__helper bezent-form-field__helper--error'
    : 'bezent-form-field__helper';

  return (
    <div className={classes}>
      {(label || labelNode) && (
        <Label htmlFor={htmlFor} required={required} disabled={disabled}>
          {labelNode ?? label}
        </Label>
      )}
      <div className="bezent-form-field__control">{children}</div>
      {helperOrError && (
        <p className={helperClass} role={hasError ? 'alert' : undefined}>
          {helperOrError}
        </p>
      )}
    </div>
  );
}

export default FormField;
