import { randomUUID } from 'node:crypto';
import { getDb } from '../../../../db/connection.js';
import {
  employees,
  departments,
  designations,
  locations,
  employeePersonalDetails,
  employeeAttendance,
  type Employee,
  type NewEmployee,
} from '../../../../db/schema.js';
import { eq, and, desc, like, or, count, inArray, gte, lte, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeDetails,
  ListEmployeesParams,
  PaginatedEmployeesResult,
  DistributionTrendGranularity,
  DistributionTrendsResult,
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
const referredBy = alias(employees, 'referred_by');

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
  gender: employeePersonalDetails.gender,
  dateOfBirth: employeePersonalDetails.dateOfBirth,
  reportingManagerId: employees.reportingManagerId,
  reportingManagerFirstName: manager.firstName,
  reportingManagerLastName: manager.lastName,
  referralCode: employees.referralCode,
  referredByEmployeeId: employees.referredByEmployeeId,
  referredByFirstName: referredBy.firstName,
  referredByLastName: referredBy.lastName,
  joiningDate: employees.joiningDate,
  confirmedJoiningDate: employees.confirmedJoiningDate,
  probationEndDate: employees.probationEndDate,
  confirmationDate: employees.confirmationDate,
  lastWorkingDate: employees.lastWorkingDate,
  sourceOfHire: employees.sourceOfHire,
  noticePeriodDays: employees.noticePeriodDays,
  contractEndDate: employees.contractEndDate,
  employmentType: employees.employmentType,
  employmentStatus: employees.employmentStatus,
  createdAt: employees.createdAt,
  updatedAt: employees.updatedAt,
};

type DetailRow = Omit<EmployeeDetails, 'fullName' | 'reportingManagerName' | 'referredByName'> & {
  reportingManagerFirstName: string | null;
  reportingManagerLastName: string | null;
  referredByFirstName: string | null;
  referredByLastName: string | null;
};

function joinName(firstName: string | null, lastName: string | null): string | null {
  if (!firstName) return null;
  return lastName ? `${firstName} ${lastName}` : firstName;
}

export class EmployeeRepository {
  private formatEmployeeRow(row: DetailRow): EmployeeDetails {
    const {
      reportingManagerFirstName,
      reportingManagerLastName,
      referredByFirstName,
      referredByLastName,
      ...rest
    } = row;
    return {
      ...rest,
      fullName: joinName(row.firstName, row.lastName) ?? row.firstName,
      reportingManagerName: joinName(reportingManagerFirstName, reportingManagerLastName),
      referredByName: joinName(referredByFirstName, referredByLastName),
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
      )
      .leftJoin(
        referredBy,
        and(
          eq(employees.referredByEmployeeId, referredBy.id),
          eq(referredBy.tenantId, tenantId),
          eq(referredBy.companyId, companyId),
        ),
      )
      .leftJoin(
        employeePersonalDetails,
        and(
          eq(employees.id, employeePersonalDetails.employeeId),
          eq(employeePersonalDetails.tenantId, tenantId),
          eq(employeePersonalDetails.companyId, companyId),
        ),
      );
  }

