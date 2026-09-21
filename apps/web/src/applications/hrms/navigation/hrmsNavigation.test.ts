import { describe, expect, it } from 'vitest';
import { ICON_DEFINITIONS } from '../../../design-system/icons/definitions';
import { destinationPath, resolveActiveNavigation } from '../../../shared/utils/navigation';
import { hrmsApplication } from '..';
import { HRMS_BASE_PATH } from '../routes';
import { hrmsNavigation } from './hrmsNavigation';

const { categories, destinations } = hrmsNavigation;

/** Full paths of every route object, flattened. */
function routePaths(routes: typeof hrmsApplication.routes, prefix = ''): string[] {
  return routes.flatMap((route) => {
    const path = route.path ? `${prefix}/${route.path}`.replace(/\/+/g, '/') : prefix;
    return [path, ...routePaths(route.children ?? [], path)];
  });
}

describe('canonical HRMS navigation catalog', () => {
  it('has unique destination ids and segments', () => {
    expect(new Set(destinations.map((d) => d.id)).size).toBe(destinations.length);
    expect(new Set(destinations.map((d) => d.segment)).size).toBe(destinations.length);
  });

  it('has unique child ids within each destination', () => {
    for (const d of destinations) {
      const ids = (d.children ?? []).map((c) => c.id);
      expect(new Set(ids).size, d.id).toBe(ids.length);
    }
  });

  it('only references existing launcher categories', () => {
    const known = new Set(categories.map((c) => c.id));
    for (const d of destinations)
      if (d.categoryId) expect(known.has(d.categoryId), d.id).toBe(true);
  });

  it('resolves every icon in the canonical registry', () => {
    const icons = [
      ...categories.map((c) => c.icon),
      ...destinations.flatMap((d) => [d.icon, ...(d.children ?? []).map((c) => c.icon)]),
    ];
    for (const icon of icons) expect(ICON_DEFINITIONS[icon], icon).toBeDefined();
  });

  it('gives every destination a permission key', () => {
    for (const d of destinations) expect(d.permissionKey, d.id).toMatch(/^hrms\.[a-z-]+\.view$/);
  });

  it('keeps global utilities out of HRMS navigation', () => {
    const ids = destinations.map((d) => d.id);
    for (const utility of ['notifications', 'approvals', 'tasks', 'calendar', 'notes']) {
      expect(ids).not.toContain(utility);
    }
  });

  it('has no Home or Time Tracker destination', () => {
    const ids = destinations.map((d) => d.id);
    expect(ids).not.toContain('home');
    expect(ids).not.toContain('time-tracker');
  });

  it('shows launcher categories that all contain destinations', () => {
    for (const c of categories) {
      expect(
        destinations.some((d) => d.categoryId === c.id),
        c.id,
      ).toBe(true);
    }
  });

  it('freezes the primary sidebar order', () => {
    expect(destinations.filter((d) => d.sidebar).map((d) => d.id)).toEqual([
      'dashboard',
      'onboarding',
      'leave',
      'attendance',
      'timesheets',
      'performance',
      'employees',
    ]);
  });
});

describe('HRMS route generation', () => {
  const paths = routePaths(hrmsApplication.routes);

  it('mounts every destination and child under the base path', () => {
    for (const d of destinations) {
      expect(paths).toContain(destinationPath(HRMS_BASE_PATH, d));
      for (const c of d.children ?? []) {
        expect(paths).toContain(destinationPath(HRMS_BASE_PATH, d, c.id));
      }
    }
  });

  it('resolves every generated path back to its destination', () => {
    for (const d of destinations) {
      expect(
        resolveActiveNavigation(hrmsNavigation, HRMS_BASE_PATH, destinationPath(HRMS_BASE_PATH, d)),
      ).toEqual({ destinationId: d.id });
      for (const c of d.children ?? []) {
        expect(
          resolveActiveNavigation(
            hrmsNavigation,
            HRMS_BASE_PATH,
            destinationPath(HRMS_BASE_PATH, d, c.id),
          ),
        ).toEqual({ destinationId: d.id, childId: c.id });
      }
    }
  });

  it('has a default destination that exists', () => {
    expect(destinations.some((d) => d.id === hrmsApplication.defaultDestinationId)).toBe(true);
  });
});

describe('launcher-only active state', () => {
  it('resolves launcher-only destinations that are not in the sidebar', () => {
    const launcherOnly = destinations.filter((d) => !d.sidebar && d.categoryId);
    expect(launcherOnly.length).toBeGreaterThan(0);
    for (const d of launcherOnly) {
      expect(
        resolveActiveNavigation(hrmsNavigation, HRMS_BASE_PATH, destinationPath(HRMS_BASE_PATH, d)),
      ).toEqual({ destinationId: d.id });
    }
  });
});
