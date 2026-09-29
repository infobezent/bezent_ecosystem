import { auditRepository, AuditRepository } from '../repository/audit.repository.js';
import type { AuditEventInput, AuditLogFilter, AuditLogRecord } from '../types/audit.types.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'salt',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'authorization',
  'apikey',
  'api_key',
]);

function sanitizeMetadata(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!data) return null;
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      clean[key] = sanitizeMetadata(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export class AuditService {
  constructor(private readonly repo: AuditRepository = auditRepository) {}

  async logEvent(event: AuditEventInput): Promise<AuditLogRecord> {
    const sanitizedMetadata = sanitizeMetadata(event.metadata);
    return this.repo.record({
      ...event,
      metadata: sanitizedMetadata,
    });
  }

  async getLogs(filter: AuditLogFilter): Promise<{ items: AuditLogRecord[]; total: number }> {
    return this.repo.list(filter);
  }
}

export const auditService = new AuditService();
