import { randomUUID } from 'node:crypto';
import { getDb } from '../../../../db/connection.js';
import {
  employees,
  departments,
  designations,
  locations,
  type Employee,
  type NewEmployee,
} from '../../../../db/schema.js';
import { eq, and, desc, like, or, count, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeDetails,
  ListEmployeesParams,
  PaginatedEmployeesResult,
} from '../types/employee.types.js';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** A Drizzle database handle or an open transaction. */
export type DbExecutor = Db | Tx;

/**
 * Canonical employment fields that Employee Administration may change when an
 * employee action is applied. Personal/identity fields are never changed here.
 */
export type EmploymentFieldUpdate = Partial<
  Pick<
    NewEmployee,
    | 'departmentId'
    | 'designationId'
    | 'locationId'
    | 'reportingManagerId'
    | 'employmentType'
    | 'employmentStatus'
    | 'probationEndDate'
    | 'confirmationDate'
    | 'lastWorkingDate'
  >
>;

const manager = alias(employees, 'reporting_manager');

const detailSelection = {
  id: employees.id,
  tenantId: employees.tenantId,
  companyId: employees.companyId,
  employeeNumber: employees.employeeNumber,
  userId: employees.userId,
  firstName: employees.firstName,
  lastName: employees.lastName,
  email: employees.email,
  phone: employees.phone,
  departmentId: employees.departmentId,
  departmentName: departments.name,
  designationId: employees.designationId,
  designationName: designations.name,
  locationId: employees.locationId,
  locationName: locations.name,
  reportingManagerId: employees.reportingManagerId,
  reportingManagerFirstName: manager.firstName,
  reportingManagerLastName: manager.lastName,
  joiningDate: employees.joiningDate,
  confirmedJoiningDate: employees.confirmedJoiningDate,
  probationEndDate: employees.probationEndDate,
  confirmationDate: employees.confirmationDate,
  lastWorkingDate: employees.lastWorkingDate,
  employmentType: employees.employmentType,
  employmentStatus: employees.employmentStatus,
  createdAt: employees.createdAt,
  updatedAt: employees.updatedAt,
};

type DetailRow = Omit<EmployeeDetails, 'fullName' | 'reportingManagerName'> & {
  reportingManagerFirstName: string | null;
  reportingManagerLastName: string | null;
};

function joinName(firstName: string | null, lastName: string | null): string | null {
  if (!firstName) return null;
  return lastName ? `${firstName} ${lastName}` : firstName;
}

export class EmployeeRepository {
  private formatEmployeeRow(row: DetailRow): EmployeeDetails {
    const { reportingManagerFirstName, reportingManagerLastName, ...rest } = row;
    return {
      ...rest,
      fullName: joinName(row.firstName, row.lastName) ?? row.firstName,
      reportingManagerName: joinName(reportingManagerFirstName, reportingManagerLastName),
    };
  }

  /**
   * Detail query with organization master names and reporting manager.
   * Joins are constrained to the same tenant/company so a stray cross-company
   * reference can never leak another company's master data.
   */
  private selectDetails(db: DbExecutor, tenantId: string, companyId: string) {
    return db
      .select(detailSelection)
      .from(employees)
      .leftJoin(
        departments,
        and(
          eq(employees.departmentId, departments.id),
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
        ),
      )
      .leftJoin(
        designations,
        and(
          eq(employees.designationId, designations.id),
          eq(designations.tenantId, tenantId),
          eq(designations.companyId, companyId),
        ),
      )
      .leftJoin(
        locations,
        and(
          eq(employees.locationId, locations.id),
          eq(locations.tenantId, tenantId),
          eq(locations.companyId, companyId),
        ),
      )
      .leftJoin(
        manager,
        and(
          eq(employees.reportingManagerId, manager.id),
          eq(manager.tenantId, tenantId),
          eq(manager.companyId, companyId),
        ),
      );
  }

