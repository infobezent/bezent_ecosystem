import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { hrmsTestHeaders } from '../../../../../platform/__tests__/support/testSession.js';
import { createApp } from '../../../../../app/server/createApp.js';
import { pingDatabase } from '../../../../../db/connection.js';

describe('HRMS Pipeline Stages & Assignment Rules API', () => {
  const app = createApp();
  let hrmsA: ReturnType<typeof request.agent>;
  let hrmsB: ReturnType<typeof request.agent>;

  const runId = Date.now().toString(36);
  const companyA = `comp_demo_${runId}`;
  const tenantA = `tenant_demo_${runId}`;
  const companyB = `comp_other_${runId}`;
  const tenantB = `tenant_other_${runId}`;

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error('MySQL database is unreachable.');
    }
    hrmsA = request.agent(app).set(await hrmsTestHeaders(companyA, tenantA));
    hrmsB = request.agent(app).set(await hrmsTestHeaders(companyB, tenantB));
  });

  // ==================== 1. Pipeline Library Listing ====================
  describe('1. Pipeline Library Listing', () => {
    it('returns default pipelines for company A including Standard Onboarding as default', async () => {
      const res = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const defaultPipe = res.body.data.find((p: { isDefault: boolean }) => p.isDefault);
      expect(defaultPipe).toBeDefined();
      expect(defaultPipe.name).toBe('Standard Employee Onboarding');
      expect(defaultPipe.isActive).toBe(true);
      expect(defaultPipe.stages.length).toBeGreaterThanOrEqual(4);

      // Verify the final stage is marked terminal
      const lastStage = defaultPipe.stages[defaultPipe.stages.length - 1];
      expect(lastStage.isTerminal).toBe(true);
      expect(lastStage.stageType).toBe('final');
    });

    it('enforces tenant/company isolation between company A and company B', async () => {
      const resA = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const resB = await hrmsB
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyB)
        .set('x-tenant-id', tenantB);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
      // Both get their own company-scoped pipelines
      expect(resA.body.data[0].companyId).toBe(companyA);
      expect(resB.body.data[0].companyId).toBe(companyB);
    });
  });

  // ==================== 2. Pipeline Creation & Validation ====================
  describe('2. Pipeline Creation & Validation', () => {
    it('creates a new pipeline successfully', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Contractor & Intern Pipeline',
          description: 'Fast-track onboarding flow for contractors and interns',
          isDefault: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Contractor & Intern Pipeline');
      expect(res.body.data.isDefault).toBe(false);
      expect(res.body.data.stages.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects creation when pipeline name is missing or empty', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: '   ',
          description: 'Empty name test',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PIPELINE_NAME_REQUIRED');
    });

    it('rejects creation with duplicate pipeline name', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Standard Employee Onboarding',
          description: 'Duplicate test',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_PIPELINE_NAME');
    });
  });

  // ==================== 3. Pipeline Updates & Default Enforcing ====================
  describe('3. Pipeline Updates & Invariants', () => {
    it('prevents deactivating the default pipeline', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const defaultPipe = listRes.body.data.find((p: { isDefault: boolean }) => p.isDefault);

      const res = await hrmsA
        .patch(`/api/v1/hrms/settings/onboarding/pipelines/${defaultPipe.id}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DEACTIVATE_DEFAULT');
    });

    it('prevents deleting the default pipeline', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const defaultPipe = listRes.body.data.find((p: { isDefault: boolean }) => p.isDefault);

      const res = await hrmsA
        .delete(`/api/v1/hrms/settings/onboarding/pipelines/${defaultPipe.id}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DELETE_DEFAULT_PIPELINE');
    });
  });

  // ==================== 4. Configure Stages & Final Stage Rules ====================
  describe('4. Configure Pipeline Stages & Final Stage Validation', () => {
    it('saves valid reordered stages and enforces exactly one final stage at the end', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const target =
        listRes.body.data.find((p: { isDefault: boolean }) => !p.isDefault) || listRes.body.data[0];

      const validStages = [
        {
          id: 'stg_test_1',
          stageKey: 'test_entry',
          name: 'Welcome & Paperwork',
          stageType: 'standard',
          displayOrder: 1,
          isRequired: true,
          isActive: true,
          isTerminal: false,
          allowManualEntry: true,
          allowManualExit: true,
          requireChecklist: false,
          requireDocVerification: false,
          requireHrApproval: false,
        },
        {
          id: 'stg_test_2',
          stageKey: 'test_final',
          name: 'Final Sign-off',
          stageType: 'final',
          displayOrder: 2,
          isRequired: true,
          isActive: true,
          isTerminal: true,
          allowManualEntry: true,
          allowManualExit: false,
          requireChecklist: true,
          requireDocVerification: true,
          requireHrApproval: true,
        },
      ];

      const res = await hrmsA
        .put(`/api/v1/hrms/settings/onboarding/pipelines/${target.id}/stages`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stages: validStages });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stages.length).toBe(2);
      expect(res.body.data.stages[1].stageType).toBe('final');
      expect(res.body.data.stages[1].isTerminal).toBe(true);
    });

    it('rejects stage sequence without a final stage', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const target = listRes.body.data[0];

      const invalidStages = [
        {
          id: 'stg_no_final_1',
          stageKey: 'entry_only',
          name: 'Only Stage',
          stageType: 'standard',
          displayOrder: 1,
          isRequired: true,
          isActive: true,
          isTerminal: false,
          allowManualEntry: true,
          allowManualExit: true,
          requireChecklist: false,
          requireDocVerification: false,
          requireHrApproval: false,
        },
      ];

      const res = await hrmsA
        .put(`/api/v1/hrms/settings/onboarding/pipelines/${target.id}/stages`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stages: invalidStages });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FINAL_STAGE');
    });

    it('rejects stage sequence where final stage is placed before other stages', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const target = listRes.body.data[0];

      const misplacedStages = [
        {
          id: 'stg_misplaced_1',
          stageKey: 'completed_early',
          name: 'Completed Early',
          stageType: 'final',
          displayOrder: 1,
          isRequired: true,
          isActive: true,
          isTerminal: true,
          allowManualEntry: true,
          allowManualExit: false,
          requireChecklist: false,
          requireDocVerification: false,
          requireHrApproval: false,
        },
        {
          id: 'stg_misplaced_2',
          stageKey: 'after_completed',
          name: 'After Completed Stage',
          stageType: 'standard',
          displayOrder: 2,
          isRequired: true,
          isActive: true,
          isTerminal: false,
          allowManualEntry: true,
          allowManualExit: true,
          requireChecklist: false,
          requireDocVerification: false,
          requireHrApproval: false,
        },
      ];

      const res = await hrmsA
        .put(`/api/v1/hrms/settings/onboarding/pipelines/${target.id}/stages`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ stages: misplacedStages });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FINAL_STAGE_MUST_BE_LAST');
    });
  });

  // ==================== 5. Pipeline Duplication ====================
  describe('5. Pipeline Duplication', () => {
    it('duplicates a pipeline into an independent new pipeline copy', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const source = listRes.body.data[0];

      const res = await hrmsA
        .post(`/api/v1/hrms/settings/onboarding/pipelines/${source.id}/duplicate`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toContain('(Copy)');
      expect(res.body.data.id).not.toBe(source.id);
      expect(res.body.data.isDefault).toBe(false);
      expect(res.body.data.stages.length).toBe(source.stages.length);
    });
  });

  // ==================== 6. Pipeline Assignment Rules ====================
  describe('6. Pipeline Assignment Rules', () => {
    it('retrieves and updates assignment rules with priority ordering', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/pipelines')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const targetPipeline = listRes.body.data[0];

      const newRules = [
        {
          id: 'rule_intern',
          name: 'Intern Pipeline Route',
          priority: 2,
          conditionField: 'employmentType' as const,
          operator: 'equals' as const,
          conditionValue: 'intern',
          targetPipelineId: targetPipeline.id,
          isActive: true,
        },
        {
          id: 'rule_contractor',
          name: 'Contractor Pipeline Route',
          priority: 1,
          conditionField: 'employmentType' as const,
          operator: 'equals' as const,
          conditionValue: 'contract',
          targetPipelineId: targetPipeline.id,
          isActive: true,
        },
      ];

      const saveRes = await hrmsA
        .put('/api/v1/hrms/settings/onboarding/pipeline-rules')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({ rules: newRules });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.success).toBe(true);
      expect(saveRes.body.data.length).toBe(2);
      // Confirms sorted by priority ascending (1 before 2)
      expect(saveRes.body.data[0].priority).toBe(1);
      expect(saveRes.body.data[0].name).toBe('Contractor Pipeline Route');
      expect(saveRes.body.data[1].priority).toBe(2);
      expect(saveRes.body.data[1].name).toBe('Intern Pipeline Route');
    });

    it('resolves correct pipeline based on precedence rules and default fallback', async () => {
      // 1. Matching rule for contractor
      const matchRes = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/pipeline-resolve')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          candidateAttributes: { employmentType: 'contract' },
        });

      expect(matchRes.status).toBe(200);
      expect(matchRes.body.data).toBeDefined();

      // 2. Unmatched attributes fall back to default pipeline
      const fallbackRes = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/pipeline-resolve')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          candidateAttributes: { employmentType: 'full_time' },
        });

      expect(fallbackRes.status).toBe(200);
      expect(fallbackRes.body.data.isDefault).toBe(true);
    });
  });
});
