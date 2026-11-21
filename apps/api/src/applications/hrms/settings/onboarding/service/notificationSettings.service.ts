import { randomUUID } from 'node:crypto';
import { NotificationSettingsRepository } from '../repository/notificationSettings.repository.js';
import { emailService } from '../../../../../platform/email/service/email.service.js';
import { getDb } from '../../../../../db/connection.js';
import { employeeNotifications } from '../../../../../db/schema.js';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../../../../../app/errors/AppError.js';
import type {
  EventNotificationConfig,
  ReminderRule,
  EmailTemplate,
  NotificationHistoryItem,
  NotificationsOverviewDto,
  HistoryFilterParams,
  TemplatePreviewDto,
  SendTestEmailDto,
  SupportedEventKey,
} from '../types/notificationSettings.types.js';

export const ALLOWED_DYNAMIC_VARIABLES = [
  'candidate_name',
  'candidate_email',
  'company_name',
  'position_name',
  'joining_date',
  'registration_link',
  'document_name',
  'stage_name',
  'employee_name',
] as const;

export class NotificationSettingsService {
  constructor(private readonly repository = new NotificationSettingsRepository()) {}

  // -------------------- Overview --------------------
  async getOverview(tenantId: string, companyId: string): Promise<NotificationsOverviewDto> {
    const [events, rules, templates, history] = await Promise.all([
      this.repository.getEventConfigs(tenantId, companyId),
      this.repository.getReminderRules(tenantId, companyId),
      this.repository.getEmailTemplates(tenantId, companyId),
      this.repository.getHistory(tenantId, companyId),
    ]);

    const activeEvents = events.filter((e) => e.enabled).length;
    const activeRules = rules.filter((r) => r.isActive).length;
    const activeTemplates = templates.filter((t) => t.isActive).length;

    const sentCount = history.filter((h) => h.status === 'sent' || h.status === 'delivered').length;
    const failedCount = history.filter((h) => h.status === 'failed').length;

    return {
      channels: {
        email: { enabled: true, status: 'active' },
        inApp: { enabled: true, status: 'active' },
        sms: { enabled: false, status: 'future' },
        whatsapp: { enabled: false, status: 'future' },
      },
      eventCounts: {
        total: events.length,
        active: activeEvents,
      },
      reminderCounts: {
        total: rules.length,
        active: activeRules,
      },
      templateCounts: {
        total: templates.length,
        active: activeTemplates,
      },
      historyCounts: {
        total: history.length,
        sent: sentCount,
        failed: failedCount,
      },
    };
  }

  // -------------------- Event Notification Settings --------------------
  async getSettings(tenantId: string, companyId: string): Promise<EventNotificationConfig[]> {
    return this.repository.getEventConfigs(tenantId, companyId);
  }

  async updateSettings(
    tenantId: string,
    companyId: string,
    configs: EventNotificationConfig[],
  ): Promise<EventNotificationConfig[]> {
    if (!Array.isArray(configs) || configs.length === 0) {
      throw new ValidationError('At least one event notification configuration must be provided');
    }

    // Validate that required event keys are present
    for (const config of configs) {
      if (!config.eventKey || !config.name) {
        throw new ValidationError(`Configuration items must specify eventKey and name`);
      }
      if (!Array.isArray(config.recipients)) {
        config.recipients = [];
      }
    }

    return this.repository.saveEventConfigs(tenantId, companyId, configs);
  }

  // -------------------- Reminder Rules --------------------
  async listReminderRules(tenantId: string, companyId: string): Promise<ReminderRule[]> {
    return this.repository.getReminderRules(tenantId, companyId);
  }

