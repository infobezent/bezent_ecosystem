import { useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Inline,
  Input,
  Label,
  Modal,
  Pane,
  Select,
  Stack,
  Switch,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type {
  FormFieldWidth,
  FormCustomizationMetadata,
  ResolvedFormField,
  ResolvedFormSection,
} from '../../api/formsApi';
import { KNOWN_SECTION_GROUPS } from './types';

/**
 * Authoritative master-data classification check.
 * Identifies fields whose selectable options originate from system or company master data.
 */
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

/**
 * Returns the human-readable master data authority for a system field.
 */
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

/** Formats uppercase or snake_case identifiers to clean Title Case. */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word) => {
      if (word === '&' || word === 'and') return '&';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/** Formats a technical field type string to a user-facing label without icons. */
export function formatFieldType(type: string): string {
  const map: Record<string, string> = {
    single_line: 'Single Line',
    multi_line: 'Multi Line',
    email: 'Email',
    phone: 'Phone',
    number: 'Number',
    decimal: 'Decimal',
    dropdown: 'Dropdown',
    radio: 'Radio',
    checkbox: 'Checkbox',
    multi_select: 'Multi Select',
    date: 'Date',
    time: 'Time',
    datetime: 'Date-Time',
    file_upload: 'File Upload',
    reference: 'Reference',
    text: 'Text',
    select: 'Select',
  };
  return map[type] ?? toTitleCase(type);
}

/**
 * Returns whether a field type genuinely supports a user-configurable placeholder.
 */
export function supportsPlaceholder(type: string): boolean {
  return [
    'single_line',
    'multi_line',
    'text',
    'email',
    'phone',
    'number',
    'decimal',
    'dropdown',
    'select',
  ].includes(type);
}

/**
 * Resolves the accurate Section name (subgroup inside chapter) for any field.
 */
export function getFieldSectionName(
  field: ResolvedFormField,
  activeSection?: ResolvedFormSection | null,
  metadata?: FormCustomizationMetadata,
): string {
  const sectionKey = activeSection?.key ?? field.key.split('.')[0] ?? 'general';

  // 1. Check custom metadata subgroup assignment
  const customSubgroupKey = metadata?.fieldSubgroups?.[field.key];
  if (customSubgroupKey && metadata?.subgroups?.[customSubgroupKey]?.title) {
    return metadata.subgroups[customSubgroupKey].title;
  }

  // 2. Check config.groupKey
  const groupKey = field.config?.groupKey;
  if (groupKey) {
    const title = metadata?.subgroups?.[groupKey]?.title;
    if (title) {
      return title;
    }
    return toTitleCase(groupKey);
  }

  // 3. Check KNOWN_SECTION_GROUPS mapping
  const definedGroups = KNOWN_SECTION_GROUPS[sectionKey];
  if (definedGroups) {
    for (const group of definedGroups) {
      if (group.fieldKeys.includes(field.key)) {
        return toTitleCase(group.title);
      }
    }
  }

  // 4. Fallback for custom or unassigned fields
  if (activeSection?.origin === 'custom') {
    return activeSection.label;
  }
  return 'General Details';
}

/**
 * Resolves the Chapter name (top-level step/chapter) for any field.
 */
export function getFieldChapterName(
  field: ResolvedFormField,
  activeSection?: ResolvedFormSection | null,
): string {
  if (activeSection?.label) return activeSection.label;
  const prefix = field.key.split('.')[0];
  switch (prefix) {
    case 'general':
      return 'General Information';
    case 'personal':
      return 'Personal Information';
    case 'online_access':
      return 'Online Access';
    default:
      return 'General';
  }
}

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
  metadata?: FormCustomizationMetadata;
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
  metadata,
  selectedEntity,
  onUpdateSectionTitle,
  onUpdateSectionDescription,
  onUpdateSectionVisibility,
  onMoveSectionUp: _onMoveSectionUp,
  onMoveSectionDown: _onMoveSectionDown,
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
    field?.type === 'multi_select' ||
    field?.type === 'select';

  const isMasterData = field ? isMasterDataField(field) : false;

  const options: Array<{ value: string; label: string }> = field?.config?.options ?? [];

  const handleAddOption = () => {
    if (!field) return;
    const nextIdx = options.length + 1;
    onUpdateField({
      ...field,
      config: {
        ...field.config,
        options: [...options, { value: `option_${nextIdx}`, label: `Option ${nextIdx}` }],
      },
    });
  };

  const handleOptionChange = (idx: number, label: string) => {
    if (!field) return;
    const next = [...options];
    const val = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    next[idx] = { value: val || `opt_${idx + 1}`, label };
    onUpdateField({ ...field, config: { ...field.config, options: next } });
  };

  const handleRemoveOption = (idx: number) => {
    if (!field) return;
    const removedValue = options[idx]?.value;
    const nextOptions = options.filter((_, i) => i !== idx);
    const defaultValue =
      field.config?.defaultValue === removedValue ? undefined : field.config?.defaultValue;
    onUpdateField({
      ...field,
      config: { ...field.config, options: nextOptions, defaultValue },
    });
  };

  const handleMoveOptionUp = (idx: number) => {
    if (!field || idx <= 0 || !options[idx] || !options[idx - 1]) return;
    const next = [...options];
    const current = next[idx]!;
    const prev = next[idx - 1]!;
    next[idx] = prev;
    next[idx - 1] = current;
    onUpdateField({ ...field, config: { ...field.config, options: next } });
  };

  const handleMoveOptionDown = (idx: number) => {
    if (!field || idx >= options.length - 1 || !options[idx] || !options[idx + 1]) return;
    const next = [...options];
    const current = next[idx]!;
    const nextItem = next[idx + 1]!;
    next[idx] = nextItem;
    next[idx + 1] = current;
    onUpdateField({ ...field, config: { ...field.config, options: next } });
  };

  const hasActionableValidation =
    isCustom &&
    field !== null &&
    [
      'single_line',
      'multi_line',
      'number',
      'decimal',
      'date',
      'datetime',
      'file_upload',
    ].includes(field.type);

  const chapterName = field ? getFieldChapterName(field, activeSection) : '';
  const sectionName = field ? getFieldSectionName(field, activeSection, metadata) : '';
  const protectionStatus = isProtected
    ? 'Protected'
    : field?.origin === 'system'
      ? 'Partially Configurable'
      : 'Configurable';

  return (
    <Pane size="inspector" surface="neutral" border="left" scroll="y" aria-label="Properties Inspector">
      {/* Context-sensitive header */}
      <div className="bezent-inspector-context-header">
        <h3 className="bezent-inspector-title">
          {panelMode === 'chapter' && activeSection
            ? (sectionTitle ?? activeSection.label)
            : panelTitle}
        </h3>
        {panelMode === 'field' && field && (
          <Badge
            variant={
              field.key === 'personal.profilePhoto' || field.key === 'general.employeeId'
                ? 'neutral'
                : field.origin === 'custom'
                  ? 'info'
                  : 'neutral'
            }
            size="sm"
          >
            {field.key === 'personal.profilePhoto' || field.key === 'general.employeeId'
              ? 'System Control'
              : field.origin === 'custom'
                ? 'Custom Field'
                : 'System Field'}
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
              </div>

              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">ORDER</div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Order</span>
                  <span className="bezent-info-val">
                    Position {String((sectionOrderIndex ?? 0) + 1).padStart(2, '0')} of {String(totalSections ?? 1).padStart(2, '0')}
                  </span>
                </div>
                <span className="bezent-card__desc">Reorder chapters from Form Structure</span>
              </div>

              <div className="bezent-info-card">
                <div className="bezent-inspector-heading">CHAPTER INFORMATION</div>
                <div className="bezent-info-row"><span className="bezent-info-label">Key</span><span className="bezent-info-val"><code>{activeSection.key}</code></span></div>
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

      {/* ─── FIELD SETTINGS (Field-Type-Aware & Capability-Driven) ──────────── */}
      {panelMode === 'field' && (
        <div className="bezent-inspector-content" aria-label="Field Settings">
          {!field ? (
            <EmptyState size="compact" hideIllustration title="No Field Selected" description="Click on any field in the center canvas to inspect and configure its settings." />
          ) : (
            <div className="bezent-inspector-section">

              {/* 1. GENERAL */}
              <div className="bezent-inspector-section">
                <div className="bezent-inspector-heading">GENERAL</div>
                <Input
                  label="Field Label"
                  size="sm"
                  value={field.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Field Label"
                  required
                  readOnly={field.key === 'personal.profilePhoto' || field.key === 'general.employeeId'}
                />
                {supportsPlaceholder(field.type) && field.key !== 'general.employeeId' && field.key !== 'personal.profilePhoto' && (
                  <Input
                    label="Placeholder"
                    size="sm"
                    value={field.config?.placeholder ?? ''}
                    placeholder={
                      field.type === 'dropdown' || field.type === 'select'
                        ? `Select ${field.label}...`
                        : `Enter ${field.label}...`
                    }
                    onChange={(e) =>
                      onUpdateField({
                        ...field,
                        config: { ...field.config, placeholder: e.target.value },
                      })
                    }
                  />
                )}
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

              {/* 2. BEHAVIOR */}
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
                {isProtected && (
                  <Label as="span" size="sm">
                    {field.key === 'personal.profilePhoto' ? 'Protected System Control' : 'Protected System Field'}: {field.protectedReason ? (field.protectedReason.charAt(0).toLowerCase() + field.protectedReason.slice(1)) : 'required by the employee record.'}
                  </Label>
                )}
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

              {/* 3. VALIDATION (Rendered ONLY when actionable validation is supported) */}
              {hasActionableValidation && (
                <div className="bezent-inspector-section">
                  <div className="bezent-inspector-heading">VALIDATION</div>
                  {(field.type === 'single_line' || field.type === 'multi_line') && (
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
                  )}
                  {(field.type === 'number' || field.type === 'decimal') && (
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
                  )}
                  {(field.type === 'date' || field.type === 'datetime') && (
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
                </div>
              )}

              {/* 4. DISPLAY */}
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
              </div>

              {/* 5. DATA SOURCE (Master-Data & Reference Fields ONLY) */}
              {isMasterData && (
                <div className="bezent-inspector-section">
                  <div className="bezent-inspector-heading">DATA SOURCE</div>
                  <div className="bezent-info-card">
                    <div className="bezent-info-row">
                      <span className="bezent-info-label">Options Source</span>
                      <span className="bezent-info-val"><strong>{getFieldDataSource(field)} 🔒</strong></span>
                    </div>
                    <p className="bezent-inspector-delete-note">
                      Options are managed from authoritative company master data and cannot be manually modified in the Form Editor.
                    </p>
                  </div>
                </div>
              )}

              {/* 6. OPTIONS (Editable Choice Fields ONLY) */}
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
                          <Label as="span" size="sm">≡</Label>
                          <Input
                            size="sm"
                            value={opt.label}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                          />
                          <Button
                            variant="text"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => handleMoveOptionUp(idx)}
                            aria-label={`Move up option ${opt.label}`}
                            title="Move up"
                          >
                            <BezentIcon name="chevronUp" size={12} />
                          </Button>
                          <Button
                            variant="text"
                            size="sm"
                            disabled={idx === options.length - 1}
                            onClick={() => handleMoveOptionDown(idx)}
                            aria-label={`Move down option ${opt.label}`}
                            title="Move down"
                          >
                            <BezentIcon name="chevronDown" size={12} />
                          </Button>
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => handleRemoveOption(idx)}
                            aria-label={`Remove option ${opt.label}`}
                            disabled={options.length <= 1}
                            title="Remove option"
                          >
                            <BezentIcon name="close" size={14} />
                          </Button>
                        </Inline>
                      ))}
                    </Stack>
                  )}
                </div>
              )}

              {/* 7. FIELD INFORMATION (Accurate, clean, no pencil icon) */}
              <div className="bezent-info-card">
                <div className="bezent-inspector-heading">FIELD INFORMATION</div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Type</span>
                  <span className="bezent-info-val">
                    {field.key === 'general.employeeId' ? 'System Assigned' : formatFieldType(field.type)}
                  </span>
                </div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Key</span>
                  <span className="bezent-info-val">
                    <code>{field.key}</code>
                    {field.origin === 'system' || isProtected ? ' 🔒' : ''}
                  </span>
                </div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Chapter</span>
                  <span className="bezent-info-val">{chapterName}</span>
                </div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Section</span>
                  <span className="bezent-info-val">{sectionName}</span>
                </div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Category</span>
                  <span className="bezent-info-val">
                    {field.key === 'personal.profilePhoto'
                      ? 'System Control'
                      : field.origin === 'system'
                        ? 'System Field'
                        : 'Custom Field'}
                  </span>
                </div>
                <div className="bezent-info-row">
                  <span className="bezent-info-label">Protection</span>
                  <span className="bezent-info-val">
                    <Badge variant={isProtected ? 'danger' : isCustom ? 'success' : 'neutral'} size="sm">
                      {protectionStatus}
                    </Badge>
                  </span>
                </div>
              </div>

              {/* 8. DANGER ZONE */}
              {isCustom && !field.protected && (
                <div className="bezent-inspector-section">
                  <div className="bezent-inspector-heading">DANGER ZONE</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteField(field.key)}
                    leftIcon={<BezentIcon name="delete" size={14} />}
                    aria-label={`Delete custom field ${field.label}`}
                  >
                    Delete Custom Field
                  </Button>
                </div>
              )}
              {isProtected && (
                <span className="bezent-inspector-delete-note">
                  {field.key === 'personal.profilePhoto'
                    ? 'This is a protected system control and cannot be deleted.'
                    : 'This is a protected system field and cannot be deleted.'}
                </span>
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