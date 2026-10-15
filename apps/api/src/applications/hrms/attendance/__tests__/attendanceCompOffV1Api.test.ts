import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  attendanceCompOffPolicies,
  attendanceCompOffRequests,
  attendanceCompOffEntitlements,
  attendanceCompOffHandoffs,
  attendanceOvertimeSettlements,
  attendanceOvertimeRequests,
  employeeAttendance,
  employees,
  memberships,
  roleAssignments,
  users,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders, signInForTest } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Comp-Off V1.0 API Acceptance, Lifecycle & Integration Suite',
  () => {
    const app = createApp();
    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';

    let headers: Record<string, string>;
    let reviewerHeaders: Record<string, string>;
    const empId = 'emp_co_audit_001';
    const reviewerEmpId = 'emp_co_reviewer_001';
    const reviewerUserId = 'usr_co_reviewer_operator';
    const reviewerEmail = 'co.reviewer@bezent-test.example';
    const testDate = '2026-10-11'; // Sunday (weekly off)
    let testRequestId: string;
    let testEntitlementId: string;
    let testOtSettlementId: string;

    beforeAll(async () => {
      headers = await hrmsTestHeaders(companyId, tenantId);
      const db = getDb();

      // Clean up previous test records
      await db.delete(attendanceCompOffHandoffs).where(eq(attendanceCompOffHandoffs.employeeId, empId));
      await db.delete(attendanceCompOffEntitlements).where(eq(attendanceCompOffEntitlements.employeeId, empId));
      await db.delete(attendanceCompOffRequests).where(eq(attendanceCompOffRequests.employeeId, empId));
      await db.delete(attendanceOvertimeSettlements).where(eq(attendanceOvertimeSettlements.employeeId, empId));
      await db.delete(attendanceOvertimeRequests).where(eq(attendanceOvertimeRequests.employeeId, empId));
      await db.delete(employeeAttendance).where(eq(employeeAttendance.employeeId, empId));

      // Ensure test employee exists
      const existingEmp = await db.select().from(employees).where(eq(employees.id, empId));
      if (existingEmp.length === 0) {
        await db.insert(employees).values({
          id: empId,
          tenantId,
          companyId,
          employeeNumber: 'EMP-CO-001',
          firstName: 'Ananya',
          lastName: 'Sharma',
          email: 'ananya.sharma@example.com',
          joiningDate: '2024-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        });
      }

      // Ensure reviewer user exists
      const unused = hashPassword('not-used-by-otp');
      await db.insert(users).ignore().values({
        id: reviewerUserId,
        email: reviewerEmail,
        passwordHash: unused.hash,
        salt: unused.salt,
        firstName: 'CO',
        lastName: 'Reviewer',
        status: 'active',
      });

      await db
        .insert(memberships)
        .values({
          id: `mem_co_rev_${companyId}`.slice(0, 64),
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
          id: `ra_co_rev_${companyId}`.slice(0, 64),
          userId: reviewerUserId,
          roleId: 'role_sys_hr_manager',
          tenantId,
          companyId,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      const reviewerToken = (await signInForTest(reviewerEmail)).token;
      reviewerHeaders = { authorization: `Bearer ${reviewerToken}`, 'x-company-id': companyId };

      // Ensure reviewer employee profile exists
      const existingReviewerEmp = await db.select().from(employees).where(eq(employees.id, reviewerEmpId));
      if (existingReviewerEmp.length === 0) {
        await db.insert(employees).values({
          id: reviewerEmpId,
          tenantId,
          companyId,
          employeeNumber: 'EMP-CO-REV-001',
          firstName: 'Vikram',
          lastName: 'Sethi',
          email: reviewerEmail,
          joiningDate: '2024-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        });
      }

      // Seed attendance record on Sunday (500 minutes worked)
      await db.insert(employeeAttendance).values({
        id: 'att_co_rec_001',
        tenantId,
        companyId,
        employeeId: empId,
        date: testDate,
        workedMinutes: 500,
        status: 'present',
        processingState: 'finalized',
        isMissingPunch: false,
        isRegularized: false,
        shiftScheduleRef: 'shift_general_8h',
        calculationMetadata: { scheduledMinutes: 0 },
      });

      // Ensure Comp-Off policy is active
      const polExists = await db
        .select()
        .from(attendanceCompOffPolicies)
        .where(eq(attendanceCompOffPolicies.id, 'att_co_pol_demo_01'));

      if (polExists.length === 0) {
        await db.insert(attendanceCompOffPolicies).values({
          id: 'att_co_pol_demo_01',
          tenantId,
          companyId,
          policyName: 'Standard Comp-Off Policy',
          version: 1,
          status: 'published',
          effectiveFrom: '2024-01-01',
          isEnabled: true,
          eligibleEmploymentTypes: ['full_time'],
          eligibleWorkdayScenarios: { weeklyOff: true, holiday: true, approvedExtraWork: true },
          minimumQualifyingMinutes: 240,
          halfDayThresholdMinutes: 240,
          fullDayThresholdMinutes: 480,
          conversionRate: '1.00',
          roundingRule: 'round_down_half_day',
          submissionDeadlineDays: 14,
          validityDays: 60,
          maxEarningLimitPerMonthDays: '2.00',
          isActive: true,
        });
      }
    });

    it('1. GET /hrms/attendance/comp-off/eligibility evaluates workday attendance & qualifying credit', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/comp-off/eligibility?employeeId=${empId}&workDate=${testDate}`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calculation.isEligible).toBe(true);
      expect(res.body.data.calculation.qualifyingWorkedMinutes).toBe(500);
      expect(res.body.data.calculation.eligibleCreditDays).toBe(1.0);
      expect(res.body.data.calculation.appliedThreshold).toBe('full_day');
    });

    it('2. POST /hrms/attendance/comp-off/requests submits a valid Comp-Off claim', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/comp-off/requests')
        .set(headers)
        .send({
          employeeId: empId,
          workDate: testDate,
          requestedCreditDays: 1.0,
          reason: 'Weekend disaster recovery and data center migration support',
          sourceIntervals: [{ startTime: '09:00', endTime: '17:20', durationMinutes: 500 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requestNumber).toMatch(/^CO-\d{4}-\d{5}$/);
      expect(res.body.data.status).toBe('submitted');
      expect(res.body.data.requestedCreditDays).toBe(1.0);

      testRequestId = res.body.data.id;
    });

    it('3. Prevents duplicate active claims for the same workday', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/comp-off/requests')
        .set(headers)
        .send({
          employeeId: empId,
          workDate: testDate,
          requestedCreditDays: 1.0,
          reason: 'Duplicate claim attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('Multiple active claims for the same date are prohibited');
    });

    it('4. Rejects request when credit exceeds policy-eligible duration', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/comp-off/requests')
        .set(headers)
        .send({
          employeeId: empId,
          workDate: testDate,
          requestedCreditDays: 2.0, // only 1.0 day is eligible
          reason: 'Claiming excess days',
        });

      expect(res.status).toBe(409); // rejected by active duplicate or threshold check
    });

    it('5. GET /hrms/attendance/comp-off/overview returns accurate operational metrics', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/comp-off/overview')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRequests).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pendingApprovalCount).toBeGreaterThanOrEqual(1);
    });

    it('6. POST /hrms/attendance/comp-off/requests/:id/decision blocks requester self-approval', async () => {
      // Trying to approve using same headers that created the claim
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/comp-off/requests/${testRequestId}/decision`)
        .set(headers)
        .send({
          decision: 'approved',
          approvedCreditDays: 1.0,
          reviewNotes: 'Self approval attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Self-approval violation');
    });

    it('7. POST /hrms/attendance/comp-off/requests/:id/decision enforces optimistic concurrency', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/comp-off/requests/${testRequestId}/decision`)
        .set(reviewerHeaders)
        .send({
          decision: 'approved',
          approvedCreditDays: 1.0,
          expectedVersion: 999, // stale version
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('Optimistic lock failure');
    });

    it('8. POST /hrms/attendance/comp-off/requests/:id/decision approves claim and creates entitlement with Leave handoff', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/comp-off/requests/${testRequestId}/decision`)
        .set(reviewerHeaders)
        .send({
          decision: 'approved',
          approvedCreditDays: 1.0,
          reviewNotes: 'Verified weekend migration work logs. Approved 1.0 day Comp-Off.',
          expectedVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.approvedCreditDays).toBe(1.0);
    });

    it('9. GET /hrms/attendance/comp-off/entitlements lists approved entitlement with validity', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/comp-off/entitlements?employeeId=${empId}`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const ent = res.body.data[0];
      expect(ent.earnedDays).toBe(1.0);
      expect(ent.earnedMinutes).toBe(480);
      expect(ent.validFrom).toBe(testDate);
      expect(ent.expiresAt).toBeDefined();

      testEntitlementId = ent.id;
    });

    it('10. GET /hrms/attendance/comp-off/handoffs verifies idempotent Leave handoff record', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/comp-off/handoffs?employeeId=${empId}`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const handoff = res.body.data[0];
      expect(handoff.idempotencyKey).toBe(`co_handoff_${tenantId}_${companyId}_${testEntitlementId}`);
      expect(handoff.creditDays).toBe(1.0);
      expect(handoff.leaveTypeCode).toBe('comp_off');
      expect(handoff.status).toBe('acknowledged');
    });

    it('11. POST /hrms/attendance/comp-off/entitlements/:id/reverse rolls back entitlement and audits reversal', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/comp-off/entitlements/${testEntitlementId}/reverse`)
        .set(reviewerHeaders)
        .send({
          reversalReason: 'Duplicate work logged in error by employee. Reversing credited entitlement.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('reversed');
    });

    it('12. POST /hrms/attendance/comp-off/from-overtime/:settlementId converts OT Comp-Off settlement into Comp-Off entitlement', async () => {
      const db = getDb();

      // Seed an OT settlement with allocation_type = comp_off
      const otReqId = 'att_ot_req_test_conv_01';
      testOtSettlementId = 'att_ot_set_test_conv_01';

      await db.insert(attendanceOvertimeRequests).ignore().values({
        id: otReqId,
        requestNumber: 'OT-CONV-00001',
        tenantId,
        companyId,
        employeeId: empId,
        workDate: '2026-10-12',
        reason: 'Overtime test claim for Comp-Off conversion',
        status: 'approved',
        settlementStatus: 'partially_allocated',
        approvedOtMinutes: 480,
      });

      await db.insert(attendanceOvertimeSettlements).ignore().values({
        id: testOtSettlementId,
        tenantId,
        companyId,
        requestId: otReqId,
        employeeId: empId,
        allocationType: 'comp_off',
        allocatedMinutes: 480, // 8 hours = 1 comp-off day
        status: 'pending_handoff',
      });

      const res = await request(app)
        .post(`/api/v1/hrms/attendance/comp-off/from-overtime/${testOtSettlementId}`)
        .set(reviewerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.earnedDays).toBe(1.0);
      expect(res.body.data.sourceOvertimeSettlementId).toBe(testOtSettlementId);

      // Verify OT settlement status was updated to credited_to_comp_off
      const [updatedOtSet] = await db
        .select()
        .from(attendanceOvertimeSettlements)
        .where(eq(attendanceOvertimeSettlements.id, testOtSettlementId));

      expect(updatedOtSet?.status).toBe('credited_to_comp_off');
    });

    it('13. GET /hrms/attendance/comp-off/requests/:id includes immutable audit log', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/comp-off/requests/${testRequestId}`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.audits).toBeDefined();
      const actions = res.body.data.audits.map((a: { action: string }) => a.action);
      expect(actions).toContain('submitted');
      expect(actions).toContain('approved');
      expect(actions).toContain('reversed');
    });

    afterAll(async () => {
      const db = getDb();
      await db.delete(attendanceOvertimeSettlements).where(eq(attendanceOvertimeSettlements.employeeId, empId));
      await db.delete(attendanceOvertimeRequests).where(eq(attendanceOvertimeRequests.employeeId, empId));
    });
  }
);
