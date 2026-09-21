import { BezentIcon } from '../../design-system/icons';
import type { SearchResultItem } from './types';
import './SearchResultRow.css';

export interface SearchResultRowProps {
  id: string;
  item: SearchResultItem;
  highlighted: boolean;
  onSelect: (item: SearchResultItem) => void;
  onHover: () => void;
}

/**
 * One search result. Source: old approved UI `SearchResultRow.tsx`. Knows
 * only the generic `SearchResultItem` shape — no application internals.
 */
export function SearchResultRow({
  id,
  item,
  highlighted,
  onSelect,
  onHover,
}: SearchResultRowProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={highlighted}
      className={`search-result-row ${highlighted ? 'is-highlighted' : ''}`.trim()}
      onClick={() => onSelect(item)}
      onMouseEnter={onHover}
    >
      <div className="search-result-row__main">
        <div className="search-result-row__icon">
          <BezentIcon
            name={item.icon ?? 'search'}
            size={15}
            color="currentColor"
            strokeWidth={1.8}
          />
        </div>
        <div className="search-result-row__text">
          <div className="search-result-row__title">{item.title}</div>
          {item.subtitle && <div className="search-result-row__subtitle">{item.subtitle}</div>}
        </div>
      </div>

      <div className="search-result-row__meta">
        {item.badge && (
          <span
            className={`search-result-row__badge search-result-row__badge--${item.badge.tone ?? 'neutral'}`}
          >
            {item.badge.text}
          </span>
        )}
        {item.metaRight && <span className="search-result-row__meta-right">{item.metaRight}</span>}
        <span className="search-result-row__source">{item.sourceLabel}</span>
      </div>
    </div>
  );
}
