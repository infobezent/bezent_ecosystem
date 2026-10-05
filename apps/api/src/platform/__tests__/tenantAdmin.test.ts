import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
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
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';
import { tenantAdminService } from '../tenant-admin/service/tenantAdmin.service.js';
import { accessResolverService } from '../access/service/accessResolver.service.js';
import { ConflictError, BadRequestError } from '../../app/errors/AppError.js';

describe('Tenant Admin Authority Foundation (Phase 1)', () => {
  const app = createApp();

  const tenantAId = 'tent_ta_test_a';
  const tenantBId = 'tent_ta_test_b';
  const companyA1Id = 'comp_ta_test_a1';
  const companyA2Id = 'comp_ta_test_a2';
  const companyB1Id = 'comp_ta_test_b1';

  const tenantAdminAId = 'usr_ta_test_admin_a';
  const tenantAdminAEmail = 'tenant_admin_a@tenant-a.example';
  const companyAdminA1Id = 'usr_ta_test_ca_a1';
  const companyAdminA1Email = 'company_admin_a1@tenant-a.example';
  const userBId = 'usr_ta_test_user_b';
  const userBEmail = 'user_b@tenant-b.example';

  let tenantAdminAToken: string;
  let companyAdminA1Token: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 1. Create Tenants
    await db
      .insert(tenants)
      .values([
        { id: tenantAId, name: 'Tenant A Alpha Org', status: 'active' },
        { id: tenantBId, name: 'Tenant B Beta Org', status: 'active' },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Create Companies
    await db
      .insert(companies)
      .values([
        {
          id: companyA1Id,
          tenantId: tenantAId,
          name: 'Alpha HQ',
          code: 'ALPHAHQ',
          status: 'active',
        },
        {
          id: companyA2Id,
          tenantId: tenantAId,
          name: 'Alpha Labs',
          code: 'ALPHALAB',
          status: 'active',
        },
        {
          id: companyB1Id,
          tenantId: tenantBId,
          name: 'Beta HQ',
          code: 'BETAHQ',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 3. Entitlements for Tenant A
    await db
      .insert(tenantModules)
      .values([
        {
          id: 'tm_ta_hrms_a',
          tenantId: tenantAId,
          companyId: null,
          moduleCode: 'hrms',
          status: 'enabled',
        },
        {
          id: 'tm_ta_hrms_a1',
          tenantId: tenantAId,
          companyId: companyA1Id,
          moduleCode: 'hrms',
          status: 'enabled',
        },
        {
          id: 'tm_ta_hrms_a2',
          tenantId: tenantAId,
          companyId: companyA2Id,
          moduleCode: 'hrms',
          status: 'enabled',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'enabled' } });

    // 4. Users
    const pwd = hashPassword('TestPassword2026!');

    // Tenant Admin user for Tenant A (has NO company memberships seeded!)
    await db
      .insert(users)
      .values({
        id: tenantAdminAId,
        email: tenantAdminAEmail,
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Teresa',
        lastName: 'TenantAdmin',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: false } });

    // Delegated Company Admin in Company A1 only
    await db
      .insert(users)
      .values({
        id: companyAdminA1Id,
        email: companyAdminA1Email,
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Charlie',
        lastName: 'CompanyAdmin',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: false } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_ta_ca_a1',
        userId: companyAdminA1Id,
        tenantId: tenantAId,
        companyId: companyA1Id,
        role: 'company_admin',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'company_admin' } });

    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_ta_ca_a1',
        userId: companyAdminA1Id,
        roleId: 'role_sys_company_admin',
        tenantId: tenantAId,
        companyId: companyA1Id,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // User in Tenant B (Foreign Tenant user)
    await db
      .insert(users)
      .values({
        id: userBId,
        email: userBEmail,
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Ben',
        lastName: 'Beta',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: false } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_ta_user_b',
        userId: userBId,
        tenantId: tenantBId,
        companyId: companyB1Id,
        role: 'employee',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'employee' } });

    // Clean up residual tenant_admins from prior test runs
    await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, tenantAId));

    // Sign in sessions
    const taLogin = await signInForTest(tenantAdminAEmail);
    tenantAdminAToken = taLogin.token;

    const caLogin = await signInForTest(companyAdminA1Email);
    companyAdminA1Token = caLogin.token;
  });

  describe('1. Authority Assignment & Duplicate Protection', () => {
    it('assigns Tenant Admin authority for Tenant A', async () => {
      const result = await tenantAdminService.assignTenantAdmin({
        tenantId: tenantAId,
        userId: tenantAdminAId,
      });

      expect(result.tenantAdmin).toBeDefined();
      expect(result.tenantAdmin.tenantId).toBe(tenantAId);
      expect(result.tenantAdmin.userId).toBe(tenantAdminAId);
      expect(result.tenantAdmin.status).toBe('active');

      const isTA = await tenantAdminService.isTenantAdmin(tenantAdminAId, tenantAId);
      expect(isTA).toBe(true);
    });

    it('rejects duplicate Tenant Admin assignment for the same user in Tenant A (ConflictError)', async () => {
      await expect(
        tenantAdminService.assignTenantAdmin({
          tenantId: tenantAId,
          userId: tenantAdminAId,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('2. Multi-Company Administration without Direct Memberships', () => {
    it('authorizes Tenant Admin to administer Company A1 and Company A2 without membership rows', async () => {
      const db = getDb();
      // Verify user has zero memberships in companyA1 and companyA2
      const directMemberships = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, tenantAdminAId),
            eq(memberships.tenantId, tenantAId),
          ),
        );
      expect(directMemberships.length).toBe(0);

      // 1. Can administer Company A1
      const resA1 = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .set('x-company-id', companyA1Id);

      expect(resA1.status).toBe(200);
      expect(resA1.body.data).toBeDefined();
      expect(resA1.body.data.company.id).toBe(companyA1Id);

      // 2. Can administer Company A2 in the same tenant
      const resA2 = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .set('x-company-id', companyA2Id);

      expect(resA2.status).toBe(200);
      expect(resA2.body.data).toBeDefined();
      expect(resA2.body.data.company.id).toBe(companyA2Id);
    });

    it('resolves all tenant companies in Access Overview and Company Switcher for Tenant Admin', async () => {
      const resCompanies = await request(app)
        .get('/api/v1/company-admin/companies')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(resCompanies.status).toBe(200);
      expect(Array.isArray(resCompanies.body.data)).toBe(true);
      const companyIds = resCompanies.body.data.map((c: { id: string }) => c.id);
      expect(companyIds).toContain(companyA1Id);
      expect(companyIds).toContain(companyA2Id);
      expect(companyIds).not.toContain(companyB1Id);
    });
  });

  describe('3. Cross-Tenant Boundaries & Isolation', () => {
    it('strictly denies Tenant Admin of Tenant A from administering any company in Tenant B (403)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .set('x-company-id', companyB1Id);

      expect(res.status).toBe(403);
    });

    it('manually supplying a Tenant B company ID does not bypass tenant isolation', async () => {
      const resUsers = await request(app)
        .get('/api/v1/company-admin/users')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .set('x-company-id', companyB1Id);

      expect(resUsers.status).toBe(403);
    });

    it('rejects assigning a foreign tenant user as Tenant Admin in Tenant A', async () => {
      // userBId belongs to Tenant B
      await expect(
        tenantAdminService.assignTenantAdmin({
          tenantId: tenantAId,
          userId: userBId,
        }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('4. Company Admin vs Tenant Admin Separation', () => {
    it('normal Company Admin remains strictly limited to their explicitly authorized company', async () => {
      // Authorized company A1 -> 200
      const resA1 = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${companyAdminA1Token}`)
        .set('x-company-id', companyA1Id);
      expect(resA1.status).toBe(200);

      // Other company A2 in same tenant without membership -> 403
      const resA2 = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${companyAdminA1Token}`)
        .set('x-company-id', companyA2Id);
      expect(resA2.status).toBe(403);
    });

    it('normal Company Admin does NOT automatically become Tenant Admin', async () => {
      const isTA = await tenantAdminService.isTenantAdmin(companyAdminA1Id, tenantAId);
      expect(isTA).toBe(false);
    });

    it('Tenant Admin does NOT automatically become Super Admin', async () => {
      const res = await request(app)
        .get('/api/v1/platform/tenants')
        .set('Authorization', `Bearer ${tenantAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Super Admin privileges required');
    });
  });

  describe('5. Last Active Tenant Admin Protection', () => {
    it('prevents revoking the sole active Tenant Administrator for a tenant', async () => {
      await expect(
        tenantAdminService.revokeTenantAdmin(tenantAId, tenantAdminAId),
      ).rejects.toThrow(BadRequestError);
    });

    it('allows revocation when another active Tenant Admin exists, and protects the remainder', async () => {
      const db = getDb();
      const ta2Id = 'usr_ta_test_admin_a2';
      const pwd = hashPassword('TestPassword2026!');

      await db
        .insert(users)
        .values({
          id: ta2Id,
          email: 'tenant_admin_a2@tenant-a.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Tara',
          lastName: 'SecondAdmin',
          status: 'active',
          isSuperAdmin: false,
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // Assign second Tenant Admin
      await tenantAdminService.assignTenantAdmin({
        tenantId: tenantAId,
        userId: ta2Id,
      });

      // Now 2 active admins exist; revoking the second admin must succeed
      await expect(
        tenantAdminService.revokeTenantAdmin(tenantAId, ta2Id),
      ).resolves.not.toThrow();

      const isTA2 = await tenantAdminService.isTenantAdmin(ta2Id, tenantAId);
      expect(isTA2).toBe(false);

      // Now back to 1 active admin; revoking the primary admin must be rejected
      await expect(
        tenantAdminService.revokeTenantAdmin(tenantAId, tenantAdminAId),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('6. Phase 0 Protection & Entitlements Preservation', () => {
    it('Phase 0 cross-tenant invitation protections remain enforced for Tenant Admin', async () => {
      // Tenant Admin attempts to invite user_b from Tenant B into Company A1
      const res = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set('Authorization', `Bearer ${tenantAdminAToken}`)
        .set('x-company-id', companyA1Id)
        .send({
          email: userBEmail,
          firstName: 'Ben',
          lastName: 'Beta',
          role: 'employee',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CROSS_TENANT_INVITATION_PROHIBITED');
    });

    it('existing authentication and session behavior remains standard (no separate login/session table)', async () => {
      const session = await signInForTest(tenantAdminAEmail);
      expect(session.token).toBeDefined();
      expect(session.user.id).toBe(tenantAdminAId);
      expect(session.user.email).toBe(tenantAdminAEmail);
    });
  });
});
