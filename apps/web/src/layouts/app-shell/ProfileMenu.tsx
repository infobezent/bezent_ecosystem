import { useEffect, useRef } from 'react';
import { Avatar } from '../../design-system/components';
import { BezentIcon } from '../../design-system/icons';
import './ProfileMenu.css';

export interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userInitials: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  onMyProfile?: () => void;
  onAccountSettings?: () => void;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
  onHelp?: () => void;
}

/**
 * BEZENT Profile & Account Dropdown Menu.
 *
 * Modeled after Google Workspace / BEZENT design system:
 * - Profile header with user initials, name, email, and role badge
 * - Navigation to My Profile, Account Settings, Switch Account
 * - Help & Documentation link
 * - Prominent Sign Out action
 */
export function ProfileMenu({
  isOpen,
  onClose,
  userInitials,
  userName = 'Sabin Davis',
  userEmail = 'sabin.d@bezent.com',
  userRole = 'Administrator • HRMS',
  onMyProfile,
  onAccountSettings,
  onSignOut,
  onSwitchAccount,
  onHelp,
}: ProfileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="profile-menu"
      role="menu"
      aria-label="User profile and account options"
      tabIndex={-1}
    >
      <div className="profile-menu__header">
        <div className="profile-menu__avatar-wrapper">
          <Avatar initials={userInitials} size="lg" />
        </div>
        <div className="profile-menu__user-info">
          <div className="profile-menu__name">{userName}</div>
          <div className="profile-menu__email">{userEmail}</div>
          <div className="profile-menu__role-badge">{userRole}</div>
        </div>
        <button
          type="button"
          className="profile-menu__manage-btn"
          onClick={() => {
            onAccountSettings?.();
            onClose();
          }}
        >
          Manage your BEZENT Account
        </button>
      </div>

      <div className="profile-menu__divider" role="separator" />

      <div className="profile-menu__section">
        <button
          type="button"
          className="profile-menu__item"
          role="menuitem"
          onClick={() => {
            onMyProfile?.();
            onClose();
          }}
        >
          <span className="profile-menu__item-icon">
            <BezentIcon name="user" size={18} />
          </span>
          <div className="profile-menu__item-content">
            <span className="profile-menu__item-label">My Profile</span>
            <span className="profile-menu__item-desc">Personal record & employee self-service</span>
          </div>
        </button>

        <button
          type="button"
          className="profile-menu__item"
          role="menuitem"
          onClick={() => {
            onAccountSettings?.();
            onClose();
          }}
        >
          <span className="profile-menu__item-icon">
            <BezentIcon name="settings" size={18} />
          </span>
          <div className="profile-menu__item-content">
            <span className="profile-menu__item-label">Account Settings</span>
            <span className="profile-menu__item-desc">
              Preferences, appearance & system notifications
            </span>
          </div>
        </button>

        <button
          type="button"
          className="profile-menu__item"
          role="menuitem"
          onClick={() => {
            onSwitchAccount?.();
            onClose();
          }}
        >
          <span className="profile-menu__item-icon">
            <BezentIcon name="switchAccount" size={18} />
          </span>
          <div className="profile-menu__item-content">
            <span className="profile-menu__item-label">Switch Account</span>
            <span className="profile-menu__item-desc">Change organization or active role</span>
          </div>
        </button>

        <button
          type="button"
          className="profile-menu__item"
          role="menuitem"
          onClick={() => {
            onHelp?.();
            onClose();
          }}
        >
          <span className="profile-menu__item-icon">
            <BezentIcon name="helpCircle" size={18} />
          </span>
          <div className="profile-menu__item-content">
            <span className="profile-menu__item-label">Help & Support</span>
            <span className="profile-menu__item-desc">Guides, FAQs and documentation</span>
          </div>
        </button>
      </div>

      <div className="profile-menu__divider" role="separator" />

      <div className="profile-menu__footer">
        <button
          type="button"
          className="profile-menu__logout-btn"
          role="menuitem"
          onClick={() => {
            onSignOut?.();
            onClose();
          }}
        >
          <BezentIcon name="logOut" size={18} />
          <span>Sign Out</span>
        </button>

        <div className="profile-menu__legal">
          <span>Privacy Policy</span>
          <span className="profile-menu__legal-dot">•</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </div>
  );
}

export default ProfileMenu;
