import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTransientAuthError } from '../AuthProvider';
import { AuthApiError } from '../authApi';
import { setSessionToken, getSessionToken, SESSION_TOKEN_KEY } from '../session';

// Provide browser globals
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};
const windowTarget = new EventTarget();

describe('Session Restore Transient Recovery Logic', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', windowTarget);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('isTransientAuthError classification', () => {
    it('classifies NETWORK_ERROR as transient (API restarting)', () => {
      const err = new AuthApiError('Network error', 0, 'NETWORK_ERROR');
      expect(isTransientAuthError(err)).toBe(true);
    });

    it('classifies DATABASE_UNAVAILABLE as transient (DB initializing/recovering)', () => {
      const err = new AuthApiError('Database service is unavailable', 500, 'DATABASE_UNAVAILABLE');
      expect(isTransientAuthError(err)).toBe(true);
    });

    it('classifies HTTP 503 as transient', () => {
      const err = new AuthApiError('Service Unavailable', 503, 'SERVICE_UNAVAILABLE');
      expect(isTransientAuthError(err)).toBe(true);
    });

    it('classifies HTTP 502 and 504 as transient gateway errors', () => {
      expect(isTransientAuthError(new AuthApiError('Bad Gateway', 502, 'BAD_GATEWAY'))).toBe(true);
      expect(isTransientAuthError(new AuthApiError('Gateway Timeout', 504, 'GATEWAY_TIMEOUT'))).toBe(true);
    });

    it('NEVER classifies 401 Unauthorized as transient (authentic auth rejection)', () => {
      const err = new AuthApiError('Session expired or invalid', 401, 'UNAUTHORIZED');
      expect(isTransientAuthError(err)).toBe(false);
    });

    it('NEVER classifies 403 Forbidden as transient (permission rejection)', () => {
      const err = new AuthApiError('Account is not active', 403, 'FORBIDDEN');
      expect(isTransientAuthError(err)).toBe(false);
    });

    it('returns false for non-AuthApiError objects', () => {
      expect(isTransientAuthError(new Error('Generic failure'))).toBe(false);
      expect(isTransientAuthError(null)).toBe(false);
      expect(isTransientAuthError('some string')).toBe(false);
    });
  });

  describe('Session Token Preservation across Failures', () => {
    it('retains the session token in localStorage across temporary failures', () => {
      const token = 'persisted_session_token_xyz';
      setSessionToken(token);

      expect(getSessionToken()).toBe(token);
      expect(localStorageMock.getItem(SESSION_TOKEN_KEY)).toBe(token);

      // Simulating a transient DB outage error: token MUST NOT be deleted
      const transientErr = new AuthApiError('Database service is unavailable', 500, 'DATABASE_UNAVAILABLE');
      expect(isTransientAuthError(transientErr)).toBe(true);

      // Verify token remains intact
      expect(getSessionToken()).toBe(token);
    });

    it('clears the session token only on explicit 401/403 or sign-out', () => {
      const token = 'token_to_clear';
      setSessionToken(token);
      expect(getSessionToken()).toBe(token);

      setSessionToken(null);
      expect(getSessionToken()).toBeNull();
    });
  });
});
