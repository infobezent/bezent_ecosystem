import { Navigate, type RouteObject } from 'react-router-dom';
import { CompanyAdminDashboardPage } from '../pages/CompanyAdminDashboardPage';
import { CompanyProfilePage } from '../pages/CompanyProfilePage';
import { CompanyOrganizationPage } from '../pages/CompanyOrganizationPage';
import { CompanyPoliciesPage } from '../pages/CompanyPoliciesPage';
import { CompanyUsersPage } from '../pages/CompanyUsersPage';
import { CompanyInvitationsPage } from '../pages/CompanyInvitationsPage';
import { CompanyRolesPage } from '../pages/CompanyRolesPage';
import { CompanyModulesPage } from '../pages/CompanyModulesPage';
import { CompanyAuditLogsPage } from '../pages/CompanyAuditLogsPage';
import { CompanySettingsPage } from '../pages/CompanySettingsPage';
import { useSuperAdminAuth } from '../../super-admin/context/SuperAdminAuthContext';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { LoadingState } from '../../../design-system/components';

export const COMPANY_ADMIN_BASE_PATH = '/company-admin';
export const COMPANY_ADMIN_DEFAULT_DESTINATION_ID = 'dashboard';

function RequireCompanyAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useSuperAdminAuth();
  const { isCompanyAdmin, isLoadingCompanies } = useCompanyAdmin();

  if (authLoading || isLoadingCompanies) {
    return <LoadingState label="Verifying company administrator authorization..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isCompanyAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const basePath = COMPANY_ADMIN_BASE_PATH.replace(/^\//, '');

export const companyAdminRoutes: RouteObject[] = [
  {
    path: basePath,
    children: [
      {
        index: true,
        element: <Navigate to={`${COMPANY_ADMIN_BASE_PATH}/dashboard`} replace />,
      },
      {
        path: 'dashboard',
        element: (
          <RequireCompanyAdmin>
            <CompanyAdminDashboardPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireCompanyAdmin>
            <CompanyProfilePage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'organization',
        element: (
          <RequireCompanyAdmin>
            <CompanyOrganizationPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'policies',
        element: (
          <RequireCompanyAdmin>
            <CompanyPoliciesPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'users',
        element: (
          <RequireCompanyAdmin>
            <CompanyUsersPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'invitations',
        element: (
          <RequireCompanyAdmin>
            <CompanyInvitationsPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'roles',
        element: (
          <RequireCompanyAdmin>
            <CompanyRolesPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'modules',
        element: (
          <RequireCompanyAdmin>
            <CompanyModulesPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <RequireCompanyAdmin>
            <CompanyAuditLogsPage />
          </RequireCompanyAdmin>
        ),
      },
      {
        path: 'settings',
        element: (
          <RequireCompanyAdmin>
            <CompanySettingsPage />
          </RequireCompanyAdmin>
        ),
      },
    ],
  },
];
