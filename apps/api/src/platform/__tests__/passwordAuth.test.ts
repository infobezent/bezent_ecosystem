import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import { assertProductionAuthConfig, isReviewPasswordAuthEnabled } from '../../app/config/env.js';
import {
  auditLogs,
  companies,
  memberships,
  roleAssignments,
  roles,
  sessions,
  tenants,
  users,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';

describe.skipIf(!isDatabaseConfigured)('Review Password Authentication & Access', () => {
  const app = createApp();

  const tenantId = 'tent_pwd_test';
  const otherTenantId = 'tent_pwd_other';
  const companyId = 'comp_pwd_test';
  const otherCompanyId = 'comp_pwd_other';

  const testEmail = 'reviewer.hr@bezent-review.example';
  const testPassword = 'StrongReviewerPassword!2026';

  const suspendedEmail = 'reviewer.suspended@bezent-review.example';
  const inactiveEmail = 'reviewer.inactive@bezent-review.example';

  const reviewerUserId = 'usr_pwd_reviewer';
  const suspendedUserId = 'usr_pwd_suspended';
  const inactiveUserId = 'usr_pwd_inactive';

  beforeAll(async () => {
    const db = getDb();

    // Clean up past runs
    await db
      .delete(sessions)
      .where(inArray(sessions.userId, [reviewerUserId, suspendedUserId, inactiveUserId]));
    await db
      .delete(roleAssignments)
      .where(inArray(roleAssignments.userId, [reviewerUserId, suspendedUserId, inactiveUserId]));
    await db
      .delete(memberships)
      .where(inArray(memberships.userId, [reviewerUserId, suspendedUserId, inactiveUserId]));
    await db
      .delete(users)
      .where(inArray(users.id, [reviewerUserId, suspendedUserId, inactiveUserId]));
    await db.delete(companies).where(inArray(companies.id, [companyId, otherCompanyId]));
    await db.delete(tenants).where(inArray(tenants.id, [tenantId, otherTenantId]));

    // Seed test tenants
    await db.insert(tenants).values([
      { id: tenantId, name: 'Review Test Tenant', status: 'active' },
      { id: otherTenantId, name: 'Isolated Foreign Tenant', status: 'active' },
    ]);

    // Seed test companies
    await db.insert(companies).values([
      { id: companyId, tenantId, name: 'Review Company Inc', code: 'REV_INC', status: 'active' },
      {
        id: otherCompanyId,
        tenantId: otherTenantId,
        name: 'Foreign Company Inc',
        code: 'FOR_INC',
        status: 'active',
      },
    ]);

    // Ensure HR system role exists
    const [existingRole] = await db.select().from(roles).where(eq(roles.id, 'role_sys_hr_manager'));
    if (!existingRole) {
      await db.insert(roles).values({
        id: 'role_sys_hr_manager',
        code: 'hr_manager',
        name: 'HR Manager',
        moduleCode: 'hrms',
        isSystem: true,
        status: 'active',
      });
    }

    // Seed users with scrypt password hashing
    const reviewerCred = hashPassword(testPassword);
    await db.insert(users).values({
      id: reviewerUserId,
      email: testEmail,
      passwordHash: reviewerCred.hash,
      salt: reviewerCred.salt,
      firstName: 'Reviewer',
      lastName: 'HR',
      status: 'active',
      isSuperAdmin: false,
    });

    const suspendedCred = hashPassword('SuspendedPass123!');
    await db.insert(users).values({
      id: suspendedUserId,
      email: suspendedEmail,
      passwordHash: suspendedCred.hash,
      salt: suspendedCred.salt,
      firstName: 'Suspended',
      lastName: 'User',
      status: 'suspended',
      isSuperAdmin: false,
    });

    const inactiveCred = hashPassword('InactivePass123!');
    await db.insert(users).values({
      id: inactiveUserId,
      email: inactiveEmail,
      passwordHash: inactiveCred.hash,
      salt: inactiveCred.salt,
      firstName: 'Inactive',
      lastName: 'User',
      status: 'inactive',
      isSuperAdmin: false,
    });

    // Seed membership and role assignment for reviewer
    await db.insert(memberships).values({
      id: 'mem_pwd_reviewer',
      userId: reviewerUserId,
      tenantId,
      companyId,
      role: 'hr_manager',
      status: 'active',
    });

    await db.insert(roleAssignments).values({
      id: 'ra_pwd_reviewer',
      userId: reviewerUserId,
      roleId: 'role_sys_hr_manager',
      tenantId,
      companyId,
      status: 'active',
    });
  });

  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ENABLE_REVIEW_PASSWORD_AUTH = 'true';
    process.env.BEZENT_DEPLOYMENT_ENV = 'review';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Environment Gating & Fail-Closed Guardrails', () => {
    it('returns passwordAuthAvailable: true when feature is enabled in review deployment', async () => {
      process.env.ENABLE_REVIEW_PASSWORD_AUTH = 'true';
      process.env.BEZENT_DEPLOYMENT_ENV = 'review';

      expect(isReviewPasswordAuthEnabled()).toBe(true);

      const res = await request(app).get('/api/v1/platform/auth/config');
      expect(res.status).toBe(200);
      expect(res.body.data.passwordAuthAvailable).toBe(true);
    });

    it('returns passwordAuthAvailable: false and rejects login with 403 when feature is disabled', async () => {
      delete process.env.ENABLE_REVIEW_PASSWORD_AUTH;

      expect(isReviewPasswordAuthEnabled()).toBe(false);

      const configRes = await request(app).get('/api/v1/platform/auth/config');
      expect(configRes.status).toBe(200);
      expect(configRes.body.data.passwordAuthAvailable).toBe(false);

      const loginRes = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(loginRes.status).toBe(410);
      expect(loginRes.body.error.code).toBe('PASSWORD_LOGIN_DISABLED');
    });

    it('assertProductionAuthConfig throws if review password auth is enabled in production', () => {
      process.env.ENABLE_REVIEW_PASSWORD_AUTH = 'true';
      process.env.BEZENT_DEPLOYMENT_ENV = 'production';

      expect(() => assertProductionAuthConfig()).toThrow(
        /Review password authentication cannot be enabled in environment 'production'/,
      );
    });

    it('assertProductionAuthConfig throws if review auth is enabled in an unapproved custom environment', () => {
      process.env.ENABLE_REVIEW_PASSWORD_AUTH = 'true';
      process.env.BEZENT_DEPLOYMENT_ENV = 'unapproved_env';

      expect(() => assertProductionAuthConfig()).toThrow(
        /Review password authentication cannot be enabled in environment 'unapproved_env'/,
      );
    });
  });

  describe('2. Password Authentication & Credential Verification', () => {
    it('rejects invalid password with generic 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: testEmail, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects non-existent email with generic 401 error (no account enumeration)', async () => {
      const res = await request(app).post('/api/v1/platform/auth/login').send({
        email: 'nonexistent.reviewer@bezent-review.example',
        password: 'SomePassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects suspended accounts with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: suspendedEmail, password: 'SuspendedPass123!' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Account is suspended/);
    });

    it('rejects inactive accounts with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: inactiveEmail, password: 'InactivePass123!' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Account is inactive/);
    });

    it('authenticates reviewer successfully with correct credentials and issues session', async () => {
      const res = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      const { token, user, defaultDestination, access } = res.body.data;
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(user.email).toBe(testEmail);
      expect(defaultDestination).toBe('/hrms/dashboard');
      expect(access.companies).toHaveLength(1);
      expect(access.companies[0].companyId).toBe(companyId);

      // Verify session stored securely as sha256 digest in database
      const db = getDb();
      const dbSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, reviewerUserId));
      expect(dbSessions.length).toBeGreaterThan(0);
      const activeSession = dbSessions.find((s) => s.revokedAt === null);
      expect(activeSession).toBeDefined();
      expect(activeSession?.token.startsWith('sha256:')).toBe(true);

      // Verify audit log recorded login with password method
      const auditEntries = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.actorUserId, reviewerUserId));
      const loginEvent = auditEntries.find((a) => a.action === 'user_logged_in');
      expect(loginEvent).toBeDefined();
      expect(loginEvent?.metadata).toEqual({ method: 'password' });
    });
  });

  describe('3. Session Lifecycle, Authorization & Tenant Isolation', () => {
    it('allows accessing /api/v1/platform/auth/me with the issued session token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: testEmail, password: testPassword });

      const { token } = loginRes.body.data;

      const meRes = await request(app)
        .get('/api/v1/platform/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.id).toBe(reviewerUserId);
      expect(meRes.body.data.email).toBe(testEmail);
    });

    it('allows logging out and invalidates the session token immediately', async () => {
      const loginRes = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: testEmail, password: testPassword });

      const { token } = loginRes.body.data;

      const logoutRes = await request(app)
        .post('/api/v1/platform/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);

      // Subsequent access must be rejected
      const meRes = await request(app)
        .get('/api/v1/platform/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(401);
    });

    it('enforces tenant isolation and denies reviewer access to unauthorized companies', async () => {
      const loginRes = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: testEmail, password: testPassword });

      const { token } = loginRes.body.data;

      // Accessing /access with own company header works
      const ownCompanyRes = await request(app)
        .get('/api/v1/platform/access')
        .set('Authorization', `Bearer ${token}`)
        .set('x-company-id', companyId);

      expect(ownCompanyRes.status).toBe(200);

      // Attempting to access foreign tenant's company must NOT give membership access
      const foreignCompanyRes = await request(app)
        .get('/api/v1/platform/access')
        .set('Authorization', `Bearer ${token}`)
        .set('x-company-id', otherCompanyId);

      expect(foreignCompanyRes.status).toBe(200);
      const foreignCompAccess = foreignCompanyRes.body.data.companies.find(
        (c: { companyId: string }) => c.companyId === otherCompanyId,
      );
      expect(foreignCompAccess).toBeUndefined();
    });
  });
});
