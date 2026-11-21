import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { hrmsTestHeaders } from '../../../../../platform/__tests__/support/testSession.js';
import { createApp } from '../../../../../app/server/createApp.js';
import { pingDatabase } from '../../../../../db/connection.js';

describe('HRMS Checklist Builder & Templates API', () => {
  const app = createApp();
  let hrmsA: ReturnType<typeof request.agent>;
  let hrmsB: ReturnType<typeof request.agent>;

  const runId = Date.now().toString(36);
  const companyA = `comp_chk_${runId}`;
  const tenantA = `tenant_chk_${runId}`;
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

  // ==================== 1. Templates Listing & Default Seeding ====================
  describe('1. Templates Listing & Defaults', () => {
    it('returns seeded default templates for Company A including HR and IT checklists', async () => {
      const res = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const hrTemplate = res.body.data.find((t: { name: string }) =>
        t.name.includes('Standard HR Onboarding'),
      );
      expect(hrTemplate).toBeDefined();
      expect(hrTemplate.category).toBe('HR');
      expect(hrTemplate.groups.length).toBeGreaterThanOrEqual(1);
      expect(hrTemplate.tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('enforces tenant/company isolation between company A and company B', async () => {
      const resA = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const resB = await hrmsB
        .get('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyB)
        .set('x-tenant-id', tenantB);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
      expect(resA.body.data[0].companyId).toBe(companyA);
      expect(resB.body.data[0].companyId).toBe(companyB);
    });
  });

  // ==================== 2. Template Creation & Validation ====================
  describe('2. Template Creation & Validation', () => {
    it('creates a new custom checklist template with custom groups', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Executive Onboarding Special Checklist',
          description: 'High-touch checklist for senior executives',
          category: 'Custom',
          applicableTo: 'all',
          groups: [
            { id: 'grp_exec_1', name: 'Board & Leadership Introduction', displayOrder: 1 },
          ],
          tasks: [
            {
              id: 'tsk_exec_1',
              name: 'Executive Luncheon Scheduling',
              groupId: 'grp_exec_1',
              assignedTo: 'hr',
              isRequired: true,
              dueOffsetDays: 1,
              attachmentRequirement: 'none',
              approvalRequired: false,
              visibility: 'internal',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Executive Onboarding Special Checklist');
      expect(res.body.data.category).toBe('Custom');
      expect(res.body.data.groups.length).toBe(1);
      expect(res.body.data.tasks.length).toBe(1);
    });

    it('rejects creation when template name is missing or empty', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: '   ',
          description: 'Blank name',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TEMPLATE_NAME_REQUIRED');
    });

    it('rejects creation when duplicate name is provided for same company', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Executive Onboarding Special Checklist',
          description: 'Duplicate name attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_TEMPLATE_NAME');
    });
  });

  // ==================== 3. Template Updates & Tasks Builder ====================
  describe('3. Template Updates & Tasks Builder', () => {
    it('updates template metadata and category', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const target = listRes.body.data.find(
        (t: { name: string }) => t.name === 'Executive Onboarding Special Checklist',
      );

      const res = await hrmsA
        .patch(`/api/v1/hrms/settings/onboarding/checklist-builder/templates/${target.id}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          description: 'Updated executive high-touch onboarding workflow description',
          category: 'General',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe(
        'Updated executive high-touch onboarding workflow description',
      );
      expect(res.body.data.category).toBe('General');
    });

    it('saves custom groups and multiple tasks with drag/reorder capability', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const target = listRes.body.data.find(
        (t: { name: string }) => t.name === 'Executive Onboarding Special Checklist',
      );

      const newGroups = [
        { id: 'grp_g1', name: 'Pre-Day 1 Governance', displayOrder: 1 },
        { id: 'grp_g2', name: 'First 30 Days Milestones', displayOrder: 2 },
      ];

      const newTasks = [
        {
          id: 'tsk_t1',
          name: 'Executive Compensation Review & Equity Grant',
          groupId: 'grp_g1',
          assignedTo: 'finance',
          isRequired: true,
          dueOffsetDays: -2,
          attachmentRequirement: 'required',
          approvalRequired: true,
          visibility: 'internal',
          displayOrder: 1,
        },
        {
          id: 'tsk_t2',
          name: 'Department All-Hands Introduction',
          groupId: 'grp_g2',
          assignedTo: 'manager',
          isRequired: false,
          dueOffsetDays: 14,
          attachmentRequirement: 'none',
          approvalRequired: false,
          visibility: 'employee_visible',
          displayOrder: 2,
        },
      ];

      const res = await hrmsA
        .put(`/api/v1/hrms/settings/onboarding/checklist-builder/templates/${target.id}/tasks`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          groups: newGroups,
          tasks: newTasks,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.groups.length).toBe(2);
      expect(res.body.data.tasks.length).toBe(2);
      expect(res.body.data.tasks[0].assignedTo).toBe('finance');
      expect(res.body.data.tasks[0].attachmentRequirement).toBe('required');
    });
  });

  // ==================== 4. Duplication & Safe Deletion ====================
  describe('4. Duplication & Deletion', () => {
    it('duplicates a template into an independent new template copy', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const source = listRes.body.data[0];

      const res = await hrmsA
        .post(
          `/api/v1/hrms/settings/onboarding/checklist-builder/templates/${source.id}/duplicate`,
        )
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toContain('(Copy)');
      expect(res.body.data.id).not.toBe(source.id);
      expect(res.body.data.groups.length).toBe(source.groups.length);
      expect(res.body.data.tasks.length).toBe(source.tasks.length);
    });

    it('deletes an unneeded template safely', async () => {
      const listRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/checklist-builder/templates')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const copyTemplate = listRes.body.data.find((t: { name: string }) =>
        t.name.includes('(Copy)'),
      );

      const res = await hrmsA
        .delete(
          `/api/v1/hrms/settings/onboarding/checklist-builder/templates/${copyTemplate.id}`,
        )
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== 5. Candidate Checklist Generation ====================
  describe('5. Candidate Checklist Generation', () => {
    it('generates concrete candidate tasks with joining-date relative due dates', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/checklist-builder/generate')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          caseId: 'case_cand_1001',
          joiningDate: '2026-12-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const firstTask = res.body.data[0];
      expect(firstTask.caseId).toBe('case_cand_1001');
      expect(firstTask.status).toBe('pending');
      expect(typeof firstTask.dueDate).toBe('string');
      expect(firstTask.dueDate.length).toBe(10); // YYYY-MM-DD
    });
  });
});
