/**
 * BEZENT Avatar System — Safe Avatar Resolver
 *
 * Resolves avatar IDs and aliases to validated image asset paths.
 * Enforces strict security validation, handles unknown IDs safely,
 * and prevents untrusted input from constructing unauthorized paths.
 */

import { getAvatarById, isValidAvatarId, AVATAR_ALIASES } from './catalog';
import type { AvatarResolution } from './types';

/**
 * Resolves a given avatar identifier to its catalog metadata and verified asset URL.
 *
 * Priority & Safety Rules:
 * 1. Missing/empty ID -> returns null with reason 'missing_id'.
 * 2. Malformed/unsafe ID format (e.g. '../', '<script>', slashes) -> rejected safely as 'unknown_id'.
 * 3. Recognized alias (e.g. 'male', 'female') -> resolved to canonical asset with reason 'alias_match'.
 * 4. Catalog match -> resolved to verified asset path with reason 'catalog_match'.
 * 5. Registered unverified entry -> returns null with reason 'unverified_asset'.
 * 6. Unknown ID -> returns null with reason 'unknown_id' (safe fallback).
 */
export function resolveAvatar(id?: string | null): AvatarResolution {
  if (!id || typeof id !== 'string') {
    return {
      metadata: null,
      src: null,
      isFallback: true,
      reason: 'missing_id',
    };
  }

  const trimmed = id.trim();
  if (trimmed.length === 0) {
    return {
      metadata: null,
      src: null,
      isFallback: true,
      reason: 'missing_id',
    };
  }

  // Security barrier: reject path traversal, protocols, and control characters
  if (!isValidAvatarId(trimmed)) {
    return {
      metadata: null,
      src: null,
      isFallback: true,
      reason: 'unknown_id',
    };
  }

  const normalized = trimmed.toLowerCase();
  const isAlias = normalized in AVATAR_ALIASES;
  const metadata = getAvatarById(normalized);

  if (!metadata) {
    return {
      metadata: null,
      src: null,
      isFallback: true,
      reason: 'unknown_id',
    };
  }

  // If an avatar is registered but its asset has not yet been physically verified
  if (!metadata.verified) {
    return {
      metadata,
      src: null,
      isFallback: true,
      reason: 'unverified_asset',
    };
  }

  return {
    metadata,
    src: metadata.assetPath,
    isFallback: false,
    reason: isAlias ? 'alias_match' : 'catalog_match',
  };
}
