import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCustomerProvisioning } from '../provisioning/validation/provisioning.schema.js';
import { CustomerProvisioningService } from '../provisioning/service/provisioning.service.js';
import { ValidationError, ConflictError, BadRequestError, NotFoundError } from '../../app/errors/AppError.js';
import type { CustomerProvisioningDto } from '../provisioning/types/provisioning.types.js';
import type { TenantRepository } from '../tenants/repository/tenant.repository.js';
import type { CompanyRepository } from '../companies/repository/company.repository.js';
import type { PlatformUserRepository } from '../users/repository/user.repository.js';
import type { ModuleRepository } from '../modules/repository/module.repository.js';
import type { AuditService } from '../audit/service/audit.service.js';
import type { EmailService } from '../email/service/email.service.js';

interface InsertedValue {
  id?: string;
  tenantId?: string;
  companyId?: string | null;
  moduleCode?: string;
  status?: string;
  name?: string;
  code?: string;
  email?: string;
  passwordHash?: string;
  salt?: string;
  [key: string]: unknown;
}

// Mock DB connection and transactions
const insertedRecords: InsertedValue[] = [];
const mockTx = {
  insert: vi.fn().mockImplementation((_table: unknown) => ({
    values: vi.fn().mockImplementation(async (vals: InsertedValue) => {
      insertedRecords.push(vals);
      return {};
    }),
  })),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    }),
  }),
};

const mockDb = {
  transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
    return cb(mockTx);
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        {
          id: 'mem_test_01',
          tenantId: 'tnt_abc_01',
          companyId: 'comp_abc_01',
          userId: 'usr_admin_01',
          role: 'company_admin',
          status: 'active',
        },
      ]),
    }),
  }),
};

vi.mock('../../db/connection.js', () => ({
  getDb: () => mockDb,
  isDatabaseConfigured: false,
}));

vi.mock('../access/service/roleManagement.service.js', () => ({
  roleManagementService: {
    syncMembershipRole: vi.fn().mockResolvedValue({}),
  },
}));

describe('Customer Provisioning Validation Schema', () => {
  const validPayload = {
    tenant: {
      name: 'Global Corp Inc',
      code: 'global-corp',
      contactEmail: 'contact@globalcorp.com',
      contactPhone: '+1-555-0900',
    },
    company: {
      name: 'Global Corp US',
      code: 'gc-us',
      legalName: 'Global Corporation LLC',
      businessEmail: 'admin@globalcorp.com',
      contactPhone: '+1-555-0911',
      country: 'US',
      timeZone: 'America/New_York',
    },
    admin: {
      newUser: {
        email: 'john.doe@globalcorp.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1-555-0922',
      },
    },
    modules: ['hrms', 'crm'],
    activateImmediately: true,
  };

  it('1. validates a complete provisioning request and normalizes codes', () => {
    const validated = validateCustomerProvisioning(validPayload);

    expect(validated.tenant.name).toBe('Global Corp Inc');
    expect(validated.tenant.code).toBe('GLOBAL-CORP');
    expect(validated.company.code).toBe('GC-US');
    expect(validated.company.legalName).toBe('Global Corporation LLC');
    expect(validated.company.contactPhone).toBe('+1-555-0911');
    expect(validated.admin.newUser?.email).toBe('john.doe@globalcorp.com');
    expect(validated.admin.newUser?.firstName).toBe('John');
    expect(validated.modules).toEqual(['hrms', 'crm']);
    expect(validated.activateImmediately).toBe(true);
  });

  it('2. rejects invalid email formats', () => {
    const invalidEmailPayload = {
      ...validPayload,
      admin: {
        newUser: {
          ...validPayload.admin.newUser,
          email: 'not-an-email',
        },
      },
    };

    expect(() => validateCustomerProvisioning(invalidEmailPayload)).toThrow(ValidationError);
  });

  it('3. rejects invalid module names', () => {
    const invalidPayload = {
      ...validPayload,
      modules: ['invalid_module'],
    };

    expect(() => validateCustomerProvisioning(invalidPayload)).toThrow(ValidationError);
  });

  it('4. rejects empty module selection', () => {
    const emptyModulesPayload = {
      ...validPayload,
      modules: [],
    };

    expect(() => validateCustomerProvisioning(emptyModulesPayload)).toThrow(ValidationError);
  });

  it('5. requires either userId or newUser for company admin', () => {
    const noAdminPayload = {
      ...validPayload,
      admin: {},
    };

    expect(() => validateCustomerProvisioning(noAdminPayload)).toThrow(ValidationError);
  });

  it('6. accepts existing userId mode', () => {
    const existingUserPayload = {
      ...validPayload,
      admin: {
        userId: 'usr_existing_01',
      },
    };

    const validated = validateCustomerProvisioning(existingUserPayload);
    expect(validated.admin.userId).toBe('usr_existing_01');
    expect(validated.admin.newUser).toBeUndefined();
  });
});

