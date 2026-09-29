import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  auditLogs,
  authOtpChallenges,
  companies,
  emailOutbox,
  employees,
  memberships,
  roleAssignments,
  rolePermissions,
  roles,
  sessions,
  tenants,
  users,
} from '../../db/schema.js';
import { hashPassword, hashSessionToken } from '../auth/security.js';
import { emailOutboxRepository } from '../email/repository/emailOutbox.repository.js';
import { OTP_MAX_ATTEMPTS } from '../auth/service/otpAuth.service.js';

/**
 * ADR-018: one passwordless Email OTP flow for every BEZENT user. Runs with the
 * development `outbox` email transport, reading codes from `email_outbox`.
 */
describe.skipIf(!isDatabaseConfigured)('Email OTP authentication (ADR-018)', () => {
  const app = createApp();
  const tenantId = 'tent_otp';
  const companyId = 'comp_otp';
  const email = (name: string) => `otp_${name}@otp.example`;

  const USERS = {
    superAdmin: 'superadmin',
    companyAdmin: 'companyadmin',
    hr: 'hr',
    manager: 'manager',
    employee: 'employee',
    custom: 'custom',
    lockout: 'lockout',
    singleUse: 'singleuse',
    expiry: 'expiry',
    cooldown: 'cooldown',
    suspended: 'suspended',
    suspendedLater: 'suspendedlater',
  } as const;
  const UNKNOWN = email('nobody');
  const allEmails = [...Object.values(USERS).map(email), UNKNOWN];

  const requestCode = (address: string) =>
    request(app).post('/api/v1/platform/auth/otp/request').send({ email: address });
  const verify = (challengeId: string, code: string) =>
    request(app).post('/api/v1/platform/auth/otp/verify').send({ challengeId, code });

  async function codeSentTo(address: string): Promise<string> {
    const message = await emailOutboxRepository.latestFor(address);
    const match = message?.bodyText.match(/\b(\d{6})\b/);
    if (!match?.[1]) throw new Error(`No OTP email found for ${address}`);
    return match[1];
  }

  async function signIn(address: string) {
    const requested = await requestCode(address);
    expect(requested.status).toBe(202);
    const code = await codeSentTo(address);
    return verify(requested.body.data.challengeId, code);
  }

  beforeAll(async () => {
    const db = getDb();
    await db.delete(authOtpChallenges).where(inArray(authOtpChallenges.email, allEmails));
    await db.delete(emailOutbox).where(inArray(emailOutbox.recipient, allEmails));

    await db
      .insert(tenants)
      .values({ id: tenantId, name: 'OTP Tenant', status: 'active' })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
    await db
      .insert(companies)
      .values({ id: companyId, tenantId, name: 'OTP Company', code: 'OTPCO', status: 'active' })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // Password columns are still NOT NULL (additive schema); they grant nothing.
    const unused = hashPassword('unused-by-otp');
    for (const [key, name] of Object.entries(USERS)) {
      await db
        .insert(users)
        .values({
          id: `usr_otp_${name}`,
          email: email(name),
          passwordHash: unused.hash,
          salt: unused.salt,
          firstName: 'Otp',
          lastName: name,
          status: key === 'suspended' ? 'suspended' : 'active',
          isSuperAdmin: key === 'superAdmin',
        })
        .onDuplicateKeyUpdate({
          set: { status: key === 'suspended' ? 'suspended' : 'active' },
        });
    }

    const grants: Array<[string, string]> = [
      [USERS.companyAdmin, 'role_sys_company_admin'],
      [USERS.hr, 'role_sys_hr_manager'],
      [USERS.manager, 'role_sys_manager'],
      [USERS.employee, 'role_sys_employee'],
      [USERS.custom, 'role_otp_custom'],
    ];
    await db
      .insert(roles)
      .values({
        id: 'role_otp_custom',
        tenantId,
        companyId,
        code: 'custom_otp_auditor',
        name: 'OTP Auditor',
        isSystem: false,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
    await db
      .insert(rolePermissions)
      .values(
        ['company.profile.read', 'company.audit.read'].map((permissionId, i) => ({
          id: `rp_otp_custom_${i}`,
          tenantId,
          companyId,
          roleId: 'role_otp_custom',
          permissionId,
        })),
      )
      .onDuplicateKeyUpdate({ set: { tenantId } });

    for (const [name, roleId] of grants) {
      const userId = `usr_otp_${name}`;
      await db
        .insert(memberships)
        .values({
          id: `mem_otp_${name}`,
          userId,
          tenantId,
          companyId,
          role: 'user',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });
      await db
        .insert(roleAssignments)
        .values({ id: `ra_otp_${name}`, userId, roleId, tenantId, companyId, status: 'active' })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });
    }

    await db
      .insert(employees)
      .values({
        id: 'emp_otp_employee',
        tenantId,
        companyId,
        userId: `usr_otp_${USERS.employee}`,
        employeeNumber: 'OTP-001',
        firstName: 'Otp',
        email: email(USERS.employee),
        joiningDate: '2025-01-01',
        employmentStatus: 'active',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });
  });

  describe('One flow for every role', () => {
    it('signs in a Super Admin without any company membership', async () => {
      const res = await signIn(email(USERS.superAdmin));
      expect(res.status).toBe(200);
      expect(res.body.data.access.platformWorkspaces).toEqual(['super_admin']);
      expect(res.body.data.access.companies).toEqual([]);
      expect(res.body.data.defaultDestination).toBe('/super-admin');
    });

    it.each([
      ['Company Admin', USERS.companyAdmin, ['company_admin']],
      ['HR', USERS.hr, ['hrms']],
      ['Manager', USERS.manager, ['hrms']],
      ['Employee (linked record)', USERS.employee, ['ess']],
      ['custom role', USERS.custom, ['company_admin']],
    ])(
      'signs in %s and resolves only its authorized workspaces',
      async (_label, name, expected) => {
        const res = await signIn(email(name));
        expect(res.status).toBe(200);
        const { access, token } = res.body.data;
        expect(access.platformWorkspaces).toEqual([]);
        expect(access.companies).toHaveLength(1);
        expect(access.companies[0].companyId).toBe(companyId);
        expect(access.companies[0].workspaces).toEqual(expected);

        // The same session works on protected APIs, re-validated per request.
        const me = await request(app)
          .get('/api/v1/platform/access')
          .set('Authorization', `Bearer ${token}`);
        expect(me.status).toBe(200);
        expect(me.body.data.companies[0].workspaces).toEqual(expected);
      },
    );

    it('stores only a digest of the issued session token', async () => {
      const res = await signIn(email(USERS.singleUse));
      expect(res.status).toBe(200);
      const token: string = res.body.data.token;
      const stored = await getDb()
        .select({ token: sessions.token })
        .from(sessions)
        .where(eq(sessions.token, hashSessionToken(token)));
      expect(stored).toHaveLength(1);
      const raw = await getDb().select().from(sessions).where(eq(sessions.token, token));
      expect(raw).toHaveLength(0);
    });
  });

  describe('Challenge security', () => {
    it('answers unknown emails exactly like real ones and sends nothing', async () => {
      const known = await requestCode(email(USERS.lockout));
      const unknown = await requestCode(UNKNOWN);
      expect(unknown.status).toBe(known.status);
      expect(Object.keys(unknown.body.data).sort()).toEqual(Object.keys(known.body.data).sort());
      expect(await emailOutboxRepository.latestFor(UNKNOWN)).toBeNull();

      // …and fails, then locks, exactly like a real challenge.
      for (let i = 1; i <= OTP_MAX_ATTEMPTS; i++) {
        const res = await verify(unknown.body.data.challengeId, '000000');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe(i < OTP_MAX_ATTEMPTS ? 'OTP_INVALID' : 'OTP_LOCKED');
      }
    });

    it('locks a challenge after too many wrong codes, even for the right code afterwards', async () => {
      const [challenge] = await getDb()
        .select()
        .from(authOtpChallenges)
        .where(eq(authOtpChallenges.email, email(USERS.lockout)));
      const code = await codeSentTo(email(USERS.lockout));
      const wrong = code === '000000' ? '111111' : '000000';

      for (let i = 1; i <= OTP_MAX_ATTEMPTS; i++) {
        const res = await verify(challenge!.id, wrong);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe(i < OTP_MAX_ATTEMPTS ? 'OTP_INVALID' : 'OTP_LOCKED');
      }
      const late = await verify(challenge!.id, code);
      expect(late.status).toBe(401);
      expect(late.body.error.code).toBe('OTP_LOCKED');
    });

    it('accepts a code only once', async () => {
      // USERS.singleUse already signed in above; reuse that consumed challenge.
      const [challenge] = await getDb()
        .select()
        .from(authOtpChallenges)
        .where(eq(authOtpChallenges.email, email(USERS.singleUse)));
      expect(challenge!.status).toBe('consumed');
      const replay = await verify(challenge!.id, await codeSentTo(email(USERS.singleUse)));
      expect(replay.status).toBe(401);
      expect(replay.body.error.code).toBe('OTP_INVALID');
    });

    it('rejects expired codes', async () => {
      const requested = await requestCode(email(USERS.expiry));
      const code = await codeSentTo(email(USERS.expiry));
      await getDb()
        .update(authOtpChallenges)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(authOtpChallenges.id, requested.body.data.challengeId));
      const res = await verify(requested.body.data.challengeId, code);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('OTP_EXPIRED');
    });

    it('enforces the resend cooldown with Retry-After', async () => {
      expect((await requestCode(email(USERS.cooldown))).status).toBe(202);
      const again = await requestCode(email(USERS.cooldown));
      expect(again.status).toBe(429);
      expect(again.body.error.code).toBe('OTP_RATE_LIMITED');
      expect(Number(again.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('never emails a suspended account and never signs it in', async () => {
      const res = await requestCode(email(USERS.suspended));
      expect(res.status).toBe(202);
      expect(await emailOutboxRepository.latestFor(email(USERS.suspended))).toBeNull();
      const attempt = await verify(res.body.data.challengeId, '123456');
      expect(attempt.status).toBe(401);
    });

    it('blocks an account suspended between request and verification', async () => {
      const requested = await requestCode(email(USERS.suspendedLater));
      const code = await codeSentTo(email(USERS.suspendedLater));
      const userId = `usr_otp_${USERS.suspendedLater}`;
      await getDb().update(users).set({ status: 'suspended' }).where(eq(users.id, userId));
      try {
        const res = await verify(requested.body.data.challengeId, code);
        expect(res.status).toBe(403);
      } finally {
        await getDb().update(users).set({ status: 'active' }).where(eq(users.id, userId));
      }
    });

    it('validates request payloads', async () => {
      expect((await requestCode('not-an-email')).status).toBe(400);
      expect((await verify('otp_x', '12ab56')).status).toBe(400);
    });
  });

  describe('Retired and sensitive paths', () => {
    it('answers password sign-in with 410 for every account', async () => {
      const res = await request(app)
        .post('/api/v1/platform/auth/login')
        .send({ email: email(USERS.superAdmin), password: 'anything' });
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('PASSWORD_LOGIN_DISABLED');
    });

    it('never records codes in the audit trail', async () => {
      const challengeRows = await getDb()
        .select({ id: authOtpChallenges.id })
        .from(authOtpChallenges)
        .where(inArray(authOtpChallenges.email, allEmails));
      const logs = await getDb()
        .select()
        .from(auditLogs)
        .where(
          inArray(
            auditLogs.targetId,
            challengeRows.map((c) => c.id),
          ),
        );
      expect(logs.length).toBeGreaterThan(0);
      const actions = new Set(logs.map((l) => l.action));
      for (const action of ['otp_requested', 'otp_verified', 'otp_failed', 'otp_locked']) {
        expect(actions.has(action)).toBe(true);
      }
      const serialized = JSON.stringify(logs);
      for (const name of Object.values(USERS)) {
        const message = await emailOutboxRepository.latestFor(email(name));
        const code = message?.bodyText.match(/\b(\d{6})\b/)?.[1];
        if (code) expect(serialized).not.toContain(`"${code}"`);
      }
    });
  });
});
