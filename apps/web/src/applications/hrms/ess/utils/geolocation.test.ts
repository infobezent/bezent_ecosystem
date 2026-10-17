import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executePunchWithLocation,
  formatPunchErrorMessage,
  readCurrentPosition,
  getGeolocationPermissionState,
  GeolocationError,
} from './geolocation';
import type { PunchDeviceMetadata } from '../api/essApi';

describe('ESS Geolocation Integration', () => {
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

  function mockNavigator(
    permissionState: PermissionState | 'unsupported',
    coords?: { latitude: number; longitude: number; accuracy?: number },
    errorCode?: number,
  ) {
    const mockGeolocation = {
      getCurrentPosition: vi.fn(
        (
          success: (pos: GeolocationPosition) => void,
          error: (err: GeolocationPositionError) => void,
        ) => {
          if (errorCode !== undefined) {
            error({
              code: errorCode,
              message: 'Mock geolocation error',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as unknown as GeolocationPositionError);
          } else if (coords) {
            success({
              coords: {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy ?? 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            } as GeolocationPosition);
          }
        },
      ),
    };

    const mockPermissions =
      permissionState === 'unsupported'
        ? undefined
        : {
            query: vi.fn().mockResolvedValue({ state: permissionState }),
          };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: mockGeolocation,
        permissions: mockPermissions,
      },
      writable: true,
      configurable: true,
    });

    return { mockGeolocation, mockPermissions };
  }

  describe('getGeolocationPermissionState', () => {
    it('returns "granted" when permissions API reports granted', async () => {
      mockNavigator('granted');
      const state = await getGeolocationPermissionState();
      expect(state).toBe('granted');
    });

    it('returns "prompt" when permissions API reports prompt', async () => {
      mockNavigator('prompt');
      const state = await getGeolocationPermissionState();
      expect(state).toBe('prompt');
    });

    it('returns "denied" when permissions API reports denied', async () => {
      mockNavigator('denied');
      const state = await getGeolocationPermissionState();
      expect(state).toBe('denied');
    });

    it('returns "unsupported" when navigator.geolocation is not available', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const state = await getGeolocationPermissionState();
      expect(state).toBe('unsupported');
    });
  });

  describe('readCurrentPosition', () => {
    it('resolves with latitude, longitude and accuracy on success', async () => {
      mockNavigator('granted', { latitude: 12.9716, longitude: 80.2437, accuracy: 5 });
      const pos = await readCurrentPosition();
      expect(pos).toEqual({
        latitude: 12.9716,
        longitude: 80.2437,
        accuracy: 5,
      });
    });

    it('maps PERMISSION_DENIED (code 1) to user-friendly GeolocationError', async () => {
      mockNavigator('denied', undefined, 1);
      await expect(readCurrentPosition()).rejects.toThrow(GeolocationError);
      try {
        await readCurrentPosition();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GeolocationError);
        expect((err as GeolocationError).code).toBe('PERMISSION_DENIED');
        expect((err as GeolocationError).message).toContain('Location permission was denied');
      }
    });

    it('maps POSITION_UNAVAILABLE (code 2) to user-friendly GeolocationError', async () => {
      mockNavigator('granted', undefined, 2);
      try {
        await readCurrentPosition();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GeolocationError);
        expect((err as GeolocationError).code).toBe('POSITION_UNAVAILABLE');
        expect((err as GeolocationError).message).toContain('Unable to determine your location');
      }
    });

    it('maps TIMEOUT (code 3) to user-friendly GeolocationError', async () => {
      mockNavigator('granted', undefined, 3);
      try {
        await readCurrentPosition();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GeolocationError);
        expect((err as GeolocationError).code).toBe('TIMEOUT');
        expect((err as GeolocationError).message).toContain('Location request timed out');
      }
    });
  });

  describe('formatPunchErrorMessage', () => {
    it('formats GeolocationError cleanly', () => {
      const err = new GeolocationError('PERMISSION_DENIED', 'Permission denied message');
      expect(formatPunchErrorMessage(err)).toBe('Permission denied message');
    });

    it('formats backend LOCATION_REQUIRED code', () => {
      const err = Object.assign(new Error('Backend says location needed'), {
        code: 'LOCATION_REQUIRED',
      });
      expect(formatPunchErrorMessage(err)).toBe(
        'Location is required to record attendance. Please allow location access in your browser and try again.',
      );
    });

    it('formats backend OUTSIDE_GEOFENCE code', () => {
      const err = Object.assign(new Error('Outside geofence'), { code: 'OUTSIDE_GEOFENCE' });
      expect(formatPunchErrorMessage(err)).toBe(
        'You are outside the permitted office location or geofence boundary.',
      );
    });

    it('formats backend IP_NOT_ALLOWED code', () => {
      const err = Object.assign(new Error('IP blocked'), { code: 'IP_NOT_ALLOWED' });
      expect(formatPunchErrorMessage(err)).toBe(
        'Attendance can only be punched from an approved office network.',
      );
    });

    it('formats backend PUNCH_THROTTLED code', () => {
      const err = Object.assign(new Error('Please wait 15s before punching again.'), {
        code: 'PUNCH_THROTTLED',
      });
      expect(formatPunchErrorMessage(err)).toBe('Please wait 15s before punching again.');
    });

    it('sanitizes stack traces and raw coordinates from error message', () => {
      const err = new Error(
        'Internal server failure at Object.checkGeofence (latitude: 12.9716, longitude: 80.2437)\n    at line 190',
      );
      expect(formatPunchErrorMessage(err)).toBe(
        'An error occurred while recording attendance. Please try again.',
      );
    });
  });

  describe('executePunchWithLocation orchestration', () => {
    it('includes GPS coordinates on first attempt when Chrome permission is already granted', async () => {
      mockNavigator('granted', { latitude: 12.9716, longitude: 80.2437, accuracy: 8 });

      const punchAction = vi.fn().mockResolvedValue({ success: true });
      const result = await executePunchWithLocation(punchAction);

      expect(result).toEqual({ success: true });
      expect(punchAction).toHaveBeenCalledTimes(1);
      expect(punchAction).toHaveBeenCalledWith({
        latitude: 12.9716,
        longitude: 80.2437,
        accuracy: 8,
      });
    });

    it('handles location optional: succeeds on first try without coordinates when permission is prompt', async () => {
      mockNavigator('prompt');

      const punchAction = vi
        .fn()
        .mockImplementation(async (deviceMetadata?: PunchDeviceMetadata) => {
          // Location optional company accepts punch without coordinates
          return { punched: true, deviceMetadata };
        });

      const result = await executePunchWithLocation(punchAction);

      expect(result).toEqual({ punched: true, deviceMetadata: undefined });
      expect(punchAction).toHaveBeenCalledTimes(1);
      expect(punchAction).toHaveBeenCalledWith();
    });

    it('handles location required when permission is prompt: retries with GPS after 400 LOCATION_REQUIRED', async () => {
      mockNavigator('prompt', { latitude: 12.9716, longitude: 80.2437, accuracy: 12 });

      let attempts = 0;
      const punchAction = vi
        .fn()
        .mockImplementation(async (deviceMetadata?: PunchDeviceMetadata) => {
          attempts++;
          if (!deviceMetadata) {
            const err = new Error('Your location is required to punch attendance.');
            Object.assign(err, { code: 'LOCATION_REQUIRED' });
            throw err;
          }
          return { punched: true, deviceMetadata };
        });

      const result = await executePunchWithLocation(punchAction);

      expect(result).toEqual({
        punched: true,
        deviceMetadata: { latitude: 12.9716, longitude: 80.2437, accuracy: 12 },
      });
      expect(attempts).toBe(2);
      expect(punchAction).toHaveBeenNthCalledWith(1);
      expect(punchAction).toHaveBeenNthCalledWith(2, {
        latitude: 12.9716,
        longitude: 80.2437,
        accuracy: 12,
      });
    });

    it('handles location required when user denies permission: throws clean PERMISSION_DENIED error', async () => {
      mockNavigator('prompt', undefined, 1);

      const punchAction = vi
        .fn()
        .mockImplementation(async (deviceMetadata?: PunchDeviceMetadata) => {
          if (!deviceMetadata) {
            const err = new Error('Location required');
            Object.assign(err, { code: 'LOCATION_REQUIRED' });
            throw err;
          }
          return { success: true };
        });

      await expect(executePunchWithLocation(punchAction)).rejects.toThrow(GeolocationError);
      expect(punchAction).toHaveBeenCalledTimes(1);
    });

    it('handles location required with GPS timeout: throws clean TIMEOUT error', async () => {
      mockNavigator('prompt', undefined, 3);

      const punchAction = vi
        .fn()
        .mockImplementation(async (deviceMetadata?: PunchDeviceMetadata) => {
          if (!deviceMetadata) {
            const err = new Error('Location required');
            Object.assign(err, { code: 'LOCATION_REQUIRED' });
            throw err;
          }
          return { success: true };
        });

      try {
        await executePunchWithLocation(punchAction);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GeolocationError);
        expect((err as GeolocationError).code).toBe('TIMEOUT');
        expect(formatPunchErrorMessage(err)).toContain('Location request timed out');
      }
    });

    it('handles backend geofence rejection', async () => {
      mockNavigator('granted', { latitude: 28.6139, longitude: 77.209, accuracy: 10 });

      const punchAction = vi.fn().mockImplementation(async () => {
        const err = new Error('You are outside the permitted attendance location.');
        Object.assign(err, { code: 'OUTSIDE_GEOFENCE' });
        throw err;
      });

      try {
        await executePunchWithLocation(punchAction);
      } catch (err: unknown) {
        expect(formatPunchErrorMessage(err)).toBe(
          'You are outside the permitted office location or geofence boundary.',
        );
      }
    });

    it('works identically for Check In and Check Out payloads', async () => {
      mockNavigator('granted', { latitude: 12.9716, longitude: 80.2437, accuracy: 5 });

      // Check In
      const checkInAction = vi.fn().mockResolvedValue({ id: 'att-1', status: 'present' });
      await executePunchWithLocation((meta) =>
        checkInAction({ workLocation: 'office', deviceMetadata: meta }),
      );
      expect(checkInAction).toHaveBeenCalledWith({
        workLocation: 'office',
        deviceMetadata: { latitude: 12.9716, longitude: 80.2437, accuracy: 5 },
      });

      // Check Out
      const checkOutAction = vi.fn().mockResolvedValue({ id: 'att-1', status: 'checked_out' });
      await executePunchWithLocation((meta) => checkOutAction({ deviceMetadata: meta }));
      expect(checkOutAction).toHaveBeenCalledWith({
        deviceMetadata: { latitude: 12.9716, longitude: 80.2437, accuracy: 5 },
      });
    });
  });
});
