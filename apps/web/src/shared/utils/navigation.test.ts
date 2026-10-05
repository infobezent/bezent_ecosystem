import { describe, expect, it } from 'vitest';
import type { ApplicationNavigation } from '../types/navigation';
import { destinationPath, resolveActiveNavigation } from './navigation';

const navigation: ApplicationNavigation = {
  categories: [{ id: 'c', label: 'C', icon: 'apps' }],
  destinations: [
    { id: 'alpha', label: 'Alpha', icon: 'home', segment: 'alpha', sidebar: true },
    {
      id: 'beta',
      label: 'Beta',
      icon: 'home',
      segment: 'beta',
      categoryId: 'c',
      children: [
        { id: 'one', label: 'One', icon: 'home' },
        { id: 'two', label: 'Two', icon: 'home' },
      ],
    },
    {
      id: 'gamma',
      label: 'Gamma',
      icon: 'home',
      segment: 'default-seg',
      children: [
        { id: 'custom', label: 'Custom Path', icon: 'home', path: 'direct-path' },
      ],
    },
  ],
};

describe('destinationPath', () => {
  it('builds destination and child paths under the base path', () => {
    const beta = navigation.destinations[1]!;
    expect(destinationPath('/app', beta)).toBe('/app/beta');
    expect(destinationPath('/app', beta, 'two')).toBe('/app/beta/two');
  });

  it('honors custom child path override when specified', () => {
    const gamma = navigation.destinations[2]!;
    expect(destinationPath('/app', gamma, 'custom')).toBe('/app/direct-path');
  });

  it('navigates directly to single child path when destination has exactly one child', () => {
    const gamma = navigation.destinations[2]!;
    expect(destinationPath('/app', gamma)).toBe('/app/direct-path');
  });

  it('keeps base segment when destination has multiple children or no children', () => {
    const alpha = navigation.destinations[0]!;
    const beta = navigation.destinations[1]!;
    expect(destinationPath('/app', alpha)).toBe('/app/alpha');
    expect(destinationPath('/app', beta)).toBe('/app/beta');
  });
});

describe('resolveActiveNavigation', () => {
  it('selects a destination from its exact path', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/app/alpha')).toEqual({
      destinationId: 'alpha',
    });
  });

  it('ignores a trailing slash', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/app/alpha/')).toEqual({
      destinationId: 'alpha',
    });
  });

  it('selects parent and child for a child path', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/app/beta/two')).toEqual({
      destinationId: 'beta',
      childId: 'two',
    });
  });

  it('selects parent and child for custom child path override', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/app/direct-path')).toEqual({
      destinationId: 'gamma',
      childId: 'custom',
    });
  });

  it('preserves parent and child for nested detail route under child', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/app/direct-path/detail_123')).toEqual({
      destinationId: 'gamma',
      childId: 'custom',
    });
  });

  it('keeps the parent selected for an unknown child path under root', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/app/beta/missing')).toEqual({
      destinationId: 'beta',
      childId: undefined,
    });
  });

  it('returns undefined outside the application or for unknown destinations', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/other/alpha')).toBeUndefined();
    expect(resolveActiveNavigation(navigation, '/app', '/app/unknown')).toBeUndefined();
    expect(resolveActiveNavigation(navigation, '/app', '/app')).toBeUndefined();
  });

  it('does not match a destination by path prefix alone', () => {
    expect(resolveActiveNavigation(navigation, '/app', '/app/alphabet')).toBeUndefined();
  });
});
