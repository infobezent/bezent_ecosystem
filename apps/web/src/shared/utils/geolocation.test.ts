import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  readCurrentPosition,
  getGeolocationPermissionState,
  GeolocationError,
} from './geolocation';

describe('Shared Geolocation Utility', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('reports unsupported when navigator.geolocation is absent', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });
    const state = await getGeolocationPermissionState();
    expect(state).toBe('unsupported');

    await expect(readCurrentPosition()).rejects.toThrow(GeolocationError);
  });

  it('reads coordinates accurately when geolocation succeeds', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((success) =>
            success({
              coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 15 },
            }),
          ),
        },
      },
      writable: true,
      configurable: true,
    });

    const coords = await readCurrentPosition();
    expect(coords).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 15,
    });
  });
});
