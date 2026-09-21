import { useState } from 'react';
import { BezentIcon, type BezentIconName } from '../../design-system/icons';
import { EmptyState } from '../../design-system/components';
import { UtilityIconAction } from '../utility-drawer';
import type { CalendarEvent } from './types';
import './CalendarDrawer.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); // Monday
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

const HEADER_DATE = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const WEEK_OF = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

export interface CalendarDrawerProps {
  events: CalendarEvent[];
  onClose: () => void;
  onOpenFullCalendar?: () => void;
  onCreateEvent?: () => void;
}

/**
 * The global Calendar ("Schedule") drawer body. Source: old approved UI
 * `ScheduleDrawer` / `CalEventBlock` / `EventDetailView` (`App.tsx`
 * 4756-5018). The old week strip was a hard-coded Sep 7-13 demo; this one
 * derives the current week from the date. The full calendar page and the
 * create-event form are separate, deferred UI.
 */
export function CalendarDrawer({
  events,
  onClose,
  onOpenFullCalendar,
  onCreateEvent,
}: CalendarDrawerProps) {
  const [today] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selected, setSelected] = useState(() => toIso(today));
  const [viewEventId, setViewEventId] = useState<string | null>(null);

  const days = DAY_LABELS.map((label, i) => {
    const date = addDays(weekStart, i);
    return { label, date, iso: toIso(date) };
  });
  const dayEvents = events.filter((e) => e.date === selected);
  const viewedEvent = viewEventId ? events.find((e) => e.id === viewEventId) : undefined;
  const selectedDate = days.find((d) => d.iso === selected)?.date;
  const isCurrentWeek = toIso(weekStart) === toIso(startOfWeek(today));
  const headerDate = selectedDate
    ? HEADER_DATE.format(selectedDate)
    : `Week of ${WEEK_OF.format(weekStart)}`;

  if (viewedEvent) {
    return <EventDetail event={viewedEvent} onBack={() => setViewEventId(null)} />;
  }

  return (
    <div className="calendar-drawer">
      <div className="calendar-drawer__header">
        <div className="calendar-drawer__title-row">
          <span className="calendar-drawer__chip">
            <BezentIcon name="calendar" size={14} color="currentColor" active />
          </span>
          <h2 className="calendar-drawer__title">Schedule</h2>
          <button
            type="button"
            className="calendar-drawer__today"
            onClick={() => {
              setWeekStart(startOfWeek(today));
              setSelected(toIso(today));
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="calendar-drawer__nav"
            aria-label="Previous week"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            <BezentIcon name="chevronLeft" size={16} color="currentColor" />
          </button>
          <button
            type="button"
            className="calendar-drawer__nav"
            aria-label="Next week"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
            <BezentIcon name="chevronRight" size={16} color="currentColor" />
          </button>
          <UtilityIconAction icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="calendar-drawer__date">{headerDate}</div>
      </div>

      <div className="calendar-drawer__week" role="group" aria-label="Week days">
        {days.map((d) => {
          const isSelected = d.iso === selected;
          return (
            <button
              key={d.iso}
              type="button"
              aria-pressed={isSelected}
              aria-label={HEADER_DATE.format(d.date)}
              className={`calendar-drawer__day ${isSelected ? 'is-selected' : ''}`.trim()}
              onClick={() => setSelected(d.iso)}
            >
              <span className="calendar-drawer__day-label">{d.label}</span>
              <span className="calendar-drawer__day-number">{d.date.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="calendar-drawer__list">
        {dayEvents.length > 0 ? (
          <>
            <div className="calendar-drawer__summary">
              {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''} scheduled
            </div>
            {dayEvents.map((event) => (
              <EventBlock key={event.id} event={event} onOpen={() => setViewEventId(event.id)} />
            ))}
          </>
        ) : (
          <EmptyState
            size="compact"
            title="No upcoming events"
            description={
              isCurrentWeek ? 'Your schedule is clear for this date.' : 'Nothing scheduled here.'
            }
            primaryAction={{ label: 'Schedule Event', onClick: onCreateEvent }}
          />
        )}
      </div>

      <div className="calendar-drawer__footer">
        <button type="button" className="calendar-drawer__add" onClick={onCreateEvent}>
          <BezentIcon name="plusSign" size={14} color="currentColor" />
          Event
        </button>
        <button type="button" className="calendar-drawer__full" onClick={onOpenFullCalendar}>
          Open Full Calendar →
        </button>
      </div>
    </div>
  );
}

function EventBlock({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  return (
    <div className="calendar-event">
      <div className="calendar-event__time">{event.time}</div>
      <button
        type="button"
        className={`calendar-event__card calendar-event__card--${event.tone ?? 'neutral'}`}
        onClick={onOpen}
      >
        <span className="calendar-event__text">
          <span className="calendar-event__title">{event.title}</span>
          {event.person && <span className="calendar-event__line">{event.person}</span>}
          {event.location && <span className="calendar-event__line">{event.location}</span>}
          <span className="calendar-event__range">
            {event.endTime ? `${event.time} – ${event.endTime}` : event.time} · {event.sourceLabel}
          </span>
        </span>
        <span className="calendar-event__icon">
          <BezentIcon name={event.icon} size={15} color="currentColor" />
        </span>
      </button>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: BezentIconName; label: string; value: string }) {
  return (
    <div className="calendar-detail__row">
      <span className="calendar-detail__row-icon">
        <BezentIcon name={icon} size={15} color="currentColor" />
      </span>
      <div>
        <div className="calendar-detail__label">{label}</div>
        <div className="calendar-detail__value">{value}</div>
      </div>
    </div>
  );
}

/** Event detail, shown inside the drawer in place of the timeline (as in the old UI). */
function EventDetail({ event, onBack }: { event: CalendarEvent; onBack: () => void }) {
  const date = new Date(`${event.date}T00:00:00`);
  return (
    <div className="calendar-drawer calendar-detail">
      <div className="calendar-detail__top">
        <button type="button" className="calendar-detail__back" onClick={onBack}>
          <BezentIcon name="arrowLeft" size={16} color="currentColor" />
          Back
        </button>
      </div>
      <div className="calendar-detail__body">
        <div className="calendar-detail__heading">
          <span
            className={`calendar-detail__tile calendar-event__card--${event.tone ?? 'neutral'}`}
          >
            <BezentIcon name={event.icon} size={18} color="currentColor" />
          </span>
          <div>
            <h2 className="calendar-detail__title">{event.title}</h2>
            <div className="calendar-detail__category">{event.category}</div>
          </div>
        </div>
        <div className="calendar-detail__rows">
          <DetailRow
            icon="calendar"
            label="Date"
            value={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)}
          />
          <DetailRow
            icon="clock"
            label="Time"
            value={event.endTime ? `${event.time} – ${event.endTime}` : event.time}
          />
          {event.person && <DetailRow icon="employees" label="With" value={event.person} />}
          {event.location && <DetailRow icon="explore" label="Location" value={event.location} />}
          <DetailRow icon="apps" label="Source" value={event.sourceLabel} />
          {event.participants && event.participants.length > 0 && (
            <DetailRow
              icon="workforce"
              label="Participants"
              value={event.participants.join(', ')}
            />
          )}
          {event.description && (
            <div className="calendar-detail__description">
              <div className="calendar-detail__label">Description</div>
              <div className="calendar-detail__desc-text">{event.description}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
