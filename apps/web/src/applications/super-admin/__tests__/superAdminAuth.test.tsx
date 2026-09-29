import { describe, it, expect, vi, beforeEach } from 'vitest';
import { superAdminApi } from '../api/superAdminApi';
import { appConfig } from '../../../app/config/env';

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

  it('constructs login URL using appConfig.apiBaseUrl', async () => {
    const mockResponse = {
      data: {
        token: 'test_token_123',
        user: {
          id: 'usr_sa_01',
          email: 'superadmin@bezent.com',
          firstName: 'Platform',
          lastName: 'Superadmin',
          status: 'active',
          isSuperAdmin: true,
        },
        expiresAt: '2026-09-30T10:00:00.000Z',
        defaultDestination: '/super-admin',
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await superAdminApi.login({
      email: 'superadmin@bezent.com',
      password: 'testPassword',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${appConfig.apiBaseUrl}/platform/auth/login`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result.token).toBe('test_token_123');
    expect(result.user.isSuperAdmin).toBe(true);
  });

  it('parses error response messages cleanly when login fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      }),
    } as Response);

    await expect(
      superAdminApi.login({
        email: 'superadmin@bezent.com',
        password: 'wrong',
      }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('includes Authorization header with Bearer token for authenticated requests', async () => {
    mockLocalStorage.setItem('bezent_platform_token', 'valid_session_token_xyz');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
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
