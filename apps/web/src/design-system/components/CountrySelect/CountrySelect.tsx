import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from 'react';
import {
  getAllCountries,
  getCountry,
  searchCountries,
  type CountryInfo,
} from '../../../shared/globalization';
import { CountryFlag } from '../CountryFlag';
import { BezentIcon } from '../../icons';
import './CountrySelect.css';

export interface CountrySelectProps {
  id?: string;
  name?: string;
  value?: string; // ISO 3166-1 alpha-2 or country name
  onChange?: (countryCode: string, country?: CountryInfo) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function CountrySelect({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = 'Select country...',
  helperText,
  error,
  disabled = false,
  required = false,
  className = '',
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedCountry = useMemo(() => getCountry(value), [value]);
  const filteredCountries = useMemo(
    () => (searchQuery ? searchCountries(searchQuery) : getAllCountries()),
    [searchQuery],
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (country: CountryInfo) => {
      onChange?.(country.code, country);
      setIsOpen(false);
    },
    [onChange],
  );

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCountries.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCountries.length - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredCountries[highlightedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.bezent-country-select-option');
      const item = items[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      ref={containerRef}
      className={`bezent-country-select-wrapper ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label htmlFor={id} className="bezent-country-select-label">
          {label}
          {required && ' *'}
        </label>
      )}

      {/* Hidden input for standard form submission */}
      {name && <input type="hidden" name={name} value={selectedCountry?.code || value || ''} />}

      <button
        type="button"
        id={id}
        className={`bezent-country-select-trigger ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="bezent-country-select-trigger__value">
          {selectedCountry ? (
            <>
              <CountryFlag countryCode={selectedCountry.code} size="sm" />
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <span className="bezent-country-select-trigger__placeholder">{placeholder}</span>
          )}
        </span>
        <span className="bezent-country-select-trigger__chevron" aria-hidden="true">
          <BezentIcon name="chevron_down" size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="bezent-country-select-dropdown" role="presentation">
          <div className="bezent-country-select-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by country or calling code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Filter countries"
            />
          </div>

          <ul
            ref={listRef}
            className="bezent-country-select-list"
            role="listbox"
            tabIndex={-1}
            aria-label="Available countries"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c, index) => {
                const isSelected = selectedCountry?.code === c.code;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={c.code}
                    className={`bezent-country-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="bezent-country-select-option__main">
                      <CountryFlag countryCode={c.code} size="sm" />
                      <span>{c.name}</span>
                    </div>
                    <span className="bezent-country-select-option__meta">
                      {c.callingCode}
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="bezent-country-select-empty" role="presentation">
                No countries found
              </li>
            )}
          </ul>
        </div>
      )}

      {error ? (
        <span className="bezent-country-select-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-country-select-helper">{helperText}</span>
      ) : null}
    </div>
  );
}
