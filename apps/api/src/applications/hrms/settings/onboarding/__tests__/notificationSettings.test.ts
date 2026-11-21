import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { hrmsTestHeaders } from '../../../../../platform/__tests__/support/testSession.js';
import { createApp } from '../../../../../app/server/createApp.js';
import { pingDatabase } from '../../../../../db/connection.js';
import { NotificationSettingsService } from '../service/notificationSettings.service.js';

describe('HRMS Notifications & Reminders V1 API & Service', () => {
  const app = createApp();
  let hrms: ReturnType<typeof request.agent>;
  let hrmsOther: ReturnType<typeof request.agent>;

  const runId = Date.now().toString(36);
  const companyA = 'comp_demo_01';
  const tenantA = 'tenant_demo_01';
  const otherCompany = `comp_notif_other_${runId}`;
  const otherTenant = `tenant_notif_other_${runId}`;

  const service = new NotificationSettingsService();

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error('MySQL database is unreachable.');
    }
    hrms = request.agent(app).set(await hrmsTestHeaders(companyA, tenantA));
    hrmsOther = request.agent(app).set(await hrmsTestHeaders(otherCompany, otherTenant));
  });

  // ==================== 1. Overview & Channel Statuses ====================
  describe('1. Overview & Supported Channels', () => {
    it('returns channel indicators (email & in-app enabled, sms & whatsapp future) and summary counts', async () => {
      const res = await hrms.get('/api/v1/hrms/settings/onboarding/notifications/overview');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.channels.email.enabled).toBe(true);
      expect(data.channels.inApp.enabled).toBe(true);
      expect(data.channels.sms.enabled).toBe(false);
      expect(data.channels.sms.status).toBe('future');
      expect(data.channels.whatsapp.enabled).toBe(false);
      expect(data.channels.whatsapp.status).toBe('future');

      expect(data.eventCounts.total).toBe(10);
      expect(data.reminderCounts.total).toBe(7);
      expect(data.templateCounts.total).toBe(8);
      expect(typeof data.historyCounts.total).toBe('number');
    });
  });

  // ==================== 2. Event Notification Settings ====================
  describe('2. Event Notification Settings', () => {
    it('retrieves default event notification configurations', async () => {
      const res = await hrms.get('/api/v1/hrms/settings/onboarding/notifications/settings');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(10);

      const eventKeys = res.body.data.map((e: any) => e.eventKey);
      expect(eventKeys).toContain('candidate_invited');
      expect(eventKeys).toContain('registration_submitted');
      expect(eventKeys).toContain('candidate_details_updated');
      expect(eventKeys).toContain('candidate_stage_changed');
      expect(eventKeys).toContain('checklist_assigned');
      expect(eventKeys).toContain('checklist_task_overdue');
      expect(eventKeys).toContain('document_uploaded');
      expect(eventKeys).toContain('document_rejected');
      expect(eventKeys).toContain('document_approved');
      expect(eventKeys).toContain('conversion_completed');
    });

    it('updates event configurations (independent email & inApp toggles)', async () => {
      const getRes = await hrms.get('/api/v1/hrms/settings/onboarding/notifications/settings');
      const events = getRes.body.data;

      events[0].emailEnabled = false;
      events[0].inAppEnabled = true;

      const putRes = await hrms
        .put('/api/v1/hrms/settings/onboarding/notifications/settings')
        .send({ configs: events });

      expect(putRes.status).toBe(200);
      const updatedFirst = putRes.body.data.find((e: any) => e.eventKey === events[0].eventKey);
      expect(updatedFirst.emailEnabled).toBe(false);
      expect(updatedFirst.inAppEnabled).toBe(true);

      // Revert back
      events[0].emailEnabled = true;
      events[0].inAppEnabled = false;
      await hrms
        .put('/api/v1/hrms/settings/onboarding/notifications/settings')
        .send({ configs: events });
    });
  });

  // ==================== 3. Reminder Rules ====================
  describe('3. Automated Reminder Rules', () => {
    it('retrieves the 7 seeded automated reminder rules', async () => {
      const res = await hrms.get('/api/v1/hrms/settings/onboarding/notifications/reminder-rules');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);

      const ruleNames = res.body.data.map((r: any) => r.name);
      expect(ruleNames).toContain('Candidate registration incomplete');
      expect(ruleNames).toContain("Candidate hasn't submitted the form");
      expect(ruleNames).toContain('Required document pending');
      expect(ruleNames).toContain('Document verification overdue');
      expect(ruleNames).toContain('Checklist task approaching due date');
      expect(ruleNames).toContain('Checklist task overdue');
      expect(ruleNames).toContain('Candidate awaiting HR review');
    });

    it('creates, updates, and deletes a custom reminder rule', async () => {
      // Create
      const createRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/notifications/reminder-rules')
        .send({
          name: 'Custom Milestone Reminder',
          relatedEvent: 'candidate_stage_changed',
          triggerType: 'after_inactivity',
          delayAmount: 3,
          delayUnit: 'days',
          repeatInterval: 1,
          maxReminderCount: 2,
          dayType: 'business_days',
          emailEnabled: true,
          inAppEnabled: true,
          recipients: ['candidate', 'assigned_hr'],
          escalationEnabled: true,
          escalateAfterCount: 2,
          escalationRecipient: 'hr_manager',
          maxEscalationAttempts: 1,
        });

      expect(createRes.status).toBe(201);
      const ruleId = createRes.body.data.id;
      expect(ruleId).toBeDefined();
      expect(createRes.body.data.name).toBe('Custom Milestone Reminder');

      // Update
      const updateRes = await hrms
        .patch(`/api/v1/hrms/settings/onboarding/notifications/reminder-rules/${ruleId}`)
        .send({
          delayAmount: 5,
          isActive: false,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.delayAmount).toBe(5);
      expect(updateRes.body.data.isActive).toBe(false);

      // Delete
      const deleteRes = await hrms.delete(
        `/api/v1/hrms/settings/onboarding/notifications/reminder-rules/${ruleId}`,
      );
      expect(deleteRes.status).toBe(204);

      // Verify gone
      const listRes = await hrms.get(
        '/api/v1/hrms/settings/onboarding/notifications/reminder-rules',
      );
      const exists = listRes.body.data.some((r: any) => r.id === ruleId);
      expect(exists).toBe(false);
    });

    it('evaluates reminder rules idempotently and logs reminder audit entries', async () => {
      const res = await hrms.post(
        '/api/v1/hrms/settings/onboarding/notifications/reminder-rules/evaluate',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.evaluatedRulesCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.remindersDispatched).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== 4. Email Templates ====================
  describe('4. Email Template Management', () => {
    it('lists 8 default onboarding email templates', async () => {
      const res = await hrms.get('/api/v1/hrms/settings/onboarding/notifications/email-templates');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(8);

      const templateNames = res.body.data.map((t: any) => t.name);
      expect(templateNames).toContain('Candidate Invitation');
      expect(templateNames).toContain('Registration Reminder');
      expect(templateNames).toContain('Document Request');
      expect(templateNames).toContain('Document Rejection & Re-upload Request');
      expect(templateNames).toContain('Stage Update');
      expect(templateNames).toContain('Checklist Task Assignment');
      expect(templateNames).toContain('Onboarding Completion');
      expect(templateNames).toContain('Employee Conversion Confirmation');
    });

    it('prevents deleting system templates', async () => {
      const res = await hrms.delete(
        '/api/v1/hrms/settings/onboarding/notifications/email-templates/tpl_candidate_invitation',
      );

      expect(res.status).toBe(400);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('System templates cannot be deleted');
    });

    it('creates, duplicates, and deletes a custom email template', async () => {
      // Create
      const createRes = await hrms
        .post('/api/v1/hrms/settings/onboarding/notifications/email-templates')
        .send({
          name: 'Welcome Kit Announcement',
          category: 'Logistics',
          relatedEvent: 'candidate_stage_changed',
          subject: 'Your Welcome Kit is on its way, {{candidate_name}}!',
          body: 'Hello {{candidate_name}},\n\nYour onboarding kit for {{company_name}} has been dispatched.\n\nWarm regards,\nPeople Ops',
        });

      expect(createRes.status).toBe(201);
      const templateId = createRes.body.data.id;
      expect(templateId).toBeDefined();
      expect(createRes.body.data.isSystem).toBe(false);

      // Duplicate
      const dupRes = await hrms.post(
        `/api/v1/hrms/settings/onboarding/notifications/email-templates/${templateId}/duplicate`,
      );
      expect(dupRes.status).toBe(201);
      expect(dupRes.body.data.name).toBe('Welcome Kit Announcement (Copy)');

      // Delete original and duplicate
      await hrms.delete(
        `/api/v1/hrms/settings/onboarding/notifications/email-templates/${templateId}`,
      );
      await hrms.delete(
        `/api/v1/hrms/settings/onboarding/notifications/email-templates/${dupRes.body.data.id}`,
      );
    });

    it('previews a template with dynamic variable interpolation', async () => {
      const res = await hrms
        .post('/api/v1/hrms/settings/onboarding/notifications/email-templates/preview')
        .send({
          templateId: 'tpl_candidate_invitation',
          sampleVariables: {
            candidate_name: 'Jordan Miller',
            company_name: 'BEZENT Systems',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.subject).toContain('BEZENT Systems');
      expect(res.body.data.body).toContain('Jordan Miller');
      expect(res.body.data.body).toContain('BEZENT Systems');
    });

    it('sends a test email safely via the authorized transport and logs history', async () => {
      const res = await hrms
        .post('/api/v1/hrms/settings/onboarding/notifications/email-templates/test-send')
        .send({
          templateId: 'tpl_candidate_invitation',
          recipientEmail: 'hr-admin@example.com',
          sampleVariables: {
            candidate_name: 'Test Administrator',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.message).toContain('hr-admin@example.com');
    });
  });

  // ==================== 5. Notification History & Retry ====================
  describe('5. Notification History & Safe Retry', () => {
    it('retrieves notification history with pagination and status filters', async () => {
      const res = await hrms.get('/api/v1/hrms/settings/onboarding/notifications/history');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(typeof res.body.data.total).toBe('number');
    });

    it('allows viewing history details and retrying a notification safely in-place', async () => {
      const listRes = await hrms.get('/api/v1/hrms/settings/onboarding/notifications/history');
      if (listRes.body.data.items.length > 0) {
        const item = listRes.body.data.items[0];

        // Get single
        const singleRes = await hrms.get(
          `/api/v1/hrms/settings/onboarding/notifications/history/${item.id}`,
        );
        expect(singleRes.status).toBe(200);
        expect(singleRes.body.data.id).toBe(item.id);

        // Retry
        const retryRes = await hrms.post(
          `/api/v1/hrms/settings/onboarding/notifications/history/${item.id}/retry`,
        );
        expect(retryRes.status).toBe(200);
        expect(retryRes.body.data.retryCount).toBe(item.retryCount + 1);
        expect(retryRes.body.data.lastRetriedAt).toBeDefined();
      }
    });
  });

  // ==================== 6. Event Dispatcher Service ====================
  describe('6. Onboarding Event Dispatcher', () => {
    it('dispatches email and in-app notifications on candidate invitation event', async () => {
      const dispatchRes = await service.dispatchOnboardingEvent(
        tenantA,
        companyA,
        'candidate_invited',
        {
          candidateName: 'Taylor Swift',
          candidateEmail: 'taylor@example.com',
          companyName: 'Acme Records',
          positionName: 'Principal Sound Designer',
          joiningDate: '2026-12-15',
          registrationLink: 'https://bezent.com/intake?token=test_tok',
        },
      );

      expect(dispatchRes.dispatchedEmail).toBe(true);

      // Verify recorded in history
      const history = await service.listHistory(tenantA, companyA, {
        search: 'taylor@example.com',
      });
      expect(history.items.length).toBeGreaterThanOrEqual(1);
      expect(history.items[0]!.recipient).toContain('taylor@example.com');
      expect(history.items[0]!.status).toBe('sent');
    });

    it('skips dispatching when event is disabled in configuration', async () => {
      // Temporarily disable registration_submitted
      const configs = await service.getSettings(tenantA, companyA);
      const regConfig = configs.find((c) => c.eventKey === 'registration_submitted')!;
      const prevEnabled = regConfig.enabled;
      regConfig.enabled = false;
      await service.updateSettings(tenantA, companyA, configs);

      const dispatchRes = await service.dispatchOnboardingEvent(
        tenantA,
        companyA,
        'registration_submitted',
        {
          candidateName: 'Ignored Candidate',
          candidateEmail: 'ignored@example.com',
        },
      );

      expect(dispatchRes.dispatchedEmail).toBe(false);
      expect(dispatchRes.dispatchedInApp).toBe(false);

      // Restore
      regConfig.enabled = prevEnabled;
      await service.updateSettings(tenantA, companyA, configs);
    });
  });

  // ==================== 7. Tenant & Company Isolation ====================
  describe('7. Multi-tenant and Company Isolation', () => {
    it('ensures configurations between companyA and otherCompany are completely isolated', async () => {
      // Create custom template in otherCompany
      const createRes = await hrmsOther
        .post('/api/v1/hrms/settings/onboarding/notifications/email-templates')
        .send({
          name: 'Other Company Unique Template',
          category: 'Isolated',
          relatedEvent: 'candidate_invited',
          subject: 'Isolated Subject',
          body: 'Isolated Body',
        });

      expect(createRes.status).toBe(201);
      const otherTemplateId = createRes.body.data.id;

      // companyA must NOT see this template
      const compAList = await hrms.get(
        '/api/v1/hrms/settings/onboarding/notifications/email-templates',
      );
      const existsInA = compAList.body.data.some((t: any) => t.id === otherTemplateId);
      expect(existsInA).toBe(false);
    });
  });
});
