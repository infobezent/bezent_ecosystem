import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  FormGrid,
  FormSection,
  Inline,
  Input,
  Label,
  Pane,
  Select,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { ResolvedFormField, ResolvedFormSection } from '../api/formsApi';
import {
  CHAPTER_METADATA,
  getGroupsForSection,
  type ChapterDefinition,
} from './types';

export interface FormCanvasProps {
  sections: ResolvedFormSection[];
  activeSectionKey?: string;
  selectedFieldKey: string | null;
  onSelectSection?: (sectionKey: string) => void;
  onSelectField: (fieldKey: string) => void;
  onMoveField: (fieldKey: string, direction: 'up' | 'down') => void;
  onMoveToSection?: (fieldKey: string, targetSectionKey: string) => void;
  onDeleteField: (fieldKey: string) => void;
  onQuickAddField?: (sectionKey: string) => void;
}

function getSampleOptionsForField(fieldKey: string): Array<{ value: string; label: string }> {
  switch (fieldKey) {
    case 'general.employmentType':
      return [
        { value: 'full_time', label: 'Full Time' },
        { value: 'part_time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'intern', label: 'Intern' },
      ];
    case 'general.employmentStatus':
      return [
        { value: 'pending_activation', label: 'Pending Activation' },
        { value: 'active', label: 'Active' },
        { value: 'probation', label: 'Probation' },
      ];
    case 'general.department':
      return [
        { value: 'eng', label: 'Engineering' },
        { value: 'prod', label: 'Product' },
        { value: 'ops', label: 'Operations' },
        { value: 'hr', label: 'Human Resources' },
      ];
    case 'general.team':
      return [
        { value: 'product_dev', label: 'Product Development' },
        { value: 'core', label: 'Core Platform' },
        { value: 'qa', label: 'Quality Engineering' },
      ];
    case 'general.designation':
      return [
        { value: 'se', label: 'Software Engineer' },
        { value: 'sse', label: 'Senior Software Engineer' },
        { value: 'lead', label: 'Technical Lead' },
      ];
    case 'general.gradeLevel':
      return [
        { value: 'l1', label: 'L1 - Associate' },
        { value: 'l2', label: 'L2 - Mid Level' },
        { value: 'l3', label: 'L3 - Senior' },
      ];
    case 'general.reportingManager':
      return [
        { value: 'mgr1', label: 'Rakesh Kumar' },
        { value: 'mgr2', label: 'Priya Sharma' },
      ];
    case 'general.organisationUnit':
      return [
        { value: 'tech', label: 'Technology' },
        { value: 'operations', label: 'Operations' },
      ];
    case 'general.officeLocation':
      return [
        { value: 'chennai', label: 'Chennai - Main Office' },
        { value: 'blr', label: 'Bengaluru - Tech Hub' },
      ];
    case 'personal.gender':
      return [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'non_binary', label: 'Non-binary' },
      ];
    case 'personal.maritalStatus':
      return [
        { value: 'single', label: 'Single' },
        { value: 'married', label: 'Married' },
      ];
    case 'personal.bloodGroup':
      return [
        { value: 'o_pos', label: 'O+ Positive' },
        { value: 'a_pos', label: 'A+ Positive' },
        { value: 'b_pos', label: 'B+ Positive' },
        { value: 'ab_pos', label: 'AB+ Positive' },
      ];
    case 'personal.country':
      return [
        { value: 'in', label: 'India' },
        { value: 'us', label: 'United States' },
        { value: 'ae', label: 'United Arab Emirates' },
      ];
    case 'personal.city':
      return [
        { value: 'chennai', label: 'Chennai' },
        { value: 'bengaluru', label: 'Bengaluru' },
        { value: 'mumbai', label: 'Mumbai' },
      ];
    default:
      return [
        { value: 'opt1', label: 'Option 1' },
        { value: 'opt2', label: 'Option 2' },
      ];
  }
}