describe('Customer Provisioning Service — Preflight & Security Boundaries', () => {
  let mockTenantRepo: { findByCode: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
  let mockCompanyRepo: { findById: ReturnType<typeof vi.fn>; findByTenantAndCode: ReturnType<typeof vi.fn> };
  let mockUserRepo: { findByEmail: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
  let mockModuleRepo: { listByTenant: ReturnType<typeof vi.fn> };
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };
  let mockEmail: { sendSignInInvitation: ReturnType<typeof vi.fn> };
  let service: CustomerProvisioningService;

  const validDto: CustomerProvisioningDto = {
    tenant: {
      name: 'Acme Enterprises',
      code: 'ACME',
    },
    company: {
      name: 'Acme Manufacturing Inc',
      code: 'ACME-MFG',
    },
    modules: ['hrms', 'project_management'],
    admin: {
      newUser: {
        email: 'admin@acme.com',
        firstName: 'Alice',
        lastName: 'Smith',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTenantRepo = {
      findByCode: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue({
        id: 'tnt_acme_01',
        name: 'Acme Enterprises',
        code: 'ACME',
        status: 'active',
        activeModules: ['hrms', 'project_management'],
      }),
    };

    mockCompanyRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'comp_acme_01',
        tenantId: 'tnt_acme_01',
        name: 'Acme Manufacturing Inc',
        code: 'ACME-MFG',
        status: 'active',
        enabledModules: ['hrms', 'project_management'],
      }),
      findByTenantAndCode: vi.fn().mockResolvedValue(null),
    };

    mockUserRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue({
        id: 'usr_admin_01',
        email: 'admin@acme.com',
        firstName: 'Alice',
        lastName: 'Smith',
        memberships: [],
      }),
    };

    mockModuleRepo = {
      listByTenant: vi.fn().mockResolvedValue([
        { id: 'mod_01', tenantId: 'tnt_acme_01', companyId: null, moduleCode: 'hrms', status: 'enabled' },
        { id: 'mod_02', tenantId: 'tnt_acme_01', companyId: 'comp_acme_01', moduleCode: 'hrms', status: 'enabled' },
        { id: 'mod_03', tenantId: 'tnt_acme_01', companyId: null, moduleCode: 'project_management', status: 'enabled' },
        { id: 'mod_04', tenantId: 'tnt_acme_01', companyId: 'comp_acme_01', moduleCode: 'project_management', status: 'enabled' },
      ]),
    };

    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    mockEmail = {
      sendSignInInvitation: vi.fn().mockResolvedValue('sent'),
    };

    service = new CustomerProvisioningService(
      mockTenantRepo as unknown as TenantRepository,
      mockCompanyRepo as unknown as CompanyRepository,
      mockUserRepo as unknown as PlatformUserRepository,
      mockModuleRepo as unknown as ModuleRepository,
      mockAudit as unknown as AuditService,
      mockEmail as unknown as EmailService,
    );
  });

  it('7. preflight succeeds when all codes and identities are available', async () => {
    const result = await service.validatePreflight(validDto);
    expect(result.valid).toBe(true);
    expect(result.summary).toContain('Acme Enterprises');
  });

  it('8. rejects duplicate tenant code with ConflictError', async () => {
    mockTenantRepo.findByCode.mockResolvedValueOnce({ id: 'tnt_existing', code: 'ACME' });

    await expect(service.validatePreflight(validDto)).rejects.toThrow(ConflictError);
  });

  it('9. prevents cross-tenant identity collision when newUser belongs to another tenant', async () => {
    mockUserRepo.findByEmail.mockResolvedValueOnce({
      id: 'usr_other',
      email: 'admin@acme.com',
      memberships: [{ tenantId: 'tnt_other' }],
    });

    await expect(service.validatePreflight(validDto)).rejects.toThrow(BadRequestError);
  });

  it('10. validates that existing userId exists', async () => {
    mockUserRepo.findById.mockResolvedValueOnce(null);

    const dtoWithUserId: CustomerProvisioningDto = {
      ...validDto,
      admin: { userId: 'usr_non_existent' },
    };

    await expect(service.validatePreflight(dtoWithUserId)).rejects.toThrow(NotFoundError);
  });

  it('11. prevents cross-tenant assignment when existing userId has memberships in another tenant', async () => {
    mockUserRepo.findById.mockResolvedValueOnce({
      id: 'usr_alien',
      email: 'alien@other.com',
      memberships: [{ tenantId: 'tnt_alien' }],
    });

    const dtoWithUserId: CustomerProvisioningDto = {
      ...validDto,
      admin: { userId: 'usr_alien' },
    };

    await expect(service.validatePreflight(dtoWithUserId)).rejects.toThrow(BadRequestError);
  });
});

