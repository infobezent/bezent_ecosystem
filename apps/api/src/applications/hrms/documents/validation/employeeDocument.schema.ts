import { ValidationError } from '../../../../app/errors/AppError.js';
import { DATE_REGEX } from '../../employees/validation/employee.schema.js';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  DOCUMENT_VIEWS,
  type CreateEmployeeDocumentDto,
  type DocumentCategory,
  type DocumentStatus,
  type DocumentView,
  type ListEmployeeDocumentsParams,
} from '../types/employeeDocument.types.js';

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function optionalText(
  data: Record<string, unknown>,
  key: string,
  label: string,
  max: number,
  errors: Record<string, string>,
): string | null {
  const value = data[key];
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    return null;
  }
  if (typeof value !== 'string') {
    errors[key] = `${label} must be a string`;
    return null;
  }
  if (value.trim().length > max) {
    errors[key] = `${label} must not exceed ${max} characters`;
    return null;
  }
  return value.trim();
}

/**
 * Validates document metadata. File fields are not accepted: binary file
 * storage does not exist, so no file can be associated with a document yet.
 */
export function validateCreateEmployeeDocument(input: unknown): CreateEmployeeDocumentDto {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.employeeId !== 'string' || !data.employeeId.trim()) {
    errors.employeeId = 'Employee is required';
  } else if (data.employeeId.trim().length > 64) {
    errors.employeeId = 'Employee ID must not exceed 64 characters';
  }

  if (!DOCUMENT_CATEGORIES.includes(data.category as DocumentCategory)) {
    errors.category = `Category must be one of: ${DOCUMENT_CATEGORIES.join(', ')}`;
  }

  if (typeof data.documentName !== 'string' || !data.documentName.trim()) {
    errors.documentName = 'Document name is required';
  } else if (data.documentName.trim().length > 150) {
    errors.documentName = 'Document name must not exceed 150 characters';
  }

  const documentNumber = optionalText(data, 'documentNumber', 'Document number', 100, errors);

  let expiryDate: string | null = null;
  const rawExpiry = optionalText(data, 'expiryDate', 'Expiry date', 10, errors);
  if (rawExpiry) {
    if (!isValidDate(rawExpiry)) {
      errors.expiryDate = 'Expiry date must be a valid date in YYYY-MM-DD format';
    } else {
      expiryDate = rawExpiry;
    }
  }

  for (const key of ['status', 'verificationRemarks', 'fileName', 'file', 'fileUrl']) {
    if (data[key] !== undefined) {
      errors[key] =
        key === 'status' || key === 'verificationRemarks'
          ? 'New documents always start as Pending; verification is a separate step'
          : 'File upload is not supported yet';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee document', errors);
  }

  return {
    employeeId: (data.employeeId as string).trim(),
    category: data.category as DocumentCategory,
    documentName: (data.documentName as string).trim(),
    documentNumber,
    expiryDate,
  };
}

export function validateListEmployeeDocumentsQuery(
  input: Record<string, unknown>,
): ListEmployeeDocumentsParams {
  const pageNum = Number(input.page);
  const sizeNum = Number(input.pageSize);

  const params: ListEmployeeDocumentsParams = {
    page: Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1,
    pageSize: Number.isInteger(sizeNum) && sizeNum > 0 && sizeNum <= 100 ? sizeNum : 25,
    view: DOCUMENT_VIEWS.includes(input.view as DocumentView)
      ? (input.view as DocumentView)
      : 'all',
  };

  if (typeof input.search === 'string' && input.search.trim()) {
    params.search = input.search.trim();
  }
  if (DOCUMENT_CATEGORIES.includes(input.category as DocumentCategory)) {
    params.category = input.category as DocumentCategory;
  }
  if (DOCUMENT_STATUSES.includes(input.status as DocumentStatus)) {
    params.status = input.status as DocumentStatus;
  }
  if (typeof input.departmentId === 'string' && input.departmentId.trim()) {
    params.departmentId = input.departmentId.trim();
  }
  if (typeof input.employeeId === 'string' && input.employeeId.trim()) {
    params.employeeId = input.employeeId.trim();
  }

  return params;
}
