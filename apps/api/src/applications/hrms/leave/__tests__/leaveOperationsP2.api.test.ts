import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, gte } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import {
  employeeNotifications,
  leaveBalanceTransactions,
  leaveTypes,
} from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Leave Operations API (P2 — calendar & balances)', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const employeeId = 'emp_demo_002';
  const startedAt = new Date(Date.now() - 1000);
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
    // Credits and debits in this suite net to zero; drop their ledger rows and notices.
    await db
      .delete(leaveBalanceTransactions)
      .where(
        and(
          eq(leaveBalanceTransactions.employeeId, employeeId),
          eq(leaveBalanceTransactions.referenceType, 'manual_adjustment'),
          gte(leaveBalanceTransactions.createdAt, startedAt),
        ),
      );
    await db
      .delete(employeeNotifications)
      .where(
        and(
          eq(employeeNotifications.employeeId, employeeId),
          gte(employeeNotifications.createdAt, startedAt),
        ),
      );
  });

  it('returns a month calendar with employees, days and holiday markers', async () => {
    const res = await request(app)
      .get('/api/v1/hrms/leave/calendar?from=2026-12-01&to=2026-12-31')
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data.days).toHaveLength(31);
    expect(res.body.data.employees.length).toBeGreaterThan(0);
    const christmas = res.body.data.days.find((d: { date: string }) => d.date === '2026-12-25');
    expect(christmas.holiday?.name).toBe('Christmas Day');
    expect(
      res.body.data.days.find((d: { date: string }) => d.date === '2026-12-26').isWeekend,
    ).toBe(true);
  });

  it('rejects invalid or oversized calendar ranges', async () => {
    const reversed = await request(app)
      .get('/api/v1/hrms/leave/calendar?from=2026-12-31&to=2026-12-01')
      .set(headers);
    expect(reversed.status).toBe(400);
    const tooLong = await request(app)
      .get('/api/v1/hrms/leave/calendar?from=2026-01-01&to=2026-06-30')
      .set(headers);
    expect(tooLong.status).toBe(400);
  });

  it('returns the balance register with tracked types, rows and metrics', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/balances?pageSize=10').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data.leaveTypes.some((t: { code: string }) => t.code === 'CL')).toBe(true);
    expect(res.body.data.leaveTypes.some((t: { code: string }) => t.code === 'LOP')).toBe(false);
    expect(res.body.data.metrics).toEqual(
      expect.objectContaining({
        employees: expect.any(Number),
        negativeBalances: expect.any(Number),
      }),
    );
    const search = await request(app)
      .get('/api/v1/hrms/leave/balances?search=EMP-0002')
      .set(headers);
    expect(search.body.data.rows).toHaveLength(1);
    expect(search.body.data.rows[0].employee.employeeNumber).toBe('EMP-0002');
  });

  it('credits and debits a balance through the ledger with validation', async () => {
    const before = await request(app)
      .get(`/api/v1/hrms/leave/balances/${employeeId}/ledger?leaveTypeId=${leaveTypeId}`)
      .set(headers);
    expect(before.status).toBe(200);
    const startAvailable =
      before.body.data.balances.find((b: { leaveTypeId: string }) => b.leaveTypeId === leaveTypeId)
        ?.available ?? 0;

    const bad = [
      { direction: 'credit', days: 1 },
      { direction: 'credit', days: 0.3, reason: 'Odd step' },
      { direction: 'sideways', days: 1, reason: 'Bad direction' },
      { direction: 'debit', days: startAvailable + 5, reason: 'Too much' },
    ];
    for (const body of bad) {
      const res = await request(app)
        .post('/api/v1/hrms/leave/balances/adjustments')
        .set(headers)
        .send({ employeeId, leaveTypeId, ...body });
      expect(res.status).toBe(400);
    }

    const credit = await request(app)
      .post('/api/v1/hrms/leave/balances/adjustments')
      .set(headers)
      .send({ employeeId, leaveTypeId, direction: 'credit', days: 1.5, reason: 'Comp for event' });
    expect(credit.status).toBe(201);
    expect(credit.body.data.days).toBe(1.5);

    const after = await request(app)
      .get(`/api/v1/hrms/leave/balances/${employeeId}/ledger?leaveTypeId=${leaveTypeId}`)
      .set(headers);
    const cell = after.body.data.balances.find(
      (b: { leaveTypeId: string }) => b.leaveTypeId === leaveTypeId,
    );
    expect(cell.available).toBe(startAvailable + 1.5);
    const last = after.body.data.entries.at(-1);
    expect(last).toEqual(
      expect.objectContaining({ txnType: 'adjustment', effect: 1.5, reason: 'Comp for event' }),
    );

    const debit = await request(app)
      .post('/api/v1/hrms/leave/balances/adjustments')
      .set(headers)
      .send({ employeeId, leaveTypeId, direction: 'debit', days: 1.5, reason: 'Reverse test' });
    expect(debit.status).toBe(201);
    expect(debit.body.data.days).toBe(-1.5);
  });

  it('rejects adjustments for untracked leave types and unknown employees', async () => {
    const [lop] = await getDb()
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(and(eq(leaveTypes.companyId, companyId), eq(leaveTypes.code, 'LOP')));
    const untracked = await request(app)
      .post('/api/v1/hrms/leave/balances/adjustments')
      .set(headers)
      .send({ employeeId, leaveTypeId: lop!.id, direction: 'credit', days: 1, reason: 'No' });
    expect(untracked.status).toBe(400);
    const ledger = await request(app)
      .get('/api/v1/hrms/leave/balances/emp_missing/ledger')
      .set(headers);
    expect(ledger.status).toBe(404);
  });
});
