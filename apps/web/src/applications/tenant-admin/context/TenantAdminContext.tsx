import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tenantAdminApi, TenantAdminApiError } from '../api/tenantAdminApi';
import { useAuth } from '../../../platform/auth';
import type {
  TenantAdminCapacitySummary,
  TenantAdminCompanySummary,
  TenantAdminRecordSummary,
  TenantAdminTenantSummary,
  TenantAdminUserSummary,
} from '../types/tenantAdmin.types';

export interface TenantAdminContextValue {
  // Tenant identity
  tenantId: string | null;
  tenantName: string | null;
  tenant: TenantAdminTenantSummary | null;

  // Tenant Admin record & User
  user: TenantAdminUserSummary | null;
  tenantAdmin: TenantAdminRecordSummary | null;
  isTenantAdmin: boolean;
  isSuperAdmin: boolean;

  // Companies & Capacity
  companies: TenantAdminCompanySummary[];
  capacity: TenantAdminCapacitySummary | null;
  isSingleCompany: boolean;

  // Entitlements
  entitlements: string[];

  // Selected Company (for company-scoped views)
  selectedCompanyId: string | null;
  selectedCompany: TenantAdminCompanySummary | null;
  selectCompany: (companyId: string | null) => void;

  // Loading & Error states
  isLoading: boolean;
  error: string | null;
  authorizationDenied: boolean;

  // Actions
  refreshContext: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const TenantAdminContext = createContext<TenantAdminContextValue | null>(null);

export function TenantAdminProvider({
  children,
  initialValue,
}: {
  children: ReactNode;
  initialValue?: Partial<TenantAdminContextValue>;
}) {
  const { status, access } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const isSuperAdmin = Boolean(access?.user.isSuperAdmin);

  const initialTenant: TenantAdminTenantSummary | null = access?.companies[0]
    ? {
        id: access.companies[0].tenantId,
        name: access.companies[0].tenantName || 'Tenant',
        code: null,
        status: 'active',
        contactEmail: null,
        contactPhone: null,
        createdAt: '',
      }
    : null;

  const initialCompanies: TenantAdminCompanySummary[] = (access?.companies || []).map((c) => ({
    id: c.companyId,
    name: c.companyName,
    code: c.companyCode,
    status: 'active' as const,
    country: null,
    timeZone: null,
    currency: null,
  }));

  const [tenant, setTenant] = useState<TenantAdminTenantSummary | null>(
    initialValue?.tenant !== undefined ? initialValue.tenant : initialTenant,
  );
  const [user, setUser] = useState<TenantAdminUserSummary | null>(
    initialValue?.user !== undefined
      ? initialValue.user
      : access?.user
        ? {
            id: access.user.id,
            email: access.user.email,
            firstName: access.user.firstName,
            lastName: access.user.lastName,
          }
        : null,
  );
  const [tenantAdmin, setTenantAdmin] = useState<TenantAdminRecordSummary | null>(
    initialValue?.tenantAdmin ?? null,
  );
  const [companies, setCompanies] = useState<TenantAdminCompanySummary[]>(
    initialValue?.companies ?? initialCompanies,
  );
  const [capacity, setCapacity] = useState<TenantAdminCapacitySummary | null>(
    initialValue?.capacity ?? null,
  );
  const [entitlements, setEntitlements] = useState<string[]>(
    initialValue?.entitlements ?? ['hrms'],
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    initialValue?.selectedCompanyId !== undefined
      ? initialValue.selectedCompanyId
      : initialCompanies.length === 1
        ? initialCompanies[0]?.id || null
        : null,
  );

  const [isLoading, setIsLoading] = useState<boolean>(initialValue ? false : false);
  const [error, setError] = useState<string | null>(null);
  const [authorizationDenied, setAuthorizationDenied] = useState<boolean>(false);

  const refreshContext = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAuthorizationDenied(false);

    try {
      const summary = await tenantAdminApi.getContext();
      setTenant(summary.tenant);
      setUser(summary.user);
      setTenantAdmin(summary.tenantAdmin);
      setCompanies(summary.companies || []);
      setCapacity(summary.companyCapacity ?? summary.capacity ?? null);
      if (summary.entitlements) {
        setEntitlements(summary.entitlements);
      }

      // Single-company tenant auto-selection
      if (summary.companies && summary.companies.length === 1) {
        setSelectedCompanyId((prev) => prev || summary.companies[0]?.id || null);
      } else if (summary.companies && summary.companies.length > 1) {
        // Keep previous selection if it still exists in the company list
        setSelectedCompanyId((prev) => {
          if (prev && summary.companies.some((c) => c.id === prev)) return prev;
          return null;
        });
      }
    } catch (err: unknown) {
      if (err instanceof TenantAdminApiError && err.status === 403) {
        setAuthorizationDenied(true);
        setError('Tenant Administrator authority required');
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to load tenant admin context';
        setError(msg);
      }
      setTenant(null);
      setUser(null);
      setTenantAdmin(null);
      setCompanies([]);
      setCapacity(null);
      setSelectedCompanyId(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshContext();
    } else {
      setIsLoading(false);
      setTenant(null);
      setUser(null);
      setTenantAdmin(null);
      setCompanies([]);
      setCapacity(null);
      setSelectedCompanyId(null);
    }
  }, [isAuthenticated, refreshContext]);

  const selectCompany = useCallback(
    (companyId: string | null) => {
      if (companyId === null) {
        setSelectedCompanyId(null);
        return;
      }
      const match = companies.find((c) => c.id === companyId);
      if (match) {
        setSelectedCompanyId(companyId);
      }
    },
    [companies],
  );

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const isSingleCompany = companies.length === 1;
  const isTenantAdmin = Boolean(
    tenantAdmin?.status === 'active' ||
    isSuperAdmin ||
    access?.companies.some((c) => (c as unknown as { isTenantAdmin?: boolean }).isTenantAdmin),
  );

  const value = useMemo<TenantAdminContextValue>(
    () => ({
      tenantId: tenant?.id ?? null,
      tenantName: tenant?.name ?? null,
      tenant,
      user,
      tenantAdmin,
      isTenantAdmin,
      isSuperAdmin,
      companies,
      capacity,
      isSingleCompany,
      entitlements,
      selectedCompanyId,
      selectedCompany,
      selectCompany,
      isLoading,
      error,
      authorizationDenied,
      refreshContext,
      refresh: refreshContext,
    }),
    [
      tenant,
      user,
      tenantAdmin,
      isTenantAdmin,
      isSuperAdmin,
      companies,
      capacity,
      isSingleCompany,
      entitlements,
      selectedCompanyId,
      selectedCompany,
      selectCompany,
      isLoading,
      error,
      authorizationDenied,
      refreshContext,
    ],
  );

  return <TenantAdminContext.Provider value={value}>{children}</TenantAdminContext.Provider>;
}

export function useTenantAdmin(): TenantAdminContextValue {
  const context = useContext(TenantAdminContext);
  if (!context) {
    throw new Error('useTenantAdmin must be used within a TenantAdminProvider');
  }
  return context;
}
