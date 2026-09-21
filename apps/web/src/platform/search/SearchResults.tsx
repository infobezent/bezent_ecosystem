import { useEffect, useRef } from 'react';
import { SearchResultRow } from './SearchResultRow';
import type { SearchResultItem } from './types';
import './SearchResults.css';

export interface SearchResultsProps {
  listboxId: string;
  optionId: (index: number) => string;
  contextLabel?: string;
  currentItems: SearchResultItem[];
  otherItems: SearchResultItem[];
  selectedIndex: number;
  onSelect: (item: SearchResultItem) => void;
  onHoverIndex: (index: number) => void;
}

/**
 * Sectioned result list (current context first, then everything else) with
 * the keyboard hint footer. Source: old approved UI `SearchResults.tsx`.
 * Scrolls internally (max-height) so opening search never grows the page.
 */
export function SearchResults({
  listboxId,
  optionId,
  contextLabel,
  currentItems,
  otherItems,
  selectedIndex,
  onSelect,
  onHoverIndex,
}: SearchResultsProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const renderRows = (items: SearchResultItem[], offset: number) =>
    items.map((item, i) => (
      <SearchResultRow
        key={item.id}
        id={optionId(offset + i)}
        item={item}
        highlighted={selectedIndex === offset + i}
        onSelect={onSelect}
        onHover={() => onHoverIndex(offset + i)}
      />
    ));

  const currentTitle = `In ${contextLabel ?? 'current view'}`;

  return (
    <div className="search-results" ref={rootRef}>
      <div id={listboxId} role="listbox" aria-label="Search results">
        {currentItems.length > 0 && (
          <div role="group" aria-label={currentTitle}>
            <div className="search-results__heading" aria-hidden="true">
              <span>{currentTitle}</span>
              <span className="search-results__count">
                {currentItems.length} {currentItems.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
            {renderRows(currentItems, 0)}
          </div>
        )}

        {otherItems.length > 0 && (
          <div
            role="group"
            aria-label="Other results across BEZENT"
            className={currentItems.length > 0 ? 'search-results__group--divided' : undefined}
          >
            <div className="search-results__heading" aria-hidden="true">
              <span>Other Results across BEZENT</span>
              <span className="search-results__count">
                {otherItems.length} {otherItems.length === 1 ? 'result' : 'results'}
              </span>
            </div>
            {renderRows(otherItems, currentItems.length)}
          </div>
        )}
      </div>

      <div className="search-results__hint" aria-hidden="true">
        <span>
          Use <strong>↑</strong> <strong>↓</strong> to navigate
        </span>
        <span>
          Press <strong>Enter ↵</strong> to select
        </span>
      </div>
    </div>
  );
}
