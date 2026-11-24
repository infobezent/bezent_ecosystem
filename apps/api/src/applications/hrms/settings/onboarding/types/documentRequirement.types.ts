export type DocumentCategoryCode =
  | 'identity_proof'
  | 'address_proof'
  | 'educational_certificates'
  | 'employment_documents'
  | 'bank_documents'
  | 'other_documents'
  | (string & {});

export interface DocumentCategory {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentCategoryDto {
  name: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateDocumentCategoryDto {
  name?: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ReorderDocumentCategoriesDto {
  categoryIds: string[];
}

export interface DocumentRequirementUploadConfig {
  allowedFormats: string[]; // e.g. ['pdf', 'jpg', 'png', 'docx']
  maxFileSizeMb: number; // e.g. 5, 10
  allowMultiple: boolean;
  maxFiles: number; // e.g. 1 to 10
  expiryApplicable: boolean;
  requireExpiry: boolean;
}

export interface DocumentRequirementVerificationConfig {
  verificationRequired: boolean;
  verificationResponsibility: 'hr' | 'specific_role';
  specificRoleName?: string | null;
  allowReupload: boolean;
  reverificationOnExpiry: boolean;
}

export interface DocumentApplicabilityRule {
  allEmployees: boolean;
  employmentTypes: string[]; // e.g. ['full_time', 'part_time', 'contract', 'intern']
  departmentIds: string[];
  locationIds: string[];
  pipelineIds: string[];
  stageKeys: string[];
}

export interface DocumentRequirement {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  documentType: string;
  description?: string | null;
  categoryId: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  uploadConfig: DocumentRequirementUploadConfig;
  verificationConfig: DocumentRequirementVerificationConfig;
  applicability: DocumentApplicabilityRule;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRequirementDto {
  name: string;
  documentType?: string;
  description?: string | null;
  categoryId: string;
  isRequired?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  uploadConfig?: Partial<DocumentRequirementUploadConfig>;
  verificationConfig?: Partial<DocumentRequirementVerificationConfig>;
  applicability?: Partial<DocumentApplicabilityRule>;
}

export interface UpdateDocumentRequirementDto {
  name?: string;
  description?: string | null;
  categoryId?: string;
  isRequired?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  uploadConfig?: Partial<DocumentRequirementUploadConfig>;
  verificationConfig?: Partial<DocumentRequirementVerificationConfig>;
  applicability?: Partial<DocumentApplicabilityRule>;
}

export interface SaveDocumentApplicabilityDto {
  allEmployees: boolean;
  employmentTypes?: string[];
  departmentIds?: string[];
  locationIds?: string[];
  pipelineIds?: string[];
  stageKeys?: string[];
}

export interface CandidateDocumentFile {
  fileId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  storageKey?: string;
  downloadUrl?: string;
}

export interface DocumentVerificationHistoryEntry {
  id: string;
  action: 'uploaded' | 'verified' | 'rejected' | 'reupload_requested' | 'reuploaded';
  timestamp: string;
  actorId: string;
  actorRole: string;
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  remarks?: string | null;
  version: number;
}

export interface CandidateDocumentInstance {
  id: string;
  caseId: string;
  requirementId: string;
  documentName: string;
  documentType: string;
  categoryId: string;
  categoryName: string;
  isRequired: boolean;
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';
  documentNumber?: string | null;
  expiryDate?: string | null;
  isExpired?: boolean;
  uploadConfig: DocumentRequirementUploadConfig;
  verificationConfig: DocumentRequirementVerificationConfig;
  uploadedFiles: CandidateDocumentFile[];
  rejectionReason?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  version: number;
  history: DocumentVerificationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadCandidateDocumentDto {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  documentNumber?: string | null;
  expiryDate?: string | null;
  fileContentBase64?: string;
  storageKey?: string;
}

export interface VerifyCandidateDocumentDto {
  status: 'approved' | 'rejected';
  remarks?: string | null;
  documentNumber?: string | null;
  expiryDate?: string | null;
}

export interface RequestCandidateReuploadDto {
  reason: string;
}

export interface ResolveCandidateDocumentsParams {
  caseId: string;
  employmentType?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  pipelineId?: string | null;
  stageKey?: string | null;
}
