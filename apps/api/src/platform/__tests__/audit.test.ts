import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../audit/service/audit.service.js';
import type { AuditRepository } from '../audit/repository/audit.repository.js';
import type { AuditLogRecord } from '../audit/types/audit.types.js';

describe('AuditService', () => {
  let mockRepo: Partial<AuditRepository>;
  let auditService: AuditService;

  beforeEach(() => {
    mockRepo = {
      record: vi.fn(),
    };
    auditService = new AuditService(mockRepo as AuditRepository);
  });

  it('records an audit event with sanitized metadata (no passwords or tokens)', async () => {
    const rawMetadata = {
      tenantName: 'Acme Corp',
      password: 'super_secret_password',
      token: 'bzt_sess_secret_token_123',
      apiKey: 'key_12345',
      safeField: 'safeValue',
    };

    const mockCreatedLog: AuditLogRecord = {
      id: 'audit_01',
      actorUserId: 'usr_sa_01',
      actorEmail: 'superadmin@bezent.com',
      action: 'TENANT_CREATED',
      targetType: 'tenant',
      targetId: 'tenant_acme',
      tenantId: 'tenant_acme',
      companyId: null,
      metadata: null,
      createdAt: new Date().toISOString(),
    };

    vi.mocked(mockRepo.record!).mockImplementation(async (params) => {
      return {
        ...mockCreatedLog,
        metadata: (params.metadata ?? null) as Record<string, unknown> | null,
      };
    });

    const recorded = await auditService.logEvent({
      actorUserId: 'usr_sa_01',
      actorEmail: 'superadmin@bezent.com',
      action: 'TENANT_CREATED',
      targetType: 'tenant',
      targetId: 'tenant_acme',
      tenantId: 'tenant_acme',
      metadata: rawMetadata,
    });

    expect(recorded.id).toBe('audit_01');
    expect(mockRepo.record).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(mockRepo.record!).mock.calls[0]?.[0];
    expect(callArgs?.metadata).toBeDefined();
    expect(callArgs?.metadata?.safeField).toBe('safeValue');
    expect(callArgs?.metadata?.tenantName).toBe('Acme Corp');
    expect(callArgs?.metadata?.password).toBe('[REDACTED]');
    expect(callArgs?.metadata?.token).toBe('[REDACTED]');
    expect(callArgs?.metadata?.apiKey).toBe('[REDACTED]');
  });
});
