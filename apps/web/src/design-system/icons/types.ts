import type { JSX } from 'react';

/**
 * Icon-system types only. The old approved UI's `iconTypes.ts` also
 * defined navigation-catalog types (`NavigationModuleItem`,
 * `NavigationGroup`, ...) and `SIDEBAR_NAV_TOKENS` (left-nav item
 * layout) in this same file — those are HRMS navigation/shell concerns,
 * not icon concerns, and are deliberately NOT migrated here. They are
 * introduced later, in `applications/hrms/` and the AppShell/layouts
 * phase respectively, when that work actually begins. See
 * docs/architecture/ICON-SYSTEM.md.
 */

export type IconVariant = 'outline' | 'solid';

/** Which BEZENT business application (or "global") an icon belongs to. */
export type BezentProduct = 'hrms' | 'crm' | 'pm' | 'global';

export interface BezentIconRenderProps {
  size: number;
  color: string;
  strokeWidth?: number;
  secondaryColor?: string;
  structuralColor?: string;
  accentColor?: string;
  cutoutColor?: string;
  isDark?: boolean;
}

export interface IconDefinition {
  name: string;
  label: string;
  category: BezentProduct;
  outline: (props: BezentIconRenderProps) => JSX.Element;
  solid: (props: BezentIconRenderProps) => JSX.Element;
}

/**
 * Named size tokens — the approved BEZENT icon sizing scale, preserved
 * exactly from the old UI's `BEZENT_ICON_SIZES`.
 */
export const BEZENT_ICON_SIZES = {
  primaryRail: 20,
  moreFlyout: 18,
  topNav: 18,
  topNavAction: 20,
  rightRail: 19,
  footer: 18,
  quickAction: 18,
  compact: 18,
  nav: 20,
  action: 20,
  module: 20,
  flyout: 18,
} as const;

export type BezentIconSizeToken = keyof typeof BEZENT_ICON_SIZES;

export interface BezentIconProps {
  /** Canonical icon key — see `definitions/index.ts` for the full set. */
  name: string;
  variant?: IconVariant;
  size?: number | string | BezentIconSizeToken;
  color?: string;
  secondaryColor?: string;
  structuralColor?: string;
  accentColor?: string;
  cutoutColor?: string;
  strokeWidth?: number;
  active?: boolean;
  isDark?: boolean;
  className?: string;
  title?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}
