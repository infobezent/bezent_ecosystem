import { forwardRef, type TextareaHTMLAttributes } from 'react';
import './Input.css';

export interface TextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className'
> {
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
}

/**
 * Standard BEZENT multi-line textarea with label and validation states.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helperText, error, id, disabled, className, ...rest },
  ref,
) {
  const inputId =
    id || (label ? `bezent-textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div
      className={`bezent-input-wrapper ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className || ''}`.trim()}
    >
      {label && (
        <label htmlFor={inputId} className="bezent-input-label">
          {label}
        </label>
      )}

      <div className="bezent-input-box bezent-textarea-box">
        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="bezent-input-field bezent-textarea-field"
          {...rest}
        />
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

export default Textarea;
