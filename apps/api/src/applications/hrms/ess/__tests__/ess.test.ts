import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
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
  departments,
  designations,
  employeeActions,
  employeeBankAccounts,
  employeeDocuments,
  attendanceRegularizations,
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

    // 3a. Test Department & Designations
    await db
      .insert(departments)
      .values({
        id: 'dept_ess_test_01',
        tenantId,
        companyId,
        name: 'Engineering',
        code: 'ENG',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { name: 'Engineering', code: 'ENG' } });

    await db
      .insert(designations)
      .values({
        id: 'desig_ess_test_01',
        tenantId,
        companyId,
        name: 'Senior Frontend Engineer',
        code: 'SFE',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { name: 'Senior Frontend Engineer', code: 'SFE' } });

    await db
      .insert(designations)
      .values({
        id: 'desig_ess_mgr_01',
        tenantId,
        companyId,
        name: 'Engineering Director',
        code: 'ED',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { name: 'Engineering Director', code: 'ED' } });

    // 3b. Manager Employee Record
    await db
      .insert(employees)
      .values({
        id: 'emp_ess_mgr_01',
        tenantId,
        companyId,
        employeeNumber: 'EMP-MGR-01',
        firstName: 'Anil',
        lastName: 'Kumble',
        email: 'mgr_ess@test.example',
        departmentId: 'dept_ess_test_01',
        designationId: 'desig_ess_mgr_01',
        joiningDate: '2023-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // 3c. Employee Record with Enriched Fields
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
        phone: '+91 9988776655',
        departmentId: 'dept_ess_test_01',
        designationId: 'desig_ess_test_01',
        reportingManagerId: 'emp_ess_mgr_01',
        joiningDate: '2024-01-01',
        probationEndDate: '2024-06-30',
        confirmationDate: '2024-07-01',
        confirmedJoiningDate: '2024-01-01',
        noticePeriodDays: 60,
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({
        set: {
          phone: '+91 9988776655',
          departmentId: 'dept_ess_test_01',
          designationId: 'desig_ess_test_01',
          reportingManagerId: 'emp_ess_mgr_01',
          probationEndDate: '2024-06-30',
          confirmationDate: '2024-07-01',
          confirmedJoiningDate: '2024-01-01',
          noticePeriodDays: 60,
          employmentStatus: 'active',
        },
      });

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

    // Clean any prior test attendance/leaves/actions
    await db.delete(employeeAttendance).where(eq(employeeAttendance.employeeId, employeeId));
    await db.delete(employeeLeaveRequests).where(eq(employeeLeaveRequests.employeeId, employeeId));
    await db.delete(employeeActions).where(eq(employeeActions.tenantId, tenantId));

    // 6. Test Career Actions
    // 6a. Finalized designation change
    await db.insert(employeeActions).values({
      id: 'act_test_desig_01',
      tenantId,
      companyId,
      employeeId,
      actionType: 'designation_change',
      status: 'applied',
      effectiveDate: '2024-06-01',
      reason: 'Confidential performance rating and promotion rationale',
      changeData: {
        changes: [
          {
            field: 'designationId',
            from: 'desig_old_01',
            fromLabel: 'Junior Frontend Engineer',
            to: 'desig_ess_test_01',
            toLabel: 'Senior Frontend Engineer',
          },
        ],
      },
      requestedBy: 'usr_admin_confidential',
      appliedAt: new Date('2024-06-01T09:00:00Z'),
    });

    // 6b. Finalized department transfer
    await db.insert(employeeActions).values({
      id: 'act_test_dept_01',
      tenantId,
      companyId,
      employeeId,
      actionType: 'department_change',
      status: 'applied',
      effectiveDate: '2024-03-01',
      reason: 'Internal mobility policy approval',
      changeData: {
        changes: [
          {
            field: 'departmentId',
            from: 'dept_old_01',
            fromLabel: 'Quality Assurance',
            to: 'dept_ess_test_01',
            toLabel: 'Engineering',
          },
        ],
      },
      requestedBy: 'usr_admin_confidential',
      appliedAt: new Date('2024-03-01T09:00:00Z'),
    });

    // 6c. Pending action (must NOT appear in career history)
    await db.insert(employeeActions).values({
      id: 'act_test_pending_01',
      tenantId,
      companyId,
      employeeId,
      actionType: 'designation_change',
      status: 'pending',
      effectiveDate: '2024-12-01',
      reason: 'Pending HR review',
      changeData: {
        changes: [
          {
            field: 'designationId',
            from: 'desig_ess_test_01',
            fromLabel: 'Senior Frontend Engineer',
            to: 'desig_lead_01',
            toLabel: 'Lead Frontend Engineer',
          },
        ],
      },
    });

    // 6d. Cancelled action (must NOT appear in career history)
    await db.insert(employeeActions).values({
      id: 'act_test_cancelled_01',
      tenantId,
      companyId,
      employeeId,
      actionType: 'location_transfer',
      status: 'cancelled',
      effectiveDate: '2024-05-01',
      reason: 'Cancelled due to employee request',
      changeData: {
        changes: [
          {
            field: 'locationId',
            from: 'loc_blr',
            fromLabel: 'Bengaluru',
            to: 'loc_mum',
            toLabel: 'Mumbai',
          },
        ],
      },
    });

    // 6e. Termination action (must NOT appear in career history allowlist)
    await db.insert(employeeActions).values({
      id: 'act_test_term_01',
      tenantId,
      companyId,
      employeeId,
      actionType: 'termination',
      status: 'applied',
      effectiveDate: '2024-09-01',
      reason: 'Internal confidential HR exit notes',
      changeData: {
        changes: [
          {
            field: 'employmentStatus',
            from: 'active',
            fromLabel: 'Active',
            to: 'terminated',
            toLabel: 'Terminated',
          },
        ],
      },
    });

    // 6f. Another employee's applied action (must NOT appear for employeeId)
    await db.insert(employeeActions).values({
      id: 'act_test_other_emp_01',
      tenantId,
      companyId,
      employeeId: 'emp_ess_mgr_01',
      actionType: 'designation_change',
      status: 'applied',
      effectiveDate: '2024-01-01',
      reason: 'Manager promotion',
      changeData: {
        changes: [
          {
            field: 'designationId',
            from: 'desig_lead_01',
            fromLabel: 'Lead',
            to: 'desig_ess_mgr_01',
            toLabel: 'Engineering Director',
          },
        ],
      },
    });

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
      expect(res.body.data.employee.workPhone).toBe('+91 9988776655');
      expect(res.body.data.employee.probationEndDate).toBe('2024-06-30');
      expect(res.body.data.employee.confirmationDate).toBe('2024-07-01');
      expect(res.body.data.employee.noticePeriodDays).toBe(60);
      expect(res.body.data.employee.departmentCode).toBe('ENG');
      expect(res.body.data.employee.designationCode).toBe('SFE');
      expect(res.body.data.employee.reportingManagerDesignation).toBe('Engineering Director');
      expect(Array.isArray(res.body.data.careerHistory)).toBe(true);
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
      const regDate = isoDaysAgo(2);
      if (isDatabaseConfigured) {
        const db = getDb();
        await db
          .delete(attendanceRegularizations)
          .where(
            and(
              eq(attendanceRegularizations.tenantId, tenantId),
              eq(attendanceRegularizations.companyId, companyId),
              eq(attendanceRegularizations.employeeId, employeeId),
              eq(attendanceRegularizations.workday, regDate),
            ),
          );
      }

      const res = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: regDate,
          checkInTime: '09:15',
          checkOutTime: '18:30',
          reason: 'Biometric device scanner glitch',
        });

      expect(res.status).toBe(201);
      expect(['attendance_regularization', 'incorrect_time']).toContain(res.body.data.requestType);
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

    it('updates a draft timesheet entry', async () => {
      // 1. Create a draft entry
      const createRes = await request(app)
        .post('/api/v1/ess/timesheets/log')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: '2026-09-30',
          projectName: 'Initial Project',
          taskDescription: 'Initial task',
          hours: 4,
        });
      expect(createRes.status).toBe(201);
      const entryId = createRes.body.data.id;

      // 2. Update it
      const updateRes = await request(app)
        .patch(`/api/v1/ess/timesheets/${entryId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          taskDescription: 'Updated task description',
          hours: 6,
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.hours).toBe(6);
      expect(updateRes.body.data.taskDescription).toBe('Updated task description');
    });

    it('deletes a draft timesheet entry', async () => {
      // 1. Create draft entry
      const createRes = await request(app)
        .post('/api/v1/ess/timesheets/log')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: '2026-09-30',
          projectName: 'To Delete',
          taskDescription: 'Will be deleted',
          hours: 2,
        });
      expect(createRes.status).toBe(201);
      const entryId = createRes.body.data.id;

      // 2. Delete it
      const deleteRes = await request(app)
        .delete(`/api/v1/ess/timesheets/${entryId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.success).toBe(true);

      // 3. Attempting to delete again should fail
      const repeatDelete = await request(app)
        .delete(`/api/v1/ess/timesheets/${entryId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);
      expect(repeatDelete.status).toBe(400);
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

  describe('Secure Career History (/api/v1/ess/career-history)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/ess/career-history');
      expect(res.status).toBe(401);
    });

    it('rejects non-employee users with 403', async () => {
      const res = await request(app)
        .get('/api/v1/ess/career-history')
        .set('Authorization', `Bearer ${nonEmployeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(403);
    });

    it('retrieves only authenticated employee finalized career events in deterministic order', async () => {
      const res = await request(app)
        .get('/api/v1/ess/career-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const events = res.body.data;
      expect(Array.isArray(events)).toBe(true);

      // Exactly 2 applied career events should be present (designation_change and department_change)
      expect(events.length).toBe(2);

      // Deterministic order: 2024-06-01 first, then 2024-03-01
      expect(events[0].id).toBe('act_test_desig_01');
      expect(events[0].eventType).toBe('designation_change');
      expect(events[0].eventLabel).toBe('Designation Change');
      expect(events[0].effectiveDate).toBe('2024-06-01');
      expect(events[0].previousValue).toBe('Junior Frontend Engineer');
      expect(events[0].newValue).toBe('Senior Frontend Engineer');

      expect(events[1].id).toBe('act_test_dept_01');
      expect(events[1].eventType).toBe('department_change');
      expect(events[1].eventLabel).toBe('Department Transfer');
      expect(events[1].effectiveDate).toBe('2024-03-01');
      expect(events[1].previousValue).toBe('Quality Assurance');
      expect(events[1].newValue).toBe('Engineering');
    });

    it('sanitizes display values: never leaks raw surrogate IDs or UUIDs when labels are absent', async () => {
      // Insert an action where from/to are raw IDs and fromLabel/toLabel are missing or IDs
      await getDb()
        .insert(employeeActions)
        .values({
          id: 'act_test_raw_ids_01',
          tenantId,
          companyId,
          employeeId,
          actionType: 'designation_change',
          status: 'applied',
          effectiveDate: '2025-01-01',
          reason: 'Internal test role adjustment',
          requestedBy: 'usr_test_admin',
          changeData: {
            changes: [
              {
                field: 'designationId',
                from: 'desig_raw_surrogate_old',
                to: 'c8f78d91-49b0-4f51-b844-0b4458d9241b',
                fromLabel: null,
                toLabel: 'desig_surrogate_new',
              },
            ],
          },
          appliedAt: new Date(),
        });

      const res = await request(app)
        .get('/api/v1/ess/career-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const rawIdAction = res.body.data.find((e: { id: string }) => e.id === 'act_test_raw_ids_01');
      expect(rawIdAction).toBeDefined();
      // Safe label validation returns null rather than exposing raw surrogate ID or UUID
      expect(rawIdAction.previousValue).toBeNull();
      expect(rawIdAction.newValue).toBeNull();
    });

    it('strictly excludes pending, cancelled, non-career, and other employees actions', async () => {
      const res = await request(app)
        .get('/api/v1/ess/career-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const eventIds = res.body.data.map((e: { id: string }) => e.id);

      // Excludes pending action
      expect(eventIds).not.toContain('act_test_pending_01');
      // Excludes cancelled action
      expect(eventIds).not.toContain('act_test_cancelled_01');
      // Excludes termination action (non-career action type)
      expect(eventIds).not.toContain('act_test_term_01');
      // Excludes another employee's action
      expect(eventIds).not.toContain('act_test_other_emp_01');
    });

    it('never exposes confidential HR fields (reason, requestedBy, raw change_data)', async () => {
      const res = await request(app)
        .get('/api/v1/ess/career-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.reason).toBeUndefined();
        expect(item.requestedBy).toBeUndefined();
        expect(item.cancellationReason).toBeUndefined();
        expect(item.changeData).toBeUndefined();
        expect(item.changes).toBeUndefined();
      }
    });

    it('returns empty array when employee has no applied career actions', async () => {
      await getDb().delete(employeeActions).where(eq(employeeActions.employeeId, employeeId));

      const res = await request(app)
        .get('/api/v1/ess/career-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('Bank & ID Tab Data Security, Masking & Confidentiality', () => {
    it('masks salary bank account numbers and exposes bankLocation in full profile', async () => {
      const db = getDb();
      await db
        .insert(employeeBankAccounts)
        .values({
          employeeId,
          tenantId,
          companyId,
          accountHolderName: 'Rahul Dravid',
          accountNumber: '50100456789012',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          branchName: 'MG Road Branch',
          bankLocation: 'Bengaluru, Karnataka',
        })
        .onDuplicateKeyUpdate({
          set: {
            accountNumber: '50100456789012',
            bankName: 'HDFC Bank',
            branchName: 'MG Road Branch',
            bankLocation: 'Bengaluru, Karnataka',
          },
        });

      const res = await request(app)
        .get('/api/v1/ess/profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const bank = res.body.data.bankAccount;
      expect(bank).toBeDefined();
      expect(bank.bankName).toBe('HDFC Bank');
      expect(bank.accountHolderName).toBe('Rahul Dravid');
      expect(bank.ifscCode).toBe('HDFC0001234');
      expect(bank.branchName).toBe('MG Road Branch');
      expect(bank.bankLocation).toBe('Bengaluru, Karnataka');
      expect(bank.maskedAccountNumber).toBe('••••••••9012');
      // Ensure raw accountNumber is NOT exposed as a property
      expect(bank.accountNumber).toBeUndefined();
      // Ensure full account number does not leak anywhere in HTTP response
      expect(res.text).not.toContain('50100456789012');
    });

    it('masks short bank account numbers (<=4 characters) without leaking raw digits', async () => {
      const db = getDb();
      await db
        .insert(employeeBankAccounts)
        .values({
          employeeId,
          tenantId,
          companyId,
          accountHolderName: 'Rahul Dravid',
          accountNumber: '4321',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          branchName: 'Main Branch',
          bankLocation: 'Bengaluru',
        })
        .onDuplicateKeyUpdate({
          set: {
            accountNumber: '4321',
          },
        });

      const res = await request(app)
        .get('/api/v1/ess/profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const bank = res.body.data.bankAccount;
      expect(bank).toBeDefined();
      // Masking edge-case fix: 4-digit number must be fully masked, never returned raw
      expect(bank.maskedAccountNumber).toBe('••••••••');
      expect(bank.accountNumber).toBeUndefined();
    });

    it('masks sensitive document identifiers in GET /api/v1/ess/documents', async () => {
      const db = getDb();
      // Clean up test documents
      await db.delete(employeeDocuments).where(eq(employeeDocuments.employeeId, employeeId));

      // Insert PAN, Aadhaar, Passport, UAN test documents
      for (const doc of [
        {
          id: 'doc_sec_pan_01',
          tenantId,
          companyId,
          employeeId,
          category: 'personal_identity' as const,
          documentType: 'pan',
          documentName: 'PAN Card',
          documentNumber: 'ABCDE1234F',
          status: 'verified' as const,
          fileKey: 'docs/test-pan.pdf',
          fileName: 'pan.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        {
          id: 'doc_sec_aadhaar_01',
          tenantId,
          companyId,
          employeeId,
          category: 'personal_identity' as const,
          documentType: 'aadhaar',
          documentName: 'Aadhaar Card',
          documentNumber: '987654321098',
          status: 'verified' as const,
          fileKey: 'docs/test-aadhaar.pdf',
          fileName: 'aadhaar.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
        },
        {
          id: 'doc_sec_passport_01',
          tenantId,
          companyId,
          employeeId,
          category: 'personal_identity' as const,
          documentType: 'passport',
          documentName: 'Passport',
          documentNumber: 'K1234567',
          status: 'verified' as const,
          fileKey: 'docs/test-passport.pdf',
          fileName: 'passport.pdf',
          fileSize: 3072,
          mimeType: 'application/pdf',
        },
        {
          id: 'doc_sec_uan_01',
          tenantId,
          companyId,
          employeeId,
          category: 'tax_other' as const,
          documentType: 'uan',
          documentName: 'UAN Card',
          documentNumber: '100987654321',
          status: 'verified' as const,
          fileKey: 'docs/test-uan.pdf',
          fileName: 'uan.pdf',
          fileSize: 1500,
          mimeType: 'application/pdf',
        },
      ]) {
        await db.insert(employeeDocuments).values(doc);
      }

      const res = await request(app)
        .get('/api/v1/ess/documents')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const docs = res.body.data.documents;
      expect(Array.isArray(docs)).toBe(true);

      const panDoc = docs.find((d: { id: string }) => d.id === 'doc_sec_pan_01');
      expect(panDoc).toBeDefined();
      expect(panDoc.documentNumber).toBe('••••••234F');

      const aadhaarDoc = docs.find((d: { id: string }) => d.id === 'doc_sec_aadhaar_01');
      expect(aadhaarDoc).toBeDefined();
      expect(aadhaarDoc.documentNumber).toBe('•••• •••• 1098');

      const passportDoc = docs.find((d: { id: string }) => d.id === 'doc_sec_passport_01');
      expect(passportDoc).toBeDefined();
      expect(passportDoc.documentNumber).toBe('K••••567');

      const uanDoc = docs.find((d: { id: string }) => d.id === 'doc_sec_uan_01');
      expect(uanDoc).toBeDefined();
      expect(uanDoc.documentNumber).toBe('••••••••4321');

      // Ensure raw sensitive strings do not leak anywhere in JSON output
      expect(res.text).not.toContain('ABCDE1234F');
      expect(res.text).not.toContain('987654321098');
      expect(res.text).not.toContain('100987654321');
    });

    it('omits internal verification remarks unless resubmission or correction is required', async () => {
      const db = getDb();
      await db.delete(employeeDocuments).where(eq(employeeDocuments.employeeId, employeeId));

      for (const doc of [
        {
          id: 'doc_remarks_verified',
          tenantId,
          companyId,
          employeeId,
          category: 'personal_identity' as const,
          documentName: 'Verified Govt ID',
          documentNumber: 'ID99998888',
          status: 'verified' as const,
          verificationRemarks: 'Confidential Internal HR remark: NSDL audit approved',
          fileKey: 'docs/test-v.pdf',
          fileName: 'v.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        {
          id: 'doc_remarks_resubmit',
          tenantId,
          companyId,
          employeeId,
          category: 'personal_identity' as const,
          documentName: 'Rejected ID',
          documentNumber: 'ID77776666',
          status: 'resubmission_required' as const,
          verificationRemarks: 'Document copy is blurry; please re-upload clear color scan.',
          fileKey: 'docs/test-r.pdf',
          fileName: 'r.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
      ]) {
        await db.insert(employeeDocuments).values(doc);
      }

      const res = await request(app)
        .get('/api/v1/ess/documents')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const docs = res.body.data.documents;
      expect(Array.isArray(docs)).toBe(true);

      const verifiedDoc = docs.find((d: { id: string }) => d.id === 'doc_remarks_verified');
      expect(verifiedDoc.verificationRemarks).toBeNull();
      expect(res.text).not.toContain('Confidential Internal HR remark');

      const resubmitDoc = docs.find((d: { id: string }) => d.id === 'doc_remarks_resubmit');
      expect(resubmitDoc.verificationRemarks).toBe(
        'Document copy is blurry; please re-upload clear color scan.',
      );
    });

    it('strictly isolates documents: non-employee or another employee cannot read records', async () => {
      // Attempt to access documents without auth
      const noAuthRes = await request(app)
        .get('/api/v1/ess/documents')
        .set('X-Company-Id', companyId);
      expect(noAuthRes.status).toBe(401);

      // Attempt to access with non-employee token
      const nonEmpRes = await request(app)
        .get('/api/v1/ess/documents')
        .set('Authorization', `Bearer ${nonEmployeeToken}`)
        .set('X-Company-Id', companyId);
      expect(nonEmpRes.status).toBe(403);
    });
  });

  describe('ESS Profile Change Requests (Tab V1 API)', () => {
    it('blocks generic bank account modification with a clear statutory verification error', async () => {
      const res = await request(app)
        .post('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          subject: 'Change salary account',
          section: 'bank_account',
          reason: 'Switched primary salary bank',
          changes: {
            field: 'accountNumber',
            proposedValue: '123456789012',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message || res.body.message).toContain(
        'Bank account modifications cannot be submitted through generic change requests',
      );
    });

    it('rejects disallowed field keys for specified section', async () => {
      const res = await request(app)
        .post('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          subject: 'Arbitrary modification',
          section: 'personal',
          reason: 'Testing validation',
          changes: {
            field: 'unauthorized_internal_field',
            proposedValue: 'bad_value',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message || res.body.message).toContain('Invalid field key');
    });

    it('successfully creates a valid personal profile change request', async () => {
      const res = await request(app)
        .post('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          subject: 'Correction Request: Legal Full Name',
          section: 'personal',
          reason: 'Correcting legal name to match passport',
          changes: {
            field: 'name',
            fieldLabel: 'Legal Full Name',
            proposedValue: 'Arjun M. Mehta',
          },
        });

      expect(res.status).toBe(201);
      const reqData = res.body.data;
      expect(reqData.id).toBeDefined();
      expect(reqData.status).toBe('pending');
      expect(reqData.subject).toBe('Correction Request: Legal Full Name');
      expect(reqData.section).toBe('personal');
      expect(reqData.reason).toBe('Correcting legal name to match passport');
      expect(reqData.changes?.proposedValue).toBe('Arjun M. Mehta');
    });

    it('returns safe projected DTOs on GET change-requests without internal database IDs', async () => {
      const res = await request(app)
        .get('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      const list = res.body.data;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);

      const firstItem = list[0];
      expect(firstItem.id).toBeDefined();
      expect(firstItem.status).toBeDefined();
      expect(firstItem.subject).toBeDefined();

      // Ensure internal DB metadata is stripped from egress
      expect(firstItem).not.toHaveProperty('tenantId');
      expect(firstItem).not.toHaveProperty('companyId');
      expect(firstItem).not.toHaveProperty('employeeId');
      expect(firstItem).not.toHaveProperty('reviewedByUserId');
    });

    it('cancels a pending change request and rejects cancelling an already cancelled request', async () => {
      // 1. Create a request to cancel
      const createRes = await request(app)
        .post('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          subject: 'Correction Request: Residential Street Address',
          section: 'address',
          reason: 'Moving to new apartment next month',
          changes: {
            field: 'addressStreet',
            proposedValue: 'Flat 402, Green Meadows',
          },
        });

      expect(createRes.status).toBe(201);
      const requestId = createRes.body.data.id;

      // 2. Cancel it
      const cancelRes = await request(app)
        .post(`/api/v1/ess/requests/${requestId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');

      // 3. Attempting to cancel again should fail
      const cancelAgainRes = await request(app)
        .post(`/api/v1/ess/requests/${requestId}/cancel`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(cancelAgainRes.status).toBe(409);
      expect(cancelAgainRes.body.error?.message || cancelAgainRes.body.message).toContain(
        "Cannot cancel request with status 'cancelled'",
      );
    });

    it('enforces isolation: rejects unauthenticated or non-employee requests', async () => {
      const noAuthRes = await request(app)
        .get('/api/v1/ess/profile/change-requests')
        .set('X-Company-Id', companyId);
      expect(noAuthRes.status).toBe(401);

      const nonEmpRes = await request(app)
        .get('/api/v1/ess/profile/change-requests')
        .set('Authorization', `Bearer ${nonEmployeeToken}`)
        .set('X-Company-Id', companyId);
      expect(nonEmpRes.status).toBe(403);
    });
  });
});
