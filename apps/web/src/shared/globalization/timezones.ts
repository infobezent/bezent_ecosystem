/**
 * BEZENT IANA Timezone Dataset & Dynamic Offset Calculation
 */

import type { TimezoneInfo } from './types';

/**
 * Calculates current or date-specific UTC offset string and minutes for an IANA timezone using native Intl.
 */
export function getTimezoneOffsetDetails(
  timeZone: string,
  date: Date = new Date(),
): { offset: string; offsetMinutes: number; abbreviation: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';

    // Parse GMT+05:30, GMT-5, GMT+0, etc.
    let offset = '+00:00';
    let offsetMinutes = 0;
    const match = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (match && match[1] && match[2]) {
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2], 10);
      const mins = match[3] ? parseInt(match[3], 10) : 0;
      offsetMinutes = sign * (hours * 60 + mins);
      const signStr = sign < 0 ? '-' : '+';
      const paddedHours = String(hours).padStart(2, '0');
      const paddedMins = String(mins).padStart(2, '0');
      offset = `${signStr}${paddedHours}:${paddedMins}`;
    }

    // Short abbreviation
    const abbrFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    });
    const abbr = abbrFormatter.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || 'UTC';

    return { offset, offsetMinutes, abbreviation: abbr };
  } catch {
    return { offset: '+00:00', offsetMinutes: 0, abbreviation: 'UTC' };
  }
}

/**
 * Core canonical business timezones across continents
 */
const CANONICAL_TIMEZONE_IDS: readonly string[] = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Riyadh',
  'Asia/Qatar',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Muscat',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Seoul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Santiago',
  'America/Bogota',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Zurich',
  'Europe/Vienna',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/Athens',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Lisbon',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Casablanca',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Pacific/Auckland',
  'Pacific/Fiji',
];

export const TIMEZONES: readonly TimezoneInfo[] = CANONICAL_TIMEZONE_IDS.map((id) => {
  const { offset, offsetMinutes, abbreviation } = getTimezoneOffsetDetails(id);
  const region = id.includes('/') ? (id.split('/')[0] || 'Global') : 'Global';
  return {
    id,
    label: `${id} (${abbreviation} ${offset})`,
    offset,
    offsetMinutes,
    abbreviation,
    region,
  };
});

const TIMEZONE_MAP = new Map<string, TimezoneInfo>(
  TIMEZONES.map((tz) => [tz.id.toLowerCase(), tz]),
);

export function getAllTimezones(): readonly TimezoneInfo[] {
  return TIMEZONES;
}

export function getTimezone(id?: string | null): TimezoneInfo | undefined {
  if (!id) return undefined;
  const direct = TIMEZONE_MAP.get(id.trim().toLowerCase());
  if (direct) return direct;

  // If valid in Intl, construct dynamically
  try {
    const details = getTimezoneOffsetDetails(id.trim());
    const region = id.includes('/') ? (id.split('/')[0] || 'Custom') : 'Custom';
    return {
      id: id.trim(),
      label: `${id.trim()} (${details.abbreviation} ${details.offset})`,
      ...details,
      region,
    };
  } catch {
    return undefined;
  }
}

export function searchTimezones(query: string): TimezoneInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...TIMEZONES];
  return TIMEZONES.filter(
    (tz) =>
      tz.id.toLowerCase().includes(q) ||
      tz.label.toLowerCase().includes(q) ||
      tz.abbreviation.toLowerCase().includes(q) ||
      tz.offset.includes(q) ||
      tz.region.toLowerCase().includes(q),
  );
}

export function isValidTimezone(id?: string | null): boolean {
  if (!id) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: id.trim() });
    return true;
  } catch {
    return false;
  }
}
