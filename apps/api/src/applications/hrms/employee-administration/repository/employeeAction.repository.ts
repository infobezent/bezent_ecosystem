import { and, asc, count, desc, eq, gte, inArray, like, lte, or, type SQL } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  departments,
  employeeClearanceItems,
  type NewEmployeeClearanceItem,
  employeeActionHistory,
  employeeActions,
  employees,
  type NewEmployeeAction,
  type NewEmployeeActionHistory,
} from '../../../../db/schema.js';
import type { DbExecutor } from '../../employees/repository/employee.repository.js';
import {
  ACTION_TYPE_CATEGORY,
  EMPLOYEE_ACTION_CATEGORIES,
  actionTypesForCategory,
  type ActionCategoryCounts,
  type ActionStatusCounts,
  type EmployeeActionChangeSet,
  type EmployeeActionType,
  type EmployeeActionHistoryItem,
  type EmployeeActionListItem,
  type ListEmployeeActionsParams,
  type PaginatedEmployeeActionsResult,
} from '../types/employeeAction.types.js';

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const listSelection = {
  id: employeeActions.id,
  employeeId: employeeActions.employeeId,
  employeeNumber: employees.employeeNumber,
  employeeFirstName: employees.firstName,
  employeeLastName: employees.lastName,
  employeeDepartmentName: departments.name,
  actionType: employeeActions.actionType,
  status: employeeActions.status,
  effectiveDate: employeeActions.effectiveDate,
  reason: employeeActions.reason,
  changeData: employeeActions.changeData,
  requestedBy: employeeActions.requestedBy,
  cancellationReason: employeeActions.cancellationReason,
  appliedAt: employeeActions.appliedAt,
  cancelledAt: employeeActions.cancelledAt,
  version: employeeActions.version,
  createdAt: employeeActions.createdAt,
  updatedAt: employeeActions.updatedAt,
};

interface ListRow {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeFirstName: string;
  employeeLastName: string | null;
  employeeDepartmentName: string | null;
  actionType: EmployeeActionListItem['actionType'];
  status: EmployeeActionListItem['status'];
  effectiveDate: string;
  reason: string;
  changeData: unknown;
  requestedBy: string | null;
  cancellationReason: string | null;
  appliedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

function readChangeSet(value: unknown): EmployeeActionChangeSet {
  const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as EmployeeActionChangeSet).changes)
  ) {
    return parsed as EmployeeActionChangeSet;
  }
  return { changes: [] };
}

function affectedRows(result: unknown): number {
  const header = (result as unknown[])[0] as { affectedRows?: number } | undefined;
  return header?.affectedRows ?? 0;
}

