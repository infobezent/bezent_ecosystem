import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { useAuth } from '../../../../platform/auth';
import { landingPath } from '../../../../platform/auth/landing';
import { LoadingState } from '../../../../design-system/components';
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
 * ESS workspace guard (layout route).
 * Requires an authenticated user whose active company grants the `ess` workspace
 * (i.e. there is a linked, active Employee record — server-resolved).
 *
 * Users without ESS eligibility are redirected to their correct workspace
 * (e.g. an HR Manager goes to /hrms/dashboard). This is UX-layer gating;
 * the backend enforces eligibility on every /api/v1/ess route via requireEssAuth.
 */
export function RequireEssWorkspace() {
  const { status, access, activeCompany } = useAuth();

  if (status === 'loading') {
    return <LoadingState label="Verifying access…" fill />;
  }

  if (status !== 'authenticated' || !access) {
    return <Navigate to="/login" replace />;
  }

  // The server places 'ess' in workspaces only when essEligible is true
  // (linked, active Employee record). Check the server-resolved flag directly.
  const hasEssAccess = activeCompany?.workspaces.includes('ess') ?? false;

  if (!hasEssAccess) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return <Outlet />;
}

const basePath = ESS_BASE_PATH.replace(/^\//, '');

export const essRoutes: RouteObject[] = [
  {
    path: basePath,
    element: <RequireEssWorkspace />,
    children: [
      {
        index: true,
        element: <Navigate to={`${ESS_BASE_PATH}/dashboard`} replace />,
      },
      { path: 'dashboard', element: <EssDashboardPage /> },
      { path: 'profile', element: <EssProfilePage /> },
      { path: 'attendance', element: <EssAttendancePage /> },
      { path: 'leave', element: <EssLeavePage /> },
      { path: 'timesheets', element: <EssTimesheetsPage /> },
      { path: 'documents', element: <EssDocumentsPage /> },
      { path: 'requests', element: <EssRequestsPage /> },
      { path: 'payslips', element: <EssPayslipsPage /> },
      { path: 'tasks', element: <EssTasksPage /> },
      { path: 'notifications', element: <EssNotificationsPage /> },
    ],
  },
];
