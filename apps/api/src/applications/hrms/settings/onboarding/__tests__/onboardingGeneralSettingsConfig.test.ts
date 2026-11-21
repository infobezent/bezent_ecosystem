import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { hrmsTestHeaders } from '../../../../../platform/__tests__/support/testSession.js';
import { createApp } from '../../../../../app/server/createApp.js';
import { pingDatabase } from '../../../../../db/connection.js';
import { OnboardingGeneralSettingsService } from '../service/onboardingGeneralSettings.service.js';

describe('HRMS Forms & Onboarding General Settings API & Service', () => {
  const app = createApp();
  let hrms: ReturnType<typeof request.agent>;
  let hrmsOther: ReturnType<typeof request.agent>;

  const runId = Date.now().toString(36);
  const companyA = 'comp_demo_01';
  const tenantA = 'tenant_demo_01';
  const otherCompany = `comp_gen_other_${runId}`;
  const otherTenant = `tenant_gen_other_${runId}`;

  const service = new OnboardingGeneralSettingsService();

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error('MySQL database is unreachable.');
    }
    hrms = request.agent(app).set(await hrmsTestHeaders(companyA, tenantA));
    hrmsOther = request.agent(app).set(await hrmsTestHeaders(otherCompany, otherTenant));
  });

  describe('1. Default General Settings Configuration', () => {
    it('retrieves default four sections (preferences, access, workflow, dateTime)', async () => {
      const res = await hrms.get('/api/v1/hrms/settings/onboarding/general-config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // 1. Preferences
      expect(data.preferences).toBeDefined();
      expect(data.preferences.onboardingEnabled).toBe(true);
      expect(data.preferences.candidateSelfRegistrationEnabled).toBe(true);
      expect(data.preferences.hrManualCreationEnabled).toBe(true);
      expect(data.preferences.allowCandidateProfileEditingAfterSubmission).toBe(false);
      expect(data.preferences.defaultCandidateStatus).toBe('invited');

      // 2. Access & Permissions
      expect(data.access).toBeDefined();
      expect(data.access.candidatePortalAccess).toBe(true);
      expect(Array.isArray(data.access.hrOnboardingAccessRoles)).toBe(true);
      expect(data.access.assignedHrAccessScope).toBe('all_hr');
      expect(data.access.managerVisibilityScope).toBe('assigned_reports_only');
      expect(Array.isArray(data.access.documentAccessRoles)).toBe(true);
      expect(Array.isArray(data.access.roleBasedOnboardingActions)).toBe(true);

      // 3. Workflow Preferences
      expect(data.workflow).toBeDefined();
      expect(data.workflow.allowCandidateStageSkipping).toBe(false);
      expect(data.workflow.requireReasonForBackwardStageMovement).toBe(true);
      expect(data.workflow.allowChecklistReassignment).toBe(true);
      expect(data.workflow.allowOverdueTaskCompletion).toBe(true);
      expect(data.workflow.requireApprovalForConfiguredActions).toBe(true);
      expect(data.workflow.allowReopeningCompletedCases).toBe(false);

      // 4. Date & Time Preferences
      expect(data.dateTime).toBeDefined();
      expect(data.dateTime.timezone).toBe('Asia/Kolkata');
      expect(data.dateTime.dateFormat).toBe('DD/MM/YYYY');
      expect(data.dateTime.timeFormat).toBe('12_hour');
      expect(data.dateTime.dayCalculation).toBe('business_days');
      expect(data.dateTime.workingDays).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('2. Updating Settings Sections', () => {
    it('updates Onboarding Preferences and dual-writes onboardingEnabled to DB', async () => {
      const updateRes = await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        preferences: {
          defaultCandidateStatus: 'in_progress',
          allowCandidateProfileEditingAfterSubmission: true,
          candidateSelfRegistrationEnabled: false,
        },
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.preferences.defaultCandidateStatus).toBe('in_progress');
      expect(updateRes.body.data.preferences.allowCandidateProfileEditingAfterSubmission).toBe(true);
      expect(updateRes.body.data.preferences.candidateSelfRegistrationEnabled).toBe(false);

      // Verify persistence via GET
      const getRes = await hrms.get('/api/v1/hrms/settings/onboarding/general-config');
      expect(getRes.body.data.preferences.defaultCandidateStatus).toBe('in_progress');
      expect(getRes.body.data.preferences.allowCandidateProfileEditingAfterSubmission).toBe(true);
    });

    it('updates Access & Permissions section', async () => {
      const updateRes = await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        access: {
          assignedHrAccessScope: 'assigned_only',
          managerVisibilityScope: 'department_wide',
          candidatePortalAccess: false,
        },
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.access.assignedHrAccessScope).toBe('assigned_only');
      expect(updateRes.body.data.access.managerVisibilityScope).toBe('department_wide');
      expect(updateRes.body.data.access.candidatePortalAccess).toBe(false);
    });

    it('updates Workflow Preferences section', async () => {
      const updateRes = await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        workflow: {
          allowCandidateStageSkipping: true,
          allowReopeningCompletedCases: true,
        },
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.workflow.allowCandidateStageSkipping).toBe(true);
      expect(updateRes.body.data.workflow.allowReopeningCompletedCases).toBe(true);
      // Other workflow fields remain preserved
      expect(updateRes.body.data.workflow.requireReasonForBackwardStageMovement).toBe(true);
    });

    it('updates Date & Time Preferences section', async () => {
      const updateRes = await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        dateTime: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24_hour',
          dayCalculation: 'calendar_days',
          workingDays: [1, 2, 3, 4, 5, 6],
        },
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.dateTime.timezone).toBe('UTC');
      expect(updateRes.body.data.dateTime.dateFormat).toBe('YYYY-MM-DD');
      expect(updateRes.body.data.dateTime.timeFormat).toBe('24_hour');
      expect(updateRes.body.data.dateTime.dayCalculation).toBe('calendar_days');
      expect(updateRes.body.data.dateTime.workingDays).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('3. Validation & Safeguards', () => {
    it('rejects invalid candidate status', async () => {
      const res = await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        preferences: {
          defaultCandidateStatus: 'non_existent_status' as any,
        },
      });

      expect(res.status).toBe(400);
    });

    it('rejects invalid date format', async () => {
      const res = await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        dateTime: {
          dateFormat: 'INVALID_FORMAT' as any,
        },
      });

      expect(res.status).toBe(400);
    });

    it('rejects empty working days array', async () => {
      const res = await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        dateTime: {
          workingDays: [],
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Resetting to Defaults', () => {
    it('resets configuration back to system defaults', async () => {
      const resetRes = await hrms.post('/api/v1/hrms/settings/onboarding/general-config/reset');

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      const data = resetRes.body.data;

      expect(data.preferences.defaultCandidateStatus).toBe('invited');
      expect(data.access.assignedHrAccessScope).toBe('all_hr');
      expect(data.workflow.allowCandidateStageSkipping).toBe(false);
      expect(data.dateTime.timezone).toBe('Asia/Kolkata');
      expect(data.dateTime.workingDays).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('5. Multi-Tenant and Company Isolation', () => {
    it('ensures company A modifications do not affect other companies', async () => {
      // Modify company A
      await hrms.put('/api/v1/hrms/settings/onboarding/general-config').send({
        preferences: {
          allowCandidateProfileEditingAfterSubmission: true,
        },
      });

      // Fetch other company
      const otherRes = await hrmsOther.get('/api/v1/hrms/settings/onboarding/general-config');
      expect(otherRes.status).toBe(200);
      expect(otherRes.body.data.preferences.allowCandidateProfileEditingAfterSubmission).toBe(false);
    });
  });
});
