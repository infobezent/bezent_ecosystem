import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  employees,
  employeeAttendance,
  employeeLeaveRequests,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';

describe('Employee Self Service (ESS) Backend API (Phase 3)', () => {
  const app = createApp();

  const tenantId = 'tent_ess_test_01';
  const companyId = 'comp_ess_test_01';
  const employeeId = 'emp_ess_test_01';

  let employeeToken: string;
  let nonEmployeeToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 1. Tenant & Company
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: 'ESS Test Tenant',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(companies)
      .values({
        id: companyId,
        tenantId,
        name: 'ESS Test Company',
        code: 'ESSTEST',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Employee User
    const empPass = hashPassword('BezentEmployee2026!');
    await db
      .insert(users)
      .values({
        id: 'usr_ess_emp_01',
        email: 'ess_emp@test.example',
        passwordHash: empPass.hash,
        salt: empPass.salt,
        firstName: 'Rahul',
        lastName: 'Dravid',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 3. Employee Record
    await db
      .insert(employees)
      .values({
        id: employeeId,
        tenantId,
        companyId,
        userId: 'usr_ess_emp_01',
        employeeNumber: 'EMP-ESS-01',
        firstName: 'Rahul',
        lastName: 'Dravid',
        email: 'ess_emp@test.example',
        joiningDate: '2024-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // 4. Employee Membership
    await db
      .insert(memberships)
      .values({
        id: 'mem_ess_emp_01',
        tenantId,
        companyId,
        userId: 'usr_ess_emp_01',
        role: 'employee',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 5. Non-Employee User (pure user without employee record)
    const nonEmpPass = hashPassword('BezentAdmin2026!');
    await db
      .insert(users)
      .values({
        id: 'usr_ess_non_emp',
        email: 'non_emp@test.example',
        passwordHash: nonEmpPass.hash,
        salt: nonEmpPass.salt,
        firstName: 'External',
        lastName: 'Contractor',
        status: 'active',
        isSuperAdmin: false,
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: 'mem_ess_non_emp',
        tenantId,
        companyId,
        userId: 'usr_ess_non_emp',
        role: 'user',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // Clean any prior test attendance/leaves
    await db.delete(employeeAttendance).where(eq(employeeAttendance.employeeId, employeeId));
    await db.delete(employeeLeaveRequests).where(eq(employeeLeaveRequests.employeeId, employeeId));

    // Obtain tokens
    const empLogin = await signInForTest('ess_emp@test.example');
    employeeToken = empLogin.token;

    const nonEmpLogin = await signInForTest('non_emp@test.example');
    nonEmployeeToken = nonEmpLogin.token;
  });

  describe('ESS Identity & Access Control', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/ess/dashboard');
      expect(res.status).toBe(401);
    });

    it('rejects users without an employee record with 403', async () => {
      const res = await request(app)
        .get('/api/v1/ess/dashboard')
        .set('Authorization', `Bearer ${nonEmployeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('No eligible employee record');
    });

    it('allows eligible employee to access ESS dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/ess/dashboard')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.employee.employeeNumber).toBe('EMP-ESS-01');
      expect(res.body.data.todayAttendance).toBeDefined();
      expect(Array.isArray(res.body.data.leaveBalances)).toBe(true);
    });
  });

  describe('My Profile & Profile Change Requests', () => {
    it('returns full employee profile with masked bank details', async () => {
      const res = await request(app)
        .get('/api/v1/ess/profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.employee.email).toBe('ess_emp@test.example');
      expect(res.body.data.employee.employmentStatus).toBe('active');
    });

    it('submits a valid profile change request', async () => {
      const res = await request(app)
        .post('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          subject: 'Update Emergency Contact Address',
          section: 'emergency_contact',
          reason: 'Relocated to new apartment',
          changes: {
            phone: '+91 9876543210',
            address: '42 MG Road, Bengaluru',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.requestType).toBe('profile_change');
    });

    it('updates contact details directly via self-service', async () => {
      const res = await request(app)
        .put('/api/v1/ess/profile/personal')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          personalEmail: 'alex.doe.personal@gmail.com',
          homePhone: '+91 9123456789',
          addressStreet: '123 Residency Road',
          addressCity: 'Bengaluru',
          addressState: 'Karnataka',
          addressPostalCode: '560025',
          addressCountry: 'India',
          isPermanentSameAsCurrent: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.personal.personalEmail).toBe('alex.doe.personal@gmail.com');
      expect(res.body.data.personal.addressCity).toBe('Bengaluru');
    });

    it('updates emergency contacts with valid primary uniqueness', async () => {
      const res = await request(app)
        .put('/api/v1/ess/profile/emergency-contacts')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send([
          {
            priority: 'primary',
            name: 'Pooja Doe',
            relationship: 'Spouse',
            phone: '+91 9988776655',
            email: 'pooja.doe@example.com',
            address: '123 Residency Road, Bengaluru',
          },
        ]);

      expect(res.status).toBe(200);
      expect(res.body.data.emergencyContacts).toHaveLength(1);
      expect(res.body.data.emergencyContacts[0].name).toBe('Pooja Doe');
      expect(res.body.data.emergencyContacts[0].priority).toBe('primary');
    });

    it('rejects emergency contacts without a primary contact', async () => {
      const res = await request(app)
        .put('/api/v1/ess/profile/emergency-contacts')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send([
          {
            priority: 'secondary',
            name: 'Rohan Doe',
            relationship: 'Brother',
            phone: '+91 9988776654',
          },
        ]);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('primary emergency contact is required');
    });

    it('updates family members and retrieves profile change requests', async () => {
      const famRes = await request(app)
        .put('/api/v1/ess/profile/family-members')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send([
          {
            name: 'Aarav Doe',
            relationship: 'Son',
            dateOfBirth: '2020-05-15',
            phone: '+91 9988776655',
          },
        ]);

      expect(famRes.status).toBe(200);
      expect(famRes.body.data.familyMembers).toHaveLength(1);
      expect(famRes.body.data.familyMembers[0].name).toBe('Aarav Doe');

      const reqRes = await request(app)
        .get('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(reqRes.status).toBe(200);
      expect(Array.isArray(reqRes.body.data)).toBe(true);
      expect(reqRes.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Attendance Tracking', () => {
    it('records attendance check-in', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          workLocation: 'office',
          notes: 'Working from Bengaluru HQ',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.checkInTime).toBeDefined();
      expect(res.body.data.status).toBe('present');
    });

    it('rejects duplicate check-in on the same day with 409', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({ workLocation: 'office' });

      expect(res.status).toBe(409);
    });

    it('records attendance check-out', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.checkOutTime).toBeDefined();
    });

    it('rejects duplicate check-out on the same day with 409', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(409);
    });

    const isoDaysAgo = (days: number): string => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - days);
      return d.toISOString().slice(0, 10);
    };

    it('submits an attendance regularization request', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: isoDaysAgo(2),
          checkInTime: '09:15',
          checkOutTime: '18:30',
          reason: 'Biometric device scanner glitch',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.requestType).toBe('attendance_regularization');
      expect(res.body.data.status).toBe('pending');
    });

    it('rejects a regularization request outside the configured submission window', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: isoDaysAgo(60),
          checkInTime: '09:15',
          checkOutTime: '18:30',
          reason: 'Too old to regularize',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('ineligible');
    });

    it('rejects a regularization request with a malformed date', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: '28/09/2026',
          checkInTime: '09:15',
          checkOutTime: '18:30',
          reason: 'Bad date format',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Leave Management', () => {
    let createdLeaveId: string;

    it('fetches leave balances and history', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.balances.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.holidays)).toBe(true);
    });

    it('rejects leave when end date precedes start date', async () => {
      const res = await request(app)
        .post('/api/v1/ess/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          leaveType: 'annual',
          startDate: '2026-11-20',
          endDate: '2026-11-15',
          reason: 'Vacation',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('precede');
    });

    it('submits a valid leave application', async () => {
      const res = await request(app)
        .post('/api/v1/ess/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          leaveType: 'casual',
          startDate: '2026-12-10',
          endDate: '2026-12-11',
          reason: 'Personal family occasion',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.totalDays).toBe(2);
      expect(res.body.data.status).toBe('pending');
      createdLeaveId = res.body.data.id;
    });

    it('rejects overlapping leave requests with 409', async () => {
      const res = await request(app)
        .post('/api/v1/ess/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          leaveType: 'casual',
          startDate: '2026-12-11',
          endDate: '2026-12-12',
          reason: 'Conflict test',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('overlaps');
    });

    it('cancels a pending leave request', async () => {
      const res = await request(app)
        .post(`/api/v1/ess/leave/${createdLeaveId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });
  });

  describe('Timesheets', () => {
    it('rejects timesheet entry with invalid hours (> 24)', async () => {
      const res = await request(app)
        .post('/api/v1/ess/timesheets/log')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: '2026-09-29',
          projectName: 'Project Alpha',
          taskDescription: 'Architecture design',
          hours: 26,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('between 1 and 24');
    });

    it('logs timesheet hours draft', async () => {
      const res = await request(app)
        .post('/api/v1/ess/timesheets/log')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: '2026-09-29',
          projectName: 'BEZENT Core',
          taskDescription: 'Employee Self Service development',
          hours: 8,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.hours).toBe(8);
    });

    it('submits timesheet drafts', async () => {
      const res = await request(app)
        .post('/api/v1/ess/timesheets/submit')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.submittedCount).toBeGreaterThan(0);
    });
  });

  describe('Documents', () => {
    it('uploads an employee personal document', async () => {
      const res = await request(app)
        .post('/api/v1/ess/documents/upload')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          category: 'personal_identity',
          documentName: 'Aadhaar Card',
          documentNumber: 'XXXX-XXXX-1234',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.documentName).toBe('Aadhaar Card');
    });

    it('retrieves employee documents', async () => {
      const res = await request(app)
        .get('/api/v1/ess/documents')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.documents.length).toBeGreaterThan(0);
    });
  });

  describe('Unknown record ids', () => {
    it.each([
      ['post', '/api/v1/ess/leave/missing-id/cancel'],
      ['post', '/api/v1/ess/requests/missing-id/cancel'],
      ['patch', '/api/v1/ess/notifications/missing-id/read'],
    ] as const)('%s %s answers 404 instead of 500', async (method, url) => {
      const res = await request(app)
        [method](url)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('Tasks & Notifications', () => {
    it('retrieves assigned tasks', async () => {
      const res = await request(app)
        .get('/api/v1/ess/tasks')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
    });

    it('retrieves notifications and marks them as read', async () => {
      const notifsRes = await request(app)
        .get('/api/v1/ess/notifications')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(notifsRes.status).toBe(200);
      expect(notifsRes.body.data.notifications.length).toBeGreaterThan(0);

      const firstNotif = notifsRes.body.data.notifications[0];
      const readRes = await request(app)
        .patch(`/api/v1/ess/notifications/${firstNotif.id}/read`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.isRead).toBe(true);

      const readAllRes = await request(app)
        .post('/api/v1/ess/notifications/read-all')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(readAllRes.status).toBe(200);
    });
  });

  describe('Payslips Status (Conditional)', () => {
    it('returns unconfigured status when payroll is not enabled', async () => {
      const res = await request(app)
        .get('/api/v1/ess/payslips')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(false);
      expect(res.body.data.message).toContain('not configured');
    });
  });
});
