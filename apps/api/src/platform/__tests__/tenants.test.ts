import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantService } from '../tenants/service/tenant.service.js';
import type { TenantRepository } from '../tenants/repository/tenant.repository.js';
import { validateCreateTenant } from '../tenants/validation/tenant.schema.js';
import { ConflictError, NotFoundError, ValidationError } from '../../app/errors/AppError.js';
import type { TenantRecord } from '../tenants/types/tenant.types.js';

describe('Tenant Validation Schemas', () => {
  it('validates valid create tenant payload and formats code', () => {
    const validated = validateCreateTenant({
      name: 'Acme Corporation',
      code: 'acme-corp',
      contactEmail: 'admin@acme.com',
      contactPhone: '+1-555-0100',
    });

    expect(validated.name).toBe('Acme Corporation');
    expect(validated.code).toBe('ACME-CORP');
    expect(validated.contactEmail).toBe('admin@acme.com');
  });

  it('rejects invalid email for tenant creation', () => {
    expect(() =>
      validateCreateTenant({
        name: 'Acme Corporation',
        code: 'ACME',
        contactEmail: 'not-an-email',
      })
    ).toThrow(ValidationError);
  });

  it('rejects short name for tenant creation', () => {
    expect(() =>
      validateCreateTenant({
        name: 'A',
      })
    ).toThrow(ValidationError);
  });
});

describe('TenantService', () => {
  let mockRepo: Partial<TenantRepository>;
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };
  let tenantService: TenantService;

  const sampleTenant: TenantRecord = {
    id: 'tenant_acme_01',
    name: 'Acme Corp',
    code: 'ACME',
    contactEmail: 'contact@acme.com',
    contactPhone: '+1234567890',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockRepo = {
      list: vi.fn(),
      findById: vi.fn(),
      findByCode: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
    };
    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({ id: 'aud_1' } as unknown as import('../audit/types/audit.types.js').AuditLogRecord),
    };
    tenantService = new TenantService(
      mockRepo as TenantRepository,
      mockAudit as unknown as import('../audit/service/audit.service.js').AuditService,
    );
  });

  it('creates a tenant when code is unique', async () => {
    vi.mocked(mockRepo.findByCode!).mockResolvedValue(null);
    vi.mocked(mockRepo.create!).mockResolvedValue(sampleTenant);

    const result = await tenantService.createTenant({
      name: 'Acme Corp',
      code: 'ACME',
      contactEmail: 'contact@acme.com',
      contactPhone: '+1234567890',
    });

    expect(result.id).toBe('tenant_acme_01');
    expect(result.code).toBe('ACME');
  });

  it('rejects tenant creation if code already exists', async () => {
    vi.mocked(mockRepo.findByCode!).mockResolvedValue(sampleTenant);

    await expect(
      tenantService.createTenant({
        name: 'New Acme Corp',
        code: 'ACME',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('suspends an active tenant', async () => {
    vi.mocked(mockRepo.findById!).mockResolvedValue(sampleTenant);
    vi.mocked(mockRepo.updateStatus!).mockResolvedValue({
      ...sampleTenant,
      status: 'suspended',
    });

    const suspended = await tenantService.suspendTenant('tenant_acme_01');
    expect(suspended.status).toBe('suspended');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('tenant_acme_01', 'suspended');
  });

  it('reactivates a suspended tenant', async () => {
    vi.mocked(mockRepo.findById!).mockResolvedValue({
      ...sampleTenant,
      status: 'suspended',
    });
    vi.mocked(mockRepo.updateStatus!).mockResolvedValue({
      ...sampleTenant,
      status: 'active',
    });

    const reactivated = await tenantService.activateTenant('tenant_acme_01');
    expect(reactivated.status).toBe('active');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('tenant_acme_01', 'active');
  });

  it('throws NotFoundError for non-existent tenant', async () => {
    vi.mocked(mockRepo.findById!).mockResolvedValue(null);

    await expect(tenantService.getTenantById('unknown_id')).rejects.toThrow(NotFoundError);
  });
});
