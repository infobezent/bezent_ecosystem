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
  dynamicSlotId?: string,
): ShellNavItem[] {
  const isAccessible = (d: (typeof app.navigation.destinations)[number]) => {
    if (d.permissionKey && canFn && !canFn(d.permissionKey)) {
      if (!(d.permissionKey.startsWith('hrms.') && canFn('hrms.administration.view'))) {
        return false;
      }
    }
    if (d.children !== undefined) {
      const accessibleChildren = d.children.filter((c) => {
        if (c.permissionKey && canFn && !canFn(c.permissionKey)) return false;
        return true;
      });
      if (accessibleChildren.length === 0) return false;
    }
    return true;
  };

  const fixedDestinations = app.navigation.destinations.filter((d) => d.sidebar && isAccessible(d));
  const fixedIds = new Set(fixedDestinations.map((d) => d.id));

  // Determine dynamic slot destination:
  // 1. If currently on a launcher destination (not in fixed rail), promote activeId to dynamic slot.
  // 2. Otherwise, keep the recent dynamicSlotId (if accessible).
  // 3. Fallback to 'learning' for HRMS if accessible.
  const dynamicCandidateId =
    activeId &&
    !fixedIds.has(activeId) &&
    app.navigation.destinations.some((d) => d.id === activeId && d.categoryId)
      ? activeId
      : dynamicSlotId && !fixedIds.has(dynamicSlotId)
        ? dynamicSlotId
        : app.id === 'hrms' && !fixedIds.has('learning')
          ? 'learning'
          : undefined;

  const dynamicDest = dynamicCandidateId
    ? app.navigation.destinations.find((d) => d.id === dynamicCandidateId && isAccessible(d))
    : undefined;

  const destinationsToShow = [...fixedDestinations];
  if (dynamicDest && !fixedIds.has(dynamicDest.id)) {
    destinationsToShow.push(dynamicDest);
  }

  return destinationsToShow.map((d) => {
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
  });
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
    if (d.permissionKey && canFn && !canFn(d.permissionKey)) {
      if (!(d.permissionKey.startsWith('hrms.') && canFn('hrms.administration.view'))) {
        return [];
      }
    }
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
