import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeService } from '../service/employee.service.js';
import type { EmployeeRepository } from '../repository/employee.repository.js';
import type { OrganizationRepository } from '../../organization/repository/organization.repository.js';
import { validateCreateEmployee } from '../validation/employee.schema.js';
import {
  validateEmployeeRecordDetails,
  validateEmployeeRecordSection,
} from '../validation/employeeProfile.schema.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
} from '../../../../app/errors/AppError.js';
import type { Employee } from '../../../../db/schema.js';
import type { EmployeeDetails } from '../types/employee.types.js';

describe('Employee Registration Features & Invariants', () => {
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';

  describe('Employee ID Server-Side Auto-Generation', () => {
    let mockRepo: Partial<EmployeeRepository>;
    let mockOrgRepo: Partial<OrganizationRepository>;
    let service: EmployeeService;

    beforeEach(() => {
      mockRepo = {
        listAllNumbers: vi.fn(),
        getByEmployeeNumber: vi.fn(),
        getByEmail: vi.fn(),
        create: vi.fn(),
        getById: vi.fn(),
      };
      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          departments: [],
          designations: [],
          locations: [],
        }),
      };
      service = new EmployeeService(
        mockRepo as EmployeeRepository,
        mockOrgRepo as OrganizationRepository,
      );
    });

    it('generates next sequential number when no employee number exists', async () => {
      vi.mocked(mockRepo.listAllNumbers!).mockResolvedValue([]);
      const result = await service.getNextEmployeeNumber(tenantId, companyId);
      expect(result.employeeNumber).toBe('EMP-0001');
    });

    it('increments highest sequence found among existing employee numbers', async () => {
      vi.mocked(mockRepo.listAllNumbers!).mockResolvedValue(['EMP-0001', 'EMP-0004', 'EMP-0002']);
      const result = await service.getNextEmployeeNumber(tenantId, companyId);
      expect(result.employeeNumber).toBe('EMP-0005');
    });

    it('auto-assigns employeeNumber on createEmployee if omitted', async () => {
      vi.mocked(mockRepo.listAllNumbers!).mockResolvedValue(['EMP-0010']);
      vi.mocked(mockRepo.getByEmployeeNumber!).mockResolvedValue(null);
      vi.mocked(mockRepo.getByEmail!).mockResolvedValue(null);
      vi.mocked(mockRepo.create!).mockImplementation(
        async (_t, _c, dto) =>
          ({
            id: 'emp_new',
            tenantId,
            companyId,
            employeeNumber: dto.employeeNumber,
            userId: null,
            firstName: dto.firstName,
            lastName: dto.lastName ?? null,
            email: dto.email,
            phone: dto.phone ?? null,
            departmentId: null,
            designationId: null,
            locationId: null,
            reportingManagerId: null,
            joiningDate: dto.joiningDate,
            confirmedJoiningDate: null,
            probationEndDate: null,
            confirmationDate: null,
            lastWorkingDate: null,
            sourceOfHire: null,
            referralCode: dto.referralCode ?? null,
            referredByEmployeeId: dto.referredByEmployeeId ?? null,
            noticePeriodDays: null,
            contractEndDate: null,
            employmentType: dto.employmentType,
            employmentStatus: dto.employmentStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as Employee,
      );
      vi.mocked(mockRepo.getById!).mockResolvedValue({
        id: 'emp_new',
        tenantId,
        companyId,
        employeeNumber: 'EMP-0011',
        userId: null,
        firstName: 'Alice',
        lastName: null,
        fullName: 'Alice',
        email: 'alice@example.com',
        phone: null,
        departmentId: null,
        departmentName: null,
        designationId: null,
        designationName: null,
        locationId: null,
        locationName: null,
        reportingManagerId: null,
        reportingManagerName: null,
        joiningDate: '2026-10-01',
        confirmedJoiningDate: null,
        probationEndDate: null,
        confirmationDate: null,
        lastWorkingDate: null,
        sourceOfHire: null,
        referralCode: 'REF-EMP0011',
        referredByEmployeeId: null,
        referredByName: null,
        noticePeriodDays: null,
        contractEndDate: null,
        employmentType: 'full_time',
        employmentStatus: 'pending_activation',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as EmployeeDetails);

      const created = await service.createEmployee(tenantId, companyId, {
        firstName: 'Alice',
        email: 'alice@example.com',
        joiningDate: '2026-10-01',
      });

      expect(created.employeeNumber).toBe('EMP-0011');
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({ employeeNumber: 'EMP-0011' }),
      );
    });
  });

  describe('Referral ID Resolution & Referral Integrity', () => {
    let mockRepo: Partial<EmployeeRepository>;
    let mockOrgRepo: Partial<OrganizationRepository>;
    let service: EmployeeService;

    beforeEach(() => {
      mockRepo = {
        getByReferralCode: vi.fn(),
        getById: vi.fn(),
      };
      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          departments: [],
          designations: [],
          locations: [],
        }),
      };
      service = new EmployeeService(
        mockRepo as EmployeeRepository,
        mockOrgRepo as OrganizationRepository,
      );
    });

    it('resolves valid referral code to referring employee summary', async () => {
      vi.mocked(mockRepo.getByReferralCode!).mockResolvedValue({
        id: 'emp_ref_01',
        tenantId,
        companyId,
        employeeNumber: 'EMP-0001',
        firstName: 'Rakesh',
        lastName: 'Kumar',
        fullName: 'Rakesh Kumar',
        email: 'rakesh@example.com',
        phone: null,
        departmentId: 'dept_1',
        departmentName: 'Engineering',
        designationId: 'desig_1',
        designationName: 'Tech Lead',
        locationId: null,
        locationName: null,
        reportingManagerId: null,
        reportingManagerName: null,
        joiningDate: '2025-01-01',
        confirmedJoiningDate: null,
        probationEndDate: null,
        confirmationDate: null,
        lastWorkingDate: null,
        sourceOfHire: null,
        referralCode: 'REF-EMP0001',
        referredByEmployeeId: null,
        referredByName: null,
        noticePeriodDays: null,
        contractEndDate: null,
        employmentType: 'full_time',
        employmentStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as EmployeeDetails);

      const resolved = await service.resolveReferral(tenantId, companyId, 'REF-EMP0001');
      expect(resolved).toEqual({
        id: 'emp_ref_01',
        employeeNumber: 'EMP-0001',
        name: 'Rakesh Kumar',
        designationName: 'Tech Lead',
        departmentName: 'Engineering',
      });
      expect(mockRepo.getByReferralCode).toHaveBeenCalledWith(tenantId, companyId, 'REF-EMP0001');
    });

    it('throws NotFoundError for non-existent referral code', async () => {
      vi.mocked(mockRepo.getByReferralCode!).mockResolvedValue(null);
      await expect(service.resolveReferral(tenantId, companyId, 'INVALID-CODE')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws BadRequestError if referral code is empty', async () => {
      await expect(service.resolveReferral(tenantId, companyId, '  ')).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  describe('Fixed-Term End Date Validation', () => {
    const validBase = {
      employeeNumber: 'EMP-100',
      firstName: 'Charlie',
      email: 'charlie@example.com',
      joiningDate: '2026-06-01',
    };

    it('allows contractEndDate for contract employment type', () => {
      const res = validateCreateEmployee({
        ...validBase,
        employmentType: 'contract',
        contractEndDate: '2026-12-31',
      });
      expect(res.contractEndDate).toBe('2026-12-31');
    });

    it('allows contractEndDate for intern employment type', () => {
      const res = validateCreateEmployee({
        ...validBase,
        employmentType: 'intern',
        contractEndDate: '2026-09-01',
      });
      expect(res.contractEndDate).toBe('2026-09-01');
    });

    it('ignores/clears contractEndDate for full_time employment type', () => {
      const res = validateCreateEmployee({
        ...validBase,
        employmentType: 'full_time',
        contractEndDate: '2026-12-31',
      });
      expect(res.contractEndDate).toBeNull();
    });

    it('rejects contractEndDate if before joiningDate', () => {
      expect(() =>
        validateCreateEmployee({
          ...validBase,
          employmentType: 'contract',
          contractEndDate: '2026-05-01', // before joiningDate 2026-06-01
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('Personal Information: DOB, Emails, Phones, Parents, Address', () => {
    it('rejects future Date of Birth', () => {
      const futureDate = '2099-01-01';
      expect(() =>
        validateEmployeeRecordSection('personal', {
          dateOfBirth: futureDate,
        }),
      ).toThrow(ValidationError);
    });

    it('accepts valid past Date of Birth', () => {
      const res = validateEmployeeRecordSection('personal', {
        dateOfBirth: '1995-05-18',
      });
      expect(res.dateOfBirth).toBe('1995-05-18');
    });

    it('validates personal email format', () => {
      expect(() =>
        validateEmployeeRecordSection('personal', {
          personalEmail: 'invalid-email',
        }),
      ).toThrow(ValidationError);

      const res = validateEmployeeRecordSection('personal', {
        personalEmail: 'valid.user@gmail.com',
      });
      expect(res.personalEmail).toBe('valid.user@gmail.com');
    });

    it('validates structured repeatable parentGuardians details', () => {
      const res = validateEmployeeRecordDetails({
        parentGuardians: [
          { name: 'Ramesh Kumar', relationship: 'Father' },
          { name: 'Sita Kumar', relationship: 'Mother' },
        ],
      });
      expect(res.parentGuardians).toHaveLength(2);
      expect(res.parentGuardians![0]).toEqual({
        name: 'Ramesh Kumar',
        relationship: 'Father',
      });
      expect(res.parentGuardians![1]).toEqual({
        name: 'Sita Kumar',
        relationship: 'Mother',
      });
    });

    it('automatically mirrors current address into permanent address when isPermanentSameAsCurrent is true', () => {
      const res = validateEmployeeRecordSection('personal', {
        isPermanentSameAsCurrent: true,
        addressStreet: '123 Tech Park',
        addressLine2: 'Phase 2',
        addressCity: 'Chennai',
        addressDistrict: 'Chennai',
        addressState: 'Tamil Nadu',
        addressPostalCode: '600001',
        addressCountry: 'India',
      });

      expect(res.isPermanentSameAsCurrent).toBe(true);
      expect(res.permanentAddressStreet).toBe('123 Tech Park');
      expect(res.permanentAddressLine2).toBe('Phase 2');
      expect(res.permanentAddressCity).toBe('Chennai');
      expect(res.permanentAddressDistrict).toBe('Chennai');
      expect(res.permanentAddressState).toBe('Tamil Nadu');
      expect(res.permanentAddressPostalCode).toBe('600001');
      expect(res.permanentAddressCountry).toBe('India');
    });

    it('preserves separate permanent address when isPermanentSameAsCurrent is false', () => {
      const res = validateEmployeeRecordSection('personal', {
        isPermanentSameAsCurrent: false,
        addressStreet: '123 Current St',
        addressCity: 'Bengaluru',
        permanentAddressStreet: '456 Native St',
        permanentAddressCity: 'Mysuru',
        permanentAddressState: 'Karnataka',
      });

      expect(res.isPermanentSameAsCurrent).toBe(false);
      expect(res.addressStreet).toBe('123 Current St');
      expect(res.addressCity).toBe('Bengaluru');
      expect(res.permanentAddressStreet).toBe('456 Native St');
      expect(res.permanentAddressCity).toBe('Mysuru');
      expect(res.permanentAddressState).toBe('Karnataka');
    });
  });
});
