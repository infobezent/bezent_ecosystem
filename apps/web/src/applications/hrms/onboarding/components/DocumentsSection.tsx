import { useState, useRef } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Button,
  Badge,
  Card,
  CardTitle,
  Modal,
  Alert,
  Stack,
  Inline,
} from '../../../../design-system';
import { BezentIcon } from '../../../../design-system/icons';

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

export const INITIAL_DOCUMENTS: DocumentItemState[] = [
  // A. IDENTITY & GOVERNMENT
  {
    id: 'doc-aadhaar',
    category: 'Identity & Government Documents',
    name: 'Aadhaar Card',
    isRequired: true,
    docNumber: '5482 9102 3341',
    file: null,
    fileName: 'Aadhaar_ArunKumar.pdf',
    fileSizeFormatted: '1.2 MB',
    status: 'Verified',
    remarks: 'Verified against UIDAI portal',
  },
  {
    id: 'doc-pan',
    category: 'Identity & Government Documents',
    name: 'PAN Card',
    isRequired: true,
    docNumber: 'ABCDE1234F',
    file: null,
    fileName: 'PAN_ArunKumar.pdf',
    fileSizeFormatted: '850 KB',
    status: 'Verified',
    remarks: 'Valid NSDL PAN record',
  },
  {
    id: 'doc-passport',
    category: 'Identity & Government Documents',
    name: 'Passport',
    isRequired: false,
    docNumber: 'Z8920192',
    file: null,
    fileName: '',
    fileSizeFormatted: '',
    status: 'Pending',
    remarks: '',
  },
  {
    id: 'doc-voter',
    category: 'Identity & Government Documents',
    name: 'Voter ID',
    isRequired: false,
    docNumber: '',
    file: null,
    fileName: '',
    fileSizeFormatted: '',
    status: 'Not Required',
    remarks: '',
  },

  // B. ADDRESS PROOF
  {
    id: 'doc-dl',
    category: 'Address Proof Documents',
    name: 'Driving License',
    isRequired: false,
    docNumber: 'TN-07-202100912',
    file: null,
    fileName: '',
    fileSizeFormatted: '',
    status: 'Pending',
    remarks: '',
  },

  // C. EDUCATIONAL RECORDS
  {
    id: 'doc-class10',
    category: 'Educational Records',
    name: 'Class 10 Marksheet / Certificate',
    isRequired: true,
    docNumber: 'CBSE-10-88912',
    file: null,
    fileName: 'Class10_Marksheet.pdf',
    fileSizeFormatted: '2.1 MB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-class12',
    category: 'Educational Records',
    name: 'Class 12 Marksheet / Certificate',
    isRequired: true,
    docNumber: 'CBSE-12-99012',
    file: null,
    fileName: 'Class12_Marksheet.pdf',
    fileSizeFormatted: '1.8 MB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-grad',
    category: 'Educational Records',
    name: 'Graduation Degree / Certificate (B.Tech)',
    isRequired: true,
    docNumber: 'AU-BTECH-2022-091',
    file: null,
    fileName: 'BTech_Degree_Certificate.pdf',
    fileSizeFormatted: '3.4 MB',
    status: 'Verified',
    remarks: 'First Class with Distinction',
  },
  {
    id: 'doc-semesters',
    category: 'Educational Records',
    name: 'Semester Mark Sheets',
    isRequired: true,
    docNumber: 'S1-S8 Consolidated',
    file: null,
    fileName: 'Consolidated_Marksheets.pdf',
    fileSizeFormatted: '4.5 MB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-postgrad',
    category: 'Educational Records',
    name: 'Post-Graduation Certificate',
    isRequired: false,
    docNumber: '',
    file: null,
    fileName: '',
    fileSizeFormatted: '',
    status: 'Not Required',
    remarks: 'N/A for B.Tech hire',
  },
  {
    id: 'doc-certifications',
    category: 'Educational Records',
    name: 'Professional / Technical Certifications',
    isRequired: false,
    docNumber: 'AWS-SOL-ARCH-8821',
    file: null,
    fileName: 'AWS_Solutions_Architect.pdf',
    fileSizeFormatted: '1.1 MB',
    status: 'Verified',
    remarks: 'Active AWS Certification',
  },

  // D. PROFESSIONAL HISTORY (Experienced Only)
  {
    id: 'doc-prev-appt',
    category: 'Professional History',
    name: 'Previous Appointment Letter',
    isRequired: true,
    docNumber: 'PREV-EMP-1029',
    file: null,
    fileName: 'Previous_Offer_Letter.pdf',
    fileSizeFormatted: '1.5 MB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-exp-cert',
    category: 'Professional History',
    name: 'Experience Certificate',
    isRequired: true,
    docNumber: 'EXP-2026-88',
    file: null,
    fileName: 'Experience_Certificate.pdf',
    fileSizeFormatted: '920 KB',
    status: 'Verified',
    remarks: '3.5 years experience confirmed',
  },
  {
    id: 'doc-relieving',
    category: 'Professional History',
    name: 'Relieving Letter',
    isRequired: true,
    docNumber: 'REL-2026-091',
    file: null,
    fileName: 'Relieving_Letter.pdf',
    fileSizeFormatted: '880 KB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-slips',
    category: 'Professional History',
    name: 'Salary Slips (Last 3 Months)',
    isRequired: true,
    docNumber: 'Dec25-Feb26',
    file: null,
    fileName: 'Payslips_Dec_Jan_Feb.pdf',
    fileSizeFormatted: '2.8 MB',
    status: 'Verified',
    remarks: 'Verified salary figures',
  },
  {
    id: 'doc-form16',
    category: 'Professional History',
    name: 'Form 16 / Tax Statement',
    isRequired: true,
    docNumber: 'AY-2025-26',
    file: null,
    fileName: 'Form16_FY2425.pdf',
    fileSizeFormatted: '2.0 MB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-resignation',
    category: 'Professional History',
    name: 'Resignation / Exit Acceptance',
    isRequired: true,
    docNumber: 'EXIT-ACC-99',
    file: null,
    fileName: 'Resignation_Acceptance_Mail.pdf',
    fileSizeFormatted: '650 KB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-nodues',
    category: 'Professional History',
    name: 'No-Dues Certificate',
    isRequired: false,
    docNumber: 'NDC-9912',
    file: null,
    fileName: 'No_Dues_Clearance.pdf',
    fileSizeFormatted: '710 KB',
    status: 'Verified',
    remarks: '',
  },

  // E. FINANCIAL & TAX DOCUMENTS
  {
    id: 'doc-pan-doc',
    category: 'Financial & Tax Documents',
    name: 'PAN Document Scan',
    isRequired: true,
    docNumber: 'ABCDE1234F',
    file: null,
    fileName: 'PAN_Scan.pdf',
    fileSizeFormatted: '850 KB',
    status: 'Verified',
    remarks: '',
  },
  {
    id: 'doc-bank-proof',
    category: 'Financial & Tax Documents',
    name: 'Bank Account Proof (Cancelled Cheque / Passbook)',
    isRequired: true,
    docNumber: 'CHEQUE-000192',
    file: null,
    fileName: 'Cancelled_Cheque_HDFC.pdf',
    fileSizeFormatted: '1.4 MB',
    status: 'Verified',
    remarks: 'Account & IFSC confirmed',
  },
  {
    id: 'doc-uan',
    category: 'Financial & Tax Documents',
    name: 'UAN / PF Details Document',
    isRequired: false,
    docNumber: '100918273645',
    file: null,
    fileName: 'UAN_Passbook_Summary.pdf',
    fileSizeFormatted: '1.9 MB',
    status: 'Verified',
    remarks: 'Active UAN linked',
  },
];

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
  const [internalDocs, setInternalDocs] = useState<DocumentItemState[]>(INITIAL_DOCUMENTS);
  const [internalExperienced, setInternalExperienced] = useState(true);
  const [internalPhoto, setInternalPhoto] = useState<PassportPhotoState>({
    file: null,
    fileName: 'Passport_Photo.png',
    fileSizeFormatted: '450 KB',
    previewUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'Verified',
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
      <FormSection
        title="Passport-Size Photograph"
        description="Upload a clear front-facing photograph. Formats: JPG, PNG (Max 10 MB)."
      >
        <Card variant="flat">
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
                    {passportPhoto.fileName} ({passportPhoto.fileSizeFormatted})
                  </span>
                )}
              </Inline>
            </Stack>
          </Inline>
        </Card>
      </FormSection>

      {/* 2. CLASSIFICATION AUTOMATION */}
      <FormSection
        title="Hiring Classification"
        description="Toggle candidate hiring classification to automatically adjust required document checklist."
      >
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

      {/* 3. DOCUMENT CHECKLIST BY CATEGORY */}
      {categories.map((cat) => {
        if (!isExperiencedHire && cat.includes('Professional History')) {
          return null;
        }

        const catDocs = documents.filter((d) => d.category === cat);

        return (
          <FormSection
            key={cat}
            title={cat}
            description={`Verify and maintain ${cat.toLowerCase()}.`}
          >
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
                      {/* Document Number */}
                      <FormField label="Document Number">
                        <Input
                          type="text"
                          placeholder="e.g. ID / Reference #"
                          value={doc.docNumber}
                          onChange={(e) =>
                            handleUpdateDocField(doc.id, 'docNumber', e.target.value)
                          }
                        />
                      </FormField>

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
                          onChange={(e) => handleUpdateDocField(doc.id, 'remarks', e.target.value)}
                        />
                      </FormField>
                    </FormGrid>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </FormSection>
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
