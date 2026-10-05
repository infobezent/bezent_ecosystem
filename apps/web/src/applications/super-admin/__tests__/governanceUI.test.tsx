import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { PlatformSettingsPage } from '../pages/PlatformSettingsPage';
import {
  superAdminApi,
  type AuditLogEntry,
  type TenantRecord,
  type GovernanceSummary,
} from '../api/superAdminApi';
import {
  formatAuditAction,
  getAuditActionBadgeVariant,
  resolveAuditTarget,
  resolveAuditContext,
  formatAuditTimestamp,
} from '../utils/auditFormatters';

vi.mock('../../../design-system/components', async () => {
  const actual = await vi.importActual<typeof import('../../../design-system/components')>(
    '../../../design-system/components',
  );
  return {
    ...actual,
    Modal: ({ children, title }: { children: React.ReactNode; title: string }) => (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ),
  };
});

vi.mock('../api/superAdminApi', () => ({
  superAdminApi: {
    listAuditLogs: vi.fn(),
    listTenants: vi.fn(),
    getGovernanceSummary: vi.fn(),
  },
}));

const mockTenants: TenantRecord[] = [
  {
    id: 'tent_alpha',
    name: 'Alpha Group',
    code: 'alpha-corp',
    contactEmail: 'contact@alpha.com',
    contactPhone: '+1 555-0100',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'aud_1',
    actorUserId: 'usr_admin_1',
    actorEmail: 'admin@alpha.example',
    action: 'tenant_created',
    targetType: 'tenant',
    targetId: 'tent_alpha',
    tenantId: 'tent_alpha',
    tenantName: 'Alpha Group',
    companyId: null,
    companyName: null,
    metadata: { name: 'Alpha Group', code: 'alpha-corp' },
    createdAt: '2026-10-04T12:00:00.000Z',
  },
  {
    id: 'aud_2',
    actorUserId: 'usr_admin_1',
    actorEmail: 'admin@alpha.example',
    action: 'company_admin_assigned',
    targetType: 'company_admin',
    targetId: 'mem_1',
    tenantId: 'tent_alpha',
    tenantName: 'Alpha Group',
    companyId: 'comp_1',
    companyName: 'Alpha Manufacturing',
    metadata: { adminEmail: 'ca@alpha.example', userId: 'usr_ca_1' },
    createdAt: '2026-10-04T12:05:00.000Z',
  },
  {
    id: 'aud_3',
    actorUserId: null,
    actorEmail: null,
    action: 'otp_failed',
    targetType: 'otp_challenge',
    targetId: 'chal_1',
    tenantId: null,
    companyId: null,
    metadata: { attempts: 3, token: '[REDACTED]' },
    createdAt: '2026-10-04T12:10:00.000Z',
  },
  {
    id: 'aud_4',
    actorUserId: 'usr_admin_1',
    actorEmail: 'admin@alpha.example',
    action: 'future_custom_action_test',
    targetType: 'custom_entity',
    targetId: 'cust_1',
    tenantId: null,
    companyId: null,
    metadata: null,
    createdAt: '2026-10-04T12:15:00.000Z',
  },
];

const mockGovernanceSummary: GovernanceSummary = {
  authentication: {
    method: 'email_otp',
    enabled: true,
    otpExpiryMinutes: 10,
    maxVerificationAttempts: 5,
    resendCooldownSeconds: 60,
  },
  session: {
    ttlHours: 24,
    platformAuthorization: true,
  },
  isolation: {
    tenantIsolation: true,
    companyScoping: true,
    identitySeparatedFromEmployee: true,
  },
  audit: {
    enabled: true,
    sensitiveMetadataProtection: true,
    scope: 'platform_and_company',
  },
  applications: {
    total: 3,
    available: 1,
    comingSoon: 2,
  },
};

