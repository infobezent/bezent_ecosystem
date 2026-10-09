import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import { tenants, companies, auditLogs } from '../../db/schema.js';
import { CompanyService } from '../companies/service/company.service.js';
import { CompanyRepository } from '../companies/repository/company.repository.js';
import { TenantRepository } from '../tenants/repository/tenant.repository.js';
import type { ModuleService } from '../modules/service/module.service.js';
import type { CompanyAdminService } from '../company-admins/service/companyAdmin.service.js';
import type { AuditService } from '../audit/service/audit.service.js';
import { validateCreateTenantAdminCompany } from '../companies/validation/company.schema.js';
import { ValidationError, ConflictError } from '../../app/errors/AppError.js';
import { PostalLookupService } from '../data/address/postalLookup.service.js';

describe('Company Persistence & Common Data Integration — Phase 2', () => {
  describe('A. Backend Validation with Common Data Engine', () => {
    it('accepts a fully specified valid company payload with regional settings', () => {
      const payload = {
        name: 'Acme Global Technologies',
        code: 'acme-tech',
        legalName: 'Acme Global Technologies Private Limited',
        businessEmail: ' INFO@Acme.COM ',
        contactPhone: '+91 98765 43210',
        country: 'in',
        addressLine1: '123 Tech Park',
        addressLine2: 'Phase 2',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: ' 560001 ',
        displayName: 'Acme Tech',
        organizationType: 'private_limited',
        industry: 'technology',
        timeZone: 'Asia/Kolkata',
        registrationNumber: 'U72200KA2021PTC123456',
        currency: 'inr',
        locale: 'en-in',
        dateFormat: 'DD/MM/YYYY',
        weekStartsOn: 'monday',
        financialYearStart: '04-01',
      };

      const validated = validateCreateTenantAdminCompany(payload);
      expect(validated.name).toBe('Acme Global Technologies');
      expect(validated.code).toBe('ACME-TECH');
      expect(validated.businessEmail).toBe('INFO@Acme.COM');
      expect(validated.country).toBe('in');
      expect(validated.registrationNumber).toBe('U72200KA2021PTC123456');
      expect(validated.currency).toBe('INR');
      expect(validated.locale).toBe('en-in');
      expect(validated.dateFormat).toBe('DD/MM/YYYY');
      expect(validated.weekStartsOn).toBe('monday');
      expect(validated.financialYearStart).toBe('04-01');
    });

    it('rejects invalid email formats via Common Data validation', () => {
      const payload = {
        name: 'Invalid Email Corp',
        code: 'INV-EMAIL',
        businessEmail: 'not-an-email',
      };

      expect(() => validateCreateTenantAdminCompany(payload)).toThrow(ValidationError);
      expect(() => validateCreateTenantAdminCompany(payload)).toThrow(/Validation failed/);
    });

    it('rejects country-specific invalid postal codes (IN requires 6 digits)', () => {
      const payload = {
        name: 'Bad Postal Corp',
        code: 'BAD-POSTAL',
        country: 'IN',
        postalCode: '12345', // 5 digits instead of 6 for India
      };

      expect(() => validateCreateTenantAdminCompany(payload)).toThrow(ValidationError);
    });

    it('rejects country-specific invalid postal codes (US requires 5 or 5+4 digits)', () => {
      const payload = {
        name: 'Bad US Postal Corp',
        code: 'BAD-US-POST',
        country: 'US',
        postalCode: '9021', // 4 digits instead of 5
      };

      expect(() => validateCreateTenantAdminCompany(payload)).toThrow(ValidationError);
    });

    it('accepts alphanumeric postal code for CA and GB', () => {
      const payloadCA = {
        name: 'Canada Tech',
        code: 'CA-TECH',
        country: 'CA',
        postalCode: 'K1A 0B1',
      };
      expect(() => validateCreateTenantAdminCompany(payloadCA)).not.toThrow();

      const payloadGB = {
        name: 'UK Tech',
        code: 'UK-TECH',
        country: 'GB',
        postalCode: 'SW1A 1AA',
      };
      expect(() => validateCreateTenantAdminCompany(payloadGB)).not.toThrow();
    });

    it('rejects excessive field lengths', () => {
      const payload = {
        name: 'A'.repeat(151), // Max is 150
        code: 'LONG-NAME',
      };

      expect(() => validateCreateTenantAdminCompany(payload)).toThrow(ValidationError);
    });
  });

  describe('B. Full Database Persistence, Normalization & Scoped Isolation', () => {
    const tenantMainId = 'tnt_p2_persist_main';
    const tenantOtherId = 'tnt_p2_persist_other';

    let companyService: CompanyService;
    let companyRepo: CompanyRepository;

    beforeAll(async () => {
      if (!isDatabaseConfigured) return;
      const db = getDb();

      // Clean up past runs
      await db.delete(auditLogs).where(sql`${auditLogs.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
      await db.delete(companies).where(sql`${companies.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
      await db.delete(tenants).where(sql`${tenants.id} IN (${tenantMainId}, ${tenantOtherId})`);

      // Insert test tenants: tenantMainId has capacity = 2
      await db.insert(tenants).values([
        { id: tenantMainId, name: 'Main Persist Tenant', maxCompanies: 2, status: 'active' },
        { id: tenantOtherId, name: 'Other Persist Tenant', maxCompanies: 5, status: 'active' },
      ]);

      companyRepo = new CompanyRepository();
      const tenantRepo = new TenantRepository();
      const moduleSvc = {} as unknown as ModuleService;
      const companyAdminSvc = {} as unknown as CompanyAdminService;
      const auditSvc = { logEvent: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService;

      companyService = new CompanyService(
        companyRepo,
        tenantRepo,
        moduleSvc,
        companyAdminSvc,
        auditSvc,
      );
    });

    afterAll(async () => {
      if (!isDatabaseConfigured) return;
      const db = getDb();
      await db.delete(auditLogs).where(sql`${auditLogs.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
      await db.delete(companies).where(sql`${companies.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
      await db.delete(tenants).where(sql`${tenants.id} IN (${tenantMainId}, ${tenantOtherId})`);
    });

    it('persists complete company fields and normalizes them correctly', async () => {
      if (!isDatabaseConfigured) return;

      const input = {
        name: '  Bezent Solutions India  ',
        code: 'bzt-ind',
        legalName: '  Bezent Solutions India Private Limited  ',
        businessEmail: '  HELLO@Bezent.IO  ',
        contactPhone: '+91 98765 43210',
        country: 'in',
        addressLine1: '  100 MG Road  ',
        addressLine2: 'Suite 400',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '  560001  ',
        displayName: 'Bezent India',
        organizationType: 'private_limited',
        industry: 'technology',
        timeZone: 'Asia/Kolkata',
        registrationNumber: '  U72200KA2021PTC123456  ',
        currency: 'inr',
        locale: 'en-in',
        dateFormat: 'DD/MM/YYYY',
        weekStartsOn: 'monday',
        financialYearStart: '04-01',
      };

      const created = await companyService.createCompanyForTenantAdmin(
        tenantMainId,
        input,
        { id: 'usr_ta_tester' },
      );

      expect(created.id).toBeDefined();

      // Read back from DB via findById
      const readRecord = await companyRepo.findById(created.id);
      expect(readRecord).not.toBeNull();
      if (!readRecord) return;

      // Persistence verification
      expect(readRecord.name).toBe('Bezent Solutions India');
      expect(readRecord.code).toBe('BZT-IND'); // Normalization: uppercase
      expect(readRecord.legalName).toBe('Bezent Solutions India Private Limited'); // Trimmed
      expect(readRecord.businessEmail).toBe('hello@bezent.io'); // Normalization: lowercase + trim
      expect(readRecord.contactPhone).toBe('+919876543210'); // Normalization: E.164 format
      expect(readRecord.country).toBe('IN'); // Normalization: ISO-2 uppercase
      expect(readRecord.addressLine1).toBe('100 MG Road');
      expect(readRecord.addressLine2).toBe('Suite 400');
      expect(readRecord.city).toBe('Bengaluru');
      expect(readRecord.state).toBe('Karnataka');
      expect(readRecord.postalCode).toBe('560001'); // Normalization: trimmed
      expect(readRecord.displayName).toBe('Bezent India');
      expect(readRecord.organizationType).toBe('private_limited');
      expect(readRecord.industry).toBe('technology');
      expect(readRecord.timeZone).toBe('Asia/Kolkata');
      expect(readRecord.registrationNumber).toBe('U72200KA2021PTC123456'); // Persisted & trimmed
      expect(readRecord.currency).toBe('INR'); // Normalization: uppercase
      expect(readRecord.locale).toBe('en-IN'); // Normalization: canonical locale
      expect(readRecord.dateFormat).toBe('DD/MM/YYYY');
      expect(readRecord.weekStartsOn).toBe('monday');
      expect(readRecord.financialYearStart).toBe('04-01');
    });

    it('enforces tenant-scoped company code uniqueness', async () => {
      if (!isDatabaseConfigured) return;

      const duplicateInput = {
        name: 'Duplicate Company',
        code: 'bzt-ind', // already used in tenantMainId
      };

      await expect(
        companyService.createCompanyForTenantAdmin(tenantMainId, duplicateInput, { id: 'usr_ta_tester' }),
      ).rejects.toThrow(ConflictError);
    });

    it('allows identical company code under a DIFFERENT tenant (scoped isolation)', async () => {
      if (!isDatabaseConfigured) return;

      const otherTenantInput = {
        name: 'Bezent Ind in Other Tenant',
        code: 'bzt-ind', // same code, but under tenantOtherId
      };

      const otherCreated = await companyService.createCompanyForTenantAdmin(
        tenantOtherId,
        otherTenantInput,
        { id: 'usr_ta_tester' },
      );

      expect(otherCreated.id).toBeDefined();
      expect(otherCreated.code).toBe('BZT-IND');
      expect(otherCreated.tenantId).toBe(tenantOtherId);
    });

    it('enforces company capacity ceiling (409 Conflict)', async () => {
      if (!isDatabaseConfigured) return;

      // tenantMainId has maxCompanies = 2. 1 is created.
      // Create second company -> should succeed.
      const company2 = await companyService.createCompanyForTenantAdmin(
        tenantMainId,
        { name: 'Second Company', code: 'BZT-SEC' },
        { id: 'usr_ta_tester' },
      );
      expect(company2.id).toBeDefined();

      // Now tenantMainId has 2/2 companies.
      // Attempt to create third company -> must fail with 409 ConflictError
      await expect(
        companyService.createCompanyForTenantAdmin(
          tenantMainId,
          { name: 'Third Over Capacity', code: 'BZT-THIRD' },
          { id: 'usr_ta_tester' },
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('C. Postal Lookup Abstraction Fallback', () => {
    it('returns supported: false and empty matches without error when no provider is active', async () => {
      const postalService = new PostalLookupService();
      const result = await postalService.lookup({ countryCode: 'IN', postalCode: '560001' });

      expect(result.supported).toBe(false);
      expect(result.matches).toEqual([]);
    });
  });
});
