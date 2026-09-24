import { useState } from 'react';
import { BezentIcon, CompanionIcon, type BezentIconName } from '../../design-system/icons';
import type { ShellRailItem } from './types';
import { Tooltip } from '../../design-system/components';
import './RightRail.css';

export interface RightRailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDarkTheme: boolean;
  onToggleTheme?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  /** Utility capability buttons, supplied by the host. */
  items: ShellRailItem[];
  activeItemId?: string;
  onItemSelect?: (id: string) => void;
  onCompose?: () => void;
  onAddon?: () => void;
  onAI?: () => void;
  onQuickCreate?: () => void;
  notificationCount?: number;
  notificationsOpen?: boolean;
  onNotificationsToggle?: () => void;
  onAccountSettings?: () => void;
}

/**
 * Right utility rail: matches Google Workspace right companion sidebar.
 * Houses AI companion, Quick Create, productivity utilities, notifications, and settings.
 */
export function RightRail({
  open,
  onOpenChange,
  isDarkTheme,
  onToggleTheme,
  items,
  activeItemId,
  onItemSelect,
  onCompose,
  onAddon,
  onAI,
  onQuickCreate,
  onAccountSettings,
}: RightRailProps) {
  const [aiHovered, setAiHovered] = useState(false);
  const [createHovered, setCreateHovered] = useState(false);
  const [settingsHovered, setSettingsHovered] = useState(false);
  const [addonHovered, setAddonHovered] = useState(false);

  return (
    <>
      {!open && (
        <button
          type="button"
          className="right-rail__edge-tab"
          aria-label="Expand utility panel"
          onClick={() => onOpenChange(true)}
        >
          <BezentIcon
            name="chevronLeft"
            size={14}
            color="var(--accent-primary)"
            strokeWidth={2.4}
          />
        </button>
      )}

      <aside className="right-rail" aria-label="Utilities">
        {open && (
          <>
            <div className="right-rail__top">
              {/* BEZENT AI Hero Button */}
              <div className="right-rail__anchor">
                <button
                  type="button"
                  className="right-rail__ai-btn"
                  aria-label="BEZENT AI"
                  onClick={onAI}
                  onMouseEnter={() => setAiHovered(true)}
                  onMouseLeave={() => setAiHovered(false)}
                >
                  <BezentIcon name="sparkles" size={20} color="currentColor" />
                </button>
                {aiHovered && <Tooltip label="BEZENT AI" direction="left" />}
              </div>

              {/* Quick Create Action */}
              <div className="right-rail__anchor">
                <button
                  type="button"
                  className="right-rail__action-btn"
                  aria-label="Quick Create"
                  onClick={onQuickCreate || onCompose}
                  onMouseEnter={() => setCreateHovered(true)}
                  onMouseLeave={() => setCreateHovered(false)}
                >
                  <BezentIcon
                    name="plusSign"
                    size={20}
                    color="var(--bezent-logo-text, #001D35)"
                    strokeWidth={2}
                  />
                </button>
                {createHovered && <Tooltip label="Quick Create" direction="left" />}
              </div>
            </div>

            <div className="right-rail__divider" aria-hidden="true" />

            <div className="right-rail__items">
              <div className="right-rail__group">
                {items.map((item) => (
                  <RailButton
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    badge={item.badge}
                    active={item.id === activeItemId}
                    onClick={() => onItemSelect?.(item.id)}
                  />
                ))}
              </div>

              {onAddon && (
                <div className="right-rail__anchor">
                  <button
                    type="button"
                    className="bezent-right-rail-btn"
                    aria-label="Get add-ons"
                    onClick={onAddon}
                    onMouseEnter={() => setAddonHovered(true)}
                    onMouseLeave={() => setAddonHovered(false)}
                  >
                    <BezentIcon
                      name="plusSign"
                      size={20}
                      color="var(--right-rail-icon-default)"
                      strokeWidth={1.8}
                    />
                  </button>
                  {addonHovered && <Tooltip label="Get add-ons" direction="left" />}
                </div>
              )}
            </div>

            <div className="right-rail__footer">
              <ThemeButton isDark={isDarkTheme} onToggle={onToggleTheme} />
              <div className="right-rail__anchor">
                <button
                  type="button"
                  className="bezent-right-rail-btn"
                  aria-label="Settings"
                  onClick={onAccountSettings}
                  onMouseEnter={() => setSettingsHovered(true)}
                  onMouseLeave={() => setSettingsHovered(false)}
                >
                  <BezentIcon
                    name="settings"
                    size={20}
                    color="var(--right-rail-icon-default, #444746)"
                    strokeWidth={1.8}
                  />
                </button>
                {settingsHovered && <Tooltip label="Settings" direction="left" />}
              </div>
              <button
                type="button"
                className="right-rail__collapse"
                aria-label="Collapse utility panel"
                onClick={() => onOpenChange(false)}
              >
                <BezentIcon
                  name="chevronRight"
                  size={18}
                  color="var(--right-rail-icon-default, #444746)"
                  strokeWidth={2.2}
                />
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function RailButton({
  id,
  label,
  icon,
  badge,
  active,
  onClick,
}: {
  id: string;
  label: string;
  icon: BezentIconName;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="right-rail__anchor">
      <button
        type="button"
        data-item-id={id}
        aria-label={label}
        aria-pressed={active}
        className={`bezent-right-rail-btn ${active ? 'is-active' : ''}`.trim()}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <CompanionIcon name={id || icon} size={22} active={active} />
        {typeof badge === 'number' && badge > 0 && (
          <span className="right-rail__badge-dot" aria-label={`${badge} updates`} />
        )}
      </button>
      {hovered && <Tooltip label={label} direction="left" />}
    </div>
  );
}

function ThemeButton({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isArcPulse, setIsArcPulse] = useState(false);
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsArcPulse(true);
    setTimeout(() => setIsArcPulse(false), 850);
    onToggle?.(e);
  };

  return (
    <div className="right-rail__anchor">
      <button
        type="button"
        className={`right-rail__theme ${isArcPulse ? 'is-arc-pulse' : ''}`.trim()}
        aria-label={label}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="right-rail__theme-icon-wrap">
          <BezentIcon
            name={isDark ? 'sun' : 'moon'}
            size={19}
            color="currentColor"
            strokeWidth={1.8}
          />
        </span>
      </button>
      {hovered && <Tooltip label={label} direction="left" />}
    </div>
  );
}
