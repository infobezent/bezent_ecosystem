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
import { leaveOperationsRepository } from '../repository/leaveOperations.repository.js';
import { addDays, weekdayName } from '../rules/leaveCalendar.js';

const SEEDED_HOLIDAYS = new Set(['01-26', '05-01', '08-15', '10-02', '12-25', '03-14']);

/** A working Wednesday at least three weeks out, clear of seeded holidays and the year end. */
function testLeaveDate(): string {
  let d = addDays(new Date().toISOString().slice(0, 10), 21);
  while (
    weekdayName(d) !== 'wednesday' ||
    SEEDED_HOLIDAYS.has(d.slice(5)) ||
    d.slice(5) >= '12-20'
  ) {
    d = addDays(d, 1);
  }
  return d;
}

describe.skipIf(!isDatabaseConfigured)('Leave Operations API (P1)', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const employeeId = 'emp_demo_002';
  const startedAt = new Date(Date.now() - 1000);
  const createdRequests: string[] = [];
  let headers: Record<string, string>;
  let leaveTypeId: string;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    const [cl] = await getDb()
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.companyId, companyId), eq(leaveTypes.code, 'CL')));
    leaveTypeId = cl!.id;
  });

  afterAll(async () => {
    const db = getDb();
    if (createdRequests.length) {
      await db
        .delete(leaveBalanceTransactions)
        .where(inArray(leaveBalanceTransactions.referenceId, createdRequests));
      await db
        .delete(employeeLeaveRequests)
        .where(inArray(employeeLeaveRequests.id, createdRequests));
    }
    await db
      .delete(employeeNotifications)
      .where(
        and(
          eq(employeeNotifications.employeeId, employeeId),
          inArray(employeeNotifications.title, [
            'Leave applied on your behalf',
            'Leave cancelled by HR',
            'Leave approval required',
            'Leave approved',
          ]),
          gte(employeeNotifications.createdAt, startedAt),
        ),
      );
  });

  it('returns the overview with metrics, attention items and company scope', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/overview').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data.scope).toBe('company');
    expect(res.body.data.metrics).toEqual(
      expect.objectContaining({
        onLeaveToday: expect.any(Number),
        workforce: expect.any(Number),
        pendingApprovals: expect.any(Number),
      }),
    );
    expect(Array.isArray(res.body.data.attention)).toBe(true);

    const bad = await request(app).get('/api/v1/hrms/leave/overview?date=2026-13-40').set(headers);
    expect(bad.status).toBe(400);
  });

  it('applies on behalf, lists, opens, bulk-approves and HR-cancels a request', async () => {
    const date = testLeaveDate();
    const workspace = await request(app)
      .get(`/api/v1/hrms/leave/employees/${employeeId}/workspace`)
      .set(headers);
    expect(workspace.status).toBe(200);

    const apply = await request(app).post('/api/v1/hrms/leave/requests').set(headers).send({
      employeeId,
      leaveTypeId,
      startDate: date,
      endDate: date,
      reason: 'Applied by HR for a family function',
    });
    expect(apply.status).toBe(201);
    const id: string = apply.body.data.id;
    createdRequests.push(id);
    expect(apply.body.data.status).toBe('pending');

    const list = await request(app)
      .get('/api/v1/hrms/leave/requests?status=pending&search=EMP-0002&appliedByHr=true')
      .set(headers);
    expect(list.status).toBe(200);
    const row = list.body.data.items.find((i: { id: string }) => i.id === id);
    expect(row).toEqual(
      expect.objectContaining({ appliedOnBehalf: true, employeeNumber: 'EMP-0002', totalDays: 1 }),
    );
    expect(list.body.data.counts.pending).toBeGreaterThanOrEqual(1);

    const detail = await request(app).get(`/api/v1/hrms/leave/requests/${id}`).set(headers);
    expect(detail.status).toBe(200);
    expect(detail.body.data.calculation.calculatedDurationDays).toBe(1);
    expect(detail.body.data.approvals.length).toBeGreaterThanOrEqual(1);
    expect(detail.body.data.submittedBy).toBe('HRMS Test Operator');
    const approvalId: string = detail.body.data.myPendingApprovalId;
    expect(approvalId).toBeTruthy();

    const stats = await request(app).get('/api/v1/hrms/leave/approval-stats').set(headers);
    expect(stats.status).toBe(200);
    expect(stats.body.data).toEqual(
      expect.objectContaining({
        awaitingMe: expect.any(Number),
        approvedToday: expect.any(Number),
      }),
    );

    const bulk = await request(app)
      .post('/api/v1/hrms/leave/approvals/bulk-approve')
      .set(headers)
      .send({ approvalIds: [approvalId, 'missing-approval'] });
    expect(bulk.status).toBe(200);
    expect(bulk.body.data.approved).toBe(1);
    expect(
      bulk.body.data.results.find(
        (r: { approvalId: string }) => r.approvalId === 'missing-approval',
      ).ok,
    ).toBe(false);

    const noReason = await request(app)
      .post(`/api/v1/hrms/leave/requests/${id}/cancel`)
      .set(headers)
      .send({});
    expect(noReason.status).toBe(400);

    const after = await request(app).get(`/api/v1/hrms/leave/requests/${id}`).set(headers);
    if (after.body.data.status === 'approved') {
      const cancel = await request(app)
        .post(`/api/v1/hrms/leave/requests/${id}/cancel`)
        .set(headers)
        .send({ reason: 'Employee rescheduled' });
      expect(cancel.status).toBe(200);
      expect(cancel.body.data.status).toBe('cancelled');
      expect(cancel.body.data.cancellationReason).toBe('Employee rescheduled');
    } else {
      // Multi-level workflows leave it pending after level 1: HR cancels the pending request.
      const cancel = await request(app)
        .post(`/api/v1/hrms/leave/requests/${id}/cancel`)
        .set(headers)
        .send({ reason: 'Employee rescheduled' });
      expect(cancel.body.data.status).toBe('cancelled');
    }

    const again = await request(app)
      .post(`/api/v1/hrms/leave/requests/${id}/cancel`)
      .set(headers)
      .send({ reason: 'Twice' });
    expect(again.status).toBe(409);
  });

  it('rejects an invalid register filter and an unknown request', async () => {
    const bad = await request(app).get('/api/v1/hrms/leave/requests?status=bogus').set(headers);
    expect(bad.status).toBe(400);
    const missing = await request(app).get('/api/v1/hrms/leave/requests/nope').set(headers);
    expect(missing.status).toBe(404);
  });

  it('requires a reason and validates bulk approve input', async () => {
    const empty = await request(app)
      .post('/api/v1/hrms/leave/approvals/bulk-approve')
      .set(headers)
      .send({ approvalIds: [] });
    expect(empty.status).toBe(400);
  });

  it('resolves direct and indirect reportees for manager scoping', async () => {
    const ids = await leaveOperationsRepository.listReporteeIds(
      tenantId,
      companyId,
      'emp_demo_001',
    );
    expect(ids).toEqual(expect.arrayContaining(['emp_demo_002', 'emp_demo_003', 'emp_demo_004']));
    expect(ids).not.toContain('emp_demo_001');
  });
});
