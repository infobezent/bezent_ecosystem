import {
  readCurrentPosition as sharedReadCurrentPosition,
  getGeolocationPermissionState,
  GeolocationError,
  type GeolocationErrorCode,
  type GeoCoordinates,
} from '../../../../shared/utils/geolocation';
import { isLocationRequiredError, type PunchDeviceMetadata } from '../api/essApi';

export {
  getGeolocationPermissionState,
  GeolocationError,
  type GeolocationErrorCode,
  type GeoCoordinates,
};

/**
 * Captures current GPS coordinates for an attendance punch action.
 */
export async function readCurrentPosition(options?: PositionOptions): Promise<PunchDeviceMetadata> {
  const coords = await sharedReadCurrentPosition(options);
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
  };
}

/**
 * Maps backend and browser punch errors to clean, employee-facing messages.
 * Never leaks stack traces or raw coordinates.
 */
export function formatPunchErrorMessage(err: unknown): string {
  if (err instanceof GeolocationError) {
    return err.message;
  }

  if (err && typeof err === 'object') {
    const e = err as { code?: string; message?: string };
    if (
      e.code === 'LOCATION_REQUIRED' ||
      (e.message && e.message.toLowerCase().includes('location is required'))
    ) {
      return 'Location is required to record attendance. Please allow location access in your browser and try again.';
    }
    if (
      e.code === 'OUTSIDE_GEOFENCE' ||
      (e.message && e.message.toLowerCase().includes('outside the permitted'))
    ) {
      return 'You are outside the permitted office location or geofence boundary.';
    }
    if (
      e.code === 'IP_NOT_ALLOWED' ||
      (e.message && e.message.toLowerCase().includes('approved office network'))
    ) {
      return 'Attendance can only be punched from an approved office network.';
    }
    if (e.code === 'PUNCH_THROTTLED') {
      return e.message || 'Please wait before punching again.';
    }
    if (e.code === 'WEB_PUNCH_DISABLED') {
      return (
        e.message ||
        'Web browser punch is disabled by your organization attendance policy. Please use an authorized kiosk or mobile device.'
      );
    }
    if (e.code === 'MOBILE_PUNCH_DISABLED') {
      return e.message || 'Mobile app punch is disabled by your organization attendance policy.';
    }
    if (e.code === 'SELFIE_REQUIRED') {
      return e.message || 'Selfie photo verification is required to punch attendance.';
    }
    if (e.message) {
      // Prevent stack trace or raw coordinate leakage in UI
      if (
        e.message.includes('at ') ||
        e.message.includes('\n') ||
        /latitude|longitude/i.test(e.message)
      ) {
        return 'An error occurred while recording attendance. Please try again.';
      }
      return e.message;
    }
  }

  if (typeof err === 'string') {
    return err;
  }

  return 'An error occurred while recording attendance. Please try again.';
}

/**
 * Orchestrates punch submission with GPS coordinates:
 * 1. If browser permission is already 'granted', captures position immediately so the request
 *    payload includes coordinates on the first attempt without an initial 400 rejection.
 * 2. If browser permission is 'prompt', 'denied', or unsupported, attempts the punch without
 *    coordinates first. If the company does not enforce strict GPS, this succeeds without prompting.
 * 3. If the server rejects with LOCATION_REQUIRED, captures position (triggering the browser prompt)
 *    and retries the punch with the captured deviceMetadata.
 */
export async function executePunchWithLocation<T>(
  punchAction: (deviceMetadata?: PunchDeviceMetadata) => Promise<T>,
): Promise<T> {
  const permState = await getGeolocationPermissionState();

  if (permState === 'granted') {
    try {
      const coords = await readCurrentPosition();
      return await punchAction(coords);
    } catch (geoErr) {
      // If position retrieval failed despite permission being granted (e.g. GPS hardware off, timeout),
      // fallback to punch without location in case the company policy allows it.
      try {
        return await punchAction();
      } catch (punchErr) {
        if (isLocationRequiredError(punchErr)) {
          throw geoErr;
        }
        throw punchErr;
      }
    }
  }

  // Permission is 'prompt', 'denied', or 'unsupported'.
  // Attempt punch without location first (avoids unnecessary prompts when location is optional).
  try {
    return await punchAction();
  } catch (punchErr) {
    if (isLocationRequiredError(punchErr)) {
      // Strictly required by company geofence policy.
      const coords = await readCurrentPosition();
      return await punchAction(coords);
    }
    throw punchErr;
  }
}
