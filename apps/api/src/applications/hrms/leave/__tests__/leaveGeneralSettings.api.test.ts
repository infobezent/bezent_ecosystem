import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured } from '../../../../db/connection.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Leave General Settings V1 API Integration Suite', () => {
  const app = createApp();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';

  let headers: Record<string, string>;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
  });

  it('GET /api/v1/hrms/leave/settings/general — returns active settings and version', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/settings/general').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.settings).toBeDefined();
    expect(res.body.data.settings.leaveYearCycle).toBeDefined();
    expect(res.body.data.settings.balancePrecision).toBeDefined();
  });

  it('POST /api/v1/hrms/leave/settings/general — rejects change reason < 10 characters', async () => {
    const getRes = await request(app).get('/api/v1/hrms/leave/settings/general').set(headers);

    const currentVer = getRes.body.data.settings.currentVersionNumber;

    const res = await request(app).post('/api/v1/hrms/leave/settings/general').set(headers).send({
      leaveYearCycle: 'calendar_year',
      goLiveDate: '2026-11-01',
      dayCountingMethod: 'working_days',
      balancePrecision: 'two_decimals',
      balanceRoundingRule: 'nearest',
      maxBackdatedDays: 7,
      maxAdvanceBookingDays: 180,
      changeReason: 'Short',
      expectedCurrentVersionNumber: currentVer,
    });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toMatch(/Change reason must be at least 10 characters/i);
  });

  it('GET /api/v1/hrms/leave/settings/general/versions — returns audit version history', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/settings/general/versions').set(headers);

    expect(res.status).toBe(200);
    // GET never provisions, so an unconfigured company legitimately has no history yet.
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/hrms/leave/settings/general — rejects unknown enum values with 400, not 500', async () => {
    const getRes = await request(app).get('/api/v1/hrms/leave/settings/general').set(headers);

    const res = await request(app).post('/api/v1/hrms/leave/settings/general').set(headers).send({
      leaveYearCycle: 'calendar_year',
      goLiveDate: '2026-11-01',
      dayCountingMethod: 'hours',
      balancePrecision: 'two_decimals',
      balanceRoundingRule: 'nearest',
      maxBackdatedDays: 7,
      maxAdvanceBookingDays: 180,
      changeReason: 'Attempting an unsupported counting method',
      expectedCurrentVersionNumber: getRes.body.data.settings.currentVersionNumber,
    });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toMatch(/Day counting method must be one of/);
  });

  it('POST /api/v1/hrms/leave/settings/general — rejects impossible go-live dates', async () => {
    const res = await request(app).post('/api/v1/hrms/leave/settings/general').set(headers).send({
      leaveYearCycle: 'calendar_year',
      goLiveDate: '2026-02-31',
      dayCountingMethod: 'working_days',
      balancePrecision: 'two_decimals',
      balanceRoundingRule: 'nearest',
      maxBackdatedDays: 7,
      maxAdvanceBookingDays: 180,
      changeReason: 'Attempting an impossible go-live date',
      expectedCurrentVersionNumber: 1,
    });

    expect(res.status).toBe(400);
  });
});
