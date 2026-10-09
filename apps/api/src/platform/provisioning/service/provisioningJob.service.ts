import { eq, and, or, isNull, lte, desc } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  provisioningJobs,
  type ProvisioningJob,
  type NewProvisioningJob,
} from '../../../db/schema.js';
import { generateSurrogateId } from '../../auth/security.js';
import { NotFoundError, BadRequestError } from '../../../app/errors/AppError.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';

export interface CreateProvisioningJobParams {
  id?: string;
  tenantId: string;
  companyId?: string | null;
  jobType: 'tenant_creation' | 'subscription_activation' | 'module_provisioning' | 'admin_handoff';
  idempotencyKey?: string;
  stepState?: Record<string, unknown>;
  maxAttempts?: number;
}

export class ProvisioningJobService {
  constructor(private readonly audit: AuditService = auditService) {}

  async createJob(params: CreateProvisioningJobParams): Promise<ProvisioningJob> {
    const db = getDb();

    if (params.idempotencyKey) {
      const [existing] = await db
        .select()
        .from(provisioningJobs)
        .where(eq(provisioningJobs.idempotencyKey, params.idempotencyKey));
      if (existing) {
        return existing;
      }
    }

    const jobId = params.id || generateSurrogateId('pjob');
    const newJob: NewProvisioningJob = {
      id: jobId,
      tenantId: params.tenantId,
      companyId: params.companyId || null,
      jobType: params.jobType,
      status: 'pending',
      idempotencyKey: params.idempotencyKey || null,
      attemptCount: 1,
      maxAttempts: params.maxAttempts ?? 3,
      retryEligible: true,
      stepState: params.stepState || { initialized: true },
    };

    await db.insert(provisioningJobs).values(newJob);

    const [created] = await db
      .select()
      .from(provisioningJobs)
      .where(eq(provisioningJobs.id, jobId));

    return created!;
  }

  async getJobById(id: string): Promise<ProvisioningJob> {
    const db = getDb();
    const [job] = await db.select().from(provisioningJobs).where(eq(provisioningJobs.id, id));
    if (!job) {
      throw new NotFoundError(`Provisioning job '${id}' not found`);
    }
    return job;
  }

  async listJobs(filter: { tenantId?: string; status?: string; limit?: number }): Promise<ProvisioningJob[]> {
    const db = getDb();
    const conditions = [];

    if (filter.tenantId) {
      conditions.push(eq(provisioningJobs.tenantId, filter.tenantId));
    }
    if (filter.status) {
      conditions.push(eq(provisioningJobs.status, filter.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db
      .select()
      .from(provisioningJobs)
      .where(whereClause)
      .orderBy(desc(provisioningJobs.createdAt))
      .limit(filter.limit || 50);
  }

  async claimNextJob(workerId: string): Promise<ProvisioningJob | null> {
    const db = getDb();
    const now = new Date();

    const [candidate] = await db
      .select()
      .from(provisioningJobs)
      .where(
        and(
          eq(provisioningJobs.status, 'pending'),
          eq(provisioningJobs.retryEligible, true),
          or(
            isNull(provisioningJobs.nextAttemptAt),
            lte(provisioningJobs.nextAttemptAt, now),
          ),
        ),
      )
      .orderBy(provisioningJobs.createdAt)
      .limit(1);

    if (!candidate) return null;

    await db
      .update(provisioningJobs)
      .set({
        status: 'in_progress',
        workerId,
        startedAt: now,
      })
      .where(and(eq(provisioningJobs.id, candidate.id), eq(provisioningJobs.status, 'pending')));

    return this.getJobById(candidate.id);
  }

  async updateStep(jobId: string, stepName: string, stepData: Record<string, unknown>): Promise<ProvisioningJob> {
    const db = getDb();
    const job = await this.getJobById(jobId);

    const updatedState = {
      ...job.stepState,
      [stepName]: {
        ...stepData,
        completedAt: new Date().toISOString(),
      },
    };

    await db
      .update(provisioningJobs)
      .set({ stepState: updatedState })
      .where(eq(provisioningJobs.id, jobId));

    return this.getJobById(jobId);
  }

  async completeJob(jobId: string, finalData?: Record<string, unknown>): Promise<ProvisioningJob> {
    const db = getDb();
    const job = await this.getJobById(jobId);
    const now = new Date();

    const updatedState = {
      ...job.stepState,
      ...(finalData || {}),
      completed: true,
    };

    await db
      .update(provisioningJobs)
      .set({
        status: 'completed',
        stepState: updatedState,
        completedAt: now,
      })
      .where(eq(provisioningJobs.id, jobId));

    await this.audit.logEvent({
      action: 'provisioning_job_completed',
      targetType: 'provisioning_job',
      targetId: jobId,
      tenantId: job.tenantId,
      metadata: { jobType: job.jobType },
    });

    return this.getJobById(jobId);
  }

  async failJob(
    jobId: string,
    errorCode: string,
    errorMessage: string,
    retryable: boolean = true,
  ): Promise<ProvisioningJob> {
    const db = getDb();
    const job = await this.getJobById(jobId);
    const now = new Date();

    const newAttemptCount = job.attemptCount + 1;
    const canRetry = retryable && newAttemptCount <= job.maxAttempts;

    // Exponential backoff: 2s, 4s, 8s...
    const backoffMs = Math.pow(2, newAttemptCount) * 1000;
    const nextAttemptAt = canRetry ? new Date(now.getTime() + backoffMs) : null;

    await db
      .update(provisioningJobs)
      .set({
        status: canRetry ? 'pending' : 'failed',
        attemptCount: newAttemptCount,
        retryEligible: canRetry,
        nextAttemptAt,
        errorCode,
        lastError: errorMessage.slice(0, 2000),
      })
      .where(eq(provisioningJobs.id, jobId));

    await this.audit.logEvent({
      action: 'provisioning_job_failed',
      targetType: 'provisioning_job',
      targetId: jobId,
      tenantId: job.tenantId,
      metadata: {
        errorCode,
        errorMessage,
        retryEligible: canRetry,
        attemptCount: newAttemptCount,
      },
    });

    return this.getJobById(jobId);
  }

  async retryJob(jobId: string, actor?: { id?: string; email?: string }): Promise<ProvisioningJob> {
    const db = getDb();
    const job = await this.getJobById(jobId);

    if (job.status === 'completed') {
      throw new BadRequestError('Cannot retry an already completed provisioning job');
    }

    const now = new Date();
    await db
      .update(provisioningJobs)
      .set({
        status: 'pending',
        retryEligible: true,
        nextAttemptAt: now,
        errorCode: null,
        lastError: null,
        workerId: null,
      })
      .where(eq(provisioningJobs.id, jobId));

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'provisioning_job_retried',
      targetType: 'provisioning_job',
      targetId: jobId,
      tenantId: job.tenantId,
      metadata: { previousStatus: job.status },
    });

    return this.getJobById(jobId);
  }
}

export const provisioningJobService = new ProvisioningJobService();
