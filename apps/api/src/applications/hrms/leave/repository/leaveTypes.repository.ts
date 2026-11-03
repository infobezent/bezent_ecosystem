import { eq, and, sql, or, like, desc, count } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  leaveTypes,
  employeeLeaveRequests,
  employeeLeaveBalances,
  type LeaveTypeRecord,
  type NewLeaveTypeRecord,
} from '../../../../db/schema.js';
import type { LeaveTypesQuery, LeaveTypeSummary } from '../types/leaveTypes.types.js';

export class LeaveTypesRepository {
  /**
   * Fetches paginated leave types matching query filters.
   */
  async findMany(
    tenantId: string,
    companyId: string,
    queryParams: LeaveTypesQuery,
  ): Promise<{ items: LeaveTypeRecord[]; total: number }> {
    const db = getDb();
    const conditions = [
      eq(leaveTypes.tenantId, tenantId),
      eq(leaveTypes.companyId, companyId),
      eq(leaveTypes.isArchived, false),
    ];

    if (queryParams.search && queryParams.search.trim()) {
      const s = `%${queryParams.search.trim()}%`;
      conditions.push(or(like(leaveTypes.name, s), like(leaveTypes.code, s))!);
    }

    if (queryParams.status && queryParams.status !== 'all') {
      const active = queryParams.status === 'active';
      conditions.push(eq(leaveTypes.isActive, active));
    }

    if (queryParams.category && queryParams.category !== 'all') {
      conditions.push(eq(leaveTypes.category, queryParams.category));
    }

    if (queryParams.paidClassification && queryParams.paidClassification !== 'all') {
      conditions.push(eq(leaveTypes.payrollImpact, queryParams.paidClassification));
    }

    const whereClause = and(...conditions);

    // Total count
    const [countRow] = await db.select({ val: count() }).from(leaveTypes).where(whereClause);
    const total = Number(countRow?.val || 0);

    const page = Math.max(1, Number(queryParams.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(queryParams.limit) || 10));
    const offset = (page - 1) * limit;

    const items = await db
      .select()
      .from(leaveTypes)
      .where(whereClause)
      .orderBy(desc(leaveTypes.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  /**
   * Aggregates summary counters for the company's leave types.
   */
  async getSummary(tenantId: string, companyId: string): Promise<LeaveTypeSummary> {
    const db = getDb();
    const all = await db
      .select({
        isActive: leaveTypes.isActive,
        payrollImpact: leaveTypes.payrollImpact,
      })
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.isArchived, false),
        ),
      );

    let active = 0;
    let inactive = 0;
    let paid = 0;
    let unpaid = 0;
    let partlyPaid = 0;

    for (const row of all) {
      if (row.isActive) active++;
      else inactive++;

      if (row.payrollImpact === 'paid') paid++;
      else if (row.payrollImpact === 'partly_paid') partlyPaid++;
      else unpaid++;
    }

    return {
      total: all.length,
      active,
      inactive,
      paid,
      unpaid,
      partlyPaid,
    };
  }

  /**
   * Finds a single leave type by ID with tenant and company scoping.
   */
  async findById(tenantId: string, companyId: string, id: string): Promise<LeaveTypeRecord | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.id, id),
          eq(leaveTypes.isArchived, false),
        ),
      )
      .limit(1);

    return found || null;
  }

  /**
   * Finds by short code within company scope (case-insensitive).
   */
  async findByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<LeaveTypeRecord | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          eq(sql`LOWER(${leaveTypes.code})`, code.trim().toLowerCase()),
          eq(leaveTypes.isArchived, false),
        ),
      )
      .limit(1);

    return found || null;
  }

  /**
   * Finds by name within company scope (case-insensitive).
   */
  async findByName(
    tenantId: string,
    companyId: string,
    name: string,
  ): Promise<LeaveTypeRecord | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          eq(sql`LOWER(${leaveTypes.name})`, name.trim().toLowerCase()),
          eq(leaveTypes.isArchived, false),
        ),
      )
      .limit(1);

    return found || null;
  }

  /**
   * Creates a new leave type.
   */
  async create(data: NewLeaveTypeRecord): Promise<LeaveTypeRecord> {
    const db = getDb();
    await db.insert(leaveTypes).values(data);
    const created = await this.findById(data.tenantId, data.companyId, data.id);
    return created!;
  }

  /**
   * Updates an existing leave type.
   */
  async update(
    tenantId: string,
    companyId: string,
    id: string,
    data: Partial<NewLeaveTypeRecord>,
  ): Promise<LeaveTypeRecord> {
    const db = getDb();
    await db
      .update(leaveTypes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          eq(leaveTypes.id, id),
        ),
      );

    const updated = await this.findById(tenantId, companyId, id);
    return updated!;
  }

  /**
   * Updates active status of a leave type.
   */
  async updateStatus(
    tenantId: string,
    companyId: string,
    id: string,
    isActive: boolean,
  ): Promise<LeaveTypeRecord> {
    return this.update(tenantId, companyId, id, { isActive });
  }

  /**
   * Checks whether this leave type is referenced by employee leave requests or balances.
   */
  async checkUsage(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<{ inUse: boolean; requestCount: number; balanceCount: number }> {
    const db = getDb();
    const normalized = code.trim().toLowerCase();

    // Map code to existing enum value if applicable
    let enumVal: 'annual' | 'sick' | 'casual' | 'unpaid' | null = null;
    if (normalized === 'cl' || normalized === 'casual') enumVal = 'casual';
    else if (normalized === 'sl' || normalized === 'sick') enumVal = 'sick';
    else if (normalized === 'el' || normalized === 'al' || normalized === 'annual')
      enumVal = 'annual';
    else if (normalized === 'lwp' || normalized === 'unpaid') enumVal = 'unpaid';

    let requestCount = 0;
    let balanceCount = 0;

    if (enumVal) {
      const [reqRow] = await db
        .select({ val: count() })
        .from(employeeLeaveRequests)
        .where(
          and(
            eq(employeeLeaveRequests.tenantId, tenantId),
            eq(employeeLeaveRequests.companyId, companyId),
            eq(employeeLeaveRequests.leaveType, enumVal),
          ),
        );
      requestCount = Number(reqRow?.val || 0);

      const [balRow] = await db
        .select({ val: count() })
        .from(employeeLeaveBalances)
        .where(
          and(
            eq(employeeLeaveBalances.tenantId, tenantId),
            eq(employeeLeaveBalances.companyId, companyId),
            eq(employeeLeaveBalances.leaveType, enumVal),
          ),
        );
      balanceCount = Number(balRow?.val || 0);
    }

    return {
      inUse: requestCount > 0 || balanceCount > 0,
      requestCount,
      balanceCount,
    };
  }
}

export const leaveTypesRepository = new LeaveTypesRepository();
