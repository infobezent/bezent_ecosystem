import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  tenantAdmins,
  tenantModules,
  tenantLifecycleEvents,
  companies,
} from '../../../db/schema.js';

export interface BackfillClassificationReport {
  isDryRun: boolean;
  totalTenantsProcessed: number;
  safeAutomatic: Array<{
    tenantId: string;
    tenantName: string;
    action: string;
    targetAdminUserId?: string;
  }>;
  requiresBusinessConfirmation: Array<{
    tenantId: string;
    tenantName: string;
    reason: string;
    candidateAdminUserIds: string[];
  }>;
  requiresManualReconciliation: Array<{
    tenantId: string;
    tenantName: string;
    reason: string;
  }>;
  alreadyConfigured: Array<{
    tenantId: string;
    tenantName: string;
    primaryAdminUserId?: string;
  }>;
  preservedDataSummary: {
    totalTenants: number;
    totalCompanies: number;
    totalTenantModuleEntitlements: number;
  };
}

export interface RunBackfillOptions {
  dryRun?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export class TenantManagementBackfillService {
  /**
   * Evaluates all non-archived tenants and applies safe, idempotent Phase 01 backfill:
   * 1. Safe Primary Admin designation only when unambiguous (strictly 1 active admin exists).
   * 2. Flags ambiguous or missing admin scenarios for business confirmation.
   * 3. Initializes tenant lifecycle baseline event if none exists.
   * 4. Strictly preserves all companies, memberships, and tenant_modules.
   * 5. Does not fabricate paid subscriptions or commercial pricing.
   */
  async runBackfill(options: RunBackfillOptions = {}): Promise<BackfillClassificationReport> {
    const dryRun = options.dryRun ?? false;
    const db = getDb();

    const allTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        status: tenants.status,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(sql`${tenants.status} != 'archived'`);

    const report: BackfillClassificationReport = {
      isDryRun: dryRun,
      totalTenantsProcessed: allTenants.length,
      safeAutomatic: [],
      requiresBusinessConfirmation: [],
      requiresManualReconciliation: [],
      alreadyConfigured: [],
      preservedDataSummary: {
        totalTenants: allTenants.length,
        totalCompanies: 0,
        totalTenantModuleEntitlements: 0,
      },
    };

    // Calculate baseline counts
    const [compCount] = await db.select({ count: sql<number>`count(*)` }).from(companies);
    const [modCount] = await db.select({ count: sql<number>`count(*)` }).from(tenantModules);
    report.preservedDataSummary.totalCompanies = Number(compCount?.count || 0);
    report.preservedDataSummary.totalTenantModuleEntitlements = Number(modCount?.count || 0);

    for (const tenant of allTenants) {
      // 1. Inspect Tenant Admins
      const admins = await db
        .select({
          id: tenantAdmins.id,
          userId: tenantAdmins.userId,
          status: tenantAdmins.status,
          isPrimary: tenantAdmins.isPrimary,
        })
        .from(tenantAdmins)
        .where(and(eq(tenantAdmins.tenantId, tenant.id), eq(tenantAdmins.status, 'active')));

      const existingPrimary = admins.find((a) => a.isPrimary);

      if (existingPrimary) {
        report.alreadyConfigured.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          primaryAdminUserId: existingPrimary.userId,
        });
      } else if (admins.length === 1) {
        // Safe automatic: strictly one active admin exists
        const singleAdmin = admins[0]!;
        report.safeAutomatic.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          action: 'Designate single active tenant admin as Primary Administrator',
          targetAdminUserId: singleAdmin.userId,
        });

        if (!dryRun) {
          await db
            .update(tenantAdmins)
            .set({ isPrimary: true })
            .where(eq(tenantAdmins.id, singleAdmin.id));
        }
      } else if (admins.length > 1) {
        // Ambiguous: multiple active admins exist, none marked primary
        report.requiresBusinessConfirmation.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          reason: `Tenant has ${admins.length} active administrators with no designated primary admin. Manual selection required.`,
          candidateAdminUserIds: admins.map((a) => a.userId),
        });
      } else {
        // Zero active tenant admins
        report.requiresManualReconciliation.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          reason: 'Tenant has zero active tenant administrator records.',
        });
      }

      // 2. Lifecycle baseline event (idempotent)
      const [existingLifecycle] = await db
        .select({ id: tenantLifecycleEvents.id })
        .from(tenantLifecycleEvents)
        .where(eq(tenantLifecycleEvents.tenantId, tenant.id))
        .limit(1);

      if (!existingLifecycle) {
        if (!dryRun) {
          await db.insert(tenantLifecycleEvents).values({
            id: `tle_backfill_${tenant.id.replace(/[^a-zA-Z0-9_]/g, '_').slice(-20)}_${Date.now().toString(36)}`,
            tenantId: tenant.id,
            eventType: 'created',
            previousStatus: null,
            newStatus: tenant.status,
            reason: 'Backfill baseline tenant lifecycle state initialization',
            actorUserId: options.actorUserId || null,
            actorEmail: options.actorEmail || 'system@bezent.local',
            metadata: { backfilled: true, originalCreatedAt: tenant.createdAt },
          });
        }
      }
    }

    return report;
  }
}

export const tenantManagementBackfillService = new TenantManagementBackfillService();
