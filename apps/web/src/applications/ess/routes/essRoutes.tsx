import { Navigate, type RouteObject } from 'react-router-dom';
import { useSuperAdminAuth } from '../../super-admin/context/SuperAdminAuthContext';
import { LoadingState } from '../../../design-system/components';
import { EssDashboardPage } from '../pages/EssDashboardPage';
import { EssProfilePage } from '../pages/EssProfilePage';
import { EssAttendancePage } from '../pages/EssAttendancePage';
import { EssLeavePage } from '../pages/EssLeavePage';
import { EssTimesheetsPage } from '../pages/EssTimesheetsPage';
import { EssDocumentsPage } from '../pages/EssDocumentsPage';
import { EssRequestsPage } from '../pages/EssRequestsPage';
import { EssPayslipsPage } from '../pages/EssPayslipsPage';
import { EssTasksPage } from '../pages/EssTasksPage';
import { EssNotificationsPage } from '../pages/EssNotificationsPage';

export const ESS_BASE_PATH = '/ess';
export const ESS_DEFAULT_DESTINATION_ID = 'dashboard';

/**
 * Route guard for ESS.
 * Any authenticated user with an active membership may access ESS —
 * eligibility (employee record presence) is enforced by the backend middleware.
 * The frontend only checks that the user is authenticated.
 */
function RequireEssAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSuperAdminAuth();

  if (isLoading) {
    return <LoadingState label="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const basePath = ESS_BASE_PATH.replace(/^\//, '');

export const essRoutes: RouteObject[] = [
  {
    path: basePath,
    children: [
      {
        index: true,
        element: <Navigate to={`${ESS_BASE_PATH}/dashboard`} replace />,
      },
      {
        path: 'dashboard',
        element: (
          <RequireEssAuth>
            <EssDashboardPage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireEssAuth>
            <EssProfilePage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'attendance',
        element: (
          <RequireEssAuth>
            <EssAttendancePage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'leave',
        element: (
          <RequireEssAuth>
            <EssLeavePage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'timesheets',
        element: (
          <RequireEssAuth>
            <EssTimesheetsPage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'documents',
        element: (
          <RequireEssAuth>
            <EssDocumentsPage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'requests',
        element: (
          <RequireEssAuth>
            <EssRequestsPage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'payslips',
        element: (
          <RequireEssAuth>
            <EssPayslipsPage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'tasks',
        element: (
          <RequireEssAuth>
            <EssTasksPage />
          </RequireEssAuth>
        ),
      },
      {
        path: 'notifications',
        element: (
          <RequireEssAuth>
            <EssNotificationsPage />
          </RequireEssAuth>
        ),
      },
    ],
  },
];
