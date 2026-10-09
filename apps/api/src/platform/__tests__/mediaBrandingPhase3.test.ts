/**
 * BEZENT Common Data Engine - Phase 3 Tests
 * Persistent Media Architecture + Tenant/Company Branding + Hardening
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  tenantAdmins,
  mediaAssets,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';
import {
  validateFile,
  TENANT_LOGO_POLICY,
  TENANT_BANNER_POLICY,
  COMPANY_LOGO_POLICY,
  sanitizeFilename,
  UnsupportedFileStorageProvider,
  UnsupportedStorageError,
  LocalStorageProvider,
  setStorageProvider,
} from '../data/files/index.js';

// Helper: 1x1 valid PNG buffer
function createPngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length & type
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, // bit depth, colortype, CRC
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND chunk
    0x42, 0x60, 0x82,
  ]);
}

// Helper: 1x1 valid JPEG buffer
function createJpegBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
    0x11, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0xbf, 0x00, 0xff, 0xd9,
  ]);
}

describe('BEZENT Common Data Engine - Phase 3 (Media Architecture & Branding)', () => {
  const testTempDir = path.join(os.tmpdir(), `bezent_media_test_${Date.now()}`);

  describe('1. File Validation & Magic Bytes Security', () => {
    it('accepts valid PNG with signature, matching extension and mime', () => {
      const pngBuf = createPngBuffer();
      const res = validateFile(
        {
          name: 'company_logo.png',
          mimeType: 'image/png',
          size: pngBuf.length,
          data: pngBuf,
          width: 200,
          height: 200,
        },
        COMPANY_LOGO_POLICY,
      );
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects file when magic bytes do not match declared image/png MIME', () => {
      const fakePngBuf = Buffer.from('NOT A REAL PNG FILE AT ALL');
      const res = validateFile(
        {
          name: 'fake_logo.png',
          mimeType: 'image/png',
          size: fakePngBuf.length,
          data: fakePngBuf,
          width: 200,
          height: 200,
        },
        COMPANY_LOGO_POLICY,
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('file signature mismatch'))).toBe(true);
    });

    it('rejects oversized files exceeding policy limit', () => {
      const pngBuf = createPngBuffer();
      const res = validateFile(
        {
          name: 'big_logo.png',
          mimeType: 'image/png',
          size: 2 * 1024 * 1024, // 2MB exceeds 1MB logo policy
          data: pngBuf,
          width: 200,
          height: 200,
        },
        COMPANY_LOGO_POLICY,
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('exceeds allowed limit'))).toBe(true);
    });

    it('rejects forbidden MIME type (e.g. text/html or application/x-msdownload)', () => {
      const buf = Buffer.from('malicious script');
      const res = validateFile(
        {
          name: 'exploit.html',
          mimeType: 'text/html',
          size: buf.length,
          data: buf,
        },
        TENANT_LOGO_POLICY,
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('not supported'))).toBe(true);
    });

    it('rejects extension/MIME mismatch (e.g. .exe named as image/png)', () => {
      const pngBuf = createPngBuffer();
      const res = validateFile(
        {
          name: 'malware.exe',
          mimeType: 'image/png',
          size: pngBuf.length,
          data: pngBuf,
        },
        TENANT_LOGO_POLICY,
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('not allowed'))).toBe(true);
    });

    it('sanitizes unsafe filenames and prevents path traversal', () => {
      const sanitized = sanitizeFilename('../../../etc/passwd..png');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
      expect(sanitized.endsWith('.png')).toBe(true);
    });

    it('validates banner dimension aspect ratio within tolerances', () => {
      const bannerBuf = createJpegBuffer();
      // Banner policy requires aspect ratio ~ 3.5:1 (tolerance 0.3)
      const res = validateFile(
        {
          name: 'banner.jpg',
          mimeType: 'image/jpeg',
          size: bannerBuf.length,
          data: bannerBuf,
          width: 1400,
          height: 400, // aspect ratio 3.5
        },
        TENANT_BANNER_POLICY,
      );
      expect(res.isValid).toBe(true);
    });
  });

  describe('2. Storage Provider Abstraction & Local Provider', () => {
    it('UnsupportedFileStorageProvider predictable explicit error with STORAGE_NOT_CONFIGURED', async () => {
      const unsupported = new UnsupportedFileStorageProvider();
      await expect(
        unsupported.put({
          path: 'test-key',
          data: Buffer.from('data'),
          contentType: 'image/png',
        }),
      ).rejects.toThrow(UnsupportedStorageError);
      try {
        await unsupported.put({
          path: 'test-key',
          data: Buffer.from('data'),
          contentType: 'image/png',
        });
      } catch (err: unknown) {
        expect((err as UnsupportedStorageError).code).toBe('STORAGE_NOT_CONFIGURED');
      }
    });

    it('LocalStorageProvider can put, exists, getUrl, and delete files', async () => {
      const localProvider = new LocalStorageProvider({
        rootDir: testTempDir,
        publicBaseUrl: 'http://localhost:4000/api/v1/platform/media',
      });

      const key = 'tenants/tent_test/logo/asset_123.png';
      const content = createPngBuffer();

      const putRes = await localProvider.put({
        path: key,
        data: content,
        contentType: 'image/png',
      });
      expect(putRes.key).toBe(key);
      expect(putRes.sizeBytes).toBe(content.length);

      const item = await localProvider.get(key);
      expect(item).not.toBeNull();

      const url = await localProvider.getUrl(key);
      expect(url).toContain('/api/v1/platform/media/');

      await localProvider.delete(key);
      const itemAfter = await localProvider.get(key);
      expect(itemAfter).toBeNull();
    });
  });

  describe('3. Integration & API Lifecycles with Authorization Guards', () => {
    const app = createApp();

    const tenantId = 'tent_media_demo';
    const otherTenantId = 'tent_media_other';
    const companyId = 'comp_media_demo';
    const otherCompanyId = 'comp_media_other';

    const taEmail = 'ta_media@example.com';
    const taUserId = 'usr_ta_media';

    const empEmail = 'emp_media@example.com';
    const empUserId = 'usr_emp_media';

    let taToken: string;
    let empToken: string;

    beforeAll(async () => {
      if (!isDatabaseConfigured) return;
      const db = getDb();

      // Clean old test rows
      await db.delete(mediaAssets).where(sql`${mediaAssets.tenantId} IN (${tenantId}, ${otherTenantId})`);
      await db.delete(tenantAdmins).where(sql`${tenantAdmins.tenantId} IN (${tenantId}, ${otherTenantId})`);
      await db.delete(memberships).where(sql`${memberships.tenantId} IN (${tenantId}, ${otherTenantId})`);
      await db.delete(companies).where(sql`${companies.tenantId} IN (${tenantId}, ${otherTenantId})`);
      await db.delete(tenants).where(sql`${tenants.id} IN (${tenantId}, ${otherTenantId})`);
      await db.delete(users).where(sql`${users.id} IN (${taUserId}, ${empUserId})`);

      // Seed tenants
      await db.insert(tenants).values({ id: tenantId, name: 'Media Demo Tenant', status: 'active' });
      await db.insert(tenants).values({ id: otherTenantId, name: 'Other Tenant', status: 'active' });

      // Seed companies
      await db.insert(companies).values({
        id: companyId,
        tenantId,
        name: 'Media Demo Company',
        code: 'MED-COMP',
        status: 'active',
        brandingMode: 'initials',
      });
      await db.insert(companies).values({
        id: otherCompanyId,
        tenantId: otherTenantId,
        name: 'Other Company',
        code: 'OTH-COMP',
        status: 'active',
        brandingMode: 'initials',
      });

      // Seed users
      const pwd = hashPassword('TestP@ss123');
      await db.insert(users).values([
        {
          id: taUserId,
          email: taEmail,
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Tenant',
          lastName: 'Admin',
        },
        {
          id: empUserId,
          email: empEmail,
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Standard',
          lastName: 'Employee',
        },
      ]);

      // Grant tenant admin authority
      await db.insert(tenantAdmins).values({
        id: 'ta_rec_media',
        tenantId,
        userId: taUserId,
        status: 'active',
      });

      // Grant standard employee membership
      await db.insert(memberships).values({
        id: 'mem_emp_media',
        tenantId,
        companyId,
        userId: empUserId,
        role: 'employee',
        status: 'active',
      });

      const taAuth = await signInForTest(taEmail);
      taToken = taAuth.token;

      const empAuth = await signInForTest(empEmail);
      empToken = empAuth.token;
    });

    afterAll(async () => {
      // Reset storage provider to default
      setStorageProvider(new UnsupportedFileStorageProvider());
      // Clean temp dir
      try {
        if (fs.existsSync(testTempDir)) {
          fs.rmSync(testTempDir, { recursive: true, force: true });
        }
      } catch {
        // ignore
      }
    });

    it('returns 501 when default UnsupportedFileStorageProvider is active (never fake persistence)', async () => {
      if (!isDatabaseConfigured) return;
      setStorageProvider(new UnsupportedFileStorageProvider());

      const res = await request(app)
        .post('/api/v1/tenant-admin/tenant/logo')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          filename: 'logo.png',
          mimeType: 'image/png',
          fileData: createPngBuffer().toString('base64'),
        });

      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe('STORAGE_NOT_CONFIGURED');
    });

    it('rejects unauthorized user (standard employee) from uploading tenant branding', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post('/api/v1/tenant-admin/tenant/logo')
        .set('Authorization', `Bearer ${empToken}`)
        .send({
          filename: 'logo.png',
          mimeType: 'image/png',
          fileData: createPngBuffer().toString('base64'),
        });

      expect(res.status).toBe(403);
    });

    it('executes full Tenant Logo upload, replace, and remove lifecycle with LocalStorageProvider', async () => {
      if (!isDatabaseConfigured) return;

      const localProvider = new LocalStorageProvider({
        rootDir: testTempDir,
        publicBaseUrl: 'http://localhost:4000/api/v1/platform/media',
      });
      setStorageProvider(localProvider);

      // 1. Upload Tenant Logo
      const uploadRes = await request(app)
        .post('/api/v1/tenant-admin/tenant/logo')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          filename: 'brand_logo.png',
          mimeType: 'image/png',
          fileData: createPngBuffer().toString('base64'),
        });

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.data.assetId).toBeDefined();
      expect(uploadRes.body.data.url).toContain('/api/v1/platform/media/');

      // Verify DB persistence on tenant
      const db = getDb();
      const tenantCheck1 = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      expect(tenantCheck1[0]?.logoUrl).toBe(uploadRes.body.data.url);

      // 2. Replace Tenant Logo
      const replaceRes = await request(app)
        .post('/api/v1/tenant-admin/tenant/logo')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          filename: 'brand_logo_v2.png',
          mimeType: 'image/png',
          fileData: createPngBuffer().toString('base64'),
        });

      expect(replaceRes.status).toBe(200);
      expect(replaceRes.body.data.assetId).not.toBe(uploadRes.body.data.assetId);

      const tenantCheck2 = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      expect(tenantCheck2[0]?.logoUrl).toBe(replaceRes.body.data.url);

      // 3. Remove Tenant Logo
      const removeRes = await request(app)
        .delete('/api/v1/tenant-admin/tenant/logo')
        .set('Authorization', `Bearer ${taToken}`);

      expect(removeRes.status).toBe(200);

      const tenantCheck3 = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      expect(tenantCheck3[0]?.logoUrl).toBeNull();
    });

    it('executes full Tenant Banner upload, replace, and remove lifecycle', async () => {
      if (!isDatabaseConfigured) return;

      const localProvider = new LocalStorageProvider({
        rootDir: testTempDir,
        publicBaseUrl: 'http://localhost:4000/api/v1/platform/media',
      });
      setStorageProvider(localProvider);

      const bannerBuffer = createJpegBuffer();

      // 1. Upload Banner
      const uploadRes = await request(app)
        .post('/api/v1/tenant-admin/tenant/banner')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          filename: 'tenant_banner.jpg',
          mimeType: 'image/jpeg',
          fileData: bannerBuffer.toString('base64'),
        });

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.data.url).toBeDefined();

      const db = getDb();
      const tenantRows1 = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      expect(tenantRows1[0]?.bannerUrl).toBe(uploadRes.body.data.url);

      // 2. Remove Banner
      const removeRes = await request(app)
        .delete('/api/v1/tenant-admin/tenant/banner')
        .set('Authorization', `Bearer ${taToken}`);

      expect(removeRes.status).toBe(200);

      const tenantRows2 = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      expect(tenantRows2[0]?.bannerUrl).toBeNull();
    });

    it('protects Company Logo by tenant boundary: cross-tenant company rejected', async () => {
      if (!isDatabaseConfigured) return;

      // taToken is admin of tenantId ('tent_media_demo'). Attempt to access otherCompanyId ('comp_media_other')
      const res = await request(app)
        .post(`/api/v1/tenant-admin/companies/${otherCompanyId}/logo`)
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          filename: 'logo.png',
          mimeType: 'image/png',
          fileData: createPngBuffer().toString('base64'),
        });

      // Must be 404 Not Found (or 403 Forbidden) so cross-tenant existence is not leaked
      expect([403, 404]).toContain(res.status);
    });

    it('ignores spoofed tenantId in body and binds asset strictly to server-derived tenant', async () => {
      if (!isDatabaseConfigured) return;

      const localProvider = new LocalStorageProvider({
        rootDir: testTempDir,
        publicBaseUrl: 'http://localhost:4000/api/v1/platform/media',
      });
      setStorageProvider(localProvider);

      const res = await request(app)
        .post(`/api/v1/tenant-admin/companies/${companyId}/logo`)
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          tenantId: 'spoofed_tenant_hacker',
          filename: 'company_logo.png',
          mimeType: 'image/png',
          fileData: createPngBuffer().toString('base64'),
        });

      expect(res.status).toBe(200);

      // Check DB mediaAsset row
      const db = getDb();
      const assetRows = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, res.body.data.assetId));
      expect(assetRows[0]?.tenantId).toBe(tenantId); // derived from token, not body!
    });

    it('manages semantic Company Branding Modes without binary duplication', async () => {
      if (!isDatabaseConfigured) return;

      const localProvider = new LocalStorageProvider({
        rootDir: testTempDir,
        publicBaseUrl: 'http://localhost:4000/api/v1/platform/media',
      });
      setStorageProvider(localProvider);
      const db = getDb();

      // 1. Upload Tenant Logo first
      const tenantLogoRes = await request(app)
        .post('/api/v1/tenant-admin/tenant/logo')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          filename: 'tenant_brand.png',
          mimeType: 'image/png',
          fileData: createPngBuffer().toString('base64'),
        });
      expect(tenantLogoRes.status).toBe(200);
      const tenantLogoUrl = tenantLogoRes.body.data.url;

      // 2. Switch company branding to 'tenant_logo'
      const brandTenantRes = await request(app)
        .patch(`/api/v1/tenant-admin/companies/${companyId}/branding`)
        .set('Authorization', `Bearer ${taToken}`)
        .send({ brandingMode: 'tenant_logo' });

      expect(brandTenantRes.status).toBe(200);
      expect(brandTenantRes.body.data.brandingMode).toBe('tenant_logo');
      expect(brandTenantRes.body.data.logoUrl).toBe(tenantLogoUrl);

      // Verify company row in DB points to tenant logo URL with brandingMode 'tenant_logo'
      const comp1 = await db.select().from(companies).where(eq(companies.id, companyId));
      expect(comp1[0]?.brandingMode).toBe('tenant_logo');
      expect(comp1[0]?.logoUrl).toBe(tenantLogoUrl);

      // 3. Switch company branding to 'initials'
      const brandInitialsRes = await request(app)
        .patch(`/api/v1/tenant-admin/companies/${companyId}/branding`)
        .set('Authorization', `Bearer ${taToken}`)
        .send({ brandingMode: 'initials' });

      expect(brandInitialsRes.status).toBe(200);
      expect(brandInitialsRes.body.data.brandingMode).toBe('initials');
      expect(brandInitialsRes.body.data.logoUrl).toBeNull();

      const comp2 = await db.select().from(companies).where(eq(companies.id, companyId));
      expect(comp2[0]?.brandingMode).toBe('initials');
      expect(comp2[0]?.logoUrl).toBeNull();

      // 4. Switch company branding to 'own_logo' (company already had an uploaded logo from earlier test)
      const brandOwnRes = await request(app)
        .patch(`/api/v1/tenant-admin/companies/${companyId}/branding`)
        .set('Authorization', `Bearer ${taToken}`)
        .send({ brandingMode: 'own_logo' });

      expect(brandOwnRes.status).toBe(200);
      expect(brandOwnRes.body.data.brandingMode).toBe('own_logo');
      expect(brandOwnRes.body.data.logoUrl).toBeDefined();

      const comp3 = await db.select().from(companies).where(eq(companies.id, companyId));
      expect(comp3[0]?.brandingMode).toBe('own_logo');
      expect(comp3[0]?.logoUrl).toBeTruthy();
    });
  });
});
