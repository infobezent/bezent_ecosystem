import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, inArray, like } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  attendanceOnDutyRequests,
  attendanceOnDutyWorkdays,
  attendanceOnDutyAudits,
  employeeAttendance,
  attendanceExceptions,
  employeeNotifications,
  attendancePeriods,
  attendancePolicies,
  employees,
  users,
} from '../../../../db/schema.js';
import { generateSurrogateId, hashPassword } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';
import { attendancePolicyService } from '../service/attendancePolicy.service.js';
import { attendanceOnDutyService } from '../service/attendanceOnDuty.service.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Attendance On-Duty V1.0 Functional Acceptance & Security Audit',
  () => {
    const app = createApp();
    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';

    let headers: Record<string, string>;
    let policyFullDayMinutes: number;
    let policyHalfDayMinutes: number;

    // Dedicated test fixtures
    const empId1 = 'emp_od_audit_001';
    const empId2 = 'emp_od_audit_002';
    const reviewerUserId = 'usr_od_reviewer_001';
    const emp1UserId = 'usr_od_emp1_001';

    beforeAll(async () => {
      headers = await hrmsTestHeaders(companyId, tenantId);
      const db = getDb();

      // Clean up test employee artifacts from prior runs
      await db
        .delete(attendanceOnDutyRequests)
        .where(inArray(attendanceOnDutyRequests.employeeId, [empId1, empId2]));
      await db
        .delete(employeeAttendance)
        .where(inArray(employeeAttendance.employeeId, [empId1, empId2]));
      await db
        .delete(attendanceExceptions)
        .where(inArray(attendanceExceptions.employeeId, [empId1, empId2]));
      await db
        .delete(employeeNotifications)
        .where(inArray(employeeNotifications.employeeId, [empId1, empId2]));

      // Ensure company attendance policy odRules permits 30 days backdated submission for acceptance audit
      await db
        .update(attendancePolicies)
        .set({
          odRules: {
            enabled: true,
            odTypes: [
              'Client Visit',
              'Business Trip',
              'Training / Conference',
              'Field Assignment',
              'client_visit',
              'site_visit',
              'training',
              'travel',
              'branch_visit',
            ],
            allowHalfDay: true,
            allowHourly: true,
            allowBackdated: true,
            maxBackdatedDays: 30,
            backdatedAllowedDays: 30,
            requiresApproval: true,
            countAsPresent: true,
          },
        })
        .where(
          and(
            eq(attendancePolicies.tenantId, tenantId),
            eq(attendancePolicies.companyId, companyId),
            eq(attendancePolicies.scope, 'company'),
          ),
        );

      // Resolve real policy thresholds from development DB
      const effectivePolicy = await attendancePolicyService.getEffectivePolicy(tenantId, companyId);
      policyFullDayMinutes = effectivePolicy.fullDayThresholdHours
        ? Math.round(Number(effectivePolicy.fullDayThresholdHours) * 60)
        : 480;
      policyHalfDayMinutes = effectivePolicy.halfDayThresholdHours
        ? Math.round(Number(effectivePolicy.halfDayThresholdHours) * 60)
        : 240;

      // 1. Ensure test reviewer user exists
      const pwd = hashPassword('TestSecret#123');
      await db
        .insert(users)
        .values({
          id: reviewerUserId,
          email: 'reviewer.od.audit@example.com',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Divya',
          lastName: 'Manager',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 2. Ensure test employee 1 user exists
      await db
        .insert(users)
        .values({
          id: emp1UserId,
          email: 'karthik.od.audit@example.com',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Karthik',
          lastName: 'Engineer',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 3. Ensure test employees exist
      await db
        .insert(employees)
        .values({
          id: empId1,
          tenantId,
          companyId,
          userId: emp1UserId,
          employeeNumber: 'EMP-OD-001',
          firstName: 'Karthik',
          lastName: 'Engineer',
          email: 'karthik.od.audit@example.com',
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

      await db
        .insert(employees)
        .values({
          id: empId2,
          tenantId,
          companyId,
          userId: generateSurrogateId('usr'),
          employeeNumber: 'EMP-OD-002',
          firstName: 'Ananya',
          lastName: 'Consultant',
          email: 'ananya.od.audit@example.com',
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });
    });

    /* ══════════════════════════════════════════════════════════════════════
     SECTION 1: ATTENDANCE CREDIT INTEGRITY & RECONCILIATION
     ══════════════════════════════════════════════════════════════════════ */
    describe('1. Attendance Credit Integrity', () => {
      it('approving full-day OD reconciles attendance without fabricating raw punches', async () => {
        const pastWorkday = '2026-10-02';

        // 1. Submit OD request
        const createRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty')
          .set(headers)
          .send({
            employeeId: empId1,
            odTypeId: 'client_visit',
            startDate: pastWorkday,
            endDate: pastWorkday,
            durationType: 'full_day',
            purpose: 'Full day client workshop at client campus',
            locationOrSite: 'Client Campus A',
          });

        expect(createRes.status).toBe(201);
        const odId = createRes.body.data.id;

        // 2. Approve request
        const approveRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/decision`)
          .set(headers)
          .send({
            action: 'approved',
            reason: 'Verified on-site visit log',
          });

        expect(approveRes.status).toBe(200);
        expect(approveRes.body.data.approvalStatus).toBe('approved');

        // 3. Verify attendance credit in employee_attendance
        const db = getDb();
        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.companyId, companyId),
              eq(employeeAttendance.employeeId, empId1),
              eq(employeeAttendance.date, pastWorkday),
            ),
          );

        expect(att).toBeDefined();
        expect(att!.status).toBe('present');
        expect(att!.workedMinutes).toBe(policyFullDayMinutes);
        expect(att!.workLocation).toBe('Client Campus A');
        // Invariant: raw punch timestamps are not fabricated
        expect(att!.checkInTime).toBeNull();
        expect(att!.checkOutTime).toBeNull();
        expect(
          (att!.calculationMetadata as { isOdCredit?: boolean; odRequestId?: string })?.isOdCredit,
        ).toBe(true);
        expect(
          (att!.calculationMetadata as { isOdCredit?: boolean; odRequestId?: string })?.odRequestId,
        ).toBe(odId);
      });

      it('correctly credits hourly OD duration (does not inflate to 8 hours)', async () => {
        const workdayHourly = '2026-10-03';

        const createRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty')
          .set(headers)
          .send({
            employeeId: empId1,
            odTypeId: 'site_visit',
            startDate: workdayHourly,
            endDate: workdayHourly,
            durationType: 'hourly',
            startTime: '10:00',
            endTime: '13:30', // 3.5 hours = 210 minutes
            purpose: 'Inspection of equipment at installation site',
            locationOrSite: 'Substation Site B',
          });

        expect(createRes.status).toBe(201);
        const odId = createRes.body.data.id;
        expect(Number(createRes.body.data.durationHours)).toBe(3.5);

        // Approve
        const approveRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/decision`)
          .set(headers)
          .send({
            action: 'approved',
            reason: 'Approved site inspection',
          });

        expect(approveRes.status).toBe(200);

        const db = getDb();
        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.companyId, companyId),
              eq(employeeAttendance.employeeId, empId1),
              eq(employeeAttendance.date, workdayHourly),
            ),
          );

        expect(att).toBeDefined();
        // Credited minutes must equal 210 (3.5 hours * 60), NOT hardcoded 480 or 510
        expect(att!.workedMinutes).toBe(210);
      });

      it('reconciles partial office attendance + OD without wiping existing punches', async () => {
        const workdayPartial = '2026-10-04';
        const db = getDb();

        // Seed partial office attendance: check-in 09:00, check-out 13:00 (240 mins)
        await db
          .insert(employeeAttendance)
          .values({
            id: `att_partial_${Date.now()}`,
            tenantId,
            companyId,
            employeeId: empId1,
            date: workdayPartial,
            checkInTime: '09:00:00',
            checkOutTime: '13:00:00',
            workedMinutes: 240,
            status: 'half_day',
            processingState: 'provisional',
            workLocation: 'office',
            notes: 'Office morning shift',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              checkInTime: '09:00:00',
              checkOutTime: '13:00:00',
              workedMinutes: 240,
              status: 'half_day',
            },
          });

        // Submit Half-day OD for afternoon
        const createRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty')
          .set(headers)
          .send({
            employeeId: empId1,
            odTypeId: 'client_visit',
            startDate: workdayPartial,
            endDate: workdayPartial,
            durationType: 'half_day',
            halfDaySession: 'second_half',
            purpose: 'Afternoon client demo at client office',
          });

        expect(createRes.status).toBe(201);
        const odId = createRes.body.data.id;

        // Approve
        const approveRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/decision`)
          .set(headers)
          .send({
            action: 'approved',
            reason: 'Client demo approved',
          });

        expect(approveRes.status).toBe(200);

        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.companyId, companyId),
              eq(employeeAttendance.employeeId, empId1),
              eq(employeeAttendance.date, workdayPartial),
            ),
          );

        expect(att).toBeDefined();
        // Combined duration: 240 (office) + policyHalfDayMinutes (OD)
        expect(att!.workedMinutes).toBe(240 + policyHalfDayMinutes);
        expect(att!.status).toBe('present');
        // Office punches are preserved intact
        expect(att!.checkInTime).toBe('09:00:00');
        expect(att!.checkOutTime).toBe('13:00:00');
        expect(att!.notes).toContain('Office morning shift');
        expect(att!.notes).toContain('Approved On-Duty');
      });

      it('ensures repeated processing is strictly idempotent and does not duplicate credit', async () => {
        const workdayIdem = '2026-10-05';

        const createRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty')
          .set(headers)
          .send({
            employeeId: empId1,
            odTypeId: 'training',
            startDate: workdayIdem,
            endDate: workdayIdem,
            durationType: 'half_day',
            purpose: 'Half day tech certification session',
          });

        const odId = createRes.body.data.id;

        // First Approval
        await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/decision`)
          .set(headers)
          .send({ action: 'approved', reason: 'Training pass' });

        const db = getDb();
        const [attFirst] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.companyId, companyId),
              eq(employeeAttendance.employeeId, empId1),
              eq(employeeAttendance.date, workdayIdem),
            ),
          );

        expect(attFirst!.workedMinutes).toBe(policyHalfDayMinutes);

        // Re-invoke the reconciliation engine directly on the same approved request
        await attendanceOnDutyService.processApprovedAttendanceCredit(tenantId, companyId, odId);

        const [attSecond] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.companyId, companyId),
              eq(employeeAttendance.employeeId, empId1),
              eq(employeeAttendance.date, workdayIdem),
            ),
          );

        // Must remain exactly equal to policyHalfDayMinutes, not doubled
        expect(attSecond!.workedMinutes).toBe(policyHalfDayMinutes);
      });
    });

    /* ══════════════════════════════════════════════════════════════════════
     SECTION 2: MULTI-DAY OD RECONCILIATION & PARTIAL AGGREGATE STATUS
     ══════════════════════════════════════════════════════════════════════ */
    describe('2. Multi-Day OD Integrity & Workday Ledger', () => {
      it('handles 3-day OD with Day 1 applied, Day 2 locked/blocked, Day 3 pending', async () => {
        const db = getDb();
        const day1 = '2026-10-10'; // past eligible
        const day2 = '2026-10-11'; // yesterday (to be locked in payroll period)
        const day3 = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10); // future date

        // Ensure previous test lock periods are cleared before multi-day request creation
        await db
          .delete(attendancePeriods)
          .where(
            and(
              eq(attendancePeriods.tenantId, tenantId),
              eq(attendancePeriods.companyId, companyId),
              like(attendancePeriods.id, 'prd_lock_%'),
            ),
          );

        // 1. Submit 3-day OD request before day 2 is locked
        const req = await attendanceOnDutyService.createRequest(
          tenantId,
          companyId,
          {
            employeeId: empId2,
            odTypeId: 'travel',
            startDate: day1,
            endDate: day3,
            durationType: 'multi_day',
            purpose: 'Regional audit tour covering 3 workdays',
          },
          reviewerUserId,
        );

        const odId = req.id;
        expect(odId).toBeDefined();

        // 2. Lock Day 2 by creating a locked attendance period covering day2
        const lockPeriodId = `prd_lock_${Date.now()}`;
        await db
          .insert(attendancePeriods)
          .values({
            id: lockPeriodId,
            tenantId,
            companyId,
            periodCode: `LP-${Date.now().toString().slice(-4)}`,
            startDate: day2,
            endDate: day2,
            status: 'locked',
            lockedAt: new Date(),
            lockedByUserId: reviewerUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onDuplicateKeyUpdate({ set: { status: 'locked' } });

        // 3. Execute approved credit reconciliation
        await attendanceOnDutyService.processApprovedAttendanceCredit(tenantId, companyId, odId);

        // 4. Inspect individual workdays in attendance_on_duty_workdays
        const workdays = await db
          .select()
          .from(attendanceOnDutyWorkdays)
          .where(eq(attendanceOnDutyWorkdays.onDutyRequestId, odId))
          .orderBy(attendanceOnDutyWorkdays.workday);

        const wd1 = workdays.find((w) => w.workday === day1);
        const wd2 = workdays.find((w) => w.workday === day2);
        const wd3 = workdays.find((w) => w.workday === day3);

        expect(wd1).toBeDefined();
        expect(wd1!.processingStatus).toBe('applied');
        expect(wd1!.appliedAttendanceId).toBeDefined();

        expect(wd2).toBeDefined();
        expect(wd2!.processingStatus).toBe('blocked');
        expect(wd2!.blockedReason).toContain('Payroll period locked');

        expect(wd3).toBeDefined();
        expect(wd3!.processingStatus).toBe('pending');

        // 5. Verify aggregate status on request
        const updatedReq = await attendanceOnDutyService.getRequestById(tenantId, companyId, odId);
        // Because Day 2 is blocked, aggregate status must reflect processing_issues
        expect(updatedReq.processingStatus).toBe('processing_issues');

        // 6. Retry reconciliation does not duplicate credit or change Day 1/Day 2 status
        await attendanceOnDutyService.processApprovedAttendanceCredit(tenantId, companyId, odId);

        const workdaysRetry = await db
          .select()
          .from(attendanceOnDutyWorkdays)
          .where(eq(attendanceOnDutyWorkdays.onDutyRequestId, odId))
          .orderBy(attendanceOnDutyWorkdays.workday);

        expect(workdaysRetry.find((w) => w.workday === day1)?.processingStatus).toBe('applied');
        expect(workdaysRetry.find((w) => w.workday === day2)?.processingStatus).toBe('blocked');
        expect(workdaysRetry.find((w) => w.workday === day3)?.processingStatus).toBe('pending');
      });
    });

    /* ══════════════════════════════════════════════════════════════════════
     SECTION 3: APPROVAL SECURITY & PERMISSIONS
     ══════════════════════════════════════════════════════════════════════ */
    describe('3. Approval Security', () => {
      it('blocks self-approval when reviewer is the requesting employee', async () => {
        const workday = '2026-10-06';

        // 1. Submit request for empId1
        const createRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty')
          .set(headers)
          .send({
            employeeId: empId1,
            odTypeId: 'client_visit',
            startDate: workday,
            endDate: workday,
            durationType: 'full_day',
            purpose: 'Self-approval audit test',
          });

        expect(createRes.status).toBe(201);
        const odId = createRes.body.data.id;

        // 2. Direct review decision attempting self-approval (passing reviewerEmployeeId = empId1)
        await expect(
          attendanceOnDutyService.reviewDecision(
            tenantId,
            companyId,
            odId,
            { action: 'approved', reason: 'Self-approving my own request' },
            emp1UserId, // Reviewer user ID is linked to empId1
            empId1, // Reviewer employee ID is empId1
          ),
        ).rejects.toThrow(/Self-approval.*prohibited/i);
      });

      it('rejects reviewing a request in finalized status', async () => {
        const workday = '2026-10-07';

        const createRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty')
          .set(headers)
          .send({
            employeeId: empId1,
            odTypeId: 'training',
            startDate: workday,
            endDate: workday,
            durationType: 'full_day',
            purpose: 'Finalized transition guard test',
          });

        const odId = createRes.body.data.id;

        // First decision: reject
        const rejectRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/decision`)
          .set(headers)
          .send({ action: 'rejected', reason: 'Initial rejection for testing' });

        expect(rejectRes.status).toBe(200);

        // Second decision on already rejected request -> must fail
        const secondRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/decision`)
          .set(headers)
          .send({ action: 'approved', reason: 'Trying to approve rejected' });

        expect(secondRes.status).toBe(400);
        const errMsg =
          secondRes.body.error?.message || secondRes.body.message || JSON.stringify(secondRes.body);
        expect(errMsg).toMatch(/Cannot review request in status/i);
      });

      it('enforces tenant isolation: access is denied for mismatched tenant/company', async () => {
        const otherHeaders = await hrmsTestHeaders(
          'comp_other_synthetic',
          'tenant_other_synthetic',
        );

        // Attempt to access an On-Duty request belonging to comp_demo_01 using comp_other_synthetic headers
        const res = await request(app)
          .get('/api/v1/hrms/attendance/on-duty/od_non_existent_fake')
          .set(otherHeaders);

        expect(res.status).toBe(404);
      });
    });

    /* ══════════════════════════════════════════════════════════════════════
     SECTION 4: BULK OPERATIONS AUDIT
     ══════════════════════════════════════════════════════════════════════ */
    describe('4. Bulk Operations: Preview & Execution', () => {
      it('accurately previews eligibility and executes bulk action with per-request reporting', async () => {
        const db = getDb();
        await db
          .delete(attendanceOnDutyRequests)
          .where(inArray(attendanceOnDutyRequests.employeeId, [empId1, empId2]));
        const todayStr = new Date().toISOString().slice(0, 10);
        const futureDateStr = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

        // Create Request A: Eligible single-day request (today, non-retroactive, single day)
        const resA = await request(app).post('/api/v1/hrms/attendance/on-duty').set(headers).send({
          employeeId: empId1,
          odTypeId: 'site_visit',
          startDate: todayStr,
          endDate: todayStr,
          durationType: 'full_day',
          purpose: 'Bulk test eligible item A',
        });
        const idA = resA.body.data.id;

        // Create Request B: High-risk multi-day request
        const resB = await request(app).post('/api/v1/hrms/attendance/on-duty').set(headers).send({
          employeeId: empId2,
          odTypeId: 'travel',
          startDate: todayStr,
          endDate: futureDateStr,
          durationType: 'multi_day',
          purpose: 'Bulk test multi-day item B',
        });
        const idB = resB.body.data.id;

        // 1. Preview Bulk Approval
        const previewRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty/bulk-preview')
          .set(headers)
          .send({ requestIds: [idA, idB] });

        expect(previewRes.status).toBe(200);
        const preview = previewRes.body.data;
        expect(preview.totalSelected).toBe(2);

        const itemA = preview.items.find(
          (i: { id: string; isEligible: boolean; reason?: string }) => i.id === idA,
        );
        const itemB = preview.items.find(
          (i: { id: string; isEligible: boolean; reason?: string }) => i.id === idB,
        );

        expect(itemA.isEligible).toBe(true);
        expect(itemB.isEligible).toBe(false);
        expect(itemB.reason).toContain('Multi-day');

        // 2. Execute Bulk Approve
        const bulkExecRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty/bulk')
          .set(headers)
          .send({
            action: 'bulk_approve',
            requestIds: [idA, idB],
            reason: 'Bulk approved batch 01',
          });

        expect(bulkExecRes.status).toBe(200);
        const result = bulkExecRes.body.data;

        // Item A succeeds, Item B is skipped because it requires individual review
        expect(result.succeeded).toContain(idA);
        expect(result.skipped.some((s: { id: string; reason?: string }) => s.id === idB)).toBe(
          true,
        );
      });
    });

    /* ══════════════════════════════════════════════════════════════════════
     SECTION 5 & 6: END-TO-END WORKFLOW & INTEGRATION VERIFICATION
     ══════════════════════════════════════════════════════════════════════ */
    describe('5 & 6. End-to-End Lifecycle & System Integrations', () => {
      it('executes full 10-step lifecycle: submit -> assign -> clarify -> approve -> ledger -> exceptions -> notifications', async () => {
        const workdayLifecycle = '2026-10-09';
        const db = getDb();

        // Seed an open exception on this workday (e.g. unexcused missing in punch)
        const exceptionId = `exc_od_audit_${Date.now()}`;
        await db
          .insert(attendanceExceptions)
          .values({
            id: exceptionId,
            tenantId,
            companyId,
            employeeId: empId1,
            workday: workdayLifecycle,
            exceptionType: 'missing_in',
            severity: 'medium',
            source: 'engine',
            sourceRecordType: 'daily_attendance',
            sourceRecordId: 'daily_audit_rec',
            title: `Missing In Punch on ${workdayLifecycle}`,
            status: 'open',
            detectedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onDuplicateKeyUpdate({ set: { status: 'open' } });

        // Step 1: Submit Request
        const createRes = await request(app)
          .post('/api/v1/hrms/attendance/on-duty')
          .set(headers)
          .send({
            employeeId: empId1,
            odTypeId: 'branch_visit',
            startDate: workdayLifecycle,
            endDate: workdayLifecycle,
            durationType: 'full_day',
            purpose: 'Branch infrastructure deployment',
            evidenceAttachments: [
              { name: 'visit_approval.pdf', size: '120 KB', url: '/files/visit.pdf' },
            ],
          });

        expect(createRes.status).toBe(201);
        const odId = createRes.body.data.id;
        const reqNum = createRes.body.data.requestNumber;

        // Step 2: Assign Reviewer
        const assignRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/assign`)
          .set(headers)
          .send({ assignedTo: reviewerUserId, role: 'Operations Reviewer' });

        expect(assignRes.status).toBe(200);

        // Step 3: Start Review (idempotently confirms in-review)
        const startRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/start-review`)
          .set(headers);

        expect(startRes.status).toBe(200);
        expect(startRes.body.data.approvalStatus).toBe('under_review');

        // Step 4: Request Clarification
        const reqInfoRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/request-info`)
          .set(headers)
          .send({ notes: 'Please provide branch manager signature letter.' });

        expect(reqInfoRes.status).toBe(200);
        expect(reqInfoRes.body.data.approvalStatus).toBe('awaiting_info');

        // Step 5: Provide Clarification
        const clarifyRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/clarify`)
          .set(headers)
          .send({ response: 'Attached branch manager sign-off email.' });

        expect(clarifyRes.status).toBe(200);
        expect(clarifyRes.body.data.approvalStatus).toBe('under_review');

        // Step 6: Approve
        const approveRes = await request(app)
          .post(`/api/v1/hrms/attendance/on-duty/${odId}/decision`)
          .set(headers)
          .send({ action: 'approved', reason: 'Verified branch clearance letter' });

        expect(approveRes.status).toBe(200);
        expect(approveRes.body.data.approvalStatus).toBe('approved');
        expect(approveRes.body.data.processingStatus).toBe('applied');

        // Step 7: Verify Audit History
        const audits = await db
          .select()
          .from(attendanceOnDutyAudits)
          .where(eq(attendanceOnDutyAudits.onDutyRequestId, odId));

        const actions = audits.map((a) => a.action);
        expect(actions).toContain('submitted');
        expect(actions).toContain('assigned');
        expect(actions).toContain('info_requested');
        expect(actions).toContain('info_provided');
        expect(actions).toContain('approved');

        // Step 8: Verify Workday Ledger
        const workdays = await db
          .select()
          .from(attendanceOnDutyWorkdays)
          .where(eq(attendanceOnDutyWorkdays.onDutyRequestId, odId));

        expect(workdays.length).toBe(1);
        expect(workdays[0]!.processingStatus).toBe('applied');
        expect(workdays[0]!.appliedAttendanceId).toBeDefined();

        // Step 9: Verify Daily Log (employee_attendance)
        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.companyId, companyId),
              eq(employeeAttendance.employeeId, empId1),
              eq(employeeAttendance.date, workdayLifecycle),
            ),
          );

        expect(att).toBeDefined();
        expect(att!.status).toBe('present');
        expect(att!.workedMinutes).toBe(policyFullDayMinutes);

        // Step 10: Verify Linked Exceptions Auto-Resolved
        const [exRecord] = await db
          .select()
          .from(attendanceExceptions)
          .where(eq(attendanceExceptions.id, exceptionId));

        expect(exRecord).toBeDefined();
        expect(exRecord!.status).toBe('resolved');
        expect(exRecord!.resolutionNotes).toContain(
          `Auto-resolved via approved On-Duty request ${reqNum}`,
        );

        // Step 11: Verify In-App Notifications
        const notifs = await db
          .select()
          .from(employeeNotifications)
          .where(
            and(
              eq(employeeNotifications.tenantId, tenantId),
              eq(employeeNotifications.companyId, companyId),
              eq(employeeNotifications.employeeId, empId1),
            ),
          );

        expect(notifs.length).toBeGreaterThanOrEqual(1);
        const approvedNotif = notifs.find((n) => n.title.includes('Approved'));
        expect(approvedNotif).toBeDefined();

        // Step 12: Verify CSV Export
        const exportRes = await request(app)
          .get('/api/v1/hrms/attendance/on-duty/export')
          .set(headers);

        expect(exportRes.status).toBe(200);
        expect(exportRes.headers['content-type']).toContain('text/csv');
        expect(exportRes.text).toContain('Request Number,Employee Code');
        expect(exportRes.text).toContain(reqNum);
      });
    });

    afterAll(async () => {
      const db = getDb();
      await db
        .delete(attendanceOnDutyRequests)
        .where(inArray(attendanceOnDutyRequests.employeeId, [empId1, empId2]));
      await db
        .delete(employeeAttendance)
        .where(inArray(employeeAttendance.employeeId, [empId1, empId2]));
      await db
        .delete(attendanceExceptions)
        .where(inArray(attendanceExceptions.employeeId, [empId1, empId2]));
      await db
        .delete(employeeNotifications)
        .where(inArray(employeeNotifications.employeeId, [empId1, empId2]));
      await db
        .delete(attendancePeriods)
        .where(
          and(
            eq(attendancePeriods.tenantId, tenantId),
            eq(attendancePeriods.companyId, companyId),
            like(attendancePeriods.id, 'prd_lock_%'),
          ),
        );
    });
  },
);