  async create(
    tenantId: string,
    companyId: string,
    dto: CreateEmployeeDto,
    executor: DbExecutor = getDb(),
  ): Promise<Employee> {
    const db = executor;
    const id = randomUUID();

    const newRecord: NewEmployee = {
      id,
      tenantId,
      companyId,
      employeeNumber: dto.employeeNumber ?? '',
      userId: dto.userId ?? null,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      email: dto.email,
      phone: dto.phone ?? null,
      departmentId: dto.departmentId ?? null,
      designationId: dto.designationId ?? null,
      locationId: dto.locationId ?? null,
      reportingManagerId: dto.reportingManagerId ?? null,
      referralCode: dto.referralCode ?? null,
      referredByEmployeeId: dto.referredByEmployeeId ?? null,
      joiningDate: dto.joiningDate,
      confirmedJoiningDate: dto.confirmedJoiningDate ?? null,
      probationEndDate: dto.probationEndDate ?? null,
      sourceOfHire: dto.sourceOfHire ?? null,
      noticePeriodDays: dto.noticePeriodDays ?? null,
      contractEndDate: dto.contractEndDate ?? null,
      employmentType: dto.employmentType ?? 'full_time',
      employmentStatus: dto.employmentStatus ?? 'pending_activation',
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

  async getByReferralCode(
    tenantId: string,
    companyId: string,
    referralCode: string,
  ): Promise<EmployeeDetails | null> {
    const rows = await this.selectDetails(getDb(), tenantId, companyId)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.referralCode, referralCode),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;
    return this.formatEmployeeRow(rows[0]!);
  }

  async listAllNumbers(tenantId: string, companyId: string): Promise<string[]> {
    const rows = await getDb()
      .select({ employeeNumber: employees.employeeNumber })
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.companyId, companyId)));
    return rows.map((r) => r.employeeNumber);
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

    if (params.departmentIds && params.departmentIds.length > 0) {
      conditions.push(inArray(employees.departmentId, params.departmentIds));
    } else if (params.departmentId) {
      conditions.push(eq(employees.departmentId, params.departmentId));
    }

    if (params.designationId) {
      conditions.push(eq(employees.designationId, params.designationId));
    }

    if (params.locationIds && params.locationIds.length > 0) {
      conditions.push(inArray(employees.locationId, params.locationIds));
    } else if (params.locationId) {
      conditions.push(eq(employees.locationId, params.locationId));
    }

    if (params.employmentType) {
      conditions.push(eq(employees.employmentType, params.employmentType));
    }

    if (params.employmentStatus) {
      conditions.push(eq(employees.employmentStatus, params.employmentStatus));
    }

    if (params.joiningDateFrom) {
      conditions.push(gte(employees.joiningDate, params.joiningDateFrom));
    }

    if (params.joiningDateTo) {
      conditions.push(lte(employees.joiningDate, params.joiningDateTo));
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

  async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
    return getDb().transaction(fn as any);
  }

  async update(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateEmployeeDto,
    executor: DbExecutor = getDb(),
  ): Promise<EmployeeDetails | null> {
    const db = executor;

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

    return this.getById(tenantId, companyId, id, db);
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

  /**
   * Aggregates real logged attendance hours across Department, Location, and
   * Employment Type buckets for the workforce distribution trend spline chart.
   */
  async getDistributionTrends(
    tenantId: string,
    companyId: string,
    granularity: DistributionTrendGranularity,
  ): Promise<DistributionTrendsResult> {
    const db = getDb();
    const { buckets, rangeStart, rangeEnd } = buildTrendBuckets(granularity, new Date());

    const rows = await db
      .select({
        date: employeeAttendance.date,
        workedMinutes: employeeAttendance.workedMinutes,
        departmentName: departments.name,
        locationName: locations.name,
        employmentType: employees.employmentType,
      })
      .from(employeeAttendance)
      .innerJoin(employees, eq(employeeAttendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          gte(employeeAttendance.date, rangeStart),
          lte(employeeAttendance.date, rangeEnd),
        ),
      );

    const deptTotals = new Map<string, number>();
    const locTotals = new Map<string, number>();
    const empTotals = new Map<string, number>();

    const normalized = rows.map((row) => {
      const mins = Math.max(0, Number(row.workedMinutes ?? 0));
      const dept = row.departmentName ?? 'General Operations';
      const loc = row.locationName ?? 'Bangalore HQ';
      const emp = formatEmploymentTypeLabel(row.employmentType);

      deptTotals.set(dept, (deptTotals.get(dept) ?? 0) + mins);
      locTotals.set(loc, (locTotals.get(loc) ?? 0) + mins);
      empTotals.set(emp, (empTotals.get(emp) ?? 0) + mins);

      const bucketKey =
        granularity === 'day'
          ? row.date
          : granularity === 'month'
            ? row.date.slice(0, 7)
            : row.date.slice(0, 4);

      return { bucketKey, mins, dept, loc, emp };
    });

    const primaryDeptLabel = pickTopBucketLabel(deptTotals, 'Engineering');
    const primaryLocLabel = pickTopBucketLabel(locTotals, 'Chennai (HQ)');
    const primaryEmpLabel = empTotals.has('Full-Time')
      ? 'Full-Time'
      : pickTopBucketLabel(empTotals, 'Full-Time');

    const bucketMap = new Map(
      buckets.map((b) => [
        b.key,
        {
          deptPrimaryMins: 0,
          deptOtherMins: 0,
          locPrimaryMins: 0,
          locOtherMins: 0,
          empPrimaryMins: 0,
          empOtherMins: 0,
        },
      ]),
    );

    for (const item of normalized) {
      const acc = bucketMap.get(item.bucketKey);
      if (!acc) continue;

      if (item.dept === primaryDeptLabel) acc.deptPrimaryMins += item.mins;
      else acc.deptOtherMins += item.mins;

      if (item.loc === primaryLocLabel) acc.locPrimaryMins += item.mins;
      else acc.locOtherMins += item.mins;

      if (item.emp === primaryEmpLabel) acc.empPrimaryMins += item.mins;
      else acc.empOtherMins += item.mins;
    }

    return {
      granularity,
      metricUnit: 'hrs',
      primaryDeptLabel,
      primaryLocLabel,
      primaryEmpLabel,
      points: buckets.map((b) => {
        const acc = bucketMap.get(b.key)!;
        return {
          label: b.label,
          fullLabel: b.fullLabel,
          department: {
            primary: Math.round(acc.deptPrimaryMins / 60),
            other: Math.round(acc.deptOtherMins / 60),
          },
          location: {
            primary: Math.round(acc.locPrimaryMins / 60),
            other: Math.round(acc.locOtherMins / 60),
          },
          employment: {
            primary: Math.round(acc.empPrimaryMins / 60),
            other: Math.round(acc.empOtherMins / 60),
          },
        };
      }),
    };
  }
}

