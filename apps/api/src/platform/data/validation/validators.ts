/**
 * BEZENT Common Data Engine - Validation Primitives
 */

import type {
  EmailValidationOptions,
  IdentifierValidationOptions,
  PhoneValidationOptions,
  PostalValidationOptions,
  StandardCodeValidationOptions,
  TextValidationOptions,
  UrlValidationOptions,
  ValidationResult,
} from '../contracts/validation.types.js';
import { COUNTRIES, CURRENCIES, TIMEZONES } from '../reference/datasets.js';

// Standard RFC 5322-compliant structure regex
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// E.164 and common international phone pattern (7 to 20 digits, optional leading plus, optional formatting)
const INTERNATIONAL_PHONE_REGEX = /^\+?[0-9\s\-().]{7,25}$/;
const INDIA_PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const US_PHONE_REGEX = /^(?:\+1|1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/;

// Country postal code patterns
const POSTAL_PATTERNS: Record<string, { regex: RegExp; description: string }> = {
  IN: { regex: /^\d{6}$/, description: '6-digit numeric PIN code' },
  US: { regex: /^\d{5}(?:-\d{4})?$/, description: '5-digit ZIP code or ZIP+4' },
  GB: {
    regex: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/,
    description: 'UK alphanumeric postcode (e.g. SW1A 1AA)',
  },
  CA: {
    regex: /^[A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d$/,
    description: 'Canadian postal code (e.g. K1A 0B1)',
  },
  AU: { regex: /^\d{4}$/, description: '4-digit Australian postal code' },
  DE: { regex: /^\d{5}$/, description: '5-digit German postal code' },
  SG: { regex: /^\d{6}$/, description: '6-digit Singapore postal code' },
  AE: { regex: /^.*$/, description: 'United Arab Emirates does not mandate postal codes' },
};

const GENERIC_POSTAL_REGEX = /^[A-Za-z0-9\s-]{2,20}$/;
const DEFAULT_IDENTIFIER_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * Validates text string input with safe Unicode handling.
 */
export function validateText(
  value: unknown,
  options: TextValidationOptions = {},
): ValidationResult<string> {
  const {
    required = false,
    minLength,
    maxLength,
    pattern,
    patternMessage,
    allowEmpty = false,
    trim = true,
  } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { isValid: false, error: 'Text is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Expected string value' };
  }

  const processed = trim ? value.trim() : value;

  if (processed.length === 0) {
    if (required && !allowEmpty) {
      return { isValid: false, error: 'Text cannot be empty' };
    }
    return { isValid: true, value: processed };
  }

  // Count Unicode code points correctly
  const codePointLength = Array.from(processed).length;

  if (minLength !== undefined && codePointLength < minLength) {
    return {
      isValid: false,
      error: `Must be at least ${minLength} character${minLength === 1 ? '' : 's'}`,
    };
  }

  if (maxLength !== undefined && codePointLength > maxLength) {
    return {
      isValid: false,
      error: `Cannot exceed ${maxLength} character${maxLength === 1 ? '' : 's'}`,
    };
  }

  if (pattern && !pattern.test(processed)) {
    return {
      isValid: false,
      error: patternMessage || 'Value does not match required format',
    };
  }

  return { isValid: true, value: processed };
}

/**
 * Validates email according to RFC standards with 254-character boundary.
 */
export function validateEmail(
  value: unknown,
  options: EmailValidationOptions = {},
): ValidationResult<string> {
  const { required = false, maxLength = 254 } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Email address is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Email must be a string' };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) {
      return { isValid: false, error: 'Email address is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Email address cannot exceed ${maxLength} characters` };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Invalid email address format' };
  }

  // Reject consecutive dots or dot at ends of local/domain parts
  const [localPart, domainPart] = trimmed.split('@');
  if (!localPart || !domainPart || localPart.includes('..') || domainPart.includes('..')) {
    return { isValid: false, error: 'Invalid email address structure' };
  }

  return { isValid: true, value: trimmed.toLowerCase() };
}

/**
 * Validates telephone number with international/country awareness.
 */
