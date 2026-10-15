/**
 * BEZENT Navigation Preferences & Dynamic LRU State Management
 *
 * Implements Change 01 & Change 02:
 * - Fixed items: Dashboard & Administration at top, Settings at bottom.
 * - Dynamic items: Selected from More launcher, inserted immediately above More.
 * - LRU eviction when capacity is exceeded.
 * - Client-side persistence isolated by tenant, user, application, and role.
 * - Validation of stored IDs against permitted catalog; stale/unauthorized IDs dropped.
 */

export interface NavPersistenceContext {
  userId?: string | null;
  tenantId?: string | null;
  applicationId: string;
  role?: string | null;
}

export interface StoredNavState {
  dynamicIds: string[];
  recentUsage: Record<string, number>;
}

export const FIXED_NAV_IDS = ['dashboard', 'administration', 'admin'] as const;
export const SETTINGS_NAV_ID = 'settings';

export function isFixedNavId(id: string): boolean {
  return FIXED_NAV_IDS.includes(id as (typeof FIXED_NAV_IDS)[number]);
}

export function isSettingsNavId(id: string): boolean {
  return id === SETTINGS_NAV_ID;
}

/**
 * Builds a namespaced storage key isolating preferences by tenant, user, application, and role.
 */
export function buildNavStorageKey(ctx: NavPersistenceContext): string {
  const tenant = ctx.tenantId ? encodeURIComponent(ctx.tenantId) : 'global';
  const user = ctx.userId ? encodeURIComponent(ctx.userId) : 'anon';
  const app = encodeURIComponent(ctx.applicationId);
  const role = ctx.role ? encodeURIComponent(ctx.role) : 'default';
  return `bezent_nav_order:${tenant}:${user}:${app}:${role}`;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

/**
 * Loads stored dynamic navigation preferences from localStorage.
 * Sanitizes entries against the currently permitted catalog IDs to prevent unauthorized access.
 */
export function loadStoredNavState(
  ctx: NavPersistenceContext,
  permittedIds: string[],
): StoredNavState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(buildNavStorageKey(ctx));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.dynamicIds)) return null;

    const permittedSet = new Set(permittedIds);
    const sanitizedIds: string[] = [];

    for (const id of parsed.dynamicIds) {
      if (
        typeof id === 'string' &&
        permittedSet.has(id) &&
        !isFixedNavId(id) &&
        !isSettingsNavId(id) &&
        !sanitizedIds.includes(id)
      ) {
        sanitizedIds.push(id);
      }
    }

    const recentUsage: Record<string, number> = {};
    if (parsed.recentUsage && typeof parsed.recentUsage === 'object') {
      for (const [id, ts] of Object.entries(parsed.recentUsage)) {
        if (typeof ts === 'number' && permittedSet.has(id)) {
          recentUsage[id] = ts;
        }
      }
    }

    return { dynamicIds: sanitizedIds, recentUsage };
  } catch {
    return null;
  }
}

/**
 * Saves dynamic navigation preferences to localStorage.
 */
export function saveStoredNavState(
  ctx: NavPersistenceContext,
  state: StoredNavState,
): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(buildNavStorageKey(ctx), JSON.stringify(state));
  } catch {
    // QuotaExceededError or private browsing restrictions
  }
}

export interface UpdateNavParams {
  currentDynamicIds: string[];
  selectedId: string;
  capacity: number;
  recentUsage: Record<string, number>;
}

/**
 * Updates dynamic navigation list with LRU eviction:
 * - If selectedId is fixed or settings, does nothing to the dynamic list.
 * - If already visible in dynamic list, preserves order and updates recency timestamp.
 * - If not visible:
 *   - If capacity has available space: appends selectedId at the end (immediately above More).
 *   - If capacity is full: evicts the least-recently-used non-fixed item, appends selectedId at end.
 */
export function updateDynamicNavList({
  currentDynamicIds,
  selectedId,
  capacity,
  recentUsage,
}: UpdateNavParams): StoredNavState {
  const updatedUsage = { ...recentUsage, [selectedId]: Date.now() };

  // Never add fixed items or settings to dynamic list
  if (isFixedNavId(selectedId) || isSettingsNavId(selectedId)) {
    return { dynamicIds: currentDynamicIds, recentUsage: updatedUsage };
  }

  // If already visible, do not duplicate
  if (currentDynamicIds.includes(selectedId)) {
    return { dynamicIds: currentDynamicIds, recentUsage: updatedUsage };
  }

  // If capacity is 0 (extremely small viewport), dynamic items cannot be displayed
  if (capacity <= 0) {
    return { dynamicIds: currentDynamicIds, recentUsage: updatedUsage };
  }

  // If space is available, retain all and append selected item (immediately above More)
  if (currentDynamicIds.length < capacity) {
    return {
      dynamicIds: [...currentDynamicIds, selectedId],
      recentUsage: updatedUsage,
    };
  }

  // Capacity is full: evict least-recently-used non-fixed item
  let oldestTs = Infinity;
  let lruId: string | null = null;

  for (const id of currentDynamicIds) {
    const ts = updatedUsage[id] ?? 0;
    if (ts < oldestTs) {
      oldestTs = ts;
      lruId = id;
    }
  }

  const idToEvict = lruId ?? currentDynamicIds[0];
  const remaining = currentDynamicIds.filter((id) => id !== idToEvict);

  return {
    dynamicIds: [...remaining, selectedId],
    recentUsage: updatedUsage,
  };
}
