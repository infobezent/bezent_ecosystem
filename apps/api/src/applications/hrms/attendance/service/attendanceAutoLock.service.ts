import { BadRequestError } from '../../../../app/errors/AppError.js';
import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';
import {
  attendanceSettingsService,
  type AttendanceSettingsService,
} from './attendanceSettings.service.js';
import {
  computePeriodBounds,
  parsePeriodCode,
  periodCodeForDate,
} from './attendancePeriodCalendar.js';

/**
 * Auto-lock on cutoff (HR Settings -> Attendance -> Payroll & Locking).
 *
 * For companies that switched it on, the most recent payroll period that has
 * ended is locked, using the same readiness rules as a manual lock. A period
 * that cannot be locked yet (unresolved items under a hard block, summary not
 * reviewed) is left open and retried on the next sweep. A period an
 * administrator has re-opened is never locked again automatically.
 *
 * The sweep lives in the HRMS application and is started from the API
 * bootstrap, because platform code must not depend on applications.
 */

export const AUTO_LOCK_ACTOR = 'system:auto-lock';
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

export type AutoLockOutcome =
  'locked' | 'not_ready' | 'already_locked' | 'reopened_by_admin' | 'not_due';

export interface AutoLockResult {
  tenantId: string;
  companyId: string;
  periodCode: string;
  outcome: AutoLockOutcome;
}

function previousPeriodCode(periodCode: string): string {
  const parsed = parsePeriodCode(periodCode)!;
  return parsed.month === 1
    ? `${parsed.year - 1}-12`
    : `${parsed.year}-${String(parsed.month - 1).padStart(2, '0')}`;
}

export class AttendanceAutoLockService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
    private readonly settingsService: AttendanceSettingsService = attendanceSettingsService,
  ) {}

  async runSweep(options: { now?: Date; companyId?: string } = {}): Promise<AutoLockResult[]> {
    const today = (options.now ?? new Date()).toISOString().slice(0, 10);
    const companies = await this.settingsRepo.listAutoLockCompanies();
    const results: AutoLockResult[] = [];

    for (const company of companies) {
      if (options.companyId && company.companyId !== options.companyId) continue;
      const current = periodCodeForDate(today, company.cycleType, company.cutoffDay);
      const code = previousPeriodCode(current);
      const bounds = computePeriodBounds(code, company.cycleType, company.cutoffDay);
      const base = { tenantId: company.tenantId, companyId: company.companyId, periodCode: code };
      if (!bounds || bounds.endDate >= today) {
        results.push({ ...base, outcome: 'not_due' });
        continue;
      }

      const existing = await this.settingsRepo.getPeriodByCode(
        company.tenantId,
        company.companyId,
        code,
      );
      if (existing && existing.status !== 'open') {
        results.push({ ...base, outcome: 'already_locked' });
        continue;
      }
      if (existing?.unlockedAt) {
        results.push({ ...base, outcome: 'reopened_by_admin' });
        continue;
      }

      try {
        await this.settingsService.lockPeriod(
          company.tenantId,
          company.companyId,
          code,
          AUTO_LOCK_ACTOR,
        );
        results.push({ ...base, outcome: 'locked' });
      } catch (err) {
        if (!(err instanceof BadRequestError)) throw err;
        results.push({ ...base, outcome: 'not_ready' });
      }
    }
    return results;
  }

  start(intervalMs: number = SWEEP_INTERVAL_MS): void {
    if (this.timer) return;
    const tick = () =>
      void this.runSweep().catch((err: unknown) => {
        console.error('[attendance] auto-lock sweep failed:', err);
      });
    this.timer = setInterval(tick, intervalMs);
    this.timer.unref();
    tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const attendanceAutoLockService = new AttendanceAutoLockService();
