import { useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useMatches, Navigate } from 'react-router-dom';
import {
  AppShell,
  type ShellRailItem,
  type WorkspaceVariant,
  type BezentRouteHandle,
} from '../../layouts/app-shell';
import { ApprovalsDrawer } from '../../platform/approvals';
import { CalendarDrawer } from '../../platform/calendar';
import { NotesDrawer } from '../../platform/notes';
import { NotificationsPanel } from '../../platform/notifications';
import { GlobalSearch } from '../../platform/search';
import { TasksDrawer, getTaskBadgeCount } from '../../platform/tasks';
import {
  UTILITY_CAPABILITIES,
  UtilityDrawerShell,
  getUtilityCapability,
  useActiveUtility,
  type UtilityCapabilityId,
} from '../../platform/utility-drawer';
import { destinationPath, resolveActiveNavigation } from '../../shared/utils/navigation';
import { findApplicationByPath } from '../config/applications';
import { useTheme } from '../providers/ThemeProvider';
import { toShellLauncher, toShellNavItems } from './shellNavigation';
import { DEV_SEARCH_PROVIDER } from './devSearchFixtures';
import { useDevUtilityData } from './devUtilityFixtures';
import { CustomFieldsProvider } from '../../applications/hrms/settings/context/CustomFieldsContext';
import { useOptionalAuth, resolveProfileIdentity } from '../../platform/auth';
import { landingPath } from '../../platform/auth/landing';

/** Type guard to validate whether an unknown route handle implements BezentRouteHandle. */
function isBezentRouteHandle(handle: unknown): handle is BezentRouteHandle {
  return typeof handle === 'object' && handle !== null && 'workspaceVariant' in handle;
}

/** Rail buttons come from the one capability registry — never listed by hand. */
const RAIL_CAPABILITIES = UTILITY_CAPABILITIES.filter((c) => c.placement === 'rail');

/**
 * Composition root for the global shell: wires the layout-only AppShell to
 * the platform capabilities (search, utility drawers, notifications), the
 * theme, and the router outlet. This is the ONLY place layouts and
 * platform meet — neither imports the other.
 *
 * ONE state (`useActiveUtility`) decides which utility is open, so the
 * rail buttons, the top-nav bell and every close button stay consistent:
 * opening one closes the other, clicking the active one closes it.
 *
 * Navigation comes from the active application's catalog (see
 * applications/hrms/navigation). Initials and all utility/search data are
 * dev-only stand-ins until identity and real providers exist.
 */
