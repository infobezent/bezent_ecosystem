import { eq, and, asc, desc, sql, lte, gte, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  attendancePeriods,
  employeeLeaveBalances,
  employeeLeaveRequests,
  employeeNotifications,
  employeePersonalDetails,
  employeeWorkSchedules,
  employees,
  leaveBalanceTransactions,
  leaveGeneralSettings,
  leaveRequestApprovals,
  leaveTypes,
  type EmployeeLeaveBalance,
  type EmployeeLeaveRequest,
  type NewEmployeeLeaveRequest,
  type NewLeaveRequestApprovalRecord,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import {
  attendanceSettingsRepository,
  DEFAULT_COMPANY_SHIFTS,
} from '../../attendance/repository/attendanceSettings.repository.js';

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface LeaveEmployeeProfile {
  id: string;
  departmentId: string | null;
  locationId: string | null;
  reportingManagerId: string | null;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  employmentStatus: string;
  joiningDate: string;
  probationEndDate: string | null;
  lastWorkingDate: string | null;
  gender: string | null;
}

export interface LeaveNotification {
  employeeId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'action_required';
  link?: string;
}

export type ApprovalStepInput = Omit<
  NewLeaveRequestApprovalRecord,
  'id' | 'requestId' | 'tenantId' | 'companyId'
>;

export interface ReservationInput {
  request: Omit<NewEmployeeLeaveRequest, 'id' | 'status'>;
  cycle: { start: string; end: string; startYear: number };
  /** Accrued entitlement the cycle balance should hold now; null for untracked types. */
  entitlementTarget: number | null;
  isTracked: boolean;
  /** How far below zero the balance may go (0 when negative balance is not allowed). */
  negativeAllowance: number;
  approvalSteps: ApprovalStepInput[];
  /** Approved at submission (auto-approval threshold or no approver levels). */
  autoApprove: boolean;
  notifications: LeaveNotification[];
  actorUserId: string;
}

export type UsageMove = 'confirm' | 'release' | 'reversal';

const toNumber = (v: string | number | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v);

// ── Transaction helpers shared by the leave services ─────────────────────────

export async function insertLedgerEntry(
  tx: Tx,
  balance: EmployeeLeaveBalance,
  txnType:
    | 'accrual'
    | 'usage_reserve'
    | 'usage_release'
    | 'usage_confirm'
    | 'usage_reversal'
    | 'adjustment'
    | 'carry_forward_in'
    | 'lapse'
    | 'encashment',
  days: number,
  referenceType: string,
  referenceId: string | null,
  actorUserId: string,
  reason?: string,
): Promise<void> {
  await tx.insert(leaveBalanceTransactions).values({
    id: generateSurrogateId('lbt'),
    tenantId: balance.tenantId,
    companyId: balance.companyId,
    employeeId: balance.employeeId,
    leaveTypeId: balance.leaveTypeId,
    balanceId: balance.id,
    cycleStartDate: balance.cycleStartDate,
    txnType,
    days: days.toFixed(2),
    referenceType,
    referenceId,
    reason: reason ?? null,
    createdByUserId: actorUserId,
  });
}

export async function insertNotifications(
  tx: Tx,
  tenantId: string,
  companyId: string,
  notifications: LeaveNotification[],
): Promise<void> {
  if (notifications.length === 0) return;
  await tx.insert(employeeNotifications).values(
    notifications.map((n) => ({
      id: generateSurrogateId('ntf'),
      tenantId,
      companyId,
      employeeId: n.employeeId,
      title: n.title.slice(0, 200),
      message: n.message.slice(0, 500),
      type: n.type ?? 'info',
      link: n.link ?? '/ess/leave',
    })),
  );
}

/**
 * Brings a balance's accrued entitlement to `target` by posting the difference as an accrual.
 * Accrued = opening + accrual entries; adjustments and carry-forward are never touched.
 */
export async function reconcileAccrual(
  tx: Tx,
  balance: EmployeeLeaveBalance,
  target: number,
  actorUserId: string,
  reason: string,
): Promise<EmployeeLeaveBalance> {
  const [row] = await tx
    .select({ accrued: sql<string>`COALESCE(SUM(${leaveBalanceTransactions.days}), 0)` })
    .from(leaveBalanceTransactions)
    .where(
      and(
        eq(leaveBalanceTransactions.balanceId, balance.id),
        inArray(leaveBalanceTransactions.txnType, ['opening', 'accrual']),
      ),
    );
  const diff = Math.round((target - Number(row?.accrued ?? 0)) * 100) / 100;
  if (diff === 0) return balance;

  await insertLedgerEntry(tx, balance, 'accrual', diff, 'accrual_rule', null, actorUserId, reason);
  await tx
    .update(employeeLeaveBalances)
    .set({ totalDays: sql`${employeeLeaveBalances.totalDays} + ${diff.toFixed(2)}` })
    .where(eq(employeeLeaveBalances.id, balance.id));
  const [updated] = await tx
    .select()
    .from(employeeLeaveBalances)
    .where(eq(employeeLeaveBalances.id, balance.id));
  return updated!;
}

/** Locks the balance a request draws on (the cycle containing its start date). */
async function lockBalanceForRequest(
  tx: Tx,
  request: EmployeeLeaveRequest,
): Promise<EmployeeLeaveBalance | null> {
  const [balance] = await tx
    .select()
    .from(employeeLeaveBalances)
    .where(
      and(
        eq(employeeLeaveBalances.companyId, request.companyId),
        eq(employeeLeaveBalances.employeeId, request.employeeId),
        eq(employeeLeaveBalances.leaveTypeId, request.leaveTypeId),
        lte(employeeLeaveBalances.cycleStartDate, request.startDate),
        gte(employeeLeaveBalances.cycleEndDate, request.startDate),
      ),
    )
    .for('update');
  return balance ?? null;
}

/**
 * confirm: pending → used (final approval); release: pending removed (reject/cancel pending);
 * reversal: used removed (cancellation of approved leave).
 */
export async function moveUsage(
  tx: Tx,
  request: EmployeeLeaveRequest,
  move: UsageMove,
  actorUserId: string,
): Promise<void> {
  const balance = await lockBalanceForRequest(tx, request);
  if (!balance) return;
  const days = Number(request.totalDays).toFixed(2);
  const patch =
    move === 'confirm'
      ? {
          pendingDays: sql`GREATEST(0, ${employeeLeaveBalances.pendingDays} - ${days})`,
          usedDays: sql`${employeeLeaveBalances.usedDays} + ${days}`,
        }
      : move === 'release'
        ? { pendingDays: sql`GREATEST(0, ${employeeLeaveBalances.pendingDays} - ${days})` }
        : { usedDays: sql`GREATEST(0, ${employeeLeaveBalances.usedDays} - ${days})` };
  await tx.update(employeeLeaveBalances).set(patch).where(eq(employeeLeaveBalances.id, balance.id));
  const txnType =
    move === 'confirm' ? 'usage_confirm' : move === 'release' ? 'usage_release' : 'usage_reversal';
  await insertLedgerEntry(
    tx,
    balance,
    txnType,
    Number(days),
    'leave_request',
    request.id,
    actorUserId,
  );
}

export class LeaveRepository {
  async getEmployeeProfile(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<LeaveEmployeeProfile | null> {
    const [row] = await getDb()
      .select({
        id: employees.id,
        departmentId: employees.departmentId,
        locationId: employees.locationId,
        reportingManagerId: employees.reportingManagerId,
        employmentType: employees.employmentType,
        employmentStatus: employees.employmentStatus,
        joiningDate: employees.joiningDate,
        probationEndDate: employees.probationEndDate,
        lastWorkingDate: employees.lastWorkingDate,
        gender: employeePersonalDetails.gender,
      })
      .from(employees)
      .leftJoin(employeePersonalDetails, eq(employeePersonalDetails.employeeId, employees.id))
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /** The employee's assigned working days, or the company default shift (Decision D11). */
  async getWorkingDays(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<{ workingDays: string[]; source: 'employee_schedule' | 'company_default' }> {
    const [schedule] = await getDb()
      .select({ workingDays: employeeWorkSchedules.workingDays })
      .from(employeeWorkSchedules)
      .where(
        and(
          eq(employeeWorkSchedules.tenantId, tenantId),
          eq(employeeWorkSchedules.companyId, companyId),
          eq(employeeWorkSchedules.employeeId, employeeId),
        ),
      )
      .limit(1);
    if (schedule?.workingDays?.length) {
      return { workingDays: schedule.workingDays.map(String), source: 'employee_schedule' };
    }

    const roster = await attendanceSettingsRepository
      .getShiftRosterSettings(tenantId, companyId)
      .catch(() => null);
    const shift = roster?.shifts?.[0] ?? DEFAULT_COMPANY_SHIFTS[0]!;
    return { workingDays: shift.workingDays.map(String), source: 'company_default' };
  }

  async findLockedPeriodOverlapping(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ periodCode: string; startDate: string } | null> {
    const [row] = await getDb()
      .select({ periodCode: attendancePeriods.periodCode, startDate: attendancePeriods.startDate })
      .from(attendancePeriods)
      .where(
        and(
          eq(attendancePeriods.tenantId, tenantId),
          eq(attendancePeriods.companyId, companyId),
          inArray(attendancePeriods.status, ['locked', 'finalized']),
          lte(attendancePeriods.startDate, endDate),
          gte(attendancePeriods.endDate, startDate),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findOverlappingLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<EmployeeLeaveRequest | null> {
    const rows = await getDb()
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
          inArray(employeeLeaveRequests.status, ['pending', 'approved', 'cancellation_pending']),
          lte(employeeLeaveRequests.startDate, endDate),
          gte(employeeLeaveRequests.endDate, startDate),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Pending/approved requests of the employee touching a date range, optionally of one type. */
  async findActiveRequests(
    tenantId: string,
    companyId: string,
    employeeId: string,
    from: string,
    to: string,
    leaveTypeIds?: string[],
  ): Promise<EmployeeLeaveRequest[]> {
    const conditions = [
      eq(employeeLeaveRequests.tenantId, tenantId),
      eq(employeeLeaveRequests.companyId, companyId),
      eq(employeeLeaveRequests.employeeId, employeeId),
      inArray(employeeLeaveRequests.status, ['pending', 'approved', 'cancellation_pending']),
      lte(employeeLeaveRequests.startDate, to),
      gte(employeeLeaveRequests.endDate, from),
    ];
    if (leaveTypeIds) {
      if (leaveTypeIds.length === 0) return [];
      conditions.push(inArray(employeeLeaveRequests.leaveTypeId, leaveTypeIds));
    }
    return getDb()
      .select()
      .from(employeeLeaveRequests)
      .where(and(...conditions))
      .orderBy(asc(employeeLeaveRequests.startDate));
  }

  /** Pending/approved requests of one type touching a date range (for monthly/yearly caps). */
  async findActiveRequestsOfType(
    tenantId: string,
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    from: string,
    to: string,
  ): Promise<EmployeeLeaveRequest[]> {
    return this.findActiveRequests(tenantId, companyId, employeeId, from, to, [leaveTypeId]);
  }

  /** Approved/pending leave of other employees in a department overlapping a range. */
  async countDepartmentLeaveByDay(
    tenantId: string,
    companyId: string,
    departmentId: string,
    excludeEmployeeId: string,
    from: string,
    to: string,
  ): Promise<{ headcount: number; requests: Array<{ startDate: string; endDate: string }> }> {
    const db = getDb();
    const [[head], requests] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)` })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.departmentId, departmentId),
            inArray(employees.employmentStatus, ['active', 'probation', 'notice']),
          ),
        ),
      db
        .select({
          startDate: employeeLeaveRequests.startDate,
          endDate: employeeLeaveRequests.endDate,
        })
        .from(employeeLeaveRequests)
        .innerJoin(employees, eq(employees.id, employeeLeaveRequests.employeeId))
        .where(
          and(
            eq(employeeLeaveRequests.tenantId, tenantId),
            eq(employeeLeaveRequests.companyId, companyId),
            eq(employees.departmentId, departmentId),
            sql`${employeeLeaveRequests.employeeId} <> ${excludeEmployeeId}`,
            inArray(employeeLeaveRequests.status, ['pending', 'approved']),
            lte(employeeLeaveRequests.startDate, to),
            gte(employeeLeaveRequests.endDate, from),
          ),
        ),
    ]);
    return { headcount: Number(head?.n ?? 0), requests };
  }

  async getBalancesForCycle(
    tenantId: string,
    companyId: string,
    employeeId: string,
    cycleStartDate: string,
  ): Promise<EmployeeLeaveBalance[]> {
    return getDb()
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          eq(employeeLeaveBalances.employeeId, employeeId),
          eq(employeeLeaveBalances.cycleStartDate, cycleStartDate),
        ),
      );
  }

  async getRequestsWithTypes(tenantId: string, companyId: string, employeeId: string) {
    return getDb()
      .select({
        request: employeeLeaveRequests,
        leaveTypeCode: leaveTypes.code,
        leaveTypeName: leaveTypes.name,
        colorToken: leaveTypes.colorToken,
      })
      .from(employeeLeaveRequests)
      .innerJoin(leaveTypes, eq(leaveTypes.id, employeeLeaveRequests.leaveTypeId))
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeLeaveRequests.createdAt));
  }

  async findRequest(
    tenantId: string,
    companyId: string,
    requestId: string,
  ): Promise<EmployeeLeaveRequest | null> {
    const [row] = await getDb()
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.id, requestId),
        ),
      );
    return row ?? null;
  }

  /**
   * Creates the request, reserves its days and writes its approval steps in one transaction.
   * The employee row is locked to serialise submissions (so overlap checks hold), and the cycle
   * balance is created/reconciled to its accrued entitlement under a row lock before the
   * availability check, so concurrent requests cannot both spend the same days.
   */
  async createRequestWithReservation(input: ReservationInput): Promise<EmployeeLeaveRequest> {
    const { request } = input;
    const days = Number(request.totalDays);
    const id = generateSurrogateId('lvrq');

    await getDb().transaction(async (tx) => {
      await tx
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .for('update');
      const [overlap] = await tx
        .select({
          status: employeeLeaveRequests.status,
          startDate: employeeLeaveRequests.startDate,
          endDate: employeeLeaveRequests.endDate,
        })
        .from(employeeLeaveRequests)
        .where(
          and(
            eq(employeeLeaveRequests.companyId, request.companyId),
            eq(employeeLeaveRequests.employeeId, request.employeeId),
            inArray(employeeLeaveRequests.status, ['pending', 'approved', 'cancellation_pending']),
            lte(employeeLeaveRequests.startDate, request.endDate),
            gte(employeeLeaveRequests.endDate, request.startDate),
          ),
        )
        .limit(1);
      if (overlap) {
        throw new ConflictError(
          `Leave request overlaps with an existing ${overlap.status} leave (${overlap.startDate} to ${overlap.endDate})`,
          'LEAVE_OVERLAP',
        );
      }

      const balance = await this.lockOrCreateBalance(tx, input);
      if (input.isTracked) {
        const available =
          toNumber(balance.totalDays) - toNumber(balance.usedDays) - toNumber(balance.pendingDays);
        if (available - days < -input.negativeAllowance) {
          throw new BadRequestError(
            `Insufficient leave balance. Available: ${available} day(s), Requested: ${days} day(s).`,
            'LEAVE_INSUFFICIENT_BALANCE',
          );
        }
      }

      await tx.insert(employeeLeaveRequests).values({ ...request, id, status: 'pending' });
      await tx
        .update(employeeLeaveBalances)
        .set({ pendingDays: sql`${employeeLeaveBalances.pendingDays} + ${days.toFixed(2)}` })
        .where(eq(employeeLeaveBalances.id, balance.id));
      await insertLedgerEntry(
        tx,
        balance,
        'usage_reserve',
        days,
        'leave_request',
        id,
        input.actorUserId,
      );

      if (input.approvalSteps.length > 0) {
        await tx.insert(leaveRequestApprovals).values(
          input.approvalSteps.map((step) => ({
            ...step,
            id: generateSurrogateId('lvap'),
            tenantId: request.tenantId,
            companyId: request.companyId,
            requestId: id,
          })),
        );
      }

      if (input.autoApprove) {
        await tx
          .update(employeeLeaveRequests)
          .set({ status: 'approved', currentLevel: null, reviewedByUserId: 'system' })
          .where(eq(employeeLeaveRequests.id, id));
        const [created] = await tx
          .select()
          .from(employeeLeaveRequests)
          .where(eq(employeeLeaveRequests.id, id));
        await moveUsage(tx, created!, 'confirm', 'system');
      }

      await insertNotifications(tx, request.tenantId, request.companyId, input.notifications);

      // The first live request activates the company's leave settings (General Settings §D.6).
      await tx
        .update(leaveGeneralSettings)
        .set({ status: 'activated' })
        .where(
          and(
            eq(leaveGeneralSettings.tenantId, request.tenantId),
            eq(leaveGeneralSettings.companyId, request.companyId),
            eq(leaveGeneralSettings.status, 'pre_activation'),
          ),
        );
    });

    return (await this.findRequest(request.tenantId, request.companyId, id))!;
  }

  private async lockOrCreateBalance(
    tx: Tx,
    input: ReservationInput,
  ): Promise<EmployeeLeaveBalance> {
    const { request, cycle } = input;
    const where = and(
      eq(employeeLeaveBalances.companyId, request.companyId),
      eq(employeeLeaveBalances.employeeId, request.employeeId),
      eq(employeeLeaveBalances.leaveTypeId, request.leaveTypeId),
      eq(employeeLeaveBalances.cycleStartDate, cycle.start),
    );

    let [balance] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
    if (!balance) {
      await tx.insert(employeeLeaveBalances).values({
        id: generateSurrogateId('lvb'),
        tenantId: request.tenantId,
        companyId: request.companyId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        totalDays: '0.00',
        usedDays: '0.00',
        pendingDays: '0.00',
        year: cycle.startYear,
        cycleStartDate: cycle.start,
        cycleEndDate: cycle.end,
      });
      [balance] = await tx.select().from(employeeLeaveBalances).where(where).for('update');
    }
    if (input.isTracked && input.entitlementTarget !== null) {
      balance = await reconcileAccrual(
        tx,
        balance!,
        input.entitlementTarget,
        input.actorUserId,
        'Entitlement accrued under leave policy and accrual rule',
      );
    }
    return balance!;
  }

  /** Cancels a pending request and releases its reserved days. */
  async cancelPendingRequest(
    tenantId: string,
    companyId: string,
    employeeId: string,
    requestId: string,
    actorUserId: string,
    cancellationReason: string | null = null,
  ): Promise<EmployeeLeaveRequest> {
    await getDb().transaction(async (tx) => {
      const existing = await this.lockRequest(tx, tenantId, companyId, requestId, employeeId);
      if (existing.status !== 'pending') {
        throw new ConflictError(`Cannot cancel leave request with status '${existing.status}'`);
      }
      await tx
        .update(employeeLeaveRequests)
        .set({
          status: 'cancelled',
          currentLevel: null,
          cancelledByUserId: actorUserId,
          cancellationReason,
          cancelledAt: new Date(),
        })
        .where(eq(employeeLeaveRequests.id, requestId));
      await this.closeOpenApprovals(tx, requestId);
      await moveUsage(tx, existing, 'release', actorUserId);
    });
    return (await this.findRequest(tenantId, companyId, requestId))!;
  }

  /**
   * Cancels an approved future request: immediately (reversing used days), or, when the workflow
   * requires it, moves it to cancellation_pending with one approval step.
   */
  async cancelApprovedRequest(
    tenantId: string,
    companyId: string,
    employeeId: string,
    requestId: string,
    actorUserId: string,
    cancellationStep: ApprovalStepInput | null,
    notifications: LeaveNotification[],
    cancellationReason: string | null = null,
  ): Promise<EmployeeLeaveRequest> {
    await getDb().transaction(async (tx) => {
      const existing = await this.lockRequest(tx, tenantId, companyId, requestId, employeeId);
      if (existing.status !== 'approved') {
        throw new ConflictError(`Cannot cancel leave request with status '${existing.status}'`);
      }
      if (cancellationStep) {
        await tx
          .update(employeeLeaveRequests)
          .set({
            status: 'cancellation_pending',
            currentLevel: cancellationStep.level,
            cancelledByUserId: actorUserId,
            cancellationReason,
          })
          .where(eq(employeeLeaveRequests.id, requestId));
        await tx.insert(leaveRequestApprovals).values({
          ...cancellationStep,
          id: generateSurrogateId('lvap'),
          tenantId,
          companyId,
          requestId,
        });
      } else {
        await tx
          .update(employeeLeaveRequests)
          .set({
            status: 'cancelled',
            currentLevel: null,
            cancelledByUserId: actorUserId,
            cancellationReason,
            cancelledAt: new Date(),
          })
          .where(eq(employeeLeaveRequests.id, requestId));
        await moveUsage(tx, existing, 'reversal', actorUserId);
      }
      await insertNotifications(tx, tenantId, companyId, notifications);
    });
    return (await this.findRequest(tenantId, companyId, requestId))!;
  }

  private async lockRequest(
    tx: Tx,
    tenantId: string,
    companyId: string,
    requestId: string,
    employeeId?: string,
  ): Promise<EmployeeLeaveRequest> {
    const conditions = [
      eq(employeeLeaveRequests.tenantId, tenantId),
      eq(employeeLeaveRequests.companyId, companyId),
      eq(employeeLeaveRequests.id, requestId),
    ];
    if (employeeId) conditions.push(eq(employeeLeaveRequests.employeeId, employeeId));
    const [existing] = await tx
      .select()
      .from(employeeLeaveRequests)
      .where(and(...conditions))
      .for('update');
    if (!existing) throw new NotFoundError('Leave request not found');
    return existing;
  }

  private async closeOpenApprovals(tx: Tx, requestId: string): Promise<void> {
    await tx
      .update(leaveRequestApprovals)
      .set({ action: 'cancelled' })
      .where(
        and(
          eq(leaveRequestApprovals.requestId, requestId),
          inArray(leaveRequestApprovals.action, ['pending', 'waiting']),
        ),
      );
  }

  /**
   * Records an approver decision on the current step. Approval advances to the next waiting step or
   * finalises the request (confirming usage, or reversing it for a cancellation); rejection ends the
   * flow (releasing pending days, or restoring an approved request whose cancellation was refused).
   */
  async decide(input: {
    tenantId: string;
    companyId: string;
    requestId: string;
    approvalId: string;
    decision: 'approved' | 'rejected';
    actorUserId: string;
    comment: string | null;
    now: Date;
    /** Due time for the next step's SLA, keyed by its level. */
    slaDueAtFor: (level: number) => Date | null;
    notifications: (outcome: DecisionOutcome) => LeaveNotification[];
  }): Promise<DecisionOutcome> {
    let outcome!: DecisionOutcome;
    await getDb().transaction(async (tx) => {
      const request = await this.lockRequest(tx, input.tenantId, input.companyId, input.requestId);
      const [step] = await tx
        .select()
        .from(leaveRequestApprovals)
        .where(
          and(
            eq(leaveRequestApprovals.id, input.approvalId),
            eq(leaveRequestApprovals.requestId, request.id),
          ),
        )
        .for('update');
      if (!step || step.action !== 'pending') {
        throw new ConflictError('This approval step is no longer awaiting a decision.');
      }
      const expected = step.purpose === 'cancellation' ? 'cancellation_pending' : 'pending';
      if (request.status !== expected) {
        throw new ConflictError(`The request is ${request.status} and cannot be decided.`);
      }

      await tx
        .update(leaveRequestApprovals)
        .set({
          action: input.decision,
          actedByUserId: input.actorUserId,
          actedAt: input.now,
          comment: input.comment,
        })
        .where(eq(leaveRequestApprovals.id, step.id));

      if (input.decision === 'rejected') {
        if (step.purpose === 'cancellation') {
          await tx
            .update(employeeLeaveRequests)
            .set({ status: 'approved', currentLevel: null })
            .where(eq(employeeLeaveRequests.id, request.id));
          outcome = { status: 'approved', purpose: 'cancellation', nextStep: null, request };
        } else {
          await tx
            .update(employeeLeaveRequests)
            .set({
              status: 'rejected',
              currentLevel: null,
              reviewedByUserId: input.actorUserId,
              rejectionReason: input.comment,
            })
            .where(eq(employeeLeaveRequests.id, request.id));
          await this.closeOpenApprovals(tx, request.id);
          await moveUsage(tx, request, 'release', input.actorUserId);
          outcome = { status: 'rejected', purpose: 'approval', nextStep: null, request };
        }
      } else {
        const [next] = await tx
          .select()
          .from(leaveRequestApprovals)
          .where(
            and(
              eq(leaveRequestApprovals.requestId, request.id),
              eq(leaveRequestApprovals.purpose, step.purpose),
              eq(leaveRequestApprovals.action, 'waiting'),
            ),
          )
          .orderBy(asc(leaveRequestApprovals.level))
          .limit(1);
        if (next) {
          await tx
            .update(leaveRequestApprovals)
            .set({ action: 'pending', slaDueAt: input.slaDueAtFor(next.level) })
            .where(eq(leaveRequestApprovals.id, next.id));
          await tx
            .update(employeeLeaveRequests)
            .set({ currentLevel: next.level })
            .where(eq(employeeLeaveRequests.id, request.id));
          outcome = { status: request.status, purpose: step.purpose, nextStep: next, request };
        } else if (step.purpose === 'cancellation') {
          await tx
            .update(employeeLeaveRequests)
            .set({ status: 'cancelled', currentLevel: null, cancelledAt: new Date() })
            .where(eq(employeeLeaveRequests.id, request.id));
          await moveUsage(tx, request, 'reversal', input.actorUserId);
          outcome = { status: 'cancelled', purpose: 'cancellation', nextStep: null, request };
        } else {
          await tx
            .update(employeeLeaveRequests)
            .set({ status: 'approved', currentLevel: null, reviewedByUserId: input.actorUserId })
            .where(eq(employeeLeaveRequests.id, request.id));
          await moveUsage(tx, request, 'confirm', input.actorUserId);
          outcome = { status: 'approved', purpose: 'approval', nextStep: null, request };
        }
      }
      await insertNotifications(tx, input.tenantId, input.companyId, input.notifications(outcome));
    });
    return outcome;
  }

  /** Marks a pending step escalated and activates the next waiting step, if any. */
  async escalate(
    approvalId: string,
    now: Date,
    slaDueAtFor: (level: number) => Date | null,
  ): Promise<{ escalatedTo: number | null }> {
    let escalatedTo: number | null = null;
    await getDb().transaction(async (tx) => {
      const [step] = await tx
        .select()
        .from(leaveRequestApprovals)
        .where(eq(leaveRequestApprovals.id, approvalId))
        .for('update');
      if (!step || step.action !== 'pending') return;
      const [next] = await tx
        .select()
        .from(leaveRequestApprovals)
        .where(
          and(
            eq(leaveRequestApprovals.requestId, step.requestId),
            eq(leaveRequestApprovals.purpose, step.purpose),
            eq(leaveRequestApprovals.action, 'waiting'),
          ),
        )
        .orderBy(asc(leaveRequestApprovals.level))
        .limit(1);
      if (!next) {
        // Nowhere to escalate: keep it pending, but record the breach once.
        await tx
          .update(leaveRequestApprovals)
          .set({ slaBreachedAt: now })
          .where(eq(leaveRequestApprovals.id, step.id));
        return;
      }
      await tx
        .update(leaveRequestApprovals)
        .set({ action: 'escalated', slaBreachedAt: now, actedAt: now, actedByUserId: 'system' })
        .where(eq(leaveRequestApprovals.id, step.id));
      await tx
        .update(leaveRequestApprovals)
        .set({ action: 'pending', slaDueAt: slaDueAtFor(next.level) })
        .where(eq(leaveRequestApprovals.id, next.id));
      await tx
        .update(employeeLeaveRequests)
        .set({ currentLevel: next.level })
        .where(eq(employeeLeaveRequests.id, step.requestId));
      escalatedTo = next.level;
    });
    return { escalatedTo };
  }

  async markSlaBreached(approvalId: string, now: Date): Promise<void> {
    await getDb()
      .update(leaveRequestApprovals)
      .set({ slaBreachedAt: now })
      .where(eq(leaveRequestApprovals.id, approvalId));
  }
}

export interface DecisionOutcome {
  status: EmployeeLeaveRequest['status'];
  purpose: 'approval' | 'cancellation';
  nextStep: typeof leaveRequestApprovals.$inferSelect | null;
  request: EmployeeLeaveRequest;
}

export const leaveRepository = new LeaveRepository();
