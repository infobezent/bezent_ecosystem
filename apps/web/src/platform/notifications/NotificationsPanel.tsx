import { useEffect, useRef, useState } from 'react';
import { BezentIcon } from '../../design-system/icons';
import { UtilityDrawerFilterPanel, UtilityDrawerTabs, UtilityLinkButton } from '../utility-drawer';
import type { NotificationItem, NotificationTab } from './types';
import './NotificationsPanel.css';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'action', label: 'Action Required' },
  { id: 'mention', label: 'Mentions' },
] as const;

const FILTERS = [
  { label: 'Status', options: ['All', 'Unread', 'Read'] },
  { label: 'Priority', options: ['Critical', 'Action', 'Info'] },
  { label: 'Date', options: ['Today', '7 Days', '30 Days'] },
] as const;

export interface NotificationsPanelProps {
  notifications: NotificationItem[];
  /** Called after the leave animation, or immediately if none plays. */
  onClose: () => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onViewAll?: () => void;
}

/**
 * The global Notifications panel anchored under the top-nav bell. Source:
 * old approved UI `NotificationDropdown` / `NotifRow` (`App.tsx`
 * 2414-2802) and the `notifDropdownEnter/Leave` animations. It is a
 * floating panel (not a rail drawer) in the approved UI. Escape and an
 * outside mousedown close it, as in the old code. The full notifications
 * page is a separate, deferred view.
 */
export function NotificationsPanel({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onViewAll,
}: NotificationsPanelProps) {
  const [tab, setTab] = useState<NotificationTab>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setClosing(true);
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      // The bell toggles the panel itself; ignore presses on it.
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !(target as Element).closest?.('[data-notifications-toggle]')
      ) {
        setClosing(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const visible = notifications.filter((n) => tab === 'all' || n.tabs.includes(tab));
  const groups = [
    { label: 'Today', items: visible.filter((n) => n.group === 'today') },
    { label: 'Earlier', items: visible.filter((n) => n.group === 'earlier') },
  ];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className={`notif-panel ${closing ? 'is-closing' : ''}`.trim()}
      role="dialog"
      aria-label="Notifications"
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClose();
      }}
    >
      <span className="notif-panel__glow" aria-hidden="true" />

      <div className="notif-panel__header">
        <div className="notif-panel__title-group">
          <h2 className="notif-panel__title">Notifications</h2>
          {unread > 0 && <span className="notif-panel__count">{unread}</span>}
        </div>
        <div className="notif-panel__actions">
          <button type="button" className="notif-panel__action" onClick={onMarkAllRead}>
            <BezentIcon name="check" size={15} color="currentColor" strokeWidth={2} />
            <span>Mark all read</span>
          </button>
          <button
            type="button"
            className={`notif-panel__action ${filterOpen ? 'is-active' : ''}`.trim()}
            aria-pressed={filterOpen}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <BezentIcon name="filter" size={15} color="currentColor" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            className="notif-panel__close"
            aria-label="Close notifications"
            onClick={() => setClosing(true)}
          >
            <BezentIcon name="close" size={16} color="currentColor" />
          </button>
        </div>
      </div>

      <UtilityDrawerTabs tabs={TABS} value={tab} onChange={setTab} label="Notification views" />
      {filterOpen && <UtilityDrawerFilterPanel groups={FILTERS} />}

      <div className="notif-panel__list">
        {groups.map(
          (group) =>
            group.items.length > 0 && (
              <section key={group.label}>
                <h3 className="notif-panel__group-label">{group.label}</h3>
                {group.items.map((n) => (
                  <NotificationRow key={n.id} item={n} onRead={() => onMarkRead?.(n.id)} />
                ))}
              </section>
            ),
        )}
        {visible.length === 0 && <div className="notif-panel__empty">No notifications</div>}
      </div>

      <div className="notif-panel__footer">
        <button
          type="button"
          className="notif-panel__view-all"
          onClick={() => {
            setClosing(true);
            onViewAll?.();
          }}
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}

function NotificationRow({ item, onRead }: { item: NotificationItem; onRead: () => void }) {
  return (
    <div className="notif-row" onClick={onRead}>
      <span className={`notif-row__icon ${item.read ? '' : 'is-unread'}`.trim()}>
        <BezentIcon name={item.icon} size={16} color="currentColor" />
      </span>
      <div className="notif-row__body">
        <div className={`notif-row__title ${item.read ? '' : 'is-unread'}`.trim()}>
          {item.title}
        </div>
        {item.description && <div className="notif-row__desc">{item.description}</div>}
        <div className="notif-row__meta">
          <span>{item.sourceLabel}</span>
          <span className="notif-row__dot" aria-hidden="true" />
          <span>{item.timeLabel}</span>
        </div>
        <UtilityLinkButton onClick={onRead}>{item.actionLabel} →</UtilityLinkButton>
      </div>
      {!item.read && <span className="notif-row__unread-dot" role="img" aria-label="Unread" />}
    </div>
  );
}