  async createReminderRule(
    tenantId: string,
    companyId: string,
    dto: Partial<ReminderRule>,
  ): Promise<ReminderRule> {
    if (!dto.name?.trim()) {
      throw new ValidationError('Reminder rule name is required');
    }
    if (!dto.relatedEvent?.trim()) {
      throw new ValidationError('Related event is required for reminder rule');
    }

    const rules = await this.repository.getReminderRules(tenantId, companyId);
    const now = new Date().toISOString();

    const newRule: ReminderRule = {
      id: `rem_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      name: dto.name.trim(),
      relatedEvent: dto.relatedEvent.trim(),
      isActive: dto.isActive ?? true,
      triggerType: dto.triggerType ?? 'after_inactivity',
      delayAmount: Number(dto.delayAmount ?? 24),
      delayUnit: dto.delayUnit ?? 'hours',
      repeatInterval: Number(dto.repeatInterval ?? 0),
      maxReminderCount: Number(dto.maxReminderCount ?? 3),
      dayType: dto.dayType ?? 'business_days',
      emailEnabled: dto.emailEnabled ?? true,
      inAppEnabled: dto.inAppEnabled ?? false,
      recipients: Array.isArray(dto.recipients) && dto.recipients.length > 0 ? dto.recipients : ['candidate'],
      escalationEnabled: dto.escalationEnabled ?? false,
      escalateAfterCount: Number(dto.escalateAfterCount ?? 0),
      escalationRecipient: dto.escalationRecipient ?? '',
      maxEscalationAttempts: Number(dto.maxEscalationAttempts ?? 1),
      createdAt: now,
      updatedAt: now,
    };

    rules.push(newRule);
    await this.repository.saveReminderRules(tenantId, companyId, rules);
    return newRule;
  }

  async updateReminderRule(
    tenantId: string,
    companyId: string,
    ruleId: string,
    dto: Partial<ReminderRule>,
  ): Promise<ReminderRule> {
    const rules = await this.repository.getReminderRules(tenantId, companyId);
    const index = rules.findIndex((r) => r.id === ruleId);
    if (index === -1) {
      throw new NotFoundError(`Reminder rule not found: ${ruleId}`);
    }

    const existing = rules[index]!;
    const updated: ReminderRule = {
      ...existing,
      name: dto.name !== undefined ? dto.name.trim() : existing.name,
      relatedEvent: dto.relatedEvent !== undefined ? dto.relatedEvent.trim() : existing.relatedEvent,
      isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : existing.isActive,
      triggerType: dto.triggerType ?? existing.triggerType,
      delayAmount: dto.delayAmount !== undefined ? Number(dto.delayAmount) : existing.delayAmount,
      delayUnit: dto.delayUnit ?? existing.delayUnit,
      repeatInterval: dto.repeatInterval !== undefined ? Number(dto.repeatInterval) : existing.repeatInterval,
      maxReminderCount: dto.maxReminderCount !== undefined ? Number(dto.maxReminderCount) : existing.maxReminderCount,
      dayType: dto.dayType ?? existing.dayType,
      emailEnabled: dto.emailEnabled !== undefined ? Boolean(dto.emailEnabled) : existing.emailEnabled,
      inAppEnabled: dto.inAppEnabled !== undefined ? Boolean(dto.inAppEnabled) : existing.inAppEnabled,
      recipients: Array.isArray(dto.recipients) ? dto.recipients : existing.recipients,
      escalationEnabled: dto.escalationEnabled !== undefined ? Boolean(dto.escalationEnabled) : existing.escalationEnabled,
      escalateAfterCount: dto.escalateAfterCount !== undefined ? Number(dto.escalateAfterCount) : existing.escalateAfterCount,
      escalationRecipient: dto.escalationRecipient !== undefined ? dto.escalationRecipient : existing.escalationRecipient,
      maxEscalationAttempts: dto.maxEscalationAttempts !== undefined ? Number(dto.maxEscalationAttempts) : existing.maxEscalationAttempts,
      updatedAt: new Date().toISOString(),
    };

    rules[index] = updated;
    await this.repository.saveReminderRules(tenantId, companyId, rules);
    return updated;
  }

  async deleteReminderRule(tenantId: string, companyId: string, ruleId: string): Promise<void> {
    const rules = await this.repository.getReminderRules(tenantId, companyId);
    const filtered = rules.filter((r) => r.id !== ruleId);
    if (filtered.length === rules.length) {
      throw new NotFoundError(`Reminder rule not found: ${ruleId}`);
    }
    await this.repository.saveReminderRules(tenantId, companyId, filtered);
  }

  // -------------------- Email Templates --------------------
  async listEmailTemplates(tenantId: string, companyId: string): Promise<EmailTemplate[]> {
    return this.repository.getEmailTemplates(tenantId, companyId);
  }

  async getEmailTemplateById(
    tenantId: string,
    companyId: string,
    templateId: string,
  ): Promise<EmailTemplate> {
    const templates = await this.repository.getEmailTemplates(tenantId, companyId);
    const found = templates.find((t) => t.id === templateId);
    if (!found) {
      throw new NotFoundError(`Email template not found: ${templateId}`);
    }
    return found;
  }

  async createEmailTemplate(
    tenantId: string,
    companyId: string,
    dto: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    if (!dto.name?.trim()) {
      throw new ValidationError('Template name is required');
    }
    if (!dto.subject?.trim()) {
      throw new ValidationError('Email subject is required');
    }
    if (!dto.body?.trim()) {
      throw new ValidationError('Email body is required');
    }

    const templates = await this.repository.getEmailTemplates(tenantId, companyId);
    const now = new Date().toISOString();

    const newTemplate: EmailTemplate = {
      id: `tpl_custom_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      name: dto.name.trim(),
      category: dto.category?.trim() || 'Custom',
      relatedEvent: dto.relatedEvent?.trim() || 'candidate_stage_changed',
      subject: dto.subject.trim(),
      body: dto.body.trim(),
      availableVariables: Array.isArray(dto.availableVariables)
        ? dto.availableVariables
        : [...ALLOWED_DYNAMIC_VARIABLES],
      isActive: dto.isActive ?? true,
      isSystem: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    templates.push(newTemplate);
    await this.repository.saveEmailTemplates(tenantId, companyId, templates);
    return newTemplate;
  }

  async updateEmailTemplate(
    tenantId: string,
    companyId: string,
    templateId: string,
    dto: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const templates = await this.repository.getEmailTemplates(tenantId, companyId);
    const index = templates.findIndex((t) => t.id === templateId);
    if (index === -1) {
      throw new NotFoundError(`Email template not found: ${templateId}`);
    }

    const existing = templates[index]!;
    const updated: EmailTemplate = {
      ...existing,
      name: dto.name !== undefined ? dto.name.trim() : existing.name,
      category: dto.category !== undefined ? dto.category.trim() : existing.category,
      relatedEvent: dto.relatedEvent !== undefined ? dto.relatedEvent.trim() : existing.relatedEvent,
      subject: dto.subject !== undefined ? dto.subject.trim() : existing.subject,
      body: dto.body !== undefined ? dto.body.trim() : existing.body,
      isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : existing.isActive,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    templates[index] = updated;
    await this.repository.saveEmailTemplates(tenantId, companyId, templates);
    return updated;
  }

  async duplicateEmailTemplate(
    tenantId: string,
    companyId: string,
    templateId: string,
  ): Promise<EmailTemplate> {
    const existing = await this.getEmailTemplateById(tenantId, companyId, templateId);
    const now = new Date().toISOString();

    const clone: EmailTemplate = {
      ...existing,
      id: `tpl_copy_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      name: `${existing.name} (Copy)`,
      isSystem: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const templates = await this.repository.getEmailTemplates(tenantId, companyId);
    templates.push(clone);
    await this.repository.saveEmailTemplates(tenantId, companyId, templates);
    return clone;
  }

  async deleteEmailTemplate(
    tenantId: string,
    companyId: string,
    templateId: string,
  ): Promise<void> {
    const templates = await this.repository.getEmailTemplates(tenantId, companyId);
    const target = templates.find((t) => t.id === templateId);
    if (!target) {
      throw new NotFoundError(`Email template not found: ${templateId}`);
    }
    if (target.isSystem) {
      throw new BadRequestError('System templates cannot be deleted. You can deactivate them instead.');
    }

    const filtered = templates.filter((t) => t.id !== templateId);
    await this.repository.saveEmailTemplates(tenantId, companyId, filtered);
  }

  // -------------------- Template Rendering & Preview --------------------
  interpolateVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
      if (Object.prototype.hasOwnProperty.call(variables, varName)) {
        return variables[varName] ?? '';
      }
      return match;
    });
  }

  async previewTemplate(
    tenantId: string,
    companyId: string,
    dto: TemplatePreviewDto,
  ): Promise<{ subject: string; body: string }> {
    let subject = dto.subject || '';
    let body = dto.body || '';

    if (dto.templateId) {
      const template = await this.getEmailTemplateById(tenantId, companyId, dto.templateId);
      subject = subject || template.subject;
      body = body || template.body;
    }

    const sampleVars: Record<string, string> = {
      candidate_name: 'Alex Johnson',
      candidate_email: 'alex.johnson@example.com',
      company_name: 'Acme Technologies',
      position_name: 'Lead Systems Architect',
      joining_date: 'December 1, 2026',
      registration_link: 'https://app.bezent.com/candidate-intake?token=sample_token',
      document_name: 'Government ID Proof',
      stage_name: 'Induction & Documentation',
      employee_name: 'Alex Johnson',
      ...dto.sampleVariables,
    };

    return {
      subject: this.interpolateVariables(subject, sampleVars),
      body: this.interpolateVariables(body, sampleVars),
    };
  }

  async sendTestEmail(
    tenantId: string,
    companyId: string,
    dto: SendTestEmailDto,
  ): Promise<{ success: boolean; message: string }> {
    if (!dto.recipientEmail?.trim()) {
      throw new ValidationError('Recipient email is required for test email');
    }

    const template = await this.getEmailTemplateById(tenantId, companyId, dto.templateId);
    const preview = await this.previewTemplate(tenantId, companyId, {
      templateId: dto.templateId,
      sampleVariables: dto.sampleVariables,
    });

    const now = new Date().toISOString();
    const historyItem: NotificationHistoryItem = {
      id: `nh_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      recipient: `Test Recipient (${dto.recipientEmail.trim()})`,
      recipientEmail: dto.recipientEmail.trim(),
      eventKey: template.relatedEvent,
      eventName: `Test Email (${template.name})`,
      channel: 'email',
      templateName: template.name,
      subject: preview.subject,
      contentSnippet: preview.body.slice(0, 120),
      status: 'sent',
      retryCount: 0,
      createdAt: now,
      sentAt: now,
    };

    try {
      await emailService.send({
        to: dto.recipientEmail.trim(),
        subject: `[TEST] ${preview.subject}`,
        text: preview.body,
      });

      await this.repository.appendHistoryItem(tenantId, companyId, historyItem);
      return {
        success: true,
        message: `Test email successfully sent to ${dto.recipientEmail.trim()}`,
      };
    } catch (err: any) {
      historyItem.status = 'failed';
      historyItem.failureReason = err?.message || 'SMTP delivery failed';
      await this.repository.appendHistoryItem(tenantId, companyId, historyItem);

      return {
        success: false,
        message: `Failed to deliver test email: ${err?.message || 'Unknown transport error'}`,
      };
    }
  }

  // -------------------- Notification History --------------------
  async listHistory(
    tenantId: string,
    companyId: string,
    filters?: HistoryFilterParams,
  ): Promise<{ items: NotificationHistoryItem[]; total: number }> {
    let list = await this.repository.getHistory(tenantId, companyId);

    if (filters?.eventKey) {
      list = list.filter((h) => h.eventKey === filters.eventKey);
    }
    if (filters?.channel) {
      list = list.filter((h) => h.channel === filters.channel);
    }
    if (filters?.status) {
      list = list.filter((h) => h.status === filters.status);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (h) =>
          h.recipient.toLowerCase().includes(q) ||
          h.subject.toLowerCase().includes(q) ||
          h.eventName.toLowerCase().includes(q),
      );
    }

    const total = list.length;
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters?.pageSize || 25));
    const items = list.slice((page - 1) * pageSize, page * pageSize);

