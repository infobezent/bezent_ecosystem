import { randomUUID } from 'node:crypto';
import { eq, and, sql, asc, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { getDb } from '../../../db/connection.js';
import {
  departments,
  businessUnits,
  divisions,
  employees,
  type BusinessUnit,
  type Division,
  type Employee,
} from '../../../db/schema.js';
import type {
  DepartmentRecord,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentStatus,
  DepartmentFilter,
} from '../types/department.types.js';

const parentDept = alias(departments, 'parent_dept');
const headEmp = alias(employees, 'dept_head_emp');

export class DepartmentRepository {
  async listDepartments(
    tenantId: string,
    companyId: string,
    filter: DepartmentFilter = {},
  ): Promise<DepartmentRecord[]> {
    const db = getDb();

    const conditions: SQL[] = [
      eq(departments.tenantId, tenantId),
      eq(departments.companyId, companyId),
    ];

    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(departments.status, filter.status));
    }
    if (filter.businessUnitId) {
      conditions.push(eq(departments.businessUnitId, filter.businessUnitId));
    }
    if (filter.divisionId) {
      conditions.push(eq(departments.divisionId, filter.divisionId));
    }
    if (filter.parentDepartmentId) {
      conditions.push(eq(departments.parentDepartmentId, filter.parentDepartmentId));
    }

    const rows = await db
      .select({
        id: departments.id,
        tenantId: departments.tenantId,
        companyId: departments.companyId,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        businessUnitId: departments.businessUnitId,
        businessUnitName: businessUnits.name,
        divisionId: departments.divisionId,
        divisionName: divisions.name,
        parentDepartmentId: departments.parentDepartmentId,
        parentDepartmentName: parentDept.name,
        headEmployeeId: departments.headEmployeeId,
        headFirstName: headEmp.firstName,
        headLastName: headEmp.lastName,
        headEmployeeNumber: headEmp.employeeNumber,
        status: departments.status,
        createdAt: departments.createdAt,
        updatedAt: departments.updatedAt,
      })
      .from(departments)
      .leftJoin(businessUnits, eq(departments.businessUnitId, businessUnits.id))
      .leftJoin(divisions, eq(departments.divisionId, divisions.id))
      .leftJoin(parentDept, eq(departments.parentDepartmentId, parentDept.id))
      .leftJoin(headEmp, eq(departments.headEmployeeId, headEmp.id))
      .where(and(...conditions))
      .orderBy(asc(departments.name));

    // Calculate child department counts
    const childCounts = await db
      .select({
        parentDepartmentId: departments.parentDepartmentId,
        count: sql<number>`count(${departments.id})`.as('count'),
      })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          sql`${departments.parentDepartmentId} IS NOT NULL`,
        ),
      )
      .groupBy(departments.parentDepartmentId);

    const childCountMap = new Map<string, number>();
    for (const row of childCounts) {
      if (row.parentDepartmentId) {
        childCountMap.set(row.parentDepartmentId, Number(row.count) || 0);
      }
    }

    // Calculate employee count assigned to each department
    const employeeCounts = await db
      .select({
        departmentId: employees.departmentId,
        count: sql<number>`count(${employees.id})`.as('count'),
      })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          sql`${employees.departmentId} IS NOT NULL`,
        ),
      )
      .groupBy(employees.departmentId);

    const employeeCountMap = new Map<string, number>();
    for (const row of employeeCounts) {
      if (row.departmentId) {
        employeeCountMap.set(row.departmentId, Number(row.count) || 0);
      }
    }

    return rows.map((r) => {
      const headName = r.headFirstName
        ? `${r.headFirstName} ${r.headLastName ?? ''}`.trim()
        : null;

      return {
        id: r.id,
        tenantId: r.tenantId,
        companyId: r.companyId,
        name: r.name,
        code: r.code ?? null,
        description: r.description ?? null,
        businessUnitId: r.businessUnitId ?? null,
        businessUnitName: r.businessUnitName ?? null,
        divisionId: r.divisionId ?? null,
        divisionName: r.divisionName ?? null,
        parentDepartmentId: r.parentDepartmentId ?? null,
        parentDepartmentName: r.parentDepartmentName ?? null,
        headEmployeeId: r.headEmployeeId ?? null,
        headEmployeeName: headName,
        headEmployeeNumber: r.headEmployeeNumber ?? null,
        status: r.status as DepartmentStatus,
        childDepartmentCount: childCountMap.get(r.id) ?? 0,
        employeeCount: employeeCountMap.get(r.id) ?? 0,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  async findDepartmentById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DepartmentRecord | null> {
    const list = await this.listDepartments(tenantId, companyId, { status: 'all' });
    return list.find((d) => d.id === id) ?? null;
  }

  async findDepartmentByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<DepartmentRecord | null> {
    const db = getDb();
    const rows = await db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          sql`LOWER(${departments.code}) = LOWER(${code})`,
        ),
      )
      .limit(1);

    if (!rows[0]) return null;
    return this.findDepartmentById(tenantId, companyId, rows[0].id);
  }

  async createDepartment(
    tenantId: string,
    companyId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentRecord> {
    const db = getDb();
    const id = `dept_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await db.insert(departments).values({
      id,
      tenantId,
      companyId,
      name: dto.name,
      code: dto.code ?? null,
      description: dto.description ?? null,
      businessUnitId: dto.businessUnitId ?? null,
      divisionId: dto.divisionId ?? null,
      parentDepartmentId: dto.parentDepartmentId ?? null,
      headEmployeeId: dto.headEmployeeId ?? null,
      status: dto.status ?? 'active',
    });

    const created = await this.findDepartmentById(tenantId, companyId, id);
    if (!created) {
      throw new Error('Failed to retrieve created department');
    }
    return created;
  }

  async updateDepartment(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentRecord> {
    const db = getDb();
    await db
      .update(departments)
      .set({
        name: dto.name,
        code: dto.code ?? null,
        description: dto.description ?? null,
        businessUnitId: dto.businessUnitId ?? null,
        divisionId: dto.divisionId ?? null,
        parentDepartmentId: dto.parentDepartmentId ?? null,
        headEmployeeId: dto.headEmployeeId ?? null,
        status: dto.status ?? 'active',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          eq(departments.id, id),
        ),
      );

    const updated = await this.findDepartmentById(tenantId, companyId, id);
    if (!updated) {
      throw new Error('Failed to retrieve updated department');
    }
    return updated;
  }

  async setDepartmentStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: DepartmentStatus,
  ): Promise<DepartmentRecord> {
    const db = getDb();
    await db
      .update(departments)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          eq(departments.id, id),
        ),
      );

    const updated = await this.findDepartmentById(tenantId, companyId, id);
    if (!updated) {
      throw new Error('Department not found');
    }
    return updated;
  }

  async countActiveChildDepartments(
    tenantId: string,
    companyId: string,
    parentDepartmentId: string,
  ): Promise<number> {
    const db = getDb();
    const rows = await db
      .select({ count: sql<number>`count(${departments.id})`.as('count') })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
          eq(departments.parentDepartmentId, parentDepartmentId),
          eq(departments.status, 'active'),
        ),
      );

    return Number(rows[0]?.count) || 0;
  }

  async countEmployeesInDepartment(
    tenantId: string,
    companyId: string,
    departmentId: string,
  ): Promise<number> {
    const db = getDb();
    const rows = await db
      .select({ count: sql<number>`count(${employees.id})`.as('count') })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.departmentId, departmentId),
        ),
      );

    return Number(rows[0]?.count) || 0;
  }

  async findBusinessUnit(
    tenantId: string,
    companyId: string,
    buId: string,
  ): Promise<BusinessUnit | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(businessUnits)
      .where(
        and(
          eq(businessUnits.tenantId, tenantId),
          eq(businessUnits.companyId, companyId),
          eq(businessUnits.id, buId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async findDivision(
    tenantId: string,
    companyId: string,
    divId: string,
  ): Promise<Division | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(divisions)
      .where(
        and(
          eq(divisions.tenantId, tenantId),
          eq(divisions.companyId, companyId),
          eq(divisions.id, divId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async findEmployee(
    tenantId: string,
    companyId: string,
    empId: string,
  ): Promise<Employee | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, empId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }
}

export const departmentRepository = new DepartmentRepository();
