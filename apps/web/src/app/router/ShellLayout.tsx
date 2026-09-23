import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, type ShellRailItem } from '../../layouts/app-shell';
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
  const navItems = useMemo(
    () => (application ? toShellNavItems(application, activeId) : []),
    [application, activeId],
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

  return (
    <CustomFieldsProvider>
      <AppShell
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
            navigate(destinationPath(application.basePath, destination));
          }
        }}
        activeSubId={active?.childId}
        onSubSelect={(itemId, subId) => {
          const destination = application?.navigation.destinations.find((d) => d.id === itemId);
          if (application && destination) {
            navigate(destinationPath(application.basePath, destination, subId));
          }
        }}
        launcher={application ? toShellLauncher(application, active, navigate) : undefined}
        userInitials="SD"
        userName="Sabin Davis"
        userEmail="sabin.d@bezent.com"
        userRole="Administrator • HRMS"
        onMyProfile={() => {
          if (application) {
            navigate(`${application.basePath}/employees`);
          }
        }}
        onAccountSettings={() => {
          if (application) {
            navigate(`${application.basePath}/settings`);
          }
        }}
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
