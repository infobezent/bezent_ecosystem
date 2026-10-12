import { describe, it, expect } from 'vitest';
import {
  getAllCountries,
  getCountry,
  searchCountries,
  getCountryFlagEmoji,
  getAllTimezones,
  getTimezone,
  searchTimezones,
  isValidTimezone,
  getAllCurrencies,
  formatCurrencyAmount,
  isValidLocale,
  parsePhoneNumber,
  formatPhoneNumber,
  isValidPhoneNumber,
  formatDate,
  formatDateTime,
  formatPolicyTimestamp,
  formatNumber,
} from '../index';

describe('Shared Globalization Engine', () => {
  describe('Countries & Flags', () => {
    it('returns standard ISO 3166-1 country list', () => {
      const countries = getAllCountries();
      expect(countries.length).toBeGreaterThan(25);
      const india = countries.find((c) => c.code === 'IN');
      expect(india).toBeDefined();
      expect(india?.name).toBe('India');
      expect(india?.callingCode).toBe('+91');
    });

    it('retrieves country by code or name case-insensitively', () => {
      expect(getCountry('US')?.code).toBe('US');
      expect(getCountry('us')?.code).toBe('US');
      expect(getCountry('United States')?.code).toBe('US');
      expect(getCountry('india')?.code).toBe('IN');
      expect(getCountry('NonExistent')).toBeUndefined();
    });

    it('searches countries by partial name, code, or calling code', () => {
      const byName = searchCountries('united');
      expect(byName.some((c) => c.code === 'US')).toBe(true);
      expect(byName.some((c) => c.code === 'GB')).toBe(true);

      const byCallingCode = searchCountries('+91');
      expect(byCallingCode.some((c) => c.code === 'IN')).toBe(true);
    });

    it('generates correct Unicode flag emoji for ISO-3166 alpha-2 codes', () => {
      // IN: I (1F1EE) + N (1F1F3) -> 🇮🇳
      expect(getCountryFlagEmoji('IN')).toBe('🇮🇳');
      expect(getCountryFlagEmoji('in')).toBe('🇮🇳');
      expect(getCountryFlagEmoji('US')).toBe('🇺🇸');
      expect(getCountryFlagEmoji('GB')).toBe('🇬🇧');
      expect(getCountryFlagEmoji('JP')).toBe('🇯🇵');
      expect(getCountryFlagEmoji('')).toBe('🌐');
      expect(getCountryFlagEmoji('XYZ')).toBe('🌐');
    });
  });

  describe('IANA Timezones & Offsets', () => {
    it('returns canonical IANA timezones', () => {
      const timezones = getAllTimezones();
      expect(timezones.length).toBeGreaterThan(40);
      expect(timezones.some((tz) => tz.id === 'Asia/Kolkata')).toBe(true);
      expect(timezones.some((tz) => tz.id === 'America/New_York')).toBe(true);
      expect(timezones.some((tz) => tz.id === 'UTC')).toBe(true);
    });

    it('calculates current UTC offset and label dynamically using Intl', () => {
      const kolkata = getTimezone('Asia/Kolkata');
      expect(kolkata).toBeDefined();
      expect(kolkata?.offset).toBe('+05:30');
      expect(kolkata?.offsetMinutes).toBe(330);
    });

    it('validates IANA timezone identifiers via Intl support', () => {
      expect(isValidTimezone('Asia/Kolkata')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Mars/Olympus_Mons')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });

    it('searches timezones by continent, city, or offset string', () => {
      const tokyoResults = searchTimezones('Tokyo');
      expect(tokyoResults.some((tz) => tz.id === 'Asia/Tokyo')).toBe(true);

      const plusFiveThirty = searchTimezones('+05:30');
      expect(plusFiveThirty.some((tz) => tz.id === 'Asia/Kolkata')).toBe(true);
    });
  });

  describe('Currencies & ISO 4217 Formatting', () => {
    it('returns supported currencies with symbols', () => {
      const currencies = getAllCurrencies();
      expect(currencies.some((c) => c.code === 'INR' && c.symbol === '₹')).toBe(true);
      expect(currencies.some((c) => c.code === 'USD' && c.symbol === '$')).toBe(true);
      expect(currencies.some((c) => c.code === 'EUR' && c.symbol === '€')).toBe(true);
    });

    it('formats currency amounts accurately using native Intl.NumberFormat', () => {
      const inrFormatted = formatCurrencyAmount(125000.5, 'INR', 'en-IN');
      expect(inrFormatted).toContain('₹');
      expect(inrFormatted).toContain('1,25,000');

      const usdFormatted = formatCurrencyAmount(125000.5, 'USD', 'en-US');
      expect(usdFormatted).toContain('125,000.50');
      expect(usdFormatted).toContain('$');
    });
  });

  describe('Locales & Number Formatting', () => {
    it('validates BCP 47 locale tags', () => {
      expect(isValidLocale('en-US')).toBe(true);
      expect(isValidLocale('en-IN')).toBe(true);
      expect(isValidLocale('de-DE')).toBe(true);
      expect(isValidLocale('invalid-locale-12345')).toBe(false);
    });

    it('formats numbers and percentages according to options', () => {
      const formatted = formatNumber(1000, 'en-US');
      expect(formatted).toBe('1,000');

      const pct = formatNumber(0.25, { style: 'percent' }, 'en-US');
      expect(pct).toBe('25%');
    });
  });

  describe('International Phone Parsing & Validation', () => {
    it('parses international phone numbers with explicit calling code', () => {
      const parsed = parsePhoneNumber('+91 98765 43210');
      expect(parsed.countryCode).toBe('IN');
      expect(parsed.callingCode).toBe('+91');
      expect(parsed.nationalNumber).toBe('9876543210');
      expect(parsed.isValid).toBe(true);
      expect(parsed.e164).toBe('+919876543210');
    });

    it('parses national phone numbers with default country fallback', () => {
      const parsed = parsePhoneNumber('4155552671', 'US');
      expect(parsed.countryCode).toBe('US');
      expect(parsed.callingCode).toBe('+1');
      expect(parsed.nationalNumber).toBe('4155552671');
      expect(parsed.isValid).toBe(true);
      expect(parsed.e164).toBe('+14155552671');
    });

    it('formats phone numbers nicely per country pattern', () => {
      const formattedIndia = formatPhoneNumber('+919876543210');
      expect(formattedIndia).toBe('+91 98765 43210');

      const formattedUS = formatPhoneNumber('+14155552671');
      expect(formattedUS).toBe('+1 (415) 555-2671');
    });

    it('detects invalid phone number length', () => {
      expect(isValidPhoneNumber('123', 'IN')).toBe(false);
      expect(isValidPhoneNumber('9876543210', 'IN')).toBe(true);
    });
  });

  describe('Policy Timezone Invariant vs Browser Locale', () => {
    it('formats policy timestamp anchored to company timezone regardless of user offset', () => {
      // 2026-03-15T00:00:00Z (midnight UTC)
      // In Asia/Kolkata (+05:30) it is 05:30 on March 15
      // In America/New_York (-04:00 or -05:00) it is evening of March 14
      const timestampUtc = '2026-03-15T00:00:00.000Z';

      const kolkataTime = formatPolicyTimestamp(timestampUtc, 'Asia/Kolkata', {
        locale: 'en-US',
        dateStyle: 'short',
        timeStyle: 'short',
      });
      expect(kolkataTime).toContain('3/15/26'); // March 15 in Asia/Kolkata

      const nyTime = formatPolicyTimestamp(timestampUtc, 'America/New_York', {
        locale: 'en-US',
        dateStyle: 'short',
        timeStyle: 'short',
      });
      expect(nyTime).toContain('3/14/26'); // March 14 in America/New_York
    });

    it('does not crash on undefined or null date inputs', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
      expect(formatPolicyTimestamp('', 'Asia/Kolkata')).toBe('—');
    });
  });
});
