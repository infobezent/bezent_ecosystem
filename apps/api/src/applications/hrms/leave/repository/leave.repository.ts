import { eq, and, desc, sql, lte, gte, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeLeaveBalances,
  employeeLeaveRequests,
  type EmployeeLeaveBalance,
  type EmployeeLeaveRequest,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import type { LeaveType } from '../types/leave.types.js';

export class LeaveRepository {
  async getLeaveBalances(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
  ): Promise<EmployeeLeaveBalance[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          eq(employeeLeaveBalances.employeeId, employeeId),
          eq(employeeLeaveBalances.year, year),
        ),
      );
  }

  async ensureDefaultLeaveBalances(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
  ): Promise<EmployeeLeaveBalance[]> {
    const existing = await this.getLeaveBalances(tenantId, companyId, employeeId, year);
    if (existing.length > 0) return existing;

    const db = getDb();
    const defaults: Array<{
      leaveType: LeaveType;
      totalDays: number;
    }> = [
      { leaveType: 'annual', totalDays: 18 },
      { leaveType: 'sick', totalDays: 12 },
      { leaveType: 'casual', totalDays: 6 },
      { leaveType: 'unpaid', totalDays: 0 },
    ];

    for (const def of defaults) {
      await db.insert(employeeLeaveBalances).values({
        id: generateSurrogateId('lvb'),
        tenantId,
        companyId,
        employeeId,
        leaveType: def.leaveType,
        totalDays: def.totalDays,
        usedDays: 0,
        pendingDays: 0,
        year,
      });
    }

    return this.getLeaveBalances(tenantId, companyId, employeeId, year);
  }

  async getLeaveRequests(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeLeaveRequest[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeLeaveRequests.createdAt));
  }

  async findOverlappingLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<EmployeeLeaveRequest | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
          inArray(employeeLeaveRequests.status, ['pending', 'approved']),
          lte(employeeLeaveRequests.startDate, endDate),
          gte(employeeLeaveRequests.endDate, startDate),
        ),
      );
    return rows[0] ?? null;
  }

  async createLeaveRequest(data: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
  }): Promise<EmployeeLeaveRequest> {
    const db = getDb();
    const id = generateSurrogateId('lvrq');
    await db.insert(employeeLeaveRequests).values({
      id,
      tenantId: data.tenantId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      reason: data.reason,
      status: 'pending',
    });

    const year = new Date(data.startDate).getFullYear();
    await db
      .update(employeeLeaveBalances)
      .set({
        pendingDays: sql`${employeeLeaveBalances.pendingDays} + ${data.totalDays}`,
      })
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, data.tenantId),
          eq(employeeLeaveBalances.companyId, data.companyId),
          eq(employeeLeaveBalances.employeeId, data.employeeId),
          eq(employeeLeaveBalances.leaveType, data.leaveType),
          eq(employeeLeaveBalances.year, year),
        ),
      );

    const [created] = await db
      .select()
      .from(employeeLeaveRequests)
      .where(eq(employeeLeaveRequests.id, id));
    return created!;
  }

  async cancelLeaveRequest(id: string, employeeId: string): Promise<EmployeeLeaveRequest> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(eq(employeeLeaveRequests.id, id), eq(employeeLeaveRequests.employeeId, employeeId)),
      );

    if (!existing) {
      throw new Error('Leave request not found');
    }
    if (existing.status !== 'pending') {
      throw new Error(`Cannot cancel leave request with status '${existing.status}'`);
    }

    await db
      .update(employeeLeaveRequests)
      .set({ status: 'cancelled' })
      .where(eq(employeeLeaveRequests.id, id));

    const year = new Date(existing.startDate).getFullYear();
    await db
      .update(employeeLeaveBalances)
      .set({
        pendingDays: sql`GREATEST(0, ${employeeLeaveBalances.pendingDays} - ${existing.totalDays})`,
      })
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, existing.tenantId),
          eq(employeeLeaveBalances.companyId, existing.companyId),
          eq(employeeLeaveBalances.employeeId, existing.employeeId),
          eq(employeeLeaveBalances.leaveType, existing.leaveType),
          eq(employeeLeaveBalances.year, year),
        ),
      );

    const [updated] = await db
      .select()
      .from(employeeLeaveRequests)
      .where(eq(employeeLeaveRequests.id, id));
    return updated!;
  }
}

export const leaveRepository = new LeaveRepository();
