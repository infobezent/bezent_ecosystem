import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react';
import {
  getAllCurrencies,
  getCurrency,
  searchCurrencies,
  type CurrencyInfo,
} from '../../../shared/globalization';
import { BezentIcon } from '../../icons';
import './CurrencySelect.css';

export interface CurrencySelectProps {
  id?: string;
  name?: string;
  value?: string; // ISO 4217 code (e.g. "INR", "USD")
  onChange?: (currencyCode: string, currency?: CurrencyInfo) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function CurrencySelect({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = 'Select currency...',
  helperText,
  error,
  disabled = false,
  required = false,
  className = '',
}: CurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedCurrency = useMemo(() => getCurrency(value), [value]);
  const filteredCurrencies = useMemo(
    () => (searchQuery ? searchCurrencies(searchQuery) : getAllCurrencies()),
    [searchQuery],
  );

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
    (c: CurrencyInfo) => {
      onChange?.(c.code, c);
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
      setHighlightedIndex((prev) => (prev < filteredCurrencies.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCurrencies.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredCurrencies[highlightedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.bezent-currency-select-option');
      const item = items[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      ref={containerRef}
      className={`bezent-currency-select-wrapper ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label htmlFor={id} className="bezent-currency-select-label">
          {label}
          {required && ' *'}
        </label>
      )}

      {name && <input type="hidden" name={name} value={selectedCurrency?.code || value || ''} />}

      <button
        type="button"
        id={id}
        className={`bezent-currency-select-trigger ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="bezent-currency-select-trigger__value">
          {selectedCurrency ? (
            <>
              <span className="bezent-currency-select-trigger__symbol">
                {selectedCurrency.symbol}
              </span>
              <span>
                {selectedCurrency.code} — {selectedCurrency.name}
              </span>
            </>
          ) : (
            <span className="bezent-currency-select-trigger__placeholder">{placeholder}</span>
          )}
        </span>
        <span className="bezent-currency-select-trigger__chevron" aria-hidden="true">
          <BezentIcon name="chevron_down" size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="bezent-currency-select-dropdown" role="presentation">
          <div className="bezent-currency-select-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by code, symbol or name (e.g. INR, ₹, Dollar)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Filter currencies"
            />
          </div>

          <ul
            ref={listRef}
            className="bezent-currency-select-list"
            role="listbox"
            tabIndex={-1}
            aria-label="Available currencies"
          >
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((c, index) => {
                const isSelected = selectedCurrency?.code === c.code;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={c.code}
                    className={`bezent-currency-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="bezent-currency-select-option__main">
                      <span className="bezent-currency-select-option__code">{c.code}</span>
                      <span>({c.symbol})</span>
                    </div>
                    <span className="bezent-currency-select-option__meta">{c.name}</span>
                  </li>
                );
              })
            ) : (
              <li className="bezent-currency-select-empty" role="presentation">
                No currencies found
              </li>
            )}
          </ul>
        </div>
      )}

      {error ? (
        <span className="bezent-currency-select-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-currency-select-helper">{helperText}</span>
      ) : null}
    </div>
  );
}
