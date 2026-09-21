import type { BezentIconName } from '../../design-system/icons';

/**
 * Presentation contract for the global Notifications panel (the panel
 * under the top-nav bell). Applications contribute notifications in this
 * shape; nothing here is specific to one application.
 */
export type NotificationTab = 'all' | 'action' | 'mention';

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  /** Contributing source, e.g. an application/module name. */
  sourceLabel: string;
  icon: BezentIconName;
  /** Display text, e.g. "5 min ago". */
  timeLabel: string;
  read: boolean;
  group: 'today' | 'earlier';
  /** Which non-"all" tabs list it. */
  tabs: Array<Exclude<NotificationTab, 'all'>>;
  /** Row action text ("Review", "Open"...). */
  actionLabel: string;
}
