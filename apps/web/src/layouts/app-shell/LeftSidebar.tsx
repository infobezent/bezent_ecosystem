import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { BezentNavIcon } from '../../design-system/icons';
import { SubNavFlyout } from './SubNavFlyout';
import type { ShellNavItem } from './types';
import './LeftSidebar.css';

export interface LeftSidebarProps {
  items: ShellNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Selected sub-destination of the active item. */
  activeSubId?: string;
  onSubSelect?: (itemId: string, subId: string) => void;
  /** When present, renders the More button that toggles the launcher. */
  more?: {
    active: boolean;
    open: boolean;
    onToggle: () => void;
    hasLauncherOnlyItems?: boolean;
  };
  /** Optional container height override for deterministic testing */
  testAvailableHeight?: number;
  /** Optional flyout parent ID override for deterministic testing */
  testFlyoutParentId?: string | null;
}

/**
 * Determines whether a navigation item should open a flyout drawer.
 * - Items with 0 or 1 child navigate directly without opening a flyout drawer.
 * - Items with 2 or more children open a sub-navigation flyout drawer.
 */
export function canItemOpenFlyout(item: ShellNavItem): boolean {
  return Boolean(item.subItems && item.subItems.length > 1);
}

/**
 * Canonical layout tokens from design-system/tokens/layout.css:
 * --shell-nav-item-height: 68px
 * --shell-nav-item-gap: 2px
 */
const NAV_ITEM_HEIGHT = 68;
const NAV_ITEM_GAP = 2;
const NAV_LIST_PADDING_BOTTOM = 8;

function getRequiredHeight(count: number): number {
  if (count <= 0) return 0;
  return count * NAV_ITEM_HEIGHT + (count - 1) * NAV_ITEM_GAP;
}

/**
 * Global left navigation rail. Source: old approved UI `LeftNav` +
 * `ZohoRailBtn` (`App.tsx` 621-1019). It renders whatever `items` it is
 * given — the catalog (HRMS or otherwise) is supplied by the caller.
 * The More button (when given) opens the generic launcher; the old
 * user-swappable dynamic slot needed persisted preferences and is not
 * migrated.
 *
 * Flyout model: ONE state value, `flyoutParentId`, decides which item (if
 * any) owns the sub-navigation flyout, so at most one flyout can exist.
 * It is driven by hover/focus only and is independent of selection, which
 * comes from the URL through `activeId`. The flyout is rendered inside the
 * owning item's wrapper (so it is CSS-anchored to that item, scroll-safe,
 * with no inline style) — but only for the owner, never for other items.
 */
export function LeftSidebar({
  items,
  activeId,
  onSelect,
  activeSubId,
  onSubSelect,
  more,
  testAvailableHeight,
  testFlyoutParentId,
}: LeftSidebarProps) {
  const [flyoutParentId, setFlyoutParentId] = useState<string | null>(testFlyoutParentId ?? null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closeNow = () => {
    cancelClose();
    setFlyoutParentId(null);
  };
  // Old behaviour: a 200ms grace, one timer for the whole sidebar. Entering
  // any item cancels it and takes ownership immediately (no stacking).
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyoutParentId(null), 200);
  };
  const openFlyout = (item: ShellNavItem) => {
    cancelClose();
    // Items without sub-navigation or with exactly one sub-item never open a flyout.
    // Single-child destinations navigate directly to that destination on select.
    setFlyoutParentId(canItemOpenFlyout(item) ? item.id : null);
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el.clientHeight > 0) {
        setContainerHeight(el.clientHeight);
      }
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect?.height ?? (el ? el.clientHeight : 0);
          if (height > 0) {
            setContainerHeight(height);
          }
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => cancelClose, []);

  // Determine available vertical height inside navigation list
  const effectiveHeight =
    testAvailableHeight ??
    containerHeight ??
    (typeof window !== 'undefined' ? Math.max(0, window.innerHeight - 64 - 36 - 8 - 6 - 8) : 800);

  const availableHeight = Math.max(0, effectiveHeight - NAV_LIST_PADDING_BOTTOM);

  // Generic capacity and overflow calculation
  const totalItemsHeight = getRequiredHeight(items.length);
  const allItemsFit = totalItemsHeight <= availableHeight;

  let visibleItems: ShellNavItem[];
  let shouldRenderMore: boolean;

  if (allItemsFit) {
    if (more?.hasLauncherOnlyItems) {
      // All items fit, but launcher contains additional destinations
      const heightWithMore = totalItemsHeight + NAV_ITEM_GAP + NAV_ITEM_HEIGHT;
      if (heightWithMore <= availableHeight) {
        visibleItems = items;
        shouldRenderMore = true;
      } else {
        const availableForItems = availableHeight - (NAV_ITEM_HEIGHT + NAV_ITEM_GAP);
        const fitCount = Math.max(
          1,
          Math.min(
            items.length - 1,
            Math.floor((availableForItems + NAV_ITEM_GAP) / (NAV_ITEM_HEIGHT + NAV_ITEM_GAP)),
          ),
        );
        visibleItems = items.slice(0, fitCount);
        shouldRenderMore = true;
      }
    } else {
      // All items fit and no launcher-only items exist: DO NOT render More
      visibleItems = items;
      shouldRenderMore = false;
    }
  } else {
    // Items genuinely overflow available rail space
    const availableForItems = availableHeight - (NAV_ITEM_HEIGHT + NAV_ITEM_GAP);
    const fitCount = Math.max(
      1,
      Math.min(
        items.length - 1,
        Math.floor((availableForItems + NAV_ITEM_GAP) / (NAV_ITEM_HEIGHT + NAV_ITEM_GAP)),
      ),
    );
    visibleItems = items.slice(0, fitCount);
    shouldRenderMore = Boolean(more);
  }

  // The More launcher takes precedence: no flyout while it is open.
  const activeFlyoutParent = testFlyoutParentId !== undefined ? testFlyoutParentId : flyoutParentId;
  const visibleFlyoutId = more?.open ? null : activeFlyoutParent;

  // Single active rail item invariant (BZ-03):
  // At any given time, only ONE rail item has active styling.
  // When More launcher is open, More is the active item; the current page item receives a secondary dimmed current style.
  const isMoreOpen = !!more?.open;
  const activeRailItem = isMoreOpen ? 'more' : activeId;

  // If the active item is in overflow, More indicates active selection
  const isActiveItemInOverflow = Boolean(
    activeId && !visibleItems.some((item) => item.id === activeId),
  );
  const isMoreButtonActive =
    activeRailItem === 'more' || (!isMoreOpen && (Boolean(more?.active) || isActiveItemInOverflow));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && flyoutParentId) closeNow();
  };

  return (
    <aside
      className="left-sidebar"
      id="left-sidebar"
      aria-label="Primary navigation"
      onKeyDown={onKeyDown}
    >
      <nav ref={navRef} className="left-sidebar__list">
        {visibleItems.map((item) => {
          const isActive = item.id === activeRailItem;
          const isCurrentPage = isMoreOpen && item.id === activeId;

          return (
            <NavItem
              key={item.id}
              item={item}
              active={isActive}
              isCurrentPage={isCurrentPage}
              activeSubId={item.id === activeId ? activeSubId : undefined}
              flyoutOpen={visibleFlyoutId === item.id}
              onEnter={() => openFlyout(item)}
              onLeave={scheduleClose}
              onSelect={() => {
                closeNow();
                onSelect?.(item.id);
              }}
              onSubSelect={(subId) => {
                closeNow();
                onSubSelect?.(item.id, subId);
              }}
            />
          );
        })}
        {more && shouldRenderMore && (
          <MoreButton {...more} active={isMoreButtonActive} onEnter={closeNow} />
        )}
      </nav>
    </aside>
  );
}

