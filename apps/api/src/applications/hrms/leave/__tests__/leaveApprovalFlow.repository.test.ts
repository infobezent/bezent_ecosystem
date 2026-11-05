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
  leaveRequestApprovals,
  leaveTypes,
} from '../../../../db/schema.js';
import { leaveRepository, type ReservationInput } from '../repository/leave.repository.js';
import { ensureLeaveTypeId } from './support/leaveTestTypes.js';

describe.skipIf(!isDatabaseConfigured)('LeaveRepository — approval decisions', () => {
  const db = getDb();
  const tenantId = 'tenant_demo_01';
  const stamp = Date.now();
  const companyId = `comp_lvapf_${stamp}`;
  const employeeId = `emp_lvapf_${stamp}`;
  const cycle = { start: '2031-01-01', end: '2031-12-31', startYear: 2031 };
  let alId: string;

  const submit = (startDate: string, endDate: string, days: number, levels: number) => {
    const input: ReservationInput = {
      request: {
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: alId,
        policyId: null,
        settingsVersionId: null,
        workflowId: null,
        currentLevel: 1,
        submittedByUserId: 'usr_emp',
        startDate,
        endDate,
        totalDays: days.toFixed(2),
        session: null,
        calculationSnapshot: null,
        reason: 'Approval flow test',
      },
      cycle,
      entitlementTarget: 10,
      isTracked: true,
      negativeAllowance: 0,
      approvalSteps: Array.from({ length: levels }, (_, i) => ({
        purpose: 'approval' as const,
        level: i + 1,
        approverEmployeeId: `emp_mgr_${i + 1}`,
        approverRoleId: null,
        action: i === 0 ? ('pending' as const) : ('waiting' as const),
        slaDueAt: i === 0 ? new Date() : null,
        onSlaBreach: 'notify_only' as const,
      })),
      autoApprove: false,
      notifications: [],
      actorUserId: 'usr_emp',
    };
    return leaveRepository.createRequestWithReservation(input);
  };

  const pendingStep = async (requestId: string) => {
    const [step] = await db
      .select()
      .from(leaveRequestApprovals)
      .where(
        and(
          eq(leaveRequestApprovals.requestId, requestId),
          eq(leaveRequestApprovals.action, 'pending'),
        ),
      );
    return step!;
  };

  const balance = async () => {
    const [b] = await db
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.employeeId, employeeId),
          eq(employeeLeaveBalances.leaveTypeId, alId),
        ),
      );
    return { used: Number(b!.usedDays), pending: Number(b!.pendingDays), id: b!.id };
  };

  const decide = (requestId: string, approvalId: string, decision: 'approved' | 'rejected') =>
    leaveRepository.decide({
      tenantId,
      companyId,
      requestId,
      approvalId,
      decision,
      actorUserId: 'usr_mgr',
      comment: decision === 'rejected' ? 'Not this week' : null,
      now: new Date(),
      slaDueAtFor: () => new Date(Date.now() + 3_600_000),
      notifications: () => [],
    });

  beforeAll(async () => {
    await db.insert(companies).values({
      id: companyId,
      tenantId,
      name: 'Isolated Approval Flow Company',
      code: `LAF_${stamp.toString().slice(-6)}`,
      status: 'active',
    });
    await db.insert(employees).values({
      id: employeeId,
      tenantId,
      companyId,
      employeeNumber: 'LAF-001',
      firstName: 'Flow',
      email: `lvapf_${stamp}@test.example`,
      joiningDate: '2024-01-01',
      employmentStatus: 'active',
    });
    alId = await ensureLeaveTypeId(tenantId, companyId, 'AL');
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

  it('two-level approval advances, then confirms usage (pending → used)', async () => {
    const request = await submit('2031-03-03', '2031-03-04', 2, 2);
    expect(request.status).toBe('pending');
    expect(await balance()).toMatchObject({ used: 0, pending: 2 });

    const first = await decide(request.id, (await pendingStep(request.id)).id, 'approved');
    expect(first.nextStep?.level).toBe(2);
    expect(first.status).toBe('pending');

    const second = await decide(request.id, (await pendingStep(request.id)).id, 'approved');
    expect(second.status).toBe('approved');
    expect(await balance()).toMatchObject({ used: 2, pending: 0 });

    const ledger = await db
      .select()
      .from(leaveBalanceTransactions)
      .where(eq(leaveBalanceTransactions.referenceId, request.id));
    expect(ledger.map((t) => t.txnType).sort()).toEqual(['usage_confirm', 'usage_reserve']);
  });

  it('a decided step cannot be decided again', async () => {
    const request = await submit('2031-04-07', '2031-04-07', 1, 1);
    const step = await pendingStep(request.id);
    await decide(request.id, step.id, 'approved');
    await expect(decide(request.id, step.id, 'approved')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('rejection releases the reserved days and closes later steps', async () => {
    const before = await balance();
    const request = await submit('2031-05-05', '2031-05-06', 2, 2);
    const outcome = await decide(request.id, (await pendingStep(request.id)).id, 'rejected');
    expect(outcome.status).toBe('rejected');
    expect(await balance()).toMatchObject({ used: before.used, pending: before.pending });
    const steps = await db
      .select()
      .from(leaveRequestApprovals)
      .where(eq(leaveRequestApprovals.requestId, request.id));
    expect(steps.map((s) => s.action).sort()).toEqual(['cancelled', 'rejected']);
  });

  it('cancelling approved leave with a cancellation step, then approving it, reverses used days', async () => {
    const request = await submit('2031-06-02', '2031-06-02', 1, 1);
    await decide(request.id, (await pendingStep(request.id)).id, 'approved');
    const usedAfterApproval = (await balance()).used;

    const pendingCancel = await leaveRepository.cancelApprovedRequest(
      tenantId,
      companyId,
      employeeId,
      request.id,
      'usr_emp',
      {
        purpose: 'cancellation',
        level: 1,
        approverEmployeeId: 'emp_mgr_1',
        approverRoleId: null,
        action: 'pending',
        slaDueAt: new Date(),
        onSlaBreach: 'notify_only',
      },
      [],
    );
    expect(pendingCancel.status).toBe('cancellation_pending');

    const outcome = await decide(request.id, (await pendingStep(request.id)).id, 'approved');
    expect(outcome.status).toBe('cancelled');
    expect((await balance()).used).toBe(usedAfterApproval - 1);
  });
});
