import { Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom';
import { SuperAdminDashboardPage } from '../pages/SuperAdminDashboardPage';
import { TenantsPage } from '../pages/TenantsPage';
import { CreateTenantPage } from '../pages/CreateTenantPage';
import { TenantDetailsPage } from '../pages/TenantDetailsPage';
import { CompaniesPage } from '../pages/CompaniesPage';
import { CompanyDetailsPage } from '../pages/CompanyDetailsPage';
import { CustomerProvisioningPage } from '../pages/CustomerProvisioningPage';
import { PlatformUsersPage } from '../pages/PlatformUsersPage';
import { CompanyAdminsPage } from '../pages/CompanyAdminsPage';
import { ModuleAccessPage } from '../pages/ModuleAccessPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { PlatformSettingsPage } from '../pages/PlatformSettingsPage';
import { PlansPage } from '../pages/PlansPage';
import { TenantSubscriptionsPage } from '../pages/TenantSubscriptionsPage';
import { ApplicationCatalogPage } from '../pages/ApplicationCatalogPage';
import { ModuleCatalogPage } from '../pages/ModuleCatalogPage';
import { TenantHealthPage } from '../pages/TenantHealthPage';
import { ProvisioningJobsPage } from '../pages/ProvisioningJobsPage';
import { SupportCasesPage } from '../pages/SupportCasesPage';
import { ControlledSupportAccessPage } from '../pages/ControlledSupportAccessPage';
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
      // 01. Overview
      {
        path: 'dashboard',
        element: (
          <RequireSuperAdmin>
            <SuperAdminDashboardPage />
          </RequireSuperAdmin>
        ),
      },
      // 02. Tenants
      {
        path: 'tenants',
        element: (
          <RequireSuperAdmin>
            <TenantsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'tenants/create',
        element: (
          <RequireSuperAdmin>
            <CreateTenantPage />
          </RequireSuperAdmin>
        ),
      },
      {
        // Contextual page requiring selected tenant; redirect to tenants directory if visited without tenantId
        path: 'tenants/details',
        element: <Navigate to={`${SUPER_ADMIN_BASE_PATH}/tenants`} replace />,
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
        path: 'tenants/:tenantId/:tab',
        element: (
          <RequireSuperAdmin>
            <TenantDetailsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        // Tenant Provisioning flow (Create Tenant)
        path: 'provisioning',
        element: <Navigate to={`${SUPER_ADMIN_BASE_PATH}/tenants/create`} replace />,
      },
      // 03. Subscriptions
      {
        path: 'subscriptions/plans',
        element: (
          <RequireSuperAdmin>
            <PlansPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'subscriptions/tenants',
        element: (
          <RequireSuperAdmin>
            <TenantSubscriptionsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'subscriptions/entitlements',
        element: (
          <RequireSuperAdmin>
            <ModuleAccessPage />
          </RequireSuperAdmin>
        ),
      },
      // 04. Applications
      {
        path: 'applications/catalog',
        element: (
          <RequireSuperAdmin>
            <ApplicationCatalogPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'applications/modules',
        element: (
          <RequireSuperAdmin>
            <ModuleCatalogPage />
          </RequireSuperAdmin>
        ),
      },
      // 05. Governance
      {
        path: 'audit-logs',
        element: (
          <RequireSuperAdmin>
            <AuditLogsPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'platform-admins',
        element: (
          <RequireSuperAdmin>
            <PlatformUsersPage />
          </RequireSuperAdmin>
        ),
      },
      // 06. Operations
      {
        path: 'operations/health',
        element: (
          <RequireSuperAdmin>
            <TenantHealthPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'operations/jobs',
        element: (
          <RequireSuperAdmin>
            <ProvisioningJobsPage />
          </RequireSuperAdmin>
        ),
      },
      // 07. Support
      {
        path: 'support/cases',
        element: (
          <RequireSuperAdmin>
            <SupportCasesPage />
          </RequireSuperAdmin>
        ),
      },
      {
        path: 'support/access',
        element: (
          <RequireSuperAdmin>
            <ControlledSupportAccessPage />
          </RequireSuperAdmin>
        ),
      },
      // 08. Settings
      {
        path: 'settings',
        element: (
          <RequireSuperAdmin>
            <PlatformSettingsPage />
          </RequireSuperAdmin>
        ),
      },
      // ── Preserved Deep Link Compatibility Routes ─────────────────────
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
    ],
  },
];
