import { useState, useMemo, type ReactNode } from 'react';
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
  lateDays: number;
  absentDays: number;
  attendancePercent: number;
  totalWorkingDays?: number;
}

export interface AttendanceMonthlyCalendarProps {
  initialDate?: Date;
  summary: AttendanceSummaryMetrics;
  history?: EssAttendanceRecord[];
  onMonthChange?: (newDate: Date) => void;
  onViewDetailsClick?: () => void;
  loading?: boolean;
  extraHeaderActions?: ReactNode;
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

export function AttendanceMonthlyCalendar({
  initialDate = new Date(),
  summary,
  history = [],
  onMonthChange,
  onViewDetailsClick,
  loading = false,
}: AttendanceMonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const year = initialDate.getFullYear();
    const month = initialDate.getMonth();
    const now = new Date();
    if (now.getFullYear() === year && now.getMonth() === month) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    return `${year}-${String(month + 1).padStart(2, '0')}-01`;
  });

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
    setSelectedDateStr(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`);
    onMonthChange?.(prev);
  };

  const handleNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(next);
    const now = new Date();
    if (now.getFullYear() === next.getFullYear() && now.getMonth() === next.getMonth()) {
      setSelectedDateStr(todayStr);
    } else {
      setSelectedDateStr(
        `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
      );
    }
    onMonthChange?.(next);
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
        | 'absent'
        | 'leave'
        | 'holiday'
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
        'present' | 'late' | 'absent' | 'leave' | 'holiday' | 'weekly-off' | 'unclassified' =
        'unclassified';

      if (record) {
        if (record.status === 'present') {
          statusType = record.isLate ? 'late' : 'present';
        } else if (record.status === 'absent') {
          statusType = 'absent';
        } else if (record.status === 'on_leave') {
          statusType = 'leave';
        } else if (record.status === 'holiday') {
          statusType = 'holiday';
        } else if (record.status === 'half_day') {
          statusType = 'late';
        }
      } else if (isFuture) {
        statusType = 'unclassified';
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
    return recordsMap.get(selectedDateStr);
  }, [recordsMap, selectedDateStr]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateStr) return '';
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    if (!y || !m || !d) return selectedDateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateStr]);

  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDateStr) return 0;
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d).getDay();
  }, [selectedDateStr]);

  const isSelectedWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;
  const isSelectedFuture = selectedDateStr > todayStr;

  return (
    <Card variant="default">
      <Stack gap="md">
        {/* Header Strip */}
        <Inline justify="between" align="center" wrap>
          <Stack gap="xs">
            <h2>Monthly Attendance</h2>
            <span>Your attendance overview</span>
          </Stack>

          <Badge variant="success" size="md">
            {summary.attendancePercent}% Attendance
          </Badge>
        </Inline>

        {/* 60/40 Responsive Split Layout */}
        <div className="bezent-attendance-snapshot__layout">
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
                      <span className="bezent-attendance-calendar__day bezent-attendance-calendar__day--empty" />
                    </div>
                  );
                }

                const isSelected = cell.dateStr === selectedDateStr;
                const statusClass = `bezent-attendance-calendar__day--${cell.statusType}`;
                const todayClass = cell.isToday ? 'bezent-attendance-calendar__day--today' : '';
                const selectedClass = isSelected ? 'bezent-attendance-calendar__day--selected' : '';

                return (
                  <div key={cell.dateStr} className="bezent-attendance-calendar__day-wrapper">
                    <button
                      type="button"
                      className={`bezent-attendance-calendar__day ${statusClass} ${todayClass} ${selectedClass}`.trim()}
                      onClick={() => setSelectedDateStr(cell.dateStr)}
                      aria-label={`Date ${cell.dayNum}, Status: ${cell.statusType}`}
                    >
                      {cell.dayNum}
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
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--absent" />
                <span>Absent</span>
              </div>
              <div className="bezent-attendance-calendar__legend-item">
                <span className="bezent-attendance-calendar__legend-dot bezent-attendance-calendar__legend-dot--leave" />
                <span>Leave</span>
              </div>
            </div>

            {/* Selected Date Details Box */}
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
                          {selectedRecord.isLate
                            ? 'Late (Present)'
                            : selectedRecord.status === 'present'
                              ? 'Present'
                              : selectedRecord.status === 'on_leave'
                                ? 'On Leave'
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
                        Check Out: <strong>{formatDisplayTime(selectedRecord.checkOutTime)}</strong>
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
          </div>

          {/* Right: 4 Attendance Summary Cards (2x2 Grid) */}
          <div className="bezent-attendance-summary">
            {/* Card 1: Present */}
            <div className="bezent-attendance-summary__card">
              <div className="bezent-attendance-summary__icon">
                <BezentIcon name="calendar" size={22} />
              </div>
              <div className="bezent-attendance-summary__value">{summary.presentDays}</div>
              <div className="bezent-attendance-summary__label">Present</div>
            </div>

            {/* Card 2: Late */}
            <div className="bezent-attendance-summary__card">
              <div className="bezent-attendance-summary__icon">
                <BezentIcon name="clock" size={22} />
              </div>
              <div className="bezent-attendance-summary__value">{summary.lateDays}</div>
              <div className="bezent-attendance-summary__label">Late</div>
            </div>

            {/* Card 3: Absent */}
            <div className="bezent-attendance-summary__card">
              <div className="bezent-attendance-summary__icon">
                <BezentIcon name="close" size={22} />
              </div>
              <div className="bezent-attendance-summary__value">{summary.absentDays}</div>
              <div className="bezent-attendance-summary__label">Absent</div>
            </div>

            {/* Card 4: Attendance Percentage */}
            <div className="bezent-attendance-summary__card">
              <div className="bezent-attendance-summary__icon">
                <BezentIcon name="reports" size={22} />
              </div>
              <div className="bezent-attendance-summary__value">{summary.attendancePercent}%</div>
              <div className="bezent-attendance-summary__label">Attendance</div>
            </div>
          </div>
        </div>
      </Stack>
    </Card>
  );
}
