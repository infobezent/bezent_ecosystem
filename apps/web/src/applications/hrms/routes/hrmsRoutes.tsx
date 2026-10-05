import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { hrmsNavigation } from '../navigation';
import { ModulePlaceholder } from '../pages/ModulePlaceholder';
import { OnboardingPage } from '../onboarding';
import { EmployeeAdministrationPage } from '../employee-administration';
import { DocumentsPage } from '../documents';
import {
  SettingsPage,
} from '../settings';
import {
  EmployeeDirectoryPage,
  EmployeeProfilePage,
  EMPLOYEES_PATH,
} from '../employees';
import { destinationPath } from '../../../shared/utils/navigation';
import { useAuth } from '../../../platform/auth';
import { landingPath } from '../../../platform/auth/landing';
import { LoadingState } from '../../../design-system/components';

export const HRMS_BASE_PATH = '/hrms';
export const HRMS_DEFAULT_DESTINATION_ID = 'dashboard';

const APPLICATION = 'HRMS';

/**
 * HRMS workspace guard (layout route). Requires the user to hold the `hrms`
 * workspace (i.e. at least one HRMS admin permission resolved by the server).
 *
 * An Employee whose only workspace is `ess` is redirected to their authorized
 * landing path. This is UX-layer gating; the backend enforces the same boundary
 * via requireApplicationAccess('hrms', 'hrms') on every /api/v1/hrms route.
 */
export function RequireHrmsWorkspace() {
  const { status, access, activeCompany } = useAuth();

  if (status === 'loading') {
    return <LoadingState label="Verifying access…" fill />;
  }

  // Not authenticated at all — RequireAuth (parent) will handle this,
  // but guard defensively here too.
  if (status !== 'authenticated' || !access) {
    return <Navigate to="/login" replace />;
  }

  // Check the server-resolved HRMS workspace in the active company.
  const hasHrmsWorkspace = activeCompany?.workspaces.includes('hrms') ?? false;

  if (!hasHrmsWorkspace) {
    // Redirect to the correct workspace for this user (e.g. /ess for an Employee).
    return <Navigate to={landingPath(access)} replace />;
  }

  // Render children via React Router's Outlet (layout route pattern).
  return <Outlet />;
}

/**
 * HRMS routes, generated from the ONE canonical navigation catalog — there
 * is no separate route map to keep in sync.
 *
 * Administration maps:
 * - employees -> canonical Employee Directory; employees/:employeeId -> canonical Employee Profile
 * - employee-administration -> Employee Administration action queue (employment actions on existing employees)
 * - onboarding -> Direct Employee Registration form workspace
 * - documents -> Documents main page (canonical employee documents)
 *
 * Backward-compatible aliases ensure legacy `/hrms/onboarding` and `/hrms/administrative` deep links resolve.
 */
