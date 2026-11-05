import {
  leavePoliciesRepository,
  type LeavePoliciesRepository,
} from '../repository/leavePolicies.repository.js';

/**
 * Leave Policy Lifecycle Sweep
 *
 * Periodically promotes scheduled policies to active once their effective-from date is reached,
 * and archives policies whose effective-until date has passed, in each company's local date.
 * Policy resolution reads effective dates directly, so a lagging sweep never changes which policy
 * applies — it only keeps the displayed status accurate.
 */

export const LEAVE_POLICY_LIFECYCLE_INTERVAL_MS = 60 * 60 * 1000; // Sweep every 1 hour

export class LeavePolicyLifecycleService {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly repo: LeavePoliciesRepository = leavePoliciesRepository) {}

  async runSweep(
    options: { tenantId?: string; companyId?: string; now?: Date } = {},
  ): Promise<{ activated: number; archived: number }> {
    return this.repo.runLifecycleSweep(options);
  }

  start(intervalMs: number = LEAVE_POLICY_LIFECYCLE_INTERVAL_MS): void {
    if (this.timer) return;
    const tick = () =>
      void this.runSweep().catch((err: unknown) => {
        console.error('[leave] policy lifecycle sweep failed:', err);
      });
    this.timer = setInterval(tick, intervalMs);
    this.timer.unref();
    tick(); // Run immediately on startup
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const leavePolicyLifecycleService = new LeavePolicyLifecycleService();
