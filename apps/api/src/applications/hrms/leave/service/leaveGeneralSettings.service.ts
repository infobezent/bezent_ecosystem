import {
  LeaveGeneralSettingsRepository,
  leaveGeneralSettingsRepository,
  defaultSettingsSnapshot,
} from '../repository/leaveGeneralSettings.repository.js';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import { auditService, AuditService } from '../../../../platform/audit/service/audit.service.js';
import {
  assertEnum,
  isHalfDayMultiple,
  isValidIsoDate,
  localDateInTimezone,
} from '../rules/leaveValidation.js';
import type { LeaveGeneralSettings, LeaveGeneralSettingsVersion } from '../../../../db/schema.js';
import type {
  UpdateLeaveGeneralSettingsInput,
  LeaveGeneralSettingsData,
  LeaveGeneralSettingsSnapshot,
  LeaveGeneralSettingsVersionData,
  LeaveSettingsStatus,
  BalanceRoundingRule,
  BalancePrecision,
} from '../types/settings.types.js';

const LEAVE_YEAR_CYCLES = ['calendar_year', 'financial_year', 'custom'] as const;
const DAY_COUNTING_METHODS = ['working_days', 'calendar_days'] as const;
const BALANCE_PRECISIONS = ['whole_numbers', 'half', 'two_decimals'] as const;
const ROUNDING_RULES = ['nearest', 'round_up', 'round_down'] as const;
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export class LeaveGeneralSettingsService {
  constructor(
    private readonly repo: LeaveGeneralSettingsRepository = leaveGeneralSettingsRepository,
    private readonly audit: Pick<AuditService, 'logEvent'> = auditService,
  ) {}

  /**
   * Returns the settings in force right now. Read-only: an unprovisioned company gets the
   * defaults without anything being persisted, and activation is derived, not written.
   * `settings.currentVersionNumber` is the latest published version (used for optimistic
   * concurrency); the setting values come from the version effective now.
   */
  async getSettings(
    tenantId: string,
    companyId: string,
  ): Promise<{
    settings: LeaveGeneralSettingsData;
    activeVersion: LeaveGeneralSettingsVersionData | null;
    latestPublishedVersion: LeaveGeneralSettingsVersionData | null;
    hasScheduledFutureVersion: boolean;
  }> {
    const now = new Date();
    const [row, activeVersion, latestPublished, today] = await Promise.all([
      this.repo.getSettings(tenantId, companyId),
      this.repo.getActiveVersionAtTimestamp(tenantId, companyId, now),
      this.repo.getLatestPublishedVersion(tenantId, companyId),
      this.companyToday(tenantId, companyId),
    ]);

    const effective: LeaveGeneralSettingsSnapshot =
      activeVersion?.settingsPayload ?? (row ? snapshotOf(row) : defaultSettingsSnapshot(today));
    const status = await this.resolveStatus(tenantId, companyId, row, effective.goLiveDate, today);

    const settings: LeaveGeneralSettingsData = {
      id: row?.id ?? null,
      tenantId,
      companyId,
      ...effective,
      currentVersionNumber: latestPublished?.versionNumber ?? row?.currentVersionNumber ?? 1,
      status,
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };

    return {
      settings,
      activeVersion: activeVersion as LeaveGeneralSettingsVersionData | null,
      latestPublishedVersion: latestPublished as LeaveGeneralSettingsVersionData | null,
      hasScheduledFutureVersion: Boolean(
        latestPublished && new Date(latestPublished.effectiveFrom) > now,
      ),
    };
  }

  /**
   * Validates and publishes a new immutable version of general settings.
   */
  async updateSettings(
    tenantId: string,
    companyId: string,
    rawInput: UpdateLeaveGeneralSettingsInput,
    userId: string,
  ): Promise<{
    settings: LeaveGeneralSettingsData;
    version: LeaveGeneralSettingsVersionData;
  }> {
    const input = this.validateInput(rawInput);

    const [row, latest, today] = await Promise.all([
      this.repo.getSettings(tenantId, companyId),
      this.repo.getLatestPublishedVersion(tenantId, companyId),
      this.companyToday(tenantId, companyId),
    ]);

    // Immutability is checked against the latest published version, not the cached row.
    const baseline: LeaveGeneralSettingsSnapshot =
      latest?.settingsPayload ?? (row ? snapshotOf(row) : defaultSettingsSnapshot(today));
    const status = await this.resolveStatus(tenantId, companyId, row, baseline.goLiveDate, today);

    if (status === 'activated') {
      if (
        input.leaveYearCycle !== baseline.leaveYearCycle ||
        (input.leaveYearCycle === 'custom' &&
          (input.customYearStartDate ?? null) !== (baseline.customYearStartDate ?? null))
      ) {
        throw new BadRequestError(
          'Leave year cycle cannot be altered after company activation in V1. Transition workflows require a separate approved procedure.',
        );
      }
      if (input.goLiveDate !== baseline.goLiveDate) {
        throw new BadRequestError(
          'Go-live date is strictly immutable once company activation is complete.',
        );
      }
    }

    const result = await this.repo.publishNewVersion(tenantId, companyId, input, userId, {
      markActivated: status === 'activated' && row?.status !== 'activated',
      defaultGoLiveDate: today,
    });

    await this.audit.logEvent({
      actorUserId: userId,
      action: 'leave_general_settings_published',
      targetType: 'leave_general_settings_version',
      targetId: result.version.id,
      tenantId,
      companyId,
      metadata: {
        versionNumber: result.version.versionNumber,
        effectiveFrom: new Date(result.version.effectiveFrom).toISOString(),
        changeReason: input.changeReason,
        before: baseline,
        after: result.version.settingsPayload,
      },
    });

    return {
      settings: { ...result.settings, status } as LeaveGeneralSettingsData,
      version: result.version as LeaveGeneralSettingsVersionData,
    };
  }

  /**
   * Retrieves the version history audit trail for a company.
   */
  async getVersionHistory(
    tenantId: string,
    companyId: string,
  ): Promise<LeaveGeneralSettingsVersionData[]> {
    const list: LeaveGeneralSettingsVersion[] = await this.repo.getVersionHistory(
      tenantId,
      companyId,
    );
    return list as LeaveGeneralSettingsVersionData[];
  }

  /**
   * Deterministic accrual rounding with 0.5-day increment and half-up tie-breaking.
   * Prohibits floating-point inaccuracies.
   */
  roundAccrual(rawAmount: number, rule: BalanceRoundingRule, increment = 0.5): number {
    const factor = 1 / increment;
    const scaled = Math.round(rawAmount * 10000) / 10000; // 4-decimal fixed point

    if (rule === 'nearest') {
      const remainder = scaled % increment;
      const roundedRemainder = Math.round(remainder * 10000) / 10000;
      const halfway = increment / 2;

      // Exact half-up tie breaking
      if (Math.abs(roundedRemainder - halfway) < 0.0001) {
        return (Math.floor(scaled * factor) + 1) / factor;
      }
      return Math.round(scaled * factor) / factor;
    }

    if (rule === 'round_up') {
      return Math.ceil(scaled * factor) / factor;
    }

    // round_down
    return Math.floor(scaled * factor) / factor;
  }

  /**
   * Lossless balance formatting for user interfaces.
   * Formatting never truncates or rounds a balance that has more precision than the format.
   */
  formatBalanceDisplay(rawBalance: number, precision: BalancePrecision): string {
    const isInteger = Number.isInteger(rawBalance);

    switch (precision) {
      case 'whole_numbers':
        return isInteger ? rawBalance.toFixed(0) : rawBalance.toString();
      case 'half':
        if (isInteger) return rawBalance.toFixed(0);
        return isHalfDayMultiple(rawBalance) ? rawBalance.toFixed(1) : rawBalance.toString();
      case 'two_decimals':
      default:
        return rawBalance.toFixed(2);
    }
  }

  private async companyToday(tenantId: string, companyId: string): Promise<string> {
    const tz = await this.repo.getCompanyTimezone(tenantId, companyId);
    return localDateInTimezone(tz);
  }

  /** Activated once persisted, once company-local today reaches go-live, or once live records exist. */
  private async resolveStatus(
    tenantId: string,
    companyId: string,
    row: LeaveGeneralSettings | null,
    goLiveDate: string,
    today: string,
  ): Promise<LeaveSettingsStatus> {
    if (row?.status === 'activated') return 'activated';
    if (today >= goLiveDate) return 'activated';
    return (await this.repo.hasLiveLeaveRecords(tenantId, companyId))
      ? 'activated'
      : 'pre_activation';
  }

  private validateInput(input: UpdateLeaveGeneralSettingsInput): UpdateLeaveGeneralSettingsInput {
    if (!input || typeof input !== 'object') {
      throw new BadRequestError('Request body is required.');
    }

    const changeReason = typeof input.changeReason === 'string' ? input.changeReason.trim() : '';
    if (changeReason.length < 10) {
      throw new BadRequestError('Change reason must be at least 10 characters.');
    }
    if (changeReason.length > 500) {
      throw new BadRequestError('Change reason must be at most 500 characters.');
    }

    const leaveYearCycle = assertEnum(input.leaveYearCycle, LEAVE_YEAR_CYCLES, 'Leave year cycle');
    const dayCountingMethod = assertEnum(
      input.dayCountingMethod,
      DAY_COUNTING_METHODS,
      'Day counting method',
    );
    const balancePrecision = assertEnum(
      input.balancePrecision,
      BALANCE_PRECISIONS,
      'Balance precision',
    );
    const balanceRoundingRule = assertEnum(
      input.balanceRoundingRule,
      ROUNDING_RULES,
      'Balance rounding rule',
    );

    let customYearStartDate: string | null = null;
    if (leaveYearCycle === 'custom') {
      customYearStartDate = validateMonthDay(input.customYearStartDate);
    }

    const maxBackdatedDays = input.maxBackdatedDays;
    if (!Number.isInteger(maxBackdatedDays) || maxBackdatedDays < 0 || maxBackdatedDays > 90) {
      throw new BadRequestError('Max backdated days must be an integer between 0 and 90.');
    }
    const maxAdvanceBookingDays = input.maxAdvanceBookingDays;
    if (
      !Number.isInteger(maxAdvanceBookingDays) ||
      maxAdvanceBookingDays < 1 ||
      maxAdvanceBookingDays > 365
    ) {
      throw new BadRequestError('Max advance booking days must be an integer between 1 and 365.');
    }

    if (!isValidIsoDate(input.goLiveDate)) {
      throw new BadRequestError('Go-live date must be a valid date in YYYY-MM-DD format.');
    }

    if (input.effectiveFrom !== undefined && input.effectiveFrom !== null) {
      const ts = new Date(input.effectiveFrom);
      if (Number.isNaN(ts.getTime())) {
        throw new BadRequestError('Effective from must be a valid timestamp.');
      }
    }

    if (!Number.isInteger(input.expectedCurrentVersionNumber)) {
      throw new BadRequestError('Expected current version number is required.');
    }

    return {
      ...input,
      changeReason,
      leaveYearCycle,
      customYearStartDate,
      dayCountingMethod,
      balancePrecision,
      balanceRoundingRule,
    };
  }
}

