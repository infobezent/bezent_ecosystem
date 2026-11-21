import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
  Switch,
  FormField,
  Inline,
  Alert,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { ResolvedForm, ConditionalRule, FieldPermissionRule } from '../../api/formsApi';

interface FormPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ResolvedForm;
  initialMode?: 'candidate' | 'hr';
}

export function FormPreviewModal({
  isOpen,
  onClose,
  form,
  initialMode = 'candidate',
}: FormPreviewModalProps) {
  const [mode, setMode] = useState<'candidate' | 'hr'>(initialMode);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationSuccess, setValidationSuccess] = useState(false);

  const rules = (form.form.metadata?.fieldRules as Record<string, ConditionalRule[]>) || {};

  const permissions =
    (form.form.metadata?.fieldPermissions as Record<string, FieldPermissionRule>) || {};

  const handleInputChange = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const isFieldVisible = (fieldKey: string): boolean => {
    const perm = permissions[fieldKey];
    if (mode === 'candidate' && perm?.visibility === 'hr_only') {
      return false;
    }

    const fieldRules = rules[fieldKey] || [];
    for (const rule of fieldRules) {
      const triggerVal = answers[rule.targetFieldKey];
      let matched = false;
      if (rule.operator === 'equals') matched = triggerVal === rule.value;
      else if (rule.operator === 'not_equals') matched = triggerVal !== rule.value;
      else if (rule.operator === 'is_empty')
        matched = triggerVal === undefined || triggerVal === null || triggerVal === '';
      else if (rule.operator === 'is_not_empty')
        matched = triggerVal !== undefined && triggerVal !== null && triggerVal !== '';

      if (rule.action === 'hide' && matched) return false;
      if (rule.action === 'show' && !matched) return false;
    }

    return true;
  };

  const handleRunValidation = () => {
    const errs: Record<string, string> = {};

    form.sections.forEach((sec) => {
      if (sec.visible === false) return;
      sec.fields.forEach((f) => {
        if (!f.enabled) return;
        if (!isFieldVisible(f.key)) return;

        const val = answers[f.key];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === 'string' && val.trim() === '') ||
          (Array.isArray(val) && val.length === 0);

        if (f.required && isEmpty) {
          errs[f.key] = `${f.label} is required`;
        } else if (!isEmpty) {
          if (f.type === 'email' && typeof val === 'string') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
              errs[f.key] = 'Invalid email address format';
            }
          } else if (f.type === 'phone' && typeof val === 'string') {
            if (!/^\d{7,15}$/.test(val.replace(/[\s\-()+]/g, ''))) {
              errs[f.key] = 'Invalid phone number (must be 7-15 digits)';
            }
          }
        }
      });
    });

    setErrors(errs);
    setValidationSuccess(Object.keys(errs).length === 0);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${form.form.name} Preview`}
      size="lg"
      footer={
        <Inline justify="between" align="center">
          <Button variant="secondary" onClick={handleRunValidation}>
            Test Validation
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close Preview
          </Button>
        </Inline>
      }
    >
      <div className="bezent-cif-preview-mode-switch">
        <button
          type="button"
          className={`bezent-cif-preview-mode-btn ${mode === 'candidate' ? 'bezent-cif-preview-mode-btn--active' : ''}`}
          onClick={() => setMode('candidate')}
        >
          <Inline gap="xs" align="center" justify="center">
            <BezentIcon name="user" size={14} />
            <span>Candidate Preview (Public Experience)</span>
          </Inline>
        </button>
        <button
          type="button"
          className={`bezent-cif-preview-mode-btn ${mode === 'hr' ? 'bezent-cif-preview-mode-btn--active' : ''}`}
          onClick={() => setMode('hr')}
        >
          <Inline gap="xs" align="center" justify="center">
            <BezentIcon name="settings" size={14} />
            <span>HR Preview (Internal Entry Experience)</span>
          </Inline>
        </button>
      </div>

      {mode === 'candidate' ? (
        <Alert variant="info" title="Candidate Self-Service View">
          Simulating the candidate&apos;s secure registration interface. Employment fields are
          read-only; internal HR fields are hidden.
        </Alert>
      ) : (
        <Alert variant="info" title="HR Internal Entry View">
          Simulating HR administrative manual intake. All organizational, employment, and note
          fields are active.
        </Alert>
      )}

      {validationSuccess && (
        <Alert variant="success" title="Validation Passed">
          All required fields and type-specific rules are satisfied cleanly.
        </Alert>
      )}

      <div className="bezent-cif-preview-container">
        {form.sections.map((section) => {
          if (section.visible === false) return null;
          const visibleFields = section.fields.filter((f) => f.enabled && isFieldVisible(f.key));
          if (visibleFields.length === 0) return null;

          return (
            <div key={section.key} className="bezent-cif-preview-section">
              <h4 className="bezent-cif-preview-section__title">{section.label}</h4>
              <div className="bezent-cif-preview-grid">
                {visibleFields.map((field) => {
                  const perm = permissions[field.key];
                  const isReadOnly =
                    mode === 'candidate' &&
                    (perm?.readOnly ||
                      perm?.candidateEditable === false ||
                      field.key.startsWith('employment.'));

                  const fieldError = errors[field.key];

                  return (
                    <div
                      key={field.key}
                      className={
                        field.width === 'full'
                          ? 'bezent-cif-preview-field--full'
                          : 'bezent-cif-preview-field--half'
                      }
                    >
                      {field.type === 'checkbox' ? (
                        <Inline justify="between" align="center">
                          <div>
                            <span className="bezent-cif-toggle-item__label">{field.label}</span>
                            {field.description && (
                              <div className="bezent-cif-toggle-item__hint">
                                {field.description}
                              </div>
                            )}
                          </div>
                          <Switch
                            checked={Boolean(answers[field.key])}
                            onChange={(e) => handleInputChange(field.key, e.target.checked)}
                            disabled={isReadOnly}
                            aria-label={field.label}
                          />
                        </Inline>
                      ) : field.type === 'dropdown' || field.type === 'radio' ? (
                        <FormField
                          label={field.label}
                          required={field.required}
                          error={fieldError}
                          helperText={field.description || undefined}
                        >
                          <Select
                            value={answers[field.key] || ''}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            disabled={isReadOnly}
                            options={[
                              { value: '', label: `-- Select ${field.label} --` },
                              ...(field.config?.options || []).map((o) => ({
                                value: o.value,
                                label: o.label,
                              })),
                            ]}
                          />
                        </FormField>
                      ) : (
                        <FormField
                          label={field.label}
                          required={field.required}
                          error={fieldError}
                          helperText={
                            isReadOnly
                              ? 'HR Controlled — Read Only'
                              : field.description || undefined
                          }
                        >
                          <Input
                            type={
                              field.type === 'email'
                                ? 'email'
                                : field.type === 'date'
                                  ? 'date'
                                  : 'text'
                            }
                            value={answers[field.key] || ''}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            placeholder={field.config?.placeholder || `Enter ${field.label}`}
                            disabled={isReadOnly}
                          />
                        </FormField>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