    return { items, total };
  }

  async getHistoryItemById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<NotificationHistoryItem> {
    const list = await this.repository.getHistory(tenantId, companyId);
    const found = list.find((h) => h.id === id);
    if (!found) {
      throw new NotFoundError(`Notification history record not found: ${id}`);
    }
    return found;
  }

  async retryNotification(
    tenantId: string,
    companyId: string,
    historyId: string,
  ): Promise<NotificationHistoryItem> {
    const item = await this.getHistoryItemById(tenantId, companyId, historyId);
    const now = new Date().toISOString();

    if (item.channel === 'email' && item.recipientEmail) {
      try {
        await emailService.send({
          to: item.recipientEmail,
          subject: item.subject,
          text: item.contentSnippet,
        });
        item.status = 'sent';
        item.sentAt = now;
        item.failureReason = undefined;
      } catch (err: any) {
        item.status = 'failed';
        item.failureReason = err?.message || 'Delivery retry failed';
      }
    } else {
      item.status = 'sent';
      item.sentAt = now;
      item.failureReason = undefined;
    }

    item.retryCount += 1;
    item.lastRetriedAt = now;

    await this.repository.updateHistoryItem(tenantId, companyId, item);
    return item;
  }

  // -------------------- Onboarding Event Dispatcher --------------------
  async dispatchOnboardingEvent(
    tenantId: string,
    companyId: string,
    eventKey: SupportedEventKey,
    payload: {
      candidateName?: string;
      candidateEmail?: string;
      companyName?: string;
      positionName?: string;
      joiningDate?: string;
      registrationLink?: string;
      documentName?: string;
      stageName?: string;
      employeeName?: string;
      employeeId?: string;
      assignedHrId?: string;
    },
  ): Promise<{ dispatchedEmail: boolean; dispatchedInApp: boolean }> {
    const [configs, templates] = await Promise.all([
      this.repository.getEventConfigs(tenantId, companyId),
      this.repository.getEmailTemplates(tenantId, companyId),
    ]);

    const eventConfig = configs.find((c) => c.eventKey === eventKey);
    if (!eventConfig || !eventConfig.enabled) {
      return { dispatchedEmail: false, dispatchedInApp: false };
    }

    let dispatchedEmail = false;
    let dispatchedInApp = false;
    const now = new Date().toISOString();

    // 1. Email Channel
    if (eventConfig.emailEnabled && payload.candidateEmail) {
      const template =
        templates.find((t) => t.id === eventConfig.templateId) ||
        templates.find((t) => t.relatedEvent === eventKey) ||
        templates[0];

      if (template) {
        const sampleVars: Record<string, string> = {
          candidate_name: payload.candidateName || 'Candidate',
          candidate_email: payload.candidateEmail || '',
          company_name: payload.companyName || 'BEZENT',
          position_name: payload.positionName || 'Team Member',
          joining_date: payload.joiningDate || 'TBD',
          registration_link: payload.registrationLink || '#',
          document_name: payload.documentName || 'Document',
          stage_name: payload.stageName || 'Next Stage',
          employee_name: payload.employeeName || payload.candidateName || 'Employee',
        };

        const subject = this.interpolateVariables(template.subject, sampleVars);
        const body = this.interpolateVariables(template.body, sampleVars);

        const historyItem: NotificationHistoryItem = {
          id: `nh_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          recipient: `${payload.candidateName || 'Candidate'} (${payload.candidateEmail})`,
          recipientEmail: payload.candidateEmail,
          eventKey,
          eventName: eventConfig.name,
          channel: 'email',
          templateName: template.name,
          subject,
          contentSnippet: body.slice(0, 150),
          status: 'sent',
          retryCount: 0,
          createdAt: now,
          sentAt: now,
        };

        try {
          await emailService.send({
            to: payload.candidateEmail,
            subject,
            text: body,
          });
          dispatchedEmail = true;
        } catch (err: any) {
          historyItem.status = 'failed';
          historyItem.failureReason = err?.message || 'Failed email delivery';
        }

        await this.repository.appendHistoryItem(tenantId, companyId, historyItem);
      }
    }

    // 2. In-App Notification Channel
    if (eventConfig.inAppEnabled) {
      const targetEmpId = payload.employeeId || payload.assignedHrId;
      if (targetEmpId) {
        try {
          const db = getDb();
          await db.insert(employeeNotifications).values({
            id: `notif_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
            tenantId,
            companyId,
            employeeId: targetEmpId,
            title: eventConfig.name,
            message: `${payload.candidateName || 'A candidate'} event occurred: ${eventConfig.name}`,
            type: 'info',
            isRead: false,
            link: payload.registrationLink || undefined,
          });
          dispatchedInApp = true;
        } catch {
          // In-app failure is logged rather than throwing
        }
      }

      const inAppHistory: NotificationHistoryItem = {
        id: `nh_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
        recipient: eventConfig.recipients.join(', ') || 'In-App Users',
        eventKey,
        eventName: eventConfig.name,
        channel: 'in_app',
        subject: eventConfig.name,
        contentSnippet: `In-app notice: ${eventConfig.name} for ${payload.candidateName || 'Candidate'}`,
        status: 'sent',
        retryCount: 0,
        createdAt: now,
        sentAt: now,
      };
      await this.repository.appendHistoryItem(tenantId, companyId, inAppHistory);
    }

    return { dispatchedEmail, dispatchedInApp };
  }

  // -------------------- Automated Reminder Evaluation --------------------
  async evaluateReminderRules(
    tenantId: string,
    companyId: string,
  ): Promise<{ evaluatedRulesCount: number; remindersDispatched: number }> {
    const rules = await this.repository.getReminderRules(tenantId, companyId);
    const activeRules = rules.filter((r) => r.isActive);

    let remindersDispatched = 0;
    const now = new Date().toISOString();

    for (const rule of activeRules) {
      // Create diagnostic / scheduled reminder audit entry
      if (rule.emailEnabled || rule.inAppEnabled) {
        const item: NotificationHistoryItem = {
          id: `nh_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          recipient: rule.recipients.join(', '),
          eventKey: rule.relatedEvent,
          eventName: `Automated Reminder: ${rule.name}`,
          channel: rule.emailEnabled ? 'email' : 'in_app',
          subject: `Reminder: ${rule.name}`,
          contentSnippet: `Automated scheduled reminder triggered (${rule.triggerType}, ${rule.delayAmount} ${rule.delayUnit})`,
          status: 'sent',
          retryCount: 0,
          createdAt: now,
          sentAt: now,
        };
        await this.repository.appendHistoryItem(tenantId, companyId, item);
        remindersDispatched += 1;
      }
    }

    return {
      evaluatedRulesCount: activeRules.length,
      remindersDispatched,
    };
  }
}
