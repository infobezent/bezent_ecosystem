import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  authOtpChallenges,
  companies,
  emailOutbox,
  employeeAttendance,
  employeeLeaveBalances,
  employeeLeaveRequests,
  employeeNotifications,
  employeeRequests,
  employeeTasks,
  employeeTimesheets,
  employees,
  invitations,
  memberships,
  roleAssignments,
  tenantModules,
  tenants,
  users,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { emailOutboxRepository } from '../email/repository/emailOutbox.repository.js';

/**
 * End-to-End Development Login & Enterprise Lifecycle Test (ADR-017 / ADR-018)
 *
 * Exercises the complete multi-tenant, multi-role journey using the one
 * passwordless Email OTP flow and the development outbox transport:
 * 1. Super Admin signs in with OTP -> accesses Platform Admin Dashboard.
 * 2. Super Admin provisions a Tenant, Company & HRMS entitlement.
 * 3. Company Admin signs in with OTP -> accesses Company Admin Dashboard.
 * 4. Company Admin invites HR Manager and Team Manager with enterprise RBAC roles.
 * 5. HR Manager signs in with OTP -> creates an Employee record in HRMS.
 * 6. Employee signs in with OTP -> accesses ESS Workspace & checks in.
 * 7. Enforces RBAC permissions, company isolation, and session revocation.
 */
