import React, { useState } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  EventNotificationConfig,
  EmailTemplate,
  NotificationRecipientType,
} from '../../../types/notificationSettings.types';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: EventNotificationConfig[];
  templates: EmailTemplate[];
  onSave: (configs: EventNotificationConfig[]) => Promise<void>;
  onPreviewTemplate?: (templateId: string) => void;
}

const RECIPIENT_OPTIONS: Array<{ value: NotificationRecipientType; label: string }> = [
  { value: 'candidate', label: 'Candidate' },
  { value: 'hr_team', label: 'HR Team' },
  { value: 'assigned_hr', label: 'Assigned HR' },
  { value: 'reporting_manager', label: 'Reporting Manager' },
  { value: 'task_owner', label: 'Task Owner' },
  { value: 'role:hr_manager', label: 'HR Manager Role' },
  { value: 'role:admin', label: 'Administrator Role' },
];

export function NotificationSettingsModal({
  isOpen,
  onClose,
  configs: initialConfigs,
  templates,
  onSave,
  onPreviewTemplate,
}: NotificationSettingsModalProps) {
  const [configs, setConfigs] = useState<EventNotificationConfig[]>(() =>
    JSON.parse(JSON.stringify(initialConfigs || [])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleEvent = (index: number, enabled: boolean) => {
    setConfigs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, enabled };
      return copy;
    });
  };

  const handleToggleEmail = (index: number, emailEnabled: boolean) => {
    setConfigs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, emailEnabled };
      return copy;
    });
  };

  const handleToggleInApp = (index: number, inAppEnabled: boolean) => {
    setConfigs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, inAppEnabled };
      return copy;
    });
  };

  const handleTemplateChange = (index: number, templateId: string) => {
    setConfigs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, templateId };
      return copy;
    });
  };

  const handleToggleRecipient = (index: number, recipient: NotificationRecipientType) => {
    setConfigs((prev) => {
      const copy = [...prev];
      const current = copy[index]!.recipients || [];
      const has = current.includes(recipient);
      const next = has ? current.filter((r) => r !== recipient) : [...current, recipient];
      copy[index] = { ...copy[index]!, recipients: next };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(configs);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Settings & Channel Routing"
      size="2xl"
      className="bezent-notifrem-modal"
      footer={
        <div className="bezent-genpref-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={saving}
            aria-label="Save Changes"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="bezent-notifrem-settings-form">
        {error && (
          <div className="bezent-genpref-form-row">
            <Alert variant="danger" title="Error">
              {error}
            </Alert>
          </div>
        )}

        <div className="bezent-notifrem-table-container">
          <table className="bezent-notifrem-table" aria-label="Notification event settings table">
            <thead>
              <tr>
                <th scope="col" className="bezent-notifrem-th bezent-notifrem-th--event">
                  Event
                </th>
                <th scope="col" className="bezent-notifrem-th bezent-notifrem-th--center">
                  Status
                </th>
                <th scope="col" className="bezent-notifrem-th bezent-notifrem-th--center">
                  Email
                </th>
                <th scope="col" className="bezent-notifrem-th bezent-notifrem-th--center">
                  In-App
                </th>
                <th scope="col" className="bezent-notifrem-th bezent-notifrem-th--recipients">
                  Recipients
                </th>
                <th scope="col" className="bezent-notifrem-th bezent-notifrem-th--template">
                  Email Template
                </th>
              </tr>
            </thead>
            <tbody>
              {configs.map((cfg, idx) => (
                <tr
                  key={cfg.eventKey}
                  className={`bezent-notifrem-tr ${
                    !cfg.enabled ? 'bezent-notifrem-tr--disabled' : ''
                  }`}
                >
                  <td className="bezent-notifrem-td">
                    <div className="bezent-notifrem-event-cell">
                      <span className="bezent-notifrem-event-name">{cfg.name}</span>
                    </div>
                  </td>
                  <td className="bezent-notifrem-td bezent-notifrem-td--center">
                    <Switch
                      checked={cfg.enabled}
                      onChange={(e) => handleToggleEvent(idx, e.target.checked)}
                      aria-label={`Toggle ${cfg.name}`}
                    />
                  </td>
                  <td className="bezent-notifrem-td bezent-notifrem-td--center">
                    <Switch
                      checked={cfg.emailEnabled}
                      onChange={(e) => handleToggleEmail(idx, e.target.checked)}
                      disabled={!cfg.enabled}
                      aria-label={`Email for ${cfg.name}`}
                    />
                  </td>
                  <td className="bezent-notifrem-td bezent-notifrem-td--center">
                    <Switch
                      checked={cfg.inAppEnabled}
                      onChange={(e) => handleToggleInApp(idx, e.target.checked)}
                      disabled={!cfg.enabled}
                      aria-label={`In-App for ${cfg.name}`}
                    />
                  </td>
                  <td className="bezent-notifrem-td">
                    <div className="bezent-notifrem-recipient-chips">
                      {RECIPIENT_OPTIONS.map((opt) => {
                        const isSelected = (cfg.recipients || []).includes(opt.value);
                        return (
                          <button
                            type="button"
                            key={opt.value}
                            disabled={!cfg.enabled}
                            onClick={() => handleToggleRecipient(idx, opt.value)}
                            className={`bezent-notifrem-chip ${
                              isSelected ? 'bezent-notifrem-chip--selected' : ''
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="bezent-notifrem-td">
                    <div className="bezent-notifrem-template-cell">
                      <Select
                        value={cfg.templateId || ''}
                        onChange={(e) => handleTemplateChange(idx, e.target.value)}
                        disabled={!cfg.enabled || !cfg.emailEnabled}
                        options={[
                          { value: '', label: 'Select template...' },
                          ...templates.map((t) => ({
                            value: t.id,
                            label: `${t.name}${t.isSystem ? ' (System)' : ''}`,
                          })),
                        ]}
                        aria-label="Select template"
                      />
                      {cfg.templateId && onPreviewTemplate && (
                        <button
                          type="button"
                          className="bezent-notifrem-icon-btn"
                          onClick={() => onPreviewTemplate(cfg.templateId)}
                          title="Preview template"
                          aria-label="Preview template"
                        >
                          <BezentIcon name="view" size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  );
}
