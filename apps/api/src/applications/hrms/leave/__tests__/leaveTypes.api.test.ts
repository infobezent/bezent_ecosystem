import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured } from '../../../../db/connection.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Leave Types V1 API Integration Suite', () => {
  const app = createApp();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';

  let headers: Record<string, string>;
  // Self-contained fixture: the suite must not depend on leave types that happen to exist locally.
  const fixtureCode = `CAS${Date.now().toString().slice(-6)}`;
  const fixtureName = `Casual Leave ${fixtureCode}`;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    const res = await request(app)
      .post('/api/v1/hrms/leave/types')
      .set(headers)
      .send({ name: fixtureName, code: fixtureCode, category: 'paid' });
    expect(res.status).toBe(201);
  });

  it('GET /api/v1/hrms/leave/types — lists leave types and summary for authorized company', async () => {
    const res = await request(app).get('/api/v1/hrms/leave/types').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary.active).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/hrms/leave/types — filters by search query', async () => {
    const res = await request(app)
      .get(`/api/v1/hrms/leave/types?search=${fixtureCode}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].name).toBe(fixtureName);
  });

  it('POST /api/v1/hrms/leave/types — rejects invalid code with 400', async () => {
    const res = await request(app).post('/api/v1/hrms/leave/types').set(headers).send({
      name: 'Invalid Code Test',
      code: 'bad code!!',
    });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toMatch(/code is required and must be 1-20 alphanumeric/i);
  });

  it('POST /api/v1/hrms/leave/types — rejects duplicate code with 409 Conflict', async () => {
    const res = await request(app).post('/api/v1/hrms/leave/types').set(headers).send({
      name: 'Another Casual Leave',
      code: fixtureCode,
    });

    expect(res.status).toBe(409);
    expect(res.body.error?.message).toMatch(/already exists/i);
  });

  it('POST /api/v1/hrms/leave/types → GET by ID → PATCH status workflow', async () => {
    const testCode = `TEST_${Date.now().toString().slice(-4)}`;
    const testName = `Automated Test Leave ${testCode}`;

    // 1. Create
    const createRes = await request(app).post('/api/v1/hrms/leave/types').set(headers).send({
      name: testName,
      code: testCode,
      category: 'paid',
      paidClassification: 'paid',
      description: 'Created by automated integration test',
      allowHalfDay: true,
      minPerRequest: 0.5,
      maxConsecutiveDays: 10,
    });

    expect(createRes.status).toBe(201);
    const createdId = createRes.body.data.id;
    expect(createdId).toBeDefined();
    expect(createRes.body.data.code).toBe(testCode);

    // 2. GET by ID
    const getRes = await request(app).get(`/api/v1/hrms/leave/types/${createdId}`).set(headers);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe(testName);

    // 3. PATCH status (deactivate)
    const patchRes = await request(app)
      .patch(`/api/v1/hrms/leave/types/${createdId}/status`)
      .set(headers)
      .send({ isActive: false });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.leaveType.isActive).toBe(false);

    // 4. PUT update
    const putRes = await request(app)
      .put(`/api/v1/hrms/leave/types/${createdId}`)
      .set(headers)
      .send({
        description: 'Updated description for test',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.description).toBe('Updated description for test');
  });

  it('enforces tenant/company isolation — foreign company cannot read records', async () => {
    const foreignHeaders = await hrmsTestHeaders('comp_foreign_99', 'tenant_foreign_99');

    const res = await request(app).get('/api/v1/hrms/leave/types').set(foreignHeaders);

    // Company comp_foreign_99 has no records
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });
});
