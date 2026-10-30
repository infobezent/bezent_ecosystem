import { describe, it, expect, afterEach } from 'vitest';
import {
  getAvatarCatalog,
  getAvatarById,
  hasAvatar,
  isValidAvatarId,
  registerAvatar,
  VERIFIED_BASE_AVATARS,
  AVATAR_ALIASES,
  _resetCatalogRegistryForTesting,
} from '../catalog';
import { resolveAvatar } from '../resolveAvatar';

describe('BEZENT Avatar System — Catalog & Registry', () => {
  afterEach(() => {
    _resetCatalogRegistryForTesting();
  });
  describe('Catalog Metadata Integrity', () => {
    it('verifies all registered base avatars have unique, valid IDs', () => {
      const catalog = getAvatarCatalog();
      expect(catalog.length).toBeGreaterThan(0);

      const seenIds = new Set<string>();
      for (const item of catalog) {
        expect(seenIds.has(item.id)).toBe(false);
        seenIds.add(item.id);

        expect(isValidAvatarId(item.id)).toBe(true);
        expect(item.label.trim().length).toBeGreaterThan(0);
        expect(['human', 'ai', 'neutral']).toContain(item.category);
        expect(item.assetPath.startsWith('/assets/avatars/')).toBe(true);
        expect(Array.isArray(item.tags)).toBe(true);
      }
    });

    it('verifies base avatars are physically verified assets', () => {
      for (const item of VERIFIED_BASE_AVATARS) {
        expect(item.verified).toBe(true);
      }
    });

    it('verifies alias mappings point to existing canonical IDs', () => {
      for (const [alias, canonicalId] of Object.entries(AVATAR_ALIASES)) {
        expect(isValidAvatarId(alias)).toBe(true);
        expect(hasAvatar(canonicalId)).toBe(true);
        const resolved = getAvatarById(alias);
        expect(resolved).toBeDefined();
        expect(resolved?.id).toBe(canonicalId);
      }
    });
  });

  describe('ID Validation & Security Barrier', () => {
    it('accepts safe alphanumeric and hyphenated identifiers', () => {
      expect(isValidAvatarId('human-classic-male')).toBe(true);
      expect(isValidAvatarId('avatar-3d-01')).toBe(true);
      expect(isValidAvatarId('ai_copilot_v1')).toBe(true);
      expect(isValidAvatarId('male')).toBe(true);
    });

    it('rejects path traversal attempts and special characters', () => {
      expect(isValidAvatarId('../../etc/passwd')).toBe(false);
      expect(isValidAvatarId('../avatar-male.png')).toBe(false);
      expect(isValidAvatarId('/assets/avatars/test')).toBe(false);
      expect(isValidAvatarId('http://malicious.site/avatar.jpg')).toBe(false);
      expect(isValidAvatarId('<script>alert(1)</script>')).toBe(false);
      expect(isValidAvatarId('avatar\0nullbyte')).toBe(false);
      expect(isValidAvatarId('avatar with spaces')).toBe(false);
      expect(isValidAvatarId('')).toBe(false);
      expect(isValidAvatarId(null)).toBe(false);
      expect(isValidAvatarId(undefined)).toBe(false);
      expect(isValidAvatarId(123)).toBe(false);
    });
  });

  describe('Extensibility via registerAvatar', () => {
    it('allows registering new avatars with valid format', () => {
      const testId = 'test-extensible-avatar';
      registerAvatar({
        id: testId,
        label: 'Extensible Test Avatar',
        category: 'ai',
        tags: ['test', 'future'],
        assetPath: '/assets/avatars/test.png',
        verified: false,
      });

      expect(hasAvatar(testId)).toBe(true);
      const meta = getAvatarById(testId);
      expect(meta?.label).toBe('Extensible Test Avatar');
      expect(meta?.verified).toBe(false);
    });

    it('throws when attempting to register an invalid ID format', () => {
      expect(() =>
        registerAvatar({
          id: '../invalid/path',
          label: 'Bad Avatar',
          category: 'neutral',
          tags: [],
          assetPath: '/bad',
          verified: false,
        }),
      ).toThrowError(/Invalid avatar ID format/);
    });

    it('prevents overwriting canonical base avatar IDs', () => {
      expect(() =>
        registerAvatar({
          id: 'human-classic-male',
          label: 'Imposter Male',
          category: 'human',
          tags: [],
          assetPath: '/assets/avatars/imposter.png',
          verified: false,
        }),
      ).toThrowError(/Cannot overwrite reserved or canonical avatar ID: "human-classic-male"/);

      expect(() =>
        registerAvatar({
          id: 'HUMAN-CLASSIC-FEMALE',
          label: 'Imposter Female',
          category: 'human',
          tags: [],
          assetPath: '/assets/avatars/imposter.png',
          verified: false,
        }),
      ).toThrowError(/Cannot overwrite reserved or canonical avatar ID: "HUMAN-CLASSIC-FEMALE"/);
    });

    it('prevents overwriting reserved alias IDs', () => {
      expect(() =>
        registerAvatar({
          id: 'male',
          label: 'Overwritten Alias',
          category: 'human',
          tags: [],
          assetPath: '/assets/avatars/male.png',
          verified: false,
        }),
      ).toThrowError(/Cannot overwrite reserved or canonical avatar ID: "male"/);

      expect(() =>
        registerAvatar({
          id: 'female',
          label: 'Overwritten Female Alias',
          category: 'human',
          tags: [],
          assetPath: '/assets/avatars/female.png',
          verified: false,
        }),
      ).toThrowError(/Cannot overwrite reserved or canonical avatar ID: "female"/);
    });
  });
});

