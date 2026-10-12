import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  type ChangeEvent,
} from 'react';
import {
  getAllCountries,
  getCountry,
  searchCountries,
  parsePhoneNumber,
  type CountryInfo,
  type ParsedPhoneNumber,
} from '../../../shared/globalization';
import { CountryFlag } from '../CountryFlag';
import { BezentIcon } from '../../icons';
import './InternationalPhoneInput.css';

export interface InternationalPhoneInputProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string; // Raw input or national number or E.164
  countryCode?: string; // Default or controlled country (e.g. "IN", "US")
  defaultCountry?: string; // Alias for countryCode
  onChange?: (value: string, parsed: ParsedPhoneNumber) => void;
  onCountryCodeChange?: (countryCode: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const InternationalPhoneInput = forwardRef<
  HTMLInputElement,
  InternationalPhoneInputProps
>(function InternationalPhoneInput(
  {
    id,
    name,
    label,
    value = '',
    countryCode,
    defaultCountry,
    onChange,
    onCountryCodeChange,
    placeholder = 'Enter phone number',
    helperText,
    error,
    disabled = false,
    required = false,
    className = '',
  },
  forwardedRef,
) {
  const effectiveCountry = countryCode || defaultCountry || 'IN';
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    () => getCountry(effectiveCountry)?.code || 'IN',
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync external countryCode if changed
  useEffect(() => {
    if (countryCode && countryCode.toUpperCase() !== selectedCountryCode) {
      setSelectedCountryCode(countryCode.toUpperCase());
    }
  }, [countryCode, selectedCountryCode]);

  const country = useMemo(
    () => getCountry(selectedCountryCode) || getCountry('IN')!,
    [selectedCountryCode],
  );

  const filteredCountries = useMemo(
    () => (searchQuery ? searchCountries(searchQuery) : getAllCountries()),
    [searchQuery],
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isDropdownOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isDropdownOpen]);

  const handleCountrySelect = useCallback(
    (newCountry: CountryInfo) => {
      setSelectedCountryCode(newCountry.code);
      onCountryCodeChange?.(newCountry.code);
      setIsDropdownOpen(false);

      // Re-evaluate current value with new country
      const parsed = parsePhoneNumber(value, newCountry.code);
      onChange?.(value, parsed);
    },
    [value, onChange, onCountryCodeChange],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parsePhoneNumber(raw, selectedCountryCode);
    onChange?.(raw, parsed);
  };

  return (
    <div
      ref={containerRef}
      className={`bezent-intl-phone-wrapper ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label htmlFor={id} className="bezent-intl-phone-label">
          {label}
          {required && ' *'}
        </label>
      )}

      {name && <input type="hidden" name={name} value={value} />}

      <div
        className={`bezent-intl-phone-box ${isFocused ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''} ${error ? 'has-error' : ''}`}
      >
        <button
          type="button"
          className="bezent-intl-phone-country-btn"
          disabled={disabled}
          onClick={() => !disabled && setIsDropdownOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isDropdownOpen}
          aria-label={`Selected country: ${country.name} (${country.callingCode}). Click to change.`}
        >
          <CountryFlag countryCode={country.code} size="sm" />
          <span className="bezent-intl-phone-dial-code">{country.callingCode}</span>
          <span className="bezent-intl-phone-chevron" aria-hidden="true">
            <BezentIcon name="chevron_down" size={14} />
          </span>
        </button>

        <input
          ref={forwardedRef}
          type="tel"
          id={id}
          className="bezent-intl-phone-input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {isDropdownOpen && (
          <div className="bezent-intl-phone-dropdown" role="presentation">
            <div className="bezent-intl-phone-search">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter countries for phone code"
              />
            </div>

            <ul className="bezent-intl-phone-list" role="listbox">
              {filteredCountries.map((c) => {
                const isSelected = c.code === country.code;
                return (
                  <li
                    key={c.code}
                    className={`bezent-intl-phone-option ${isSelected ? 'is-selected' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleCountrySelect(c)}
                  >
                    <div className="bezent-intl-phone-option__main">
                      <CountryFlag countryCode={c.code} size="sm" />
                      <span>{c.name}</span>
                    </div>
                    <span className="bezent-intl-phone-option__code">{c.callingCode}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {error ? (
        <span className="bezent-intl-phone-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-intl-phone-helper">{helperText}</span>
      ) : null}
    </div>
  );
});
