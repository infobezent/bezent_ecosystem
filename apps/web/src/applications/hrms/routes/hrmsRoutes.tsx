import { Navigate, type RouteObject } from 'react-router-dom';
import { hrmsNavigation } from '../navigation';
import { ModulePlaceholder } from '../pages/ModulePlaceholder';
import { OnboardingPage } from '../onboarding';
import { SettingsPage } from '../settings';
import { destinationPath } from '../../../shared/utils/navigation';

export const HRMS_BASE_PATH = '/hrms';
export const HRMS_DEFAULT_DESTINATION_ID = 'dashboard';

const APPLICATION = 'HRMS';

/**
 * HRMS routes, generated from the ONE canonical navigation catalog — there
 * is no separate route map to keep in sync.
 *
 * Milestone 1 renders the real OnboardingPage for `/hrms/onboarding` and its
 * primary child `/hrms/onboarding/new-hires`.
 * HRMS Settings renders the real SettingsPage for `/hrms/settings` and `/hrms/onboarding/workflow-settings`.
 * Every other destination and sub-destination renders the development placeholder.
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
        const isOnboarding = destination.id === 'onboarding';
        const isSettings = destination.id === 'settings';

        return [
          {
            path: destination.segment,
            element: isOnboarding ? (
              <OnboardingPage />
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
              isOnboarding && child.id === 'new-hires' ? (
                <OnboardingPage />
              ) : isOnboarding && child.id === 'workflow-settings' ? (
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