export class EmployeeActionRepository {
  private toListItem(row: ListRow): EmployeeActionListItem {
    const changeSet = readChangeSet(row.changeData);
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber,
      employeeName: row.employeeLastName
        ? `${row.employeeFirstName} ${row.employeeLastName}`
        : row.employeeFirstName,
      departmentName: row.employeeDepartmentName,
      actionType: row.actionType,
      category: ACTION_TYPE_CATEGORY[row.actionType],
      status: row.status,
      effectiveDate: row.effectiveDate,
      reason: row.reason,
      changes: changeSet.changes,
      requestDate: changeSet.requestDate ?? null,
      requestedBy: row.requestedBy,
      cancellationReason: row.cancellationReason,
      appliedAt: row.appliedAt,
      cancelledAt: row.cancelledAt,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Actions joined to their employee; both sides constrained to the same tenant/company. */
  private selectList(db: DbExecutor, tenantId: string, companyId: string) {
    return db
      .select(listSelection)
      .from(employeeActions)
      .innerJoin(
        employees,
        and(
          eq(employeeActions.employeeId, employees.id),
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
        ),
      )
      .leftJoin(departments, eq(departments.id, employees.departmentId));
  }

  private scope(tenantId: string, companyId: string): SQL[] {
    return [eq(employeeActions.tenantId, tenantId), eq(employeeActions.companyId, companyId)];
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return getDb().transaction(fn);
  }

  async insertAction(executor: DbExecutor, record: NewEmployeeAction): Promise<void> {
    await executor.insert(employeeActions).values(record);
  }

  async insertHistory(executor: DbExecutor, record: NewEmployeeActionHistory): Promise<void> {
    await executor.insert(employeeActionHistory).values(record);
  }

  async getById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<EmployeeActionListItem | null> {
    const rows = await this.selectList(executor, tenantId, companyId)
      .where(and(...this.scope(tenantId, companyId), eq(employeeActions.id, id)))
      .limit(1);

    return rows[0] ? this.toListItem(rows[0]) : null;
  }

  /** How many actions of a type have been applied to an employee (policy limits, e.g. probation extensions). */
  async countApplied(
    tenantId: string,
    companyId: string,
    employeeId: string,
    actionType: EmployeeActionType,
  ): Promise<number> {
    const [row] = await getDb()
      .select({ total: count() })
      .from(employeeActions)
      .where(
        and(
          ...this.scope(tenantId, companyId),
          eq(employeeActions.employeeId, employeeId),
          eq(employeeActions.actionType, actionType),
          eq(employeeActions.status, 'applied'),
        ),
      );
    return Number(row?.total ?? 0);
  }

  async insertClearanceItems(
    executor: DbExecutor,
    rows: NewEmployeeClearanceItem[],
  ): Promise<void> {
    if (rows.length === 0) return;
    await executor.insert(employeeClearanceItems).values(rows);
  }

  async listClearanceItems(tenantId: string, companyId: string, actionId: string) {
    return getDb()
      .select()
      .from(employeeClearanceItems)
      .where(
        and(
          eq(employeeClearanceItems.tenantId, tenantId),
          eq(employeeClearanceItems.companyId, companyId),
          eq(employeeClearanceItems.actionId, actionId),
        ),
      )
      .orderBy(asc(employeeClearanceItems.department), asc(employeeClearanceItems.displayOrder));
  }

  /** Cleared (cleared or waived) vs total clearance items per action, for list views. */
  async clearanceSummaries(
    tenantId: string,
    companyId: string,
    actionIds: string[],
  ): Promise<Map<string, { total: number; cleared: number }>> {
    const map = new Map<string, { total: number; cleared: number }>();
    if (actionIds.length === 0) return map;
    const rows = await getDb()
      .select({
        actionId: employeeClearanceItems.actionId,
        status: employeeClearanceItems.status,
      })
      .from(employeeClearanceItems)
      .where(
        and(
          eq(employeeClearanceItems.tenantId, tenantId),
          eq(employeeClearanceItems.companyId, companyId),
          inArray(employeeClearanceItems.actionId, actionIds),
        ),
      );
    for (const row of rows) {
      const entry = map.get(row.actionId) ?? { total: 0, cleared: 0 };
      entry.total += 1;
      if (row.status !== 'pending') entry.cleared += 1;
      map.set(row.actionId, entry);
    }
    return map;
  }

  async updateClearanceItem(
    tenantId: string,
    companyId: string,
    actionId: string,
    itemId: string,
    patch: {
      status: 'pending' | 'cleared' | 'waived';
      remarks: string | null;
      clearedBy: string | null;
    },
  ): Promise<void> {
    await getDb()
      .update(employeeClearanceItems)
      .set({
        status: patch.status,
        remarks: patch.remarks,
        clearedBy: patch.status === 'pending' ? null : patch.clearedBy,
        clearedAt: patch.status === 'pending' ? null : new Date(),
      })
      .where(
        and(
          eq(employeeClearanceItems.tenantId, tenantId),
          eq(employeeClearanceItems.companyId, companyId),
          eq(employeeClearanceItems.actionId, actionId),
          eq(employeeClearanceItems.id, itemId),
        ),
      );
  }

  async listPendingForEmployee(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeActionListItem[]> {
    const rows = await this.selectList(getDb(), tenantId, companyId).where(
      and(
        ...this.scope(tenantId, companyId),
        eq(employeeActions.employeeId, employeeId),
        eq(employeeActions.status, 'pending'),
      ),
    );

    return rows.map((row) => this.toListItem(row));
  }

  async list(
    tenantId: string,
    companyId: string,
    params: ListEmployeeActionsParams,
  ): Promise<PaginatedEmployeeActionsResult> {
    const db = getDb();
    const { page, pageSize } = params;

    // Filters shared by the list and the per-category tab counts.
    const shared: SQL[] = [...this.scope(tenantId, companyId)];
    if (params.status) shared.push(eq(employeeActions.status, params.status));
    if (params.employeeId) shared.push(eq(employeeActions.employeeId, params.employeeId));
    if (params.departmentId) shared.push(eq(employees.departmentId, params.departmentId));
    if (params.locationId) shared.push(eq(employees.locationId, params.locationId));
    if (params.effectiveDateFrom)
      shared.push(gte(employeeActions.effectiveDate, params.effectiveDateFrom));
    if (params.effectiveDateTo)
      shared.push(lte(employeeActions.effectiveDate, params.effectiveDateTo));
    if (params.search) {
      const pattern = `%${params.search}%`;
      shared.push(
        or(
          like(employees.firstName, pattern),
          like(employees.lastName, pattern),
          like(employees.employeeNumber, pattern),
        )!,
      );
    }

    const listConditions = [...shared];
    if (params.category) {
      listConditions.push(
        inArray(employeeActions.actionType, actionTypesForCategory(params.category)),
      );
    }
    if (params.actionType) listConditions.push(eq(employeeActions.actionType, params.actionType));
    if (params.actionTypes && params.actionTypes.length > 0) {
      listConditions.push(inArray(employeeActions.actionType, params.actionTypes));
    }

    const listWhere = and(...listConditions);

    // Conditions for status counts (filtered by category / actionTypes / department / search, but NOT restricted to single status or pagination)
    const statusConditions: SQL[] = [...this.scope(tenantId, companyId)];
    if (params.category) {
      statusConditions.push(
        inArray(employeeActions.actionType, actionTypesForCategory(params.category)),
      );
    }
    if (params.actionType) statusConditions.push(eq(employeeActions.actionType, params.actionType));
    if (params.actionTypes && params.actionTypes.length > 0) {
      statusConditions.push(inArray(employeeActions.actionType, params.actionTypes));
    }
    if (params.employeeId) statusConditions.push(eq(employeeActions.employeeId, params.employeeId));
    if (params.departmentId) statusConditions.push(eq(employees.departmentId, params.departmentId));
    if (params.locationId) statusConditions.push(eq(employees.locationId, params.locationId));
    if (params.effectiveDateFrom)
      statusConditions.push(gte(employeeActions.effectiveDate, params.effectiveDateFrom));
    if (params.effectiveDateTo)
      statusConditions.push(lte(employeeActions.effectiveDate, params.effectiveDateTo));
    if (params.search) {
      const pattern = `%${params.search}%`;
      statusConditions.push(
        or(
          like(employees.firstName, pattern),
          like(employees.lastName, pattern),
          like(employees.employeeNumber, pattern),
        )!,
      );
    }

    const [totalRows, rows, typeCounts, statusRows] = await Promise.all([
      db
        .select({ total: count() })
        .from(employeeActions)
        .innerJoin(
          employees,
          and(
            eq(employeeActions.employeeId, employees.id),
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
          ),
        )
        .where(listWhere),
      this.selectList(db, tenantId, companyId)
        .where(listWhere)
        .orderBy(desc(employeeActions.createdAt), desc(employeeActions.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ actionType: employeeActions.actionType, total: count() })
        .from(employeeActions)
        .innerJoin(
          employees,
          and(
            eq(employeeActions.employeeId, employees.id),
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
          ),
        )
        .where(and(...shared))
        .groupBy(employeeActions.actionType),
      db
        .select({
          status: employeeActions.status,
          effectiveDate: employeeActions.effectiveDate,
          total: count(),
        })
        .from(employeeActions)
        .innerJoin(
          employees,
          and(
            eq(employeeActions.employeeId, employees.id),
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
          ),
        )
        .where(and(...statusConditions))
        .groupBy(employeeActions.status, employeeActions.effectiveDate),
    ]);

    const counts = Object.fromEntries(
      ['all', ...EMPLOYEE_ACTION_CATEGORIES].map((key) => [key, 0]),
    ) as ActionCategoryCounts;
    for (const row of typeCounts) {
      counts.all += row.total;
      counts[ACTION_TYPE_CATEGORY[row.actionType]] += row.total;
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const statusCounts: ActionStatusCounts = {
      all: 0,
      pending: 0,
      applied: 0,
      cancelled: 0,
      upcoming: 0,
    };
    for (const row of statusRows) {
      const c = Number(row.total);
      statusCounts.all += c;
      if (row.status === 'pending') {
        statusCounts.pending += c;
        if (row.effectiveDate > today) {
          statusCounts.upcoming += c;
        }
      } else if (row.status === 'applied') {
        statusCounts.applied += c;
      } else if (row.status === 'cancelled') {
        statusCounts.cancelled += c;
      }
    }

    const totalItems = totalRows[0]?.total ?? 0;

    return {
      items: rows.map((row) => this.toListItem(row)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize) || 1,
      },
      counts,
      statusCounts,
    };
  }

  /**
   * Updates a pending action guarded by optimistic version. Returns false when
   * the action is no longer pending or the version is stale.
   */
  async updatePendingWithVersion(
    executor: DbExecutor,
    tenantId: string,
    companyId: string,
    id: string,
    expectedVersion: number,
    values: Partial<
      Pick<
        NewEmployeeAction,
        | 'status'
        | 'effectiveDate'
        | 'reason'
        | 'changeData'
        | 'cancellationReason'
        | 'appliedAt'
        | 'cancelledAt'
      >
    >,
  ): Promise<boolean> {
    const result = await executor
      .update(employeeActions)
      .set({ ...values, version: expectedVersion + 1, updatedAt: new Date() })
      .where(
        and(
          ...this.scope(tenantId, companyId),
          eq(employeeActions.id, id),
          eq(employeeActions.status, 'pending'),
          eq(employeeActions.version, expectedVersion),
        ),
      );

    return affectedRows(result) > 0;
  }

  async getHistory(
    tenantId: string,
    companyId: string,
    actionId: string,
  ): Promise<EmployeeActionHistoryItem[]> {
    const db = getDb();
    return db
      .select({
        id: employeeActionHistory.id,
        event: employeeActionHistory.event,
        fromStatus: employeeActionHistory.fromStatus,
        toStatus: employeeActionHistory.toStatus,
        notes: employeeActionHistory.notes,
        actor: employeeActionHistory.actor,
        createdAt: employeeActionHistory.createdAt,
      })
      .from(employeeActionHistory)
      .where(
        and(
          eq(employeeActionHistory.tenantId, tenantId),
          eq(employeeActionHistory.companyId, companyId),
          eq(employeeActionHistory.actionId, actionId),
        ),
      )
      .orderBy(asc(employeeActionHistory.createdAt), asc(employeeActionHistory.id));
  }
}
