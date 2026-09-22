import type { ReactNode } from 'react';
import { BezentIcon, CompanionIcon, type BezentIconName } from '../../design-system/icons';
import './UtilityDrawerShell.css';

export interface UtilityDrawerShellProps {
  /** Title and icon of the capability being revealed (shown by the reveal). */
  title: string;
  icon: BezentIconName;
  onClose: () => void;
  /** The capability's own drawer content. */
  children: ReactNode;
}

/**
 * The shared container for every utility drawer: docked surface, circular
 * reveal, then the content fade-in. Source: old approved UI
 * `UtilityDrawerShell` / `DrawerLoader` / `DrawerContentReady` and the
 * `drawerCircleExpand` / `drawerIconSequence` / `drawerContentIn`
 * keyframes.
 *
 * The old code swapped loader -> content with a 360ms JS timeout. Here
 * both layers are always mounted and sequenced purely in CSS (loader
 * plays then hides; content fades in after the same delay) — no timers, no
 * runtime geometry. The reveal is centred in the drawer (not tied to the
 * clicked rail icon), so it needs no per-icon origin. Remount it with a
 * `key` per capability so switching utilities replays the reveal.
 *
 * It knows nothing about tasks, approvals, notes or any other business
 * data. Width/position come from the AppShell's drawer grid column.
 */
export function UtilityDrawerShell({ title, icon, onClose, children }: UtilityDrawerShellProps) {
  return (
    <section className="utility-drawer" aria-label={title}>
      <div className="utility-drawer__content">{children}</div>

      {/* Reveal layer: header + expanding circle; hides itself after the reveal. */}
      <div className="utility-drawer__loader" aria-hidden="true">
        <div className="utility-drawer__loader-header">
          <span className="utility-drawer__loader-chip">
            <CompanionIcon name={icon} size={16} active />
          </span>
          <span className="utility-drawer__loader-title">{title}</span>
          <button
            type="button"
            className="utility-drawer__loader-close"
            tabIndex={-1}
            onClick={onClose}
          >
            <BezentIcon name="close" size={18} color="currentColor" />
          </button>
        </div>
        <div className="utility-drawer__loader-body">
          <span
            className={`utility-drawer__circle utility-drawer__circle--${icon.toLowerCase()}`}
          />
          <span className="utility-drawer__loader-icon">
            <CompanionIcon name={icon} size={84} active />
          </span>
        </div>
      </div>
    </section>
  );
}
