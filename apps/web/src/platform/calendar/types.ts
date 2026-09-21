import type { BezentIconName } from '../../design-system/icons';

/**
 * Presentation contract for the global Calendar utility (the rail's
 * "Schedule" drawer). Not a scheduling engine and not any application's
 * calendar domain — applications contribute events in this shape.
 */
export type CalendarEventTone = 'accent' | 'success' | 'warning' | 'neutral';

export interface CalendarEvent {
  id: string;
  title: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  /** Display times, e.g. "09:30 AM". */
  time: string;
  endTime?: string;
  person?: string;
  location?: string;
  /** Event category label, shown in the detail view. */
  category: string;
  /** Contributing source, e.g. an application/module name. */
  sourceLabel: string;
  icon: BezentIconName;
  /** Accent colour family for the event's left border and icon. */
  tone?: CalendarEventTone;
  description?: string;
  participants?: string[];
}