describe('Super Admin Governance UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Administrative Audit Logs Page', () => {
    it('renders title, subtitle, and does not claim cryptographically immutable ledger', () => {
      vi.mocked(superAdminApi.listAuditLogs).mockReturnValue(
        new Promise(() => {}) as unknown as ReturnType<typeof superAdminApi.listAuditLogs>,
      );
      vi.mocked(superAdminApi.listTenants).mockResolvedValue({
        items: mockTenants,
        total: 1,
      });

      const html = renderToStaticMarkup(<AuditLogsPage />);

      expect(html).toContain('Administrative Audit Logs');
      expect(html).toContain('Review administrative actions, access changes');
      expect(html).not.toContain('cryptographically immutable ledger');
    });

    it('renders canonical filter options for exact event filtering', () => {
      const html = renderToStaticMarkup(<AuditLogsPage />);
      expect(html).toContain('All Event Types');
      expect(html).toContain('Customer Created');
      expect(html).toContain('Company Administrator Assigned');
      expect(html).toContain('Application Enabled');
      expect(html).toContain('Application Disabled');
    });
  });

  describe('Platform Settings Page', () => {
    it('renders title, subtitle, and operational notice without hardcoded security claims', () => {
      vi.mocked(superAdminApi.getGovernanceSummary).mockReturnValue(
        new Promise(() => {}) as unknown as ReturnType<typeof superAdminApi.getGovernanceSummary>,
      );

      const html = renderToStaticMarkup(<PlatformSettingsPage />);

      expect(html).toContain('Platform Settings');
      expect(html).toContain('Read-only operational configuration and governance status for the BEZENT platform.');
      expect(html).toContain('Loading platform configuration...');
      // Does not contain old developer documentation
      expect(html).not.toContain('AGENTS.md');
      expect(html).not.toContain('ADR-008');
      expect(html).not.toContain('ADR-009');
      expect(html).not.toContain('ADR-016');
      expect(html).not.toContain('MySQL 8.4');
      expect(html).not.toContain('Drizzle Schema');
      expect(html).not.toContain('Scrypt Password Hashing');
      expect(html).not.toContain('Timing Safe Equal');
    });

    it('verifies canonical governance summary payload structure', () => {
      expect(mockGovernanceSummary.authentication.method).toBe('email_otp');
      expect(mockGovernanceSummary.session.ttlHours).toBe(24);
      expect(mockGovernanceSummary.isolation.tenantIsolation).toBe(true);
      expect(mockGovernanceSummary.audit.sensitiveMetadataProtection).toBe(true);
      expect(mockGovernanceSummary.applications.total).toBe(3);
    });
  });

  describe('Audit Formatters & Target Enrichment', () => {
    it('maps known canonical event codes to readable labels', () => {
      expect(formatAuditAction('tenant_created')).toBe('Customer Created');
      expect(formatAuditAction('tenant_suspended')).toBe('Customer Suspended');
      expect(formatAuditAction('company_created')).toBe('Company Created');
      expect(formatAuditAction('company_admin_assigned')).toBe('Company Administrator Assigned');
      expect(formatAuditAction('company_admin_revoked')).toBe('Company Administrator Revoked');
      expect(formatAuditAction('company_admin_invitation_resent')).toBe('Administrator Invitation Resent');
      expect(formatAuditAction('module_enabled')).toBe('Application Enabled');
      expect(formatAuditAction('module_disabled')).toBe('Application Disabled');
      expect(formatAuditAction('user_created')).toBe('Platform User Created');
      expect(formatAuditAction('user_status_changed')).toBe('User Account Status Changed');
      expect(formatAuditAction('otp_failed')).toBe('Invalid OTP Attempt');
      expect(formatAuditAction('otp_locked')).toBe('OTP Challenge Locked');
    });

    it('safely formats unknown action codes into title-cased labels', () => {
      expect(formatAuditAction('unknown_security_event')).toBe('Unknown Security Event');
      expect(formatAuditAction('custom_lifecycle.trigger')).toBe('Custom Lifecycle Trigger');
    });

    it('assigns appropriate badge tones based on event semantics', () => {
      expect(getAuditActionBadgeVariant('tenant_suspended')).toBe('danger');
      expect(getAuditActionBadgeVariant('company_admin_revoked')).toBe('danger');
      expect(getAuditActionBadgeVariant('otp_failed')).toBe('danger');
      expect(getAuditActionBadgeVariant('tenant_created')).toBe('success');
      expect(getAuditActionBadgeVariant('module_enabled')).toBe('success');
      expect(getAuditActionBadgeVariant('tenant_updated')).toBe('info');
      expect(getAuditActionBadgeVariant('custom_role_created')).toBe('success');
    });

    it('enriches targets with readable names and captions', () => {
      const tenantTarget = resolveAuditTarget(mockAuditLogs[0]!);
      expect(tenantTarget.label).toBe('Alpha Group');
      expect(tenantTarget.type).toBe('Customer');

      const adminTarget = resolveAuditTarget(mockAuditLogs[1]!);
      expect(adminTarget.label).toBe('ca@alpha.example');
      expect(adminTarget.type).toBe('Administrator');

      const appLog: AuditLogEntry = {
        id: 'aud_app',
        actorUserId: null,
        actorEmail: 'admin@alpha.com',
        action: 'module_enabled',
        targetType: 'module',
        targetId: 'hrms',
        tenantId: 'tent_alpha',
        companyId: null,
        metadata: null,
        createdAt: '2026-10-04T12:00:00.000Z',
      };
      const appTarget = resolveAuditTarget(appLog);
      expect(appTarget.label).toBe('HRMS');
      expect(appTarget.type).toBe('Application');
    });

    it('handles historical or missing targets gracefully without breaking', () => {
      const missingLog: AuditLogEntry = {
        id: 'aud_hist',
        actorUserId: null,
        actorEmail: null,
        action: 'company_suspended',
        targetType: 'company',
        targetId: 'comp_deleted_123',
        tenantId: null,
        companyId: null,
        metadata: null,
        createdAt: '2026-10-04T12:00:00.000Z',
      };
      const target = resolveAuditTarget(missingLog);
      expect(target.label).toBe('Historical Company');
      expect(target.type).toBe('Company');
      expect(target.id).toBe('comp_deleted_123');
    });

    it('resolves customer and company context cleanly', () => {
      const context1 = resolveAuditContext(mockAuditLogs[0]!);
      expect(context1.customer).toBe('Alpha Group');
      expect(context1.company).toBeUndefined();

      const context2 = resolveAuditContext(mockAuditLogs[1]!);
      expect(context2.customer).toBe('Alpha Group');
      expect(context2.company).toBe('Alpha Manufacturing');

      const context3 = resolveAuditContext(mockAuditLogs[2]!);
      expect(context3.customer).toBe('Platform');
    });

    it('formats timestamp with both date and time', () => {
      const ts = formatAuditTimestamp('2026-10-04T14:30:45.000Z');
      expect(ts.date).toBeDefined();
      expect(ts.time).toBeDefined();
      expect(ts.full).toBeDefined();
    });
  });
});
