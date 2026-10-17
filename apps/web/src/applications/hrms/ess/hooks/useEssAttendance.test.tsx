import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  useEssAttendance,
  parseAttendanceTimestamp,
  formatMinutes,
  formatDisplayTime,
} from './useEssAttendance';
import { essApi, type EssTodayAttendance } from '../api/essApi';
import * as geoModule from '../utils/geolocation';

vi.mock('../api/essApi', () => ({
  essApi: {
    checkIn: vi.fn(),
    checkOut: vi.fn(),
    startBreak: vi.fn(),
    endBreak: vi.fn(),
  },
}));

vi.mock('../utils/geolocation', () => ({
  executePunchWithLocation: vi.fn((fn) => fn({ latitude: 12.9716, longitude: 77.5946 })),
  formatPunchErrorMessage: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : 'Punch action failed',
  ),
}));

describe('useEssAttendance Helpers', () => {
  describe('parseAttendanceTimestamp', () => {
    it('parses HH:mm format on specified date', () => {
      const d = parseAttendanceTimestamp('2026-10-17', '09:30');
      expect(d).not.toBeNull();
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(9); // 0-indexed October
      expect(d?.getDate()).toBe(17);
      expect(d?.getHours()).toBe(9);
      expect(d?.getMinutes()).toBe(30);
    });

    it('parses HH:mm:ss format', () => {
      const d = parseAttendanceTimestamp('2026-10-17', '18:45:15');
      expect(d).not.toBeNull();
      expect(d?.getHours()).toBe(18);
      expect(d?.getMinutes()).toBe(45);
      expect(d?.getSeconds()).toBe(15);
    });

    it('parses ISO format', () => {
      const iso = '2026-10-17T14:20:00.000Z';
      const d = parseAttendanceTimestamp('2026-10-17', iso);
      expect(d?.toISOString()).toBe(iso);
    });

    it('returns null for null, empty or invalid strings', () => {
      expect(parseAttendanceTimestamp('2026-10-17', null)).toBeNull();
      expect(parseAttendanceTimestamp('2026-10-17', undefined)).toBeNull();
      expect(parseAttendanceTimestamp('2026-10-17', '')).toBeNull();
      expect(parseAttendanceTimestamp('2026-10-17', '--:--')).toBeNull();
      expect(parseAttendanceTimestamp('2026-10-17', 'invalid-time')).toBeNull();
    });
  });

  describe('formatMinutes', () => {
    it('formats 0 or negative minutes', () => {
      expect(formatMinutes(0)).toBe('0m');
      expect(formatMinutes(-10)).toBe('0m');
      expect(formatMinutes(undefined)).toBe('0m');
    });

    it('formats minutes under 1 hour', () => {
      expect(formatMinutes(45)).toBe('45m');
    });

    it('formats hours and minutes', () => {
      expect(formatMinutes(60)).toBe('1h 0m');
      expect(formatMinutes(125)).toBe('2h 5m');
      expect(formatMinutes(480)).toBe('8h 0m');
    });
  });

  describe('formatDisplayTime', () => {
    it('formats 24-hour time to 12-hour AM/PM', () => {
      expect(formatDisplayTime('09:30')).toBe('09:30 AM');
      expect(formatDisplayTime('12:00')).toBe('12:00 PM');
      expect(formatDisplayTime('18:45')).toBe('06:45 PM');
      expect(formatDisplayTime('00:15')).toBe('12:15 AM');
    });

    it('handles empty or placeholder strings', () => {
      expect(formatDisplayTime(null)).toBe('--:--');
      expect(formatDisplayTime(undefined)).toBe('--:--');
      expect(formatDisplayTime('--:--')).toBe('--:--');
    });
  });
});

