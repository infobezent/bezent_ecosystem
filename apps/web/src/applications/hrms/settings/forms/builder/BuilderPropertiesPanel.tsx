import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  FormField,
  Input,
  Select,
  Stack,
  Switch,
  Textarea,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type {
  ResolvedFormSection,
  ResolvedFormField,
  FormFieldOption,
  CandidateIntakeConfig,
  ConditionalRule,
  FieldPermissionRule,
  FieldValidationRule,
} from '../../api/formsApi';

export interface BuilderPropertiesPanelProps {
  selectedField: ResolvedFormField | null;
  selectedSection: ResolvedFormSection | null;
  allSections: ResolvedFormSection[];
  formConfig: CandidateIntakeConfig;
  fieldRules?: ConditionalRule[];
  fieldPermission?: FieldPermissionRule;
  fieldValidation?: FieldValidationRule;
  onUpdateFormConfig: (newConfig: Partial<CandidateIntakeConfig>) => void;
  onUpdateSection: (sectionKey: string, updates: Partial<ResolvedFormSection>) => void;
  onUpdateField: (fieldKey: string, updates: Partial<ResolvedFormField>) => void;
  onUpdateFieldRules: (fieldKey: string, rules: ConditionalRule[]) => void;
  onUpdateFieldPermission: (fieldKey: string, perm: FieldPermissionRule) => void;
  onUpdateFieldValidation: (fieldKey: string, val: FieldValidationRule) => void;
  onDeselect: () => void;
}

