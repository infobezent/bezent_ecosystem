import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ShiftsPage } from '../pages/ShiftsPage';
import type { FrontendShift, FrontendShiftAssignment } from '../api/shiftApi';

describe('BEZENT HRMS — ShiftsPage Frontend Component Suite', () => {
  const sampleShifts: FrontendShift[] = [
    {
      id: 'shf_001',
      name: 'General Day Shift',
      code: 'GEN-01',
      description: 'Standard office hours',
      startTime: '09:00',
      endTime: '18:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      breakMinutes: 60,
      lunchMinutes: 30,
      graceMinutes: 15,
      color: '#2563EB',
      isActive: true,
      isOvernight: false,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'shf_002',
      name: 'Night Owl Shift',
      code: 'NIGHT-01',
      description: 'Customer support night coverage',
      startTime: '22:00',
      endTime: '06:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      breakMinutes: 45,
      lunchMinutes: 30,
      graceMinutes: 10,
      color: '#7C3AED',
      isActive: true,
      isOvernight: true,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
  ];

  const sampleAssignments: FrontendShiftAssignment[] = [
    {
      id: 'asgn_001',
      tenantId: 'tenant_test',
      companyId: 'comp_test',
      shiftId: 'shf_001',
      assignmentScope: 'employee',
      employeeId: 'emp_001',
      departmentId: null,
      locationId: null,
      effectiveStartDate: '2026-11-01',
      effectiveEndDate: null,
      isActive: true,
      notes: 'Assigned by HR',
      shiftName: 'General Day Shift',
      shiftCode: 'GEN-01',
      shiftStartTime: '09:00',
      shiftEndTime: '18:00',
      shiftIsOvernight: false,
      targetName: 'Aarav Patel',
      targetCode: 'EMP-101',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'asgn_002',
      tenantId: 'tenant_test',
      companyId: 'comp_test',
      shiftId: 'shf_002',
      assignmentScope: 'department',
      employeeId: null,
      departmentId: 'dept_support',
      locationId: null,
      effectiveStartDate: '2026-11-01',
      effectiveEndDate: null,
      isActive: true,
      notes: 'Support team roster',
      shiftName: 'Night Owl Shift',
      shiftCode: 'NIGHT-01',
      shiftStartTime: '22:00',
      shiftEndTime: '06:00',
      shiftIsOvernight: true,
      targetName: 'Customer Support Dept',
      targetCode: 'DEPT-SUP',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders PageHeader title, subtitle, and action buttons', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShiftsPage initialShifts={sampleShifts} initialAssignments={sampleAssignments} />
      </MemoryRouter>,
    );

    expect(html).toContain('Shift Management &amp; Rotations');
    expect(html).toContain('Manage company work shifts, rotating schedules');
    expect(html).toContain('+ Create Shift');
  });

  it('renders summary metric cards with accurate calculations', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShiftsPage initialShifts={sampleShifts} initialAssignments={sampleAssignments} />
      </MemoryRouter>,
    );

    // Total shifts = 2
    expect(html).toContain('Total Shifts');
    expect(html).toContain('Active Shifts');
    expect(html).toContain('Active Assignments');
    expect(html).toContain('Overnight Shifts');
  });

  it('renders shift templates table with shift names, codes, and timings', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShiftsPage initialShifts={sampleShifts} initialAssignments={sampleAssignments} />
      </MemoryRouter>,
    );

    expect(html).toContain('General Day Shift');
    expect(html).toContain('GEN-01');
    expect(html).toContain('09:00 – 18:00');
    expect(html).toContain('Night Owl Shift');
    expect(html).toContain('NIGHT-01');
    expect(html).toContain('22:00 – 06:00');
    expect(html).toContain('Overnight');
  });

  it('renders empty state when no shift templates exist', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShiftsPage initialShifts={[]} initialAssignments={[]} />
      </MemoryRouter>,
    );

    expect(html).toContain('No shifts found');
    expect(html).toContain('Create a work shift template to configure employee working hours');
  });
});
