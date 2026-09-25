import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { pingDatabase } from '../../../../db/connection.js';

describe('HRMS Onboarding & Organization API', () => {
  const app = createApp();

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error(
        'MySQL database is unreachable. Start MySQL to run MySQL-backed integration tests.',
      );
    }
  });

  it('GET /api/v1/context returns centralized development context', async () => {
    const res = await request(app).get('/api/v1/context');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.companyId).toBe('comp_demo_01');
    expect(res.body.data.companyName).toBe('BEZENT Demo Pvt Ltd');
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

    // 5. Verify candidate != employee invariant: NO employee record created
    const empListRes = await request(app).get('/api/v1/hrms/employees');
    expect(empListRes.status).toBe(200);
    const empMatch = (empListRes.body.data || []).find(
      (emp: { workEmail?: string; personalEmail?: string }) =>
        emp.workEmail === payload.email || emp.personalEmail === payload.email,
    );
    expect(empMatch).toBeUndefined();
  });

  describe('Onboarding Case & Draft Lifecycle (PR1)', () => {
    it('POST /api/v1/hrms/onboarding/cases creates an incomplete DRAFT case with stable UUID and initial version', async () => {
      const draftPayload = {
        firstName: 'Draft',
        lastName: 'Candidate',
        email: `draft.${Date.now()}@example.com`,
        draftPayload: {
          step: 2,
          personalInfo: { dob: '1995-05-15', gender: 'Female' },
        },
      };

      const res = await request(app).post('/api/v1/hrms/onboarding/cases').send(draftPayload);

      expect(res.status).toBe(201);
      const data = res.body.data;
      expect(data.id).toBeDefined();
      expect(data.status).toBe('draft');
      expect(data.stage).toBe('preboarding');
      expect(data.version).toBe(1);
      expect(data.firstName).toBe('Draft');
      expect(data.email).toBe(draftPayload.email);
      expect(data.draftPayload).toEqual(draftPayload.draftPayload);
    });

    it('GET /api/v1/hrms/onboarding/cases?status=draft filters only draft records', async () => {
      // Create a draft
      const resCreate = await request(app)
        .post('/api/v1/hrms/onboarding/cases')
        .send({ firstName: 'FilterDraft', status: 'draft' });
      expect(resCreate.status).toBe(201);

      const res = await request(app).get('/api/v1/hrms/onboarding/cases?status=draft');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const item of res.body.data) {
        expect(item.status).toBe('draft');
      }
    });

    it('GET /api/v1/hrms/onboarding/cases/:caseId returns single case by ID and 404s for non-existent', async () => {
      const resCreate = await request(app)
        .post('/api/v1/hrms/onboarding/cases')
        .send({ firstName: 'GetMe', status: 'draft' });
      const id = resCreate.body.data.id;

      const resGet = await request(app).get(`/api/v1/hrms/onboarding/cases/${id}`);
      expect(resGet.status).toBe(200);
      expect(resGet.body.data.id).toBe(id);
      expect(resGet.body.data.firstName).toBe('GetMe');

      const resNotFound = await request(app).get('/api/v1/hrms/onboarding/cases/case_non_existent');
      expect(resNotFound.status).toBe(404);
      expect(resNotFound.body.error.code).toBe('NOT_FOUND');
    });

    it('PATCH /api/v1/hrms/onboarding/cases/:caseId/draft updates partial data and increments version', async () => {
      const resCreate = await request(app)
        .post('/api/v1/hrms/onboarding/cases')
        .send({ firstName: 'InitialName', status: 'draft' });
      const id = resCreate.body.data.id;
      expect(resCreate.body.data.version).toBe(1);

      const patchPayload = {
        lastName: 'UpdatedLastName',
        phone: '+91 91234 56789',
        draftPayload: { step: 3, notes: 'Partially completed accounts' },
        version: 1,
      };

      const resPatch = await request(app)
        .patch(`/api/v1/hrms/onboarding/cases/${id}/draft`)
        .send(patchPayload);

      expect(resPatch.status).toBe(200);
      expect(resPatch.body.data.id).toBe(id);
      expect(resPatch.body.data.firstName).toBe('InitialName');
      expect(resPatch.body.data.lastName).toBe('UpdatedLastName');
      expect(resPatch.body.data.phone).toBe('+91 91234 56789');
      expect(resPatch.body.data.version).toBe(2);
      expect(resPatch.body.data.draftPayload).toEqual(patchPayload.draftPayload);
    });

    it('PATCH /api/v1/hrms/onboarding/cases/:caseId/draft returns 409 on version mismatch (optimistic locking)', async () => {
      const resCreate = await request(app)
        .post('/api/v1/hrms/onboarding/cases')
        .send({ firstName: 'ConflictTest', status: 'draft' });
      const id = resCreate.body.data.id;

      // First update moves version to 2
      await request(app)
        .patch(`/api/v1/hrms/onboarding/cases/${id}/draft`)
        .send({ firstName: 'FirstUpdate', version: 1 });

      // Second update with stale version 1 must conflict
      const resConflict = await request(app)
        .patch(`/api/v1/hrms/onboarding/cases/${id}/draft`)
        .send({ firstName: 'StaleUpdate', version: 1 });

      expect(resConflict.status).toBe(409);
      expect(resConflict.body.error.code).toBe('CONFLICT');
    });

    it('POST /api/v1/hrms/onboarding/cases/:caseId/submit transitions draft to active when valid', async () => {
      const mastersRes = await request(app).get('/api/v1/hrms/organization/masters');
      const masters = mastersRes.body.data;

      const resCreate = await request(app)
        .post('/api/v1/hrms/onboarding/cases')
        .send({ firstName: 'Submittable', status: 'draft' });
      const id = resCreate.body.data.id;

      // Attempt submit without mandatory fields -> 400
      const resIncomplete = await request(app)
        .post(`/api/v1/hrms/onboarding/cases/${id}/submit`)
        .send({ firstName: 'Submittable' });
      expect(resIncomplete.status).toBe(400);
      expect(resIncomplete.body.error.code).toBe('VALIDATION_ERROR');

      // Submit with all required fields
      const submitPayload = {
        firstName: 'Submittable',
        lastName: 'Candidate',
        email: `submittable.${Date.now()}@example.com`,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        locationId: masters.locations[0].id,
        joiningDate: '2026-12-01',
        employmentType: 'full_time',
        version: 1,
      };

      const resSubmit = await request(app)
        .post(`/api/v1/hrms/onboarding/cases/${id}/submit`)
        .send(submitPayload);

      expect(resSubmit.status).toBe(200);
      expect(resSubmit.body.data.id).toBe(id);
      expect(resSubmit.body.data.status).toBe('active');
      expect(resSubmit.body.data.version).toBe(2);

      // Subsequent submit on already active case returns 409
      const resResubmit = await request(app)
        .post(`/api/v1/hrms/onboarding/cases/${id}/submit`)
        .send(submitPayload);
      expect(resResubmit.status).toBe(409);
    });

    it('DELETE /api/v1/hrms/onboarding/cases/:caseId discards draft and rejects deleting active cases', async () => {
      // 1. Create and delete draft -> 204
      const resCreateDraft = await request(app)
        .post('/api/v1/hrms/onboarding/cases')
        .send({ firstName: 'ToDelete', status: 'draft' });
      const draftId = resCreateDraft.body.data.id;

      const resDelete = await request(app).delete(`/api/v1/hrms/onboarding/cases/${draftId}`);
      expect(resDelete.status).toBe(204);

      // Verify draft is gone
      const resVerify = await request(app).get(`/api/v1/hrms/onboarding/cases/${draftId}`);
      expect(resVerify.status).toBe(404);

      // 2. Active case cannot be deleted
      const mastersRes = await request(app).get('/api/v1/hrms/organization/masters');
      const masters = mastersRes.body.data;
      const resCreateActive = await request(app)
        .post('/api/v1/hrms/onboarding/new-hires')
        .send({
          firstName: 'ActiveEmp',
          email: `active.${Date.now()}@example.com`,
          companyId: masters.company.id,
          departmentId: masters.departments[0].id,
          designationId: masters.designations[0].id,
          joiningDate: '2026-11-01',
        });
      const activeId = resCreateActive.body.data.id;

      const resDeleteActive = await request(app).delete(
        `/api/v1/hrms/onboarding/cases/${activeId}`,
      );
      expect(resDeleteActive.status).toBe(409);
      expect(resDeleteActive.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Server-Side Pagination & Filtering (GET /api/v1/hrms/onboarding/new-hires)', () => {
    it('returns default pagination metadata (page=1, pageSize=25) and stage counts', async () => {
      const res = await request(app).get('/api/v1/hrms/onboarding/new-hires');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(25);
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);

      expect(res.body.counts).toBeDefined();
      expect(res.body.counts.all).toBe(res.body.pagination.totalItems);
      expect(typeof res.body.counts.preboarding).toBe('number');
      expect(typeof res.body.counts.documents).toBe('number');
      expect(typeof res.body.counts.completed).toBe('number');
    });

    it('supports allowed page sizes (25, 50, 100)', async () => {
      for (const size of [25, 50, 100]) {
        const res = await request(app).get(`/api/v1/hrms/onboarding/new-hires?pageSize=${size}`);
        expect(res.status).toBe(200);
        expect(res.body.pagination.pageSize).toBe(size);
        expect(res.body.data.length).toBeLessThanOrEqual(size);
      }
    });

    it('rejects invalid page or pageSize with 400 VALIDATION_ERROR', async () => {
      const invalidPage = await request(app).get('/api/v1/hrms/onboarding/new-hires?page=0');
      expect(invalidPage.status).toBe(400);
      expect(invalidPage.body.error.code).toBe('VALIDATION_ERROR');

      const invalidPageSize = await request(app).get(
        '/api/v1/hrms/onboarding/new-hires?pageSize=10',
      );
      expect(invalidPageSize.status).toBe(400);
      expect(invalidPageSize.body.error.code).toBe('VALIDATION_ERROR');

      const invalidStage = await request(app).get(
        '/api/v1/hrms/onboarding/new-hires?stage=unknown_stage',
      );
      expect(invalidStage.status).toBe(400);
      expect(invalidStage.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('filters by stage correctly while keeping total company stage counts', async () => {
      const res = await request(app).get('/api/v1/hrms/onboarding/new-hires?stage=preboarding');

      expect(res.status).toBe(200);
      expect(res.body.data.every((item: { stage: string }) => item.stage === 'preboarding')).toBe(
        true,
      );
      expect(res.body.pagination.totalItems).toBe(res.body.counts.preboarding);
      // Stage counts reflect entire company dataset, not just filtered page
      expect(res.body.counts.all).toBeGreaterThanOrEqual(res.body.counts.preboarding);
    });

    it('searches by keyword and paginates matching results', async () => {
      const res = await request(app).get('/api/v1/hrms/onboarding/new-hires?search=Arun');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(
        res.body.data.some(
          (item: { fullName: string; email: string }) =>
            item.fullName.includes('Arun') || item.email.includes('arun'),
        ),
      ).toBe(true);
    });

    it('returns empty result cleanly for non-matching search', async () => {
      const res = await request(app).get(
        '/api/v1/hrms/onboarding/new-hires?search=nonexistent_xyz_query',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.totalItems).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
      // Counts across company remain valid
      expect(res.body.counts.all).toBeGreaterThanOrEqual(1);
    });

    it('handles out of range page gracefully', async () => {
      const res = await request(app).get('/api/v1/hrms/onboarding/new-hires?page=999&pageSize=25');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.page).toBe(999);
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(1);
    });

    it('enforces tenant/company isolation in pagination and count queries', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/onboarding/new-hires')
        .set('x-company-id', 'comp_isolated_other')
        .set('x-tenant-id', 'tenant_isolated_other');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.totalItems).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
      expect(res.body.counts.all).toBe(0);
    });
  });
});
