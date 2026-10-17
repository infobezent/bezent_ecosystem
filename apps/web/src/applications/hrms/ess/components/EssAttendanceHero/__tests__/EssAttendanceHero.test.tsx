import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EssAttendanceHero } from '../EssAttendanceHero';

describe('EssAttendanceHero Component', () => {
  const mockEmployee = {
    firstName: 'Priya',
    lastName: 'Sharma',
    gender: 'female' as const,
    designationTitle: 'Lead Product Designer',
    departmentName: 'Design & Experience',
    employeeNumber: 'EMP-1042',
    locationName: 'Bengaluru',
    employmentStatus: 'ACTIVE',
  };

  const defaultProps = {
    employee: mockEmployee,
    attendance: {
      date: '2026-10-17',
      checkInTime: null,
      checkOutTime: null,
      workedMinutes: 0,
      breakMinutes: 0,
      isOnBreak: false,
      status: 'not_checked_in',
      shift: null,
      workLocation: 'Office',
    },
    briefing: {
      pendingActionsCount: 2,
      actionsSummary: '2 approvals pending your review',
    },
    timezone: 'IST',
    canCheckIn: true,
    canCheckOut: false,
    checkOutDisabledReason: 'Check in first to record attendance',
    onCheckIn: vi.fn(),
    onCheckOut: vi.fn(),
    onStartBreak: vi.fn(),
    onEndBreak: vi.fn(),
  };

  it('renders employee greeting and profile details', () => {
    const html = renderToStaticMarkup(<EssAttendanceHero {...defaultProps} />);
    expect(html).toContain('Priya');
    expect(html).toContain('EMP-1042');
    expect(html).toContain('Lead Product Designer');
    expect(html).toContain('Design &amp; Experience');
    expect(html).toContain('Bengaluru');
    expect(html).toContain('ACTIVE');
  });

  it('renders check in enabled and check out disabled in not checked in state', () => {
    const html = renderToStaticMarkup(<EssAttendanceHero {...defaultProps} />);
    expect(html).toContain('id="dashboard-check-in-btn"');
    expect(html).toContain('id="dashboard-check-out-btn"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('title="Check in first to record attendance"');
    expect(html).toContain('Not Checked In');
  });

  it('renders unassigned shift cleanly without fallback hours', () => {
    const html = renderToStaticMarkup(<EssAttendanceHero {...defaultProps} />);
    expect(html).toContain('Unassigned • No scheduled shift');
    expect(html).not.toContain('09:00–18:00');
  });

  it('renders assigned shift name and hours when scheduled', () => {
    const props = {
      ...defaultProps,
      attendance: {
        ...defaultProps.attendance,
        shift: {
          name: 'Morning Shift',
          startTime: '08:00',
          endTime: '17:00',
          requiredHours: 8,
          graceMinutes: 15,
          breakAllowanceMinutes: 60,
          isAssigned: true,
        },
      },
    };
    const html = renderToStaticMarkup(<EssAttendanceHero {...props} />);
    expect(html).toContain('Morning Shift • 08:00–17:00');
  });

  it('renders WORKING state with formatted check-in time and break link', () => {
    const props = {
      ...defaultProps,
      attendance: {
        ...defaultProps.attendance,
        checkInTime: '09:15',
        checkOutTime: null,
        workedMinutes: 135,
        breakMinutes: 0,
        status: 'working',
        isOnBreak: false,
      },
      canCheckIn: false,
      canCheckOut: true,
      checkInDisabledReason: 'Already checked in today',
    };
    const html = renderToStaticMarkup(<EssAttendanceHero {...props} />);
    expect(html).toContain('09:15 AM');
    expect(html).toContain('Working');
    expect(html).toContain('id="dashboard-break-btn"');
    expect(html).toContain('☕ Start Break');
  });

  it('renders ON_BREAK state with active break type and End Break button', () => {
    const props = {
      ...defaultProps,
      attendance: {
        ...defaultProps.attendance,
        checkInTime: '09:00',
        checkOutTime: null,
        workedMinutes: 180,
        breakMinutes: 15,
        status: 'on_break',
        isOnBreak: true,
        currentBreakType: 'Lunch',
        currentBreakStartTime: '13:00',
      },
      canCheckIn: false,
      canCheckOut: false,
      checkOutDisabledReason: 'Please end your break before checking out',
    };
    const html = renderToStaticMarkup(<EssAttendanceHero {...props} />);
    expect(html).toContain('On Break (Lunch)');
    expect(html).toContain('✓ End Break');
    expect(html).toContain('title="Please end your break before checking out"');
  });

  it('renders CHECKED_OUT state with check-out time and no break link', () => {
    const props = {
      ...defaultProps,
      attendance: {
        ...defaultProps.attendance,
        checkInTime: '09:00',
        checkOutTime: '18:15',
        workedMinutes: 555,
        breakMinutes: 45,
        status: 'checked_out',
        isOnBreak: false,
      },
      canCheckIn: false,
      canCheckOut: false,
    };
    const html = renderToStaticMarkup(<EssAttendanceHero {...props} />);
    expect(html).toContain('06:15 PM');
    expect(html).toContain('Checked Out');
    expect(html).not.toContain('id="dashboard-break-btn"');
  });

  it('renders daily briefing summary and action count', () => {
    const html = renderToStaticMarkup(<EssAttendanceHero {...defaultProps} />);
    expect(html).toContain('Daily Briefing');
    expect(html).toContain('2 actions');
    expect(html).toContain('2 approvals pending your review');
  });

  it('renders "All clear" when pendingActionsCount is 0', () => {
    const props = {
      ...defaultProps,
      briefing: {
        pendingActionsCount: 0,
        actionsSummary: 'All daily tasks are up to date.',
      },
    };
    const html = renderToStaticMarkup(<EssAttendanceHero {...props} />);
    expect(html).toContain('All clear');
  });
});
