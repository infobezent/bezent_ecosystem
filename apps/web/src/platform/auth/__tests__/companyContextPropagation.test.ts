import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ACTIVE_COMPANY_KEY,
  authorizedFetch,
  getActiveCompanyId,
  setActiveCompanyId,
  setSessionToken,
} from '../session';

const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};
const windowTarget = new EventTarget();

describe('Active Company Context Propagation (HRMS & Platform)', () => {
  beforeEach(() => {
    store.clear();
    setSessionToken(null);
    setActiveCompanyId(null);
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', windowTarget);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('automatically sets active company context and injects X-Company-Id on authorizedFetch', async () => {
    setSessionToken('mock_hr_token');
    setActiveCompanyId('comp_demo_01');

    expect(getActiveCompanyId()).toBe('comp_demo_01');
    expect(localStorageMock.getItem(ACTIVE_COMPANY_KEY)).toBe('comp_demo_01');

    const fetchSpy = vi.fn().mockImplementation((_url: string, _init?: RequestInit) => {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchSpy);

    // Call authorizedFetch (as used by fetchEmployees, fetchOrganizationMasters, etc.)
    await authorizedFetch('http://localhost:4000/api/v1/hrms/employees');

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:4000/api/v1/hrms/employees', {
      headers: {
        Authorization: 'Bearer mock_hr_token',
        'X-Company-Id': 'comp_demo_01',
      },
    });
  });

  it('preserves existing X-Company-Id if caller provides an explicit override', async () => {
    setSessionToken('mock_hr_token');
    setActiveCompanyId('comp_demo_01');

    const fetchSpy = vi.fn().mockImplementation((_url: string, _init?: RequestInit) => {
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchSpy);

    await authorizedFetch('http://localhost:4000/api/v1/hrms/employees', {
      headers: { 'X-Company-Id': 'comp_custom_override' },
    });

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:4000/api/v1/hrms/employees', {
      headers: {
        Authorization: 'Bearer mock_hr_token',
        'X-Company-Id': 'comp_custom_override',
      },
    });
  });
});