  async create(tenantId: string, companyId: string, dto: CreateEmployeeDto): Promise<Employee> {
    const db = getDb();
    const id = randomUUID();

    const newRecord: NewEmployee = {
      id,
      tenantId,
      companyId,
      employeeNumber: dto.employeeNumber,
      userId: dto.userId ?? null,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      email: dto.email,
      phone: dto.phone ?? null,
      departmentId: dto.departmentId ?? null,
      designationId: dto.designationId ?? null,
      locationId: dto.locationId ?? null,
      reportingManagerId: dto.reportingManagerId ?? null,
      joiningDate: dto.joiningDate,
      confirmedJoiningDate: dto.confirmedJoiningDate ?? null,
      probationEndDate: dto.probationEndDate ?? null,
      employmentType: dto.employmentType ?? 'full_time',
      employmentStatus: dto.employmentStatus ?? 'probation',
    };

    await db.insert(employees).values(newRecord);

    const rows = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, id),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new Error('Failed to retrieve created employee record');
    }

    return rows[0]!;
  }

  async getById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<EmployeeDetails | null> {
    const rows = await this.selectDetails(executor, tenantId, companyId)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, id),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return this.formatEmployeeRow(rows[0]!);
  }

  async getByEmployeeNumber(
    tenantId: string,
    companyId: string,
    employeeNumber: string,
  ): Promise<Employee | null> {
    const db = getDb();

    const rows = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.employeeNumber, employeeNumber),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async getByEmail(tenantId: string, companyId: string, email: string): Promise<Employee | null> {
    const db = getDb();

    const rows = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.email, email.toLowerCase()),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listPaginated(
    tenantId: string,
    companyId: string,
    params: ListEmployeesParams = {},
  ): Promise<PaginatedEmployeesResult> {
    const db = getDb();
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 25;
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [
      eq(employees.tenantId, tenantId),
      eq(employees.companyId, companyId),
    ];

    if (params.departmentId) {
      conditions.push(eq(employees.departmentId, params.departmentId));
    }

    if (params.designationId) {
      conditions.push(eq(employees.designationId, params.designationId));
    }

    if (params.locationId) {
      conditions.push(eq(employees.locationId, params.locationId));
    }

    if (params.employmentType) {
      conditions.push(eq(employees.employmentType, params.employmentType));
    }

    if (params.employmentStatus) {
      conditions.push(eq(employees.employmentStatus, params.employmentStatus));
    }

    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        or(
          like(employees.firstName, searchPattern),
          like(employees.lastName, searchPattern),
          like(employees.email, searchPattern),
          like(employees.employeeNumber, searchPattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [countResult, rows] = await Promise.all([
      db.select({ total: count() }).from(employees).where(whereClause),
      this.selectDetails(db, tenantId, companyId)
        .where(whereClause)
        .orderBy(desc(employees.createdAt), desc(employees.id))
        .limit(pageSize)
        .offset(offset),
    ]);

    const totalItems = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return {
      items: rows.map((r) => this.formatEmployeeRow(r)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async update(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeDetails | null> {
    const db = getDb();

    const updateValues: Partial<NewEmployee> = {};
    if (dto.firstName !== undefined) updateValues.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateValues.lastName = dto.lastName;
    if (dto.email !== undefined) updateValues.email = dto.email;
    if (dto.phone !== undefined) updateValues.phone = dto.phone;
    if (dto.departmentId !== undefined) updateValues.departmentId = dto.departmentId;
    if (dto.designationId !== undefined) updateValues.designationId = dto.designationId;
    if (dto.locationId !== undefined) updateValues.locationId = dto.locationId;
    if (dto.reportingManagerId !== undefined)
      updateValues.reportingManagerId = dto.reportingManagerId;
    if (dto.joiningDate !== undefined) updateValues.joiningDate = dto.joiningDate;
    if (dto.confirmedJoiningDate !== undefined)
      updateValues.confirmedJoiningDate = dto.confirmedJoiningDate;
    if (dto.probationEndDate !== undefined) updateValues.probationEndDate = dto.probationEndDate;
    if (dto.employmentType !== undefined) updateValues.employmentType = dto.employmentType;
    if (dto.employmentStatus !== undefined) updateValues.employmentStatus = dto.employmentStatus;
    if (dto.userId !== undefined) updateValues.userId = dto.userId;

    if (Object.keys(updateValues).length > 0) {
      await db
        .update(employees)
        .set(updateValues)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.id, id),
          ),
        );
    }

    return this.getById(tenantId, companyId, id);
  }

  /**
   * Writes canonical employment fields. Intended to run inside the caller's
   * transaction (Employee Administration applying an action). Returns false
   * when no tenant/company-scoped employee row matched.
   */
  async updateEmploymentFields(
    executor: DbExecutor,
    tenantId: string,
    companyId: string,
    id: string,
    values: EmploymentFieldUpdate,
  ): Promise<boolean> {
    if (Object.keys(values).length === 0) {
      return true;
    }

    const result = await executor
      .update(employees)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, id),
        ),
      );

    const header = result[0] as unknown as { affectedRows?: number };
    return (header?.affectedRows ?? 0) > 0;
  }

  async delete(tenantId: string, companyId: string, id: string): Promise<boolean> {
    const db = getDb();

    const result = await db
      .delete(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, id),
        ),
      );

    return (result[0]?.affectedRows ?? 0) > 0;
  }
}
