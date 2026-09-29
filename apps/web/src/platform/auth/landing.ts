import type { AccessOverview } from './authApi';

/**
 * Where a signed-in user lands when no destination was requested. Mirrors the
 * server's rule (AuthService.issueSession) for already-restored sessions. This
 * is navigation only — every workspace API authorizes each request itself.
 */
export function landingPath(access: AccessOverview): string {
  if (access.user.isSuperAdmin) return '/super-admin';
  const workspaces = new Set(access.companies.flatMap((c) => c.workspaces));
  if (workspaces.has('company_admin')) return '/company-admin';
  if (workspaces.has('hrms')) return '/hrms/dashboard';
  if (workspaces.has('ess')) return '/ess';
  return '/hrms/dashboard';
}

/** Accepts only same-origin, absolute in-app paths (no protocol-relative or external URLs). */
export function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return null;
  if (next === '/login' || next.startsWith('/login?')) return null;
  return next;
}
