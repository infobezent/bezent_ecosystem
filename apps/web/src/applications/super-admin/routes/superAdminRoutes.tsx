import { Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom';
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
import { useAuth } from '../../../platform/auth';
import { landingPath } from '../../../platform/auth/landing';
import { LoadingState } from '../../../design-system/components';

export const SUPER_ADMIN_BASE_PATH = '/super-admin';
export const SUPER_ADMIN_DEFAULT_DESTINATION_ID = 'overview';

/**
 * Super Admin workspace guard (layout route).
 * Requires the user to hold Super Admin platform privileges.
 * Unauthorized users are redirected to their authorized workspace immediately,
 * BEFORE the Super Admin shell or navigation can render.
 */
export function RequireSuperAdminWorkspace() {
  const { status, access } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Verifying platform administrator access..." fill />;
  }

  if (status !== 'authenticated' || !access) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const isSuperAdmin = Boolean(
    access.user.isSuperAdmin || access.platformWorkspaces?.includes('super_admin'),
  );

  if (!isSuperAdmin) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return <Outlet />;
}

/**
 * Leaf-level guard for Super Admin pages.
 * Enforces Super Admin access and redirects unauthorized users away.
 */
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { status, access } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Verifying platform administrator access..." fill />;
  }

  if (status !== 'authenticated' || !access) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const isSuperAdmin = Boolean(
    access.user.isSuperAdmin || access.platformWorkspaces?.includes('super_admin'),
  );

  if (!isSuperAdmin) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return <>{children}</>;
}

const basePath = SUPER_ADMIN_BASE_PATH.replace(/^\//, '');

export const superAdminRoutes: RouteObject[] = [
  {
    path: basePath,
    element: <RequireSuperAdminWorkspace />,
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
