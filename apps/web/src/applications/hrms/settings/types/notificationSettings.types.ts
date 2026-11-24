/**
 * BEZENT HRMS - Frontend Notification & Reminders V1 Types
 */

export type NotificationChannel = 'email' | 'in_app';
export type FutureChannel = 'sms' | 'whatsapp';

export const SUPPORTED_EVENT_KEYS = [
  'candidate_invited',
  'registration_submitted',
  'candidate_details_updated',
  'candidate_stage_changed',
  'checklist_assigned',
  'checklist_task_overdue',
  'document_uploaded',
  'document_rejected',
  'document_approved',
  'conversion_completed',
] as const;

export type SupportedEventKey = (typeof SUPPORTED_EVENT_KEYS)[number];

export type NotificationRecipientType =
  'candidate' | 'hr_team' | 'assigned_hr' | 'reporting_manager' | 'task_owner' | string;

export interface EventNotificationConfig {
  id: string;
  eventKey: SupportedEventKey;
  name: string;
  description: string;
  enabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  recipients: NotificationRecipientType[];
  templateId: string;
}

export type ReminderTriggerType =
  'before_due_date' | 'after_due_date' | 'after_inactivity' | 'fixed_delay';

export type ReminderScheduleUnit = 'hours' | 'days';
export type ReminderDayType = 'business_days' | 'calendar_days';

export interface ReminderRule {
  id: string;
  name: string;
  relatedEvent: SupportedEventKey | string;
  isActive: boolean;
  triggerType: ReminderTriggerType;
  delayAmount: number;
  delayUnit: ReminderScheduleUnit;
  repeatInterval: number;
  maxReminderCount: number;
  dayType: ReminderDayType;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  recipients: NotificationRecipientType[];
  escalationEnabled: boolean;
  escalateAfterCount: number;
  escalationRecipient: string;
  maxEscalationAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  relatedEvent: SupportedEventKey | string;
  subject: string;
  body: string;
  availableVariables: string[];
  isActive: boolean;
  isSystem: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type NotificationHistoryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface NotificationHistoryItem {
  id: string;
  recipient: string;
  recipientEmail?: string;
  recipientRole?: string;
  eventKey: string;
  eventName: string;
  channel: NotificationChannel;
  templateName?: string;
  subject: string;
  contentSnippet: string;
  status: NotificationHistoryStatus;
  failureReason?: string;
  retryCount: number;
  lastRetriedAt?: string;
  createdAt: string;
  sentAt?: string;
  readAt?: string;
}

export interface NotificationsOverviewDto {
  channels: {
    email: { enabled: boolean; status: 'active' };
    inApp: { enabled: boolean; status: 'active' };
    sms: { enabled: boolean; status: 'future' };
    whatsapp: { enabled: boolean; status: 'future' };
  };
  eventCounts: {
    total: number;
    active: number;
  };
  reminderCounts: {
    total: number;
    active: number;
  };
  templateCounts: {
    total: number;
    active: number;
  };
  historyCounts: {
    total: number;
    sent: number;
    failed: number;
  };
}

export interface SendTestEmailDto {
  templateId: string;
  recipientEmail: string;
  sampleVariables?: Record<string, string>;
}

export interface TemplatePreviewDto {
  templateId?: string;
  subject?: string;
  body?: string;
  sampleVariables?: Record<string, string>;
}

export interface HistoryFilterParams {
  eventKey?: string;
  channel?: NotificationChannel;
  status?: NotificationHistoryStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}
