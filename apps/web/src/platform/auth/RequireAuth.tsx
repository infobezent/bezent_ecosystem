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
  const { status, error, refreshAccess } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Restoring your session…" fill />;
  }
  if (status === 'error') {
    return (
      <Stack gap="md" align="center">
        <Alert variant="error" title="Session could not be restored">
          {error ?? 'BEZENT could not be reached.'}
        </Alert>
        <Button variant="primary" onClick={() => void refreshAccess()}>
          Try again
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
