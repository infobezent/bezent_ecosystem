import { useState, type ReactNode } from 'react';
import { BezentIcon } from '../../design-system/icons';
import { Avatar, Badge, IconButton } from '../../design-system/components';
import { ProfileMenu } from './ProfileMenu';
import './TopNav.css';

export interface TopNavProps {
  userInitials: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  notificationCount?: number;
  /** Global Search (or any replacement), supplied by the host. */
  search?: ReactNode;
  /** Notifications panel (rendered by the host) and its open state / toggle. */
  notificationsPanel?: ReactNode;
  notificationsOpen?: boolean;
  onNotificationsToggle?: () => void;
  onMyProfile?: () => void;
  onAccountSettings?: () => void;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
  onHelp?: () => void;
  onSettingsClick?: () => void;
}

/**
 * Global top navigation: branding, search area, utility controls, profile.
 * Replicates the clean Google Workspace / Gmail top navigation pattern with BEZENT contents.
 */
export function TopNav({
  userInitials,
  userName = 'Sabin Davis',
  userEmail = 'sabin.d@bezent.com',
  userRole = 'Administrator • HRMS',
  notificationCount = 0,
  search,
  notificationsPanel,
  notificationsOpen = false,
  onNotificationsToggle,
  onMyProfile,
  onAccountSettings,
  onSignOut,
  onSwitchAccount,
  onHelp,
  onSettingsClick,
}: TopNavProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const handleSettingsClick = onSettingsClick || onAccountSettings;

  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <div className="top-nav__logo" aria-hidden="true">
          BZ
        </div>
        <span className="top-nav__wordmark">BEZENT</span>
      </div>

      {/* Search is composed in by the host (platform/search); TopNav only owns its place. */}
      <div className="top-nav__search-slot">{search}</div>

      <div className="top-nav__actions">
        <div className={`top-nav__bell ${notificationsOpen ? 'is-open' : ''}`.trim()}>
          <IconButton
            label="Notifications"
            active={notificationsOpen}
            onClick={onNotificationsToggle}
            data-notifications-toggle=""
          >
            <BezentIcon
              name="notifications"
              size={20}
              color="var(--top-utility-icon)"
              strokeWidth={1.8}
            />
            {notificationCount > 0 && (
              <span className="top-nav__bell-badge">
                <Badge count={notificationCount} />
              </span>
            )}
          </IconButton>
          {notificationsOpen && <span className="top-nav__bell-connector" aria-hidden="true" />}
        </div>

        <IconButton label="Settings" onClick={handleSettingsClick} data-settings-button="">
          <BezentIcon name="settings" size={20} color="var(--top-utility-icon)" strokeWidth={1.8} />
        </IconButton>

        <IconButton label="Quick Create" variant="solid">
          <BezentIcon name="plusSign" size={20} color="currentColor" strokeWidth={2} />
        </IconButton>

        <button type="button" className="top-nav__ai" aria-label="BEZENT AI">
          <BezentIcon name="sparkles" size={16} color="currentColor" />
          <span>BEZENT AI</span>
        </button>

        <IconButton label="App Launcher">
          <BezentIcon name="apps" size={20} color="var(--top-utility-icon)" strokeWidth={1.8} />
        </IconButton>

        <div className="top-nav__profile-anchor">
          <button
            type="button"
            className={`top-nav__profile ${profileOpen ? 'is-active' : ''}`.trim()}
            aria-label="Profile and account menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <Avatar initials={userInitials} />
          </button>

          <ProfileMenu
            isOpen={profileOpen}
            onClose={() => setProfileOpen(false)}
            userInitials={userInitials}
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            onMyProfile={onMyProfile}
            onAccountSettings={onAccountSettings}
            onSignOut={onSignOut}
            onSwitchAccount={onSwitchAccount}
            onHelp={onHelp}
          />
        </div>
      </div>

      {notificationsPanel}
    </header>
  );
}
