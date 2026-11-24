import React, { useState } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  ConversionSettingsConfig,
  ConversionMode,
  DefaultConversionMode,
  DefaultEmploymentStatus,
  EffectiveDateType,
} from '../../../types/employeeConversion.types';

interface ConversionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: ConversionSettingsConfig;
  onSave: (settings: ConversionSettingsConfig) => Promise<void>;
  availableStages?: Array<{ key: string; name: string }>;
}

export function ConversionSettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSave,
  availableStages = [
    { key: 'completed', name: 'Completed (Terminal Stage)' },
    { key: 'induction', name: 'Induction' },
    { key: 'documents', name: 'Documents Verification' },
    { key: 'preboarding', name: 'Pre-boarding' },
  ],
}: ConversionSettingsModalProps) {
  const [conversionMode, setConversionMode] = useState<ConversionMode>(
    () => initialSettings?.conversionMode || 'both',
  );
  const [defaultMode, setDefaultMode] = useState<DefaultConversionMode>(
    () => initialSettings?.defaultMode || 'manual',
  );
  const [conversionTriggerStage, setConversionTriggerStage] = useState<string>(
    () => initialSettings?.conversionTriggerStage || 'completed',
  );
  const [defaultEmploymentStatus, setDefaultEmploymentStatus] = useState<DefaultEmploymentStatus>(
    () => initialSettings?.defaultEmploymentStatus || 'probation',
  );
  const [effectiveDateType, setEffectiveDateType] = useState<EffectiveDateType>(
    () => initialSettings?.effectiveDateType || 'joining_date',
  );
  const [allowHrOverride, setAllowHrOverride] = useState<boolean>(
    () => initialSettings?.allowHrOverride ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave({
        conversionMode,
        defaultMode,
        conversionTriggerStage,
        defaultEmploymentStatus,
        effectiveDateType,
        allowHrOverride,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversion settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Conversion Settings"
      size="lg"
      className="bezent-convsettings-modal"
      footer={
        <div className="bezent-convsettings-modal-footer">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="conversion-settings-form"
            loading={saving}
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      }
    >
      <form
        id="conversion-settings-form"
        onSubmit={handleSubmit}
        className="bezent-convsettings-modal-form"
      >
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Card 1: Conversion Strategy & Trigger Stage */}
        <div className="bezent-convsettings-card">
          <div className="bezent-convsettings-card-header">
            <div className="bezent-convsettings-icon-badge bezent-convsettings-icon-badge--blue">
              <BezentIcon name="onboarding" size={16} />
            </div>
            <h4 className="bezent-convsettings-card-title">Conversion Strategy & Trigger Stage</h4>
          </div>

          <div className="bezent-convsettings-card-body">
            <div className="bezent-convsettings-grid-2col">
              <Select
                id="conv-mode-select"
                label="Conversion Mode"
                value={conversionMode}
                onChange={(e) => {
                  const nextMode = e.target.value as ConversionMode;
                  setConversionMode(nextMode);
                  if (nextMode === 'manual') setDefaultMode('manual');
                  if (nextMode === 'automatic') setDefaultMode('automatic');
                }}
                options={[
                  { value: 'both', label: 'Both (Manual & Optional Automatic)' },
                  { value: 'manual', label: 'Manual Only (HR Initiated)' },
                  { value: 'automatic', label: 'Automatic Only (Pipeline Triggered)' },
                ]}
              />

              {conversionMode === 'both' ? (
                <Select
                  id="conv-default-mode-select"
                  label="Default Mode"
                  value={defaultMode}
                  onChange={(e) => setDefaultMode(e.target.value as DefaultConversionMode)}
                  options={[
                    { value: 'manual', label: 'Manual Conversion' },
                    { value: 'automatic', label: 'Automatic on Stage Completion' },
                  ]}
                />
              ) : (
                <div className="bezent-convsettings-locked-col">
                  <div className="bezent-convsettings-locked-label">Default Mode</div>
                  <div className="bezent-convsettings-locked-card">
                    <BezentIcon name="settings" size={14} color="#64748b" />
                    <span>
                      Locked to{' '}
                      <strong>{conversionMode === 'manual' ? 'Manual' : 'Automatic'}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bezent-convsettings-full-row">
              <Select
                id="conv-trigger-stage-select"
                label="Conversion Trigger Stage"
                value={conversionTriggerStage}
                onChange={(e) => setConversionTriggerStage(e.target.value)}
                options={availableStages.map((s) => ({
                  value: s.key,
                  label: s.name,
                }))}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Employee Profile & Date Defaults */}
        <div className="bezent-convsettings-card">
          <div className="bezent-convsettings-card-header">
            <div className="bezent-convsettings-icon-badge bezent-convsettings-icon-badge--teal">
              <BezentIcon name="employees" size={16} />
            </div>
            <h4 className="bezent-convsettings-card-title">Employee Profile & Joining Defaults</h4>
          </div>

          <div className="bezent-convsettings-card-body">
            <div className="bezent-convsettings-grid-2col">
              <Select
                id="conv-status-select"
                label="Initial Employee Status"
                value={defaultEmploymentStatus}
                onChange={(e) =>
                  setDefaultEmploymentStatus(e.target.value as DefaultEmploymentStatus)
                }
                options={[
                  { value: 'probation', label: 'Probation' },
                  { value: 'active', label: 'Active (Confirmed)' },
                ]}
              />

              <Select
                id="conv-date-type-select"
                label="Effective Joining Date"
                value={effectiveDateType}
                onChange={(e) => setEffectiveDateType(e.target.value as EffectiveDateType)}
                options={[
                  { value: 'joining_date', label: 'Candidate Offer Joining Date' },
                  { value: 'custom_date', label: 'Custom Date Specified at Conversion' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Governance & Override Controls */}
        <div className="bezent-convsettings-toggle-card">
          <div className="bezent-convsettings-toggle-icon">
            <BezentIcon name="security" size={18} />
          </div>
          <div className="bezent-convsettings-toggle-info">
            <div className="bezent-convsettings-toggle-header">
              <span className="bezent-convsettings-toggle-title">Governance & Early Override</span>
              <span
                className={`bezent-convsettings-status-pill ${
                  allowHrOverride
                    ? 'bezent-convsettings-status-pill--active'
                    : 'bezent-convsettings-status-pill--strict'
                }`}
              >
                {allowHrOverride ? 'Override Enabled' : 'Stage Gated'}
              </span>
            </div>
            <Switch
              id="conv-allow-hr-override"
              label="Allow HR Override"
              checked={allowHrOverride}
              onChange={(e) => setAllowHrOverride(e.target.checked)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
