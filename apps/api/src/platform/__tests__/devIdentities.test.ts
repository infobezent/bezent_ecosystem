import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app/server/createApp.js';
import { getDb } from '../../db/connection.js';
import {
  authOtpChallenges,
  users,
  tenantAdmins,
  memberships,
  roleAssignments,
  employees,
} from '../../db/schema.js';
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

    // DENIED tenant admin endpoint: Super Admin alone does not grant Tenant Admin authority
    const tenantAdminRes = await request(app)
      .get('/api/v1/tenant-admin/context')
      .set('Authorization', `Bearer ${session.token}`);
    expect(tenantAdminRes.status).toBe(403);
    expect(tenantAdminRes.body.error.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
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

    // Verify authorized company returns accurate Company Admin authority label
    const caCompaniesRes = await request(app)
      .get('/api/v1/company-admin/companies')
      .set('Authorization', `Bearer ${session.token}`);
    expect(caCompaniesRes.status).toBe(200);
    const caComp = caCompaniesRes.body.data.find((c: any) => c.id === 'comp_demo_01');
    expect(caComp).toBeDefined();
    expect(caComp.role).toBe('company_admin');
    expect(caComp.authoritySource).toBe('company_admin');
    expect(caComp.authorityLabel).toBe('Company Admin');
    expect(caComp.isTenantAdmin).toBe(false);
    expect(caComp.isMember).toBe(true);
    expect(caComp.assignedRoles).toContain('company_admin');

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

  it('verifies Identity 5: tenantadmin@bezent.com has Tenant Admin authority, default destination /tenant-admin, and accesses tenant-admin APIs', async () => {
    const session = await loginWithOtp('tenantadmin@bezent.com', '10.1.0.7');
    expect(session.user.email).toBe('tenantadmin@bezent.com');
    expect(session.user.isSuperAdmin).toBe(false);
    expect(session.defaultDestination).toBe('/tenant-admin');

    // Access overview indicates tenant admin authority
    expect(session.access.isTenantAdmin).toBe(true);

    const company = session.access.companies.find(
      (c: CompanyAccess) => c.companyId === 'comp_demo_01',
    );
    expect(company).toBeDefined();
    expect(company.isTenantAdmin).toBe(true);
    expect(company.isMember).toBe(false);
    expect(company.roles).toEqual([]);
    expect(company.employeeId).toBeNull();
    expect(company.essEligible).toBe(false);

    // Tenant Admin CAN access tenant-admin endpoints
    const contextRes = await request(app)
      .get('/api/v1/tenant-admin/context')
      .set('Authorization', `Bearer ${session.token}`);
    expect(contextRes.status).toBe(200);
    expect(contextRes.body.data.tenant.id).toBe('tenant_demo_01');
    expect(contextRes.body.data.tenantAdmin.status).toBe('active');

    // Tenant Admin CAN access company administration for own-tenant company
    const caProfileRes = await request(app)
      .get('/api/v1/company-admin/profile')
      .set('Authorization', `Bearer ${session.token}`)
      .set('x-company-id', 'comp_demo_01');
    expect(caProfileRes.status).toBe(200);

    // Verify authorized company returns accurate Tenant Admin authority label (no false company_admin role)
    const taCompaniesRes = await request(app)
      .get('/api/v1/company-admin/companies')
      .set('Authorization', `Bearer ${session.token}`);
    expect(taCompaniesRes.status).toBe(200);
    const taComp = taCompaniesRes.body.data.find((c: any) => c.id === 'comp_demo_01');
    expect(taComp).toBeDefined();
    expect(taComp.role).toBe('tenant_admin');
    expect(taComp.authoritySource).toBe('tenant_admin');
    expect(taComp.authorityLabel).toBe('Tenant Admin');
    expect(taComp.isTenantAdmin).toBe(true);
    expect(taComp.isMember).toBe(false);
    expect(taComp.assignedRoles).toEqual([]);

    // Tenant Admin is DENIED platform super admin endpoint
    const superAdminRes = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${session.token}`);
    expect(superAdminRes.status).toBe(403);

    // Tenant Admin does NOT automatically have HRMS employee business permissions
    expect(company.permissions).not.toContain('hrms.employees.read');
    expect(company.permissions).not.toContain('hrms.employees.manage');
    expect(company.permissions).not.toContain('hrms.payroll.process');
  });

  it('verifies tenantadmin@bezent.com DB integrity (canonical authority, no membership, no company admin role, no employee)', async () => {
    const db = getDb();

    // 1. User exists and is active
    const [user] = await db.select().from(users).where(eq(users.email, 'tenantadmin@bezent.com'));
    expect(user).toBeDefined();
    expect(user!.status).toBe('active');
    expect(user!.isSuperAdmin).toBe(false);

    // 2. Canonical tenant_admins record exists for BEZENT Demo tenant
    const taRecords = await db
      .select()
      .from(tenantAdmins)
      .where(eq(tenantAdmins.userId, user!.id));
    expect(taRecords).toHaveLength(1);
    expect(taRecords[0]!.tenantId).toBe('tenant_demo_01');
    expect(taRecords[0]!.status).toBe('active');

    // 3. NO memberships row created for tenantadmin
    const userMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user!.id));
    expect(userMemberships).toHaveLength(0);

    // 4. NO role_assignments created for tenantadmin
    const userRoles = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, user!.id));
    expect(userRoles).toHaveLength(0);

    // 5. NO employee records linked
    const linkedEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, user!.id));
    expect(linkedEmployees).toHaveLength(0);
  });

  it('verifies seed idempotency by re-running seedDatabase without duplicate records', async () => {
    const db = getDb();

    // Re-run seed
    await seedDatabase();

    // Verify exactly 1 tenantadmin user
    const taUsers = await db.select().from(users).where(eq(users.email, 'tenantadmin@bezent.com'));
    expect(taUsers).toHaveLength(1);

    // Verify exactly 1 tenant_admins authority record
    const taRecords = await db
      .select()
      .from(tenantAdmins)
      .where(eq(tenantAdmins.userId, taUsers[0]!.id));
    expect(taRecords).toHaveLength(1);
    expect(taRecords[0]!.tenantId).toBe('tenant_demo_01');
    expect(taRecords[0]!.status).toBe('active');
  });

  it('verifies Identity: Explicit Dual Authority user has both Super Admin and Tenant Admin access', async () => {
    const db = getDb();
    const dualEmail = 'dualadmin@bezent.com';
    const dualUserId = 'usr_dual_admin_01';

    // Upsert dual authority user: isSuperAdmin=true AND active tenant_admins record
    await db
      .insert(users)
      .values({
        id: dualUserId,
        email: dualEmail,
        passwordHash: 'dummy',
        salt: 'dummy',
        firstName: 'Dual',
        lastName: 'Admin',
        status: 'active',
        isSuperAdmin: true,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: true } });

    await db
      .insert(tenantAdmins)
      .values({
        id: 'ta_dual_demo_01',
        tenantId: 'tenant_demo_01',
        userId: dualUserId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    const session = await loginWithOtp(dualEmail, '10.1.0.8');
    expect(session.user.isSuperAdmin).toBe(true);
    expect(session.access.isTenantAdmin).toBe(true);
    expect(session.access.platformWorkspaces).toContain('super_admin');

    // 1. Can access platform Super Admin endpoint
    const superAdminRes = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${session.token}`);
    expect(superAdminRes.status).toBe(200);

    // 2. Can access Tenant Admin endpoint for assigned tenant
    const tenantAdminRes = await request(app)
      .get('/api/v1/tenant-admin/context')
      .set('Authorization', `Bearer ${session.token}`);
    expect(tenantAdminRes.status).toBe(200);
    expect(tenantAdminRes.body.data.tenant.id).toBe('tenant_demo_01');
  });

  it('verifies explicit dual authority: Tenant Admin authority + explicit Company Admin role displays accurate dual label', async () => {
    const db = getDb();
    const dualTaCaEmail = 'dual_taca@bezent.com';
    const dualTaCaUserId = 'usr_dual_taca_01';

    await db
      .insert(users)
      .values({
        id: dualTaCaUserId,
        email: dualTaCaEmail,
        passwordHash: 'dummy',
        salt: 'dummy',
        firstName: 'Dual',
        lastName: 'TACA',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: false } });

    await db
      .insert(tenantAdmins)
      .values({
        id: 'ta_dual_taca_01',
        tenantId: 'tenant_demo_01',
        userId: dualTaCaUserId,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_dual_taca_01',
        tenantId: 'tenant_demo_01',
        companyId: 'comp_demo_01',
        userId: dualTaCaUserId,
        role: 'company_admin',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', role: 'company_admin' } });

    await db
      .insert(roleAssignments)
      .values({
        id: 'ra_dual_taca_01',
        tenantId: 'tenant_demo_01',
        companyId: 'comp_demo_01',
        userId: dualTaCaUserId,
        roleId: 'role_sys_company_admin',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    const session = await loginWithOtp(dualTaCaEmail, '10.1.0.9');
    expect(session.user.isSuperAdmin).toBe(false);
    expect(session.access.isTenantAdmin).toBe(true);

    const dualCompaniesRes = await request(app)
      .get('/api/v1/company-admin/companies')
      .set('Authorization', `Bearer ${session.token}`);
    expect(dualCompaniesRes.status).toBe(200);
    const dualComp = dualCompaniesRes.body.data.find((c: any) => c.id === 'comp_demo_01');
    expect(dualComp).toBeDefined();
    expect(dualComp.authoritySource).toBe('dual');
    expect(dualComp.authorityLabel).toBe('Tenant Admin • Company Admin');
    expect(dualComp.isTenantAdmin).toBe(true);
    expect(dualComp.isMember).toBe(true);
    expect(dualComp.assignedRoles).toContain('company_admin');
  });

  it('verifies Unauthenticated requests are rejected with 401 across all administrative endpoints', async () => {
    // 1. Super Admin route without auth -> 401
    const saRes = await request(app).get('/api/v1/platform/tenants');
    expect(saRes.status).toBe(401);

    // 2. Tenant Admin route without auth -> 401
    const taRes = await request(app).get('/api/v1/tenant-admin/context');
    expect(taRes.status).toBe(401);

    // 3. Company Admin route without auth -> 401
    const caRes = await request(app)
      .get('/api/v1/company-admin/profile')
      .set('x-company-id', 'comp_demo_01');
    expect(caRes.status).toBe(401);
  });
});
