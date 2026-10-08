import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  type InputHTMLAttributes,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { BezentIcon } from '../../icons';
import './PhoneInput.css';

export type PhoneInputSize = 'sm' | 'md' | 'lg';

export interface CountryCodeOption {
  value: string;
  label: string;
  flag?: string;
}

export const COUNTRY_FLAG_MAP: Record<string, string> = {
  '+91': '🇮🇳',
  '+1': '🇺🇸',
  '+1-CA': '🇨🇦',
  '+44': '🇬🇧',
  '+971': '🇦🇪',
  '+65': '🇸🇬',
  '+61': '🇦🇺',
  '+49': '🇩🇪',
  '+33': '🇫🇷',
  '+81': '🇯🇵',
  '+86': '🇨🇳',
  '+966': '🇸🇦',
  '+974': '🇶🇦',
  '+968': '🇴🇲',
  '+965': '🇰🇼',
  '+973': '🇧🇭',
  '+60': '🇲🇾',
  '+62': '🇮🇩',
  '+63': '🇵🇭',
  '+64': '🇳🇿',
  '+27': '🇿🇦',
  '+41': '🇨🇭',
  '+31': '🇳🇱',
  '+46': '🇸🇪',
  '+47': '🇳🇴',
  '+45': '🇩🇰',
  '+353': '🇮🇪',
};

export function getCountryFlag(value: string, explicitFlag?: string): string {
  if (explicitFlag) return explicitFlag;
  return COUNTRY_FLAG_MAP[value] || '🌐';
}

export const DEFAULT_COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { value: '+91', label: '+91 (IN)', flag: '🇮🇳' },
  { value: '+1', label: '+1 (US)', flag: '🇺🇸' },
  { value: '+44', label: '+44 (UK)', flag: '🇬🇧' },
  { value: '+971', label: '+971 (UAE)', flag: '🇦🇪' },
  { value: '+65', label: '+65 (SG)', flag: '🇸🇬' },
  { value: '+61', label: '+61 (AU)', flag: '🇦🇺' },
  { value: '+49', label: '+49 (DE)', flag: '🇩🇪' },
  { value: '+33', label: '+33 (FR)', flag: '🇫🇷' },
  { value: '+81', label: '+81 (JP)', flag: '🇯🇵' },
  { value: '+1-CA', label: '+1 (CA)', flag: '🇨🇦' },
];

export interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'className'
> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: PhoneInputSize;
  countryCode?: string;
  defaultCountryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  countryCodeOptions?: CountryCodeOption[];
  className?: string;
}