describe('useEssAttendance in React Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function TestAttendanceConsumer({
    todayAttendance,
  }: {
    todayAttendance?: EssTodayAttendance | null;
  }) {
    const att = useEssAttendance({ todayAttendance });
    return (
      <div data-testid="attendance-consumer">
        <span data-testid="status">{att.status}</span>
        <span data-testid="status-label">{att.statusLabel}</span>
        <span data-testid="can-checkin">{String(att.canCheckIn)}</span>
        <span data-testid="can-checkout">{String(att.canCheckOut)}</span>
        <span data-testid="can-start-break">{String(att.canStartBreak)}</span>
        <span data-testid="can-end-break">{String(att.canEndBreak)}</span>
        <span data-testid="shift-name">{att.shiftName}</span>
        <span data-testid="shift-times">{att.shiftTimes}</span>
        <span data-testid="gross-minutes">{att.grossMinutes}</span>
        <span data-testid="net-minutes">{att.netWorkedMinutes}</span>
      </div>
    );
  }

  it('renders default state when todayAttendance is empty', () => {
    const html = renderToStaticMarkup(<TestAttendanceConsumer />);
    expect(html).toContain('not_checked_in');
    expect(html).toContain('Not Checked In');
    expect(html).toContain('>true</span><span data-testid="can-checkout">false');
    expect(html).toContain('Unassigned');
    expect(html).toContain('No scheduled shift');
  });

  it('renders WORKING state with assigned shift', () => {
    const mockToday: EssTodayAttendance = {
      date: '2026-10-17',
      checkInTime: '09:00',
      checkOutTime: null,
      status: 'working',
      workLocation: 'office',
      workedMinutes: 120,
      breakMinutes: 0,
      isOnBreak: false,
      shift: {
        name: 'General Shift',
        startTime: '09:00',
        endTime: '18:00',
        requiredHours: 8,
        graceMinutes: 15,
        breakAllowanceMinutes: 60,
        isAssigned: true,
      },
    };

    const html = renderToStaticMarkup(<TestAttendanceConsumer todayAttendance={mockToday} />);
    expect(html).toContain('working');
    expect(html).toContain('Working');
    expect(html).toContain('<span data-testid="can-checkin">false</span>');
    expect(html).toContain('<span data-testid="can-checkout">true</span>');
    expect(html).toContain('<span data-testid="can-start-break">true</span>');
    expect(html).toContain('<span data-testid="can-end-break">false</span>');
    expect(html).toContain('General Shift');
    expect(html).toContain('09:00–18:00');
  });

  it('renders ON_BREAK state and disables check out', () => {
    const mockToday: EssTodayAttendance = {
      date: '2026-10-17',
      checkInTime: '09:00',
      checkOutTime: null,
      status: 'on_break',
      workLocation: 'office',
      workedMinutes: 180,
      breakMinutes: 15,
      isOnBreak: true,
      currentBreakType: 'tea',
      currentBreakStartTime: '11:30',
    };

    const html = renderToStaticMarkup(<TestAttendanceConsumer todayAttendance={mockToday} />);
    expect(html).toContain('on_break');
    expect(html).toContain('On Break (tea)');
    expect(html).toContain('<span data-testid="can-checkout">false</span>');
    expect(html).toContain('<span data-testid="can-start-break">false</span>');
    expect(html).toContain('<span data-testid="can-end-break">true</span>');
  });

  it('renders CHECKED_OUT state and disables all punch actions', () => {
    const mockToday: EssTodayAttendance = {
      date: '2026-10-17',
      checkInTime: '09:00',
      checkOutTime: '18:00',
      status: 'checked_out',
      workLocation: 'office',
      workedMinutes: 540,
      breakMinutes: 60,
      isOnBreak: false,
    };

    const html = renderToStaticMarkup(<TestAttendanceConsumer todayAttendance={mockToday} />);
    expect(html).toContain('checked_out');
    expect(html).toContain('Checked Out');
    expect(html).toContain('<span data-testid="can-checkin">false</span>');
    expect(html).toContain('<span data-testid="can-checkout">false</span>');
    expect(html).toContain('<span data-testid="can-start-break">false</span>');
    expect(html).toContain('<span data-testid="can-end-break">false</span>');
  });

  it('correctly calculates overnight shift hours across day boundary', () => {
    const mockOvernight: EssTodayAttendance = {
      date: '2026-10-16',
      checkInTime: '22:00',
      checkOutTime: '06:00',
      status: 'checked_out',
      workLocation: 'office',
      workedMinutes: 480,
      breakMinutes: 0,
      isOnBreak: false,
    };

    const html = renderToStaticMarkup(<TestAttendanceConsumer todayAttendance={mockOvernight} />);
    expect(html).toContain('<span data-testid="gross-minutes">480</span>');
    expect(html).toContain('<span data-testid="net-minutes">480</span>');
  });

  it('triggers geolocation-backed check-in and refresh', async () => {
    vi.mocked(essApi.checkIn).mockResolvedValueOnce({
      id: 'att-1',
      date: '2026-10-17',
      checkInTime: '09:05',
      checkOutTime: null,
      status: 'present',
      workLocation: 'office',
    });

    let hookResult: ReturnType<typeof useEssAttendance> | null = null;
    function CapturingConsumer() {
      hookResult = useEssAttendance();
      return null;
    }

    renderToStaticMarkup(<CapturingConsumer />);
    expect(hookResult).not.toBeNull();

    const ok = await hookResult!.handleCheckIn('office', 'Test check in');
    expect(ok).toBe(true);
    expect(geoModule.executePunchWithLocation).toHaveBeenCalled();
    expect(essApi.checkIn).toHaveBeenCalledWith({
      workLocation: 'office',
      notes: 'Test check in',
      deviceMetadata: { latitude: 12.9716, longitude: 77.5946 },
    });
  });

  it('prevents checkout when on break', async () => {
    const mockToday: EssTodayAttendance = {
      date: '2026-10-17',
      checkInTime: '09:00',
      checkOutTime: null,
      status: 'on_break',
      workLocation: 'office',
      isOnBreak: true,
    };

    let hookResult: ReturnType<typeof useEssAttendance> | null = null;
    function CapturingConsumer() {
      hookResult = useEssAttendance({ todayAttendance: mockToday });
      return null;
    }

    renderToStaticMarkup(<CapturingConsumer />);
    expect(hookResult).not.toBeNull();

    const ok = await hookResult!.handleCheckOut();
    expect(ok).toBe(false);
    expect(essApi.checkOut).not.toHaveBeenCalled();
  });
});
