import { forwardRef, type InputHTMLAttributes } from 'react';
import { BezentIcon } from '../../icons';
import './Input.css';

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'className'
> {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill';
  onClear?: () => void;
  className?: string;
}

/**
 * Standard BEZENT search input with integrated search icon and optional clear button.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    size = 'md',
    shape = 'rounded',
    value,
    onChange,
    onClear,
    placeholder = 'Search...',
    className,
    disabled,
    ...rest
  },
  ref,
) {
  const hasValue = Boolean(value);
  const shapeClass = shape === 'pill' ? 'bezent-input-wrapper--pill' : '';

  return (
    <div
      className={`bezent-input-wrapper bezent-search-wrapper bezent-input-wrapper--${size} ${shapeClass} ${disabled ? 'is-disabled' : ''} ${className || ''}`.trim()}
    >
      <div className="bezent-input-box bezent-search-box">
        <span className="bezent-input-icon bezent-input-icon--left" aria-hidden="true">
          <BezentIcon name="search" size={16} color="currentColor" />
        </span>

        <input
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className="bezent-input-field bezent-search-field"
          {...rest}
        />

        {hasValue && onClear && !disabled && (
          <button
            type="button"
            className="bezent-search-clear-btn"
            onClick={onClear}
            aria-label="Clear search"
          >
            <BezentIcon name="close" size={14} color="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
});

export default SearchInput;
