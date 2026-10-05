import { Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom';
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
import { useAuth } from '../../../platform/auth';
import { landingPath } from '../../../platform/auth/landing';
import { LoadingState } from '../../../design-system/components';

export const COMPANY_ADMIN_BASE_PATH = '/company-admin';
export const COMPANY_ADMIN_DEFAULT_DESTINATION_ID = 'dashboard';

/**
 * Company Admin workspace guard (layout route).
 * Requires the user to hold Company Admin authorization in the active company (or platform oversight).
 * Unauthorized users are redirected to their authorized workspace immediately,
 * BEFORE the Company Admin shell or navigation can render.
 */
export function RequireCompanyAdminWorkspace() {
  const { status, access, activeCompany } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Verifying company administrator authorization..." fill />;
  }

  if (status !== 'authenticated' || !access) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const isCompanyAdmin = Boolean(
    access.user.isSuperAdmin ||
    activeCompany?.workspaces.includes('company_admin') ||
    activeCompany?.roles.some((r) => r.code === 'company_admin') ||
    activeCompany?.isPlatformOversight ||
    access.companies.some((c) => c.workspaces.includes('company_admin')),
  );

  if (!isCompanyAdmin) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return <Outlet />;
}

function RequireCompanyAdmin({ children }: { children: React.ReactNode }) {
  const { status, access, activeCompany } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Verifying company administrator authorization..." fill />;
  }

  if (status !== 'authenticated' || !access) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const isCompanyAdmin = Boolean(
    access.user.isSuperAdmin ||
    activeCompany?.workspaces.includes('company_admin') ||
    activeCompany?.roles.some((r) => r.code === 'company_admin') ||
    activeCompany?.isPlatformOversight ||
    access.companies.some((c) => c.workspaces.includes('company_admin')),
  );

  if (!isCompanyAdmin) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return <>{children}</>;
}

const basePath = COMPANY_ADMIN_BASE_PATH.replace(/^\//, '');

export const companyAdminRoutes: RouteObject[] = [
  {
    path: basePath,
    element: <RequireCompanyAdminWorkspace />,
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
        path: 'organization/profile',
        element: <Navigate to="/company-admin/profile" replace />,
      },
      {
        // Deep-link support: /company-admin/organization/:section
        // e.g. /company-admin/organization/departments, /company-admin/organization/structure
        path: 'organization/:section',
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
