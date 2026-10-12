/**
 * BEZENT Shared Globalization Types
 * Standards-based definitions for ISO 3166, IANA Timezones, ISO 4217, and BCP 47.
 */

export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2 (e.g. "IN", "US")
  alpha3: string; // ISO 3166-1 alpha-3 (e.g. "IND", "USA")
  name: string; // Common English name
  nativeName?: string;
  callingCode: string; // e.g. "+91", "+1"
  defaultCurrency: string; // ISO 4217 code (e.g. "INR", "USD")
  defaultTimezone: string; // Canonical IANA timezone
  flagEmoji: string; // Unicode flag emoji
}

export interface TimezoneInfo {
  id: string; // Canonical IANA identifier (e.g. "Asia/Kolkata")
  label: string; // Display label (e.g. "Asia/Kolkata (IST +05:30)")
  offset: string; // UTC offset (e.g. "+05:30")
  offsetMinutes: number; // Offset in minutes (e.g. 330)
  abbreviation: string; // e.g. "IST", "EST"
  region: string; // Region/Continent group (e.g. "Asia", "America")
}

export interface CurrencyInfo {
  code: string; // ISO 4217 code (e.g. "INR", "USD")
  name: string; // Currency name
  symbol: string; // Currency symbol (e.g. "₹", "$")
  decimals: number; // Decimal places (usually 2, 0 for JPY)
}

export interface LocaleInfo {
  code: string; // BCP 47 code (e.g. "en-IN", "en-US")
  name: string; // English name
  nativeName: string; // Native name
  languageCode: string; // ISO 639-1 code
  countryCode: string; // ISO 3166-1 alpha-2 code
}

export interface LanguageInfo {
  code: string; // ISO 639-1 code (e.g. "en", "es")
  name: string;
  nativeName: string;
}

export interface DateFormatOption {
  id: string;
  pattern: string;
  label: string;
  example: string;
}

export interface ParsedPhoneNumber {
  raw: string;
  countryCode?: string; // ISO 3166-1 alpha-2
  callingCode?: string; // e.g. "+91"
  nationalNumber: string;
  isValid: boolean;
  e164?: string; // e.g. "+919876543210"
}
