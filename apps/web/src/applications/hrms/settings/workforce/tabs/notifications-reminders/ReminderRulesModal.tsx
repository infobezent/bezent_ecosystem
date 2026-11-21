import React, { useState } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { IconButton } from '../../../../../../design-system/components/IconButton/IconButton';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Stack } from '../../../../../../design-system/components/Stack/Stack';
import { Inline } from '../../../../../../design-system/components/Inline/Inline';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  ReminderRule,
  ReminderTriggerType,
  ReminderScheduleUnit,
  ReminderDayType,
  NotificationRecipientType,
} from '../../../types/notificationSettings.types';

interface ReminderRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ReminderRule[];
  onCreateRule: (rule: Partial<ReminderRule>) => Promise<ReminderRule>;
  onUpdateRule: (id: string, rule: Partial<ReminderRule>) => Promise<ReminderRule>;
  onDeleteRule: (id: string) => Promise<void>;
  onEvaluateNow?: () => Promise<void>;
}

const TRIGGER_TYPE_OPTIONS: Array<{ value: ReminderTriggerType; label: string }> = [
  { value: 'after_inactivity', label: 'After Inactivity' },
  { value: 'before_due_date', label: 'Before Due Date' },
  { value: 'after_due_date', label: 'After Due Date' },
  { value: 'fixed_delay', label: 'Fixed Delay from Event' },
];

const RECIPIENT_OPTIONS: Array<{ value: NotificationRecipientType; label: string }> = [
  { value: 'candidate', label: 'Candidate' },
  { value: 'assigned_hr', label: 'Assigned HR' },
  { value: 'hr_team', label: 'HR Team' },
  { value: 'task_owner', label: 'Task Owner' },
  { value: 'reporting_manager', label: 'Reporting Manager' },
  { value: 'role:hr_manager', label: 'HR Manager Role' },
  { value: 'role:admin', label: 'Admin Role' },
];

const RECIPIENT_LABEL_MAP: Record<string, string> = {
  candidate: 'Candidate',
  assigned_hr: 'Assigned HR',
  hr_team: 'HR Team',
  task_owner: 'Task Owner',
  reporting_manager: 'Reporting Manager',
  'role:hr_manager': 'HR Manager',
  'role:admin': 'Admin',
};

function formatRecipientLabel(val: string): string {
  if (!val) return 'None';
  return RECIPIENT_LABEL_MAP[val] || val.replace(/^role:/, '').replace(/_/g, ' ');
}

