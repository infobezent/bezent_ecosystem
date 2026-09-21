import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { DevContextProvider } from '../../platform/context/DevContext';

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
      <DevContextProvider>{children}</DevContextProvider>
    </ThemeProvider>
  );
}
