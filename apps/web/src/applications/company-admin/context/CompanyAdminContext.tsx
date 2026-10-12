import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { companyAdminApi, type AuthorizedCompanySummary } from '../api/companyAdminApi';
import { getActiveCompanyId, useAuth } from '../../../platform/auth';

interface CompanyAdminContextValue {
  activeCompanyId: string | null;
  activeCompany: AuthorizedCompanySummary | null;
  authorizedCompanies: AuthorizedCompanySummary[];
  isLoadingCompanies: boolean;
  companyError: string | null;
  switchCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
  isCompanyAdmin: boolean;
}

export const CompanyAdminContext = createContext<CompanyAdminContextValue | null>(null);

export function CompanyAdminProvider({ children }: { children: ReactNode }) {
  const { status, access, activeCompany: authActiveCompany, selectCompany } = useAuth();
  const isSuperAdmin = Boolean(access?.user.isSuperAdmin);
  const isAuthenticated = status === 'authenticated';
  const hasCompanyAdminAccess =
    isSuperAdmin || Boolean(access?.companies.some((c) => c.workspaces.includes('company_admin')));

  const [authorizedCompanies, setAuthorizedCompanies] = useState<AuthorizedCompanySummary[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState<boolean>(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const refreshCompanies = useCallback(async () => {
    if (!isAuthenticated || !hasCompanyAdminAccess) {
      setAuthorizedCompanies([]);
      setIsLoadingCompanies(false);
      return;
    }

    setIsLoadingCompanies(true);
    setCompanyError(null);

    try {
      const companies = await companyAdminApi.getAuthorizedCompanies();
      setAuthorizedCompanies(companies);

      if (companies.length > 0) {
        const currentActive = getActiveCompanyId();
        const exists = companies.some((c) => c.id === currentActive);
        if (!currentActive || (!exists && isSuperAdmin)) {
          const firstId = companies[0]!.id;
          selectCompany(firstId);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load authorized companies';
      setCompanyError(msg);
      setAuthorizedCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [isAuthenticated, hasCompanyAdminAccess, isSuperAdmin, selectCompany]);

  useEffect(() => {
    if (isAuthenticated && hasCompanyAdminAccess) {
      void refreshCompanies();
    } else {
      setAuthorizedCompanies([]);
      setIsLoadingCompanies(false);
    }
  }, [isAuthenticated, hasCompanyAdminAccess, refreshCompanies]);

  const switchCompany = useCallback(
    (companyId: string) => {
      selectCompany(companyId);
    },
    [selectCompany],
  );

  const activeCompanyId = authActiveCompany?.companyId ?? getActiveCompanyId();
  const activeCompany = authorizedCompanies.find((c) => c.id === activeCompanyId) || null;
  const isCompanyAdmin = Boolean(
    isSuperAdmin ||
    (activeCompany &&
      (activeCompany.role === 'company_admin' ||
        activeCompany.role === 'tenant_admin' ||
        activeCompany.role === 'super_admin' ||
        activeCompany.isTenantAdmin ||
        activeCompany.authoritySource === 'tenant_admin' ||
        activeCompany.authoritySource === 'dual')),
  );

  const value: CompanyAdminContextValue = {
    activeCompanyId,
    activeCompany,
    authorizedCompanies,
    isLoadingCompanies,
    companyError,
    switchCompany,
    refreshCompanies,
    isCompanyAdmin,
  };

  return <CompanyAdminContext.Provider value={value}>{children}</CompanyAdminContext.Provider>;
}

export function useCompanyAdmin(): CompanyAdminContextValue {
  const context = useContext(CompanyAdminContext);
  if (!context) {
    throw new Error('useCompanyAdmin must be used within a CompanyAdminProvider');
  }
  return context;
}
