import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import { formCustomizations } from '../../../../../db/schema.js';
import type {
  EventNotificationConfig,
  ReminderRule,
  EmailTemplate,
  NotificationHistoryItem,
} from '../types/notificationSettings.types.js';
import {
  DEFAULT_EVENT_CONFIGS,
  DEFAULT_REMINDER_RULES,
  DEFAULT_EMAIL_TEMPLATES,
} from '../service/notificationSettings.defaults.js';

const SETTINGS_KEY = 'onboarding_notification_settings_v1';
const REMINDERS_KEY = 'onboarding_reminder_rules_v1';
const TEMPLATES_KEY = 'onboarding_email_templates_v1';
const HISTORY_KEY = 'onboarding_notification_history_v1';

export class NotificationSettingsRepository {
  // -------------------- Notification Event Settings --------------------
  async getEventConfigs(tenantId: string, companyId: string): Promise<EventNotificationConfig[]> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, SETTINGS_KEY),
        ),
      );

    if (!row || !row.metadata || !Array.isArray((row.metadata as any).events)) {
      await this.saveEventConfigs(tenantId, companyId, DEFAULT_EVENT_CONFIGS);
      return DEFAULT_EVENT_CONFIGS;
    }

    return (row.metadata as any).events as EventNotificationConfig[];
  }

  async saveEventConfigs(
    tenantId: string,
    companyId: string,
    configs: EventNotificationConfig[],
  ): Promise<EventNotificationConfig[]> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, SETTINGS_KEY),
        ),
      );

    if (existing) {
      await db
        .update(formCustomizations)
        .set({
          metadata: { events: configs },
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, existing.id));
    } else {
      await db.insert(formCustomizations).values({
        id: `fn_${randomUUID().replace(/-/g, '')}`,
        tenantId,
        companyId,
        formKey: SETTINGS_KEY,
        version: 1,
        metadata: { events: configs },
      });
    }

    return configs;
  }

  // -------------------- Reminder Rules --------------------
  async getReminderRules(tenantId: string, companyId: string): Promise<ReminderRule[]> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, REMINDERS_KEY),
        ),
      );

    if (!row || !row.metadata || !Array.isArray((row.metadata as any).rules)) {
      await this.saveReminderRules(tenantId, companyId, DEFAULT_REMINDER_RULES);
      return DEFAULT_REMINDER_RULES;
    }

    return (row.metadata as any).rules as ReminderRule[];
  }

  async saveReminderRules(
    tenantId: string,
    companyId: string,
    rules: ReminderRule[],
  ): Promise<ReminderRule[]> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, REMINDERS_KEY),
        ),
      );

    if (existing) {
      await db
        .update(formCustomizations)
        .set({
          metadata: { rules },
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, existing.id));
    } else {
      await db.insert(formCustomizations).values({
        id: `fn_${randomUUID().replace(/-/g, '')}`,
        tenantId,
        companyId,
        formKey: REMINDERS_KEY,
        version: 1,
        metadata: { rules },
      });
    }

    return rules;
  }

  // -------------------- Email Templates --------------------
  async getEmailTemplates(tenantId: string, companyId: string): Promise<EmailTemplate[]> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, TEMPLATES_KEY),
        ),
      );

    if (!row || !row.metadata || !Array.isArray((row.metadata as any).templates)) {
      await this.saveEmailTemplates(tenantId, companyId, DEFAULT_EMAIL_TEMPLATES);
      return DEFAULT_EMAIL_TEMPLATES;
    }

    return (row.metadata as any).templates as EmailTemplate[];
  }

  async saveEmailTemplates(
    tenantId: string,
    companyId: string,
    templates: EmailTemplate[],
  ): Promise<EmailTemplate[]> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, TEMPLATES_KEY),
        ),
      );

    if (existing) {
      await db
        .update(formCustomizations)
        .set({
          metadata: { templates },
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, existing.id));
    } else {
      await db.insert(formCustomizations).values({
        id: `fn_${randomUUID().replace(/-/g, '')}`,
        tenantId,
        companyId,
        formKey: TEMPLATES_KEY,
        version: 1,
        metadata: { templates },
      });
    }

    return templates;
  }

  // -------------------- Notification History --------------------
  async getHistory(tenantId: string, companyId: string): Promise<NotificationHistoryItem[]> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, HISTORY_KEY),
        ),
      );

    if (!row || !row.metadata || !Array.isArray((row.metadata as any).history)) {
      return [];
    }

    return (row.metadata as any).history as NotificationHistoryItem[];
  }

  async appendHistoryItem(
    tenantId: string,
    companyId: string,
    item: NotificationHistoryItem,
  ): Promise<NotificationHistoryItem> {
    const list = await this.getHistory(tenantId, companyId);
    // Keep newest first; cap to last 200 items to bound storage
    const updated = [item, ...list].slice(0, 200);

    const db = getDb();
    const [existing] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, HISTORY_KEY),
        ),
      );

    if (existing) {
      await db
        .update(formCustomizations)
        .set({
          metadata: { history: updated },
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, existing.id));
    } else {
      await db.insert(formCustomizations).values({
        id: `fn_${randomUUID().replace(/-/g, '')}`,
        tenantId,
        companyId,
        formKey: HISTORY_KEY,
        version: 1,
        metadata: { history: updated },
      });
    }

    return item;
  }

  async updateHistoryItem(
    tenantId: string,
    companyId: string,
    updatedItem: NotificationHistoryItem,
  ): Promise<NotificationHistoryItem | null> {
    const list = await this.getHistory(tenantId, companyId);
    const index = list.findIndex((h) => h.id === updatedItem.id);
    if (index === -1) return null;

    list[index] = updatedItem;

    const db = getDb();
    const [existing] = await db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, HISTORY_KEY),
        ),
      );

    if (existing) {
      await db
        .update(formCustomizations)
        .set({
          metadata: { history: list },
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, existing.id));
    }

    return updatedItem;
  }
}
