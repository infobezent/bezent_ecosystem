import { eq, and, desc, sql, lte } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  companies,
  leaveGeneralSettings,
  leaveGeneralSettingsVersions,
  employeeLeaveBalances,
  employeeLeaveRequests,
  type LeaveGeneralSettings,
  type LeaveGeneralSettingsVersion,
  type LeaveGeneralSettingsSnapshot,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { ConflictError } from '../../../../app/errors/AppError.js';
import { isDuplicateKeyError } from '../rules/leaveValidation.js';
import type { UpdateLeaveGeneralSettingsInput } from '../types/settings.types.js';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type DbExecutor = Db | Tx;

export const INITIAL_VERSION_REASON =
  'Initial company leave general settings provisioning (Version 1).';

export function defaultSettingsSnapshot(goLiveDate: string): LeaveGeneralSettingsSnapshot {
  return {
    leaveYearCycle: 'calendar_year',
    customYearStartDate: null,
    goLiveDate,
    dayCountingMethod: 'working_days',
    balancePrecision: 'two_decimals',
    balanceRoundingRule: 'nearest',
    maxBackdatedDays: 7,
    maxAdvanceBookingDays: 180,
  };
}

export class LeaveGeneralSettingsRepository {
  async getSettings(
    tenantId: string,
    companyId: string,
    db: DbExecutor = getDb(),
  ): Promise<LeaveGeneralSettings | null> {
    const [row] = await db
      .select()
      .from(leaveGeneralSettings)
      .where(
        and(
          eq(leaveGeneralSettings.tenantId, tenantId),
          eq(leaveGeneralSettings.companyId, companyId),
        ),
      );
    return row ?? null;
  }

