import { eq, and, or, isNull, lte, desc } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  transactionalOutbox,
  type TransactionalOutboxMessage,
  type NewTransactionalOutboxMessage,
} from '../../../db/schema.js';
import { generateSurrogateId } from '../../auth/security.js';

export interface PublishOutboxEventParams {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export class TransactionalOutboxService {
  async publishEvent(
    params: PublishOutboxEventParams,
    txClient?: ReturnType<typeof getDb>,
  ): Promise<TransactionalOutboxMessage> {
    const client = txClient || getDb();

    if (params.idempotencyKey) {
      const [existing] = await client
        .select()
        .from(transactionalOutbox)
        .where(eq(transactionalOutbox.idempotencyKey, params.idempotencyKey));
      if (existing) {
        return existing;
      }
    }

    const id = generateSurrogateId('txo');
    const newMsg: NewTransactionalOutboxMessage = {
      id,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      eventType: params.eventType,
      payload: params.payload,
      idempotencyKey: params.idempotencyKey || null,
      status: 'pending',
      attemptCount: 0,
      maxAttempts: 5,
    };

    await client.insert(transactionalOutbox).values(newMsg);

    const [created] = await client
      .select()
      .from(transactionalOutbox)
      .where(eq(transactionalOutbox.id, id));

    return created!;
  }

  async claimPendingBatch(limit = 20): Promise<TransactionalOutboxMessage[]> {
    const db = getDb();
    const now = new Date();

    return db
      .select()
      .from(transactionalOutbox)
      .where(
        and(
          eq(transactionalOutbox.status, 'pending'),
          or(
            isNull(transactionalOutbox.nextAttemptAt),
            lte(transactionalOutbox.nextAttemptAt, now),
          ),
        ),
      )
      .orderBy(transactionalOutbox.createdAt)
      .limit(limit);
  }

  async markPublished(id: string): Promise<void> {
    const db = getDb();
    await db
      .update(transactionalOutbox)
      .set({
        status: 'published',
        publishedAt: new Date(),
      })
      .where(eq(transactionalOutbox.id, id));
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const db = getDb();
    const [msg] = await db
      .select()
      .from(transactionalOutbox)
      .where(eq(transactionalOutbox.id, id));

    if (!msg) return;

    const newAttempts = msg.attemptCount + 1;
    const isDeadLetter = newAttempts >= msg.maxAttempts;
    const now = new Date();
    const backoffMs = Math.pow(2, newAttempts) * 1000;
    const nextAttemptAt = isDeadLetter ? null : new Date(now.getTime() + backoffMs);

    await db
      .update(transactionalOutbox)
      .set({
        status: isDeadLetter ? 'dead_letter' : 'pending',
        attemptCount: newAttempts,
        nextAttemptAt,
        lastError: errorMessage.slice(0, 2000),
      })
      .where(eq(transactionalOutbox.id, id));
  }

  async getStatus(): Promise<{
    pending: number;
    published: number;
    deadLetter: number;
  }> {
    const db = getDb();
    const all = await db
      .select({ status: transactionalOutbox.status })
      .from(transactionalOutbox);

    return {
      pending: all.filter((m) => m.status === 'pending').length,
      published: all.filter((m) => m.status === 'published').length,
      deadLetter: all.filter((m) => m.status === 'dead_letter').length,
    };
  }

  /**
   * Dispatches a batch with a provided handler function.
   */
  async processBatch(
    handler: (event: TransactionalOutboxMessage) => Promise<void>,
    limit = 20,
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    const batch = await this.claimPendingBatch(limit);
    let succeeded = 0;
    let failed = 0;

    for (const msg of batch) {
      try {
        await handler(msg);
        await this.markPublished(msg.id);
        succeeded++;
      } catch (err: any) {
        await this.markFailed(msg.id, err?.message || String(err));
        failed++;
      }
    }

    return { processed: batch.length, succeeded, failed };
  }
}

export const transactionalOutboxService = new TransactionalOutboxService();
