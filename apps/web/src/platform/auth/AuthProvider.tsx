import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  AuthApiError,
  type AccessOverview,
  type CompanyAccess,
  type ModuleCode,
  type SignInResult,
} from './authApi';
import {
  SESSION_ENDED_EVENT,
  getActiveCompanyId,
  getSessionToken,
  setActiveCompanyId,
  setSessionToken,
} from './session';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  /** Why the session could not be restored (status 'error'); never fake data. */
  error: string | null;
  /** Resolved access of the signed-in user; null unless authenticated. */
  access: AccessOverview | null;
  /** The selected company's access, or null (e.g. a Super Admin without companies). */
  activeCompany: CompanyAccess | null;
  /** Checks if the user holds a specific permission in the active company. */
  can: (permission: string) => boolean;
  /** Checks if the user holds at least one of the specified permissions. */
  canAny: (permissions: readonly string[]) => boolean;
  /** Checks if the user holds all of the specified permissions. */
  canAll: (permissions: readonly string[]) => boolean;
  /** Checks if the active company has access to a business application ('hrms' | 'crm' | 'pm'). */
  hasApplicationAccess: (moduleCode: ModuleCode | string) => boolean;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  /** Stores a verified sign-in and selects an authorized company. */
  completeSignIn: (result: SignInResult) => void;
  /** Selects another authorized company without signing in again. Returns false if not authorized. */
  selectCompany: (companyId: string) => boolean;
  /** Re-resolves access from the server (after role or membership changes). */
  refreshAccess: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Keeps the stored company only while the server still authorizes it. A Super
 * Admin may have selected a company for platform oversight (Company Admin
 * workspace) without being a member; that selection is kept — the API decides.
 */
function chooseCompany(access: AccessOverview, preferred: string | null): string | null {
  if (preferred && access.companies.some((c) => c.companyId === preferred)) return preferred;
  if (preferred && access.user.isSuperAdmin) return preferred;
  return access.companies[0]?.companyId ?? null;
}

/**
 * The ONE authenticated session for every BEZENT user and workspace (ADR-018).
 * Access is always re-resolved by the server; the client only remembers the
 * token and which authorized company is selected.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getSessionToken() ? 'loading' : 'anonymous',
  );
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessOverview | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() =>
    getActiveCompanyId(),
  );

  const endSession = useCallback(() => {
    setSessionToken(null);
    setActiveCompanyId(null);
    setAccess(null);
    setActiveCompanyIdState(null);
    setError(null);
    setStatus('anonymous');
  }, []);

  const applyAccess = useCallback((next: AccessOverview) => {
    const companyId = chooseCompany(next, getActiveCompanyId());
    setActiveCompanyId(companyId);
    setActiveCompanyIdState(companyId);
    setAccess(next);
    setError(null);
    setStatus('authenticated');
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!getSessionToken()) {
      endSession();
      return;
    }
    try {
      applyAccess(await authApi.getAccess());
    } catch (err) {
      if (err instanceof AuthApiError && (err.status === 401 || err.status === 403)) {
        endSession();
        return;
      }
      setError(err instanceof Error ? err.message : 'Your session could not be restored.');
      setStatus('error');
    }
  }, [applyAccess, endSession]);

  useEffect(() => {
    if (getSessionToken()) void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    const onEnded = () => endSession();
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, [endSession]);

  const completeSignIn = useCallback(
    (result: SignInResult) => {
      setSessionToken(result.token);
      applyAccess(result.access);
    },
    [applyAccess],
  );

  const selectCompany = useCallback(
    (companyId: string) => {
      const isMember = access?.companies.some((c) => c.companyId === companyId);
      if (!isMember && !access?.user.isSuperAdmin) return false;
      setActiveCompanyId(companyId);
      setActiveCompanyIdState(companyId);
      return true;
    },
    [access],
  );

  const signOut = useCallback(async () => {
    try {
      if (getSessionToken()) await authApi.logout();
    } catch {
      // The session is ended locally regardless; the server session expires on its own.
    } finally {
      endSession();
    }
  }, [endSession]);

  const activeCompany = useMemo(
    () => access?.companies.find((c) => c.companyId === activeCompanyId) ?? null,
    [access, activeCompanyId],
  );

  const heldPermissions = useMemo(() => new Set(activeCompany?.permissions ?? []), [activeCompany]);

  const enabledModules = useMemo(
    () => new Set(activeCompany?.enabledModules ?? []),
    [activeCompany],
  );

  const can = useCallback(
    (permission: string): boolean => {
      if (heldPermissions.has(permission)) return true;
      // Also check standard aliases: read/view, update/edit
      const alt = permission.endsWith('.view')
        ? permission.replace(/\.view$/, '.read')
        : permission.endsWith('.read')
          ? permission.replace(/\.read$/, '.view')
          : permission.endsWith('.edit')
            ? permission.replace(/\.edit$/, '.update')
            : permission.endsWith('.update')
              ? permission.replace(/\.update$/, '.edit')
              : null;
      return alt ? heldPermissions.has(alt) : false;
    },
    [heldPermissions],
  );

  const canAny = useCallback(
    (permissions: readonly string[]): boolean => permissions.some((p) => can(p)),
    [can],
  );

  const canAll = useCallback(
    (permissions: readonly string[]): boolean => permissions.every((p) => can(p)),
    [can],
  );

  const hasApplicationAccess = useCallback(
    (moduleCode: ModuleCode | string): boolean => enabledModules.has(moduleCode as ModuleCode),
    [enabledModules],
  );

  const isSuperAdmin = Boolean(access?.user.isSuperAdmin);
  const isCompanyAdmin = Boolean(
    activeCompany?.roles.some((r) => r.code === 'company_admin') ||
    activeCompany?.isPlatformOversight,
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      error,
      access,
      activeCompany,
      can,
      canAny,
      canAll,
      hasApplicationAccess,
      isSuperAdmin,
      isCompanyAdmin,
      completeSignIn,
      selectCompany,
      refreshAccess,
      signOut,
    }),
    [
      status,
      error,
      access,
      activeCompany,
      can,
      canAny,
      canAll,
      hasApplicationAccess,
      isSuperAdmin,
      isCompanyAdmin,
      completeSignIn,
      selectCompany,
      refreshAccess,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

/**
 * High-level authorization hook (Section 14 RBAC Foundation).
 * Exposes canonical authorization helpers: can, canAny, canAll, hasApplicationAccess.
 */
export function useAuthorization() {
  const { can, canAny, canAll, hasApplicationAccess, activeCompany, isSuperAdmin, isCompanyAdmin } =
    useAuth();

  return {
    can,
    canAny,
    canAll,
    hasApplicationAccess,
    activeCompany,
    roles: activeCompany?.roles ?? [],
    permissions: activeCompany?.permissions ?? [],
    isSuperAdmin,
    isCompanyAdmin,
  };
}
