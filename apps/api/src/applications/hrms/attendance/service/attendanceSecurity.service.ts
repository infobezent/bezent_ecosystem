import { BadRequestError, ForbiddenError } from '../../../../app/errors/AppError.js';
import {
  attendanceRepository,
  type AttendanceRepository,
} from '../repository/attendance.repository.js';
import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';
import type { AttendanceSecuritySettings } from '../../../../db/schema.js';

/**
 * Enforces the company's Location & Security settings on employee self-punches
 * (ESS web/mobile check-in and check-out).
 *
 * Unconfigured tenants keep today's behaviour: nothing blocks unless an admin
 * explicitly configured a strict geofence, an enforced IP allowlist, or a
 * throttle. Suspicious-but-allowed signals are returned as `flags` and stored
 * with the punch (`deviceMetadata.securityFlags`) for review.
 *
 * Not enforced here (no reliable data source yet): VPN/proxy detection and
 * max-devices-per-employee. Both need a client device identity / IP-intel feed.
 */

export const LOCATION_REQUIRED_CODE = 'LOCATION_REQUIRED';

/** Implied speed above which two consecutive punches are flagged as impossible travel. */
const IMPOSSIBLE_TRAVEL_KMH = 900;
const EARTH_RADIUS_METERS = 6_371_000;

export interface PunchSecurityInput {
  punchType: 'in' | 'out';
  clientIp?: string;
  deviceMetadata?: Record<string, unknown>;
  now?: Date;
}

export interface PunchSecurityDecision {
  flags: string[];
  deviceMetadata: Record<string, unknown>;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

export function readCoordinates(meta?: Record<string, unknown>): Coordinates | null {
  if (!meta) return null;
  const latitude = Number(meta.latitude);
  const longitude = Number(meta.longitude);
  if (
    meta.latitude === undefined ||
    meta.longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

/** Matches an IPv4 address against exact entries and IPv4 CIDR ranges. IPv6 matches exactly only. */
export function ipMatchesAllowlist(clientIp: string, allowlist: string[]): boolean {
  const ip = normalizeIp(clientIp);
  const ipInt = ipv4ToInt(ip);
  return allowlist.some((entry) => {
    const rule = entry.trim();
    if (!rule) return false;
    if (!rule.includes('/')) return normalizeIp(rule) === ip;
    const [base, bitsRaw] = rule.split('/');
    const bits = Number(bitsRaw);
    const baseInt = ipv4ToInt(normalizeIp(base ?? ''));
    if (ipInt === null || baseInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
      return false;
    }
    if (bits === 0) return true;
    const mask = bits === 32 ? 0xffffffff : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) >>> 0 === (baseInt & mask) >>> 0;
  });
}

export class AttendanceSecurityService {
  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
    private readonly attendanceRepo: AttendanceRepository = attendanceRepository,
  ) {}

  /**
   * Throws when a blocking rule is violated; otherwise returns advisory flags
   * and the device metadata to persist with the punch.
   */
  async assertPunchAllowed(
    tenantId: string,
    companyId: string,
    employeeId: string,
    input: PunchSecurityInput,
  ): Promise<PunchSecurityDecision> {
    const settings = await this.settingsRepo.getSecuritySettings(tenantId, companyId);
    const baseMetadata = { ...(input.deviceMetadata ?? {}) };
    if (!settings) {
      return { flags: [], deviceMetadata: baseMetadata };
    }

    const flags: string[] = [];
    const now = input.now ?? new Date();
    const coords = readCoordinates(input.deviceMetadata);

    this.checkIpAllowlist(settings, input.clientIp, flags);
    this.checkGeofence(settings, coords, flags);
    await this.checkLatestPunch(
      settings,
      tenantId,
      companyId,
      employeeId,
      input,
      coords,
      now,
      flags,
    );

    if (settings.detectMockLocation && this.isMockLocation(input.deviceMetadata)) {
      flags.push('mock_location_suspected');
    }

    const deviceMetadata =
      flags.length > 0 ? { ...baseMetadata, securityFlags: flags } : baseMetadata;
    return { flags, deviceMetadata };
  }

  private checkIpAllowlist(
    settings: AttendanceSecuritySettings,
    clientIp: string | undefined,
    flags: string[],
  ): void {
    const allowlist = (settings.ipAllowlist ?? []).filter(Boolean);
    if (allowlist.length === 0) return;
    const allowed = clientIp ? ipMatchesAllowlist(clientIp, allowlist) : false;
    if (allowed) return;
    if (settings.enforceIpRestriction) {
      throw new ForbiddenError(
        'Attendance can only be punched from an approved office network.',
        'IP_NOT_ALLOWED',
      );
    }
    flags.push('ip_outside_allowlist');
  }

  private checkGeofence(
    settings: AttendanceSecuritySettings,
    coords: Coordinates | null,
    flags: string[],
  ): void {
    const fences = settings.geofenceConfigs ?? [];
    if (fences.length === 0) return;
    const hasStrictFence = fences.some((f) => f.enforceStrict);

    if (!coords) {
      if (hasStrictFence) {
        throw new BadRequestError(
          'Your location is required to punch attendance. Please allow location access.',
          LOCATION_REQUIRED_CODE,
        );
      }
      if (settings.enableGps) flags.push('location_missing');
      return;
    }

    const insideAny = fences.some(
      (f) =>
        distanceMeters(coords, { latitude: f.latitude, longitude: f.longitude }) <= f.radiusMeters,
    );
    if (insideAny) return;
    if (hasStrictFence) {
      throw new ForbiddenError(
        'You are outside the permitted attendance location.',
        'OUTSIDE_GEOFENCE',
      );
    }
    flags.push('outside_geofence');
  }

  private async checkLatestPunch(
    settings: AttendanceSecuritySettings,
    tenantId: string,
    companyId: string,
    employeeId: string,
    input: PunchSecurityInput,
    coords: Coordinates | null,
    now: Date,
    flags: string[],
  ): Promise<void> {
    const needsLatest =
      settings.rapidPunchThrottlingSeconds > 0 || (settings.detectImpossibleTravel && coords);
    if (!needsLatest) return;

    const latest = await this.attendanceRepo.getLatestPunch(tenantId, companyId, employeeId);
    if (!latest) return;
    // Punch times are stored with 1s precision and may round slightly ahead of `now`.
    const elapsedSeconds = Math.max(0, (now.getTime() - latest.punchTime.getTime()) / 1000);

    if (
      settings.rapidPunchThrottlingSeconds > 0 &&
      latest.punchType === input.punchType &&
      elapsedSeconds < settings.rapidPunchThrottlingSeconds
    ) {
      throw new BadRequestError(
        `Please wait ${Math.ceil(settings.rapidPunchThrottlingSeconds - elapsedSeconds)} seconds before punching again.`,
        'PUNCH_THROTTLED',
      );
    }

    if (settings.detectImpossibleTravel && coords) {
      const previous = readCoordinates(latest.deviceMetadata ?? undefined);
      if (previous) {
        const hours = Math.max(elapsedSeconds, 1) / 3600;
        const kmh = distanceMeters(previous, coords) / 1000 / hours;
        if (kmh > IMPOSSIBLE_TRAVEL_KMH) flags.push('impossible_travel');
      }
    }
  }

  private isMockLocation(meta?: Record<string, unknown>): boolean {
    if (!meta) return false;
    return meta.mockLocation === true || meta.isMock === true || meta.mocked === true;
  }
}

export const attendanceSecurityService = new AttendanceSecurityService();
