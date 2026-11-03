import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import {
  employeeLeaveRequests,
  employeeNotifications,
  leaveBalanceTransactions,
  leaveTypes,
} from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';
import { addDays, weekdayName } from '../rules/leaveCalendar.js';

const SEEDED_HOLIDAYS = new Set(['01-26', '05-01', '08-15', '10-02', '12-25', '03-14']);
const REPORTS = ['utilisation', 'lop', 'liability', 'absenteeism', 'approval_sla', 'audit'];

/** A working Tuesday at least four weeks out, clear of seeded holidays and the year end. */
function lopDate(): string {
  let d = addDays(new Date().toISOString().slice(0, 10), 28);
  while (weekdayName(d) !== 'tuesday' || SEEDED_HOLIDAYS.has(d.slice(5)) || d.slice(5) >= '12-20') {
    d = addDays(d, 1);
  }
  return d;
}

describe.skipIf(!isDatabaseConfigured)('Leave Operations API (P4 — reports)', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const employeeId = 'emp_demo_002';
  const startedAt = new Date(Date.now() - 1000);
  const created: string[] = [];
  let headers: Record<string, string>;
  let lopTypeId: string;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    const [lop] = await getDb()
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.companyId, companyId), eq(leaveTypes.code, 'LOP')));
    lopTypeId = lop!.id;
  });

  afterAll(async () => {
    const db = getDb();
    if (created.length) {
      await db
        .delete(leaveBalanceTransactions)
        .where(inArray(leaveBalanceTransactions.referenceId, created));
      await db.delete(employeeLeaveRequests).where(inArray(employeeLeaveRequests.id, created));
    }
    await db
      .delete(employeeNotifications)
      .where(
        and(
          eq(employeeNotifications.employeeId, employeeId),
          gte(employeeNotifications.createdAt, startedAt),
        ),
      );
  });

  it('serves every report with columns, rows, summary and the default range', async () => {
    for (const id of REPORTS) {
      const res = await request(app).get(`/api/v1/hrms/leave/reports/${id}`).set(headers);
      expect(res.status, id).toBe(200);
      expect(res.body.data.reportId).toBe(id);
      expect(res.body.data.columns.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.rows)).toBe(true);
      expect(res.body.data.summary.length).toBeGreaterThan(0);
      expect(res.body.data.range.to >= res.body.data.range.from).toBe(true);
    }
  });

  it('rejects unknown reports and invalid or oversized ranges', async () => {
    expect((await request(app).get('/api/v1/hrms/leave/reports/nope').set(headers)).status).toBe(
      404,
    );
    const reversed = await request(app)
      .get('/api/v1/hrms/leave/reports/lop?from=2026-06-01&to=2026-01-01')
      .set(headers);
    expect(reversed.status).toBe(400);
    const tooLong = await request(app)
      .get('/api/v1/hrms/leave/reports/lop?from=2024-01-01&to=2026-01-01')
      .set(headers);
    expect(tooLong.status).toBe(400);
  });

  it('reflects an approved LOP day in the LOP, absenteeism, SLA and audit reports', async () => {
    const date = lopDate();
    const apply = await request(app).post('/api/v1/hrms/leave/requests').set(headers).send({
      employeeId,
      leaveTypeId: lopTypeId,
      startDate: date,
      endDate: date,
      reason: 'Report fixture LOP day',
    });
    expect(apply.status).toBe(201);
    created.push(apply.body.data.id);
    const detail = await request(app)
      .get(`/api/v1/hrms/leave/requests/${apply.body.data.id}`)
      .set(headers);
    if (detail.body.data.myPendingApprovalId) {
      const approve = await request(app)
        .post('/api/v1/hrms/leave/approvals/bulk-approve')
        .set(headers)
        .send({ approvalIds: [detail.body.data.myPendingApprovalId] });
      expect(approve.body.data.approved).toBe(1);
    }

    const range = `from=${date.slice(0, 8)}01&to=${date}`;
    const lop = await request(app).get(`/api/v1/hrms/leave/reports/lop?${range}`).set(headers);
    const row = lop.body.data.rows.find(
      (r: { employeeNumber: string }) => r.employeeNumber === 'EMP-0002',
    );
    expect(row).toEqual(expect.objectContaining({ month: date.slice(0, 7), lopDays: 1 }));

    const trend = await request(app)
      .get(`/api/v1/hrms/leave/reports/absenteeism?${range}`)
      .set(headers);
    const month = trend.body.data.rows.find((r: { month: string }) => r.month === date.slice(0, 7));
    expect(month.lopDays).toBeGreaterThanOrEqual(1);

    const today = new Date().toISOString().slice(0, 10);
    const audit = await request(app)
      .get(`/api/v1/hrms/leave/reports/audit?from=${today}&to=${today}`)
      .set(headers);
    expect(
      audit.body.data.rows.some(
        (r: { employeeNumber: string; event: string }) =>
          r.employeeNumber === 'EMP-0002' && r.event === 'Applied',
      ),
    ).toBe(true);

    const sla = await request(app)
      .get(`/api/v1/hrms/leave/reports/approval_sla?from=${today}&to=${today}`)
      .set(headers);
    expect(sla.body.data.summary[0].value).toBeGreaterThanOrEqual(1);
  });

  it('exports a report as CSV with the column labels as the header', async () => {
    const res = await request(app)
      .get('/api/v1/hrms/leave/reports/utilisation?format=csv')
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/leave-utilisation-.*\.csv/);
    expect(res.text.split('\r\n')[0]).toBe(
      'Employee,Employee No.,Department,Leave Type,Entitled,Taken,Utilisation %',
    );
  });
});
