import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantAdmins,
  tenantModules,
  departments,
  locations,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';
import { companyService } from '../companies/service/company.service.js';

describe('Tenant Admin Phase 2B: Backend Structural Consolidation', () => {
  const app = createApp();

  const tenantAId = 'tent_p2b_a';
  const tenantBId = 'tent_p2b_b';

  const companyA1Id = 'comp_p2b_a1';
  const companyA2Id = 'comp_p2b_a2';
  const companyB1Id = 'comp_p2b_b1';

  // Users
  const userTaAId = 'usr_p2b_ta_a';
  const userTaAEmail = 'ta_a@tenant-p2b-a.example';

  const userCaA1Id = 'usr_p2b_ca_a1';
  const userCaA1Email = 'ca_a1@tenant-p2b-a.example';

  let taAToken: string;
  let caA1Token: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // Clean up test data
    await db
      .delete(tenantAdmins)
      .where(sql`${tenantAdmins.tenantId} IN (${tenantAId}, ${tenantBId})`);
    await db
      .delete(departments)
      .where(sql`${departments.tenantId} IN (${tenantAId}, ${tenantBId})`);
    await db.delete(locations).where(sql`${locations.tenantId} IN (${tenantAId}, ${tenantBId})`);
    await db
      .delete(roleAssignments)
      .where(sql`${roleAssignments.tenantId} IN (${tenantAId}, ${tenantBId})`);
    await db
      .delete(memberships)
      .where(sql`${memberships.tenantId} IN (${tenantAId}, ${tenantBId})`);
    await db
      .delete(tenantModules)
      .where(sql`${tenantModules.tenantId} IN (${tenantAId}, ${tenantBId})`);
    await db.delete(companies).where(sql`${companies.tenantId} IN (${tenantAId}, ${tenantBId})`);
    await db.delete(tenants).where(sql`${tenants.id} IN (${tenantAId}, ${tenantBId})`);

    // 1. Insert Tenants
    await db.insert(tenants).values([
      { id: tenantAId, name: 'Tenant A Consolidated Org', status: 'active' },
      { id: tenantBId, name: 'Tenant B Separate Org', status: 'active' },
    ]);

    // 2. Insert Companies
    await db.insert(companies).values([
      {
        id: companyA1Id,
        tenantId: tenantAId,
        name: 'Company A1 Apex',
        code: 'A1_APEX',
        displayName: 'Apex Corporation',
        legalName: 'Apex Holdings Private Limited',
        businessEmail: 'contact@apex.example',
        city: 'Bengaluru',
        country: 'India',
        status: 'active',
      },
      {
        id: companyA2Id,
        tenantId: tenantAId,
        name: 'Company A2 Beacon',
        code: 'A2_BCN',
        displayName: 'Beacon Innovations',
        legalName: 'Beacon Tech Solutions Pvt Ltd',
        businessEmail: 'info@beacon.example',
        city: 'Mumbai',
        country: 'India',
        status: 'active',
      },
      {
        id: companyB1Id,
        tenantId: tenantBId,
        name: 'Company B1 Other',
        code: 'B1_OTH',
        displayName: 'Other Global',
        status: 'active',
      },
    ]);

    // 3. Departments & Locations for Company A1 and A2
    await db.insert(departments).values([
      {
        id: 'dept_p2b_a1',
        tenantId: tenantAId,
        companyId: companyA1Id,
        name: 'Engineering',
        code: 'ENG',
        status: 'active',
      },
      {
        id: 'dept_p2b_a2',
        tenantId: tenantAId,
        companyId: companyA2Id,
        name: 'Marketing',
        code: 'MKT',
        status: 'active',
      },
    ]);

    await db.insert(locations).values([
      {
        id: 'loc_p2b_a1',
        tenantId: tenantAId,
        companyId: companyA1Id,
        name: 'Bangalore HQ',
        code: 'BLR_HQ',
        city: 'Bengaluru',
        country: 'India',
        status: 'active',
      },
    ]);

    // 3b. Insert Application Entitlements for Tenant A & B
    await db.insert(tenantModules).values([
      {
        id: 'tm_p2b_hrms_a',
        tenantId: tenantAId,
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
      },
      {
        id: 'tm_p2b_crm_a',
        tenantId: tenantAId,
        companyId: null,
        moduleCode: 'crm',
        status: 'enabled',
      },
      {
        id: 'tm_p2b_hrms_b',
        tenantId: tenantBId,
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
      },
    ]);

    // 4. Insert Users
    const { hash, salt } = await hashPassword('TenantPass123!');
    await db
      .insert(users)
      .values([
        {
          id: userTaAId,
          email: userTaAEmail,
          passwordHash: hash,
          salt,
          firstName: 'Tenant',
          lastName: 'Admin A',
          status: 'active',
        },
        {
          id: userCaA1Id,
          email: userCaA1Email,
          passwordHash: hash,
          salt,
          firstName: 'Company',
          lastName: 'Admin A1',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 5. Assign Tenant Admin for Tenant A (WITHOUT company membership in A1 or A2)
    await db.insert(tenantAdmins).values({
      id: 'ta_rec_p2b_a',
      tenantId: tenantAId,
      userId: userTaAId,
      status: 'active',
    });

    // 6. Assign Delegated Company Admin only to Company A1
    await db.insert(memberships).values({
      id: 'mem_p2b_ca_a1',
      tenantId: tenantAId,
      companyId: companyA1Id,
      userId: userCaA1Id,
      role: 'company_admin',
      status: 'active',
    });

    await db.insert(roleAssignments).values({
      id: 'ra_p2b_ca_a1',
      tenantId: tenantAId,
      companyId: companyA1Id,
      userId: userCaA1Id,
      roleId: 'role_sys_company_admin',
      status: 'active',
    });

    // 7. Acquire tokens
    taAToken = (await signInForTest(userTaAEmail)).token;
    caA1Token = (await signInForTest(userCaA1Email)).token;
  });

  describe('Requirement 1 & 2: Tenant Admin Company Details Access across same tenant', () => {
    it('Tenant Admin accesses Company Details for Company A1 in own tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyA1Id}/profile`)
        .set('Authorization', `Bearer ${taAToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(companyA1Id);
      expect(res.body.data.name).toBe('Company A1 Apex');
      expect(res.body.data.displayName).toBe('Apex Corporation');
      expect(res.body.data.legalName).toBe('Apex Holdings Private Limited');
    });

    it('Tenant Admin accesses Company Details for Company A2 in same tenant WITHOUT company membership', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyA2Id}/profile`)
        .set('Authorization', `Bearer ${taAToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(companyA2Id);
      expect(res.body.data.name).toBe('Company A2 Beacon');
      expect(res.body.data.displayName).toBe('Beacon Innovations');
    });
  });

  describe('Requirement 3: Cross-tenant Company Details protection', () => {
    it('Tenant Admin CANNOT access Company Details of another tenant (Tenant B)', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyB1Id}/profile`)
        .set('Authorization', `Bearer ${taAToken}`)
        .expect(403);

      expect(res.body.error?.code || res.body.code).toBe('CROSS_TENANT_COMPANY_ACCESS_DENIED');
    });
  });

  describe('Requirement 4 & 5: Delegated Company Admin Access', () => {
    it('Delegated Company Admin can access their assigned Company A1 details via legacy route', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${caA1Token}`)
        .set('x-company-id', companyA1Id)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(companyA1Id);
      expect(res.body.data.name).toBe('Company A1 Apex');
    });

    it('Delegated Company Admin CANNOT access another company (Company A2)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${caA1Token}`)
        .set('x-company-id', companyA2Id)
        .expect(403);

      expect(res.body.error?.code || res.body.code).toBe('FORBIDDEN_COMPANY_ADMIN');
    });
  });

  describe('Requirement 6 & 7: Same Canonical Company Service & Shared Organization Implementation', () => {
    it('Tenant Admin updates Company Details through canonical service', async () => {
      const updatePayload = {
        displayName: 'Apex Global Enterprises',
        website: 'https://apex-global.example.com',
        city: 'Bengaluru Urban',
      };

      const res = await request(app)
        .patch(`/api/v1/tenant-admin/companies/${companyA1Id}/profile`)
        .set('Authorization', `Bearer ${taAToken}`)
        .send(updatePayload)
        .expect(200);

      expect(res.body.data.displayName).toBe('Apex Global Enterprises');
      expect(res.body.data.website).toBe('https://apex-global.example.com');
      expect(res.body.data.city).toBe('Bengaluru Urban');

      // Direct verify via canonical companyService
      const canonicalProfile = await companyService.getCompanyProfile(companyA1Id);
      expect(canonicalProfile.displayName).toBe('Apex Global Enterprises');
    });

    it('Delegated Company Admin sees updated details and updates through same canonical validation', async () => {
      // 1. Delegated Company Admin sees update
      const res = await request(app)
        .get('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${caA1Token}`)
        .set('x-company-id', companyA1Id)
        .expect(200);

      expect(res.body.data.displayName).toBe('Apex Global Enterprises');

      // 2. Invalid validation (e.g. invalid URL) fails identically on Company Admin
      await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${caA1Token}`)
        .set('x-company-id', companyA1Id)
        .send({ website: 'invalid-url-without-domain' })
        .expect(400);

      // 3. Valid update persists
      const updateRes = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${caA1Token}`)
        .set('x-company-id', companyA1Id)
        .send({ displayName: 'Apex Tech Group' })
        .expect(200);

      expect(updateRes.body.data.displayName).toBe('Apex Tech Group');
    });
  });

  describe('Requirement 8 & 9: Shared Organization Access under Tenant Admin Company Context', () => {
    it('Tenant Admin can access Organization departments for Company A1 in own tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyA1Id}/organization/departments`)
        .set('Authorization', `Bearer ${taAToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((d: { code: string }) => d.code === 'ENG')).toBe(true);
    });

    it('Tenant Admin can access Organization summary for Company A1 in own tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyA1Id}/organization/summary`)
        .set('Authorization', `Bearer ${taAToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.departments).toBeDefined();
      expect(res.body.data.locations).toBeDefined();
    });

    it('Tenant Admin CANNOT access Organization for cross-tenant company (Company B1)', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyB1Id}/organization/departments`)
        .set('Authorization', `Bearer ${taAToken}`)
        .expect(403);

      expect(res.body.error?.code || res.body.code).toBe('CROSS_TENANT_COMPANY_ACCESS_DENIED');
    });
  });

  describe('Requirement 18 & 19: Dependency Direction & Clean Architecture Validation', () => {
    it('Shared canonical domains do NOT depend on company-admin workspace code', () => {
      const canonicalDirs = ['companies', 'organization', 'access', 'users', 'modules', 'audit'];
      const basePlatformDir = path.resolve(__dirname, '..');

      for (const domain of canonicalDirs) {
        const domainDir = path.join(basePlatformDir, domain);
        if (!fs.existsSync(domainDir)) continue;

        const checkFiles = (dir: string) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
              if (file !== '__tests__' && file !== 'node_modules') {
                checkFiles(fullPath);
              }
            } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
              const content = fs.readFileSync(fullPath, 'utf8');
              // Check for import of company-admin (singular)
              const hasCompanyAdminImport = /from\s+['"][^'"]*\/company-admin(\/|['"])/.test(
                content,
              );
              expect(
                hasCompanyAdminImport,
                `Forbidden dependency: ${fullPath} imports company-admin workspace`,
              ).toBe(false);

              // Check for import of tenant-admin (except accessResolverService infrastructure authority check)
              if (domain !== 'access') {
                const hasTenantAdminImport = /from\s+['"][^'"]*\/tenant-admin(\/|['"])/.test(
                  content,
                );
                expect(
                  hasTenantAdminImport,
                  `Forbidden dependency: ${fullPath} imports tenant-admin workspace`,
                ).toBe(false);
              }
            }
          }
        };

        checkFiles(domainDir);
      }
    });
  });
});
