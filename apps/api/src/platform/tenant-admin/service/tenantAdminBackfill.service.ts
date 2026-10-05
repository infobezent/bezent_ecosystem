import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  memberships,
  tenantAdmins,
  auditLogs,
  users,
} from '../../../db/schema.js';
import {
  tenantAdminRepository,
  TenantAdminRepository,
} from '../repository/tenantAdmin.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { generateSurrogateId } from '../../auth/security.js';
import type { BackfillSummary } from '../types/tenantAdmin.types.js';

export class TenantAdminBackfillService {
  constructor(
    private readonly repo: TenantAdminRepository = tenantAdminRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  /**
   * Idempotently backfills missing Tenant Administrator records for existing
   * tenants created before Phase 1.
   *
   * Safety Invariants:
   * 1. Only processes tenants with zero active Tenant Admins.
   * 2. Uses disambiguating provisioning audit metadata if present.
   * 3. If no audit metadata, checks for strictly one unique active company_admin user.
   * 4. If multiple company_admins exist without disambiguating audit logs, skips
   *    arbitrary promotion (ambiguous tenant, requires manual assignment).
   * 5. Enforces Phase 0 cross-tenant isolation: rejects candidate users associated
   *    with another customer tenant.
   * 6. Does not alter or delete existing memberships or role assignments.
   * 7. Logs tenant_admin_backfilled audit event with company_id = null.
   */
  async runBackfill(actor?: { id?: string; email?: string }): Promise<BackfillSummary> {
    const db = getDb();

    // 1. Fetch non-archived tenants
    const allTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        status: tenants.status,
      })
      .from(tenants)
      .where(sql`${tenants.status} != 'archived'`);

    const summary: BackfillSummary = {
      processedTenants: allTenants.length,
      backfilled: [],
      skippedAlreadyHasAdmin: [],
      skippedAmbiguous: [],
      skippedCrossTenant: [],
      skippedNoAdminFound: [],
    };

    for (const t of allTenants) {
      // 1. Check if tenant already has an active Tenant Admin
      const hasActiveAdmin = await this.repo.hasAnyActiveTenantAdmin(t.id);
      if (hasActiveAdmin) {
        summary.skippedAlreadyHasAdmin.push({
          tenantId: t.id,
          tenantName: t.name,
        });
        continue;
      }

      let candidateUserId: string | null = null;
      let backfillMethod = '';

      // 2. Source 1: Check audit_logs for 'customer_provisioned' event
      const [provisionAudit] = await db
        .select({
          metadata: auditLogs.metadata,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.targetType, 'tenant'),
            eq(auditLogs.targetId, t.id),
            eq(auditLogs.action, 'customer_provisioned'),
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      if (provisionAudit?.metadata) {
        const meta = provisionAudit.metadata as Record<string, unknown>;
        const adminId = (meta.adminUserId || meta.userId) as string | undefined;
        if (adminId) {
          const [u] = await db
            .select({ id: users.id, email: users.email, status: users.status })
            .from(users)
            .where(eq(users.id, adminId));

          if (u && u.status === 'active') {
            candidateUserId = u.id;
            backfillMethod = 'provisioning_audit_log';
          }
        }
      }

      // 3. Source 2: If no audit log, inspect active company_admin memberships in this tenant
      if (!candidateUserId) {
        const adminMemberships = await db
          .select({
            userId: memberships.userId,
            userEmail: users.email,
            userStatus: users.status,
          })
          .from(memberships)
          .innerJoin(users, eq(memberships.userId, users.id))
          .where(
            and(
              eq(memberships.tenantId, t.id),
              eq(memberships.role, 'company_admin'),
              eq(memberships.status, 'active'),
              eq(users.status, 'active'),
            ),
          );

        const uniqueUserIds = Array.from(new Set(adminMemberships.map((m) => m.userId)));

        if (uniqueUserIds.length === 1) {
          candidateUserId = uniqueUserIds[0]!;
          backfillMethod = 'sole_company_admin';
        } else if (uniqueUserIds.length > 1) {
          summary.skippedAmbiguous.push({
            tenantId: t.id,
            tenantName: t.name,
            candidateUserIds: uniqueUserIds,
            reason: `Found ${uniqueUserIds.length} active company_admin users without disambiguating provisioning audit metadata. Manual Super Admin assignment required.`,
          });
          continue;
        } else {
          summary.skippedNoAdminFound.push({
            tenantId: t.id,
            tenantName: t.name,
            reason: 'No active company_admin users found for this tenant.',
          });
          continue;
        }
      }

      // 4. Cross-tenant check: Candidate user must not belong to another customer tenant
      const otherTenantMemberships = await db
        .select({ tenantId: memberships.tenantId })
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, candidateUserId),
            sql`${memberships.tenantId} != ${t.id}`,
            eq(memberships.status, 'active'),
          ),
        );

      if (otherTenantMemberships.length > 0) {
        summary.skippedCrossTenant.push({
          tenantId: t.id,
          tenantName: t.name,
          userId: candidateUserId,
          reason:
            'Candidate user is associated with another customer tenant. Cross-tenant administrator assignment is prohibited.',
        });
        continue;
      }

      const otherTenantAdmins = await this.repo.listActiveByUser(candidateUserId);
      const foreignAdmin = otherTenantAdmins.find((ta) => ta.tenantId !== t.id);
      if (foreignAdmin) {
        summary.skippedCrossTenant.push({
          tenantId: t.id,
          tenantName: t.name,
          userId: candidateUserId,
          reason:
            'Candidate user already holds Tenant Admin authority in another tenant. Cross-tenant administrator assignment is prohibited.',
        });
        continue;
      }

      // 5. Create active tenant_admins record
      const [candidateUser] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, candidateUserId));

      const adminId = generateSurrogateId('ta');
      await db.insert(tenantAdmins).values({
        id: adminId,
        tenantId: t.id,
        userId: candidateUserId,
        status: 'active',
      });

      // 6. Tenant-level audit log: company_id = null
      await this.audit.logEvent({
        actorUserId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action: 'tenant_admin_backfilled',
        targetType: 'tenant_admin',
        targetId: adminId,
        tenantId: t.id,
        companyId: null,
        metadata: {
          userId: candidateUserId,
          email: candidateUser?.email,
          backfillMethod,
        },
      });

      summary.backfilled.push({
        tenantId: t.id,
        tenantName: t.name,
        userId: candidateUserId,
        userEmail: candidateUser?.email ?? '',
        reason: `Successfully backfilled founding Tenant Admin via ${backfillMethod}.`,
      });
    }

    return summary;
  }
}

export const tenantAdminBackfillService = new TenantAdminBackfillService();
