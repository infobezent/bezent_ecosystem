import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

export interface ImportOptions {
  skipDuplicates?: boolean;
  sendInvitations?: boolean;
  autoGenerateId?: boolean;
}

export interface ImportIssue {
  category: 'required' | 'format' | 'duplicate' | 'reference';
  field: string;
  message: string;
}

export type ImportRowStatus = 'valid' | 'error' | 'duplicate' | 'imported' | 'skipped';

export interface ImportRowItem {
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
  rows: ImportRowItem[];
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

export interface EmployeeImportRecord {
  id: string;
  tenantId: string;
  companyId: string;
  fileName: string;
  fileFormat: 'xlsx' | 'csv';
  fileSize: number;
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  duplicateRecords: number;
  importedRecords: number;
  status:
    | 'pending'
    | 'validating'
    | 'validated'
    | 'processing'
    | 'completed'
    | 'completed_with_errors'
    | 'failed'
    | 'cancelled';
  options: ImportOptions;
  createdByUserId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export class EmployeeImportApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'EmployeeImportApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const error = (body as { error?: { message?: string; code?: string } } | null)?.error;
    throw new EmployeeImportApiError(
      error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      error?.code ?? 'REQUEST_FAILED',
    );
  }

  return body as T;
}

export async function downloadTemplate(
  type: 'basic' | 'complete' = 'basic',
  format: 'xlsx' | 'csv' = 'xlsx',
): Promise<Blob> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/employees/import/template?type=${type}&format=${format}`,
  );
  if (!res.ok) {
    throw new EmployeeImportApiError('Failed to download template', res.status, 'DOWNLOAD_FAILED');
  }
  return res.blob();
}

export async function validateImportFile(
  file: File,
  options?: ImportOptions,
): Promise<ValidationSummary> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const res = await authorizedFetch(
          `${appConfig.apiBaseUrl}/hrms/employees/import/validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              fileFormat: file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx',
              fileBase64: base64String,
              options,
            }),
          },
        );
        const json = await handleResponse<{ data: ValidationSummary }>(res);
        resolve(json.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });
}

export async function processImport(
  importId: string,
  options?: ImportOptions,
): Promise<ProcessImportResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/employees/import/${encodeURIComponent(importId)}/process`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ options }),
    },
  );
  const json = await handleResponse<{ data: ProcessImportResult }>(res);
  return json.data;
}

export async function fetchImportHistory(): Promise<EmployeeImportRecord[]> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/employees/import/history`);
  const json = await handleResponse<{ data: EmployeeImportRecord[] }>(res);
  return json.data;
}

export async function fetchImportDetails(importId: string): Promise<ValidationSummary> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/employees/import/${encodeURIComponent(importId)}`,
  );
  const json = await handleResponse<{ data: ValidationSummary }>(res);
  return json.data;
}

export async function downloadErrorReport(importId: string): Promise<Blob> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/employees/import/${encodeURIComponent(importId)}/error-report`,
  );
  if (!res.ok) {
    throw new EmployeeImportApiError(
      'Failed to download error report',
      res.status,
      'DOWNLOAD_FAILED',
    );
  }
  return res.blob();
}
