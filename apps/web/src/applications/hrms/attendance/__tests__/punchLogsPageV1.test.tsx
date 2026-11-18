import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  PunchLogsPage,
  filterFirstInPunches,
  filterLastOutPunches,
  filterLatePunches,
  filterExceptionPunches,
} from '../pages/PunchLogsPage';
import { generateSamplePunchLogs, SAMPLE_EMPLOYEES } from '../data/samplePunchLogs';
import * as attendanceApi from '../api/attendanceApi';

describe('BEZENT HRMS — Punch Logs V1.0 Frontend Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(attendanceApi, 'fetchPunchLogs').mockResolvedValue({
      punches: [
        {
          id: 'punch-001',
          tenantId: 'tenant-1',
          companyId: 'comp-1',
          employeeId: 'emp-101',
          employeeName: 'Aarav Patel',
          employeeCode: 'EMP-101',
          punchTime: '2026-10-10T09:00:00Z',
          punchType: 'in',
          source: 'biometric',
          workLocation: 'HQ - Gate 1',
          workday: '2026-10-10',
          validationStatus: 'valid',
          processingState: 'processed',
          retryCount: 0,
          investigationStatus: 'none',
          linkedAttendanceId: 'att-001',
          linkedAttendanceStatus: 'present',
          createdAt: '2026-10-10T09:00:02Z',
          updatedAt: '2026-10-10T09:00:02Z',
        },
      ],
      counters: {
        total: 42,
        valid: 38,
        needsReview: 2,
        duplicates: 1,
        unmatched: 1,
        processingFailed: 0,
      },
      total: 42,
    });
  });

  it('renders PageHeader with Attendance title and navigation tabs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PunchLogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Attendance');
    expect(html).toContain('Punch Logs');
    expect(html).toContain('Event Time');
    expect(html).toContain('Workday');
    expect(html).toContain('Export Punch Logs');
  });

  it('renders unified directory toolbar controls and records badge', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PunchLogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search name or ID');
    expect(html).toContain('Filters');
    expect(html).toContain('Records');
  });

  it('renders primary filter bar controls and view selector options', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PunchLogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search by name or employee ID');
    expect(html).toContain('All Punches');
    expect(html).toContain('First In');
    expect(html).toContain('Last Out');
    expect(html).toContain('Late Punch');
    expect(html).toContain('Exceptions');
    expect(html).toContain('Filters');
  });

  it('renders five category summary cards functioning as primary navigation controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PunchLogsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('All Punches');
    expect(html).toContain('First In');
    expect(html).toContain('Last Out');
    expect(html).toContain('Late Punch');
    expect(html).toContain('Exceptions');
    expect(html).not.toContain('aria-label="Punch logs view mode"');
    expect(html).not.toContain('<span class="bezent-kpi-card__title">Total Punches</span>');
    expect(html).not.toContain('<span class="bezent-kpi-card__title">Accepted</span>');
    expect(html).not.toContain('<span class="bezent-kpi-card__title">Flagged</span>');
    expect(html).not.toContain('<span class="bezent-kpi-card__title">Failed to Process</span>');
  });

  describe('Sample Dataset Population & Integrity', () => {
    it('populates 10 consistent sample employees', () => {
      const expectedEmployees = [
        { code: 'BZ1001', name: 'Karthik P' },
        { code: 'BZ1007', name: 'Sahana J' },
        { code: 'BZ1010', name: 'Arjun S' },
        { code: 'BZ1014', name: 'Priya L' },
        { code: 'BZ1020', name: 'Vimal M' },
        { code: 'BZ1025', name: 'Divya R' },
        { code: 'BZ1030', name: 'Naveen K' },
        { code: 'BZ1035', name: 'Harish M' },
        { code: 'BZ1040', name: 'Meera R' },
        { code: 'BZ1045', name: 'Sanjay K' },
      ];

      for (const emp of expectedEmployees) {
        expect(SAMPLE_EMPLOYEES[emp.code]).toBeDefined();
        expect(SAMPLE_EMPLOYEES[emp.code]?.name).toBe(emp.name);
      }
    });

    it('generates sample punches where Total equals sum of all 4 categories', () => {
      const sample = generateSamplePunchLogs('2026-11-17');
      expect(sample.length).toBeGreaterThanOrEqual(25);

      const accepted = sample.filter((p) => p.validationStatus === 'valid' && p.processingState === 'processed').length;
      const flagged = sample.filter((p) => p.validationStatus === 'needs_review').length;
      const rejected = sample.filter((p) => p.validationStatus === 'duplicate' || p.validationStatus === 'invalid').length;
      const failed = sample.filter((p) => p.processingState === 'failed').length;

      expect(accepted + flagged + rejected + failed).toBe(sample.length);
      expect(accepted).toBeGreaterThan(0);
      expect(flagged).toBeGreaterThan(0);
      expect(rejected).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
    });

    it('includes overnight shift punches assigned to the reference workday', () => {
      const sample = generateSamplePunchLogs('2026-11-17');
      const sanjayPunches = sample.filter((p) => p.employeeCode === 'BZ1045');
      expect(sanjayPunches.length).toBe(4);

      // All 4 have workday: 2026-11-17
      expect(sanjayPunches.every((p) => p.workday === '2026-11-17')).toBe(true);

      // But subsequent punches occur past midnight on 2026-11-18
      const nextDayPunches = sanjayPunches.filter((p) => p.punchTime.startsWith('2026-11-18'));
      expect(nextDayPunches.length).toBe(3);
    });
  });

  describe('View Filter Functions', () => {
    it('correctly filters First In punches per employee per workday', () => {
      const sample = generateSamplePunchLogs('2026-11-17');
      const firstIns = filterFirstInPunches(sample);

      // Each employee should appear at most once per workday
      const seen = new Set<string>();
      for (const p of firstIns) {
        const key = `${p.employeeCode}__${p.workday}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(p.punchType).toBe('in');
      }
    });

    it('correctly filters Last Out punches per employee per workday', () => {
      const sample = generateSamplePunchLogs('2026-11-17');
      const lastOuts = filterLastOutPunches(sample);

      const seen = new Set<string>();
      for (const p of lastOuts) {
        const key = `${p.employeeCode}__${p.workday}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(p.punchType).toBe('out');
      }
    });

    it('correctly filters Late Punches', () => {
      const sample = generateSamplePunchLogs('2026-11-17');
      const latePunches = filterLatePunches(sample);

      expect(latePunches.length).toBeGreaterThan(0);
      for (const p of latePunches) {
        const remark = (p.validationReason || p.notes || '').toLowerCase();
        expect(remark.includes('late')).toBe(true);
      }
    });

    it('correctly filters Exceptions (Flagged, Rejected, Failed)', () => {
      const sample = generateSamplePunchLogs('2026-11-17');
      const exceptions = filterExceptionPunches(sample);

      expect(exceptions.length).toBeGreaterThan(0);
      for (const p of exceptions) {
        const isException =
          p.validationStatus === 'needs_review' ||
          p.validationStatus === 'duplicate' ||
          p.validationStatus === 'invalid' ||
          p.processingState === 'failed';
        expect(isException).toBe(true);
      }
    });
  });
});
