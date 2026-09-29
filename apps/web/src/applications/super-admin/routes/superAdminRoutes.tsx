import { Navigate, useLocation, type RouteObject } from 'react-router-dom';
import { SuperAdminDashboardPage } from '../pages/SuperAdminDashboardPage';
import { TenantsPage } from '../pages/TenantsPage';
import { TenantDetailsPage } from '../pages/TenantDetailsPage';
import { CompaniesPage } from '../pages/CompaniesPage';
import { CompanyDetailsPage } from '../pages/CompanyDetailsPage';
import { CustomerProvisioningPage } from '../pages/CustomerProvisioningPage';
import { PlatformUsersPage } from '../pages/PlatformUsersPage';
import { CompanyAdminsPage } from '../pages/CompanyAdminsPage';
import { ModuleAccessPage } from '../pages/ModuleAccessPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { PlatformSettingsPage } from '../pages/PlatformSettingsPage';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';
import { Alert, LoadingState } from '../../../design-system/components';

export const SUPER_ADMIN_BASE_PATH = '/super-admin';
export const SUPER_ADMIN_DEFAULT_DESTINATION_ID = 'dashboard';

/**
 * Navigation guard for the platform workspace. Signing in happens on the shared
 * Email OTP page; the platform API independently enforces Super Admin access.
 */
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSuperAdmin, isLoading } = useSuperAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState label="Verifying platform administrator access..." />;
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!isSuperAdmin) {
    return (
      <Alert variant="error" title="Access denied">
        Platform administration is available to BEZENT Super Admins only.
      </Alert>
    );
  }

  return <>{children}</>;
}

const basePath = SUPER_ADMIN_BASE_PATH.replace(/^\//, '');

export const superAdminRoutes: RouteObject[] = [
  {
    path: basePath,
    children: [
      {
        index: true,
        element: <Navigate to={`${SUPER_ADMIN_BASE_PATH}/dashboard`} replace />,
      },
      {
        // Retired: every user signs in on the shared Email OTP page (ADR-018).
        path: 'login',
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <RequireSuperAdmin>
            <SuperAdminDashboardPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'tenants',
        element: (
          <RequireSuperAdmin>
            <TenantsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'tenants/:tenantId',
        element: (
          <RequireSuperAdmin>
            <TenantDetailsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'companies',
        element: (
          <RequireSuperAdmin>
            <CompaniesPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'companies/:companyId',
        element: (
          <RequireSuperAdmin>
            <CompanyDetailsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'provisioning',
        element: (
          <RequireSuperAdmin>
            <CustomerProvisioningPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'users',
        element: (
          <RequireSuperAdmin>
            <PlatformUsersPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'company-admins',
        element: (
          <RequireSuperAdmin>
            <CompanyAdminsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'modules',
        element: (
          <RequireSuperAdmin>
            <ModuleAccessPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <RequireSuperAdmin>
            <AuditLogsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'settings',
        element: (
          <RequireSuperAdmin>
            <PlatformSettingsPage />
          </RequireSuperAdmin>
        ),
      },
    ],
  },
];
