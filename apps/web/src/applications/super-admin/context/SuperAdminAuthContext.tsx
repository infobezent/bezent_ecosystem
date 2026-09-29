import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { superAdminApi, type PlatformUserSummary } from '../api/superAdminApi';

interface SuperAdminAuthContextValue {
  user: PlatformUserSummary | null;
  token: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | null>(null);

const TOKEN_KEY = 'bezent_platform_token';

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<PlatformUserSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await superAdminApi.getMe();
      setUser(me);
      setToken(currentToken);
    } catch {
      // Token is invalid or expired
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await superAdminApi.login(credentials);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        await superAdminApi.logout().catch(() => {});
      }
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const value: SuperAdminAuthContextValue = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isSuperAdmin: Boolean(user?.isSuperAdmin),
    isLoading,
    login,
    logout,
    refresh,
  };

  return (
    <SuperAdminAuthContext.Provider value={value}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth(): SuperAdminAuthContextValue {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return ctx;
}
