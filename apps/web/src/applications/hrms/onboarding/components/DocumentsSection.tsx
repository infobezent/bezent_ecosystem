import { useState } from 'react';
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
    category: 'A. Identity & Government Documents',
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
    category: 'A. Identity & Government Documents',
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
    category: 'A. Identity & Government Documents',
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
    category: 'A. Identity & Government Documents',
    name: 'Voter ID',
    isRequired: false,
    docNumber: '',
    file: null,
    fileName: '',
    fileSizeFormatted: '',
    status: 'Not Required',
    remarks: '',
  },

  // B. ADDRESS PROOF (Utility Bill and Rent Agreement REMOVED)
  {
    id: 'doc-dl',
    category: 'B. Address Proof',
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
    category: 'C. Educational Records',
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
    category: 'C. Educational Records',
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
    category: 'C. Educational Records',
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
    category: 'C. Educational Records',
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
    category: 'C. Educational Records',
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
    category: 'C. Educational Records',
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
    category: 'D. Professional History',
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
    category: 'D. Professional History',
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
    category: 'D. Professional History',
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
    category: 'D. Professional History',
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
    category: 'D. Professional History',
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
    category: 'D. Professional History',
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
    category: 'D. Professional History',
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
    category: 'E. Financial & Tax Documents',
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
    category: 'E. Financial & Tax Documents',
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
    category: 'E. Financial & Tax Documents',
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

  // Handle Passport Photo Upload with Size Validation
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

  // AUTOMATION: Upload Document -> Automatically sets Status = Pending with File Size Validation
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

  // HR Approves Document -> Sets System Status = Verified
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

  // HR Rejects Document -> Sets System Status = Rejected
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

  // Group documents by category
  const categories = Array.from(new Set(documents.map((d) => d.category)));

  return (
    <div className="documents-section">
      {/* Banner Header */}
      <div className="employee-registration__section-header">
        <div className="employee-registration__section-icon-badge">
          <BezentIcon name="documents" size={22} />
        </div>
        <div className="employee-registration__section-title-group">
          <h2 className="employee-registration__section-title">
            Documents Vault &amp; Verification
          </h2>
          <p className="employee-registration__section-subtitle">
            Predefined document checklist, upload controls, system-controlled verification
            workflows, and 10 MB size limits.
          </p>
        </div>
      </div>

      {/* Global Upload Error Alert Banner */}
      {uploadErrorMsg && (
        <div className="documents-section__error-alert">
          <span className="documents-section__error-icon">⚠️</span>
          <span>{uploadErrorMsg}</span>
          <button
            type="button"
            className="documents-section__error-close"
            onClick={() => setUploadErrorMsg(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* DEDICATED PASSPORT-SIZE PHOTOGRAPH UPLOAD PROVISION */}
      <div className="documents-section__photo-card">
        <div className="documents-section__photo-card-header">
          <span className="documents-section__category-badge">Passport-size Photograph</span>
          <span className="documents-section__tag documents-section__tag--required">REQUIRED</span>
        </div>

        <div className="documents-section__upload-limits-note">
          Supported formats: <strong>JPG, JPEG, PNG</strong> &nbsp;|&nbsp; Maximum file size:{' '}
          <strong>10 MB</strong>
        </div>

        <div className="documents-section__photo-content">
          {passportPhoto.previewUrl ? (
            <div className="documents-section__photo-preview-box">
              <img
                src={passportPhoto.previewUrl}
                alt="Passport-size Photograph"
                className="documents-section__photo-preview-image"
              />
              <div className="documents-section__photo-meta">
                <span className="documents-section__photo-filename">{passportPhoto.fileName}</span>
                {passportPhoto.fileSizeFormatted && (
                  <span className="documents-section__photo-filesize">
                    Size: {passportPhoto.fileSizeFormatted}
                  </span>
                )}
                <div className="documents-section__photo-actions">
                  <label className="documents-section__photo-btn documents-section__photo-btn--replace">
                    📷 Replace Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="documents-section__file-input"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handlePhotoSelect(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="documents-section__photo-btn documents-section__photo-btn--remove"
                    onClick={handleRemovePhoto}
                  >
                    🗑 Remove Photo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <label className="documents-section__photo-placeholder-box">
              <BezentIcon name="employees" size={36} />
              <span className="documents-section__photo-placeholder-text">
                Click or drag to upload Passport-size Photograph
              </span>
              <span className="documents-section__photo-placeholder-hint">
                Supported formats: JPG, JPEG, PNG | Maximum file size: 10 MB
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="documents-section__file-input"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handlePhotoSelect(e.target.files[0]);
                  }
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Classification Automation Toggle */}
      <div className="documents-section__classification-card">
        <div className="documents-section__class-info">
          <span className="documents-section__class-title">Candidate Hiring Classification:</span>
          <span className="documents-section__class-desc">
            {isExperiencedHire
              ? 'Experienced Hire — showing full professional history & previous employer checklist'
              : 'Fresher — hiding unnecessary previous employment documents automatically'}
          </span>
        </div>
        <div className="documents-section__class-toggle">
          <button
            type="button"
            className={`documents-section__class-btn ${
              isExperiencedHire ? 'documents-section__class-btn--active' : ''
            }`}
            onClick={() => updateClassification(true)}
          >
            Experienced Hire
          </button>
          <button
            type="button"
            className={`documents-section__class-btn ${
              !isExperiencedHire ? 'documents-section__class-btn--active' : ''
            }`}
            onClick={() => updateClassification(false)}
          >
            Fresher
          </button>
        </div>
      </div>

      {/* PREDEFINED DOCUMENT CHECKLIST */}
      <div className="documents-section__container">
        {categories.map((cat) => {
          // AUTOMATION: Hide Professional History if Fresher
          if (!isExperiencedHire && cat.includes('Professional History')) {
            return null;
          }

          const catDocs = documents.filter((d) => d.category === cat);

          return (
            <div key={cat} className="documents-section__card">
              <div className="documents-section__card-header">
                <span className="documents-section__category-badge">{cat}</span>
              </div>

              <div className="documents-section__list">
                {catDocs.map((doc) => (
                  <div key={doc.id} className="documents-section__item-box">
                    {/* Item Header */}
                    <div className="documents-section__item-header">
                      <div className="documents-section__item-title-row">
                        <span className="documents-section__item-name">{doc.name}</span>
                        {doc.isRequired ? (
                          <span className="documents-section__tag documents-section__tag--required">
                            REQUIRED
                          </span>
                        ) : (
                          <span className="documents-section__tag documents-section__tag--optional">
                            OPTIONAL
                          </span>
                        )}
                      </div>

                      {/* System-Controlled Verification Status & HR Actions */}
                      <div className="documents-section__status-group">
                        <span
                          className={`documents-section__status-badge documents-section__status-badge--${doc.status.toLowerCase().replace(' ', '-')}`}
                        >
                          ● {doc.status}
                        </span>
                        {doc.status !== 'Verified' && (
                          <button
                            type="button"
                            className="documents-section__verify-btn"
                            onClick={() => handleVerifyDocument(doc.id)}
                          >
                            ✓ Approve
                          </button>
                        )}
                        {doc.status !== 'Rejected' && (
                          <button
                            type="button"
                            className="documents-section__reject-btn"
                            onClick={() => handleRejectDocument(doc.id)}
                          >
                            ✕ Reject
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Document Upload & Input Fields (Simplified: Verified By, Dates REMOVED) */}
                    <div className="documents-section__item-fields-simplified">
                      {/* 1. Document Number */}
                      <div className="employee-registration__field">
                        <label className="employee-registration__label">Document Number</label>
                        <input
                          type="text"
                          className="employee-registration__input"
                          placeholder="e.g. ID / Reference #"
                          value={doc.docNumber}
                          onChange={(e) =>
                            handleUpdateDocField(doc.id, 'docNumber', e.target.value)
                          }
                        />
                      </div>

                      {/* 2. File Upload Control with Specs Note & Size Display */}
                      <div className="employee-registration__field documents-section__field--span-2">
                        <label className="employee-registration__label">
                          Upload Document{' '}
                          <span className="documents-section__upload-spec">
                            (PDF, JPG, JPEG, PNG | Max 10 MB)
                          </span>
                        </label>
                        <div className="documents-section__upload-row">
                          <label className="documents-section__upload-label">
                            📁 Choose File
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              className="documents-section__file-input"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleFileUpload(doc.id, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                          <div className="documents-section__file-info-group">
                            <span className="documents-section__file-name">
                              {doc.fileName || 'No file selected'}
                            </span>
                            {doc.fileSizeFormatted && (
                              <span className="documents-section__file-size-badge">
                                ({doc.fileSizeFormatted})
                              </span>
                            )}
                          </div>
                          {doc.fileName && (
                            <button
                              type="button"
                              className="documents-section__preview-btn"
                              onClick={() =>
                                setPreviewingDoc({
                                  name: doc.name,
                                  url: doc.filePreviewUrl,
                                  fileName: doc.fileName,
                                })
                              }
                            >
                              👁 View / Preview
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 3. Remarks */}
                      <div className="employee-registration__field documents-section__field--span-full">
                        <label className="employee-registration__label">
                          Verification Remarks / Notes
                        </label>
                        <input
                          type="text"
                          className="employee-registration__input"
                          placeholder="Optional notes or rejection remarks..."
                          value={doc.remarks}
                          onChange={(e) => handleUpdateDocField(doc.id, 'remarks', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewingDoc && (
        <div className="documents-section__modal-overlay">
          <div className="documents-section__modal-card">
            <div className="documents-section__modal-header">
              <h3>Preview: {previewingDoc.name}</h3>
              <button
                type="button"
                className="documents-section__modal-close-icon"
                onClick={() => setPreviewingDoc(null)}
              >
                ✕
              </button>
            </div>
            <div className="documents-section__modal-body">
              {previewingDoc.url ? (
                <img
                  src={previewingDoc.url}
                  alt={previewingDoc.name}
                  className="documents-section__modal-img"
                />
              ) : (
                <div className="documents-section__modal-doc-preview">
                  <BezentIcon name="documents" size={48} />
                  <p>
                    <strong>{previewingDoc.fileName}</strong>
                  </p>
                  <p className="documents-section__modal-hint">
                    Document file ready for review &amp; archiving.
                  </p>
                </div>
              )}
            </div>
            <div className="documents-section__modal-footer">
              <button
                type="button"
                className="employee-registration__cancel-btn"
                onClick={() => setPreviewingDoc(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
