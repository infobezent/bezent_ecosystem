import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Button, LoadingState, Stack } from '../../design-system/components';
import { useAuth } from './AuthProvider';

/**
 * Authentication gate for in-app routes: anonymous visitors go to the shared
 * sign-in page and return afterwards. It is navigation only — each workspace
 * API still authorizes every request on the server.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, errorKind, refreshAccess, signOut } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Restoring your session…" fill />;
  }
  if (status === 'error') {
    const alertConfig = (() => {
      switch (errorKind) {
        case 'network':
          return {
            title: 'BEZENT Service Unreachable',
            buttonLabel: 'Retry Connection',
            action: () => void refreshAccess(),
          };
        case 'database_unavailable':
          return {
            title: 'Database Service Unavailable',
            buttonLabel: 'Retry',
            action: () => void refreshAccess(),
          };
        case 'forbidden':
          return {
            title: 'Access Denied',
            buttonLabel: 'Sign In with Different Account',
            action: () => void signOut(),
          };
        case 'server_error':
        default:
          return {
            title: 'Session Could Not Be Restored',
            buttonLabel: 'Try Again',
            action: () => void refreshAccess(),
          };
      }
    })();

    return (
      <Stack gap="md" align="center">
        <Alert variant="error" title={alertConfig.title}>
          {error ?? 'An unexpected error occurred.'}
        </Alert>
        <Button variant="primary" onClick={alertConfig.action}>
          {alertConfig.buttonLabel}
        </Button>
      </Stack>
    );
  }
  if (status !== 'authenticated') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}
