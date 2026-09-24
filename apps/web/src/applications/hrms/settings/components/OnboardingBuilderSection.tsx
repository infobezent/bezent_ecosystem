import { useState } from 'react';
import {
  Button,
  Card,
  Badge,
  Grid,
  Input,
  Select,
  Switch,
  Modal,
  Tabs,
  Toolbar,
  Actions,
  Stack,
  Inline,
  EmptyState,
  FormGrid,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useCustomFields } from '../context/CustomFieldsContext';
import type { OnboardingFieldConfig } from '../types/settingsCenter';

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text Input' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'date', label: 'Date Picker' },
  { value: 'number', label: 'Numeric' },
  { value: 'file', label: 'Document / File Upload' },
];

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
  const [editingTargetSectionId, setEditingTargetSectionId] = useState<string>('general');
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

  // Inline card & section creation inside Field modal
  const [showInlineCardModal, setShowInlineCardModal] = useState(false);
  const [inlineCardTitle, setInlineCardTitle] = useState('');
  const [showInlineSectionModal, setShowInlineSectionModal] = useState(false);
  const [inlineSectionTitle, setInlineSectionTitle] = useState('');

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'card' | 'field';
    id: string;
    title: string;
  } | null>(null);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSectionId, setPreviewSectionId] = useState<string>('general');

  // Currently selected section info
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const currentCards = cards.filter((c) => c.sectionId === selectedSection?.id);
  const availableCardsForModal = cards.filter(
    (c) => c.sectionId === (editingTargetSectionId || selectedSectionId),
  );

  // Handlers for Sections
  const handleAddSection = () => {
    const title = prompt('Enter new section title:');
    if (title && title.trim()) {
      const { sectionId } = addSection(title.trim());
      setSelectedSectionId(sectionId);
    }
  };

  const handleCreateInlineSection = () => {
    if (!inlineSectionTitle.trim()) return;
    const { sectionId: newSecId, cardId: newCardId } = addSection(inlineSectionTitle.trim());
    setEditingTargetSectionId(newSecId);
    setSelectedSectionId(newSecId);
    setSelectedTargetCardId(newCardId);
    setShowInlineSectionModal(false);
    setInlineSectionTitle('');
  };

  const handleSaveSectionRename = (id: string) => {
    if (editingSectionTitle.trim()) {
      renameSection(id, editingSectionTitle.trim());
    }
    setEditingSectionId(null);
  };

  // Handlers for Cards
  const handleOpenAddCard = () => {
    setNewCardTitle('');
    setShowCardModal(true);
  };

  const handleCreateCard = () => {
    if (!newCardTitle.trim() || !selectedSection) return;
    const createdId = addCard(selectedSection.id, newCardTitle.trim());
    setShowCardModal(false);
    setNewCardTitle('');
    setSelectedTargetCardId(createdId);
  };

  const handleCreateInlineCard = () => {
    if (!inlineCardTitle.trim()) return;
    const targetSecId = editingTargetSectionId || selectedSectionId;
    const newCardId = addCard(targetSecId, inlineCardTitle.trim());
    setSelectedTargetCardId(newCardId);
    setShowInlineCardModal(false);
    setInlineCardTitle('');
  };

  const handleSaveCardRename = (cardId: string) => {
    if (editingCardTitle.trim()) {
      renameCard(cardId, editingCardTitle.trim());
    }
    setEditingCardId(null);
  };

  // Handlers for Fields
  const handleOpenAddField = (cardId?: string) => {
    setEditingFieldId(null);
    const secId = selectedSectionId;
    setEditingTargetSectionId(secId);
    const cardsInSec = cards.filter((c) => c.sectionId === secId);
    setSelectedTargetCardId(cardId || cardsInSec[0]?.id || '');
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldReadOnly(false);
    setFieldDefaultValue('');
    setFieldOptions([]);
    setNewOptionInput('');
    setShowFieldModal(true);
  };

  const handleOpenEditField = (field: OnboardingFieldConfig) => {
    setEditingFieldId(field.id);
    const secId = field.sectionId || selectedSectionId;
    setEditingTargetSectionId(secId);
    setSelectedTargetCardId(field.cardId);
    setFieldLabel(field.label);
    setFieldType(field.fieldType);
    setFieldRequired(Boolean(field.required));
    setFieldReadOnly(Boolean(field.readOnly));
    setFieldDefaultValue(field.defaultValue || '');
    setFieldOptions(field.options || []);
    setNewOptionInput('');
    setShowFieldModal(true);
  };

  const handleAddOption = () => {
    if (newOptionInput.trim()) {
      setFieldOptions([...fieldOptions, newOptionInput.trim()]);
      setNewOptionInput('');
    }
  };

  const handleDeleteOption = (index: number) => {
    setFieldOptions(fieldOptions.filter((_, i) => i !== index));
  };

  const handleSaveField = () => {
    if (!fieldLabel.trim()) return;
    const targetSecId = editingTargetSectionId || selectedSectionId;
    const targetCardId = selectedTargetCardId || availableCardsForModal[0]?.id || '';
    if (!targetCardId) return;

    if (editingFieldId) {
      updateField(editingFieldId, {
        sectionId: targetSecId,
        cardId: targetCardId,
        label: fieldLabel.trim(),
        fieldType,
        required: fieldRequired,
        readOnly: fieldReadOnly,
        defaultValue: fieldDefaultValue.trim() || undefined,
        options: fieldType === 'select' ? fieldOptions : undefined,
      });
    } else {
      addField({
        sectionId: targetSecId,
        cardId: targetCardId,
        label: fieldLabel.trim(),
        fieldType,
        required: fieldRequired,
        readOnly: fieldReadOnly,
        defaultValue: fieldDefaultValue.trim() || undefined,
        options: fieldType === 'select' ? fieldOptions : undefined,
        isCustom: true,
      });
    }
    setShowFieldModal(false);
  };

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
    <Stack gap="lg">
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">Administration Customization Builder</h2>
            <p className="bezent-card__desc">
              Configure employee registration sections, content cards/groups, add custom fields, and
              preview the form.
            </p>
          </div>
        }
        right={
          <Button variant="secondary" type="button" onClick={() => setShowPreviewModal(true)}>
            <BezentIcon name="edit" size={16} />
            Preview Form
          </Button>
        }
      />

      <Grid columns="sidebar-main" gap="lg">
        {/* Left Column: Sections List */}
        <Card padding="md">
          <Stack gap="md">
            <Toolbar
              left={<h3 className="bezent-card__title">Sections ({sections.length})</h3>}
              right={
                <Button variant="secondary" size="sm" type="button" onClick={handleAddSection}>
                  + Add Section
                </Button>
              }
            />

            <Stack gap="xs">
              {sections.map((sec, index) => (
                <Card
                  key={sec.id}
                  variant={selectedSectionId === sec.id ? 'interactive' : 'flat'}
                  padding="sm"
                  onClick={() => setSelectedSectionId(sec.id)}
                >
                  <Toolbar
                    left={
                      editingSectionId === sec.id ? (
                        <Input
                          size="sm"
                          value={editingSectionTitle}
                          onChange={(e) => setEditingSectionTitle(e.target.value)}
                          onBlur={() => handleSaveSectionRename(sec.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveSectionRename(sec.id)}
                          autoFocus
                        />
                      ) : (
                        <Inline gap="xs" align="center">
                          <strong>
                            {index + 1}. {sec.title}
                          </strong>
                          {sec.hidden && (
                            <Badge variant="neutral" size="sm">
                              Hidden
                            </Badge>
                          )}
                        </Inline>
                      )
                    }
                    right={
                      <Inline gap="xs" align="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="admin-builder-action-btn"
                          title={sec.hidden ? 'Show Section' : 'Hide Section'}
                          onClick={() => toggleHideSection(sec.id)}
                          aria-label={sec.hidden ? 'Show Section' : 'Hide Section'}
                        >
                          <BezentIcon name={sec.hidden ? 'close' : 'check'} size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-builder-action-btn"
                          title="Move Up"
                          disabled={index === 0}
                          onClick={() => reorderSection(index, 'up')}
                          aria-label="Move Up"
                        >
                          <BezentIcon name="chevronUp" size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-builder-action-btn"
                          title="Move Down"
                          disabled={index === sections.length - 1}
                          onClick={() => reorderSection(index, 'down')}
                          aria-label="Move Down"
                        >
                          <BezentIcon name="chevronDown" size={14} />
                        </button>
                        {sec.isCustom && (
                          <button
                            type="button"
                            className="admin-builder-action-btn admin-builder-action-btn--delete"
                            title="Delete Section"
                            onClick={() => deleteSection(sec.id)}
                            aria-label="Delete Section"
                          >
                            <BezentIcon name="delete" size={14} />
                          </button>
                        )}
                      </Inline>
                    }
                  />
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>

        {/* Right Column: Cards & Fields in Selected Section */}
        <Stack gap="lg">
          <Toolbar
            left={
              <div>
                <h3 className="bezent-card__title">{selectedSection?.title} Cards &amp; Fields</h3>
                <p className="bezent-card__desc">
                  Manage content cards/groups and fields for this registration section.
                </p>
              </div>
            }
            right={
              <Actions align="end" gap="sm">
                <Button variant="secondary" type="button" onClick={handleOpenAddCard}>
                  + Create New Card
                </Button>
              </Actions>
            }
          />

          {currentCards.length === 0 ? (
            <EmptyState
              title={`No cards configured for ${selectedSection?.title}.`}
              description="Create a card group to organize fields within this section."
              primaryAction={{ label: '+ Create First Card', onClick: handleOpenAddCard }}
            />
          ) : (
            <Stack gap="lg">
              {currentCards.map((card, cIndex) => {
                const cardFields = fields.filter((f) => f.cardId === card.id);
                return (
                  <Card key={card.id} padding="lg">
                    <Stack gap="md">
                      {/* Card Header */}
                      <Toolbar
                        left={
                          editingCardId === card.id ? (
                            <Input
                              size="sm"
                              value={editingCardTitle}
                              onChange={(e) => setEditingCardTitle(e.target.value)}
                              onBlur={() => handleSaveCardRename(card.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveCardRename(card.id)}
                              autoFocus
                            />
                          ) : (
                            <Inline gap="sm" align="center">
                              <h4 className="bezent-card__title">{card.title}</h4>
                              <Badge variant={card.isCustom ? 'info' : 'neutral'} size="sm">
                                {card.isCustom ? 'Custom Card' : 'System Card'}
                              </Badge>
                            </Inline>
                          )
                        }
                        right={
                          <Actions align="end" gap="xs">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingCardId(card.id);
                                setEditingCardTitle(card.title);
                              }}
                            >
                              Rename
                            </Button>
                            <button
                              type="button"
                              className="admin-builder-action-btn"
                              title="Move Card Up"
                              disabled={cIndex === 0}
                              onClick={() => reorderCard(card.sectionId, cIndex, 'up')}
                              aria-label="Move Card Up"
                            >
                              <BezentIcon name="chevronUp" size={14} />
                            </button>
                            <button
                              type="button"
                              className="admin-builder-action-btn"
                              title="Move Card Down"
                              disabled={cIndex === currentCards.length - 1}
                              onClick={() => reorderCard(card.sectionId, cIndex, 'down')}
                              aria-label="Move Card Down"
                            >
                              <BezentIcon name="chevronDown" size={14} />
                            </button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAddField(card.id)}
                            >
                              + Add Field
                            </Button>
                            {card.isCustom && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setDeleteConfirmation({
                                    type: 'card',
                                    id: card.id,
                                    title: card.title,
                                  })
                                }
                              >
                                Delete
                              </Button>
                            )}
                          </Actions>
                        }
                      />

                      {/* Fields inside Card */}
                      <Grid columns={2} gap="md">
                        {cardFields.length === 0 ? (
                          <div className="bezent-card__desc">
                            No fields in this card. Click &quot;+ Add Field&quot; to add one.
                          </div>
                        ) : (
                          cardFields.map((f) => (
                            <Card key={f.id} variant="flat" padding="sm">
                              <Stack gap="xs">
                                <Toolbar
                                  left={
                                    <strong>
                                      {f.label} {f.required && '*'}
                                    </strong>
                                  }
                                  right={
                                    <Inline gap="xs" wrap>
                                      <Badge variant="info" size="sm">
                                        {f.fieldType}
                                      </Badge>
                                      {f.required && (
                                        <Badge variant="warning" size="sm">
                                          Required
                                        </Badge>
                                      )}
                                      {f.readOnly && (
                                        <Badge variant="neutral" size="sm">
                                          Read Only
                                        </Badge>
                                      )}
                                      {f.isCustom && (
                                        <Badge variant="info" size="sm">
                                          Custom
                                        </Badge>
                                      )}
                                    </Inline>
                                  }
                                />

                                {f.options && f.options.length > 0 && (
                                  <p className="bezent-card__desc">
                                    Options: {f.options.join(', ')}
                                  </p>
                                )}

                                <Actions align="end" gap="xs">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleOpenEditField(f)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
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
                                </Actions>
                              </Stack>
                            </Card>
                          ))
                        )}
                      </Grid>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Grid>

      {/* Create New Card Modal */}
      {showCardModal && (
        <Modal
          isOpen={showCardModal}
          onClose={() => setShowCardModal(false)}
          title="Create New Card / Content Group"
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" type="button" onClick={() => setShowCardModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleCreateCard}>
                Create Card
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            <Input label="Target Section" value={selectedSection?.title || ''} disabled />
            <Input
              label="Card / Group Name *"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="e.g. Government Identification"
              autoFocus
              required
            />
          </Stack>
        </Modal>
      )}

      {/* Inline Create New Card Sub-Modal */}
      {showInlineCardModal && (
        <Modal
          isOpen={showInlineCardModal}
          onClose={() => setShowInlineCardModal(false)}
          title="Create New Card"
          size="sm"
          footer={
            <Actions align="end" gap="sm">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowInlineCardModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleCreateInlineCard}>
                Create Card
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            <Input
              label="Target Section"
              value={
                sections.find((s) => s.id === (editingTargetSectionId || selectedSectionId))
                  ?.title || ''
              }
              disabled
            />
            <Input
              label="Card Name *"
              value={inlineCardTitle}
              onChange={(e) => setInlineCardTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateInlineCard()}
              placeholder="e.g. Government Documents"
              autoFocus
              required
            />
          </Stack>
        </Modal>
      )}

      {/* Inline Create New Section Sub-Modal */}
      {showInlineSectionModal && (
        <Modal
          isOpen={showInlineSectionModal}
          onClose={() => setShowInlineSectionModal(false)}
          title="Create New Section"
          size="sm"
          footer={
            <Actions align="end" gap="sm">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowInlineSectionModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleCreateInlineSection}>
                Create Section
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            <Input
              label="Section Name *"
              value={inlineSectionTitle}
              onChange={(e) => setInlineSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateInlineSection()}
              placeholder="e.g. Certifications"
              autoFocus
              required
            />
          </Stack>
        </Modal>
      )}

      {/* Add / Edit Field Modal */}
      {showFieldModal && (
        <Modal
          isOpen={showFieldModal}
          onClose={() => setShowFieldModal(false)}
          title={editingFieldId ? 'Edit Field' : 'Add Field'}
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" type="button" onClick={() => setShowFieldModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleSaveField}>
                Save Field
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            <Select
              label="Target Section *"
              value={editingTargetSectionId}
              options={[
                ...sections.map((sec) => ({ value: sec.id, label: sec.title })),
                { value: '__ADD_NEW_SECTION__', label: '+ Add New Section' },
              ]}
              onChange={(e) => {
                if (e.target.value === '__ADD_NEW_SECTION__') {
                  setShowInlineSectionModal(true);
                  setInlineSectionTitle('');
                } else {
                  const newSecId = e.target.value;
                  setEditingTargetSectionId(newSecId);
                  const cardsInNewSec = cards.filter((c) => c.sectionId === newSecId);
                  setSelectedTargetCardId(cardsInNewSec[0]?.id || '');
                }
              }}
            />

            <Select
              label="Add to Existing Card *"
              value={selectedTargetCardId}
              options={[
                ...availableCardsForModal.map((c) => ({ value: c.id, label: c.title })),
                { value: '__ADD_NEW_CARD__', label: '+ Add New Card' },
              ]}
              onChange={(e) => {
                if (e.target.value === '__ADD_NEW_CARD__') {
                  setShowInlineCardModal(true);
                  setInlineCardTitle('');
                } else {
                  setSelectedTargetCardId(e.target.value);
                }
              }}
            />

            <Input
              label="Field Label *"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="e.g. Aadhaar Number"
              required
            />

            <Select
              label="Field Type"
              value={fieldType}
              options={FIELD_TYPE_OPTIONS}
              onChange={(e) =>
                setFieldType(e.target.value as 'text' | 'select' | 'date' | 'number' | 'file')
              }
            />

            <FormGrid columns={2}>
              <Switch
                label="Required Field"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
              />
              <Switch
                label="Read Only"
                checked={fieldReadOnly}
                onChange={(e) => setFieldReadOnly(e.target.checked)}
              />
            </FormGrid>

            <Input
              label="Default Value (Optional)"
              value={fieldDefaultValue}
              onChange={(e) => setFieldDefaultValue(e.target.value)}
            />

            {fieldType === 'select' && (
              <Stack gap="sm">
                <Inline gap="sm" align="center">
                  <Input
                    placeholder="e.g. Option A, Option B"
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                  />
                  <Button variant="secondary" type="button" onClick={handleAddOption}>
                    + Add Option
                  </Button>
                </Inline>
                <Inline gap="xs" wrap>
                  {fieldOptions.map((opt, idx) => (
                    <Badge key={idx} variant="neutral">
                      <Inline gap="xs" align="center">
                        <span>{opt}</span>
                        <button
                          type="button"
                          className="admin-builder-option-remove-btn"
                          aria-label={`Remove ${opt}`}
                          onClick={() => handleDeleteOption(idx)}
                        >
                          <BezentIcon name="close" size={12} />
                        </button>
                      </Inline>
                    </Badge>
                  ))}
                </Inline>
              </Stack>
            )}
          </Stack>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <Modal
          isOpen={Boolean(deleteConfirmation)}
          onClose={() => setDeleteConfirmation(null)}
          title="Confirm Deletion"
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" type="button" onClick={() => setDeleteConfirmation(null)}>
                Cancel
              </Button>
              <Button variant="danger" type="button" onClick={handleConfirmDelete}>
                Confirm Delete
              </Button>
            </Actions>
          }
        >
          <Stack gap="sm">
            <p>
              Are you sure you want to delete the {deleteConfirmation.type}{' '}
              <strong>&quot;{deleteConfirmation.title}&quot;</strong>?
            </p>
            <p className="bezent-card__desc">
              This action will remove it from the Customization Builder, Form Preview, and actual
              Employee Registration page.
            </p>
          </Stack>
        </Modal>
      )}

      {/* Complete 10-Section Form Preview Modal */}
      {showPreviewModal && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Employee Registration Form Preview"
          size="lg"
          footer={
            <Actions align="end">
              <Button variant="secondary" type="button" onClick={() => setShowPreviewModal(false)}>
                Close Preview
              </Button>
            </Actions>
          }
        >
          <Stack gap="lg">
            <Tabs
              items={sections.filter((s) => !s.hidden).map((s) => ({ id: s.id, label: s.title }))}
              activeId={previewSectionId}
              onChange={(id) => setPreviewSectionId(id)}
              variant="pills"
            />

            <Stack gap="md">
              <h4>
                {sections.find((s) => s.id === previewSectionId)?.title || 'Registration Section'}
              </h4>
              {cards
                .filter((c) => c.sectionId === previewSectionId)
                .map((c) => {
                  const cardFields = fields.filter((f) => f.cardId === c.id);
                  return (
                    <Card key={c.id} padding="md">
                      <Stack gap="sm">
                        <h5>{c.title}</h5>
                        <FormGrid columns={2}>
                          {cardFields.map((f) => (
                            <div key={f.id}>
                              <Input
                                label={`${f.label}${f.required ? ' *' : ''}`}
                                disabled={f.readOnly}
                                placeholder={f.defaultValue || `Enter ${f.label}`}
                              />
                            </div>
                          ))}
                        </FormGrid>
                      </Stack>
                    </Card>
                  );
                })}
            </Stack>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}

export default OnboardingBuilderSection;
