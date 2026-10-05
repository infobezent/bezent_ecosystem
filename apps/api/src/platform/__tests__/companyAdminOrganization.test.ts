import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import { eq } from 'drizzle-orm';
import { tenants, companies, users, memberships, roleAssignments, tenantModules, tenantAdmins } from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';

describe('Company Admin Organization Masters Subsystem (HRMS-Decoupled)', () => {
  const app = createApp();

  const tenantId = 'tent_org_decoupled';
  const companyId = 'comp_org_decoupled';
  const companyBId = 'comp_org_decoupled_b';

  let companyAdminToken: string;
  let ordinaryEmployeeToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // Clean up any tenant admin records for test isolation
    await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, tenantId));

    // 1. Create Tenant with NO HRMS entitlement (only cm / no hrms)
    await db
      .insert(tenants)
      .values([
        { id: tenantId, name: 'Decoupled Org Tenant', status: 'active' },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // Explicitly configure tenant modules WITHOUT hrms (e.g. crm only)
    await db
      .insert(tenantModules)
      .values([
        {
          id: 'tm_org_crm',
          tenantId,
          companyId,
          moduleCode: 'crm',
          status: 'enabled',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'enabled' } });

    // 2. Create Companies
    await db
      .insert(companies)
      .values([
        {
          id: companyId,
          tenantId,
          name: 'Decoupled Org Co',
          code: 'DEC_ORG',
          status: 'active',
        },
        {
          id: companyBId,
          tenantId,
          name: 'Other Co',
          code: 'OTHER_CO',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db.update(companies).set({ name: 'Decoupled Org Co' }).where(eq(companies.id, companyId));

    // 3. Create Company Admin User
    const caPass = hashPassword('AdminPass123!');
    adminUserId = 'usr_org_decoupled_admin';
    await db
      .insert(users)
      .values({
        id: adminUserId,
        email: 'org_admin@decoupled.example',
        passwordHash: caPass.hash,
        salt: caPass.salt,
        firstName: 'Org',
        lastName: 'Admin',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_org_decoupled_admin',
        userId: adminUserId,
        tenantId,
        companyId,
        role: 'company_admin',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'company_admin' } });

    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_org_decoupled_admin',
        userId: adminUserId,
        roleId: 'role_sys_company_admin',
        tenantId,
        companyId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    const caLogin = await signInForTest('org_admin@decoupled.example');
    companyAdminToken = caLogin.token;

    // 4. Create Employee User without admin permissions
    const empPass = hashPassword('EmpPass123!');
    const empUserId = 'usr_org_decoupled_emp';
    await db
      .insert(users)
      .values({
        id: empUserId,
        email: 'org_emp@decoupled.example',
        passwordHash: empPass.hash,
        salt: empPass.salt,
        firstName: 'Regular',
        lastName: 'Worker',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_org_decoupled_emp',
        userId: empUserId,
        tenantId,
        companyId,
        role: 'employee',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'employee' } });

    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_org_decoupled_emp',
        userId: empUserId,
        roleId: 'role_sys_employee',
        tenantId,
        companyId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    const empLogin = await signInForTest('org_emp@decoupled.example');
    ordinaryEmployeeToken = empLogin.token;
  });

  describe('Shared Organization Access when HRMS is DISABLED', () => {
    it('1. Company Admin accesses Departments without requiring HRMS entitlement', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/departments')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.error).toBeUndefined();
    });

    it('2. Company Admin creates a Department without requiring HRMS entitlement', async () => {
      const uniqueCode = `ENG_${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/company-admin/organization/departments')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId)
        .send({
          name: `Engineering ${uniqueCode}`,
          code: uniqueCode,
          description: 'Created under Company Admin with HRMS disabled',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toBe(uniqueCode);
    });

    it('3. Company Admin accesses Work Locations without requiring HRMS entitlement', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/locations')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('4. Company Admin creates a Work Location without requiring HRMS entitlement', async () => {
      const uniqueLocCode = `LOC_${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/company-admin/organization/locations')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId)
        .send({
          name: `HQ Office ${uniqueLocCode}`,
          code: uniqueLocCode,
          type: 'office',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          addressLine1: 'MG Road 101',
          postalCode: '560001',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.code).toBe(uniqueLocCode);
    });

    it('5. Company Admin accesses Organization Structure without requiring HRMS entitlement', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/structure')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.company).toBeDefined();
      expect(res.body.data.businessUnits).toBeDefined();
      expect(typeof res.body.data.totalBusinessUnits).toBe('number');
    });

    it('6. Company Admin accesses Structure Heads safely when no employees exist (degrades safely to empty list)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/structure/heads')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('7. Rejects unauthorized access from regular employee lacking permissions (403)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/departments')
        .set('Authorization', `Bearer ${ordinaryEmployeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(403);
    });

    it('8. Enforces company isolation (cannot access company B with company A context)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/departments')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyBId);

      expect(res.status).toBe(403);
    });

    it('9. Company Admin accesses Organization Profile without requiring HRMS entitlement', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/profile')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Decoupled Org Co');
    });

    it('10. Company Admin updates Organization Profile without requiring HRMS entitlement and keeps Company Name protected', async () => {
      const res = await request(app)
        .put('/api/v1/company-admin/organization/profile')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('X-Company-Id', companyId)
        .send({
          name: 'Decoupled Org Co Attempted Change',
          displayName: 'Decoupled Org',
          organizationType: 'Private Limited',
          primaryEmail: 'info@decoupled.example',
          addressLine1: 'Main Street 10',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          postalCode: '560001',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Decoupled Org Co'); // Name remains immutable
      expect(res.body.data.displayName).toBe('Decoupled Org');
    });

    it('11. Legacy PUT /organization/profile rejects caller lacking company.profile.update permission', async () => {
      const res = await request(app)
        .put('/api/v1/company-admin/organization/profile')
        .set('Authorization', `Bearer ${ordinaryEmployeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          name: 'Unauthorized Profile Change',
          organizationType: 'Private Limited',
          primaryEmail: 'info@unauthorized.example',
          addressLine1: 'Main Street 10',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          postalCode: '560001',
        });

      expect(res.status).toBe(403);
    });
  });
});
