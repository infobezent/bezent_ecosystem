/**
 * BEZENT Avatar System — Core Type Definitions
 *
 * Defines the strongly-typed metadata model for BEZENT Avatar Studio.
 * Shared across the BEZENT ecosystem (HRMS, ESS, Admin, Platform, and future apps).
 */

export type AvatarCategory = 'human' | 'ai' | 'neutral';

export type AvatarGenderPresentation = 'masculine' | 'feminine' | 'androgynous';

export interface AvatarMetadata {
  /** Stable unique identifier (e.g. 'human-classic-male', 'human-3d-01') */
  readonly id: string;
  /** Human-readable display label (e.g. 'Classic Male', 'Arjun') */
  readonly label: string;
  /** Primary category classification */
  readonly category: AvatarCategory;
  /** Optional gender presentation metadata for filtering and accessibility */
  readonly genderPresentation?: AvatarGenderPresentation;
  /** Semantic search & filter tags (e.g. ['office', 'classic', 'formal']) */
  readonly tags: readonly string[];
  /** Relative asset URL path served from static assets (e.g. '/assets/avatars/avatar-male.png') */
  readonly assetPath: string;
  /** Indicates whether the underlying image asset is verified present on disk */
  readonly verified: boolean;
  /** Optional descriptive text for accessibility and documentation */
  readonly description?: string;
}

export type AvatarResolutionReason =
  'catalog_match' | 'alias_match' | 'unknown_id' | 'missing_id' | 'unverified_asset';

export interface AvatarResolution {
  /** Resolved catalog metadata, or null if unknown / missing */
  readonly metadata: AvatarMetadata | null;
  /** Resolvable image source URL, or null if falling back to initials/icon */
  readonly src: string | null;
  /** Whether this resolution resulted in a fallback */
  readonly isFallback: boolean;
  /** Diagnostic reason code explaining how the resolution was determined */
  readonly reason: AvatarResolutionReason;
}
