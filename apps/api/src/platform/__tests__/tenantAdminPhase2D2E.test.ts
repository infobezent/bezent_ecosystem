import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, sql, and } from 'drizzle-orm';
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
  invitations,
  auditLogs,
} from '../../db/schema.js';
import type {
  TenantMemberRecord,
  TenantMemberCompanyAccess,
  TenantApplicationDistribution,
  CompanyApplicationStatus,
} from '../tenant-admin/types/tenantAdmin.types.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';
import { accessResolverService } from '../access/service/accessResolver.service.js';

describe('Tenant Admin Phase 2D + 2E: Members, Access, RBAC & Application Distribution', () => {
  const app = createApp();

  const tenantMainId = 'tent_p2de_main';
  const tenantOtherId = 'tent_p2de_other';

  const companyC1Id = 'comp_p2de_c1';
  const companyC2Id = 'comp_p2de_c2';
  const companyOtherId = 'comp_p2de_other1';

  // Users
  const ta1Email = 'ta1@tenant-main.example';
  const ta1Id = 'usr_p2de_ta1';

  const ta2Email = 'ta2@tenant-main.example';
  const ta2Id = 'usr_p2de_ta2';

  const dcaEmail = 'dca@tenant-main.example';
  const dcaId = 'usr_p2de_dca';

  const multiUserEmail = 'multi@tenant-main.example';
  const multiUserId = 'usr_p2de_multi';

  const otherUserEmail = 'user@tenant-other.example';
  const otherUserId = 'usr_p2de_other';

  let ta1Token: string;
  let dcaToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 0. Clean up previous test artifacts
    await db
      .delete(auditLogs)
      .where(sql`${auditLogs.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(invitations)
      .where(sql`${invitations.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(tenantAdmins)
      .where(sql`${tenantAdmins.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(roleAssignments)
      .where(
        sql`${roleAssignments.tenantId} IN (${tenantMainId}, ${tenantOtherId}) OR ${roleAssignments.userId} IN (${ta1Id}, ${ta2Id}, ${dcaId}, ${multiUserId}, ${otherUserId}) OR ${roleAssignments.userId} IN (SELECT id FROM users WHERE email LIKE '%@tenant-main.example' OR email LIKE '%@tenant-other.example')`,
      );
    await db
      .delete(memberships)
      .where(sql`${memberships.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(tenantModules)
      .where(sql`${tenantModules.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(companies)
      .where(sql`${companies.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db.delete(tenants).where(sql`${tenants.id} IN (${tenantMainId}, ${tenantOtherId})`);

    // Clean up users
    await db
      .delete(users)
      .where(
        sql`${users.id} IN (${ta1Id}, ${ta2Id}, ${dcaId}, ${multiUserId}, ${otherUserId}) OR ${users.email} LIKE '%@tenant-main.example' OR ${users.email} LIKE '%@tenant-other.example'`,
      );

    // 1. Insert Tenants
    await db.insert(tenants).values([
      { id: tenantMainId, name: 'Main Enterprise Tenant', maxCompanies: 5, status: 'active' },
      { id: tenantOtherId, name: 'External Other Tenant', maxCompanies: 5, status: 'active' },
    ]);

    // 2. Insert Companies
    await db.insert(companies).values([
      {
        id: companyC1Id,
        tenantId: tenantMainId,
        name: 'Main Corp Alpha',
        code: 'MAIN_ALPHA',
        displayName: 'Main Alpha Division',
        status: 'active',
      },
      {
        id: companyC2Id,
        tenantId: tenantMainId,
        name: 'Main Corp Beta',
        code: 'MAIN_BETA',
        displayName: 'Main Beta Division',
        status: 'active',
      },
      {
        id: companyOtherId,
        tenantId: tenantOtherId,
        name: 'External Company',
        code: 'EXT_COMP',
        displayName: 'External Company Corp',
        status: 'active',
      },
    ]);

    // 3. Insert Entitlements
    // Main Tenant: entitled to hrms and crm at tenant level (ceiling)
    // project_management is NOT entitled at tenant level
    await db.insert(tenantModules).values([
      {
        id: 'tm_p2de_main_hrms',
        tenantId: tenantMainId,
        companyId: null,
        moduleCode: 'hrms',
        status: 'enabled',
      },
      {
        id: 'tm_p2de_main_crm',
        tenantId: tenantMainId,
        companyId: null,
        moduleCode: 'crm',
        status: 'enabled',
      },
      // Company 1 starts with hrms enabled
      {
        id: 'tm_p2de_c1_hrms',
        tenantId: tenantMainId,
        companyId: companyC1Id,
        moduleCode: 'hrms',
        status: 'enabled',
      },
      // Company 2 starts with hrms enabled
      {
        id: 'tm_p2de_c2_hrms',
        tenantId: tenantMainId,
        companyId: companyC2Id,
        moduleCode: 'hrms',
        status: 'enabled',
      },
    ]);

    // 4. Insert Users
    const { hash, salt } = hashPassword('SecurePass123!');
    await db.insert(users).values([
      {
        id: ta1Id,
        email: ta1Email,
        passwordHash: hash,
        salt,
        firstName: 'Tenant',
        lastName: 'AdminOne',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: ta2Id,
        email: ta2Email,
        passwordHash: hash,
        salt,
        firstName: 'Tenant',
        lastName: 'AdminTwo',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: dcaId,
        email: dcaEmail,
        passwordHash: hash,
        salt,
        firstName: 'Delegated',
        lastName: 'CompanyAdmin',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: multiUserId,
        email: multiUserEmail,
        passwordHash: hash,
        salt,
        firstName: 'Multi',
        lastName: 'AccessUser',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: otherUserId,
        email: otherUserEmail,
        passwordHash: hash,
        salt,
        firstName: 'Other',
        lastName: 'TenantUser',
        status: 'active',
        isSuperAdmin: false,
      },
    ]);

    // 5. Tenant Admins
    await db.insert(tenantAdmins).values([
      {
        id: 'ta_rec_1',
        tenantId: tenantMainId,
        userId: ta1Id,
        status: 'active',
      },
      {
        id: 'ta_rec_2',
        tenantId: tenantMainId,
        userId: ta2Id,
        status: 'active',
      },
    ]);

    // 6. Memberships
    await db.insert(memberships).values([
      // DCA has membership in Company C1
      {
        id: 'mem_p2de_dca_c1',
        userId: dcaId,
        tenantId: tenantMainId,
        companyId: companyC1Id,
        role: 'user',
        status: 'active',
      },
      // Multi-user has memberships in BOTH Company C1 and C2
      {
        id: 'mem_p2de_multi_c1',
        userId: multiUserId,
        tenantId: tenantMainId,
        companyId: companyC1Id,
        role: 'user',
        status: 'active',
      },
      {
        id: 'mem_p2de_multi_c2',
        userId: multiUserId,
        tenantId: tenantMainId,
        companyId: companyC2Id,
        role: 'user',
        status: 'active',
      },
      // Other user has membership in Other Tenant's Company
      {
        id: 'mem_p2de_other',
        userId: otherUserId,
        tenantId: tenantOtherId,
        companyId: companyOtherId,
        role: 'user',
        status: 'active',
      },
    ]);

    // 7. Role Assignments
    await db.insert(roleAssignments).values([
      // DCA is Company Administrator for C1
      {
        id: 'ra_p2de_dca_c1',
        tenantId: tenantMainId,
        companyId: companyC1Id,
        userId: dcaId,
        roleId: 'role_sys_company_admin',
      },
      // Multi-user is Employee in C1 and HR Manager in C2
      {
        id: 'ra_p2de_multi_c1',
        tenantId: tenantMainId,
        companyId: companyC1Id,
        userId: multiUserId,
        roleId: 'role_sys_employee',
      },
      {
        id: 'ra_p2de_multi_c2',
        tenantId: tenantMainId,
        companyId: companyC2Id,
        userId: multiUserId,
        roleId: 'role_sys_hr_manager',
      },
    ]);

    // 8. Sign in users for testing
    ta1Token = (await signInForTest(ta1Email)).token;
    dcaToken = (await signInForTest(dcaEmail)).token;
  });

  // =========================================================================
  // 1. Tenant Members Directory
  // =========================================================================
  describe('Tenant Members Directory', () => {
    it('Tenant Admin sees only members of their own tenant', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .get('/api/v1/tenant-admin/members')
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      const emails = res.body.data.map((m: TenantMemberRecord) => m.email);

      // Should include TA1, TA2, DCA, and MultiUser
      expect(emails).toContain(ta1Email);
      expect(emails).toContain(ta2Email);
      expect(emails).toContain(dcaEmail);
      expect(emails).toContain(multiUserEmail);

      // MUST NOT leak user from other tenant
      expect(emails).not.toContain(otherUserEmail);
    });

    it('filters tenant members by search query', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .get('/api/v1/tenant-admin/members?search=Multi')
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe(multiUserEmail);
    });

    it('filters tenant members by authority', async () => {
      if (!isDatabaseConfigured) return;

      const taRes = await request(app)
        .get('/api/v1/tenant-admin/members?authority=tenant_admin')
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(
        taRes.body.data.every((m: TenantMemberRecord) => m.tenantAuthority === 'tenant_admin'),
      ).toBe(true);

      const stdRes = await request(app)
        .get('/api/v1/tenant-admin/members?authority=standard')
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(
        stdRes.body.data.every((m: TenantMemberRecord) => m.tenantAuthority === 'standard'),
      ).toBe(true);
      expect(stdRes.body.data.some((m: TenantMemberRecord) => m.email === dcaEmail)).toBe(true);
    });

    it('filters tenant members by company access', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .get(`/api/v1/tenant-admin/members?companyId=${companyC2Id}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const emails = res.body.data.map((m: TenantMemberRecord) => m.email);
      expect(emails).toContain(multiUserEmail);
      // DCA does not have access to C2
      expect(emails).not.toContain(dcaEmail);
    });

    it('multi-company standard user reflects all company memberships and roles', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .get(`/api/v1/tenant-admin/members/${multiUserId}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const member = res.body.data as TenantMemberRecord;
      expect(member.id).toBe(multiUserId);
      expect(member.tenantAuthority).toBe('standard');
      expect(member.companies.length).toBe(2);

      const c1Access = member.companies.find(
        (c: TenantMemberCompanyAccess) => c.companyId === companyC1Id,
      );
      const c2Access = member.companies.find(
        (c: TenantMemberCompanyAccess) => c.companyId === companyC2Id,
      );

      expect(c1Access).toBeDefined();
      expect(
        c1Access?.roles.some(
          (r: TenantMemberCompanyAccess['roles'][number]) => r.roleId === 'role_sys_employee',
        ),
      ).toBe(true);

      expect(c2Access).toBeDefined();
      expect(
        c2Access?.roles.some(
          (r: TenantMemberCompanyAccess['roles'][number]) => r.roleId === 'role_sys_hr_manager',
        ),
      ).toBe(true);
    });

    it('Tenant Admin cannot view details of a member in another tenant (isolation)', async () => {
      if (!isDatabaseConfigured) return;

      await request(app)
        .get(`/api/v1/tenant-admin/members/${otherUserId}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 2. Member Invitations & Cross-Tenant Security
  // =========================================================================
  describe('Member Invitations & Cross-Tenant Security', () => {
    it('creates standard user with explicit company access and role', async () => {
      if (!isDatabaseConfigured) return;

      const newStandardEmail = 'invited.std@tenant-main.example';
      const res = await request(app)
        .post('/api/v1/tenant-admin/members')
        .set('Authorization', `Bearer ${ta1Token}`)
        .send({
          email: newStandardEmail,
          firstName: 'Invited',
          lastName: 'Standard',
          authority: 'standard',
          companyAccess: [
            {
              companyId: companyC1Id,
              roleIds: ['role_sys_employee'],
            },
          ],
        })
        .expect(201);

      expect(res.body.data.member.email).toBe(newStandardEmail);
      expect(res.body.data.member.tenantAuthority).toBe('standard');
      expect(res.body.data.member.companies.length).toBe(1);
      expect(res.body.data.member.companies[0].companyId).toBe(companyC1Id);
    });

    it('creates Tenant Admin authority without company checkboxes required', async () => {
      if (!isDatabaseConfigured) return;

      const newAdminEmail = 'invited.admin@tenant-main.example';
      const res = await request(app)
        .post('/api/v1/tenant-admin/members')
        .set('Authorization', `Bearer ${ta1Token}`)
        .send({
          email: newAdminEmail,
          firstName: 'Invited',
          lastName: 'Admin',
          authority: 'tenant_admin',
        })
        .expect(201);

      expect(res.body.data.member.email).toBe(newAdminEmail);
      expect(res.body.data.member.tenantAuthority).toBe('tenant_admin');
      expect(res.body.data.member.companies.length).toBe(0);
    });

    it('rejects cross-tenant invitation if user already belongs to another tenant', async () => {
      if (!isDatabaseConfigured) return;

      // Attempt to invite otherUserEmail (already in tenantOtherId) into tenantMainId
      const res = await request(app)
        .post('/api/v1/tenant-admin/members')
        .set('Authorization', `Bearer ${ta1Token}`)
        .send({
          email: otherUserEmail,
          firstName: 'Hack',
          lastName: 'Attempt',
          authority: 'standard',
          companyAccess: [{ companyId: companyC1Id, roleIds: ['role_sys_employee'] }],
        })
        .expect(400);

      expect(res.body.error.code).toBe('CROSS_TENANT_INVITATION_PROHIBITED');
    });

    it('rejects cross-tenant invitation if pending invitation exists in another tenant', async () => {
      if (!isDatabaseConfigured) return;

      const db = getDb();
      const pendingEmail = 'pending.other@example.com';
      await db.insert(invitations).values({
        id: 'inv_other_pending',
        tenantId: tenantOtherId,
        companyId: companyOtherId,
        email: pendingEmail,
        role: 'user',
        token: 'token_other_pending_test',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const res = await request(app)
        .post('/api/v1/tenant-admin/members')
        .set('Authorization', `Bearer ${ta1Token}`)
        .send({
          email: pendingEmail,
          firstName: 'Pending',
          lastName: 'Conflict',
          authority: 'standard',
          companyAccess: [{ companyId: companyC1Id, roleIds: ['role_sys_employee'] }],
        })
        .expect(400);

      expect(res.body.error.code).toBe('CROSS_TENANT_INVITATION_PROHIBITED');
    });

    it('rejects spoofed company ID belonging to another tenant', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post('/api/v1/tenant-admin/members')
        .set('Authorization', `Bearer ${ta1Token}`)
        .send({
          email: 'spoof.test@example.com',
          firstName: 'Spoof',
          lastName: 'Tester',
          authority: 'standard',
          companyAccess: [{ companyId: companyOtherId, roleIds: ['role_sys_employee'] }],
        })
        .expect(400);

      expect(res.body.error.code).toBe('COMPANY_TENANT_MISMATCH');
    });
  });

  // =========================================================================
  // 3. Company Access & Role Management
  // =========================================================================
  describe('Company Access & Role Management', () => {
    it('grants access to a second company for an existing member', async () => {
      if (!isDatabaseConfigured) return;

      // DCA initially only has access to C1; grant access to C2
      const res = await request(app)
        .post(`/api/v1/tenant-admin/members/${dcaId}/companies`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .send({
          companyId: companyC2Id,
          roleIds: ['role_sys_employee'],
        })
        .expect(201);

      expect(
        res.body.data.member.companies.some(
          (c: TenantMemberCompanyAccess) => c.companyId === companyC2Id,
        ),
      ).toBe(true);
    });

    it('assigns additional role within an accessible company', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post(`/api/v1/tenant-admin/members/${dcaId}/companies/${companyC2Id}/roles`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .send({
          roleIds: ['role_sys_hr_manager'],
        })
        .expect(200);

      const c2 = res.body.data.member.companies.find(
        (c: TenantMemberCompanyAccess) => c.companyId === companyC2Id,
      );
      expect(
        c2?.roles.some(
          (r: TenantMemberCompanyAccess['roles'][number]) => r.roleId === 'role_sys_hr_manager',
        ),
      ).toBe(true);
    });

    it('revokes a specific role from an accessible company', async () => {
      if (!isDatabaseConfigured) return;

      await request(app)
        .delete(
          `/api/v1/tenant-admin/members/${dcaId}/companies/${companyC2Id}/roles/role_sys_hr_manager`,
        )
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      // Verify member details now only have employee for C2
      const details = await request(app)
        .get(`/api/v1/tenant-admin/members/${dcaId}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const c2 = details.body.data.companies.find(
        (c: TenantMemberCompanyAccess) => c.companyId === companyC2Id,
      );
      expect(
        c2?.roles.some(
          (r: TenantMemberCompanyAccess['roles'][number]) => r.roleId === 'role_sys_hr_manager',
        ),
      ).toBe(false);
    });

    it('revokes company access cleanly', async () => {
      if (!isDatabaseConfigured) return;

      await request(app)
        .delete(`/api/v1/tenant-admin/members/${dcaId}/companies/${companyC2Id}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const details = await request(app)
        .get(`/api/v1/tenant-admin/members/${dcaId}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(
        details.body.data.companies.some(
          (c: TenantMemberCompanyAccess) => c.companyId === companyC2Id,
        ),
      ).toBe(false);
    });

    it('protects last Company Admin from having company access revoked (anti-lockout)', async () => {
      if (!isDatabaseConfigured) return;

      // DCA is the only Company Admin for companyC1Id
      const res = await request(app)
        .delete(`/api/v1/tenant-admin/members/${dcaId}/companies/${companyC1Id}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(400);

      expect(res.body.error.code).toBe('CANNOT_REMOVE_LAST_COMPANY_ADMIN');
    });

    it('protects last Company Admin from having role_sys_company_admin revoked (anti-lockout)', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .delete(
          `/api/v1/tenant-admin/members/${dcaId}/companies/${companyC1Id}/roles/role_sys_company_admin`,
        )
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(400);

      expect(res.body.error.code).toBe('CANNOT_REMOVE_LAST_COMPANY_ADMIN');
    });
  });

  // =========================================================================
  // 4. Tenant Admin Authority Lifecycle & Protections
  // =========================================================================
  describe('Tenant Admin Authority Lifecycle & Protections', () => {
    it('promotes an existing member to Tenant Admin', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post(`/api/v1/tenant-admin/members/${multiUserId}/promote-admin`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(res.body.data.tenantAdmin.status).toBe('active');

      const member = await request(app)
        .get(`/api/v1/tenant-admin/members/${multiUserId}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(member.body.data.tenantAuthority).toBe('tenant_admin');
    });

    it('demotes a promoted Tenant Admin back to standard user', async () => {
      if (!isDatabaseConfigured) return;

      await request(app)
        .post(`/api/v1/tenant-admin/members/${multiUserId}/demote-admin`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const member = await request(app)
        .get(`/api/v1/tenant-admin/members/${multiUserId}`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(member.body.data.tenantAuthority).toBe('standard');
    });

    it('protects the last active Tenant Admin from revocation', async () => {
      if (!isDatabaseConfigured) return;

      const db = getDb();
      // Ensure only TA1 is active by revoking all other tenant admins for this tenant
      await db
        .update(tenantAdmins)
        .set({ status: 'revoked' })
        .where(
          and(eq(tenantAdmins.tenantId, tenantMainId), sql`${tenantAdmins.userId} != ${ta1Id}`),
        );

      // Now TA1 is strictly the ONLY active Tenant Admin. Attempting to demote TA1 must fail!
      const res = await request(app)
        .post(`/api/v1/tenant-admin/members/${ta1Id}/demote-admin`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(400);

      expect(res.body.error.code).toBe('CANNOT_REMOVE_LAST_TENANT_ADMIN');

      // Re-activate TA2 so we have multiple admins for subsequent tests
      await db
        .update(tenantAdmins)
        .set({ status: 'active' })
        .where(and(eq(tenantAdmins.tenantId, tenantMainId), eq(tenantAdmins.userId, ta2Id)));
    });

    it('rejects assigning Tenant Admin across tenants', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post(`/api/v1/tenant-admin/members/${otherUserId}/promote-admin`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(400);

      expect(res.body.error.code).toBe('CROSS_TENANT_ADMIN_PROHIBITED');
    });
  });

  // =========================================================================
  // 5. Delegated Company Admin Scoping & Isolation
  // =========================================================================
  describe('Delegated Company Admin Scoping & Isolation', () => {
    it('Delegated Company Admin is denied access to Tenant Admin APIs', async () => {
      if (!isDatabaseConfigured) return;

      // Members directory
      await request(app)
        .get('/api/v1/tenant-admin/members')
        .set('Authorization', `Bearer ${dcaToken}`)
        .expect(403);

      // Application distribution
      await request(app)
        .get('/api/v1/tenant-admin/applications')
        .set('Authorization', `Bearer ${dcaToken}`)
        .expect(403);

      // Tenant admin assignment
      await request(app)
        .post(`/api/v1/tenant-admin/members/${multiUserId}/promote-admin`)
        .set('Authorization', `Bearer ${dcaToken}`)
        .expect(403);
    });

    it('Delegated Company Admin CAN administer their assigned company profile', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .get('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${dcaToken}`)
        .set('x-company-id', companyC1Id)
        .expect(200);

      expect(res.body.data.id).toBe(companyC1Id);
    });

    it('Delegated Company Admin CANNOT administer another company profile', async () => {
      if (!isDatabaseConfigured) return;

      await request(app)
        .get('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${dcaToken}`)
        .set('x-company-id', companyC2Id)
        .expect(403);
    });
  });

  // =========================================================================
  // 6. Application Distribution (Phase 2E)
  // =========================================================================
  describe('Application Distribution (Phase 2E)', () => {
    it('lists application catalog with tenant entitlement ceiling and company distribution', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .get('/api/v1/tenant-admin/applications')
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const items = res.body.data;
      const hrms = items.find((a: TenantApplicationDistribution) => a.moduleCode === 'hrms');
      const crm = items.find((a: TenantApplicationDistribution) => a.moduleCode === 'crm');
      const pm = items.find(
        (a: TenantApplicationDistribution) => a.moduleCode === 'project_management',
      );

      expect(hrms.tenantEntitled).toBe(true);
      expect(crm.tenantEntitled).toBe(true);
      expect(pm.tenantEntitled).toBe(false); // PM not entitled at tenant level

      // HRMS is enabled for C1 and C2
      expect(hrms.enabledCompanyCount).toBe(2);
      // CRM is not yet enabled for any company
      expect(crm.enabledCompanyCount).toBe(0);
    });

    it('lists company applications with enablement status and canEnable flag', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyC1Id}/applications`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const apps = res.body.data;
      const hrms = apps.find((a: CompanyApplicationStatus) => a.moduleCode === 'hrms');
      const crm = apps.find((a: CompanyApplicationStatus) => a.moduleCode === 'crm');
      const pm = apps.find((a: CompanyApplicationStatus) => a.moduleCode === 'project_management');

      expect(hrms.companyStatus).toBe('enabled');
      expect(crm.companyStatus).toBe('disabled');
      expect(crm.canEnable).toBe(true); // Tenant is entitled to CRM, so company can enable
      expect(pm.companyStatus).toBe('disabled');
      expect(pm.canEnable).toBe(false); // Tenant NOT entitled, so company CANNOT enable
    });

    it('enables an entitled application for a company', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post(`/api/v1/tenant-admin/companies/${companyC1Id}/applications/crm/enable`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(res.body.data.moduleCode).toBe('crm');
      expect(res.body.data.status).toBe('enabled');
      expect(res.body.data.companyId).toBe(companyC1Id);

      // Verify status in company applications
      const statusRes = await request(app)
        .get(`/api/v1/tenant-admin/companies/${companyC1Id}/applications`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const crm = statusRes.body.data.find((a: CompanyApplicationStatus) => a.moduleCode === 'crm');
      expect(crm.companyStatus).toBe('enabled');
    });

    it('rejects enabling an unentitled application for a company', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post(
          `/api/v1/tenant-admin/companies/${companyC1Id}/applications/project_management/enable`,
        )
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(400);

      expect(res.body.error.code).toBe('APP_NOT_ENTITLED_BY_TENANT');
    });

    it('rejects modifying applications for a company belonging to another tenant', async () => {
      if (!isDatabaseConfigured) return;

      await request(app)
        .post(`/api/v1/tenant-admin/companies/${companyOtherId}/applications/crm/enable`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(403);
    });

    it('disables an application without deleting data', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post(`/api/v1/tenant-admin/companies/${companyC1Id}/applications/crm/disable`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(res.body.data.status).toBe('disabled');

      // Verify record still exists in DB with status disabled
      const db = getDb();
      const existing = await db
        .select()
        .from(tenantModules)
        .where(
          sql`${tenantModules.tenantId} = ${tenantMainId} AND ${tenantModules.companyId} = ${companyC1Id} AND ${tenantModules.moduleCode} = 'crm'`,
        );

      expect(existing.length).toBe(1);
      expect(existing[0]!.status).toBe('disabled');
    });

    it('re-enabling application restores availability', async () => {
      if (!isDatabaseConfigured) return;

      const res = await request(app)
        .post(`/api/v1/tenant-admin/companies/${companyC1Id}/applications/crm/enable`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      expect(res.body.data.status).toBe('enabled');
    });
  });

  // =========================================================================
  // 7. Effective Application Access Enforcement
  // =========================================================================
  describe('Effective Application Access Enforcement', () => {
    it('normal user with explicit company access, enabled app, and role has effective permissions', async () => {
      if (!isDatabaseConfigured) return;

      // multiUserId in companyC2Id has role_sys_hr_manager and hrms is enabled
      const authUser = {
        id: multiUserId,
        email: multiUserEmail,
        firstName: 'Multi',
        lastName: 'AccessUser',
        status: 'active' as const,
        isSuperAdmin: false,
        memberships: [
          {
            id: 'mem_p2de_multi_c2',
            companyId: companyC2Id,
            tenantId: tenantMainId,
            role: 'user',
            status: 'active' as const,
          },
        ],
      };

      const access = await accessResolverService.resolveCompanyAccess(authUser, companyC2Id);
      expect(access.isMember).toBe(true);
      expect(access.enabledModules).toContain('hrms');
      expect(access.permissions.some((p) => p.startsWith('hrms.'))).toBe(true);
      expect(access.workspaces).toContain('hrms');
    });

    it('disabling application strips all permissions requiring that application', async () => {
      if (!isDatabaseConfigured) return;

      // Disable hrms for Company C2
      await request(app)
        .post(`/api/v1/tenant-admin/companies/${companyC2Id}/applications/hrms/disable`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);

      const authUser = {
        id: multiUserId,
        email: multiUserEmail,
        firstName: 'Multi',
        lastName: 'AccessUser',
        status: 'active' as const,
        isSuperAdmin: false,
        memberships: [
          {
            id: 'mem_p2de_multi_c2',
            companyId: companyC2Id,
            tenantId: tenantMainId,
            role: 'user',
            status: 'active' as const,
          },
        ],
      };

      const access = await accessResolverService.resolveCompanyAccess(authUser, companyC2Id);
      // HRMS is now disabled
      expect(access.enabledModules).not.toContain('hrms');
      // All hrms permissions stripped
      expect(access.permissions.some((p) => p.startsWith('hrms.'))).toBe(false);
      expect(access.workspaces).not.toContain('hrms');

      // Re-enable hrms for C2
      await request(app)
        .post(`/api/v1/tenant-admin/companies/${companyC2Id}/applications/hrms/enable`)
        .set('Authorization', `Bearer ${ta1Token}`)
        .expect(200);
    });

    it('Tenant Admin administrative authority does not grant unrestricted application business data', async () => {
      if (!isDatabaseConfigured) return;

      // TA1 has tenant-wide administrative authority over tenantMainId, but NO membership/roles in C1
      const authUser = {
        id: ta1Id,
        email: ta1Email,
        firstName: 'Tenant',
        lastName: 'AdminOne',
        status: 'active' as const,
        isSuperAdmin: false,
        memberships: [],
      };

      const access = await accessResolverService.resolveCompanyAccess(authUser, companyC1Id);
      expect(access.isTenantAdmin).toBe(true);
      expect(access.isMember).toBe(false);

      // Has company administrative permissions (profile, organization)
      expect(access.permissions).toContain('company.profile.read');
      expect(access.permissions).toContain('company.organization.read');

      // MUST NOT have HRMS employee business data permissions
      expect(access.permissions).not.toContain('hrms.employees.read');
      expect(access.permissions).not.toContain('hrms.employees.manage');
      expect(access.permissions).not.toContain('hrms.payroll.process');
    });
  });

  // =========================================================================
  // 8. Audit Logging Verification
  // =========================================================================
  describe('Audit Logging Verification', () => {
    it('verifies audit logs recorded sensitive administrative actions', async () => {
      if (!isDatabaseConfigured) return;

      const db = getDb();
      const logs = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantMainId));

      const actions = logs.map((l) => l.action);

      // Expect audit records for member invite, company access grant/revoke, role changes, module enable/disable
      expect(actions).toContain('tenant_member_invited');
      expect(actions).toContain('company_access_granted');
      expect(actions).toContain('company_access_revoked');
      expect(actions).toContain('role_assigned');
      expect(actions).toContain('module_enabled');
      expect(actions).toContain('module_disabled');
    });
  });
});
