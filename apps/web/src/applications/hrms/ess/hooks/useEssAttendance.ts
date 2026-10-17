import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  essApi,
  type EssTodayAttendance,
  type EssShiftDetails,
  type EssPunchEvent,
} from '../api/essApi';
import { executePunchWithLocation, formatPunchErrorMessage } from '../utils/geolocation';

export type EssAttendanceStatus = 'not_checked_in' | 'working' | 'on_break' | 'checked_out';

export interface UseEssAttendanceOptions {
  todayAttendance?: EssTodayAttendance | null;
  onRefresh?: () => Promise<void> | void;
}

export interface UseEssAttendanceReturn {
  // Synchronized live wall clock
  now: Date;
  formattedClock: string;
  formattedDate: string;
  formattedSubDate: string;

  // Active attendance state
  today: EssTodayAttendance;
  shift: EssShiftDetails | null;
  isShiftAssigned: boolean;
  shiftName: string;
  shiftTimes: string;
  workLocation: string;

  // Status flags
  hasPunchedIn: boolean;
  hasPunchedOut: boolean;
  isOnBreak: boolean;
  currentBreakType: string | null;
  currentBreakStartTime: string | null;
  status: EssAttendanceStatus;
  statusLabel: string;
  punches: EssPunchEvent[];

  // Live timer computations
  grossMinutes: number;
  liveBreakMinutes: number;
  netWorkedMinutes: number;
  requiredShiftMinutes: number;
  progressPercent: number;

  // Permissions & eligibility
  canCheckIn: boolean;
  canCheckOut: boolean;
  canStartBreak: boolean;
  canEndBreak: boolean;
  checkInDisabledReason?: string;
  checkOutDisabledReason?: string;
  startBreakDisabledReason?: string;
  endBreakDisabledReason?: string;

  // Action status & feedback
  punchLoading: boolean;
  punchError: string | null;
  punchSuccess: string | null;
  clearFeedback: () => void;

  // Core punch handlers
  handleCheckIn: (workLocation?: string, notes?: string) => Promise<boolean>;
  handleCheckOut: () => Promise<boolean>;
  handleStartBreak: (breakType?: 'tea' | 'lunch' | 'personal', notes?: string) => Promise<boolean>;
  handleEndBreak: (notes?: string) => Promise<boolean>;
}

export function parseAttendanceTimestamp(
  dateStr?: string | null,
  timeStr?: string | null,
): Date | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  if (!clean || clean === '--:--' || clean === 'null' || clean === 'undefined') {
    return null;
  }

  // Full ISO timestamp (e.g., 2026-10-17T09:30:00.000Z)
  if (clean.includes('T')) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  // HH:mm or HH:mm:ss
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