export function validatePhone(
  value: unknown,
  options: PhoneValidationOptions = {},
): ValidationResult<string> {
  const { required = false, countryCode } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Phone number is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Phone number must be a string' };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) {
      return { isValid: false, error: 'Phone number is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (!INTERNATIONAL_PHONE_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }

  // Digits only for length checks
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { isValid: false, error: 'Phone number must contain between 7 and 15 digits' };
  }

  const upperCountry = countryCode?.trim().toUpperCase();
  const digitsOnly = trimmed.replace(/[\s\-().]/g, '');
  if (upperCountry === 'IN') {
    if (!INDIA_PHONE_REGEX.test(digitsOnly)) {
      return { isValid: false, error: 'Invalid Indian mobile number (expected 10 digits)' };
    }
  } else if (upperCountry === 'US' || upperCountry === 'CA') {
    if (!US_PHONE_REGEX.test(digitsOnly)) {
      return { isValid: false, error: 'Invalid North American phone number (expected 10 digits)' };
    }
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validates web URL with protocol validation.
 */
export function validateUrl(
  value: unknown,
  options: UrlValidationOptions = {},
): ValidationResult<string> {
  const {
    required = false,
    allowedProtocols = ['http:', 'https:'],
    maxLength = 2048,
    requireTld = true,
  } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'URL is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'URL must be a string' };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) {
      return { isValid: false, error: 'URL is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `URL cannot exceed ${maxLength} characters` };
  }

  // Prepend https:// if user provided plain hostname (e.g. "www.example.com")
  const urlToParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(urlToParse);
    if (!allowedProtocols.includes(parsed.protocol.toLowerCase())) {
      return {
        isValid: false,
        error: `URL protocol must be one of: ${allowedProtocols.join(', ')}`,
      };
    }

    if (requireTld && !parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return { isValid: false, error: 'URL hostname must contain a valid top-level domain' };
    }

    return { isValid: true, value: urlToParse };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates business identifiers / codes.
 */
export function validateIdentifier(
  value: unknown,
  options: IdentifierValidationOptions = {},
): ValidationResult<string> {
  const {
    required = false,
    minLength = 1,
    maxLength = 50,
    allowedPattern = DEFAULT_IDENTIFIER_REGEX,
    uppercase = false,
  } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Identifier is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Identifier must be a string' };
  }

  let trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) {
      return { isValid: false, error: 'Identifier is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (uppercase) {
    trimmed = trimmed.toUpperCase();
  }

  if (trimmed.length < minLength) {
    return { isValid: false, error: `Identifier must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Identifier cannot exceed ${maxLength} characters` };
  }

  if (!allowedPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Identifier can only contain alphanumeric characters, hyphens, and underscores',
    };
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validates postal/PIN/ZIP code based on country.
 */
export function validatePostalCode(
  value: unknown,
  options: PostalValidationOptions = {},
): ValidationResult<string> {
  const { required = false, countryCode } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Postal code is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Postal code must be a string' };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) {
      return { isValid: false, error: 'Postal code is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Postal code cannot exceed 20 characters' };
  }

  const upperCountry = countryCode?.trim().toUpperCase();
  if (upperCountry && POSTAL_PATTERNS[upperCountry]) {
    const spec = POSTAL_PATTERNS[upperCountry];
    if (!spec.regex.test(trimmed)) {
      return {
        isValid: false,
        error: `Invalid postal code for ${upperCountry}: ${spec.description}`,
      };
    }
  } else {
    // Generic fallback for international postal codes
    if (!GENERIC_POSTAL_REGEX.test(trimmed)) {
      return { isValid: false, error: 'Invalid postal code format' };
    }
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validates ISO 3166-1 alpha-2 country identifier (e.g. "IN", "US").
 */
export function validateCountryCode(
  value: unknown,
  options: StandardCodeValidationOptions = {},
): ValidationResult<string> {
  const { required = false } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Country code is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Country code must be a string' };
  }

  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return {
      isValid: false,
      error: 'Country code must be a valid 2-letter ISO 3166-1 alpha-2 identifier (e.g. IN, US)',
    };
  }

  const exists = COUNTRIES.some((c) => c.code === code);
  if (!exists) {
    return { isValid: false, error: `Unrecognized ISO country code: ${code}` };
  }

  return { isValid: true, value: code };
}

/**
 * Validates canonical IANA timezone identifier (e.g. "Asia/Kolkata").
 */
export function validateTimezone(
  value: unknown,
  options: StandardCodeValidationOptions = {},
): ValidationResult<string> {
  const { required = false } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Timezone identifier is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Timezone must be a string' };
  }

  const tz = value.trim();

  // Check canonical list first
  const inList = TIMEZONES.some((t) => t.id.toLowerCase() === tz.toLowerCase());
  if (inList) {
    const canonical = TIMEZONES.find((t) => t.id.toLowerCase() === tz.toLowerCase())!;
    return { isValid: true, value: canonical.id };
  }

  // Validate via native Intl
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return { isValid: true, value: tz };
  } catch {
    return { isValid: false, error: `Invalid IANA timezone identifier: ${tz}` };
  }
}

/**
 * Validates ISO 4217 currency identifier (e.g. "INR", "USD").
 */
export function validateCurrencyCode(
  value: unknown,
  options: StandardCodeValidationOptions = {},
): ValidationResult<string> {
  const { required = false } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Currency code is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Currency code must be a string' };
  }

  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return {
      isValid: false,
      error: 'Currency code must be a valid 3-letter ISO 4217 identifier (e.g. INR, USD)',
    };
  }

  const exists = CURRENCIES.some((c) => c.code === code);
  if (!exists) {
    return { isValid: false, error: `Unrecognized ISO currency code: ${code}` };
  }

  return { isValid: true, value: code };
}

/**
 * Validates BCP 47 locale identifier (e.g. "en-IN", "en-US").
 */
export function validateLocale(
  value: unknown,
  options: StandardCodeValidationOptions = {},
): ValidationResult<string> {
  const { required = false } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { isValid: false, error: 'Locale identifier is required' };
    }
    return { isValid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Locale must be a string' };
  }

  const loc = value.trim();

  // Basic BCP 47 tag syntax check
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(loc)) {
    return { isValid: false, error: `Invalid BCP 47 locale format: ${loc}` };
  }

  try {
    if (Intl.DateTimeFormat.supportedLocalesOf([loc]).length === 0) {
      return { isValid: false, error: `Unsupported BCP 47 locale tag: ${loc}` };
    }
  } catch {
    return { isValid: false, error: `Invalid BCP 47 locale tag: ${loc}` };
  }

  return { isValid: true, value: loc };
}
