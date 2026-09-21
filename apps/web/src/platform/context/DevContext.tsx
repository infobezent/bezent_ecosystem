import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { appConfig } from '../../app/config/env';

/**
 * TEMPORARY DEVELOPMENT CONTEXT (Frontend)
 *
 * Supplies centralized company and user context for development (Milestone 1).
 * Avoids scattering hardcoded company/tenant IDs across components.
 *
 * When real authentication and tenant resolution are introduced in future
 * phases, this context will be replaced by the authenticated session provider.
 */
export interface DevContextValue {
  tenantId: string;
  companyId: string;
  companyName: string;
  userId: string;
  role: string;
  loading: boolean;
}

const DEFAULT_DEV_CONTEXT: DevContextValue = {
  tenantId: 'tenant_demo_01',
  companyId: 'comp_demo_01',
  companyName: 'BEZENT Demo Pvt Ltd',
  userId: 'user_dev_01',
  role: 'HR',
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