describe('Customer Provisioning Service — Transactional Execution & Invariants', () => {
  let mockTenantRepo: { findByCode: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
  let mockCompanyRepo: { findById: ReturnType<typeof vi.fn>; findByTenantAndCode: ReturnType<typeof vi.fn> };
  let mockUserRepo: { findByEmail: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
  let mockModuleRepo: { listByTenant: ReturnType<typeof vi.fn> };
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };
  let mockEmail: { sendSignInInvitation: ReturnType<typeof vi.fn> };
  let service: CustomerProvisioningService;

  const validDto: CustomerProvisioningDto = {
    tenant: {
      name: 'Omni Group',
      code: 'OMNI',
      contactEmail: 'contact@omni.com',
    },
    company: {
      name: 'Omni Retail LLC',
      code: 'OMNI-RET',
      legalName: 'Omni Retail Limited Liability Company',
    },
    modules: ['hrms', 'crm'],
    admin: {
      newUser: {
        email: 'ops@omni.com',
        firstName: 'Bob',
        lastName: 'Vance',
      },
    },
    activateImmediately: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    insertedRecords.length = 0;

    mockTenantRepo = {
      findByCode: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue({
        id: 'tnt_omni_01',
        name: 'Omni Group',
        code: 'OMNI',
        status: 'active',
        activeModules: ['hrms', 'crm'],
      }),
    };

    mockCompanyRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'comp_omni_01',
        tenantId: 'tnt_omni_01',
        name: 'Omni Retail LLC',
        code: 'OMNI-RET',
        status: 'active',
        enabledModules: ['hrms', 'crm'],
      }),
      findByTenantAndCode: vi.fn().mockResolvedValue(null),
    };

    mockUserRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue({
        id: 'usr_admin_bob',
        email: 'ops@omni.com',
        firstName: 'Bob',
        lastName: 'Vance',
        memberships: [],
      }),
    };

    mockModuleRepo = {
      listByTenant: vi.fn().mockResolvedValue([
        { id: 'mod_01', tenantId: 'tnt_omni_01', companyId: null, moduleCode: 'hrms', status: 'enabled' },
        { id: 'mod_02', tenantId: 'tnt_omni_01', companyId: 'comp_omni_01', moduleCode: 'hrms', status: 'enabled' },
        { id: 'mod_03', tenantId: 'tnt_omni_01', companyId: null, moduleCode: 'crm', status: 'enabled' },
        { id: 'mod_04', tenantId: 'tnt_omni_01', companyId: 'comp_omni_01', moduleCode: 'crm', status: 'enabled' },
      ]),
    };

    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    mockEmail = {
      sendSignInInvitation: vi.fn().mockResolvedValue('sent'),
    };

    service = new CustomerProvisioningService(
      mockTenantRepo as unknown as TenantRepository,
      mockCompanyRepo as unknown as CompanyRepository,
      mockUserRepo as unknown as PlatformUserRepository,
      mockModuleRepo as unknown as ModuleRepository,
      mockAudit as unknown as AuditService,
      mockEmail as unknown as EmailService,
    );
  });

  it('12. executes atomic provisioning in a single database transaction', async () => {
    const result = await service.provisionCustomer(validDto, { id: 'usr_super', email: 'super@bezent.com' });

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('COMPLETED');
    expect(result.tenant.id).toBe('tnt_omni_01');
    expect(result.company.id).toBe('comp_omni_01');
    expect(result.admin.email).toBe('ops@omni.com');
    expect(result.admin.role).toBe('company_admin');
    expect(result.invitationDelivery.status).toBe('INVITATION_EMAILED');
  });

  it('13. inserts both Tenant Entitlement Ceiling (companyId: null) and Primary Company Access (companyId: compId)', async () => {
    await service.provisionCustomer(validDto);

    // Check tenant ceiling entries (companyId === null)
    const tenantCeilingHrms = insertedRecords.find(
      (v) => v.moduleCode === 'hrms' && v.companyId === null && v.status === 'enabled',
    );
    expect(tenantCeilingHrms).toBeDefined();

    const tenantCeilingCrm = insertedRecords.find(
      (v) => v.moduleCode === 'crm' && v.companyId === null && v.status === 'enabled',
    );
    expect(tenantCeilingCrm).toBeDefined();

    // Check primary company access entries (companyId !== null)
    const companyAccessHrms = insertedRecords.find(
      (v) => v.moduleCode === 'hrms' && v.companyId !== null && v.status === 'enabled',
    );
    expect(companyAccessHrms).toBeDefined();

    const companyAccessCrm = insertedRecords.find(
      (v) => v.moduleCode === 'crm' && v.companyId !== null && v.status === 'enabled',
    );
    expect(companyAccessCrm).toBeDefined();
  });

  it('14. explicitly records disabled ceiling if HRMS was unselected', async () => {
    const noHrmsDto: CustomerProvisioningDto = {
      ...validDto,
      modules: ['crm'],
    };

    await service.provisionCustomer(noHrmsDto);

    const disabledHrmsCeiling = insertedRecords.find(
      (v) => v.moduleCode === 'hrms' && v.companyId === null && v.status === 'disabled',
    );
    expect(disabledHrmsCeiling).toBeDefined();
  });

  it('15. provisions passwordless administrator with unusable credential (Email OTP)', async () => {
    await service.provisionCustomer(validDto);

    const userInsert = insertedRecords.find((v) => v.email === 'ops@omni.com');
    expect(userInsert).toBeDefined();
    expect(userInsert?.passwordHash).toBeDefined();
    expect((userInsert?.passwordHash as string).length).toBeGreaterThan(10);
    // Unusable hash contains ! or is random salt-based, cannot match any password
    expect(userInsert?.salt).toBeDefined();
  });

  it('16. tolerates email delivery failure without rolling back successfully provisioned customer', async () => {
    mockEmail.sendSignInInvitation.mockResolvedValueOnce('failed');

    const result = await service.provisionCustomer(validDto);

    expect(result.status).toBe('COMPLETED');
    expect(result.invitationDelivery.status).toBe('INVITATION_EMAIL_FAILED');
    expect(result.invitationDelivery.message).toContain('sign in with Email OTP');
    // Ensure customer tenant and company were still returned successfully
    expect(result.tenant.id).toBe('tnt_omni_01');
    expect(result.company.id).toBe('comp_omni_01');
  });

  it('17. emits canonical audit logs for lifecycle history', async () => {
    await service.provisionCustomer(validDto, { id: 'usr_super', email: 'super@bezent.com' });

    const auditActions = mockAudit.logEvent.mock.calls.map((c: unknown[]) => (c[0] as { action: string }).action);
    expect(auditActions).toContain('tenant_created');
    expect(auditActions).toContain('company_created');
    expect(auditActions).toContain('module_enabled');
    expect(auditActions).toContain('company_admin_assigned');
    expect(auditActions).toContain('customer_provisioned');
  });

  it('18. rolls back cleanly if database transaction throws', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('MySQL connection lost'));

    await expect(service.provisionCustomer(validDto)).rejects.toThrow('MySQL connection lost');
    // Audit logs and email invitation should NOT be executed when transaction fails
    expect(mockAudit.logEvent).not.toHaveBeenCalled();
    expect(mockEmail.sendSignInInvitation).not.toHaveBeenCalled();
  });
});
