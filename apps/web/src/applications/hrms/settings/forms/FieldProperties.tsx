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
  Modal,
  Pane,
  Select,
  Stack,
  Switch,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { FormFieldWidth, ResolvedFormField, ResolvedFormSection } from '../api/formsApi';
import { CanvasFieldControl } from './FormCanvas';

export interface SubgroupPropertiesData {
  key: string;
  title: string;
  description?: string;
  sectionKey: string;
}

export interface FieldPropertiesProps {
  field: ResolvedFormField | null;
  form?: {
    name: string;
    key: string;
    version: number;
    kind: string;
  };
  activeSection?: ResolvedFormSection | null;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionVisible?: boolean;
  sectionOrderIndex?: number;
  totalSections?: number;
  isMandatorySection?: boolean;
  selectedSubgroup?: SubgroupPropertiesData | null;
  onUpdateSectionTitle?: (sectionKey: string, title: string) => void;
  onUpdateSectionDescription?: (sectionKey: string, description: string) => void;
  onUpdateSectionVisibility?: (sectionKey: string, visible: boolean) => void;
  onMoveSectionUp?: (sectionKey: string) => void;
  onMoveSectionDown?: (sectionKey: string) => void;
  onAddSection?: (title: string, description?: string) => void;
  onDeleteSection?: (sectionKey: string) => void;
  onUpdateSubgroupTitle?: (groupKey: string, title: string) => void;
  onUpdateSubgroupDescription?: (groupKey: string, description: string) => void;
  onUpdateField: (updated: ResolvedFormField) => void;
  onDeleteField: (fieldKey: string) => void;
  onDeselectField?: () => void;
}

