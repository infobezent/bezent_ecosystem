import { appConfig } from '../../app/config/env';
import { authorizedFetch } from './session';

/**
 * Typed client for the platform authentication & access API (ADR-017 / ADR-018).
 * Response shapes mirror apps/api/src/platform/{auth,access}/types.
 */

export type ModuleCode = 'hrms' | 'crm' | 'project_management';
export type WorkspaceId = 'super_admin' | 'tenant_admin' | 'company_admin' | 'hrms' | 'ess';

export interface AccessRoleSummary {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  moduleCode: ModuleCode | null;
}

/** Server-resolved access of the user in ONE company. Never merged across companies. */
export interface CompanyAccess {
  tenantId: string;
  tenantName: string | null;
  companyId: string;
  companyName: string;
  companyCode: string;
  isMember: boolean;
  isPlatformOversight: boolean;
  isTenantAdmin?: boolean;
  roles: AccessRoleSummary[];
  permissions: string[];
  enabledModules: ModuleCode[];
  essEligible: boolean;
  employeeId: string | null;
  workspaces: WorkspaceId[];
}

export interface AccessOverview {
  user: { id: string; email: string; firstName: string; lastName: string; isSuperAdmin: boolean };
  platformWorkspaces: WorkspaceId[];
  isTenantAdmin?: boolean;
  defaultTenantId?: string | null;
  companies: CompanyAccess[];
}

export interface OtpChallenge {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface SignInResult {
  token: string;
  expiresAt: string;
  defaultDestination: string;
  access: AccessOverview;
}

/** An API error with its stable machine-readable code (e.g. OTP_LOCKED). */
export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

const PLATFORM = `${appConfig.apiBaseUrl}/platform`;

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await authorizedFetch(`${PLATFORM}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) },
    });
  } catch {
    throw new AuthApiError(
      'BEZENT could not be reached. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  }
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    throw new AuthApiError(
      body.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      body.error?.code ?? 'REQUEST_FAILED',
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }
  return body.data as T;
}

export const authApi = {
  /** Sends a sign-in code. The response is identical whether or not the email has an account. */
  requestOtp(email: string): Promise<OtpChallenge> {
    return call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email }) });
  },

  /** Exchanges a code for a session plus the user's resolved access. */
  verifyOtp(challengeId: string, code: string): Promise<SignInResult> {
    return call('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId, code }),
    });
  },

  /** The signed-in user's companies and workspaces, re-resolved by the server. */
  getAccess(): Promise<AccessOverview> {
    return call('/access');
  },

  logout(): Promise<unknown> {
    return call('/auth/logout', { method: 'POST' });
  },
};
