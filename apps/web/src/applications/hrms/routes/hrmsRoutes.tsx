import { Navigate, type RouteObject } from 'react-router-dom';
import { hrmsNavigation } from '../navigation';
import { ModulePlaceholder } from '../pages/ModulePlaceholder';
import { destinationPath } from '../../../shared/utils/navigation';

export const HRMS_BASE_PATH = '/hrms';
export const HRMS_DEFAULT_DESTINATION_ID = 'dashboard';

const APPLICATION = 'HRMS';

/**
 * HRMS routes, generated from the ONE canonical navigation catalog — there
 * is no separate route map to keep in sync. Every destination and
 * sub-destination renders the development placeholder until its module is
 * built; `/hrms` redirects to the default destination and unknown HRMS
 * addresses show a not-available placeholder inside the shell.
 *
 * Paths are relative to the router root (no leading slash), so the global
 * router can mount them directly as children of the shell route.
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
      ...hrmsNavigation.destinations.flatMap((destination): RouteObject[] => [
        {
          path: destination.segment,
          element: (
            <ModulePlaceholder
              application={APPLICATION}
              destinationId={destination.id}
              title={destination.label}
            />
          ),
        },
        ...(destination.children ?? []).map((child): RouteObject => ({
          path: `${destination.segment}/${child.id}`,
          element: (
            <ModulePlaceholder
              application={APPLICATION}
              destinationId={destination.id}
              title={destination.label}
              section={child.label}
              sectionId={child.id}
            />
          ),
        })),
      ]),
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
