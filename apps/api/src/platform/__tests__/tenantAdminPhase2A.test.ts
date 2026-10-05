import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, and, sql } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  tenantAdmins,
  tenantModules,
  auditLogs,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';
import { tenantAdminBackfillService } from '../tenant-admin/service/tenantAdminBackfill.service.js';

describe('Tenant Admin Phase 2A: Backfill & Canonical APIs', () => {
  const app = createApp();

  // Test Entities
  const tenantAId = 'tent_p2a_a';
  const tenantBId = 'tent_p2a_b';
  const tenantCId = 'tent_p2a_c'; // Legacy tenant: single company_admin, no tenant_admins
  const tenantDId = 'tent_p2a_d'; // Legacy tenant: ambiguous (2 company_admins in diff companies)
  const tenantEId = 'tent_p2a_e'; // Legacy tenant: cross-tenant user

  const companyA1Id = 'comp_p2a_a1';
  const companyA2Id = 'comp_p2a_a2';
  const companyB1Id = 'comp_p2a_b1';
  const companyC1Id = 'comp_p2a_c1';
  const companyD1Id = 'comp_p2a_d1';
  const companyD2Id = 'comp_p2a_d2';
  const companyE1Id = 'comp_p2a_e1';

  // Users
  const userTaAId = 'usr_p2a_ta_a';
  const userTaAEmail = 'ta_a@tenant-a.example';

  const userCaA1Id = 'usr_p2a_ca_a1';
  const userCaA1Email = 'ca_a1@tenant-a.example';

  const userNormAId = 'usr_p2a_norm_a';
  const userNormAEmail = 'norm_a@tenant-a.example';

  const userSuperId = 'usr_p2a_super';
  const userSuperEmail = 'super@bezent.example';

  const userTaBId = 'usr_p2a_ta_b';
  const userTaBEmail = 'ta_b@tenant-b.example';

  const userC1Id = 'usr_p2a_c1';
  const userC1Email = 'c1@tenant-c.example';

  const userD1Id = 'usr_p2a_d1';
  const userD1Email = 'd1@tenant-d.example';
  const userD2Id = 'usr_p2a_d2';
  const userD2Email = 'd2@tenant-d.example';

  const userE1Id = 'usr_p2a_e1';
  const userE1Email = 'e1@tenant-e.example';

  let taAToken: string;
  let caA1Token: string;
  let normAToken: string;
  let superToken: string;
  let taBToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // Clean up potential prior test artifacts
    await db
      .delete(tenantAdmins)
      .where(
        sql`${tenantAdmins.tenantId} IN (${tenantAId}, ${tenantBId}, ${tenantCId}, ${tenantDId}, ${tenantEId})`,
      );
    await db
      .delete(memberships)
      .where(
        sql`${memberships.tenantId} IN (${tenantAId}, ${tenantBId}, ${tenantCId}, ${tenantDId}, ${tenantEId})`,
      );
    await db
      .delete(tenantModules)
      .where(
        sql`${tenantModules.tenantId} IN (${tenantAId}, ${tenantBId}, ${tenantCId}, ${tenantDId}, ${tenantEId})`,
      );
    await db
      .delete(companies)
      .where(
        sql`${companies.tenantId} IN (${tenantAId}, ${tenantBId}, ${tenantCId}, ${tenantDId}, ${tenantEId})`,
      );
    await db
      .delete(tenants)
      .where(
        sql`${tenants.id} IN (${tenantAId}, ${tenantBId}, ${tenantCId}, ${tenantDId}, ${tenantEId})`,
      );

    // 1. Insert Tenants
    await db.insert(tenants).values([
      { id: tenantAId, name: 'Tenant A Org', status: 'active' },
      { id: tenantBId, name: 'Tenant B Org', status: 'active' },
      { id: tenantCId, name: 'Tenant C Legacy Org', status: 'active' },
      { id: tenantDId, name: 'Tenant D Ambiguous Org', status: 'active' },
      { id: tenantEId, name: 'Tenant E Cross Org', status: 'active' },
    ]);

    // 2. Insert Companies
    await db.insert(companies).values([
      {
        id: companyA1Id,
        tenantId: tenantAId,
        name: 'Company A1',
        code: 'COMPA1',
        status: 'active',
      },
      {
        id: companyA2Id,
        tenantId: tenantAId,
        name: 'Company A2',
        code: 'COMPA2',
        status: 'active',
      },
      {
        id: companyB1Id,
        tenantId: tenantBId,
        name: 'Company B1',
        code: 'COMPB1',
        status: 'active',
      },
      {
        id: companyC1Id,
        tenantId: tenantCId,
        name: 'Company C1',
        code: 'COMPC1',
        status: 'active',
      },
      {
        id: companyD1Id,
        tenantId: tenantDId,
        name: 'Company D1',
        code: 'COMPD1',
        status: 'active',
      },
      {
        id: companyD2Id,
        tenantId: tenantDId,
        name: 'Company D2',
        code: 'COMPD2',
        status: 'active',
      },
      {
        id: companyE1Id,
        tenantId: tenantEId,
        name: 'Company E1',
        code: 'COMPE1',
        status: 'active',
      },
    ]);

    // 3. Insert Application Entitlements for Tenant A
    await db.insert(tenantModules).values([
      {
        id: 'tm_p2a_hrms_a',
        tenantId: tenantAId,
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
      },
      {
        id: 'tm_p2a_crm_a',
        tenantId: tenantAId,
        companyId: null,
        moduleCode: 'crm',
        status: 'enabled',
      },
    ]);

    // 4. Create Users
    const { hash, salt } = hashPassword('TestP2A!Pass123');
    const userRows = [
      {
        id: userTaAId,
        email: userTaAEmail,
        firstName: 'Admin',
        lastName: 'TA-A',
        isSuperAdmin: false,
      },
      {
        id: userCaA1Id,
        email: userCaA1Email,
        firstName: 'Admin',
        lastName: 'CA-A1',
        isSuperAdmin: false,
      },
      {
        id: userNormAId,
        email: userNormAEmail,
        firstName: 'Employee',
        lastName: 'Norm-A',
        isSuperAdmin: false,
      },
      {
        id: userSuperId,
        email: userSuperEmail,
        firstName: 'Super',
        lastName: 'Admin',
        isSuperAdmin: true,
      },
      {
        id: userTaBId,
        email: userTaBEmail,
        firstName: 'Admin',
        lastName: 'TA-B',
        isSuperAdmin: false,
      },
      {
        id: userC1Id,
        email: userC1Email,
        firstName: 'Founder',
        lastName: 'Legacy-C',
        isSuperAdmin: false,
      },
      {
        id: userD1Id,
        email: userD1Email,
        firstName: 'Admin1',
        lastName: 'Legacy-D',
        isSuperAdmin: false,
      },
      {
        id: userD2Id,
        email: userD2Email,
        firstName: 'Admin2',
        lastName: 'Legacy-D',
        isSuperAdmin: false,
      },
      {
        id: userE1Id,
        email: userE1Email,
        firstName: 'Cross',
        lastName: 'Legacy-E',
        isSuperAdmin: false,
      },
    ];

    for (const u of userRows) {
      await db
        .insert(users)
        .values({
          id: u.id,
          email: u.email,
          passwordHash: hash,
          salt,
          firstName: u.firstName,
          lastName: u.lastName,
          status: 'active',
          isSuperAdmin: u.isSuperAdmin,
        })
        .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: u.isSuperAdmin } });
    }

    // 5. Memberships
    await db.insert(memberships).values([
      // Tenant A
      {
        id: 'mem_p2a_ca_a1',
        tenantId: tenantAId,
        companyId: companyA1Id,
        userId: userCaA1Id,
        role: 'company_admin',
        status: 'active',
      },
      {
        id: 'mem_p2a_norm_a',
        tenantId: tenantAId,
        companyId: companyA1Id,
        userId: userNormAId,
        role: 'employee',
        status: 'active',
      },
      // Tenant B
      {
        id: 'mem_p2a_ta_b',
        tenantId: tenantBId,
        companyId: companyB1Id,
        userId: userTaBId,
        role: 'company_admin',
        status: 'active',
      },
      // Tenant C: sole company_admin
      {
        id: 'mem_p2a_c1',
        tenantId: tenantCId,
        companyId: companyC1Id,
        userId: userC1Id,
        role: 'company_admin',
        status: 'active',
      },
      // Tenant D: two company admins in different companies
      {
        id: 'mem_p2a_d1',
        tenantId: tenantDId,
        companyId: companyD1Id,
        userId: userD1Id,
        role: 'company_admin',
        status: 'active',
      },
      {
        id: 'mem_p2a_d2',
        tenantId: tenantDId,
        companyId: companyD2Id,
        userId: userD2Id,
        role: 'company_admin',
        status: 'active',
      },
      // Tenant E: userE1 has membership in Tenant E AND in Tenant B (cross-tenant)
      {
        id: 'mem_p2a_e1',
        tenantId: tenantEId,
        companyId: companyE1Id,
        userId: userE1Id,
        role: 'company_admin',
        status: 'active',
      },
      {
        id: 'mem_p2a_e1_b',
        tenantId: tenantBId,
        companyId: companyB1Id,
        userId: userE1Id,
        role: 'employee',
        status: 'active',
      },
    ]);

    // 6. Explicit Tenant Admins (Tenant A and B)
    await db.insert(tenantAdmins).values([
      { id: 'ta_rec_a', tenantId: tenantAId, userId: userTaAId, status: 'active' },
      { id: 'ta_rec_b', tenantId: tenantBId, userId: userTaBId, status: 'active' },
    ]);

    // 7. Obtain Session Tokens
    const sTaA = await signInForTest(userTaAEmail);
    taAToken = sTaA.token;

    const sCaA1 = await signInForTest(userCaA1Email);
    caA1Token = sCaA1.token;

    const sNormA = await signInForTest(userNormAEmail);
    normAToken = sNormA.token;

    const sSuper = await signInForTest(userSuperEmail);
    superToken = sSuper.token;

    const sTaB = await signInForTest(userTaBEmail);
    taBToken = sTaB.token;
  });

  // ==========================================
  // PART A: EXISTING TENANT BACKFILL
  // ==========================================
  describe('Part A — Existing Tenant Backfill', () => {
    it('1 & 2. Idempotent backfill identifies unambiguous sole admin and creates exactly one tenant_admins record', async () => {
      // First run: Tenant C should be backfilled
      const firstRun = await tenantAdminBackfillService.runBackfill({
        email: 'super@bezent.example',
      });
      const backfilledC = firstRun.backfilled.find((b) => b.tenantId === tenantCId);

      expect(backfilledC).toBeDefined();
      expect(backfilledC?.userId).toBe(userC1Id);

      // Verify DB record created
      const db = getDb();
      const [record] = await db
        .select()
        .from(tenantAdmins)
        .where(and(eq(tenantAdmins.tenantId, tenantCId), eq(tenantAdmins.userId, userC1Id)));
      expect(record).toBeDefined();
      expect(record?.status).toBe('active');

      // Second run: Must be idempotent and create 0 duplicates for Tenant C
      const secondRun = await tenantAdminBackfillService.runBackfill();
      const alreadyHasC = secondRun.skippedAlreadyHasAdmin.find((s) => s.tenantId === tenantCId);
      expect(alreadyHasC).toBeDefined();

      const allRecordsForC = await db
        .select()
        .from(tenantAdmins)
        .where(eq(tenantAdmins.tenantId, tenantCId));
      expect(allRecordsForC.length).toBe(1);
    });

    it('3. Ambiguous tenant with multiple possible founding admins is NOT arbitrarily promoted', async () => {
      const db = getDb();
      const summary = await tenantAdminBackfillService.runBackfill();

      // Tenant D has 2 company_admins without a disambiguating audit log
      const skippedD = summary.skippedAmbiguous.find((s) => s.tenantId === tenantDId);
      expect(skippedD).toBeDefined();
      expect(skippedD?.candidateUserIds?.length).toBe(2);

      // Zero tenant_admins records should exist for Tenant D
      const recordsForD = await db
        .select()
        .from(tenantAdmins)
        .where(eq(tenantAdmins.tenantId, tenantDId));
      expect(recordsForD.length).toBe(0);
    });

    it('4. Cross-tenant user cannot be backfilled as Tenant Admin', async () => {
      const db = getDb();
      const summary = await tenantAdminBackfillService.runBackfill();

      // User E1 belongs to both Tenant E and Tenant B -> prohibited
      const skippedE = summary.skippedCrossTenant.find((s) => s.tenantId === tenantEId);
      expect(skippedE).toBeDefined();
      expect(skippedE?.userId).toBe(userE1Id);

      // Zero tenant_admins records for Tenant E
      const recordsForE = await db
        .select()
        .from(tenantAdmins)
        .where(eq(tenantAdmins.tenantId, tenantEId));
      expect(recordsForE.length).toBe(0);
    });

    it('5. Existing memberships and role assignments remain untouched after backfill', async () => {
      const db = getDb();
      const memC = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.tenantId, tenantCId), eq(memberships.userId, userC1Id)));
      expect(memC.length).toBe(1);
      expect(memC[0]?.role).toBe('company_admin');
      expect(memC[0]?.status).toBe('active');
    });
  });

  // ==========================================
  // PART B: CANONICAL TENANT ADMIN CONTEXT
  // ==========================================
  describe('Part B — Tenant Admin Context', () => {
    it('6. Tenant Admin context returns correct tenant identity', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tenant.id).toBe(tenantAId);
      expect(res.body.data.tenant.name).toBe('Tenant A Org');
      expect(res.body.data.user.id).toBe(userTaAId);
      expect(res.body.data.tenantAdmin.status).toBe('active');
      expect(res.body.data.entitlements).toContain('hrms');
      expect(res.body.data.entitlements).toContain('crm');
    });

    it('7. Tenant Admin context returns all companies in the tenant without individual memberships', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      const companyIds = res.body.data.companies.map((c: { id: string }) => c.id);
      expect(companyIds).toContain(companyA1Id);
      expect(companyA2Id).toBeDefined();
      expect(companyIds).toContain(companyA2Id);
    });

    it('8. Tenant Admin context never returns another tenant companies', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      const companyIds = res.body.data.companies.map((c: { id: string }) => c.id);
      expect(companyIds).not.toContain(companyB1Id);
    });

    it('9. Company Admin without Tenant Admin authority cannot call Tenant Admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${caA1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
    });

    it('10. Normal user cannot call Tenant Admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${normAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
    });

    it('11. Super Admin without Tenant Admin authority cannot call Tenant Admin endpoints directly', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${superToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
    });

    it('11b. GET /api/v1/tenant-admin/tenant returns sanitized details', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/tenant')
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tenantAId);
      expect(res.body.data.name).toBe('Tenant A Org');
    });

    it('11c. GET /api/v1/tenant-admin/companies returns all tenant companies', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(companyA1Id);
      expect(ids).toContain(companyA2Id);
      expect(ids).not.toContain(companyB1Id);
    });
  });

  // ==========================================
  // PART C: COMPANY CONTEXT
  // ==========================================
  describe('Part C — Company Context Validation', () => {
    it('18. Tenant Admin can resolve Company A1 within their tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyA1Id}/context`)
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(companyA1Id);
      expect(res.body.data.tenantId).toBe(tenantAId);
    });

    it('19. Tenant Admin can resolve Company A2 within same tenant without explicit membership', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyA2Id}/context`)
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(companyA2Id);
      expect(res.body.data.tenantId).toBe(tenantAId);
    });

    it('20. Tenant Admin cannot resolve company belonging to another tenant', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyB1Id}/context`)
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CROSS_TENANT_COMPANY_ACCESS_DENIED');
    });
  });

  // ==========================================
  // PART D: TENANT ADMIN MANAGEMENT
  // ==========================================
  describe('Part D — Tenant Admin Management', () => {
    const newAdminEmail = 'new_ta_a2@tenant-a.example';
    let assignedAdminUserId: string;

    it('12. Same-tenant valid Tenant Admin assignment works', async () => {
      const res = await request(app)
        .post('/api/v1/tenant-admin/admins')
        .set('Authorization', `Bearer ${taAToken}`)
        .send({
          newUser: {
            email: newAdminEmail,
            firstName: 'Second',
            lastName: 'Admin',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tenantAdmin.tenantId).toBe(tenantAId);
      assignedAdminUserId = res.body.data.tenantAdmin.userId;
      expect(assignedAdminUserId).toBeDefined();
    });

    it('13. Duplicate Tenant Admin assignment is rejected', async () => {
      const res = await request(app)
        .post('/api/v1/tenant-admin/admins')
        .set('Authorization', `Bearer ${taAToken}`)
        .send({
          userId: assignedAdminUserId,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TENANT_ADMIN_ALREADY_EXISTS');
    });

    it('14. Cross-tenant assignment is rejected', async () => {
      // Trying to assign userTaBId (from Tenant B) to Tenant A
      const res = await request(app)
        .post('/api/v1/tenant-admin/admins')
        .set('Authorization', `Bearer ${taAToken}`)
        .send({
          userId: userTaBId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CROSS_TENANT_ADMIN_PROHIBITED');
    });

    it('15. Tenant Admin revocation works when another active Tenant Admin remains', async () => {
      const res = await request(app)
        .post(`/api/v1/tenant-admin/admins/${assignedAdminUserId}/revoke`)
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('revoked');
    });

    it('16. Last Tenant Admin revocation is rejected', async () => {
      // userTaAId is now the only active Tenant Admin for Tenant A
      const res = await request(app)
        .post(`/api/v1/tenant-admin/admins/${userTaAId}/revoke`)
        .set('Authorization', `Bearer ${taAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_REMOVE_LAST_TENANT_ADMIN');
    });

    it('17. Assignment, revocation, and backfill audit events use company_id = null', async () => {
      const db = getDb();
      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, tenantAId),
            sql`${auditLogs.action} IN ('tenant_admin_assigned', 'tenant_admin_revoked')`,
          ),
        );

      expect(logs.length).toBeGreaterThanOrEqual(2);
      for (const l of logs) {
        expect(l.companyId).toBeNull();
      }
    });
  });

  // ==========================================
  // PART E: SUPER ADMIN PLATFORM APIs
  // ==========================================
  describe('Part E — Super Admin Platform APIs', () => {
    it('Super Admin can list tenant admins across all tenants', async () => {
      const res = await request(app)
        .get('/api/v1/platform/tenant-admins')
        .set('Authorization', `Bearer ${superToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const tenantIds = res.body.data.map((r: { tenantId: string }) => r.tenantId);
      expect(tenantIds).toContain(tenantAId);
    });

    it('Super Admin can trigger backfill through /api/v1/platform/tenant-admins/backfill', async () => {
      const res = await request(app)
        .post('/api/v1/platform/tenant-admins/backfill')
        .set('Authorization', `Bearer ${superToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('processedTenants');
      expect(res.body.data).toHaveProperty('backfilled');
      expect(res.body.data).toHaveProperty('skippedAlreadyHasAdmin');
    });
  });
});