interface TrendBucket {
  key: string;
  label: string;
  fullLabel: string;
}

function buildTrendBuckets(
  granularity: DistributionTrendGranularity,
  now: Date,
): { buckets: TrendBucket[]; rangeStart: string; rangeEnd: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  if (granularity === 'day') {
    const buckets: TrendBucket[] = [];
    for (let offset = -6; offset <= 0; offset++) {
      const utc = new Date(Date.UTC(y, m, d + offset));
      const key = utc.toISOString().slice(0, 10);
      const label = utc.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      const fullLabel = utc.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      buckets.push({ key, label, fullLabel });
    }
    return {
      buckets,
      rangeStart: buckets[0]!.key,
      rangeEnd: buckets[buckets.length - 1]!.key,
    };
  }

  if (granularity === 'month') {
    const buckets: TrendBucket[] = [];
    for (let offset = -6; offset <= 0; offset++) {
      const utc = new Date(Date.UTC(y, m + offset, 1));
      const key = `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}`;
      const shortMonth = utc.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      const shortYear = String(utc.getUTCFullYear()).slice(-2);
      const fullLabel = utc.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      buckets.push({ key, label: `${shortMonth} '${shortYear}`, fullLabel });
    }
    const lastBucketYearMonth = buckets[buckets.length - 1]!.key;
    const [ly, lm] = lastBucketYearMonth.split('-').map(Number);
    const lastDay = new Date(Date.UTC(ly!, lm!, 0)).getUTCDate();
    return {
      buckets,
      rangeStart: `${buckets[0]!.key}-01`,
      rangeEnd: `${lastBucketYearMonth}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  const buckets: TrendBucket[] = [];
  for (let offset = -4; offset <= 0; offset++) {
    const yr = String(y + offset);
    buckets.push({ key: yr, label: yr, fullLabel: `Year ${yr}` });
  }
  return {
    buckets,
    rangeStart: `${buckets[0]!.key}-01-01`,
    rangeEnd: `${buckets[buckets.length - 1]!.key}-12-31`,
  };
}

function pickTopBucketLabel(totals: Map<string, number>, fallback: string): string {
  let bestLabel = fallback;
  let bestVal = -1;
  for (const [label, mins] of totals.entries()) {
    if (mins > bestVal) {
      bestVal = mins;
      bestLabel = label;
    }
  }
  return bestLabel;
}

function formatEmploymentTypeLabel(raw: string): string {
  switch (raw) {
    case 'full_time':
      return 'Full-Time';
    case 'part_time':
      return 'Part-Time';
    case 'contract':
      return 'Contract';
    case 'intern':
      return 'Intern';
    default:
      return raw;
  }
}
