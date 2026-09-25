import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, gte, inArray, like, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { departments, employeeDocuments, employees } from '../../../../db/schema.js';
import {
  PENDING_REVIEW_STATUSES,
  type CreateEmployeeDocumentDto,
  type DocumentView,
  type DocumentViewCounts,
  type ListEmployeeDocumentsParams,
} from '../types/employeeDocument.types.js';

/** Row shape before derived fields (expiry state) are added by the service. */
export interface EmployeeDocumentRow {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeFirstName: string;
  employeeLastName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  category: (typeof employeeDocuments.category.enumValues)[number];
  documentName: string;
  documentNumber: string | null;
  status: (typeof employeeDocuments.status.enumValues)[number];
  expiryDate: string | null;
  verificationRemarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const rowSelection = {
  id: employeeDocuments.id,
  employeeId: employeeDocuments.employeeId,
  employeeNumber: employees.employeeNumber,
  employeeFirstName: employees.firstName,
  employeeLastName: employees.lastName,
  departmentId: employees.departmentId,
  departmentName: departments.name,
  category: employeeDocuments.category,
  documentName: employeeDocuments.documentName,
  documentNumber: employeeDocuments.documentNumber,
  status: employeeDocuments.status,
  expiryDate: employeeDocuments.expiryDate,
  verificationRemarks: employeeDocuments.verificationRemarks,
  createdAt: employeeDocuments.createdAt,
  updatedAt: employeeDocuments.updatedAt,
};

/** Dates the expiry views are evaluated against (YYYY-MM-DD, lexically comparable). */
export interface ExpiryWindow {
  today: string;
  warningUntil: string;
}

export class EmployeeDocumentRepository {
  /** Documents joined to their employee and department — all constrained to one tenant/company. */
  private selectRows(tenantId: string, companyId: string) {
    return getDb()
      .select(rowSelection)
      .from(employeeDocuments)
      .innerJoin(
        employees,
        and(
          eq(employeeDocuments.employeeId, employees.id),
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
        ),
      )
      .leftJoin(
        departments,
        and(
          eq(employees.departmentId, departments.id),
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
        ),
      );
  }

  private scope(tenantId: string, companyId: string): SQL[] {
    return [eq(employeeDocuments.tenantId, tenantId), eq(employeeDocuments.companyId, companyId)];
  }

  private viewCondition(view: DocumentView, window: ExpiryWindow): SQL | undefined {
    switch (view) {
      case 'pending_review':
        return inArray(employeeDocuments.status, PENDING_REVIEW_STATUSES);
      case 'expiring':
        return and(
          gte(employeeDocuments.expiryDate, window.today),
          lte(employeeDocuments.expiryDate, window.warningUntil),
        );
      case 'expired':
        return or(
          lt(employeeDocuments.expiryDate, window.today),
          eq(employeeDocuments.status, 'expired'),
        );
      default:
        return undefined;
    }
  }

  async create(
    tenantId: string,
    companyId: string,
    dto: CreateEmployeeDocumentDto,
  ): Promise<string> {
    const id = `edoc_${randomUUID()}`;
    const now = new Date();
    await getDb().insert(employeeDocuments).values({
      id,
      tenantId,
      companyId,
      employeeId: dto.employeeId,
      category: dto.category,
      documentName: dto.documentName,
      documentNumber: dto.documentNumber,
      expiryDate: dto.expiryDate,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  async getById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<EmployeeDocumentRow | null> {
    const rows = await this.selectRows(tenantId, companyId)
      .where(and(...this.scope(tenantId, companyId), eq(employeeDocuments.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async list(
    tenantId: string,
    companyId: string,
    params: ListEmployeeDocumentsParams,
    window: ExpiryWindow,
  ): Promise<{ rows: EmployeeDocumentRow[]; totalItems: number; counts: DocumentViewCounts }> {
    const db = getDb();

    // Filters shared by the list and the per-view counts.
    const shared: SQL[] = [...this.scope(tenantId, companyId)];
    if (params.category) shared.push(eq(employeeDocuments.category, params.category));
    if (params.status) shared.push(eq(employeeDocuments.status, params.status));
    if (params.employeeId) shared.push(eq(employeeDocuments.employeeId, params.employeeId));
    if (params.departmentId) shared.push(eq(employees.departmentId, params.departmentId));
    if (params.search) {
      const pattern = `%${params.search}%`;
      shared.push(
        or(
          like(employeeDocuments.documentName, pattern),
          like(employeeDocuments.documentNumber, pattern),
          like(employees.firstName, pattern),
          like(employees.lastName, pattern),
          like(employees.employeeNumber, pattern),
        )!,
      );
    }

    const viewFilter = this.viewCondition(params.view, window);
    const listWhere = and(...shared, ...(viewFilter ? [viewFilter] : []));

    const countFor = (view: DocumentView) => {
      const condition = this.viewCondition(view, window);
      return condition
        ? sql<number>`COALESCE(SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END), 0)`
        : count();
    };

    const joinedFrom = () =>
      db
        .select({
          all: countFor('all'),
          pending_review: countFor('pending_review'),
          expiring: countFor('expiring'),
          expired: countFor('expired'),
        })
        .from(employeeDocuments)
        .innerJoin(
          employees,
          and(
            eq(employeeDocuments.employeeId, employees.id),
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
          ),
        );

    const [countsRows, totalRows, rows] = await Promise.all([
      joinedFrom().where(and(...shared)),
      db
        .select({ total: count() })
        .from(employeeDocuments)
        .innerJoin(
          employees,
          and(
            eq(employeeDocuments.employeeId, employees.id),
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
          ),
        )
        .where(listWhere),
      this.selectRows(tenantId, companyId)
        .where(listWhere)
        .orderBy(desc(employeeDocuments.updatedAt), desc(employeeDocuments.id))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
    ]);

    const countsRow = countsRows[0];
    return {
      rows,
      totalItems: totalRows[0]?.total ?? 0,
      counts: {
        all: Number(countsRow?.all ?? 0),
        pending_review: Number(countsRow?.pending_review ?? 0),
        expiring: Number(countsRow?.expiring ?? 0),
        expired: Number(countsRow?.expired ?? 0),
      },
    };
  }
}
