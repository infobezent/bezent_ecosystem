import { useEffect, useMemo, useRef, useState } from 'react';
import { BezentIcon } from '../../design-system/icons';
import type { ShellLauncherCategory, ShellLauncherItem } from './types';
import './MoreLauncher.css';

type CategoryView = 'all' | string;

export interface MoreLauncherProps {
  categories: ShellLauncherCategory[];
  items: ShellLauncherItem[];
  activeItemId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * The "More" overflow launcher: every destination an application offers,
 * grouped by category, searchable, with Quick Access tiles. Source: old
 * approved UI `MoreLauncher.tsx` (final `MORE_CATEGORIES` /
 * `BEZENT_TOOL_REGISTRY` design). Generic: categories and items are
 * supplied by the host, so future applications reuse it unchanged.
 *
 * Not migrated (all need persistence or belong to a later phase): Quick
 * Access pinning/"Customize", "Recently Used" history, and promoting a
 * tool into the sidebar's dynamic slot — those were localStorage-backed
 * user preferences. Quick Access here is the catalog's `quickAccess` flag.
 */
export function MoreLauncher({
  categories,
  items,
  activeItemId,
  onSelect,
  onClose,
}: MoreLauncherProps) {
  const [view, setView] = useState<CategoryView>('all');
  const [query, setQuery] = useState('');
  const [drill, setDrill] = useState<'in' | 'out'>('in');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      // The More button toggles the launcher itself; ignore presses on it.
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !target.closest?.('[data-more-toggle]')
      ) {
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    return map;
  }, [items]);

  const cleanQuery = query.trim().toLowerCase();
  const results = cleanQuery
    ? items.filter((item) =>
        [
          item.label,
          categoryById.get(item.categoryId)?.label ?? '',
          item.description ?? '',
          ...(item.keywords ?? []),
        ].some((text) => text.toLowerCase().includes(cleanQuery)),
      )
    : [];
  const quickAccess = items.filter((item) => item.quickAccess);
  const currentCategory = view === 'all' ? undefined : categoryById.get(view);

  function chooseCategory(next: CategoryView) {
    if (next === view && !cleanQuery) return;
    setDrill(next === 'all' ? 'out' : 'in');
    setView(next);
    setQuery('');
  }

  function choose(id: string) {
    onSelect(id);
    onClose();
  }

  const row = (item: ShellLauncherItem, opts: { description?: boolean; badge?: boolean } = {}) => (
    <LauncherRow
      key={item.id}
      item={item}
      active={item.id === activeItemId}
      description={opts.description}
      categoryLabel={opts.badge ? categoryById.get(item.categoryId)?.label : undefined}
      onClick={() => choose(item.id)}
    />
  );

  return (
    <div ref={rootRef} className="more-launcher" role="dialog" aria-label="More destinations">
      <div className="more-launcher__header">
        <div>
          <h2 className="more-launcher__title">More</h2>
          <div className="more-launcher__subtitle">
            Explore tools and services beyond your everyday workspace
          </div>
        </div>
        <button
          type="button"
          className="more-launcher__close"
          aria-label="Close panel"
          onClick={onClose}
        >
          <BezentIcon name="close" size={16} color="currentColor" />
        </button>
      </div>

      <div className="more-launcher__search-row">
        <div className="more-launcher__search" role="search">
          <BezentIcon name="search" size={15} color="currentColor" strokeWidth={1.8} />
          <input
            ref={searchRef}
            className="more-launcher__search-input"
            type="text"
            aria-label="Search tools, services or actions"
            placeholder="Search tools, services or actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="more-launcher__search-clear"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              <BezentIcon name="close" size={14} color="currentColor" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      <div className="more-launcher__body">
        <nav className="more-launcher__categories" aria-label="Categories">
          {[{ id: 'all', label: 'All Tools', icon: 'apps' as const }, ...categories].map((cat) => {
            const selected = view === cat.id && !cleanQuery;
            const count = cat.id === 'all' ? items.length : (counts.get(cat.id) ?? 0);
            return (
              <button
                key={cat.id}
                type="button"
                className={`more-launcher__category ${selected ? 'is-selected' : ''}`.trim()}
                aria-current={selected ? 'true' : undefined}
                onClick={() => chooseCategory(cat.id)}
              >
                <BezentIcon
                  name={cat.icon}
                  size={20}
                  color="currentColor"
                  active={selected}
                  variant="outline"
                />
                <span className="more-launcher__category-label">{cat.label}</span>
                <span className="more-launcher__count">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="more-launcher__content">
          <div
            key={cleanQuery ? `search-${cleanQuery}` : `view-${view}`}
            className={`more-launcher__pane more-launcher__pane--${drill}`}
          >
            {cleanQuery ? (
              <section>
                <div className="more-launcher__section-head">
                  <span className="more-launcher__section-title is-accent">
                    Search Results ({results.length})
                  </span>
                  <span className="more-launcher__muted">
                    matching &ldquo;{query.trim()}&rdquo;
                  </span>
                </div>
                {results.length > 0 ? (
                  <div className="more-launcher__rows">
                    {results.map((item) => row(item, { description: true, badge: true }))}
                  </div>
                ) : (
                  <div className="more-launcher__empty" role="status">
                    No tools match your search.
                  </div>
                )}
              </section>
            ) : view === 'all' ? (
              <>
                {quickAccess.length > 0 && (
                  <section>
                    <div className="more-launcher__section-head">
                      <span className="more-launcher__section-title">Quick Access</span>
                    </div>
                    <div className="more-launcher__tiles">
                      {quickAccess.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`more-launcher__tile ${item.id === activeItemId ? 'is-active' : ''}`.trim()}
                          onClick={() => choose(item.id)}
                        >
                          <span className="more-launcher__tile-icon">
                            <BezentIcon
                              name={item.icon}
                              size={19}
                              color="currentColor"
                              active={item.id === activeItemId}
                            />
                          </span>
                          <span className="more-launcher__tile-label">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {categories.map((cat) => {
                  const inCategory = items.filter((item) => item.categoryId === cat.id);
                  if (inCategory.length === 0) return null;
                  return (
                    <section key={cat.id}>
                      <div className="more-launcher__section-head">
                        <span className="more-launcher__section-title">
                          {cat.label}
                          <span className="more-launcher__muted">{inCategory.length}</span>
                        </span>
                        <button
                          type="button"
                          className="more-launcher__view-all"
                          onClick={() => chooseCategory(cat.id)}
                        >
                          View all →
                        </button>
                      </div>
                      <div className="more-launcher__rows">
                        {inCategory.map((item) => row(item))}
                      </div>
                    </section>
                  );
                })}
              </>
            ) : (
              <section className="more-launcher__category-view">
                <button
                  type="button"
                  className="more-launcher__back"
                  onClick={() => chooseCategory('all')}
                >
                  <BezentIcon name="arrowLeft" size={14} color="currentColor" strokeWidth={2} />
                  <span>All Tools</span>
                </button>
                <div className="more-launcher__category-title-row">
                  <span className="more-launcher__category-tile">
                    <BezentIcon
                      name={currentCategory?.icon ?? 'apps'}
                      size={19}
                      color="currentColor"
                    />
                  </span>
                  <h3 className="more-launcher__category-title">{currentCategory?.label}</h3>
                  <span className="more-launcher__category-count">
                    {counts.get(view) ?? 0} {(counts.get(view) ?? 0) === 1 ? 'module' : 'modules'}
                  </span>
                </div>
                {currentCategory?.description && (
                  <p className="more-launcher__category-desc">{currentCategory.description}</p>
                )}
                <div className="more-launcher__rows">
                  {items
                    .filter((item) => item.categoryId === view)
                    .map((item) => row(item, { description: true }))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LauncherRow({
  item,
  active,
  description,
  categoryLabel,
  onClick,
}: {
  item: ShellLauncherItem;
  active: boolean;
  description?: boolean;
  categoryLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`more-launcher__row ${active ? 'is-active' : ''} ${description ? 'has-description' : ''}`.trim()}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <span className="more-launcher__row-icon">
        <BezentIcon name={item.icon} size={19} color="currentColor" active={active} />
      </span>
      <span className="more-launcher__row-text">
        <span className="more-launcher__row-title-line">
          <span className="more-launcher__row-title">{item.label}</span>
          {categoryLabel && <span className="more-launcher__row-badge">{categoryLabel}</span>}
        </span>
        {description && item.description && (
          <span className="more-launcher__row-desc">{item.description}</span>
        )}
      </span>
      <span className="more-launcher__row-chevron">
        <BezentIcon name="chevronRight" size={14} color="currentColor" strokeWidth={2} />
      </span>
    </button>
  );
}
