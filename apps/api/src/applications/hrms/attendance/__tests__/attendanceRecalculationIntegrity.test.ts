import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  employees,
  employeeWorkSchedules,
  attendancePunches,
  attendanceRegularizations,
} from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

/**
 * Audit findings C2 (recalculation timezone/workday) and C3 (preserve
 * corrections/regularizations across recalculation). Shared IST demo
 * company (`comp_demo_01` is seeded with timezone 'Asia/Kolkata').
 */
describe.skipIf(!isDatabaseConfigured)('Attendance recalculation integrity (C2 + C3)', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';

  const dayEmpId = 'emp_c2c3_day_01';
  const nightEmpId = 'emp_c2c3_night_01';
  const bulkRegEmpId = 'emp_c2c3_bulkreg_01';
  const bulkNormalEmpId = 'emp_c2c3_bulknorm_01';

  let headers: Record<string, string>;

  async function seedEmployeeWithIstShift(
    db: ReturnType<typeof getDb>,
    employeeId: string,
    employeeNumber: string,
    startTime: string,
    endTime: string,
  ) {
    await db
      .insert(employees)
      .values({
        id: employeeId,
        tenantId,
        companyId,
        employeeNumber,
        firstName: 'Test',
        lastName: employeeId,
        email: `${employeeId}@example.com`,
        joiningDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    await db
      .insert(employeeWorkSchedules)
      .values({
        employeeId,
        tenantId,
        companyId,
        workSchedule: 'Test Shift',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        startTime,
        endTime,
        breakMinutes: 60,
        lunchMinutes: 0,
        timeZone: 'Asia/Kolkata',
      })
      .onDuplicateKeyUpdate({ set: { startTime, endTime, timeZone: 'Asia/Kolkata' } });
  }

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    const db = getDb();

    await seedEmployeeWithIstShift(db, dayEmpId, 'EMP-C2C3-DAY-01', '09:00', '18:00');
    await seedEmployeeWithIstShift(db, nightEmpId, 'EMP-C2C3-NIGHT-01', '22:00', '06:00');
    await seedEmployeeWithIstShift(db, bulkRegEmpId, 'EMP-C2C3-BULKREG-01', '09:00', '18:00');
    await seedEmployeeWithIstShift(db, bulkNormalEmpId, 'EMP-C2C3-BULKNORM-01', '09:00', '18:00');
  });

  describe('C2 — recalculation uses company/shift timezone and the workday window', () => {
    it('recalculates an IST day shift without UTC-shifting the punch times (S25)', async () => {
      const workday = '2026-11-12';
      const db = getDb();
      await db.insert(attendancePunches).values([
        {
          id: `pch_${workday}_${dayEmpId}_in`,
          tenantId,
          companyId,
          employeeId: dayEmpId,
          punchType: 'in',
          source: 'manual',
          punchTime: new Date('2026-11-12T03:30:00.000Z'), // 09:00 IST
          workday,
        },
        {
          id: `pch_${workday}_${dayEmpId}_out`,
          tenantId,
          companyId,
          employeeId: dayEmpId,
          punchType: 'out',
          source: 'manual',
          punchTime: new Date('2026-11-12T12:30:00.000Z'), // 18:00 IST
          workday,
        },
      ]);

      const res = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/recalculate')
        .set(headers)
        .send({ employeeIds: [dayEmpId], date: workday });

      expect(res.status).toBe(200);
      expect(res.body.data.recalculatedCount).toBe(1);
      expect(res.body.data.skipped).toEqual([]);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/daily-log/employee/${dayEmpId}?date=${workday}`)
        .set(headers);
      expect(detail.status).toBe(200);
      expect(detail.body.data.attendanceSummary.status).toBe('present');
      expect(detail.body.data.attendanceSummary.checkInTime).toBe('09:00');
      expect(detail.body.data.attendanceSummary.checkOutTime).toBe('18:00');
    });

    it('recalculates a night shift spanning UTC midnight, finding both punches (S27)', async () => {
      const workday = '2026-11-10';
      const db = getDb();
      await db.insert(attendancePunches).values([
        {
          id: `pch_${workday}_${nightEmpId}_in`,
          tenantId,
          companyId,
          employeeId: nightEmpId,
          punchType: 'in',
          source: 'manual',
          punchTime: new Date('2026-11-10T16:30:00.000Z'), // 22:00 IST on workday
          workday,
        },
        {
          id: `pch_${workday}_${nightEmpId}_out`,
          tenantId,
          companyId,
          employeeId: nightEmpId,
          punchType: 'out',
          source: 'manual',
          punchTime: new Date('2026-11-11T00:30:00.000Z'), // 06:00 IST next calendar day
          workday, // still attributed to the shift's start day
        },
      ]);

      const res = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/recalculate')
        .set(headers)
        .send({ employeeIds: [nightEmpId], date: workday });

      expect(res.status).toBe(200);
      expect(res.body.data.recalculatedCount).toBe(1);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/daily-log/employee/${nightEmpId}?date=${workday}`)
        .set(headers);
      expect(detail.status).toBe(200);
      expect(detail.body.data.attendanceSummary.checkInTime).toBe('22:00');
      expect(detail.body.data.attendanceSummary.checkOutTime).toBe('06:00');
      expect(detail.body.data.attendanceSummary.status).not.toBe('incomplete');
    });
  });

  describe('C3 — manual corrections and regularized days survive recalculation', () => {
    it('dates the correction audit punch to the corrected day, not today (C3a)', async () => {
      const workday = '2026-11-13';
      const res = await request(app)
        .post('/api/v1/hrms/attendance/manual-correction')
        .set(headers)
        .send({
          employeeId: dayEmpId,
          date: workday,
          checkInTime: '09:05',
          checkOutTime: '18:10',
          reason: 'C3a regression test correction',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.checkInTime).toBe('09:05');
      expect(res.body.data.checkOutTime).toBe('18:10');
      expect(res.body.data.isRegularized).toBe(true);

      const db = getDb();
      const punches = await db
        .select()
        .from(attendancePunches)
        .where(
          and(eq(attendancePunches.employeeId, dayEmpId), eq(attendancePunches.workday, workday)),
        );
      expect(punches.length).toBe(2);
      const today = new Date().toISOString().slice(0, 10);
      for (const p of punches) {
        expect(p.workday).toBe(workday);
        // The punch's own UTC date must not be "today" -- it must fall on
        // (or immediately adjacent to, for timezone offset) the corrected day.
        expect(p.punchTime.toISOString().slice(0, 10)).not.toBe(today);
      }
    });

    it('skips a manually corrected day on recalculation instead of reverting it (C3b)', async () => {
      const workday = '2026-11-13'; // corrected in the previous test
      const res = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/recalculate')
        .set(headers)
        .send({ employeeIds: [dayEmpId], date: workday });

      expect(res.status).toBe(200);
      expect(res.body.data.recalculatedCount).toBe(0);
      expect(res.body.data.skipped).toEqual([
        { employeeId: dayEmpId, reason: 'Day is manually corrected/regularized' },
      ]);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/daily-log/employee/${dayEmpId}?date=${workday}`)
        .set(headers);
      expect(detail.body.data.attendanceSummary.checkInTime).toBe('09:05');
      expect(detail.body.data.attendanceSummary.checkOutTime).toBe('18:10');
    });

    it('applies a regularization with real punch evidence, then skips it on recalculation (C3b + C3c)', async () => {
      const workday = '2026-11-14';
      const regId = 'reg_c2c3_01';
      const db = getDb();

      await db
        .insert(attendanceRegularizations)
        .values({
          id: regId,
          tenantId,
          companyId,
          requestNumber: 'REG-C2C3-001',
          employeeId: dayEmpId,
          workday,
          requestType: 'both_missing',
          approvalStatus: 'submitted',
          applicationStatus: 'pending_application',
          proposedCheckIn: '09:00',
          proposedCheckOut: '18:00',
          reason: 'C3 regularization regression test',
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onDuplicateKeyUpdate({ set: { approvalStatus: 'submitted' } });

      const reviewRes = await request(app)
        .patch(`/api/v1/hrms/attendance/regularization/${regId}/review`)
        .set(headers)
        .send({ status: 'approved', remarks: 'Approved for C3 regression test' });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.applicationStatus).toBe('applied');

      // C3c: real punches, not just the attendance row, should now exist.
      const punches = await db
        .select()
        .from(attendancePunches)
        .where(
          and(eq(attendancePunches.employeeId, dayEmpId), eq(attendancePunches.workday, workday)),
        );
      expect(punches.length).toBeGreaterThanOrEqual(2);

      const recalcRes = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/recalculate')
        .set(headers)
        .send({ employeeIds: [dayEmpId], date: workday });

      expect(recalcRes.status).toBe(200);
      expect(recalcRes.body.data.recalculatedCount).toBe(0);
      expect(recalcRes.body.data.skipped[0]?.employeeId).toBe(dayEmpId);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/daily-log/employee/${dayEmpId}?date=${workday}`)
        .set(headers);
      expect(detail.body.data.attendanceSummary.checkInTime).toBe('09:00');
      expect(detail.body.data.attendanceSummary.checkOutTime).toBe('18:00');
      expect(detail.body.data.attendanceSummary.status).toBe('present');
    });

    it('bulk-recalculates a mixed batch: only the non-regularized day actually recomputes', async () => {
      const normalWorkday = '2026-11-16';
      const db = getDb();

      // Ordinary punches for bulkNormalEmpId
      await db.insert(attendancePunches).values([
        {
          id: `pch_${normalWorkday}_${bulkNormalEmpId}_in`,
          tenantId,
          companyId,
          employeeId: bulkNormalEmpId,
          punchType: 'in',
          source: 'manual',
          punchTime: new Date('2026-11-16T03:30:00.000Z'), // 09:00 IST
          workday: normalWorkday,
        },
        {
          id: `pch_${normalWorkday}_${bulkNormalEmpId}_out`,
          tenantId,
          companyId,
          employeeId: bulkNormalEmpId,
          punchType: 'out',
          source: 'manual',
          punchTime: new Date('2026-11-16T12:30:00.000Z'), // 18:00 IST
          workday: normalWorkday,
        },
      ]);

      // One recalculate endpoint call takes a single date; exercise the mixed
      // batch on that one date by regularizing bulkRegEmpId on the same day.
      await request(app).post('/api/v1/hrms/attendance/manual-correction').set(headers).send({
        employeeId: bulkRegEmpId,
        date: normalWorkday,
        checkInTime: '09:00',
        checkOutTime: '18:00',
        reason: 'Bulk test fixture: regularized on the shared date too',
      });

      const res = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/recalculate')
        .set(headers)
        .send({ employeeIds: [bulkRegEmpId, bulkNormalEmpId], date: normalWorkday });

      expect(res.status).toBe(200);
      expect(res.body.data.recalculatedCount).toBe(1);
      expect(res.body.data.skipped).toEqual([
        { employeeId: bulkRegEmpId, reason: 'Day is manually corrected/regularized' },
      ]);
    });
  });
});
