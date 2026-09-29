import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { DevContextProvider } from '../../platform/context/DevContext';
import { SuperAdminAuthProvider } from '../../applications/super-admin/context/SuperAdminAuthContext';
import { CompanyAdminProvider } from '../../applications/company-admin/context/CompanyAdminContext';
import { EssProvider } from '../../applications/ess/context/EssContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composition root for cross-cutting React providers (theme, query client,
 * auth/tenant context, etc.). Providers are added here as capabilities are
 * implemented, so `App.tsx` never has to change to accommodate them.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <DevContextProvider>
        <SuperAdminAuthProvider>
          <CompanyAdminProvider>
            <EssProvider>{children}</EssProvider>
          </CompanyAdminProvider>
        </SuperAdminAuthProvider>
      </DevContextProvider>
    </ThemeProvider>
  );
}
