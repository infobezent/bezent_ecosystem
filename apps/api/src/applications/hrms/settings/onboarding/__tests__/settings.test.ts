import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../../app/server/createApp.js';
import { seedDatabase } from '../../../../../db/seed.js';
import { pingDatabase } from '../../../../../db/connection.js';

describe('HRMS Onboarding Settings API', () => {
  const app = createApp();

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error(
        'MySQL database is unreachable. Start MySQL to run MySQL-backed integration tests.',
      );
    }
    await seedDatabase();
  });

  // ==========================================
  // 1. Default Configuration & Deterministic Reads
  // ==========================================
  describe('Default configuration behavior without write side-effects', () => {
    it('returns deterministic defaults on GET /general for a new company without DB writes', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/settings/onboarding/general')
        .set('x-company-id', 'comp_unprovisioned_01')
        .set('x-tenant-id', 'tenant_unprovisioned_01');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.onboardingEnabled).toBe(true);
      expect(res.body.data.defaultDurationDays).toBe(30);
      expect(res.body.data.idPrefix).toBe('NH-');
      expect(res.body.data.companyId).toBe('comp_unprovisioned_01');
    });

    it('returns 4 system stages by default for unprovisioned company', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', 'comp_unprovisioned_02')
        .set('x-tenant-id', 'tenant_unprovisioned_02');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(4);
      const stageKeys = res.body.data.map((s: { stageKey: string }) => s.stageKey);
      expect(stageKeys).toEqual(['preboarding', 'documents', 'induction', 'completed']);
    });

    it('returns core field configs by default', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/settings/onboarding/fields')
        .set('x-company-id', 'comp_unprovisioned_03')
        .set('x-tenant-id', 'tenant_unprovisioned_03');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(10);
      const fieldKeys = res.body.data.map((f: { fieldKey: string }) => f.fieldKey);
      expect(fieldKeys).toContain('firstName');
      expect(fieldKeys).toContain('email');
      expect(fieldKeys).toContain('joiningDate');
    });

    it('returns aggregate settings in single call', async () => {
      const res = await request(app).get('/api/v1/hrms/settings/onboarding');

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.general).toBeDefined();
      expect(data.stages).toBeDefined();
      expect(data.fields).toBeDefined();
      expect(data.documents).toBeDefined();
      expect(data.checklists).toBeDefined();
      expect(data.conversion).toBeDefined();
    });
  });

  // ==========================================
  // 2. Multi-Company Isolation (Company A vs Company B)
  // ==========================================
  describe('Tenant & Company Scoping Isolation', () => {
    it('ensures Company A cannot see custom document requirements of Company B', async () => {
      // 1. Create a document requirement in Company A
      const createRes = await request(app)
        .post('/api/v1/hrms/settings/onboarding/documents')
        .set('x-company-id', 'comp_demo_01')
        .set('x-tenant-id', 'tenant_demo_01')
        .send({
          documentType: `nda_${Date.now()}`,
          name: 'Non-Disclosure Agreement',
          description: 'Signed NDA document',
          isRequired: true,
          verificationRequired: true,
        });

      expect(createRes.status).toBe(201);
      const createdDoc = createRes.body.data;
      expect(createdDoc.id).toBeDefined();

      // 2. Query documents under Company B
      const companyBRes = await request(app)
        .get('/api/v1/hrms/settings/onboarding/documents')
        .set('x-company-id', 'comp_other_isolated')
        .set('x-tenant-id', 'tenant_other_isolated');

      expect(companyBRes.status).toBe(200);
      const bDocIds = companyBRes.body.data.map((d: { id: string }) => d.id);
      expect(bDocIds).not.toContain(createdDoc.id);

      // 3. Company B attempting to update or delete Company A document receives 404
      const updateAttempt = await request(app)
        .patch(`/api/v1/hrms/settings/onboarding/documents/${createdDoc.id}`)
        .set('x-company-id', 'comp_other_isolated')
        .set('x-tenant-id', 'tenant_other_isolated')
        .send({ name: 'Hacked Name' });

      expect(updateAttempt.status).toBe(404);
    });

    it('ensures checklist template updates are isolated by company', async () => {
      // 1. Create checklist template in Company A
      const createRes = await request(app)
        .post('/api/v1/hrms/settings/onboarding/checklists')
        .set('x-company-id', 'comp_demo_01')
        .set('x-tenant-id', 'tenant_demo_01')
        .send({
          name: 'Security Clearance Check',
          stageKey: 'preboarding',
          assigneeType: 'security_officer',
          dueOffsetDays: -2,
        });

      expect(createRes.status).toBe(201);
      const chk = createRes.body.data;

      // 2. Company B trying to delete it receives 404
      const deleteAttempt = await request(app)
        .delete(`/api/v1/hrms/settings/onboarding/checklists/${chk.id}`)
        .set('x-company-id', 'comp_other_isolated')
        .set('x-tenant-id', 'tenant_other_isolated');

      expect(deleteAttempt.status).toBe(404);

      // 3. Clean up in Company A
      const deleteSuccess = await request(app)
        .delete(`/api/v1/hrms/settings/onboarding/checklists/${chk.id}`)
        .set('x-company-id', 'comp_demo_01')
        .set('x-tenant-id', 'tenant_demo_01');

      expect(deleteSuccess.status).toBe(204);
    });
  });

  // ==========================================
  // 3. Duplicate Configuration Keys
  // ==========================================
  describe('Duplicate configuration key rejection', () => {
    it('rejects duplicate documentType in document requirements with 409', async () => {
      const docType = `cert_${Date.now()}`;

      const res1 = await request(app).post('/api/v1/hrms/settings/onboarding/documents').send({
        documentType: docType,
        name: 'Certificate 1',
      });
      expect(res1.status).toBe(201);

      const res2 = await request(app).post('/api/v1/hrms/settings/onboarding/documents').send({
        documentType: docType,
        name: 'Certificate 2 Duplicate',
      });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('DUPLICATE_KEY');
    });
  });

  // ==========================================
  // 4. Protected System Fields & Stages Protection
  // ==========================================
  describe('Protected system fields and stages protection', () => {
    it('prevents disabling or making optional protected system fields (e.g. firstName)', async () => {
      const resDisable = await request(app)
        .patch('/api/v1/hrms/settings/onboarding/fields/firstName')
        .send({ isEnabled: false });

      expect(resDisable.status).toBe(400);
      expect(resDisable.body.error.details.isEnabled).toBeDefined();

      const resOptional = await request(app)
        .patch('/api/v1/hrms/settings/onboarding/fields/firstName')
        .send({ isRequired: false });

      expect(resOptional.status).toBe(400);
      expect(resOptional.body.error.details.isRequired).toBeDefined();
    });

    it('allows updating non-protected field configs', async () => {
      const res = await request(app)
        .patch('/api/v1/hrms/settings/onboarding/fields/phone')
        .send({ label: 'Mobile Number', isRequired: true });

      expect(res.status).toBe(200);
      expect(res.body.data.label).toBe('Mobile Number');
      expect(res.body.data.isRequired).toBe(true);
    });

    it('prevents deactivating terminal system stage "completed"', async () => {
      const res = await request(app)
        .patch('/api/v1/hrms/settings/onboarding/stages/completed')
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.details.isActive).toContain('protected system stage');
    });
  });

  // ==========================================
  // 5. Invalid Stage References
  // ==========================================
  describe('Invalid stage references', () => {
    it('rejects update on an unsupported stageKey', async () => {
      const res = await request(app)
        .patch('/api/v1/hrms/settings/onboarding/stages/arbitrary_custom_stage')
        .send({ name: 'Arbitrary' });

      expect(res.status).toBe(400);
      expect(res.body.error.details.stageKey).toContain('Stage must be one of:');
    });

    it('rejects creating checklist template referencing invalid stage', async () => {
      const res = await request(app).post('/api/v1/hrms/settings/onboarding/checklists').send({
        name: 'Do something',
        stageKey: 'unknown_stage',
        assigneeType: 'hr',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details.stageKey).toBeDefined();
    });
  });

  // ==========================================
  // 6. Extensible Assignee Type Representation
  // ==========================================
  describe('Extensible Checklist Assignee Type', () => {
    it('accepts both standard and custom responsibility actor keys', async () => {
      const res = await request(app).post('/api/v1/hrms/settings/onboarding/checklists').send({
        name: 'Buddy Lunch & Walkthrough',
        stageKey: 'induction',
        assigneeType: 'assigned_buddy',
        dueOffsetDays: 2,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.assigneeType).toBe('assigned_buddy');
      expect(res.body.data.dueOffsetDays).toBe(2);
    });
  });

  // ==========================================
  // 7. General & Conversion Settings Persistence
  // ==========================================
  describe('General & Conversion Settings Persistence', () => {
    it('persists general settings updates', async () => {
      const patchRes = await request(app).patch('/api/v1/hrms/settings/onboarding/general').send({
        defaultDurationDays: 45,
        idPrefix: 'BEZ-',
      });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.defaultDurationDays).toBe(45);
      expect(patchRes.body.data.idPrefix).toBe('BEZ-');

      const getRes = await request(app).get('/api/v1/hrms/settings/onboarding/general');
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.defaultDurationDays).toBe(45);
      expect(getRes.body.data.idPrefix).toBe('BEZ-');
    });

    it('persists conversion settings updates', async () => {
      const patchRes = await request(app)
        .patch('/api/v1/hrms/settings/onboarding/conversion')
        .send({
          autoConvertOnJoining: true,
          employeeIdPrefix: 'EMP-BEZ-',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.autoConvertOnJoining).toBe(true);
      expect(patchRes.body.data.employeeIdPrefix).toBe('EMP-BEZ-');

      const getRes = await request(app).get('/api/v1/hrms/settings/onboarding/conversion');
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.autoConvertOnJoining).toBe(true);
    });
  });

  // ==========================================
  // 8. Existing Onboarding API Regression
  // ==========================================
  describe('Existing Onboarding API regression verification', () => {
    it('verifies GET /context, /masters, and /new-hires remain fully functional', async () => {
      const ctxRes = await request(app).get('/api/v1/context');
      expect(ctxRes.status).toBe(200);

      const mastersRes = await request(app).get('/api/v1/hrms/organization/masters');
      expect(mastersRes.status).toBe(200);
      expect(mastersRes.body.data.company.name).toBe('BEZENT Demo Pvt Ltd');

      const newHiresRes = await request(app).get('/api/v1/hrms/onboarding/new-hires');
      expect(newHiresRes.status).toBe(200);
      expect(Array.isArray(newHiresRes.body.data)).toBe(true);
      expect(newHiresRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
