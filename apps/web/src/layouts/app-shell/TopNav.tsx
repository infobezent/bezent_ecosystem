import { useState, type ReactNode } from 'react';
import { BezentIcon } from '../../design-system/icons';
import { Avatar, IconButton, Badge } from '../../design-system/components';
import { ProfileMenu } from './ProfileMenu';
import bezentMark from '../../assets/bezent-mark.png';
import bezentWordmarkLight from '../../assets/bezent-wordmark-light.png';
import bezentWordmarkDark from '../../assets/bezent-wordmark-dark.png';
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
  userName = 'User',
  userEmail = '',
  userRole = 'Member',
  notificationCount,
  search,
  notificationsPanel,
  notificationsOpen,
  onNotificationsToggle,
  onMyProfile,
  onAccountSettings,
  onSignOut,
  onSwitchAccount,
  onHelp,
}: TopNavProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <div className="top-nav__logo" aria-hidden="true">
          <img src={bezentMark} alt="" className="top-nav__logo-img" />
        </div>
        <span className="top-nav__wordmark" aria-label="BEZENT">
          <img
            src={bezentWordmarkLight}
            alt="BEZENT"
            className="top-nav__wordmark-img top-nav__wordmark-img--light"
          />
          <img
            src={bezentWordmarkDark}
            alt="BEZENT"
            className="top-nav__wordmark-img top-nav__wordmark-img--dark"
          />
        </span>
      </div>

      {/* Search is composed in by the host (platform/search); TopNav only owns its place. */}
      <div className="top-nav__search-slot">{search}</div>

      <div className="top-nav__actions">
        <div className={`top-nav__bell ${notificationsOpen ? 'is-open' : ''}`.trim()}>
          <IconButton
            label="Notifications"
            data-notifications-toggle=""
            active={notificationsOpen}
            onClick={onNotificationsToggle}
          >
            <BezentIcon
              name="notifications"
              size={20}
              color="var(--top-utility-icon)"
              strokeWidth={1.8}
            />
          </IconButton>
          {notificationCount !== undefined && notificationCount > 0 && (
            <span className="top-nav__bell-badge">
              <Badge count={notificationCount} />
            </span>
          )}
        </div>

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
