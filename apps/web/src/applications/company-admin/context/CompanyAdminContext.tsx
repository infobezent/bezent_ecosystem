import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  companyAdminApi,
  ACTIVE_COMPANY_KEY,
  type AuthorizedCompanySummary,
} from '../api/companyAdminApi';
import { useSuperAdminAuth } from '../../super-admin/context/SuperAdminAuthContext';
import { useAuth } from '../../../platform/auth';

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

const CompanyAdminContext = createContext<CompanyAdminContextValue | null>(null);

export function CompanyAdminProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isSuperAdmin } = useSuperAdminAuth();
  const { selectCompany } = useAuth();
  const [authorizedCompanies, setAuthorizedCompanies] = useState<AuthorizedCompanySummary[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_COMPANY_KEY) : null;
  });
  const [isLoadingCompanies, setIsLoadingCompanies] = useState<boolean>(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const refreshCompanies = useCallback(async () => {
    if (!isAuthenticated) {
      setAuthorizedCompanies([]);
      setActiveCompanyId(null);
      setIsLoadingCompanies(false);
      return;
    }

    setIsLoadingCompanies(true);
    setCompanyError(null);

    try {
      const companies = await companyAdminApi.getAuthorizedCompanies();
      setAuthorizedCompanies(companies);

      if (companies.length > 0) {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_COMPANY_KEY) : null;
        const exists = companies.some((c) => c.id === stored);

        if (stored && exists) {
          setActiveCompanyId(stored);
        } else {
          const first = companies[0]!.id;
          setActiveCompanyId(first);
          localStorage.setItem(ACTIVE_COMPANY_KEY, first);
        }
      } else {
        setActiveCompanyId(null);
        localStorage.removeItem(ACTIVE_COMPANY_KEY);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load authorized companies';
      setCompanyError(msg);
      setAuthorizedCompanies([]);
      setActiveCompanyId(null);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  const switchCompany = useCallback(
    (companyId: string) => {
      localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
      setActiveCompanyId(companyId);
      // Keep the shared platform session on the same company (other workspaces
      // read it); Super Admin oversight companies are not memberships.
      selectCompany(companyId);
    },
    [selectCompany],
  );

  const activeCompany = authorizedCompanies.find((c) => c.id === activeCompanyId) || null;
  const isCompanyAdmin = Boolean(
    isSuperAdmin || (activeCompany && (activeCompany.role === 'company_admin' || activeCompany.role === 'super_admin')),
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
