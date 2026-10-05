import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
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
  auditLogs,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';

describe('Tenant Admin Phase 2C: Company Capacity & Tenant Admin Company Creation', () => {
  const app = createApp();

  const tenantCId = 'tent_p2c_main';
  const tenantDId = 'tent_p2c_other';

  const companyC1Id = 'comp_p2c_c1';
  const companyC2Id = 'comp_p2c_c2';
  const companyD1Id = 'comp_p2c_d1';

  // Users
  const superAdminEmail = 'superadmin@bezent.com';
  const userTaEmail = 'ta_c@tenant-p2c.example';
  const userTaId = 'usr_p2c_ta';

  const userCaEmail = 'ca_c1@tenant-p2c.example';
  const userCaId = 'usr_p2c_ca';

  const userEmpEmail = 'emp_c1@tenant-p2c.example';
  const userEmpId = 'usr_p2c_emp';

  let superAdminToken: string;
  let taToken: string;
  let caToken: string;
  let empToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 0. Clean up previous test artifacts
    await db.delete(auditLogs).where(
      sql`${auditLogs.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(tenantAdmins).where(
      sql`${tenantAdmins.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(departments).where(
      sql`${departments.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(locations).where(
      sql`${locations.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(roleAssignments).where(
      sql`${roleAssignments.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(memberships).where(
      sql`${memberships.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(tenantModules).where(
      sql`${tenantModules.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(companies).where(
      sql`${companies.tenantId} IN (${tenantCId}, ${tenantDId})`,
    );
    await db.delete(tenants).where(
      sql`${tenants.id} IN (${tenantCId}, ${tenantDId})`,
    );

    // 1. Insert Tenants with explicit capacity
    // Tenant C starts with maxCompanies = 3, existing companies = 2
    await db.insert(tenants).values([
      { id: tenantCId, name: 'Tenant C Capacity Org', maxCompanies: 3, status: 'active' },
      { id: tenantDId, name: 'Tenant D Other Org', maxCompanies: 5, status: 'active' },
    ]);

    // 2. Insert Companies
    await db.insert(companies).values([
      {
        id: companyC1Id,
        tenantId: tenantCId,
        name: 'Company C1 Alpha',
        code: 'C1_ALPHA',
        displayName: 'Alpha Corporation',
        status: 'active',
      },
      {
        id: companyC2Id,
        tenantId: tenantCId,
        name: 'Company C2 Beta',
        code: 'C2_BETA',
        displayName: 'Beta Systems',
        status: 'active',
      },
      {
        id: companyD1Id,
        tenantId: tenantDId,
        name: 'Company D1 Delta',
        code: 'D1_DELTA',
        displayName: 'Delta Logistics',
        status: 'active',
      },
    ]);

    // 3. Insert Entitlement Ceiling for Tenant C
    await db.insert(tenantModules).values([
      {
        id: 'mod_p2c_hrms',
        tenantId: tenantCId,
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
      },
    ]);

    // 4. Create Users
    const { hash, salt } = hashPassword('TestP2CPass!1');
    await db.insert(users).values([
      {
        id: userTaId,
        email: userTaEmail,
        passwordHash: hash,
        salt,
        firstName: 'Tenant',
        lastName: 'Admin C',
        status: 'active',
      },
      {
        id: userCaId,
        email: userCaEmail,
        passwordHash: hash,
        salt,
        firstName: 'Company',
        lastName: 'Admin C1',
        status: 'active',
      },
      {
        id: userEmpId,
        email: userEmpEmail,
        passwordHash: hash,
        salt,
        firstName: 'Regular',
        lastName: 'Employee',
        status: 'active',
      },
    ]).onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 5. Assign Tenant Admin for Tenant C
    await db.insert(tenantAdmins).values({
      id: 'ta_rec_p2c_c',
      tenantId: tenantCId,
      userId: userTaId,
      status: 'active',
    });

    // 6. Assign Delegated Company Admin only to Company C1
    await db.insert(memberships).values({
      id: 'mem_p2c_ca_c1',
      tenantId: tenantCId,
      companyId: companyC1Id,
      userId: userCaId,
      role: 'company_admin',
      status: 'active',
    });
    await db.insert(roleAssignments).values({
      id: 'ra_p2c_ca_c1',
      tenantId: tenantCId,
      companyId: companyC1Id,
      userId: userCaId,
      roleId: 'role_sys_company_admin',
      status: 'active',
    });

    // 7. Assign Regular Employee to Company C1
    await db.insert(memberships).values({
      id: 'mem_p2c_emp_c1',
      tenantId: tenantCId,
      companyId: companyC1Id,
      userId: userEmpId,
      role: 'employee',
      status: 'active',
    });

    // 8. Sign in users
    superAdminToken = (await signInForTest(superAdminEmail)).token;
    taToken = (await signInForTest(userTaEmail)).token;
    caToken = (await signInForTest(userCaEmail)).token;
    empToken = (await signInForTest(userEmpEmail)).token;
  });

  // ============================================================================
  // PART A: SCHEMA & MIGRATION INVARIANTS
  // ============================================================================
  describe('Part A — Schema & Migration Invariants', () => {
    it('1. Existing tenants have positive maxCompanies and satisfy max >= used', async () => {
      const db = getDb();
      const allTenants = await db.select().from(tenants);

      expect(allTenants.length).toBeGreaterThan(0);
      for (const t of allTenants) {
        expect(t.maxCompanies).toBeGreaterThan(0);

        const [countRow] = await db
          .select({ total: sql<number>`count(*)` })
          .from(companies)
          .where(eq(companies.tenantId, t.id));
        const companyCount = Number(countRow?.total ?? 0);
        expect(t.maxCompanies).toBeGreaterThanOrEqual(companyCount);
      }
    });

    it('2. Tenants table defines maxCompanies as not-null integer with default 5', () => {
      expect(tenants.maxCompanies).toBeDefined();
      expect(tenants.maxCompanies.notNull).toBe(true);
      expect(tenants.maxCompanies.default).toBe(5);
    });
  });

  // ============================================================================
  // PART B: SUPER ADMIN CAPACITY MANAGEMENT
  // ============================================================================
  describe('Part B — Super Admin Capacity Management', () => {
    it('4. Super Admin can read tenant company capacity', async () => {
      const res = await request(app)
        .get(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        used: 2,
        max: 3,
        remaining: 1,
      });
    });

    it('5. Super Admin can increase tenant company capacity', async () => {
      const res = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        used: 2,
        max: 10,
        remaining: 8,
      });

      // Verify persistence
      const readRes = await request(app)
        .get(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(readRes.body.data.max).toBe(10);
    });

    it('6. Super Admin can decrease capacity to exactly current usage', async () => {
      // Current usage = 2
      const res = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        used: 2,
        max: 2,
        remaining: 0,
      });
    });

    it('7. Super Admin CANNOT decrease capacity below current usage', async () => {
      // Current usage = 2, attempt setting to 1
      const res = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: 1 });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('COMPANY_CAPACITY_BELOW_CURRENT_USAGE');
    });

    it('7b. Rejects invalid non-positive or non-integer capacity', async () => {
      const resZero = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: 0 });
      expect(resZero.status).toBe(400);

      const resNegative = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: -5 });
      expect(resNegative.status).toBe(400);

      const resFloat = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: 3.5 });
      expect(resFloat.status).toBe(400);
    });

    it('8. Non-Super Admin (Company Admin / Employee) cannot modify capacity', async () => {
      const resCa = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${caToken}`)
        .send({ maxCompanies: 10 });
      expect(resCa.status).toBe(403);

      const resEmp = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${empToken}`)
        .send({ maxCompanies: 10 });
      expect(resEmp.status).toBe(403);
    });

    it('9. Tenant Admin cannot modify capacity through Super Admin boundary', async () => {
      const resTa = await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${taToken}`)
        .send({ maxCompanies: 20 });
      expect(resTa.status).toBe(403);
    });

    it('9b. Audit log records tenant_company_capacity_updated event', async () => {
      const db = getDb();
      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          sql`${auditLogs.tenantId} = ${tenantCId} AND ${auditLogs.action} = 'tenant_company_capacity_updated'`,
        );
      expect(logs.length).toBeGreaterThan(0);
      const latest = logs[logs.length - 1]!;
      expect(latest.targetType).toBe('tenant');
      expect(latest.targetId).toBe(tenantCId);
      expect(latest.companyId).toBeNull();
      const meta = typeof latest.metadata === 'string' ? JSON.parse(latest.metadata) : latest.metadata;
      expect(meta.newMaxCompanies).toBe(2);
    });
  });

  // ============================================================================
  // PART C: TENANT ADMIN CAPACITY VISIBILITY
  // ============================================================================
  describe('Part C — Tenant Admin Capacity Visibility', () => {
    it('10. Tenant Admin context returns used, max, remaining, and canCreateCompany', async () => {
      // Currently max = 2, used = 2 -> canCreateCompany = false, remaining = 0
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${taToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.companyCapacity).toEqual({
        used: 2,
        max: 2,
        remaining: 0,
        canCreateCompany: false,
      });
    });

    it('11. When capacity increases, context updates canCreateCompany=true and remaining', async () => {
      // Increase capacity to 4
      await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: 4 });

      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${taToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.companyCapacity).toEqual({
        used: 2,
        max: 4,
        remaining: 2,
        canCreateCompany: true,
      });
    });

    it('11b. Tenant Admin companies endpoint exposes capacity metadata', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${taToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.capacity).toEqual({
        used: 2,
        max: 4,
        remaining: 2,
        canCreateCompany: true,
      });
    });
  });

  // ============================================================================
  // PART D: TENANT ADMIN COMPANY CREATION
  // ============================================================================
  describe('Part D — Tenant Admin Company Creation & Server-side Enforcement', () => {
    let createdCompanyId: string;

    it('13. Tenant Admin can create company when capacity available', async () => {
      const res = await request(app)
        .post('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          name: 'Company C3 Gamma',
          code: 'C3_GAMMA',
          legalName: 'Gamma Innovations Pvt Ltd',
          businessEmail: 'contact@gamma.example',
          country: 'India',
          timeZone: 'Asia/Kolkata',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Company C3 Gamma');
      expect(res.body.data.code).toBe('C3_GAMMA');
      expect(res.body.data.tenantId).toBe(tenantCId);
      expect(res.body.data.status).toBe('active');
      createdCompanyId = res.body.data.id;
    });

    it('14. Created company belongs to callers server-resolved tenant', async () => {
      const db = getDb();
      const [comp] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, createdCompanyId));

      expect(comp).toBeDefined();
      expect(comp?.tenantId).toBe(tenantCId);
    });

    it('15. Request cannot spoof another tenantId in payload', async () => {
      // Caller is Tenant C admin, tries to pass tenantId: tenantDId in body
      const res = await request(app)
        .post('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          name: 'Company C4 Spoof Attempt',
          code: 'C4_SPOOF',
          tenantId: tenantDId, // Must be ignored / overridden
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tenantId).toBe(tenantCId);
      expect(res.body.data.tenantId).not.toBe(tenantDId);

      // Verify in database
      const db = getDb();
      const [comp] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, res.body.data.id));
      expect(comp?.tenantId).toBe(tenantCId);
    });

    it('16. Tenant Admin CANNOT create company after capacity reached', async () => {
      // Now Tenant C has 4 companies: C1, C2, C3, C4. Max is 4.
      const res = await request(app)
        .post('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          name: 'Company C5 Over Ceiling',
          code: 'C5_OVER',
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('COMPANY_CAPACITY_REACHED');
    });

    it('16b. Tenant Admin context shows canCreateCompany=false when full', async () => {
      const res = await request(app)
        .get('/api/v1/tenant-admin/context')
        .set('Authorization', `Bearer ${taToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.companyCapacity).toEqual({
        used: 4,
        max: 4,
        remaining: 0,
        canCreateCompany: false,
      });
    });

    it('17. Delegated Company Admin cannot call Tenant Admin company creation', async () => {
      const res = await request(app)
        .post('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${caToken}`)
        .send({
          name: 'Unauthorized Co',
          code: 'UNAUTH_CO',
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
    });

    it('18. Normal user cannot call Tenant Admin company creation', async () => {
      const res = await request(app)
        .post('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${empToken}`)
        .send({
          name: 'Employee Co',
          code: 'EMP_CO',
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
    });

    it('19. Super Admin without Tenant Admin authority cannot call Tenant Admin company creation', async () => {
      // Super Admin uses /platform/companies, not /tenant-admin/companies
      const res = await request(app)
        .post('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Super Admin Via TA Co',
          code: 'SA_TA_CO',
        });

      expect(res.status).toBe(403);
    });

    it('19b. Rejects duplicate company code within same tenant', async () => {
      // Temporarily give 1 extra slot
      await request(app)
        .patch(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxCompanies: 5 });

      const res = await request(app)
        .post('/api/v1/tenant-admin/companies')
        .set('Authorization', `Bearer ${taToken}`)
        .send({
          name: 'Duplicate Code Attempt',
          code: 'C1_ALPHA', // already exists for Tenant C
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('COMPANY_CODE_ALREADY_EXISTS');
    });
  });

  // ============================================================================
  // PART E: AUTHORITY MODEL INVARIANTS
  // ============================================================================
  describe('Part E — Authority Model Invariants', () => {
    it('20. Creating company does NOT create company_admin membership for Tenant Admin', async () => {
      const db = getDb();
      const taMemberships = await db
        .select()
        .from(memberships)
        .where(
          sql`${memberships.userId} = ${userTaId} AND ${memberships.companyId} IN (
            SELECT id FROM companies WHERE tenant_id = ${tenantCId}
          )`,
        );

      // Tenant Admin must have ZERO company memberships; authority is purely tenant-level
      expect(taMemberships.length).toBe(0);
    });

    it('21. Tenant Admin can immediately resolve and access new company through inherited tenant authority', async () => {
      const db = getDb();
      const [comp] = await db
        .select()
        .from(companies)
        .where(sql`${companies.tenantId} = ${tenantCId} AND ${companies.code} = 'C3_GAMMA'`);
      expect(comp).toBeDefined();

      // Access company context via Tenant Admin endpoint
      const resContext = await request(app)
        .get(`/api/v1/tenant-admin/companies/${comp!.id}/context`)
        .set('Authorization', `Bearer ${taToken}`);
      expect(resContext.status).toBe(200);
      expect(resContext.body.data.id).toBe(comp!.id);

      // Access company profile via Tenant Admin endpoint
      const resProfile = await request(app)
        .get(`/api/v1/tenant-admin/companies/${comp!.id}/profile`)
        .set('Authorization', `Bearer ${taToken}`);
      expect(resProfile.status).toBe(200);
      expect(resProfile.body.data.code).toBe('C3_GAMMA');
    });

    it('22. Delegated Company Admin of Company C1 does NOT gain access to Company C3', async () => {
      const db = getDb();
      const [comp] = await db
        .select()
        .from(companies)
        .where(sql`${companies.tenantId} = ${tenantCId} AND ${companies.code} = 'C3_GAMMA'`);

      // CA attempts to access C3 context
      const resContext = await request(app)
        .get(`/api/v1/tenant-admin/companies/${comp!.id}/context`)
        .set('Authorization', `Bearer ${caToken}`);
      expect(resContext.status).toBe(403);
    });
  });

  // ============================================================================
  // PART F: DATA SIDE EFFECTS & AUDIT
  // ============================================================================
  describe('Part F — Data Side Effects & Audit Verification', () => {
    it('23. Company creation does not modify tenant entitlement ceiling', async () => {
      const db = getDb();
      const tenantCeiling = await db
        .select()
        .from(tenantModules)
        .where(
          sql`${tenantModules.tenantId} = ${tenantCId} AND ${tenantModules.companyId} IS NULL`,
        );

      expect(tenantCeiling.length).toBe(1);
      expect(tenantCeiling[0]?.moduleCode).toBe('hrms');
      expect(tenantCeiling[0]?.status).toBe('enabled');
    });

    it('24. Company creation does NOT fabricate organization or workforce data', async () => {
      const db = getDb();
      const [comp] = await db
        .select()
        .from(companies)
        .where(sql`${companies.tenantId} = ${tenantCId} AND ${companies.code} = 'C3_GAMMA'`);

      const depts = await db
        .select()
        .from(departments)
        .where(eq(departments.companyId, comp!.id));
      expect(depts.length).toBe(0);

      const locs = await db
        .select()
        .from(locations)
        .where(eq(locations.companyId, comp!.id));
      expect(locs.length).toBe(0);
    });

    it('25. Audit event records correct tenant and company scope with source=tenant_admin', async () => {
      const db = getDb();
      const [comp] = await db
        .select()
        .from(companies)
        .where(sql`${companies.tenantId} = ${tenantCId} AND ${companies.code} = 'C3_GAMMA'`);

      const auditEntries = await db
        .select()
        .from(auditLogs)
        .where(
          sql`${auditLogs.targetId} = ${comp!.id} AND ${auditLogs.action} = 'company_created'`,
        );

      expect(auditEntries.length).toBeGreaterThan(0);
      const entry = auditEntries[0]!;
      expect(entry.tenantId).toBe(tenantCId);
      expect(entry.companyId).toBe(comp!.id);
      expect(entry.targetType).toBe('company');
      const meta = typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata;
      expect(meta.companyCode).toBe('C3_GAMMA');
      expect(meta.source).toBe('tenant_admin');
    });
  });

  // ============================================================================
  // PART G: CAPACITY STATUS RULES
  // ============================================================================
  describe('Part G — Capacity Counting Rules', () => {
    it('26. Inactive or suspended company STILL consumes capacity', async () => {
      const db = getDb();
      // Set Company C2 to inactive
      await db
        .update(companies)
        .set({ status: 'inactive' })
        .where(eq(companies.id, companyC2Id));

      // Check capacity for Tenant C
      const res = await request(app)
        .get(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Tenant C has 4 companies total (C1, C2, C3, C4). Even with C2 inactive, used must be 4.
      expect(res.body.data.used).toBe(4);
    });
  });

  // ============================================================================
  // PART H: CONCURRENCY RACE CONDITION PROTECTION
  // ============================================================================
  describe('Part H — Concurrency Race Condition Protection', () => {
    it('28. Concurrent creates when only one slot remains cannot exceed capacity ceiling', async () => {
      // Currently max is 5, used is 4. Exactly 1 slot remaining!
      const readRes = await request(app)
        .get(`/api/v1/platform/tenants/${tenantCId}/company-capacity`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(readRes.body.data.max).toBe(5);
      expect(readRes.body.data.used).toBe(4);
      expect(readRes.body.data.remaining).toBe(1);

      // Launch TWO concurrent company creation requests for the final slot
      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/v1/tenant-admin/companies')
          .set('Authorization', `Bearer ${taToken}`)
          .send({
            name: 'Company Concurrent Alpha',
            code: 'CC_ALPHA',
          }),
        request(app)
          .post('/api/v1/tenant-admin/companies')
          .set('Authorization', `Bearer ${taToken}`)
          .send({
            name: 'Company Concurrent Beta',
            code: 'CC_BETA',
          }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      // Exactly one must succeed (201) and one must be rejected (409)
      expect(statuses).toEqual([201, 409]);

      const rejectedRes = resA.status === 409 ? resA : resB;
      expect(rejectedRes.body.error?.code).toBe('COMPANY_CAPACITY_REACHED');

      // Verify that total companies in the database never exceeded 5
      const db = getDb();
      const [countRow] = await db
        .select({ total: sql<number>`count(*)` })
        .from(companies)
        .where(eq(companies.tenantId, tenantCId));
      expect(Number(countRow?.total)).toBe(5);
    });
  });
});
