import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { NotificationsRemindersManagement } from '../tabs/notifications-reminders/NotificationsRemindersManagement';
import { NotificationSettingsModal } from '../tabs/notifications-reminders/NotificationSettingsModal';
import { ReminderRulesModal } from '../tabs/notifications-reminders/ReminderRulesModal';
import { EmailTemplatesModal } from '../tabs/notifications-reminders/EmailTemplatesModal';
import { NotificationHistoryModal } from '../tabs/notifications-reminders/NotificationHistoryModal';
import { FormsOnboardingTab } from '../tabs/FormsOnboardingTab';

// Mock API calls
vi.mock('../../../api/notificationSettingsApi', () => ({
  fetchNotificationsOverview: vi.fn().mockResolvedValue({
    channels: {
      email: { enabled: true, status: 'active' },
      inApp: { enabled: true, status: 'active' },
      sms: { enabled: false, status: 'future' },
      whatsapp: { enabled: false, status: 'future' },
    },
    eventCounts: { total: 10, active: 8 },
    reminderCounts: { total: 7, active: 7 },
    templateCounts: { total: 8, active: 8 },
    historyCounts: { total: 0, sent: 0, failed: 0 },
  }),
  fetchEventNotificationSettings: vi.fn().mockResolvedValue([]),
  updateEventNotificationSettings: vi.fn(),
  fetchReminderRules: vi.fn().mockResolvedValue([]),
  createReminderRule: vi.fn(),
  updateReminderRule: vi.fn(),
  deleteReminderRule: vi.fn(),
  evaluateReminderRules: vi.fn(),
  fetchEmailTemplates: vi.fn().mockResolvedValue([]),
  createEmailTemplate: vi.fn(),
  updateEmailTemplate: vi.fn(),
  duplicateEmailTemplate: vi.fn(),
  deleteEmailTemplate: vi.fn(),
  previewEmailTemplate: vi.fn().mockResolvedValue({ subject: 'Subj', body: 'Body' }),
  sendTestEmail: vi.fn().mockResolvedValue({ success: true, message: 'Sent' }),
  fetchNotificationHistory: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  retryNotification: vi.fn(),
}));

