/**
 * BEZENT Common Data Engine - Unit & Integration Tests
 */

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app/server/createApp.js';
import {
  validateText,
  validateEmail,
  validatePhone,
  validateUrl,
  validateIdentifier,
  validatePostalCode,
} from '../data/validation/validators.js';
import {
  normalizeText,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  normalizeRegionCode,
  normalizePostalCode,
  normalizeIdentifier,
} from '../data/normalization/normalizers.js';
import {
  referenceDataService,
  COUNTRIES,
  CURRENCIES,
  TIMEZONES,
  LOCALES,
  INDUSTRIES,
  ORGANIZATION_TYPES,
} from '../data/reference/index.js';
import { getAddressRules } from '../data/address/addressRules.js';
import { postalLookupService, PostalLookupService } from '../data/address/postalLookup.service.js';
import {
  formatBusinessIdentifier,
  parseBusinessIdentifier,
  validateBusinessIdentifierStructure,
  InMemorySequenceProvider,
} from '../data/identifiers/index.js';
import {
  sanitizeFilename,
  validateFile,
  TENANT_LOGO_POLICY,
  COMPANY_LOGO_POLICY,
  TENANT_BANNER_POLICY,
  EMPLOYEE_DOCUMENT_POLICY,
  UnsupportedFileStorageProvider,
  UnsupportedStorageError,
} from '../data/files/index.js';
import { assertUnique, buildUniquenessKey } from '../data/uniqueness/index.js';
import type { UniquenessChecker, UniquenessCheckParams, UniquenessCheckResult } from '../data/contracts/uniqueness.types.js';