export function ReminderRulesModal({
  isOpen,
  onClose,
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onEvaluateNow,
}: ReminderRulesModalProps) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEvent, setFormEvent] = useState('candidate_invited');
  const [formTriggerType, setFormTriggerType] = useState<ReminderTriggerType>('after_inactivity');
  const [formDelayAmount, setFormDelayAmount] = useState<number>(24);
  const [formDelayUnit, setFormDelayUnit] = useState<ReminderScheduleUnit>('hours');
  const [formRepeatInterval, setFormRepeatInterval] = useState<number>(24);
  const [formMaxReminders, setFormMaxReminders] = useState<number>(3);
  const [formDayType, setFormDayType] = useState<ReminderDayType>('calendar_days');
  const [formEmailEnabled, setFormEmailEnabled] = useState(true);
  const [formInAppEnabled, setFormInAppEnabled] = useState(false);
  const [formRecipients, setFormRecipients] = useState<NotificationRecipientType[]>(['candidate']);
  const [formEscalationEnabled, setFormEscalationEnabled] = useState(false);
  const [formEscalateAfterCount, setFormEscalateAfterCount] = useState<number>(3);
  const [formEscalationRecipient, setFormEscalationRecipient] = useState('assigned_hr');
  const [formMaxEscalations, setFormMaxEscalations] = useState<number>(1);

  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const startEdit = (rule: ReminderRule) => {
    setIsAddingNew(false);
    setEditingRuleId(rule.id);
    setFormName(rule.name);
    setFormEvent(rule.relatedEvent);
    setFormTriggerType(rule.triggerType);
    setFormDelayAmount(rule.delayAmount);
    setFormDelayUnit(rule.delayUnit);
    setFormRepeatInterval(rule.repeatInterval);
    setFormMaxReminders(rule.maxReminderCount);
    setFormDayType(rule.dayType);
    setFormEmailEnabled(rule.emailEnabled);
    setFormInAppEnabled(rule.inAppEnabled);
    setFormRecipients(rule.recipients || ['candidate']);
    setFormEscalationEnabled(rule.escalationEnabled);
    setFormEscalateAfterCount(rule.escalateAfterCount);
    setFormEscalationRecipient(rule.escalationRecipient || 'assigned_hr');
    setFormMaxEscalations(rule.maxEscalationAttempts || 1);
    setError(null);
  };

  const startAddNew = () => {
    setEditingRuleId(null);
    setIsAddingNew(true);
    setFormName('');
    setFormEvent('candidate_invited');
    setFormTriggerType('after_inactivity');
    setFormDelayAmount(24);
    setFormDelayUnit('hours');
    setFormRepeatInterval(24);
    setFormMaxReminders(3);
    setFormDayType('calendar_days');
    setFormEmailEnabled(true);
    setFormInAppEnabled(false);
    setFormRecipients(['candidate']);
    setFormEscalationEnabled(false);
    setFormEscalateAfterCount(3);
    setFormEscalationRecipient('assigned_hr');
    setFormMaxEscalations(1);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setIsAddingNew(false);
    setError(null);
  };

  const handleToggleRecipient = (val: NotificationRecipientType) => {
    setFormRecipients((prev) =>
      prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val],
    );
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Please provide a name for the reminder rule');
      return;
    }
    if (formRecipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Partial<ReminderRule> = {
        name: formName.trim(),
        relatedEvent: formEvent,
        triggerType: formTriggerType,
        delayAmount: Number(formDelayAmount),
        delayUnit: formDelayUnit,
        repeatInterval: Number(formRepeatInterval),
        maxReminderCount: Number(formMaxReminders),
        dayType: formDayType,
        emailEnabled: formEmailEnabled,
        inAppEnabled: formInAppEnabled,
        recipients: formRecipients,
        escalationEnabled: formEscalationEnabled,
        escalateAfterCount: Number(formEscalateAfterCount),
        escalationRecipient: formEscalationRecipient,
        maxEscalationAttempts: Number(formMaxEscalations),
      };

      if (isAddingNew) {
        await onCreateRule(payload);
        setSuccessMsg('Reminder rule created successfully');
      } else if (editingRuleId) {
        await onUpdateRule(editingRuleId, payload);
        setSuccessMsg('Reminder rule updated successfully');
      }

      setIsAddingNew(false);
      setEditingRuleId(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save reminder rule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: ReminderRule, nextActive: boolean) => {
    try {
      await onUpdateRule(rule.id, { isActive: nextActive });
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle rule state');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder rule?')) return;
    try {
      await onDeleteRule(id);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete reminder rule');
    }
  };

  const handleManualEvaluate = async () => {
    if (!onEvaluateNow) return;
    setEvaluating(true);
    try {
      await onEvaluateNow();
      setSuccessMsg('Reminder rules evaluated; audit items recorded.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to evaluate reminder rules');
    } finally {
      setEvaluating(false);
    }
  };

  const isEditingOrAdding = Boolean(isAddingNew || editingRuleId);

  const handleModalClose = () => {
    if (isEditingOrAdding) {
      cancelEdit();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        isAddingNew
          ? 'Create Automated Reminder Rule'
          : editingRuleId
            ? 'Edit Reminder Rule'
            : 'Automated Reminder Rules & Schedules'
      }
      size="2xl"
      className="bezent-remindrules-modal"
      footer={
        isEditingOrAdding ? (
          <div className="bezent-genpref-modal-footer">
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveForm}
              loading={saving}
              aria-label={isAddingNew ? 'Save Rule' : 'Update Rule'}
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="bezent-notifrem-rules-footer">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <div className="bezent-notifrem-footer-actions">
              {onEvaluateNow && (
                <Button
                  variant="secondary"
                  onClick={handleManualEvaluate}
                  loading={evaluating}
                  title="Trigger immediate scheduler evaluation"
                >
                  Run Evaluation Now
                </Button>
              )}
              <Button variant="primary" onClick={startAddNew}>
                + Add Reminder Rule
              </Button>
            </div>
          </div>
        )
      }
    >
      <Stack gap="md" className="bezent-notifrem-rules-container">
        {error && <Alert variant="danger" title="Error">{error}</Alert>}
        {successMsg && <Alert variant="success" title="Success">{successMsg}</Alert>}

        {isEditingOrAdding ? (
          <form onSubmit={handleSaveForm} className="bezent-remindrules-form">
            {/* 1. Rule & Trigger */}
            <div className="bezent-genpref-modal-section">
              <div className="bezent-genpref-grid-2col">
                <Input
                  label="Reminder Rule Name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Candidate registration incomplete"
                  required
                />
                <Select
                  label="Trigger Condition"
                  value={formTriggerType}
                  onChange={(e) => setFormTriggerType(e.target.value as ReminderTriggerType)}
                  options={TRIGGER_TYPE_OPTIONS}
                />
              </div>
            </div>

            {/* 2. Timing & Schedule */}
            <div className="bezent-remindrules-timing-card">
              <div className="bezent-remindrules-timing-header">
                <span className="bezent-genpref-section-header__title">
                  <BezentIcon name="schedule" size={16} />
                  Schedule & Frequency
                </span>
              </div>
              <div className="bezent-remindrules-timing-grid">
                <Input
                  label="Delay Amount"
                  type="number"
                  min="1"
                  value={formDelayAmount}
                  onChange={(e) => setFormDelayAmount(Number(e.target.value))}
                />
                <Select
                  label="Unit"
                  value={formDelayUnit}
                  onChange={(e) => setFormDelayUnit(e.target.value as ReminderScheduleUnit)}
                  options={[
                    { value: 'hours', label: 'Hours' },
                    { value: 'days', label: 'Days' },
                  ]}
                />
                <Select
                  label="Day Calculation"
                  value={formDayType}
                  onChange={(e) => setFormDayType(e.target.value as ReminderDayType)}
                  options={[
                    { value: 'business_days', label: 'Business Days (Mon-Fri)' },
                    { value: 'calendar_days', label: 'Calendar Days' },
                  ]}
                />
                <Input
                  label="Repeat Every"
                  type="number"
                  min="0"
                  value={formRepeatInterval}
                  onChange={(e) => setFormRepeatInterval(Number(e.target.value))}
                />
                <Input
                  label="Max Reminders"
                  type="number"
                  min="1"
                  max="10"
                  value={formMaxReminders}
                  onChange={(e) => setFormMaxReminders(Number(e.target.value))}
                />
              </div>
            </div>

            {/* 3. Delivery Channels & Target Recipients */}
            <div className="bezent-genpref-grid-2col">
              <div className="bezent-genpref-roles-card">
                <div className="bezent-genpref-role-row">
                  <span className="bezent-genpref-section-header__title">
                    <BezentIcon name="notifications" size={16} />
                    Delivery Channels
                  </span>
                </div>
                <div className="bezent-genpref-switch-row">
                  <span className="bezent-genpref-toggle-title">Email Notifications</span>
                  <Switch
                    checked={formEmailEnabled}
                    onChange={(e) => setFormEmailEnabled(e.target.checked)}
                    aria-label="Email Notifications"
                  />
                </div>
                <div className="bezent-genpref-switch-row">
                  <span className="bezent-genpref-toggle-title">In-App Feed Alert</span>
                  <Switch
                    checked={formInAppEnabled}
                    onChange={(e) => setFormInAppEnabled(e.target.checked)}
                    aria-label="In-App Feed Alert"
                  />
                </div>
              </div>

              <div className="bezent-genpref-roles-card">
                <div className="bezent-genpref-role-row">
                  <span className="bezent-genpref-section-header__title">
                    <BezentIcon name="employees" size={16} />
                    Target Recipients
                  </span>
                  <div className="bezent-notifrem-recipient-chips">
                    {RECIPIENT_OPTIONS.map((opt) => {
                      const isSelected = formRecipients.includes(opt.value);
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => handleToggleRecipient(opt.value)}
                          className={`bezent-notifrem-chip ${
                            isSelected ? 'bezent-notifrem-chip--selected' : ''
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Escalation Policy */}
            <div className="bezent-genpref-roles-card">
              <div className="bezent-genpref-switch-row">
                <div className="bezent-genpref-toggle-info">
                  <span className="bezent-genpref-toggle-title">Manager Escalation</span>
                </div>
                <Switch
                  checked={formEscalationEnabled}
                  onChange={(e) => setFormEscalationEnabled(e.target.checked)}
                  aria-label="Enable Escalation"
                />
              </div>

              {formEscalationEnabled && (
                <div className="bezent-remindrules-escalation-box">
                  <div className="bezent-genpref-grid-2col">
                    <Input
                      label="Escalate After Reminder Count"
                      type="number"
                      min="1"
                      value={formEscalateAfterCount}
                      onChange={(e) => setFormEscalateAfterCount(Number(e.target.value))}
                    />
                    <Select
                      label="Escalation Target"
                      value={formEscalationRecipient}
                      onChange={(e) => setFormEscalationRecipient(e.target.value)}
                      options={[
                        { value: 'assigned_hr', label: 'Assigned HR Specialist' },
                        { value: 'reporting_manager', label: 'Reporting Manager' },
                        { value: 'hr_team', label: 'HR Team Lead' },
                        { value: 'role:hr_manager', label: 'HR Manager Role' },
                        { value: 'role:admin', label: 'System Administrator' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          </form>
        ) : (
          <div className="bezent-notifrem-table-container">
          <table className="bezent-notifrem-table" aria-label="Automated reminder rules table">
            <thead>
              <tr>
                <th scope="col" className="bezent-notifrem-th bezent-remindrules-th--name">Rule Name</th>
                <th scope="col" className="bezent-notifrem-th bezent-remindrules-th--active">Active</th>
                <th scope="col" className="bezent-notifrem-th bezent-remindrules-th--schedule">Schedule & Trigger</th>
                <th scope="col" className="bezent-notifrem-th bezent-remindrules-th--channels">Channels</th>
                <th scope="col" className="bezent-notifrem-th bezent-remindrules-th--escalation">Escalation</th>
                <th scope="col" className="bezent-notifrem-th bezent-remindrules-th--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="bezent-notifrem-tr">
                  <td className="bezent-notifrem-td">
                    <div className="bezent-notifrem-cell-stack">
                      <span className="bezent-notifrem-event-name">{rule.name}</span>
                      <span className="bezent-notifrem-event-desc">
                        Recipients: {rule.recipients.map(formatRecipientLabel).join(', ')}
                      </span>
                    </div>
                  </td>
                  <td className="bezent-notifrem-td bezent-notifrem-td--center">
                    <Switch
                      checked={rule.isActive}
                      onChange={(e) => handleToggleActive(rule, e.target.checked)}
                      aria-label={`Toggle active for ${rule.name}`}
                    />
                  </td>
                  <td className="bezent-notifrem-td">
                    <div className="bezent-notifrem-cell-stack">
                      <span className="bezent-notifrem-badge-label">
                        {rule.delayAmount} {rule.delayUnit} ({rule.triggerType.replace(/_/g, ' ')})
                      </span>
                      <span className="bezent-notifrem-event-desc">
                        {rule.repeatInterval > 0
                          ? `Repeats every ${rule.repeatInterval} ${rule.delayUnit} (Max: ${rule.maxReminderCount})`
                          : `One-time notice`}
                      </span>
                    </div>
                  </td>
                  <td className="bezent-notifrem-td">
                    <Inline gap="xs">
                      {rule.emailEnabled && <Badge variant="info">Email</Badge>}
                      {rule.inAppEnabled && <Badge variant="neutral">In-App</Badge>}
                      {!rule.emailEnabled && !rule.inAppEnabled && (
                        <Badge variant="warning">None</Badge>
                      )}
                    </Inline>
                  </td>
                  <td className="bezent-notifrem-td">
                    {rule.escalationEnabled ? (
                      <Badge variant="warning">
                        Escalates to {formatRecipientLabel(rule.escalationRecipient || '')}
                      </Badge>
                    ) : (
                      <span className="bezent-notifrem-event-desc">Disabled</span>
                    )}
                  </td>
                  <td className="bezent-notifrem-td bezent-notifrem-td--right">
                    <Inline gap="xs" justify="end">
                      <IconButton
                        label="Edit rule"
                        variant="ghost"
                        onClick={() => startEdit(rule)}
                      >
                        <BezentIcon name="edit" size={16} />
                      </IconButton>
                      <IconButton
                        label="Delete rule"
                        variant="ghost"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <BezentIcon name="delete" size={16} />
                      </IconButton>
                    </Inline>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Stack>
    </Modal>
  );
}
