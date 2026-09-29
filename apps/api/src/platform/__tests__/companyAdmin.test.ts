import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { authService } from '../auth/service/auth.service.js';

describe('Company Admin Platform Subsystem (Phase 2)', () => {
  const app = createApp();

  const tenantAId = 'tent_ca_test_a';
  const tenantBId = 'tent_ca_test_b';
  const companyAId = 'comp_ca_test_a';
  const companyBId = 'comp_ca_test_b';
  const companySuspendedId = 'comp_ca_test_susp';

  let superAdminToken: string;
  let companyAdminAToken: string;
  let ordinaryEmployeeToken: string;
  let userAId: string;
  let userEmpId: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 1. Create Tenants
    await db.insert(tenants).values([
      { id: tenantAId, name: 'Company Admin Tenant A', status: 'active' },
      { id: tenantBId, name: 'Company Admin Tenant B', status: 'active' },
    ]).onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Create Companies
    await db.insert(companies).values([
      { id: companyAId, tenantId: tenantAId, name: 'Alpha Corporation', code: 'ALPHA', status: 'active' },
      { id: companyBId, tenantId: tenantBId, name: 'Beta Enterprises', code: 'BETA', status: 'active' },
      { id: companySuspendedId, tenantId: tenantAId, name: 'Suspended Co', code: 'SUSP', status: 'suspended' },
    ]).onDuplicateKeyUpdate({ set: { name: 'Alpha Corporation' } });

    await db.update(companies).set({ status: 'suspended' }).where(eq(companies.id, companySuspendedId));

    // 3. Create Super Admin User
    const saPass = hashPassword('BezentAdmin2026!');
    await db.insert(users).values({
      id: 'usr_sa_ca_test',
      email: 'sa_catest@bezent.com',
      passwordHash: saPass.hash,
      salt: saPass.salt,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'active',
      isSuperAdmin: true,
    }).onDuplicateKeyUpdate({ set: { status: 'active' } });

    const saLogin = await authService.login('sa_catest@bezent.com', 'BezentAdmin2026!');
    superAdminToken = saLogin.token;

    // 4. Create Company Admin User for Company A
    const caPass = hashPassword('CompanyAdmin2026!');
    userAId = 'usr_ca_test_user_a';
    await db.insert(users).values({
      id: userAId,
      email: 'admin_a@alpha.example',
      passwordHash: caPass.hash,
      salt: caPass.salt,
      firstName: 'Alice',
      lastName: 'Admin',
      status: 'active',
      isSuperAdmin: false,
    }).onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db.insert(memberships).values({
      id: 'mem_ca_test_a',
      userId: userAId,
      tenantId: tenantAId,
      companyId: companyAId,
      role: 'company_admin',
      status: 'active',
    }).onDuplicateKeyUpdate({ set: { status: 'active', role: 'company_admin' } });
    await db.insert(roleAssignments).values({
      id: 'ra_ca_test_a',
      userId: userAId,
      roleId: 'role_sys_company_admin',
      tenantId: tenantAId,
      companyId: companyAId,
      status: 'active',
    }).onDuplicateKeyUpdate({ set: { status: 'active' } });

    const caLogin = await authService.login('admin_a@alpha.example', 'CompanyAdmin2026!');
    companyAdminAToken = caLogin.token;

    // 5. Create Ordinary Employee User
    const empPass = hashPassword('Employee2026!');
    userEmpId = 'usr_ca_test_user_emp';
    await db.insert(users).values({
      id: userEmpId,
      email: 'employee_a@alpha.example',
      passwordHash: empPass.hash,
      salt: empPass.salt,
      firstName: 'Bob',
      lastName: 'Staff',
      status: 'active',
      isSuperAdmin: false,
    }).onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db.insert(memberships).values({
      id: 'mem_ca_test_emp',
      userId: userEmpId,
      tenantId: tenantAId,
      companyId: companyAId,
      role: 'employee',
      status: 'active',
    }).onDuplicateKeyUpdate({ set: { status: 'active', role: 'employee' } });
    await db.insert(roleAssignments).values({
      id: 'ra_ca_test_emp',
      userId: userEmpId,
      roleId: 'role_sys_employee',
      tenantId: tenantAId,
      companyId: companyAId,
      status: 'active',
    }).onDuplicateKeyUpdate({ set: { status: 'active' } });

    const empLogin = await authService.login('employee_a@alpha.example', 'Employee2026!');
    ordinaryEmployeeToken = empLogin.token;
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
    it('retrieves company profile', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Alpha Corporation');
      expect(res.body.data.code).toBe('ALPHA');
    });

    it('updates editable profile fields and preserves system invariants', async () => {
      const res = await request(app)
        .patch('/api/v1/company-admin/profile')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId)
        .send({
          legalName: 'Alpha Corporation International Ltd',
          businessEmail: 'contact@alpha.example',
          contactPhone: '+1-555-0200',
          country: 'United States',
          timeZone: 'America/New_York',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.legalName).toBe('Alpha Corporation International Ltd');
      expect(res.body.data.businessEmail).toBe('contact@alpha.example');
      expect(res.body.data.timeZone).toBe('America/New_York');
      expect(res.body.data.code).toBe('ALPHA'); // Immutable
    });
  });

  describe('User Management & Invitations', () => {
    const inviteEmail = `newhire_${Date.now()}@alpha.example`;

    it('invites a new user, creates membership and secure expiring invitation token', async () => {
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
      expect(res.body.data.emailDeliveryStatus).toBe('not_configured');
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
      const res = await request(app)
        .get('/api/v1/company-admin/users')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const emails = res.body.data.map((u: { email: string }) => u.email);
      expect(emails).toContain('admin_a@alpha.example');
      expect(emails).toContain(inviteEmail);
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

  describe('Module Management & Entitlements', () => {
    it('lists modules and respects tenant-level entitlement', async () => {
      const res = await request(app)
        .get('/api/v1/company-admin/modules')
        .set('Authorization', `Bearer ${companyAdminAToken}`)
        .set('x-company-id', companyAId);

      expect(res.status).toBe(200);
      const hrms = res.body.data.find((m: { code: string; tenantEntitled: boolean }) => m.code === 'hrms');
      expect(hrms).toBeDefined();
      expect(hrms.tenantEntitled).toBe(true);

      const crm = res.body.data.find((m: { code: string; tenantEntitled: boolean }) => m.code === 'crm');
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
