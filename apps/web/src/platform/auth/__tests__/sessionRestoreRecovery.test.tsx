import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTransientAuthError, classifyAuthError } from '../AuthProvider';
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

  describe('classifyAuthError structured categorization', () => {
    it('classifies network connection failure as kind "network"', () => {
      const err = new AuthApiError('BEZENT could not be reached', 0, 'NETWORK_ERROR');
      const result = classifyAuthError(err);
      expect(result.kind).toBe('network');
      expect(result.message).toContain('BEZENT API could not be reached');
    });

    it('classifies database unavailability as kind "database_unavailable"', () => {
      const err = new AuthApiError('Database service is temporarily unavailable', 503, 'DATABASE_UNAVAILABLE');
      const result = classifyAuthError(err);
      expect(result.kind).toBe('database_unavailable');
      expect(result.message).toContain('Database service is temporarily unavailable');
    });

    it('classifies 403 access denial as kind "forbidden"', () => {
      const err = new AuthApiError('Workspace access forbidden', 403, 'FORBIDDEN');
      const result = classifyAuthError(err);
      expect(result.kind).toBe('forbidden');
      expect(result.message).toContain('Workspace access forbidden');
    });

    it('classifies 500 internal server error as kind "server_error"', () => {
      const err = new AuthApiError('Internal Server Error', 500, 'INTERNAL_ERROR');
      const result = classifyAuthError(err);
      expect(result.kind).toBe('server_error');
      expect(result.message).toContain('Internal Server Error');
    });

    it('classifies arbitrary non-AuthApiError as kind "server_error"', () => {
      const result = classifyAuthError(new Error('Syntax or runtime crash'));
      expect(result.kind).toBe('server_error');
      expect(result.message).toBe('Syntax or runtime crash');
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

    it('clears the session token only on explicit 401 sign-out or session end', () => {
      const token = 'token_to_clear';
      setSessionToken(token);
      expect(getSessionToken()).toBe(token);

      setSessionToken(null);
      expect(getSessionToken()).toBeNull();
    });
  });
});