  async getCompanyTimezone(tenantId: string, companyId: string): Promise<string | null> {
    const db = getDb();
    const [row] = await db
      .select({ timeZone: companies.timeZone })
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.id, companyId)));
    return row?.timeZone ?? null;
  }

  /**
   * Idempotently provisions the settings row and Version 1 with defaults.
   * Safe under concurrency: a racing insert of the same company surfaces as a duplicate key,
   * after which the winner's row is returned.
   */
  async ensureDefaultSettings(
    tenantId: string,
    companyId: string,
    userId: string = 'system',
    goLiveDate: string = new Date().toISOString().slice(0, 10),
  ): Promise<LeaveGeneralSettings> {
    const existing = await this.getSettings(tenantId, companyId);
    if (existing) return existing;

    try {
      await getDb().transaction(async (tx) => {
        await this.insertDefaults(tx, tenantId, companyId, userId, goLiveDate);
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }

    const created = await this.getSettings(tenantId, companyId);
    return created!;
  }

  private async insertDefaults(
    tx: Tx,
    tenantId: string,
    companyId: string,
    userId: string,
    goLiveDate: string,
  ): Promise<void> {
    const snapshot = defaultSettingsSnapshot(goLiveDate);
    await tx.insert(leaveGeneralSettings).values({
      id: generateSurrogateId('lvgs'),
      tenantId,
      companyId,
      ...snapshot,
      currentVersionNumber: 1,
      status: 'pre_activation',
    });
    await tx.insert(leaveGeneralSettingsVersions).values({
      id: generateSurrogateId('lvgv'),
      tenantId,
      companyId,
      versionNumber: 1,
      effectiveFrom: new Date(),
      changeReason: INITIAL_VERSION_REASON,
      settingsPayload: snapshot,
      createdByUserId: userId,
    });
  }

  async getLatestPublishedVersion(
    tenantId: string,
    companyId: string,
    db: DbExecutor = getDb(),
  ): Promise<LeaveGeneralSettingsVersion | null> {
    const [row] = await db
      .select()
      .from(leaveGeneralSettingsVersions)
      .where(
        and(
          eq(leaveGeneralSettingsVersions.tenantId, tenantId),
          eq(leaveGeneralSettingsVersions.companyId, companyId),
        ),
      )
      .orderBy(desc(leaveGeneralSettingsVersions.versionNumber))
      .limit(1);
    return row ?? null;
  }

  async getActiveVersionAtTimestamp(
    tenantId: string,
    companyId: string,
    timestampUtc: Date,
  ): Promise<LeaveGeneralSettingsVersion | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(leaveGeneralSettingsVersions)
      .where(
        and(
          eq(leaveGeneralSettingsVersions.tenantId, tenantId),
          eq(leaveGeneralSettingsVersions.companyId, companyId),
          lte(leaveGeneralSettingsVersions.effectiveFrom, timestampUtc),
        ),
      )
      .orderBy(desc(leaveGeneralSettingsVersions.versionNumber))
      .limit(1);
    return row ?? null;
  }

  async getVersionHistory(
    tenantId: string,
    companyId: string,
  ): Promise<LeaveGeneralSettingsVersion[]> {
    const db = getDb();
    return db
      .select()
      .from(leaveGeneralSettingsVersions)
      .where(
        and(
          eq(leaveGeneralSettingsVersions.tenantId, tenantId),
          eq(leaveGeneralSettingsVersions.companyId, companyId),
        ),
      )
      .orderBy(desc(leaveGeneralSettingsVersions.versionNumber));
  }

  async hasLiveLeaveRecords(tenantId: string, companyId: string): Promise<boolean> {
    const db = getDb();
    const [requestCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
        ),
      );

    if (Number(requestCount?.count ?? 0) > 0) return true;

    const [balanceCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
        ),
      );

    return Number(balanceCount?.count ?? 0) > 0;
  }

  /**
   * Publishes a new immutable version in one transaction.
   *
   * The settings row is locked (`SELECT ... FOR UPDATE`) so concurrent publishers serialise;
   * `expectedCurrentVersionNumber` must equal the latest published version number.
   * `currentVersionNumber` on the row always tracks the latest published version, while the
   * setting columns are only refreshed when the version is effective immediately. Effective
   * settings are always resolved from the versions table by `effectiveFrom`.
   *
   * `markActivated` lets the caller persist the derived activation status in the same transaction.
   */
  async publishNewVersion(
    tenantId: string,
    companyId: string,
    input: UpdateLeaveGeneralSettingsInput,
    userId: string,
    options: { markActivated?: boolean; defaultGoLiveDate?: string } = {},
  ): Promise<{ settings: LeaveGeneralSettings; version: LeaveGeneralSettingsVersion }> {
    const db = getDb();
    const defaultGoLive = options.defaultGoLiveDate ?? new Date().toISOString().slice(0, 10);

    // Provision outside the publish transaction so a racing provision cannot poison it.
    await this.ensureDefaultSettings(tenantId, companyId, userId, defaultGoLive);

    try {
      const versionId = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(leaveGeneralSettings)
          .where(
            and(
              eq(leaveGeneralSettings.tenantId, tenantId),
              eq(leaveGeneralSettings.companyId, companyId),
            ),
          )
          .for('update');

        const latestVersion = await this.getLatestPublishedVersion(tenantId, companyId, tx);
        const latestNumber = latestVersion?.versionNumber ?? current!.currentVersionNumber;

        if (latestNumber !== input.expectedCurrentVersionNumber) {
          throw new ConflictError(
            `Settings concurrency conflict: Current version is ${latestNumber}, expected ${input.expectedCurrentVersionNumber}. Please refresh.`,
            'VERSION_CONFLICT',
          );
        }

        const now = new Date();
        const effectiveFromDate = input.effectiveFrom ? new Date(input.effectiveFrom) : now;

        if (latestVersion) {
          const latestTs = new Date(latestVersion.effectiveFrom).getTime();
          if (effectiveFromDate.getTime() === latestTs) {
            throw new ConflictError(
              `A settings version with effective timestamp ${new Date(latestTs).toISOString()} already exists.`,
              'DUPLICATE_EFFECTIVE_TIMESTAMP',
            );
          }
          if (effectiveFromDate.getTime() < latestTs) {
            throw new ConflictError(
              `Effective timestamp must be strictly later than the latest scheduled version (${new Date(latestTs).toISOString()}).`,
              'OUT_OF_ORDER_EFFECTIVE_DATE',
            );
          }
        }

        const snapshot: LeaveGeneralSettingsSnapshot = {
          leaveYearCycle: input.leaveYearCycle,
          customYearStartDate:
            input.leaveYearCycle === 'custom' ? (input.customYearStartDate ?? null) : null,
          goLiveDate: input.goLiveDate,
          dayCountingMethod: input.dayCountingMethod,
          balancePrecision: input.balancePrecision,
          balanceRoundingRule: input.balanceRoundingRule,
          maxBackdatedDays: input.maxBackdatedDays,
          maxAdvanceBookingDays: input.maxAdvanceBookingDays,
        };

        const newVersionNumber = latestNumber + 1;
        const id = generateSurrogateId('lvgv');
        await tx.insert(leaveGeneralSettingsVersions).values({
          id,
          tenantId,
          companyId,
          versionNumber: newVersionNumber,
          effectiveFrom: effectiveFromDate,
          changeReason: input.changeReason,
          settingsPayload: snapshot,
          createdByUserId: userId,
        });

        const isEffectiveNow = effectiveFromDate.getTime() <= now.getTime();
        await tx
          .update(leaveGeneralSettings)
          .set({
            ...(isEffectiveNow ? snapshot : {}),
            ...(options.markActivated ? { status: 'activated' as const } : {}),
            currentVersionNumber: newVersionNumber,
            updatedAt: now,
          })
          .where(
            and(
              eq(leaveGeneralSettings.tenantId, tenantId),
              eq(leaveGeneralSettings.companyId, companyId),
            ),
          );

        return id;
      });

      const settings = await this.getSettings(tenantId, companyId);
      const [version] = await db
        .select()
        .from(leaveGeneralSettingsVersions)
        .where(eq(leaveGeneralSettingsVersions.id, versionId));
      return { settings: settings!, version: version! };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictError(
          'Settings were updated concurrently. Please refresh and try again.',
          'VERSION_CONFLICT',
        );
      }
      throw err;
    }
  }
}

export const leaveGeneralSettingsRepository = new LeaveGeneralSettingsRepository();
