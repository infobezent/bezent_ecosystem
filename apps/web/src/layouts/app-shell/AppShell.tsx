import { useState, type ReactNode } from 'react';
import { TopNav } from './TopNav';
import { LeftSidebar } from './LeftSidebar';
import { RightRail } from './RightRail';
import { BottomBar } from './BottomBar';
import { MoreLauncher } from './MoreLauncher';
import type { ShellLauncher, ShellNavItem, ShellRailItem } from './types';
import './AppShell.css';

export interface AppShellProps {
  /** Global Search (or a replacement) rendered in the top nav. The shell never imports it. */
  topNavSearch?: ReactNode;
  navItems: ShellNavItem[];
  activeNavId?: string;
  onNavSelect?: (id: string) => void;
  /** Selected sub-destination of the active nav item, and its selection callback. */
  activeSubId?: string;
  onSubSelect?: (itemId: string, subId: string) => void;
  /** More launcher data; when omitted the sidebar has no More button. */
  launcher?: ShellLauncher;
  /** Initials shown in the profile avatar. */
  userInitials: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  onMyProfile?: () => void;
  onAccountSettings?: () => void;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
  onHelp?: () => void;
  /** Unread count for the top-nav bell; the badge is hidden when 0/undefined. */
  notificationCount?: number;
  /** Theme is owned by ThemeProvider (app/providers); the shell only renders the control. */
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  /** Right-rail buttons, active one, and selection callback. */
  railItems: ShellRailItem[];
  activeRailItemId?: string;
  onRailItemSelect?: (id: string) => void;
  /** Docked utility drawer (rendered next to the rail; the workspace narrows while present). */
  utilityDrawer?: ReactNode;
  /** Notification panel anchored to the top-nav bell. */
  notificationsPanel?: ReactNode;
  notificationsOpen?: boolean;
  onNotificationsToggle?: () => void;
  /** Main workspace content (the router outlet). */
  children: ReactNode;
}

/**
 * The single global BEZENT application shell: top nav, left sidebar,
 * main workspace, right utility rail, bottom bar. It owns page
 * composition only — no business logic, data or API calls — so HRMS and
 * every future application render inside it. See
 * docs/architecture/APPSHELL.md.
 *
 * The right rail's collapsed/expanded state lives here because the grid
 * column width depends on it.
 */
export function AppShell({
  topNavSearch,
  navItems,
  activeNavId,
  onNavSelect,
  activeSubId,
  onSubSelect,
  launcher,
  userInitials,
  userName,
  userEmail,
  userRole,
  onMyProfile,
  onAccountSettings,
  onSignOut,
  onSwitchAccount,
  onHelp,
  notificationCount,
  isDarkTheme,
  onToggleTheme,
  railItems,
  activeRailItemId,
  onRailItemSelect,
  utilityDrawer,
  notificationsPanel,
  notificationsOpen,
  onNotificationsToggle,
  children,
}: AppShellProps) {
  const [railOpen, setRailOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  // More shows a marker when the active destination lives only in the launcher.
  const moreActive =
    !!launcher?.activeItemId &&
    launcher.items.some((i) => i.id === launcher.activeItemId) &&
    !navItems.some((n) => n.id === launcher.activeItemId);

  return (
    <div
      className={[
        'app-shell',
        railOpen && 'app-shell--rail-open',
        utilityDrawer && 'app-shell--drawer-open',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <TopNav
        userInitials={userInitials}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onMyProfile={onMyProfile}
        onAccountSettings={onAccountSettings}
        onSignOut={onSignOut}
        onSwitchAccount={onSwitchAccount}
        onHelp={onHelp}
        notificationCount={notificationCount}
        search={topNavSearch}
        notificationsPanel={notificationsPanel}
        notificationsOpen={notificationsOpen}
        onNotificationsToggle={onNotificationsToggle}
      />
      <LeftSidebar
        items={navItems}
        activeId={activeNavId}
        onSelect={(id) => {
          setMoreOpen(false);
          onNavSelect?.(id);
        }}
        activeSubId={activeSubId}
        onSubSelect={onSubSelect}
        more={
          launcher
            ? { active: moreActive, open: moreOpen, onToggle: () => setMoreOpen((v) => !v) }
            : undefined
        }
      />
      {launcher && moreOpen && (
        <MoreLauncher
          categories={launcher.categories}
          items={launcher.items}
          activeItemId={launcher.activeItemId}
          onSelect={launcher.onSelect}
          onClose={() => setMoreOpen(false)}
        />
      )}
      <main className="app-shell__workspace">{children}</main>
      {utilityDrawer && <div className="app-shell__drawer">{utilityDrawer}</div>}
      <RightRail
        open={railOpen}
        onOpenChange={setRailOpen}
        isDarkTheme={isDarkTheme}
        onToggleTheme={onToggleTheme}
        items={railItems}
        activeItemId={activeRailItemId}
        onItemSelect={onRailItemSelect}
      />
      <BottomBar />
    </div>
  );
}
