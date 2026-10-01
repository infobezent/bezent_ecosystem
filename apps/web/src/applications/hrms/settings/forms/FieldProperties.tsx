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
export function isMasterDataField(field: ResolvedFormField): boolean {
  if (field.origin === 'custom') return false;
  if (field.type === 'reference') return true;
  return [
    'general.department',
    'general.team',
    'general.designation',
    'general.officeLocation',
    'general.organisationUnit',
    'general.gradeLevel',
    'general.employmentType',
    'general.employmentStatus',
    'general.reportingManager',
    'general.sourceOfHire',
    'general.probationPeriod',
    'general.noticePeriod',
    'personal.country',
    'personal.permanentCountry',
    'personal.city',
    'personal.permanentCity',
    'personal.state',
    'personal.permanentState',
    'personal.gender',
    'personal.maritalStatus',
    'personal.bloodGroup',
    'personal.nationality',
    'personal.nativeLanguage',
    'personal.timeZone',
  ].includes(field.key);
}

export function getFieldDataSource(field: ResolvedFormField): string {
  if (field.origin === 'custom') return 'Custom Field Definition';
  if (field.type === 'reference' || field.key === 'general.reportingManager') {
    return 'Employee Directory';
  }
  switch (field.key) {
    case 'general.department':
      return 'Organization → Departments';
    case 'general.team':
      return 'Organization → Teams';
    case 'general.designation':
      return 'Organization → Designations';
    case 'general.officeLocation':
      return 'Organization → Office Locations';
    case 'general.organisationUnit':
      return 'Organization → Organisation Units';
    case 'general.gradeLevel':
      return 'Organization → Grade / Level';
    case 'general.employmentType':
      return 'HR Policy → Employment Types';
    case 'general.employmentStatus':
      return 'HR Policy → Employment Statuses';
    case 'general.sourceOfHire':
      return 'Recruitment → Source of Hire';
    case 'general.probationPeriod':
      return 'HR Policy → Probation Rules';
    case 'general.noticePeriod':
      return 'HR Policy → Notice Periods';
    case 'personal.country':
    case 'personal.permanentCountry':
      return 'Master Data → Countries';
    case 'personal.city':
    case 'personal.permanentCity':
      return 'Master Data → Cities';
    case 'personal.state':
    case 'personal.permanentState':
      return 'Master Data → States / Provinces';
    case 'personal.gender':
      return 'System Master Data → Demographic Options';
    case 'personal.maritalStatus':
      return 'System Master Data → Marital Statuses';
    case 'personal.bloodGroup':
      return 'System Master Data → Blood Groups';
    case 'personal.nationality':
      return 'Master Data → Nationalities';
    case 'personal.nativeLanguage':
      return 'Master Data → Languages';
    case 'personal.timeZone':
      return 'Master Data → Time Zones';
    default:
      return 'BEZENT System Core';
  }
}
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
  /** Which entity is currently selected: drives the context-sensitive inspector. */
  selectedEntity?: 'form' | 'chapter' | 'section' | 'field' | null;
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
  selectedEntity,
  onUpdateSectionTitle,
  onUpdateSectionDescription,
  onUpdateSectionVisibility,
  onMoveSectionUp,
  onMoveSectionDown,
  onAddSection,
  onDeleteSection,
  onUpdateField,
  onDeleteField,
}: FieldPropertiesProps) {
  type PanelMode = 'form' | 'chapter' | 'field' | 'neutral';

  // Derive the active panel from selectedEntity + what is actually available.
  // Sections NEVER have a dedicated inspector panel; selecting a section resolves to neutral.
  const derivedMode: PanelMode = (() => {
    if (selectedEntity === 'form') return 'form';
    if (selectedEntity === 'field' && field) return 'field';
    if (selectedEntity === 'chapter') return 'chapter';
    if (selectedEntity === 'section') return 'neutral';
    if (field) return 'field';
    if (activeSection) return 'chapter';
    return 'form';
  })();

  const [panelMode, setPanelMode] = useState<PanelMode>(derivedMode);

  // Section management modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [addSectionError, setAddSectionError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sync panel mode whenever the derived mode changes
  useEffect(() => {
    setPanelMode(derivedMode);
  }, [derivedMode]);

  // Auto-switch when a field is selected
  useEffect(() => {
    if (field) setPanelMode('field');
  }, [field?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch when form root is explicitly selected
  useEffect(() => {
    if (selectedEntity === 'form') setPanelMode('form');
    else if (selectedEntity === 'section') setPanelMode('neutral');
  }, [selectedEntity]);

  // Fallback: chapter/form when nothing specific is selected
  useEffect(() => {
    if (!field && selectedEntity !== 'form' && selectedEntity !== 'section') {
      setPanelMode(activeSection ? 'chapter' : 'form');
    }
  }, [activeSection?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const panelTitle = (() => {
    if (panelMode === 'form') return 'Form Settings';
    if (panelMode === 'chapter') return 'Chapter Settings';
    if (panelMode === 'neutral') return 'Inspector';
    return 'Field Settings';
  })();

  const isCustom = field?.origin === 'custom';
  const isProtected = field?.protected ?? false;

  const handleLabelChange = (val: string) => {
    if (!field) return;
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
    onUpdateField({ ...field, enabled: checked, required: checked ? field.required : false });
  };

  const handleRequiredChange = (checked: boolean) => {
    if (!field || isProtected) return;
    onUpdateField({ ...field, required: checked });
  };

  const isChoiceType =
    field?.type === 'dropdown' ||
    field?.type === 'radio' ||
    field?.type === 'checkbox' ||
    field?.type === 'multi_select';

  const isMasterData = field ? isMasterDataField(field) : false;

  const options: Array<{ value: string; label: string }> = field?.config?.options ?? [];

  const handleAddOption = () => {
    if (!field) return;
    const nextIdx = options.length + 1;
    onUpdateField({ ...field, config: { ...field.config, options: [...options, { value: `option_${nextIdx}`, label: `Option ${nextIdx}` }] } });
  };

  const handleOptionChange = (idx: number, label: string) => {
    if (!field) return;
    const next = [...options];
    const val = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    next[idx] = { value: val || `opt_${idx + 1}`, label };
    onUpdateField({ ...field, config: { ...field.config, options: next } });
  };

  const handleRemoveOption = (idx: number) => {
    if (!field) return;
    onUpdateField({ ...field, config: { ...field.config, options: options.filter((_, i) => i !== idx) } });
  };

  return (
    <Pane size="inspector" surface="neutral" border="left" scroll="y" aria-label="Properties Inspector">
      {/* Context-sensitive header - NO permanent clickable tab strip */}
      <div className="bezent-inspector-context-header">
        <h3 className="bezent-inspector-title">{panelTitle}</h3>
        {panelMode === 'field' && field && (
          <Badge variant={field.origin === 'custom' ? 'info' : 'neutral'} size="sm">
            {field.origin === 'custom' ? 'Custom Field' : 'System Field'}
          </Badge>
        )}
        {panelMode === 'chapter' && (
          <Badge variant="neutral" size="sm">
            {activeSection?.origin === 'custom' ? 'Custom Chapter' : 'System Chapter'}
          </Badge>
        )}
        {panelMode === 'form' && <Badge variant="neutral" size="sm">System Form</Badge>}
      </div>

      {/* ─── FORM SETTINGS ─────────────────────────────────────────────────── */}
      {panelMode === 'form' && (
        <div className="bezent-inspector-content" aria-label="Form Settings">
          <div className="bezent-inspector-section">
            <div className="bezent-inspector-heading">BASIC</div>
            <Input label="Form Name" size="sm" readOnly value={form?.name ?? 'Employee Registration'} />
            <Input label="Description" size="sm" readOnly value="Standard employee onboarding and workforce registration form" />
          </div>
          <div className="bezent-info-card">
            <div className="bezent-inspector-heading">FORM INFORMATION</div>
            <div className="bezent-info-row">
              <span className="bezent-info-label">Form Key</span>
              <span className="bezent-info-val"><code>{form?.key ?? 'employee-registration'}</code></span>
            </div>
            <div className="bezent-info-row">
              <span className="bezent-info-label">Form Type</span>
              <span className="bezent-info-val">System Form</span>
            </div>
            {form?.version !== undefined && (
              <div className="bezent-info-row">
                <span className="bezent-info-label">Version</span>
                <span className="bezent-info-val">v{form.version}</span>
              </div>
            )}
            <div className="bezent-info-row">
              <span className="bezent-info-label">Identifier</span>
              <span className="bezent-info-val"><code>employee-registration</code></span>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHAPTER SETTINGS ──────────────────────────────────────────────── */}
      {panelMode === 'chapter' && (
        <div className="bezent-inspector-content" aria-label="Chapter Settings">
          {!activeSection ? (
            <EmptyState size="compact" hideIllustration title="No Chapter Selected" description="Click on a chapter in the left panel to inspect and configure its settings." />
          ) : (
            <>
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">BASIC</div>
                <Input
                  label="Chapter Name" size="sm"
                  value={sectionTitle ?? activeSection.label}
                  onChange={(e) => onUpdateSectionTitle?.(activeSection.key, e.target.value)}
                  placeholder="Chapter Name" required
                />
                <Input
                  label="Description" size="sm"
                  value={sectionDescription ?? activeSection.description ?? ''}
                  onChange={(e) => onUpdateSectionDescription?.(activeSection.key, e.target.value)}
                  placeholder="Chapter description"
                />
                <Switch
                  label="Visible"
                  checked={sectionVisible ?? activeSection.visible !== false}
                  disabled={isMandatorySection}
                  onChange={(e) => onUpdateSectionVisibility?.(activeSection.key, e.target.checked)}
                />
                {isMandatorySection && (
                  <Label as="span" size="sm">Mandatory system chapter — cannot be hidden from employee registration.</Label>
                )}
                <Input label="Display Order" size="sm" readOnly value={String((sectionOrderIndex ?? 0) + 1).padStart(2, '0')} />
              </div>

              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">CHAPTER ORDER</div>
                <Inline justify="between" align="center">
                  <Label as="span" size="sm">Position {(sectionOrderIndex ?? 0) + 1} of {totalSections ?? 1}</Label>
                  <Inline gap="xs">
                    <Button variant="secondary" size="sm"
                      disabled={activeSection.key === 'review' || sectionOrderIndex === undefined || sectionOrderIndex <= 0}
                      onClick={() => onMoveSectionUp?.(activeSection.key)}
                      leftIcon={<BezentIcon name="chevronUp" size={14} />}
                    >Move Up</Button>
                    <Button variant="secondary" size="sm"
                      disabled={activeSection.key === 'review' || sectionOrderIndex === undefined || totalSections === undefined || sectionOrderIndex >= totalSections - 1}
                      onClick={() => onMoveSectionDown?.(activeSection.key)}
                      leftIcon={<BezentIcon name="chevronDown" size={14} />}
                    >Move Down</Button>
                  </Inline>
                </Inline>
              </div>

              <div className="bezent-info-card">
                <div className="bezent-inspector-heading">CHAPTER INFORMATION</div>
                <div className="bezent-info-row"><span className="bezent-info-label">Chapter Key</span><span className="bezent-info-val"><code>{activeSection.key}</code></span></div>
                <div className="bezent-info-row"><span className="bezent-info-label">Category</span><span className="bezent-info-val">{activeSection.origin === 'custom' ? 'Custom Chapter' : 'System Chapter'}</span></div>
                <div className="bezent-info-row"><span className="bezent-info-label">Protection</span><span className="bezent-info-val">{activeSection.key === 'review' ? 'Protected Final Chapter' : isMandatorySection ? 'Protected' : 'Standard'}</span></div>
              </div>

              {activeSection.key === 'review' && (
                <Alert variant="info" title="Protected Final Chapter">Review &amp; Finalize is the final protected step of registration and cannot be moved or hidden.</Alert>
              )}

              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">CHAPTER MANAGEMENT</div>
                <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)} leftIcon={<BezentIcon name="add" size={14} />}>Add Section</Button>
                {activeSection.origin === 'system' ? (
                  <Label as="span" size="sm">System chapters are protected and cannot be deleted.</Label>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(true)} leftIcon={<BezentIcon name="delete" size={14} />}>Delete Section</Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── NEUTRAL EMPTY STATE (When Section or no specific entity selected) ── */}
      {panelMode === 'neutral' && (
        <div className="bezent-inspector-content" aria-label="Inspector">
          <EmptyState
            size="compact"
            hideIllustration
            title="Select a field"
            description="Select a field to configure its properties."
          />
        </div>
      )}

      {/* ─── FIELD SETTINGS ────────────────────────────────────────────────── */}
      {panelMode === 'field' && (
        <div className="bezent-inspector-content" aria-label="Field Settings">
          {!field ? (
            <EmptyState size="compact" hideIllustration title="No Field Selected" description="Click on any field in the center canvas to inspect and configure its settings." />
          ) : (
            <div className="bezent-inspector-section">
              {field.origin === 'system' ? (
                <div className="bezent-inspector-notice">
                  <div className="bezent-inspector-notice__icon"><BezentIcon name="settings" size={16} /></div>
                  <div>
                    <div className="bezent-inspector-notice__title">System Field</div>
                    <div className="bezent-inspector-notice__desc">This is a system field provided by BEZENT.</div>
                  </div>
                </div>
              ) : (
                <div className="bezent-inspector-notice">
                  <div className="bezent-inspector-notice__icon"><BezentIcon name="sparkles" size={16} /></div>
                  <div>
                    <div className="bezent-inspector-notice__title">Custom Field</div>
                    <div className="bezent-inspector-notice__desc">This is a company-defined custom field.</div>
                  </div>
                </div>
              )}

              {isProtected && (
                <Alert variant="warning" title="Protected System Field">
                  {field.protectedReason ?? `${field.label} is required by the employee record. Its status and mandatory validation cannot be modified.`}
                </Alert>
              )}

              {/* GENERAL */}
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">GENERAL</div>
                <Input
                  label="Field Label"
                  size="sm"
                  value={field.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Field Label"
                  required
                />
                <Input
                  label="Placeholder"
                  size="sm"
                  value={field.config?.placeholder ?? ''}
                  placeholder={`Enter ${field.label}...`}
                  onChange={(e) =>
                    onUpdateField({
                      ...field,
                      config: { ...field.config, placeholder: e.target.value },
                    })
                  }
                />
                <div>
                  <Input
                    label="Help Text"
                    size="sm"
                    value={field.description ?? ''}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Optional guidance text for this field"
                  />
                  <div className="bezent-inspector-char-counter">
                    {(field.description ?? '').length}/500
                  </div>
                </div>
              </div>

              {/* BEHAVIOR */}
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">BEHAVIOR</div>
                <Switch
                  label="Visible"
                  checked={field.enabled}
                  disabled={isProtected}
                  onChange={(e) => handleEnabledChange(e.target.checked)}
                />
                <Switch
                  label="Required"
                  checked={field.required}
                  disabled={isProtected || !field.enabled}
                  onChange={(e) => handleRequiredChange(e.target.checked)}
                />
                {isCustom && (field.type === 'dropdown' || field.type === 'radio') && options.length > 0 && (
                  <Select
                    label="Default Value"
                    size="sm"
                    value={field.config?.defaultValue ?? ''}
                    onChange={(e) =>
                      onUpdateField({
                        ...field,
                        config: { ...field.config, defaultValue: e.target.value || undefined },
                      })
                    }
                    options={[
                      { value: '', label: '(None)' },
                      ...options.map((opt) => ({ value: opt.value, label: opt.label })),
                    ]}
                  />
                )}
              </div>

              {/* VALIDATION (Type-specific controls) */}
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">VALIDATION</div>
                {(field.type === 'single_line' || field.type === 'multi_line') && (
                  isCustom ? (
                    <Inline gap="sm">
                      <Input
                        label="Min Length"
                        size="sm"
                        type="number"
                        value={field.config?.minLength !== undefined ? String(field.config.minLength) : ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          onUpdateField({
                            ...field,
                            config: { ...field.config, minLength: val },
                          });
                        }}
                      />
                      <Input
                        label="Max Length"
                        size="sm"
                        type="number"
                        value={field.config?.maxLength !== undefined ? String(field.config.maxLength) : ''}
                        placeholder={field.type === 'multi_line' ? '5000' : '255'}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          onUpdateField({
                            ...field,
                            config: { ...field.config, maxLength: val },
                          });
                        }}
                      />
                    </Inline>
                  ) : (
                    <p className="bezent-inspector-delete-note">
                      Text validation: Standard 1–100 characters limit enforced by system schema.
                    </p>
                  )
                )}
                {(field.type === 'number' || field.type === 'decimal') && (
                  isCustom ? (
                    <>
                      <Inline gap="sm">
                        <Input
                          label="Min Value"
                          size="sm"
                          type="number"
                          value={field.config?.min !== undefined ? String(field.config.min) : ''}
                          placeholder="No min"
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            onUpdateField({
                              ...field,
                              config: { ...field.config, min: val },
                            });
                          }}
                        />
                        <Input
                          label="Max Value"
                          size="sm"
                          type="number"
                          value={field.config?.max !== undefined ? String(field.config.max) : ''}
                          placeholder="No max"
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            onUpdateField({
                              ...field,
                              config: { ...field.config, max: val },
                            });
                          }}
                        />
                      </Inline>
                      {field.type === 'decimal' && (
                        <Input
                          label="Decimal Places (1-6)"
                          size="sm"
                          type="number"
                          value={field.config?.decimalPlaces !== undefined ? String(field.config.decimalPlaces) : '2'}
                          placeholder="2"
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                            onUpdateField({
                              ...field,
                              config: { ...field.config, decimalPlaces: val },
                            });
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <p className="bezent-inspector-delete-note">
                      Numeric format validation enforced by system employee record schema.
                    </p>
                  )
                )}
                {field.type === 'date' && (
                  isCustom ? (
                    <Stack gap="xs">
                      <Switch
                        label="Disallow Past Dates"
                        checked={field.config?.disallowPast ?? false}
                        disabled={field.config?.disallowFuture ?? false}
                        onChange={(e) =>
                          onUpdateField({
                            ...field,
                            config: {
                              ...field.config,
                              disallowPast: e.target.checked,
                              disallowFuture: e.target.checked ? false : field.config?.disallowFuture,
                            },
                          })
                        }
                      />
                      <Switch
                        label="Disallow Future Dates"
                        checked={field.config?.disallowFuture ?? false}
                        disabled={field.config?.disallowPast ?? false}
                        onChange={(e) =>
                          onUpdateField({
                            ...field,
                            config: {
                              ...field.config,
                              disallowFuture: e.target.checked,
                              disallowPast: e.target.checked ? false : field.config?.disallowPast,
                            },
                          })
                        }
                      />
                    </Stack>
                  ) : (
                    <p className="bezent-inspector-delete-note">
                      ISO-8601 calendar date format validation enforced by system schema.
                    </p>
                  )
                )}
                {field.type === 'file_upload' && (
                  <Input
                    label="Max File Size (MB, 1–25)"
                    size="sm"
                    type="number"
                    value={field.config?.maxSizeMb !== undefined ? String(field.config.maxSizeMb) : '10'}
                    placeholder="10"
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : 10;
                      onUpdateField({
                        ...field,
                        config: { ...field.config, maxSizeMb: val },
                      });
                    }}
                  />
                )}
                {field.type === 'email' && (
                  <p className="bezent-inspector-delete-note">
                    RFC 5322 email syntax validation enforced.
                  </p>
                )}
                {field.type === 'phone' && (
                  <p className="bezent-inspector-delete-note">
                    E.164 telecommunication phone format validation enforced.
                  </p>
                )}
                {isChoiceType && (
                  <p className="bezent-inspector-delete-note">
                    {field.type === 'multi_select'
                      ? 'Multiple option selection permitted at runtime.'
                      : 'Single-option selection validated from allowed values.'}
                  </p>
                )}
              </div>

              {/* DISPLAY */}
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">DISPLAY</div>
                <Select
                  label="Field Width"
                  size="sm"
                  value={field.width}
                  onChange={(e) => handleWidthChange(e.target.value as FormFieldWidth)}
                  options={[
                    { value: 'half', label: 'Half Width (1 column)' },
                    { value: 'full', label: 'Full Width (2 columns)' },
                  ]}
                />
                <div className="bezent-info-card">
                  <div className="bezent-info-row">
                    <span className="bezent-info-label">Display Order</span>
                    <span className="bezent-info-val">Position {String(field.order).padStart(2, '0')}</span>
                  </div>
                  <p className="bezent-inspector-delete-note">
                    To reorder fields, drag and drop the field card directly on the canvas.
                  </p>
                </div>
              </div>

              {/* DATA SOURCE (Master-Data & Reference Fields) */}
              {isMasterData && (
                <div className="bezent-inspector-section">
                  <div className="bezent-inspector-heading">DATA SOURCE</div>
                  <div className="bezent-info-card">
                    <div className="bezent-info-row">
                      <span className="bezent-info-label">Source</span>
                      <span className="bezent-info-val"><strong>{getFieldDataSource(field)}</strong></span>
                    </div>
                    <p className="bezent-inspector-delete-note">
                      Options for this field are sourced from authoritative company master data and cannot be manually modified in the Form Editor.
                    </p>
                  </div>
                </div>
              )}

              {/* OPTIONS (Only for configurable choice fields) */}
              {isChoiceType && !isMasterData && (
                <div className="bezent-inspector-section">
                  <div className="bezent-inspector-heading">OPTIONS</div>
                  <Inline justify="between" align="center">
                    <Label as="span" size="sm">Options ({options.length})</Label>
                    <Button variant="outline" size="sm" onClick={handleAddOption}>+ Add Option</Button>
                  </Inline>
                  {options.length === 0 ? (
                    <Label as="span" size="sm">No options defined. Click &ldquo;+ Add Option&rdquo; above.</Label>
                  ) : (
                    <Stack gap="xs">
                      {options.map((opt, idx) => (
                        <Inline key={idx} gap="xs" align="center">
                          <Input size="sm" value={opt.label} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Option ${idx + 1}`} />
                          <Button variant="text" size="sm" onClick={() => handleRemoveOption(idx)} aria-label={`Remove option ${opt.label}`} disabled={options.length <= 1}>
                            <BezentIcon name="close" size={14} />
                          </Button>
                        </Inline>
                      ))}
                    </Stack>
                  )}
                </div>
              )}

              {/* FIELD INFORMATION */}
              <div className="bezent-info-card">
                <div className="bezent-inspector-heading">FIELD INFORMATION</div>
                <div className="bezent-info-row"><span className="bezent-info-label">Field Type</span><span className="bezent-info-val"><BezentIcon name="edit" size={12} />{field.type.replace(/_/g, ' ')}</span></div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Field Key</span>
                  <span className="bezent-info-val">
                    <code>{field.key}</code>
                    {field.origin === 'system' || isProtected ? ' 🔒' : ''}
                  </span>
                </div>
                <div className="bezent-info-row"><span className="bezent-info-label">Database Field</span><span className="bezent-info-val">{field.key.split('.').pop()}</span></div>
                <div className="bezent-info-row"><span className="bezent-info-label">Section</span><span className="bezent-info-val">{activeSection?.label ?? 'General'}</span></div>
                <div className="bezent-info-row"><span className="bezent-info-label">Field Category</span><span className="bezent-info-val">{field.origin === 'system' ? 'System Field' : 'Custom Field'}</span></div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Protection</span>
                  <span className="bezent-info-val">
                    <Badge variant={isProtected ? 'danger' : 'success'} size="sm">
                      {isProtected ? 'Protected' : 'Configurable'}
                    </Badge>
                  </span>
                </div>
                <div className="bezent-info-row"><span className="bezent-info-label">Data Source</span><span className="bezent-info-val">{getFieldDataSource(field)}</span></div>
              </div>

              <div className="bezent-inspector-configurable-badge">
                <BezentIcon name="check" size={14} />
                <span>{isProtected ? 'Protected' : 'Configurable'}</span>
              </div>
              <p className="bezent-inspector-delete-note">
                {isProtected
                  ? 'This field is required by the employee record. Its status and mandatory validation cannot be modified.'
                  : 'You can modify the label, visibility, required status, placeholder and help text.'}
              </p>

              {/* PREVIEW */}
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">PREVIEW</div>
                <div className="bezent-inspector-preview-box">
                  <FormField label={field.label} required={field.required} helperText={field.description ?? undefined} span={field.width === 'full' ? 'full' : 1}>
                    <CanvasFieldControl field={field} />
                  </FormField>
                </div>
              </div>

              {/* DANGER ZONE */}
              {isCustom && !field.protected && (
                <div className="bezent-inspector-section">
                  <div className="bezent-inspector-heading">DANGER ZONE</div>
                  <Button variant="outline" size="sm" onClick={() => onDeleteField(field.key)} leftIcon={<BezentIcon name="delete" size={14} />} aria-label={`Delete custom field ${field.label}`}>Delete Custom Field</Button>
                </div>
              )}
              {isProtected && (
                <span className="bezent-inspector-delete-note">This is a protected system field and cannot be deleted.</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals — rendered from chapter settings context */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Custom Section"
        description="Create a new custom chapter in the Employee Registration form with its own fields and configuration."
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => {
              if (!newSectionTitle.trim()) { setAddSectionError('Section title is required.'); return; }
              onAddSection?.(newSectionTitle.trim(), newSectionDescription.trim() || undefined);
              setIsAddModalOpen(false);
            }}>Add Section</Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {addSectionError && <Alert variant="danger" title="Validation Error">{addSectionError}</Alert>}
          <Input label="Section Title" size="sm" required placeholder="e.g. Additional Certifications" value={newSectionTitle} onChange={(e) => { setNewSectionTitle(e.target.value); if (addSectionError) setAddSectionError(null); }} />
          <Input label="Section Description" size="sm" placeholder="e.g. Employee technical certifications and licenses" value={newSectionDescription} onChange={(e) => setNewSectionDescription(e.target.value)} />
        </Stack>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Custom Section"
        description={`Are you sure you want to delete the custom section "${sectionTitle ?? activeSection?.label}"? All custom fields within this section will also be deleted.`}
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => { if (activeSection) onDeleteSection?.(activeSection.key); setIsDeleteModalOpen(false); }}>Delete Section</Button>
          </Inline>
        }
      >
        <Alert variant="warning" title="Irreversible Action">This will permanently remove the custom chapter and its associated field definitions.</Alert>
      </Modal>
    </Pane>
  );
}