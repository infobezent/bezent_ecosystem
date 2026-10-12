import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type ChangeEvent,
} from 'react';
import { formatDate, formatDateIso } from '../../../shared/globalization';
import { BezentIcon } from '../../icons';
import './DateRangePicker.css';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface DateRange {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
}

export interface DateRangePickerProps {
  id?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  onChange?: (range: DateRange) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  locale?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Year range shown in year select. Default 100 years back + 20 years forward. */
  yearRange?: { from?: number; to?: number };
}

export function DateRangePicker({
  id,
  startDate = '',
  endDate = '',
  onChange,
  label,
  placeholder = 'Select date range...',
  helperText,
  error,
  locale = 'en-US',
  disabled = false,
  required = false,
  className = '',
  yearRange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalStart, setInternalStart] = useState(startDate);
  const [internalEnd, setInternalEnd] = useState(endDate);

  const initialDate = useMemo(() => {
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const parts = startDate.split('-');
      const y = Number(parts[0]) || 2026;
      const m = Number(parts[1]) || 1;
      const d = Number(parts[2]) || 1;
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [startDate]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Year options
  const yearOptions = useMemo(() => {
    const today = new Date().getFullYear();
    const from = yearRange?.from ?? today - 100;
    const to = yearRange?.to ?? today + 20;
    const years: number[] = [];
    for (let y = to; y >= from; y--) {
      years.push(y);
    }
    return years;
  }, [yearRange]);

  const monthOptions = useMemo(() => {
    return MONTH_NAMES_EN.map((name, index) => ({ index, name }));
  }, []);

  useEffect(() => {
    setInternalStart(startDate);
    setInternalEnd(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const weekdayHeaders = useMemo(() => {
    const days: string[] = [];
    const baseSunday = new Date(2026, 0, 4);
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseSunday);
      d.setDate(baseSunday.getDate() + i);
      days.push(new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d));
    }
    return days;
  }, [locale]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateIso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      days.push({
        dateIso: formatDateIso(prevDate),
        dayNumber: dayNum,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(viewYear, viewMonth, i);
      days.push({
        dateIso: formatDateIso(currDate),
        dayNumber: i,
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(viewYear, viewMonth + 1, i);
      days.push({
        dateIso: formatDateIso(nextDate),
        dayNumber: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleDayClick = (dateIso: string) => {
    if (!internalStart || (internalStart && internalEnd)) {
      setInternalStart(dateIso);
      setInternalEnd('');
    } else {
      if (dateIso < internalStart) {
        setInternalStart(dateIso);
        setInternalEnd(internalStart);
        onChange?.({ startDate: dateIso, endDate: internalStart });
        setIsOpen(false);
      } else {
        setInternalEnd(dateIso);
        onChange?.({ startDate: internalStart, endDate: dateIso });
        setIsOpen(false);
      }
    }
  };

  const applyPreset = (daysBack: number, customEnd?: Date) => {
    const end = customEnd || new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - daysBack);
    const startIso = formatDateIso(start);
    const endIso = formatDateIso(end);
    setInternalStart(startIso);
    setInternalEnd(endIso);
    onChange?.({ startDate: startIso, endDate: endIso });
    setIsOpen(false);
  };

  const applyThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startIso = formatDateIso(start);
    const endIso = formatDateIso(end);
    setInternalStart(startIso);
    setInternalEnd(endIso);
    onChange?.({ startDate: startIso, endDate: endIso });
    setIsOpen(false);
  };

  const applyLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const startIso = formatDateIso(start);
    const endIso = formatDateIso(end);
    setInternalStart(startIso);
    setInternalEnd(endIso);
    onChange?.({ startDate: startIso, endDate: endIso });
    setIsOpen(false);
  };

  const formattedDisplay = useMemo(() => {
    if (!startDate && !endDate) return '';
    if (startDate && !endDate) return `${formatDate(startDate, { locale })} — …`;
    if (startDate && endDate) {
      return `${formatDate(startDate, { locale })} — ${formatDate(endDate, { locale })}`;
    }
    return '';
  }, [startDate, endDate, locale]);

  return (
    <div
      ref={containerRef}
      className={`bezent-date-range-wrapper ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label htmlFor={id} className="bezent-date-range-label">
          {label}
          {required && ' *'}
        </label>
      )}

      <button
        type="button"
        id={id}
        className={`bezent-date-range-trigger ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="bezent-date-range-trigger__value">
          <span className="bezent-date-range-trigger__icon" aria-hidden="true">
            <BezentIcon name="calendar" size={16} />
          </span>
          {formattedDisplay ? (
            <span>{formattedDisplay}</span>
          ) : (
            <span className="bezent-date-range-trigger__placeholder">{placeholder}</span>
          )}
        </span>
        <BezentIcon name="chevron_down" size={16} />
      </button>

      {isOpen && (
        <div className="bezent-date-range-popover" role="dialog" aria-label="Select date range">
          <div className="bezent-date-range-presets">
            <button type="button" className="bezent-date-range-preset-btn" onClick={() => applyPreset(0)}>
              Today
            </button>
            <button
              type="button"
              className="bezent-date-range-preset-btn"
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                applyPreset(0, y);
              }}
            >
              Yesterday
            </button>
            <button type="button" className="bezent-date-range-preset-btn" onClick={() => applyPreset(6)}>
              Last 7 Days
            </button>
            <button type="button" className="bezent-date-range-preset-btn" onClick={() => applyPreset(29)}>
              Last 30 Days
            </button>
            <button type="button" className="bezent-date-range-preset-btn" onClick={applyThisMonth}>
              This Month
            </button>
            <button type="button" className="bezent-date-range-preset-btn" onClick={applyLastMonth}>
              Last Month
            </button>
          </div>

          <div className="bezent-date-range-calendar">
            <div className="bezent-date-range-header">
              <button
                type="button"
                className="bezent-date-range-nav-btn"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear((y) => y - 1);
                  } else {
                    setViewMonth((m) => m - 1);
                  }
                }}
                aria-label="Previous month"
              >
                <BezentIcon name="chevron_left" size={16} />
              </button>

              <div className="bezent-date-range-header-selects">
                <select
                  className="bezent-date-range-month-select"
                  value={viewMonth}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setViewMonth(Number(e.target.value))}
                  aria-label="Select month"
                >
                  {monthOptions.map((m) => (
                    <option key={m.index} value={m.index}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  className="bezent-date-range-year-select"
                  value={viewYear}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setViewYear(Number(e.target.value))}
                  aria-label="Select year"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="bezent-date-range-nav-btn"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear((y) => y + 1);
                  } else {
                    setViewMonth((m) => m + 1);
                  }
                }}
                aria-label="Next month"
              >
                <BezentIcon name="chevron_right" size={16} />
              </button>
            </div>

            <div className="bezent-date-range-grid">
              {weekdayHeaders.map((w, idx) => (
                <span key={idx} className="bezent-date-range-weekday">
                  {w}
                </span>
              ))}

              {calendarDays.map((d) => {
                const isStart = internalStart === d.dateIso;
                const isEnd = internalEnd === d.dateIso;
                const inRange =
                  internalStart && internalEnd && d.dateIso > internalStart && d.dateIso < internalEnd;

                return (
                  <button
                    key={d.dateIso}
                    type="button"
                    className={`bezent-date-range-day ${isStart ? 'is-start' : ''} ${isEnd ? 'is-end' : ''} ${inRange ? 'is-in-range' : ''} ${!d.isCurrentMonth ? 'is-outside-month' : ''}`}
                    onClick={() => handleDayClick(d.dateIso)}
                  >
                    {d.dayNumber}
                  </button>
                );
              })}
            </div>

            <div className="bezent-date-range-footer">
              <button
                type="button"
                className="bezent-date-range-action-btn"
                onClick={() => {
                  setInternalStart('');
                  setInternalEnd('');
                  onChange?.({ startDate: '', endDate: '' });
                  setIsOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <span className="bezent-date-range-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-date-range-helper">{helperText}</span>
      ) : null}
    </div>
  );
}
