import type { ApplicationNavigation, NavDestination } from '../types/navigation';

export function destinationPath(
  basePath: string,
  destination: NavDestination,
  childId?: string,
): string {
  const targetChildId =
    childId ?? (destination.children?.length === 1 ? destination.children[0]?.id : undefined);
  if (targetChildId) {
    const child = destination.children?.find((c) => c.id === targetChildId);
    if (child?.path) {
      const cleanPath = child.path.replace(/^\//, '');
      return `${basePath}/${cleanPath}`;
    }
    return `${basePath}/${destination.segment}/${targetChildId}`;
  }
  return `${basePath}/${destination.segment}`;
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

  // 1a. Exact matches on children first across all destinations
  for (const destination of navigation.destinations) {
    if (destination.children) {
      for (const child of destination.children) {
        const cPath = destinationPath(basePath, destination, child.id);
        if (normalized === cPath) {
          return { destinationId: destination.id, childId: child.id };
        }
        if (child.aliases?.some((alias) => normalized === `${basePath}/${alias.replace(/^\//, '')}`)) {
          return { destinationId: destination.id, childId: child.id };
        }
      }
    }
  }

  // 1b. Prefix matches on children (most specific / longest path wins)
  let bestChildMatch: { destinationId: string; childId: string; length: number } | undefined;
  for (const destination of navigation.destinations) {
    if (destination.children) {
      for (const child of destination.children) {
        const cPath = destinationPath(basePath, destination, child.id);
        if (normalized.startsWith(`${cPath}/`)) {
          if (!bestChildMatch || cPath.length > bestChildMatch.length) {
            bestChildMatch = { destinationId: destination.id, childId: child.id, length: cPath.length };
          }
        }
      }
    }
  }
  if (bestChildMatch) {
    return { destinationId: bestChildMatch.destinationId, childId: bestChildMatch.childId };
  }

  // 2. Check root destination paths
  for (const destination of navigation.destinations) {
    const root = destinationPath(basePath, destination);
    if (normalized === root || normalized.startsWith(`${root}/`)) {
      return { destinationId: destination.id };
    }
    const baseSegment = `${basePath}/${destination.segment}`.replace(/\/+$/, '');
    if (normalized === baseSegment || normalized.startsWith(`${baseSegment}/`)) {
      return { destinationId: destination.id };
    }
  }

  return undefined;
}
