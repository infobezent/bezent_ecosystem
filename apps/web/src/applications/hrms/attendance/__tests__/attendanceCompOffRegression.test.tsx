import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceCompOffPage } from '../pages/AttendanceCompOffPage';
import * as compOffApi from '../api/attendanceCompOffApi';

describe('BEZENT HRMS — Attendance Comp-Off V1.0 Regression & Runtime Defense Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Comp-Off page header and tabs without RouteErrorBoundary crash', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceCompOffPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Comp-Off Management');
    expect(html).toContain('Overview');
    expect(html).toContain('Earning Requests');
    expect(html).toContain('Approval Queue');
    expect(html).toContain('Approved Earnings');
    expect(html).toContain('Credit Handoff Status');
    expect(html).toContain('Policies');
    expect(html).toContain('Audit History');
  });

  it('Issue 1 Regression: safely renders Earning Requests when API returns empty items without length crash', () => {
    vi.spyOn(compOffApi, 'fetchCompOffRequests').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    // Ensure rendering with empty collection does not throw TypeError: Cannot read properties of undefined (reading 'length')
    expect(() => {
      renderToStaticMarkup(
        <MemoryRouter>
          <AttendanceCompOffPage />
        </MemoryRouter>,
      );
    }).not.toThrow();
  });

  it('Issue 1 Regression: handles normalized or unnormalized API payload shapes safely in API adapter', async () => {
    // 1. Simulating backend returning raw array in body.data (the original bug)
    const mockRawArrayResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'cor_01',
            requestNumber: 'CO-20261013-0001',
            employeeId: 'emp_01',
            employeeName: 'Aarav Patel',
            employeeCode: 'EMP-001',
            workDate: '2026-10-10',
            dayType: 'weekly_off',
            qualifyingWorkedMinutes: 480,
            scheduledMinutes: 0,
            requestedCreditDays: 1,
            approvedCreditDays: 0,
            status: 'submitted',
            reason: 'Weekend support',
            version: 1,
          },
        ],
        pagination: { total: 1, page: 1, limit: 20 },
      }),
    };

    const globalFetch = vi.fn().mockResolvedValue(mockRawArrayResponse);
    vi.stubGlobal('fetch', globalFetch);

    const result = await compOffApi.fetchCompOffRequests();
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.items[0]?.requestNumber).toBe('CO-20261013-0001');

    vi.unstubAllGlobals();
  });

  it('displays genuine API error in Alert banner rather than silently converting to empty array', async () => {
    const errorResponse = {
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { message: 'Access denied: You do not have permission to access Comp-Off resources (403 Forbidden).' },
      }),
    };

    const globalFetch = vi.fn().mockResolvedValue(errorResponse);
    vi.stubGlobal('fetch', globalFetch);

    await expect(compOffApi.fetchCompOffRequests()).rejects.toThrow(
      'Access denied: You do not have permission to access Comp-Off resources (403 Forbidden).',
    );

    vi.unstubAllGlobals();
  });

  it('safely normalizes entitlements and handoffs paged collections', async () => {
    const mockEntitlementsResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'coe_01',
            employeeId: 'emp_01',
            employeeName: 'Aarav Patel',
            employeeCode: 'EMP-001',
            earnedDays: 1,
            earnedMinutes: 480,
            workDate: '2026-10-10',
            validFrom: '2026-10-10',
            expiresAt: '2026-12-09',
            status: 'active',
          },
        ],
        pagination: { total: 1, page: 1, limit: 20 },
      }),
    };

    const globalFetch = vi.fn().mockResolvedValue(mockEntitlementsResponse);
    vi.stubGlobal('fetch', globalFetch);

    const entitlements = await compOffApi.fetchCompOffEntitlements();
    expect(entitlements.items).toHaveLength(1);
    expect(entitlements.total).toBe(1);
    expect(entitlements.items[0]?.id).toBe('coe_01');

    vi.unstubAllGlobals();
  });
});