describe('BEZENT Common Data Engine (Platform Infrastructure)', () => {
  describe('1. Validation Engine', () => {
    it('validates Unicode text, whitespace, and length boundaries', () => {
      // Valid unicode
      const unicodeRes = validateText('BEZENT 🏢 企業', { required: true, maxLength: 20 });
      expect(unicodeRes.isValid).toBe(true);
      expect(unicodeRes.value).toBe('BEZENT 🏢 企業');

      // Required text rejection
      const emptyRes = validateText('   ', { required: true });
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.error).toContain('cannot be empty');

      // Length violation
      const maxRes = validateText('123456', { maxLength: 5 });
      expect(maxRes.isValid).toBe(false);
      expect(maxRes.error).toContain('Cannot exceed 5');

      const minRes = validateText('abc', { minLength: 5 });
      expect(minRes.isValid).toBe(false);
      expect(minRes.error).toContain('Must be at least 5');
    });

    it('validates email addresses according to RFC rules and boundary limits', () => {
      expect(validateEmail('test@bezent.com').isValid).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk').isValid).toBe(true);
      expect(validateEmail('TEST@BEZENT.COM').value).toBe('test@bezent.com');

      // Invalid emails
      expect(validateEmail('plainaddress').isValid).toBe(false);
      expect(validateEmail('missingdomain@').isValid).toBe(false);
      expect(validateEmail('@missinguser.com').isValid).toBe(false);
      expect(validateEmail('double..dots@domain.com').isValid).toBe(false);

      // Max length limit
      const longEmail = `${'a'.repeat(250)}@test.com`;
      expect(validateEmail(longEmail).isValid).toBe(false);
    });

    it('validates telephone numbers with international/country awareness', () => {
      // E.164 international numbers
      expect(validatePhone('+919876543210').isValid).toBe(true);
      expect(validatePhone('+14155552671').isValid).toBe(true);
      expect(validatePhone('+44 20 7946 0958').isValid).toBe(true);

      // India-specific validation
      expect(validatePhone('9876543210', { countryCode: 'IN' }).isValid).toBe(true);
      expect(validatePhone('1234567890', { countryCode: 'IN' }).isValid).toBe(false); // starts with 1

      // US-specific validation
      expect(validatePhone('4155552671', { countryCode: 'US' }).isValid).toBe(true);

      // Reject non-phone strings
      expect(validatePhone('not-a-phone').isValid).toBe(false);
    });

    it('validates URLs with protocol and TLD boundaries', () => {
      expect(validateUrl('https://bezent.com').isValid).toBe(true);
      expect(validateUrl('http://localhost:3000').isValid).toBe(true);
      expect(validateUrl('www.bezent.com').isValid).toBe(true);
      expect(validateUrl('ftp://invalid-protocol.com').isValid).toBe(false);
      expect(validateUrl('not a url').isValid).toBe(false);
    });

    it('validates business identifiers', () => {
      expect(validateIdentifier('CMP-000001').isValid).toBe(true);
      expect(validateIdentifier('EMP_2026_001').isValid).toBe(true);
      expect(validateIdentifier('code with spaces').isValid).toBe(false);
      expect(validateIdentifier('special@char!').isValid).toBe(false);
    });

    it('validates country-aware postal codes', () => {
      // India PIN: exactly 6 digits
      expect(validatePostalCode('560001', { countryCode: 'IN' }).isValid).toBe(true);
      expect(validatePostalCode('56001', { countryCode: 'IN' }).isValid).toBe(false);
      expect(validatePostalCode('5600011', { countryCode: 'IN' }).isValid).toBe(false);
      expect(validatePostalCode('56000A', { countryCode: 'IN' }).isValid).toBe(false);

      // US ZIP: 5 digits or ZIP+4
      expect(validatePostalCode('94103', { countryCode: 'US' }).isValid).toBe(true);
      expect(validatePostalCode('94103-1234', { countryCode: 'US' }).isValid).toBe(true);
      expect(validatePostalCode('9410', { countryCode: 'US' }).isValid).toBe(false);

      // UK Postcode: alphanumeric
      expect(validatePostalCode('SW1A 1AA', { countryCode: 'GB' }).isValid).toBe(true);
      expect(validatePostalCode('EC1A 1BB', { countryCode: 'GB' }).isValid).toBe(true);

      // Canada: alphanumeric A1A 1A1
      expect(validatePostalCode('M5V 2T6', { countryCode: 'CA' }).isValid).toBe(true);

      // Unknown country: non-crashing generic fallback
      expect(validatePostalCode('XYZ-1234', { countryCode: 'ZZ' }).isValid).toBe(true);
    });
  });

  describe('2. Normalization Engine', () => {
    it('normalizes text and collapses redundant whitespace while preserving unicode', () => {
      const res = normalizeText('   Hello    World   🏢   ', { collapseWhitespace: true });
      expect(res).toBe('Hello World 🏢');
      expect(normalizeText(null)).toBeNull();
      expect(normalizeText('   ')).toBeNull();
    });

    it('normalizes email addresses to lowercase trimmed strings', () => {
      expect(normalizeEmail('  ADMIN@BEZENT.COM  ')).toBe('admin@bezent.com');
      expect(normalizeEmail('')).toBeNull();
    });

    it('normalizes international phone numbers and prefixes', () => {
      expect(normalizePhone('  +91 98765-43210  ')).toBe('+919876543210');
      expect(normalizePhone('9876543210', '+91')).toBe('+919876543210');
      expect(normalizePhone('+1 (415) 555-2671')).toBe('+14155552671');
    });

    it('normalizes country and region codes', () => {
      expect(normalizeCountryCode('in')).toBe('IN');
      expect(normalizeCountryCode('India')).toBe('IN');
      expect(normalizeCountryCode('United States')).toBe('US');
      expect(normalizeRegionCode('ka')).toBe('KA');
      expect(normalizeRegionCode('  california  ')).toBe('CALIFORNIA');
    });

    it('normalizes postal codes according to country format', () => {
      expect(normalizePostalCode('  sw1a  1aa  ', 'GB')).toBe('SW1A 1AA');
      expect(normalizePostalCode('m5v2t6', 'CA')).toBe('M5V 2T6');
      expect(normalizePostalCode(' 560 001 ', 'IN')).toBe('560001');
    });

    it('normalizes identifiers to uppercase canonical format', () => {
      expect(normalizeIdentifier('  cmp_01  ', { uppercase: true })).toBe('CMP_01');
      expect(normalizeIdentifier('cmp alpha 01', { replacementChar: '-' })).toBe('CMP-ALPHA-01');
    });
  });

  describe('3. Reference Data Engine', () => {
    it('provides standards-based datasets without duplicate identifiers', () => {
      const countryCodes = COUNTRIES.map((c) => c.code);
      expect(new Set(countryCodes).size).toBe(countryCodes.length);

      const currencyCodes = CURRENCIES.map((c) => c.code);
      expect(new Set(currencyCodes).size).toBe(currencyCodes.length);

      const timezoneIds = TIMEZONES.map((tz) => tz.id);
      expect(new Set(timezoneIds).size).toBe(timezoneIds.length);

      const localeCodes = LOCALES.map((l) => l.code);
      expect(new Set(localeCodes).size).toBe(localeCodes.length);
    });

    it('looks up reference data via ReferenceDataService', () => {
      expect(referenceDataService.getCountry('IN')?.name).toBe('India');
      expect(referenceDataService.getCountry('IND')?.code).toBe('IN');
      expect(referenceDataService.getRegions('IN').length).toBeGreaterThan(20);
      expect(referenceDataService.getCurrency('USD')?.symbol).toBe('$');
      expect(referenceDataService.getTimezone('Asia/Kolkata')?.offset).toBe('+05:30');
      expect(referenceDataService.getIndustries()).toBe(INDUSTRIES);
      expect(referenceDataService.getOrganizationTypes()).toBe(ORGANIZATION_TYPES);
    });
  });

  describe('4. Global Address Engine & Postal Lookup Abstraction', () => {
    it('returns country-specific address terminology and rules', () => {
      const indiaRules = getAddressRules('IN');
      expect(indiaRules.postalLabel).toBe('PIN Code');
      expect(indiaRules.regionLabel).toBe('State / Union Territory');
      expect(indiaRules.postalRequired).toBe(true);

      const usRules = getAddressRules('US');
      expect(usRules.postalLabel).toBe('ZIP Code');
      expect(usRules.regionLabel).toBe('State');

      const ukRules = getAddressRules('GB');
      expect(ukRules.postalLabel).toBe('Postcode');
      expect(ukRules.regionRequired).toBe(false);

      const fallbackRules = getAddressRules('UNKNOWN_COUNTRY');
      expect(fallbackRules.countryCode).toBe('UNKNOWN_COUNTRY');
      expect(fallbackRules.postalLabel).toBe('Postal Code');
    });

    it('handles postal lookup gracefully when no provider exists without faking data', async () => {
      const result = await postalLookupService.lookup({ countryCode: 'IN', postalCode: '560001' });
      expect(result.supported).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('supports registering a custom provider and delegating lookup', async () => {
      const testService = new PostalLookupService();
      const mockProvider = {
        name: 'MockPostalProvider',
        isSupported: (code: string) => code === 'IN',
        lookup: async () => ({
          supported: true,
          provider: 'MockPostalProvider',
          matches: [
            {
              locality: 'Indiranagar',
              city: 'Bengaluru',
              district: 'Bengaluru Urban',
              region: 'Karnataka',
              regionCode: 'KA',
              countryCode: 'IN',
            },
          ],
        }),
      };

      testService.registerProvider(mockProvider);
      expect(testService.isCountrySupported('IN')).toBe(true);
      expect(testService.isCountrySupported('US')).toBe(false);

      const result = await testService.lookup({ countryCode: 'IN', postalCode: '560038' });
      expect(result.supported).toBe(true);
      expect(result.provider).toBe('MockPostalProvider');
      expect(result.matches[0]?.city).toBe('Bengaluru');
    });
  });

  describe('5. Identifier Engine & Sequence Provider', () => {
    it('formats and parses business identifiers according to policy', () => {
      const id1 = formatBusinessIdentifier({ prefix: 'CMP' }, 1);
      expect(id1).toBe('CMP-000001');

      const id2 = formatBusinessIdentifier(
        { prefix: 'EMP', includeYear: true, padLength: 4 },
        42,
        new Date(2026, 5, 1),
      );
      expect(id2).toBe('EMP-2026-0042');

      const parsed = parseBusinessIdentifier('EMP-2026-0042');
      expect(parsed).not.toBeNull();
      expect(parsed?.prefix).toBe('EMP');
      expect(parsed?.year).toBe(2026);
      expect(parsed?.sequence).toBe(42);

      expect(validateBusinessIdentifierStructure('PRJ-2026-000100')).toBe(true);
      expect(validateBusinessIdentifierStructure('INVALID_FORMAT')).toBe(false);
    });

    it('increments sequence atomically in InMemorySequenceProvider', async () => {
      const provider = new InMemorySequenceProvider();
      const s1 = await provider.nextSequence('tenant_1:company_codes');
      const s2 = await provider.nextSequence('tenant_1:company_codes');
      const s3 = await provider.nextSequence('tenant_2:company_codes');

      expect(s1).toBe(1);
      expect(s2).toBe(2);
      expect(s3).toBe(1); // Scoped to tenant_2
    });
  });

  describe('6. Uniqueness Foundation', () => {
    it('builds canonical scoped uniqueness keys', () => {
      const key = buildUniquenessKey({
        scope: 'tenant',
        tenantId: 't-123',
        entity: 'company',
        field: 'code',
        value: 'CMP-01',
      });
      expect(key).toBe('tenant:t:t-123:company:code:cmp-01');
    });

    it('asserts uniqueness and throws ConflictError when duplicate detected', async () => {
      const mockChecker: UniquenessChecker = {
        checkUnique: async (params: UniquenessCheckParams): Promise<UniquenessCheckResult> => {
          if (params.value === 'DUPLICATE') {
            return { isUnique: false, message: 'Code already taken' };
          }
          return { isUnique: true };
        },
      };

      await expect(
        assertUnique(mockChecker, {
          scope: 'tenant',
          tenantId: 't-1',
          entity: 'company',
          field: 'code',
          value: 'UNIQUE_CODE',
        }),
      ).resolves.toBeUndefined();

      await expect(
        assertUnique(mockChecker, {
          scope: 'tenant',
          tenantId: 't-1',
          entity: 'company',
          field: 'code',
          value: 'DUPLICATE',
        }),
      ).rejects.toThrow('Code already taken');
    });
  });

  describe('7. File Validation & Storage Foundation', () => {
    it('sanitizes untrusted filenames and prevents path traversal', () => {
      expect(sanitizeFilename('../../../etc/passwd.png')).toBe('passwd.png');
      expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe.jpg')).toBe('cmd.exe.jpg');
      expect(sanitizeFilename('my logo (v2) @final.PNG')).toBe('my_logo_v2_final.png');
      expect(sanitizeFilename('')).toBe('unnamed_file');
    });

    it('validates files against policies for size, MIME type, and aspect ratio', () => {
      // Valid company logo
      const validLogo = validateFile(
        {
          name: 'company_logo.png',
          size: 200 * 1024,
          mimeType: 'image/png',
          width: 240,
          height: 240,
        },
        COMPANY_LOGO_POLICY,
      );
      expect(validLogo.isValid).toBe(true);
      expect(validLogo.metadata?.sanitizedName).toBe('company_logo.png');

      // Oversized company logo (> 1MB)
      const oversized = validateFile(
        {
          name: 'huge_logo.png',
          size: 2 * 1024 * 1024,
          mimeType: 'image/png',
        },
        COMPANY_LOGO_POLICY,
      );
      expect(oversized.isValid).toBe(false);
      expect(oversized.errors[0]).toContain('exceeds allowed limit');

      // Invalid MIME / extension
      const badExt = validateFile(
        {
          name: 'malware.exe',
          size: 1024,
          mimeType: 'application/x-msdownload',
        },
        TENANT_LOGO_POLICY,
      );
      expect(badExt.isValid).toBe(false);

      // Invalid aspect ratio for banner (expects ~3.5:1, given 1:1)
      const badBanner = validateFile(
        {
          name: 'banner.png',
          size: 500 * 1024,
          mimeType: 'image/png',
          width: 500,
          height: 500,
        },
        TENANT_BANNER_POLICY,
      );
      expect(badBanner.isValid).toBe(false);
      expect(badBanner.errors.some((e) => e.includes('aspect ratio'))).toBe(true);

      // Valid document
      const validDoc = validateFile(
        {
          name: 'contract.pdf',
          size: 1024 * 1024,
          mimeType: 'application/pdf',
        },
        EMPLOYEE_DOCUMENT_POLICY,
      );
      expect(validDoc.isValid).toBe(true);
    });

    it('storage provider cleanly reports unconfigured storage without base64 hack', async () => {
      const provider = new UnsupportedFileStorageProvider();
      await expect(
        provider.put({
          path: 'tenants/t1/logo.png',
          data: Buffer.from('fake'),
          contentType: 'image/png',
        }),
      ).rejects.toThrow(UnsupportedStorageError);
    });
  });

  describe('8. Platform Reference API Endpoints', () => {
    const app = createApp();

    it('GET /api/v1/platform/reference/countries returns canonical countries', async () => {
      const res = await request(app).get('/api/v1/platform/reference/countries');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(10);
      expect(res.body.data.some((c: { code: string }) => c.code === 'IN')).toBe(true);
    });

    it('GET /api/v1/platform/reference/countries/:countryCode/regions returns states/provinces', async () => {
      const res = await request(app).get('/api/v1/platform/reference/countries/IN/regions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((r: { code: string }) => r.code === 'KA')).toBe(true);
    });

    it('GET /api/v1/platform/reference/currencies returns currency list', async () => {
      const res = await request(app).get('/api/v1/platform/reference/currencies');
      expect(res.status).toBe(200);
      expect(res.body.data.some((c: { code: string }) => c.code === 'INR')).toBe(true);
    });

    it('GET /api/v1/platform/reference/timezones returns timezone list', async () => {
      const res = await request(app).get('/api/v1/platform/reference/timezones');
      expect(res.status).toBe(200);
      expect(res.body.data.some((tz: { id: string }) => tz.id === 'Asia/Kolkata')).toBe(true);
    });

    it('GET /api/v1/platform/reference/industries returns industry list', async () => {
      const res = await request(app).get('/api/v1/platform/reference/industries');
      expect(res.status).toBe(200);
      expect(res.body.data.some((i: { id: string }) => i.id === 'Manufacturing')).toBe(true);
    });

    it('GET /api/v1/platform/reference/organization-types returns org types', async () => {
      const res = await request(app).get('/api/v1/platform/reference/organization-types');
      expect(res.status).toBe(200);
      expect(res.body.data.some((ot: { id: string }) => ot.id === 'Private Limited')).toBe(true);
    });

    it('GET /api/v1/platform/reference/address-rules/:countryCode returns localized address rules', async () => {
      const res = await request(app).get('/api/v1/platform/reference/address-rules/IN');
      expect(res.status).toBe(200);
      expect(res.body.data.postalLabel).toBe('PIN Code');
      expect(res.body.data.regionLabel).toBe('State / Union Territory');
    });

    it('POST /api/v1/platform/reference/postal-lookup returns safe result without crashing', async () => {
      const res = await request(app)
        .post('/api/v1/platform/reference/postal-lookup')
        .send({ countryCode: 'IN', postalCode: '560001' });
      expect(res.status).toBe(200);
      expect(res.body.data.supported).toBe(false);
      expect(res.body.data.matches).toEqual([]);
    });
  });
});
