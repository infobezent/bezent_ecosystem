import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';

describe('HRMS Onboarding & Organization API', () => {
  const app = createApp();

  it('GET /api/v1/context returns centralized development context', async () => {
    const res = await request(app).get('/api/v1/context');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.companyId).toBe('comp_demo_01');
    expect(res.body.data.companyName).toBe('BEZENT Demo Pvt Ltd');
    expect(res.body.data.role).toBe('HR');
  });

  it('GET /api/v1/hrms/organization/masters returns company and master lists', async () => {
    const res = await request(app).get('/api/v1/hrms/organization/masters');

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.company).toBeDefined();
    expect(data.company.name).toBe('BEZENT Demo Pvt Ltd');
    expect(data.departments.length).toBeGreaterThanOrEqual(1);
    expect(data.designations.length).toBeGreaterThanOrEqual(1);
    expect(data.locations.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/hrms/onboarding/new-hires lists initial onboarding records', async () => {
    const res = await request(app).get('/api/v1/hrms/onboarding/new-hires');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const firstItem = res.body.data[0];
    expect(firstItem.id).toBeDefined();
    expect(firstItem.fullName).toBeDefined();
    expect(firstItem.email).toBeDefined();
    expect(firstItem.departmentName).toBeDefined();
    expect(firstItem.designationName).toBeDefined();
    expect(firstItem.stage).toBeDefined();
  });

  it('POST /api/v1/hrms/onboarding/new-hires fails on invalid input', async () => {
    const res = await request(app).post('/api/v1/hrms/onboarding/new-hires').send({
      firstName: '',
      email: 'invalid-email',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.firstName).toBeDefined();
    expect(res.body.error.details.email).toBeDefined();
    expect(res.body.error.details.departmentId).toBeDefined();
  });

  it('POST /api/v1/hrms/onboarding/new-hires successfully creates and persists a record', async () => {
    // 1. Fetch masters to get valid IDs
    const mastersRes = await request(app).get('/api/v1/hrms/organization/masters');
    const masters = mastersRes.body.data;
    const deptId = masters.departments[0].id;
    const desigId = masters.designations[0].id;
    const locId = masters.locations[0].id;

    // 2. Create new hire
    const payload = {
      firstName: 'Test',
      lastName: 'Candidate',
      email: `candidate.${Date.now()}@example.com`,
      phone: '+91 99999 88888',
      companyId: masters.company.id,
      departmentId: deptId,
      designationId: desigId,
      locationId: locId,
      joiningDate: '2026-11-01',
      employmentType: 'full_time',
    };

    const createRes = await request(app).post('/api/v1/hrms/onboarding/new-hires').send(payload);

    expect(createRes.status).toBe(201);
    const created = createRes.body.data;
    expect(created.id).toBeDefined();
    expect(created.firstName).toBe('Test');
    expect(created.lastName).toBe('Candidate');
    expect(created.fullName).toBe('Test Candidate');
    expect(created.email).toBe(payload.email);
    expect(created.stage).toBe('preboarding');
    expect(created.status).toBe('active');

    // 3. Verify record is returned in list
    const listRes = await request(app).get('/api/v1/hrms/onboarding/new-hires');
    expect(listRes.status).toBe(200);
    const match = listRes.body.data.find((item: { id: string }) => item.id === created.id);
    expect(match).toBeDefined();
    expect(match.fullName).toBe('Test Candidate');

    // 4. Verify getById
    const getRes = await request(app).get(`/api/v1/hrms/onboarding/new-hires/${created.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(created.id);
  });
});
