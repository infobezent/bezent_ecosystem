import React, { useEffect, useState } from 'react';
import { Card } from '../../../../../../design-system/components/Card/Card';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Skeleton } from '../../../../../../design-system/components/Skeleton/Skeleton';
import { Stack } from '../../../../../../design-system/components/Stack/Stack';
import { Inline } from '../../../../../../design-system/components/Inline/Inline';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  NotificationsOverviewDto,
  EventNotificationConfig,
  ReminderRule,
  EmailTemplate,
  NotificationHistoryItem,
} from '../../../types/notificationSettings.types';
import {
  fetchNotificationsOverview,
  fetchEventNotificationSettings,
  updateEventNotificationSettings,
  fetchReminderRules,
  createReminderRule,
  updateReminderRule,
  deleteReminderRule,
  evaluateReminderRules,
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  duplicateEmailTemplate,
  deleteEmailTemplate,
  fetchNotificationHistory,
} from '../../../api/notificationSettingsApi';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { ReminderRulesModal } from './ReminderRulesModal';
import { EmailTemplatesModal } from './EmailTemplatesModal';
import { NotificationHistoryModal } from './NotificationHistoryModal';

interface NotificationsRemindersManagementProps {
  isEmbedded?: boolean;
}

const DEFAULT_OVERVIEW: NotificationsOverviewDto = {
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
};

