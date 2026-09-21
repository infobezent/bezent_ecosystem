import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { appConfig } from '../../app/config/env';

/**
 * TEMPORARY DEVELOPMENT APPLICATION CONTEXT (Frontend)
 *
 * Supplies centralized company context for pre-authentication development.
 * Represents unrestricted development access to the BEZENT application.
 * Avoids scattering hardcoded company/tenant IDs across components.
 *
 * This temporary context will later be replaced by:
 * Authenticated User -> Tenant / Company Membership -> Role -> Permissions -> Application / Module Access.
 *
 * DO NOT use role or user persona checks to determine application business behavior.
 */
export interface DevContextValue {
  tenantId: string;
  companyId: string;
  companyName: string;
  loading: boolean;
}

const DEFAULT_DEV_CONTEXT: DevContextValue = {
  tenantId: 'tenant_demo_01',
  companyId: 'comp_demo_01',
  companyName: 'BEZENT Demo Pvt Ltd',
  loading: true,
};

const DevContext = createContext<DevContextValue>(DEFAULT_DEV_CONTEXT);

export function DevContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<DevContextValue>(DEFAULT_DEV_CONTEXT);

  useEffect(() => {
    let mounted = true;

    async function fetchContext() {
      try {
        const res = await fetch(`${appConfig.apiBaseUrl}/context`);
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data) {
            setContext({
              ...json.data,
              loading: false,
            });
            return;
          }
        }
      } catch {
        // Fall back to default development context when API is unreachable
      }

      if (mounted) {
        setContext((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchContext();

    return () => {
      mounted = false;
    };
  }, []);

  return <DevContext.Provider value={context}>{children}</DevContext.Provider>;
}

export function useDevContext(): DevContextValue {
  return useContext(DevContext);
}
