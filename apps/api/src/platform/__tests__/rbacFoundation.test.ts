import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  companies,
  memberships,
  roleAssignments,
  rolePermissions,
  roles,
  tenantModules,
  tenants,
  users,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';
import {
  findPermission,
  normalizePermissionKey,
  registerPermission,
  registerRolePermissions,
  findSystemRole,
} from '../access/catalog/accessCatalog.js';

/**
 * RBAC FOUNDATION ACCEPTANCE TEST SUITE (Section 15 Specification).
 *
 * Verifies the 14 mandatory security gates of the BEZENT access model:
 * Authenticated User
 *   ↓
 * Active Company Membership
 *   ↓
 * Company Application Access
 *   ↓
 * User Role Assignment(s)
 *   ↓
 * Module Permission
 *   ↓
 * Action Permission
 *   ↓
 * Resource / Company Scope
 *   ↓
 * ALLOW / DENY
 */
describe.skipIf(!isDatabaseConfigured)('RBAC Foundation Engine Tests (Section 15)', () => {
  const app = createApp();

  const tenantA = 'tent_fnd_t1';
  const tenantB = 'tent_fnd_t2';
  const companyA = 'comp_fnd_a';
  const companyB = 'comp_fnd_b';

  const userSuperAdmin = 'usr_fnd_sa';
  const userCompanyAdmin = 'usr_fnd_ca';
  const userHR = 'usr_fnd_hr';
  const userEmployee = 'usr_fnd_emp';
  const userCustom = 'usr_fnd_cust';
  const userMulti = 'usr_fnd_multi';

  const PASSWORD = 'RbacFoundationPass2026!';
  const emailOf = (id: string) => `${id}@rbac-foundation.example`;

  let tokenSuperAdmin: string;
  let tokenCompanyAdmin: string;
  let tokenHR: string;
  let tokenEmployee: string;
  let tokenCustom: string;
  let tokenMulti: string;

  let customRoleId: string;

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function upsertUser(id: string, isSuperAdmin = false) {
    const { hash, salt } = hashPassword(PASSWORD);
    await getDb()
      .insert(users)
      .values({
        id,
        email: emailOf(id),
        passwordHash: hash,
        salt,
        firstName: 'Foundation',
        lastName: id,
        status: 'active',
        isSuperAdmin,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', passwordHash: hash, salt } });
  }

  async function upsertMembership(
    userId: string,
    tId: string,
    cId: string,
    status: 'active' | 'inactive' = 'active',
  ) {
    await getDb()
      .insert(memberships)
      .values({
        id: `mem_${userId}_${cId}`.slice(0, 64),
        userId,
        tenantId: tId,
        companyId: cId,
        role: 'user',
        status,
      })
      .onDuplicateKeyUpdate({ set: { status } });
  }

  async function upsertAssignment(
    userId: string,
    roleId: string,
    tId: string,
    cId: string,
    status: 'active' | 'revoked' = 'active',
  ) {
    await getDb()
      .insert(roleAssignments)
      .values({
        id: `ra_${userId}_${cId}_${roleId}`.slice(0, 64),
        userId,
        roleId,
        tenantId: tId,
        companyId: cId,
        status,
      })
      .onDuplicateKeyUpdate({ set: { status } });
  }

  beforeAll(async () => {
    const db = getDb();

    // 1. Provision Tenants & Companies
    await db
      .insert(tenants)
      .values([
        { id: tenantA, name: 'Foundation Tenant A', status: 'active' },
        { id: tenantB, name: 'Foundation Tenant B', status: 'active' },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(companies)
      .values([
        {
          id: companyA,
          tenantId: tenantA,
          name: 'Foundation Company A',
          code: 'FNDA',
          status: 'active',
        },
        {
          id: companyB,
          tenantId: tenantB,
          name: 'Foundation Company B',
          code: 'FNDB',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Clear entitlements so HRMS defaults to enabled for active tenants
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [tenantA, tenantB]));

    // 3. Upsert Users
    for (const uid of [userCompanyAdmin, userHR, userEmployee, userCustom, userMulti]) {
      await upsertUser(uid, false);
    }
    await upsertUser(userSuperAdmin, true);

    // 4. Upsert Memberships
    await upsertMembership(userCompanyAdmin, tenantA, companyA);
    await upsertMembership(userHR, tenantA, companyA);
    await upsertMembership(userEmployee, tenantA, companyA);
    await upsertMembership(userCustom, tenantA, companyA);

    // Multi-company user: Member of Company A and Company B
    await upsertMembership(userMulti, tenantA, companyA);
    await upsertMembership(userMulti, tenantB, companyB);

    // 5. Upsert Role Assignments
    await upsertAssignment(userCompanyAdmin, 'role_sys_company_admin', tenantA, companyA);
    await upsertAssignment(userHR, 'role_sys_hr_manager', tenantA, companyA);
    await upsertAssignment(userEmployee, 'role_sys_employee', tenantA, companyA);

    // Multi-company user: HR in Company A, Employee in Company B
    await upsertAssignment(userMulti, 'role_sys_hr_manager', tenantA, companyA);
    await upsertAssignment(userMulti, 'role_sys_employee', tenantB, companyB);

    // 6. Create a Custom Role with exactly 'company.roles.view' (read-only roles viewer)
    customRoleId = `role_fnd_auditor_${Date.now()}`.slice(0, 64);
    await db.insert(roles).values({
      id: customRoleId,
      tenantId: tenantA,
      companyId: companyA,
      code: `custom_auditor_${Date.now()}`.slice(0, 50),
      name: 'Custom Auditor',
      isSystem: false,
      status: 'active',
      createdBy: userCompanyAdmin,
    });
    await db.insert(rolePermissions).values([
      {
        id: `rp_${customRoleId}_prof_view`.slice(0, 64),
        roleId: customRoleId,
        permissionId: 'company.profile.view',
        tenantId: tenantA,
        companyId: companyA,
      },
      {
        id: `rp_${customRoleId}_roles_view`.slice(0, 64),
        roleId: customRoleId,
        permissionId: 'company.roles.view',
        tenantId: tenantA,
        companyId: companyA,
      },
    ]);
    await upsertAssignment(userCustom, customRoleId, tenantA, companyA);

    // 7. Obtain tokens for all test users
    tokenSuperAdmin = (await signInForTest(emailOf(userSuperAdmin))).token;
    tokenCompanyAdmin = (await signInForTest(emailOf(userCompanyAdmin))).token;
    tokenHR = (await signInForTest(emailOf(userHR))).token;
    tokenEmployee = (await signInForTest(emailOf(userEmployee))).token;
    tokenCustom = (await signInForTest(emailOf(userCustom))).token;
    tokenMulti = (await signInForTest(emailOf(userMulti))).token;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(rolePermissions).where(eq(rolePermissions.tenantId, tenantA));
    await db.delete(roleAssignments).where(inArray(roleAssignments.tenantId, [tenantA, tenantB]));
    await db.delete(roles).where(eq(roles.tenantId, tenantA));
    await db.delete(memberships).where(inArray(memberships.tenantId, [tenantA, tenantB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [tenantA, tenantB]));
    await db.delete(companies).where(inArray(companies.id, [companyA, companyB]));
    await db.delete(tenants).where(inArray(tenants.id, [tenantA, tenantB]));
    await db
      .delete(users)
      .where(
        inArray(users.id, [
          userSuperAdmin,
          userCompanyAdmin,
          userHR,
          userEmployee,
          userCustom,
          userMulti,
        ]),
      );
  });

  // ── GATE 1: Company Admin → allowed company administration ────────
  it('Gate 1: Company Admin → allowed company administration', async () => {
    const res = await request(app)
      .get('/api/v1/company-admin/roles')
      .set(authHeader(tokenCompanyAdmin))
      .set('X-Company-Id', companyA);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── GATE 2: HR → allowed assigned permission ───────────────────────
  it('Gate 2: HR → allowed assigned permission', async () => {
    const res = await request(app)
      .get('/api/v1/hrms/employees')
      .set(authHeader(tokenHR))
      .set('X-Company-Id', companyA);

    expect(res.status).toBe(200);
  });

  // ── GATE 3: HR → denied unassigned permission ──────────────────────
  it('Gate 3: HR → denied unassigned permission (cannot manage roles)', async () => {
    const res = await request(app)
      .post('/api/v1/company-admin/roles')
      .set(authHeader(tokenHR))
      .set('X-Company-Id', companyA)
      .send({ name: 'Unauthorized Role', permissions: ['company.profile.view'] });

    expect(res.status).toBe(403);
  });

  // ── GATE 4: Employee → denied HR administration ────────────────────
  it('Gate 4: Employee → denied HR administration', async () => {
    const res = await request(app)
      .get('/api/v1/company-admin/roles')
      .set(authHeader(tokenEmployee))
      .set('X-Company-Id', companyA);

    expect(res.status).toBe(403);
  });

  // ── GATE 5: Custom Role → exactly assigned permissions ─────────────
  it('Gate 5: Custom Role → exactly assigned permissions', async () => {
    // Custom role has 'company.roles.view': allowed to view roles
    const allowed = await request(app)
      .get('/api/v1/company-admin/roles')
      .set(authHeader(tokenCustom))
      .set('X-Company-Id', companyA);
    expect(allowed.status).toBe(200);

    // Custom role does NOT have 'company.roles.manage': cannot create roles
    const denied = await request(app)
      .post('/api/v1/company-admin/roles')
      .set(authHeader(tokenCustom))
      .set('X-Company-Id', companyA)
      .send({ name: 'Sneaky Role', permissions: ['company.profile.view'] });
    expect(denied.status).toBe(403);
  });

  // ── GATE 6: Company A user → Company B resource DENIED ─────────────
  it('Gate 6: Company A user → Company B resource DENIED', async () => {
    const res = await request(app)
      .get('/api/v1/company-admin/roles')
      .set(authHeader(tokenHR)) // HR belongs to Company A only
      .set('X-Company-Id', companyB);

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toMatch(/FORBIDDEN_COMPANY/);
  });

  // ── GATE 7: Application disabled + permission present → DENIED ─────
  it('Gate 7: Application disabled + permission present → DENIED', async () => {
    const db = getDb();
    // Temporarily disable HRMS for Company A
    const disableId = `mod_fnd_a_hrms_${Date.now()}`.slice(0, 64);
    await db.insert(tenantModules).values({
      id: disableId,
      tenantId: tenantA,
      companyId: companyA,
      moduleCode: 'hrms',
      status: 'disabled',
    });

    try {
      const res = await request(app)
        .get('/api/v1/hrms/employees')
        .set(authHeader(tokenHR))
        .set('X-Company-Id', companyA);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('MODULE_DISABLED');
    } finally {
      // Re-enable HRMS by removing the disable record
      await db.delete(tenantModules).where(eq(tenantModules.id, disableId));
    }
  });

  // ── GATE 8: Application enabled + permission missing → DENIED ──────
  it('Gate 8: Application enabled + permission missing → DENIED', async () => {
    // HRMS is enabled in Company A, but userEmployee lacks 'hrms.employees.view'
    const res = await request(app)
      .get('/api/v1/hrms/employees')
      .set(authHeader(tokenEmployee))
      .set('X-Company-Id', companyA);

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('FORBIDDEN_WORKSPACE');
  });

  // ── GATE 9: Role revoked → next request DENIED ─────────────────────
  it('Gate 9: Role revoked → next request DENIED', async () => {
    const db = getDb();
    // Verify currently allowed
    const before = await request(app)
      .get('/api/v1/hrms/employees')
      .set(authHeader(tokenHR))
      .set('X-Company-Id', companyA);
    expect(before.status).toBe(200);

    // Revoke the role assignment
    await db
      .update(roleAssignments)
      .set({ status: 'revoked' })
      .where(and(eq(roleAssignments.userId, userHR), eq(roleAssignments.companyId, companyA)));

    try {
      // Immediate next request MUST be denied server-side
      const after = await request(app)
        .get('/api/v1/hrms/employees')
        .set(authHeader(tokenHR))
        .set('X-Company-Id', companyA);
      expect(after.status).toBe(403);
    } finally {
      // Restore role
      await db
        .update(roleAssignments)
        .set({ status: 'active' })
        .where(and(eq(roleAssignments.userId, userHR), eq(roleAssignments.companyId, companyA)));
    }
  });

  // ── GATE 10: Permission revoked → next request DENIED ──────────────
  it('Gate 10: Permission revoked → next request DENIED', async () => {
    const db = getDb();
    // UserCustom initially can view roles
    const before = await request(app)
      .get('/api/v1/company-admin/roles')
      .set(authHeader(tokenCustom))
      .set('X-Company-Id', companyA);
    expect(before.status).toBe(200);

    // Delete permission from custom role
    await db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, customRoleId),
          eq(rolePermissions.permissionId, 'company.roles.view'),
        ),
      );

    try {
      // Immediate next request MUST be denied
      const after = await request(app)
        .get('/api/v1/company-admin/roles')
        .set(authHeader(tokenCustom))
        .set('X-Company-Id', companyA);
      expect(after.status).toBe(403);
    } finally {
      // Restore permission
      await db.insert(rolePermissions).values({
        id: `rp_${customRoleId}_roles_view`.slice(0, 64),
        roleId: customRoleId,
        permissionId: 'company.roles.view',
        tenantId: tenantA,
        companyId: companyA,
      });
    }
  });

  // ── GATE 11: Inactive membership → DENIED ──────────────────────────
  it('Gate 11: Inactive membership → DENIED', async () => {
    const db = getDb();
    // Suspend membership
    await db
      .update(memberships)
      .set({ status: 'inactive' })
      .where(and(eq(memberships.userId, userHR), eq(memberships.companyId, companyA)));

    try {
      const res = await request(app)
        .get('/api/v1/hrms/employees')
        .set(authHeader(tokenHR))
        .set('X-Company-Id', companyA);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN_COMPANY_ACCESS');
    } finally {
      // Restore membership
      await db
        .update(memberships)
        .set({ status: 'active' })
        .where(and(eq(memberships.userId, userHR), eq(memberships.companyId, companyA)));
    }
  });

  // ── GATE 12: Unauthenticated → DENIED ──────────────────────────────
  it('Gate 12: Unauthenticated → DENIED', async () => {
    const noToken = await request(app)
      .get('/api/v1/company-admin/roles')
      .set('X-Company-Id', companyA);
    expect(noToken.status).toBe(401);

    const badToken = await request(app)
      .get('/api/v1/company-admin/roles')
      .set({ Authorization: 'Bearer invalid_garbage_token' })
      .set('X-Company-Id', companyA);
    expect(badToken.status).toBe(401);
  });

  // ── GATE 13: Super Admin → platform operation allowed ──────────────
  it('Gate 13: Super Admin → platform operation allowed', async () => {
    const res = await request(app).get('/api/v1/platform/tenants').set(authHeader(tokenSuperAdmin));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── GATE 14: Company Admin → platform operation denied ─────────────
  it('Gate 14: Company Admin → platform operation denied', async () => {
    const res = await request(app)
      .get('/api/v1/platform/tenants')
      .set(authHeader(tokenCompanyAdmin));

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('FORBIDDEN');
  });

  // ── MULTI-COMPANY ISOLATION ────────────────────────────────────────
  it('Multi-company user isolation: Company A permissions never leak into Company B', async () => {
    // In Company A: userMulti is HR -> can access HRMS employees
    const inCompanyA = await request(app)
      .get('/api/v1/hrms/employees')
      .set(authHeader(tokenMulti))
      .set('X-Company-Id', companyA);
    expect(inCompanyA.status).toBe(200);

    // In Company B: userMulti is Employee -> denied HRMS employees
    const inCompanyB = await request(app)
      .get('/api/v1/hrms/employees')
      .set(authHeader(tokenMulti))
      .set('X-Company-Id', companyB);
    expect(inCompanyB.status).toBe(403);
  });

  // ── PERMISSION REGISTRY & CATALOG INCREMENTAL EXPANSION ─────────────
  describe('Centralized Permission Registry (Sections 3, 4, 12)', () => {
    it('supports canonical <application>.<module>.<action> and resolves legacy aliases', () => {
      const canonical = findPermission('hrms.employees.view');
      expect(canonical).toBeDefined();
      expect(canonical?.application).toBe('hrms');
      expect(canonical?.module).toBe('employees');
      expect(canonical?.action).toBe('view');

      const byAlias = findPermission('hrms.employees.read');
      expect(byAlias).toBeDefined();
      expect(byAlias?.id).toBe('hrms.employees.view');

      expect(normalizePermissionKey('hrms.employees.read')).toBe('hrms.employees.view');
    });

    it('generates hierarchical permission tree for dynamic UI matrix', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/permissions/tree')
        .set(authHeader(tokenCompanyAdmin))
        .set('X-Company-Id', companyA);

      expect(res.status).toBe(200);
      const tree = res.body.data;
      expect(Array.isArray(tree)).toBe(true);

      const hrmsApp = tree.find((t: { application: string }) => t.application === 'hrms');
      expect(hrmsApp).toBeDefined();
      expect(hrmsApp.moduleCode).toBe('hrms');

      const empMod = hrmsApp.modules.find((m: { module: string }) => m.module === 'employees');
      expect(empMod).toBeDefined();
      expect(empMod.permissions.some((p: { id: string }) => p.id === 'hrms.employees.view')).toBe(
        true,
      );
    });

    it('allows completed modules to register permissions incrementally without engine changes', () => {
      // Simulate completed module registering new actions
      const testPerm = {
        id: 'hrms.custom_test.evaluate',
        application: 'hrms',
        module: 'custom_test',
        action: 'evaluate',
        group: 'hrms' as const,
        scope: 'company' as const,
        label: 'Evaluate custom test',
        description: 'Permission registered on module completion',
        moduleCode: 'hrms' as const,
        isSystem: true,
        isActive: true,
      };

      registerPermission(testPerm);

      const found = findPermission('hrms.custom_test.evaluate');
      expect(found).toBeDefined();
      expect(found?.label).toBe('Evaluate custom test');

      // Append default mapping to HR manager
      registerRolePermissions('hr_manager', ['hrms.custom_test.evaluate']);
      const hrRole = findSystemRole('role_sys_hr_manager');
      expect(hrRole?.permissions).toContain('hrms.custom_test.evaluate');
    });
  });
});
