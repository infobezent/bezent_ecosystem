import { eq, and, desc, asc, like, or, count, sql, type SQL } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  hrmsShifts,
  hrmsShiftAssignments,
  employees,
  departments,
  locations,
  employeeWorkSchedules,
  type HrmsShift,
  type NewHrmsShift,
  type HrmsShiftAssignment,
  type NewHrmsShiftAssignment,
  type Employee,
  type Department,
  type Location,
  type EmployeeWorkSchedule,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import type {
  ShiftFilterQuery,
  AssignmentFilterQuery,
  ShiftAssignmentScope,
  EnrichedShiftAssignment,
} from '../types/shift.types.js';
import { timeToMinutes } from '../validation/shift.schema.js';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type DbExecutor = Db | Tx;

export class ShiftRepository {
  // ---------------------------------------------------------------------------
  // Shift Definitions
  // ---------------------------------------------------------------------------

  async createShift(
    data: Omit<NewHrmsShift, 'id'> & { id?: string },
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShift> {
    const id = data.id || generateSurrogateId('shift');
    const isOvernight =
      data.isOvernight ?? timeToMinutes(data.endTime) < timeToMinutes(data.startTime);

    await executor.insert(hrmsShifts).values({
      ...data,
      id,
      isOvernight,
    });

    const shift = await this.getShiftById(data.tenantId, data.companyId, id, executor);
    if (!shift) throw new Error('Failed to retrieve newly created shift');
    return shift;
  }

  async getShiftById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShift | null> {
    const [row] = await executor
      .select()
      .from(hrmsShifts)
      .where(
        and(
          eq(hrmsShifts.id, id),
          eq(hrmsShifts.tenantId, tenantId),
          eq(hrmsShifts.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getShiftByCode(
    tenantId: string,
    companyId: string,
    code: string,
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShift | null> {
    const [row] = await executor
      .select()
      .from(hrmsShifts)
      .where(
        and(
          eq(hrmsShifts.code, code.toUpperCase().trim()),
          eq(hrmsShifts.tenantId, tenantId),
          eq(hrmsShifts.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listShifts(
    tenantId: string,
    companyId: string,
    query: ShiftFilterQuery = {},
    executor: DbExecutor = getDb(),
  ): Promise<{ items: HrmsShift[]; total: number }> {
    const conditions: SQL[] = [
      eq(hrmsShifts.tenantId, tenantId),
      eq(hrmsShifts.companyId, companyId),
    ];

    if (query.status === 'active') {
      conditions.push(eq(hrmsShifts.isActive, true));
    } else if (query.status === 'inactive') {
      conditions.push(eq(hrmsShifts.isActive, false));
    }

    if (query.search?.trim()) {
      const q = `%${query.search.trim()}%`;
      conditions.push(
        or(like(hrmsShifts.name, q), like(hrmsShifts.code, q), like(hrmsShifts.description, q))!,
      );
    }

    const whereClause = and(...conditions);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const offset = Math.max(0, Number(query.offset) || 0);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(hrmsShifts)
      .where(whereClause);

    const items = await executor
      .select()
      .from(hrmsShifts)
      .where(whereClause)
      .orderBy(asc(hrmsShifts.name))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total: totalRow?.total ?? items.length,
    };
  }

  async updateShift(
    tenantId: string,
    companyId: string,
    id: string,
    patch: Partial<NewHrmsShift>,
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShift | null> {
    const existing = await this.getShiftById(tenantId, companyId, id, executor);
    if (!existing) return null;

    const startTime = patch.startTime ?? existing.startTime;
    const endTime = patch.endTime ?? existing.endTime;
    const isOvernight = patch.isOvernight ?? timeToMinutes(endTime) < timeToMinutes(startTime);

    await executor
      .update(hrmsShifts)
      .set({
        ...patch,
        isOvernight,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrmsShifts.id, id),
          eq(hrmsShifts.tenantId, tenantId),
          eq(hrmsShifts.companyId, companyId),
        ),
      );

    return this.getShiftById(tenantId, companyId, id, executor);
  }

  async deleteShift(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<boolean> {
    const res = await executor
      .delete(hrmsShifts)
      .where(
        and(
          eq(hrmsShifts.id, id),
          eq(hrmsShifts.tenantId, tenantId),
          eq(hrmsShifts.companyId, companyId),
        ),
      );
    return true;
  }

  // ---------------------------------------------------------------------------
  // Shift Assignments
  // ---------------------------------------------------------------------------

  async createAssignment(
    data: Omit<NewHrmsShiftAssignment, 'id'> & { id?: string },
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShiftAssignment> {
    const id = data.id || generateSurrogateId('sasn');
    await executor.insert(hrmsShiftAssignments).values({
      ...data,
      id,
    });

    const [row] = await executor
      .select()
      .from(hrmsShiftAssignments)
      .where(
        and(
          eq(hrmsShiftAssignments.id, id),
          eq(hrmsShiftAssignments.tenantId, data.tenantId),
          eq(hrmsShiftAssignments.companyId, data.companyId),
        ),
      )
      .limit(1);

    if (!row) throw new Error('Failed to retrieve newly created shift assignment');
    return row;
  }

  async getAssignmentById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShiftAssignment | null> {
    const [row] = await executor
      .select()
      .from(hrmsShiftAssignments)
      .where(
        and(
          eq(hrmsShiftAssignments.id, id),
          eq(hrmsShiftAssignments.tenantId, tenantId),
          eq(hrmsShiftAssignments.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findOverlappingAssignments(
    tenantId: string,
    companyId: string,
    scope: ShiftAssignmentScope,
    targetId: string,
    startDate: string,
    endDate: string | null,
    excludeAssignmentId?: string,
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShiftAssignment[]> {
    const conditions: SQL[] = [
      eq(hrmsShiftAssignments.tenantId, tenantId),
      eq(hrmsShiftAssignments.companyId, companyId),
      eq(hrmsShiftAssignments.assignmentScope, scope),
      eq(hrmsShiftAssignments.isActive, true),
    ];

    if (scope === 'employee') {
      conditions.push(eq(hrmsShiftAssignments.employeeId, targetId));
    } else if (scope === 'department') {
      conditions.push(eq(hrmsShiftAssignments.departmentId, targetId));
    } else if (scope === 'location') {
      conditions.push(eq(hrmsShiftAssignments.locationId, targetId));
    }

    if (excludeAssignmentId) {
      conditions.push(sql`${hrmsShiftAssignments.id} != ${excludeAssignmentId}`);
    }

    // Overlap condition:
    // Existing assignment [asgn.start, asgn.end] overlaps with [startDate, endDate] if:
    // asgn.effectiveStartDate <= (endDate ?? '9999-12-31') AND (asgn.effectiveEndDate IS NULL OR asgn.effectiveEndDate >= startDate)
    const upperLimit = endDate || '9999-12-31';
    conditions.push(sql`${hrmsShiftAssignments.effectiveStartDate} <= ${upperLimit}`);
    conditions.push(
      sql`(${hrmsShiftAssignments.effectiveEndDate} IS NULL OR ${hrmsShiftAssignments.effectiveEndDate} >= ${startDate})`,
    );

    return executor
      .select()
      .from(hrmsShiftAssignments)
      .where(and(...conditions));
  }

  async listAssignments(
    tenantId: string,
    companyId: string,
    query: AssignmentFilterQuery = {},
    executor: DbExecutor = getDb(),
  ): Promise<{ items: EnrichedShiftAssignment[]; total: number }> {
    const conditions: SQL[] = [
      eq(hrmsShiftAssignments.tenantId, tenantId),
      eq(hrmsShiftAssignments.companyId, companyId),
    ];

    if (query.scope && query.scope !== 'all') {
      conditions.push(eq(hrmsShiftAssignments.assignmentScope, query.scope));
    }

    if (query.shiftId) {
      conditions.push(eq(hrmsShiftAssignments.shiftId, query.shiftId));
    }

    if (query.employeeId) {
      conditions.push(eq(hrmsShiftAssignments.employeeId, query.employeeId));
    }

    if (query.departmentId) {
      conditions.push(eq(hrmsShiftAssignments.departmentId, query.departmentId));
    }

    if (query.locationId) {
      conditions.push(eq(hrmsShiftAssignments.locationId, query.locationId));
    }

    if (query.status === 'active') {
      conditions.push(eq(hrmsShiftAssignments.isActive, true));
    } else if (query.status === 'inactive') {
      conditions.push(eq(hrmsShiftAssignments.isActive, false));
    }

    if (query.effectiveDate) {
      conditions.push(sql`${hrmsShiftAssignments.effectiveStartDate} <= ${query.effectiveDate}`);
      conditions.push(
        sql`(${hrmsShiftAssignments.effectiveEndDate} IS NULL OR ${hrmsShiftAssignments.effectiveEndDate} >= ${query.effectiveDate})`,
      );
    }

    const whereClause = and(...conditions);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const offset = Math.max(0, Number(query.offset) || 0);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(hrmsShiftAssignments)
      .where(whereClause);

    const rows = await executor
      .select({
        assignment: hrmsShiftAssignments,
        shift: hrmsShifts,
        employee: employees,
        department: departments,
        location: locations,
      })
      .from(hrmsShiftAssignments)
      .innerJoin(hrmsShifts, eq(hrmsShiftAssignments.shiftId, hrmsShifts.id))
      .leftJoin(employees, eq(hrmsShiftAssignments.employeeId, employees.id))
      .leftJoin(departments, eq(hrmsShiftAssignments.departmentId, departments.id))
      .leftJoin(locations, eq(hrmsShiftAssignments.locationId, locations.id))
      .where(whereClause)
      .orderBy(desc(hrmsShiftAssignments.effectiveStartDate), desc(hrmsShiftAssignments.createdAt))
      .limit(limit)
      .offset(offset);

    const items: EnrichedShiftAssignment[] = rows.map((r) => {
      let targetName = 'Unknown Target';
      let targetCode: string | undefined;

      if (r.assignment.assignmentScope === 'employee' && r.employee) {
        targetName = `${r.employee.firstName} ${r.employee.lastName || ''}`.trim();
        targetCode = r.employee.employeeNumber;
      } else if (r.assignment.assignmentScope === 'department' && r.department) {
        targetName = r.department.name;
        targetCode = r.department.code ?? undefined;
      } else if (r.assignment.assignmentScope === 'location' && r.location) {
        targetName = r.location.name;
        targetCode = r.location.code ?? undefined;
      }

      return {
        ...r.assignment,
        shiftName: r.shift.name,
        shiftCode: r.shift.code,
        shiftStartTime: r.shift.startTime,
        shiftEndTime: r.shift.endTime,
        shiftIsOvernight: r.shift.isOvernight,
        targetName,
        targetCode,
      };
    });

    return {
      items,
      total: totalRow?.total ?? items.length,
    };
  }

  async updateAssignment(
    tenantId: string,
    companyId: string,
    id: string,
    patch: Partial<NewHrmsShiftAssignment>,
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShiftAssignment | null> {
    await executor
      .update(hrmsShiftAssignments)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrmsShiftAssignments.id, id),
          eq(hrmsShiftAssignments.tenantId, tenantId),
          eq(hrmsShiftAssignments.companyId, companyId),
        ),
      );

    return this.getAssignmentById(tenantId, companyId, id, executor);
  }

  async endAssignment(
    tenantId: string,
    companyId: string,
    id: string,
    effectiveEndDate: string,
    userId?: string,
    executor: DbExecutor = getDb(),
  ): Promise<HrmsShiftAssignment | null> {
    await executor
      .update(hrmsShiftAssignments)
      .set({
        effectiveEndDate,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrmsShiftAssignments.id, id),
          eq(hrmsShiftAssignments.tenantId, tenantId),
          eq(hrmsShiftAssignments.companyId, companyId),
        ),
      );

    return this.getAssignmentById(tenantId, companyId, id, executor);
  }

  async deleteAssignment(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<boolean> {
    await executor
      .delete(hrmsShiftAssignments)
      .where(
        and(
          eq(hrmsShiftAssignments.id, id),
          eq(hrmsShiftAssignments.tenantId, tenantId),
          eq(hrmsShiftAssignments.companyId, companyId),
        ),
      );
    return true;
  }

  // ---------------------------------------------------------------------------
  // Shift Resolution Helpers
  // ---------------------------------------------------------------------------

  async getEmployeeWithOrg(
    tenantId: string,
    companyId: string,
    employeeId: string,
    executor: DbExecutor = getDb(),
  ): Promise<{
    employee: Employee;
    department: Department | null;
    location: Location | null;
  } | null> {
    const [row] = await executor
      .select({
        employee: employees,
        department: departments,
        location: locations,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
        ),
      )
      .limit(1);

    if (!row) return null;
    return {
      employee: row.employee,
      department: row.department ?? null,
      location: row.location ?? null,
    };
  }

  async getActiveAssignmentsForDate(
    tenantId: string,
    companyId: string,
    date: string,
    employeeId: string,
    departmentId?: string | null,
    locationId?: string | null,
    executor: DbExecutor = getDb(),
  ): Promise<Array<HrmsShiftAssignment & { shift: HrmsShift }>> {
    const scopeConditions: SQL[] = [
      and(
        eq(hrmsShiftAssignments.assignmentScope, 'employee'),
        eq(hrmsShiftAssignments.employeeId, employeeId),
      )!,
    ];

    if (departmentId) {
      scopeConditions.push(
        and(
          eq(hrmsShiftAssignments.assignmentScope, 'department'),
          eq(hrmsShiftAssignments.departmentId, departmentId),
        )!,
      );
    }

    if (locationId) {
      scopeConditions.push(
        and(
          eq(hrmsShiftAssignments.assignmentScope, 'location'),
          eq(hrmsShiftAssignments.locationId, locationId),
        )!,
      );
    }

    const whereClause = and(
      eq(hrmsShiftAssignments.tenantId, tenantId),
      eq(hrmsShiftAssignments.companyId, companyId),
      eq(hrmsShiftAssignments.isActive, true),
      sql`${hrmsShiftAssignments.effectiveStartDate} <= ${date}`,
      sql`(${hrmsShiftAssignments.effectiveEndDate} IS NULL OR ${hrmsShiftAssignments.effectiveEndDate} >= ${date})`,
      or(...scopeConditions)!,
    );

    const rows = await executor
      .select({
        assignment: hrmsShiftAssignments,
        shift: hrmsShifts,
      })
      .from(hrmsShiftAssignments)
      .innerJoin(hrmsShifts, eq(hrmsShiftAssignments.shiftId, hrmsShifts.id))
      .where(whereClause)
      .orderBy(desc(hrmsShiftAssignments.effectiveStartDate));

    return rows.map((r) => ({
      ...r.assignment,
      shift: r.shift,
    }));
  }

  async getDepartment(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<Department | null> {
    const [row] = await executor
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.id, id),
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getLocation(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<Location | null> {
    const [row] = await executor
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, id),
          eq(locations.tenantId, tenantId),
          eq(locations.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getLegacySchedule(
    tenantId: string,
    companyId: string,
    employeeId: string,
    executor: DbExecutor = getDb(),
  ): Promise<EmployeeWorkSchedule | null> {
    const [row] = await executor
      .select()
      .from(employeeWorkSchedules)
      .where(
        and(
          eq(employeeWorkSchedules.tenantId, tenantId),
          eq(employeeWorkSchedules.companyId, companyId),
          eq(employeeWorkSchedules.employeeId, employeeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}

export const shiftRepository = new ShiftRepository();
