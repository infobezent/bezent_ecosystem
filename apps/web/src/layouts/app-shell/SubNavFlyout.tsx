import { useLayoutEffect, useRef, useState } from 'react';
import { BezentIcon } from '../../design-system/icons';
import type { ShellNavItem } from './types';
import './SubNavFlyout.css';

/**
 * Flyout listing a nav item's sub-navigation. Source: old approved UI
 * `SubNavFlyout` / `DynamicFlyoutPointer` / `SubNavPrototypeRow`
 * (`App.tsx` 1021-1390).
 *
 * Generic mechanism only: rows come from `item.subItems`. LeftSidebar
 * renders at most ONE of these (for the item that owns the flyout), inside
 * that item's wrapper, so it is CSS-anchored to the item with no inline
 * style. Placement: top-aligned with the item by default; if that would run
 * under the bottom bar it flips to bottom-align with the item (`--up`
 * class, pointer moves to the bottom edge). The measurement only chooses a
 * class — it never writes a style. Selection is controlled by the host
 * (URL-derived) and choosing a row reports it.
 */
export function SubNavFlyout({
  item,
  activeSubId,
  onSelect,
}: {
  item: ShellNavItem;
  /** Selected sub-destination (derived by the host from the URL). */
  activeSubId?: string;
  onSelect?: (subId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [alignUp, setAlignUp] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bottomBar = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--shell-bottom-bar-height'),
    );
    // Measured in the default (top-aligned) position, before the class flips.
    setAlignUp(el.getBoundingClientRect().bottom > window.innerHeight - (bottomBar || 0) - 8);
  }, [item.id]);

  return (
    <div
      ref={ref}
      className={`subnav-flyout ${alignUp ? 'subnav-flyout--up' : ''}`.trim()}
      role="menu"
      aria-label={`${item.label} sub-navigation`}
    >
      <span className="subnav-flyout__bridge" aria-hidden="true" />
      <span className="subnav-flyout__pointer" aria-hidden="true" />

      <div className="subnav-flyout__header">
        <div className="subnav-flyout__title">{item.label}</div>
        {item.subtitle && <div className="subnav-flyout__subtitle">{item.subtitle}</div>}
      </div>

      <div className="subnav-flyout__body">
        {item.subItems?.map((sub) => {
          const selected = sub.id === activeSubId;
          return (
            <button
              key={sub.id}
              type="button"
              role="menuitem"
              className={`subnav-flyout__row ${selected ? 'is-selected' : ''}`.trim()}
              onClick={() => onSelect?.(sub.id)}
            >
              <span className="subnav-flyout__row-icon">
                <BezentIcon
                  name={sub.icon}
                  size={15}
                  color="currentColor"
                  active={selected}
                  variant="outline"
                />
              </span>
              <span className="subnav-flyout__row-label">{sub.label}</span>
              {selected && <span className="subnav-flyout__row-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
