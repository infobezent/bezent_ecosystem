/**
 * BEZENT platform session (ADR-018).
 *
 * One bearer token per browser session, shared by every workspace, plus the
 * user's currently selected company. Both are only claims: the API re-validates
 * the session, membership, permissions and entitlements on every request.
 *
 * Storage keys are shared with the Super Admin, Company Admin and ESS API
 * clients so every workspace uses the same session without signing in again.
 */

export const SESSION_TOKEN_KEY = 'bezent_platform_token';
export const ACTIVE_COMPANY_KEY = 'bezent_active_company_id';

/** Fired when the API rejects the stored session (expired, revoked, account suspended). */
export const SESSION_ENDED_EVENT = 'bezent:session-ended';

let inMemoryToken: string | null = null;
let inMemoryCompanyId: string | null = null;

function read(key: string): string | null {
  try {
    const val = typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    if (val !== null) return val;
    return key === SESSION_TOKEN_KEY ? inMemoryToken : inMemoryCompanyId;
  } catch {
    return key === SESSION_TOKEN_KEY ? inMemoryToken : inMemoryCompanyId;
  }
}

function write(key: string, value: string | null): void {
  if (key === SESSION_TOKEN_KEY) inMemoryToken = value;
  if (key === ACTIVE_COMPANY_KEY) inMemoryCompanyId = value;
  try {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, blocked): the session lives in memory only.
  }
}

export function getSessionToken(): string | null {
  return read(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string | null): void {
  write(SESSION_TOKEN_KEY, token);
}

export function getActiveCompanyId(): string | null {
  return read(ACTIVE_COMPANY_KEY);
}

export function setActiveCompanyId(companyId: string | null): void {
  write(ACTIVE_COMPANY_KEY, companyId);
}

function toRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

/**
 * `fetch` for BEZENT APIs: adds the session token and the selected company
 * (unless the caller supplies them) and reports a rejected session so the app
 * can return to sign-in. Never swallows errors and never fabricates responses.
 */
export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = toRecord(init.headers);
  const token = getSessionToken();
  if (token && !hasHeader(headers, 'Authorization')) {
    headers.Authorization = `Bearer ${token}`;
  }
  const companyId = getActiveCompanyId();
  if (companyId && !hasHeader(headers, 'X-Company-Id')) {
    headers['X-Company-Id'] = companyId;
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && token && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT));
  }
  return response;
}
