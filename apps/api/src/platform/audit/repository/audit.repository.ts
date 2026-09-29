import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { auditLogs } from '../../../db/schema.js';
import type { AuditEventInput, AuditLogFilter, AuditLogRecord } from '../types/audit.types.js';
import { generateSurrogateId } from '../../auth/security.js';

export class AuditRepository {
  async record(event: AuditEventInput): Promise<AuditLogRecord> {
    const db = getDb();
    const id = generateSurrogateId('aud');
    await db.insert(auditLogs).values({
      id,
      actorUserId: event.actorUserId ?? null,
      actorEmail: event.actorEmail ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      tenantId: event.tenantId ?? null,
      companyId: event.companyId ?? null,
      metadata: event.metadata ?? null,
    });

    const [created] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    if (!created) throw new Error('Failed to record audit log');
    return {
      id: created.id,
      actorUserId: created.actorUserId,
      actorEmail: created.actorEmail,
      action: created.action,
      targetType: created.targetType,
      targetId: created.targetId,
      tenantId: created.tenantId,
      companyId: created.companyId,
      metadata: created.metadata,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async list(filter: AuditLogFilter): Promise<{ items: AuditLogRecord[]; total: number }> {
    const db = getDb();
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
    if (filter.targetType) conditions.push(eq(auditLogs.targetType, filter.targetType));
    if (filter.targetId) conditions.push(eq(auditLogs.targetId, filter.targetId));
    if (filter.tenantId) conditions.push(eq(auditLogs.tenantId, filter.tenantId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const rows = await query;

    const allMatching = await db.select({ id: auditLogs.id }).from(auditLogs).where(whereClause);

    return {
      items: rows.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        actorEmail: r.actorEmail,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        tenantId: r.tenantId,
        companyId: r.companyId,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
      total: allMatching.length,
    };
  }
}

export const auditRepository = new AuditRepository();
