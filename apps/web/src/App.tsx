import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';

/**
 * Application composition root. Stays thin: bootstrap, providers, router —
 * no business logic or business UI.
 */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
