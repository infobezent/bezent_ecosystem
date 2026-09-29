import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi, AuthApiError } from '../authApi';
import { authorizedFetch, SESSION_ENDED_EVENT, SESSION_TOKEN_KEY, ACTIVE_COMPANY_KEY } from '../session';
import { landingPath, safeNextPath } from '../landing';
import { appConfig } from '../../../app/config/env';

// Web tests run in Node: provide the browser globals the session store uses.
const store = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};
const windowTarget = new EventTarget();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', windowTarget);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as Response;
}

describe('platform auth — session-aware fetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the session token and the selected company', async () => {
    localStorage.setItem(SESSION_TOKEN_KEY, 'tok');
    localStorage.setItem(ACTIVE_COMPANY_KEY, 'comp_1');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, {}));

    await authorizedFetch('/x', { headers: { 'Content-Type': 'application/json' } });

    expect(fetchSpy).toHaveBeenCalledWith('/x', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok',
        'X-Company-Id': 'comp_1',
      },
    });
  });

  it('never overrides headers the caller set explicitly', async () => {
    localStorage.setItem(SESSION_TOKEN_KEY, 'tok');
    localStorage.setItem(ACTIVE_COMPANY_KEY, 'comp_1');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, {}));

    await authorizedFetch('/x', { headers: { 'x-company-id': 'comp_2' } });

    const headers = fetchSpy.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['x-company-id']).toBe('comp_2');
    expect(headers['X-Company-Id']).toBeUndefined();
  });

  it('signals the app when the API rejects the session', async () => {
    localStorage.setItem(SESSION_TOKEN_KEY, 'tok');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, {}));
    const ended = vi.fn();
    windowTarget.addEventListener(SESSION_ENDED_EVENT, ended);

    await authorizedFetch('/x');

    windowTarget.removeEventListener(SESSION_ENDED_EVENT, ended);
    expect(ended).toHaveBeenCalledTimes(1);
  });
});

describe('platform auth — Email OTP client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests a code and verifies it on the platform endpoints', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(202, {
          data: { challengeId: 'otp_1', expiresAt: 'x', resendAvailableAt: 'y' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { token: 't', defaultDestination: '/ess', access: {} } }),
      );

    const challenge = await authApi.requestOtp('a@b.co');
    const result = await authApi.verifyOtp(challenge.challengeId, '123456');

    expect(fetchSpy.mock.calls[0]![0]).toBe(`${appConfig.apiBaseUrl}/platform/auth/otp/request`);
    expect(JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string)).toEqual({ email: 'a@b.co' });
    expect(fetchSpy.mock.calls[1]![0]).toBe(`${appConfig.apiBaseUrl}/platform/auth/otp/verify`);
    expect(JSON.parse(fetchSpy.mock.calls[1]![1]!.body as string)).toEqual({
      challengeId: 'otp_1',
      code: '123456',
    });
    expect(result.defaultDestination).toBe('/ess');
  });

  it('surfaces the stable error code and Retry-After', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        429,
        { error: { code: 'OTP_RATE_LIMITED', message: 'Please wait' } },
        { 'Retry-After': '42' },
      ),
    );

    const error = await authApi.requestOtp('a@b.co').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({ status: 429, code: 'OTP_RATE_LIMITED', retryAfterSeconds: 42 });
  });

  it('reports an unreachable API as a network error, never as success', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(authApi.getAccess()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('platform auth — navigation helpers', () => {
  const access = (over: Partial<Parameters<typeof landingPath>[0]>) => ({
    user: { id: 'u', email: 'e', firstName: 'f', lastName: 'l', isSuperAdmin: false },
    platformWorkspaces: [],
    companies: [],
    ...over,
  });
  const company = (workspaces: string[]) =>
    ({ workspaces }) as unknown as Parameters<typeof landingPath>[0]['companies'][number];

  it('lands each user on a workspace they are authorized for', () => {
    expect(
      landingPath(access({ user: { ...access({}).user, isSuperAdmin: true } })),
    ).toBe('/super-admin');
    expect(landingPath(access({ companies: [company(['hrms', 'ess'])] }))).toBe('/hrms/dashboard');
    expect(landingPath(access({ companies: [company(['ess'])] }))).toBe('/ess');
    expect(landingPath(access({ companies: [company(['company_admin', 'hrms'])] }))).toBe(
      '/company-admin',
    );
  });

  it('only follows safe in-app return paths', () => {
    expect(safeNextPath('/hrms/employees?x=1')).toBe('/hrms/employees?x=1');
    for (const unsafe of ['https://evil.example', '//evil.example', '/\\evil', 'relative', '/login', null]) {
      expect(safeNextPath(unsafe)).toBeNull();
    }
  });
});