/**
 * Standard BEZENT unified PhoneInput component.
 * Combines a small country code select area on the left with a primary
 * phone number text input in a single unified box container.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    label,
    helperText,
    error,
    size = 'md',
    countryCode,
    defaultCountryCode = '+91',
    onCountryCodeChange,
    countryCodeOptions = DEFAULT_COUNTRY_CODE_OPTIONS,
    id,
    disabled,
    className,
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    placeholder = 'Phone number',
    ...rest
  },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalCountryCode, setInternalCountryCode] = useState<string>(
    countryCode !== undefined ? countryCode : defaultCountryCode,
  );
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement | null>(null);

  // Sync internal country code if controlled
  useEffect(() => {
    if (countryCode !== undefined) {
      setInternalCountryCode(countryCode);
    }
  }, [countryCode]);

  const activeCountryCode = countryCode !== undefined ? countryCode : internalCountryCode;

  const selectedOption =
    countryCodeOptions.find((opt) => opt.value === activeCountryCode) ||
    countryCodeOptions.find((opt) => opt.value === '+91') ||
    countryCodeOptions[0];

  const inputId =
    id || (label ? `bezent-phone-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

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
      const items = listboxRef.current.querySelectorAll('.bezent-phone-input-option');
      const item = items[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, highlightedIndex]);

  const handleSelectCountry = useCallback(
    (opt: CountryCodeOption) => {
      if (disabled) return;

      if (countryCode === undefined) {
        setInternalCountryCode(opt.value);
      }
      setIsOpen(false);

      if (nativeSelectRef.current) {
        nativeSelectRef.current.value = opt.value;
        const event = new Event('change', { bubbles: true });
        Object.defineProperty(event, 'target', { writable: true, value: nativeSelectRef.current });
        nativeSelectRef.current.dispatchEvent(event);
      }

      onCountryCodeChange?.(opt.value);
    },
    [disabled, countryCode, onCountryCodeChange],
  );

  const toggleDropdown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsOpen((prev) => {
        const next = !prev;
        if (next) {
          const currentIndex = countryCodeOptions.findIndex(
            (opt) => opt.value === activeCountryCode,
          );
          setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
        return next;
      });
    },
    [disabled, countryCodeOptions, activeCountryCode],
  );

  const handleCountryKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < countryCodeOptions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(countryCodeOptions.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && countryCodeOptions[highlightedIndex]) {
        handleSelectCountry(countryCodeOptions[highlightedIndex]);
      } else {
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const currentFlag = getCountryFlag(activeCountryCode, selectedOption?.flag);

  return (
    <div
      ref={containerRef}
      className={`bezent-phone-input-wrapper bezent-phone-input-wrapper--${size} ${
        error ? 'has-error' : ''
      } ${disabled ? 'is-disabled' : ''} ${className || ''}`.trim()}
    >
      {label && (
        <label htmlFor={inputId} className="bezent-phone-input-label">
          {label}
        </label>
      )}

      <div className={`bezent-phone-input-box ${isOpen ? 'has-open-dropdown' : ''}`}>
        {/* Country Code Picker Area (Left) */}
        <div className={`bezent-phone-input-country ${isOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="bezent-phone-input-country-trigger"
            onClick={toggleDropdown}
            onKeyDown={handleCountryKeyDown}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label="Select Country Code"
          >
            <span className="bezent-phone-input-flag" aria-hidden="true">
              {currentFlag}
            </span>
            <span className="bezent-phone-input-code">
              {selectedOption ? selectedOption.label : activeCountryCode}
            </span>
            <span className="bezent-phone-input-chevron" aria-hidden="true">
              <BezentIcon name="chevronDown" size={13} />
            </span>
          </button>

          {/* Hidden native select for form integration / test queries */}
          <select
            ref={nativeSelectRef}
            tabIndex={-1}
            aria-hidden="true"
            className="bezent-phone-input-native-select"
            value={activeCountryCode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const matched = countryCodeOptions.find((opt) => opt.value === e.target.value);
              if (matched) handleSelectCountry(matched);
            }}
            disabled={disabled}
          >
            {countryCodeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Floating Options Dropdown */}
          {isOpen && (
            <ul
              ref={listboxRef}
              role="listbox"
              aria-label="Country Codes"
              className="bezent-phone-input-dropdown"
            >
              {countryCodeOptions.map((opt, idx) => {
                const isSelected = opt.value === activeCountryCode;
                const isHighlighted = idx === highlightedIndex;
                const flag = getCountryFlag(opt.value, opt.flag);
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`bezent-phone-input-option ${isSelected ? 'is-selected' : ''} ${
                      isHighlighted ? 'is-highlighted' : ''
                    }`.trim()}
                    onClick={() => handleSelectCountry(opt)}
                  >
                    <div className="bezent-phone-input-option-left">
                      <span className="bezent-phone-input-flag" aria-hidden="true">
                        {flag}
                      </span>
                      <span className="bezent-phone-input-option-label">{opt.label}</span>
                    </div>
                    {isSelected && <BezentIcon name="check" size={13} />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Remaining Big Area: Phone Number Input Field (Right) */}
        <input
          ref={ref}
          id={inputId}
          type="tel"
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className="bezent-phone-input-field"
          {...rest}
        />
      </div>

      {error ? (
        <span id={`${inputId}-error`} className="bezent-phone-input-feedback is-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={`${inputId}-helper`} className="bezent-phone-input-feedback">
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

export default PhoneInput;
