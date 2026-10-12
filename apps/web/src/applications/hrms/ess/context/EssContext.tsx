import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { essApi, type EssDashboardData, type EssEmployeeSummary } from '../api/essApi';
import { getActiveCompanyId, useAuth } from '../../../../platform/auth';

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
  const { status, activeCompany } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const isEssEligible = Boolean(activeCompany?.essEligible);
  const activeCompanyId = activeCompany?.companyId ?? getActiveCompanyId();

  const [dashboard, setDashboard] = useState<EssDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated || !isEssEligible) {
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
  }, [isAuthenticated, isEssEligible]);

  useEffect(() => {
    if (isAuthenticated && isEssEligible) {
      void refreshDashboard();
    } else {
      setDashboard(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, isEssEligible, refreshDashboard]);

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
