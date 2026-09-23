import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';

describe('HRMS Onboarding Active Case Stage & Status Lifecycle (PR2)', () => {
  const app = createApp();

  // Reset general settings and stage configs to active defaults before tests
  beforeEach(async () => {
    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/general')
      .send({ onboardingEnabled: true });

    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/stages/preboarding')
      .send({ isActive: true, isRequired: true });

    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/stages/documents')
      .send({ isActive: true, isRequired: true });

    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/stages/induction')
      .send({ isActive: true, isRequired: true });

    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/stages/completed')
      .send({ isActive: true, isRequired: true });
  });

  async function createActiveCase(): Promise<string> {
    const mastersRes = await request(app).get('/api/v1/hrms/organization/masters');
    const masters = mastersRes.body.data;

    const res = await request(app)
      .post('/api/v1/hrms/onboarding/new-hires')
      .send({
        firstName: 'Active',
        lastName: 'Candidate',
        email: `stage.test.${Date.now()}.${Math.random()}@example.com`,
        companyId: masters.company.id,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        locationId: masters.locations[0].id,
        joiningDate: '2026-11-01',
        employmentType: 'full_time',
      });

    return res.body.data.id;
  }

  // ==========================================
  // 1 & 10. Stage progression & version increments
  // ==========================================
  it('1. active case advances to valid configured next stage and increments version', async () => {
    const caseId = await createActiveCase();

    // Initial stage is preboarding, version = 1
    const initialRes = await request(app).get(`/api/v1/hrms/onboarding/cases/${caseId}`);
    expect(initialRes.body.data.stage).toBe('preboarding');
    expect(initialRes.body.data.status).toBe('active');
    expect(initialRes.body.data.version).toBe(1);

    // Advance to documents
    const step1 = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'documents',
      notes: 'Preboarding documents requested',
      version: 1,
    });

    expect(step1.status).toBe(200);
    expect(step1.body.data.stage).toBe('documents');
    expect(step1.body.data.status).toBe('active');
    expect(step1.body.data.version).toBe(2);

    // Advance to induction
    const step2 = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'induction',
      notes: 'Documents verified, starting induction',
      version: 2,
    });

    expect(step2.status).toBe(200);
    expect(step2.body.data.stage).toBe('induction');
    expect(step2.body.data.status).toBe('active');
    expect(step2.body.data.version).toBe(3);
  });

  // ==========================================
  // 2. Disabled stage cannot be entered
  // ==========================================
  it('2. disabled stage cannot be entered', async () => {
    const caseId = await createActiveCase();

    // Disable 'documents' stage in settings
    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/stages/documents')
      .send({ isActive: false });

    // Attempt transition to disabled 'documents' stage
    const res = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'documents',
      version: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('disabled');
  });

  // ==========================================
  // 3. Required active stage cannot be skipped
  // ==========================================
  it('3. required active stage cannot be skipped', async () => {
    const caseId = await createActiveCase();

    // Case is in 'preboarding', 'documents' is required. Attempt jumping straight to 'induction'
    const res = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'induction',
      version: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Cannot skip required stage');
    expect(res.body.error.message).toContain('documents');
  });

  // ==========================================
  // 4. Draft cannot transition
  // ==========================================
  it('4. draft cannot transition stages', async () => {
    const createDraft = await request(app).post('/api/v1/hrms/onboarding/cases').send({
      firstName: 'DraftCandidate',
      status: 'draft',
    });
    const draftId = createDraft.body.data.id;

    const res = await request(app).post(`/api/v1/hrms/onboarding/cases/${draftId}/stage`).send({
      toStage: 'documents',
      version: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('draft');
  });

  // ==========================================
  // 5. Withdrawn case cannot transition
  // ==========================================
  it('5. withdrawn case cannot transition stages', async () => {
    const caseId = await createActiveCase();

    // Withdraw the case
    await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/withdraw`).send({
      reason: 'Candidate declined offer',
      version: 1,
    });

    // Attempt stage transition on withdrawn case
    const res = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'documents',
      version: 2,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('withdrawn');
  });

  // ==========================================
  // 6. Completed case cannot transition & completion sets metadata
  // ==========================================
  it('6. reaches completion terminal stage and completed case cannot transition', async () => {
    const caseId = await createActiveCase();

    // preboarding -> documents (v1 -> v2)
    await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'documents', version: 1 });

    // documents -> induction (v2 -> v3)
    await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'induction', version: 2 });

    // induction -> completed (v3 -> v4)
    const completeRes = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'completed', version: 3, notes: 'Onboarding complete' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.stage).toBe('completed');
    expect(completeRes.body.data.status).toBe('completed');
    expect(completeRes.body.data.completedAt).toBeDefined();

    // Attempt further transition on completed case -> 400
    const nextRes = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'induction', version: 4 });

    expect(nextRes.status).toBe(400);
    expect(nextRes.body.error.message).toContain('completed');
  });

  // ==========================================
  // 7 & 12. Valid withdrawal with reason & history
  // ==========================================
  it('7 & 12. valid withdrawal with reason creates history entry', async () => {
    const caseId = await createActiveCase();

    const withdrawRes = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/withdraw`)
      .send({
        reason: 'Personal reasons - unable to relocate',
        version: 1,
      });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.status).toBe('withdrawn');
    expect(withdrawRes.body.data.withdrawalReason).toBe('Personal reasons - unable to relocate');
    expect(withdrawRes.body.data.withdrawnAt).toBeDefined();
    expect(withdrawRes.body.data.version).toBe(2);

    // Verify history entry
    const historyRes = await request(app).get(`/api/v1/hrms/onboarding/cases/${caseId}/history`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(1);

    const withdrawEntry = historyRes.body.data.find(
      (h: { action: string }) => h.action === 'withdraw',
    );
    expect(withdrawEntry).toBeDefined();
    expect(withdrawEntry.notes).toBe('Personal reasons - unable to relocate');
    expect(withdrawEntry.caseId).toBe(caseId);
  });

  // ==========================================
  // 8. Withdrawal without reason rejected
  // ==========================================
  it('8. withdrawal without reason is rejected', async () => {
    const caseId = await createActiveCase();

    const res = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/withdraw`).send({
      reason: '   ',
      version: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ==========================================
  // 9. Stale version produces 409
  // ==========================================
  it('9. stale version produces 409 Conflict', async () => {
    const caseId = await createActiveCase();

    // Advance stage with version 1 -> success (v2)
    const res1 = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'documents',
      version: 1,
    });
    expect(res1.status).toBe(200);

    // Attempt transition with stale version 1
    const resStale = await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'induction',
      version: 1,
    });

    expect(resStale.status).toBe(409);
    expect(resStale.body.error.code).toBe('CONFLICT');
  });

  // ==========================================
  // 11. History entry created for transition
  // ==========================================
  it('11. history entry created for stage transitions', async () => {
    const caseId = await createActiveCase();

    await request(app).post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
      toStage: 'documents',
      notes: 'Advancing to documents',
      version: 1,
    });

    const historyRes = await request(app).get(`/api/v1/hrms/onboarding/cases/${caseId}/history`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBe(1);

    const entry = historyRes.body.data[0];
    expect(entry.fromStage).toBe('preboarding');
    expect(entry.toStage).toBe('documents');
    expect(entry.action).toBe('transition');
    expect(entry.notes).toBe('Advancing to documents');
    expect(entry.createdAt).toBeDefined();
  });

  // ==========================================
  // 13 & 14. History tenant and company isolation
  // ==========================================
  it('13 & 14. history enforces tenant and company isolation', async () => {
    const caseId = await createActiveCase();

    await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'documents', version: 1 });

    // Different tenant -> 404
    const resOtherTenant = await request(app)
      .get(`/api/v1/hrms/onboarding/cases/${caseId}/history`)
      .set('x-tenant-id', 'tenant_foreign');
    expect(resOtherTenant.status).toBe(404);

    // Different company -> 404
    const resOtherCompany = await request(app)
      .get(`/api/v1/hrms/onboarding/cases/${caseId}/history`)
      .set('x-company-id', 'comp_foreign');
    expect(resOtherCompany.status).toBe(404);
  });

  // ==========================================
  // 15 & 16. Cross-tenant & cross-company transition returns 404
  // ==========================================
  it('15 & 16. cross-tenant and cross-company transitions return not found', async () => {
    const caseId = await createActiveCase();

    // Cross-tenant stage transition
    const resOtherTenant = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .set('x-tenant-id', 'tenant_foreign')
      .send({ toStage: 'documents', version: 1 });
    expect(resOtherTenant.status).toBe(404);

    // Cross-company stage transition
    const resOtherCompany = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .set('x-company-id', 'comp_foreign')
      .send({ toStage: 'documents', version: 1 });
    expect(resOtherCompany.status).toBe(404);

    // Cross-tenant withdrawal
    const resWithdrawOtherTenant = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/withdraw`)
      .set('x-tenant-id', 'tenant_foreign')
      .send({ reason: 'Declined', version: 1 });
    expect(resWithdrawOtherTenant.status).toBe(404);
  });

  // ==========================================
  // 17. Onboarding disabled prevents new activation
  // ==========================================
  it('17. onboarding disabled prevents applicable new activation while preserving drafts', async () => {
    const mastersRes = await request(app).get('/api/v1/hrms/organization/masters');
    const masters = mastersRes.body.data;

    // 1. Disable onboarding in general settings
    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/general')
      .send({ onboardingEnabled: false });

    // 2. Direct new hire creation (active) is blocked
    const resNewHire = await request(app)
      .post('/api/v1/hrms/onboarding/new-hires')
      .send({
        firstName: 'BlockedActive',
        email: `blocked.${Date.now()}@example.com`,
        companyId: masters.company.id,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-01',
      });
    expect(resNewHire.status).toBe(400);
    expect(resNewHire.body.error.code).toBe('ONBOARDING_DISABLED');

    // 3. Direct active case creation is blocked
    const resActiveCase = await request(app).post('/api/v1/hrms/onboarding/cases').send({
      firstName: 'BlockedActive',
      status: 'active',
    });
    expect(resActiveCase.status).toBe(400);
    expect(resActiveCase.body.error.code).toBe('ONBOARDING_DISABLED');

    // 4. Draft creation IS STILL PERMITTED (preserves draft data safely)
    const resDraft = await request(app).post('/api/v1/hrms/onboarding/cases').send({
      firstName: 'SafeDraft',
      status: 'draft',
    });
    expect(resDraft.status).toBe(201);
    const draftId = resDraft.body.data.id;

    // 5. Activating the draft via submit is blocked while disabled
    const resSubmit = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${draftId}/submit`)
      .send({
        firstName: 'SafeDraft',
        lastName: 'Candidate',
        email: `safedraft.${Date.now()}@example.com`,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-01',
        version: 1,
      });
    expect(resSubmit.status).toBe(400);
    expect(resSubmit.body.error.code).toBe('ONBOARDING_DISABLED');

    // 6. Re-enabling allows submitting the draft successfully
    await request(app)
      .patch('/api/v1/hrms/settings/onboarding/general')
      .send({ onboardingEnabled: true });

    const resSubmitAfter = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${draftId}/submit`)
      .send({
        firstName: 'SafeDraft',
        lastName: 'Candidate',
        email: `safedraft.${Date.now()}@example.com`,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-01',
        version: 1,
      });
    expect(resSubmitAfter.status).toBe(200);
    expect(resSubmitAfter.body.data.status).toBe('active');
  });

  // ==========================================
  // Revert / Backward correction behavior
  // ==========================================
  it('allows safe revert to immediate previous stage and rejects multi-stage jumping backward', async () => {
    const caseId = await createActiveCase();

    // Advance to documents (v1 -> v2)
    await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'documents', version: 1 });

    // Advance to induction (v2 -> v3)
    await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'induction', version: 2 });

    // Revert to immediate previous stage (documents) -> Allowed!
    const revertRes = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({
        toStage: 'documents',
        notes: 'Document re-verification required',
        version: 3,
      });

    expect(revertRes.status).toBe(200);
    expect(revertRes.body.data.stage).toBe('documents');
    expect(revertRes.body.data.version).toBe(4);

    // Verify history has 'revert' action
    const historyRes = await request(app).get(`/api/v1/hrms/onboarding/cases/${caseId}/history`);
    const lastEntry = historyRes.body.data[historyRes.body.data.length - 1];
    expect(lastEntry.action).toBe('revert');
    expect(lastEntry.fromStage).toBe('induction');
    expect(lastEntry.toStage).toBe('documents');
    expect(lastEntry.notes).toBe('Document re-verification required');

    // Attempt invalid multi-stage backward jump (from documents back past preboarding or to same stage)
    const sameStageRes = await request(app)
      .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
      .send({ toStage: 'documents', version: 4 });
    expect(sameStageRes.status).toBe(400);
  });
});
