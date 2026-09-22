import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { BezentIcon } from '../../icons';
import './Select.css';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'className'
> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: SelectSize;
  options?: SelectOption[];
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT dropdown select component. Native select semantics
 * with accessible focus states, custom arrow icon, and token styling.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helperText, error, size = 'md', options, id, disabled, className, children, ...rest },
  ref,
) {
  const selectId =
    id || (label ? `bezent-select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div
      className={`bezent-select-wrapper bezent-select-wrapper--${size} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className || ''}`.trim()}
    >
      {label && (
        <label htmlFor={selectId} className="bezent-select-label">
          {label}
        </label>
      )}

      <div className="bezent-select-box">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="bezent-select-field"
          {...rest}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <span className="bezent-select-arrow" aria-hidden="true">
          <BezentIcon name="chevronDown" size={14} color="currentColor" />
        </span>
      </div>

      {error ? (
        <span id={`${selectId}-error`} className="bezent-select-feedback is-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={`${selectId}-helper`} className="bezent-select-feedback">
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

export default Select;
