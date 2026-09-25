import {
  EmployeeDocumentRepository,
  type EmployeeDocumentRow,
  type ExpiryWindow,
} from '../repository/employeeDocument.repository.js';
import { EmployeeRepository } from '../../employees/repository/employee.repository.js';
import {
  validateCreateEmployeeDocument,
  validateListEmployeeDocumentsQuery,
} from '../validation/employeeDocument.schema.js';
import {
  EXPIRY_WARNING_DAYS,
  type EmployeeDocumentListItem,
  type ExpiryState,
  type PaginatedEmployeeDocumentsResult,
} from '../types/employeeDocument.types.js';
import { NotFoundError } from '../../../../app/errors/AppError.js';

/** Server-local calendar date as YYYY-MM-DD. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function expiryWindow(today: string): ExpiryWindow {
  return { today, warningUntil: addDays(today, EXPIRY_WARNING_DAYS) };
}

/** Expiry state from the real expiry date only; documents without one have none. */
export function expiryStateOf(expiryDate: string | null, window: ExpiryWindow): ExpiryState {
  if (!expiryDate) return null;
  if (expiryDate < window.today) return 'expired';
  if (expiryDate <= window.warningUntil) return 'expiring';
  return 'valid';
}

/**
 * Documents domain service — the canonical employee-document lifecycle.
 * Verification transitions (Review / Verify / Reject / Request Resubmission)
 * are not exposed yet: they arrive together with real file storage.
 */
export class EmployeeDocumentService {
  constructor(
    private readonly repo = new EmployeeDocumentRepository(),
    private readonly employeeRepo = new EmployeeRepository(),
    private readonly today: () => string = todayIsoDate,
  ) {}

  private toItem(row: EmployeeDocumentRow, window: ExpiryWindow): EmployeeDocumentListItem {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber,
      employeeName: row.employeeLastName
        ? `${row.employeeFirstName} ${row.employeeLastName}`
        : row.employeeFirstName,
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      category: row.category,
      documentName: row.documentName,
      documentNumber: row.documentNumber,
      status: row.status,
      expiryDate: row.expiryDate,
      expiryState: expiryStateOf(row.expiryDate, window),
      verificationRemarks: row.verificationRemarks,
      fileAvailable: false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listDocuments(
    tenantId: string,
    companyId: string,
    query: Record<string, unknown> = {},
  ): Promise<PaginatedEmployeeDocumentsResult> {
    const params = validateListEmployeeDocumentsQuery(query);
    const window = expiryWindow(this.today());
    const { rows, totalItems, counts } = await this.repo.list(tenantId, companyId, params, window);

    return {
      items: rows.map((row) => this.toItem(row, window)),
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / params.pageSize) || 1,
      },
      counts,
    };
  }

  async getDocument(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<EmployeeDocumentListItem> {
    const row = await this.repo.getById(tenantId, companyId, id);
    if (!row) {
      throw new NotFoundError(`Employee document not found for ID: ${id}`);
    }
    return this.toItem(row, expiryWindow(this.today()));
  }

  /** Records document metadata for an employee of the active company (status Pending). */
  async createDocument(
    tenantId: string,
    companyId: string,
    input: unknown,
  ): Promise<EmployeeDocumentListItem> {
    const dto = validateCreateEmployeeDocument(input);
    const employee = await this.employeeRepo.getById(tenantId, companyId, dto.employeeId);
    if (!employee) {
      throw new NotFoundError(`Employee not found for ID: ${dto.employeeId}`);
    }

    const id = await this.repo.create(tenantId, companyId, dto);
    return this.getDocument(tenantId, companyId, id);
  }
}
