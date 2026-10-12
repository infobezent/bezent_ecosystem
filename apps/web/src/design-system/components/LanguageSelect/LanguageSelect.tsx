import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from 'react';
import {
  getAllLanguages,
  searchLanguages,
  type LanguageInfo,
} from '../../../shared/globalization';
import { BezentIcon } from '../../icons';
import './LanguageSelect.css';

export interface LanguageSelectProps {
  id?: string;
  name?: string;
  value?: string; // ISO 639-1 code (e.g. "en", "es")
  onChange?: (languageCode: string, language?: LanguageInfo) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function LanguageSelect({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = 'Select language...',
  helperText,
  error,
  disabled = false,
  required = false,
  className = '',
}: LanguageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLanguage = useMemo(() => {
    if (!value) return undefined;
    return getAllLanguages().find((l) => l.code.toLowerCase() === value.toLowerCase());
  }, [value]);

  const filteredLanguages = useMemo(
    () => (searchQuery ? searchLanguages(searchQuery) : getAllLanguages()),
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
    (l: LanguageInfo) => {
      onChange?.(l.code, l);
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
        prev < filteredLanguages.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredLanguages.length - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredLanguages[highlightedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.bezent-language-select-option');
      const item = items[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      ref={containerRef}
      className={`bezent-language-select-wrapper ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label htmlFor={id} className="bezent-language-select-label">
          {label}
          {required && ' *'}
        </label>
      )}

      {name && <input type="hidden" name={name} value={selectedLanguage?.code || value || ''} />}

      <button
        type="button"
        id={id}
        className={`bezent-language-select-trigger ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="bezent-language-select-trigger__value">
          {selectedLanguage ? (
            <span>{selectedLanguage.name} ({selectedLanguage.nativeName})</span>
          ) : (
            <span className="bezent-language-select-trigger__placeholder">{placeholder}</span>
          )}
        </span>
        <span className="bezent-language-select-trigger__chevron" aria-hidden="true">
          <BezentIcon name="chevron_down" size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="bezent-language-select-dropdown" role="presentation">
          <div className="bezent-language-select-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by language..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Filter languages"
            />
          </div>

          <ul
            ref={listRef}
            className="bezent-language-select-list"
            role="listbox"
            tabIndex={-1}
            aria-label="Available languages"
          >
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((l, index) => {
                const isSelected = selectedLanguage?.code === l.code;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={l.code}
                    className={`bezent-language-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(l)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="bezent-language-select-option__main">{l.name}</span>
                    <span className="bezent-language-select-option__meta">{l.nativeName}</span>
                  </li>
                );
              })
            ) : (
              <li className="bezent-language-select-empty" role="presentation">
                No languages found
              </li>
            )}
          </ul>
        </div>
      )}

      {error ? (
        <span className="bezent-language-select-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-language-select-helper">{helperText}</span>
      ) : null}
    </div>
  );
}
