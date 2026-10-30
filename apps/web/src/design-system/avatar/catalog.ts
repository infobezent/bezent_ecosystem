/**
 * BEZENT Avatar System — Centralized Avatar Catalog
 *
 * Implements the registry of verified avatar assets, aliases, and metadata.
 * Designed to be extensible to the upcoming 48 3D human avatars and 3 AI assistant identities.
 *
 * NOTE: Only assets physically present on disk are marked as verified.
 * Future 3D asset packs will be registered here as their files are placed into
 * `public/assets/avatars/3d/`.
 */

import type { AvatarMetadata } from './types';

/**
 * Verified base avatars currently deployed in the repository.
 * Located in `apps/web/public/assets/avatars/`.
 */
export const VERIFIED_BASE_AVATARS: readonly AvatarMetadata[] = [
  {
    id: 'human-classic-male',
    label: 'Classic Male',
    category: 'human',
    genderPresentation: 'masculine',
    tags: ['classic', 'office', '2d', 'male'],
    assetPath: '/assets/avatars/avatar-male.png',
    verified: true,
    description: 'BEZENT classic 2D professional male character avatar.',
  },
  {
    id: 'human-classic-female',
    label: 'Classic Female',
    category: 'human',
    genderPresentation: 'feminine',
    tags: ['classic', 'office', '2d', 'female'],
    assetPath: '/assets/avatars/avatar-female.png',
    verified: true,
    description: 'BEZENT classic 2D professional female character avatar.',
  },
  {
    id: 'human-3d-dev-male',
    label: 'Dev Male (3D)',
    category: 'human',
    genderPresentation: 'masculine',
    tags: ['3d', 'tech', 'engineer', 'male'],
    assetPath: '/assets/avatars/3d/avatar-dev-male.jpg',
    verified: true,
    description: 'BEZENT 3D modern male software engineer avatar.',
  },
  {
    id: 'human-3d-exec-female',
    label: 'Executive Female (3D)',
    category: 'human',
    genderPresentation: 'feminine',
    tags: ['3d', 'leadership', 'manager', 'female'],
    assetPath: '/assets/avatars/3d/avatar-exec-female.jpg',
    verified: true,
    description: 'BEZENT 3D modern female executive manager avatar.',
  },
  {
    id: 'human-3d-product-male',
    label: 'Product Male (3D)',
    category: 'human',
    genderPresentation: 'masculine',
    tags: ['3d', 'product', 'manager', 'male'],
    assetPath: '/assets/avatars/3d/avatar-product-male.jpg',
    verified: true,
    description: 'BEZENT 3D modern male product manager avatar.',
  },
  {
    id: 'human-3d-hr-female',
    label: 'People & HR Female (3D)',
    category: 'human',
    genderPresentation: 'feminine',
    tags: ['3d', 'hr', 'people', 'female'],
    assetPath: '/assets/avatars/3d/avatar-hr-female.jpg',
    verified: true,
    description: 'BEZENT 3D modern female HR specialist avatar.',
  },
  {
    id: 'human-3d-lead-female',
    label: 'Tech Lead Female (3D)',
    category: 'human',
    genderPresentation: 'feminine',
    tags: ['3d', 'tech', 'lead', 'female'],
    assetPath: '/assets/avatars/3d/avatar-lead-female.jpg',
    verified: true,
    description: 'BEZENT 3D modern female technical lead avatar.',
  },
  {
    id: 'human-3d-finance-male',
    label: 'Finance Male (3D)',
    category: 'human',
    genderPresentation: 'masculine',
    tags: ['3d', 'finance', 'operations', 'male'],
    assetPath: '/assets/avatars/3d/avatar-finance-male.jpg',
    verified: true,
    description: 'BEZENT 3D modern male finance specialist avatar.',
  },
  {
    id: 'ai-3d-copilot',
    label: 'BEZENT Copilot (AI)',
    category: 'ai',
    tags: ['3d', 'ai', 'assistant', 'copilot'],
    assetPath: '/assets/avatars/3d/avatar-ai-copilot.jpg',
    verified: true,
    description: 'BEZENT 3D intelligent holographic copilot avatar.',
  },
  {
    id: 'ai-3d-zen',
    label: 'BEZENT Zen (AI)',
    category: 'ai',
    tags: ['3d', 'ai', 'assistant', 'zen'],
    assetPath: '/assets/avatars/3d/avatar-ai-zen.jpg',
    verified: true,
    description: 'BEZENT 3D serenity and zen core AI assistant avatar.',
  },
] as const;

