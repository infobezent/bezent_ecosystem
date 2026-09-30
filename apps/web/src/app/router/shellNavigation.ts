import type { ShellLauncher, ShellLauncherItem, ShellNavItem } from '../../layouts/app-shell';
import type { BezentApplication } from '../../shared/types/application';
import { destinationPath, type ActiveNavigation } from '../../shared/utils/navigation';

/**
 * Adapters from an application's navigation catalog to the generic shell
 * props. The catalog is the only source; nothing here defines destinations.
 */

/**
 * Destinations shown in the sidebar (with their sub-navigation): the
 * catalog's `sidebar` destinations, plus — while it is the active one — a
 * launcher-only destination, so where you are (and its sub-navigation) stays
 * visible after choosing it from More. Derived from the URL; nothing persists
 * (the old UI's dynamic slot did persist a user's last More choice).
 *
 * `canFn` is the `can` helper from `useAuth`. When provided, destinations
 * with a `permissionKey` are filtered out if the user lacks that permission.
 * Destinations without a `permissionKey` are always shown (no restriction).
 */
export function toShellNavItems(
  app: BezentApplication,
  activeId?: string,
  canFn?: (permission: string) => boolean,
): ShellNavItem[] {
  return app.navigation.destinations
    .filter((d) => {
      if (!d.sidebar && !(d.id === activeId && d.categoryId)) return false;
      if (d.permissionKey && canFn && !canFn(d.permissionKey)) return false;
      return true;
    })
    .map((d) => ({
      id: d.id,
      label: d.label,
      icon: d.icon,
      subtitle: d.subtitle,
      subItems: d.children?.map((c) => ({ id: c.id, label: c.label, icon: c.icon })),
    }));
}

/** Every destination that has a launcher category, for the More launcher. */
export function toShellLauncher(
  app: BezentApplication,
  active: ActiveNavigation | undefined,
  navigateTo: (path: string) => void,
  canFn?: (permission: string) => boolean,
): ShellLauncher {
  const items: ShellLauncherItem[] = app.navigation.destinations.flatMap((d) => {
    if (!d.categoryId) return [];
    if (d.permissionKey && canFn && !canFn(d.permissionKey)) return [];
    return [
      {
        id: d.id,
        label: d.label,
        icon: d.icon,
        description: d.description,
        categoryId: d.categoryId,
        keywords: d.keywords,
        quickAccess: d.quickAccess,
      },
    ];
  });

  return {
    categories: app.navigation.categories.map((c) => ({ ...c })),
    items,
    activeItemId: active?.destinationId,
    onSelect: (id) => {
      const destination = app.navigation.destinations.find((d) => d.id === id);
      if (destination) navigateTo(destinationPath(app.basePath, destination));
    },
  };
}
