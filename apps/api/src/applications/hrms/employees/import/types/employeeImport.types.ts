export interface ImportOptions {
  skipDuplicates?: boolean;
  sendInvitations?: boolean;
  autoGenerateId?: boolean;
}

export type ImportIssueCategory = 'required' | 'format' | 'duplicate' | 'reference';

export interface ImportIssue {
  category: ImportIssueCategory;
  field: string;
  message: string;
}

export type ImportRowStatus = 'valid' | 'error' | 'duplicate' | 'imported' | 'skipped';

export interface ParsedEmployeeRow {
  rowNumber: number;
  employeeNumber?: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  workEmail: string;
  personalEmail?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfJoining: string;
  employmentType: string;
  employeeStatus: string;
  department?: string;
  designation?: string;
  jobLevel?: string;
  reportingManagerId?: string;
  workLocation?: string;
  probationStartDate?: string;
  probationEndDate?: string;
  confirmationDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  skills?: string;
  notes?: string;
  status: ImportRowStatus;
  issues: ImportIssue[];
  rawData: Record<string, unknown>;
  // Resolved foreign keys:
  departmentId?: string | null;
  designationId?: string | null;
  locationId?: string | null;
  resolvedReportingManagerId?: string | null;
}

export interface ValidationSummary {
  id: string;
  fileName: string;
  fileFormat: 'xlsx' | 'csv';
  fileSize: number;
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  duplicateRecords: number;
  status: string;
  options: ImportOptions;
  rows: Array<{
    id?: string;
    rowNumber: number;
    employeeName: string;
    employeeNumber?: string;
    workEmail?: string;
    department?: string;
    designation?: string;
    workLocation?: string;
    status: ImportRowStatus;
    issues: ImportIssue[];
    rawData?: Record<string, unknown>;
  }>;
}

export interface ProcessImportResult {
  importId: string;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  status: 'completed' | 'completed_with_errors' | 'failed';
  message: string;
}
