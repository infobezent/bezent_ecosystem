import { Navigate, useNavigate, type RouteObject } from 'react-router-dom';
import { hrmsNavigation } from '../navigation';
import { ModulePlaceholder } from '../pages/ModulePlaceholder';
import { OnboardingPage, EmployeeRegistrationPage } from '../onboarding';
import { SettingsPage } from '../settings';
import { destinationPath } from '../../../shared/utils/navigation';
import type { BezentRouteHandle } from '../../../layouts/app-shell';

export const HRMS_BASE_PATH = '/hrms';
export const HRMS_DEFAULT_DESTINATION_ID = 'dashboard';

const APPLICATION = 'HRMS';

function EmployeeAdministrationRoute() {
  const navigate = useNavigate();

  return (
    <OnboardingPage
      title="Employee Administration"
      onAddNewHire={() => {
        navigate('/hrms/administration/onboarding');
      }}
    />
  );
}

/**
 * HRMS routes, generated from the ONE canonical navigation catalog — there
 * is no separate route map to keep in sync.
 *
 * Administration maps:
 * - employee-administration -> Candidate/New-Hire listing with title "Employee Administration"
 * - onboarding -> Direct Employee Registration form workspace
 * - documents -> Documents destination placeholder
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
    children: [
      {
        index: true,
        element: <Navigate to={destinationPath(HRMS_BASE_PATH, defaultDestination)} replace />,
      },
      ...hrmsNavigation.destinations.flatMap((destination): RouteObject[] => {
        const isAdministration = destination.id === 'administration';
        const isSettings = destination.id === 'settings';

        return [
          {
            path: destination.segment,
            element: isAdministration ? (
              <Navigate to="/hrms/administration/employee-administration" replace />
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
              isAdministration && child.id === 'employee-administration' ? (
                <EmployeeAdministrationRoute />
              ) : isAdministration && child.id === 'onboarding' ? (
                <EmployeeRegistrationPage />
              ) : isAdministration && child.id === 'documents' ? (
                <ModulePlaceholder
                  application={APPLICATION}
                  destinationId="documents"
                  title="Documents"
                />
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
            handle:
              isAdministration && child.id === 'onboarding'
                ? ({ workspaceVariant: 'flush' } satisfies BezentRouteHandle)
                : undefined,
          })),
        ];
      }),
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
