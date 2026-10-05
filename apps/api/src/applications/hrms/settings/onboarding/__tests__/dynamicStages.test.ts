import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  hrmsTestHeaders,
  signInForTest,
} from '../../../../../platform/__tests__/support/testSession.js';
import { createApp } from '../../../../../app/server/createApp.js';
import { seedDatabase } from '../../../../../db/seed.js';
import { pingDatabase, getDb } from '../../../../../db/connection.js';
import {
  users,
  memberships,
  roles,
  rolePermissions,
  roleAssignments,
  onboardingStageConfigs,
  onboardingCases,
  onboardingCaseStageHistory,
} from '../../../../../db/schema.js';
import { hashPassword } from '../../../../../platform/auth/security.js';
import { eq, and } from 'drizzle-orm';

describe('HRMS Dynamic Onboarding Stages V1 Integration Tests', () => {
  const app = createApp();
  let hrms: ReturnType<typeof request.agent>;
  const companyA = 'comp_demo_01';
  const tenantA = 'tenant_demo_01';
  const companyB = 'comp_other_isolated';
  const tenantB = 'tenant_other_isolated';

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error(
        'MySQL database is unreachable. Start MySQL to run MySQL-backed integration tests.',
      );
    }
    const db = getDb();
    // Clean up any custom stages and test cases from prior test runs
    await db.delete(onboardingCaseStageHistory);
    await db.delete(onboardingCases);
    await db.delete(onboardingStageConfigs).where(eq(onboardingStageConfigs.isSystem, false));
    await seedDatabase();
    hrms = request.agent(app).set(await hrmsTestHeaders(companyA, tenantA));
    await hrmsTestHeaders(companyB, tenantB);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(onboardingCaseStageHistory);
    await db.delete(onboardingCases);
    await db.delete(onboardingStageConfigs).where(eq(onboardingStageConfigs.isSystem, false));
    await db
      .update(onboardingStageConfigs)
      .set({ displayOrder: 1, isActive: true, isRequired: true })
      .where(
        and(
          eq(onboardingStageConfigs.companyId, companyA),
          eq(onboardingStageConfigs.stageKey, 'preboarding'),
        ),
      );
    await db
      .update(onboardingStageConfigs)
      .set({ displayOrder: 2, isActive: true, isRequired: true })
      .where(
        and(
          eq(onboardingStageConfigs.companyId, companyA),
          eq(onboardingStageConfigs.stageKey, 'documents'),
        ),
      );
    await db
      .update(onboardingStageConfigs)
      .set({ displayOrder: 3, isActive: true, isRequired: true })
      .where(
        and(
          eq(onboardingStageConfigs.companyId, companyA),
          eq(onboardingStageConfigs.stageKey, 'induction'),
        ),
      );
    await db
      .update(onboardingStageConfigs)
      .set({ displayOrder: 4, isActive: true, isRequired: true })
      .where(
        and(
          eq(onboardingStageConfigs.companyId, companyA),
          eq(onboardingStageConfigs.stageKey, 'completed'),
        ),
      );
    await seedDatabase();
  });

  // =========================================================================
  // 1. Existing System Stages Preservation & Baseline
  // =========================================================================
  describe('1. Baseline System Stages Preservation', () => {
    it('returns the 4 system stages in correct order with completed as terminal', async () => {
      const res = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(200);
      const stages = res.body.data;
      expect(stages.length).toBeGreaterThanOrEqual(4);

      const systemKeys = ['preboarding', 'documents', 'induction', 'completed'];
      for (const key of systemKeys) {
        const found = stages.find((s: { stageKey: string }) => s.stageKey === key);
        expect(found).toBeDefined();
        expect(found.isSystem).toBe(true);
      }

      const completed = stages.find((s: { stageKey: string }) => s.stageKey === 'completed');
      expect(completed.isTerminal).toBe(true);
      expect(completed.displayOrder).toBe(stages[stages.length - 1].displayOrder);
    });
  });

  // =========================================================================
  // 2. Custom Stage Creation & Stable Identity
  // =========================================================================
  describe('2. Custom Stage Creation & Stable Identity', () => {
    it('creates a custom stage with immutable server-generated stable stageKey', async () => {
      const createRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'IT Equipment Allocation',
          description: 'Ship laptop and peripherals',
          isRequired: false,
          afterStageKey: 'documents',
        });

      expect(createRes.status).toBe(201);
      const stage = createRes.body.data;
      expect(stage.id).toBeDefined();
      expect(stage.stageKey).toMatch(/^stage_it_equipment_allocation_[a-z0-9]+$/);
      expect(stage.name).toBe('IT Equipment Allocation');
      expect(stage.description).toBe('Ship laptop and peripherals');
      expect(stage.isRequired).toBe(false);
      expect(stage.isSystem).toBe(false);
      expect(stage.isTerminal).toBe(false);
      expect(stage.isActive).toBe(true);
      expect(stage.companyId).toBe(companyA);
      expect(stage.tenantId).toBe(tenantA);

      // Verify inserted after documents
      const stagesRes = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);
      const stages = stagesRes.body.data;
      const docsIdx = stages.findIndex((s: { stageKey: string }) => s.stageKey === 'documents');
      const itIdx = stages.findIndex((s: { stageKey: string }) => s.stageKey === stage.stageKey);
      expect(itIdx).toBe(docsIdx + 1);
    });

    it('rejects client injection of privileged internal flags', async () => {
      const rejectRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Malicious Stage',
          isSystem: true,
          isTerminal: true,
          companyId: 'comp_hacked',
          tenantId: 'tenant_hacked',
          stageKey: 'fake_key',
        });

      expect(rejectRes.status).toBe(400);
      expect(rejectRes.body.error.details.isSystem).toBeDefined();
      expect(rejectRes.body.error.details.isTerminal).toBeDefined();
      expect(rejectRes.body.error.details.companyId).toBeDefined();
    });

    it('rejects duplicate stage name in same company', async () => {
      const dupRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'it equipment allocation', // case-insensitive check
          isRequired: true,
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('DUPLICATE_STAGE_NAME');
    });

    it('rejects empty or whitespace-only stage name', async () => {
      const res = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: '   ',
          isRequired: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.details.name).toBeDefined();
    });
  });

  // =========================================================================
  // 3. Company Isolation
  // =========================================================================
  describe('3. Multi-Company Isolation', () => {
    it('ensures Company B cannot see or manipulate Company A custom stages', async () => {
      // 1. Fetch Company B stages - must NOT contain IT Equipment Allocation
      const bRes = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyB)
        .set('x-tenant-id', tenantB);

      expect(bRes.status).toBe(200);
      const bNames = bRes.body.data.map((s: { name: string }) => s.name);
      expect(bNames).not.toContain('IT Equipment Allocation');

      // 2. Company B trying to update Company A custom stage returns 404
      const aStages = (
        await hrms
          .get('/api/v1/hrms/settings/onboarding/stages')
          .set('x-company-id', companyA)
          .set('x-tenant-id', tenantA)
      ).body.data;
      const itStage = aStages.find((s: { name: string }) => s.name === 'IT Equipment Allocation');
      expect(itStage).toBeDefined();

      const patchAttempt = await hrms
        .patch(`/api/v1/hrms/settings/onboarding/stages/${itStage.stageKey}`)
        .set('x-company-id', companyB)
        .set('x-tenant-id', tenantB)
        .send({ name: 'Hijacked by B' });

      expect(patchAttempt.status).toBe(404);

      // 3. Company B trying to delete Company A custom stage returns 404
      const deleteAttempt = await hrms
        .delete(`/api/v1/hrms/settings/onboarding/stages/${itStage.stageKey}`)
        .set('x-company-id', companyB)
        .set('x-tenant-id', tenantB);

      expect(deleteAttempt.status).toBe(404);
    });
  });

  // =========================================================================
  // 4. Editing Custom Stages & Rename Safety
  // =========================================================================
  describe('4. Editing Custom Stages & Rename Safety', () => {
    it('renames custom stage without modifying its stable stageKey', async () => {
      const aStages = (
        await hrms
          .get('/api/v1/hrms/settings/onboarding/stages')
          .set('x-company-id', companyA)
          .set('x-tenant-id', tenantA)
      ).body.data;
      const itStage = aStages.find((s: { name: string }) => s.name === 'IT Equipment Allocation');

      const patchRes = await hrms
        .patch(`/api/v1/hrms/settings/onboarding/stages/${itStage.stageKey}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Hardware & Asset Distribution',
          description: 'Updated description for asset distribution',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.stageKey).toBe(itStage.stageKey);
      expect(patchRes.body.data.name).toBe('Hardware & Asset Distribution');
      expect(patchRes.body.data.description).toBe('Updated description for asset distribution');
    });

    it('rejects mutating internal identity properties during update', async () => {
      const aStages = (
        await hrms
          .get('/api/v1/hrms/settings/onboarding/stages')
          .set('x-company-id', companyA)
          .set('x-tenant-id', tenantA)
      ).body.data;
      const itStage = aStages.find(
        (s: { name: string }) => s.name === 'Hardware & Asset Distribution',
      );

      const patchRes = await hrms
        .patch(`/api/v1/hrms/settings/onboarding/stages/${itStage.stageKey}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          isSystem: true,
          isTerminal: true,
          companyId: 'comp_other',
        });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.error.details.isSystem).toBeDefined();
    });
  });

  // =========================================================================
  // 5. Protected Terminal Stage Invariants
  // =========================================================================
  describe('5. Protected Terminal Stage Invariants', () => {
    it('prevents deactivating terminal stage completed', async () => {
      const res = await hrms
        .patch('/api/v1/hrms/settings/onboarding/stages/completed')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.details.isActive).toContain('protected system stage');
    });

    it('prevents deleting system stages', async () => {
      for (const sysKey of ['preboarding', 'documents', 'induction', 'completed']) {
        const res = await hrms
          .delete(`/api/v1/hrms/settings/onboarding/stages/${sysKey}`)
          .set('x-company-id', companyA)
          .set('x-tenant-id', tenantA);

        expect(res.status).toBe(400);
        expect(res.body.error.message).toContain('is protected and cannot be deleted');
      }
    });
  });

  // =========================================================================
  // 6. Transactional Reordering
  // =========================================================================
  describe('6. Transactional Reordering', () => {
    it('reorders stages successfully when terminal stage remains last', async () => {
      const getRes = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);
      const stages = getRes.body.data;
      const allKeys = stages.map((s: { stageKey: string }) => s.stageKey);

      // Swap the first two stages
      const reorderedKeys = [allKeys[1], allKeys[0], ...allKeys.slice(2)];

      const reorderRes = await hrms
        .put('/api/v1/hrms/settings/onboarding/stages/reorder')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stageKeys: reorderedKeys });

      expect(reorderRes.status).toBe(200);
      const newStages = reorderRes.body.data;
      expect(newStages.map((s: { stageKey: string }) => s.stageKey)).toEqual(reorderedKeys);
      expect(newStages.map((s: { displayOrder: number }) => s.displayOrder)).toEqual(
        allKeys.map((_: unknown, i: number) => i + 1),
      );

      // Restore original order
      await hrms
        .put('/api/v1/hrms/settings/onboarding/stages/reorder')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stageKeys: allKeys });
    });

    it('rejects reorder that attempts to place completed before any other stage', async () => {
      const getRes = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);
      const stages = getRes.body.data;
      const allKeys = stages.map((s: { stageKey: string }) => s.stageKey);

      // Move completed to the front
      const completedKey = allKeys.find((k: string) => k === 'completed') || 'completed';
      const invalidKeys = [completedKey, ...allKeys.filter((k: string) => k !== completedKey)];

      const res = await hrms
        .put('/api/v1/hrms/settings/onboarding/stages/reorder')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stageKeys: invalidKeys });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('terminal stage');
    });

    it('rejects reorder with duplicate keys or missing company stages', async () => {
      const resDup = await hrms
        .put('/api/v1/hrms/settings/onboarding/stages/reorder')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stageKeys: ['preboarding', 'preboarding', 'documents', 'completed'] });

      expect(resDup.status).toBe(400);

      const resMissing = await hrms
        .put('/api/v1/hrms/settings/onboarding/stages/reorder')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stageKeys: ['preboarding', 'documents'] });

      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error.message).toContain('configured stages for this company');
    });
  });

  // =========================================================================
  // 7. Delete vs Deactivate Lifecycle
  // =========================================================================
  describe('7. Delete vs Deactivate Lifecycle', () => {
    it('allows deleting an unreferenced custom stage', async () => {
      // Create a temporary custom stage
      const createRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Temporary Unused Stage',
          isRequired: false,
        });
      expect(createRes.status).toBe(201);
      const tempKey = createRes.body.data.stageKey;

      // Delete it
      const deleteRes = await hrms
        .delete(`/api/v1/hrms/settings/onboarding/stages/${tempKey}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(deleteRes.status).toBe(204);

      // Verify it no longer exists
      const stagesRes = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);
      expect(stagesRes.body.data.some((s: { stageKey: string }) => s.stageKey === tempKey)).toBe(
        false,
      );
    });

    it('rejects deleting a custom stage if referenced by an onboarding case or history', async () => {
      // 1. Create a custom stage
      const createRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Referenced Stage Test',
          isRequired: false,
          afterStageKey: 'preboarding',
        });
      expect(createRes.status).toBe(201);
      const refKey = createRes.body.data.stageKey;

      // 2. Create an onboarding case and put it into this stage
      const masters = (await hrms.get('/api/v1/hrms/organization/masters')).body.data;
      const newHireRes = await hrms.post('/api/v1/hrms/onboarding/new-hires').send({
        firstName: 'RefTest',
        lastName: 'Candidate',
        email: `reftest.${Date.now()}@example.com`,
        companyId: companyA,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-15',
      });
      expect(newHireRes.status).toBe(201);
      const caseId = newHireRes.body.data.id;

      // Transition case to this custom stage
      const transRes = await hrms.post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
        toStage: refKey,
        version: 1,
      });
      expect(transRes.status).toBe(200);

      // 3. Attempt to delete this custom stage -> must be rejected with 400 and advice to deactivate
      const delRes = await hrms
        .delete(`/api/v1/hrms/settings/onboarding/stages/${refKey}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(delRes.status).toBe(400);
      expect(delRes.body.error.code).toBe('STAGE_IN_USE');
      expect(delRes.body.error.message).toContain('Deactivate the stage instead');
    });
  });

  // =========================================================================
  // 8. Runtime Transitions & Critical Acceptance Test
  // =========================================================================
  describe('8. CRITICAL ACCEPTANCE TEST: Dynamic Stages Runtime Transition Engine', () => {
    it('executes the full end-to-end critical acceptance workflow', async () => {
      // Step A: In Settings -> Onboarding -> Stages, Add "Background Verification"
      // Position after "Document Collection" (documents), Required = ON
      const addRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Background Verification',
          description: 'Third-party criminal and identity verification',
          isRequired: true,
          afterStageKey: 'documents',
        });

      expect(addRes.status).toBe(201);
      const bgStage = addRes.body.data;
      const bgKey = bgStage.stageKey;
      expect(bgKey).toMatch(/^stage_background_verification_/);

      // Verify ordering in Company A:
      // preboarding -> documents -> Background Verification -> ... -> induction -> completed
      const stagesRes = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);
      const stagesA = stagesRes.body.data;
      const docsIdx = stagesA.findIndex((s: { stageKey: string }) => s.stageKey === 'documents');
      const bgIdx = stagesA.findIndex((s: { stageKey: string }) => s.stageKey === bgKey);
      const indIdx = stagesA.findIndex((s: { stageKey: string }) => s.stageKey === 'induction');
      expect(bgIdx).toBe(docsIdx + 1);
      expect(indIdx).toBeGreaterThan(bgIdx);

      // Step B: Create an active onboarding case and transition it to "documents"
      const masters = (await hrms.get('/api/v1/hrms/organization/masters')).body.data;
      const newHireRes = await hrms.post('/api/v1/hrms/onboarding/new-hires').send({
        firstName: 'DynamicStage',
        lastName: 'Candidate',
        email: `dynamic.${Date.now()}@example.com`,
        companyId: companyA,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-20',
      });
      expect(newHireRes.status).toBe(201);
      const caseId = newHireRes.body.data.id;
      let version = newHireRes.body.data.version || 1;

      // Move from preboarding to documents
      const toDocsRes = await hrms.post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
        toStage: 'documents',
        version,
      });
      expect(toDocsRes.status).toBe(200);
      expect(toDocsRes.body.data.stage).toBe('documents');
      version = toDocsRes.body.data.version;

      // Step C: ATTEMPT Documents -> Induction
      // EXPECTED: REJECTED because Background Verification is required!
      const skipAttempt = await hrms.post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
        toStage: 'induction',
        version,
      });

      expect(skipAttempt.status).toBe(400);
      expect(skipAttempt.body.error.code).toBe('STAGE_SKIPPED_REQUIRED');
      expect(skipAttempt.body.error.message).toContain('Background Verification');

      // Step D: Transition Documents -> Background Verification
      // EXPECTED: SUCCESSFUL
      const toBgRes = await hrms.post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
        toStage: bgKey,
        version,
      });

      expect(toBgRes.status).toBe(200);
      expect(toBgRes.body.data.stage).toBe(bgKey);
      version = toBgRes.body.data.version;

      // Step E: Transition Background Verification -> Induction
      // EXPECTED: SUCCESSFUL
      const toIndRes = await hrms.post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`).send({
        toStage: 'induction',
        version,
      });

      expect(toIndRes.status).toBe(200);
      expect(toIndRes.body.data.stage).toBe('induction');
      version = toIndRes.body.data.version;

      // Step F: Finally verify Company B does NOT see "Background Verification"
      const compBStages = await hrms
        .get('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyB)
        .set('x-tenant-id', tenantB);

      const bStageNames = compBStages.body.data.map((s: { name: string }) => s.name);
      expect(bStageNames).not.toContain('Background Verification');
    });

    it('permits skipping an OPTIONAL custom stage', async () => {
      // 1. Add an optional stage "Drug Screening" between documents and induction
      const addRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Drug Screening',
          isRequired: false,
          afterStageKey: 'documents',
        });
      expect(addRes.status).toBe(201);
      expect(addRes.body.data.stageKey).toMatch(/^stage_drug_screening_/);

      // Make Background Verification optional as well for this test
      const aStages = (
        await hrms
          .get('/api/v1/hrms/settings/onboarding/stages')
          .set('x-company-id', companyA)
          .set('x-tenant-id', tenantA)
      ).body.data;
      const bgStage = aStages.find((s: { name: string }) => s.name === 'Background Verification');
      if (bgStage) {
        await hrms
          .patch(`/api/v1/hrms/settings/onboarding/stages/${bgStage.stageKey}`)
          .set('x-company-id', companyA)
          .set('x-tenant-id', tenantA)
          .send({ isRequired: false });
      }

      // 2. Create a case at documents
      const masters = (await hrms.get('/api/v1/hrms/organization/masters')).body.data;
      const newHireRes = await hrms.post('/api/v1/hrms/onboarding/new-hires').send({
        firstName: 'OptionalSkip',
        lastName: 'Candidate',
        email: `optskip.${Date.now()}@example.com`,
        companyId: companyA,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-25',
      });
      const caseId = newHireRes.body.data.id;
      let version = newHireRes.body.data.version || 1;

      // Transition to documents
      const toDocs = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
        .send({ toStage: 'documents', version });
      version = toDocs.body.data.version;

      // Now skip the optional stages directly to induction -> must succeed!
      const skipToInd = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
        .send({ toStage: 'induction', version });

      expect(skipToInd.status).toBe(200);
      expect(skipToInd.body.data.stage).toBe('induction');
    });

    it('rejects transitioning to an INACTIVE stage', async () => {
      // 1. Deactivate "Drug Screening"
      const aStages = (
        await hrms
          .get('/api/v1/hrms/settings/onboarding/stages')
          .set('x-company-id', companyA)
          .set('x-tenant-id', tenantA)
      ).body.data;
      const drugStage = aStages.find((s: { name: string }) => s.name === 'Drug Screening');
      expect(drugStage).toBeDefined();

      const deactRes = await hrms
        .patch(`/api/v1/hrms/settings/onboarding/stages/${drugStage.stageKey}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ isActive: false });
      expect(deactRes.status).toBe(200);

      // 2. Attempt to transition a case to this deactivated stage -> must fail with 400
      const masters = (await hrms.get('/api/v1/hrms/organization/masters')).body.data;
      const newHireRes = await hrms.post('/api/v1/hrms/onboarding/new-hires').send({
        firstName: 'DeactTarget',
        lastName: 'Candidate',
        email: `deacttgt.${Date.now()}@example.com`,
        companyId: companyA,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-28',
      });
      const caseId = newHireRes.body.data.id;
      const version = newHireRes.body.data.version || 1;

      const transAttempt = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
        .send({ toStage: drugStage.stageKey, version });

      expect(transAttempt.status).toBe(400);
      expect(transAttempt.body.error.code).toBe('STAGE_INACTIVE');
    });

    it('allows a case already on a deactivated stage to progress safely forward', async () => {
      // 1. Create a custom stage "Physical Verification", put a case on it, then deactivate it
      const addRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Physical Verification',
          isRequired: false,
          afterStageKey: 'preboarding',
        });
      expect(addRes.status).toBe(201);
      const physKey = addRes.body.data.stageKey;

      const masters = (await hrms.get('/api/v1/hrms/organization/masters')).body.data;
      const newHireRes = await hrms.post('/api/v1/hrms/onboarding/new-hires').send({
        firstName: 'DeactCurrent',
        lastName: 'Candidate',
        email: `deactcur.${Date.now()}@example.com`,
        companyId: companyA,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-29',
      });
      const caseId = newHireRes.body.data.id;
      let version = newHireRes.body.data.version || 1;

      // Transition to Physical Verification
      const toPhys = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
        .send({ toStage: physKey, version });
      expect(toPhys.status).toBe(200);
      expect(toPhys.body.data.stage).toBe(physKey);
      version = toPhys.body.data.version;

      // Now deactivate Physical Verification
      await hrms
        .patch(`/api/v1/hrms/settings/onboarding/stages/${physKey}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ isActive: false });

      // The case on Physical Verification must still be able to move forward to documents!
      const toDocs = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
        .send({ toStage: 'documents', version });

      expect(toDocs.status).toBe(200);
      expect(toDocs.body.data.stage).toBe('documents');
    });

    it('inserting a new stage before current case position does not move case backward', async () => {
      // Case is currently at documents
      // Add a new stage after preboarding (before documents)
      const addRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Early Welcome Call',
          isRequired: true,
          afterStageKey: 'preboarding',
        });
      expect(addRes.status).toBe(201);

      // Create a case and move to documents
      const masters = (await hrms.get('/api/v1/hrms/organization/masters')).body.data;
      const newHireRes = await hrms.post('/api/v1/hrms/onboarding/new-hires').send({
        firstName: 'NoBackward',
        lastName: 'Candidate',
        email: `nobackward.${Date.now()}@example.com`,
        companyId: companyA,
        departmentId: masters.departments[0].id,
        designationId: masters.designations[0].id,
        joiningDate: '2026-11-30',
      });
      const caseId = newHireRes.body.data.id;
      let version = newHireRes.body.data.version || 1;

      // To Early Welcome Call
      const toWelcome = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
        .send({ toStage: addRes.body.data.stageKey, version });
      version = toWelcome.body.data.version;

      // To Documents
      const toDocs = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${caseId}/stage`)
        .send({ toStage: 'documents', version });
      version = toDocs.body.data.version;

      // Add another stage before documents: "ID Verification"
      const addEarly2 = await hrms
        .post('/api/v1/hrms/settings/onboarding/stages')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Identity Verification Check',
          isRequired: true,
          afterStageKey: 'preboarding',
        });
      expect(addEarly2.status).toBe(201);

      // Check the case - still at documents!
      const checkCase = await hrms.get(`/api/v1/hrms/onboarding/cases/${caseId}`);
      expect(checkCase.status).toBe(200);
      expect(checkCase.body.data.stage).toBe('documents');
    });
  });

  // =========================================================================
  // 9. RBAC: Permissions Enforcement
  // =========================================================================
  describe('9. RBAC: Permissions Enforcement', () => {
    it('allows user with hrms.settings.view to view stages, but rejects mutation without hrms.settings.manage', async () => {
      const db = getDb();
      const viewerUserId = 'usr_test_stage_viewer';
      const viewerEmail = 'stage.viewer@bezent-test.example';
      const viewerRoleId = 'role_test_stage_viewer';

      const unused = hashPassword('not-used-by-otp');
      await db
        .insert(users)
        .values({
          id: viewerUserId,
          email: viewerEmail,
          passwordHash: unused.hash,
          salt: unused.salt,
          firstName: 'Stage',
          lastName: 'Viewer',
        })
        .onDuplicateKeyUpdate({ set: { email: viewerEmail } });

      await db
        .insert(memberships)
        .values({
          id: `mem_test_stage_viewer_${companyA}`,
          userId: viewerUserId,
          tenantId: tenantA,
          companyId: companyA,
          role: 'user',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(roles)
        .values({
          id: viewerRoleId,
          tenantId: tenantA,
          companyId: companyA,
          code: 'stage_viewer',
          name: 'Stage Viewer Role',
          isSystem: false,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      await db
        .insert(rolePermissions)
        .values([
          {
            id: 'rp_test_stage_viewer_view',
            tenantId: tenantA,
            companyId: companyA,
            roleId: viewerRoleId,
            permissionId: 'hrms.settings.view',
          },
        ])
        .onDuplicateKeyUpdate({ set: { permissionId: 'hrms.settings.view' } });

      await db
        .insert(roleAssignments)
        .values({
          id: `ra_test_stage_viewer_${companyA}`,
          userId: viewerUserId,
          roleId: viewerRoleId,
          tenantId: tenantA,
          companyId: companyA,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      const viewerToken = (await signInForTest(viewerEmail)).token;
      const viewerAgent = request.agent(app).set({
        authorization: `Bearer ${viewerToken}`,
        'x-company-id': companyA,
        'x-tenant-id': tenantA,
      });

      // 1. Read succeeds
      const readRes = await viewerAgent.get('/api/v1/hrms/settings/onboarding/stages');
      expect(readRes.status).toBe(200);
      expect(Array.isArray(readRes.body.data)).toBe(true);

      // 2. Create fails with 403
      const createRes = await viewerAgent
        .post('/api/v1/hrms/settings/onboarding/stages')
        .send({ name: 'Unauthorized Custom Stage' });
      expect(createRes.status).toBe(403);
      expect(createRes.body.error.code).toBe('FORBIDDEN_PERMISSION');

      // 3. Reorder fails with 403
      const reorderRes = await viewerAgent
        .put('/api/v1/hrms/settings/onboarding/stages/reorder')
        .send({ stageKeys: ['preboarding', 'documents', 'induction', 'completed'] });
      expect(reorderRes.status).toBe(403);
      expect(reorderRes.body.error.code).toBe('FORBIDDEN_PERMISSION');

      // 4. Delete fails with 403
      const delRes = await viewerAgent.delete(
        '/api/v1/hrms/settings/onboarding/stages/stage_anything',
      );
      expect(delRes.status).toBe(403);
      expect(delRes.body.error.code).toBe('FORBIDDEN_PERMISSION');
    });
  });

  // =========================================================================
  // 10. Historical Integrity
  // =========================================================================
  describe('10. Historical Integrity', () => {
    it('preserves complete transition history with fromStage and toStage regardless of stage config changes', async () => {
      const db = getDb();
      // Inspect history for our cases
      const historyRows = await db
        .select()
        .from(onboardingCaseStageHistory)
        .where(
          and(
            eq(onboardingCaseStageHistory.tenantId, tenantA),
            eq(onboardingCaseStageHistory.companyId, companyA),
          ),
        );

      expect(historyRows.length).toBeGreaterThan(0);
      for (const row of historyRows) {
        expect(row.fromStage).toBeDefined();
        expect(row.toStage).toBeDefined();
        expect(row.createdAt).toBeDefined();
      }
    });
  });
});