export function NotificationsRemindersManagement({
  isEmbedded = false,
}: NotificationsRemindersManagementProps) {
  const [overview, setOverview] = useState<NotificationsOverviewDto>(DEFAULT_OVERVIEW);
  const [eventConfigs, setEventConfigs] = useState<EventNotificationConfig[]>([]);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [historyItems, setHistoryItems] = useState<NotificationHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      const [ov, evs, rls, tpls, hist] = await Promise.all([
        fetchNotificationsOverview(),
        fetchEventNotificationSettings(),
        fetchReminderRules(),
        fetchEmailTemplates(),
        fetchNotificationHistory({ pageSize: 50 }),
      ]);
      setOverview(ov);
      setEventConfigs(evs);
      setReminderRules(rls);
      setEmailTemplates(tpls);
      setHistoryItems(hist.items);
      setHistoryTotal(hist.total);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications configuration');
    }
  };

  useEffect(() => {
    void loadAllData();
  }, []);

  // Save Handlers
  const handleSaveSettings = async (configs: EventNotificationConfig[]) => {
    const updated = await updateEventNotificationSettings(configs);
    setEventConfigs(updated);
    void loadAllData();
  };

  const handleCreateRule = async (rule: Partial<ReminderRule>) => {
    const created = await createReminderRule(rule);
    setReminderRules((prev) => [...prev, created]);
    void loadAllData();
    return created;
  };

  const handleUpdateRule = async (id: string, rule: Partial<ReminderRule>) => {
    const updated = await updateReminderRule(id, rule);
    setReminderRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    void loadAllData();
    return updated;
  };

  const handleDeleteRule = async (id: string) => {
    await deleteReminderRule(id);
    setReminderRules((prev) => prev.filter((r) => r.id !== id));
    void loadAllData();
  };

  const handleEvaluateRules = async () => {
    await evaluateReminderRules();
    void loadAllData();
  };

  const handleCreateTemplate = async (tpl: Partial<EmailTemplate>) => {
    const created = await createEmailTemplate(tpl);
    setEmailTemplates((prev) => [...prev, created]);
    void loadAllData();
    return created;
  };

  const handleUpdateTemplate = async (id: string, tpl: Partial<EmailTemplate>) => {
    const updated = await updateEmailTemplate(id, tpl);
    setEmailTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    void loadAllData();
    return updated;
  };

  const handleDuplicateTemplate = async (id: string) => {
    const created = await duplicateEmailTemplate(id);
    setEmailTemplates((prev) => [...prev, created]);
    void loadAllData();
    return created;
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteEmailTemplate(id);
    setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
    void loadAllData();
  };

  return (
    <div className={`bezent-notifrem-workspace ${isEmbedded ? 'bezent-notifrem-workspace--embedded' : ''}`}>
      {/* Top Header Banner: Supported Channels (Sleek Compact Strip) */}
      <div className="bezent-notifrem-header-banner">
        <Inline justify="between" align="center" className="bezent-notifrem-channels-bar">
          <div className="bezent-notifrem-channels-title">
            <span className="bezent-notifrem-channels-heading">Supported Delivery Channels</span>
            <span className="bezent-notifrem-channels-sub bezent-sr-only">
              Configured notification mechanisms and platform communication capabilities
            </span>
          </div>

          <Inline gap="xs" align="center" className="bezent-notifrem-channels-pills">
            <div className="bezent-notifrem-channel-pill bezent-notifrem-channel-pill--active">
              <span className="bezent-notifrem-channel-indicator" />
              <span>Email &mdash; <strong>Enabled</strong></span>
            </div>
            <div className="bezent-notifrem-channel-pill bezent-notifrem-channel-pill--active">
              <span className="bezent-notifrem-channel-indicator" />
              <span>In-App Notifications &mdash; <strong>Enabled</strong></span>
            </div>
            <div className="bezent-notifrem-channel-pill bezent-notifrem-channel-pill--future">
              <span>SMS &mdash; <em>Future</em></span>
            </div>
            <div className="bezent-notifrem-channel-pill bezent-notifrem-channel-pill--future">
              <span>WhatsApp &mdash; <em>Future</em></span>
            </div>
          </Inline>
        </Inline>
      </div>

      {error && <Alert variant="danger" title="Error">{error}</Alert>}

      {/* 4 Modern Interactive Square Tiles Grid */}
      <div className="bezent-notifrem-cards-grid bezent-notifrem-tiles-grid">
        {/* Tile 1: Notification Settings */}
        <div
          className="bezent-notifrem-tile bezent-notifrem-card"
          data-testid="card-notification-settings"
          onClick={() => setIsSettingsOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsSettingsOpen(true)}
          title="Configure Notification Settings"
          aria-label="Notification Settings"
        >
          <div
            className="bezent-notifrem-tile__icon bezent-notifrem-tile__icon--settings"
            aria-hidden="true"
          >
            <BezentIcon name="notifications" size={22} />
          </div>

          <div className="bezent-notifrem-tile__content">
            <h3 className="bezent-notifrem-card__title bezent-notifrem-tile__title">
              Notification Settings
            </h3>
            <span className="bezent-notifrem-card__desc bezent-sr-only">
              Event-driven alert triggers and dual-channel routing across candidate email deliveries and in-app feed notifications.
            </span>
            <span className="bezent-notifrem-card__meta bezent-sr-only">
              Independent email and in-app toggles with recipient role resolution
            </span>
            <span className="bezent-sr-only">Configure</span>
          </div>

          <div className="bezent-notifrem-tile__badge bezent-notifrem-tile__badge--settings">
            <span className="bezent-notifrem-tile__badge-dot" />
            <span className="bezent-notifrem-tile__badge-text">
              {overview.eventCounts.active} of {overview.eventCounts.total} Active
            </span>
          </div>
        </div>

        {/* Tile 2: Reminder Rules */}
        <div
          className="bezent-notifrem-tile bezent-notifrem-card"
          data-testid="card-reminder-rules"
          onClick={() => setIsRulesOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsRulesOpen(true)}
          title="Configure Reminder Rules"
          aria-label="Reminder Rules"
        >
          <div
            className="bezent-notifrem-tile__icon bezent-notifrem-tile__icon--rules"
            aria-hidden="true"
          >
            <BezentIcon name="calendar" size={22} />
          </div>

          <div className="bezent-notifrem-tile__content">
            <h3 className="bezent-notifrem-card__title bezent-notifrem-tile__title">
              Reminder Rules
            </h3>
            <span className="bezent-notifrem-card__desc bezent-sr-only">
              Automated scheduled reminders, inactivity timeouts, repeat frequency limits, and manager escalation policies.
            </span>
            <span className="bezent-notifrem-card__meta bezent-sr-only">
              {overview.reminderCounts.total} rules configured (business &amp; calendar days)
            </span>
            <span className="bezent-sr-only">Configure</span>
          </div>

          <div className="bezent-notifrem-tile__badge bezent-notifrem-tile__badge--rules">
            <span className="bezent-notifrem-tile__badge-dot" />
            <span className="bezent-notifrem-tile__badge-text">
              {overview.reminderCounts.active} Active Rules
            </span>
          </div>
        </div>

        {/* Tile 3: Email Templates */}
        <div
          className="bezent-notifrem-tile bezent-notifrem-card"
          data-testid="card-email-templates"
          onClick={() => {
            setSelectedTemplateForEdit(null);
            setIsTemplatesOpen(true);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setSelectedTemplateForEdit(null);
              setIsTemplatesOpen(true);
            }
          }}
          title="Manage Email Templates"
          aria-label="Email Templates"
        >
          <div
            className="bezent-notifrem-tile__icon bezent-notifrem-tile__icon--templates"
            aria-hidden="true"
          >
            <BezentIcon name="document" size={22} />
          </div>

          <div className="bezent-notifrem-tile__content">
            <h3 className="bezent-notifrem-card__title bezent-notifrem-tile__title">
              Email Templates
            </h3>
            <span className="bezent-notifrem-card__desc bezent-sr-only">
              Branded email notification layouts, invitation messages, and contextual dynamic variables panel with test delivery.
            </span>
            <span className="bezent-notifrem-card__meta bezent-sr-only">
              {overview.templateCounts.active} active templates &bull; Variable interpolation
            </span>
            <span className="bezent-sr-only">Manage</span>
          </div>

          <div className="bezent-notifrem-tile__badge bezent-notifrem-tile__badge--templates">
            <span className="bezent-notifrem-tile__badge-dot" />
            <span className="bezent-notifrem-tile__badge-text">
              {overview.templateCounts.total} Templates
            </span>
          </div>
        </div>

        {/* Tile 4: Notification History */}
        <div
          className="bezent-notifrem-tile bezent-notifrem-card"
          data-testid="card-notification-history"
          onClick={() => setIsHistoryOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsHistoryOpen(true)}
          title="View Notification History"
          aria-label="Notification History"
        >
          <div
            className="bezent-notifrem-tile__icon bezent-notifrem-tile__icon--history"
            aria-hidden="true"
          >
            <BezentIcon name="checklist" size={22} />
          </div>

          <div className="bezent-notifrem-tile__content">
            <h3 className="bezent-notifrem-card__title bezent-notifrem-tile__title">
              Notification History
            </h3>
            <span className="bezent-notifrem-card__desc bezent-sr-only">
              Comprehensive audit log of sent emails, in-app feed alerts, recipient delivery statuses, and failure recovery.
            </span>
            <span className="bezent-notifrem-card__meta bezent-sr-only">
              {overview.historyCounts.total} total logged notices &bull; Retry failed supported
            </span>
            <span className="bezent-sr-only">View History</span>
          </div>

          <div className="bezent-notifrem-tile__badge bezent-notifrem-tile__badge--history">
            <span className="bezent-notifrem-tile__badge-dot" />
            <span className="bezent-notifrem-tile__badge-text">
              {overview.historyCounts.sent} Sent
              {overview.historyCounts.failed > 0 ? ` (${overview.historyCounts.failed} Failed)` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Modal 1: Notification Settings */}
      {isSettingsOpen && (
        <NotificationSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          configs={eventConfigs}
          templates={emailTemplates}
          onSave={handleSaveSettings}
          onPreviewTemplate={(templateId) => {
            setSelectedTemplateForEdit(templateId);
            setIsSettingsOpen(false);
            setIsTemplatesOpen(true);
          }}
        />
      )}

      {/* Modal 2: Reminder Rules */}
      {isRulesOpen && (
        <ReminderRulesModal
          isOpen={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
          rules={reminderRules}
          onCreateRule={handleCreateRule}
          onUpdateRule={handleUpdateRule}
          onDeleteRule={handleDeleteRule}
          onEvaluateNow={handleEvaluateRules}
        />
      )}

      {/* Modal 3: Email Templates */}
      {isTemplatesOpen && (
        <EmailTemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => {
            setIsTemplatesOpen(false);
            setSelectedTemplateForEdit(null);
          }}
          templates={emailTemplates}
          onCreateTemplate={handleCreateTemplate}
          onUpdateTemplate={handleUpdateTemplate}
          onDuplicateTemplate={handleDuplicateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          initialEditTemplateId={selectedTemplateForEdit}
        />
      )}

      {/* Modal 4: Notification History */}
      {isHistoryOpen && (
        <NotificationHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          items={historyItems}
          total={historyTotal}
          onRefresh={loadAllData}
        />
      )}
    </div>
  );
}