export function FieldProperties({
  field,
  form,
  activeSection,
  sectionTitle,
  sectionDescription,
  sectionVisible,
  sectionOrderIndex,
  totalSections,
  isMandatorySection,
  selectedSubgroup,
  onUpdateSectionTitle,
  onUpdateSectionDescription,
  onUpdateSectionVisibility,
  onMoveSectionUp,
  onMoveSectionDown,
  onAddSection,
  onDeleteSection,
  onUpdateSubgroupTitle,
  onUpdateSubgroupDescription,
  onUpdateField,
  onDeleteField,
}: FieldPropertiesProps) {
  // Tabs: 'form' | 'subgroup' | 'field'
  const [panelTab, setPanelTab] = useState<'form' | 'subgroup' | 'field'>(
    selectedSubgroup ? 'subgroup' : field ? 'field' : 'form',
  );

  // Section management modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [addSectionError, setAddSectionError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // When active section changes with no field or subgroup selected, display Form Properties
  useEffect(() => {
    if (!field && !selectedSubgroup) {
      setPanelTab('form');
    }
  }, [activeSection?.key, field, selectedSubgroup]);

  // Auto switch to 'field' when a field is selected
  useEffect(() => {
    if (field) {
      setPanelTab('field');
    }
  }, [field?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto switch to 'subgroup' when a subgroup is selected
  useEffect(() => {
    if (selectedSubgroup) {
      setPanelTab('subgroup');
    }
  }, [selectedSubgroup?.key]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Top Tabs: Form Properties | Subgroup Properties | Field Properties */}
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
          className={`bezent-properties-tab ${panelTab === 'subgroup' ? 'is-active' : ''}`.trim()}
          onClick={() => setPanelTab('subgroup')}
        >
          Subgroup Properties
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

          {/* Active Section Info & Editing */}
          {activeSection && (
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">ACTIVE CHAPTER / SECTION</div>
              <Input
                label="Section Identifier"
                size="sm"
                readOnly
                value={activeSection.key}
              />
              <Input
                label="Section Title"
                size="sm"
                value={sectionTitle ?? activeSection.label}
                onChange={(e) => onUpdateSectionTitle?.(activeSection.key, e.target.value)}
                placeholder="Section Title"
                required
              />
              <Input
                label="Section Description"
                size="sm"
                value={sectionDescription ?? activeSection.description ?? ''}
                onChange={(e) => onUpdateSectionDescription?.(activeSection.key, e.target.value)}
                placeholder="Section Description"
              />
              <Switch
                label="Section Visibility"
                checked={sectionVisible ?? activeSection.visible !== false}
                disabled={isMandatorySection}
                onChange={(e) =>
                  onUpdateSectionVisibility?.(activeSection.key, e.target.checked)
                }
              />
              {isMandatorySection && (
                <Label as="span" size="sm">
                  Mandatory system section. Cannot be hidden from employee registration.
                </Label>
              )}
              <div className="bezent-inspector-subheading">
                <Label as="span" size="sm">
                  <strong>Section Order</strong>
                </Label>
              </div>
              <Inline justify="between" align="center">
                <Label as="span" size="sm">
                  Position {(sectionOrderIndex ?? 0) + 1} of {totalSections ?? 1}
                </Label>
                <Inline gap="xs">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={sectionOrderIndex === undefined || sectionOrderIndex <= 0}
                    onClick={() => onMoveSectionUp?.(activeSection.key)}
                    leftIcon={<BezentIcon name="chevronUp" size={14} />}
                  >
                    Move Up
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      sectionOrderIndex === undefined ||
                      totalSections === undefined ||
                      sectionOrderIndex >= totalSections - 1
                    }
                    onClick={() => onMoveSectionDown?.(activeSection.key)}
                    leftIcon={<BezentIcon name="chevronDown" size={14} />}
                  >
                    Move Down
                  </Button>
                </Inline>
              </Inline>
              <Inline justify="between" align="center">
                <Badge
                  variant={
                    activeSection.origin === 'custom'
                      ? 'info'
                      : activeSection.configurable
                        ? 'success'
                        : 'neutral'
                  }
                  size="sm"
                >
                  {activeSection.origin === 'custom'
                    ? 'Custom Section'
                    : activeSection.configurable
                      ? 'Configurable System Section'
                      : 'Standard System Section'}
                </Badge>
                <Label as="span" size="sm">
                  {activeSection.fields.length}{' '}
                  {activeSection.fields.length === 1 ? 'field' : 'fields'} configured
                </Label>
              </Inline>
            </div>
          )}

          {/* Section Management */}
          <div className="bezent-inspector-section">
            <div className="bezent-inspector-heading">SECTION MANAGEMENT</div>
            <Stack gap="sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNewSectionTitle('');
                  setNewSectionDescription('');
                  setAddSectionError(null);
                  setIsAddModalOpen(true);
                }}
                leftIcon={<BezentIcon name="add" size={14} />}
              >
                Add Section
              </Button>
              {activeSection?.origin === 'custom' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  leftIcon={<BezentIcon name="delete" size={14} />}
                >
                  Delete Section
                </Button>
              ) : (
                <Label as="span" size="sm">
                  System sections are protected and cannot be deleted.
                </Label>
              )}
            </Stack>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SUBGROUP PROPERTIES ─────────────────────────────────────── */}
      {panelTab === 'subgroup' &&
        (!selectedSubgroup ? (
          <div className="bezent-inspector-content">
            <EmptyState
              size="compact"
              hideIllustration
              title="No subgroup selected"
              description="Click on any subgroup heading in the form canvas to inspect and edit its title and description."
            />
          </div>
        ) : (
          <div className="bezent-inspector-content">
            <div className="bezent-inspector-header">
              <Inline justify="between" align="center">
                <h3 className="bezent-inspector-title">{selectedSubgroup.title}</h3>
                <Badge variant="info" size="sm">
                  Subgroup
                </Badge>
              </Inline>
              <Label as="span" size="sm">
                Identifier: <code>{selectedSubgroup.key}</code>
              </Label>
            </div>

            {/* Subgroup Basic */}
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">SUBGROUP PROPERTIES</div>
              <Input
                label="Subgroup Identifier"
                size="sm"
                readOnly
                value={selectedSubgroup.key}
              />
              <Input
                label="Subgroup Title"
                size="sm"
                value={selectedSubgroup.title}
                onChange={(e) => onUpdateSubgroupTitle?.(selectedSubgroup.key, e.target.value)}
                placeholder="Subgroup Title"
                required
              />
              <Input
                label="Subgroup Description"
                size="sm"
                value={selectedSubgroup.description ?? ''}
                onChange={(e) =>
                  onUpdateSubgroupDescription?.(selectedSubgroup.key, e.target.value)
                }
                placeholder="Optional description or guidance text for this subgroup"
              />
            </div>

            {/* Parent section context */}
            <div className="bezent-inspector-section">
              <div className="bezent-inspector-heading">SECTION CONTEXT</div>
              <Input
                label="Parent Section"
                size="sm"
                readOnly
                value={activeSection?.label ?? selectedSubgroup.sectionKey}
              />
            </div>
          </div>
        ))}

      {/* ─── TAB 3: FIELD PROPERTIES ────────────────────────────────────────── */}
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

      {/* Modal: Add Custom Section */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Custom Section"
        description="Create a new custom chapter in the Employee Registration form with its own fields and configuration."
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!newSectionTitle.trim()) {
                  setAddSectionError('Section title is required.');
                  return;
                }
                onAddSection?.(newSectionTitle.trim(), newSectionDescription.trim() || undefined);
                setIsAddModalOpen(false);
              }}
            >
              Add Section
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {addSectionError && (
            <Alert variant="danger" title="Validation Error">
              {addSectionError}
            </Alert>
          )}
          <Input
            label="Section Title"
            size="sm"
            required
            placeholder="e.g. Additional Certifications"
            value={newSectionTitle}
            onChange={(e) => {
              setNewSectionTitle(e.target.value);
              if (addSectionError) setAddSectionError(null);
            }}
          />
          <Input
            label="Section Description"
            size="sm"
            placeholder="Optional section description"
            value={newSectionDescription}
            onChange={(e) => setNewSectionDescription(e.target.value)}
          />
        </Stack>
      </Modal>

      {/* Modal: Delete Custom Section Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Custom Section"
        description={`Are you sure you want to delete "${activeSection?.label}"?`}
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (!activeSection) return;
                onDeleteSection?.(activeSection.key);
                setIsDeleteModalOpen(false);
              }}
            >
              Delete Section
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <Alert variant="warning" title="Confirm Section Deletion">
            This will permanently remove the custom section <strong>{activeSection?.label}</strong> ({activeSection?.key}) and all custom fields within it from the employee registration form.
          </Alert>
        </Stack>
      </Modal>
    </Pane>
  );
}


