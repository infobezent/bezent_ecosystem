import type { ReactNode } from 'react';
import type { BezentIconName } from '../../design-system/icons';
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
 * The shared container for every utility drawer.
 * Renders drawer content directly without splash/loading screen.
 */
export function UtilityDrawerShell({
  title,
  icon: _icon,
  onClose: _onClose,
  children,
}: UtilityDrawerShellProps) {
  return (
    <section className="utility-drawer" aria-label={title}>
      <div className="utility-drawer__content">{children}</div>
    </section>
  );
}
