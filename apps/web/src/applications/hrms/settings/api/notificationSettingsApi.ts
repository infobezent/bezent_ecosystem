import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  EventNotificationConfig,
  ReminderRule,
  EmailTemplate,
  NotificationHistoryItem,
  NotificationsOverviewDto,
  SendTestEmailDto,
  TemplatePreviewDto,
  HistoryFilterParams,
} from '../types/notificationSettings.types';

const BASE_URL = `${appConfig.apiBaseUrl}/hrms/settings/onboarding/notifications`;

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    const details = errorJson.error?.details
      ? Object.values(errorJson.error.details).join(', ')
      : '';
    throw new Error(details ? `${message}: ${details}` : message);
  }
  const json = await res.json();
  return json.data as T;
}

// -------------------- Overview --------------------
export async function fetchNotificationsOverview(): Promise<NotificationsOverviewDto> {
  const res = await authorizedFetch(`${BASE_URL}/overview`);
  return handleResponse<NotificationsOverviewDto>(res, 'Failed to fetch notifications overview');
}

// -------------------- Notification Event Settings --------------------
export async function fetchEventNotificationSettings(): Promise<EventNotificationConfig[]> {
  const res = await authorizedFetch(`${BASE_URL}/settings`);
  return handleResponse<EventNotificationConfig[]>(res, 'Failed to fetch notification settings');
}

export async function updateEventNotificationSettings(
  configs: EventNotificationConfig[],
): Promise<EventNotificationConfig[]> {
  const res = await authorizedFetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configs }),
  });
  return handleResponse<EventNotificationConfig[]>(res, 'Failed to update notification settings');
}

// -------------------- Reminder Rules --------------------
export async function fetchReminderRules(): Promise<ReminderRule[]> {
  const res = await authorizedFetch(`${BASE_URL}/reminder-rules`);
  return handleResponse<ReminderRule[]>(res, 'Failed to fetch reminder rules');
}

export async function createReminderRule(rule: Partial<ReminderRule>): Promise<ReminderRule> {
  const res = await authorizedFetch(`${BASE_URL}/reminder-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  return handleResponse<ReminderRule>(res, 'Failed to create reminder rule');
}

export async function updateReminderRule(
  id: string,
  rule: Partial<ReminderRule>,
): Promise<ReminderRule> {
  const res = await authorizedFetch(`${BASE_URL}/reminder-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  return handleResponse<ReminderRule>(res, 'Failed to update reminder rule');
}

export async function deleteReminderRule(id: string): Promise<void> {
  const res = await authorizedFetch(`${BASE_URL}/reminder-rules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete reminder rule');
  }
}

export async function evaluateReminderRules(): Promise<{ evaluatedRulesCount: number; remindersDispatched: number }> {
  const res = await authorizedFetch(`${BASE_URL}/reminder-rules/evaluate`, {
    method: 'POST',
  });
  return handleResponse<{ evaluatedRulesCount: number; remindersDispatched: number }>(
    res,
    'Failed to evaluate reminder rules',
  );
}

// -------------------- Email Templates --------------------
export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
  const res = await authorizedFetch(`${BASE_URL}/email-templates`);
  return handleResponse<EmailTemplate[]>(res, 'Failed to fetch email templates');
}

export async function createEmailTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const res = await authorizedFetch(`${BASE_URL}/email-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  return handleResponse<EmailTemplate>(res, 'Failed to create email template');
}

export async function updateEmailTemplate(
  id: string,
  template: Partial<EmailTemplate>,
): Promise<EmailTemplate> {
  const res = await authorizedFetch(`${BASE_URL}/email-templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  return handleResponse<EmailTemplate>(res, 'Failed to update email template');
}

export async function duplicateEmailTemplate(id: string): Promise<EmailTemplate> {
  const res = await authorizedFetch(`${BASE_URL}/email-templates/${id}/duplicate`, {
    method: 'POST',
  });
  return handleResponse<EmailTemplate>(res, 'Failed to duplicate email template');
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const res = await authorizedFetch(`${BASE_URL}/email-templates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete email template');
  }
}

export async function previewEmailTemplate(
  dto: TemplatePreviewDto,
): Promise<{ subject: string; body: string }> {
  const res = await authorizedFetch(`${BASE_URL}/email-templates/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<{ subject: string; body: string }>(res, 'Failed to preview email template');
}

export async function sendTestEmail(
  dto: SendTestEmailDto,
): Promise<{ success: boolean; message: string }> {
  const res = await authorizedFetch(`${BASE_URL}/email-templates/test-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<{ success: boolean; message: string }>(res, 'Failed to send test email');
}

// -------------------- Notification History --------------------
export async function fetchNotificationHistory(
  filters?: HistoryFilterParams,
): Promise<{ items: NotificationHistoryItem[]; total: number }> {
  const query = new URLSearchParams();
  if (filters?.eventKey) query.set('eventKey', filters.eventKey);
  if (filters?.channel) query.set('channel', filters.channel);
  if (filters?.status) query.set('status', filters.status);
  if (filters?.search) query.set('search', filters.search);
  if (filters?.page) query.set('page', filters.page.toString());
  if (filters?.pageSize) query.set('pageSize', filters.pageSize.toString());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await authorizedFetch(`${BASE_URL}/history${qs}`);
  return handleResponse<{ items: NotificationHistoryItem[]; total: number }>(
    res,
    'Failed to fetch notification history',
  );
}

export async function retryNotification(id: string): Promise<NotificationHistoryItem> {
  const res = await authorizedFetch(`${BASE_URL}/history/${id}/retry`, {
    method: 'POST',
  });
  return handleResponse<NotificationHistoryItem>(res, 'Failed to retry notification');
}
