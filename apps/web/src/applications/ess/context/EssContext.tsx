import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  essApi,
  type EssDashboardData,
  type EssEmployeeSummary,
  ACTIVE_COMPANY_KEY,
} from '../api/essApi';
import { useSuperAdminAuth } from '../../super-admin/context/SuperAdminAuthContext';

interface EssContextValue {
  employee: EssEmployeeSummary | null;
  dashboard: EssDashboardData | null;
  activeCompanyId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  isEssEligible: boolean;
}

const EssContext = createContext<EssContextValue | null>(null);

export function EssProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSuperAdminAuth();
  const [dashboard, setDashboard] = useState<EssDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCompanyId] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_COMPANY_KEY) : null,
  );

  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      setDashboard(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await essApi.getDashboard();
      setDashboard(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load ESS workspace';
      setError(msg);
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return (
    <EssContext.Provider
      value={{
        employee: dashboard?.employee ?? null,
        dashboard,
        activeCompanyId,
        isLoading,
        error,
        refreshDashboard,
        isEssEligible: !!dashboard?.employee,
      }}
    >
      {children}
    </EssContext.Provider>
  );
}

export function useEss(): EssContextValue {
  const ctx = useContext(EssContext);
  if (!ctx) {
    throw new Error('useEss must be used within EssProvider');
  }
  return ctx;
}
