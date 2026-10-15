import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { BezentNavIcon, type BezentIconName } from '../../design-system/icons';
import { Tooltip } from '../../design-system/components/Tooltip';
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
  /** Fixed Settings item anchored at the bottom of the Left Sidebar (Change 01) */
  settingsItem?: ShellNavItem | null;
  /** Selection callback when bottom Settings is clicked */
  onSettingsSelect?: () => void;
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
 * Short labels mapping per specification:
 * - Administration: 'Administration' (Change 01)
 * - Settings: 'Settings'
 * - Leave, Attendance, Timesheets, Performance.
 */
const SHORT_NAV_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  administration: 'Administration',
  admin: 'Administration',
  leave: 'Leave',
  attendance: 'Attendance',
  timesheets: 'Timesheets',
  performance: 'Performance',
  settings: 'Settings',
};

export function getShortNavLabel(item: ShellNavItem): string {
  const shortLabel = SHORT_NAV_LABELS[item.id];
  if (shortLabel) {
    return shortLabel;
  }
  if (item.label.toLowerCase() === 'administration' || item.label.toLowerCase() === 'admin') {
    return 'Administration';
  }
  if (item.label.toLowerCase() === 'settings' || item.label.toLowerCase() === 'hr settings') {
    return 'Settings';
  }
  return item.label;
}

export function isAdminNavItem(item: ShellNavItem): boolean {
  return (
    item.id === 'administration' ||
    item.id === 'admin' ||
    item.label.toLowerCase() === 'administration' ||
    item.label.toLowerCase() === 'admin'
  );
}

export function isSettingsNavItem(item: ShellNavItem): boolean {
  return (
    item.id === 'settings' ||
    item.label.toLowerCase() === 'settings' ||
    item.label.toLowerCase() === 'hr settings'
  );
}

/**
 * Canonical layout tokens from design-system/tokens/layout.css:
 * --shell-nav-item-height: 64px
 * --shell-nav-item-gap: 8px
 */
const NAV_ITEM_HEIGHT = 64;
const NAV_ITEM_GAP = 8;
const NAV_LIST_PADDING_BOTTOM = 6;
const PINNED_BOTTOM_HEIGHT = 64 + 16; // 64px item + 1px divider + margins

function getRequiredHeight(count: number): number {
  if (count <= 0) return 0;
  return count * NAV_ITEM_HEIGHT + (count - 1) * NAV_ITEM_GAP;
}

/**
 * Global left navigation rail.
 * - 104px width, flat on shell background
 * - 44x44 rounded-6 tile with 22px centered icon
 * - Short label below (12px, 500 weight, 1 line)
 * - Active: accent-soft fill, weight 600, 6px radius
 * - Structure: Dashboard (fixed) -> Administration (fixed) -> Dynamic items -> More -> Settings (fixed bottom)
 */
