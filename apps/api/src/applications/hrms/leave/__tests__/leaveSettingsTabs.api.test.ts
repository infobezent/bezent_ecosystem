import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray, eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import {
  holidayCalendars,
  leaveAccrualRules,
  leaveApprovalWorkflows,
  leaveRestrictionRules,
} from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Leave Settings Tabs 4–7 API Integration Suite', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const stamp = Date.now().toString().slice(-6);
  const created = {
    calendars: [] as string[],
    workflows: [] as string[],
    ruleKeys: [] as string[],
    accrualTypes: [] as string[],
  };
  let headers: Record<string, string>;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
  });

  afterAll(async () => {
    const db = getDb();
    if (created.calendars.length)
      await db.delete(holidayCalendars).where(inArray(holidayCalendars.id, created.calendars));
    if (created.workflows.length)
      await db
        .delete(leaveApprovalWorkflows)
        .where(inArray(leaveApprovalWorkflows.id, created.workflows));
    if (created.ruleKeys.length)
      await db
        .delete(leaveRestrictionRules)
        .where(inArray(leaveRestrictionRules.ruleKey, created.ruleKeys));
    for (const typeId of created.accrualTypes) {
      await db
        .delete(leaveAccrualRules)
        .where(
          and(
            eq(leaveAccrualRules.leaveTypeId, typeId),
            eq(leaveAccrualRules.effectiveFrom, '2099-01-01'),
          ),
        );
    }
  });

  describe('Tab 6 — Holidays', () => {
    it('creates a calendar, adds and imports holidays, publishes, and rejects out-of-year dates', async () => {
      const createRes = await request(app)
        .post('/api/v1/hrms/leave/holidays/calendars')
        .set(headers)
        .send({
          name: `Test Calendar ${stamp}`,
          year: 2099,
          isDefault: false,
          optionalHolidayQuota: 1,
        });
      expect(createRes.status).toBe(201);
      const id = createRes.body.data.id;
      created.calendars.push(id);
      expect(createRes.body.data.cycleStart).toMatch(/^2099-/);

      const add = await request(app)
        .post(`/api/v1/hrms/leave/holidays/calendars/${id}/holidays`)
        .set(headers)
        .send({ date: '2099-08-15', name: 'Independence Day', type: 'mandatory' });
      expect(add.status).toBe(201);
      expect(add.body.data.holidays).toHaveLength(1);

      const outside = await request(app)
        .post(`/api/v1/hrms/leave/holidays/calendars/${id}/holidays`)
        .set(headers)
        .send({ date: '2098-12-25', name: 'Wrong Year', type: 'mandatory' });
      expect(outside.status).toBe(400);

      const badImport = await request(app)
        .post(`/api/v1/hrms/leave/holidays/calendars/${id}/import`)
        .set(headers)
        .send({
          csv: 'date,name,type\n2099-01-26,Republic Day,mandatory\n2099-13-01,Bad,mandatory',
        });
      expect(badImport.status).toBe(200);
      expect(badImport.body.data.imported).toBe(0);
      expect(badImport.body.data.errors[0].row).toBe(2);

      const goodImport = await request(app)
        .post(`/api/v1/hrms/leave/holidays/calendars/${id}/import`)
        .set(headers)
        .send({ csv: '2099-01-26,Republic Day,mandatory\n2099-03-14,Holi,optional' });
      expect(goodImport.body.data.imported).toBe(2);

      const publish = await request(app)
        .post(`/api/v1/hrms/leave/holidays/calendars/${id}/publish`)
        .set(headers);
      expect(publish.status).toBe(200);
      expect(publish.body.data.status).toBe('published');

      const del = await request(app)
        .delete(`/api/v1/hrms/leave/holidays/calendars/${id}`)
        .set(headers);
      expect(del.status).toBe(400);
    });
  });

  describe('Tab 7 — Approval workflow', () => {
    it('lists the auto-created default workflow', async () => {
      const res = await request(app).get('/api/v1/hrms/leave/workflows').set(headers);
      expect(res.status).toBe(200);
      expect(res.body.data.some((w: { isDefault: boolean }) => w.isDefault)).toBe(true);
    });

    it('creates a two-level workflow and validates levels', async () => {
      const bad = await request(app)
        .post('/api/v1/hrms/leave/workflows')
        .set(headers)
        .send({ name: `Bad ${stamp}`, levels: [] });
      expect(bad.status).toBe(400);

      const res = await request(app)
        .post('/api/v1/hrms/leave/workflows')
        .set(headers)
        .send({
          name: `Two Level ${stamp}`,
          levels: [
            { approverType: 'reporting_manager', slaHours: 24, onSlaBreach: 'escalate_to_next' },
            { approverType: 'department_head', slaHours: 48, onSlaBreach: 'notify_only' },
          ],
          autoApproveUpToDays: 0.5,
        });
      expect(res.status).toBe(201);
      created.workflows.push(res.body.data.id);
      expect(res.body.data.levels).toHaveLength(2);
      expect(res.body.data.autoApproveUpToDays).toBe(0.5);
    });

    it('serves the HR approval queue', async () => {
      const res = await request(app).get('/api/v1/hrms/leave/approvals?scope=all').set(headers);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Tab 5 — Restrictions', () => {
    it('creates a rule and versions it on edit', async () => {
      const types = await request(app).get('/api/v1/hrms/leave/types?limit=1').set(headers);
      const leaveTypeId = types.body.data.items[0].id;

      const res = await request(app)
        .post('/api/v1/hrms/leave/restrictions')
        .set(headers)
        .send({
          ruleType: 'min_notice',
          name: `Notice ${stamp}`,
          config: { leaveTypeId, days: 3 },
        });
      expect(res.status).toBe(201);
      const ruleKey = res.body.data.ruleKey;
      created.ruleKeys.push(ruleKey);
      expect(res.body.data.version).toBe(1);

      const upd = await request(app)
        .put(`/api/v1/hrms/leave/restrictions/${ruleKey}`)
        .set(headers)
        .send({ config: { leaveTypeId, days: 5 } });
      expect(upd.status).toBe(200);
      expect(upd.body.data.version).toBe(2);

      const history = await request(app)
        .get(`/api/v1/hrms/leave/restrictions/${ruleKey}/history`)
        .set(headers);
      expect(history.body.data.map((r: { version: number }) => r.version)).toEqual([1, 2]);

      const invalid = await request(app)
        .post('/api/v1/hrms/leave/restrictions')
        .set(headers)
        .send({ ruleType: 'min_notice', name: `Bad ${stamp}`, config: { leaveTypeId, days: 200 } });
      expect(invalid.status).toBe(400);
    });
  });

  describe('Tab 4 — Accrual & carry forward', () => {
    it('lists rules per leave type, saves a future-dated rule, previews a year end', async () => {
      const list = await request(app).get('/api/v1/hrms/leave/accrual/rules').set(headers);
      expect(list.status).toBe(200);
      const tracked = list.body.data.find(
        (r: { leaveType: { isTracked: boolean } }) => r.leaveType.isTracked,
      );
      expect(tracked.current).toBeDefined();

      const save = await request(app)
        .put(`/api/v1/hrms/leave/accrual/rules/${tracked.leaveType.id}`)
        .set(headers)
        .send({
          grantMethod: 'monthly',
          carryForwardEnabled: true,
          maxCarryForwardDays: 5,
          effectiveFrom: '2099-01-01',
        });
      expect(save.status).toBe(200);
      created.accrualTypes.push(tracked.leaveType.id);
      expect(save.body.data.grantMethod).toBe('monthly');

      const preview = await request(app)
        .get(
          `/api/v1/hrms/leave/accrual/year-end/preview?cycleStart=${new Date().getFullYear() - 1}-01-01`,
        )
        .set(headers);
      expect(preview.status).toBe(200);
      expect(Array.isArray(preview.body.data.rows)).toBe(true);

      const notCycleStart = await request(app)
        .get('/api/v1/hrms/leave/accrual/year-end/preview?cycleStart=2025-02-01')
        .set(headers);
      expect(notCycleStart.status).toBe(400);
    });
  });
});