/**
 * Sidebar nav item (icon + up-to-two-line label). Kept here rather than in
 * design-system/components: its geometry (78x68, label area) is defined by
 * the shell's rail, and it is only meaningful inside it. The icon visuals
 * are the design-system `BezentNavIcon`.
 */
function NavItem({
  item,
  active,
  isCurrentPage,
  activeSubId,
  flyoutOpen,
  onEnter,
  onLeave,
  onSelect,
  onSubSelect,
}: {
  item: ShellNavItem;
  active: boolean;
  isCurrentPage?: boolean;
  activeSubId?: string;
  /** Whether THIS item currently owns the sidebar's single flyout. */
  flyoutOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onSubSelect: (subId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasFlyout = canItemOpenFlyout(item);

  return (
    <div
      className={`left-sidebar__item-wrap ${flyoutOpen && hasFlyout ? 'is-flyout-open' : ''}`.trim()}
      onMouseEnter={() => {
        setHovered(true);
        onEnter();
      }}
      onMouseLeave={() => {
        setHovered(false);
        onLeave();
      }}
      onFocus={onEnter}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onLeave();
      }}
    >
      <button
        type="button"
        className={`left-sidebar__item ${active ? 'is-active' : ''} ${isCurrentPage ? 'is-current-page' : ''}`.trim()}
        aria-current={active || isCurrentPage ? 'page' : undefined}
        aria-haspopup={hasFlyout ? 'menu' : undefined}
        aria-expanded={hasFlyout ? flyoutOpen : undefined}
        onClick={onSelect}
      >
        <BezentNavIcon name={item.icon} active={active} hovered={hovered} size={20}>
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className="left-sidebar__badge-dot" aria-hidden="true" />
          )}
        </BezentNavIcon>
        <span className="left-sidebar__label-area">
          <span className="left-sidebar__label">{item.label}</span>
        </span>
      </button>
      {flyoutOpen && hasFlyout && (
        <SubNavFlyout item={item} activeSubId={activeSubId} onSelect={onSubSelect} />
      )}
    </div>
  );
}

/** The More button: same geometry as a nav item; opens the launcher. */
function MoreButton({
  active,
  open,
  onToggle,
  onEnter,
}: {
  active: boolean;
  open: boolean;
  onToggle: () => void;
  /** Hovering/focusing More closes any sidebar flyout. */
  onEnter: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const selected = active || open;
  return (
    <div
      className="left-sidebar__item-wrap"
      onMouseEnter={() => {
        setHovered(true);
        onEnter();
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={onEnter}
    >
      <button
        type="button"
        className={`left-sidebar__item ${selected ? 'is-active' : ''}`.trim()}
        data-more-toggle=""
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        <BezentNavIcon name="more" active={selected} hovered={hovered} size={20}>
          {/* Old behaviour: a dot marks More when the active destination lives inside it. */}
          {active && !open && <span className="left-sidebar__more-dot" aria-hidden="true" />}
        </BezentNavIcon>
        <span className="left-sidebar__label-area">
          <span className="left-sidebar__label">More</span>
        </span>
      </button>
    </div>
  );
}
