import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  employees,
  memberships,
  employeeAttendance,
  attendanceRegularizations,
  attendanceRegularizationAudits,
  attendanceAdjustments,
  attendanceRegularizationSettings,
  employeeNotifications,
  roleAssignments,
} from '../../../../db/schema.js';
import { generateSurrogateId, hashPassword } from '../../../../platform/auth/security.js';
import {
  hrmsTestHeaders,
  signInForTest,
  removeHrmsTestAccess,
} from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS Attendance — Multi-Stage (Reporting Manager ➔ HR) Regularization Approval Workflow',
  () => {
    const app = createApp();

    const tenantId = 'tent_multi_stage_01';
    const companyId = 'comp_multi_stage_01';

    const hrUserId = 'usr_ms_hr_01';
    const mgrUserId = 'usr_ms_mgr_01';
    const empUserId = 'usr_ms_emp_01';
    const orphanEmpUserId = 'usr_ms_orphan_01';

    const hrEmployeeId = 'emp_ms_hr_01';
    const mgrEmployeeId = 'emp_ms_mgr_01';
    const employeeId = 'emp_ms_sub_01';
    const orphanEmployeeId = 'emp_ms_orphan_01';

    let hrHeaders: Record<string, string>;
    let mgrToken: string;
    let employeeToken: string;
    let orphanToken: string;

    const workday1 = '2026-10-14';
    const workday2 = '2026-10-15';
    const workday3 = '2026-10-16';
    const workdayOrphan = '2026-10-17';

    beforeAll(async () => {
      const db = getDb();
      const pwd = hashPassword('TestPassword123!');

      // 1. Tenant & Company
      await db
        .insert(tenants)
        .values({
          id: tenantId,
          name: 'Multi Stage Reg Tenant',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(companies)
        .values({
          id: companyId,
          tenantId,
          name: 'Multi Stage Reg Company',
          code: 'MSREGCOMP',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 2. Users
      await db
        .insert(users)
        .values({
          id: hrUserId,
          email: 'hr_ms@test.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Farhan',
          lastName: 'HRAdmin',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(users)
        .values({
          id: mgrUserId,
          email: 'mgr_ms@test.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Meera',
          lastName: 'Manager',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(users)
        .values({
          id: empUserId,
          email: 'emp_ms@test.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Sanjay',
          lastName: 'Dev',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(users)
        .values({
          id: orphanEmpUserId,
          email: 'orphan_ms@test.example',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Anita',
          lastName: 'Orphan',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 3. Employees
      // Manager
      await db
        .insert(employees)
        .values({
          id: mgrEmployeeId,
          tenantId,
          companyId,
          userId: mgrUserId,
          employeeNumber: 'EMP-MGR-001',
          firstName: 'Meera',
          lastName: 'Manager',
          email: 'mgr_ms@test.example',
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

      // HR
      await db
        .insert(employees)
        .values({
          id: hrEmployeeId,
          tenantId,
          companyId,
          userId: hrUserId,
          employeeNumber: 'EMP-HR-001',
          firstName: 'Farhan',
          lastName: 'HRAdmin',
          email: 'hr_ms@test.example',
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

      // Subordinate Employee (reporting to mgrEmployeeId)
      await db
        .insert(employees)
        .values({
          id: employeeId,
          tenantId,
          companyId,
          userId: empUserId,
          reportingManagerId: mgrEmployeeId,
          employeeNumber: 'EMP-SUB-001',
          firstName: 'Sanjay',
          lastName: 'Dev',
          email: 'emp_ms@test.example',
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({
          set: { employmentStatus: 'active', reportingManagerId: mgrEmployeeId },
        });

      // Orphan Employee (no reporting manager)
      await db
        .insert(employees)
        .values({
          id: orphanEmployeeId,
          tenantId,
          companyId,
          userId: orphanEmpUserId,
          reportingManagerId: null,
          employeeNumber: 'EMP-ORPHAN-001',
          firstName: 'Anita',
          lastName: 'Orphan',
          email: 'orphan_ms@test.example',
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({
          set: { employmentStatus: 'active', reportingManagerId: null },
        });

      // 4. Memberships
      await db
        .insert(memberships)
        .values({
          id: 'mem_ms_hr',
          tenantId,
          companyId,
          userId: hrUserId,
          role: 'company_admin',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active', role: 'company_admin' } });

      await db
        .insert(memberships)
        .values({
          id: 'mem_ms_mgr',
          tenantId,
          companyId,
          userId: mgrUserId,
          role: 'employee',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active', role: 'employee' } });

      await db
        .insert(roleAssignments)
        .values({
          id: `ra_ms_mgr_${companyId}`.slice(0, 64),
          userId: mgrUserId,
          roleId: 'role_sys_manager',
          tenantId,
          companyId,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active', roleId: 'role_sys_manager' } });

      await db
        .insert(memberships)
        .values({
          id: 'mem_ms_emp',
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
          id: 'mem_ms_orphan',
          tenantId,
          companyId,
          userId: orphanEmpUserId,
          role: 'employee',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // 5. Settings: approvalHierarchy = 'manager_then_hr'
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
          approvalHierarchy: 'manager_then_hr',
          blockOnPayrollLock: false,
        })
        .onDuplicateKeyUpdate({
          set: {
            isEnabled: true,
            submissionWindowDays: 30,
            maxRequestsPerMonth: 20,
            requireReason: true,
            approvalHierarchy: 'manager_then_hr',
            blockOnPayrollLock: false,
          },
        });

      // 6. Clean prior test artifacts
      await db
        .delete(employeeNotifications)
        .where(
          and(
            eq(employeeNotifications.tenantId, tenantId),
            eq(employeeNotifications.companyId, companyId),
          ),
        );
      await db
        .delete(attendanceRegularizationAudits)
        .where(
          and(
            eq(attendanceRegularizationAudits.tenantId, tenantId),
            eq(attendanceRegularizationAudits.companyId, companyId),
          ),
        );
      await db
        .delete(attendanceAdjustments)
        .where(
          and(
            eq(attendanceAdjustments.tenantId, tenantId),
            eq(attendanceAdjustments.companyId, companyId),
          ),
        );
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

      // 7. Sign-in test tokens
      hrHeaders = await hrmsTestHeaders(companyId, tenantId);
      const mgrLogin = await signInForTest('mgr_ms@test.example');
      mgrToken = mgrLogin.token;
      const empLogin = await signInForTest('emp_ms@test.example');
      employeeToken = empLogin.token;
      const orphanLogin = await signInForTest('orphan_ms@test.example');
      orphanToken = orphanLogin.token;
    });

    afterAll(async () => {
      const db = getDb();
      await db
        .delete(employeeNotifications)
        .where(
          and(
            eq(employeeNotifications.tenantId, tenantId),
            eq(employeeNotifications.companyId, companyId),
          ),
        );
      await db
        .delete(attendanceRegularizationAudits)
        .where(
          and(
            eq(attendanceRegularizationAudits.tenantId, tenantId),
            eq(attendanceRegularizationAudits.companyId, companyId),
          ),
        );
      await db
        .delete(attendanceAdjustments)
        .where(
          and(
            eq(attendanceAdjustments.tenantId, tenantId),
            eq(attendanceAdjustments.companyId, companyId),
          ),
        );
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
        .delete(roleAssignments)
        .where(
          and(eq(roleAssignments.tenantId, tenantId), eq(roleAssignments.companyId, companyId)),
        );
      await removeHrmsTestAccess([companyId]);
    });

    describe('Multi-Stage Flow (Stage 1 Manager ➔ Stage 2 HR)', () => {
      let regId: string;

      it('1. Employee submits request: routes to assignedQueue="manager_queue" and assignedTo=managerId', async () => {
        const db = getDb();
        // Seed initial attendance record as absent
        await db
          .insert(employeeAttendance)
          .values({
            id: generateSurrogateId('adly'),
            tenantId,
            companyId,
            employeeId,
            date: workday1,
            status: 'absent',
            isRegularized: false,
            workedMinutes: 0,
          })
          .onDuplicateKeyUpdate({ set: { status: 'absent', isRegularized: false } });

        const res = await request(app)
          .post('/api/v1/ess/attendance/regularize')
          .set('Authorization', `Bearer ${employeeToken}`)
          .set('X-Company-Id', companyId)
          .send({
            date: workday1,
            checkInTime: '09:00',
            checkOutTime: '18:00',
            reason: 'Forgot to swipe card at front entrance',
          });

        expect(res.status).toBe(201);
        expect(res.body.data).toBeDefined();
        regId = res.body.data.id;

        expect(res.body.data.approvalStatus).toBe('submitted');
        expect(res.body.data.assignedQueue).toBe('manager_queue');
        expect(res.body.data.assignedTo).toBe(mgrEmployeeId);
        expect(res.body.data.applicationStatus).toBe('not_applicable');

        // Verify notification dispatched to employee
        const notifs = await db
          .select()
          .from(employeeNotifications)
          .where(
            and(
              eq(employeeNotifications.tenantId, tenantId),
              eq(employeeNotifications.employeeId, employeeId),
            ),
          );
        expect(notifs.some((n) => n.title.includes('Submitted'))).toBe(true);
      });

      it('2. Self-approval invariant: Reviewer cannot approve their own regularization request', async () => {
        // Manager submits a regularization request for themselves
        const selfRes = await request(app)
          .post('/api/v1/ess/attendance/regularize')
          .set('Authorization', `Bearer ${mgrToken}`)
          .set('X-Company-Id', companyId)
          .send({
            date: workday1,
            checkInTime: '09:00',
            checkOutTime: '18:00',
            reason: 'Manager punch correction self-request',
          });
        expect(selfRes.status).toBe(201);
        const selfRegId = selfRes.body.data.id;

        // Manager attempts to approve their own request
        const res = await request(app)
          .post(`/api/v1/hrms/attendance/regularization/${selfRegId}/decision`)
          .set('Authorization', `Bearer ${mgrToken}`)
          .set('X-Company-Id', companyId)
          .send({
            decision: 'approved',
            remarks: 'Self approval attempt',
          });

        expect(res.status).toBe(400);
        expect(res.body.error?.message || res.body.message).toMatch(/Self-approval/i);
      });

      it('3. Stage 1 (Manager Approval): Transitions to assignedQueue="hr_queue", clears assignedTo, keeps attendance untouched', async () => {
        const db = getDb();

        const res = await request(app)
          .post(`/api/v1/hrms/attendance/regularization/${regId}/decision`)
          .set('Authorization', `Bearer ${mgrToken}`)
          .set('X-Company-Id', companyId)
          .send({
            decision: 'approved',
            remarks: 'Approved by Reporting Manager; attendance logs verified.',
          });

        expect(res.status).toBe(200);

        // Fetch detail via HR headers
        const detailRes = await request(app)
          .get(`/api/v1/hrms/attendance/regularization/${regId}`)
          .set(hrHeaders);

        expect(detailRes.status).toBe(200);
        const data = detailRes.body.data;

        // Stage 1 approval moves it to HR Queue
        expect(data.approvalStatus).toBe('submitted');
        expect(data.assignedQueue).toBe('hr_queue');
        expect(data.assignedTo).toBeNull();
        expect(data.applicationStatus).toBe('not_applicable');
        expect(data.decisionReason).toContain('Approved by Reporting Manager');

        // Audit Trail check
        const audits = await db
          .select()
          .from(attendanceRegularizationAudits)
          .where(
            and(
              eq(attendanceRegularizationAudits.tenantId, tenantId),
              eq(attendanceRegularizationAudits.regularizationId, regId),
            ),
          );
        const stage1Audit = audits.find(
          (a) => a.action === 'approved' && a.notes?.includes('Stage 1'),
        );
        expect(stage1Audit).toBeDefined();

        // Ensure attendance record is NOT modified yet
        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.employeeId, employeeId),
              eq(employeeAttendance.date, workday1),
            ),
          );
        expect(att?.status).toBe('absent');
        expect(att?.isRegularized).toBe(false);

        // Employee notification check
        const notifs = await db
          .select()
          .from(employeeNotifications)
          .where(
            and(
              eq(employeeNotifications.tenantId, tenantId),
              eq(employeeNotifications.employeeId, employeeId),
            ),
          );
        expect(notifs.some((n) => n.title.includes('Stage 1 Approved'))).toBe(true);
      });

      it('4. Stage 2 (HR Approval): Finalizes request as approved, creates adjustments, and recalculates daily attendance', async () => {
        const db = getDb();

        const res = await request(app)
          .post(`/api/v1/hrms/attendance/regularization/${regId}/decision`)
          .set(hrHeaders)
          .send({
            decision: 'approved',
            remarks: 'HR final sign-off and approval granted.',
          });

        expect(res.status).toBe(200);

        // Fetch updated detail
        const detailRes = await request(app)
          .get(`/api/v1/hrms/attendance/regularization/${regId}`)
          .set(hrHeaders);

        expect(detailRes.status).toBe(200);
        const data = detailRes.body.data;
        expect(data.approvalStatus).toBe('approved');
        expect(data.applicationStatus).toBe('applied');

        // Verify attendance adjustments ledger
        const [adj] = await db
          .select()
          .from(attendanceAdjustments)
          .where(
            and(
              eq(attendanceAdjustments.tenantId, tenantId),
              eq(attendanceAdjustments.regularizationId, regId),
            ),
          );
        expect(adj).toBeDefined();
        expect(adj?.workday).toBe(workday1);

        // Verify daily attendance is regularized and present
        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.employeeId, employeeId),
              eq(employeeAttendance.date, workday1),
            ),
          );
        expect(att?.isRegularized).toBe(true);
        expect(att?.status).toBe('present');

        // Verify final approval notification
        const notifs = await db
          .select()
          .from(employeeNotifications)
          .where(
            and(
              eq(employeeNotifications.tenantId, tenantId),
              eq(employeeNotifications.employeeId, employeeId),
            ),
          );
        expect(notifs.some((n) => n.title.includes('Approved & Applied'))).toBe(true);
      });
    });

    describe('Stage 1 Manager Rejection Flow', () => {
      let regId: string;

      it('1. Manager rejects at Stage 1: immediately marks rejected and does NOT route to HR', async () => {
        const db = getDb();
        // Seed attendance
        await db
          .insert(employeeAttendance)
          .values({
            id: generateSurrogateId('adly'),
            tenantId,
            companyId,
            employeeId,
            date: workday2,
            status: 'half_day',
            isRegularized: false,
            workedMinutes: 240,
          })
          .onDuplicateKeyUpdate({ set: { status: 'half_day', isRegularized: false } });

        // Submit
        const subRes = await request(app)
          .post('/api/v1/ess/attendance/regularize')
          .set('Authorization', `Bearer ${employeeToken}`)
          .set('X-Company-Id', companyId)
          .send({
            date: workday2,
            checkInTime: '09:00',
            checkOutTime: '18:00',
            reason: 'Full day worked on client site',
          });

        expect(subRes.status).toBe(201);
        regId = subRes.body.data.id;
        expect(subRes.body.data.assignedQueue).toBe('manager_queue');

        // Manager Rejects
        const rejRes = await request(app)
          .post(`/api/v1/hrms/attendance/regularization/${regId}/decision`)
          .set('Authorization', `Bearer ${mgrToken}`)
          .set('X-Company-Id', companyId)
          .send({
            decision: 'rejected',
            reason: 'Client reported no physical presence on workday.',
          });

        expect(rejRes.status).toBe(200);

        // Fetch detail
        const detailRes = await request(app)
          .get(`/api/v1/hrms/attendance/regularization/${regId}`)
          .set(hrHeaders);

        expect(detailRes.body.data.approvalStatus).toBe('rejected');
        expect(detailRes.body.data.applicationStatus).toBe('not_applicable');
        expect(detailRes.body.data.decisionReason).toContain(
          'Client reported no physical presence',
        );

        // Verify attendance remained untouched
        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.employeeId, employeeId),
              eq(employeeAttendance.date, workday2),
            ),
          );
        expect(att?.status).toBe('half_day');
        expect(att?.isRegularized).toBe(false);
      });
    });

    describe('Stage 2 HR Rejection Flow', () => {
      let regId: string;

      it('1. Manager approves Stage 1, but HR rejects Stage 2: finalized as rejected', async () => {
        const db = getDb();
        // Seed attendance
        await db
          .insert(employeeAttendance)
          .values({
            id: generateSurrogateId('adly'),
            tenantId,
            companyId,
            employeeId,
            date: workday3,
            status: 'absent',
            isRegularized: false,
            workedMinutes: 0,
          })
          .onDuplicateKeyUpdate({ set: { status: 'absent', isRegularized: false } });

        // Submit
        const subRes = await request(app)
          .post('/api/v1/ess/attendance/regularize')
          .set('Authorization', `Bearer ${employeeToken}`)
          .set('X-Company-Id', companyId)
          .send({
            date: workday3,
            checkInTime: '09:00',
            checkOutTime: '17:30',
            reason: 'Office power outage prevented biometric punch',
          });

        expect(subRes.status).toBe(201);
        regId = subRes.body.data.id;

        // Stage 1 Manager Approval
        const mgrRes = await request(app)
          .post(`/api/v1/hrms/attendance/regularization/${regId}/decision`)
          .set('Authorization', `Bearer ${mgrToken}`)
          .set('X-Company-Id', companyId)
          .send({
            decision: 'approved',
            remarks: 'Power outage confirmed by facility manager.',
          });
        expect(mgrRes.status).toBe(200);

        // Stage 2 HR Rejection
        const hrRes = await request(app)
          .post(`/api/v1/hrms/attendance/regularization/${regId}/decision`)
          .set(hrHeaders)
          .send({
            decision: 'rejected',
            reason:
              'UPS generator was operational; biometric logs show other staff swiped normally.',
          });
        expect(hrRes.status).toBe(200);

        // Fetch detail
        const detailRes = await request(app)
          .get(`/api/v1/hrms/attendance/regularization/${regId}`)
          .set(hrHeaders);

        expect(detailRes.body.data.approvalStatus).toBe('rejected');
        expect(detailRes.body.data.applicationStatus).toBe('not_applicable');

        // No adjustment records created
        const adjs = await db
          .select()
          .from(attendanceAdjustments)
          .where(
            and(
              eq(attendanceAdjustments.tenantId, tenantId),
              eq(attendanceAdjustments.regularizationId, regId),
            ),
          );
        expect(adjs.length).toBe(0);
      });
    });

    describe('Direct HR Routing (Employee with no reporting manager)', () => {
      it('1. Routes directly to assignedQueue="hr_unassigned" and single HR approval finalizes and applies', async () => {
        const db = getDb();
        // Seed attendance
        await db
          .insert(employeeAttendance)
          .values({
            id: generateSurrogateId('adly'),
            tenantId,
            companyId,
            employeeId: orphanEmployeeId,
            date: workdayOrphan,
            status: 'absent',
            isRegularized: false,
            workedMinutes: 0,
          })
          .onDuplicateKeyUpdate({ set: { status: 'absent', isRegularized: false } });

        // Submit as orphan employee
        const subRes = await request(app)
          .post('/api/v1/ess/attendance/regularize')
          .set('Authorization', `Bearer ${orphanToken}`)
          .set('X-Company-Id', companyId)
          .send({
            date: workdayOrphan,
            checkInTime: '09:00',
            checkOutTime: '18:00',
            reason: 'Executive travel attendance correction',
          });

        expect(subRes.status).toBe(201);
        const orphanRegId = subRes.body.data.id;
        expect(subRes.body.data.assignedQueue).toBe('hr_unassigned');
        expect(subRes.body.data.assignedTo).toBeNull();

        // Direct HR Approval finalizes directly in one stage
        const hrRes = await request(app)
          .post(`/api/v1/hrms/attendance/regularization/${orphanRegId}/decision`)
          .set(hrHeaders)
          .send({
            decision: 'approved',
            remarks: 'Executive travel verified by HR directly.',
          });
        expect(hrRes.status).toBe(200);

        const detailRes = await request(app)
          .get(`/api/v1/hrms/attendance/regularization/${orphanRegId}`)
          .set(hrHeaders);

        expect(detailRes.body.data.approvalStatus).toBe('approved');
        expect(detailRes.body.data.applicationStatus).toBe('applied');

        // Verify attendance updated
        const [att] = await db
          .select()
          .from(employeeAttendance)
          .where(
            and(
              eq(employeeAttendance.tenantId, tenantId),
              eq(employeeAttendance.employeeId, orphanEmployeeId),
              eq(employeeAttendance.date, workdayOrphan),
            ),
          );
        expect(att?.isRegularized).toBe(true);
        expect(att?.status).toBe('present');
      });
    });

    describe('Queue Filtering (Workspace Queues)', () => {
      it('1. Filters list by assignedQueue="manager_queue" and assignedQueue="hr_queue"', async () => {
        // Query manager queue
        const mgrQueueRes = await request(app)
          .get('/api/v1/hrms/attendance/regularization')
          .query({ assignedQueue: 'manager_queue' })
          .set(hrHeaders);

        expect(mgrQueueRes.status).toBe(200);
        expect(Array.isArray(mgrQueueRes.body.data)).toBe(true);
        for (const item of mgrQueueRes.body.data) {
          expect(item.assignedQueue).toBe('manager_queue');
        }

        // Query HR queue
        const hrQueueRes = await request(app)
          .get('/api/v1/hrms/attendance/regularization')
          .query({ assignedQueue: 'hr_queue' })
          .set(hrHeaders);

        expect(hrQueueRes.status).toBe(200);
        expect(Array.isArray(hrQueueRes.body.data)).toBe(true);
        for (const item of hrQueueRes.body.data) {
          expect(item.assignedQueue).toBe('hr_queue');
        }
      });
    });
  },
);
