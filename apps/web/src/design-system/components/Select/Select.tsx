import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Children,
  isValidElement,
  type SelectHTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
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
  placeholder?: string;
  size?: SelectSize;
  width?: 'full' | 'auto';
  options?: SelectOption[];
  className?: string;
  children?: ReactNode;
}

function getTextFromReactNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getTextFromReactNode).join('');
  }
  if (isValidElement(node) && node.props && (node.props as { children?: ReactNode }).children) {
    return getTextFromReactNode((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function extractOptions(children: ReactNode): SelectOption[] {
  const extracted: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      if (child.type === 'option') {
        const childProps = child.props as {
          value?: string | number;
          children?: ReactNode;
          disabled?: boolean;
        };
        const labelText = getTextFromReactNode(childProps.children);
        extracted.push({
          value: childProps.value !== undefined ? childProps.value : labelText,
          label: labelText || String(childProps.value ?? ''),
          disabled: childProps.disabled,
        });
      } else if (child.type === 'optgroup') {
        const groupProps = child.props as { children?: ReactNode };
        if (groupProps.children) {
          extracted.push(...extractOptions(groupProps.children));
        }
      }
    }
  });
  return extracted;
}

/**
 * BEZENT Custom Themed Select component.
 * Features a custom floating popover matching the BEZENT color theme,
 * full keyboard navigation, accessible semantics, and full backwards
 * compatibility with native select forms and tests.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    helperText,
    error,
    placeholder = 'Select option...',
    size = 'md',
    width = 'full',
    options: optionsProp,
    id,
    disabled,
    className,
    value,
    defaultValue,
    onChange,
    children,
    ...rest
  },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string | number>(
    value !== undefined
      ? (value as string | number)
      : defaultValue !== undefined
        ? (defaultValue as string | number)
        : '',
  );
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement | null>(null);

  // Sync internal state if controlled value changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value as string | number);
    }
  }, [value]);

  // Extract options from options prop or <option>/<optgroup> children
  const parsedOptions: SelectOption[] = useMemo(() => {
    if (optionsProp && optionsProp.length > 0) {
      return optionsProp;
    }
    return extractOptions(children);
  }, [optionsProp, children]);

  const currentValue = value !== undefined ? (value as string | number) : internalValue;

  // Selected option label
  const selectedOption = parsedOptions.find((opt) => String(opt.value) === String(currentValue));

  const selectId =
    id || (label ? `bezent-select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent | PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('.bezent-select-option');
      const item = items[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, highlightedIndex]);

  const handleSelect = useCallback(
    (opt: SelectOption) => {
      if (opt.disabled || disabled) return;

      if (value === undefined) {
        setInternalValue(opt.value);
      }
      setIsOpen(false);

      if (nativeSelectRef.current) {
        nativeSelectRef.current.value = String(opt.value);
        // Trigger React onChange
        const event = new Event('change', { bubbles: true });
        Object.defineProperty(event, 'target', { writable: true, value: nativeSelectRef.current });
        nativeSelectRef.current.dispatchEvent(event);
      }

      if (onChange) {
        const syntheticEvent = {
          target: {
            value: String(opt.value),
            name: rest.name,
            id: selectId,
          },
          currentTarget: {
            value: String(opt.value),
            name: rest.name,
            id: selectId,
          },
          persist: () => {},
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;

        onChange(syntheticEvent);
      }
    },
    [disabled, value, onChange, rest.name, selectId],
  );

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        const currentIndex = parsedOptions.findIndex(
          (opt) => String(opt.value) === String(currentValue),
        );
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      return next;
    });
  }, [disabled, parsedOptions, currentValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < parsedOptions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(parsedOptions.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && parsedOptions[highlightedIndex]) {
        handleSelect(parsedOptions[highlightedIndex]);
      } else {
        toggleDropdown();
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const setNativeRef = (el: HTMLSelectElement | null) => {
    nativeSelectRef.current = el;
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`bezent-select-wrapper bezent-select-wrapper--${size} bezent-select-wrapper--width-${width} ${
        error ? 'has-error' : ''
      } ${disabled ? 'is-disabled' : ''} ${isOpen ? 'is-open' : ''} ${className || ''}`.trim()}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label htmlFor={selectId} className="bezent-select-label">
          {label}
        </label>
      )}

      {/* Hidden Native Select to support React form state, testing queries, and submit */}
      <select
        ref={setNativeRef}
        id={selectId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className="bezent-select-native"
        value={currentValue}
        onChange={(e) => {
          setInternalValue(e.target.value);
          onChange?.(e);
        }}
        tabIndex={-1}
        aria-hidden="true"
        {...rest}
      >
        {optionsProp
          ? optionsProp.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>

      {/* Custom Themed Select Box Trigger */}
      <div
        className={`bezent-select-box ${isOpen ? 'is-active' : ''}`}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen && selectId ? `${selectId}-listbox` : undefined}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={toggleDropdown}
      >
        <span
          className={`bezent-select-display ${
            !selectedOption || selectedOption.value === '' ? 'is-placeholder' : ''
          }`}
        >
          {selectedOption && selectedOption.label ? selectedOption.label : placeholder}
        </span>

        <span className={`bezent-select-arrow ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          <BezentIcon name="chevronDown" size={14} color="currentColor" />
        </span>
      </div>

      {/* Custom Themed Dropdown Menu Popover */}
      {isOpen && (
        <div className="bezent-select-dropdown" role="presentation">
          <ul
            id={selectId ? `${selectId}-listbox` : undefined}
            ref={listboxRef}
            className="bezent-select-dropdown-list"
            role="listbox"
            tabIndex={-1}
          >
            {parsedOptions.length === 0 ? (
              <li className="bezent-select-option is-empty">No options</li>
            ) : (
              parsedOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(currentValue);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.value}
                    className={`bezent-select-option ${isSelected ? 'is-selected' : ''} ${
                      isHighlighted ? 'is-highlighted' : ''
                    } ${opt.disabled ? 'is-disabled' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <span className="bezent-select-option-check" aria-hidden="true">
                      {isSelected && <BezentIcon name="check" size={14} color="currentColor" />}
                    </span>
                    <span className="bezent-select-option-label">{opt.label}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

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
