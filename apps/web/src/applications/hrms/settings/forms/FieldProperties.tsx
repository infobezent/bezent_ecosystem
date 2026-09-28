import { useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  FormField,
  Inline,
  Input,
  Label,
  Pane,
  Select,
  Stack,
  Switch,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { FormFieldWidth, ResolvedFormField, ResolvedFormSection } from '../api/formsApi';
import { CanvasFieldControl } from './FormCanvas';

export interface FieldPropertiesProps {
  field: ResolvedFormField | null;
  form?: {
    name: string;
    key: string;
    version: number;
    kind: string;
  };
  activeSection?: ResolvedFormSection | null;
  onUpdateField: (updated: ResolvedFormField) => void;
  onDeleteField: (fieldKey: string) => void;
  onDeselectField?: () => void;
}

export function FieldProperties({
  field,
  form,
  activeSection,
  onUpdateField,
  onDeleteField,
}: FieldPropertiesProps) {
  // Tabs: 'form' | 'field'
  const [panelTab, setPanelTab] = useState<'form' | 'field'>(field ? 'field' : 'form');

  // Auto switch to 'field' when a field is selected
  useEffect(() => {
    if (field) {
      setPanelTab('field');
    }
  }, [field?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCustom = field?.origin === 'custom';
  const isProtected = field?.protected ?? false;

  const handleLabelChange = (val: string) => {
    if (!field || isProtected) return;
    onUpdateField({ ...field, label: val });
  };

  const handleDescriptionChange = (val: string) => {
    if (!field) return;
    onUpdateField({ ...field, description: val ? val : null });
  };

  const handleWidthChange = (val: FormFieldWidth) => {
    if (!field) return;
    onUpdateField({ ...field, width: val });
  };

  const handleEnabledChange = (checked: boolean) => {
    if (!field || isProtected) return;
    onUpdateField({
      ...field,
      enabled: checked,
      required: checked ? field.required : false,
    });
  };

  const handleRequiredChange = (checked: boolean) => {
    if (!field || isProtected) return;
    onUpdateField({ ...field, required: checked });
  };

  // Option handlers for choice types
  const isChoiceType =
    field?.type === 'dropdown' ||
    field?.type === 'radio' ||
    field?.type === 'checkbox' ||
    field?.type === 'multi_select';

  const options = field?.config?.options ?? [];

  const handleAddOption = () => {
    if (!field) return;
    const nextIdx = options.length + 1;
    const newOptions = [...options, { value: `option_${nextIdx}`, label: `Option ${nextIdx}` }];
    onUpdateField({
      ...field,
      config: { ...field.config, options: newOptions },
    });
  };

  const handleUpdateOption = (index: number, label: string, value: string) => {
    if (!field) return;
    const nextOptions = options.map((opt, i) =>
      i === index ? { label, value: value || label.toLowerCase().replace(/\s+/g, '_') } : opt,
    );
    onUpdateField({
      ...field,
      config: { ...field.config, options: nextOptions },
    });
  };

  const handleRemoveOption = (index: number) => {
    if (!field) return;
    const nextOptions = options.filter((_, i) => i !== index);
    onUpdateField({
      ...field,
      config: { ...field.config, options: nextOptions },
    });
  };

  return (
    <Pane
      size="inspector"
      surface="white"
      border="left"
      scroll="y"
      aria-label="Properties Panel"
    >
      {/* Top Tabs: Form Properties | Field Properties */}
      <div className="bezent-properties-tabs">
        <button
          type="button"
          className={`bezent-properties-tab ${panelTab === 'form' ? 'is-active' : ''}`.trim()}
          onClick={() => setPanelTab('form')}
        >
          Form Properties
        </button>
        <button
          type="button"
          className={`bezent-properties-tab ${panelTab === 'field' ? 'is-active' : ''}`.trim()}
          onClick={() => setPanelTab('field')}
        >
          Field Properties
        </button>
      </div>

      {/* ─── TAB 1: FORM PROPERTIES ─────────────────────────────────────────── */}
      {panelTab === 'form' && (
        <div className="bezent-inspector-content">
          <div className="bezent-inspector-header">
            <Inline justify="between" align="center">
              <h3 className="bezent-inspector-title">{form?.name ?? 'Employee Registration'}</h3>
              <Inline gap="xs">
                <Badge variant="neutral" size="sm">
                  System Form
                </Badge>
                {form?.version !== undefined && (
                  <Badge variant="neutral" size="sm">
                    v{form.version}
                  </Badge>
                )}
              </Inline>
            </Inline>
            <Label as="span" size="sm">
              Identifier: <code>{form?.key ?? 'employee-registration'}</code>
            </Label>
          </div>

          {/* Basic */}
          <div className="bezent-inspector-section">
            <div className="bezent-inspector-heading">BASIC</div>
            <Input
              label="Form Name"
              size="sm"
              readOnly
              value={form?.name ?? 'Employee Registration'}
            />
            <Input
              label="Label Name"
              size="sm"
              readOnly
              value="Employee Registration Form"
            />
            <Input
              label="Description"
              size="sm"
              readOnly
              value="Standard employee onboarding and workforce registration form"
            />
          </div>

          {/* Validation & Identifiers */}
          <div className="bezent-inspector-section">
            <div className="bezent-inspector-heading">VALIDATION & IDENTIFIERS</div>
            <Input
              label="Unique Identifier"
              size="sm"
              readOnly
              value="Employee ID (general.employeeId)"
            />
            <Switch
              label="Enable custom validations"
              checked={false}
              disabled
            />
          </div>

          {/* Preferences */}
          <div className="bezent-inspector-section">
            <div className="bezent-inspector-heading">PREFERENCES</div>
            <Switch
              label="Allow saving as draft"
              checked={true}
              disabled
            />
            <Switch
              label="Capture reason for modifications"
              checked={false}
              disabled
            />
          </div>

          {/* Auto-Numbering */}
          <div className="bezent-inspector-section">
            <div className="bezent-inspector-heading">AUTO-NUMBERING</div>
            <Switch
              label="Enable Auto-number"
              checked={true}
              disabled
            />
            <Inline gap="sm">
              <Input
                label="Prefix"
                size="sm"
                readOnly
                value="EMP"
              />
              <Input
                label="Starts From"
                size="sm"
                readOnly
                value="2026001"
              />
            </Inline>
          </div>

          {/* Active Section Info */}
          {activeSection && (
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">ACTIVE CHAPTER</div>
              <Inline justify="between" align="center">
                <Label as="span" size="sm">
                  <strong>{activeSection.label}</strong>
                </Label>
                <Badge
                  variant={activeSection.configurable ? 'success' : 'neutral'}
                  size="sm"
                >
                  {activeSection.configurable ? 'Configurable' : 'Standard'}
                </Badge>
              </Inline>
              <Label as="span" size="sm">
                {activeSection.fields.length}{' '}
                {activeSection.fields.length === 1 ? 'field' : 'fields'} configured
              </Label>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: FIELD PROPERTIES ────────────────────────────────────────── */}
      {panelTab === 'field' && (
        !field ? (
          <div className="bezent-inspector-content">
            <EmptyState
              size="compact"
              hideIllustration
              title="No field selected"
              description="Click on any field in the form canvas to inspect and configure its properties."
            />
          </div>
        ) : (
          <div className="bezent-inspector-content">
            <div className="bezent-inspector-header">
              <Inline justify="between" align="center">
                <h3 className="bezent-inspector-title">{field.label}</h3>
                <Inline gap="xs">
                  <Badge variant={isCustom ? 'info' : 'neutral'} size="sm">
                    {isCustom ? 'Custom' : 'System'}
                  </Badge>
                  {isProtected && (
                    <Badge variant="warning" size="sm">
                      Protected
                    </Badge>
                  )}
                </Inline>
              </Inline>
              <Label as="span" size="sm">
                <code>{field.key}</code> • {field.width === 'full' ? 'Full Width' : 'Half Width'}
              </Label>
            </div>

            {isProtected && (
              <Alert variant="warning" title="Protected System Field">
                {field.protectedReason ??
                  `${field.label} is required by the employee record. Its status and mandatory validation cannot be modified.`}
              </Alert>
            )}

            {/* BASIC */}
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">BASIC</div>
              <Input
                label="Display Name"
                size="sm"
                value={field.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Field Label"
                required
                disabled={isProtected}
              />
              <Input
                label="Label Name"
                size="sm"
                value={field.label}
                readOnly
                disabled
              />
              <Input
                label="Description / Help Text"
                size="sm"
                value={field.description ?? ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Optional guidance text for this field"
              />
            </div>

            {/* VALIDATION */}
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">VALIDATION</div>
              <Switch
                label="Mandatory Field"
                checked={field.required}
                disabled={isProtected || !field.enabled}
                onChange={(e) => handleRequiredChange(e.target.checked)}
              />
              <Switch
                label="Unique / No Duplicate"
                checked={field.key === 'general.employeeId'}
                disabled
              />

              {/* Character limits for text types */}
              {(field.type === 'single_line' ||
                field.type === 'multi_line' ||
                field.type === 'text' ||
                field.type === 'email' ||
                field.type === 'phone') && (
                <Inline gap="sm">
                  <Input
                    label="Min Characters"
                    type="number"
                    size="sm"
                    value={field.config?.minLength ?? ''}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateField({
                        ...field,
                        config: {
                          ...field.config,
                          minLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                  <Input
                    label="Max Characters"
                    type="number"
                    size="sm"
                    value={field.config?.maxLength ?? ''}
                    placeholder="255"
                    onChange={(e) =>
                      onUpdateField({
                        ...field,
                        config: {
                          ...field.config,
                          maxLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </Inline>
              )}

              {/* Number limits */}
              {(field.type === 'number' || field.type === 'decimal') && (
                <Inline gap="sm">
                  <Input
                    label="Min Value"
                    type="number"
                    size="sm"
                    value={field.config?.min ?? ''}
                    onChange={(e) =>
                      onUpdateField({
                        ...field,
                        config: {
                          ...field.config,
                          min: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                  <Input
                    label="Max Value"
                    type="number"
                    size="sm"
                    value={field.config?.max ?? ''}
                    onChange={(e) =>
                      onUpdateField({
                        ...field,
                        config: {
                          ...field.config,
                          max: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </Inline>
              )}

              {/* File upload limit */}
              {field.type === 'file_upload' && (
                <Input
                  label="Max File Size (MB)"
                  type="number"
                  size="sm"
                  value={field.config?.maxSizeMb ?? 10}
                  onChange={(e) =>
                    onUpdateField({
                      ...field,
                      config: {
                        ...field.config,
                        maxSizeMb: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              )}
            </div>

            {/* CHOICES / OPTIONS */}
            {isChoiceType && (
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">CHOICES & OPTIONS</div>
                <Inline justify="between" align="center">
                  <Label as="span" size="sm">
                    Options ({options.length})
                  </Label>
                  <Button variant="outline" size="sm" onClick={handleAddOption}>
                    + Add Option
                  </Button>
                </Inline>

                {options.length === 0 ? (
                  <Label as="span" size="sm">
                    No options defined. Click &ldquo;+ Add Option&rdquo; above.
                  </Label>
                ) : (
                  <Stack gap="xs">
                    {options.map((opt, idx) => (
                      <Inline key={idx} gap="xs" align="center">
                        <Input
                          size="sm"
                          value={opt.label}
                          placeholder="Option Label"
                          onChange={(e) => handleUpdateOption(idx, e.target.value, opt.value)}
                        />
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => handleRemoveOption(idx)}
                          disabled={options.length <= 1}
                          title="Remove option"
                          aria-label="Remove option"
                        >
                          <BezentIcon name="delete" size={14} />
                        </Button>
                      </Inline>
                    ))}
                  </Stack>
                )}
              </div>
            )}

            {/* AUTOFILL VALUE */}
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">AUTOFILL VALUE</div>
              <Input
                label="Autofill / Default Value"
                size="sm"
                placeholder={field.defaults?.label ?? 'None'}
                value={field.defaults?.label ?? ''}
                readOnly
              />
            </div>

            {/* GENERAL CONFIGURATION */}
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">GENERAL CONFIGURATION</div>
              <Select
                label="Appearance (Width)"
                size="sm"
                value={field.width}
                onChange={(e) => handleWidthChange(e.target.value as FormFieldWidth)}
                options={[
                  { value: 'half', label: 'Half Width (1 column)' },
                  { value: 'full', label: 'Full Width (2 columns)' },
                ]}
              />
              <Input
                label="Field Type"
                size="sm"
                value={field.type.replace(/_/g, ' ').toUpperCase()}
                readOnly
                disabled
              />
              <Switch
                label="Enabled"
                checked={field.enabled}
                disabled={isProtected}
                onChange={(e) => handleEnabledChange(e.target.checked)}
              />
            </div>

            {/* PREVIEW */}
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">PREVIEW</div>
              <div className="bezent-inspector-preview-box">
                <FormField
                  label={field.label}
                  required={field.required}
                  helperText={field.description ?? undefined}
                  span={field.width === 'full' ? 'full' : 1}
                >
                  <CanvasFieldControl field={field} />
                </FormField>
              </div>
            </div>

            {/* Custom Field Actions */}
            {isCustom && !field.protected && (
              <div className="bezent-inspector-section">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteField(field.key)}
                  leftIcon={<BezentIcon name="delete" size={14} />}
                  aria-label={`Delete custom field ${field.label}`}
                >
                  Delete Field
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </Pane>
  );
}


