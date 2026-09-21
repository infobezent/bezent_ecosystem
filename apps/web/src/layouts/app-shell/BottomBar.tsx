import { useState } from 'react';
import { BezentIcon, type BezentIconName } from '../../design-system/icons';
import { Tooltip } from '../../design-system/components';
import './BottomBar.css';

/** Source: old approved UI `BOTTOM_ITEMS` (`App.tsx` 2044-2050). */
const FOOTER_ITEMS: { icon: BezentIconName; label: string }[] = [
  { icon: 'calendar', label: 'Calendar' },
  { icon: 'whatsNew', label: "What's New" },
  { icon: 'explore', label: 'Explore' },
  { icon: 'announcements', label: 'Announcements' },
  { icon: 'help', label: 'Help' },
];

/**
 * Global bottom bar. Source: old approved UI `BottomBar` / `FooterBtn`
 * (`App.tsx` 2054-2124). The "All Systems Operational" text is static
 * copy exactly as in the old UI — not a live status feed. The footer
 * buttons are inert visual shells.
 */
export function BottomBar() {
  return (
    <footer className="bottom-bar">
      <div className="bottom-bar__meta">
        <span className="bottom-bar__text">&copy; {new Date().getFullYear()} BEZENT</span>
        <span className="bottom-bar__separator" aria-hidden="true" />
        <div className="bottom-bar__status">
          <span className="bottom-bar__status-dot" aria-hidden="true" />
          <span className="bottom-bar__text">All Systems Operational</span>
        </div>
      </div>

      <div className="bottom-bar__actions">
        {FOOTER_ITEMS.map((item) => (
          <FooterButton key={item.label} icon={item.icon} label={item.label} />
        ))}
      </div>
    </footer>
  );
}

function FooterButton({ icon, label }: { icon: BezentIconName; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="bottom-bar__anchor">
      <button
        type="button"
        className="bottom-bar__button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <BezentIcon name={icon} size={18} color="currentColor" strokeWidth={1.75} />
        <span>{label}</span>
      </button>
      {hovered && <Tooltip label={label} direction="up" />}
    </div>
  );
}
