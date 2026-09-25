import { Navigate, type RouteObject } from 'react-router-dom';
import { hrmsNavigation } from '../navigation';
import { ModulePlaceholder } from '../pages/ModulePlaceholder';
import { OnboardingPage } from '../onboarding';
import { EmployeeAdministrationPage } from '../employee-administration';
import { DocumentsPage } from '../documents';
import { EMPLOYEES_PATH, EmployeeDirectoryPage, EmployeeProfilePage } from '../employees';
import { SettingsPage } from '../settings';
import { destinationPath } from '../../../shared/utils/navigation';

export const HRMS_BASE_PATH = '/hrms';
export const HRMS_DEFAULT_DESTINATION_ID = 'dashboard';

const APPLICATION = 'HRMS';

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
