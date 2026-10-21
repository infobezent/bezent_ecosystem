import { useState, useEffect, useMemo, type ReactNode } from 'react';
import {
  Card,
  Badge,
  Button,
  IconButton,
  Inline,
  Stack,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { EssAttendanceRecord } from '../../api/essApi';

export interface AttendanceSummaryMetrics {
  presentDays: number;
  absentDays: number;
  halfDays?: number;
  lateDays?: number;
  lateMarksCount?: number;
  workedMinutes?: number;
  missingPunchesCount?: number;
  attendancePercent: number;
  totalWorkingDays?: number;
}

export interface AttendanceMonthlyCalendarProps {
  initialDate?: Date;
  summary: AttendanceSummaryMetrics;
  history?: EssAttendanceRecord[];
  selectedDateStr?: string;
  onSelectDate?: (dateStr: string) => void;
  onMonthChange?: (newDate: Date) => void;
  onViewDetailsClick?: () => void;
  loading?: boolean;
  extraHeaderActions?: ReactNode;
  hideHeaderTitle?: boolean;
  hideHeader?: boolean;
  hideInlineDetails?: boolean;
  hideSummaryCards?: boolean;
}

function formatDisplayTime(timeStr?: string | null): string {
  if (!timeStr) return '--:--';
  const clean = timeStr.trim();
  if (!clean || clean === '--:--' || clean === 'null' || clean === 'undefined') {
    return '--:--';
  }
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match && match[1] && match[2]) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const padHours = String(hours).padStart(2, '0');
    return `${padHours}:${minutes} ${ampm}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return clean;
}

function formatMinutes(mins?: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayTileContent {
  statusLabel: string;
  subLabel?: string;
  accessibleLabel: string;
}

function getDayTileContent(
  cell: {
    dateStr: string;
    dayNum: number | null;
    statusType: string;
    isToday: boolean;
    record?: EssAttendanceRecord;
  },
  monthName: string,
): DayTileContent {
  const { dayNum, statusType, record } = cell;
  let statusLabel = '';
  let subLabel: string | undefined = undefined;
  let speechDuration = '';

  switch (statusType) {
    case 'present':
      statusLabel = 'Present';
      if (record?.workedMinutes !== undefined && record.workedMinutes > 0) {
        subLabel = formatMinutes(record.workedMinutes);
        const hours = Math.floor(record.workedMinutes / 60);
        const mins = record.workedMinutes % 60;
        speechDuration = `, ${hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : ''}${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
      }
      break;

    case 'late':
      statusLabel = 'Late';
      if (record?.workedMinutes !== undefined && record.workedMinutes > 0) {
        subLabel = formatMinutes(record.workedMinutes);
        const hours = Math.floor(record.workedMinutes / 60);
        const mins = record.workedMinutes % 60;
        speechDuration = `, ${hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : ''}${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
      }
      break;

    case 'half-day':
      statusLabel = 'Half Day';
      if (record?.workedMinutes !== undefined && record.workedMinutes > 0) {
        subLabel = formatMinutes(record.workedMinutes);
        const hours = Math.floor(record.workedMinutes / 60);
        const mins = record.workedMinutes % 60;
        speechDuration = `, ${hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : ''}${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
      }
      break;

    case 'absent':
      statusLabel = 'Absent';
      break;

    case 'missing-punch':
      statusLabel = 'Missing Punch';
      if (record?.workedMinutes !== undefined && record.workedMinutes > 0) {
        subLabel = formatMinutes(record.workedMinutes);
        const hours = Math.floor(record.workedMinutes / 60);
        const mins = record.workedMinutes % 60;
        speechDuration = `, ${hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : ''}${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
      } else {
        subLabel = 'Action Req';
      }
      break;

    case 'leave':
      statusLabel = 'Leave';
      if (record?.notes && record.notes.trim()) {
        subLabel = record.notes.trim();
      } else {
        subLabel = 'Approved';
      }
      break;

    case 'holiday':
      statusLabel = 'Holiday';
      if (record?.notes && record.notes.trim()) {
        subLabel = record.notes.trim();
      } else {
        subLabel = 'Public Holiday';
      }
      break;

    case 'weekly-off':
      statusLabel = 'Weekly Off';
      subLabel = 'Rest Day';
      break;

    case 'pending':
      statusLabel = 'Pending';
      break;

    default:
      if (cell.dateStr && cell.dateStr > new Date().toISOString().slice(0, 10)) {
        statusLabel = 'Scheduled';
      }
      break;
  }

  const accessibleLabel = statusLabel
    ? `${monthName} ${dayNum}, ${statusLabel}${speechDuration || (subLabel ? `, ${subLabel}` : '')}.`
    : `${monthName} ${dayNum}.`;

  return { statusLabel, subLabel, accessibleLabel };
}

function AttendanceCardSparkline({
  variant,
  value,
  history = [],
  color,
  fillColor,
}: {
  variant: 'present' | 'absent' | 'half-day' | 'late' | 'worked' | 'missing-punch';
  value: number;
  history?: EssAttendanceRecord[];
  color: string;
  fillColor: string;
}) {
  const points = useMemo(() => {
    if (history && history.length > 0) {
      const segments = 5;
      const segSize = Math.max(1, Math.floor(history.length / segments));
      const res: number[] = [];
      for (let i = 0; i < segments; i++) {
        const slice = history.slice(i * segSize, (i + 1) * segSize);
        let count = 0;
        if (variant === 'present') {
          count = slice.filter((r) => r.status === 'present').length;
        } else if (variant === 'absent') {
          count = slice.filter((r) => r.status === 'absent').length;
        } else if (variant === 'half-day') {
          count = slice.filter((r) => r.status === 'half_day').length;
        } else if (variant === 'late') {
          count = slice.filter((r) => r.isLate).length;
        } else if (variant === 'worked') {
          count = slice.reduce((acc, r) => acc + (r.workedMinutes || 0), 0) / 60;
        } else if (variant === 'missing-punch') {
          count = slice.filter((r) => r.status === 'incomplete' || r.isMissingPunch).length;
        }
        res.push(count);
      }
      return res;
    }

    if (value === 0) {
      return [0, 0, 0, 0, 0];
    }

    return [
      Math.max(0, Math.round(value * 0.15)),
      Math.max(0, Math.round(value * 0.2)),
      Math.max(0, Math.round(value * 0.3)),
      Math.max(0, Math.round(value * 0.25)),
      Math.max(0, Math.round(value * 0.35)),
    ];
  }, [history, variant, value]);

  const isAllZero = points.every((p) => p === 0);
  const width = 80;
  const height = 24;
  const paddingY = 4;
  const maxVal = Math.max(...points, 1);
  const plotHeight = height - paddingY * 2;

  const coords = points.map((pt, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = isAllZero ? height - 6 : height - paddingY - (pt / maxVal) * plotHeight;
    return { x, y };
  });

  const firstCoord = coords[0] ?? { x: 0, y: height - 6 };
  let pathD = `M ${firstCoord.x},${firstCoord.y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i] ?? { x: 0, y: height - 6 };
    const next = coords[i + 1] ?? { x: width, y: height - 6 };
    const mx = (curr.x + next.x) / 2;
    pathD += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
  }

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const lastCoord = coords[coords.length - 1] ?? { x: width, y: height - 6 };
  const gradId = `spark-grad-${variant}-${value}`;

  return (
    <div className="bezent-attendance-summary__sparkline">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="bezent-attendance-summary__sparkline-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.75" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {!isAllZero && <path d={areaD} fill={`url(#${gradId})`} />}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeDasharray={isAllZero ? '3 3' : undefined}
          strokeOpacity={isAllZero ? 0.45 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastCoord.x} cy={lastCoord.y} r="2.5" fill={color} />
      </svg>
    </div>
  );
}

export function AttendanceMonthlyCalendar({
  initialDate = new Date(),
  summary,
  history = [],
  selectedDateStr: propSelectedDateStr,
  onSelectDate,
  onMonthChange,
  onViewDetailsClick,
  loading = false,
  extraHeaderActions,
  hideHeaderTitle = false,
  hideHeader = false,
  hideInlineDetails = false,
  hideSummaryCards = false,
}: AttendanceMonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);

  useEffect(() => {
    if (initialDate) {
      setCurrentDate((prev) => {
        if (
          prev.getFullYear() === initialDate.getFullYear() &&
          prev.getMonth() === initialDate.getMonth()
        ) {
          return prev;
        }
        return initialDate;
      });
    }
  }, [initialDate]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [internalSelectedDateStr, setInternalSelectedDateStr] = useState<string>(() => {
    if (propSelectedDateStr) return propSelectedDateStr;
    const year = initialDate.getFullYear();
    const month = initialDate.getMonth();
    const now = new Date();
    if (now.getFullYear() === year && now.getMonth() === month) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    return `${year}-${String(month + 1).padStart(2, '0')}-01`;
  });

  const activeSelectedDateStr = propSelectedDateStr ?? internalSelectedDateStr;

  // Check if current view is the current or a future month
  const isCurrentOrFutureMonth = useMemo(() => {
    const now = new Date();
    const nowYearMonth = now.getFullYear() * 12 + now.getMonth();
    const currentYearMonth = currentDate.getFullYear() * 12 + currentDate.getMonth();
    return currentYearMonth >= nowYearMonth;
  }, [currentDate]);

  const handlePrevMonth = () => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(prev);
    const newSelected = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
    setInternalSelectedDateStr(newSelected);
    onSelectDate?.(newSelected);
    onMonthChange?.(prev);
  };

  const handleNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(next);
    const now = new Date();
    let newSelected = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    if (now.getFullYear() === next.getFullYear() && now.getMonth() === next.getMonth()) {
      newSelected = todayStr;
    }
    setInternalSelectedDateStr(newSelected);
    onSelectDate?.(newSelected);
    onMonthChange?.(next);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setInternalSelectedDateStr(todayStr);
    onSelectDate?.(todayStr);
    onMonthChange?.(now);
  };

  const handleSelectDay = (dateStr: string) => {
    setInternalSelectedDateStr(dateStr);
    onSelectDate?.(dateStr);
  };

  // Map history records by date
  const recordsMap = useMemo(() => {
    const map = new Map<string, EssAttendanceRecord>();
    for (const rec of history) {
      if (rec.date) {
        map.set(rec.date, rec);
      }
    }
    return map;
  }, [history]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const startDayIndex = firstDay.getDay(); // 0 is Sunday

    const cells: Array<{
      dateStr: string;
      dayNum: number | null;
      statusType:
        | 'present'
        | 'late'
        | 'half-day'
        | 'absent'
        | 'missing-punch'
        | 'leave'
        | 'holiday'
        | 'pending'
        | 'weekly-off'
        | 'unclassified'
        | 'empty';
      isToday: boolean;
      record?: EssAttendanceRecord;
    }> = [];

    // Preceding empty slots
    for (let i = 0; i < startDayIndex; i++) {
      cells.push({
        dateStr: '',
        dayNum: null,
        statusType: 'empty',
        isToday: false,
      });
    }

    // Days 1 to totalDays
    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(year, month, day);
      const dayOfWeek = dayDate.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const record = recordsMap.get(dateStr);

      let statusType:
        | 'present'
        | 'late'
        | 'half-day'
        | 'absent'
        | 'missing-punch'
        | 'leave'
        | 'holiday'
        | 'pending'
        | 'weekly-off'
        | 'unclassified' = 'unclassified';

      if (isFuture) {
        if (record?.status === 'on_leave') {
          statusType = 'leave';
        } else if (record?.status === 'holiday') {
          statusType = 'holiday';
        } else {
          statusType = 'unclassified';
        }
      } else if (record) {
        if (record.isMissingPunch) {
          statusType = 'missing-punch';
        } else if (record.status === 'present') {
          statusType = record.isLate ? 'late' : 'present';
        } else if (record.status === 'half_day') {
          statusType = 'half-day';
        } else if (record.status === 'absent') {
          statusType = 'absent';
        } else if (record.status === 'on_leave') {
          statusType = 'leave';
        } else if (record.status === 'holiday') {
          statusType = 'holiday';
        } else if (record.status === 'incomplete') {
          statusType = 'pending';
        }
      } else if (isWeekend) {
        statusType = 'weekly-off';
      } else {
        statusType = 'unclassified';
      }

      cells.push({
        dateStr,
        dayNum: day,
        statusType,
        isToday,
        record,
      });
    }

    return cells;
  }, [currentDate, todayStr, recordsMap]);

  // Selected date record details
  const selectedRecord = useMemo(() => {
    return recordsMap.get(activeSelectedDateStr);
  }, [recordsMap, activeSelectedDateStr]);

  const formattedSelectedDate = useMemo(() => {
    if (!activeSelectedDateStr) return '';
    const [y, m, d] = activeSelectedDateStr.split('-').map(Number);
    if (!y || !m || !d) return activeSelectedDateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [activeSelectedDateStr]);

  const selectedDayOfWeek = useMemo(() => {
    if (!activeSelectedDateStr) return 0;
    const [y, m, d] = activeSelectedDateStr.split('-').map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d).getDay();
  }, [activeSelectedDateStr]);

  const isSelectedWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;
  const isSelectedFuture = activeSelectedDateStr > todayStr;

  const monthName = useMemo(() => {
    return currentDate.toLocaleDateString([], { month: 'long' });
  }, [currentDate]);

  return (
    <Card variant="default">
      <Stack gap="md">
        {/* Header Strip */}
        {!hideHeader && (
          <Inline justify="between" align="center" wrap>
            {!hideHeaderTitle ? (
              <Stack gap="xs">
                <h2>Monthly Attendance</h2>
                <span>Your attendance overview and daily shift records</span>
              </Stack>
            ) : (
              <div />
            )}

            <Inline gap="sm" align="center">
              {extraHeaderActions}
              <Badge variant="success" size="md">
                {summary.attendancePercent}% Attendance
              </Badge>
            </Inline>
          </Inline>
        )}

        {/* Responsive Layout */}
        <div
          className={`bezent-attendance-snapshot__layout ${hideSummaryCards ? 'bezent-attendance-snapshot__layout--calendar-only' : ''}`.trim()}
        >
          {/* Left: Calendar & Selected Date Details */}
          <div className="bezent-attendance-calendar">
            {/* Month Navigation */}
            <div className="bezent-attendance-calendar__nav">
              <IconButton label="Previous Month" onClick={handlePrevMonth} disabled={loading}>
                <BezentIcon name="chevronLeft" size={18} />
              </IconButton>

              <span className="bezent-attendance-calendar__month-title">
                {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </span>

              <IconButton
                label="Next Month"
                onClick={handleNextMonth}
                disabled={isCurrentOrFutureMonth || loading}
              >
                <BezentIcon name="chevronRight" size={18} />
              </IconButton>

              <Button variant="ghost" size="sm" onClick={handleToday} disabled={loading}>
                Today
              </Button>
            </div>

            {/* 7-Column Calendar Grid */}
            <div className="bezent-attendance-calendar__grid">
              {WEEKDAY_NAMES.map((name) => (
                <div key={name} className="bezent-attendance-calendar__weekday">
                  {name}
                </div>
              ))}

              {calendarDays.map((cell, idx) => {
                if (cell.statusType === 'empty') {
                  return (
                    <div key={`empty-${idx}`} className="bezent-attendance-calendar__day-wrapper">
                      <span className="bezent-attendance-calendar__tile bezent-attendance-calendar__day bezent-attendance-calendar__day--empty" />
                    </div>
                  );
                }

                const isSelected = cell.dateStr === activeSelectedDateStr;
                const statusTileClass = `bezent-attendance-calendar__tile--${cell.statusType}`;
                const statusDayClass = `bezent-attendance-calendar__day--${cell.statusType}`;
                const todayClass = cell.isToday
                  ? 'bezent-attendance-calendar__tile--today bezent-attendance-calendar__day--today'
                  : '';
                const selectedClass = isSelected
                  ? 'bezent-attendance-calendar__tile--selected bezent-attendance-calendar__day--selected'
                  : '';

                const tile = getDayTileContent(cell, monthName);

                return (
                  <div key={cell.dateStr} className="bezent-attendance-calendar__day-wrapper">
                    <button
                      type="button"
                      className={`bezent-attendance-calendar__tile bezent-attendance-calendar__day ${statusTileClass} ${statusDayClass} ${todayClass} ${selectedClass}`.trim()}
                      onClick={() => handleSelectDay(cell.dateStr)}
                      aria-label={tile.accessibleLabel}
                      aria-pressed={isSelected}
                    >
                      <div className="bezent-attendance-calendar__tile-top">
                        <span className="bezent-attendance-calendar__tile-date">{cell.dayNum}</span>
                        {cell.isToday && (
                          <span
                            className="bezent-attendance-calendar__tile-today-pill"
                            title="Today"
                          >
                            Today
                          </span>
                        )}
                        {cell.record?.isRegularized && !cell.isToday && (
                          <span
                            className="bezent-attendance-calendar__tile-reg-dot"
                            title="Regularized"
                          />
                        )}
                      </div>

                      {tile.statusLabel && (
                        <div className="bezent-attendance-calendar__tile-status">
                          {tile.statusLabel}
                        </div>
                      )}

                      {tile.subLabel && (
                        <div className="bezent-attendance-calendar__tile-sub">{tile.subLabel}</div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Color Legend */}
            <div className="bezent-attendance-calendar__legend">
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--present" />
                <span>Present</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--late" />
                <span>Late</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--half-day" />
                <span>Half Day</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--absent" />
                <span>Absent</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--missing-punch" />
                <span>Missing Punch</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--leave" />
                <span>Leave</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--holiday" />
                <span>Holiday</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--weekly-off" />
                <span>Weekly Off</span>
              </div>
            </div>

            {/* Selected Date Details Box */}
            {!hideInlineDetails && (
              <div className="bezent-attendance-calendar__details">
                <Stack gap="xs">
                  <Inline justify="between" align="center" wrap>
                    <strong>{formattedSelectedDate}</strong>
                    {onViewDetailsClick && (
                      <Button variant="ghost" size="sm" onClick={onViewDetailsClick}>
                        View Attendance Details →
                      </Button>
                    )}
                  </Inline>

                  {selectedRecord ? (
                    <Stack gap="xs">
                      <Inline gap="xs" align="center" wrap>
                        <span>
                          Attendance:{' '}
                          <strong>
                            {selectedRecord.isMissingPunch
                              ? 'Missing Punch'
                              : selectedRecord.isLate
                                ? 'Late (Present)'
                                : selectedRecord.status === 'half_day'
                                  ? 'Half Day'
                                  : selectedRecord.status === 'present'
                                    ? 'Present'
                                    : selectedRecord.status === 'on_leave'
                                      ? 'On Leave'
                                      : selectedRecord.status === 'holiday'
                                        ? 'Holiday'
                                        : selectedRecord.status === 'absent'
                                          ? 'Absent'
                                          : selectedRecord.status}
                          </strong>
                        </span>
                        {selectedRecord.shiftScheduleRef && (
                          <>
                            <span>•</span>
                            <span>{selectedRecord.shiftScheduleRef}</span>
                          </>
                        )}
                      </Inline>

                      <Inline gap="md" align="center" wrap>
                        <span>
                          Check In: <strong>{formatDisplayTime(selectedRecord.checkInTime)}</strong>
                        </span>
                        <span>
                          Check Out:{' '}
                          <strong>{formatDisplayTime(selectedRecord.checkOutTime)}</strong>
                        </span>
                        {selectedRecord.workedMinutes !== undefined &&
                          selectedRecord.workedMinutes > 0 && (
                            <span>
                              Worked: <strong>{formatMinutes(selectedRecord.workedMinutes)}</strong>
                            </span>
                          )}
                        {selectedRecord.notes && (
                          <span>
                            Notes: <strong>{selectedRecord.notes}</strong>
                          </span>
                        )}
                      </Inline>
                    </Stack>
                  ) : isSelectedWeekend ? (
                    <span>
                      Attendance: <strong>Weekly Off</strong>
                    </span>
                  ) : isSelectedFuture ? (
                    <span>
                      Attendance: <strong>Scheduled</strong>
                    </span>
                  ) : (
                    <span>
                      Attendance: <strong>No punch recorded</strong>
                    </span>
                  )}
                </Stack>
              </div>
            )}
          </div>

          {/* Right: 6 Attendance Summary Cards (2x3 Grid) */}
          {!hideSummaryCards && (
            <div className="bezent-attendance-summary">
              <div className="bezent-attendance-summary__card bezent-attendance-summary__card--present">
                <div className="bezent-attendance-summary__value">{summary.presentDays}</div>
                <div className="bezent-attendance-summary__label">Present Days</div>
                <AttendanceCardSparkline
                  variant="present"
                  value={summary.presentDays}
                  history={history}
                  color="#159a68"
                  fillColor="#ddf7e9"
                />
              </div>

              <div className="bezent-attendance-summary__card bezent-attendance-summary__card--absent">
                <div className="bezent-attendance-summary__value">{summary.absentDays}</div>
                <div className="bezent-attendance-summary__label">Absent Days</div>
                <AttendanceCardSparkline
                  variant="absent"
                  value={summary.absentDays}
                  history={history}
                  color="#de5264"
                  fillColor="#ffe6ec"
                />
              </div>

              <div className="bezent-attendance-summary__card bezent-attendance-summary__card--half-day">
                <div className="bezent-attendance-summary__value">{summary.halfDays ?? 0}</div>
                <div className="bezent-attendance-summary__label">Half Days</div>
                <AttendanceCardSparkline
                  variant="half-day"
                  value={summary.halfDays ?? 0}
                  history={history}
                  color="#ea580c"
                  fillColor="#ffe9de"
                />
              </div>

              <div className="bezent-attendance-summary__card bezent-attendance-summary__card--late">
                <div className="bezent-attendance-summary__value">
                  {summary.lateDays ?? summary.lateMarksCount ?? 0}
                </div>
                <div className="bezent-attendance-summary__label">Late Arrivals</div>
                <AttendanceCardSparkline
                  variant="late"
                  value={summary.lateDays ?? summary.lateMarksCount ?? 0}
                  history={history}
                  color="#f07865"
                  fillColor="#ffe8dc"
                />
              </div>

              <div className="bezent-attendance-summary__card bezent-attendance-summary__card--worked">
                <div className="bezent-attendance-summary__value">
                  {summary.workedMinutes !== undefined && summary.workedMinutes > 0
                    ? `${Math.floor(summary.workedMinutes / 60)}h ${summary.workedMinutes % 60}m`
                    : '0'}
                </div>
                <div className="bezent-attendance-summary__label">Worked Hours</div>
                <AttendanceCardSparkline
                  variant="worked"
                  value={summary.workedMinutes ? Math.floor(summary.workedMinutes / 60) : 0}
                  history={history}
                  color="#3978f6"
                  fillColor="#e8f1ff"
                />
              </div>

              <div className="bezent-attendance-summary__card bezent-attendance-summary__card--missing-punch">
                <div className="bezent-attendance-summary__value">
                  {summary.missingPunchesCount ?? 0}
                </div>
                <div className="bezent-attendance-summary__label">Missing Punches</div>
                <AttendanceCardSparkline
                  variant="missing-punch"
                  value={summary.missingPunchesCount ?? 0}
                  history={history}
                  color="#8265de"
                  fillColor="#ede5ff"
                />
              </div>
            </div>
          )}
        </div>
      </Stack>
    </Card>
  );
}

export function AttendanceSummaryMetricsCards({
  summary,
  history = [],
}: {
  summary: AttendanceSummaryMetrics;
  history?: EssAttendanceRecord[];
}) {
  return (
    <div className="bezent-attendance-summary-strip">
      <div className="bezent-attendance-summary__card bezent-attendance-summary__card--present">
        <div className="bezent-attendance-summary__value">{summary.presentDays}</div>
        <div className="bezent-attendance-summary__label">Present Days</div>
        <AttendanceCardSparkline
          variant="present"
          value={summary.presentDays}
          history={history}
          color="#159a68"
          fillColor="#ddf7e9"
        />
      </div>

      <div className="bezent-attendance-summary__card bezent-attendance-summary__card--absent">
        <div className="bezent-attendance-summary__value">{summary.absentDays}</div>
        <div className="bezent-attendance-summary__label">Absent Days</div>
        <AttendanceCardSparkline
          variant="absent"
          value={summary.absentDays}
          history={history}
          color="#de5264"
          fillColor="#ffe6ec"
        />
      </div>

      <div className="bezent-attendance-summary__card bezent-attendance-summary__card--half-day">
        <div className="bezent-attendance-summary__value">{summary.halfDays ?? 0}</div>
        <div className="bezent-attendance-summary__label">Half Days</div>
        <AttendanceCardSparkline
          variant="half-day"
          value={summary.halfDays ?? 0}
          history={history}
          color="#ea580c"
          fillColor="#ffe9de"
        />
      </div>

      <div className="bezent-attendance-summary__card bezent-attendance-summary__card--late">
        <div className="bezent-attendance-summary__value">
          {summary.lateDays ?? summary.lateMarksCount ?? 0}
        </div>
        <div className="bezent-attendance-summary__label">Late Arrivals</div>
        <AttendanceCardSparkline
          variant="late"
          value={summary.lateDays ?? summary.lateMarksCount ?? 0}
          history={history}
          color="#f07865"
          fillColor="#ffe8dc"
        />
      </div>

      <div className="bezent-attendance-summary__card bezent-attendance-summary__card--worked">
        <div className="bezent-attendance-summary__value">
          {summary.workedMinutes !== undefined && summary.workedMinutes > 0
            ? `${Math.floor(summary.workedMinutes / 60)}h ${summary.workedMinutes % 60}m`
            : '0'}
        </div>
        <div className="bezent-attendance-summary__label">Worked Hours</div>
        <AttendanceCardSparkline
          variant="worked"
          value={summary.workedMinutes ? Math.floor(summary.workedMinutes / 60) : 0}
          history={history}
          color="#3978f6"
          fillColor="#e8f1ff"
        />
      </div>

      <div className="bezent-attendance-summary__card bezent-attendance-summary__card--missing-punch">
        <div className="bezent-attendance-summary__value">{summary.missingPunchesCount ?? 0}</div>
        <div className="bezent-attendance-summary__label">Missing Punches</div>
        <AttendanceCardSparkline
          variant="missing-punch"
          value={summary.missingPunchesCount ?? 0}
          history={history}
          color="#8265de"
          fillColor="#ede5ff"
        />
      </div>
    </div>
  );
}
