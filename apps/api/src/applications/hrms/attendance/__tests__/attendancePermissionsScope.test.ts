import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  users,
  memberships,
  roleAssignments,
  employees,
  attendancePunches,
  employeeAttendance,
  attendanceRegularizations,
  employeeNotifications,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import {
  hrmsTestHeaders,
  signInForTest,
} from '../../../../platform/__tests__/support/testSession.js';
import {
  findSystemRole,
  PERMISSION_CATALOG,
} from '../../../../platform/access/catalog/accessCatalog.js';

describe.skipIf(!isDatabaseConfigured)(
  'Attendance permissions & team-scope (audit finding C4)',
  () => {
    const app = createApp();
    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';

    const managerUserId = 'usr_mgr_c4_perm_test';
    const managerEmail = 'manager.c4test@bezent-test.example';
    const managerEmployeeId = 'emp_c4_manager_01';
    const directReportId = 'emp_c4_direct_report_01';
    const otherEmployeeId = 'emp_c4_other_01';

    let hrHeaders: Record<string, string>;
    let managerHeaders: Record<string, string>;

    beforeAll(async () => {
      const db = getDb();
      hrHeaders = await hrmsTestHeaders(companyId, tenantId);

      const unused = hashPassword('not-used-by-otp');
      await db.insert(users).ignore().values({
        id: managerUserId,
        email: managerEmail,
        passwordHash: unused.hash,
        salt: unused.salt,
        firstName: 'Manager',
        lastName: 'C4Test',
        status: 'active',
      });
      await db
        .insert(memberships)
        .values({
          id: `mem_mgr_c4_${companyId}`,
          userId: managerUserId,
          tenantId,
          companyId,
          role: 'employee',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { role: 'employee', status: 'active' } });
      await db
        .insert(roleAssignments)
        .values({
          id: `ra_mgr_c4_${companyId}`,
          userId: managerUserId,
          roleId: 'role_sys_manager',
          tenantId,
          companyId,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // The manager's own employee record (so access resolution links userId -> employeeId).
      await db
        .insert(employees)
        .values({
          id: managerEmployeeId,
          tenantId,
          companyId,
          userId: managerUserId,
          employeeNumber: 'EMP-C4-MGR-01',
          firstName: 'Manager',
          lastName: 'C4Test',
          email: managerEmail,
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { userId: managerUserId, employmentStatus: 'active' } });

      // A direct report of the manager.
      await db
        .insert(employees)
        .values({
          id: directReportId,
          tenantId,
          companyId,
          reportingManagerId: managerEmployeeId,
          employeeNumber: 'EMP-C4-DR-01',
          firstName: 'Direct',
          lastName: 'Report',
          email: 'direct.report.c4test@bezent-test.example',
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { reportingManagerId: managerEmployeeId } });

      // An employee NOT reporting to the manager.
      await db
        .insert(employees)
        .values({
          id: otherEmployeeId,
          tenantId,
          companyId,
          reportingManagerId: null,
          employeeNumber: 'EMP-C4-OTHER-01',
          firstName: 'Other',
          lastName: 'Employee',
          email: 'other.employee.c4test@bezent-test.example',
          joiningDate: '2026-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        })
        .onDuplicateKeyUpdate({ set: { reportingManagerId: null } });

      const { token } = await signInForTest(managerEmail);
      managerHeaders = { authorization: `Bearer ${token}`, 'x-company-id': companyId };
    });

    afterAll(async () => {
      const db = getDb();
      await db
        .delete(roleAssignments)
        .where(
          and(eq(roleAssignments.userId, managerUserId), eq(roleAssignments.companyId, companyId)),
        );
      await db
        .delete(memberships)
        .where(and(eq(memberships.userId, managerUserId), eq(memberships.companyId, companyId)));
      for (const id of [directReportId, otherEmployeeId, managerEmployeeId]) {
        await db.delete(attendancePunches).where(eq(attendancePunches.employeeId, id));
        await db.delete(employeeAttendance).where(eq(employeeAttendance.employeeId, id));
        await db
          .delete(attendanceRegularizations)
          .where(eq(attendanceRegularizations.employeeId, id));
        await db.delete(employeeNotifications).where(eq(employeeNotifications.employeeId, id));
      }
      await db.delete(employees).where(eq(employees.id, directReportId));
      await db.delete(employees).where(eq(employees.id, otherEmployeeId));
      await db.delete(employees).where(eq(employees.id, managerEmployeeId));
      await db.delete(users).where(eq(users.id, managerUserId));
    });

    // ── Catalog-level ────────────────────────────────────────────────────────
    it('catalog: role_sys_manager excludes the 4 new C4 keys; role_sys_hr_manager includes them', () => {
      const newKeys = [
        'hrms.attendance.correct',
        'hrms.attendance.policy_manage',
        'hrms.attendance.payroll_close',
        'hrms.attendance.approve_hr',
      ];
      expect(newKeys.every((k) => PERMISSION_CATALOG.some((p) => p.id === k))).toBe(true);

      const manager = findSystemRole('role_sys_manager')!;
      for (const key of newKeys) {
        expect(manager.permissions).not.toContain(key);
      }

      const hrManager = findSystemRole('role_sys_hr_manager')!;
      for (const key of newKeys) {
        expect(hrManager.permissions).toContain(key);
      }
    });

    // ── Policy management (policy_manage) ───────────────────────────────────
    it('manager is denied overtime policy creation; HR is not blocked by permission', async () => {
      const managerRes = await request(app)
        .post('/api/v1/hrms/attendance/overtime/policies')
        .set(managerHeaders)
        .send({});
      expect(managerRes.status).toBe(403);

      const hrRes = await request(app)
        .post('/api/v1/hrms/attendance/overtime/policies')
        .set(hrHeaders)
        .send({});
      expect(hrRes.status).not.toBe(403);
    });

    it('manager is denied comp-off policy creation; HR is not blocked by permission', async () => {
      const managerRes = await request(app)
        .post('/api/v1/hrms/attendance/comp-off/policies')
        .set(managerHeaders)
        .send({});
      expect(managerRes.status).toBe(403);

      const hrRes = await request(app)
        .post('/api/v1/hrms/attendance/comp-off/policies')
        .set(hrHeaders)
        .send({});
      expect(hrRes.status).not.toBe(403);
    });

    // ── Payroll close (payroll_close) ───────────────────────────────────────
    it('manager is denied monthly-summary bulk execute; HR is not blocked by permission', async () => {
      const managerRes = await request(app)
        .post('/api/v1/hrms/attendance/monthly-summary/bulk')
        .set(managerHeaders)
        .send({ ids: [] });
      expect(managerRes.status).toBe(403);

      const hrRes = await request(app)
        .post('/api/v1/hrms/attendance/monthly-summary/bulk')
        .set(hrHeaders)
        .send({ ids: [] });
      expect(hrRes.status).not.toBe(403);
    });

    it('manager is denied daily-log bulk-finalize; HR is not blocked by permission', async () => {
      const managerRes = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/bulk-finalize')
        .set(managerHeaders)
        .send({ employeeIds: [], date: '2026-11-01' });
      expect(managerRes.status).toBe(403);

      const hrRes = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/bulk-finalize')
        .set(hrHeaders)
        .send({ employeeIds: [], date: '2026-11-01' });
      expect(hrRes.status).not.toBe(403);
    });

    // ── Team scope (data-scope, not a permission key) ───────────────────────
    it('daily log: manager sees only direct reports; HR sees the whole company', async () => {
      const managerRes = await request(app)
        .get('/api/v1/hrms/attendance/daily-log')
        .query({ date: '2026-11-01', limit: 100 })
        .set(managerHeaders);
      expect(managerRes.status).toBe(200);
      const managerIds = managerRes.body.data.map((row: { employeeId: string }) => row.employeeId);
      expect(managerIds).toContain(directReportId);
      expect(managerIds).not.toContain(otherEmployeeId);

      const hrRes = await request(app)
        .get('/api/v1/hrms/attendance/daily-log')
        .query({ date: '2026-11-01', limit: 100 })
        .set(hrHeaders);
      expect(hrRes.status).toBe(200);
      const hrIds = hrRes.body.data.map((row: { employeeId: string }) => row.employeeId);
      expect(hrIds).toContain(directReportId);
      expect(hrIds).toContain(otherEmployeeId);
    });

    it("manager cannot read a non-report employee's daily detail, but can read a direct report's", async () => {
      const deniedRes = await request(app)
        .get(`/api/v1/hrms/attendance/daily-log/employee/${otherEmployeeId}`)
        .query({ date: '2026-11-01' })
        .set(managerHeaders);
      expect(deniedRes.status).toBe(403);

      const allowedRes = await request(app)
        .get(`/api/v1/hrms/attendance/daily-log/employee/${directReportId}`)
        .query({ date: '2026-11-01' })
        .set(managerHeaders);
      expect(allowedRes.status).toBe(200);
    });

    // ── Manual correction team-scope ────────────────────────────────────────
    it('manager cannot manually correct an employee outside their reporting line', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/manual-correction')
        .set(managerHeaders)
        .send({
          employeeId: otherEmployeeId,
          date: '2026-11-02',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'C4 test: out-of-scope correction attempt',
        });
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN_TEAM_SCOPE');
    });

    it('manager correcting a direct report is routed to approval, not applied directly (default approvalMode)', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/manual-correction')
        .set(managerHeaders)
        .send({
          employeeId: directReportId,
          date: '2026-11-25',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'C4 test: manager correction for direct report',
        });
      // Not a team-scope rejection, and not silently applied -- routed to the
      // existing regularization approval pipeline (audit finding C4).
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('MANUAL_ENTRY_PENDING_APPROVAL');
    });

    it('HR correcting any employee is never routed to approval (company-wide, no team scope)', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/manual-correction')
        .set(hrHeaders)
        .send({
          employeeId: otherEmployeeId,
          date: '2026-11-24',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'C4 test: HR correction, company-wide',
        });
      expect(res.status).toBe(200);
    });
  },
);
