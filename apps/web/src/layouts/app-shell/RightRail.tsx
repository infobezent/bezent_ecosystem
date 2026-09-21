import { useState } from 'react';
import { BezentIcon, CompanionIcon, type BezentIconName } from '../../design-system/icons';
import type { ShellRailItem } from './types';
import { Tooltip } from '../../design-system/components';
import './RightRail.css';

export interface RightRailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  /** Utility capability buttons, supplied by the host. */
  items: ShellRailItem[];
  activeItemId?: string;
  onItemSelect?: (id: string) => void;
  onCompose?: () => void;
  onAddon?: () => void;
}

/**
 * Right utility rail: matches Google Workspace right companion sidebar.
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
}: RightRailProps) {
  const [composeHovered, setComposeHovered] = useState(false);
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
            {onCompose && (
              <div className="right-rail__top">
                <div className="right-rail__anchor">
                  <button
                    type="button"
                    className="right-rail__action-btn"
                    aria-label="Compose / New item"
                    onClick={onCompose}
                    onMouseEnter={() => setComposeHovered(true)}
                    onMouseLeave={() => setComposeHovered(false)}
                  >
                    <BezentIcon
                      name="edit"
                      size={20}
                      color="var(--bezent-logo-text, #001D35)"
                      strokeWidth={2}
                    />
                  </button>
                  {composeHovered && <Tooltip label="Compose" direction="left" />}
                </div>
              </div>
            )}

            <div className="right-rail__items">
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

              <div className="right-rail__divider" aria-hidden="true" />

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
            </div>

            <div className="right-rail__footer">
              <ThemeButton isDark={isDarkTheme} onToggle={onToggleTheme} />
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

function ThemeButton({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false);
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <div className="right-rail__anchor">
      <button
        type="button"
        className="right-rail__theme"
        aria-label={label}
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <BezentIcon
          name={isDark ? 'sun' : 'moon'}
          size={19}
          color="currentColor"
          strokeWidth={1.8}
        />
      </button>
      {hovered && <Tooltip label={label} direction="left" />}
    </div>
  );
}