export function CanvasFieldControl({ field }: { field: ResolvedFormField }) {
  if (field.key === 'general.employeeId') {
    return (
      <Input
        size="sm"
        readOnly
        value="EMP2026001"
        placeholder="EMP2026001"
        rightIcon={
          <Button variant="secondary" size="sm" type="button" tabIndex={-1}>
            Auto
          </Button>
        }
      />
    );
  }

  switch (field.type) {
    case 'dropdown':
    case 'select':
    case 'reference': {
      const opts = field.config?.options?.length
        ? field.config.options
        : getSampleOptionsForField(field.key);
      return (
        <Select
          size="sm"
          options={opts}
          value={opts[0]?.value ?? ''}
          tabIndex={-1}
          onChange={() => {}}
        />
      );
    }
    case 'checkbox':
      return <Checkbox label={field.label} checked={false} tabIndex={-1} onChange={() => {}} />;
    case 'radio': {
      const opts = field.config?.options?.length
        ? field.config.options.slice(0, 3)
        : [
            { value: 'opt1', label: 'Option 1' },
            { value: 'opt2', label: 'Option 2' },
          ];
      return (
        <Inline gap="md" align="center">
          {opts.map((opt, idx) => (
            <Inline key={idx} gap="xs" align="center">
              <input type="radio" checked={idx === 0} readOnly tabIndex={-1} />
              <Label as="span" size="sm">
                {opt.label}
              </Label>
            </Inline>
          ))}
        </Inline>
      );
    }
    case 'multi_select': {
      const opts = field.config?.options?.length
        ? field.config.options
        : [{ value: 'all', label: 'Select multiple items...' }];
      return <Select size="sm" options={opts} value="" tabIndex={-1} onChange={() => {}} />;
    }
    case 'date':
    case 'time':
    case 'datetime':
      return (
        <Input
          size="sm"
          readOnly
          value=""
          placeholder={field.type === 'date' ? 'YYYY-MM-DD' : field.type.toUpperCase()}
          leftIcon={<BezentIcon name="calendar" size={14} />}
          tabIndex={-1}
        />
      );
    case 'file_upload':
      return (
        <div className="bezent-canvas-file-preview">
          <BezentIcon name="documents" size={16} />
          <span>Upload file (max {field.config?.maxSizeMb ?? 10} MB)</span>
        </div>
      );
    default:
      return (
        <Input
          size="sm"
          readOnly
          value=""
          placeholder={
            field.type === 'email'
              ? 'name@company.com'
              : field.type === 'phone'
                ? '+91 98765 43210'
                : field.description ?? `Enter ${field.label}...`
          }
          tabIndex={-1}
        />
      );
  }
}

