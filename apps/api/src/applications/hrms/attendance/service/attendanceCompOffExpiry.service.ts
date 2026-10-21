import {
  attendanceCompOffService,
  type AttendanceCompOffService,
} from './attendanceCompOff.service.js';

/**
 * Comp-Off Expiry Auto-Lapse Service (Phase 3)
 *
 * Runs a periodic background sweep across all tenants/companies to automatically
 * expire active/pending comp-off entitlements that have exceeded their validity date.
 * Each lapsed entitlement transitions to 'expired' and logs an audit trail.
 */

export const COMP_OFF_EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // Sweep every 1 hour

export class AttendanceCompOffExpiryService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly compOffService: AttendanceCompOffService = attendanceCompOffService,
  ) {}

  async runSweep(
    options: {
      tenantId?: string;
      companyId?: string;
    } = {},
  ): Promise<{ lapsedCount: number }> {
    return this.compOffService.lapseExpiredCompOffEntitlements(options.tenantId, options.companyId);
  }

  start(intervalMs: number = COMP_OFF_EXPIRY_INTERVAL_MS): void {
    if (this.timer) return;
    const tick = () =>
      void this.runSweep().catch((err: unknown) => {
        console.error('[attendance] comp-off expiry auto-lapse sweep failed:', err);
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

export const attendanceCompOffExpiryService = new AttendanceCompOffExpiryService();
