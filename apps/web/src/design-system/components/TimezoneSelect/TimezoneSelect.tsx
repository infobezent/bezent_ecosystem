import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from 'react';
import {
  getAllTimezones,
  getTimezone,
  searchTimezones,
  type TimezoneInfo,
} from '../../../shared/globalization';
import { BezentIcon } from '../../icons';
import './TimezoneSelect.css';

export interface TimezoneSelectProps {
  id?: string;
  name?: string;
  value?: string; // IANA timezone ID (e.g. "Asia/Kolkata")
  onChange?: (timezoneId: string, timezone?: TimezoneInfo) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function TimezoneSelect({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = 'Select timezone...',
  helperText,
  error,
  disabled = false,
  required = false,
  className = '',
}: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedTimezone = useMemo(() => getTimezone(value), [value]);
  const filteredTimezones = useMemo(
    () => (searchQuery ? searchTimezones(searchQuery) : getAllTimezones()),
    [searchQuery],
  );

  // Close on click outside
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
    (tz: TimezoneInfo) => {
      onChange?.(tz.id, tz);
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
        prev < filteredTimezones.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredTimezones.length - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredTimezones[highlightedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.bezent-timezone-select-option');
      const item = items[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      ref={containerRef}
      className={`bezent-timezone-select-wrapper ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label htmlFor={id} className="bezent-timezone-select-label">
          {label}
          {required && ' *'}
        </label>
      )}

      {name && <input type="hidden" name={name} value={selectedTimezone?.id || value || ''} />}

      <button
        type="button"
        id={id}
        className={`bezent-timezone-select-trigger ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="bezent-timezone-select-trigger__value">
          {selectedTimezone ? (
            <>
              <span>{selectedTimezone.id}</span>
              <span className="bezent-timezone-select-trigger__offset">
                {selectedTimezone.offset} ({selectedTimezone.abbreviation})
              </span>
            </>
          ) : (
            <span className="bezent-timezone-select-trigger__placeholder">{placeholder}</span>
          )}
        </span>
        <span className="bezent-timezone-select-trigger__chevron" aria-hidden="true">
          <BezentIcon name="chevron_down" size={16} />
        </span>
      </button>

      {/* Hidden native select for accessibility, form compatibility, and testing */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        className="bezent-timezone-select-native-select"
        value={selectedTimezone?.id || value || ''}
        onChange={(e) => {
          const tz = getTimezone(e.target.value);
          onChange?.(e.target.value, tz);
        }}
      >
        <option value="">{placeholder}</option>
        {filteredTimezones.map((tz) => (
          <option key={tz.id} value={tz.id}>
            {tz.id}
          </option>
        ))}
      </select>

      {isOpen && (
        <div className="bezent-timezone-select-dropdown" role="presentation">
          <div className="bezent-timezone-select-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by city, country or offset (e.g. Kolkata, +05:30)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Filter timezones"
            />
          </div>

          <ul
            ref={listRef}
            className="bezent-timezone-select-list"
            role="listbox"
            tabIndex={-1}
            aria-label="Available timezones"
          >
            {filteredTimezones.length > 0 ? (
              filteredTimezones.map((tz, index) => {
                const isSelected = selectedTimezone?.id === tz.id;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={tz.id}
                    className={`bezent-timezone-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(tz)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span>{tz.id}</span>
                    <span className="bezent-timezone-select-option__meta">
                      {tz.offset} ({tz.abbreviation})
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="bezent-timezone-select-empty" role="presentation">
                No timezones found
              </li>
            )}
          </ul>
        </div>
      )}

      {error ? (
        <span className="bezent-timezone-select-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-timezone-select-helper">{helperText}</span>
      ) : null}
    </div>
  );
}
