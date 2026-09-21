import type { ReactNode } from 'react';
import type { BezentIconName } from '../definitions';
import type { IconVariant } from '../types';
import { BezentIcon } from './BezentIcon';
import './icons.css';

export interface BezentNavIconProps {
  name: BezentIconName;
  active: boolean;
  hovered?: boolean;
  variant?: IconVariant;
  size?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Standardized BEZENT Navigation Icon Container.
 *
 * Implements the BEZENT Navigation Icon Interaction Standard:
 * 1. Default: outline icon, `--nav-icon-default` stroke, transparent
 *    background, no container.
 * 2. Hover: outline icon, `--nav-icon-hover` stroke, on a subtle
 *    `--nav-icon-bg-hover` background (40×40, radius 10px).
 * 3. Selected: outline icon, `--nav-icon-active` stroke, on a
 *    `--nav-icon-bg-selected` container (40×40, radius 10px).
 *    Preserves recognizable outline geometry between states without
 *    heavy solid glyphs or silhouette blobs.
 *
 * Cleanup vs. the old approved UI's `BezentNavIcon.tsx`: all inline
 * `style={{...}}` container/box styling was replaced with the
 * `.bezent-nav-icon-anchor` / `.bezent-nav-icon-box` CSS classes (see
 * `icons.css`) — the class-name state switching (`is-selected`/
 * `is-hovered`/`is-default`) already existed in the old code, it was just
 * redundantly paired with inline styles doing the same job.
 *
 * The old code also read `useTheme()` here to manually pick a light- or
 * dark-mode hex value for the icon's stencil cutout color (and had a real
 * bug doing it: it branched on `mode === "dark"`, which is wrong when
 * `mode === "system"`). This component has no theme dependency at all
 * now — the cutout color is a themed CSS custom property
 * (`--nav-icon-cutout`, defined per `[data-theme]` in `icons.css`) that
 * the cascade resolves correctly for all three modes on its own. This
 * also keeps `design-system` a dependency leaf — it must never import
 * from `app/` (see docs/architecture/DEPENDENCY-RULES.md).
 */
export function BezentNavIcon({
  name,
  active,
  hovered = false,
  variant = 'outline',
  size = 20,
  className,
  children,
}: BezentNavIconProps) {
  const stateClass = active ? 'is-selected' : hovered ? 'is-hovered' : 'is-default';

  const primaryColor = active
    ? 'var(--nav-icon-active)'
    : hovered
      ? 'var(--nav-icon-hover)'
      : 'var(--nav-icon-default)';
  const structuralColor = active ? 'var(--nav-icon-active-structural)' : 'transparent';

  const effectiveVariant: IconVariant = variant ?? (active ? 'solid' : 'outline');

  return (
    <div className="bezent-nav-icon-anchor">
      <div className={`bezent-nav-icon-box ${stateClass} ${className || ''}`.trim()}>
        <BezentIcon
          name={name}
          active={active}
          variant={effectiveVariant}
          size={size}
          color={primaryColor}
          structuralColor={structuralColor}
          secondaryColor={structuralColor}
          cutoutColor="var(--nav-icon-cutout)"
          strokeWidth={2}
        />
        {children}
      </div>
    </div>
  );
}

export const NavIcon = BezentNavIcon;
export default BezentNavIcon;
