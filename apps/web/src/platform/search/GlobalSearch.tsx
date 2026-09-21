import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BezentIcon } from '../../design-system/icons';
import { SearchFilters } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { SearchNoResults, SearchSuggestions } from './SearchEmptyState';
import type { SearchProvider, SearchResultItem, SearchSuggestion } from './types';
import './GlobalSearch.css';

const RESULT_LIMIT = 15;

export interface GlobalSearchProps {
  /** Where results, filters and suggestions come from. No data is built in. */
  provider: SearchProvider;
  /** Key of the current application/module context; results with the same `sourceKey` rank first. */
  contextKey?: string;
  /** Human label of that context ("In Employees", "Suggestions for Employees"). */
  contextLabel?: string;
  /** A result was chosen. The host decides what that means (navigation etc.). */
  onSelectResult?: (item: SearchResultItem) => void;
  /** A query was submitted (Enter, or a suggestion was chosen). */
  onExecuteSearch?: (query: string) => void;
}

/**
 * BEZENT Global Search: the collapsed bar plus its floating discovery
 * panel (filters, suggestions, results, no-results). Source: old approved
 * UI `GlobalSearch.tsx` "State A". The full-page results view ("State B")
 * is not part of this component — hosts receive `onExecuteSearch`.
 *
 * Owns only search UI state (query, open, filter, highlighted row). It
 * reads no theme, storage or routes and imports no application code.
 * Interaction follows the ARIA combobox/listbox pattern: the input keeps
 * focus and `aria-activedescendant` tracks the highlighted option.
 */
export function GlobalSearch({
  provider,
  contextKey,
  contextLabel,
  onSelectResult,
  onExecuteSearch,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [filterKey, setFilterKey] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const trimmed = query.trim();
  const filters = useMemo(() => provider.getFilters(contextKey), [provider, contextKey]);
  const suggestions = useMemo(() => provider.getSuggestions(contextKey), [provider, contextKey]);
  const results = useMemo(
    () => provider.search({ query, contextKey, filterKey, filterValue, limit: RESULT_LIMIT }),
    [provider, query, contextKey, filterKey, filterValue],
  );

  const flatResults = useMemo(() => [...results.currentItems, ...results.otherItems], [results]);
  const optionCount = trimmed ? flatResults.length : suggestions.length;

  const clearFilter = () => {
    setFilterKey(null);
    setFilterValue(null);
    setSelectedIndex(0);
  };

  const close = () => {
    setOpen(false);
    setFilterKey(null);
    setFilterValue(null);
  };

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (!open) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setOpen(true);
          inputRef.current?.focus();
        }
        return;
      }
      if (e.key === 'Escape') {
        close();
        inputRef.current?.blur();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const changeQuery = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
    setOpen(true);
  };

  const executeSearch = (value: string) => {
    close();
    onExecuteSearch?.(value);
  };

  const selectResult = (item: SearchResultItem) => {
    setQuery(item.title);
    close();
    onSelectResult?.(item);
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    const value = suggestion.actionQuery ?? suggestion.label;
    setQuery(value);
    setSelectedIndex(0);
    executeSearch(value);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setSelectedIndex((i) => (optionCount > 0 ? (i + 1) % optionCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setSelectedIndex((i) => (optionCount > 0 ? (i - 1 + optionCount) % optionCount : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (trimmed) {
        // Approved behaviour: the first row acts as "run this search";
        // choosing a row requires arrowing/hovering to a later one.
        const selected = flatResults[selectedIndex];
        if (selected && open && selectedIndex > 0) selectResult(selected);
        else executeSearch(trimmed);
      } else {
        const suggestion = suggestions[selectedIndex];
        if (suggestion) selectSuggestion(suggestion);
      }
    }
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIndex(0);
    close();
    inputRef.current?.focus();
  };

  const searchAll = () => {
    clearFilter();
    setQuery('');
    inputRef.current?.focus();
  };

  const showResults = trimmed && flatResults.length > 0;
  const activeDescendant = open && optionCount > 0 ? optionId(selectedIndex) : undefined;

  return (
    <div
      ref={rootRef}
      className={`global-search ${open ? 'global-search--open' : ''}`.trim()}
      role="search"
    >
      <div
        className="global-search__bar"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <span className="global-search__icon">
          <BezentIcon name="search" size={20} color="currentColor" strokeWidth={1.8} />
        </span>

        <input
          ref={inputRef}
          type="text"
          className="global-search__input"
          role="combobox"
          aria-label="Search across BEZENT"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          placeholder="Search across BEZENT..."
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
        />

        {query && (
          <button
            type="button"
            className="global-search__clear"
            aria-label="Clear search"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <BezentIcon name="close" size={15} color="currentColor" strokeWidth={2.2} />
          </button>
        )}

        <span className="global-search__divider" aria-hidden="true" />

        <button
          type="button"
          className="global-search__filter-toggle"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
        >
          <BezentIcon name="filter" size={18} color="currentColor" strokeWidth={1.8} />
          <span>Filter</span>
        </button>
      </div>

      {open && (
        // Mousedown is cancelled so clicking panel content never steals focus from the input.
        <div className="global-search__panel" onMouseDown={(e) => e.preventDefault()}>
          <SearchFilters
            configs={filters}
            activeFilterKey={filterKey}
            activeFilterValue={filterValue}
            onSelectFilter={(key, value) => {
              setFilterKey(key);
              setFilterValue(value);
              setSelectedIndex(0);
            }}
            onClearFilter={clearFilter}
          />

          {!trimmed ? (
            <SearchSuggestions
              listboxId={listboxId}
              optionId={optionId}
              contextKey={contextKey}
              contextLabel={contextLabel}
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSelect={selectSuggestion}
              onHoverIndex={setSelectedIndex}
            />
          ) : showResults ? (
            <SearchResults
              listboxId={listboxId}
              optionId={optionId}
              contextLabel={contextLabel}
              currentItems={results.currentItems}
              otherItems={results.otherItems}
              selectedIndex={selectedIndex}
              onSelect={selectResult}
              onHoverIndex={setSelectedIndex}
            />
          ) : (
            <SearchNoResults onSearchAll={searchAll} />
          )}
        </div>
      )}
    </div>
  );
}
