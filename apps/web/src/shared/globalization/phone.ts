/**
 * BEZENT International Phone Parsing, Validation and Formatting
 */

import type { ParsedPhoneNumber } from './types';
import { getCountry } from './countries';

// Map calling codes to country codes (prioritize major country for shared codes)
export const CALLING_CODE_TO_COUNTRY: Record<string, string> = {
  '+91': 'IN',
  '+1': 'US',
  '+44': 'GB',
  '+61': 'AU',
  '+65': 'SG',
  '+971': 'AE',
  '+49': 'DE',
  '+33': 'FR',
  '+81': 'JP',
  '+31': 'NL',
  '+966': 'SA',
  '+353': 'IE',
  '+64': 'NZ',
  '+41': 'CH',
  '+974': 'QA',
  '+968': 'OM',
  '+965': 'KW',
  '+973': 'BH',
  '+60': 'MY',
  '+62': 'ID',
  '+63': 'PH',
  '+27': 'ZA',
  '+46': 'SE',
  '+47': 'NO',
  '+45': 'DK',
  '+358': 'FI',
  '+34': 'ES',
  '+39': 'IT',
  '+55': 'BR',
  '+52': 'MX',
};

/**
 * Parses raw phone string into structured phone number info.
 */
export function parsePhoneNumber(
  rawPhone: string,
  defaultCountryCode: string = 'IN',
): ParsedPhoneNumber {
  const trimmed = (rawPhone || '').trim();
  if (!trimmed) {
    return {
      raw: '',
      nationalNumber: '',
      isValid: false,
    };
  }

  // Check if string starts with '+'
  if (trimmed.startsWith('+')) {
    // Try matching longest calling code first (e.g. +971 before +9)
    const sortedCallingCodes = Object.keys(CALLING_CODE_TO_COUNTRY).sort(
      (a, b) => b.length - a.length,
    );
    for (const code of sortedCallingCodes) {
      if (trimmed.startsWith(code)) {
        const nationalPart = trimmed.slice(code.length).replace(/\D/g, '');
        const countryCode = CALLING_CODE_TO_COUNTRY[code];
        const isValid = validateNationalNumber(nationalPart, countryCode);
        return {
          raw: trimmed,
          countryCode,
          callingCode: code,
          nationalNumber: nationalPart,
          isValid,
          e164: `${code}${nationalPart}`,
        };
      }
    }
  }

  // If no leading '+', use default country code
  const defaultCountry = getCountry(defaultCountryCode) || getCountry('IN')!;
  const callingCode = defaultCountry.callingCode;
  const digits = trimmed.replace(/\D/g, '');
  const isValid = validateNationalNumber(digits, defaultCountry.code);

  return {
    raw: trimmed,
    countryCode: defaultCountry.code,
    callingCode,
    nationalNumber: digits,
    isValid,
    e164: `${callingCode}${digits}`,
  };
}

/**
 * Validates national number length and country-specific rules.
 */
export function validateNationalNumber(nationalDigits: string, countryCode?: string): boolean {
  if (!nationalDigits || nationalDigits.length < 5 || nationalDigits.length > 15) {
    return false;
  }

  const upper = countryCode?.toUpperCase();
  if (upper === 'IN') {
    // India mobile: 10 digits starting with 6-9
    return /^[6-9]\d{9}$/.test(nationalDigits);
  }
  if (upper === 'US' || upper === 'CA') {
    // North America: 10 digits, area code and exchange starts 2-9
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(nationalDigits);
  }
  if (upper === 'GB') {
    // UK: 9 to 11 digits
    return /^\d{9,11}$/.test(nationalDigits);
  }
  if (upper === 'AU') {
    // Australia: 9 digits
    return /^\d{9}$/.test(nationalDigits);
  }
  if (upper === 'SG') {
    // Singapore: 8 digits starting 6, 8, or 9
    return /^[689]\d{7}$/.test(nationalDigits);
  }
  if (upper === 'AE') {
    // UAE: 9 digits (mobile starts with 5)
    return /^\d{9}$/.test(nationalDigits);
  }

  // Generic international fallback: 6 to 14 digits
  return nationalDigits.length >= 6 && nationalDigits.length <= 14;
}

/**
 * Formats a national number with typical grouping spaces for readability.
 */
export function formatNationalNumberDisplay(digits: string, countryCode?: string): string {
  const upper = countryCode?.toUpperCase();
  if (upper === 'IN') {
    // 5-5 grouping: 98401 23456
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  }
  if (upper === 'US' || upper === 'CA') {
    // (555) 123-4567
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  return digits;
}

/**
 * Validates a phone number string.
 */
export function isValidPhoneNumber(phoneNumber: string, countryCode?: string): boolean {
  const parsed = parsePhoneNumber(phoneNumber, countryCode);
  return parsed.isValid;
}

/**
 * Formats a phone number for display with calling code and grouping.
 */
export function formatPhoneNumber(phoneNumber: string, defaultCountryCode?: string): string {
  const parsed = parsePhoneNumber(phoneNumber, defaultCountryCode);
  if (!parsed.callingCode) {
    return parsed.nationalNumber || phoneNumber;
  }
  const formattedNational = formatNationalNumberDisplay(parsed.nationalNumber, parsed.countryCode);
  return `${parsed.callingCode} ${formattedNational}`;
}
