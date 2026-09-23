import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { destinationPath } from '../../shared/utils/navigation';
import { APPLICATIONS, DEFAULT_APPLICATION } from '../config/applications';
import { CalendarPage } from '../../platform/calendar';
import { TasksPage } from '../../platform/tasks';
import { ApprovalsPage } from '../../platform/approvals';
import { NotesPage } from '../../platform/notes';
import { DevPlaceholderPage } from './DevPlaceholderPage';
import { DesignSystemShowcase } from './DesignSystemShowcase';
import { NotFoundPage } from './NotFoundPage';
import { ShellLayout } from './ShellLayout';
import { StandaloneUtilityLayout } from './StandaloneUtilityLayout';

const defaultDestination = DEFAULT_APPLICATION.navigation.destinations.find(
  (d) => d.id === DEFAULT_APPLICATION.defaultDestinationId,
)!;
const homePath = destinationPath(DEFAULT_APPLICATION.basePath, defaultDestination);

/**
 * Root router composition. Applications mount under ShellLayout, while the
 * four standalone utilities (Calendar, Tasks, Approvals, Notes) mount in their
 * own StandaloneUtilityLayout without application navigation bars.
 */
const router = createBrowserRouter([
  {
    element: <ShellLayout />,
    children: [
      { path: '/', element: <Navigate to={homePath} replace /> },
      ...APPLICATIONS.flatMap((application) => application.routes),
      // Development-only pages. Excluded from production bundles.
      ...(import.meta.env.DEV
        ? [
            { path: '/dev', element: <DevPlaceholderPage /> },
            { path: '/dev/design-system', element: <DesignSystemShowcase /> },
          ]
        : []),
      { path: '*', element: <NotFoundPage homePath={homePath} /> },
    ],
  },
  {
    element: <StandaloneUtilityLayout />,
    children: [
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/approvals', element: <ApprovalsPage /> },
      { path: '/notes', element: <NotesPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