interface DraggableCanvasFieldProps {
  field: ResolvedFormField;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function DraggableCanvasField({
  field,
  isSelected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
}: DraggableCanvasFieldProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `field-${field.key}`,
    data: {
      isField: true,
      fieldKey: field.key,
    },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `drop-field-${field.key}`,
    data: {
      isField: true,
      fieldKey: field.key,
    },
  });

  // UI-RULES Rule 1 exception: live runtime transform during drag
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.4 : 1,
        zIndex: 50,
      }
    : undefined;

  const labelNode = (
    <Inline gap="xs" align="center">
      <span>{field.label}</span>
      {field.required && (
        <span className="bezent-label__required" aria-hidden="true">
          *
        </span>
      )}
      {!field.enabled && (
        <Badge variant="neutral" size="sm">
          Disabled
        </Badge>
      )}
    </Inline>
  );

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        setDropRef(el);
      }}
      // eslint-disable-next-line no-restricted-syntax
      style={dragStyle}
      className={`bezent-canvas-field-wrapper ${isSelected ? 'is-selected' : ''}`.trim()}
    >
      <FormField
        labelNode={labelNode}
        selectable
        selected={isSelected}
        span={field.width === 'full' ? 'full' : 1}
        helperText={field.description ?? undefined}
        onClick={onSelect}
      >
        <CanvasFieldControl field={field} />
      </FormField>

      {isSelected && (
        <div className="bezent-canvas-field-toolbar" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="bezent-canvas-field-handle"
            {...listeners}
            {...attributes}
            title="Drag to reorder"
            aria-label="Drag handle"
            tabIndex={0}
          >
            <BezentIcon name="more" size={14} />
          </button>
          <button
            type="button"
            className="bezent-canvas-field-btn"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            title="Move up"
            aria-label="Move up"
          >
            <BezentIcon name="chevronUp" size={12} />
          </button>
          <button
            type="button"
            className="bezent-canvas-field-btn"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            title="Move down"
            aria-label="Move down"
          >
            <BezentIcon name="chevronDown" size={12} />
          </button>
          {field.origin === 'custom' && (
            <button
              type="button"
              className="bezent-canvas-field-btn bezent-canvas-field-btn--danger"
              onClick={onDelete}
              title="Delete custom field"
              aria-label="Delete field"
            >
              <BezentIcon name="delete" size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FormCanvas({
  sections,
  activeSectionKey,
  selectedFieldKey,
  onSelectSection,
  onSelectField,
  onMoveField,
  onDeleteField,
}: FormCanvasProps) {
  // Determine effective active section key
  const effectiveSectionKey =
    activeSectionKey ||
    sections.find((s) => s.fields.some((f) => f.key === selectedFieldKey))?.key ||
    sections.find((s) => s.configurable)?.key ||
    sections[0]?.key ||
    'general';

  const currentSection =
    sections.find((s) => s.key === effectiveSectionKey) ??
    sections.find((s) => s.configurable) ??
    sections[0];

  const chapterMeta: ChapterDefinition =
    CHAPTER_METADATA.find((c) => c.key === effectiveSectionKey) || {
      key: effectiveSectionKey,
      stepNumber: '01',
      label: currentSection?.label || 'General',
      title: (currentSection?.label || 'GENERAL INFORMATION').toUpperCase(),
      description: 'Registration form attributes and layout configuration',
      kicker: 'CHAPTER // 01',
    };

  // Droppable container for active section
  const { setNodeRef } = useDroppable({
    id: `section-${effectiveSectionKey}`,
    data: {
      sectionKey: effectiveSectionKey,
    },
  });

  const sectionFields = currentSection?.fields ?? [];
  const groups = currentSection ? getGroupsForSection(currentSection.key, sectionFields) : [];

  return (
    <Pane size="fluid" surface="canvas" aria-label="Form Canvas">
      {/* 1. Section Selector Bar */}
      <div className="bezent-canvas-section-bar">
        <div className="bezent-canvas-section-selector">
          <Label as="span" size="sm">
            <strong>Section</strong>
          </Label>
          <div className="bezent-canvas-section-select-wrap">
            <Select
              size="sm"
              value={effectiveSectionKey}
              onChange={(e) => onSelectSection?.(e.target.value)}
              options={sections.map((s) => {
                const meta = CHAPTER_METADATA.find((c) => c.key === s.key);
                return {
                  value: s.key,
                  label: meta?.label ?? s.label,
                };
              })}
            />
          </div>
        </div>

        <div className="bezent-canvas-section-meta">
          <Badge variant={currentSection?.configurable ? 'success' : 'neutral'} size="sm">
            {currentSection?.configurable ? 'Configurable Form' : 'Standard Workflow'}
          </Badge>
          <Badge variant="neutral" size="sm">
            {sectionFields.length} {sectionFields.length === 1 ? 'field' : 'fields'}
          </Badge>
        </div>
      </div>

      {/* 2. Scrollable Canvas Body */}
      <div className="bezent-canvas-body" ref={setNodeRef}>
        <div className="bezent-canvas-paper">
          {/* Section Header */}
          <div className="bezent-canvas-header-clean">
            <h2 className="bezent-canvas-title-clean">{chapterMeta.title}</h2>
            <p className="bezent-canvas-desc-clean">{chapterMeta.description}</p>
          </div>

          {/* Form Content: Actual Registration Appearance */}
          {currentSection && currentSection.configurable ? (
            sectionFields.length === 0 ? (
              <EmptyState
                size="compact"
                hideIllustration
                title="No fields in section"
                description="Click or drag fields from the Field Toolbox on the left to add them to this section."
              />
            ) : (
              <Stack gap="xl">
                {groups.map((group) => (
                  <FormSection
                    key={group.key}
                    title={group.title}
                    description={group.description}
                  >
                    <FormGrid columns={2} layout="horizontal" labelWidth="md">
                      {group.fields.map((field) => {
                        const globalIdx = sectionFields.findIndex((f) => f.key === field.key);
                        return (
                          <DraggableCanvasField
                            key={field.key}
                            field={field}
                            isSelected={selectedFieldKey === field.key}
                            canMoveUp={globalIdx > 0}
                            canMoveDown={globalIdx < sectionFields.length - 1}
                            onSelect={() => onSelectField(field.key)}
                            onMoveUp={() => onMoveField(field.key, 'up')}
                            onMoveDown={() => onMoveField(field.key, 'down')}
                            onDelete={() => onDeleteField(field.key)}
                          />
                        );
                      })}
                    </FormGrid>
                  </FormSection>
                ))}
              </Stack>
            )
          ) : (
            <Stack gap="md">
              {sectionFields.length > 0 && (
                <FormSection
                  title={`${chapterMeta.label.toUpperCase()} FIELDS`}
                  description="Standard platform attributes defined for this chapter"
                >
                  <FormGrid columns={2} layout="horizontal" labelWidth="md">
                    {sectionFields.map((field, idx) => (
                      <DraggableCanvasField
                        key={field.key}
                        field={field}
                        isSelected={selectedFieldKey === field.key}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < sectionFields.length - 1}
                        onSelect={() => onSelectField(field.key)}
                        onMoveUp={() => onMoveField(field.key, 'up')}
                        onMoveDown={() => onMoveField(field.key, 'down')}
                        onDelete={() => onDeleteField(field.key)}
                      />
                    ))}
                  </FormGrid>
                </FormSection>
              )}

              <EmptyState
                size="compact"
                hideIllustration
                title="Standard Platform Chapter"
                description="This registration chapter executes a predefined platform workflow. Form customization, layout editing, and custom field assignment are supported for General and Personal Information chapters."
              />
            </Stack>
          )}
        </div>
      </div>
    </Pane>
  );
}

