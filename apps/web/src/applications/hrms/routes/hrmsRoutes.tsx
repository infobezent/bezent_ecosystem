import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { hrmsNavigation } from '../navigation';
import { ModulePlaceholder } from '../pages/ModulePlaceholder';
import { OnboardingPage } from '../onboarding';
import { TransfersPage } from '../transfers';
import { PromotionsPage } from '../promotions';
import { OffboardingPage } from '../offboarding';
import { EmployeeAdministrationPage } from '../employee-administration';
import { DocumentsPage } from '../documents';
import { RecordsPage } from '../records';
import { WorkforceOverviewPage } from '../overview';
import { SettingsPage } from '../settings';
import { EmployeeDirectoryPage, EmployeeProfilePage, EMPLOYEES_PATH } from '../employees';
import {
  AttendanceOverviewPage,
  DailyAttendanceLogPage,
  MonthlyAttendanceSummaryPage,
  PunchLogsPage,
  AttendanceRegularizationPage,
  AttendanceOnDutyPage,
  AttendanceOvertimePage,
  AttendanceCompOffPage,
  AttendanceExceptionsPage,
  AttendanceReportsPage,
} from '../attendance';
import {
  HiringOverviewPage,
  JobOpeningsPage,
  CandidatesPage,
  HiringPipelinePage,
  InterviewsPage,
  AssessmentsPage,
  OffersPage,
  OnboardingHandoffPage,
  TalentPoolPage,
  HiringReportsPage,
} from '../recruitment';
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
 * Workforce maps:
 * - overview -> Workforce Overview placeholder
 * - employees -> canonical Employee Directory; employees/:employeeId -> canonical Employee Profile
 * - onboarding -> Direct Employee Registration and onboarding pipeline workspace
 * - transfers -> Employee Administration action queue filtered to Transfers
 * - promotions -> Employee Administration action queue filtered to Job Changes / Promotions
 * - offboarding -> Employee Administration action queue filtered to Separations / Offboarding
 * - records -> Documents main page (canonical workforce documents & records)
 *
 * Backward-compatible aliases ensure legacy `/hrms/administration/*`, `/hrms/onboarding`,
 * and `/hrms/administrative` deep links resolve.
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
        const isWorkforce = destination.id === 'workforce';
        const isSettings = destination.id === 'settings';
        const isAttendance = destination.id === 'attendance';
        const isRecruitment = destination.id === 'recruitment';
        // Workforce, Attendance, and Recruitment land on Overview.
        return [
          {
            path: destination.segment,
            element: isWorkforce ? (
              <Navigate to="/hrms/workforce/overview" replace />
            ) : isSettings ? (
              <SettingsPage />
            ) : isAttendance ? (
              <Navigate to="/hrms/attendance/overview" replace />
            ) : isRecruitment ? (
              <Navigate to="/hrms/recruitment/overview" replace />
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
              isWorkforce && child.id === 'overview' ? (
                <WorkforceOverviewPage />
              ) : isWorkforce && child.id === 'employees' ? (
                <EmployeeDirectoryPage />
              ) : isWorkforce && child.id === 'onboarding' ? (
                <OnboardingPage title="Onboarding" />
              ) : isWorkforce && child.id === 'transfers' ? (
                <TransfersPage />
              ) : isWorkforce && child.id === 'promotions' ? (
                <PromotionsPage />
              ) : isWorkforce && child.id === 'offboarding' ? (
                <OffboardingPage />
              ) : isWorkforce && child.id === 'records' ? (
                <RecordsPage />
              ) : isSettings ? (
                <SettingsPage />
              ) : isAttendance && child.id === 'overview' ? (
                <AttendanceOverviewPage />
              ) : isAttendance && child.id === 'daily-log' ? (
                <DailyAttendanceLogPage />
              ) : isAttendance && child.id === 'monthly-summary' ? (
                <MonthlyAttendanceSummaryPage />
              ) : isAttendance && child.id === 'punch-logs' ? (
                <PunchLogsPage />
              ) : isAttendance && child.id === 'regularization' ? (
                <AttendanceRegularizationPage />
              ) : isAttendance && child.id === 'on-duty' ? (
                <AttendanceOnDutyPage />
              ) : isAttendance && child.id === 'overtime' ? (
                <AttendanceOvertimePage />
              ) : isAttendance && child.id === 'comp-off' ? (
                <AttendanceCompOffPage />
              ) : isAttendance && child.id === 'exceptions' ? (
                <AttendanceExceptionsPage />
              ) : isAttendance && child.id === 'reports' ? (
                <AttendanceReportsPage />
              ) : isRecruitment && child.id === 'overview' ? (
                <HiringOverviewPage />
              ) : isRecruitment && child.id === 'job-openings' ? (
                <JobOpeningsPage />
              ) : isRecruitment && child.id === 'candidates' ? (
                <CandidatesPage />
              ) : isRecruitment && child.id === 'pipeline' ? (
                <HiringPipelinePage />
              ) : isRecruitment && child.id === 'interviews' ? (
                <InterviewsPage />
              ) : isRecruitment && child.id === 'assessments' ? (
                <AssessmentsPage />
              ) : isRecruitment && child.id === 'offers' ? (
                <OffersPage />
              ) : isRecruitment && child.id === 'onboarding-handoff' ? (
                <OnboardingHandoffPage />
              ) : isRecruitment && child.id === 'talent-pool' ? (
                <TalentPoolPage />
              ) : isRecruitment && child.id === 'reports' ? (
                <HiringReportsPage />
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
      // Legacy attendance policy path redirected to HR Settings -> Attendance
      {
        path: 'attendance/policies',
        element: <Navigate to="/hrms/settings?module=attendance" replace />,
      },
      // Canonical Employee Profile (under Workforce and legacy Administration)
      {
        path: 'workforce/employees/:employeeId',
        element: <EmployeeProfilePage />,
      },
      {
        path: 'administration/employees/:employeeId',
        element: <EmployeeProfilePage />,
      },

      // Legacy top-level Employees URL (redirects to canonical Workforce / Employees)
      {
        path: 'employees',
        element: <Navigate to={EMPLOYEES_PATH} replace />,
      },

      // Backward-compatible routes for existing Administration & legacy deep links
      {
        path: 'administration',
        element: <Navigate to="/hrms/workforce/overview" replace />,
      },
      {
        path: 'administration/employees',
        element: <EmployeeDirectoryPage />,
      },
      {
        path: 'administration/onboarding',
        element: <OnboardingPage title="Onboarding" />,
      },
      {
        path: 'administration/employee-administration',
        element: (
          <EmployeeAdministrationPage
            title="Employee Administration"
            subtitle="Manage employee changes, confirmations, transfers and employment actions."
            defaultCategory="all"
          />
        ),
      },
      {
        path: 'administration/documents',
        element: <DocumentsPage />,
      },
      {
        path: 'administration/*',
        element: <Navigate to="/hrms/workforce/overview" replace />,
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
        element: <Navigate to="/hrms/workforce/onboarding" replace />,
      },
      {
        path: 'administrative/employee-administration',
        element: <Navigate to="/hrms/workforce/transfers" replace />,
      },
      {
        path: 'administrative/onboarding',
        element: <Navigate to="/hrms/workforce/onboarding" replace />,
      },
      {
        path: 'administrative/documents',
        element: <Navigate to="/hrms/workforce/records" replace />,
      },
      {
        path: 'administrative/*',
        element: <Navigate to="/hrms/workforce/overview" replace />,
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
        element: (
          <Navigate
            to="/hrms/settings/administration?tab=employee-configuration&sub=designations"
            replace
          />
        ),
      },
      {
        path: 'settings/organization/locations',
        element: <Navigate to="/company-admin/organization/work-locations" replace />,
      },
      {
        path: 'settings/organization/job-levels',
        element: (
          <Navigate
            to="/hrms/settings/administration?tab=employee-configuration&sub=job-levels"
            replace
          />
        ),
      },
      {
        path: 'settings/organization',
        element: <Navigate to="/company-admin/organization" replace />,
      },
      {
        path: 'organization/job-levels',
        element: (
          <Navigate
            to="/hrms/settings/administration?tab=employee-configuration&sub=job-levels"
            replace
          />
        ),
      },
      {
        path: 'organization/locations',
        element: <Navigate to="/company-admin/organization/work-locations" replace />,
      },
      {
        path: 'organization/designations',
        element: (
          <Navigate
            to="/hrms/settings/administration?tab=employee-configuration&sub=designations"
            replace
          />
        ),
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
