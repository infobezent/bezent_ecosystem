import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  attendanceOvertimePolicies,
  attendanceOvertimeRequests,
  attendanceOvertimeSettlements,
  employeeAttendance,
  employees,
  memberships,
  roleAssignments,
  users,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import {
  hrmsTestHeaders,
  signInForTest,
} from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Attendance Overtime V1.0 API Acceptance, Lifecycle & Settlement Suite',
  () => {
    const app = createApp();
    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';

    let headers: Record<string, string>;
    let reviewerHeaders: Record<string, string>;
    const empId = 'emp_ot_audit_001';
    const reviewerEmpId = 'emp_ot_reviewer_001';
    const reviewerUserId = 'usr_ot_reviewer_operator';
    const reviewerEmail = 'ot.reviewer@bezent-test.example';
    const testDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let testRequestId: string;
    let testSettlementId: string;

    beforeAll(async () => {
      headers = await hrmsTestHeaders(companyId, tenantId);
      const db = getDb();

      // Clean up test records
      await db
        .delete(attendanceOvertimeSettlements)
        .where(eq(attendanceOvertimeSettlements.employeeId, empId));
      await db
        .delete(attendanceOvertimeRequests)
        .where(eq(attendanceOvertimeRequests.employeeId, empId));
      await db.delete(employeeAttendance).where(eq(employeeAttendance.employeeId, empId));

      // Ensure test employee exists
      const existingEmp = await db.select().from(employees).where(eq(employees.id, empId));
      if (existingEmp.length === 0) {
        await db.insert(employees).values({
          id: empId,
          tenantId,
          companyId,
          employeeNumber: 'EMP-OT-001',
          firstName: 'Siddharth',
          lastName: 'Rao',
          email: 'siddharth.rao@example.com',
          joiningDate: '2024-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        });
      }

      // Ensure reviewer user exists with hr_manager permissions
      const unused = hashPassword('not-used-by-otp');
      await db.insert(users).ignore().values({
        id: reviewerUserId,
        email: reviewerEmail,
        passwordHash: unused.hash,
        salt: unused.salt,
        firstName: 'OT',
        lastName: 'Reviewer',
      });

      await db
        .insert(memberships)
        .values({
          id: `mem_ot_rev_${companyId}`.slice(0, 64),
          userId: reviewerUserId,
          tenantId,
          companyId,
          role: 'hr_manager',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(roleAssignments)
        .values({
          id: `ra_ot_rev_${companyId}`.slice(0, 64),
          userId: reviewerUserId,
          roleId: 'role_sys_hr_manager',
          tenantId,
          companyId,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      const reviewerToken = (await signInForTest(reviewerEmail)).token;
      reviewerHeaders = { authorization: `Bearer ${reviewerToken}`, 'x-company-id': companyId };

      // Ensure reviewer employee exists
      const existingRev = await db.select().from(employees).where(eq(employees.id, reviewerEmpId));
      if (existingRev.length === 0) {
        await db.insert(employees).values({
          id: reviewerEmpId,
          tenantId,
          companyId,
          userId: reviewerUserId,
          employeeNumber: 'EMP-OT-REV',
          firstName: 'Ananya',
          lastName: 'Iyer',
          email: reviewerEmail,
          joiningDate: '2024-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        });
      }

      // Ensure test daily attendance record exists: 600 minutes worked (480 sched + 120 extra)
      await db.insert(employeeAttendance).values({
        id: 'att_ot_rec_001',
        tenantId,
        companyId,
        employeeId: empId,
        date: testDate,
        workedMinutes: 600,
        status: 'present',
        processingState: 'finalized',
        isMissingPunch: false,
        isRegularized: false,
        shiftScheduleRef: 'shift_standard_8h',
        calculationMetadata: { scheduledMinutes: 480 },
      });

      // Ensure default policy is active
      const polExists = await db
        .select()
        .from(attendanceOvertimePolicies)
        .where(eq(attendanceOvertimePolicies.id, 'att_ot_pol_demo_01'));

      if (polExists.length === 0) {
        await db.insert(attendanceOvertimePolicies).values({
          id: 'att_ot_pol_demo_01',
          tenantId,
          companyId,
          policyName: 'Standard Overtime Policy',
          version: 1,
          status: 'published',
          effectiveFrom: '2024-01-01',
          isEnabled: true,
          eligibleEmploymentTypes: ['full_time'],
          workdayEligibility: { regularWorkday: true, weeklyOff: true, holiday: true },
          minimumQualifyingMinutes: 60,
          dailyCapMinutes: 240,
          weeklyCapMinutes: 720,
          monthlyCapMinutes: 2400,
          roundingRule: 'round_down_15',
          submissionWindowDays: 14,
          allowPayable: true,
          allowCompOff: true,
          isActive: true,
        });
      }
    });

    it('1. GET /hrms/attendance/overtime/eligibility verifies workday attendance & eligible duration', async () => {
      const res = await request(app)
        .get(
          `/api/v1/hrms/attendance/overtime/eligibility?employeeId=${empId}&workDate=${testDate}`,
        )
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calculation.isEligible).toBe(true);
      expect(res.body.data.calculation.extraWorkedMinutes).toBe(120);
      expect(res.body.data.calculation.eligibleOtMinutes).toBe(120);
    });

    it('2. POST /hrms/attendance/overtime/requests submits an overtime claim', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/overtime/requests')
        .set(headers)
        .send({
          employeeId: empId,
          workDate: testDate,
          requestedOtMinutes: 120,
          reason: 'Emergency server patching and database migration support',
          sourceIntervals: [{ startTime: '18:00', endTime: '20:00', durationMinutes: 120 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requestNumber).toMatch(/^OT-\d{4}-\d{5}$/);
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.requestedOtMinutes).toBe(120);
      expect(res.body.data.eligibleOtMinutes).toBe(120);

      testRequestId = res.body.data.id;
    });

    it('3. Prevents duplicate active overtime claims for the same workday', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/overtime/requests')
        .set(headers)
        .send({
          employeeId: empId,
          workDate: testDate,
          requestedOtMinutes: 60,
          reason: 'Duplicate claim attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain(
        'Multiple active claims for the same date are prohibited',
      );
    });

    it('4. Rejects claims exceeding calculated eligible duration', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/overtime/requests')
        .set(headers)
        .send({
          employeeId: empId,
          workDate: '2026-10-09',
          requestedOtMinutes: 300,
          reason: 'Excessive duration attempt',
        });

      expect(res.status).toBe(400);
    });

    it('5. GET /hrms/attendance/overtime/overview returns accurate operational metrics', async () => {
      const res = await request(app).get('/api/v1/hrms/attendance/overtime/overview').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRequests).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pendingApprovalCount).toBeGreaterThanOrEqual(1);
    });

    it('6. POST /hrms/attendance/overtime/requests/:id/decision blocks requester self-approval with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/overtime/requests/${testRequestId}/decision`)
        .set(headers)
        .send({
          decision: 'approved',
          approvedOtMinutes: 120,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Self-approval violation');
    });

    it('7. POST /hrms/attendance/overtime/requests/:id/decision enforces optimistic concurrency', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/overtime/requests/${testRequestId}/decision`)
        .set(reviewerHeaders)
        .send({
          decision: 'approved',
          approvedOtMinutes: 120,
          expectedVersion: 999, // wrong version
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('modified by another transaction');
    });

    it('8. POST /hrms/attendance/overtime/requests/:id/decision approves claim and creates entitlement', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/overtime/requests/${testRequestId}/decision`)
        .set(reviewerHeaders)
        .send({
          decision: 'approved',
          approvedOtMinutes: 120,
          reviewNotes: 'Authorized by department manager',
          expectedVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.approvedOtMinutes).toBe(120);
      expect(res.body.data.unallocatedMinutes).toBe(120);
      expect(res.body.data.settlementStatus).toBe('unallocated');
    });

    it('9. POST /hrms/attendance/overtime/requests/:id/settle allocates approved OT towards Payable & Comp-Off', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/overtime/requests/${testRequestId}/settle`)
        .set(reviewerHeaders)
        .send({
          payableMinutes: 60,
          compOffMinutes: 60,
          notes: '50-50 split between cash payout and comp-off bank',
          batchReference: 'BATCH-2026-OCT-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allocatedPayableMinutes).toBe(60);
      expect(res.body.data.allocatedCompOffMinutes).toBe(60);
      expect(res.body.data.unallocatedMinutes).toBe(0);
      expect(res.body.data.settlementStatus).toBe('pending_handoff');
    });

    it('10. Prevents over-allocation beyond approved entitlement', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/overtime/requests/${testRequestId}/settle`)
        .set(reviewerHeaders)
        .send({
          payableMinutes: 30,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('exceeds remaining unallocated approved balance');
    });

    it('11. GET /hrms/attendance/overtime/settlements lists handoff records', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/overtime/settlements')
        .set(reviewerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const payableSet = res.body.data.find(
        (s: { allocationType?: string; status?: string; id?: string }) =>
          s.allocationType === 'payable',
      );
      expect(payableSet).toBeDefined();
      expect(payableSet.status).toBe('pending_handoff');
      testSettlementId = payableSet.id;
    });

    it('12. POST /hrms/attendance/overtime/settlements/:id/reverse rolls back allocation and restores unallocated minutes', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/overtime/settlements/${testSettlementId}/reverse`)
        .set(reviewerHeaders)
        .send({
          reversalReason: 'Payroll cut-off adjustment requested by finance',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allocatedPayableMinutes).toBe(0);
      expect(res.body.data.unallocatedMinutes).toBe(60); // restored!
      expect(res.body.data.settlementStatus).toBe('partially_allocated');
    });

    it('13. GET /hrms/attendance/overtime/requests/:id includes immutable audit log', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/overtime/requests/${testRequestId}`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.audits).toBeDefined();
      const actions = res.body.data.audits.map((a: { action: string }) => a.action);
      expect(actions).toContain('REQUEST_SUBMITTED');
      expect(actions).toContain('DECISION_APPROVED');
      expect(actions).toContain('SETTLEMENT_ALLOCATED');
      expect(actions).toContain('SETTLEMENT_REVERSED');
    });
  },
);
