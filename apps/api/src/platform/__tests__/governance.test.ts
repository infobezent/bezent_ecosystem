import { describe, it, expect } from 'vitest';
import { governanceService } from '../governance/service/governance.service.js';
import { auditService } from '../audit/service/audit.service.js';
import type { AuditRepository } from '../audit/repository/audit.repository.js';
import { OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS } from '../auth/service/otpAuth.service.js';
import { SESSION_TTL_HOURS } from '../auth/service/auth.service.js';

describe('Governance Subsystem', () => {
  it('derives canonical operational facts from backend invariants without hardcoding', () => {
    const summary = governanceService.getSummary();

    // Authentication
    expect(summary.authentication.method).toBe('email_otp');
    expect(summary.authentication.enabled).toBe(true);
    expect(summary.authentication.otpExpiryMinutes).toBe(OTP_TTL_MINUTES);
    expect(summary.authentication.maxVerificationAttempts).toBe(OTP_MAX_ATTEMPTS);
    expect(summary.authentication.resendCooldownSeconds).toBe(OTP_RESEND_COOLDOWN_SECONDS);

    // Session
    expect(summary.session.ttlHours).toBe(SESSION_TTL_HOURS);
    expect(summary.session.platformAuthorization).toBe(true);

    // Isolation
    expect(summary.isolation.tenantIsolation).toBe(true);
    expect(summary.isolation.companyScoping).toBe(true);
    expect(summary.isolation.identitySeparatedFromEmployee).toBe(true);

    // Audit
    expect(summary.audit.enabled).toBe(true);
    expect(summary.audit.sensitiveMetadataProtection).toBe(true);

    // Applications
    expect(summary.applications.total).toBe(3);
    expect(summary.applications.available).toBe(1);
    expect(summary.applications.comingSoon).toBe(2);
  });

  it('contains zero credentials, environment variable names, or secret keys in summary', () => {
    const summary = governanceService.getSummary();
    const serialized = JSON.stringify(summary).toLowerCase();

    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('smtp');
    expect(serialized).not.toContain('db_');
    expect(serialized).not.toContain('mysql');
  });

  it('scrubs sensitive credentials including OTPs, tokens, and cookies in audit logging', async () => {
    let recordedPayload: Record<string, unknown> | null = null;
    const mockRepo: Partial<AuditRepository> = {
      record: async (event) => {
        recordedPayload = event.metadata ?? null;
        return {
          id: 'aud_test',
          actorUserId: event.actorUserId ?? null,
          actorEmail: event.actorEmail ?? null,
          action: event.action,
          targetType: event.targetType,
          targetId: event.targetId,
          tenantId: event.tenantId ?? null,
          companyId: event.companyId ?? null,
          metadata: event.metadata ?? null,
          createdAt: new Date().toISOString(),
        };
      },
    };

    const service = new (auditService.constructor as new (repo: AuditRepository) => typeof auditService)(
      mockRepo as AuditRepository,
    );

    await service.logEvent({
      action: 'test_action',
      targetType: 'test',
      targetId: 'id_1',
      metadata: {
        otp: '123456',
        code: '654321',
        token: 'sess_token_xyz',
        password: 'pass',
        cookie: 'sid=123',
        safeProperty: 'Alpha',
      },
    });

    expect(recordedPayload).not.toBeNull();
    const payload = recordedPayload as unknown as Record<string, unknown>;
    expect(payload.otp).toBe('[REDACTED]');
    expect(payload.code).toBe('[REDACTED]');
    expect(payload.token).toBe('[REDACTED]');
    expect(payload.password).toBe('[REDACTED]');
    expect(payload.cookie).toBe('[REDACTED]');
    expect(payload.safeProperty).toBe('Alpha');
  });
});
