import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, gte } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import { leaveCycleCloseRuns } from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Leave Operations API (P3 — holidays & year-end)', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const startedAt = new Date(Date.now() - 1000);
  const thisYear = new Date().getUTCFullYear();
  let headers: Record<string, string>;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
  });

  afterAll(async () => {
    // Only runs this suite closed by hand; the seed and sweeps are left alone.
    await getDb()
      .delete(leaveCycleCloseRuns)
      .where(
        and(
          eq(leaveCycleCloseRuns.companyId, companyId),
          eq(leaveCycleCloseRuns.cycleStartDate, `${thisYear - 1}-01-01`),
          gte(leaveCycleCloseRuns.createdAt, startedAt),
        ),
      );
  });

  it('returns the published holiday calendar with types, weekdays and metrics', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/holiday-calendar').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data.calendar).toEqual(
      expect.objectContaining({ name: 'Company Holidays', optionalHolidayQuota: 2 }),
    );
    expect(res.body.data.metrics).toEqual(
      expect.objectContaining({ total: 6, mandatory: 5, optional: 1, optionalQuota: 2 }),
    );
    const christmas = res.body.data.holidays.find(
      (h: { name: string }) => h.name === 'Christmas Day',
    );
    expect(christmas).toEqual(
      expect.objectContaining({ date: `${thisYear}-12-25`, type: 'mandatory', optedCount: 0 }),
    );
    expect(christmas.weekday).toMatch(/day$/);
  });

  it('returns an empty view for a year without a published calendar and rejects bad years', async () => {
    const empty = await request(app)
      .get('/api/v1/hrms/leave/holiday-calendar?year=2099')
      .set(headers);
    expect(empty.status).toBe(200);
    expect(empty.body.data.calendar).toBeNull();
    expect(empty.body.data.holidays).toEqual([]);
    const bad = await request(app).get('/api/v1/hrms/leave/holiday-calendar?year=abc').set(headers);
    expect(bad.status).toBe(400);
  });

  it('previews the current leave year without allowing it to close early', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/year-end').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data.cycle.start).toBe(`${thisYear}-01-01`);
    expect(res.body.data.canClose).toBe(false);
    expect(res.body.data.autoCloseOn).toBe(`${thisYear + 1}-01-01`);
    expect(res.body.data.totals).toEqual(
      expect.objectContaining({ employees: expect.any(Number), carryForward: expect.any(Number) }),
    );
    for (const row of res.body.data.rows) {
      expect(row.employeeName).toBeTruthy();
    }

    const early = await request(app)
      .post('/api/v1/hrms/leave/year-end/close')
      .set(headers)
      .send({ cycleStart: `${thisYear}-01-01` });
    expect(early.status).toBe(400);
  });

  it('validates the close request and closes a finished year once', async () => {
    const missing = await request(app)
      .post('/api/v1/hrms/leave/year-end/close')
      .set(headers)
      .send({});
    expect(missing.status).toBe(400);
    const notStart = await request(app)
      .post('/api/v1/hrms/leave/year-end/close')
      .set(headers)
      .send({ cycleStart: `${thisYear - 1}-03-01` });
    expect(notStart.status).toBe(400);

    const previous = await request(app)
      .get(`/api/v1/hrms/leave/year-end?cycleStart=${thisYear - 1}-01-01`)
      .set(headers);
    expect(previous.status).toBe(200);
    if (previous.body.data.alreadyClosed) return;
    expect(previous.body.data.canClose).toBe(true);

    const close = await request(app)
      .post('/api/v1/hrms/leave/year-end/close')
      .set(headers)
      .send({ cycleStart: `${thisYear - 1}-01-01` });
    expect(close.status).toBe(200);
    expect(close.body.data.runId).toBeTruthy();

    const again = await request(app)
      .post('/api/v1/hrms/leave/year-end/close')
      .set(headers)
      .send({ cycleStart: `${thisYear - 1}-01-01` });
    expect(again.status).toBe(409);

    const after = await request(app)
      .get(`/api/v1/hrms/leave/year-end?cycleStart=${thisYear - 1}-01-01`)
      .set(headers);
    expect(after.body.data.alreadyClosed).toBe(true);
    expect(
      after.body.data.runs.some((r: { closedBy: string }) => r.closedBy === 'HRMS Test Operator'),
    ).toBe(true);
  });
});
