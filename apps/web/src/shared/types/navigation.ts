import type { BezentIconName } from '../../design-system/icons';

/**
 * The navigation model every BEZENT business application supplies to the
 * global shell (HRMS today; CRM, Projects, ... later). Domain-independent:
 * it describes destinations, not what is behind them. See
 * docs/architecture/HRMS-NAVIGATION.md.
 *
 * One destination entry expresses its placement without duplication:
 *  - `sidebar: true`      → shown directly in the left sidebar (primary);
 *  - `categoryId` set     → also listed in the More launcher under it;
 *  - `children`           → sub-navigation (flyout) destinations.
 */

/** A grouping shown in the More launcher. */
export interface NavCategory {
  id: string;
  label: string;
  description?: string;
  icon: BezentIconName;
}

/** A sub-navigation destination. Its route is `<destination.segment>/<id>`. */
export interface NavChild {
  id: string;
  label: string;
  icon: BezentIconName;
  permissionKey?: string;
}

export interface NavDestination {
  /** Stable id, also the default route segment source. */
  id: string;
  label: string;
  icon: BezentIconName;
  /** Path segment below the application's base path (`/hrms` + `/` + segment). */
  segment: string;
  /** Short line under the flyout title. */
  subtitle?: string;
  /** Launcher description. */
  description?: string;
  /** Extra launcher search terms. */
  keywords?: readonly string[];
  /** Launcher category; destinations without one are not listed in More. */
  categoryId?: string;
  /** Show in the left sidebar. */
  sidebar?: boolean;
  /** Show as a Quick Access tile in the launcher. */
  quickAccess?: boolean;
  /**
   * Stable permission key for future filtering (e.g. `hrms.leave.view`).
   * Metadata only — nothing evaluates it yet.
   */
  permissionKey?: string;
  children?: readonly NavChild[];
}

export interface ApplicationNavigation {
  categories: readonly NavCategory[];
  destinations: readonly NavDestination[];
}
