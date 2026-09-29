import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../db/connection.js';
import {
  companies,
  memberships,
  roleAssignments,
  tenantModules,
  tenants,
  users,
} from '../../../db/schema.js';
import { hashPassword } from '../../../platform/auth/security.js';
import { signInForTest } from '../../../platform/__tests__/support/testSession.js';

/**
 * PR B: the HRMS administrative API enforces session authentication, a
 * server-verified company, the HRMS entitlement and per-operation permissions
 * (ADR-017). Client headers are claims, never authorization evidence.
 */
describe.skipIf(!isDatabaseConfigured)('HRMS API security (authenticated RBAC)', () => {
  const app = createApp();
  const tenantId = 'tent_hsec';
  const companyId = 'comp_hsec';
  const email = (name: string) => `hsec_${name}@hsec.example`;
  const ROLES: Record<string, string[]> = {
    hr: ['role_sys_hr_manager'],
    manager: ['role_sys_manager'],
    admin: ['role_sys_company_admin'],
    employee: ['role_sys_employee'],
  };
  const tokens: Record<string, string> = {};

  const call = (who: string, method: 'get' | 'post', path: string, company = companyId) =>
    request(app)
      [method](`/api/v1/hrms${path}`)
      .set('authorization', `Bearer ${tokens[who]}`)
      .set('x-company-id', company);

  beforeAll(async () => {
    const db = getDb();
    await db
      .insert(tenants)
      .values({ id: tenantId, name: 'HRMS Security Tenant', status: 'active' })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
    await db
      .insert(companies)
      .values({ id: companyId, tenantId, name: 'HRMS Security Co', code: 'HSEC', status: 'active' })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
    await db.delete(tenantModules).where(eq(tenantModules.tenantId, tenantId));

    const unused = hashPassword('not-used-by-otp');
    for (const [name, roleIds] of Object.entries(ROLES)) {
      const userId = `usr_hsec_${name}`;
      await db
        .insert(users)
        .values({
          id: userId,
          email: email(name),
          passwordHash: unused.hash,
          salt: unused.salt,
          firstName: 'Hsec',
          lastName: name,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });
      await db
        .insert(memberships)
        .values({ id: `mem_hsec_${name}`, userId, tenantId, companyId, role: 'user', status: 'active' })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });
      for (const roleId of roleIds) {
        await db
          .insert(roleAssignments)
          .values({ id: `ra_hsec_${name}_${roleId}`, userId, roleId, tenantId, companyId, status: 'active' })
          .onDuplicateKeyUpdate({ set: { status: 'active', revokedAt: null } });
      }
      tokens[name] = (await signInForTest(email(name))).token;
    }
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(tenantModules).where(eq(tenantModules.tenantId, tenantId));
    await db.update(companies).set({ status: 'active' }).where(eq(companies.id, companyId));
  });

  it('rejects requests without a session (401)', async () => {
    for (const path of ['/employees', '/onboarding/cases', '/organization/masters', '/settings/onboarding']) {
      const res = await request(app).get(`/api/v1/hrms${path}`).set('x-company-id', companyId);
      expect(res.status).toBe(401);
    }
  });

  it('ignores spoofed company headers for companies the caller does not belong to', async () => {
    const res = await call('hr', 'get', '/employees', 'comp_demo_01');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_COMPANY_ACCESS');
  });

  it('allows HR to administer employees and onboarding', async () => {
    expect((await call('hr', 'get', '/employees')).status).toBe(200);
    expect((await call('hr', 'get', '/onboarding/cases')).status).toBe(200);
    expect((await call('hr', 'get', '/employees/next-number')).status).toBe(200);
  });

  it('limits a Manager to read-only team operations', async () => {
    expect((await call('manager', 'get', '/employees')).status).toBe(200);
    const create = await call('manager', 'post', '/employees').send({});
    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe('FORBIDDEN_PERMISSION');
    const onboarding = await call('manager', 'get', '/onboarding/cases');
    expect(onboarding.status).toBe(403);
    const settings = await call('manager', 'get', '/settings/onboarding');
    expect(settings.status).toBe(403);
  });

  it('denies HRMS administration to Company Admin and Employee roles', async () => {
    for (const who of ['admin', 'employee']) {
      const res = await call(who, 'get', '/employees');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_WORKSPACE');
    }
  });

  it('removes access on the next request when the HR role is revoked', async () => {
    const db = getDb();
    await db
      .update(roleAssignments)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(eq(roleAssignments.id, 'ra_hsec_hr_role_sys_hr_manager'));
    try {
      const res = await call('hr', 'get', '/employees');
      expect(res.status).toBe(403);
    } finally {
      await db
        .update(roleAssignments)
        .set({ status: 'active', revokedAt: null })
        .where(eq(roleAssignments.id, 'ra_hsec_hr_role_sys_hr_manager'));
    }
  });

  it('rejects every HRMS call when the module is disabled for the company', async () => {
    await getDb().insert(tenantModules).values({
      id: 'mod_hsec_hrms_off',
      tenantId,
      companyId,
      moduleCode: 'hrms',
      status: 'disabled',
    });
    try {
      const res = await call('hr', 'get', '/employees');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MODULE_DISABLED');
    } finally {
      await getDb().delete(tenantModules).where(inArray(tenantModules.id, ['mod_hsec_hrms_off']));
    }
  });

  it('rejects HRMS calls for a suspended company', async () => {
    await getDb().update(companies).set({ status: 'suspended' }).where(eq(companies.id, companyId));
    try {
      const res = await call('hr', 'get', '/employees');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('COMPANY_SUSPENDED');
    } finally {
      await getDb().update(companies).set({ status: 'active' }).where(eq(companies.id, companyId));
    }
  });
});
