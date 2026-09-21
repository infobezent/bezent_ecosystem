import { BezentIcon } from '../../design-system/icons';
import type { SearchSuggestion } from './types';
import './SearchEmptyState.css';

export interface SearchSuggestionsProps {
  optionId: (index: number) => string;
  listboxId: string;
  contextKey?: string;
  contextLabel?: string;
  suggestions: SearchSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: SearchSuggestion) => void;
  onHoverIndex: (index: number) => void;
}

/**
 * Panel content shown while the query is empty. Source: old approved UI
 * `SearchEmptyState` (type "suggestions").
 */
export function SearchSuggestions({
  optionId,
  listboxId,
  contextKey,
  contextLabel,
  suggestions,
  selectedIndex,
  onSelect,
  onHoverIndex,
}: SearchSuggestionsProps) {
  // BZ-04: Suggestions scope
  // If suggestions match the current module context, show 'Suggestions for {contextLabel}'
  // If none match (e.g. cross-module fallback), show 'Recent & relevant' with 'Cross-module search' hint.
  const isContextScoped =
    !!contextKey &&
    suggestions.length > 0 &&
    suggestions.every((s) => !s.sourceKey || s.sourceKey === contextKey);

  const heading = isContextScoped && contextLabel ? `Suggestions for ${contextLabel}` : 'Recent';

  const hint = isContextScoped && contextLabel ? 'Based on current view' : 'Cross-module search';

  return (
    <div className="search-empty search-empty--suggestions">
      <div className="search-empty__heading-row">
        <span className="search-empty__heading">{heading}</span>
        <span className="search-empty__hint">{hint}</span>
      </div>
      <div id={listboxId} role="listbox" aria-label={heading}>
        {suggestions.map((sug, i) => (
          <div
            key={sug.id}
            id={optionId(i)}
            role="option"
            aria-selected={selectedIndex === i}
            className={`search-empty__suggestion ${selectedIndex === i ? 'is-highlighted' : ''}`.trim()}
            onClick={() => onSelect(sug)}
            onMouseEnter={() => onHoverIndex(i)}
          >
            <span className="search-empty__suggestion-icon">
              <BezentIcon name="clock" size={13} color="currentColor" strokeWidth={2} />
            </span>
            <span className="search-empty__suggestion-label">{sug.label}</span>
            {sug.sourceLabel && <span className="search-empty__tag">{sug.sourceLabel}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface SearchNoResultsProps {
  onSearchAll: () => void;
}

/**
 * "No results" panel content. Source: old `SearchEmptyState` (type
 * "no-results"). Not built on the global `EmptyState`: that component is
 * a full-page illustrated shell, while this is a compact 38px-icon panel
 * state — reusing it would be a visual regression (GLOBAL-SEARCH.md §9).
 */
export function SearchNoResults({ onSearchAll }: SearchNoResultsProps) {
  return (
    <div className="search-empty search-empty--none" role="status">
      <div className="search-empty__none-icon">
        <BezentIcon name="search" size={18} color="currentColor" strokeWidth={2} />
      </div>
      <div className="search-empty__none-title">No results found</div>
      <div className="search-empty__none-text">Try another keyword or adjust your filters.</div>
      <button type="button" className="search-empty__none-action" onClick={onSearchAll}>
        <span>Search all BEZENT</span>
        <BezentIcon name="arrowRight" size={13} color="currentColor" strokeWidth={2.2} />
      </button>
    </div>
  );
}