describe.skipIf(!isDatabaseConfigured)('Development Login E2E Lifecycle (Super Admin to ESS)', () => {
  const app = createApp();

  const TENT_ID = 'tent_e2e_journey';
  const COMP_ID = 'comp_e2e_journey';

  const EMAILS = {
    superAdmin: 'superadmin.e2e@bezent.example',
    companyAdmin: 'compadmin.e2e@bezent.example',
    hrManager: 'hrmanager.e2e@bezent.example',
    manager: 'manager.e2e@bezent.example',
    employee: 'alice.e2e@bezent.example',
  } as const;

  const allEmails = Object.values(EMAILS);

  // Helper: Request OTP code via HTTP
  async function requestOtp(email: string): Promise<string> {
    const res = await request(app)
      .post('/api/v1/platform/auth/otp/request')
      .send({ email });
    expect(res.status).toBe(202);
    expect(res.body.data.challengeId).toBeDefined();
    return res.body.data.challengeId;
  }

  // Helper: Read 6-digit OTP code from development email outbox
  async function readOtpCode(email: string): Promise<string> {
    const msg = await emailOutboxRepository.latestFor(email);
    expect(msg).toBeDefined();
    const match = msg?.bodyText.match(/\b(\d{6})\b/);
    if (!match?.[1]) {
      throw new Error(`No 6-digit OTP found in email outbox for ${email}`);
    }
    return match[1];
  }

  // Helper: Complete full passwordless OTP sign-in and return token + payload
  async function completeOtpSignIn(email: string) {
    const challengeId = await requestOtp(email);
    const code = await readOtpCode(email);
    const res = await request(app)
      .post('/api/v1/platform/auth/otp/verify')
      .send({ challengeId, code });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    return {
      token: res.body.data.token as string,
      user: res.body.data.user,
      body: res.body.data,
    };
  }

  async function cleanupDatabase() {
    const db = getDb();
    await db.delete(employeeAttendance).where(eq(employeeAttendance.companyId, COMP_ID));
    await db.delete(employeeLeaveBalances).where(eq(employeeLeaveBalances.companyId, COMP_ID));
    await db.delete(employeeLeaveRequests).where(eq(employeeLeaveRequests.companyId, COMP_ID));
    await db.delete(employeeTimesheets).where(eq(employeeTimesheets.companyId, COMP_ID));
    await db.delete(employeeRequests).where(eq(employeeRequests.companyId, COMP_ID));
    await db.delete(employeeTasks).where(eq(employeeTasks.companyId, COMP_ID));
    await db.delete(employeeNotifications).where(eq(employeeNotifications.companyId, COMP_ID));
    await db.delete(employees).where(eq(employees.companyId, COMP_ID));
    await db.delete(invitations).where(eq(invitations.companyId, COMP_ID));
    await db.delete(roleAssignments).where(eq(roleAssignments.companyId, COMP_ID));
    await db.delete(memberships).where(eq(memberships.companyId, COMP_ID));
    await db.delete(tenantModules).where(eq(tenantModules.companyId, COMP_ID));
    await db.delete(companies).where(eq(companies.id, COMP_ID));
    await db.delete(tenants).where(eq(tenants.id, TENT_ID));
    // Foreign key safety: delete auth_otp_challenges before users
    await db.delete(authOtpChallenges).where(inArray(authOtpChallenges.email, allEmails));
    await db.delete(emailOutbox).where(inArray(emailOutbox.recipient, allEmails));
    await db.delete(users).where(inArray(users.email, allEmails));
  }

  beforeAll(async () => {
    await cleanupDatabase();

    const db = getDb();
    // Seed Super Admin account with unusable password hash (passwordless OTP only)
    const unusable = hashPassword('not-used-by-otp');
    await db
      .insert(users)
      .values({
        id: 'usr_e2e_superadmin',
        email: EMAILS.superAdmin,
        passwordHash: unusable.hash,
        salt: unusable.salt,
        firstName: 'Platform',
        lastName: 'SuperAdmin',
        status: 'active',
        isSuperAdmin: true,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: true } });
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  // Track session tokens across test phases
  let superAdminToken: string;
  let companyAdminToken: string;
  let hrManagerToken: string;
  let employeeToken: string;
  let createdEmployeeId: string;

  it('Phase 1: Super Admin signs in via OTP and accesses platform overview', async () => {
    const session = await completeOtpSignIn(EMAILS.superAdmin);
    superAdminToken = session.token;
    expect(session.user.isSuperAdmin).toBe(true);
    expect(session.user.email).toBe(EMAILS.superAdmin);

    // Verify session identity via /auth/me (returns { data: req.user })
    const meRes = await request(app)
      .get('/api/v1/platform/auth/me')
      .set('authorization', `Bearer ${superAdminToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.isSuperAdmin).toBe(true);

    // Verify Platform Dashboard access
    const dashRes = await request(app)
      .get('/api/v1/platform/dashboard/overview')
      .set('authorization', `Bearer ${superAdminToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.metrics).toHaveProperty('totalTenants');
  });

  it('Phase 2: Super Admin provisions a Tenant, Company, HRMS module and Company Admin', async () => {
    const provisionRes = await request(app)
      .post('/api/v1/platform/provisioning/provision')
      .set('authorization', `Bearer ${superAdminToken}`)
      .send({
        tenant: {
          id: TENT_ID,
          name: 'E2E Journey Enterprise',
          code: 'E2EJOURNEY',
          contactEmail: 'contact@e2e.example',
        },
        company: {
          id: COMP_ID,
          name: 'E2E Journey Technologies',
          code: 'JOURNEY',
          businessEmail: 'info@journey.example',
        },
        modules: ['hrms'],
        admin: {
          newUser: {
            email: EMAILS.companyAdmin,
            firstName: 'Sarah',
            lastName: 'Admin',
          },
        },
      });

    expect(provisionRes.status).toBe(201);
    expect(provisionRes.body.data.tenant.id).toBe(TENT_ID);
    expect(provisionRes.body.data.company.id).toBe(COMP_ID);
    expect(provisionRes.body.data.admin.email).toBe(EMAILS.companyAdmin);

    // Verify welcome email was placed in the outbox
    const welcomeMail = await emailOutboxRepository.latestFor(EMAILS.companyAdmin);
    expect(welcomeMail).toBeDefined();
    expect(welcomeMail?.subject).toContain('E2E Journey Technologies');
  });

  it('Phase 3: Company Admin signs in via OTP and accesses Company Admin workspace', async () => {
    const session = await completeOtpSignIn(EMAILS.companyAdmin);
    companyAdminToken = session.token;
    expect(session.user.isSuperAdmin).toBe(false);

    // Verify Company Admin profile and memberships via /auth/me
    const meRes = await request(app)
      .get('/api/v1/platform/auth/me')
      .set('authorization', `Bearer ${companyAdminToken}`);
    expect(meRes.status).toBe(200);
    const membership = meRes.body.data.memberships.find(
      (m: { companyId: string }) => m.companyId === COMP_ID,
    );
    expect(membership).toBeDefined();
    expect(membership.role).toBe('company_admin');

    // Access Company Admin Dashboard with company header
    const dashRes = await request(app)
      .get('/api/v1/company-admin/dashboard')
      .set('authorization', `Bearer ${companyAdminToken}`)
      .set('x-company-id', COMP_ID);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.company.name).toBe('E2E Journey Technologies');

    // Security check: Company Admin CANNOT access Super Admin dashboard
    const forbiddenRes = await request(app)
      .get('/api/v1/platform/dashboard/overview')
      .set('authorization', `Bearer ${companyAdminToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');
  });

  it('Phase 4: Company Admin invites HR Manager and Team Manager with RBAC roles', async () => {
    // Invite HR Manager
    const hrInvite = await request(app)
      .post('/api/v1/company-admin/users/invite')
      .set('authorization', `Bearer ${companyAdminToken}`)
      .set('x-company-id', COMP_ID)
      .send({
        email: EMAILS.hrManager,
        firstName: 'Helen',
        lastName: 'HR',
        role: 'hr_manager',
      });
    expect(hrInvite.status).toBe(201);
    expect(hrInvite.body.data.emailDeliveryStatus).toBe('sent');

    // Invite Team Manager with base role 'user'
    const mgrInvite = await request(app)
      .post('/api/v1/company-admin/users/invite')
      .set('authorization', `Bearer ${companyAdminToken}`)
      .set('x-company-id', COMP_ID)
      .send({
        email: EMAILS.manager,
        firstName: 'Mark',
        lastName: 'Manager',
        role: 'user',
      });
    expect(mgrInvite.status).toBe(201);
    expect(mgrInvite.body.data.userId).toBeDefined();

    // Assign Enterprise RBAC 'role_sys_manager' to Mark Manager
    const assignRole = await request(app)
      .post(`/api/v1/company-admin/users/${mgrInvite.body.data.userId}/roles`)
      .set('authorization', `Bearer ${companyAdminToken}`)
      .set('x-company-id', COMP_ID)
      .send({ roleId: 'role_sys_manager' });
    expect(assignRole.status).toBe(201);

    // Confirm invitation emails arrived in development outbox
    expect(await emailOutboxRepository.latestFor(EMAILS.hrManager)).toBeDefined();
    expect(await emailOutboxRepository.latestFor(EMAILS.manager)).toBeDefined();
  });

  it('Phase 5: HR Manager signs in via OTP and onboards a new Employee in HRMS', async () => {
    const session = await completeOtpSignIn(EMAILS.hrManager);
    hrManagerToken = session.token;

    // Verify HR Manager access
    const meRes = await request(app)
      .get('/api/v1/platform/auth/me')
      .set('authorization', `Bearer ${hrManagerToken}`);
    expect(meRes.status).toBe(200);

    // HR Manager creates new employee record
    const empRes = await request(app)
      .post('/api/v1/hrms/employees')
      .set('authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', COMP_ID)
      .send({
        employeeNumber: 'EMP-E2E-001',
        firstName: 'Alice',
        lastName: 'Engineer',
        email: EMAILS.employee,
        companyEmail: EMAILS.employee,
        employmentType: 'full_time',
        employmentStatus: 'active',
        joiningDate: '2026-09-01',
      });

    expect(empRes.status).toBe(201);
    createdEmployeeId = empRes.body.data.id;
    expect(createdEmployeeId).toBeDefined();

    // Verify the employee can be retrieved by HR
    const getRes = await request(app)
      .get(`/api/v1/hrms/employees/${createdEmployeeId}`)
      .set('authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', COMP_ID);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.firstName).toBe('Alice');
  });

  it('Phase 6: Employee signs in via OTP, accesses ESS workspace, and records attendance', async () => {
    // Company Admin invites employee to activate user membership
    const userInvite = await request(app)
      .post('/api/v1/company-admin/users/invite')
      .set('authorization', `Bearer ${companyAdminToken}`)
      .set('x-company-id', COMP_ID)
      .send({
        email: EMAILS.employee,
        firstName: 'Alice',
        lastName: 'Engineer',
        role: 'employee',
      });
    expect(userInvite.status).toBe(201);

    // Employee signs in with Email OTP
    const session = await completeOtpSignIn(EMAILS.employee);
    employeeToken = session.token;

    // Verify Employee identity & ESS entitlement
    const meRes = await request(app)
      .get('/api/v1/platform/auth/me')
      .set('authorization', `Bearer ${employeeToken}`);
    expect(meRes.status).toBe(200);

    // ESS Dashboard
    const essDash = await request(app)
      .get('/api/v1/ess/dashboard')
      .set('authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', COMP_ID);
    expect(essDash.status).toBe(200);
    expect(essDash.body.data).toHaveProperty('employee');
    expect(essDash.body.data.employee.firstName).toBe('Alice');

    // ESS Profile
    const essProfile = await request(app)
      .get('/api/v1/ess/profile')
      .set('authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', COMP_ID);
    expect(essProfile.status).toBe(200);
    expect(essProfile.body.data.employee.employeeNumber).toBe('EMP-E2E-001');

    // ESS Attendance check-in punch
    const punchIn = await request(app)
      .post('/api/v1/ess/attendance/check-in')
      .set('authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', COMP_ID);
    expect(punchIn.status).toBe(200);
    expect(punchIn.body.data.status).toBe('present');

    // ESS Attendance record check
    const attRes = await request(app)
      .get('/api/v1/ess/attendance')
      .set('authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', COMP_ID);
    expect(attRes.status).toBe(200);
    expect(attRes.body.data.today.status).toBe('present');
  });

  it('Phase 7: Enforces strict RBAC boundaries, company isolation, and logout', async () => {
    // 1. Employee CANNOT access HR administrative endpoints (FORBIDDEN_WORKSPACE)
    const empAdminAttempt = await request(app)
      .get('/api/v1/hrms/employees')
      .set('authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', COMP_ID);
    expect(empAdminAttempt.status).toBe(403);
    expect(empAdminAttempt.body.error.code).toBe('FORBIDDEN_WORKSPACE');

    // 2. Employee CANNOT access Company Admin endpoints (FORBIDDEN_COMPANY_ADMIN)
    const empCompAdminAttempt = await request(app)
      .get('/api/v1/company-admin/dashboard')
      .set('authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', COMP_ID);
    expect(empCompAdminAttempt.status).toBe(403);
    expect(empCompAdminAttempt.body.error.code).toBe('FORBIDDEN_COMPANY_ADMIN');

    // 3. Cross-company spoofing rejected: Company Admin requests non-member company
    const spoofAttempt = await request(app)
      .get('/api/v1/company-admin/dashboard')
      .set('authorization', `Bearer ${companyAdminToken}`)
      .set('x-company-id', 'comp_demo_01');
    expect(spoofAttempt.status).toBe(403);
    expect(['FORBIDDEN_COMPANY_ACCESS', 'FORBIDDEN_COMPANY_ADMIN']).toContain(spoofAttempt.body.error.code);

    // 4. Logout invalidates session
    const logoutRes = await request(app)
      .post('/api/v1/platform/auth/logout')
      .set('authorization', `Bearer ${employeeToken}`);
    expect(logoutRes.status).toBe(200);

    // Subsequent call with revoked token returns 401
    const postLogoutCall = await request(app)
      .get('/api/v1/ess/dashboard')
      .set('authorization', `Bearer ${employeeToken}`)
      .set('x-company-id', COMP_ID);
    expect(postLogoutCall.status).toBe(401);
    expect(postLogoutCall.body.error.code).toBe('UNAUTHORIZED');
  });
});
