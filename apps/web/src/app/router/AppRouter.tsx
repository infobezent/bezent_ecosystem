import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { destinationPath } from '../../shared/utils/navigation';
import { CalendarPage } from '../../platform/calendar';
import { TasksPage } from '../../platform/tasks';
import { ApprovalsPage } from '../../platform/approvals';
import { NotesPage } from '../../platform/notes';
import { EmployeeRegistrationPage } from '../../applications/hrms/onboarding';
import { EmployeeEditPage } from '../../applications/hrms/employees/pages/EmployeeEditPage';
import { FormEditorPage } from '../../applications/hrms/settings/administration/forms';
import { DevPlaceholderPage } from './DevPlaceholderPage';
import { DesignSystemShowcase } from './DesignSystemShowcase';
import { NotFoundPage } from './NotFoundPage';
import { ShellLayout } from './ShellLayout';
import { LoginPage, RequireAuth, useAuth } from '../../platform/auth';
import { landingPath } from '../../platform/auth/landing';
import { StandaloneUtilityLayout } from './StandaloneUtilityLayout';
import { hrmsApplication } from '../../applications/hrms';
import {
  superAdminRoutes,
  RequireSuperAdminWorkspace,
} from '../../administration/super-admin/routes/superAdminRoutes';
import {
  tenantAdminRoutes,
  RequireTenantAdminWorkspace,
} from '../../administration/tenant-admin/routes/tenantAdminRoutes';
import {
  companyAdminRoutes,
  RequireCompanyAdminWorkspace,
} from '../../applications/company-admin/routes/companyAdminRoutes';
import { hrmsRoutes, RequireHrmsWorkspace } from '../../applications/hrms/routes/hrmsRoutes';
import { essRoutes, RequireEssWorkspace } from '../../applications/hrms/ess/routes/essRoutes';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/**
 * Workspace-aware root redirect. Reads the live auth state so that an Employee
 * landing on `/` is directed to `/ess` — not `/hrms` — without the backend
 * needing to repeat the destination on every restore.
 * RequireAuth is the parent, so by the time this renders status is 'authenticated'.
 */
function WorkspaceRedirect() {
  const { access } = useAuth();
  if (!access) return null;
  return <Navigate to={landingPath(access)} replace />;
}

// Fallback homePath for the 404 page. Uses the HRMS dashboard path as the
// universal "go home" when the active application cannot be determined.
const hrmsFallbackPath = destinationPath(
  hrmsApplication.basePath,
  hrmsApplication.navigation.destinations.find(
    (d) => d.id === hrmsApplication.defaultDestinationId,
  )!,
);

/**
 * Root router composition.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * Workspace authorization guards (RequireSuperAdminWorkspace, RequireCompanyAdminWorkspace,
 * RequireHrmsWorkspace, RequireEssWorkspace) are mounted STRICTLY ABOVE ShellLayout.
 *
 * An unauthorized user attempting to access another workspace route (e.g., HR user visiting
 * /super-admin/provisioning or Employee visiting /hrms/leave) is intercepted and redirected
 * BEFORE the unauthorized workspace shell or navigation items can ever render.
 */
export const appRoutes: RouteObject[] = [
  // The ONE sign-in page for every BEZENT user (ADR-018), outside every shell.
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },

  // Root redirect: workspace-aware, routes signed-in users to their authorized workspace.
  {
    path: '/',
    element: (
      <RequireAuth>
        <WorkspaceRedirect />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
  },

  // Standalone utility workspaces (Calendar, Tasks, Approvals, Notes, Employee Registration, Form Editor)
  // These run OUTSIDE the main application ShellLayout as dedicated full-screen workspaces.
  {
    element: (
      <RequireAuth>
        <StandaloneUtilityLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/approvals', element: <ApprovalsPage /> },
      { path: '/notes', element: <NotesPage /> },
      {
        path: '/hrms/workforce/onboarding/registration',
        element: <EmployeeRegistrationPage />,
      },
      {
        path: '/hrms/workforce/onboarding/registration/:caseId',
        element: <EmployeeRegistrationPage />,
      },
      {
        path: '/hrms/administration/onboarding/registration',
        element: <EmployeeRegistrationPage />,
      },
      {
        path: '/hrms/administration/onboarding/registration/:caseId',
        element: <EmployeeRegistrationPage />,
      },
      {
        path: '/hrms/onboarding/registration',
        element: <Navigate to="/hrms/workforce/onboarding/registration" replace />,
      },
      {
        path: '/hrms/onboarding/registration/:caseId',
        element: <EmployeeRegistrationPage />,
      },
      {
        path: '/hrms/settings/forms/:formKey',
        element: <FormEditorPage />,
      },
      {
        path: '/hrms/settings/forms',
        element: <FormEditorPage />,
      },
      {
        path: '/hrms/workforce/employees/:employeeId/edit',
        element: <EmployeeEditPage />,
      },
      {
        path: '/hrms/administration/employees/:employeeId/edit',
        element: <EmployeeEditPage />,
      },
    ],
  },

  // 1. Super Admin Workspace — Workspace Guard is strictly ABOVE the shell layout
  {
    element: (
      <RequireAuth>
        <RequireSuperAdminWorkspace />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <ShellLayout />,
        errorElement: <RouteErrorBoundary />,
        children: superAdminRoutes,
      },
    ],
  },

  // 2. Tenant Admin Workspace — Workspace Guard is strictly ABOVE the shell layout
  {
    element: (
      <RequireAuth>
        <RequireTenantAdminWorkspace />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <ShellLayout />,
        errorElement: <RouteErrorBoundary />,
        children: tenantAdminRoutes,
      },
    ],
  },

  // 3. Company Admin Workspace — Workspace Guard is strictly ABOVE the shell layout
  {
    element: (
      <RequireAuth>
        <RequireCompanyAdminWorkspace />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <ShellLayout />,
        errorElement: <RouteErrorBoundary />,
        children: companyAdminRoutes,
      },
    ],
  },

  // 4. HRMS Administration Workspace — Workspace Guard is strictly ABOVE the shell layout
  {
    element: (
      <RequireAuth>
        <RequireHrmsWorkspace />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <ShellLayout />,
        errorElement: <RouteErrorBoundary />,
        children: hrmsRoutes,
      },
    ],
  },

  // 5. Employee Self Service Workspace — Workspace Guard is strictly ABOVE the shell layout
  {
    element: (
      <RequireAuth>
        <RequireEssWorkspace />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <ShellLayout />,
        errorElement: <RouteErrorBoundary />,
        children: essRoutes,
      },
    ],
  },

  // Development-only pages. Excluded from production bundles.
  ...(import.meta.env.DEV
    ? [
        {
          element: (
            <RequireAuth>
              <ShellLayout />
            </RequireAuth>
          ),
          children: [
            { path: '/dev', element: <DevPlaceholderPage /> },
            { path: '/dev/design-system', element: <DesignSystemShowcase /> },
          ],
        },
      ]
    : []),

  // 404 Fallback: neutral page with safe home navigation
  {
    path: '*',
    element: (
      <RequireAuth>
        <NotFoundPage homePath={hrmsFallbackPath} />
      </RequireAuth>
    ),
  },
];

let router: ReturnType<typeof createBrowserRouter> | undefined;

export function getRouter() {
  if (!router) {
    router = createBrowserRouter(appRoutes);
  }
  return router;
}

export function AppRouter() {
  return <RouterProvider router={getRouter()} />;
}
