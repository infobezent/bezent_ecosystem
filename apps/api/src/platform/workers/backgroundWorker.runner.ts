import { eq, and, lte, or } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import {
  tenantSubscriptions,
  tenantModules,
} from '../../db/schema.js';
import { transactionalOutboxService } from '../outbox/service/transactionalOutbox.service.js';
import { provisioningJobService } from '../provisioning/service/provisioningJob.service.js';
import { emailService } from '../email/service/email.service.js';
import { auditService } from '../audit/service/audit.service.js';

class BackgroundWorkerRunner {
  private outboxTimer: NodeJS.Timeout | null = null;
  private subscriptionTimer: NodeJS.Timeout | null = null;
  private provisioningTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  private stats = {
    outboxLastRunAt: null as Date | null,
    outboxDispatchedCount: 0,
    subscriptionLastSweepAt: null as Date | null,
    subscriptionsActivatedCount: 0,
    subscriptionsExpiredCount: 0,
    provisioningLastRunAt: null as Date | null,
    jobsProcessedCount: 0,
  };

  start(options: { outboxIntervalMs?: number; subscriptionIntervalMs?: number; provisioningIntervalMs?: number } = {}) {
    if (this.isRunning) return;
    this.isRunning = true;

    const outboxMs = options.outboxIntervalMs ?? 5000;
    const subMs = options.subscriptionIntervalMs ?? 15000;
    const provMs = options.provisioningIntervalMs ?? 5000;

    this.outboxTimer = setInterval(() => void this.processOutboxBatch(), outboxMs);
    this.subscriptionTimer = setInterval(() => void this.sweepSubscriptions(), subMs);
    this.provisioningTimer = setInterval(() => void this.processProvisioningJobs(), provMs);

    // Unref timers so they do not block test runners or process exit
    this.outboxTimer.unref();
    this.subscriptionTimer.unref();
    this.provisioningTimer.unref();
  }

  stop() {
    this.isRunning = false;
    if (this.outboxTimer) {
      clearInterval(this.outboxTimer);
      this.outboxTimer = null;
    }
    if (this.subscriptionTimer) {
      clearInterval(this.subscriptionTimer);
      this.subscriptionTimer = null;
    }
    if (this.provisioningTimer) {
      clearInterval(this.provisioningTimer);
      this.provisioningTimer = null;
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      ...this.stats,
    };
  }

  async processOutboxBatch(): Promise<number> {
    this.stats.outboxLastRunAt = new Date();
    try {
      const result = await transactionalOutboxService.processBatch(async (msg) => {
        if (msg.eventType === 'tenant.invitation.issued') {
          const payload = msg.payload as Record<string, any>;
          if (payload?.email) {
            await emailService.sendSignInInvitation({
              to: payload.email,
              firstName: payload.name || payload.email.split('@')[0] || 'Administrator',
              companyName: payload.companyName || 'BEZENT Platform',
              roleLabel: payload.roleLabel || 'Primary Tenant Administrator',
            });
          }
        }
      });
      this.stats.outboxDispatchedCount += result.succeeded;
      return result.succeeded;
    } catch (err) {
      return 0;
    }
  }

  async sweepSubscriptions(): Promise<{ activated: number; expired: number }> {
    this.stats.subscriptionLastSweepAt = new Date();
    const now = new Date();
    const db = getDb();
    let activated = 0;
    let expired = 0;

    try {
      // 1. Sweep scheduled activations: status = 'pending_activation' AND scheduledActivationAt <= now
      const dueToActivate = await db
        .select()
        .from(tenantSubscriptions)
        .where(
          and(
            eq(tenantSubscriptions.status, 'pending_activation'),
            lte(tenantSubscriptions.scheduledActivationAt, now),
          ),
        );

      for (const sub of dueToActivate) {
        await db
          .update(tenantSubscriptions)
          .set({
            status: 'active',
            activatedAt: now,
          })
          .where(eq(tenantSubscriptions.id, sub.id));

        // Sync tenant_modules to enabled
        await db
          .update(tenantModules)
          .set({ status: 'enabled', enabledAt: now })
          .where(
            and(
              eq(tenantModules.tenantId, sub.tenantId),
              eq(tenantModules.moduleCode, sub.applicationCode),
            ),
          );

        await auditService.logEvent({
          action: 'subscription_auto_activated',
          targetType: 'subscription',
          targetId: sub.id,
          tenantId: sub.tenantId,
          metadata: { scheduledActivationAt: sub.scheduledActivationAt },
        });

        activated++;
      }

      // 2. Sweep trial expirations: status = 'trial' AND trialEndsAt <= now
      const dueToExpire = await db
        .select()
        .from(tenantSubscriptions)
        .where(
          and(
            eq(tenantSubscriptions.status, 'trial'),
            lte(tenantSubscriptions.trialEndsAt, now),
          ),
        );

      for (const sub of dueToExpire) {
        await db
          .update(tenantSubscriptions)
          .set({
            status: 'expired',
          })
          .where(eq(tenantSubscriptions.id, sub.id));

        // Sync tenant_modules to disabled
        await db
          .update(tenantModules)
          .set({ status: 'disabled', disabledAt: now })
          .where(
            and(
              eq(tenantModules.tenantId, sub.tenantId),
              eq(tenantModules.moduleCode, sub.applicationCode),
            ),
          );

        await auditService.logEvent({
          action: 'subscription_trial_auto_expired',
          targetType: 'subscription',
          targetId: sub.id,
          tenantId: sub.tenantId,
          metadata: { trialEndsAt: sub.trialEndsAt },
        });

        expired++;
      }

      this.stats.subscriptionsActivatedCount += activated;
      this.stats.subscriptionsExpiredCount += expired;
    } catch {
      // Safe sweep failure catch
    }

    return { activated, expired };
  }

  async processProvisioningJobs(): Promise<number> {
    this.stats.provisioningLastRunAt = new Date();
    try {
      const job = await provisioningJobService.claimNextJob('runtime_worker_01');
      if (job) {
        await provisioningJobService.completeJob(job.id, {
          workerExecution: 'completed',
          executedAt: new Date().toISOString(),
        });
        this.stats.jobsProcessedCount++;
        return 1;
      }
    } catch {
      // Safe catch
    }
    return 0;
  }
}

export const backgroundWorkerRunner = new BackgroundWorkerRunner();
