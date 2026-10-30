import React, { useState, useEffect, useMemo } from 'react';
import { BezentIcon } from '../../../../../design-system/icons';
import { EmployeeCartoonAvatar } from '../../../../../design-system/components';
import { HeroSceneIllustration, type TimePeriod } from './HeroSceneIllustration';
import type { EssShiftDetails } from '../../api/essApi';
import { getTimezoneOffsetDetails } from '../../../../../shared/globalization';

export interface EssHeroEmployee {
  firstName: string;
  lastName?: string | null;
  gender?: 'male' | 'female' | 'other' | string | null;
  avatarPreference?: string | null;
  designationTitle?: string | null;
  departmentName?: string | null;
  employeeNumber: string;
  locationName?: string | null;
  employmentStatus?: string | null;
}

export interface EssHeroAttendance {
  date?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workedMinutes?: number;
  breakMinutes?: number;
  isOnBreak?: boolean;
  currentBreakType?: string | null;
  currentBreakStartTime?: string | null;
  status?: string;
  shift?: EssShiftDetails | null;
  workLocation?: string;
}

export interface EssHeroBriefing {
  pendingActionsCount?: number;
  actionsSummary?: string;
}

export interface EssAttendanceHeroProps {
  employee: EssHeroEmployee;
  attendance: EssHeroAttendance;
  briefing?: EssHeroBriefing;
  timezone?: string;
  punchLoading?: boolean;
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  checkInDisabledReason?: string;
  checkOutDisabledReason?: string;
  forcedTimePeriod?: TimePeriod;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onStartBreak?: () => void;
  onEndBreak?: () => void;
  onAvatarClick?: () => void;
  onViewProfileClick?: () => void;
  onViewActionsClick?: () => void;
}

function resolveIanaTimezone(tz?: string | null): string | undefined {
  if (!tz) return undefined;
  const clean = tz.trim();
  if (clean === 'IST') return 'Asia/Kolkata';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: clean });
    return clean;
  } catch {
    return undefined;
  }
}

function formatDisplayTime(timeStr?: string | null): string {
  if (!timeStr) return '--:--';
  const clean = timeStr.trim();
  if (!clean || clean === '--:--' || clean === 'null' || clean === 'undefined') {
    return '--:--';
  }

  // HH:mm or HH:mm:ss format (e.g. "11:34" or "11:34:00")
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match && match[1] && match[2]) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const padHours = String(hours).padStart(2, '0');
    return `${padHours}:${minutes} ${ampm}`;
  }

  // Full ISO / date-time format
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return clean;
}

