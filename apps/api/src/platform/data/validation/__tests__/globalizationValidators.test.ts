import { describe, it, expect } from 'vitest';
import {
  validateCountryCode,
  validateTimezone,
  validateCurrencyCode,
  validateLocale,
} from '../validators.js';

describe('Backend Globalization Validators', () => {
  describe('validateCountryCode', () => {
    it('accepts valid ISO 3166-1 alpha-2 codes and canonicalizes case', () => {
      const result = validateCountryCode('in');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('IN');

      const resultUS = validateCountryCode('US');
      expect(resultUS.isValid).toBe(true);
      expect(resultUS.value).toBe('US');
    });

    it('rejects invalid country codes or lengths', () => {
      const result = validateCountryCode('XYZ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ISO 3166-1');

      const resultNumeric = validateCountryCode('12');
      expect(resultNumeric.isValid).toBe(false);
    });

    it('handles required vs optional flags', () => {
      const optional = validateCountryCode('', { required: false });
      expect(optional.isValid).toBe(true);
      expect(optional.value).toBeUndefined();

      const required = validateCountryCode('', { required: true });
      expect(required.isValid).toBe(false);
      expect(required.error).toContain('required');
    });
  });

  describe('validateTimezone', () => {
    it('accepts canonical IANA timezone strings', () => {
      const resultKolkata = validateTimezone('Asia/Kolkata');
      expect(resultKolkata.isValid).toBe(true);
      expect(resultKolkata.value).toBe('Asia/Kolkata');

      const resultUtc = validateTimezone('UTC');
      expect(resultUtc.isValid).toBe(true);
      expect(resultUtc.value).toBe('UTC');

      const resultNY = validateTimezone('America/New_York');
      expect(resultNY.isValid).toBe(true);
      expect(resultNY.value).toBe('America/New_York');
    });

    it('rejects non-existent IANA timezones', () => {
      const result = validateTimezone('Mars/Curiosity');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid IANA timezone');
    });

    it('handles required flag properly', () => {
      const required = validateTimezone('', { required: true });
      expect(required.isValid).toBe(false);
      expect(required.error).toContain('required');
    });
  });

  describe('validateCurrencyCode', () => {
    it('accepts valid ISO 4217 currency identifiers and canonicalizes case', () => {
      const resultINR = validateCurrencyCode('inr');
      expect(resultINR.isValid).toBe(true);
      expect(resultINR.value).toBe('INR');

      const resultUSD = validateCurrencyCode('USD');
      expect(resultUSD.isValid).toBe(true);
      expect(resultUSD.value).toBe('USD');
    });

    it('rejects malformed or unsupported currencies', () => {
      const resultBadLen = validateCurrencyCode('US');
      expect(resultBadLen.isValid).toBe(false);
      expect(resultBadLen.error).toContain('3-letter ISO 4217');

      const resultNonExistent = validateCurrencyCode('ZZZ');
      expect(resultNonExistent.isValid).toBe(false);
      expect(resultNonExistent.error).toContain('Unrecognized ISO currency code');
    });
  });

  describe('validateLocale', () => {
    it('accepts standard BCP 47 locale codes', () => {
      const result = validateLocale('en-IN');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('en-IN');

      const resultUS = validateLocale('en-US');
      expect(resultUS.isValid).toBe(true);
      expect(resultUS.value).toBe('en-US');

      const resultDe = validateLocale('de-DE');
      expect(resultDe.isValid).toBe(true);
      expect(resultDe.value).toBe('de-DE');
    });

    it('rejects malformed locale tags', () => {
      const result = validateLocale('@@@--invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid BCP 47');
    });
  });
});
