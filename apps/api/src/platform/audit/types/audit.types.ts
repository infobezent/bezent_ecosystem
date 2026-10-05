export interface AuditEventInput {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  tenantId?: string | null;
  companyId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  tenantId: string | null;
  tenantName?: string | null;
  companyId: string | null;
  companyName?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogFilter {
  action?: string;
  targetType?: string;
  targetId?: string;
  tenantId?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}
