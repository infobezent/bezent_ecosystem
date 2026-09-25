import type { BezentIconName } from '../../design-system/icons';

/** One row inside a nav item's hover flyout. Data is supplied by the caller. */
export interface ShellSubNavItem {
  id: string;
  label: string;
  icon: BezentIconName;
}

/**
 * A left-sidebar navigation entry. The shell only knows this generic shape;
 * which items exist (HRMS today, CRM/PM later) is decided by the caller —
 * `layouts` never imports any business application.
 */
export interface ShellNavItem {
  id: string;
  label: string;
  icon: BezentIconName;
  /** Optional line under the flyout title. */
  subtitle?: string;
  /** When present and non-empty, hovering the item opens the flyout. */
  subItems?: ShellSubNavItem[];
  /** Optional badge count or indicator. */
  badge?: number;
}

/** A button in the right utility rail. Metadata only — what it opens is the host's concern. */
export interface ShellRailItem {
  id: string;
  label: string;
  icon: BezentIconName;
  badge?: number;
}

/** A grouping in the More launcher. */
export interface ShellLauncherCategory {
  id: string;
  label: string;
  description?: string;
  icon: BezentIconName;
}

/** A destination listed in the More launcher. */
export interface ShellLauncherItem {
  id: string;
  label: string;
  icon: BezentIconName;
  description?: string;
  categoryId: string;
  keywords?: readonly string[];
  /** Shown as a Quick Access tile. */
  quickAccess?: boolean;
}

/**
 * Data + selection for the More launcher. The launcher is generic: it
 * renders whatever an application supplies (HRMS today) and reports the
 * chosen id.
 */
export interface ShellLauncher {
  categories: ShellLauncherCategory[];
  items: ShellLauncherItem[];
  activeItemId?: string;
  onSelect: (id: string) => void;
}

/** Layout variant for the AppShell workspace area. */
export type WorkspaceVariant = 'default' | 'flush';

/** Route handle metadata for Bezent routes. */
export interface BezentRouteHandle {
  workspaceVariant?: WorkspaceVariant;
}
