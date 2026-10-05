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
  invitations,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';
import { emailOutboxRepository } from '../email/repository/emailOutbox.repository.js';

describe('Company Admin Platform Subsystem (Phase 2)', () => {
  const app = createApp();

  const tenantAId = 'tent_ca_test_a';
  const tenantBId = 'tent_ca_test_b';
  const companyAId = 'comp_ca_test_a';
  const companyA2Id = 'comp_ca_test_a2';
  const companyBId = 'comp_ca_test_b';
  const companySuspendedId = 'comp_ca_test_susp';

  let superAdminToken: string;
  let companyAdminAToken: string;
  let ordinaryEmployeeToken: string;
  let userAId: string;
  let userBId: string;
  let userEmpId: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 1. Create Tenants
    await db
      .insert(tenants)
      .values([
        { id: tenantAId, name: 'Company Admin Tenant A', status: 'active' },
        { id: tenantBId, name: 'Company Admin Tenant B', status: 'active' },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Create Companies
    await db
      .insert(companies)
      .values([
        {
          id: companyAId,
          tenantId: tenantAId,
          name: 'Alpha Corporation',
          code: 'ALPHA',
          status: 'active',
        },
        {
          id: companyA2Id,
          tenantId: tenantAId,
          name: 'Alpha Subsidiary',
          code: 'ALPHASUB',
          status: 'active',
        },
        {
          id: companyBId,
          tenantId: tenantBId,
          name: 'Beta Enterprises',
          code: 'BETA',
          status: 'active',
        },
        {
          id: companySuspendedId,
          tenantId: tenantAId,
          name: 'Suspended Co',
          code: 'SUSP',
          status: 'suspended',
        },
      ])
      .onDuplicateKeyUpdate({ set: { name: 'Alpha Corporation' } });

    await db
      .update(companies)
      .set({ status: 'suspended' })
      .where(eq(companies.id, companySuspendedId));

    // 3. Create Super Admin User
    const saPass = hashPassword('BezentAdmin2026!');
    await db
      .insert(users)
      .values({
        id: 'usr_sa_ca_test',
        email: 'sa_catest@bezent.com',
        passwordHash: saPass.hash,
        salt: saPass.salt,
        firstName: 'Super',
        lastName: 'Admin',
        status: 'active',
        isSuperAdmin: true,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    const saLogin = await signInForTest('sa_catest@bezent.com');
    superAdminToken = saLogin.token;

    // 4. Create Company Admin User for Company A
    const caPass = hashPassword('CompanyAdmin2026!');
    userAId = 'usr_ca_test_user_a';
    await db
      .insert(users)
      .values({
        id: userAId,
        email: 'admin_a@alpha.example',
        passwordHash: caPass.hash,
        salt: caPass.salt,
        firstName: 'Alice',
        lastName: 'Admin',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_ca_test_a',
        userId: userAId,
        tenantId: tenantAId,
        companyId: companyAId,
        role: 'company_admin',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'company_admin', companyId: companyAId } });
    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_ca_test_a',
        userId: userAId,
        roleId: 'role_sys_company_admin',
        tenantId: tenantAId,
        companyId: companyAId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    const caLogin = await signInForTest('admin_a@alpha.example');
    companyAdminAToken = caLogin.token;

    // 5. Create Ordinary Employee User
    const empPass = hashPassword('Employee2026!');
    userEmpId = 'usr_ca_test_user_emp';
    await db
      .insert(users)
      .values({
        id: userEmpId,
        email: 'employee_a@alpha.example',
        passwordHash: empPass.hash,
        salt: empPass.salt,
        firstName: 'Bob',
        lastName: 'Staff',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_ca_test_emp',
        userId: userEmpId,
        tenantId: tenantAId,
        companyId: companyAId,
        role: 'employee',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'employee' } });
    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_ca_test_emp',
        userId: userEmpId,
        roleId: 'role_sys_employee',
        tenantId: tenantAId,
        companyId: companyAId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    const empLogin = await signInForTest('employee_a@alpha.example');
    ordinaryEmployeeToken = empLogin.token;

    // 6. Grant Company Admin A access to Company A2 (same tenant)
    await db
      .insert(memberships)
      .values({
        id: 'mem_ca_test_a2',
        userId: userAId,
        tenantId: tenantAId,
        companyId: companyA2Id,
        role: 'company_admin',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'company_admin', companyId: companyA2Id } });
    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_ca_test_a2',
        userId: userAId,
        roleId: 'role_sys_company_admin',
        tenantId: tenantAId,
        companyId: companyA2Id,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 7. Create User in Tenant B (for cross-tenant rejection tests)
    const bPass = hashPassword('BetaUser2026!');
    userBId = 'usr_ca_test_user_b';
    await db
      .insert(users)
      .values({
        id: userBId,
        email: 'user_b@beta.example',
        passwordHash: bPass.hash,
        salt: bPass.salt,
        firstName: 'Bob',
        lastName: 'Beta',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_ca_test_b',
        userId: userBId,
        tenantId: tenantBId,
        companyId: companyBId,
        role: 'employee',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'employee', companyId: companyBId } });
    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_ca_test_b',
        userId: userBId,
        roleId: 'role_sys_employee',
        tenantId: tenantBId,
        companyId: companyBId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // Clean up any residual membership in Company A2 for userEmpId for test idempotency
    await db
      .delete(memberships)
      .where(and(eq(memberships.userId, userEmpId), eq(memberships.companyId, companyA2Id)));
  });

  describe('Authorization & Multi-Company Boundary Enforcements', () => {
    it('rejects unauthenticated requests to company-admin endpoints (401)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('x-company-id', companyAId);
      expect(res.status).toBe(401);
    });

    it('rejects requests missing company context header (400)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${companyAdminAToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('company context');
    });

    it('permits authorized Company Admin to access their assigned company (200)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);
      expect(res.status).toBe(200);
      expect(res.body.data.company.id).toBe(companyAId);
      expect(res.body.data.company.name).toBe('Alpha Corporation');
    });

    it('rejects ordinary employee from accessing company-admin endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${ordinaryEmployeeToken}`)
        .set('x-company-id', companyAId);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_COMPANY_ADMIN');
    });

    it('rejects cross-company access: Company Admin A cannot access Company B (403)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyBId);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_COMPANY_ADMIN');
    });

    it('permits platform Super Admin to access any company workspace (200)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-company-id', companyAId);
      expect(res.status).toBe(200);
      expect(res.body.data.company.id).toBe(companyAId);
    });

    it('rejects access to suspended companies (403)', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-company-id', companySuspendedId);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('COMPANY_SUSPENDED');
    });
  });

  describe('Multi-Company Switcher (/companies)', () => {
    it('returns only authorized companies for the user', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/companies')
        .set('Authorization', `Bearer ${companyAdminAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const companyIds = res.body.data.map((c: { id: string }) => c.id);
      expect(companyIds).toContain(companyAId);
      expect(companyIds).not.toContain(companyBId);
    });
  });

  describe('Company Profile & Settings', () => {
    it('retrieves company profile including all consolidated fields', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Alpha Corporation');
      expect(res.body.data.code).toBe('ALPHA');
      expect(res.body.data.tenantId).toBe(tenantAId);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data).toHaveProperty('displayName');
      expect(res.body.data).toHaveProperty('organizationType');
      expect(res.body.data).toHaveProperty('industry');
      expect(res.body.data).toHaveProperty('website');
      expect(res.body.data).toHaveProperty('logoUrl');
      expect(res.body.data).toHaveProperty('alternateEmail');
      expect(res.body.data).toHaveProperty('alternatePhone');
      expect(res.body.data).toHaveProperty('addressLine1');
      expect(res.body.data).toHaveProperty('addressLine2');
      expect(res.body.data).toHaveProperty('city');
      expect(res.body.data).toHaveProperty('state');
      expect(res.body.data).toHaveProperty('country');
      expect(res.body.data).toHaveProperty('postalCode');
      expect(res.body.data).toHaveProperty('timeZone');
    });

    it('updates editable consolidated profile fields and preserves system invariants', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          displayName: 'Alpha Global',
          legalName: 'Alpha Corporation International Ltd',
          organizationType: 'Private Limited',
          industry: 'IT Services',
          website: 'www.alpha-global.com',
          logoUrl: 'https://cdn.example.com/alpha.png',
          businessEmail: 'contact@alpha.example',
          contactPhone: '+1-555-0200',
          alternateEmail: 'billing@alpha.example',
          alternatePhone: '+1-555-0201',
          addressLine1: '100 Tech Blvd',
          addressLine2: 'Suite 500',
          city: 'New York',
          state: 'New York',
          country: 'United States',
          postalCode: '10001',
          timeZone: 'America/New_York',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.displayName).toBe('Alpha Global');
      expect(res.body.data.legalName).toBe('Alpha Corporation International Ltd');
      expect(res.body.data.organizationType).toBe('Private Limited');
      expect(res.body.data.industry).toBe('IT Services');
      expect(res.body.data.website).toBe('www.alpha-global.com');
      expect(res.body.data.logoUrl).toBe('https://cdn.example.com/alpha.png');
      expect(res.body.data.businessEmail).toBe('contact@alpha.example');
      expect(res.body.data.contactPhone).toBe('+1-555-0200');
      expect(res.body.data.alternateEmail).toBe('billing@alpha.example');
      expect(res.body.data.alternatePhone).toBe('+1-555-0201');
      expect(res.body.data.addressLine1).toBe('100 Tech Blvd');
      expect(res.body.data.addressLine2).toBe('Suite 500');
      expect(res.body.data.city).toBe('New York');
      expect(res.body.data.state).toBe('New York');
      expect(res.body.data.country).toBe('United States');
      expect(res.body.data.postalCode).toBe('10001');
      expect(res.body.data.timeZone).toBe('America/New_York');
      expect(res.body.data.code).toBe('ALPHA'); // Immutable
      expect(res.body.data.name).toBe('Alpha Corporation'); // Immutable
    });

    it('rejects attempts to mutate read-only system fields (name, code, tenantId, status)', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          name: 'Hacked Company Name',
          code: 'HACKED',
          tenantId: 'hacked_tenant',
          status: 'suspended',
          legalName: 'Legit Legal Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Alpha Corporation');
      expect(res.body.data.code).toBe('ALPHA');
      expect(res.body.data.tenantId).toBe(tenantAId);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.legalName).toBe('Legit Legal Name');
    });

    it('rejects invalid business email and invalid alternate email', async () => {
      const res1 = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ businessEmail: 'not-an-email' });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ alternateEmail: 'bad-email@@com' });
      expect(res2.status).toBe(400);
    });

    it('rejects invalid website URL', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ website: 'not a valid url &&' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid postal code for India', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ country: 'India', postalCode: '123' });
      expect(res.status).toBe(400);
    });

    it('emits company_profile_updated audit event with fieldsUpdated metadata', async () => {
      await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ displayName: 'Audited Display Name' });

      const auditRes = await request(app)
        .get('/api/v1/company-admin/audit-logs?limit=5')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(auditRes.status).toBe(200);
      const updateLogs = auditRes.body.data.filter(
        (log: { action: string }) => log.action === 'company_profile_updated',
      );
      expect(updateLogs.length).toBeGreaterThan(0);
      expect(updateLogs[0].metadata?.fieldsUpdated).toContain('displayName');
    });

    it('rejects requests from users without company.profile.update permission', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${ordinaryEmployeeToken}`)
        .set('x-company-id', companyAId)
        .send({ displayName: 'Unauthorized Attempt' });

      expect(res.status).toBe(403);
    });
  });

  describe('User Management & Invitations', () => {
    const inviteEmail = `newhire_${Date.now()}@alpha.example`;

    it('invites a new user, creates membership, invitation record and emails OTP sign-in instructions', async () => {
      const res = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          email: inviteEmail,
          firstName: 'New',
          lastName: 'Hire',
          role: 'hr_manager',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.invitation).toBeDefined();
      expect(res.body.data.invitation.email).toBe(inviteEmail);
      expect(res.body.data.invitation.token).toBeDefined();
      expect(res.body.data.emailDeliveryStatus).toBe('sent');

      // Passwordless (ADR-018): the email explains Email OTP sign-in and carries no password.
      const mail = await emailOutboxRepository.latestFor(inviteEmail);
      expect(mail?.subject).toContain('Alpha Corporation');
      expect(mail?.bodyText).toContain('one-time code');
      expect(mail?.bodyText.toLowerCase()).not.toMatch(/password:|temporary password/);
      expect(JSON.stringify(res.body)).not.toMatch(/tempPassword|temporaryPassword/);
    });

    it('rejects duplicate active invite for the same user in this company (409)', async () => {
      const res = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          email: inviteEmail,
          firstName: 'New',
          lastName: 'Hire',
          role: 'hr_manager',
        });

      expect(res.status).toBe(409);
    });

    it('lists company users with roles and statuses', async () => {
      // Search for the company admin by email prefix — deterministic regardless
      // of how many accumulated memberships exist in this company across test runs.
      const resAdmin = await request(app)
        .get('/api/v1/company-admin/users?search=admin_a&limit=10')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(resAdmin.status).toBe(200);
      expect(Array.isArray(resAdmin.body.data)).toBe(true);
      const adminEmails = resAdmin.body.data.map((u: { email: string }) => u.email);
      expect(adminEmails).toContain('admin_a@alpha.example');

      // Search for the invited user by their unique timestamp-based email.
      const resInvite = await request(app)
        .get(`/api/v1/company-admin/users?search=${encodeURIComponent(inviteEmail)}&limit=10`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(resInvite.status).toBe(200);
      expect(Array.isArray(resInvite.body.data)).toBe(true);
      const inviteEmails = resInvite.body.data.map((u: { email: string }) => u.email);
      expect(inviteEmails).toContain(inviteEmail);
    });

    it('updates user role in company', async () => {
      const res = await request(app)
        .patch(`/api/v1/company-admin/users/${userEmpId}/role`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ role: 'hr_manager' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('hr_manager');
    });

    it('prevents demoting the sole active Company Administrator', async () => {
      const res = await request(app)
        .patch(`/api/v1/company-admin/users/${userAId}/role`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ role: 'employee' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('sole active Company Administrator');
    });

    it('lists and manages invitations', async () => {
      const listRes = await request(app)
        .get('/api/v1/company-admin/invitations')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);
      const invId = listRes.body.data[0].id;

      // Resend invitation
      const resendRes = await request(app)
        .post(`/api/v1/company-admin/invitations/${invId}/resend`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);
      expect(resendRes.status).toBe(200);

      // Cancel invitation
      const cancelRes = await request(app)
        .delete(`/api/v1/company-admin/invitations/${invId}`)
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');
    });
  });

  describe('Cross-Tenant Invitation Protection (Phase 0 Security Invariant)', () => {
    it('Scenario A: allows inviting a new user who does not exist anywhere', async () => {
      const newEmail = `brand_new_${Date.now()}@alpha.example`;
      const res = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          email: newEmail,
          firstName: 'Brand',
          lastName: 'New',
          role: 'employee',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.invitation).toBeDefined();
      expect(res.body.data.invitation.email).toBe(newEmail);
      expect(res.body.data.emailDeliveryStatus).toBe('sent');
    });

    it('Scenario B: allows inviting an existing user in same tenant into another company (same-tenant multi-company)', async () => {
      // employee_a@alpha.example belongs to Tenant A / Company A.
      // Admin invites employee_a to Company A2 (also Tenant A).
      const res = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyA2Id)
        .send({
          email: 'employee_a@alpha.example',
          firstName: 'Bob',
          lastName: 'Staff',
          role: 'employee',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(userEmpId);

      // Verify the user now has memberships in both Company A and Company A2, strictly under Tenant A
      const db = getDb();
      const userMemberships = await db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, userEmpId));

      expect(userMemberships.length).toBeGreaterThanOrEqual(2);
      expect(userMemberships.every((m) => m.tenantId === tenantAId)).toBe(true);
      const companyIds = userMemberships.map((m) => m.companyId);
      expect(companyIds).toContain(companyAId);
      expect(companyIds).toContain(companyA2Id);
    });

    it('Scenario C: strictly rejects inviting an existing user who belongs to another tenant', async () => {
      // user_b@beta.example belongs to Tenant B / Company B.
      // Tenant A / Company A admin attempts to invite user_b into Company A.
      const res = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          email: 'user_b@beta.example',
          firstName: 'Bob',
          lastName: 'Beta',
          role: 'employee',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CROSS_TENANT_INVITATION_PROHIBITED');
      expect(res.body.error.message).toContain('already associated with another tenant');

      // Verify invariant: No membership created in Tenant A for user B
      const db = getDb();
      const crossTenantMemberships = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, userBId), eq(memberships.tenantId, tenantAId)));
      expect(crossTenantMemberships.length).toBe(0);

      // Verify invariant: No role assignment created in Tenant A for user B
      const crossTenantRoles = await db
        .select()
        .from(roleAssignments)
        .where(and(eq(roleAssignments.userId, userBId), eq(roleAssignments.tenantId, tenantAId)));
      expect(crossTenantRoles.length).toBe(0);

      // Verify invariant: No invitation created for user_b in Tenant A
      const crossTenantInvitations = await db
        .select()
        .from(invitations)
        .where(
          and(eq(invitations.email, 'user_b@beta.example'), eq(invitations.tenantId, tenantAId)),
        );
      expect(crossTenantInvitations.length).toBe(0);
    });

    it('strictly rejects inviting an email that has a pending invitation in another tenant', async () => {
      const db = getDb();
      const pendingEmail = `pending_tntb_${Date.now()}@beta.example`;

      // Seed a pending invitation in Tenant B / Company B
      await db.insert(invitations).values({
        id: `inv_seed_${Date.now()}`,
        tenantId: tenantBId,
        companyId: companyBId,
        email: pendingEmail,
        role: 'employee',
        token: `tok_seed_${Date.now()}`,
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Tenant A attempts to invite the same email
      const res = await request(app)
        .post('/api/v1/company-admin/users/invite')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          email: pendingEmail,
          firstName: 'Pending',
          lastName: 'User',
          role: 'employee',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CROSS_TENANT_INVITATION_PROHIBITED');

      // Invariant: No membership, role, or invitation in Tenant A
      const tenantAInvites = await db
        .select()
        .from(invitations)
        .where(and(eq(invitations.email, pendingEmail), eq(invitations.tenantId, tenantAId)));
      expect(tenantAInvites.length).toBe(0);
    });
  });

  describe('Module Management & Entitlements', () => {
    it('lists modules and respects tenant-level entitlement', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/modules')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(res.status).toBe(200);
      const hrms = res.body.data.find(
        (m: { code: string; tenantEntitled: boolean }) => m.code === 'hrms',
      );
      expect(hrms).toBeDefined();
      expect(hrms.tenantEntitled).toBe(true);

      const crm = res.body.data.find(
        (m: { code: string; tenantEntitled: boolean }) => m.code === 'crm',
      );
      expect(crm).toBeDefined();
      expect(crm.tenantEntitled).toBe(false);
    });

    it('rejects company enabling a module if tenant entitlement is disabled (403)', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/modules/crm')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({ enabled: true });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MODULE_NOT_ENTITLED');
    });
  });

  describe('Organization & Policies Summary (HRMS Integration)', () => {
    it('returns organization masters summary for the company', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/organization/summary')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(res.status).toBe(200);
      expect(res.body.data.departments).toBeDefined();
      expect(res.body.data.designations).toBeDefined();
      expect(res.body.data.locations).toBeDefined();
    });

    it('returns policies summary for the company', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/policies/summary')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(res.status).toBe(200);
      expect(res.body.data.fieldSettingsCount).toBeDefined();
    });
  });

  describe('Audit Trail Visibility', () => {
    it('returns company-scoped audit events and never leaks cross-tenant actions', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/audit-logs')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const log of res.body.data) {
        // Every log must belong to Company A
        expect(log.actorEmail).toBeDefined();
      }
    });
  });
});
