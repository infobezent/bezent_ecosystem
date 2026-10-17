import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AttendanceMonthlyCalendar,
  type AttendanceSummaryMetrics,
} from '../AttendanceMonthlyCalendar';
import type { EssAttendanceRecord } from '../../../api/essApi';

describe('AttendanceMonthlyCalendar Component', () => {
  const mockSummary: AttendanceSummaryMetrics = {
    presentDays: 18,
    absentDays: 2,
    halfDays: 1,
    lateDays: 3,
    lateMarksCount: 3,
    workedMinutes: 9750, // 162h 30m
    missingPunchesCount: 1,
    attendancePercent: 90,
    totalWorkingDays: 21,
  };

  const mockHistory: EssAttendanceRecord[] = [
    {
      id: 'att-1',
      date: '2026-10-01',
      checkInTime: '09:00',
      checkOutTime: '18:00',
      status: 'present',
      workLocation: 'office',
      workedMinutes: 540,
      breakMinutes: 45,
      isLate: false,
      isEarlyExit: false,
      isMissingPunch: false,
      isRegularized: false,
      shiftScheduleRef: 'General Shift (09:00 - 18:00)',
    },
    {
      id: 'att-2',
      date: '2026-10-02',
      checkInTime: '09:35',
      checkOutTime: '18:30',
      status: 'present',
      workLocation: 'office',
      workedMinutes: 535,
      breakMinutes: 50,
      isLate: true,
      lateMinutes: 35,
      isEarlyExit: false,
      isMissingPunch: false,
      isRegularized: false,
    },
    {
      id: 'att-3',
      date: '2026-10-05',
      checkInTime: '09:00',
      checkOutTime: '13:00',
      status: 'half_day',
      workLocation: 'office',
      workedMinutes: 240,
      breakMinutes: 15,
      isLate: false,
      isEarlyExit: false,
      isMissingPunch: false,
      isRegularized: false,
    },
    {
      id: 'att-4',
      date: '2026-10-06',
      checkInTime: null,
      checkOutTime: null,
      status: 'absent',
      workLocation: 'office',
      workedMinutes: 0,
      breakMinutes: 0,
      isLate: false,
      isEarlyExit: false,
      isMissingPunch: false,
      isRegularized: false,
    },
    {
      id: 'att-5',
      date: '2026-10-07',
      checkInTime: '09:05',
      checkOutTime: null,
      status: 'incomplete',
      workLocation: 'office',
      workedMinutes: 240,
      breakMinutes: 0,
      isLate: false,
      isEarlyExit: false,
      isMissingPunch: true,
      isRegularized: false,
    },
    {
      id: 'att-6',
      date: '2026-10-08',
      checkInTime: null,
      checkOutTime: null,
      status: 'on_leave',
      workLocation: 'office',
      workedMinutes: 0,
      breakMinutes: 0,
      isLate: false,
      isEarlyExit: false,
      isMissingPunch: false,
      isRegularized: false,
    },
    {
      id: 'att-7',
      date: '2026-10-09',
      checkInTime: null,
      checkOutTime: null,
      status: 'holiday',
      workLocation: 'office',
      workedMinutes: 0,
      breakMinutes: 0,
      isLate: false,
      isEarlyExit: false,
      isMissingPunch: false,
      isRegularized: false,
    },
  ];

  it('renders all 6 backend-derived monthly summary metrics', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    // Present Days
    expect(html).toContain('Present Days');
    expect(html).toContain('18');

    // Absent Days
    expect(html).toContain('Absent Days');
    expect(html).toContain('2');

    // Half Days
    expect(html).toContain('Half Days');
    expect(html).toContain('1');

    // Late Arrivals
    expect(html).toContain('Late Arrivals');
    expect(html).toContain('3');

    // Worked Hours (9750 mins = 162h 30m)
    expect(html).toContain('Worked Hours');
    expect(html).toContain('162h 30m');

    // Missing Punches
    expect(html).toContain('Missing Punches');
    expect(html).toContain('1');

    // Attendance percentage
    expect(html).toContain('90% Attendance');
  });

  it('renders navigation bar with month title, navigation icons, and Today shortcut', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    expect(html).toContain('October 2026');
    expect(html).toContain('aria-label="Previous Month"');
    expect(html).toContain('aria-label="Next Month"');
    expect(html).toContain('Today');
  });

  it('classifies days based strictly on backend records without client-side absence inference', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    // Present day (2026-10-01)
    expect(html).toContain('bezent-attendance-calendar__day--present');

    // Late day (2026-10-02)
    expect(html).toContain('bezent-attendance-calendar__day--late');

    // Half Day (2026-10-05)
    expect(html).toContain('bezent-attendance-calendar__day--half-day');

    // Absent (2026-10-06)
    expect(html).toContain('bezent-attendance-calendar__day--absent');

    // Missing punch (2026-10-07)
    expect(html).toContain('bezent-attendance-calendar__day--missing-punch');

    // Leave (2026-10-08)
    expect(html).toContain('bezent-attendance-calendar__day--leave');

    // Holiday (2026-10-09)
    expect(html).toContain('bezent-attendance-calendar__day--holiday');

    // Weekend (Weekly Off)
    expect(html).toContain('bezent-attendance-calendar__day--weekly-off');
  });

  it('renders full color legend covering all 8 attendance statuses', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    expect(html).toContain('bezent-attendance-calendar__legend-dot--present');
    expect(html).toContain('Present');
    expect(html).toContain('bezent-attendance-calendar__legend-dot--late');
    expect(html).toContain('Late');
    expect(html).toContain('bezent-attendance-calendar__legend-dot--half-day');
    expect(html).toContain('Half Day');
    expect(html).toContain('bezent-attendance-calendar__legend-dot--absent');
    expect(html).toContain('Absent');
    expect(html).toContain('bezent-attendance-calendar__legend-dot--missing-punch');
    expect(html).toContain('Missing Punch');
    expect(html).toContain('bezent-attendance-calendar__legend-dot--leave');
    expect(html).toContain('Leave');
    expect(html).toContain('bezent-attendance-calendar__legend-dot--holiday');
    expect(html).toContain('Holiday');
    expect(html).toContain('bezent-attendance-calendar__legend-dot--weekly-off');
    expect(html).toContain('Weekly Off');
  });

  it('displays selected date details accurately from server record', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        selectedDateStr="2026-10-01"
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    expect(html).toMatch(/1 October 2026|October 1, 2026/);
    expect(html).toContain('General Shift (09:00 - 18:00)');
    expect(html).toContain('Check In: <strong>09:00 AM</strong>');
    expect(html).toContain('Worked: <strong>9h 0m</strong>');
  });

  it('renders appropriate state for empty/unrecorded days', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        selectedDateStr="2026-10-14"
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    expect(html).toContain('No punch recorded');
  });

  it('renders modern rectangular day tiles with prominent date, status, and worked duration', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    // Day tile structure classes
    expect(html).toContain('bezent-attendance-calendar__tile');
    expect(html).toContain('bezent-attendance-calendar__tile-top');
    expect(html).toContain('bezent-attendance-calendar__tile-date');
    expect(html).toContain('bezent-attendance-calendar__tile-status');
    expect(html).toContain('bezent-attendance-calendar__tile-sub');

    // Present Day 1: 540 mins = 9h 0m
    expect(html).toContain('bezent-attendance-calendar__tile--present');
    expect(html).toContain('9h 0m');
    expect(html).toContain('aria-label="October 1, Present, 9 hours');

    // Late Day 2: 535 mins = 8h 55m
    expect(html).toContain('bezent-attendance-calendar__tile--late');
    expect(html).toContain('8h 55m');

    // Half Day 5: 240 mins = 4h 0m
    expect(html).toContain('bezent-attendance-calendar__tile--half-day');
    expect(html).toContain('4h 0m');

    // Absent Day 6: no duration line (omit fabricated 0h)
    expect(html).toContain('bezent-attendance-calendar__tile--absent');

    // Missing Punch Day 7: 240 mins = 4h 0m
    expect(html).toContain('bezent-attendance-calendar__tile--missing-punch');

    // Leave Day 8: contextual "Approved" subLabel
    expect(html).toContain('bezent-attendance-calendar__tile--leave');
    expect(html).toContain('Approved');

    // Holiday Day 9
    expect(html).toContain('bezent-attendance-calendar__tile--holiday');

    // Weekly Off (Rest Day)
    expect(html).toContain('bezent-attendance-calendar__tile--weekly-off');
    expect(html).toContain('Rest Day');
  });

  it('handles selected date highlighting and accessible aria-pressed state', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        selectedDateStr="2026-10-02"
        summary={mockSummary}
        history={mockHistory}
      />,
    );

    expect(html).toContain('bezent-attendance-calendar__tile--selected');
    expect(html).toContain('aria-pressed="true"');
  });

  it('omits duration line when workedMinutes is unavailable or 0', () => {
    const recordsWithoutDuration: EssAttendanceRecord[] = [
      {
        id: 'att-nodur',
        date: '2026-10-01',
        checkInTime: null,
        checkOutTime: null,
        status: 'present',
        workLocation: 'office',
        workedMinutes: 0,
      },
    ];

    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        summary={mockSummary}
        history={recordsWithoutDuration}
      />,
    );

    // Present status is displayed, but no duration sub-label is rendered
    expect(html).toContain('bezent-attendance-calendar__tile--present');
    // Ensure we don't display "0m" or "0h" on present day when workedMinutes is 0
    expect(html).not.toMatch(/<div class="[^"]*tile-sub[^"]*">0[hm]/);
  });

  it('respects hideSummaryCards and hideInlineDetails props', () => {
    const html = renderToStaticMarkup(
      <AttendanceMonthlyCalendar
        initialDate={new Date('2026-10-15T00:00:00Z')}
        summary={mockSummary}
        history={mockHistory}
        hideSummaryCards={true}
        hideInlineDetails={true}
      />,
    );

    // Summary cards container should not be rendered
    expect(html).toContain('bezent-attendance-snapshot__layout--calendar-only');
    expect(html).not.toContain('bezent-attendance-calendar__summary-column');

    // Inline details panel should not be rendered
    expect(html).not.toContain('bezent-attendance-calendar__details');
  });
});
