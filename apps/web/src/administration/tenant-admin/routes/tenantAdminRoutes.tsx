import { Navigate, Outlet, useLocation, useParams, type RouteObject } from 'react-router-dom';
import { useAuth } from '../../../platform/auth';
import { landingPath } from '../../../platform/auth/landing';
import { LoadingState } from '../../../design-system/components';
import { TenantAdminProvider } from '../context/TenantAdminContext';

// Pages
import { TenantAdminDashboardPage } from '../pages/TenantAdminDashboardPage';
import { TenantProfilePage } from '../pages/TenantProfilePage';
import { TenantCompaniesPage } from '../pages/TenantCompaniesPage';
import { CreateCompanyPage } from '../pages/CreateCompanyPage';
import { CompanyOverviewPage } from '../pages/CompanyOverviewPage';
import { CompanyOrganizationStructurePage } from '../pages/CompanyOrganizationStructurePage';
import { CompanyDepartmentsPage } from '../pages/CompanyDepartmentsPage';
import { CompanyLocationsPage } from '../pages/CompanyLocationsPage';
import { CompanyAccessPage } from '../pages/CompanyAccessPage';
import { CompanyApplicationsPage } from '../pages/CompanyApplicationsPage';
import { TenantMembersPage } from '../pages/TenantMembersPage';
import { TenantInvitationsPage } from '../pages/TenantInvitationsPage';
import { TenantRolesPage } from '../pages/TenantRolesPage';
import { TenantApplicationAccessPage } from '../pages/TenantApplicationAccessPage';
import { TenantApplicationSetupPage } from '../pages/TenantApplicationSetupPage';
import { TenantAuditLogsPage } from '../pages/TenantAuditLogsPage';

export const TENANT_ADMIN_BASE_PATH = '/tenant-admin';
export const TENANT_ADMIN_DEFAULT_DESTINATION_ID = 'overview';

/**
 * Tenant Admin workspace guard (layout route).
 * Requires the user to hold Tenant Admin authority (or platform Super Admin).
 * Unauthorized users are redirected to their authorized workspace immediately,
 * BEFORE the Tenant Admin shell or navigation can render.
 */
export function RequireTenantAdminWorkspace() {
  const { status, access } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Verifying tenant administrator authorization..." fill />;
  }

  if (status !== 'authenticated' || !access) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const isTenantAdmin = Boolean(
    access.isTenantAdmin ||
    access.platformWorkspaces?.includes('tenant_admin') ||
    access.companies.some((c) => c.isTenantAdmin || c.workspaces.includes('tenant_admin')),
  );

  if (!isTenantAdmin) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return (
    <TenantAdminProvider>
      <Outlet />
    </TenantAdminProvider>
  );
}

function RequireTenantAdmin({ children }: { children: React.ReactNode }) {
  const { status, access } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Verifying tenant administrator authorization..." fill />;
  }

  if (status !== 'authenticated' || !access) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const isTenantAdmin = Boolean(
    access.isTenantAdmin ||
    access.platformWorkspaces?.includes('tenant_admin') ||
    access.companies.some((c) => c.isTenantAdmin || c.workspaces.includes('tenant_admin')),
  );

  if (!isTenantAdmin) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return <>{children}</>;
}

function CompanyDetailsRedirect() {
  const { companyId } = useParams<{ companyId: string }>();
  return (
    <Navigate
      to={`${TENANT_ADMIN_BASE_PATH}/tenant/companies/${encodeURIComponent(companyId || '')}/overview`}
      replace
    />
  );
}

const basePath = TENANT_ADMIN_BASE_PATH.replace(/^\//, '');

export const tenantAdminRoutes: RouteObject[] = [
  {
    path: basePath,
    element: <RequireTenantAdminWorkspace />,
    children: [
      {
        index: true,
        element: <Navigate to={`${TENANT_ADMIN_BASE_PATH}/dashboard`} replace />,
      },
      // 01 Overview
      {
        path: 'dashboard',
        element: (
          <RequireTenantAdmin>
            <TenantAdminDashboardPage />
          </RequireTenantAdmin>
        ),
      },
      // 02 Tenant
      {
        path: 'tenant',
        element: <Navigate to={`${TENANT_ADMIN_BASE_PATH}/tenant/details`} replace />,
      },
      {
        path: 'tenant/details',
        element: (
          <RequireTenantAdmin>
            <TenantProfilePage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/profile',
        element: <Navigate to={`${TENANT_ADMIN_BASE_PATH}/tenant/details`} replace />,
      },
      {
        path: 'tenant/companies',
        element: (
          <RequireTenantAdmin>
            <TenantCompaniesPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/companies/new',
        element: (
          <RequireTenantAdmin>
            <CreateCompanyPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/companies/:companyId',
        element: <Navigate to="overview" replace />,
      },
      {
        path: 'tenant/companies/:companyId/overview',
        element: (
          <RequireTenantAdmin>
            <CompanyOverviewPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/companies/:companyId/details',
        element: <CompanyDetailsRedirect />,
      },
      {
        path: 'tenant/companies/:companyId/organization',
        element: <Navigate to="structure" replace />,
      },
      {
        path: 'tenant/companies/:companyId/organization/structure',
        element: (
          <RequireTenantAdmin>
            <CompanyOrganizationStructurePage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/companies/:companyId/organization/departments',
        element: (
          <RequireTenantAdmin>
            <CompanyDepartmentsPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/companies/:companyId/organization/work-locations',
        element: (
          <RequireTenantAdmin>
            <CompanyLocationsPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/companies/:companyId/organization/locations',
        element: <Navigate to="../work-locations" replace />,
      },
      {
        path: 'tenant/companies/:companyId/access',
        element: (
          <RequireTenantAdmin>
            <CompanyAccessPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'tenant/companies/:companyId/applications',
        element: (
          <RequireTenantAdmin>
            <CompanyApplicationsPage />
          </RequireTenantAdmin>
        ),
      },
      // 03 Access
      {
        path: 'access',
        element: <Navigate to={`${TENANT_ADMIN_BASE_PATH}/access/users/members`} replace />,
      },
      {
        path: 'access/users',
        element: <Navigate to={`${TENANT_ADMIN_BASE_PATH}/access/users/members`} replace />,
      },
      {
        path: 'access/users/members',
        element: (
          <RequireTenantAdmin>
            <TenantMembersPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'access/users/invitations',
        element: (
          <RequireTenantAdmin>
            <TenantInvitationsPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'access/roles',
        element: (
          <RequireTenantAdmin>
            <TenantRolesPage />
          </RequireTenantAdmin>
        ),
      },
      // 04 Applications
      {
        path: 'applications',
        element: <Navigate to={`${TENANT_ADMIN_BASE_PATH}/applications/access`} replace />,
      },
      {
        path: 'applications/access',
        element: (
          <RequireTenantAdmin>
            <TenantApplicationAccessPage />
          </RequireTenantAdmin>
        ),
      },
      {
        path: 'applications/setup',
        element: (
          <RequireTenantAdmin>
            <TenantApplicationSetupPage />
          </RequireTenantAdmin>
        ),
      },
      // 05 Governance
      {
        path: 'governance',
        element: <Navigate to={`${TENANT_ADMIN_BASE_PATH}/governance/audit-logs`} replace />,
      },
      {
        path: 'governance/audit-logs',
        element: (
          <RequireTenantAdmin>
            <TenantAuditLogsPage />
          </RequireTenantAdmin>
        ),
      },
    ],
  },
];
