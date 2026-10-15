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
  dynamicIds?: string[],
): ShellNavItem[] {
  const isAccessible = (d: (typeof app.navigation.destinations)[number]) => {
    if (d.permissionKey && canFn && !canFn(d.permissionKey)) return false;
    if (d.children !== undefined) {
      const accessibleChildren = d.children.filter((c) => {
        if (c.permissionKey && canFn && !canFn(c.permissionKey)) return false;
        return true;
      });
      if (accessibleChildren.length === 0) return false;
    }
    return true;
  };

  const toNavItem = (d: (typeof app.navigation.destinations)[number]): ShellNavItem => {
    const accessibleChildren = d.children
      ? d.children.filter((c) => {
          if (c.permissionKey && canFn && !canFn(c.permissionKey)) return false;
          return true;
        })
      : undefined;

    return {
      id: d.id,
      label: d.label,
      flyoutTitle: d.flyoutTitle,
      icon: d.icon,
      subtitle: d.subtitle,
      subItems: accessibleChildren?.map((c) => ({ id: c.id, label: c.label, icon: c.icon })),
    };
  };

  if (dynamicIds) {
    const destMap = new Map(app.navigation.destinations.map((d) => [d.id, d]));
    const items: ShellNavItem[] = [];

    // 1. Fixed top items: Dashboard, then Administration immediately below
    const dashboardDest = destMap.get('dashboard');
    if (dashboardDest && isAccessible(dashboardDest)) {
      items.push(toNavItem(dashboardDest));
    }
    const adminDest = destMap.get('administration') ?? destMap.get('admin');
    if (adminDest && isAccessible(adminDest) && adminDest !== dashboardDest) {
      items.push(toNavItem(adminDest));
    }

    // 2. Dynamic items in ordered sequence (excluding fixed items and settings)
    for (const id of dynamicIds) {
      if (id === 'dashboard' || id === 'administration' || id === 'admin' || id === 'settings') {
        continue;
      }
      const dest = destMap.get(id);
      if (dest && isAccessible(dest) && !items.some((i) => i.id === dest.id)) {
        items.push(toNavItem(dest));
      }
    }

    // 3. If activeId is a dynamic destination not in dynamicIds, keep it visible immediately above More
    if (
      activeId &&
      activeId !== 'dashboard' &&
      activeId !== 'administration' &&
      activeId !== 'admin' &&
      activeId !== 'settings' &&
      !items.some((i) => i.id === activeId)
    ) {
      const activeDest = destMap.get(activeId);
      if (activeDest && isAccessible(activeDest)) {
        items.push(toNavItem(activeDest));
      }
    }

    return items;
  }

  return app.navigation.destinations
    .filter((d) => {
      if (!d.sidebar && !(d.id === activeId && d.categoryId)) return false;
      return isAccessible(d);
    })
    .map(toNavItem);
}

/** Every destination that has a launcher category, for the More launcher. */
export function toShellLauncher(
  app: BezentApplication,
  active: ActiveNavigation | undefined,
  navigateTo: (path: string) => void,
  canFn?: (permission: string) => boolean,
  onModuleSelect?: (id: string) => void,
): ShellLauncher {
  const items: ShellLauncherItem[] = app.navigation.destinations.flatMap((d) => {
    if (!d.categoryId) return [];
    if (d.permissionKey && canFn && !canFn(d.permissionKey)) return [];
    if (d.children !== undefined) {
      const accessibleChildren = d.children.filter((c) => {
        if (c.permissionKey && canFn && !canFn(c.permissionKey)) return false;
        return true;
      });
      if (accessibleChildren.length === 0) return [];
    }
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
      onModuleSelect?.(id);
      const destination = app.navigation.destinations.find((d) => d.id === id);
      if (destination) {
        const accessibleChildren = destination.children?.filter((c) => {
          if (c.permissionKey && canFn && !canFn(c.permissionKey)) return false;
          return true;
        });
        const singleChildId =
          accessibleChildren?.length === 1 ? accessibleChildren[0]?.id : undefined;
        navigateTo(destinationPath(app.basePath, destination, singleChildId));
      }
    },
  };
}
