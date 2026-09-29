import { useAuth } from '../../../platform/auth';

interface SuperAdminAuthValue {
  user: { id: string; email: string; firstName: string; lastName: string; isSuperAdmin: boolean } | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Super Admin view of the ONE platform session (ADR-018). There is no separate
 * Super Admin sign-in: everyone signs in on the shared Email OTP page, and the
 * Super Admin workspace is available when the server reports platform access.
 * Kept as an adapter so existing workspace code reads the shared session.
 */
export function useSuperAdminAuth(): SuperAdminAuthValue {
  const { status, access, signOut, refreshAccess } = useAuth();
  const user = access?.user ?? null;
  return {
    user,
    isAuthenticated: status === 'authenticated' && user !== null,
    isSuperAdmin: Boolean(user?.isSuperAdmin),
    isLoading: status === 'loading',
    logout: signOut,
    refresh: refreshAccess,
  };
}