export function BuilderPropertiesPanel({
  selectedField,
  selectedSection,
  allSections,
  formConfig,
  fieldRules = [],
  fieldPermission,
  fieldValidation,
  onUpdateFormConfig,
  onUpdateSection,
  onUpdateField,
  onUpdateFieldRules,
  onUpdateFieldPermission,
  onUpdateFieldValidation,
  onDeselect,
}: BuilderPropertiesPanelProps) {
  const [panelTab, setPanelTab] = useState<'form' | 'field'>(
    selectedField || selectedSection ? 'field' : 'form',
  );
  const [activeTab, setActiveTab] = useState<'general' | 'validation' | 'permissions' | 'rules'>(
    'general',
  );
  const [newOptionInput, setNewOptionInput] = useState('');

  useEffect(() => {
    if (selectedField || selectedSection) {
      setPanelTab('field');
    }
  }, [selectedField, selectedSection]);

  // Extract all other fields in the form for conditional logic targeting
  const otherFields = useMemo(() => {
    if (!selectedField) return [];
    const result: { key: string; label: string }[] = [];
    for (const sec of allSections) {
      for (const f of sec.fields) {
        if (f.key !== selectedField.key) {
          result.push({ key: f.key, label: `${f.label} (${sec.label})` });
        }
      }
    }
    return result;
  }, [allSections, selectedField]);

  // Handle Add Option to choice fields
  const handleAddOption = () => {
    if (!selectedField || !newOptionInput.trim()) return;
    const existingOptions: FormFieldOption[] = selectedField.config?.options || [];
    const trimmed = newOptionInput.trim();
    if (!existingOptions.some((o) => o.value === trimmed)) {
      const updated: FormFieldOption[] = [...existingOptions, { value: trimmed, label: trimmed }];
      onUpdateField(selectedField.key, {
        config: { ...selectedField.config, options: updated },
      });
    }
    setNewOptionInput('');
  };

  // Handle Remove Option
  const handleRemoveOption = (valToRemove: string) => {
    if (!selectedField) return;
    const existingOptions: FormFieldOption[] = selectedField.config?.options || [];
    const updated = existingOptions.filter((o) => o.value !== valToRemove);
    onUpdateField(selectedField.key, {
      config: { ...selectedField.config, options: updated },
    });
  };

  // Case 1: Form Properties (explicitly chosen tab)
  if (panelTab === 'form' && !selectedField && !selectedSection) {
    // Falls through to bottom return
  }

  // Case 2: Field Properties Inspector
  if (selectedField && panelTab === 'field') {
    const isChoiceType = ['dropdown', 'radio', 'checkbox'].includes(selectedField.type);
    const isUploadType = ['file_upload', 'image_upload'].includes(selectedField.type);
    const isDateType = selectedField.type === 'date';
    const isTextType = ['single_line', 'multi_line', 'email', 'phone'].includes(selectedField.type);
    const isSelectLikeType = ['dropdown', 'radio', 'select'].includes(selectedField.type);
    const isBooleanDefaultType = ['checkbox', 'toggle_switch'].includes(selectedField.type);
    // System fields render through their own dedicated components and master-data sources
    // (see e.g. GeneralInformation.tsx); the backend rejects any `config` on them to keep
    // that single source of truth, so these controls only apply to fields added in the builder.
    const isConfigEditable = selectedField.origin === 'custom';
    const defaultValueInputType =
      selectedField.type === 'email'
        ? 'email'
        : selectedField.type === 'phone'
          ? 'tel'
          : selectedField.type === 'website'
            ? 'url'
            : selectedField.type === 'date'
              ? 'date'
              : selectedField.type === 'time'
                ? 'time'
                : selectedField.type === 'datetime'
                  ? 'datetime-local'
                  : ['number', 'decimal', 'rating', 'slider'].includes(selectedField.type)
                    ? 'number'
                    : 'text';

    const perm: FieldPermissionRule = fieldPermission || {
      visibility: 'both',
      hrEditable: true,
      candidateEditable:
        selectedField.origin !== 'system' || !selectedField.key.startsWith('employment.'),
      readOnly: selectedField.key.startsWith('employment.'),
    };

    const val: FieldValidationRule = fieldValidation || {
      minLength: undefined,
      maxLength: undefined,
    };

    const currentRule: ConditionalRule = fieldRules[0] || {
      targetFieldKey: otherFields[0]?.key || '',
      operator: 'equals',
      value: true,
      action: 'hide',
    };

    const currentDateRestriction = selectedField.config?.disallowPast
      ? 'future_only'
      : selectedField.config?.disallowFuture
        ? 'past_only'
        : 'none';

    return (
      <aside className="bezent-cif-properties" aria-label="Field Properties Inspector">
        <div className="bezent-cif-properties__segmented-tabs">
          <button
            type="button"
            className="bezent-cif-properties__segmented-tab"
            onClick={() => setPanelTab('form')}
          >
            Form Properties
          </button>
          <button
            type="button"
            className="bezent-cif-properties__segmented-tab bezent-cif-properties__segmented-tab--active"
            onClick={() => setPanelTab('field')}
          >
            Field Properties
          </button>
        </div>

        <div className="bezent-cif-properties__header">
          <div className="bezent-cif-properties__title-wrap">
            <span className="bezent-cif-properties__subtitle">Field Inspector</span>
            <h3 className="bezent-cif-properties__title">{selectedField.label}</h3>
          </div>
          <button
            type="button"
            className="bezent-cif-properties__close"
            onClick={onDeselect}
            aria-label="Close inspector"
          >
            <BezentIcon name="close" size={14} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bezent-cif-properties__tabs">
          <button
            type="button"
            className={`bezent-cif-properties__tab ${activeTab === 'general' ? 'bezent-cif-properties__tab--active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            type="button"
            className={`bezent-cif-properties__tab ${activeTab === 'validation' ? 'bezent-cif-properties__tab--active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            Validation
          </button>
          <button
            type="button"
            className={`bezent-cif-properties__tab ${activeTab === 'permissions' ? 'bezent-cif-properties__tab--active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
          <button
            type="button"
            className={`bezent-cif-properties__tab ${activeTab === 'rules' ? 'bezent-cif-properties__tab--active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            Logic
          </button>
        </div>

        {/* Tab Content */}
        <div className="bezent-cif-properties__content">
          {activeTab === 'general' && (
            <Stack gap="md">
              {selectedField.protected && (
                <div className="bezent-cif-property-toggle-label">
                  <strong>Protected System Field</strong>
                  <span>{selectedField.protectedReason || 'Required by the employee record.'}</span>
                </div>
              )}

              <FormField label="Field Label" required>
                <Input
                  type="text"
                  value={selectedField.label}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdateField(selectedField.key, { label: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Internal Key (Unique)">
                <Input
                  type="text"
                  value={selectedField.key}
                  disabled={selectedField.origin === 'system'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdateField(selectedField.key, { key: e.target.value })
                  }
                />
              </FormField>

              {isConfigEditable && (
                <FormField label="Placeholder">
                  <Input
                    type="text"
                    value={(selectedField.config?.placeholder as string) || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateField(selectedField.key, {
                        config: { ...selectedField.config, placeholder: e.target.value },
                      })
                    }
                  />
                </FormField>
              )}

              <FormField label="Helper Text">
                <Input
                  type="text"
                  value={selectedField.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdateField(selectedField.key, { description: e.target.value || null })
                  }
                />
              </FormField>

              {!isConfigEditable && (
                <div className="bezent-cif-property-toggle-label">
                  <span>
                    Default value and read-only come from this system field&apos;s own source
                    (master data or business rules) and aren&apos;t editable here.
                  </span>
                </div>
              )}

              {!isConfigEditable ? null : isSelectLikeType ? (
                <FormField label="Default Value">
                  <Select
                    value={(selectedField.config?.defaultValue as string) || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      onUpdateField(selectedField.key, {
                        config: { ...selectedField.config, defaultValue: e.target.value },
                      })
                    }
                    options={[
                      { value: '', label: 'None' },
                      ...((selectedField.config?.options as FormFieldOption[]) || []).map(
                        (opt) => ({ value: opt.value, label: opt.label }),
                      ),
                    ]}
                  />
                </FormField>
              ) : isBooleanDefaultType ? (
                <div className="bezent-cif-property-toggle-row">
                  <div className="bezent-cif-property-toggle-label">
                    <strong>Default Value</strong>
                    <span>Initial state when the form opens</span>
                  </div>
                  <Switch
                    checked={selectedField.config?.defaultValue === 'true'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateField(selectedField.key, {
                        config: {
                          ...selectedField.config,
                          defaultValue: e.target.checked ? 'true' : 'false',
                        },
                      })
                    }
                  />
                </div>
              ) : (
                <FormField label="Default Value">
                  <Input
                    type={defaultValueInputType}
                    value={selectedField.config?.defaultValue || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateField(selectedField.key, {
                        config: { ...selectedField.config, defaultValue: e.target.value },
                      })
                    }
                  />
                </FormField>
              )}

              <FormField label="Field Width">
                <Select
                  value={selectedField.width || 'full'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    onUpdateField(selectedField.key, {
                      width: e.target.value as 'full' | 'half',
                    })
                  }
                  options={[
                    { value: 'full', label: 'Full Width (100%)' },
                    { value: 'half', label: 'Half Width (50%)' },
                  ]}
                />
              </FormField>

              {isConfigEditable && !selectedField.protected && (
                <div className="bezent-cif-property-toggle-row">
                  <div className="bezent-cif-property-toggle-label">
                    <strong>Read-only</strong>
                    <span>Prevents editing for everyone filling this form</span>
                  </div>
                  <Switch
                    checked={Boolean(selectedField.config?.readOnly)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateField(selectedField.key, {
                        config: { ...selectedField.config, readOnly: e.target.checked },
                      })
                    }
                  />
                </div>
              )}
            </Stack>
          )}

          {activeTab === 'validation' && (
            <Stack gap="md">
              <div className="bezent-cif-property-toggle-row">
                <div className="bezent-cif-property-toggle-label">
                  <strong>Required Field</strong>
                  <span>
                    {selectedField.protected
                      ? `🔒 Protected: ${selectedField.protectedReason || 'required by the employee record.'}`
                      : 'Mandatory for form submission'}
                  </span>
                </div>
                <Switch
                  checked={selectedField.protected ? true : selectedField.required}
                  disabled={selectedField.protected}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdateField(selectedField.key, { required: e.target.checked })
                  }
                />
              </div>

              {isTextType && (
                <>
                  <FormField label="Minimum Length (Characters)">
                    <Input
                      type="number"
                      value={val.minLength?.toString() || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onUpdateFieldValidation(selectedField.key, {
                          ...val,
                          minLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Maximum Length (Characters)">
                    <Input
                      type="number"
                      value={val.maxLength?.toString() || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onUpdateFieldValidation(selectedField.key, {
                          ...val,
                          maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                    />
                  </FormField>
                </>
              )}

              {isChoiceType && (
                <div className="bezent-cif-property-options-group">
                  <label className="bezent-cif-property-options-title">Allowed Options</label>
                  <div className="bezent-cif-property-options-list">
                    {((selectedField.config?.options as FormFieldOption[]) || []).map((opt) => (
                      <span key={opt.value} className="bezent-cif-property-option-chip">
                        {opt.label}
                        {isConfigEditable && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.value)}
                            aria-label={`Remove option ${opt.label}`}
                          >
                            <BezentIcon name="close" size={10} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {isConfigEditable ? (
                    <div className="bezent-cif-property-add-option-row">
                      <Input
                        type="text"
                        placeholder="Add choice option..."
                        value={newOptionInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewOptionInput(e.target.value)
                        }
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <Button variant="secondary" size="sm" type="button" onClick={handleAddOption}>
                        Add
                      </Button>
                    </div>
                  ) : (
                    <span className="bezent-cif-properties__hint">
                      Sourced from Workforce Settings / master data — not editable here.
                    </span>
                  )}
                </div>
              )}

              {isUploadType && (
                <FormField label="Maximum File Size (MB)">
                  <Input
                    type="number"
                    value={(selectedField.config?.maxSizeMb as number)?.toString() || '10'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateField(selectedField.key, {
                        config: {
                          ...selectedField.config,
                          maxSizeMb: parseInt(e.target.value, 10) || 10,
                        },
                      })
                    }
                  />
                </FormField>
              )}

              {isDateType && (
                <FormField label="Date Restrictions">
                  <Select
                    value={currentDateRestriction}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const mode = e.target.value;
                      onUpdateField(selectedField.key, {
                        config: {
                          ...selectedField.config,
                          disallowPast: mode === 'future_only',
                          disallowFuture: mode === 'past_only',
                        },
                      });
                    }}
                    options={[
                      { value: 'none', label: 'No date restriction' },
                      { value: 'past_only', label: 'Past dates only (e.g. Birth Date)' },
                      { value: 'future_only', label: 'Future dates only (e.g. Joining Date)' },
                    ]}
                  />
                </FormField>
              )}
            </Stack>
          )}

          {activeTab === 'permissions' && (
            <Stack gap="md">
              <div className="bezent-cif-property-toggle-row">
                <div className="bezent-cif-property-toggle-label">
                  <strong>HR Editable</strong>
                  <span>Allow HR to enter and update this field</span>
                </div>
                <Switch
                  checked={perm.hrEditable}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdateFieldPermission(selectedField.key, {
                      ...perm,
                      hrEditable: e.target.checked,
                    })
                  }
                />
              </div>

              <div className="bezent-cif-property-toggle-row">
                <div className="bezent-cif-property-toggle-label">
                  <strong>Candidate Editable</strong>
                  <span>Candidate can enter value during self-service</span>
                </div>
                <Switch
                  checked={perm.candidateEditable && !perm.readOnly}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdateFieldPermission(selectedField.key, {
                      ...perm,
                      candidateEditable: e.target.checked,
                      readOnly: !e.target.checked,
                    })
                  }
                />
              </div>

              <div className="bezent-cif-property-toggle-row">
                <div className="bezent-cif-property-toggle-label">
                  <strong>Candidate Read-Only</strong>
                  <span>Candidate can view value but cannot edit</span>
                </div>
                <Switch
                  checked={perm.readOnly}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdateFieldPermission(selectedField.key, {
                      ...perm,
                      readOnly: e.target.checked,
                      candidateEditable: !e.target.checked,
                    })
                  }
                />
              </div>

              {selectedField.key.startsWith('employment.') && (
                <div className="bezent-cif-property-notice">
                  <BezentIcon name="security" size={14} />
                  <span>
                    Employment details are governed by HR controls and cannot be altered by
                    candidates.
                  </span>
                </div>
              )}
            </Stack>
          )}

          {activeTab === 'rules' && (
            <Stack gap="md">
              <p className="bezent-cif-property-hint">
                Configure conditional visibility based on candidate answers to other fields.
              </p>

              <div className="bezent-cif-property-toggle-row">
                <div className="bezent-cif-property-toggle-label">
                  <strong>Conditional Rule Active</strong>
                  <span>Enable or disable rules for this field</span>
                </div>
                <Switch
                  checked={fieldRules.length > 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const checked = e.target.checked;
                    if (checked) {
                      onUpdateFieldRules(selectedField.key, [
                        {
                          targetFieldKey: otherFields[0]?.key || 'address.sameAsCurrent',
                          operator: 'equals',
                          value: true,
                          action: 'hide',
                        },
                      ]);
                    } else {
                      onUpdateFieldRules(selectedField.key, []);
                    }
                  }}
                />
              </div>

              {fieldRules.length > 0 && (
                <div className="bezent-cif-property-rule-box">
                  <FormField label="When Trigger Field">
                    <Select
                      value={currentRule.targetFieldKey}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        onUpdateFieldRules(selectedField.key, [
                          { ...currentRule, targetFieldKey: e.target.value },
                        ])
                      }
                      options={otherFields.map((f) => ({ value: f.key, label: f.label }))}
                    />
                  </FormField>

                  <FormField label="Operator">
                    <Select
                      value={currentRule.operator}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        onUpdateFieldRules(selectedField.key, [
                          {
                            ...currentRule,
                            operator: e.target.value as
                              'equals' | 'not_equals' | 'is_empty' | 'is_not_empty',
                          },
                        ])
                      }
                      options={[
                        { value: 'equals', label: 'Equals' },
                        { value: 'not_equals', label: 'Does not equal' },
                        { value: 'is_empty', label: 'Is empty' },
                        { value: 'is_not_empty', label: 'Is not empty' },
                      ]}
                    />
                  </FormField>

                  {(currentRule.operator === 'equals' || currentRule.operator === 'not_equals') && (
                    <FormField label="Expected Value">
                      <Input
                        type="text"
                        value={String(currentRule.value ?? 'true')}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const raw = e.target.value;
                          const parsed = raw === 'true' ? true : raw === 'false' ? false : raw;
                          onUpdateFieldRules(selectedField.key, [
                            { ...currentRule, value: parsed },
                          ]);
                        }}
                      />
                    </FormField>
                  )}

                  <FormField label="Action">
                    <Select
                      value={currentRule.action}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        onUpdateFieldRules(selectedField.key, [
                          { ...currentRule, action: e.target.value as 'show' | 'hide' },
                        ])
                      }
                      options={[
                        { value: 'hide', label: 'Hide This Field' },
                        { value: 'show', label: 'Show This Field' },
                      ]}
                    />
                  </FormField>
                </div>
              )}
            </Stack>
          )}
        </div>
      </aside>
    );
  }

  // Case 2: Section Properties Inspector
  if (selectedSection && panelTab === 'field') {
    return (
      <aside className="bezent-cif-properties" aria-label="Section Properties Inspector">
        <div className="bezent-cif-properties__segmented-tabs">
          <button
            type="button"
            className="bezent-cif-properties__segmented-tab"
            onClick={() => setPanelTab('form')}
          >
            Form Properties
          </button>
          <button
            type="button"
            className="bezent-cif-properties__segmented-tab bezent-cif-properties__segmented-tab--active"
            onClick={() => setPanelTab('field')}
          >
            Field Properties
          </button>
        </div>

        <div className="bezent-cif-properties__header">
          <div className="bezent-cif-properties__title-wrap">
            <span className="bezent-cif-properties__subtitle">Section Inspector</span>
            <h3 className="bezent-cif-properties__title">{selectedSection.label}</h3>
          </div>
          <button
            type="button"
            className="bezent-cif-properties__close"
            onClick={onDeselect}
            aria-label="Close inspector"
          >
            <BezentIcon name="close" size={14} />
          </button>
        </div>

        <div className="bezent-cif-properties__content">
          <Stack gap="md">
            <FormField label="Section Title" required>
              <Input
                type="text"
                value={selectedSection.label}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdateSection(selectedSection.key, { label: e.target.value })
                }
              />
            </FormField>

            <FormField label="Section Description">
              <Textarea
                rows={3}
                value={selectedSection.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  onUpdateSection(selectedSection.key, { description: e.target.value || null })
                }
              />
            </FormField>

            <div className="bezent-cif-property-toggle-row">
              <div className="bezent-cif-property-toggle-label">
                <strong>Visible in Form</strong>
                <span>Toggle section visibility</span>
              </div>
              <Switch
                checked={selectedSection.visible !== false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdateSection(selectedSection.key, { visible: e.target.checked })
                }
              />
            </div>
          </Stack>
        </div>
      </aside>
    );
  }

  // Case 3: Form Settings (Nothing Selected or Form tab active)
  return (
    <aside className="bezent-cif-properties" aria-label="Form Configuration">
      <div className="bezent-cif-properties__segmented-tabs">
        <button
          type="button"
          className="bezent-cif-properties__segmented-tab bezent-cif-properties__segmented-tab--active"
          onClick={() => setPanelTab('form')}
        >
          Form Properties
        </button>
        <button
          type="button"
          className="bezent-cif-properties__segmented-tab"
          onClick={() => setPanelTab('field')}
        >
          Field Properties
        </button>
      </div>

      <div className="bezent-cif-properties__header">
        <div className="bezent-cif-properties__title-wrap">
          <span className="bezent-cif-properties__subtitle">Global Configuration</span>
          <h3 className="bezent-cif-properties__title">Form Settings</h3>
        </div>
      </div>

      <div className="bezent-cif-properties__content">
        <Stack gap="sm">
          <FormField label="Form Name" required>
            <Input
              type="text"
              value={formConfig.formName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdateFormConfig({ formName: e.target.value })
              }
            />
          </FormField>

          <FormField label="Label name">
            <Input type="text" disabled value={formConfig.formName} />
          </FormField>

          <FormField label="Description">
            <Textarea
              rows={3}
              value={formConfig.formDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onUpdateFormConfig({ formDescription: e.target.value })
              }
            />
          </FormField>

          <div className="bezent-cif-prop-banner">Validation</div>

          <FormField label="Unique Identifiers">
            <Select
              value="emp_id"
              options={[
                { value: 'emp_id', label: 'Employee ID (Auto-number)' },
                { value: 'email', label: 'Email ID' },
                { value: 'aadhaar', label: 'Aadhaar / National ID' },
              ]}
              onChange={() => {}}
            />
          </FormField>

          <div className="bezent-cif-prop-banner">Custom validation</div>

          <div className="bezent-cif-property-toggle-row">
            <div className="bezent-cif-property-toggle-label">
              <strong>Enable custom validations</strong>
              <span>Apply script validation rules</span>
            </div>
            <Switch checked={false} onChange={() => {}} />
          </div>

          <div className="bezent-cif-prop-banner">Preferences</div>

          <div className="bezent-cif-property-toggle-row">
            <div className="bezent-cif-property-toggle-label">
              <strong>Password protection</strong>
              <span>Require security code on submission</span>
            </div>
            <Switch checked={false} onChange={() => {}} />
          </div>

          <div className="bezent-cif-property-toggle-row">
            <div className="bezent-cif-property-toggle-label">
              <strong>HR Manual Entry</strong>
              <span>Allow HR to enter candidate info directly</span>
            </div>
            <Switch
              checked={formConfig.hrManualEntryEnabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdateFormConfig({ hrManualEntryEnabled: e.target.checked })
              }
            />
          </div>

          <div className="bezent-cif-property-toggle-row">
            <div className="bezent-cif-property-toggle-label">
              <strong>Candidate Self-Service</strong>
              <span>Send secure registration links to candidates</span>
            </div>
            <Switch
              checked={formConfig.candidateSelfServiceEnabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdateFormConfig({ candidateSelfServiceEnabled: e.target.checked })
              }
            />
          </div>

          <div className="bezent-cif-property-toggle-row">
            <div className="bezent-cif-property-toggle-label">
              <strong>Allow Save as Draft</strong>
              <span>Let candidates resume incomplete submissions</span>
            </div>
            <Switch
              checked={formConfig.allowSaveDraft}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdateFormConfig({ allowSaveDraft: e.target.checked })
              }
            />
          </div>

          <div className="bezent-cif-property-toggle-row">
            <div className="bezent-cif-property-toggle-label">
              <strong>Post-Submission Editing</strong>
              <span>Allow candidate updates after form submit</span>
            </div>
            <Switch
              checked={formConfig.candidateEditingAfterSubmission}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdateFormConfig({ candidateEditingAfterSubmission: e.target.checked })
              }
            />
          </div>
        </Stack>
      </div>
    </aside>
  );
}

export default BuilderPropertiesPanel;
