/**
 * BEZENT Common Data Engine - Normalization Primitives
 */

import type {
  IdentifierNormalizationOptions,
  TextNormalizationOptions,
} from '../contracts/normalization.types.js';

/**
 * Normalizes text while preserving Unicode characters and optionally collapsing repeated whitespace.
 */
export function normalizeText(
  value: string | null | undefined,
  options: TextNormalizationOptions = {},
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  let text = String(value);
  if (options.trim !== false) {
    text = text.trim();
  }

  if (options.collapseWhitespace) {
    text = text.replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ');
    if (options.trim !== false) {
      text = text.trim();
    }
  }

  return text.length > 0 ? text : null;
}

/**
 * Normalizes email: trims and converts to lowercase.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes phone number to E.164-style representation where possible.
 * If leading + is present, formats cleanly.
 * If countryCode is provided (e.g. "IN" -> "+91"), ensures calling code prefix if not already present.
 */
export function normalizePhone(
  phone: string | null | undefined,
  countryCallingCode?: string,
): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Check if starts with '+'
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return null;

  if (hasLeadingPlus) {
    return `+${digits}`;
  }

  if (countryCallingCode) {
    const cleanCallingCode = countryCallingCode.replace(/\D/g, '');
    if (cleanCallingCode && !digits.startsWith(cleanCallingCode)) {
      return `+${cleanCallingCode}${digits}`;
    }
    return `+${digits}`;
  }

  // Return digits with clean standard representation
  return digits;
}

/**
 * Normalizes country code to canonical ISO 3166-1 alpha-2 uppercase.
 */
export function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Common name-to-code fallbacks for high-frequency countries
  const commonNames: Record<string, string> = {
    INDIA: 'IN',
    'UNITED STATES': 'US',
    USA: 'US',
    'UNITED KINGDOM': 'GB',
    UK: 'GB',
    CANADA: 'CA',
    AUSTRALIA: 'AU',
    GERMANY: 'DE',
    SINGAPORE: 'SG',
    'UNITED ARAB EMIRATES': 'AE',
    UAE: 'AE',
  };
  return commonNames[trimmed] || (trimmed.length === 2 ? trimmed : null);
}

/**
 * Normalizes region / state code to uppercase trimmed representation.
 */
export function normalizeRegionCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes postal code based on country requirements.
 * Capitalizes alphanumeric codes (e.g. UK, Canada) and normalizes internal spacing.
 */
export function normalizePostalCode(
  postalCode: string | null | undefined,
  countryCode?: string,
): string | null {
  if (!postalCode) return null;
  let trimmed = postalCode.trim();
  if (!trimmed) return null;

  const upperCountry = countryCode?.trim().toUpperCase();

  if (upperCountry === 'GB') {
    // UK postcodes: uppercase, collapse internal spaces to single space
    trimmed = trimmed.toUpperCase().replace(/\s+/g, ' ');
    return trimmed;
  }

  if (upperCountry === 'CA') {
    // Canadian postal codes: uppercase, format A1A 1A1
    const clean = trimmed.toUpperCase().replace(/\s+/g, '');
    if (clean.length === 6) {
      return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    }
    return clean;
  }

  if (upperCountry === 'IN' || upperCountry === 'US' || upperCountry === 'AU' || upperCountry === 'DE') {
    // Strip extraneous whitespace
    return trimmed.replace(/\s+/g, '');
  }

  return trimmed;
}

/**
 * Normalizes business identifier / code.
 */
export function normalizeIdentifier(
  identifier: string | null | undefined,
  options: IdentifierNormalizationOptions = {},
): string | null {
  if (!identifier) return null;
  let cleaned = identifier.trim();
  if (!cleaned) return null;

  if (options.replacementChar) {
    cleaned = cleaned.replace(/[\s\-_]+/g, options.replacementChar);
  }

  if (options.uppercase !== false) {
    cleaned = cleaned.toUpperCase();
  }

  return cleaned;
}