export function LeftSidebar({
  items,
  activeId,
  onSelect,
  activeSubId,
  onSubSelect,
  more,
  settingsItem,
  onSettingsSelect,
  testAvailableHeight,
  testFlyoutParentId,
}: LeftSidebarProps) {
  const [flyoutParentId, setFlyoutParentId] = useState<string | null>(testFlyoutParentId ?? null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const closeNow = useCallback(() => {
    cancelClose();
    setFlyoutParentId(null);
  }, [cancelClose]);

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyoutParentId(null), 200);
  };

  const openFlyout = (item: ShellNavItem) => {
    cancelClose();
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

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!flyoutParentId) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeNow();
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [flyoutParentId, closeNow]);

  // Resolve fixed items: Dashboard & Administration at top, Settings anchored at bottom
  const dashboardItem = items.find((item) => item.id === 'dashboard');
  const adminItem = items.find(isAdminNavItem);
  const resolvedSettingsItem = settingsItem ?? items.find(isSettingsNavItem);

  const fixedTopItems: ShellNavItem[] = [];
  if (dashboardItem) fixedTopItems.push(dashboardItem);
  if (adminItem && adminItem !== dashboardItem) fixedTopItems.push(adminItem);

  // Dynamic rail items: all items excluding fixed top items and settings
  const dynamicItems = items.filter(
    (item) =>
      item !== dashboardItem &&
      item !== adminItem &&
      (!resolvedSettingsItem || item.id !== resolvedSettingsItem.id),
  );

  // Determine available vertical height inside navigation list
  const reservedForPinned = resolvedSettingsItem ? PINNED_BOTTOM_HEIGHT : 0;
  const availableHeight =
    testAvailableHeight !== undefined
      ? Math.max(0, testAvailableHeight - NAV_LIST_PADDING_BOTTOM - reservedForPinned)
      : containerHeight !== null
        ? Math.max(0, containerHeight - NAV_LIST_PADDING_BOTTOM)
        : typeof window !== 'undefined'
          ? Math.max(0, window.innerHeight - 64 - 36 - 8 - 6 - 8 - NAV_LIST_PADDING_BOTTOM - reservedForPinned)
          : 800;

  // Capacity calculation
  const fixedTopHeight = getRequiredHeight(fixedTopItems.length);
  const totalItemsHeight = getRequiredHeight(fixedTopItems.length + dynamicItems.length);
  const allItemsFit = totalItemsHeight <= availableHeight;

  let visibleDynamicItems: ShellNavItem[];
  let shouldRenderMore: boolean;

  if (allItemsFit) {
    if (more?.hasLauncherOnlyItems) {
      const heightWithMore = totalItemsHeight + (totalItemsHeight > 0 ? NAV_ITEM_GAP : 0) + NAV_ITEM_HEIGHT;
      if (heightWithMore <= availableHeight) {
        visibleDynamicItems = dynamicItems;
        shouldRenderMore = true;
      } else {
        const availableForDynamic =
          availableHeight - fixedTopHeight - (fixedTopItems.length > 0 ? NAV_ITEM_GAP : 0) - (NAV_ITEM_HEIGHT + NAV_ITEM_GAP);
        const fitCount = Math.max(
          0,
          Math.min(
            dynamicItems.length,
            Math.floor((availableForDynamic + NAV_ITEM_GAP) / (NAV_ITEM_HEIGHT + NAV_ITEM_GAP)),
          ),
        );
        if (fitCount >= dynamicItems.length) {
          visibleDynamicItems = dynamicItems;
        } else {
          const activeIdx = activeId ? dynamicItems.findIndex((d) => d.id === activeId) : -1;
          const activeItem = activeIdx >= 0 ? dynamicItems[activeIdx] : undefined;
          if (activeItem && activeIdx >= fitCount) {
            const needed = Math.max(0, fitCount - 1);
            visibleDynamicItems = [...dynamicItems.slice(Math.max(0, activeIdx - needed), activeIdx), activeItem];
          } else {
            visibleDynamicItems = dynamicItems.slice(0, fitCount);
          }
        }
        shouldRenderMore = true;
      }
    } else {
      visibleDynamicItems = dynamicItems;
      shouldRenderMore = false;
    }
  } else {
    const availableForDynamic =
      availableHeight - fixedTopHeight - (fixedTopItems.length > 0 ? NAV_ITEM_GAP : 0) - (NAV_ITEM_HEIGHT + NAV_ITEM_GAP);
    const fitCount = Math.max(
      0,
      Math.min(
        dynamicItems.length,
        Math.floor((availableForDynamic + NAV_ITEM_GAP) / (NAV_ITEM_HEIGHT + NAV_ITEM_GAP)),
      ),
    );
    if (fitCount >= dynamicItems.length) {
      visibleDynamicItems = dynamicItems;
    } else {
      const activeIdx = activeId ? dynamicItems.findIndex((d) => d.id === activeId) : -1;
      const activeItem = activeIdx >= 0 ? dynamicItems[activeIdx] : undefined;
      if (activeItem && activeIdx >= fitCount) {
        const needed = Math.max(0, fitCount - 1);
        visibleDynamicItems = [...dynamicItems.slice(Math.max(0, activeIdx - needed), activeIdx), activeItem];
      } else {
        visibleDynamicItems = dynamicItems.slice(0, fitCount);
      }
    }
    shouldRenderMore = Boolean(more);
  }

  const visibleItems = [...fixedTopItems, ...visibleDynamicItems];

  const activeFlyoutParent = testFlyoutParentId !== undefined ? testFlyoutParentId : flyoutParentId;
  const visibleFlyoutId = more?.open ? null : activeFlyoutParent;

  const isMoreOpen = !!more?.open;
  const activeRailItem = isMoreOpen ? 'more' : activeId;

  const isSettingsActive = Boolean(resolvedSettingsItem && resolvedSettingsItem.id === activeId);
  const isTopFixedActive = Boolean(fixedTopItems.some((item) => item.id === activeId));
  const isActiveItemInOverflow = Boolean(
    activeId &&
      !isSettingsActive &&
      !isTopFixedActive &&
      !visibleItems.some((item) => item.id === activeId),
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
      <div className="left-sidebar__container">
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
                  if (!canItemOpenFlyout(item)) {
                    closeNow();
                  } else {
                    setFlyoutParentId((prev) => (prev === item.id ? null : item.id));
                  }
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

        {resolvedSettingsItem && (
          <div className="left-sidebar__bottom">
            <div className="left-sidebar__divider" role="separator" aria-orientation="horizontal" />
            <NavItem
              key={resolvedSettingsItem.id}
              item={resolvedSettingsItem}
              overrideIcon="settings"
              active={resolvedSettingsItem.id === activeRailItem}
              isCurrentPage={isMoreOpen && resolvedSettingsItem.id === activeId}
              activeSubId={resolvedSettingsItem.id === activeId ? activeSubId : undefined}
              flyoutOpen={visibleFlyoutId === resolvedSettingsItem.id}
              onEnter={() => openFlyout(resolvedSettingsItem)}
              onLeave={scheduleClose}
              onSelect={() => {
                if (!canItemOpenFlyout(resolvedSettingsItem)) {
                  closeNow();
                } else {
                  setFlyoutParentId((prev) =>
                    prev === resolvedSettingsItem.id ? null : resolvedSettingsItem.id,
                  );
                }
                if (onSettingsSelect) {
                  onSettingsSelect();
                } else {
                  onSelect?.(resolvedSettingsItem.id);
                }
              }}
              onSubSelect={(subId) => {
                closeNow();
                onSubSelect?.(resolvedSettingsItem.id, subId);
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * Sidebar nav item (44x44 rounded-12 tile with 22px icon, short label below).
 */
function NavItem({
  item,
  overrideIcon,
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
  overrideIcon?: BezentIconName;
  active: boolean;
  isCurrentPage?: boolean;
  activeSubId?: string;
  flyoutOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onSubSelect: (subId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasFlyout = canItemOpenFlyout(item);
  const displayLabel = getShortNavLabel(item);
  const iconName = overrideIcon ?? item.icon;

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
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setHovered(false);
          onLeave();
        }
      }}
    >
      <button
        type="button"
        className={`left-sidebar__item ${active ? 'is-active' : ''} ${isCurrentPage ? 'is-current-page' : ''}`.trim()}
        title={item.label}
        aria-label={item.label}
        aria-current={active || isCurrentPage ? 'page' : undefined}
        aria-haspopup={hasFlyout ? 'menu' : undefined}
        aria-expanded={hasFlyout ? flyoutOpen : undefined}
        onClick={onSelect}
      >
        <div className="left-sidebar__icon-tile">
          <BezentNavIcon name={iconName} active={active} hovered={hovered} size={22}>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="left-sidebar__badge-dot" aria-hidden="true" />
            )}
          </BezentNavIcon>
        </div>
        <span className="left-sidebar__label-area">
          <span className="left-sidebar__label">{displayLabel}</span>
        </span>
      </button>
      {hovered && !flyoutOpen && <Tooltip label={item.label} direction="right" />}
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
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
      }}
    >
      <button
        type="button"
        className={`left-sidebar__item ${selected ? 'is-active' : ''}`.trim()}
        title="More"
        aria-label="More"
        data-more-toggle=""
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="left-sidebar__icon-tile">
          <BezentNavIcon name="more" active={selected} hovered={hovered} size={22}>
            {active && !open && <span className="left-sidebar__more-dot" aria-hidden="true" />}
          </BezentNavIcon>
        </div>
        <span className="left-sidebar__label-area">
          <span className="left-sidebar__label">More</span>
        </span>
      </button>
      {hovered && !open && <Tooltip label="More" direction="right" />}
    </div>
  );
}
