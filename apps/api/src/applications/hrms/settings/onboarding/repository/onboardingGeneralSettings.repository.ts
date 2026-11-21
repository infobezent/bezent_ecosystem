import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import {
  formCustomizations,
  onboardingGeneralSettings,
} from '../../../../../db/schema.js';
import type {
  OnboardingGeneralSettingsConfig,
  UpdateOnboardingGeneralSettingsConfigDto,
} from '../types/onboardingGeneralSettings.types.js';
import { getDefaultGeneralSettingsConfig } from '../service/onboardingGeneralSettings.defaults.js';

const GENERAL_CONFIG_FORM_KEY = 'onboarding_general_settings_v2';

export class OnboardingGeneralSettingsRepository {
  private get db() {
    return getDb();
  }

  /**
   * Retrieves the current general settings configuration for tenant and company
   */
  async getConfig(
    tenantId: string,
    companyId: string,
  ): Promise<OnboardingGeneralSettingsConfig> {
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, GENERAL_CONFIG_FORM_KEY),
        ),
      );

    const defaults = getDefaultGeneralSettingsConfig(tenantId, companyId);

    if (rows.length > 0 && rows[0]?.metadata) {
      try {
        const stored = rows[0].metadata as unknown as Partial<OnboardingGeneralSettingsConfig>;
        return {
          ...defaults,
          ...stored,
          preferences: {
            ...defaults.preferences,
            ...(stored.preferences || {}),
          },
          access: {
            ...defaults.access,
            ...(stored.access || {}),
          },
          workflow: {
            ...defaults.workflow,
            ...(stored.workflow || {}),
          },
          dateTime: {
            ...defaults.dateTime,
            ...(stored.dateTime || {}),
          },
          tenantId,
          companyId,
        };
      } catch {
        // Fall back to default if parsing fails
      }
    }

    return defaults;
  }

  /**
   * Saves or updates the general settings configuration
   */
  async saveConfig(
    tenantId: string,
    companyId: string,
    dto: UpdateOnboardingGeneralSettingsConfigDto,
    actorUserId?: string,
  ): Promise<OnboardingGeneralSettingsConfig> {
    const current = await this.getConfig(tenantId, companyId);
    const now = new Date().toISOString();

    const updated: OnboardingGeneralSettingsConfig = {
      ...current,
      tenantId,
      companyId,
      preferences: {
        ...current.preferences,
        ...(dto.preferences || {}),
      },
      access: {
        ...current.access,
        ...(dto.access || {}),
      },
      workflow: {
        ...current.workflow,
        ...(dto.workflow || {}),
      },
      dateTime: {
        ...current.dateTime,
        ...(dto.dateTime || {}),
      },
      updatedAt: now,
      updatedBy: actorUserId || current.updatedBy,
    };

    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, GENERAL_CONFIG_FORM_KEY),
        ),
      );

    if (rows.length > 0) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: updated as unknown as Record<string, unknown>,
          version: (rows[0]?.version ?? 1) + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(formCustomizations.tenantId, tenantId),
            eq(formCustomizations.companyId, companyId),
            eq(formCustomizations.formKey, GENERAL_CONFIG_FORM_KEY),
          ),
        );
    } else {
      await this.db.insert(formCustomizations).values({
        id: `fc_${randomUUID()}`,
        tenantId,
        companyId,
        formKey: GENERAL_CONFIG_FORM_KEY,
        version: 1,
        metadata: updated as unknown as Record<string, unknown>,
      });
    }

    // Dual-write sync to legacy onboardingGeneralSettings table
    try {
      const genRows = await this.db
        .select()
        .from(onboardingGeneralSettings)
        .where(
          and(
            eq(onboardingGeneralSettings.tenantId, tenantId),
            eq(onboardingGeneralSettings.companyId, companyId),
          ),
        );

      if (genRows.length > 0) {
        await this.db
          .update(onboardingGeneralSettings)
          .set({
            onboardingEnabled: updated.preferences.onboardingEnabled,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(onboardingGeneralSettings.tenantId, tenantId),
              eq(onboardingGeneralSettings.companyId, companyId),
            ),
          );
      } else {
        await this.db.insert(onboardingGeneralSettings).values({
          id: `onb_gen_${randomUUID()}`,
          tenantId,
          companyId,
          onboardingEnabled: updated.preferences.onboardingEnabled,
          defaultDurationDays: 30,
          idPrefix: 'NH-',
        });
      }
    } catch {
      // Non-blocking sync failure safeguard
    }

    return updated;
  }

  /**
   * Resets the configuration back to system defaults
   */
  async resetConfig(
    tenantId: string,
    companyId: string,
    actorUserId?: string,
  ): Promise<OnboardingGeneralSettingsConfig> {
    const defaults = getDefaultGeneralSettingsConfig(tenantId, companyId);
    defaults.updatedBy = actorUserId || 'system';

    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, GENERAL_CONFIG_FORM_KEY),
        ),
      );

    if (rows.length > 0) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: defaults as unknown as Record<string, unknown>,
          version: (rows[0]?.version ?? 1) + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(formCustomizations.tenantId, tenantId),
            eq(formCustomizations.companyId, companyId),
            eq(formCustomizations.formKey, GENERAL_CONFIG_FORM_KEY),
          ),
        );
    } else {
      await this.db.insert(formCustomizations).values({
        id: `fc_${randomUUID()}`,
        tenantId,
        companyId,
        formKey: GENERAL_CONFIG_FORM_KEY,
        version: 1,
        metadata: defaults as unknown as Record<string, unknown>,
      });
    }

    try {
      await this.db
        .update(onboardingGeneralSettings)
        .set({
          onboardingEnabled: defaults.preferences.onboardingEnabled,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(onboardingGeneralSettings.tenantId, tenantId),
            eq(onboardingGeneralSettings.companyId, companyId),
          ),
        );
    } catch {
      // Non-blocking sync failure safeguard
    }

    return defaults;
  }
}
