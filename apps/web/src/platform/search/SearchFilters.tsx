import { useEffect, useRef, useState } from 'react';
import { BezentIcon } from '../../design-system/icons';
import type { FilterChipConfig } from './types';
import './SearchFilters.css';

export interface SearchFiltersProps {
  configs: FilterChipConfig[];
  activeFilterKey: string | null;
  activeFilterValue: string | null;
  onSelectFilter: (key: string, value: string) => void;
  onClearFilter: () => void;
}

/**
 * Contextual filter chips with a single-select dropdown per chip. Source:
 * old approved UI `SearchFilters.tsx`.
 */
export function SearchFilters({
  configs,
  activeFilterKey,
  activeFilterValue,
  onSelectFilter,
  onClearFilter,
}: SearchFiltersProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenId(null);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (configs.length === 0) return null;

  return (
    <div className="search-filters" ref={rootRef}>
      {configs.map((config) => {
        const isActive =
          activeFilterKey === config.id && !!activeFilterValue && activeFilterValue !== 'all';
        const isOpen = openId === config.id;

        return (
          <div key={config.id} className="search-filters__chip-wrap">
            <button
              type="button"
              className={`search-filters__chip ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`.trim()}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : config.id)}
            >
              <span>{isActive ? `${config.label}: ${activeFilterValue}` : config.label}</span>
              {!isActive && (
                <span className={`search-filters__chevron ${isOpen ? 'is-open' : ''}`.trim()}>
                  <BezentIcon name="chevronDown" size={12} color="currentColor" strokeWidth={1.8} />
                </span>
              )}
            </button>
            {isActive && (
              <button
                type="button"
                aria-label={`Clear ${config.label} filter`}
                className="search-filters__clear"
                onClick={onClearFilter}
              >
                <BezentIcon name="close" size={11} color="currentColor" strokeWidth={2.2} />
              </button>
            )}

            {isOpen && (
              <div className="search-filters__menu" role="listbox" aria-label={config.label}>
                <div className="search-filters__menu-title">Filter by {config.label}</div>
                {config.options.map((opt) => {
                  const selected =
                    (opt.value === 'all' && !isActive) ||
                    (isActive && activeFilterValue === opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`search-filters__option ${selected ? 'is-selected' : ''}`.trim()}
                      onClick={() => {
                        if (opt.value === 'all') onClearFilter();
                        else onSelectFilter(config.id, opt.value);
                        setOpenId(null);
                      }}
                    >
                      <span>{opt.label}</span>
                      {selected && (
                        <span className="search-filters__check">
                          <BezentIcon
                            name="check"
                            size={13}
                            color="currentColor"
                            strokeWidth={2.2}
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