function validateMonthDay(value: unknown): string {
  if (!value) {
    throw new BadRequestError('Custom year start date is required when cycle is custom.');
  }
  const match =
    typeof value === 'string' ? value.match(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/) : null;
  if (!match) {
    throw new BadRequestError('Custom year start date must be in MM-DD format.');
  }
  const month = parseInt(match[1]!, 10);
  const day = parseInt(match[2]!, 10);
  if (day > DAYS_IN_MONTH[month - 1]!) {
    throw new BadRequestError(`Invalid calendar date: ${String(value)} does not exist.`);
  }
  if (month === 2 && day === 29) {
    throw new BadRequestError(
      'Leap day (Feb 29) cannot be used as an annual cycle start. Please select March 1.',
    );
  }
  return value as string;
}

function snapshotOf(row: LeaveGeneralSettings): LeaveGeneralSettingsSnapshot {
  return {
    leaveYearCycle: row.leaveYearCycle,
    customYearStartDate: row.customYearStartDate,
    goLiveDate: row.goLiveDate,
    dayCountingMethod: row.dayCountingMethod,
    balancePrecision: row.balancePrecision,
    balanceRoundingRule: row.balanceRoundingRule,
    maxBackdatedDays: row.maxBackdatedDays,
    maxAdvanceBookingDays: row.maxAdvanceBookingDays,
  };
}

export const leaveGeneralSettingsService = new LeaveGeneralSettingsService();
