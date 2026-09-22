import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BezentIcon } from '../../design-system/icons';
import type { CalendarEvent } from './types';
import './CalendarPage.css';

interface OutletContextData {
  events?: CalendarEvent[];
}

const DAYS_OF_WEEK = [
  { short: 'SUN', full: 'Sunday' },
  { short: 'MON', full: 'Monday' },
  { short: 'TUE', full: 'Tuesday' },
  { short: 'WED', full: 'Wednesday' },
  { short: 'THU', full: 'Thursday' },
  { short: 'FRI', full: 'Friday' },
  { short: 'SAT', full: 'Saturday' },
] as const;

const HOURS = [
  '7 AM',
  '8 AM',
  '9 AM',
  '10 AM',
  '11 AM',
  '12 PM',
  '1 PM',
  '2 PM',
  '3 PM',
  '4 PM',
  '5 PM',
  '6 PM',
  '7 PM',
  '8 PM',
] as const;

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay()); // Sunday as start of week
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

export function CalendarPage() {
  const outlet = useOutletContext<OutletContextData | undefined>();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedIso, setSelectedIso] = useState(() => toIso(new Date()));
  const [activeView, setActiveView] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00 AM');

  // Mini Calendar Month Navigation
  const [miniMonthDate, setMiniMonthDate] = useState(() => new Date());

  const weekStartDate = useMemo(() => startOfWeek(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return DAYS_OF_WEEK.map((day, i) => {
      const date = addDays(weekStartDate, i);
      const iso = toIso(date);
      const isToday = toIso(new Date()) === iso;
      const isSelected = selectedIso === iso;
      return {
        ...day,
        date,
        dayNum: date.getDate(),
        iso,
        isToday,
        isSelected,
      };
    });
  }, [weekStartDate, selectedIso]);

  const events: CalendarEvent[] = outlet?.events ?? [];

  // Mini month grid calculation
  const miniGrid = useMemo(() => {
    const year = miniMonthDate.getFullYear();
    const month = miniMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({ day: prevDaysInMonth - i, inMonth: false, iso: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const iso = toIso(dateObj);
      cells.push({
        day: d,
        inMonth: true,
        iso,
        isToday: toIso(new Date()) === iso,
        isSelected: selectedIso === iso,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: cells.length - daysInMonth + 1, inMonth: false, iso: '' });
    }
    return cells;
  }, [miniMonthDate, selectedIso]);

  function handlePrevWeek() {
    setCurrentDate((d) => addDays(d, -7));
  }

  function handleNextWeek() {
    setCurrentDate((d) => addDays(d, 7));
  }

  function handleToday() {
    const now = new Date();
    setCurrentDate(now);
    setSelectedIso(toIso(now));
    setMiniMonthDate(now);
  }

  return (
    <div className="cal-page">
      {/* ── Top Header Toolbar ────────────────────────────────────────── */}
      <header className="cal-page__header">
        <div className="cal-page__header-left">
          <button type="button" className="cal-page__today-btn" onClick={handleToday}>
            Today
          </button>

          <div className="cal-page__nav-arrows">
            <button
              type="button"
              className="cal-page__arrow-btn"
              aria-label="Previous week"
              onClick={handlePrevWeek}
            >
              <BezentIcon name="chevronLeft" size={18} color="currentColor" />
            </button>
            <button
              type="button"
              className="cal-page__arrow-btn"
              aria-label="Next week"
              onClick={handleNextWeek}
            >
              <BezentIcon name="chevronRight" size={18} color="currentColor" />
            </button>
          </div>

          <h1 className="cal-page__date-heading">{MONTH_FORMAT.format(currentDate)}</h1>
        </div>

        <div className="cal-page__header-right">
          <div className="cal-page__view-pill">
            {(['Day', 'Week', 'Month'] as const).map((view) => (
              <button
                key={view}
                type="button"
                className={`cal-page__view-option ${activeView === view ? 'is-active' : ''}`.trim()}
                onClick={() => setActiveView(view)}
              >
                {view}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="cal-page__header-btn"
            onClick={() => setCreateOpen(true)}
            aria-label="Create Event"
          >
            <BezentIcon name="plusSign" size={16} color="currentColor" />
            <span>Event</span>
          </button>
        </div>
      </header>

      {/* ── Main Layout (Left Rail + Weekly Grid) ──────────────────────── */}
      <div className="cal-page__body">
        {/* Left Sidebar */}
        <aside className="cal-page__sidebar">
          {/* Big Create Button */}
          <button
            type="button"
            className="cal-page__create-pill"
            onClick={() => setCreateOpen(true)}
          >
            <BezentIcon name="plusSign" size={20} color="#1a73e8" />
            <span>Create</span>
          </button>

          {/* Mini Calendar Widget */}
          <div className="cal-mini">
            <div className="cal-mini__header">
              <span className="cal-mini__month-label">
                {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
                  miniMonthDate,
                )}
              </span>
              <div className="cal-mini__nav">
                <button
                  type="button"
                  className="cal-mini__nav-btn"
                  aria-label="Previous month"
                  onClick={() =>
                    setMiniMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                >
                  <BezentIcon name="chevronLeft" size={14} color="currentColor" />
                </button>
                <button
                  type="button"
                  className="cal-mini__nav-btn"
                  aria-label="Next month"
                  onClick={() =>
                    setMiniMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                >
                  <BezentIcon name="chevronRight" size={14} color="currentColor" />
                </button>
              </div>
            </div>

            <div className="cal-mini__grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="cal-mini__day-col">
                  {day}
                </div>
              ))}
              {miniGrid.map((cell, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={!cell.inMonth}
                  className={`cal-mini__cell ${!cell.inMonth ? 'is-outside' : ''} ${cell.isToday ? 'is-today' : ''} ${cell.isSelected ? 'is-selected' : ''}`.trim()}
                  onClick={() => {
                    if (cell.iso) {
                      setSelectedIso(cell.iso);
                      setCurrentDate(new Date(cell.iso));
                    }
                  }}
                >
                  {cell.day}
                </button>
              ))}
            </div>
          </div>

          {/* Search for People */}
          <div className="cal-page__search-people">
            <BezentIcon name="search" size={16} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search for people"
              aria-label="Search for people"
              className="cal-page__search-input"
            />
          </div>

          {/* My Calendars Filter */}
          <div className="cal-page__calendars-section">
            <div className="cal-page__section-title">My Calendars</div>
            <label className="cal-page__cal-item">
              <input type="checkbox" defaultChecked className="cal-page__checkbox cal-check-blue" />
              <span>SABIN RAHUL</span>
            </label>
            <label className="cal-page__cal-item">
              <input
                type="checkbox"
                defaultChecked
                className="cal-page__checkbox cal-check-green"
              />
              <span>Birthdays</span>
            </label>
            <label className="cal-page__cal-item">
              <input type="checkbox" defaultChecked className="cal-page__checkbox cal-check-teal" />
              <span>HRMS Tasks & Reviews</span>
            </label>
            <label className="cal-page__cal-item">
              <input
                type="checkbox"
                defaultChecked
                className="cal-page__checkbox cal-check-amber"
              />
              <span>Holidays in India</span>
            </label>
          </div>
        </aside>

        {/* ── Main Weekly Calendar Grid ───────────────────────────────── */}
        <main className="cal-page__grid-container">
          {/* Header Row with Days */}
          <div className="cal-page__grid-header">
            <div className="cal-page__timezone-slot">
              <span>GMT+05:30</span>
            </div>

            {weekDays.map((col) => (
              <div
                key={col.iso}
                className={`cal-page__day-header-cell ${col.isToday ? 'is-today' : ''}`.trim()}
              >
                <div className="cal-page__day-name">{col.short}</div>
                <div
                  className={`cal-page__day-badge ${col.isToday ? 'is-today-badge' : ''}`.trim()}
                >
                  {col.dayNum}
                </div>
              </div>
            ))}
          </div>

          {/* Time Gutter + Days Columns Grid Body */}
          <div className="cal-page__grid-body">
            {/* Red Current Time Line Marker */}
            <div className="cal-page__time-line-indicator" aria-hidden="true">
              <div className="cal-page__time-line-dot" />
              <div className="cal-page__time-line-bar" />
            </div>

            {/* Hourly Row Grid Background */}
            <div className="cal-page__time-gutter">
              {HOURS.map((hour) => (
                <div key={hour} className="cal-page__hour-slot">
                  <span className="cal-page__hour-label">{hour}</span>
                </div>
              ))}
            </div>

            {/* 7 Days Columns with Events */}
            <div className="cal-page__columns-wrapper">
              {weekDays.map((col, colIdx) => {
                const colEvents = events.filter((e) => e.date === col.iso);

                return (
                  <div key={col.iso} className="cal-page__day-column">
                    {/* Hour grid cells */}
                    {HOURS.map((hour, hIdx) => (
                      <div
                        key={hIdx}
                        className="cal-page__cell-slot"
                        onClick={() => {
                          setNewEventTime(hour);
                          setSelectedIso(col.iso);
                          setCreateOpen(true);
                        }}
                      />
                    ))}

                    {/* Render Events */}
                    {colEvents.map((evt, evtIdx) => {
                      const slotClass = `cal-page__event-block--slot-${evtIdx % 3}`;
                      return (
                        <button
                          key={evt.id}
                          type="button"
                          className={`cal-page__event-block cal-page__event-block--${evt.tone ?? 'accent'} ${slotClass}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEvent(evt);
                          }}
                        >
                          <div className="cal-page__event-title">{evt.title}</div>
                          <div className="cal-page__event-time">
                            {evt.time} {evt.endTime ? `– ${evt.endTime}` : ''}
                          </div>
                          {evt.location && (
                            <div className="cal-page__event-location">{evt.location}</div>
                          )}
                        </button>
                      );
                    })}

                    {/* Pre-seeded demo events on active days if empty */}
                    {colIdx === 2 && colEvents.length === 0 && (
                      <>
                        <button
                          type="button"
                          className="cal-page__event-block cal-page__event-block--accent cal-page__event-block--slot-morning"
                          onClick={() =>
                            setActiveEvent({
                              id: 'demo-1',
                              title: 'HRMS Sprint Alignment',
                              date: col.iso,
                              time: '10:00 AM',
                              endTime: '11:00 AM',
                              category: 'Engineering',
                              sourceLabel: 'BEZENT HRMS',
                              icon: 'dashboard',
                              tone: 'accent',
                              location: 'Meeting Room Alpha / Google Meet',
                              description:
                                'Review sprint deliverables, architectural decisions, and next milestone roadmap.',
                            })
                          }
                        >
                          <div className="cal-page__event-title">HRMS Sprint Alignment</div>
                          <div className="cal-page__event-time">10:00 AM – 11:00 AM</div>
                          <div className="cal-page__event-location">Meeting Room Alpha</div>
                        </button>

                        <button
                          type="button"
                          className="cal-page__event-block cal-page__event-block--success cal-page__event-block--slot-afternoon"
                          onClick={() =>
                            setActiveEvent({
                              id: 'demo-2',
                              title: 'Quarterly Performance Review',
                              date: col.iso,
                              time: '2:30 PM',
                              endTime: '3:30 PM',
                              category: 'Human Resources',
                              sourceLabel: 'Performance Module',
                              icon: 'performance',
                              tone: 'success',
                              location: 'HR Executive Suite',
                              description:
                                'Review engineering team objectives, KPIs, and career growth trajectories.',
                            })
                          }
                        >
                          <div className="cal-page__event-title">Performance Review</div>
                          <div className="cal-page__event-time">2:30 PM – 3:30 PM</div>
                          <div className="cal-page__event-location">HR Suite</div>
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* ── Event Detail Modal ────────────────────────────────────────── */}
      {activeEvent && (
        <div className="cal-modal-overlay" onClick={() => setActiveEvent(null)}>
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal__header">
              <span className={`cal-modal__chip cal-modal__chip--${activeEvent.tone ?? 'accent'}`}>
                <BezentIcon name={activeEvent.icon} size={18} color="currentColor" />
              </span>
              <div className="cal-modal__titles">
                <h2 className="cal-modal__heading">{activeEvent.title}</h2>
                <span className="cal-modal__category">{activeEvent.category}</span>
              </div>
              <button
                type="button"
                className="cal-modal__close-btn"
                onClick={() => setActiveEvent(null)}
              >
                <BezentIcon name="close" size={18} color="currentColor" />
              </button>
            </div>

            <div className="cal-modal__body">
              <div className="cal-modal__row">
                <BezentIcon name="calendar" size={16} color="var(--text-tertiary)" />
                <div>
                  <div className="cal-modal__label">Date & Time</div>
                  <div className="cal-modal__val">
                    {activeEvent.date} · {activeEvent.time}{' '}
                    {activeEvent.endTime ? `– ${activeEvent.endTime}` : ''}
                  </div>
                </div>
              </div>

              {activeEvent.location && (
                <div className="cal-modal__row">
                  <BezentIcon name="explore" size={16} color="var(--text-tertiary)" />
                  <div>
                    <div className="cal-modal__label">Location</div>
                    <div className="cal-modal__val">{activeEvent.location}</div>
                  </div>
                </div>
              )}

              {activeEvent.description && (
                <div className="cal-modal__row">
                  <BezentIcon name="documents" size={16} color="var(--text-tertiary)" />
                  <div>
                    <div className="cal-modal__label">Description</div>
                    <div className="cal-modal__val">{activeEvent.description}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="cal-modal__footer">
              <button
                type="button"
                className="cal-modal__done-btn"
                onClick={() => setActiveEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Create Event Modal ──────────────────────────────────── */}
      {createOpen && (
        <div className="cal-modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal__header">
              <span className="cal-modal__chip cal-modal__chip--accent">
                <BezentIcon name="plusSign" size={18} color="currentColor" />
              </span>
              <div className="cal-modal__titles">
                <h2 className="cal-modal__heading">Schedule New Event</h2>
                <span className="cal-modal__category">BEZENT Calendar</span>
              </div>
              <button
                type="button"
                className="cal-modal__close-btn"
                onClick={() => setCreateOpen(false)}
              >
                <BezentIcon name="close" size={18} color="currentColor" />
              </button>
            </div>

            <div className="cal-modal__body">
              <div className="cal-modal__input-group">
                <label className="cal-modal__label">Event Title</label>
                <input
                  type="text"
                  className="cal-modal__input"
                  placeholder="Add title and attendees"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="cal-modal__input-group">
                <label className="cal-modal__label">Time</label>
                <input
                  type="text"
                  className="cal-modal__input"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
              </div>
            </div>

            <div className="cal-modal__footer">
              <button
                type="button"
                className="cal-modal__cancel-btn"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cal-modal__done-btn"
                onClick={() => {
                  setCreateOpen(false);
                  setNewEventTitle('');
                }}
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
