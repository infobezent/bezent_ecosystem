import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, closePool } from '../../../../db/connection.js';
import {
  companies,
  employeeLeaveBalances,
  employeeLeaveRequests,
  employees,
  leaveBalanceTransactions,
  leavePolicies,
  leaveTypes,
} from '../../../../db/schema.js';
import { leaveRepository, type ReservationInput } from '../repository/leave.repository.js';
import { ensureLeaveTypeId } from './support/leaveTestTypes.js';

describe.skipIf(!isDatabaseConfigured)('LeaveRepository — reservation under concurrency', () => {
  const db = getDb();
  const tenantId = 'tenant_demo_01';
  const companyId = `comp_lvres_${Date.now()}`;
  const employeeId = `emp_lvres_${Date.now()}`;
  const cycle = { start: '2030-01-01', end: '2030-12-31', startYear: 2030 };
  let alId: string;
  let slId: string;

  const reservation = (
    leaveTypeId: string,
    startDate: string,
    endDate: string,
    totalDays: number,
  ): ReservationInput => ({
    request: {
      tenantId,
      companyId,
      employeeId,
      leaveTypeId,
      policyId: null,
      settingsVersionId: null,
      submittedByUserId: 'usr_test',
      startDate,
      endDate,
      totalDays: totalDays.toFixed(2),
      session: null,
      calculationSnapshot: null,
      reason: 'Concurrency test',
    },
    cycle,
    entitlementTarget: 5,
    isTracked: true,
    negativeAllowance: 0,
    approvalSteps: [],
    autoApprove: false,
    notifications: [],
    actorUserId: 'usr_test',
  });

  beforeAll(async () => {
    await db.insert(companies).values({
      id: companyId,
      tenantId,
      name: 'Isolated Leave Reservation Company',
      code: `LVR_${Date.now().toString().slice(-6)}`,
      status: 'active',
    });
    await db.insert(employees).values({
      id: employeeId,
      tenantId,
      companyId,
      employeeNumber: 'LVR-001',
      firstName: 'Reserve',
      email: `lvres_${Date.now()}@test.example`,
      joiningDate: '2024-01-01',
      employmentStatus: 'active',
    });
    alId = await ensureLeaveTypeId(tenantId, companyId, 'AL');
    slId = await ensureLeaveTypeId(tenantId, companyId, 'SL');
  });

  afterAll(async () => {
    await db.delete(employeeLeaveRequests).where(eq(employeeLeaveRequests.companyId, companyId));
    await db.delete(employeeLeaveBalances).where(eq(employeeLeaveBalances.companyId, companyId));
    await db.delete(leavePolicies).where(eq(leavePolicies.companyId, companyId));
    await db.delete(leaveTypes).where(eq(leaveTypes.companyId, companyId));
    await db.delete(employees).where(eq(employees.id, employeeId));
    await db.delete(companies).where(eq(companies.id, companyId));
    await closePool();
  });

  it('allows only one of two concurrent overlapping requests, even across leave types', async () => {
    const results = await Promise.allSettled([
      leaveRepository.createRequestWithReservation(
        reservation(alId, '2030-03-04', '2030-03-05', 2),
      ),
      leaveRepository.createRequestWithReservation(
        reservation(slId, '2030-03-05', '2030-03-06', 2),
      ),
    ]);
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toMatchObject({ code: 'LEAVE_OVERLAP', statusCode: 409 });
  });

  it('never lets concurrent requests overspend the balance', async () => {
    // AL quota 5; whichever of these wins first, the second cannot also fit (3 + 3 > 5 - used).
    const results = await Promise.allSettled([
      leaveRepository.createRequestWithReservation(
        reservation(alId, '2030-05-06', '2030-05-08', 3),
      ),
      leaveRepository.createRequestWithReservation(
        reservation(alId, '2030-06-03', '2030-06-05', 3),
      ),
    ]);
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    expect(rejected[0]!.reason).toMatchObject({ code: 'LEAVE_INSUFFICIENT_BALANCE' });

    const [balance] = await db
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.employeeId, employeeId),
          eq(employeeLeaveBalances.leaveTypeId, alId),
        ),
      );
    expect(Number(balance!.totalDays)).toBe(5);
    expect(Number(balance!.pendingDays)).toBeLessThanOrEqual(5);
  });

  it('records the grant and every reservation in the ledger, matching the balance', async () => {
    const [balance] = await db
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.employeeId, employeeId),
          eq(employeeLeaveBalances.leaveTypeId, alId),
        ),
      );
    const ledger = await db
      .select()
      .from(leaveBalanceTransactions)
      .where(eq(leaveBalanceTransactions.balanceId, balance!.id));

    const sum = (type: string) =>
      ledger.filter((t) => t.txnType === type).reduce((s, t) => s + Number(t.days), 0);
    expect(sum('accrual')).toBe(Number(balance!.totalDays));
    expect(sum('usage_reserve') - sum('usage_release')).toBe(Number(balance!.pendingDays));
  });

  it('cancelling releases the reserved days back to the balance', async () => {
    const [pending] = await db
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.employeeId, employeeId),
          eq(employeeLeaveRequests.leaveTypeId, alId),
          eq(employeeLeaveRequests.status, 'pending'),
        ),
      )
      .limit(1);
    const before = await db
      .select()
      .from(employeeLeaveBalances)
      .where(eq(employeeLeaveBalances.leaveTypeId, alId));

    await leaveRepository.cancelPendingRequest(
      tenantId,
      companyId,
      employeeId,
      pending!.id,
      'usr_test',
    );

    const after = await db
      .select()
      .from(employeeLeaveBalances)
      .where(eq(employeeLeaveBalances.leaveTypeId, alId));
    expect(Number(after[0]!.pendingDays)).toBe(
      Number(before[0]!.pendingDays) - Number(pending!.totalDays),
    );
  });
});
