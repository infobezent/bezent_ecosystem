import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EmployeeAdministrationApiError,
  applyEmployeeAction,
  cancelEmployeeAction,
  createEmployeeAction,
  fetchEmployeeAction,
  fetchEmployeeActions,
  fetchEmployees,
  fetchOrganizationMasters,
} from '../api/employeeAdministrationApi';
import { ACTION_TABS, buildCreatePayload, EMPTY_ACTION_FORM } from '../model/actionCatalog';

interface CapturedCall {
  url: string;
  init?: RequestInit;
}

function mockFetch(status: number, body: unknown) {
  const calls: CapturedCall[] = [];
  globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  });
  return calls;
}

describe('Employee Administration API client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('lists actions from the real endpoint with tab category, search, and paging', async () => {
    const calls = mockFetch(200, {
      data: [],
      pagination: { page: 2, pageSize: 25, totalItems: 30, totalPages: 2 },
      counts: {
        all: 30,
        job_changes: 10,
        probation: 5,
        transfer: 5,
        employment_status: 5,
        separation: 5,
      },
    });

    const res = await fetchEmployeeActions({
      category: 'separation',
      search: 'Kavya',
      page: 2,
      pageSize: 25,
    });

    expect(calls[0]!.url).toContain('/hrms/employee-actions?');
    expect(calls[0]!.url).toContain('category=separation');
    expect(calls[0]!.url).toContain('search=Kavya');
    expect(calls[0]!.url).toContain('page=2');
    expect(res.counts.separation).toBe(5);
  });

  it('omits the category for the All Actions tab', async () => {
    const calls = mockFetch(200, { data: [], pagination: {}, counts: {} });
    await fetchEmployeeActions({});
    expect(calls[0]!.url.endsWith('/hrms/employee-actions')).toBe(true);
  });

  it('tabs map to the backend action categories', () => {
    expect(ACTION_TABS.map((tab) => tab.id)).toEqual([
      'all',
      'job_changes',
      'probation',
      'transfer',
      'employment_status',
      'separation',
    ]);
  });

  it('submits a new action to the real create endpoint', async () => {
    const calls = mockFetch(201, { data: { id: 'ea_1', employeeName: 'Kavya Iyer' } });

    const payload = buildCreatePayload({
      ...EMPTY_ACTION_FORM,
      employeeId: 'emp_3',
      actionType: 'department_change',
      effectiveDate: '2026-10-01',
      reason: 'Team move',
      values: { departmentId: 'dept_prod_01', lastWorkingDate: '2026-12-01' },
    });
    const created = await createEmployeeAction(payload);

    expect(created.id).toBe('ea_1');
    expect(calls[0]!.url).toMatch(/\/hrms\/employee-actions$/);
    expect(calls[0]!.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({
      employeeId: 'emp_3',
      actionType: 'department_change',
      effectiveDate: '2026-10-01',
      reason: 'Team move',
      // Values that do not belong to the action type are never sent.
      values: { departmentId: 'dept_prod_01' },
    });
  });

  it('separation payloads take the effective date from the last working date on the server', () => {
    const payload = buildCreatePayload({
      ...EMPTY_ACTION_FORM,
      employeeId: 'emp_3',
      actionType: 'resignation',
      effectiveDate: '2026-10-01',
      reason: 'Relocating',
      values: { requestDate: '2026-10-01', lastWorkingDate: '2026-10-31' },
    });
    expect(payload).not.toHaveProperty('effectiveDate');
    expect(payload.values).toEqual({ requestDate: '2026-10-01', lastWorkingDate: '2026-10-31' });
  });

  it('applies and cancels with the optimistic version', async () => {
    let calls = mockFetch(200, { data: { id: 'ea_1', status: 'applied' } });
    await applyEmployeeAction('ea_1', 3);
    expect(calls[0]!.url).toMatch(/\/hrms\/employee-actions\/ea_1\/apply$/);
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ version: 3 });

    calls = mockFetch(200, { data: { id: 'ea_1', status: 'cancelled' } });
    await cancelEmployeeAction('ea_1', 1, 'Duplicate');
    expect(calls[0]!.url).toMatch(/\/hrms\/employee-actions\/ea_1\/cancel$/);
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ version: 1, reason: 'Duplicate' });
  });

  it('loads action detail and employee selection data from real endpoints', async () => {
    let calls = mockFetch(200, { data: { id: 'ea_9', history: [] } });
    expect((await fetchEmployeeAction('ea_9')).id).toBe('ea_9');
    expect(calls[0]!.url).toMatch(/\/hrms\/employee-actions\/ea_9$/);

    calls = mockFetch(200, { data: [], pagination: {} });
    await fetchEmployees({ employmentStatus: 'probation', pageSize: 100 });
    expect(calls[0]!.url).toContain('/hrms/employees?');
    expect(calls[0]!.url).toContain('employmentStatus=probation');
  });

  it('surfaces server validation errors instead of faking success', async () => {
    mockFetch(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for employee action',
        details: { 'values.departmentId': 'Department is required' },
      },
    });

    const error = await createEmployeeAction({
      employeeId: 'emp_3',
      actionType: 'department_change',
      effectiveDate: '2026-10-01',
      reason: 'x',
      values: {},
    }).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(EmployeeAdministrationApiError);
    expect((error as EmployeeAdministrationApiError).status).toBe(400);
    expect((error as EmployeeAdministrationApiError).details).toEqual({
      'values.departmentId': 'Department is required',
    });
  });

  it('does not fall back to mock organization masters when the API fails', async () => {
    mockFetch(500, {
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Database service is unavailable' },
    });
    await expect(fetchOrganizationMasters()).rejects.toThrow('Database service is unavailable');
  });
});
