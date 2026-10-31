import { leaveApprovalsService, type LeaveApprovalsService } from './leaveApprovals.service.js';
import { leaveAccrualService, type LeaveAccrualService } from './leaveAccrual.service.js';

/**
 * Leave background jobs
 *
 * - Approval SLA sweep (hourly): applies each overdue step's escalate / notify / auto-approve action.
 * - Balance sweep (every 6 hours): reconciles accrued entitlement for in-scope employees, lapses
 *   expired carry-forward, and closes the previous leave year once it has ended.
 * All sweeps are idempotent, so overlapping or repeated runs are harmless.
 */

export const LEAVE_SLA_INTERVAL_MS = 60 * 60 * 1000;
export const LEAVE_BALANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export class LeaveJobsService {
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly approvals: Pick<LeaveApprovalsService, 'runSlaSweep'> = leaveApprovalsService,
    private readonly accrual: Pick<
      LeaveAccrualService,
      'runAccrualSweep' | 'runYearEndSweep'
    > = leaveAccrualService,
  ) {}

  async runBalanceSweep(now: Date = new Date()) {
    const accrued = await this.accrual.runAccrualSweep(now);
    const yearEnd = await this.accrual.runYearEndSweep(now);
    return { ...accrued, ...yearEnd };
  }

  start(): void {
    if (this.timers.length > 0) return;
    const schedule = (name: string, intervalMs: number, job: () => Promise<unknown>) => {
      const tick = () =>
        void job().catch((err: unknown) => {
          console.error(`[leave] ${name} failed:`, err);
        });
      const timer = setInterval(tick, intervalMs);
      timer.unref();
      this.timers.push(timer);
      tick(); // Run immediately on startup
    };
    schedule('approval SLA sweep', LEAVE_SLA_INTERVAL_MS, () => this.approvals.runSlaSweep());
    schedule('balance sweep', LEAVE_BALANCE_INTERVAL_MS, () => this.runBalanceSweep());
  }

  stop(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
  }
}

export const leaveJobsService = new LeaveJobsService();