describe('BEZENT Avatar System — resolveAvatar', () => {
  it('returns missing_id when ID is null, undefined, or empty', () => {
    expect(resolveAvatar(null)).toEqual({
      metadata: null,
      src: null,
      isFallback: true,
      reason: 'missing_id',
    });

    expect(resolveAvatar(undefined)).toEqual({
      metadata: null,
      src: null,
      isFallback: true,
      reason: 'missing_id',
    });

    expect(resolveAvatar('   ')).toEqual({
      metadata: null,
      src: null,
      isFallback: true,
      reason: 'missing_id',
    });
  });

  it('safely rejects malicious or malformed input without error', () => {
    const malicious = resolveAvatar('../../secret/config');
    expect(malicious.isFallback).toBe(true);
    expect(malicious.reason).toBe('unknown_id');
    expect(malicious.src).toBeNull();
  });

  it('resolves valid canonical avatar ID with catalog_match', () => {
    const result = resolveAvatar('human-classic-male');
    expect(result.isFallback).toBe(false);
    expect(result.reason).toBe('catalog_match');
    expect(result.src).toBe('/assets/avatars/avatar-male.png');
    expect(result.metadata?.label).toBe('Classic Male');
  });

  it('resolves recognized alias with alias_match', () => {
    const maleResult = resolveAvatar('male');
    expect(maleResult.isFallback).toBe(false);
    expect(maleResult.reason).toBe('alias_match');
    expect(maleResult.src).toBe('/assets/avatars/avatar-male.png');

    const femaleResult = resolveAvatar('female');
    expect(femaleResult.isFallback).toBe(false);
    expect(femaleResult.reason).toBe('alias_match');
    expect(femaleResult.src).toBe('/assets/avatars/avatar-female.png');
  });

  it('returns unknown_id and fallback for non-existent IDs with valid format', () => {
    const result = resolveAvatar('human-3d-99-nonexistent');
    expect(result.isFallback).toBe(true);
    expect(result.reason).toBe('unknown_id');
    expect(result.src).toBeNull();
    expect(result.metadata).toBeNull();
  });

  it('returns unverified_asset when an avatar is registered but asset is not verified', () => {
    registerAvatar({
      id: 'unverified-pilot',
      label: 'Unverified Pilot',
      category: 'ai',
      tags: [],
      assetPath: '/assets/avatars/3d/unverified.webp',
      verified: false,
    });

    const result = resolveAvatar('unverified-pilot');
    expect(result.isFallback).toBe(true);
    expect(result.reason).toBe('unverified_asset');
    expect(result.src).toBeNull();
    expect(result.metadata?.id).toBe('unverified-pilot');
  });
});
