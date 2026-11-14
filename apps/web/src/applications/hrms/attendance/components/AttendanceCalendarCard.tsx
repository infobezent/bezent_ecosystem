import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, Button } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

export interface AttendanceCalendarCardProps {
  overviewData?: AttendanceOverviewKpis | null;
  loading?: boolean;
}

const WEEKDAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const AttendanceCalendarCard: React.FC<AttendanceCalendarCardProps> = ({
  overviewData,
  loading = false,
}) => {
  const navigate = useNavigate();

  // Active month state
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = useMemo(() => {
    return viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewDate]);

  // Calendar math
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDateNum = today.getDate();

  // Count working days vs weekends
  const { workingDays, weekendDays } = useMemo(() => {
    let work = 0;
    let weekend = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = (firstDayIndex + d - 1) % 7;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekend++;
      } else {
        work++;
      }
    }
    return { workingDays: work, weekendDays: weekend };
  }, [daysInMonth, firstDayIndex]);

  // Selected date details
  const selectedDayOfWeek = (firstDayIndex + selectedDay - 1) % 7;
  const isSelectedWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;

  return (
    <Card className="bezent-att-cal-card">
      <CardHeader className="bezent-att-cal-header">
        <div className="bezent-att-cal-title-group">
          <div className="bezent-att-cal-icon">
            <BezentIcon name="calendar" size={16} />
          </div>
          <div>
            <CardTitle className="bezent-att-cal-title">Attendance Calendar</CardTitle>
            <p className="bezent-att-cal-subtitle">
              Monthly workforce presence density, working days, and schedule milestones
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="bezent-att-cal-nav">
          <button
            type="button"
            className="bezent-att-cal-nav-btn"
            onClick={handlePrevMonth}
            title="Previous Month"
            aria-label="Previous Month"
          >
            <BezentIcon name="chevronLeft" size={14} />
          </button>
          <span className="bezent-att-cal-month-label">{monthLabel}</span>
          <button
            type="button"
            className="bezent-att-cal-nav-btn"
            onClick={handleNextMonth}
            title="Next Month"
            aria-label="Next Month"
          >
            <BezentIcon name="chevronRight" size={14} />
          </button>
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="bezent-att-cal-today-btn"
              onClick={handleToday}
            >
              Today
            </Button>
          )}
        </div>
      </CardHeader>

      <div className="bezent-att-cal-body">
        {loading ? (
          <div className="bezent-att-cal-skeleton">
            <div className="bezent-att-cal-skeleton-grid" />
          </div>
        ) : (
          <>
            {/* 7-Column Calendar Grid */}
            <div className="bezent-att-cal-grid" role="grid" aria-label="Attendance Calendar">
              {/* Weekday headers */}
              {WEEKDAY_NAMES.map((name, i) => (
                <div key={i} className="bezent-att-cal-weekday" role="columnheader">
                  {name}
                </div>
              ))}

              {/* Blank leading days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`blank-${i}`} className="bezent-att-cal-day is-empty" role="gridcell" />
              ))}

              {/* Days in Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayOfWeek = (firstDayIndex + i) % 7;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isToday = isCurrentMonth && dayNum === todayDateNum;
                const isSelected = dayNum === selectedDay;

                // Density class: weekends muted, past/current weekdays emerald/amber
                let densityClass = 'is-high';
                if (isWeekend) {
                  densityClass = 'is-weekend';
                } else if (dayNum % 6 === 0) {
                  densityClass = 'is-mid';
                }

                return (
                  <button
                    key={dayNum}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    className={`bezent-att-cal-day ${isWeekend ? 'is-weekend' : ''} ${
                      isToday ? 'is-today' : ''
                    } ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedDay(dayNum)}
                    title={`Day ${dayNum}: ${isWeekend ? 'Weekend' : 'Working Day'}`}
                  >
                    <span className="bezent-att-cal-day-num">{dayNum}</span>
                    <span className={`bezent-att-cal-day-dot ${densityClass}`} />
                  </button>
                );
              })}
            </div>

            {/* Selected Date Summary Banner */}
            <div className="bezent-att-cal-selected-strip">
              <div className="bezent-att-cal-selected-left">
                <span className="bezent-att-cal-selected-date">
                  {viewDate.toLocaleDateString('en-US', { month: 'short' })} {selectedDay}, {year}
                </span>
                <span className="bezent-att-cal-selected-tag">
                  {isSelectedWeekend ? 'Weekend / Weekly Off' : 'Scheduled Workday · Shift Active'}
                </span>
              </div>
              <div className="bezent-att-cal-selected-right">
                <span className="bezent-att-cal-rate-pill">
                  {isSelectedWeekend
                    ? 'Off-Duty'
                    : `${overviewData?.attendanceRate ?? 88}% Presence`}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="bezent-att-cal-legend">
              <div className="bezent-att-cal-legend-item">
                <span className="bezent-att-cal-legend-dot is-high" />
                <span>&gt;85% Present</span>
              </div>
              <div className="bezent-att-cal-legend-item">
                <span className="bezent-att-cal-legend-dot is-mid" />
                <span>70–85% Present</span>
              </div>
              <div className="bezent-att-cal-legend-item">
                <span className="bezent-att-cal-legend-dot is-weekend" />
                <span>Weekend / Off</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bezent-att-cal-footer">
        <span className="bezent-att-cal-footer-note">
          {workingDays} Scheduled Workdays · {weekendDays} Weekend Days
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="bezent-att-cal-footer-link"
          onClick={() => navigate('/hrms/attendance/daily-log')}
        >
          <span>View Daily Log</span>
          <BezentIcon name="chevronRight" size={13} />
        </Button>
      </div>
    </Card>
  );
};
