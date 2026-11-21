import React, { useState } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type { ConversionRulesConfig } from '../../../types/employeeConversion.types';

interface ConversionRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRules: ConversionRulesConfig;
  onSave: (rules: ConversionRulesConfig) => Promise<void>;
}

const AVAILABLE_ROLES = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'company_admin', label: 'Company Admin' },
  { id: 'hr_manager', label: 'HR Manager' },
  { id: 'hr_executive', label: 'HR Executive' },
];

export function ConversionRulesModal({
  isOpen,
  onClose,
  initialRules,
  onSave,
}: ConversionRulesModalProps) {
  const [preventDuplicateEmployee, setPreventDuplicateEmployee] = useState<boolean>(
    () => initialRules?.preventDuplicateEmployee ?? true,
  );
  const [validateRequiredFields, setValidateRequiredFields] = useState<boolean>(
    () => initialRules?.validateRequiredFields ?? true,
  );
  const [preserveCandidateHistory, setPreserveCandidateHistory] = useState<boolean>(
    () => initialRules?.preserveCandidateHistory ?? true,
  );
  const [allowRetryFailedConversion, setAllowRetryFailedConversion] = useState<boolean>(
    () => initialRules?.allowRetryFailedConversion ?? true,
  );
  const [restrictedRoles, setRestrictedRoles] = useState<string[]>(() =>
    initialRules?.restrictedRoles
      ? [...initialRules.restrictedRoles]
      : ['super_admin', 'company_admin', 'hr_manager'],
  );
  const [recordAuditHistory, setRecordAuditHistory] = useState<boolean>(
    () => initialRules?.recordAuditHistory ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleRole = (roleId: string) => {
    setRestrictedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (restrictedRoles.length === 0) {
      setError('At least one authorized role must be permitted to perform conversion.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        preventDuplicateEmployee,
        validateRequiredFields,
        preserveCandidateHistory,
        allowRetryFailedConversion,
        restrictedRoles,
        recordAuditHistory,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversion rules');
    } finally {
      setSaving(false);
    }
  };

  const activeCount =
    (preventDuplicateEmployee ? 1 : 0) +
    (validateRequiredFields ? 1 : 0) +
    (preserveCandidateHistory ? 1 : 0) +
    (allowRetryFailedConversion ? 1 : 0) +
    (recordAuditHistory ? 1 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Conversion Rules & Safeguards"
      size="lg"
      className="bezent-convrule-modal"
      footer={
        <div className="bezent-convrule-modal-footer">
          <div className="bezent-convrule-footer-summary">
            <span className="bezent-convrule-footer-dot" />
            <span>
              {activeCount} of 5 safeguards active • {restrictedRoles.length} roles authorized
            </span>
          </div>

          <div className="bezent-convrule-footer-actions">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="conversion-rules-form"
              loading={saving}
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : 'Save Rules'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="conversion-rules-form" onSubmit={handleSubmit} className="bezent-convrule-form">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="bezent-convrule-list">
          {/* Rule 1: Prevent Duplicate Employee Creation */}
          <div className="bezent-convrule-card">
            <div className="bezent-convrule-card-left">
              <div className="bezent-convrule-icon bezent-convrule-icon--blue">
                <BezentIcon name="security" size={18} />
              </div>
              <div className="bezent-convrule-content">
                <div className="bezent-convrule-title-row">
                  <h4 className="bezent-convrule-title">Prevent Duplicate Employee Creation</h4>
                  {preventDuplicateEmployee && (
                    <Badge variant="info" size="sm">
                      Deduplication
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-convrule-toggle-wrap">
              <Switch
                label="Prevent Duplicate Employee Creation"
                checked={preventDuplicateEmployee}
                onChange={(e) => setPreventDuplicateEmployee(e.target.checked)}
                aria-label="Prevent Duplicate Employee Creation"
              />
            </div>
          </div>

          {/* Rule 2: Validate Required Fields Before Conversion */}
          <div className="bezent-convrule-card">
            <div className="bezent-convrule-card-left">
              <div className="bezent-convrule-icon bezent-convrule-icon--teal">
                <BezentIcon name="documents" size={18} />
              </div>
              <div className="bezent-convrule-content">
                <div className="bezent-convrule-title-row">
                  <h4 className="bezent-convrule-title">
                    Validate Required Fields Before Conversion
                  </h4>
                  {validateRequiredFields && (
                    <Badge variant="warning" size="sm">
                      Gatekeeper
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-convrule-toggle-wrap">
              <Switch
                label="Validate Required Fields Before Conversion"
                checked={validateRequiredFields}
                onChange={(e) => setValidateRequiredFields(e.target.checked)}
                aria-label="Validate Required Fields Before Conversion"
              />
            </div>
          </div>

          {/* Rule 3: Preserve Candidate & Onboarding History */}
          <div className="bezent-convrule-card">
            <div className="bezent-convrule-card-left">
              <div className="bezent-convrule-icon bezent-convrule-icon--purple">
                <BezentIcon name="organization" size={18} />
              </div>
              <div className="bezent-convrule-content">
                <div className="bezent-convrule-title-row">
                  <h4 className="bezent-convrule-title">Preserve Candidate & Onboarding History</h4>
                  {preserveCandidateHistory && (
                    <Badge variant="info" size="sm">
                      Audit Trail
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-convrule-toggle-wrap">
              <Switch
                label="Preserve Candidate & Onboarding History"
                checked={preserveCandidateHistory}
                onChange={(e) => setPreserveCandidateHistory(e.target.checked)}
                aria-label="Preserve Candidate & Onboarding History"
              />
            </div>
          </div>

          {/* Rule 4: Allow Retry After Failed Conversion */}
          <div className="bezent-convrule-card">
            <div className="bezent-convrule-card-left">
              <div className="bezent-convrule-icon bezent-convrule-icon--amber">
                <BezentIcon name="settings" size={18} />
              </div>
              <div className="bezent-convrule-content">
                <div className="bezent-convrule-title-row">
                  <h4 className="bezent-convrule-title">Allow Retry After Failed Conversion</h4>
                  {allowRetryFailedConversion && (
                    <Badge variant="info" size="sm">
                      Idempotent
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-convrule-toggle-wrap">
              <Switch
                label="Allow Retry After Failed Conversion"
                checked={allowRetryFailedConversion}
                onChange={(e) => setAllowRetryFailedConversion(e.target.checked)}
                aria-label="Allow Retry After Failed Conversion"
              />
            </div>
          </div>

          {/* Rule 5: Record Conversion Activity & Audit Log */}
          <div className="bezent-convrule-card">
            <div className="bezent-convrule-card-left">
              <div className="bezent-convrule-icon bezent-convrule-icon--cyan">
                <BezentIcon name="operations" size={18} />
              </div>
              <div className="bezent-convrule-content">
                <div className="bezent-convrule-title-row">
                  <h4 className="bezent-convrule-title">Record Conversion Activity & Audit Log</h4>
                  {recordAuditHistory && (
                    <Badge variant="neutral" size="sm">
                      Immutable Log
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bezent-convrule-toggle-wrap">
              <Switch
                label="Record Conversion Activity & Audit Log"
                checked={recordAuditHistory}
                onChange={(e) => setRecordAuditHistory(e.target.checked)}
                aria-label="Record Conversion Activity & Audit Log"
              />
            </div>
          </div>
        </div>

        {/* Authorized Roles for Conversion Box */}
        <div className="bezent-convrule-roles-card">
          <span className="bezent-convrule-roles-title">Authorized Roles for Conversion</span>

          <div className="bezent-convrule-roles-pills">
            {AVAILABLE_ROLES.map((role) => {
              const isSelected = restrictedRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  className={`bezent-convrule-role-pill ${
                    isSelected ? 'bezent-convrule-role-pill--selected' : ''
                  }`}
                  onClick={() => handleToggleRole(role.id)}
                  aria-pressed={isSelected}
                >
                  {isSelected && <BezentIcon name="check" size={13} color="currentColor" />}
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
