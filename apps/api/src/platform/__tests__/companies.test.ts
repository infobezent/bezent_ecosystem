/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyService } from '../companies/service/company.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../app/errors/AppError.js';
import type { CompanyRecord } from '../companies/types/company.types.js';

describe('Super Admin Companies — Backend Domain & Security Suite', () => {
  let mockCompanyRepo: any;
  let mockTenantRepo: any;
  let mockModuleSvc: any;
  let mockCompanyAdminSvc: any;
  let mockAudit: any;
  let companyService: CompanyService;

  const sampleTenant = {
    id: 'tnt_abc_01',
    name: 'ABC Group',
    code: 'ABC',
    status: 'active',
  };

  const sampleCompany: CompanyRecord = {
    id: 'comp_abc_01',
    tenantId: 'tnt_abc_01',
    tenantName: 'ABC Group',
    name: 'ABC Manufacturing Pvt Ltd',
    code: 'ABC-MFG',
    legalName: 'ABC Manufacturing Private Limited',
    businessEmail: 'contact@abc-mfg.com',
    contactPhone: '+1 555-0100',
    country: 'US',
    timeZone: 'America/New_York',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enabledModules: ['hrms'],
    adminsCount: 1,
    activeAdminsCount: 1,
    pendingAdminsCount: 0,
    adminAccessStatus: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCompanyRepo = {
      findById: vi.fn().mockResolvedValue(sampleCompany),
      findByTenantAndCode: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async (dto) => ({
        ...sampleCompany,
        id: 'comp_new_01',
        ...dto,
      })),
      update: vi.fn().mockResolvedValue(sampleCompany),
      updateStatus: vi.fn().mockResolvedValue(sampleCompany),
      list: vi.fn().mockResolvedValue({ items: [sampleCompany], total: 1 }),
    };

    mockTenantRepo = {
      findById: vi.fn().mockResolvedValue(sampleTenant),
    };

    mockModuleSvc = {
      isTenantEntitled: vi.fn().mockImplementation(async (_tenantId, mod) => {
        // ABC Group entitled to hrms and project_management, but NOT crm
        return mod === 'hrms' || mod === 'project_management';
      }),
      enableModule: vi.fn().mockResolvedValue({}),
      getTenantModules: vi.fn().mockResolvedValue([]),
    };

    mockCompanyAdminSvc = {
      assignCompanyAdmin: vi.fn().mockResolvedValue({
        assignment: { membershipId: 'mem_01', email: 'admin@abc.com' },
        invitationDelivery: {
          status: 'INVITATION_EMAILED',
          message: 'Invitation sent via Email OTP.',
        },
      }),
      listCompanyAdmins: vi.fn().mockResolvedValue([]),
    };

    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({}),
      getLogs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    companyService = new CompanyService(
      mockCompanyRepo,
      mockTenantRepo,
      mockModuleSvc,
      mockCompanyAdminSvc,
      mockAudit,
    );
  });

  describe('Create Company Flow & Tenant Ceiling', () => {
    it('13. requires an existing customer tenant', async () => {
      mockTenantRepo.findById.mockResolvedValueOnce(null);

      await expect(
        companyService.createCompany({
          tenantId: 'non_existent_tenant',
          name: 'Acme Subsidiary',
          code: 'ACME-SUB',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects company creation under a suspended tenant', async () => {
      mockTenantRepo.findById.mockResolvedValueOnce({
        ...sampleTenant,
        status: 'suspended',
      });

      await expect(
        companyService.createCompany({
          tenantId: 'tnt_abc_01',
          name: 'Acme Subsidiary',
          code: 'ACME-SUB',
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it('14 & 15. creates company strictly under selected tenant without creating a new tenant', async () => {
      const result = await companyService.createCompany({
        tenantId: 'tnt_abc_01',
        name: 'ABC Technologies',
        code: 'ABC-TECH',
      });

      expect(mockCompanyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tnt_abc_01',
          name: 'ABC Technologies',
          code: 'ABC-TECH',
        }),
      );
      expect(result).toBeDefined();
    });

    it('16. enables entitled applications (e.g. HRMS, PM)', async () => {
      await companyService.createCompany({
        tenantId: 'tnt_abc_01',
        name: 'ABC Engineering',
        code: 'ABC-ENG',
        modules: ['hrms', 'project_management'],
      });

      expect(mockModuleSvc.enableModule).toHaveBeenCalledWith(
        'tnt_abc_01',
        'hrms',
        'comp_new_01',
        undefined,
      );
      expect(mockModuleSvc.enableModule).toHaveBeenCalledWith(
        'tnt_abc_01',
        'project_management',
        'comp_new_01',
        undefined,
      );
    });

    it('17 & 33. strictly rejects non-entitled application server-side (Tenant Ceiling)', async () => {
      // CRM is not entitled for ABC Group
      await expect(
        companyService.createCompany({
          tenantId: 'tnt_abc_01',
          name: 'ABC Engineering',
          code: 'ABC-ENG',
          modules: ['hrms', 'crm'],
        }),
      ).rejects.toThrow(BadRequestError);

      expect(mockCompanyRepo.create).not.toHaveBeenCalled();
    });

    it('18 & 20. assigns administrator through canonical company-admins subsystem with passwordless Email OTP', async () => {
      await companyService.createCompany({
        tenantId: 'tnt_abc_01',
        name: 'ABC Logistics',
        code: 'ABC-LOG',
        admin: {
          newUser: {
            email: 'admin@abc-log.com',
            firstName: 'Alex',
            lastName: 'Chen',
          },
        },
      });

      expect(mockCompanyAdminSvc.assignCompanyAdmin).toHaveBeenCalledWith(
        {
          tenantId: 'tnt_abc_01',
          companyId: 'comp_new_01',
          userId: undefined,
          newUser: {
            email: 'admin@abc-log.com',
            firstName: 'Alex',
            lastName: 'Chen',
          },
        },
        undefined,
      );
    });

    it('19. allows administrator assignment to be skipped', async () => {
      await companyService.createCompany({
        tenantId: 'tnt_abc_01',
        name: 'ABC Logistics',
        code: 'ABC-LOG',
      });

      expect(mockCompanyAdminSvc.assignCompanyAdmin).not.toHaveBeenCalled();
    });

    it('rejects duplicate company code within the same tenant', async () => {
      mockCompanyRepo.findByTenantAndCode.mockResolvedValueOnce(sampleCompany);

      await expect(
        companyService.createCompany({
          tenantId: 'tnt_abc_01',
          name: 'ABC Duplicate',
          code: 'ABC-MFG',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('Lifecycle, Audit & Scoped Operations', () => {
    it('suspends company and logs audit event', async () => {
      await companyService.suspendCompany('comp_abc_01', { id: 'usr_sa', email: 'sa@bezent.com' });

      expect(mockCompanyRepo.updateStatus).toHaveBeenCalledWith('comp_abc_01', 'suspended');
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'company_suspended',
          companyId: 'comp_abc_01',
          tenantId: 'tnt_abc_01',
        }),
      );
    });

    it('reactivates company and logs audit event', async () => {
      await companyService.activateCompany('comp_abc_01', { id: 'usr_sa', email: 'sa@bezent.com' });

      expect(mockCompanyRepo.updateStatus).toHaveBeenCalledWith('comp_abc_01', 'active');
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'company_reactivated',
          companyId: 'comp_abc_01',
          tenantId: 'tnt_abc_01',
        }),
      );
    });

    it('updates company profile and logs audit event', async () => {
      await companyService.updateCompany('comp_abc_01', { name: 'ABC Manufacturing Global' });

      expect(mockCompanyRepo.update).toHaveBeenCalledWith('comp_abc_01', {
        name: 'ABC Manufacturing Global',
      });
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'company_updated',
          companyId: 'comp_abc_01',
        }),
      );
    });
  });
});
