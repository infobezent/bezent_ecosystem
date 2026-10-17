import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
  attendanceRegularizations,
  attendanceRegularizationAudits,
  attendanceAdjustments,
  attendancePeriods,
  employeeRequests,
  attendanceRegularizationSettings,
} from '../../../../db/schema.js';
import { generateSurrogateId, hashPassword } from '../../../../platform/auth/security.js';
import {
  hrmsTestHeaders,
  signInForTest,
  removeHrmsTestAccess,
} from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS Attendance — Phase 3: Canonical Regularization Integration',
  () => {
    const app = createApp();

    const tenantId = 'tent_reg_p3_01';
    const companyId = 'comp_reg_p3_01';
    const employeeId = 'emp_reg_p3_01';
    const otherEmployeeId = 'emp_reg_p3_02';
    const hrUserId = 'usr_reg_p3_hr';
    const empUserId = 'usr_reg_p3_emp';
    const otherUserId = 'usr_reg_p3_other';

    let hrHeaders: Record<string, string>;
    let employeeToken: string;
    let otherEmployeeToken: string;

    const isoDaysAgo = (days: number): string => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - days);
      return d.toISOString().slice(0, 10);
    };

    const isoDaysFuture = (days: number): string => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };

    beforeAll(async () => {
      const db = getDb();

      // 1. Tenant & Company
      await db
        .insert(tenants)
        .values({
          id: tenantId,
          name: 'Phase 3 Reg Tenant',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(companies)
        .values({
          id: companyId,
          tenantId,
          name: 'Phase 3 Reg Company',
          code: 'REGCOMP',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 2. Users
      const pwd = hashPassword('TestP3Pass!123');

      await db
        .insert(users)
        .values({
          id: hrUserId,
          email: 'hr_reg_p3@test.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Ananya',
          lastName: 'HR',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(users)
        .values({
          id: empUserId,
          email: 'ess_reg_p3@test.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Vikram',
          lastName: 'Aditya',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(users)
        .values({
          id: otherUserId,
          email: 'other_reg_p3@test.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Sunita',
          lastName: 'Williams',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 3. Employees
      await db
        .insert(employees)
        .values({
          id: employeeId,
          tenantId,
          companyId,
          userId: empUserId,
          employeeNumber: 'EMP-P3-001',
          firstName: 'Vikram',
          lastName: 'Aditya',
          email: 'ess_reg_p3@test.example',
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

      await db
        .insert(employees)
        .values({
          id: otherEmployeeId,
          tenantId,
          companyId,
          userId: otherUserId,
          employeeNumber: 'EMP-P3-002',
          firstName: 'Sunita',
          lastName: 'Williams',
          email: 'other_reg_p3@test.example',
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

      // 4. Memberships
      await db
        .insert(memberships)
        .values({
          id: 'mem_p3_hr',
          tenantId,
          companyId,
          userId: hrUserId,
          role: 'company_admin',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(memberships)
        .values({
          id: 'mem_p3_emp',
          tenantId,
          companyId,
          userId: empUserId,
          role: 'employee',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(memberships)
        .values({
          id: 'mem_p3_other',
          tenantId,
          companyId,
          userId: otherUserId,
          role: 'employee',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 5. Regularization Settings (generous quota to allow all test scenarios)
      await db
        .insert(attendanceRegularizationSettings)
        .values({
          id: generateSurrogateId('regset'),
          tenantId,
          companyId,
          isEnabled: true,
          submissionWindowDays: 30,
          maxRequestsPerMonth: 20,
          requireReason: true,
          blockOnPayrollLock: true,
        })
        .onDuplicateKeyUpdate({
          set: {
            isEnabled: true,
            submissionWindowDays: 30,
            maxRequestsPerMonth: 20,
            requireReason: true,
            blockOnPayrollLock: true,
          },
        });

      // 6. Clean prior test artifacts
      await db
        .delete(attendanceRegularizations)
        .where(
          and(
            eq(attendanceRegularizations.tenantId, tenantId),
            eq(attendanceRegularizations.companyId, companyId),
          ),
        );
      await db
        .delete(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
          ),
        );
      await db
        .delete(employeeRequests)
        .where(
          and(eq(employeeRequests.tenantId, tenantId), eq(employeeRequests.companyId, companyId)),
        );

      // 7. Auth Tokens & Headers
      hrHeaders = await hrmsTestHeaders(companyId, tenantId);
      const empLogin = await signInForTest('ess_reg_p3@test.example');
      employeeToken = empLogin.token;
      const otherLogin = await signInForTest('other_reg_p3@test.example');
      otherEmployeeToken = otherLogin.token;
    });

    afterAll(async () => {
      await removeHrmsTestAccess([companyId]);
    });

    let createdRegId: string;
    let createdRegNumber: string;
    const workday1 = isoDaysAgo(3);
    const workday2 = isoDaysAgo(4);
    const workday3 = isoDaysAgo(5);

    it('1. Successfully submits ESS request into attendance_regularizations with canonical fields', async () => {
      const res = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: workday1,
          checkInTime: '09:15',
          checkOutTime: '18:15',
          reason: 'Biometric fingerprint scanner reader malfunction',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.requestNumber).toMatch(/^REG-\d{4}-\d{5}$/);
      expect(res.body.data.workday).toBe(workday1);
      expect(res.body.data.approvalStatus).toBe('submitted');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.applicationStatus).toBe('not_applicable');
      expect(res.body.data.reason).toBe('Biometric fingerprint scanner reader malfunction');

      createdRegId = res.body.data.id;
      createdRegNumber = res.body.data.requestNumber;

      // Verify DB persistence in attendance_regularizations
      const db = getDb();
      const [persisted] = await db
        .select()
        .from(attendanceRegularizations)
        .where(eq(attendanceRegularizations.id, createdRegId))
        .limit(1);

      expect(persisted).toBeDefined();
      expect(persisted!.source).toBe('ess');
      expect(persisted!.tenantId).toBe(tenantId);
      expect(persisted!.companyId).toBe(companyId);
      expect(persisted!.employeeId).toBe(employeeId);
      expect(persisted!.workday).toBe(workday1);
      expect(persisted!.approvalStatus).toBe('submitted');

      // Verify audit record creation
      const [audit] = await db
        .select()
        .from(attendanceRegularizationAudits)
        .where(eq(attendanceRegularizationAudits.regularizationId, createdRegId))
        .limit(1);

      expect(audit).toBeDefined();
      expect(audit!.action).toBe('submitted');
    });

    it('2. HR can view the ESS-submitted request in canonical HR attendance regularization workspace', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/regularization/workspace')
        .set(hrHeaders);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((r: { id: string }) => r.id === createdRegId);
      expect(found).toBeDefined();
      expect(found.requestNumber).toBe(createdRegNumber);
      expect(found.employeeId).toBe(employeeId);
      expect(found.source).toBe('ess');
      expect(found.workday).toBe(workday1);
      expect(found.approvalStatus).toBe('submitted');
    });

    it('3. HR approves the request, applying adjustment and updating daily attendance record', async () => {
      const db = getDb();

      // Seed initial daily attendance record for workday1
      const attId = generateSurrogateId('adly');
      await db
        .insert(employeeAttendance)
        .values({
          id: attId,
          tenantId,
          companyId,
          employeeId,
          date: workday1,
          status: 'absent',
          isRegularized: false,
          workedMinutes: 0,
        })
        .onDuplicateKeyUpdate({
          set: { status: 'absent', isRegularized: false },
        });

      const res = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${createdRegId}/decision`)
        .set(hrHeaders)
        .send({
          decision: 'approved',
          reason: 'Verified with manager and physical register',
        });

      expect(res.status).toBe(200);

      // Fetch updated detail
      const detailRes = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${createdRegId}`)
        .set(hrHeaders);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.approvalStatus).toBe('approved');
      expect(detailRes.body.data.applicationStatus).toBe('applied');

      // Verify DB: attendance_adjustments created
      const [adjustment] = await db
        .select()
        .from(attendanceAdjustments)
        .where(eq(attendanceAdjustments.regularizationId, createdRegId))
        .limit(1);

      expect(adjustment).toBeDefined();
      expect(adjustment!.tenantId).toBe(tenantId);
      expect(adjustment!.companyId).toBe(companyId);
      expect(adjustment!.employeeId).toBe(employeeId);
      expect(adjustment!.adjustmentType).toBe('incorrect_time');

      // Verify DB: employee_attendance updated with isRegularized: true
      const [updatedAtt] = await db
        .select()
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            eq(employeeAttendance.employeeId, employeeId),
            eq(employeeAttendance.date, workday1),
          ),
        )
        .limit(1);

      expect(updatedAtt).toBeDefined();
      expect(updatedAtt!.isRegularized).toBe(true);
      expect(updatedAtt!.status).toBe('present');
    });

    let rejectedRegId: string;

    it('4. Rejection flow leaves attendance unadjusted and marks request as rejected', async () => {
      const db = getDb();

      // 1. Submit second request for workday2
      const submitRes = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: workday2,
          checkInTime: '09:00',
          checkOutTime: '17:00',
          reason: 'Client meeting offsite',
        });

      expect(submitRes.status).toBe(201);
      rejectedRegId = submitRes.body.data.id;

      // Seed initial daily attendance for workday2
      await db
        .insert(employeeAttendance)
        .values({
          id: generateSurrogateId('adly'),
          tenantId,
          companyId,
          employeeId,
          date: workday2,
          status: 'absent',
          isRegularized: false,
        })
        .onDuplicateKeyUpdate({ set: { status: 'absent', isRegularized: false } });

      // 2. HR rejects request
      const reviewRes = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${rejectedRegId}/decision`)
        .set(hrHeaders)
        .send({
          decision: 'rejected',
          reason: 'No client meeting pre-approval on file',
        });

      expect(reviewRes.status).toBe(200);

      // Detail check
      const detailRes = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${rejectedRegId}`)
        .set(hrHeaders);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.approvalStatus).toBe('rejected');
      expect(detailRes.body.data.applicationStatus).toBe('not_applicable');

      // Verify DB: attendance record remains untouched (isRegularized: false)
      const [att] = await db
        .select()
        .from(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.companyId, companyId),
            eq(employeeAttendance.employeeId, employeeId),
            eq(employeeAttendance.date, workday2),
          ),
        )
        .limit(1);

      expect(att).toBeDefined();
      expect(att!.isRegularized).toBe(false);
      expect(att!.status).toBe('absent');

      // Verify DB: no adjustment created
      const [adj] = await db
        .select()
        .from(attendanceAdjustments)
        .where(eq(attendanceAdjustments.regularizationId, rejectedRegId))
        .limit(1);

      expect(adj).toBeUndefined();
    });

    it('5. Exposes employee-scoped request history with safe DTO', async () => {
      const res = await request(app)
        .get('/api/v1/ess/attendance/regularizations')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const approvedItem = res.body.data.find((r: { id: string }) => r.id === createdRegId);
      expect(approvedItem).toBeDefined();
      expect(approvedItem.requestNumber).toBe(createdRegNumber);
      expect(approvedItem.workday).toBe(workday1);
      expect(approvedItem.approvalStatus).toBe('approved');
      expect(approvedItem.applicationStatus).toBe('applied');
      expect(approvedItem.decisionRemarks).toBe('Verified with manager and physical register');

      const rejectedItem = res.body.data.find((r: { id: string }) => r.id === rejectedRegId);
      expect(rejectedItem).toBeDefined();
      expect(rejectedItem.approvalStatus).toBe('rejected');
      expect(rejectedItem.decisionRemarks).toBe('No client meeting pre-approval on file');

      // Verify safe DTO doesn't expose internal reviewer identity or system internal keys
      for (const item of res.body.data) {
        expect(item).not.toHaveProperty('reviewerUserId');
        expect(item).not.toHaveProperty('decidedByUserId');
      }
    });

    it('6. Prevents duplicate or conflicting pending requests for the same workday', async () => {
      // 1. Submit request for workday3
      const res1 = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: workday3,
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'Work from remote office',
        });

      expect(res1.status).toBe(201);

      // 2. Submit second request for the same workday3 while pending
      const res2 = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: workday3,
          checkInTime: '09:30',
          checkOutTime: '18:30',
          reason: 'Duplicate submission attempt',
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error.message).toMatch(
        /active regularization request is already pending or approved/i,
      );
    });

    it('7. Rejects submission for a locked or finalized payroll period', async () => {
      const db = getDb();
      const periodId = generateSurrogateId('prd');

      // Create a locked period
      await db
        .insert(attendancePeriods)
        .values({
          id: periodId,
          tenantId,
          companyId,
          periodCode: '2026-07-LOCKED',
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          status: 'locked',
          lockedAt: new Date(),
        })
        .onDuplicateKeyUpdate({ set: { status: 'locked' } });

      const res = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: '2026-07-15',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'Attempting to regularize in locked payroll month',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/locked|finalized|ineligible/i);
    });

    it('8. Rejects invalid workday and invalid correction inputs', async () => {
      // Bad date format
      const resBadDate = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: '15/10/2026',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'Bad date format',
        });
      expect(resBadDate.status).toBe(400);

      // Future workday
      const resFuture = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: isoDaysFuture(5),
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'Future date attempt',
        });
      expect(resFuture.status).toBe(400);
      expect(resFuture.body.error.message).toMatch(/future/i);

      // Missing reason
      const resNoReason = await request(app)
        .post('/api/v1/ess/attendance/regularize')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', companyId)
        .send({
          date: isoDaysAgo(6),
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: '',
        });
      expect(resNoReason.status).toBe(400);
      expect(resNoReason.body.error.message).toMatch(/reason is required/i);
    });

    it('9. Enforces cross-tenant and cross-employee isolation', async () => {
      // Other employee cannot see employeeId's regularizations
      const resOther = await request(app)
        .get('/api/v1/ess/attendance/regularizations')
        .set('Authorization', `Bearer ${otherEmployeeToken}`)
        .set('X-Company-Id', companyId);

      expect(resOther.status).toBe(200);
      const hasEmployeeIdRecords = resOther.body.data.some(
        (r: { id: string }) => r.id === createdRegId || r.id === rejectedRegId,
      );
      expect(hasEmployeeIdRecords).toBe(false);

      // Submitting with mismatched / non-existent company header fails
      const resCrossCompany = await request(app)
        .get('/api/v1/ess/attendance/regularizations')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Company-Id', 'comp_foreign_999');

      expect([401, 403]).toContain(resCrossCompany.status);
    });

    it('10. Confirms ZERO legacy employee_requests entries were created for attendance regularizations', async () => {
      const db = getDb();
      const legacyRequests = await db
        .select()
        .from(employeeRequests)
        .where(
          and(
            eq(employeeRequests.tenantId, tenantId),
            eq(employeeRequests.companyId, companyId),
            eq(employeeRequests.requestType, 'attendance_regularization'),
          ),
        );

      expect(legacyRequests.length).toBe(0);
    });

    it('11. Existing HR direct regularization workflow remains functional without regression', async () => {
      const hrDirectWorkday = isoDaysAgo(7);

      // Direct submission via HR API
      const res = await request(app)
        .post('/api/v1/hrms/attendance/regularization')
        .set(hrHeaders)
        .send({
          employeeId,
          workday: hrDirectWorkday,
          requestType: 'incorrect_time',
          proposedCheckIn: '09:30',
          proposedCheckOut: '18:30',
          reason: 'HR admin adjustment for system downtime',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.source).toBe('web');
      expect(res.body.data.approvalStatus).toBe('submitted');

      // HR reviews and approves
      const reviewRes = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${res.body.data.id}/decision`)
        .set(hrHeaders)
        .send({
          decision: 'approved',
          reason: 'System outage verified by IT',
        });

      expect(reviewRes.status).toBe(200);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${res.body.data.id}`)
        .set(hrHeaders);

      expect(detail.body.data.approvalStatus).toBe('approved');
    });
  },
);
