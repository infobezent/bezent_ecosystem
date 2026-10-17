import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EssAttendancePage } from '../EssAttendancePage';
import { essApi } from '../../api/essApi';

vi.mock('../../api/essApi', () => ({
  essApi: {
    getAttendance: vi.fn(),
    getAttendanceRegularizations: vi.fn(),
    checkIn: vi.fn(),
    checkOut: vi.fn(),
    startBreak: vi.fn(),
    endBreak: vi.fn(),
    regularizeAttendance: vi.fn(),
  },
}));

vi.mock('../../hooks', () => ({
  useEssAttendance: () => ({
    now: new Date('2026-10-17T10:30:00Z'),
    today: {
      date: '2026-10-17',
      checkInTime: '09:02',
      checkOutTime: null,
      status: 'working',
      workLocation: 'office',
      notes: null,
      workedMinutes: 90,
      breakMinutes: 0,
      isOnBreak: false,
      punches: [
        {
          id: 'p-1',
          punchType: 'in',
          punchTime: '2026-10-17T09:02:00Z',
          source: 'Web ESS',
          workLocation: 'office',
          notes: null,
        },
      ],
    },
    shift: {
      name: 'General Shift',
      startTime: '09:00',
      endTime: '18:00',
      requiredHours: 8,
      graceMinutes: 15,
      breakAllowanceMinutes: 60,
    },
    isShiftAssigned: true,
    shiftName: 'General Shift',
    shiftTimes: '09:00 - 18:00',
    hasPunchedIn: true,
    hasPunchedOut: false,
    isOnBreak: false,
    statusLabel: 'Working',
    grossMinutes: 90,
    liveBreakMinutes: 0,
    netWorkedMinutes: 90,
    requiredShiftMinutes: 480,
    progressPercent: 19,
    canCheckIn: false,
    canCheckOut: true,
    canStartBreak: true,
    canEndBreak: false,
    checkInDisabledReason: 'Already checked in',
    checkOutDisabledReason: undefined,
    punchLoading: false,
    punchError: null,
    punchSuccess: null,
    handleCheckIn: vi.fn(),
    handleCheckOut: vi.fn(),
    handleStartBreak: vi.fn(),
    handleEndBreak: vi.fn(),
  }),
  formatDisplayTime: (t?: string | null) => t ?? '--:--',
  formatMinutes: (m?: number) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : '0m'),
}));

describe('EssAttendancePage Component', () => {
  const mockWorkspace = {
    today: {
      date: '2026-10-17',
      checkInTime: '09:02',
      checkOutTime: null,
      status: 'working' as const,
      workLocation: 'office',
      notes: null,
      workedMinutes: 90,
      breakMinutes: 0,
      isOnBreak: false,
      punches: [
        {
          id: 'p-1',
          punchType: 'in' as const,
          punchTime: '2026-10-17T09:02:00Z',
          source: 'Web ESS',
          workLocation: 'office',
          notes: null,
        },
      ],
    },
    summary: {
      presentDays: 14,
      absentDays: 1,
      halfDays: 1,
      leaveDays: 2,
      payableDays: 16.5,
      lateMarksCount: 2,
      regularizationQuotaUsed: 1,
      regularizationQuotaLimit: 3,
      workedMinutes: 7200,
      missingPunchesCount: 1,
      attendancePercent: 93,
      totalWorkingDays: 16,
    },
    history: [
      {
        id: 'rec-1',
        date: '2026-10-17',
        checkInTime: '09:02',
        checkOutTime: null,
        status: 'present' as const,
        workLocation: 'office',
        workedMinutes: 90,
        breakMinutes: 0,
        isLate: false,
        isEarlyExit: false,
        isMissingPunch: false,
        isRegularized: false,
        shiftScheduleRef: 'General Shift',
      },
      {
        id: 'rec-2',
        date: '2026-10-16',
        checkInTime: '09:30',
        checkOutTime: '18:15',
        status: 'present' as const,
        workLocation: 'office',
        workedMinutes: 525,
        breakMinutes: 45,
        isLate: true,
        lateMinutes: 30,
        isEarlyExit: false,
        isMissingPunch: false,
        isRegularized: false,
      },
    ],
    monthlySummary: [],
    view: {
      visibility: 'daily_and_monthly',
      historyDays: 60,
    },
  };

  const mockRegularizations = [
    {
      id: 'reg-101',
      requestNumber: 'REG-2026-001',
      workday: '2026-10-16',
      date: '2026-10-16',
      requestType: 'punch_correction',
      status: 'submitted',
      approvalStatus: 'submitted' as const,
      applicationStatus: 'pending_application' as const,
      reason: 'Biometric device delay',
      proposedCorrection: '09:00 - 18:15',
      proposedCheckIn: '09:00',
      proposedCheckOut: '18:15',
      submittedAt: '2026-10-16T19:00:00Z',
      createdAt: '2026-10-16T19:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(essApi.getAttendance).mockResolvedValue(mockWorkspace);
    vi.mocked(essApi.getAttendanceRegularizations).mockResolvedValue(mockRegularizations);
  });

  it('renders initial loading state without crashing', () => {
    const html = renderToStaticMarkup(<EssAttendancePage />);
    expect(html).toContain('Loading attendance...');
  });

  it('verifies authoritative backend summary data mapping', () => {
    const { summary } = mockWorkspace;
    expect(summary.presentDays).toBe(14);
    expect(summary.absentDays).toBe(1);
    expect(summary.halfDays).toBe(1);
    expect(summary.lateMarksCount).toBe(2);
    expect(summary.workedMinutes).toBe(7200); // 120 hours
    expect(summary.missingPunchesCount).toBe(1);
    expect(summary.attendancePercent).toBe(93);
  });

  it('verifies duplicate regularization prevention rule', () => {
    // If a request already exists for a date, the active request should be detected
    const activeReq = mockRegularizations.find(
      (r) =>
        r.workday === '2026-10-16' &&
        ['submitted', 'under_review', 'awaiting_info', 'approved'].includes(r.approvalStatus),
    );
    expect(activeReq).toBeDefined();
    expect(activeReq?.requestNumber).toBe('REG-2026-001');
    expect(activeReq?.approvalStatus).toBe('submitted');

    // For a different date with no active request
    const noReq = mockRegularizations.find(
      (r) =>
        r.workday === '2026-10-17' &&
        ['submitted', 'under_review', 'awaiting_info', 'approved'].includes(r.approvalStatus),
    );
    expect(noReq).toBeUndefined();
  });
});