function parseAttendanceTimestamp(dateStr?: string | null, timeStr?: string | null): Date | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  if (!clean || clean === '--:--' || clean === 'null' || clean === 'undefined') {
    return null;
  }

  if (clean.includes('T')) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match && match[1] && match[2]) {
    const actualDate = dateStr || new Date().toISOString().split('T')[0];
    const hours = String(match[1]).padStart(2, '0');
    const minutes = match[2];
    const seconds = match[3] || '00';
    const d = new Date(`${actualDate}T${hours}:${minutes}:${seconds}`);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function formatMinutes(mins?: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getGreetingAndQuote(period: TimePeriod): {
  greeting: string;
  quote: string;
  icon: string;
} {
  switch (period) {
    case 'morning':
      return {
        greeting: 'Good Morning',
        quote: '"Make today a great day!"',
        icon: '☀️',
      };
    case 'afternoon':
      return {
        greeting: 'Good Afternoon',
        quote: '"Keep going, great work today!"',
        icon: '☀️',
      };
    case 'evening':
      return {
        greeting: 'Good Evening',
        quote: '"Another productive day!"',
        icon: '🌅',
      };
    case 'night':
      return {
        greeting: 'Good Night',
        quote: '"Time to recharge!"',
        icon: '🌙',
      };
  }
}

export const EssAttendanceHero: React.FC<EssAttendanceHeroProps> = ({
  employee,
  attendance,
  briefing,
  timezone = 'IST',
  punchLoading = false,
  canCheckIn = true,
  canCheckOut = false,
  checkInDisabledReason,
  checkOutDisabledReason,
  forcedTimePeriod,
  onCheckIn,
  onCheckOut,
  onStartBreak,
  onEndBreak,
  onAvatarClick,
  onViewProfileClick,
  onViewActionsClick,
}) => {
  // Single synchronized 1-second clock
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resolvedIanaTimezone = useMemo(() => {
    return resolveIanaTimezone(timezone);
  }, [timezone]);

  // Determine current hour in the resolved timezone for greeting and scene
  const currentHour = useMemo(() => {
    if (!resolvedIanaTimezone) return now.getHours();
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: resolvedIanaTimezone,
        hour: 'numeric',
        hour12: false,
      }).formatToParts(now);
      const hStr = parts.find((p) => p.type === 'hour')?.value;
      const num = hStr ? parseInt(hStr, 10) : now.getHours();
      return num === 24 ? 0 : num;
    } catch {
      return now.getHours();
    }
  }, [now, resolvedIanaTimezone]);

  // Determine current time period and theme
  const currentPeriod = useMemo<TimePeriod>(() => {
    if (forcedTimePeriod) return forcedTimePeriod;
    return getTimePeriod(currentHour);
  }, [forcedTimePeriod, currentHour]);

  const {
    greeting,
    quote,
    icon: greetingIcon,
  } = useMemo(() => getGreetingAndQuote(currentPeriod), [currentPeriod]);

  // Display label for timezone badge (e.g. "EDT", "IST", etc.)
  const displayTimezone = useMemo(() => {
    if (!timezone) return 'IST';
    const clean = timezone.trim();
    if (clean === 'IST' || clean === 'Asia/Kolkata') return 'IST';
    try {
      const { abbreviation } = getTimezoneOffsetDetails(clean, now);
      if (abbreviation && abbreviation !== 'UTC' && abbreviation !== 'GMT') {
        return abbreviation;
      }
      return clean;
    } catch {
      return clean;
    }
  }, [timezone, now]);

  // Formatted date string (e.g., FRIDAY, OCTOBER 16, 2026)
  const formattedDate = useMemo(() => {
    return now
      .toLocaleDateString('en-US', {
        timeZone: resolvedIanaTimezone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase();
  }, [now, resolvedIanaTimezone]);

  // Formatted sub-date for clock (e.g. Fri, 16 Oct 2026)
  const formattedSubDate = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      timeZone: resolvedIanaTimezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [now, resolvedIanaTimezone]);

  // Live digital clock string (e.g. 01:05:40 PM)
  const formattedClock = useMemo(() => {
    return now.toLocaleTimeString('en-US', {
      timeZone: resolvedIanaTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [now, resolvedIanaTimezone]);

  // Worked hours and break duration computation
  const hasPunchedIn = Boolean(attendance.checkInTime);
  const hasPunchedOut = Boolean(attendance.checkOutTime);
  const isOnBreak = Boolean(attendance.isOnBreak);

  let grossMinutes = attendance.workedMinutes || 0;
  if (hasPunchedIn && attendance.checkInTime) {
    const inDate = parseAttendanceTimestamp(
      attendance.date || now.toISOString().split('T')[0],
      attendance.checkInTime,
    );
    let inTime = inDate ? inDate.getTime() : NaN;
    let endRef = now.getTime();
    if (hasPunchedOut && attendance.checkOutTime) {
      const outDate = parseAttendanceTimestamp(
        attendance.date || now.toISOString().split('T')[0],
        attendance.checkOutTime,
      );
      endRef = outDate ? outDate.getTime() : now.getTime();
      if (!isNaN(inTime) && !isNaN(endRef) && endRef < inTime) {
        // Overnight shift: checkout occurred on next calendar day
        endRef += 24 * 60 * 60 * 1000;
      }
    } else if (!isNaN(inTime) && endRef < inTime) {
      // Overnight in-progress: check-in was yesterday, current time is past midnight
      inTime -= 24 * 60 * 60 * 1000;
    }
    if (!isNaN(inTime) && !isNaN(endRef) && endRef >= inTime) {
      grossMinutes = Math.floor((endRef - inTime) / 60000);
    }
  }

  let liveBreakMinutes = attendance.breakMinutes || 0;
  if (isOnBreak && attendance.currentBreakStartTime) {
    const bStartDate = parseAttendanceTimestamp(
      attendance.date || now.toISOString().split('T')[0],
      attendance.currentBreakStartTime,
    );
    let bStart = bStartDate ? bStartDate.getTime() : NaN;
    if (!isNaN(bStart)) {
      if (now.getTime() < bStart) {
        // Overnight break rollover
        bStart -= 24 * 60 * 60 * 1000;
      }
      if (now.getTime() >= bStart) {
        liveBreakMinutes += Math.floor((now.getTime() - bStart) / 60000);
      }
    }
  }

  const netWorkedMinutes = Math.max(0, grossMinutes - liveBreakMinutes);

  // Status mapping
  const statusBadge = useMemo(() => {
    if (attendance.status === 'working' || (hasPunchedIn && !hasPunchedOut && !isOnBreak)) {
      return {
        label: 'Working',
        className: 'ess-status-badge-working',
      };
    }
    if (attendance.status === 'on_break' || isOnBreak) {
      return {
        label: attendance.currentBreakType
          ? `On Break (${attendance.currentBreakType})`
          : 'On Break',
        className: 'ess-status-badge-break',
      };
    }
    if (attendance.status === 'checked_out' || (hasPunchedIn && hasPunchedOut)) {
      return {
        label: 'Checked Out',
        className: 'ess-status-badge-checked-out',
      };
    }
    return {
      label: 'Not Checked In',
      className: 'ess-status-badge-neutral',
    };
  }, [attendance.status, hasPunchedIn, hasPunchedOut, isOnBreak, attendance.currentBreakType]);

  const pendingCount = briefing?.pendingActionsCount ?? 0;
  const actionsSummary =
    briefing?.actionsSummary || 'All regular daily tasks and approvals are up to date.';

  const isShiftAssigned = attendance.shift?.isAssigned !== false && Boolean(attendance.shift?.name);
  const shiftName = isShiftAssigned ? attendance.shift!.name! : 'Unassigned';
  const shiftTimes =
    isShiftAssigned && attendance.shift?.startTime && attendance.shift?.endTime
      ? `${attendance.shift.startTime}–${attendance.shift.endTime}`
      : 'No scheduled shift';
  const workLocation = attendance.workLocation || 'Office';

  return (
    <section
      className="ess-attendance-hero"
      data-time-period={currentPeriod}
      aria-label="Employee Greeting and Attendance Hero"
    >
      {/* Decorative Vector Scene Backdrop */}
      <div className="ess-hero-backdrop" aria-hidden="true">
        <HeroSceneIllustration period={currentPeriod} now={now} className="ess-hero-backdrop-svg" />
      </div>

      {/* ── Top Header Section ── */}
      <div className="ess-hero-top">
        {/* Left: Employee Identity */}
        <div className="ess-hero-identity">
          <div className="ess-hero-avatar-wrapper">
            <div className="ess-hero-avatar-ring">
              <EmployeeCartoonAvatar
                gender={employee.gender}
                avatarPreference={employee.avatarPreference}
                employeeName={`${employee.firstName} ${employee.lastName || ''}`.trim()}
                size="hero"
                onClick={onAvatarClick}
              />
            </div>
          </div>

          <div className="ess-hero-identity-details">
            <span className="ess-hero-date-badge">{formattedDate}</span>
            <h2 className="ess-hero-greeting-heading">
              {greeting}, {employee.firstName}!
              <span className="ess-hero-sun-icon" role="img" aria-label={currentPeriod}>
                {greetingIcon}
              </span>
            </h2>

            <div className="ess-hero-designation-row">
              <span className="ess-hero-designation-title">
                {employee.designationTitle || 'Software Engineer'}
              </span>
              <span>•</span>
              <span>{employee.departmentName || 'Engineering'}</span>
            </div>

            <div className="ess-hero-meta-row">
              <span className="ess-hero-emp-id">
                ID: <strong>{employee.employeeNumber}</strong>
              </span>
              <span>•</span>
              <span>{employee.locationName || 'Bengaluru'}</span>
              <span>•</span>
              <span className="ess-hero-status-pill">
                {(employee.employmentStatus || 'ACTIVE').toUpperCase()}
              </span>
              <span>•</span>
              <button
                type="button"
                className="ess-hero-profile-link"
                onClick={onViewProfileClick}
                aria-label="View Employee Profile"
              >
                View Profile →
              </button>
            </div>
          </div>
        </div>

        {/* Center: Motivational Message */}
        <div className="ess-hero-quote-area" aria-hidden="true">
          <p className="ess-hero-quote-text">{quote}</p>
        </div>

        {/* Right: Horizontal Attendance Action Buttons */}
        <div className="ess-hero-actions">
          <button
            type="button"
            id="dashboard-check-in-btn"
            className="ess-hero-btn ess-hero-btn-checkin"
            onClick={onCheckIn}
            disabled={!canCheckIn || punchLoading}
            title={checkInDisabledReason}
            aria-label="Check In"
          >
            <BezentIcon name="logIn" size={17} color="#ffffff" />
            <span>Check In</span>
          </button>

          <button
            type="button"
            id="dashboard-check-out-btn"
            className="ess-hero-btn ess-hero-btn-checkout"
            onClick={onCheckOut}
            disabled={!canCheckOut || punchLoading}
            title={checkOutDisabledReason}
            aria-label="Check Out"
          >
            <BezentIcon
              name="logOut"
              size={17}
              color={currentPeriod === 'night' ? '#60a5fa' : '#3978f6'}
            />
            <span>Check Out</span>
          </button>
        </div>
      </div>

      {/* ── Middle: Frosted Glass Attendance Information Panel ── */}
      <div className="ess-hero-glass-panel">
        {/* 1. Current Time */}
        <div className="ess-glass-col">
          <div className="ess-glass-icon-badge ess-glass-icon-blue" aria-hidden="true">
            <BezentIcon name="clock" size={20} color="#3978f6" />
          </div>
          <div className="ess-glass-content">
            <span className="ess-glass-label">Current Time • {displayTimezone}</span>
            <span className="ess-glass-clock-val">{formattedClock}</span>
            <span className="ess-glass-sub">{formattedSubDate}</span>
          </div>
        </div>

        {/* 2. Check In */}
        <div className="ess-glass-col">
          <div className="ess-glass-icon-badge ess-glass-icon-green" aria-hidden="true">
            <BezentIcon name="logIn" size={20} color="#159a68" />
          </div>
          <div className="ess-glass-content">
            <span className="ess-glass-label">Check In</span>
            <span className="ess-glass-val">{formatDisplayTime(attendance.checkInTime)}</span>
          </div>
        </div>

        {/* 3. Check Out */}
        <div className="ess-glass-col">
          <div className="ess-glass-icon-badge ess-glass-icon-coral" aria-hidden="true">
            <BezentIcon name="logOut" size={20} color="#e45163" />
          </div>
          <div className="ess-glass-content">
            <span className="ess-glass-label">Check Out</span>
            <span className="ess-glass-val">{formatDisplayTime(attendance.checkOutTime)}</span>
          </div>
        </div>

        {/* 4. Worked Hours */}
        <div className="ess-glass-col">
          <div className="ess-glass-icon-badge ess-glass-icon-purple" aria-hidden="true">
            <BezentIcon name="workedHours" size={20} color="#8b72e8" />
          </div>
          <div className="ess-glass-content">
            <span className="ess-glass-label">Worked Hours</span>
            <span className="ess-glass-val">{formatMinutes(netWorkedMinutes)}</span>
          </div>
        </div>

        {/* 5. Break Duration */}
        <div className="ess-glass-col">
          <div className="ess-glass-icon-badge ess-glass-icon-peach" aria-hidden="true">
            <BezentIcon name="breakDuration" size={20} color="#f07865" />
          </div>
          <div className="ess-glass-content">
            <span className="ess-glass-label">Break Duration</span>
            <span className="ess-glass-val">{formatMinutes(liveBreakMinutes)}</span>
          </div>
        </div>

        {/* 6. Attendance Status & Shift */}
        <div className="ess-glass-col ess-glass-status-col">
          <div className={`ess-status-badge ${statusBadge.className}`}>
            <span className="ess-status-dot" aria-hidden="true" />
            <span>{statusBadge.label}</span>
          </div>
          <span className="ess-glass-shift-info">
            {shiftName} • {shiftTimes}
          </span>
          <span className="ess-glass-location-info">{workLocation}</span>

          {/* Break action link if currently checked in and not checked out */}
          {hasPunchedIn && !hasPunchedOut && (
            <button
              type="button"
              id="dashboard-break-btn"
              className="ess-glass-break-link"
              onClick={isOnBreak ? onEndBreak : onStartBreak}
              disabled={punchLoading}
            >
              {isOnBreak ? '✓ End Break' : '☕ Start Break'}
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom: Daily Briefing Strip ── */}
      <div className="ess-hero-briefing">
        <div className="ess-briefing-left">
          <div className="ess-briefing-icon-wrapper" aria-hidden="true">
            <BezentIcon name="sparkles" size={20} color="#3978f6" />
          </div>
          <div className="ess-briefing-content">
            <div className="ess-briefing-header">
              <span className="ess-briefing-title">Daily Briefing</span>
              {pendingCount > 0 ? (
                <span className="ess-briefing-badge">
                  {pendingCount} {pendingCount === 1 ? 'action' : 'actions'}
                </span>
              ) : (
                <span className="ess-briefing-badge ess-briefing-badge-clear">All clear</span>
              )}
            </div>
            <span className="ess-briefing-summary">{actionsSummary}</span>
          </div>
        </div>

        <button
          type="button"
          className="ess-briefing-action-btn"
          onClick={onViewActionsClick}
          aria-label="View Daily Briefing Actions"
        >
          <span>View Actions</span>
          <BezentIcon name="arrowRight" size={14} />
        </button>
      </div>
    </section>
  );
};
