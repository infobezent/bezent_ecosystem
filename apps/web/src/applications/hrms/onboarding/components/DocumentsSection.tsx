import { useMemo, useRef, useState } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Button,
  IconButton,
  Badge,
  Card,
  CardTitle,
  Modal,
  Alert,
  Stack,
  Inline,
} from '../../../../design-system';
import { BezentIcon } from '../../../../design-system/icons';
import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
import type { RegistrationFieldConfig } from '../../settings/api/registrationSettingsApi';

export interface DocumentItemState {
  id: string;
  category: string;
  name: string;
  isRequired: boolean;
  docNumber: string;
  file: File | null;
  filePreviewUrl?: string;
  fileName?: string;
  fileSizeFormatted?: string;
  status: 'Pending' | 'Verified' | 'Rejected' | 'Not Required';
  remarks: string;
}

export interface PassportPhotoState {
  file: File | null;
  fileName: string;
  fileSizeFormatted?: string;
  previewUrl: string;
  status: 'Pending' | 'Verified' | 'Rejected' | 'Not Required';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

/**
 * Each checklist item is a Form Engine field (`documents.<key>`); category
 * grouping is a wizard-only concept the catalog doesn't model.
 */
const DOCUMENT_CATEGORY_BY_KEY: Record<string, string> = {
  'documents.aadhaarFile': 'Identity & Government Documents',
  'documents.panFile': 'Identity & Government Documents',
  'documents.passportFile': 'Identity & Government Documents',
  'documents.voterIdFile': 'Identity & Government Documents',
  'documents.drivingLicenseFile': 'Address Proof Documents',
  'documents.class10File': 'Educational Records',
  'documents.class12File': 'Educational Records',
  'documents.degreeFile': 'Educational Records',
  'documents.semesterMarksheetsFile': 'Educational Records',
  'documents.postGraduationFile': 'Educational Records',
  'documents.certificationsFile': 'Educational Records',
  'documents.previousAppointmentLetterFile': 'Professional History',
  'documents.experienceCertificateFile': 'Professional History',
  'documents.relievingLetterFile': 'Professional History',
  'documents.salarySlipsFile': 'Professional History',
  'documents.form16File': 'Professional History',
  'documents.resignationLetterFile': 'Professional History',
  'documents.noDuesCertificateFile': 'Professional History',
  'documents.panDocumentScanFile': 'Financial & Tax Documents',
  'documents.cancelledCheque': 'Financial & Tax Documents',
  'documents.uanDetailsFile': 'Financial & Tax Documents',
};

/** Builds the checklist from the resolved form's `documents` fields (company-customizable). */
export function buildDocumentItemsFromConfig(
  fields: readonly RegistrationFieldConfig[],
): DocumentItemState[] {
  return fields
    .filter((f) => f.section === 'documents' && f.enabled && DOCUMENT_CATEGORY_BY_KEY[f.key])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((f) => ({
      id: f.key,
      category: DOCUMENT_CATEGORY_BY_KEY[f.key]!,
      name: f.label,
      isRequired: f.required,
      docNumber: '',
      file: null,
      fileName: '',
      fileSizeFormatted: '',
      status: 'Pending' as const,
      remarks: '',
    }));
}

export interface DocumentsSectionProps {
  documents?: DocumentItemState[];
  isExperiencedHire?: boolean;
  passportPhoto?: PassportPhotoState;
  onDocumentsChange?: (docs: DocumentItemState[]) => void;
  onClassificationChange?: (isExperienced: boolean) => void;
  onPassportPhotoChange?: (photo: PassportPhotoState) => void;
}

export function DocumentsSection({
  documents: externalDocs,
  isExperiencedHire: externalExperienced,
  passportPhoto: externalPhoto,
  onDocumentsChange,
  onClassificationChange,
  onPassportPhotoChange,
}: DocumentsSectionProps) {
  const config = useRegistrationConfig();
  const defaultDocuments = useMemo(
    () => buildDocumentItemsFromConfig(config.fields),
    [config.fields],
  );
  const aadhaarNumberField = config.field('documents.aadhaarNumber');
  const panNumberField = config.field('documents.panNumber');

  const [internalDocs, setInternalDocs] = useState<DocumentItemState[]>(defaultDocuments);
  const [internalExperienced, setInternalExperienced] = useState(true);
  const [showAadhaarNumber, setShowAadhaarNumber] = useState(false);
  const [internalPhoto, setInternalPhoto] = useState<PassportPhotoState>({
    file: null,
    fileName: '',
    fileSizeFormatted: '',
    previewUrl: '',
    status: 'Pending',
  });

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  const [previewingDoc, setPreviewingDoc] = useState<{
    name: string;
    url?: string;
    fileName?: string;
  } | null>(null);

  const documents = externalDocs ?? internalDocs;
  const isExperiencedHire = externalExperienced ?? internalExperienced;
  const passportPhoto = externalPhoto ?? internalPhoto;

  const updateDocuments = (newDocs: DocumentItemState[]) => {
    setInternalDocs(newDocs);
    if (onDocumentsChange) onDocumentsChange(newDocs);
  };

  const updateClassification = (exp: boolean) => {
    setInternalExperienced(exp);
    if (onClassificationChange) onClassificationChange(exp);
  };

  const updatePassportPhoto = (newPhoto: PassportPhotoState) => {
    setInternalPhoto(newPhoto);
    if (onPassportPhotoChange) onPassportPhotoChange(newPhoto);
  };

  const handlePhotoSelect = (file: File) => {
    setUploadErrorMsg(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadErrorMsg('File size exceeds the maximum allowed limit of 10 MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    updatePassportPhoto({
      file,
      fileName: file.name,
      fileSizeFormatted: formatFileSize(file.size),
      previewUrl,
      status: 'Pending',
    });
  };

  const handleRemovePhoto = () => {
    updatePassportPhoto({
      file: null,
      fileName: '',
      fileSizeFormatted: '',
      previewUrl: '',
      status: 'Pending',
    });
  };

  const handleFileUpload = (id: string, file: File) => {
    setUploadErrorMsg(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadErrorMsg(`File "${file.name}" size exceeds the maximum allowed limit of 10 MB.`);
      return;
    }

    const nextDocs = documents.map((doc) => {
      if (doc.id === id) {
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        return {
          ...doc,
          file,
          fileName: file.name,
          fileSizeFormatted: formatFileSize(file.size),
          filePreviewUrl: previewUrl,
          status: 'Pending' as const,
        };
      }
      return doc;
    });
    updateDocuments(nextDocs);
  };

  const handleVerifyDocument = (id: string) => {
    const nextDocs = documents.map((doc) => {
      if (doc.id === id) {
        return {
          ...doc,
          status: 'Verified' as const,
          remarks: doc.remarks || 'Document verified by HR',
        };
      }
      return doc;
    });
    updateDocuments(nextDocs);
  };

  const handleRejectDocument = (id: string) => {
    const nextDocs = documents.map((doc) => {
      if (doc.id === id) {
        return {
          ...doc,
          status: 'Rejected' as const,
          remarks: doc.remarks || 'Rejected: document image unclear or incomplete',
        };
      }
      return doc;
    });
    updateDocuments(nextDocs);
  };

  const handleUpdateDocField = (id: string, field: keyof DocumentItemState, value: unknown) => {
    const nextDocs = documents.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc));
    updateDocuments(nextDocs);
  };

  const categories = Array.from(new Set(documents.map((d) => d.category)));

  const getDocStatusBadge = (status: DocumentItemState['status']) => {
    switch (status) {
      case 'Verified':
        return (
          <Badge variant="success" size="sm">
            Verified
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="danger" size="sm">
            Rejected
          </Badge>
        );
      case 'Pending':
        return (
          <Badge variant="warning" size="sm">
            Pending
          </Badge>
        );
      case 'Not Required':
        return (
          <Badge variant="neutral" size="sm">
            Not Required
          </Badge>
        );
    }
  };

  return (
    <Stack gap="xl">
      {/* Upload Error Banner */}
      {uploadErrorMsg && (
        <Alert variant="danger">
          <Inline justify="between" align="center">
            <span>{uploadErrorMsg}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setUploadErrorMsg(null)}>
              ✕
            </Button>
          </Inline>
        </Alert>
      )}

      {/* 1. PASSPORT-SIZE PHOTOGRAPH */}
      <Card padding="lg">
        <FormSection title="Passport-Size Photograph">
          <Inline gap="lg" align="center">
            {passportPhoto.previewUrl ? (
              <img
                src={passportPhoto.previewUrl}
                alt="Passport Preview"
                className="bezent-photo-preview"
              />
            ) : (
              <div className="bezent-photo-placeholder">
                <BezentIcon name="employees" size={32} />
              </div>
            )}

            <Stack gap="sm">
              <input
                ref={photoFileInputRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/jpg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handlePhotoSelect(e.target.files[0]);
                  }
                }}
              />
              <Inline gap="sm" align="center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => photoFileInputRef.current?.click()}
                >
                  {passportPhoto.previewUrl ? 'Replace Photo' : 'Upload Photo'}
                </Button>
                {passportPhoto.previewUrl && (
                  <Button type="button" variant="ghost" onClick={handleRemovePhoto}>
                    Remove Photo
                  </Button>
                )}
                {passportPhoto.fileName && (
                  <span className="bezent-card__desc">
                    {passportPhoto.fileName}
                    {passportPhoto.fileSizeFormatted ? ` (${passportPhoto.fileSizeFormatted})` : ''}
                  </span>
                )}
              </Inline>
            </Stack>
          </Inline>
        </FormSection>
      </Card>

      {/* 2. CLASSIFICATION AUTOMATION */}
      <Card padding="lg">
        <FormSection title="Hiring Classification">
          <Inline gap="md" align="center">
            <Button
              type="button"
              variant={isExperiencedHire ? 'primary' : 'secondary'}
              onClick={() => updateClassification(true)}
            >
              Experienced Hire
            </Button>
            <Button
              type="button"
              variant={!isExperiencedHire ? 'primary' : 'secondary'}
              onClick={() => updateClassification(false)}
            >
              Fresher
            </Button>
            <span className="bezent-card__desc">
              {isExperiencedHire
                ? 'Showing full professional history & previous employer checklist.'
                : 'Hiding previous employment history documents.'}
            </span>
          </Inline>
        </FormSection>
      </Card>

      {/* 3. DOCUMENT CHECKLIST BY CATEGORY */}
      {categories.map((cat) => {
        if (!isExperiencedHire && cat.includes('Professional History')) {
          return null;
        }

        const catDocs = documents.filter((d) => d.category === cat);

        return (
          <Card key={cat} padding="lg">
            <FormSection title={cat}>
              <Stack gap="md">
                {catDocs.map((doc) => (
                  <Card key={doc.id} variant="flat">
                    <Stack gap="md">
                      <Inline justify="between" align="center">
                        <Inline gap="sm" align="center">
                          <CardTitle>{doc.name}</CardTitle>
                          {doc.isRequired ? (
                            <Badge variant="warning" size="sm">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Optional
                            </Badge>
                          )}
                        </Inline>

                        <Inline gap="sm" align="center">
                          {getDocStatusBadge(doc.status)}
                          {doc.status !== 'Verified' && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleVerifyDocument(doc.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {doc.status !== 'Rejected' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectDocument(doc.id)}
                            >
                              Reject
                            </Button>
                          )}
                        </Inline>
                      </Inline>

                      <FormGrid columns={2} layout="horizontal" labelWidth="md">
                        {/* Document Number — Aadhaar/PAN have their own catalog-governed number field */}
                        {doc.id === 'documents.aadhaarFile' && aadhaarNumberField?.enabled ? (
                          <RegistrationField
                            fieldKey="documents.aadhaarNumber"
                            value={doc.docNumber}
                            helperText="12-digit UIDAI number (Confidential & Masked)"
                            error={
                              doc.docNumber && doc.docNumber.length !== 12
                                ? 'Aadhaar must be exactly 12 numeric digits'
                                : undefined
                            }
                          >
                            <Inline gap="xs" align="center">
                              <Input
                                type={showAadhaarNumber ? 'text' : 'password'}
                                placeholder="Enter 12-digit Aadhaar"
                                maxLength={12}
                                value={doc.docNumber}
                                onChange={(e) => {
                                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
                                  handleUpdateDocField(doc.id, 'docNumber', digitsOnly);
                                }}
                              />
                              <IconButton
                                type="button"
                                label={
                                  showAadhaarNumber
                                    ? 'Hide Aadhaar number'
                                    : 'Show Aadhaar number'
                                }
                                onClick={() => setShowAadhaarNumber((prev) => !prev)}
                              >
                                <BezentIcon
                                  name={showAadhaarNumber ? 'eye' : 'lock'}
                                  size={16}
                                />
                              </IconButton>
                            </Inline>
                          </RegistrationField>
                        ) : doc.id === 'documents.panFile' && panNumberField?.enabled ? (
                          <RegistrationField
                            fieldKey="documents.panNumber"
                            value={doc.docNumber}
                            helperText="Standard 10-character format: 5 letters, 4 digits, 1 letter"
                            error={
                              doc.docNumber &&
                              !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(doc.docNumber.trim().toUpperCase())
                                ? 'Valid 10-character PAN format required (e.g. ABCDE1234F)'
                                : undefined
                            }
                          >
                            <Input
                              type="text"
                              placeholder="e.g. ABCDE1234F"
                              maxLength={10}
                              value={doc.docNumber}
                              onChange={(e) =>
                                handleUpdateDocField(
                                  doc.id,
                                  'docNumber',
                                  e.target.value.toUpperCase().slice(0, 10),
                                )
                              }
                            />
                          </RegistrationField>
                        ) : (
                          <FormField label="Document Number">
                            <Input
                              type="text"
                              value={doc.docNumber}
                              onChange={(e) =>
                                handleUpdateDocField(doc.id, 'docNumber', e.target.value)
                              }
                            />
                          </FormField>
                        )}

                        {/* File Upload Control */}
                        <FormField
                          label="Document File"
                          helperText={
                            doc.fileSizeFormatted ? `Size: ${doc.fileSizeFormatted}` : undefined
                          }
                        >
                          <Inline gap="xs" align="center">
                            <input
                              ref={(el) => {
                                docFileInputRefs.current[doc.id] = el;
                              }}
                              type="file"
                              hidden
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleFileUpload(doc.id, e.target.files[0]);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => docFileInputRefs.current[doc.id]?.click()}
                            >
                              Choose File
                            </Button>
                            <span className="bezent-card__desc">
                              {doc.fileName || 'No file selected'}
                            </span>
                            {doc.fileName && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setPreviewingDoc({
                                    name: doc.name,
                                    url: doc.filePreviewUrl,
                                    fileName: doc.fileName,
                                  })
                                }
                              >
                                View
                              </Button>
                            )}
                          </Inline>
                        </FormField>

                        {/* Remarks */}
                        <FormField label="Remarks" span="full">
                          <Input
                            type="text"
                            placeholder="Optional notes or verification remarks..."
                            value={doc.remarks}
                            onChange={(e) =>
                              handleUpdateDocField(doc.id, 'remarks', e.target.value)
                            }
                          />
                        </FormField>
                      </FormGrid>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </FormSection>
          </Card>
        );
      })}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewingDoc && (
        <Modal
          isOpen={!!previewingDoc}
          onClose={() => setPreviewingDoc(null)}
          title={`Preview: ${previewingDoc.name}`}
          size="md"
        >
          <Stack gap="md" align="center">
            {previewingDoc.url ? (
              <img
                src={previewingDoc.url}
                alt={previewingDoc.name}
                className="bezent-photo-preview"
              />
            ) : (
              <Card variant="flat">
                <Stack gap="sm" align="center">
                  <BezentIcon name="documents" size={48} />
                  <strong>{previewingDoc.fileName}</strong>
                  <span className="bezent-card__desc">
                    Document file ready for review &amp; archiving.
                  </span>
                </Stack>
              </Card>
            )}

            <Button type="button" variant="secondary" onClick={() => setPreviewingDoc(null)}>
              Close Preview
            </Button>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