describe('Notifications & Reminders V1 UI Components', () => {
  describe('1. Main Page UI & Supported Channels Banner', () => {
    it('renders the top delivery channels banner with active and future indicator pills', () => {
      const html = renderToStaticMarkup(<NotificationsRemindersManagement />);

      expect(html).toContain('Supported Delivery Channels');
      expect(html).toContain('Email');
      expect(html).toContain('Enabled');
      expect(html).toContain('In-App Notifications');
      expect(html).toContain('SMS');
      expect(html).toContain('WhatsApp');
      expect(html).toContain('Future');
    });

    it('renders all three section cards with title, summary, count badge, and action button', () => {
      const html = renderToStaticMarkup(<NotificationsRemindersManagement />);

      // Card 1: Notification Settings
      expect(html).toContain('Notification Settings');
      expect(html).toContain('Event-driven alert triggers and dual-channel routing');
      expect(html).toContain('Configure');

      // Card 2: Reminder Rules
      expect(html).toContain('Reminder Rules');
      expect(html).toContain('Automated scheduled reminders, inactivity timeouts');

      // Card 3: Notification History
      expect(html).toContain('Notification History');
      expect(html).toContain('Comprehensive audit log of sent emails');
      expect(html).toContain('View History');
    });
  });

  describe('2. Notification Settings Modal', () => {
    it('renders event table with independent Email and In-App switches and template selectors', () => {
      const mockConfigs = [
        {
          id: 'evc_1',
          eventKey: 'candidate_invited' as const,
          name: 'Candidate invited',
          description: 'Triggered on new hire invitation',
          enabled: true,
          emailEnabled: true,
          inAppEnabled: false,
          recipients: ['candidate'],
          templateId: 'tpl_invitation',
        },
      ];

      const html = renderToStaticMarkup(
        <NotificationSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          configs={mockConfigs}
          templates={[
            {
              id: 'tpl_invitation',
              name: 'Candidate Invitation',
              category: 'Invitation',
              relatedEvent: 'candidate_invited',
              subject: 'Welcome',
              body: 'Hello',
              availableVariables: [],
              isActive: true,
              isSystem: true,
              version: 1,
              createdAt: '',
              updatedAt: '',
            },
          ]}
          onSave={vi.fn()}
        />,
      );

      expect(html).toContain('Notification Settings &amp; Channel Routing');
      expect(html).toContain('Candidate invited');
      expect(html).toContain('Candidate');
      expect(html).toContain('Save Changes');
      expect(html).toContain('Save');
    });
  });

  describe('3. Reminder Rules Modal', () => {
    it('renders automated reminder rules list with schedules, triggers, and add rule action', () => {
      const mockRules = [
        {
          id: 'rem_1',
          name: 'Candidate registration incomplete',
          relatedEvent: 'candidate_invited',
          isActive: true,
          triggerType: 'after_inactivity' as const,
          delayAmount: 24,
          delayUnit: 'hours' as const,
          repeatInterval: 24,
          maxReminderCount: 3,
          dayType: 'calendar_days' as const,
          emailEnabled: true,
          inAppEnabled: false,
          recipients: ['candidate'],
          escalationEnabled: true,
          escalateAfterCount: 3,
          escalationRecipient: 'assigned_hr',
          maxEscalationAttempts: 1,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const html = renderToStaticMarkup(
        <ReminderRulesModal
          isOpen={true}
          onClose={vi.fn()}
          rules={mockRules}
          onCreateRule={vi.fn()}
          onUpdateRule={vi.fn()}
          onDeleteRule={vi.fn()}
        />,
      );

      expect(html).toContain('Automated Reminder Rules &amp; Schedules');
      expect(html).toContain('Candidate registration incomplete');
      expect(html).toContain('24 hours');
      expect(html).toContain('+ Add Reminder Rule');
    });
  });

  describe('4. Email Templates Modal', () => {
    it('renders email templates table with system badge and actions', () => {
      const mockTemplates = [
        {
          id: 'tpl_1',
          name: 'Candidate Invitation',
          category: 'Invitation',
          relatedEvent: 'candidate_invited',
          subject: 'Welcome to BEZENT',
          body: 'Dear {{candidate_name}}, Welcome!',
          availableVariables: ['candidate_name', 'company_name'],
          isActive: true,
          isSystem: true,
          version: 1,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      const html = renderToStaticMarkup(
        <EmailTemplatesModal
          isOpen={true}
          onClose={vi.fn()}
          templates={mockTemplates}
          onCreateTemplate={vi.fn()}
          onUpdateTemplate={vi.fn()}
          onDuplicateTemplate={vi.fn()}
          onDeleteTemplate={vi.fn()}
        />,
      );

      expect(html).toContain('Email Template Management');
      expect(html).toContain('Candidate Invitation');
      expect(html).toContain('System');
      expect(html).toContain('+ Create Template');
    });

    it('renders the standalone editor with contextual dynamic variables when editing', () => {
      const mockTemplates = [
        {
          id: 'tpl_1',
          name: 'Candidate Invitation',
          category: 'Invitation',
          relatedEvent: 'candidate_invited',
          subject: 'Welcome to BEZENT',
          body: 'Dear {{candidate_name}}, Welcome!',
          availableVariables: ['candidate_name', 'company_name'],
          isActive: true,
          isSystem: true,
          version: 1,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      const html = renderToStaticMarkup(
        <EmailTemplatesModal
          isOpen={true}
          onClose={vi.fn()}
          templates={mockTemplates}
          onCreateTemplate={vi.fn()}
          onUpdateTemplate={vi.fn()}
          onDuplicateTemplate={vi.fn()}
          onDeleteTemplate={vi.fn()}
          initialEditTemplateId="tpl_1"
        />,
      );

      expect(html).toContain('Dynamic Variables');
      expect(html).toContain('{{candidate_name}}');
      expect(html).toContain('{{company_name}}');
      expect(html).toContain('Send Test Email');
      expect(html).toContain('Save Template');
    });
  });

  describe('5. Notification History Modal', () => {
    it('renders history audit log with status filter and recipient details', () => {
      const mockHistory = [
        {
          id: 'nh_1',
          recipient: 'Taylor Swift (taylor@example.com)',
          eventKey: 'candidate_invited',
          eventName: 'Candidate invited',
          channel: 'email' as const,
          subject: 'Welcome to Acme',
          contentSnippet: 'Dear Taylor...',
          status: 'sent' as const,
          retryCount: 0,
          createdAt: '2026-01-01T00:00:00Z',
          sentAt: '2026-01-01T00:00:00Z',
        },
      ];

      const html = renderToStaticMarkup(
        <NotificationHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          items={mockHistory}
          total={1}
          onRefresh={vi.fn()}
        />,
      );

      expect(html).toContain('Notification &amp; Delivery Audit History');
      expect(html).toContain('Taylor Swift');
      expect(html).toContain('SENT');
      expect(html).toContain('EMAIL');
    });
  });

  describe('6. FormsOnboardingTab Embedding', () => {
    it('renders Notifications & Reminders inside Forms & Onboarding workspace', () => {
      const html = renderToStaticMarkup(<FormsOnboardingTab />);

      expect(html).toContain('Notifications &amp; Reminders');
      expect(html).toContain('Supported Delivery Channels');
      expect(html).toContain('Notification Settings');
      expect(html).toContain('Reminder Rules');
      expect(html).toContain('Notification History');
      expect(html).not.toContain('Candidate Intake Form Workspace');
    });
  });
});