export function formatMinutes(mins?: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatDisplayTime(timeStr?: string | null): string {
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

const DEFAULT_ATTENDANCE: EssTodayAttendance = {
  date: new Date().toISOString().split('T')[0] ?? '',
  checkInTime: null,
  checkOutTime: null,
  status: 'not_checked_in',
  workLocation: 'office',
  workedMinutes: 0,
  breakMinutes: 0,
  isOnBreak: false,
  currentBreakType: null,
  currentBreakStartTime: null,
  shift: undefined,
  punches: [],
};

export function useEssAttendance(options: UseEssAttendanceOptions = {}): UseEssAttendanceReturn {
  const { todayAttendance, onRefresh } = options;

  // Synchronized 1-second wall-clock timer
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Action status and feedback
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [punchSuccess, setPunchSuccess] = useState<string | null>(null);

  const clearFeedback = useCallback(() => {
    setPunchError(null);
    setPunchSuccess(null);
  }, []);

  const today = useMemo<EssTodayAttendance>(() => {
    return todayAttendance || DEFAULT_ATTENDANCE;
  }, [todayAttendance]);

  // Status flags
  const hasPunchedIn = Boolean(today.checkInTime);
  const hasPunchedOut = Boolean(today.checkOutTime);
  const isOnBreak = Boolean(today.isOnBreak);
  const currentBreakType = today.currentBreakType ?? null;
  const currentBreakStartTime = today.currentBreakStartTime ?? null;
  const punches = today.punches || [];
  const workLocation = today.workLocation || 'office';

  // Shift metadata
  const shift = today.shift ?? null;
  const isShiftAssigned = shift?.isAssigned !== false && Boolean(shift?.name);
  const shiftName = isShiftAssigned ? shift!.name! : 'Unassigned';
  const shiftTimes =
    isShiftAssigned && shift?.startTime && shift?.endTime
      ? `${shift.startTime}–${shift.endTime}`
      : 'No scheduled shift';

  // Live timer computations with overnight shift support
  let grossMinutes = today.workedMinutes || 0;
  if (hasPunchedIn && today.checkInTime) {
    const inDate = parseAttendanceTimestamp(today.date, today.checkInTime);
    let inTime = inDate ? inDate.getTime() : NaN;
    let endRef = now.getTime();

    if (hasPunchedOut && today.checkOutTime) {
      const outDate = parseAttendanceTimestamp(today.date, today.checkOutTime);
      endRef = outDate ? outDate.getTime() : now.getTime();
      if (!isNaN(inTime) && !isNaN(endRef) && endRef < inTime) {
        // Overnight shift: checkout occurred on the next calendar day
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

  let liveBreakMinutes = today.breakMinutes || 0;
  if (isOnBreak && currentBreakStartTime) {
    const bStartDate = parseAttendanceTimestamp(today.date, currentBreakStartTime);
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
  const requiredShiftMinutes =
    isShiftAssigned && shift?.requiredHours ? shift.requiredHours * 60 : 0;
  const progressPercent =
    isShiftAssigned && requiredShiftMinutes > 0
      ? Math.min(100, Math.round((netWorkedMinutes / requiredShiftMinutes) * 100))
      : 0;

  // Status mapping
  const status = useMemo<EssAttendanceStatus>(() => {
    if (hasPunchedIn && hasPunchedOut) return 'checked_out';
    if (isOnBreak) return 'on_break';
    if (hasPunchedIn) return 'working';
    return 'not_checked_in';
  }, [hasPunchedIn, hasPunchedOut, isOnBreak]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'working':
        return 'Working';
      case 'on_break':
        return currentBreakType ? `On Break (${currentBreakType})` : 'On Break';
      case 'checked_out':
        return 'Checked Out';
      case 'not_checked_in':
      default:
        return 'Not Checked In';
    }
  }, [status, currentBreakType]);

  // Action permissions and disabled reasons
  const canCheckIn = !hasPunchedIn;
  const canCheckOut = hasPunchedIn && !hasPunchedOut && !isOnBreak;
  const canStartBreak = hasPunchedIn && !hasPunchedOut && !isOnBreak;
  const canEndBreak = hasPunchedIn && !hasPunchedOut && isOnBreak;

  const checkInDisabledReason = hasPunchedIn
    ? hasPunchedOut
      ? 'Already checked out for today'
      : 'Already checked in today'
    : undefined;

  const checkOutDisabledReason = !hasPunchedIn
    ? 'Check in first to record attendance'
    : hasPunchedOut
      ? 'Already checked out for today'
      : isOnBreak
        ? 'Please end your break before checking out'
        : undefined;

  const startBreakDisabledReason = !hasPunchedIn
    ? 'Check in first to record attendance'
    : hasPunchedOut
      ? 'Already checked out for today'
      : isOnBreak
        ? 'Already on a break'
        : undefined;

  const endBreakDisabledReason = !isOnBreak ? 'Not currently on a break' : undefined;

  // Formatted date/time helpers for convenience
  const formattedClock = useMemo(() => {
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [now]);

  const formattedDate = useMemo(() => {
    return now
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase();
  }, [now]);

  const formattedSubDate = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [now]);

  // Handlers
  const handleCheckIn = useCallback(
    async (location?: string, notes?: string): Promise<boolean> => {
      setPunchLoading(true);
      setPunchError(null);
      setPunchSuccess(null);
      try {
        await executePunchWithLocation((deviceMetadata) =>
          essApi.checkIn({
            workLocation: location || workLocation || 'office',
            notes,
            deviceMetadata,
          }),
        );
        setPunchSuccess('Checked in successfully!');
        if (onRefresh) {
          await onRefresh();
        }
        return true;
      } catch (err: unknown) {
        setPunchError(formatPunchErrorMessage(err));
        return false;
      } finally {
        setPunchLoading(false);
      }
    },
    [workLocation, onRefresh],
  );

  const handleCheckOut = useCallback(async (): Promise<boolean> => {
    if (isOnBreak) {
      setPunchError('Please end your break before checking out.');
      return false;
    }
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);
    try {
      await executePunchWithLocation((deviceMetadata) => essApi.checkOut({ deviceMetadata }));
      setPunchSuccess('Checked out successfully!');
      if (onRefresh) {
        await onRefresh();
      }
      return true;
    } catch (err: unknown) {
      setPunchError(formatPunchErrorMessage(err));
      return false;
    } finally {
      setPunchLoading(false);
    }
  }, [isOnBreak, onRefresh]);

  const handleStartBreak = useCallback(
    async (breakType: 'tea' | 'lunch' | 'personal' = 'tea', notes?: string): Promise<boolean> => {
      setPunchLoading(true);
      setPunchError(null);
      setPunchSuccess(null);
      try {
        await essApi.startBreak({ breakType, notes });
        setPunchSuccess(`Started ${breakType} break.`);
        if (onRefresh) {
          await onRefresh();
        }
        return true;
      } catch (err: unknown) {
        setPunchError(formatPunchErrorMessage(err));
        return false;
      } finally {
        setPunchLoading(false);
      }
    },
    [onRefresh],
  );

  const handleEndBreak = useCallback(
    async (notes?: string): Promise<boolean> => {
      setPunchLoading(true);
      setPunchError(null);
      setPunchSuccess(null);
      try {
        await essApi.endBreak({ notes });
        setPunchSuccess('Break ended. Back to work!');
        if (onRefresh) {
          await onRefresh();
        }
        return true;
      } catch (err: unknown) {
        setPunchError(formatPunchErrorMessage(err));
        return false;
      } finally {
        setPunchLoading(false);
      }
    },
    [onRefresh],
  );

  return {
    now,
    formattedClock,
    formattedDate,
    formattedSubDate,
    today,
    shift,
    isShiftAssigned,
    shiftName,
    shiftTimes,
    workLocation,
    hasPunchedIn,
    hasPunchedOut,
    isOnBreak,
    currentBreakType,
    currentBreakStartTime,
    status,
    statusLabel,
    punches,
    grossMinutes,
    liveBreakMinutes,
    netWorkedMinutes,
    requiredShiftMinutes,
    progressPercent,
    canCheckIn,
    canCheckOut,
    canStartBreak,
    canEndBreak,
    checkInDisabledReason,
    checkOutDisabledReason,
    startBreakDisabledReason,
    endBreakDisabledReason,
    punchLoading,
    punchError,
    punchSuccess,
    clearFeedback,
    handleCheckIn,
    handleCheckOut,
    handleStartBreak,
    handleEndBreak,
  };
}
