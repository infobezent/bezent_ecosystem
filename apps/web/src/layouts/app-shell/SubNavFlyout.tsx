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
  align,
  onSelect,
}: {
  item: ShellNavItem;
  /** Selected sub-destination (derived by the host from the URL). */
  activeSubId?: string;
  align?: 'top' | 'bottom';
  onSelect?: (subId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [alignUp, setAlignUp] = useState(align === 'bottom');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parentWrap = el.closest('.left-sidebar__item-wrap');
    const navItemBtn = parentWrap?.querySelector('.left-sidebar__item');
    if (!navItemBtn) return;

    const btnRect = navItemBtn.getBoundingClientRect();
    const topBarHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--shell-topbar-height') || '50',
    );
    const bottomBarHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--shell-bottom-bar-height') ||
        '28',
    );

    const minTop = topBarHeight + 4;
    const maxBottom = window.innerHeight - bottomBarHeight - 4;
    const flyoutHeight = el.getBoundingClientRect().height;

    // Center of nav icon inside squircle (pill top is 0, height is 40px, center is at +20px)
    const iconCenterY = btnRect.top + 20;

    // Anchor the flyout so its pointer beak (at 28px from top of header) aligns directly with the icon
    const BEAK_OFFSET_TOP = 28;
    let targetTop = iconCenterY - BEAK_OFFSET_TOP;

    // If flyout would run below the bottom bar, shift it up
    if (targetTop + flyoutHeight > maxBottom) {
      targetTop = maxBottom - flyoutHeight;
    }

    // Never cross above the Main workspace card's top line.
    // When hovering near the top (e.g. Dashboard), snap flush to minTop so it aligns seamlessly with the Main line.
    if (targetTop <= minTop + 10) {
      targetTop = minTop;
    }

    el.style.top = `${Math.round(targetTop)}px`;

    // Pointer beak position relative to the flyout
    const pointerOffset = Math.max(16, Math.min(flyoutHeight - 16, iconCenterY - targetTop));
    el.style.setProperty('--subnav-pointer-top', `${Math.round(pointerOffset)}px`);

    const header = el.querySelector('.subnav-flyout__header');
    const headerHeight = header ? header.getBoundingClientRect().height : 54;
    if (pointerOffset <= headerHeight) {
      el.style.setProperty(
        '--subnav-pointer-bg',
        'var(--subnav-header-bg, var(--nav-selected, #c2e7ff))',
      );
    } else {
      el.style.setProperty('--subnav-pointer-bg', 'var(--floating-surface-bg, #ffffff)');
    }
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
        <div className="subnav-flyout__title">{item.flyoutTitle || item.label}</div>
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
