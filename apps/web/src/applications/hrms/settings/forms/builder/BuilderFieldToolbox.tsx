import React, { useState, useMemo } from 'react';
import { BezentIcon, type BezentIconName } from '../../../../../design-system/icons';
import type { CustomFieldType } from '../../api/formsApi';

export type ToolboxCategory = 'all' | 'basic' | 'choices' | 'media' | 'compound' | 'advanced';

export interface ToolboxFieldItem {
  type: CustomFieldType;
  label: string;
  category: 'basic' | 'choices' | 'media' | 'compound' | 'advanced';
  icon: BezentIconName;
  hint: string;
}

export const TOOLBOX_FIELDS: ToolboxFieldItem[] = [
  // ── 1. Basic Text & Numbers ──
  {
    type: 'single_line',
    label: 'Single Line Text',
    category: 'basic',
    icon: 'document',
    hint: 'Short text input',
  },
  {
    type: 'multi_line',
    label: 'Multi Line Text',
    category: 'basic',
    icon: 'notes',
    hint: 'Paragraph or comments',
  },
  {
    type: 'number',
    label: 'Number',
    category: 'basic',
    icon: 'hashtag',
    hint: 'Integer numeric value',
  },
  {
    type: 'decimal',
    label: 'Decimal / Currency',
    category: 'basic',
    icon: 'hashtag',
    hint: 'Amounts and decimals',
  },
  {
    type: 'email',
    label: 'Email Address',
    category: 'basic',
    icon: 'notifications',
    hint: 'Email with format validation',
  },
  {
    type: 'phone',
    label: 'Phone Number',
    category: 'basic',
    icon: 'profile',
    hint: 'International phone input',
  },
  {
    type: 'website',
    label: 'Website / URL',
    category: 'basic',
    icon: 'globe',
    hint: 'URL link or portfolio',
  },
  {
    type: 'date',
    label: 'Date Picker',
    category: 'basic',
    icon: 'calendar',
    hint: 'Calendar date picker',
  },
  {
    type: 'time',
    label: 'Time Picker',
    category: 'basic',
    icon: 'clock',
    hint: 'Time of day input',
  },
  {
    type: 'datetime',
    label: 'Date & Time',
    category: 'basic',
    icon: 'calendar',
    hint: 'Combined date and time',
  },

  // ── 2. Choices & Selections ──
  {
    type: 'dropdown',
    label: 'Dropdown List',
    category: 'choices',
    icon: 'list',
    hint: 'Select one from options',
  },
  {
    type: 'multi_select',
    label: 'Multi-Select',
    category: 'choices',
    icon: 'checklist',
    hint: 'Select multiple items',
  },
  {
    type: 'radio',
    label: 'Radio Choices',
    category: 'choices',
    icon: 'checkmark',
    hint: 'Single visible choice',
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    category: 'choices',
    icon: 'checklist',
    hint: 'Boolean or single check',
  },
  {
    type: 'toggle_switch',
    label: 'Toggle Switch',
    category: 'choices',
    icon: 'settings',
    hint: 'Smooth ON/OFF switch',
  },

  // ── 3. Media & Attachments ──
  {
    type: 'file_upload',
    label: 'File Upload',
    category: 'media',
    icon: 'documents',
    hint: 'Documents (PDF/DOC)',
  },
  {
    type: 'image_upload',
    label: 'Image Upload',
    category: 'media',
    icon: 'user',
    hint: 'Profile photo (JPG/PNG)',
  },
  {
    type: 'signature',
    label: 'Digital Signature',
    category: 'media',
    icon: 'edit',
    hint: 'E-signature sign pad',
  },

  // ── 4. Compound Structured Blocks ──
  {
    type: 'address',
    label: 'Complete Address Block',
    category: 'compound',
    icon: 'location',
    hint: 'Street, City, State, PIN, Country',
  },
  {
    type: 'full_name',
    label: 'Full Name Block',
    category: 'compound',
    icon: 'profile',
    hint: 'Title, First, Middle, Last',
  },
  {
    type: 'govt_id',
    label: 'Government / Masked ID',
    category: 'compound',
    icon: 'document',
    hint: 'Formatted ID (Aadhaar, PAN, SSN)',
  },

  // ── 5. Interactive & Layout Tools ──
  {
    type: 'rating',
    label: 'Star / Number Rating',
    category: 'advanced',
    icon: 'star',
    hint: '1 to 5 Stars scale',
  },
  {
    type: 'slider',
    label: 'Range Slider',
    category: 'advanced',
    icon: 'settings',
    hint: 'Draggable numeric slider',
  },
  {
    type: 'tags',
    label: 'Tags / Chips Input',
    category: 'advanced',
    icon: 'list',
    hint: 'Keywords and software skills',
  },
  {
    type: 'divider',
    label: 'Section Divider',
    category: 'advanced',
    icon: 'minus',
    hint: 'Visual group separator line',
  },
  {
    type: 'info_banner',
    label: 'Information Banner',
    category: 'advanced',
    icon: 'info',
    hint: 'Guidance or policy note box',
  },
  {
    type: 'terms_consent',
    label: 'Terms & Policy Consent',
    category: 'advanced',
    icon: 'checklist',
    hint: 'Mandatory agreement checkbox',
  },
  {
    type: 'calculated',
    label: 'Calculated Field',
    category: 'advanced',
    icon: 'hashtag',
    hint: 'Formula-based auto computation',
  },
  {
    type: 'matrix_grid',
    label: 'Rating Grid / Matrix',
    category: 'advanced',
    icon: 'table',
    hint: 'Rows & Columns evaluation',
  },
];

