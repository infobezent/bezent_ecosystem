import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import { useCustomFields } from '../context/CustomFieldsContext';
import type { OnboardingFieldConfig } from '../types/settingsCenter';

export function OnboardingBuilderSection() {
  const {
    sections,
    cards,
    fields,
    addSection,
    toggleHideSection,
    reorderSection,
    deleteSection,
    renameSection,
    addCard,
    renameCard,
    reorderCard,
    deleteCard,
    addField,
    updateField,
    deleteField,
  } = useCustomFields();

  const [selectedSectionId, setSelectedSectionId] = useState<string>('general');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  // Card modal & edit state
  const [showCardModal, setShowCardModal] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');

  // Field modal state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [selectedTargetCardId, setSelectedTargetCardId] = useState<string>('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'select' | 'date' | 'number' | 'file'>(
    'text',
  );
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldReadOnly, setFieldReadOnly] = useState(false);
  const [fieldDefaultValue, setFieldDefaultValue] = useState('');
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'card' | 'field';
    id: string;
    title: string;
  } | null>(null);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSectionId, setPreviewSectionId] = useState<string>('general');

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const currentCards = cards.filter((c) => c.sectionId === selectedSectionId);

  // Section handlers
  const handleAddSection = () => {
    const title = prompt('Enter new section title:');
    if (title && title.trim()) {
      addSection(title.trim());
    }
  };

  const handleSaveSectionRename = (id: string) => {
    if (editingSectionTitle.trim()) {
      renameSection(id, editingSectionTitle.trim());
    }
    setEditingSectionId(null);
  };

  // Card handlers
  const handleOpenAddCard = () => {
    setNewCardTitle('');
    setShowCardModal(true);
  };

  const handleCreateCard = () => {
    if (!newCardTitle.trim()) return;
    const createdId = addCard(selectedSectionId, newCardTitle.trim());
    setShowCardModal(false);
    setSelectedTargetCardId(createdId);
  };

  const handleSaveCardRename = (cardId: string) => {
    if (editingCardTitle.trim()) {
      renameCard(cardId, editingCardTitle.trim());
    }
    setEditingCardId(null);
  };

  // Field handlers
  const handleOpenAddField = (preselectedCardId?: string) => {
    setEditingFieldId(null);
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldReadOnly(false);
    setFieldDefaultValue('');
    setFieldOptions([]);
    const defaultCard = preselectedCardId || currentCards[0]?.id || '';
    setSelectedTargetCardId(defaultCard);
    setShowFieldModal(true);
  };

  const handleOpenEditField = (f: OnboardingFieldConfig) => {
    setEditingFieldId(f.id);
    setSelectedTargetCardId(f.cardId);
    setFieldLabel(f.label);
    setFieldType(f.fieldType);
    setFieldRequired(f.required);
    setFieldReadOnly(f.readOnly);
    setFieldDefaultValue(f.defaultValue || '');
    setFieldOptions(f.options || []);
    setShowFieldModal(true);
  };

  const handleSaveField = () => {
    if (!fieldLabel.trim()) return;
    const targetCardId = selectedTargetCardId || currentCards[0]?.id || '';

    if (editingFieldId) {
      updateField(editingFieldId, {
        cardId: targetCardId,
        sectionId: selectedSectionId,
        label: fieldLabel.trim(),
        fieldType,
        required: fieldRequired,
        readOnly: fieldReadOnly,
        defaultValue: fieldDefaultValue,
        options: fieldType === 'select' ? fieldOptions : undefined,
      });
    } else {
      addField({
        sectionId: selectedSectionId,
        cardId: targetCardId,
        label: fieldLabel.trim(),
        fieldType,
        required: fieldRequired,
        readOnly: fieldReadOnly,
        defaultValue: fieldDefaultValue,
        options: fieldType === 'select' ? fieldOptions : undefined,
        isCustom: true,
      });
    }
    setShowFieldModal(false);
  };

  const handleAddOption = () => {
    if (!newOptionInput.trim()) return;
    setFieldOptions((prev) => [...prev, newOptionInput.trim()]);
    setNewOptionInput('');
  };

  const handleDeleteOption = (idx: number) => {
    setFieldOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Delete confirmations
  const handleConfirmDelete = () => {
    if (!deleteConfirmation) return;
    if (deleteConfirmation.type === 'card') {
      deleteCard(deleteConfirmation.id);
    } else {
      deleteField(deleteConfirmation.id);
    }
    setDeleteConfirmation(null);
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">Administration Customization Builder</h2>
          <p className="settings-section__subtitle">
            Configure employee registration sections, content cards/groups, add custom fields, and
            preview the form.
          </p>
        </div>
        <div className="settings-action-row">
          <Button type="button" onClick={() => setShowPreviewModal(true)}>
            <BezentIcon name="edit" size={16} />
            Preview Form
          </Button>
        </div>
      </div>

      <div className="builder-layout">
        {/* Left Column: Sections List */}
        <div className="builder-sidebar">
          <div className="builder-sidebar__header">
            <h3 className="builder-sidebar__title">Sections ({sections.length})</h3>
            <Button type="button" onClick={handleAddSection}>
              + Add Section
            </Button>
          </div>
          <ul className="builder-section-list">
            {sections.map((sec, index) => (
              <li
                key={sec.id}
                className={`builder-section-item ${
                  selectedSectionId === sec.id ? 'builder-section-item--active' : ''
                } ${sec.hidden ? 'builder-section-item--hidden' : ''}`}
                onClick={() => setSelectedSectionId(sec.id)}
              >
                <div className="builder-section-item__title-area">
                  {editingSectionId === sec.id ? (
                    <input
                      className="settings-input settings-input--sm"
                      value={editingSectionTitle}
                      onChange={(e) => setEditingSectionTitle(e.target.value)}
                      onBlur={() => handleSaveSectionRename(sec.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveSectionRename(sec.id)}
                      autoFocus
                    />
                  ) : (
                    <span className="builder-section-item__name">
                      {index + 1}. {sec.title}
                    </span>
                  )}
                  {sec.hidden && (
                    <span className="settings-badge settings-badge--muted">Hidden</span>
                  )}
                </div>

                <div className="builder-section-item__actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    title={sec.hidden ? 'Show Section' : 'Hide Section'}
                    className="builder-icon-btn"
                    onClick={() => toggleHideSection(sec.id)}
                  >
                    <BezentIcon name={sec.hidden ? 'close' : 'checkMark'} size={14} />
                  </button>
                  <button
                    type="button"
                    title="Move Up"
                    disabled={index === 0}
                    className="builder-icon-btn"
                    onClick={() => reorderSection(index, 'up')}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    title="Move Down"
                    disabled={index === sections.length - 1}
                    className="builder-icon-btn"
                    onClick={() => reorderSection(index, 'down')}
                  >
                    ▼
                  </button>
                  {sec.isCustom && (
                    <button
                      type="button"
                      title="Delete Section"
                      className="builder-icon-btn builder-icon-btn--danger"
                      onClick={() => deleteSection(sec.id)}
                    >
                      <BezentIcon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Cards & Fields in Selected Section */}
        <div className="builder-content">
          <div className="builder-content__header">
            <div>
              <h3 className="builder-content__title">
                {selectedSection?.title} Cards &amp; Fields
              </h3>
              <p className="builder-content__desc">
                Manage content cards/groups and fields for this registration section.
              </p>
            </div>
            <div className="builder-content__actions">
              <Button type="button" onClick={handleOpenAddCard}>
                + Create New Card
              </Button>
              <Button type="button" onClick={() => handleOpenAddField()}>
                + Add Field
              </Button>
            </div>
          </div>

          {currentCards.length === 0 ? (
            <div className="settings-empty-box">
              <p>No cards configured for {selectedSection?.title}.</p>
              <Button type="button" onClick={handleOpenAddCard}>
                + Create First Card
              </Button>
            </div>
          ) : (
            <div className="builder-cards-stack">
              {currentCards.map((card, cIndex) => {
                const cardFields = fields.filter((f) => f.cardId === card.id);
                return (
                  <div key={card.id} className="builder-card-container">
                    {/* Card Header */}
                    <div className="builder-card-container__header">
                      <div className="builder-card-container__title-area">
                        {editingCardId === card.id ? (
                          <input
                            className="settings-input settings-input--sm"
                            value={editingCardTitle}
                            onChange={(e) => setEditingCardTitle(e.target.value)}
                            onBlur={() => handleSaveCardRename(card.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveCardRename(card.id)}
                            autoFocus
                          />
                        ) : (
                          <h4 className="builder-card-container__title">{card.title}</h4>
                        )}
                        <span
                          className={`settings-badge ${
                            card.isCustom ? 'settings-badge--info' : 'settings-badge--muted'
                          }`}
                        >
                          {card.isCustom ? 'Custom Card' : 'System Card'}
                        </span>
                      </div>

                      <div className="builder-card-container__actions">
                        <button
                          type="button"
                          className="builder-text-btn"
                          onClick={() => {
                            setEditingCardId(card.id);
                            setEditingCardTitle(card.title);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          disabled={cIndex === 0}
                          className="builder-icon-btn"
                          onClick={() => reorderCard(selectedSectionId, cIndex, 'up')}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={cIndex === currentCards.length - 1}
                          className="builder-icon-btn"
                          onClick={() => reorderCard(selectedSectionId, cIndex, 'down')}
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="builder-text-btn builder-text-btn--primary"
                          onClick={() => handleOpenAddField(card.id)}
                        >
                          + Add Field to Card
                        </button>
                        {card.isCustom && (
                          <button
                            type="button"
                            className="builder-icon-btn builder-icon-btn--danger"
                            title="Delete Custom Card"
                            onClick={() =>
                              setDeleteConfirmation({
                                type: 'card',
                                id: card.id,
                                title: card.title,
                              })
                            }
                          >
                            <BezentIcon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Fields Grid */}
                    <div className="builder-field-grid">
                      {cardFields.length === 0 ? (
                        <div className="settings-empty-subbox">
                          <p>No fields in this card yet.</p>
                          <button
                            type="button"
                            className="builder-text-btn builder-text-btn--primary"
                            onClick={() => handleOpenAddField(card.id)}
                          >
                            + Add Field
                          </button>
                        </div>
                      ) : (
                        cardFields.map((f) => (
                          <div key={f.id} className="builder-field-card">
                            <div className="builder-field-card__top">
                              <div>
                                <h5 className="builder-field-card__label">{f.label}</h5>
                                <span className="settings-badge">{f.fieldType}</span>
                              </div>
                              <div className="builder-field-card__badges">
                                {f.required && (
                                  <span className="settings-badge settings-badge--req">
                                    Required
                                  </span>
                                )}
                                {f.readOnly && (
                                  <span className="settings-badge settings-badge--info">
                                    Read Only
                                  </span>
                                )}
                              </div>
                            </div>

                            {f.fieldType === 'select' && f.options && (
                              <div className="builder-field-card__options">
                                <strong>Dropdown Options ({f.options.length}):</strong>
                                <span>{f.options.join(', ')}</span>
                              </div>
                            )}

                            <div className="builder-field-card__footer">
                              <Button type="button" onClick={() => handleOpenEditField(f)}>
                                Edit Field
                              </Button>
                              <Button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmation({
                                    type: 'field',
                                    id: f.id,
                                    title: f.label,
                                  })
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create New Card Modal */}
      {showCardModal && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal">
            <div className="settings-modal__header">
              <h3>Create New Card / Content Group</h3>
              <button
                type="button"
                className="settings-modal__close"
                onClick={() => setShowCardModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="settings-modal__body">
              <div className="settings-field-group">
                <label className="settings-label">Target Section</label>
                <input
                  type="text"
                  className="settings-input settings-input--disabled"
                  value={selectedSection?.title || ''}
                  disabled
                />
              </div>
              <div className="settings-field-group">
                <label className="settings-label">Card / Group Name *</label>
                <input
                  type="text"
                  className="settings-input"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="e.g. Government Identification"
                  autoFocus
                />
              </div>
            </div>
            <div className="settings-modal__footer">
              <Button type="button" onClick={() => setShowCardModal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateCard}>
                Create Card
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Field Modal */}
      {showFieldModal && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal">
            <div className="settings-modal__header">
              <h3>{editingFieldId ? 'Edit Field' : 'Add Field'}</h3>
              <button
                type="button"
                className="settings-modal__close"
                onClick={() => setShowFieldModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="settings-modal__body">
              <div className="settings-field-group">
                <label className="settings-label">Target Section</label>
                <input
                  type="text"
                  className="settings-input settings-input--disabled"
                  value={selectedSection?.title || ''}
                  disabled
                />
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Add to Existing Card *</label>
                <select
                  className="settings-input"
                  value={selectedTargetCardId}
                  onChange={(e) => setSelectedTargetCardId(e.target.value)}
                >
                  {currentCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Field Label *</label>
                <input
                  type="text"
                  className="settings-input"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="e.g. Aadhaar Number"
                />
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Field Type</label>
                <select
                  className="settings-input"
                  value={fieldType}
                  onChange={(e) =>
                    setFieldType(e.target.value as 'text' | 'select' | 'date' | 'number' | 'file')
                  }
                >
                  <option value="text">Text Input</option>
                  <option value="select">Dropdown Select</option>
                  <option value="date">Date Picker</option>
                  <option value="number">Numeric</option>
                  <option value="file">Document / File Upload</option>
                </select>
              </div>

              <div className="settings-field-row">
                <label className="settings-checkbox-label">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                  />
                  Required Field
                </label>
                <label className="settings-checkbox-label">
                  <input
                    type="checkbox"
                    checked={fieldReadOnly}
                    onChange={(e) => setFieldReadOnly(e.target.checked)}
                  />
                  Read Only
                </label>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Default Value (Optional)</label>
                <input
                  type="text"
                  className="settings-input"
                  value={fieldDefaultValue}
                  onChange={(e) => setFieldDefaultValue(e.target.value)}
                />
              </div>

              {fieldType === 'select' && (
                <div className="settings-field-group">
                  <label className="settings-label">Dropdown Options</label>
                  <div className="dropdown-options-builder">
                    <div className="dropdown-input-row">
                      <input
                        type="text"
                        className="settings-input"
                        placeholder="e.g. Option A, Option B"
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                      />
                      <Button type="button" onClick={handleAddOption}>
                        + Add Option
                      </Button>
                    </div>
                    <ul className="dropdown-option-tag-list">
                      {fieldOptions.map((opt, idx) => (
                        <li key={idx} className="dropdown-option-tag">
                          <span>{opt}</span>
                          <button type="button" onClick={() => handleDeleteOption(idx)}>
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div className="settings-modal__footer">
              <Button type="button" onClick={() => setShowFieldModal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveField}>
                Save Field
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal">
            <div className="settings-modal__header">
              <h3>Confirm Deletion</h3>
              <button
                type="button"
                className="settings-modal__close"
                onClick={() => setDeleteConfirmation(null)}
              >
                ✕
              </button>
            </div>
            <div className="settings-modal__body">
              <p>
                Are you sure you want to delete the {deleteConfirmation.type}{' '}
                <strong>&quot;{deleteConfirmation.title}&quot;</strong>?
              </p>
              <p className="text-muted">
                This action will remove it from the Customization Builder, Form Preview, and actual
                Employee Registration page.
              </p>
            </div>
            <div className="settings-modal__footer">
              <Button type="button" onClick={() => setDeleteConfirmation(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmDelete}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Complete 10-Section Form Preview Modal */}
      {showPreviewModal && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal settings-modal--large">
            <div className="settings-modal__header">
              <h3>Employee Registration Form Preview</h3>
              <button
                type="button"
                className="settings-modal__close"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="settings-modal__body">
              {/* Tab Navigation for all 10 registration sections */}
              <div className="preview-nav-tabs">
                {sections
                  .filter((s) => !s.hidden)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`preview-nav-tab ${
                        previewSectionId === s.id ? 'preview-nav-tab--active' : ''
                      }`}
                      onClick={() => setPreviewSectionId(s.id)}
                    >
                      {s.title}
                    </button>
                  ))}
              </div>

              {/* Complete Section Preview displaying Card -> Field Hierarchy */}
              <div className="preview-form-box">
                <h4>
                  {sections.find((s) => s.id === previewSectionId)?.title || 'Registration Section'}
                </h4>
                {cards
                  .filter((c) => c.sectionId === previewSectionId)
                  .map((c) => {
                    const cardFields = fields.filter((f) => f.cardId === c.id);
                    return (
                      <div key={c.id} className="preview-card-group">
                        <h5 className="preview-card-title">{c.title}</h5>
                        <div className="preview-form-grid">
                          {cardFields.map((f) => (
                            <div key={f.id} className="preview-field-item">
                              <label>
                                {f.label} {f.required && <span className="req-star">*</span>}{' '}
                                {f.isCustom && (
                                  <span className="settings-badge settings-badge--info">
                                    Custom
                                  </span>
                                )}
                              </label>
                              {f.fieldType === 'select' ? (
                                <select className="settings-input" disabled={f.readOnly}>
                                  <option value="">Select {f.label}</option>
                                  {f.options?.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : f.fieldType === 'file' ? (
                                <input
                                  type="file"
                                  className="settings-input"
                                  disabled={f.readOnly}
                                />
                              ) : (
                                <input
                                  type={
                                    f.fieldType === 'date'
                                      ? 'date'
                                      : f.fieldType === 'number'
                                        ? 'number'
                                        : 'text'
                                  }
                                  className="settings-input"
                                  placeholder={f.defaultValue || `Enter ${f.label}`}
                                  disabled={f.readOnly}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="settings-modal__footer">
              <Button type="button" onClick={() => setShowPreviewModal(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