export function ShellLayout() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const matches = useMatches();

  // Resolve the active workspace variant from the most specific matched route handle.
  // Defaults to 'default' (floating card workspace) when no handle or override is specified.
  const resolvedWorkspaceVariant: WorkspaceVariant = useMemo(() => {
    for (let i = matches.length - 1; i >= 0; i--) {
      const handle = matches[i]?.handle;
      if (isBezentRouteHandle(handle) && handle.workspaceVariant) {
        return handle.workspaceVariant;
      }
    }
    return 'default';
  }, [matches]);

  // The URL is the single source of truth for selection: the active
  // application, destination and sub-destination are all derived from it.
  const application = findApplicationByPath(pathname);
  const active = application
    ? resolveActiveNavigation(application.navigation, application.basePath, pathname)
    : undefined;
  const activeDestination = application?.navigation.destinations.find(
    (d) => d.id === active?.destinationId,
  );
  const activeId = active?.destinationId;

  const auth = useOptionalAuth();
  const access = auth?.access ?? null;
  const activeCompany = auth?.activeCompany ?? null;
  const can = auth?.can;
  const signOut = auth?.signOut;

  const isAuthorizedForActiveApp = useMemo(() => {
    if (!application || !auth || auth.status !== 'authenticated' || !access) {
      return true;
    }
    const isSuperAdmin = Boolean(
      access.user.isSuperAdmin || access.platformWorkspaces?.includes('super_admin'),
    );
    const isTenantAdmin = Boolean(
      isSuperAdmin ||
      access.isTenantAdmin ||
      access.platformWorkspaces?.includes('tenant_admin') ||
      access.companies.some((c) => c.isTenantAdmin || c.workspaces.includes('tenant_admin')),
    );
    const isCompanyAdmin = Boolean(
      isSuperAdmin ||
      activeCompany?.workspaces.includes('company_admin') ||
      activeCompany?.roles.some((r) => r.code === 'company_admin') ||
      activeCompany?.isPlatformOversight ||
      access.companies.some((c) => c.workspaces.includes('company_admin')),
    );
    const hasHrms = Boolean(activeCompany?.workspaces.includes('hrms'));
    const hasEss = Boolean(activeCompany?.workspaces.includes('ess'));

    switch (application.id) {
      case 'super-admin':
        return isSuperAdmin;
      case 'tenant-admin':
        return isTenantAdmin;
      case 'company-admin':
        return isCompanyAdmin;
      case 'hrms':
        return hasHrms;
      case 'ess':
        return hasEss;
      default:
        return true;
    }
  }, [application, auth, access, activeCompany]);

  const navItems = useMemo(
    () => (application ? toShellNavItems(application, activeId, can) : []),
    [application, activeId, can],
  );
  const utility = useActiveUtility();
  const data = useDevUtilityData();

  const taskBadgeCount = useMemo(() => getTaskBadgeCount(data.tasks), [data.tasks]);
  const railItems: ShellRailItem[] = useMemo(
    () =>
      RAIL_CAPABILITIES.map(({ id, label, icon }) => ({
        id,
        label,
        icon,
        badge: id === 'tasks' ? taskBadgeCount : undefined,
      })),
    [taskBadgeCount],
  );

  const drawerCapability =
    utility.activeId && utility.activeId !== 'notifications'
      ? getUtilityCapability(utility.activeId)
      : undefined;

  function renderDrawer(id: UtilityCapabilityId) {
    switch (id) {
      case 'tasks':
        return (
          <TasksDrawer
            tasks={data.tasks}
            onClose={utility.close}
            onCompleteTask={data.completeTask}
            onViewAll={() => {
              utility.close();
              navigate('/tasks');
            }}
          />
        );
      case 'approvals':
        return (
          <ApprovalsDrawer
            approvals={data.approvals}
            onClose={utility.close}
            onViewAll={() => {
              utility.close();
              navigate('/approvals');
            }}
          />
        );
      case 'calendar':
        return (
          <CalendarDrawer
            events={data.events}
            onClose={utility.close}
            onOpenFullCalendar={() => {
              utility.close();
              navigate('/calendar');
            }}
          />
        );
      case 'notes':
        return (
          <NotesDrawer
            notes={data.notes}
            onClose={utility.close}
            onSave={data.saveNote}
            onDelete={data.deleteNote}
            onTogglePin={data.toggleNotePin}
            onViewAll={() => {
              utility.close();
              navigate('/notes');
            }}
          />
        );
      default:
        return null;
    }
  }

  const { userName, userEmail, userInitials, userRole } = useMemo(
    () => resolveProfileIdentity(access, activeCompany),
    [access, activeCompany],
  );

  const handleSignOut = useCallback(async () => {
    if (signOut) await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  const handleSwitchAccount = useCallback(async () => {
    if (signOut) await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  const handleMyProfile = useCallback(() => {
    if (access?.user.isSuperAdmin && !activeCompany?.essEligible) {
      navigate('/super-admin/settings');
      return;
    }
    if (activeCompany?.essEligible) {
      navigate('/ess/profile');
      return;
    }
    if (activeCompany?.roles.some((r) => r.code === 'company_admin')) {
      navigate('/company-admin/profile');
      return;
    }
    if (application) {
      navigate(`${application.basePath}/employees`);
      return;
    }
    navigate('/ess/profile');
  }, [access, activeCompany, application, navigate]);

  const handleAccountSettings = useCallback(() => {
    if (access?.user.isSuperAdmin && !activeCompany) {
      navigate('/super-admin/settings');
      return;
    }
    if (activeCompany?.roles.some((r) => r.code === 'company_admin')) {
      navigate('/company-admin/settings');
      return;
    }
    if (application) {
      navigate(`${application.basePath}/settings`);
      return;
    }
    navigate('/hrms/settings');
  }, [access, activeCompany, application, navigate]);

  if (!isAuthorizedForActiveApp && access) {
    return <Navigate to={landingPath(access)} replace />;
  }

  return (
    <CustomFieldsProvider>
      <AppShell
        workspaceVariant={resolvedWorkspaceVariant}
        topNavSearch={
          <GlobalSearch
            provider={DEV_SEARCH_PROVIDER}
            contextKey={active?.destinationId}
            contextLabel={activeDestination?.label}
          />
        }
        navItems={navItems}
        activeNavId={active?.destinationId}
        onNavSelect={(id) => {
          const destination = application?.navigation.destinations.find((d) => d.id === id);
          if (application && destination) {
            const navItem = navItems.find((n) => n.id === id);
            const singleChildId =
              navItem?.subItems?.length === 1 ? navItem.subItems[0]?.id : undefined;
            navigate(destinationPath(application.basePath, destination, singleChildId));
          }
        }}
        activeSubId={active?.childId}
        onSubSelect={(itemId, subId) => {
          const destination = application?.navigation.destinations.find((d) => d.id === itemId);
          if (application && destination) {
            navigate(destinationPath(application.basePath, destination, subId));
          }
        }}
        launcher={application ? toShellLauncher(application, active, navigate, can) : undefined}
        userInitials={userInitials}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onMyProfile={handleMyProfile}
        onAccountSettings={handleAccountSettings}
        onSignOut={handleSignOut}
        onSwitchAccount={handleSwitchAccount}
        onSettingsClick={() => navigate('/hrms/settings')}
        notificationCount={data.notifications.filter((n) => !n.read).length}
        notificationsOpen={utility.activeId === 'notifications'}
        onNotificationsToggle={() => utility.toggle('notifications')}
        notificationsPanel={
          utility.activeId === 'notifications' ? (
            <NotificationsPanel
              notifications={data.notifications}
              onClose={utility.close}
              onMarkRead={data.markNotificationRead}
              onMarkAllRead={data.markAllNotificationsRead}
            />
          ) : undefined
        }
        isDarkTheme={resolvedTheme === 'dark'}
        onToggleTheme={toggleTheme}
        railItems={railItems}
        activeRailItemId={drawerCapability?.id}
        onRailItemSelect={(id) => {
          const capability = RAIL_CAPABILITIES.find((c) => c.id === id);
          if (capability) utility.toggle(capability.id);
        }}
        utilityDrawer={
          drawerCapability ? (
            <UtilityDrawerShell
              key={drawerCapability.id}
              title={drawerCapability.title}
              icon={drawerCapability.icon}
              onClose={utility.close}
            >
              {renderDrawer(drawerCapability.id)}
            </UtilityDrawerShell>
          ) : undefined
        }
      >
        <Outlet context={data} />
      </AppShell>
    </CustomFieldsProvider>
  );
}
