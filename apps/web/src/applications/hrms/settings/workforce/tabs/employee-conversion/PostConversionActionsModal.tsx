import React, { useState } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type { PostConversionActionsConfig } from '../../../types/employeeConversion.types';

interface PostConversionActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialActions: PostConversionActionsConfig;
  onSave: (actions: PostConversionActionsConfig) => Promise<void>;
}

export function PostConversionActionsModal({
  isOpen,
  onClose,
  initialActions,
  onSave,
}: PostConversionActionsModalProps) {
  const [createEmployeeProfile] = useState<boolean>(true); // Mandatory
  const [applyChecklistTemplates, setApplyChecklistTemplates] = useState<boolean>(
    () => initialActions?.applyChecklistTemplates ?? true,
  );
  const [applyRequiredDocuments, setApplyRequiredDocuments] = useState<boolean>(
    () => initialActions?.applyRequiredDocuments ?? true,
  );
  const [enableEssAccess, setEnableEssAccess] = useState<boolean>(
    () => initialActions?.enableEssAccess ?? true,
  );
  const [sendNotifications, setSendNotifications] = useState<boolean>(
    () => initialActions?.sendNotifications ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave({
        createEmployeeProfile,
        applyChecklistTemplates,
        applyRequiredDocuments,
        enableEssAccess,
        sendNotifications,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post-conversion actions');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount =
    (createEmployeeProfile ? 1 : 0) +
    (applyChecklistTemplates ? 1 : 0) +
    (applyRequiredDocuments ? 1 : 0) +
    (enableEssAccess ? 1 : 0) +
    (sendNotifications ? 1 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Post-Conversion Actions"
      size="lg"
      className="bezent-postact-modal"
      footer={
        <div className="bezent-postact-modal-footer">
          <div className="bezent-postact-footer-summary">
            <span className="bezent-postact-footer-dot" />
            <span>{enabledCount} of 5 actions active</span>
          </div>

          <div className="bezent-postact-footer-actions">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="post-conversion-actions-form"
              loading={saving}
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : 'Save Actions'}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="post-conversion-actions-form"
        onSubmit={handleSubmit}
        className="bezent-postact-form"
      >
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="bezent-postact-list">
          {/* Action 1: Create Employee Profile */}
          <div className="bezent-postact-card bezent-postact-card--locked">
            <div className="bezent-postact-card-left">
              <div className="bezent-postact-icon bezent-postact-icon--blue">
                <BezentIcon name="employees" size={18} />
              </div>
              <div className="bezent-postact-content">
                <div className="bezent-postact-title-row">
                  <h4 className="bezent-postact-title">Create Employee Profile</h4>
                  <Badge variant="neutral" size="sm">
                    System Mandatory
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bezent-postact-toggle-wrap">
              <Switch
                label="Create Employee Profile"
                checked={createEmployeeProfile}
                disabled={true}
                onChange={() => {}}
                aria-label="Create Employee Profile"
              />
            </div>
          </div>

          {/* Action 2: Apply Checklist Templates */}
          <div className="bezent-postact-card">
            <div className="bezent-postact-card-left">
              <div className="bezent-postact-icon bezent-postact-icon--teal">
                <BezentIcon name="tasks" size={18} />
              </div>
              <div className="bezent-postact-content">
                <div className="bezent-postact-title-row">
                  <h4 className="bezent-postact-title">Apply Applicable Checklist Templates</h4>
                  {applyChecklistTemplates && (
                    <Badge variant="info" size="sm">
                      Automated
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-postact-toggle-wrap">
              <Switch
                label="Apply Applicable Checklist Templates"
                checked={applyChecklistTemplates}
                onChange={(e) => setApplyChecklistTemplates(e.target.checked)}
                aria-label="Apply Applicable Checklist Templates"
              />
            </div>
          </div>

          {/* Action 3: Apply Required Documents */}
          <div className="bezent-postact-card">
            <div className="bezent-postact-card-left">
              <div className="bezent-postact-icon bezent-postact-icon--amber">
                <BezentIcon name="documents" size={18} />
              </div>
              <div className="bezent-postact-content">
                <div className="bezent-postact-title-row">
                  <h4 className="bezent-postact-title">Apply Applicable Required Documents</h4>
                  {applyRequiredDocuments && (
                    <Badge variant="warning" size="sm">
                      Compliance
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-postact-toggle-wrap">
              <Switch
                label="Apply Applicable Required Documents"
                checked={applyRequiredDocuments}
                onChange={(e) => setApplyRequiredDocuments(e.target.checked)}
                aria-label="Apply Applicable Required Documents"
              />
            </div>
          </div>

          {/* Action 4: Enable ESS Access */}
          <div className="bezent-postact-card">
            <div className="bezent-postact-card-left">
              <div className="bezent-postact-icon bezent-postact-icon--purple">
                <BezentIcon name="security" size={18} />
              </div>
              <div className="bezent-postact-content">
                <div className="bezent-postact-title-row">
                  <h4 className="bezent-postact-title">Enable Employee Self-Service (ESS) Access</h4>
                  {enableEssAccess && (
                    <Badge variant="info" size="sm">
                      Self-Service
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-postact-toggle-wrap">
              <Switch
                label="Enable Employee Self-Service (ESS) Access"
                checked={enableEssAccess}
                onChange={(e) => setEnableEssAccess(e.target.checked)}
                aria-label="Enable Employee Self-Service (ESS) Access"
              />
            </div>
          </div>

          {/* Action 5: Welcome Notifications */}
          <div className="bezent-postact-card">
            <div className="bezent-postact-card-left">
              <div className="bezent-postact-icon bezent-postact-icon--cyan">
                <BezentIcon name="notifications" size={18} />
              </div>
              <div className="bezent-postact-content">
                <div className="bezent-postact-title-row">
                  <h4 className="bezent-postact-title">Send Configured Welcome Notifications</h4>
                  {sendNotifications && (
                    <Badge variant="info" size="sm">
                      Email Trigger
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-postact-toggle-wrap">
              <Switch
                label="Send Configured Welcome Notifications"
                checked={sendNotifications}
                onChange={(e) => setSendNotifications(e.target.checked)}
                aria-label="Send Configured Welcome Notifications"
              />
            </div>
          </div>
        </div>

        {/* Idempotent Guarantee Callout Banner */}
        <div className="bezent-postact-guarantee-card">
          <div className="bezent-postact-guarantee-icon">
            <BezentIcon name="security" size={16} />
          </div>
          <span className="bezent-postact-guarantee-text">
            <strong>Idempotent Guarantee:</strong> Secondary actions are failure-isolated and can be safely retried.
          </span>
        </div>
      </form>
    </Modal>
  );
}