/**
 * Known legacy and semantic aliases mapped to canonical avatar IDs.
 * Preserves backward compatibility with earlier EmployeeCartoonAvatar variants.
 */
export const AVATAR_ALIASES: Readonly<Record<string, string>> = {
  male: 'human-classic-male',
  female: 'human-classic-female',
  copilot: 'ai-3d-copilot',
  zen: 'ai-3d-zen',
};

/**
 * In-memory registry map initialized with verified base avatars.
 */
const catalogRegistry = new Map<string, AvatarMetadata>(
  VERIFIED_BASE_AVATARS.map((item) => [item.id, item]),
);

/**
 * Strict ID format validation: alphanumeric with optional hyphens/underscores.
 * Rejects path traversals (e.g. '../'), URLs, slashes, or script injections.
 */
const SAFE_ID_REGEX = /^[a-z0-9][a-z0-9-_]{1,63}$/i;

/**
 * Validates whether an input value conforms to a safe avatar identifier format.
 */
export function isValidAvatarId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  return SAFE_ID_REGEX.test(trimmed);
}

/**
 * Retrieves the full list of currently registered avatar metadata.
 */
export function getAvatarCatalog(): readonly AvatarMetadata[] {
  return Array.from(catalogRegistry.values());
}

/**
 * Retrieves avatar metadata for a given canonical ID or recognized alias.
 */
export function getAvatarById(id: string): AvatarMetadata | undefined {
  if (!id) return undefined;
  const trimmed = id.trim().toLowerCase();

  // 1. Direct canonical lookup
  const direct = catalogRegistry.get(trimmed);
  if (direct) return direct;

  // 2. Alias lookup
  const canonicalId = AVATAR_ALIASES[trimmed];
  if (canonicalId) {
    return catalogRegistry.get(canonicalId);
  }

  return undefined;
}

/**
 * Reserved identifiers including verified base avatars and legacy aliases.
 * These IDs are protected from accidental mutation or overwriting via registerAvatar.
 */
const RESERVED_CATALOG_IDS: ReadonlySet<string> = new Set<string>([
  ...VERIFIED_BASE_AVATARS.map((item) => item.id.toLowerCase()),
  ...Object.keys(AVATAR_ALIASES).map((alias) => alias.toLowerCase()),
  ...Object.values(AVATAR_ALIASES).map((id) => id.toLowerCase()),
]);

/**
 * Checks whether an avatar ID or alias exists in the catalog.
 */
export function hasAvatar(id: string): boolean {
  return getAvatarById(id) !== undefined;
}

/**
 * Registers an additional avatar metadata entry (used for future 3D and AI packs).
 * Prevents accidental overwrite of verified base entries or reserved aliases.
 */
export function registerAvatar(metadata: AvatarMetadata): void {
  if (!isValidAvatarId(metadata.id)) {
    throw new Error(`[AvatarCatalog] Invalid avatar ID format: "${metadata.id}"`);
  }

  const normalizedId = metadata.id.trim().toLowerCase();

  if (RESERVED_CATALOG_IDS.has(normalizedId)) {
    throw new Error(
      `[AvatarCatalog] Cannot overwrite reserved or canonical avatar ID: "${metadata.id}"`,
    );
  }

  catalogRegistry.set(normalizedId, metadata);
}

/**
 * Registers a batch of avatar metadata entries.
 */
export function registerAvatars(entries: readonly AvatarMetadata[]): void {
  for (const entry of entries) {
    registerAvatar(entry);
  }
}

/**
 * Test isolation helper — resets the in-memory registry back to verified base avatars.
 * Internal to the avatar module; NOT exported from the public design-system barrel.
 * @internal
 */
export function _resetCatalogRegistryForTesting(): void {
  catalogRegistry.clear();
  for (const item of VERIFIED_BASE_AVATARS) {
    catalogRegistry.set(item.id, item);
  }
}
