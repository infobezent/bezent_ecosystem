export type GeolocationErrorCode =
  'UNSUPPORTED' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';

export class GeolocationError extends Error {
  readonly code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
    Object.setPrototypeOf(this, GeolocationError.prototype);
  }
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Checks the browser's current geolocation permission state without triggering a prompt.
 * Returns 'granted' | 'prompt' | 'denied' | 'unsupported'.
 */
export async function getGeolocationPermissionState(): Promise<PermissionState | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }
  if (typeof navigator.permissions?.query !== 'function') {
    return 'prompt';
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Captures current GPS coordinates using navigator.geolocation.
 * Formats errors into user-friendly GeolocationError instances with standard codes.
 */
export function readCurrentPosition(options?: PositionOptions): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(
        new GeolocationError('UNSUPPORTED', 'Geolocation is not supported by your browser.'),
      );
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude),
          longitude: Number(pos.coords.longitude),
          accuracy:
            typeof pos.coords.accuracy === 'number' ? Number(pos.coords.accuracy) : undefined,
        });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(
              new GeolocationError(
                'PERMISSION_DENIED',
                'Location permission was denied. Please allow location access in your browser to record attendance.',
              ),
            );
            break;
          case err.POSITION_UNAVAILABLE:
            reject(
              new GeolocationError(
                'POSITION_UNAVAILABLE',
                'Unable to determine your location. Please ensure location services or GPS are enabled on your device.',
              ),
            );
            break;
          case err.TIMEOUT:
            reject(
              new GeolocationError(
                'TIMEOUT',
                'Location request timed out. Please check your signal and try again.',
              ),
            );
            break;
          default:
            reject(
              new GeolocationError(
                'UNKNOWN',
                'An unexpected error occurred while capturing your location. Please try again.',
              ),
            );
            break;
        }
      },
      defaultOptions,
    );
  });
}
