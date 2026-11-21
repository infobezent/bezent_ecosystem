import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Textarea,
  Select,
  Switch,
  FormField,
  Stack,
  Inline,
} from '../../../../../../design-system';
import type {
  DocumentCategory,
  DocumentRequirement,
  CreateDocumentRequirementDto,
} from '../../../types/documentRequirement.types';

export interface AddEditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateDocumentRequirementDto) => Promise<void>;
  editingDocument: DocumentRequirement | null;
  categories: DocumentCategory[];
  defaultCategoryId?: string;
}

const COMMON_FORMATS = ['pdf', 'jpg', 'png', 'docx', 'xlsx'];

export function AddEditDocumentModal({
  isOpen,
  onClose,
  onSave,
  editingDocument,
  categories,
  defaultCategoryId,
}: AddEditDocumentModalProps) {
  // Basic Details
  const [name, setName] = useState(() => editingDocument?.name || '');
  const [description, setDescription] = useState(() => editingDocument?.description || '');
  const [categoryId, setCategoryId] = useState(
    () => editingDocument?.categoryId || defaultCategoryId || categories[0]?.id || '',
  );
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isRequired, setIsRequired] = useState(() => (editingDocument ? editingDocument.isRequired : true));
  const [isActive, setIsActive] = useState(() => (editingDocument ? editingDocument.isActive : true));

  // Upload Configuration
  const [selectedFormats, setSelectedFormats] = useState<string[]>(
    () => editingDocument?.uploadConfig?.allowedFormats || ['pdf', 'jpg', 'png'],
  );
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(
    () => editingDocument?.uploadConfig?.maxFileSizeMb || 5,
  );
  const [allowMultiple, setAllowMultiple] = useState(
    () => Boolean(editingDocument?.uploadConfig?.allowMultiple),
  );
  const [maxFiles, setMaxFiles] = useState(() => editingDocument?.uploadConfig?.maxFiles || 3);
  const [expiryApplicable, setExpiryApplicable] = useState(
    () => Boolean(editingDocument?.uploadConfig?.expiryApplicable),
  );
  const [requireExpiry, setRequireExpiry] = useState(
    () => Boolean(editingDocument?.uploadConfig?.requireExpiry),
  );

  // Verification Configuration
  const [verificationRequired, setVerificationRequired] = useState(
    () => editingDocument?.verificationConfig?.verificationRequired ?? true,
  );
  const [verificationResponsibility, setVerificationResponsibility] = useState<'hr' | 'specific_role'>(
    () => editingDocument?.verificationConfig?.verificationResponsibility ?? 'hr',
  );
  const [specificRoleName, setSpecificRoleName] = useState(
    () => editingDocument?.verificationConfig?.specificRoleName || '',
  );
  const [allowReupload, setAllowReupload] = useState(
    () => editingDocument?.verificationConfig?.allowReupload ?? true,
  );
  const [reverificationOnExpiry, setReverificationOnExpiry] = useState(
    () => Boolean(editingDocument?.verificationConfig?.reverificationOnExpiry),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingDocument) {
      setName(editingDocument.name);
      setDescription(editingDocument.description || '');
      setCategoryId(editingDocument.categoryId);
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setIsRequired(editingDocument.isRequired);
      setIsActive(editingDocument.isActive);

      setSelectedFormats(editingDocument.uploadConfig?.allowedFormats || ['pdf', 'jpg', 'png']);
      setMaxFileSizeMb(editingDocument.uploadConfig?.maxFileSizeMb || 5);
      setAllowMultiple(Boolean(editingDocument.uploadConfig?.allowMultiple));
      setMaxFiles(editingDocument.uploadConfig?.maxFiles || 3);
      setExpiryApplicable(Boolean(editingDocument.uploadConfig?.expiryApplicable));
      setRequireExpiry(Boolean(editingDocument.uploadConfig?.requireExpiry));

      setVerificationRequired(editingDocument.verificationConfig?.verificationRequired ?? true);
      setVerificationResponsibility(editingDocument.verificationConfig?.verificationResponsibility ?? 'hr');
      setSpecificRoleName(editingDocument.verificationConfig?.specificRoleName || '');
      setAllowReupload(editingDocument.verificationConfig?.allowReupload ?? true);
      setReverificationOnExpiry(Boolean(editingDocument.verificationConfig?.reverificationOnExpiry));
    } else {
      setName('');
      setDescription('');
      setCategoryId(defaultCategoryId || (categories[0]?.id ?? ''));
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setIsRequired(true);
      setIsActive(true);

      setSelectedFormats(['pdf', 'jpg', 'png']);
      setMaxFileSizeMb(5);
      setAllowMultiple(false);
      setMaxFiles(3);
      setExpiryApplicable(false);
      setRequireExpiry(false);

      setVerificationRequired(true);
      setVerificationResponsibility('hr');
      setSpecificRoleName('');
      setAllowReupload(true);
      setReverificationOnExpiry(false);
    }
    setError(null);
  }, [editingDocument, defaultCategoryId, categories, isOpen]);

  const toggleFormat = (fmt: string) => {
    setSelectedFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Document name is required');
      return;
    }

    let finalCategoryId = categoryId;
    if (isCustomCategory) {
      if (!customCategoryName.trim()) {
        setError('Please enter a custom category name');
        return;
      }
      finalCategoryId = customCategoryName.trim();
    }

    if (!finalCategoryId) {
      setError('Please select or create a category');
      return;
    }

    if (selectedFormats.length === 0) {
      setError('At least one allowed file format must be selected');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        categoryId: finalCategoryId,
        isRequired,
        isActive,
        uploadConfig: {
          allowedFormats: selectedFormats,
          maxFileSizeMb,
          allowMultiple,
          maxFiles: allowMultiple ? maxFiles : 1,
          expiryApplicable,
          requireExpiry: expiryApplicable ? requireExpiry : false,
        },
        verificationConfig: {
          verificationRequired,
          verificationResponsibility,
          specificRoleName: verificationResponsibility === 'specific_role' ? specificRoleName.trim() : null,
          allowReupload,
          reverificationOnExpiry: expiryApplicable ? reverificationOnExpiry : false,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document requirement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDocument ? 'Edit Document Requirement' : 'Add Document Requirement'}
      size="md"
      footer={
        <Inline gap="sm" justify="end">
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} type="submit">
            {editingDocument ? 'Save Changes' : 'Create Document'}
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit} className="bezent-reqdocs-form-compact">
        {error && (
          <div className="bezent-reqdocs-chip bezent-reqdocs-chip--required" role="alert">
            {error}
          </div>
        )}

        {/* 1. Basic Details */}
        <h3 className="bezent-reqdocs-section-heading">Basic Details</h3>
        <Stack gap="sm">
          <FormField label="Document Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aadhaar Card, Degree Certificate"
              required
              autoFocus
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify requirements or instructions for the candidate..."
              rows={2}
            />
          </FormField>

          <div className="bezent-reqdocs-form-row-2col">
            <FormField label="Category" required>
              {!isCustomCategory ? (
                <Select
                  value={categoryId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      setIsCustomCategory(true);
                    } else {
                      setCategoryId(val);
                    }
                  }}
                  options={[
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                    { value: '__custom__', label: '+ Create Custom Category' },
                  ]}
                />
              ) : (
                <Stack gap="xs">
                  <Input
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter new category name"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCustomCategoryName('');
                    }}
                  >
                    Cancel custom category
                  </Button>
                </Stack>
              )}
            </FormField>

            <FormField label="Document Mandatory Status">
              <Switch
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                label={isRequired ? 'Mandatory Requirement' : 'Optional Document'}
              />
            </FormField>
          </div>

          <FormField label="Status">
            <Switch
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              label={isActive ? 'Active' : 'Inactive'}
            />
          </FormField>
        </Stack>

        {/* 2. Upload Configuration */}
        <h3 className="bezent-reqdocs-section-heading">Upload Configuration</h3>
        <Stack gap="sm">
          <FormField label="Allowed File Formats" required>
            <div className="bezent-reqdocs-pills-container">
              {COMMON_FORMATS.map((fmt) => {
                const selected = selectedFormats.includes(fmt);
                return (
                  <button
                    key={fmt}
                    type="button"
                    className={`bezent-reqdocs-pill ${
                      selected ? 'bezent-reqdocs-pill--selected' : ''
                    }`}
                    onClick={() => toggleFormat(fmt)}
                  >
                    .{fmt.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </FormField>

          <div className="bezent-reqdocs-form-row-2col">
            <FormField label="Maximum File Size">
              <Select
                value={String(maxFileSizeMb)}
                onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                options={[
                  { value: '2', label: '2 MB' },
                  { value: '5', label: '5 MB (Standard)' },
                  { value: '10', label: '10 MB' },
                  { value: '25', label: '25 MB' },
                ]}
              />
            </FormField>

            <FormField label="Allow Multiple Files">
              <Switch
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                label={allowMultiple ? 'Multiple Files' : 'Single File Only'}
              />
            </FormField>
          </div>

          {allowMultiple && (
            <FormField label="Maximum Number of Files">
              <Select
                value={String(maxFiles)}
                onChange={(e) => setMaxFiles(Number(e.target.value))}
                options={[
                  { value: '2', label: 'Up to 2 files' },
                  { value: '3', label: 'Up to 3 files' },
                  { value: '5', label: 'Up to 5 files' },
                  { value: '10', label: 'Up to 10 files' },
                ]}
              />
            </FormField>
          )}

          <FormField label="Expiry Date Applicable">
            <Switch
              checked={expiryApplicable}
              onChange={(e) => setExpiryApplicable(e.target.checked)}
              label={expiryApplicable ? 'Yes — Document has Expiry Date' : 'No Expiry Tracking'}
            />
          </FormField>

          {expiryApplicable && (
            <div className="bezent-reqdocs-conditional-box">
              <FormField label="Require Expiry Date Input">
                <Switch
                  checked={requireExpiry}
                  onChange={(e) => setRequireExpiry(e.target.checked)}
                  label={requireExpiry ? 'Candidate must provide expiry date' : 'Expiry date optional'}
                />
              </FormField>
            </div>
          )}
        </Stack>

        {/* 3. Verification Configuration */}
        <h3 className="bezent-reqdocs-section-heading">Verification Configuration</h3>
        <Stack gap="sm">
          <FormField label="Verification Required">
            <Switch
              checked={verificationRequired}
              onChange={(e) => setVerificationRequired(e.target.checked)}
              label={verificationRequired ? 'Requires HR/Admin Verification' : 'Auto-Accept without verification'}
            />
          </FormField>

          {verificationRequired && (
            <div className="bezent-reqdocs-conditional-box">
              <FormField label="Verification Responsibility">
                <Select
                  value={verificationResponsibility}
                  onChange={(e) =>
                    setVerificationResponsibility(e.target.value as 'hr' | 'specific_role')
                  }
                  options={[
                    { value: 'hr', label: 'HR / Onboarding Team' },
                    { value: 'specific_role', label: 'Specific Department / Role' },
                  ]}
                />
              </FormField>

              {verificationResponsibility === 'specific_role' && (
                <FormField label="Role / Team Name" required>
                  <Input
                    value={specificRoleName}
                    onChange={(e) => setSpecificRoleName(e.target.value)}
                    placeholder="e.g. Finance Team, Legal Counsel, IT Security"
                    required
                  />
                </FormField>
              )}
            </div>
          )}

          <FormField label="Allow Candidate Re-upload">
            <Switch
              checked={allowReupload}
              onChange={(e) => setAllowReupload(e.target.checked)}
              label={allowReupload ? 'Allowed if rejected or requested' : 'Locked after first submission'}
            />
          </FormField>

          {expiryApplicable && (
            <FormField label="Re-verification Required When Document Expires">
              <Switch
                checked={reverificationOnExpiry}
                onChange={(e) => setReverificationOnExpiry(e.target.checked)}
                label={reverificationOnExpiry ? 'Yes — Flag for re-verification upon expiry' : 'No automated re-verification'}
              />
            </FormField>
          )}
        </Stack>
      </form>
    </Modal>
  );
}
