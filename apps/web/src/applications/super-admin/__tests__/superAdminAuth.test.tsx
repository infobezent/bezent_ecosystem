import { describe, it, expect, vi, beforeEach } from 'vitest';
import { superAdminApi } from '../api/superAdminApi';
import { appConfig } from '../../../app/config/env';

/**
 * The Super Admin client uses the ONE platform session (ADR-018). Signing in
 * is covered by the shared Email OTP client (platform/auth); there is no
 * Super Admin password login.
 */
describe('Super Admin API Authentication Client', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLocalStorage.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  it('offers no password login', () => {
    expect('login' in superAdminApi).toBe(false);
  });

  it('includes Authorization header with Bearer token for authenticated requests', async () => {
    mockLocalStorage.setItem('bezent_platform_token', 'valid_session_token_xyz');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [], total: 0 } }),
    } as Response);

    await superAdminApi.listTenants();

    expect(fetchSpy).toHaveBeenCalledWith(
      `${appConfig.apiBaseUrl}/platform/tenants`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid_session_token_xyz',
        }),
      }),
    );
  });
});
