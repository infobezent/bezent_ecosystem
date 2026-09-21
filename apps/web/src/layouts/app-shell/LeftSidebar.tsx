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
  more?: { active: boolean; open: boolean; onToggle: () => void };
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
}: LeftSidebarProps) {
  const [flyoutParentId, setFlyoutParentId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // Items without sub-navigation never open an (empty) flyout and close
    // whichever one was open.
    setFlyoutParentId(item.subItems && item.subItems.length > 0 ? item.id : null);
  };

  useEffect(() => cancelClose, []);

  // The More launcher takes precedence: no flyout while it is open.
  const visibleFlyoutId = more?.open ? null : flyoutParentId;

  // Single active rail item invariant (BZ-03):
  // At any given time, only ONE rail item has active styling.
  // When More launcher is open, More is the active item; the current page item receives a secondary dimmed current style.
  const isMoreOpen = !!more?.open;
  const activeRailItem = isMoreOpen ? 'more' : activeId;

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
      <nav className="left-sidebar__list">
        {items.map((item) => {
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
        {more && (
          <MoreButton
            {...more}
            active={activeRailItem === 'more' || (!isMoreOpen && !!more.active)}
            onEnter={closeNow}
          />
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

  return (
    <div
      className="left-sidebar__item-wrap"
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
        aria-haspopup={item.subItems && item.subItems.length > 0 ? 'menu' : undefined}
        aria-expanded={item.subItems && item.subItems.length > 0 ? flyoutOpen : undefined}
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
      {flyoutOpen && <SubNavFlyout item={item} activeSubId={activeSubId} onSelect={onSubSelect} />}
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
