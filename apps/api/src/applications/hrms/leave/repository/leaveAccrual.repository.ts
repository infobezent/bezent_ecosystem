import { and, asc, desc, eq, gt, inArray, lte, lt, gte, sql } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { ConflictError } from '../../../../app/errors/AppError.js';
import {
  companies,
  employeeLeaveBalances,
  employeeLeaveRequests,
  leavePolicies,
  leaveAccrualRules,
  leaveCycleCloseRuns,
  leaveEncashmentHandovers,
  leaveTypes,
  type EmployeeLeaveBalance,
  type LeaveAccrualRuleRecord,
  type NewLeaveAccrualRuleRecord,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { insertLedgerEntry, reconcileAccrual } from './leave.repository.js';
import type { LeaveCalculationSnapshot } from '../types/leave.types.js';

export interface CycleCloseItem {
  balanceId: string;
  employeeId: string;
  leaveTypeId: string;
  encash: number;
  carryForward: number;
  lapse: number;
  encashmentBasis: 'basic' | 'gross';
  carryForwardExpiresOn: string | null;
}

export class LeaveAccrualRepository {
  async listRules(tenantId: string, companyId: string): Promise<LeaveAccrualRuleRecord[]> {
    return getDb()
      .select()
      .from(leaveAccrualRules)
      .where(
        and(eq(leaveAccrualRules.tenantId, tenantId), eq(leaveAccrualRules.companyId, companyId)),
      )
      .orderBy(asc(leaveAccrualRules.leaveTypeId), desc(leaveAccrualRules.effectiveFrom));
  }

  /** The rule version in force on `date` (latest effective_from on or before it). */
  async findRuleFor(leaveTypeId: string, date: string): Promise<LeaveAccrualRuleRecord | null> {
    const [row] = await getDb()
      .select()
      .from(leaveAccrualRules)
      .where(
        and(
          eq(leaveAccrualRules.leaveTypeId, leaveTypeId),
          lte(leaveAccrualRules.effectiveFrom, date),
        ),
      )
      .orderBy(desc(leaveAccrualRules.effectiveFrom))
      .limit(1);
    return row ?? null;
  }

  /** Inserts a rule version, replacing one with the same effective date; mirrors type flags. */
  async saveRule(record: NewLeaveAccrualRuleRecord): Promise<void> {
    await getDb().transaction(async (tx) => {
      await tx
        .delete(leaveAccrualRules)
        .where(
          and(
            eq(leaveAccrualRules.leaveTypeId, record.leaveTypeId),
            eq(leaveAccrualRules.effectiveFrom, record.effectiveFrom),
          ),
        );
      await tx.insert(leaveAccrualRules).values(record);
      await tx
        .update(leaveTypes)
        .set({
          carryForwardEnabled: record.carryForwardEnabled ?? false,
          encashmentEnabled: record.encashmentEnabled ?? false,
        })
        .where(eq(leaveTypes.id, record.leaveTypeId));
    });
  }

  /** Approved loss-of-pay days per month (keyed by the month window start). */
  async lopDaysByMonth(
    employeeId: string,
    from: string,
    to: string,
    monthStarts: string[],
  ): Promise<Map<string, number>> {
    const rows = await getDb()
      .select({ request: employeeLeaveRequests })
      .from(employeeLeaveRequests)
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
      .where(
        and(
          eq(employeeLeaveRequests.employeeId, employeeId),
          eq(employeeLeaveRequests.status, 'approved'),
          eq(leaveTypes.category, 'loss_of_pay'),
          lte(employeeLeaveRequests.startDate, to),
          gte(employeeLeaveRequests.endDate, from),
        ),
      );
    const monthOf = (date: string) => [...monthStarts].reverse().find((m) => m <= date);
    const result = new Map<string, number>();
    const add = (date: string, days: number) => {
      const m = monthOf(date);
      if (m) result.set(m, (result.get(m) ?? 0) + days);
    };
    for (const { request } of rows) {
      const breakdown = (request.calculationSnapshot as Partial<LeaveCalculationSnapshot> | null)
        ?.scheduleBreakdown;
      if (breakdown?.length) breakdown.forEach((b) => add(b.date, b.chargedDays));
      else add(request.startDate, Number(request.totalDays));
    }
    return result;
  }

  /** Creates the cycle balance if needed and reconciles its accrued entitlement, in one transaction. */
  async ensureAndReconcile(input: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    cycle: { start: string; end: string; startYear: number };
    target: number;
    actorUserId: string;
  }): Promise<void> {
    await getDb().transaction(async (tx) => {
      const where = and(
        eq(employeeLeaveBalances.companyId, input.companyId),
        eq(employeeLeaveBalances.employeeId, input.employeeId),
        eq(employeeLeaveBalances.leaveTypeId, input.leaveTypeId),
        eq(employeeLeaveBalances.cycleStartDate, input.cycle.start),
      );
      let [balance] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
      if (!balance) {
        if (input.target === 0) return;
        await tx.insert(employeeLeaveBalances).values({
          id: generateSurrogateId('lvb'),
          tenantId: input.tenantId,
          companyId: input.companyId,
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          year: input.cycle.startYear,
          cycleStartDate: input.cycle.start,
          cycleEndDate: input.cycle.end,
        });
        [balance] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
      }
      await reconcileAccrual(tx, balance!, input.target, input.actorUserId, 'Scheduled accrual');
    });
  }

  async listBalancesForCycle(
    tenantId: string,
    companyId: string,
    cycleStart: string,
  ): Promise<Array<EmployeeLeaveBalance & { isTracked: boolean; leaveTypeName: string }>> {
    const rows = await getDb()
      .select({
        balance: employeeLeaveBalances,
        isTracked: leaveTypes.isTracked,
        name: leaveTypes.name,
      })
      .from(employeeLeaveBalances)
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveBalances.leaveTypeId))
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          eq(employeeLeaveBalances.cycleStartDate, cycleStart),
        ),
      );
    return rows.map((r) => ({ ...r.balance, isTracked: r.isTracked, leaveTypeName: r.name }));
  }

  async findCloseRun(companyId: string, cycleStart: string) {
    const [row] = await getDb()
      .select()
      .from(leaveCycleCloseRuns)
      .where(
        and(
          eq(leaveCycleCloseRuns.companyId, companyId),
          eq(leaveCycleCloseRuns.cycleStartDate, cycleStart),
        ),
      );
    return row ?? null;
  }

  async listCloseRuns(tenantId: string, companyId: string) {
    return getDb()
      .select()
      .from(leaveCycleCloseRuns)
      .where(
        and(
          eq(leaveCycleCloseRuns.tenantId, tenantId),
          eq(leaveCycleCloseRuns.companyId, companyId),
        ),
      )
      .orderBy(desc(leaveCycleCloseRuns.cycleStartDate));
  }

  /**
   * Generates or refreshes a pending year-end close run generated by an automatic sweep or preview.
   * Does NOT mutate balances or create ledger movements.
   */
  async recordPendingCycleClose(input: {
    tenantId: string;
    companyId: string;
    cycle: { start: string; end: string };
    summary: Record<string, unknown>;
    actorUserId: string;
  }): Promise<string> {
    const existing = await this.findCloseRun(input.companyId, input.cycle.start);
    if (existing) {
      if (existing.status === 'committed') {
        return existing.id;
      }
      await getDb()
        .update(leaveCycleCloseRuns)
        .set({
          summary: input.summary,
          cycleEndDate: input.cycle.end,
          updatedAt: new Date(),
        })
        .where(eq(leaveCycleCloseRuns.id, existing.id));
      return existing.id;
    }

    const runId = generateSurrogateId('lccr');
    await getDb().insert(leaveCycleCloseRuns).values({
      id: runId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      cycleStartDate: input.cycle.start,
      cycleEndDate: input.cycle.end,
      status: 'pending',
      summary: input.summary,
      createdByUserId: input.actorUserId,
    });
    return runId;
  }

  /** Marks a pending year-end close run as reviewed by an HR administrator. */
  async markRunReviewed(companyId: string, cycleStart: string, userId: string): Promise<void> {
    const existing = await this.findCloseRun(companyId, cycleStart);
    if (existing && existing.status === 'pending') {
      await getDb()
        .update(leaveCycleCloseRuns)
        .set({
          status: 'reviewed',
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leaveCycleCloseRuns.id, existing.id));
    }
  }

  /**
   * Commits a cycle close once per company and cycle (unique run row inserted/transitioned to committed in the same
   * transaction). Every movement is a ledger entry: encashment/lapse on the closing balance,
   * carry_forward_in on the next cycle's balance.
   */
  async commitCycleClose(input: {
    tenantId: string;
    companyId: string;
    cycle: { start: string; end: string };
    nextCycle: { start: string; end: string; startYear: number };
    items: CycleCloseItem[];
    summary: Record<string, unknown>;
    actorUserId: string;
  }): Promise<string> {
    let runId = generateSurrogateId('lccr');
    await getDb().transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(leaveCycleCloseRuns)
        .where(
          and(
            eq(leaveCycleCloseRuns.companyId, input.companyId),
            eq(leaveCycleCloseRuns.cycleStartDate, input.cycle.start),
          ),
        )
        .for('update');

      if (existing) {
        if (existing.status === 'committed') {
          throw new ConflictError(`Leave year starting on ${input.cycle.start} is already closed.`);
        }
        runId = existing.id;
        await tx
          .update(leaveCycleCloseRuns)
          .set({
            status: 'committed',
            committedByUserId: input.actorUserId,
            committedAt: new Date(),
            summary: input.summary,
            cycleEndDate: input.cycle.end,
            updatedAt: new Date(),
          })
          .where(eq(leaveCycleCloseRuns.id, existing.id));
      } else {
        await tx.insert(leaveCycleCloseRuns).values({
          id: runId,
          tenantId: input.tenantId,
          companyId: input.companyId,
          cycleStartDate: input.cycle.start,
          cycleEndDate: input.cycle.end,
          status: 'committed',
          summary: input.summary,
          createdByUserId: input.actorUserId,
          committedByUserId: input.actorUserId,
          committedAt: new Date(),
        });
      }

      for (const item of input.items) {
        const [closing] = await tx
          .select()
          .from(employeeLeaveBalances)
          .where(eq(employeeLeaveBalances.id, item.balanceId))
          .for('update');
        if (!closing) continue;

        const deduct = item.encash + item.lapse;
        if (deduct > 0) {
          await tx
            .update(employeeLeaveBalances)
            .set({ totalDays: sql`${employeeLeaveBalances.totalDays} - ${deduct.toFixed(2)}` })
            .where(eq(employeeLeaveBalances.id, closing.id));
        }
        if (item.encash > 0) {
          await insertLedgerEntry(
            tx,
            closing,
            'encashment',
            item.encash,
            'cycle_close',
            runId,
            input.actorUserId,
          );
          await tx.insert(leaveEncashmentHandovers).values({
            id: generateSurrogateId('lenc'),
            tenantId: input.tenantId,
            companyId: input.companyId,
            employeeId: item.employeeId,
            leaveTypeId: item.leaveTypeId,
            cycleStartDate: input.cycle.start,
            days: item.encash.toFixed(2),
            basis: item.encashmentBasis,
            trigger: 'cycle_end',
            runId,
          });
        }
        if (item.lapse > 0) {
          await insertLedgerEntry(
            tx,
            closing,
            'lapse',
            item.lapse,
            'cycle_close',
            runId,
            input.actorUserId,
          );
        }
        if (item.carryForward > 0) {
          const where = and(
            eq(employeeLeaveBalances.companyId, input.companyId),
            eq(employeeLeaveBalances.employeeId, item.employeeId),
            eq(employeeLeaveBalances.leaveTypeId, item.leaveTypeId),
            eq(employeeLeaveBalances.cycleStartDate, input.nextCycle.start),
          );
          let [next] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
          if (!next) {
            await tx.insert(employeeLeaveBalances).values({
              id: generateSurrogateId('lvb'),
              tenantId: input.tenantId,
              companyId: input.companyId,
              employeeId: item.employeeId,
              leaveTypeId: item.leaveTypeId,
              year: input.nextCycle.startYear,
              cycleStartDate: input.nextCycle.start,
              cycleEndDate: input.nextCycle.end,
            });
            [next] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
          }
          await tx
            .update(employeeLeaveBalances)
            .set({
              totalDays: sql`${employeeLeaveBalances.totalDays} + ${item.carryForward.toFixed(2)}`,
              carriedForwardDays: item.carryForward.toFixed(2),
              carryForwardExpiresOn: item.carryForwardExpiresOn,
            })
            .where(eq(employeeLeaveBalances.id, next!.id));
          await insertLedgerEntry(
            tx,
            next!,
            'carry_forward_in',
            item.carryForward,
            'cycle_close',
            runId,
            input.actorUserId,
          );
        }
      }
    });
    return runId;
  }

  /** Lapses unused carried-forward days whose expiry date has passed. */
  async expireCarryForward(today: string, actorUserId: string): Promise<number> {
    const expired = await getDb()
      .select({ id: employeeLeaveBalances.id })
      .from(employeeLeaveBalances)
      .where(
        and(
          lt(employeeLeaveBalances.carryForwardExpiresOn, today),
          gt(employeeLeaveBalances.carriedForwardDays, '0'),
        ),
      );
    let lapsedRows = 0;
    for (const { id } of expired) {
      await getDb().transaction(async (tx) => {
        const [b] = await tx
          .select()
          .from(employeeLeaveBalances)
          .where(eq(employeeLeaveBalances.id, id))
          .for('update');
        if (!b || Number(b.carriedForwardDays) <= 0) return;
        const available = Number(b.totalDays) - Number(b.usedDays) - Number(b.pendingDays);
        const lapse = Math.max(0, Math.min(Number(b.carriedForwardDays), available));
        await tx
          .update(employeeLeaveBalances)
          .set({
            totalDays: sql`${employeeLeaveBalances.totalDays} - ${lapse.toFixed(2)}`,
            carriedForwardDays: '0.00',
          })
          .where(eq(employeeLeaveBalances.id, id));
        if (lapse > 0) {
          await insertLedgerEntry(tx, b, 'lapse', lapse, 'carry_forward_expiry', null, actorUserId);
        }
        lapsedRows++;
      });
    }
    return lapsedRows;
  }

  async listEncashments(tenantId: string, companyId: string, cycleStart?: string) {
    const conditions = [
      eq(leaveEncashmentHandovers.tenantId, tenantId),
      eq(leaveEncashmentHandovers.companyId, companyId),
    ];
    if (cycleStart) conditions.push(eq(leaveEncashmentHandovers.cycleStartDate, cycleStart));
    return getDb()
      .select()
      .from(leaveEncashmentHandovers)
      .where(and(...conditions))
      .orderBy(desc(leaveEncashmentHandovers.createdAt));
  }

  /** Companies with leave policies in force (the ones accrual and year-end sweeps act on). */
  async listCompaniesWithPolicies(): Promise<
    Array<{ tenantId: string; companyId: string; timeZone: string | null }>
  > {
    return getDb()
      .selectDistinct({
        tenantId: leavePolicies.tenantId,
        companyId: leavePolicies.companyId,
        timeZone: companies.timeZone,
      })
      .from(leavePolicies)
      .innerJoin(companies, eq(companies.id, leavePolicies.companyId))
      .where(inArray(leavePolicies.status, ['active', 'scheduled']));
  }

  async findLeaveTypes(tenantId: string, companyId: string, ids: string[]) {
    if (ids.length === 0) return [];
    return getDb()
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.tenantId, tenantId),
          eq(leaveTypes.companyId, companyId),
          inArray(leaveTypes.id, ids),
        ),
      );
  }
}

export const leaveAccrualRepository = new LeaveAccrualRepository();
