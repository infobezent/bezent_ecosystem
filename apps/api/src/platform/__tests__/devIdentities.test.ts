import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app/server/createApp.js';
import { getDb } from '../../db/connection.js';
import { authOtpChallenges } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { seedDatabase } from '../../db/seed.js';
import type { CompanyAccess, AccessRoleSummary } from '../access/types/access.types.js';

describe('Development Identities End-to-End Auth & Access Verification', () => {
  const app = createApp();

  beforeAll(async () => {
    await seedDatabase();
  });

  async function clearOtpForEmail(email: string) {
    const db = getDb();
    await db.delete(authOtpChallenges).where(eq(authOtpChallenges.email, email));
  }

  async function fetchLatestOtpCode(email: string): Promise<string> {
    const { emailOutboxRepository } = await import('../email/repository/emailOutbox.repository.js');
    const message = await emailOutboxRepository.latestFor(email);
    expect(message).toBeDefined();
    const match = message?.bodyText.match(/Your BEZENT sign-in code is (\d{6})/);
    expect(match).not.toBeNull();
    return match![1]!;
  }

  async function loginWithOtp(email: string, ip = '127.0.0.1') {
    await clearOtpForEmail(email);
    const reqRes = await request(app)
      .post('/api/v1/platform/auth/otp/request')
      .set('X-Forwarded-For', ip)
      .send({ email });
    expect(reqRes.status).toBe(202);
    const { challengeId } = reqRes.body.data;
    expect(challengeId).toBeDefined();

    const code = await fetchLatestOtpCode(email);
    expect(code).toHaveLength(6);

    const verifyRes = await request(app)
      .post('/api/v1/platform/auth/otp/verify')
      .send({ challengeId, code });
    expect(verifyRes.status).toBe(200);
    return verifyRes.body.data;
  }

  it('verifies Identity 1: superadmin@bezent.com has Super Admin workspace and platform access', async () => {
    const session = await loginWithOtp('superadmin@bezent.com', '10.1.0.1');
    expect(session.user.email).toBe('superadmin@bezent.com');
    expect(session.user.isSuperAdmin).toBe(true);
    expect(session.defaultDestination).toBe('/super-admin');
    expect(session.access.user.isSuperAdmin).toBe(true);
    expect(session.access.platformWorkspaces).toContain('super_admin');

    // Access platform admin endpoint
    const tenantsRes = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${session.token}`);
    expect(tenantsRes.status).toBe(200);
  });

  it('verifies Identity 2: companyadmin@bezent.com has Company Admin workspace and cannot access Super Admin', async () => {
    const session = await loginWithOtp('companyadmin@bezent.com', '10.1.0.2');
    expect(session.user.email).toBe('companyadmin@bezent.com');
    expect(session.user.isSuperAdmin).toBe(false);
    expect(session.defaultDestination).toBe('/company-admin');

    const company = session.access.companies.find(
      (c: CompanyAccess) => c.companyId === 'comp_demo_01',
    );
    expect(company).toBeDefined();
    expect(company.roles.some((r: AccessRoleSummary) => r.code === 'company_admin')).toBe(true);
    expect(company.workspaces).toContain('company_admin');

    // Can access company-admin endpoint
    const rolesRes = await request(app)
      .get('/api/v1/company-admin/roles')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(rolesRes.status).toBe(200);

    // DENIED platform super admin endpoint
    const superAdminRes = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${session.token}`);
    expect(superAdminRes.status).toBe(403);
  });

  it('verifies Identity 3: hr@bezent.com has full HRMS Admin access, active HRMS app, and correct role', async () => {
    const session = await loginWithOtp('hr@bezent.com', '10.1.0.3');
    expect(session.user.email).toBe('hr@bezent.com');
    expect(session.user.isSuperAdmin).toBe(false);
    expect(session.defaultDestination).toBe('/hrms/dashboard');

    const company = session.access.companies.find(
      (c: CompanyAccess) => c.companyId === 'comp_demo_01',
    );
    expect(company).toBeDefined();
    expect(company.roles.some((r: AccessRoleSummary) => r.code === 'hr_manager')).toBe(true);
    expect(company.enabledModules).toContain('hrms');
    expect(company.workspaces).toContain('hrms');
    expect(company.permissions).toContain('hrms.dashboard.view');
    expect(company.permissions).toContain('hrms.administration.view');
    expect(company.permissions).toContain('hrms.employees.view');
    expect(company.permissions).toContain('hrms.onboarding.view');
    expect(company.permissions).toContain('hrms.documents.view');
    expect(company.permissions).toContain('hrms.leave.view');
    expect(company.permissions).toContain('hrms.attendance.view');
    expect(company.permissions).toContain('hrms.timesheets.view');
    expect(company.permissions).toContain('hrms.performance.view');
    expect(company.permissions).toContain('hrms.organization.view');
    expect(company.permissions).toContain('hrms.settings.view');

    // HRMS Employees API access
    const empRes = await request(app)
      .get('/api/v1/hrms/employees')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(empRes.status).toBe(200);

    // DENIED platform super admin endpoint
    const superAdminRes = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${session.token}`);
    expect(superAdminRes.status).toBe(403);
  });

  it('verifies Identity 4: employee@bezent.com has ESS workspace only and is DENIED admin endpoints', async () => {
    const session = await loginWithOtp('employee@bezent.com', '10.1.0.4');
    expect(session.user.email).toBe('employee@bezent.com');
    expect(session.user.isSuperAdmin).toBe(false);
    expect(session.defaultDestination).toBe('/ess');

    const company = session.access.companies.find(
      (c: CompanyAccess) => c.companyId === 'comp_demo_01',
    );
    expect(company).toBeDefined();
    expect(company.essEligible).toBe(true);
    expect(company.workspaces).toContain('ess');
    // CRITICAL: employee must NOT have hrms or company_admin workspace
    expect(company.workspaces).not.toContain('hrms');
    expect(company.workspaces).not.toContain('company_admin');

    // ── ESS APIs: ALLOW ──────────────────────────────────────────────────
    const essRes = await request(app)
      .get('/api/v1/ess/profile')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(essRes.status).toBe(200);

    const essLeaveRes = await request(app)
      .get('/api/v1/ess/leave')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(essLeaveRes.status).toBe(200);

    const essAttRes = await request(app)
      .get('/api/v1/ess/attendance')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(essAttRes.status).toBe(200);

    // ── HRMS Administration APIs: DENY (403) ──────────────────────────────
    // CRITICAL boundary: employee must never reach /api/v1/hrms/* admin routes.
    const hrmsEmployeesRes = await request(app)
      .get('/api/v1/hrms/employees')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(hrmsEmployeesRes.status).toBe(403);

    const hrmsOrgRes = await request(app)
      .get('/api/v1/hrms/organization/masters')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(hrmsOrgRes.status).toBe(403);

    const hrmsDocsRes = await request(app)
      .get('/api/v1/hrms/employee-documents')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(hrmsDocsRes.status).toBe(403);

    const hrmsOnbRes = await request(app)
      .get('/api/v1/hrms/onboarding/cases')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(hrmsOnbRes.status).toBe(403);

    // ── Company Admin API: DENY ────────────────────────────────────────────
    const caRes = await request(app)
      .get('/api/v1/company-admin/roles')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(caRes.status).toBe(403);

    // ── Super Admin API: DENY ─────────────────────────────────────────────
    const saRes = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${session.token}`);
    expect(saRes.status).toBe(403);
  });

  it('verifies logout invalidates session on server and prevents restoration', async () => {
    const session = await loginWithOtp('hr@bezent.com', '10.1.0.5');

    // Verify session is valid
    const accessBefore = await request(app)
      .get('/api/v1/platform/access')
      .set('Authorization', `Bearer ${session.token}`);
    expect(accessBefore.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post('/api/v1/platform/auth/logout')
      .set('Authorization', `Bearer ${session.token}`);
    expect(logoutRes.status).toBe(200);

    // After logout, session is rejected
    const accessAfter = await request(app)
      .get('/api/v1/platform/access')
      .set('Authorization', `Bearer ${session.token}`);
    expect(accessAfter.status).toBe(401);
  });

  it('enforces strict company-context security on HRMS endpoints (negative & positive)', async () => {
    const session = await loginWithOtp('hr@bezent.com', '10.1.0.6');

    // 1. No company context -> 400 Bad Request
    const noContextRes = await request(app)
      .get('/api/v1/hrms/employees')
      .set('Authorization', `Bearer ${session.token}`);
    expect(noContextRes.status).toBe(400);
    expect(noContextRes.body.error.message).toContain('Active company context');

    // 2. Unauthorized / spoofed company ID -> 403 Forbidden
    const spoofedRes = await request(app)
      .get('/api/v1/hrms/employees')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_nonexistent_or_unauthorized');
    expect(spoofedRes.status).toBe(403);

    // 3. Another company's ID the user does not belong to -> 403 Forbidden
    const otherCompanyRes = await request(app)
      .get('/api/v1/hrms/employees')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_other_999');
    expect(otherCompanyRes.status).toBe(403);

    // 4. Valid HR + valid active company -> 200 OK
    const validRes = await request(app)
      .get('/api/v1/hrms/employees')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(validRes.status).toBe(200);

    // 5. Representative HRMS modules with valid company context -> 200 OK
    const orgRes = await request(app)
      .get('/api/v1/hrms/organization/masters')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(orgRes.status).toBe(200);

    const docsRes = await request(app)
      .get('/api/v1/hrms/employee-documents')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(docsRes.status).toBe(200);

    const onbRes = await request(app)
      .get('/api/v1/hrms/onboarding/cases')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(onbRes.status).toBe(200);
  });
});
