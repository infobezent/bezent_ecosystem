import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { formatDate, formatDateIso } from '../../../shared/globalization';
import { BezentIcon } from '../../icons';
import './LocaleDatePicker.css';

export interface LocaleDatePickerProps {
  id?: string;
  name?: string;
  value?: string; // Standard "YYYY-MM-DD"
  onChange?: (dateIso: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string; // "YYYY-MM-DD"
  locale?: string; // BCP 47 (e.g. "en-US", "en-IN")
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Year range around today's year shown in year select. Default 100 years back + 20 years forward. */
  yearRange?: { from?: number; to?: number };
}

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function LocaleDatePicker({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = 'Select date...',
  helperText,
  error,
  minDate,
  maxDate,
  locale = 'en-US',
  disabled = false,
  required = false,
  className = '',
  yearRange,
}: LocaleDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial view year and month from value or today
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-');
      const y = Number(parts[0]) || 2026;
      const m = Number(parts[1]) || 1;
      const d = Number(parts[2]) || 1;
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

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

  // Localized month names
  const monthOptions = useMemo(() => {
    return MONTH_NAMES_EN.map((name, index) => ({ index, name }));
  }, []);

  // Sync view year/month when value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-');
      const y = Number(parts[0]) || 2026;
      const m = Number(parts[1]) || 1;
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Close on click outside
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

  // Localized narrow weekday names starting Sunday
  const weekdayHeaders = useMemo(() => {
    const days: string[] = [];
    const baseSunday = new Date(2026, 0, 4); // Jan 4, 2026 was a Sunday
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseSunday);
      d.setDate(baseSunday.getDate() + i);
      days.push(new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d));
    }
    return days;
  }, [locale]);

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateIso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
    }> = [];

    const todayIso = formatDateIso(new Date());

    // Leading days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const iso = formatDateIso(prevDate);
      const isPastMin = minDate ? iso < minDate : false;
      const isFutureMax = maxDate ? iso > maxDate : false;
      days.push({
        dateIso: iso,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isDisabled: isPastMin || isFutureMax,
        isToday: iso === todayIso,
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(viewYear, viewMonth, i);
      const iso = formatDateIso(currDate);
      const isPastMin = minDate ? iso < minDate : false;
      const isFutureMax = maxDate ? iso > maxDate : false;
      days.push({
        dateIso: iso,
        dayNumber: i,
        isCurrentMonth: true,
        isDisabled: isPastMin || isFutureMax,
        isToday: iso === todayIso,
      });
    }

    // Trailing days from next month to fill grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(viewYear, viewMonth + 1, i);
      const iso = formatDateIso(nextDate);
      const isPastMin = minDate ? iso < minDate : false;
      const isFutureMax = maxDate ? iso > maxDate : false;
      days.push({
        dateIso: iso,
        dayNumber: i,
        isCurrentMonth: false,
        isDisabled: isPastMin || isFutureMax,
        isToday: iso === todayIso,
      });
    }

    return days;
  }, [viewYear, viewMonth, minDate, maxDate]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const handleSelectDay = (dateIso: string) => {
    onChange?.(dateIso);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const todayIso = formatDateIso(new Date());
    onChange?.(todayIso);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleMonthChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setViewMonth(Number(e.target.value));
  };

  const handleYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setViewYear(Number(e.target.value));
  };

  // Formatted display value
  const formattedDisplayValue = useMemo(() => {
    if (!value) return '';
    try {
      return formatDate(value, { locale, dateStyle: 'medium' });
    } catch {
      return value;
    }
  }, [value, locale]);

  return (
    <div
      ref={containerRef}
      className={`bezent-date-picker-wrapper ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {label && (
        <label htmlFor={id} className="bezent-date-picker-label">
          {label}
          {required && ' *'}
        </label>
      )}

      {name && <input type="hidden" name={name} value={value || ''} />}

      <button
        type="button"
        id={id}
        className={`bezent-date-picker-trigger ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="bezent-date-picker-trigger__value">
          <span className="bezent-date-picker-trigger__icon" aria-hidden="true">
            <BezentIcon name="calendar" size={16} />
          </span>
          {formattedDisplayValue ? (
            <span>{formattedDisplayValue}</span>
          ) : (
            <span className="bezent-date-picker-trigger__placeholder">{placeholder}</span>
          )}
        </span>
        <span className="bezent-date-picker-trigger__chevron" aria-hidden="true">
          <BezentIcon name="chevron_down" size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="bezent-date-picker-popover" role="dialog" aria-label="Choose date">
          {/* Header with month & year selects + prev/next nav */}
          <div className="bezent-date-picker-header">
            <button
              type="button"
              className="bezent-date-picker-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <BezentIcon name="chevron_left" size={16} />
            </button>

            <div className="bezent-date-picker-header-selects">
              <select
                className="bezent-date-picker-month-select"
                value={viewMonth}
                onChange={handleMonthChange}
                aria-label="Select month"
              >
                {monthOptions.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                className="bezent-date-picker-year-select"
                value={viewYear}
                onChange={handleYearChange}
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
              className="bezent-date-picker-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <BezentIcon name="chevron_right" size={16} />
            </button>
          </div>

          <div className="bezent-date-picker-grid" role="grid">
            {weekdayHeaders.map((w, idx) => (
              <span key={idx} className="bezent-date-picker-weekday">
                {w}
              </span>
            ))}

            {calendarDays.map((d) => {
              const isSelected = value === d.dateIso;
              return (
                <button
                  key={d.dateIso}
                  type="button"
                  className={`bezent-date-picker-day ${isSelected ? 'is-selected' : ''} ${d.isToday ? 'is-today' : ''} ${!d.isCurrentMonth ? 'is-outside-month' : ''}`}
                  disabled={d.isDisabled}
                  onClick={() => handleSelectDay(d.dateIso)}
                  aria-label={d.dateIso}
                  aria-selected={isSelected}
                >
                  {d.dayNumber}
                </button>
              );
            })}
          </div>

          <div className="bezent-date-picker-footer">
            <button type="button" className="bezent-date-picker-action-btn" onClick={handleClear}>
              Clear
            </button>
            <button
              type="button"
              className="bezent-date-picker-action-btn"
              onClick={handleSelectToday}
            >
              Today
            </button>
          </div>
        </div>
      )}

      {error ? (
        <span className="bezent-date-picker-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-date-picker-helper">{helperText}</span>
      ) : null}
    </div>
  );
}