const basePath = HRMS_BASE_PATH.replace(/^\//, '');
const defaultDestination = hrmsNavigation.destinations.find(
  (d) => d.id === HRMS_DEFAULT_DESTINATION_ID,
)!;

export const hrmsRoutes: RouteObject[] = [
  {
    path: basePath,
    element: <RequireHrmsWorkspace />,
    children: [
      {
        index: true,
        element: <Navigate to={destinationPath(HRMS_BASE_PATH, defaultDestination)} replace />,
      },
      ...hrmsNavigation.destinations.flatMap((destination): RouteObject[] => {
        const isAdministration = destination.id === 'administration';
        const isSettings = destination.id === 'settings';
        // Administration is a navigation group (no overview page); it lands on
        // its first child, the canonical Employee Directory.
        return [
          {
            path: destination.segment,
            element: isAdministration ? (
              <Navigate to={EMPLOYEES_PATH} replace />
            ) : isSettings ? (
              <SettingsPage />
            ) : (
              <ModulePlaceholder
                application={APPLICATION}
                destinationId={destination.id}
                title={destination.label}
              />
            ),
          },
          ...(destination.children ?? []).map((child): RouteObject => ({
            path: `${destination.segment}/${child.id}`,
            element:
              isAdministration && child.id === 'employees' ? (
                <EmployeeDirectoryPage />
              ) : isAdministration && child.id === 'employee-administration' ? (
                <EmployeeAdministrationPage />
              ) : isAdministration && child.id === 'onboarding' ? (
                <OnboardingPage title="Onboarding" />
              ) : isAdministration && child.id === 'documents' ? (
                <DocumentsPage />
              ) : isSettings ? (
                <SettingsPage />
              ) : (
                <ModulePlaceholder
                  application={APPLICATION}
                  destinationId={destination.id}
                  title={destination.label}
                  section={child.label}
                  sectionId={child.id}
                />
              ),
          })),
        ];
      }),
      // Canonical Employee Profile (Employees directory and Employee Administration both link here)
      {
        path: 'administration/employees/:employeeId',
        element: <EmployeeProfilePage />,
      },

      // Legacy top-level Employees URL (no longer a navigation destination)
      {
        path: 'employees',
        element: <Navigate to={EMPLOYEES_PATH} replace />,
      },
      // Backward-compatible routes for existing Onboarding and Administrative URLs
      {
        path: 'onboarding',
        element: <OnboardingPage title="Onboarding" />,
      },
      {
        path: 'onboarding/new-hires',
        element: <OnboardingPage title="Onboarding" />,
      },
      {
        path: 'onboarding/workflow-settings',
        element: <SettingsPage />,
      },
      {
        path: 'onboarding/*',
        element: <Navigate to="/hrms/administration/onboarding" replace />,
      },
      {
        path: 'administrative/employee-administration',
        element: <Navigate to="/hrms/administration/employee-administration" replace />,
      },
      {
        path: 'administrative/onboarding',
        element: <Navigate to="/hrms/administration/onboarding" replace />,
      },
      {
        path: 'administrative/documents',
        element: <Navigate to="/hrms/administration/documents" replace />,
      },
      {
        path: 'administrative/*',
        element: <Navigate to="/hrms/administration/employee-administration" replace />,
      },
      // Organization masters are now owned by Company Administration.
      // These backward-compatible redirects preserve any existing deep links into
      // the old /hrms/settings/organization/* and /hrms/organization/* paths.
      {
        path: 'settings/organization/profile',
        element: <Navigate to="/company-admin/profile" replace />,
      },
      {
        path: 'settings/organization/structure',
        element: <Navigate to="/company-admin/organization/structure" replace />,
      },
      {
        path: 'settings/organization/departments',
        element: <Navigate to="/company-admin/organization/departments" replace />,
      },
      {
        path: 'settings/organization/designations',
        element: <Navigate to="/hrms/settings/administration?tab=employee-configuration&sub=designations" replace />,
      },
      {
        path: 'settings/organization/locations',
        element: <Navigate to="/company-admin/organization/work-locations" replace />,
      },
      {
        path: 'settings/organization/job-levels',
        element: <Navigate to="/hrms/settings/administration?tab=employee-configuration&sub=job-levels" replace />,
      },
      {
        path: 'settings/organization',
        element: <Navigate to="/company-admin/organization" replace />,
      },
      {
        path: 'organization/job-levels',
        element: <Navigate to="/hrms/settings/administration?tab=employee-configuration&sub=job-levels" replace />,
      },
      {
        path: 'organization/locations',
        element: <Navigate to="/company-admin/organization/work-locations" replace />,
      },
      {
        path: 'organization/designations',
        element: <Navigate to="/hrms/settings/administration?tab=employee-configuration&sub=designations" replace />,
      },
      {
        path: 'organization/departments',
        element: <Navigate to="/company-admin/organization/departments" replace />,
      },
      {
        path: 'organization/structure',
        element: <Navigate to="/company-admin/organization/structure" replace />,
      },
      {
        path: 'organization/profile',
        element: <Navigate to="/company-admin/profile" replace />,
      },
      {
        path: 'organization',
        element: <Navigate to="/company-admin/organization" replace />,
      },
      {
        path: '*',
        element: (
          <ModulePlaceholder
            application={APPLICATION}
            homePath={destinationPath(HRMS_BASE_PATH, defaultDestination)}
          />
        ),
      },
    ],
  },
];