export interface BuilderFieldToolboxProps {
  onAddField: (type: CustomFieldType, label: string) => void;
  activeSectionLabel?: string;
}

export function BuilderFieldToolbox({ onAddField, activeSectionLabel }: BuilderFieldToolboxProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ToolboxCategory>('all');

  const filteredFields = useMemo(() => {
    return TOOLBOX_FIELDS.filter((f) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        f.label.toLowerCase().includes(query) ||
        f.hint.toLowerCase().includes(query) ||
        f.type.toLowerCase().includes(query);
      const matchesTab = activeTab === 'all' || f.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [search, activeTab]);

  const basicFields = useMemo(
    () => filteredFields.filter((f) => f.category === 'basic' || f.category === 'choices'),
    [filteredFields],
  );

  const advancedFields = useMemo(
    () => filteredFields.filter((f) => f.category !== 'basic' && f.category !== 'choices'),
    [filteredFields],
  );

  const renderFieldButton = (field: ToolboxFieldItem) => (
    <button
      key={field.type + field.label}
      type="button"
      className="bezent-cif-toolbox__item"
      onClick={() => onAddField(field.type, field.label)}
      title={`${field.label}: ${field.hint}`}
    >
      <div className="bezent-cif-toolbox__item-left">
        <span className="bezent-cif-toolbox__item-icon">
          <BezentIcon name={field.icon} size={15} />
        </span>
        <div className="bezent-cif-toolbox__item-text">
          <span className="bezent-cif-toolbox__item-label">{field.label}</span>
        </div>
      </div>
    </button>
  );

  return (
    <aside className="bezent-cif-toolbox" aria-label="Field Toolbox">
      <div className="bezent-cif-toolbox__header">
        <div className="bezent-cif-toolbox__header-row">
          <h2 className="bezent-cif-toolbox__title">Basic fields</h2>
          <span className="bezent-sr-only">Field Toolbox</span>
          <span className="bezent-cif-toolbox__count-badge">{TOOLBOX_FIELDS.length}</span>
        </div>
        {activeSectionLabel && (
          <span
            className="bezent-cif-toolbox__target-hint"
            title={`Adding to: ${activeSectionLabel}`}
          >
            Target: <strong>{activeSectionLabel}</strong>
          </span>
        )}
      </div>

      {/* Search Input */}
      <div className="bezent-cif-toolbox__search-wrap">
        <BezentIcon name="search" size={14} />
        <input
          type="text"
          className="bezent-cif-toolbox__search-input"
          placeholder="Filter fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Filter available form fields"
        />
        {search && (
          <button
            type="button"
            className="bezent-cif-toolbox__search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear filter"
          >
            <BezentIcon name="close" size={12} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bezent-cif-toolbox__tabs">
        <button
          type="button"
          className={`bezent-cif-toolbox__tab ${activeTab === 'all' ? 'bezent-cif-toolbox__tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`bezent-cif-toolbox__tab ${activeTab === 'basic' ? 'bezent-cif-toolbox__tab--active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic
        </button>
        <button
          type="button"
          className={`bezent-cif-toolbox__tab ${activeTab === 'advanced' ? 'bezent-cif-toolbox__tab--active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>

      {/* Fields List */}
      <div className="bezent-cif-toolbox__list">
        {basicFields.length > 0 && (
          <div className="bezent-cif-toolbox__group">
            <h3 className="bezent-cif-toolbox__group-title">Basic Fields</h3>
            {basicFields.map((field) => renderFieldButton(field))}
          </div>
        )}

        {advancedFields.length > 0 && (
          <div className="bezent-cif-toolbox__group">
            <h3 className="bezent-cif-toolbox__group-title">Advanced Fields</h3>
            {advancedFields.map((field) => renderFieldButton(field))}
          </div>
        )}

        {filteredFields.length === 0 && (
          <div className="bezent-cif-toolbox__empty">No tools matching &quot;{search}&quot;</div>
        )}
      </div>

      <div className="bezent-cif-toolbox__footer">Click any tool to add</div>
    </aside>
  );
}

export default BuilderFieldToolbox;
