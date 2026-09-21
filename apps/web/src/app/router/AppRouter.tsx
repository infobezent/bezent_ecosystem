import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { destinationPath } from '../../shared/utils/navigation';
import { APPLICATIONS, DEFAULT_APPLICATION } from '../config/applications';
import { DevPlaceholderPage } from './DevPlaceholderPage';
import { NotFoundPage } from './NotFoundPage';
import { ShellLayout } from './ShellLayout';

const defaultDestination = DEFAULT_APPLICATION.navigation.destinations.find(
  (d) => d.id === DEFAULT_APPLICATION.defaultDestinationId,
)!;
const homePath = destinationPath(DEFAULT_APPLICATION.basePath, defaultDestination);

/**
 * Root router composition. Every route renders inside the global AppShell
 * (see ShellLayout). Each business application contributes its own routes
 * (HRMS: applications/hrms/routes, generated from its navigation catalog);
 * this file only mounts them — it defines no application destinations.
 */
const router = createBrowserRouter([
  {
    element: <ShellLayout />,
    children: [
      { path: '/', element: <Navigate to={homePath} replace /> },
      ...APPLICATIONS.flatMap((application) => application.routes),
      // Development-only design-system verification page. Registered only in
      // dev builds, so it is absent from production bundles and navigation.
      ...(import.meta.env.DEV ? [{ path: '/dev', element: <DevPlaceholderPage /> }] : []),
      { path: '*', element: <NotFoundPage homePath={homePath} /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
