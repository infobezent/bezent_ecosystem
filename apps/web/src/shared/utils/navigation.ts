import type { ApplicationNavigation, NavDestination } from '../types/navigation';

/** Full path of a destination, or of one of its children. */
export function destinationPath(
  basePath: string,
  destination: NavDestination,
  childId?: string,
): string {
  const base = `${basePath}/${destination.segment}`;
  return childId ? `${base}/${childId}` : base;
}

export interface ActiveNavigation {
  destinationId: string;
  childId?: string;
}

/**
 * Derives the selected destination (and child) from the URL. The router is
 * the single source of truth for selection — nothing stores it separately.
 */
export function resolveActiveNavigation(
  navigation: ApplicationNavigation,
  basePath: string,
  pathname: string,
): ActiveNavigation | undefined {
  const normalized = pathname.replace(/\/+$/, '');
  for (const destination of navigation.destinations) {
    const root = destinationPath(basePath, destination);
    if (normalized === root) return { destinationId: destination.id };
    if (normalized.startsWith(`${root}/`)) {
      const childId = destination.children?.find(
        (child) => normalized === destinationPath(basePath, destination, child.id),
      )?.id;
      return { destinationId: destination.id, childId };
    }
  }
  return undefined;
}
