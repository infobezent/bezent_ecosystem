import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  FormField,
  Stack,
  Inline,
} from '../../../../../../design-system';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  DocumentCategory,
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  DocumentRequirement,
} from '../../../types/documentRequirement.types';

export interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: DocumentCategory[];
  documents: DocumentRequirement[];
  onCreateCategory: (dto: CreateDocumentCategoryDto) => Promise<void>;
  onUpdateCategory: (id: string, dto: UpdateDocumentCategoryDto) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onReorderCategories: (ids: string[]) => Promise<void>;
}

export function ManageCategoriesModal({
  isOpen,
  onClose,
  categories,
  documents,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
}: ManageCategoriesModalProps) {
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await onCreateCategory({ name: newCatName.trim() });
      setNewCatName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (cat: DocumentCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setError(null);
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editingCatName.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await onUpdateCategory(catId, { name: editingCatName.trim() });
      setEditingCatId(null);
      setEditingCatName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: DocumentCategory) => {
    try {
      setSubmitting(true);
      setError(null);
      await onUpdateCategory(cat.id, { isActive: !cat.isActive });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: DocumentCategory) => {
    const attachedCount = documents.filter((d) => d.categoryId === cat.id).length;
    if (attachedCount > 0) {
      setError(
        `Cannot delete "${cat.name}". It contains ${attachedCount} document requirement(s). Reassign them first.`,
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onDeleteCategory(cat.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= categories.length) return;

    const copy = [...categories];
    const temp = copy[index]!;
    copy[index] = copy[newIdx]!;
    copy[newIdx] = temp;

    const nextIds = copy.map((c) => c.id);
    try {
      setSubmitting(true);
      setError(null);
      await onReorderCategories(nextIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder categories');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Document Categories"
      size="md"
      footer={
        <Inline justify="end">
          <Button variant="secondary" onClick={onClose} type="button">
            Done
          </Button>
        </Inline>
      }
    >
      <div className="bezent-reqdocs-form-compact">
        {error && (
          <div className="bezent-reqdocs-chip bezent-reqdocs-chip--required" role="alert">
            {error}
          </div>
        )}

        {/* 1. Add New Category Row */}
        <form onSubmit={handleCreate}>
          <FormField label="Add New Category">
            <Inline gap="sm">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Legal & Compliance Proofs"
                disabled={submitting}
              />
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={!newCatName.trim() || submitting}
                leftIcon={<BezentIcon name="plus" size={14} />}
              >
                Add
              </Button>
            </Inline>
          </FormField>
        </form>

        {/* 2. Existing Categories List */}
        <h3 className="bezent-reqdocs-section-heading">Existing Categories</h3>
        <Stack gap="xs">
          {categories.map((cat, idx) => {
            const attachedCount = documents.filter((d) => d.categoryId === cat.id).length;
            const isEditing = editingCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="bezent-reqdocs-item-row"
              >
                {isEditing ? (
                  <Inline gap="xs" className="bezent-reqdocs-item-row__main">
                    <Input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      size="sm"
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={submitting}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCatId(null)}
                    >
                      Cancel
                    </Button>
                  </Inline>
                ) : (
                  <div className="bezent-reqdocs-item-row__main">
                    <div className="bezent-reqdocs-item-row__title-line">
                      <span className="bezent-reqdocs-item-row__name">{cat.name}</span>
                      <span className="bezent-reqdocs-category-card__count-badge">
                        {attachedCount} {attachedCount === 1 ? 'doc' : 'docs'}
                      </span>
                      <span
                        className={`bezent-reqdocs-chip ${
                          cat.isActive
                            ? 'bezent-reqdocs-chip--active'
                            : 'bezent-reqdocs-chip--inactive'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="bezent-reqdocs-item-row__actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0 || submitting}
                      title="Move Up"
                    >
                      <BezentIcon name="chevronUp" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === categories.length - 1 || submitting}
                      title="Move Down"
                    >
                      <BezentIcon name="chevronDown" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(cat)}
                      disabled={submitting}
                      title="Edit Category Name"
                    >
                      <BezentIcon name="edit" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(cat)}
                      disabled={submitting}
                      title={cat.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <BezentIcon name={cat.isActive ? 'pause' : 'play'} size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(cat)}
                      disabled={attachedCount > 0 || submitting}
                      title={
                        attachedCount > 0
                          ? `Cannot delete (contains ${attachedCount} documents)`
                          : 'Delete Category'
                      }
                    >
                      <BezentIcon name="trash" size={14} />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Stack>
      </div>
    </Modal>
  );
}
