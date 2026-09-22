import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import './Input.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'className'
> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: InputSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

/**
 * Standard BEZENT text input component. Fully accessible, token-styled,
 * with label, error message, helper text, and optional left/right icon slots.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, size = 'md', leftIcon, rightIcon, id, disabled, className, ...rest },
  ref,
) {
  const inputId =
    id || (label ? `bezent-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div
      className={`bezent-input-wrapper bezent-input-wrapper--${size} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className || ''}`.trim()}
    >
      {label && (
        <label htmlFor={inputId} className="bezent-input-label">
          {label}
        </label>
      )}

      <div className="bezent-input-box">
        {leftIcon && (
          <span className="bezent-input-icon bezent-input-icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className="bezent-input-field"
          {...rest}
        />

        {rightIcon && (
          <span className="bezent-input-icon bezent-input-icon--right" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </div>

      {error ? (
        <span id={`${inputId}-error`} className="bezent-input-feedback is-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={`${inputId}-helper`} className="bezent-input-feedback">
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

export default Input;
