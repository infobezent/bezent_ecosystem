import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import { departments, leavePolicies } from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Leave Policies V1 API Integration Suite', () => {
  const app = createApp();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const createdPolicyIds: string[] = [];

  let headers: Record<string, string>;
  let leaveTypeId: string;
  let deptIds: string[] = [];

  const suffix = () => `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);

    // A dedicated tracked leave type with no yearly ceiling keeps quotas independent of seed data.
    const code = `PT${suffix()}`;
    const typeRes = await request(app)
      .post('/api/v1/hrms/leave/types')
      .set(headers)
      .send({ name: `Policy Test Leave ${code}`, code, category: 'paid' });
    expect(typeRes.status).toBe(201);
    leaveTypeId = typeRes.body.data.id;

    const rows = await getDb()
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          eq(departments.status, 'active'),
        ),
      )
      .limit(2);
    deptIds = rows.map((r) => r.id);
  });

  afterAll(async () => {
    if (createdPolicyIds.length > 0) {
      await getDb().delete(leavePolicies).where(inArray(leavePolicies.id, createdPolicyIds));
    }
  });

  const createPolicy = async (body: Record<string, unknown>) => {
    const code = `POL${suffix()}`;
    const res = await request(app)
      .post('/api/v1/hrms/leave/policies')
      .set(headers)
      .send({
        name: `Automated Policy ${code}`,
        code,
        effectiveFrom: '2026-01-01',
        entitlements: [{ leaveTypeId, annualQuota: 12 }],
        ...body,
      });
    if (res.body.data?.id) createdPolicyIds.push(res.body.data.id);
    return res;
  };

  it('GET /api/v1/hrms/leave/policies — lists leave policies and summary for authorized company', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/policies').set(headers);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.summary.total).toBe('number');
    expect(typeof res.body.data.summary.employeesWithoutPolicy).toBe('number');
  });

  it('POST /api/v1/hrms/leave/policies — rejects invalid code with 400', async () => {
    const res = await request(app).post('/api/v1/hrms/leave/policies').set(headers).send({
      name: 'Invalid Code Policy',
      code: 'bad policy code!!',
      effectiveFrom: '2026-01-01',
    });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toMatch(/code is required and must be 1-20 alphanumeric/i);
  });

  it('POST — rejects a leave type id that does not exist', async () => {
    const res = await createPolicy({
      entitlements: [{ leaveTypeId: 'lvt_does_not_exist', annualQuota: 5 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.message).toMatch(/was not found in this company/);
  });

  it('POST → GET by ID → PUT update → PATCH status workflow with entitlements', async () => {
    const createRes = await createPolicy({ scope: 'company', status: 'draft' });

    expect(createRes.status).toBe(201);
    const createdId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('draft');
    expect(createRes.body.data.entitlements).toEqual([
      expect.objectContaining({ leaveTypeId, annualQuota: 12 }),
    ]);

    const getRes = await request(app).get(`/api/v1/hrms/leave/policies/${createdId}`).set(headers);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.linkedLeaveTypeIds).toEqual([leaveTypeId]);

    const putRes = await request(app)
      .put(`/api/v1/hrms/leave/policies/${createdId}`)
      .set(headers)
      .send({
        description: 'Updated policy description during test',
        entitlements: [{ leaveTypeId, annualQuota: 15 }],
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.description).toBe('Updated policy description during test');
    expect(putRes.body.data.entitlements[0].annualQuota).toBe(15);

    const patchRes = await request(app)
      .patch(`/api/v1/hrms/leave/policies/${createdId}/status`)
      .set(headers)
      .send({ status: 'archived' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.policy.status).toBe('archived');
    expect(patchRes.body.data.policy.isActive).toBe(false);

    const editArchived = await request(app)
      .put(`/api/v1/hrms/leave/policies/${createdId}`)
      .set(headers)
      .send({ description: 'should fail' });
    expect(editArchived.status).toBe(400);
  });

  it('two departments can each have an active policy; the same department cannot have two', async () => {
    if (deptIds.length < 2) return; // seed data without two departments cannot exercise this
    const [deptA, deptB] = deptIds as [string, string];

    const a = await createPolicy({ scope: 'department', scopeId: deptA, status: 'active' });
    const b = await createPolicy({ scope: 'department', scopeId: deptB, status: 'active' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.scopeName).toBeTruthy();

    const clash = await createPolicy({ scope: 'department', scopeId: deptA, status: 'active' });
    expect(clash.status).toBe(409);
  });

  it('rejects a department scope id that does not exist', async () => {
    const res = await createPolicy({
      scope: 'department',
      scopeId: 'dept_missing',
      status: 'draft',
    });
    expect(res.status).toBe(400);
  });

  it('an active request with a future start date is stored as scheduled', async () => {
    const res = await createPolicy({
      scope: 'employment_type',
      scopeId: 'intern',
      status: 'active',
      effectiveFrom: '2099-01-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
    expect(res.body.data.scopeName).toBe('Intern');
  });

  it('enforces tenant/company isolation — foreign company cannot see another company policies', async () => {
    const foreignHeaders = await hrmsTestHeaders('comp_foreign_88', 'tenant_foreign_88');

    const res = await request(app).get('/api/v1/hrms/leave/policies').set(foreignHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });
});
