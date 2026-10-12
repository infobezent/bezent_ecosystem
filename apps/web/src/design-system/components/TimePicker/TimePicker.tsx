import {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
  type WheelEvent,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
import './TimePicker.css';

export interface TimePickerProps {
  id?: string;
  name?: string;
  /** 24-hour time string in "HH:mm" or "HH:mm:ss" format (e.g. "04:00:00") */
  value?: string;
  onChange?: (time: string) => void;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  'aria-label'?: string;
  /** Whether to display and adjust seconds. Defaults to true if value is 8 characters (HH:mm:ss). */
  showSeconds?: boolean;
  /** Step interval for minutes (e.g. 1, 5, 15, 30). Default is 1. */
  minuteStep?: number;
}

type TimeSegment = 'hours' | 'minutes' | 'seconds';

function padZero(num: number): string {
  return String(num).padStart(2, '0');
}

export function TimePicker({
  id,
  name,
  value = '00:00:00',
  onChange,
  label,
  helperText,
  error,
  disabled = false,
  required = false,
  className = '',
  'aria-label': ariaLabel,
  showSeconds: propShowSeconds,
  minuteStep = 1,
}: TimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);
  const secondsInputRef = useRef<HTMLInputElement>(null);

  const [activeSegment, setActiveSegment] = useState<TimeSegment>('hours');
  const [isFocused, setIsFocused] = useState(false);

  // Parse hours, minutes, seconds from value
  const parseTime = useCallback((timeStr: string) => {
    const parts = (timeStr || '00:00:00').split(':');
    const h = Math.min(23, Math.max(0, parseInt(parts[0] || '0', 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10) || 0));
    const s = Math.min(59, Math.max(0, parseInt(parts[2] || '0', 10) || 0));
    return { hours: h, minutes: m, seconds: s };
  }, []);

  const hasSeconds = propShowSeconds ?? (value ? value.split(':').length >= 3 : true);
  const parsed = parseTime(value);

  const formatAndEmit = useCallback(
    (h: number, m: number, s: number) => {
      const hh = padZero(h);
      const mm = padZero(m);
      const ss = padZero(s);
      const formatted = hasSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
      onChange?.(formatted);
    },
    [hasSeconds, onChange],
  );

  const stepHours = useCallback(
    (delta: number) => {
      if (disabled) return;
      const newH = (parsed.hours + delta + 24) % 24;
      formatAndEmit(newH, parsed.minutes, parsed.seconds);
    },
    [disabled, parsed, formatAndEmit],
  );

  const stepMinutes = useCallback(
    (delta: number) => {
      if (disabled) return;
      const step = delta * minuteStep;
      let newM = parsed.minutes + step;
      let newH = parsed.hours;

      if (newM >= 60) {
        newM = newM % 60;
        newH = (newH + 1) % 24;
      } else if (newM < 0) {
        newM = (newM + 60) % 60;
        newH = (newH - 1 + 24) % 24;
      }

      formatAndEmit(newH, newM, parsed.seconds);
    },
    [disabled, parsed, minuteStep, formatAndEmit],
  );

  const stepSeconds = useCallback(
    (delta: number) => {
      if (disabled) return;
      let newS = parsed.seconds + delta;
      let newM = parsed.minutes;
      const newH = parsed.hours;

      if (newS >= 60) {
        newS = 0;
        newM = (newM + 1) % 60;
      } else if (newS < 0) {
        newS = 59;
        newM = (newM - 1 + 60) % 60;
      }

      formatAndEmit(newH, newM, newS);
    },
    [disabled, parsed, formatAndEmit],
  );

  const stepCurrentSegment = useCallback(
    (delta: number) => {
      if (activeSegment === 'hours') {
        stepHours(delta);
      } else if (activeSegment === 'minutes') {
        stepMinutes(delta);
      } else if (activeSegment === 'seconds') {
        stepSeconds(delta);
      }
    },
    [activeSegment, stepHours, stepMinutes, stepSeconds],
  );

  const handleKeyDown = (segment: TimeSegment, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepCurrentSegment(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepCurrentSegment(-1);
    } else if (e.key === 'ArrowRight') {
      if (segment === 'hours') {
        e.preventDefault();
        minutesInputRef.current?.focus();
        minutesInputRef.current?.select();
      } else if (segment === 'minutes' && hasSeconds) {
        e.preventDefault();
        secondsInputRef.current?.focus();
        secondsInputRef.current?.select();
      }
    } else if (e.key === 'ArrowLeft') {
      if (segment === 'seconds') {
        e.preventDefault();
        minutesInputRef.current?.focus();
        minutesInputRef.current?.select();
      } else if (segment === 'minutes') {
        e.preventDefault();
        hoursInputRef.current?.focus();
        hoursInputRef.current?.select();
      }
    }
  };

  const handleWheel = (segment: TimeSegment, e: WheelEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    if (segment === 'hours') stepHours(delta);
    else if (segment === 'minutes') stepMinutes(delta);
    else if (segment === 'seconds') stepSeconds(delta);
  };

  const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(-2);
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(23, Math.max(0, num));
      formatAndEmit(clamped, parsed.minutes, parsed.seconds);
      if (raw.length >= 2 || num >= 3) {
        minutesInputRef.current?.focus();
        minutesInputRef.current?.select();
      }
    }
  };

  const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(-2);
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(59, Math.max(0, num));
      formatAndEmit(parsed.hours, clamped, parsed.seconds);
      if ((raw.length >= 2 || num >= 6) && hasSeconds) {
        secondsInputRef.current?.focus();
        secondsInputRef.current?.select();
      }
    }
  };

  const handleSecondsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(-2);
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(59, Math.max(0, num));
      formatAndEmit(parsed.hours, parsed.minutes, clamped);
    }
  };

  const handleFocus = (segment: TimeSegment, e: FocusEvent<HTMLInputElement>) => {
    setActiveSegment(segment);
    setIsFocused(true);
    e.target.select();
  };

  const handleBlur = () => {
    // Check if focus moved outside the component
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 0);
  };

  const inputId =
    id || (label ? `bezent-time-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div
      ref={containerRef}
      className={`bezent-time-picker-wrapper ${error ? 'has-error' : ''} ${disabled ? 'is-disabled bezent-time-picker--disabled' : ''} ${isFocused ? 'is-focused' : ''} ${className}`.trim()}
    >
      {label && (
        <label htmlFor={inputId ? `${inputId}-hours` : undefined} className="bezent-input-label">
          {label}
          {required && (
            <span className="bezent-required-indicator" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div
        className="bezent-time-picker-box"
        onClick={(e) => {
          if (disabled) return;
          if (e.target === e.currentTarget) {
            hoursInputRef.current?.focus();
          }
        }}
      >
        {/* Clock Glyph */}
        <span className="bezent-time-picker-icon" aria-hidden="true">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>

        {/* 24-Hour Segments: HH : mm : ss */}
        <div
          className="bezent-time-picker-segments"
          role="group"
          aria-label={ariaLabel || label || 'Time Picker'}
        >
          {/* Hours Input */}
          <input
            ref={hoursInputRef}
            id={inputId ? `${inputId}-hours` : undefined}
            name={name ? `${name}_hours` : undefined}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={padZero(parsed.hours)}
            disabled={disabled}
            aria-label="Hours (00 to 23)"
            className={`bezent-time-segment-input ${activeSegment === 'hours' && isFocused ? 'is-active' : ''}`}
            onChange={handleHoursChange}
            onFocus={(e) => handleFocus('hours', e)}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown('hours', e)}
            onWheel={(e) => handleWheel('hours', e)}
          />

          <span className="bezent-time-separator" aria-hidden="true">
            :
          </span>

          {/* Minutes Input */}
          <input
            ref={minutesInputRef}
            id={inputId ? `${inputId}-minutes` : undefined}
            name={name ? `${name}_minutes` : undefined}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={padZero(parsed.minutes)}
            disabled={disabled}
            aria-label="Minutes (00 to 59)"
            className={`bezent-time-segment-input ${activeSegment === 'minutes' && isFocused ? 'is-active' : ''}`}
            onChange={handleMinutesChange}
            onFocus={(e) => handleFocus('minutes', e)}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown('minutes', e)}
            onWheel={(e) => handleWheel('minutes', e)}
          />

          {hasSeconds && (
            <>
              <span className="bezent-time-separator" aria-hidden="true">
                :
              </span>

              {/* Seconds Input */}
              <input
                ref={secondsInputRef}
                id={inputId ? `${inputId}-seconds` : undefined}
                name={name ? `${name}_seconds` : undefined}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={padZero(parsed.seconds)}
                disabled={disabled}
                aria-label="Seconds (00 to 59)"
                className={`bezent-time-segment-input ${activeSegment === 'seconds' && isFocused ? 'is-active' : ''}`}
                onChange={handleSecondsChange}
                onFocus={(e) => handleFocus('seconds', e)}
                onBlur={handleBlur}
                onKeyDown={(e) => handleKeyDown('seconds', e)}
                onWheel={(e) => handleWheel('seconds', e)}
              />
            </>
          )}

          <span className="bezent-time-badge" title="24-Hour notation">
            24h
          </span>
        </div>

        {/* Stepper Buttons (▲ / ▼) */}
        {!disabled && (
          <div className="bezent-time-steppers" aria-hidden="true">
            <button
              type="button"
              tabIndex={-1}
              className="bezent-time-step-btn"
              onClick={() => stepCurrentSegment(1)}
              aria-label={`Increment ${activeSegment}`}
              title={`Increase ${activeSegment} (+1)`}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="bezent-time-step-btn"
              onClick={() => stepCurrentSegment(-1)}
              aria-label={`Decrement ${activeSegment}`}
              title={`Decrease ${activeSegment} (-1)`}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {error ? (
        <span className="bezent-input-feedback is-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span className="bezent-input-feedback">{helperText}</span>
      ) : null}
    </div>
  );
}

export default TimePicker;
