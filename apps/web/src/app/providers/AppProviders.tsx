import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from '../../platform/auth';
import { CompanyAdminProvider } from '../../applications/company-admin/context/CompanyAdminContext';
import { EssProvider } from '../../applications/ess/context/EssContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composition root for cross-cutting React providers (theme, query client,
 * auth/tenant context, etc.). Providers are added here as capabilities are
 * implemented, so `App.tsx` never has to change to accommodate them.
 *
 * AuthProvider is the ONE authenticated session for every workspace (ADR-018);
 * the development company context it replaced trusted client-chosen companies.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CompanyAdminProvider>
          <EssProvider>{children}</EssProvider>
        </CompanyAdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
