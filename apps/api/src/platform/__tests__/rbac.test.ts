import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  auditLogs,
  companies,
  employees,
  memberships,
  roleAssignments,
  rolePermissions,
  roles,
  sessions,
  tenantModules,
  tenants,
  users,
} from '../../db/schema.js';
import { hashPassword, generateSessionToken } from '../auth/security.js';
import { authService } from '../auth/service/auth.service.js';

/**
 * Phase 4 acceptance: one identity, many roles, many companies (ADR-017).
 *
 * User A — Company A (tenant 1): Company Admin + HR + Employee (linked record)
 *        — Company B (tenant 2): Manager
 */
describe.skipIf(!isDatabaseConfigured)('Enterprise RBAC & multi-company access (Phase 4)', () => {
  const app = createApp();

  const tenant1 = 'tent_rbac_t1';
  const tenant2 = 'tent_rbac_t2';
  const companyA = 'comp_rbac_a';
  const companyB = 'comp_rbac_b';
  const companyC = 'comp_rbac_c'; // no membership for anyone below

  const userA = 'usr_rbac_a';
  const admin2 = 'usr_rbac_admin2';
  const limited = 'usr_rbac_limited';
  const other = 'usr_rbac_other';
  const superAdmin = 'usr_rbac_sa';

  const PASSWORD = 'RbacTest2026!';
  const emailOf = (id: string) => `${id}@rbac.example`;

  let tokenA: string;
  let tokenAdmin2: string;
  let tokenLimited: string;
  let tokenSuperAdmin: string;
  let limitedRoleId: string;
  let auditorRoleId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const context = (token: string, companyId: string) =>
    request(app)
      .get('/api/v1/platform/access/context')
      .set(auth(token))
      .set('X-Company-Id', companyId);

  async function upsertUser(id: string, isSuperAdmin = false) {
    const { hash, salt } = hashPassword(PASSWORD);
    await getDb()
      .insert(users)
      .values({
        id,
        email: emailOf(id),
        passwordHash: hash,
        salt,
        firstName: 'Rbac',
        lastName: id,
        status: 'active',
        isSuperAdmin,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', passwordHash: hash, salt } });
  }

  async function upsertMembership(userId: string, tenantId: string, companyId: string) {
    await getDb()
      .insert(memberships)
      .values({
        id: `mem_${userId}_${companyId}`,
        userId,
        tenantId,
        companyId,
        role: 'user',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
  }

  async function upsertAssignment(
    userId: string,
    roleId: string,
    tenantId: string,
    companyId: string,
  ) {
    await getDb()
      .insert(roleAssignments)
      .values({
        id: `ra_${userId}_${companyId}_${roleId}`.slice(0, 64),
        userId,
        roleId,
        tenantId,
        companyId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', revokedAt: null, revokedBy: null } });
  }

  async function clearEntitlements() {
    await getDb()
      .delete(tenantModules)
      .where(inArray(tenantModules.tenantId, [tenant1, tenant2]));
  }

  beforeAll(async () => {
    const db = getDb();

    await db
      .insert(tenants)
      .values([
        { id: tenant1, name: 'RBAC Tenant One', status: 'active' },
        { id: tenant2, name: 'RBAC Tenant Two', status: 'active' },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
    await db
      .insert(companies)
      .values([
        {
          id: companyA,
          tenantId: tenant1,
          name: 'RBAC Company A',
          code: 'RBACA',
          status: 'active',
        },
        {
          id: companyB,
          tenantId: tenant2,
          name: 'RBAC Company B',
          code: 'RBACB',
          status: 'active',
        },
        {
          id: companyC,
          tenantId: tenant1,
          name: 'RBAC Company C',
          code: 'RBACC',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
    await clearEntitlements();

    // Custom roles from earlier runs
    const staleRoles = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.companyId, companyA));
    const staleIds = staleRoles.map((r) => r.id);
    if (staleIds.length > 0) {
      await db.delete(roleAssignments).where(inArray(roleAssignments.roleId, staleIds));
      await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, staleIds));
      await db.delete(roles).where(inArray(roles.id, staleIds));
    }

    for (const id of [userA, admin2, limited, other]) await upsertUser(id);
    await upsertUser(superAdmin, true);

    await upsertMembership(userA, tenant1, companyA);
    await upsertMembership(userA, tenant2, companyB);
    await upsertMembership(admin2, tenant1, companyA);
    await upsertMembership(limited, tenant1, companyA);
    await upsertMembership(other, tenant1, companyA);

    await upsertAssignment(userA, 'role_sys_company_admin', tenant1, companyA);
    await upsertAssignment(userA, 'role_sys_hr_manager', tenant1, companyA);
    await upsertAssignment(userA, 'role_sys_employee', tenant1, companyA);
    await upsertAssignment(userA, 'role_sys_manager', tenant2, companyB);
    await upsertAssignment(admin2, 'role_sys_company_admin', tenant1, companyA);
    await upsertAssignment(other, 'role_sys_employee', tenant1, companyA);

    // Employee records: User A's own, Other's own, and one linked to Other
    // that carries the limited user's email (must never be claimable by email).
    const employeeRows = [
      { id: 'emp_rbac_a', userId: userA, email: emailOf(userA), number: 'RBAC-001' },
      { id: 'emp_rbac_other', userId: other, email: emailOf(other), number: 'RBAC-002' },
      { id: 'emp_rbac_claim', userId: other, email: emailOf(limited), number: 'RBAC-003' },
    ];
    for (const e of employeeRows) {
      await db
        .insert(employees)
        .values({
          id: e.id,
          tenantId: tenant1,
          companyId: companyA,
          userId: e.userId,
          employeeNumber: e.number,
          firstName: 'Rbac',
          email: e.email,
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
        })
        .onDuplicateKeyUpdate({ set: { userId: e.userId, employmentStatus: 'active' } });
    }

    // Limited administrator: may view the company and assign roles, nothing more.
    limitedRoleId = 'role_rbac_limited';
    await db.insert(roles).values({
      id: limitedRoleId,
      tenantId: tenant1,
      companyId: companyA,
      code: 'custom_rbac_limited',
      name: 'Access Coordinator',
      isSystem: false,
      status: 'active',
    });
    await db.insert(rolePermissions).values(
      [
        'company.profile.read',
        'company.roles.read',
        'company.roles.assign',
        'company.users.invite',
      ].map((permissionId, i) => ({
        id: `rp_rbac_limited_${i}`,
        tenantId: tenant1,
        companyId: companyA,
        roleId: limitedRoleId,
        permissionId,
      })),
    );
    await upsertAssignment(limited, limitedRoleId, tenant1, companyA);

    tokenA = (await authService.login(emailOf(userA), PASSWORD)).token;
    tokenAdmin2 = (await authService.login(emailOf(admin2), PASSWORD)).token;
    tokenLimited = (await authService.login(emailOf(limited), PASSWORD)).token;
    tokenSuperAdmin = (await authService.login(emailOf(superAdmin), PASSWORD)).token;
  });

  afterAll(async () => {
    await clearEntitlements();
  });

  describe('Identity: one login, many roles, many companies', () => {
    it('lands a multi-workspace user on an authorized workspace at login', async () => {
      const result = await authService.login(emailOf(userA), PASSWORD);
      expect(result.defaultDestination).toBe('/company-admin');
    });

    it('lists both companies with independently resolved workspaces', async () => {
      const res = await request(app).get('/api/v1/platform/access').set(auth(tokenA));
      expect(res.status).toBe(200);
      const byId = new Map(
        res.body.data.companies.map((c: { companyId: string }) => [c.companyId, c]),
      );
      expect([...byId.keys()].sort()).toEqual([companyA, companyB]);

      const a = byId.get(companyA) as { workspaces: string[]; roles: { code: string }[] };
      expect(a.workspaces).toEqual(['company_admin', 'hrms', 'ess']);
      expect(a.roles.map((r) => r.code).sort()).toEqual([
        'company_admin',
        'employee',
        'hr_manager',
      ]);

      const b = byId.get(companyB) as { workspaces: string[]; roles: { code: string }[] };
      expect(b.workspaces).toEqual(['hrms']);
      expect(b.roles.map((r) => r.code)).toEqual(['manager']);
      expect(res.body.data.platformWorkspaces).toEqual([]);
    });

    it('never combines permissions across companies', async () => {
      const a = await context(tokenA, companyA);
      const b = await context(tokenA, companyB);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);

      expect(a.body.data.permissions).toContain('company.users.manage');
      expect(a.body.data.permissions).toContain('hrms.employees.update');
      expect(a.body.data.permissions).toContain('ess.leave.apply');

      expect(b.body.data.permissions).toContain('hrms.leave.approve');
      expect(b.body.data.permissions).not.toContain('company.users.manage');
      expect(b.body.data.permissions).not.toContain('hrms.employees.update');
      expect(b.body.data.permissions).not.toContain('ess.leave.apply');
      expect(b.body.data.essEligible).toBe(false);
    });
  });

  describe('Company isolation and direct API access', () => {
    it('rejects a company the user has no membership in', async () => {
      const res = await context(tokenA, companyC);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_COMPANY_ACCESS');
    });

    it('requires a company context', async () => {
      const res = await request(app).get('/api/v1/platform/access/context').set(auth(tokenA));
      expect(res.status).toBe(400);
    });

    it('does not let Company A admin rights reach Company B', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/users')
        .set(auth(tokenA))
        .set('X-Company-Id', companyB);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_COMPANY_ADMIN');
    });

    it('rejects an endpoint whose permission the caller lacks (403)', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set(auth(tokenLimited))
        .set('X-Company-Id', companyA)
        .send({ country: 'Nowhere' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_PERMISSION');
    });

    it('rejects unauthenticated access to the access APIs (401)', async () => {
      const res = await request(app).get('/api/v1/platform/access');
      expect(res.status).toBe(401);
    });
  });

  describe('Role management and anti-escalation', () => {
    it('lists system and custom roles with their permissions', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/roles')
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA);
      expect(res.status).toBe(200);
      const codes = res.body.data.map((r: { code: string }) => r.code);
      expect(codes).toEqual(
        expect.arrayContaining([
          'company_admin',
          'hr_manager',
          'manager',
          'employee',
          'custom_rbac_limited',
        ]),
      );
    });

    it('never offers platform permissions to company administrators', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/permissions')
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA);
      expect(res.status).toBe(200);
      const ids: string[] = res.body.data.map((p: { id: string }) => p.id);
      expect(ids.some((id) => id.startsWith('platform.'))).toBe(false);
      expect(ids.some((id) => id.startsWith('ess.'))).toBe(false);
    });

    it('rejects custom roles containing platform or self-service permissions', async () => {
      for (const permission of ['platform.tenants.create', 'ess.profile.read']) {
        const res = await request(app)
          .post('/api/v1/company-admin/roles')
          .set(auth(tokenAdmin2))
          .set('X-Company-Id', companyA)
          .send({ name: `Bad ${permission}`, permissions: [permission] });
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('PERMISSION_NOT_ASSIGNABLE');
      }
    });

    it('offers no way to assign Super Admin', async () => {
      const byRole = await request(app)
        .post(`/api/v1/company-admin/users/${other}/roles`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ roleId: 'super_admin' });
      expect(byRole.status).toBe(404);

      const legacy = await request(app)
        .patch(`/api/v1/company-admin/users/${other}/role`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ role: 'super_admin' });
      expect(legacy.status).toBe(400);
    });

    it('forbids assigning roles to yourself', async () => {
      const res = await request(app)
        .post(`/api/v1/company-admin/users/${admin2}/roles`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ roleId: 'role_sys_hr_manager' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SELF_ASSIGNMENT_FORBIDDEN');
    });

    it('forbids granting administration permissions the actor does not hold', async () => {
      const assign = await request(app)
        .post(`/api/v1/company-admin/users/${other}/roles`)
        .set(auth(tokenLimited))
        .set('X-Company-Id', companyA)
        .send({ roleId: 'role_sys_company_admin' });
      expect(assign.status).toBe(403);
      expect(assign.body.error.code).toBe('ROLE_ESCALATION');

      const invite = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set(auth(tokenLimited))
        .set('X-Company-Id', companyA)
        .send({
          email: 'escalate@rbac.example',
          firstName: 'Esc',
          lastName: 'Alate',
          role: 'company_admin',
        });
      expect(invite.status).toBe(403);
      expect(invite.body.error.code).toBe('ROLE_ESCALATION');
    });

    it('creates, edits, protects and deactivates a custom role', async () => {
      const created = await request(app)
        .post('/api/v1/company-admin/roles')
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ name: 'Access Auditor', permissions: ['company.audit.read'] });
      expect(created.status).toBe(201);
      auditorRoleId = created.body.data.id;
      expect(created.body.data.isSystem).toBe(false);

      const edited = await request(app)
        .patch(`/api/v1/company-admin/roles/${auditorRoleId}`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ permissions: ['company.audit.read', 'company.users.read'] });
      expect(edited.status).toBe(200);
      expect(edited.body.data.permissions).toEqual(['company.audit.read', 'company.users.read']);

      const system = await request(app)
        .patch('/api/v1/company-admin/roles/role_sys_hr_manager')
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ name: 'Renamed' });
      expect(system.status).toBe(403);
      expect(system.body.error.code).toBe('SYSTEM_ROLE_PROTECTED');

      const assigned = await request(app)
        .post(`/api/v1/company-admin/users/${other}/roles`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ roleId: auditorRoleId });
      expect(assigned.status).toBe(201);
      expect(assigned.body.data.effectivePermissions).toContain('company.audit.read');

      const inUse = await request(app)
        .patch(`/api/v1/company-admin/roles/${auditorRoleId}/status`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ status: 'inactive' });
      expect(inUse.status).toBe(409);
      expect(inUse.body.error.code).toBe('ROLE_IN_USE');

      const revoked = await request(app)
        .delete(`/api/v1/company-admin/users/${other}/roles/${auditorRoleId}`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA);
      expect(revoked.status).toBe(200);

      const deactivated = await request(app)
        .patch(`/api/v1/company-admin/roles/${auditorRoleId}/status`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ status: 'inactive' });
      expect(deactivated.status).toBe(200);
      expect(deactivated.body.data.status).toBe('inactive');
    });

    it('records role and permission changes without secrets', async () => {
      const rows = await getDb()
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.companyId, companyA),
            inArray(auditLogs.action, [
              'custom_role_created',
              'role_permissions_changed',
              'role_assigned',
              'role_revoked',
              'custom_role_deactivated',
            ]),
          ),
        );
      const actions = new Set(rows.map((r) => r.action));
      for (const action of [
        'custom_role_created',
        'role_permissions_changed',
        'role_assigned',
        'role_revoked',
        'custom_role_deactivated',
      ]) {
        expect(actions.has(action)).toBe(true);
      }
      const serialized = JSON.stringify(rows.map((r) => r.metadata));
      expect(serialized).not.toContain(tokenAdmin2);
      expect(serialized.toLowerCase()).not.toContain('password');
    });
  });

  describe('Revocation takes effect on the next request (same session)', () => {
    it('removing the HR role removes HRMS access in that company only', async () => {
      const res = await request(app)
        .delete(`/api/v1/company-admin/users/${userA}/roles/role_sys_hr_manager`)
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA);
      expect(res.status).toBe(200);

      const a = await context(tokenA, companyA);
      expect(a.body.data.workspaces).toEqual(['company_admin', 'ess']);
      expect(a.body.data.permissions.some((p: string) => p.startsWith('hrms.'))).toBe(false);

      const b = await context(tokenA, companyB);
      expect(b.body.data.permissions).toContain('hrms.leave.approve');
    });

    it('revoking the Company B membership removes Company B from the switcher', async () => {
      // Super Admin keeps company-administration oversight of any company.
      const res = await request(app)
        .patch(`/api/v1/company-admin/users/${userA}/status`)
        .set(auth(tokenSuperAdmin))
        .set('X-Company-Id', companyB)
        .send({ status: 'revoked' });
      expect(res.status).toBe(200);

      // The session re-loads memberships on every request: no re-login needed.
      const overview = await request(app).get('/api/v1/platform/access').set(auth(tokenA));
      const ids = overview.body.data.companies.map((c: { companyId: string }) => c.companyId);
      expect(ids).toEqual([companyA]);

      const b = await context(tokenA, companyB);
      expect(b.status).toBe(403);
    });
  });

  describe('Module entitlements', () => {
    it('disabling HRMS removes HRMS and ESS access, including direct ESS calls', async () => {
      await getDb().insert(tenantModules).values({
        id: 'mod_rbac_a_hrms',
        tenantId: tenant1,
        companyId: companyA,
        moduleCode: 'hrms',
        status: 'disabled',
      });

      const a = await context(tokenA, companyA);
      expect(a.body.data.enabledModules).not.toContain('hrms');
      expect(a.body.data.workspaces).toEqual(['company_admin']);
      expect(a.body.data.essEligible).toBe(false);

      const ess = await request(app)
        .get('/api/v1/ess/dashboard')
        .set(auth(tokenA))
        .set('X-Company-Id', companyA);
      expect(ess.status).toBe(403);
      expect(ess.body.error.code).toBe('MODULE_DISABLED');

      await clearEntitlements();
    });

    it('a company record cannot widen a tenant-level (platform) disable', async () => {
      await getDb()
        .insert(tenantModules)
        .values([
          {
            id: 'mod_rbac_t1_hrms',
            tenantId: tenant1,
            companyId: null,
            moduleCode: 'hrms',
            status: 'disabled',
          },
          {
            id: 'mod_rbac_a_hrms2',
            tenantId: tenant1,
            companyId: companyA,
            moduleCode: 'hrms',
            status: 'enabled',
          },
        ]);

      const a = await context(tokenA, companyA);
      expect(a.body.data.enabledModules).not.toContain('hrms');

      const override = await request(app)
        .patch('/api/v1/company-admin/modules/hrms')
        .set(auth(tokenAdmin2))
        .set('X-Company-Id', companyA)
        .send({ enabled: true });
      expect(override.status).toBe(403);
      expect(override.body.error.code).toBe('MODULE_NOT_ENTITLED');

      await clearEntitlements();
    });
  });

  describe('Employee Self-Service ownership', () => {
    it('serves only the linked employee record', async () => {
      const res = await request(app)
        .get('/api/v1/ess/dashboard')
        .set(auth(tokenA))
        .set('X-Company-Id', companyA);
      expect(res.status).toBe(200);
      expect(res.body.data.employee.employeeNumber).toBe('RBAC-001');
    });

    it('never lets a user claim an employee record linked to someone else by email', async () => {
      const res = await request(app)
        .get('/api/v1/ess/dashboard')
        .set(auth(tokenLimited))
        .set('X-Company-Id', companyA);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ESS_NOT_ELIGIBLE');

      const [claim] = await getDb()
        .select({ userId: employees.userId })
        .from(employees)
        .where(eq(employees.id, 'emp_rbac_claim'));
      expect(claim?.userId).toBe(other);
    });

    it('rejects ESS for a company the user is not a member of', async () => {
      const res = await request(app)
        .get('/api/v1/ess/dashboard')
        .set(auth(tokenA))
        .set('X-Company-Id', companyC);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_COMPANY_ACCESS');
    });
  });

  describe('Platform Super Admin stays separate', () => {
    it('exposes the Super Admin workspace without HRMS or ESS access', async () => {
      const overview = await request(app).get('/api/v1/platform/access').set(auth(tokenSuperAdmin));
      expect(overview.status).toBe(200);
      expect(overview.body.data.platformWorkspaces).toEqual(['super_admin']);
      expect(overview.body.data.companies).toEqual([]);

      const a = await context(tokenSuperAdmin, companyA);
      expect(a.status).toBe(200);
      expect(a.body.data.isPlatformOversight).toBe(true);
      expect(a.body.data.workspaces).toEqual(['company_admin']);
      expect(a.body.data.permissions.some((p: string) => !p.startsWith('company.'))).toBe(false);
    });

    it('keeps platform routes closed to company administrators', async () => {
      const res = await request(app).get('/api/v1/platform/tenants').set(auth(tokenAdmin2));
      expect(res.status).toBe(403);
    });
  });

  describe('Sessions and account status', () => {
    it('rejects an expired session', async () => {
      const token = generateSessionToken();
      await getDb()
        .insert(sessions)
        .values({
          id: `sess_rbac_${Date.now()}`,
          token,
          userId: userA,
          expiresAt: new Date(Date.now() - 60_000),
        });
      const res = await request(app).get('/api/v1/platform/access').set(auth(token));
      expect(res.status).toBe(401);
    });

    it('rejects a suspended account on its existing session', async () => {
      const { token } = await authService.login(emailOf(other), PASSWORD);
      await getDb().update(users).set({ status: 'suspended' }).where(eq(users.id, other));
      try {
        const res = await request(app).get('/api/v1/platform/access').set(auth(token));
        expect(res.status).toBe(403);
        await expect(authService.login(emailOf(other), PASSWORD)).rejects.toThrow();
      } finally {
        await getDb().update(users).set({ status: 'active' }).where(eq(users.id, other));
      }
    });

    it('rejects a session after logout', async () => {
      const { token } = await authService.login(emailOf(admin2), PASSWORD);
      const out = await request(app).post('/api/v1/platform/auth/logout').set(auth(token));
      expect(out.status).toBeLessThan(300);
      const res = await request(app).get('/api/v1/platform/access').set(auth(token));
      expect(res.status).toBe(401);
    });
  });
});
