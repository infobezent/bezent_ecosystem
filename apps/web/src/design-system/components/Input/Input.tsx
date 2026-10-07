import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
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

  const [internalHasValue, setInternalHasValue] = useState<boolean>(() => {
    return Boolean(rest.value || rest.defaultValue);
  });
  const [hasTyped, setHasTyped] = useState<boolean>(false);

  const isControlled = rest.value !== undefined;
  const hasValue = isControlled ? Boolean(rest.value) : internalHasValue;
  const isEmpty = !hasValue && !hasTyped;

  const isDateType = rest.type === 'date';
  const computedMax = isDateType ? (rest.max ?? '9999-12-31') : rest.max;
  const computedMin = isDateType ? (rest.min ?? '1900-01-01') : rest.min;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDateType && e.target.value) {
      const parts = e.target.value.split('-');
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].slice(0, 4);
        e.target.value = parts.join('-');
      }
    }
    if (!isControlled) {
      setInternalHasValue(Boolean(e.target.value));
    }
    if (e.target.value) {
      setHasTyped(true);
    } else {
      setHasTyped(false);
    }
    rest.onChange?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    rest.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isControlled) {
      setInternalHasValue(Boolean(val));
    }
    if (!val) {
      setHasTyped(false);
    }
    rest.onBlur?.(e);
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (isDateType && target.value) {
      const parts = target.value.split('-');
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].slice(0, 4);
        target.value = parts.join('-');
      }
    }
    const val = target.value;
    if (!isControlled) {
      setInternalHasValue(Boolean(val));
    }
    if (val) {
      setHasTyped(true);
    }
    rest.onInput?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (rest.type === 'date' || rest.type === 'time') {
      if (/^[0-9]$/.test(e.key)) {
        setHasTyped(true);
      }
    }
    rest.onKeyDown?.(e);
  };

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
          className={`bezent-input-field ${isEmpty ? 'bezent-input-field--empty' : ''}`.trim()}
          {...rest}
          max={computedMax}
          min={computedMin}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
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
