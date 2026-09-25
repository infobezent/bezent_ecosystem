import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeService } from '../service/employee.service.js';
import type { EmployeeRepository } from '../repository/employee.repository.js';
import type { OrganizationRepository } from '../../organization/repository/organization.repository.js';
import { ConflictError, NotFoundError, BadRequestError } from '../../../../app/errors/AppError.js';
import type { Employee } from '../../../../db/schema.js';
import type { EmployeeDetails } from '../types/employee.types.js';

describe('EmployeeService', () => {
  let mockRepo: Partial<EmployeeRepository>;
  let mockOrgRepo: Partial<OrganizationRepository>;
  let service: EmployeeService;

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';

  const sampleEmployee: EmployeeDetails = {
    id: 'emp_123',
    tenantId,
    companyId,
    employeeNumber: 'EMP-001',
    userId: null,
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    departmentId: 'dept_01',
    departmentName: 'Engineering',
    designationId: 'desig_01',
    designationName: 'Software Engineer',
    locationId: 'loc_01',
    locationName: 'Headquarters',
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2026-10-01',
    confirmedJoiningDate: null,
    probationEndDate: null,
    confirmationDate: null,
    lastWorkingDate: null,
    sourceOfHire: null,
    noticePeriodDays: null,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'probation',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleEmployeeRecord: Employee = {
    id: 'emp_123',
    tenantId,
    companyId,
    employeeNumber: 'EMP-001',
    userId: null,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    departmentId: 'dept_01',
    designationId: 'desig_01',
    locationId: 'loc_01',
    reportingManagerId: null,
    joiningDate: '2026-10-01',
    confirmedJoiningDate: null,
    probationEndDate: null,
    confirmationDate: null,
    lastWorkingDate: null,
    sourceOfHire: null,
    noticePeriodDays: null,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'probation',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      getById: vi.fn(),
      getByEmployeeNumber: vi.fn(),
      getByEmail: vi.fn(),
      listPaginated: vi.fn(),
      update: vi.fn(),
    };

    mockOrgRepo = {
      getMasters: vi.fn().mockResolvedValue({
        company: { id: companyId, name: 'BEZENT Demo Pvt Ltd', code: 'BZ-DEMO' },
        departments: [{ id: 'dept_01', name: 'Engineering', code: 'ENG' }],
        designations: [{ id: 'desig_01', name: 'Software Engineer', code: 'SWE' }],
        locations: [
          { id: 'loc_01', name: 'Headquarters', code: 'HQ', city: 'City', country: 'Country' },
        ],
      }),
    };

    service = new EmployeeService(
      mockRepo as EmployeeRepository,
      mockOrgRepo as OrganizationRepository,
    );
  });

  describe('createEmployee', () => {
    const input = {
      employeeNumber: 'EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      joiningDate: '2026-10-01',
      departmentId: 'dept_01',
      designationId: 'desig_01',
      locationId: 'loc_01',
    };

    it('creates an employee successfully when inputs and masters are valid', async () => {
      vi.mocked(mockRepo.getByEmployeeNumber!).mockResolvedValue(null);
      vi.mocked(mockRepo.getByEmail!).mockResolvedValue(null);
      vi.mocked(mockRepo.create!).mockResolvedValue(sampleEmployeeRecord);
      vi.mocked(mockRepo.getById!).mockResolvedValue(sampleEmployee);

      const result = await service.createEmployee(tenantId, companyId, input);

      expect(result.id).toBe('emp_123');
      expect(result.fullName).toBe('John Doe');
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          employeeNumber: 'EMP-001',
          email: 'john.doe@example.com',
          firstName: 'John',
        }),
      );
    });

    it('throws ConflictError when employeeNumber already exists within company', async () => {
      vi.mocked(mockRepo.getByEmployeeNumber!).mockResolvedValue(sampleEmployeeRecord);

      await expect(service.createEmployee(tenantId, companyId, input)).rejects.toThrow(
        ConflictError,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws ConflictError when email already exists within company', async () => {
      vi.mocked(mockRepo.getByEmployeeNumber!).mockResolvedValue(null);
      vi.mocked(mockRepo.getByEmail!).mockResolvedValue(sampleEmployeeRecord);

      await expect(service.createEmployee(tenantId, companyId, input)).rejects.toThrow(
        ConflictError,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when department does not belong to the company', async () => {
      vi.mocked(mockRepo.getByEmployeeNumber!).mockResolvedValue(null);
      vi.mocked(mockRepo.getByEmail!).mockResolvedValue(null);

      await expect(
        service.createEmployee(tenantId, companyId, {
          ...input,
          departmentId: 'dept_unrelated',
        }),
      ).rejects.toThrow(BadRequestError);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when designation does not belong to the company', async () => {
      vi.mocked(mockRepo.getByEmployeeNumber!).mockResolvedValue(null);
      vi.mocked(mockRepo.getByEmail!).mockResolvedValue(null);

      await expect(
        service.createEmployee(tenantId, companyId, {
          ...input,
          designationId: 'desig_unrelated',
        }),
      ).rejects.toThrow(BadRequestError);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when location does not belong to the company', async () => {
      vi.mocked(mockRepo.getByEmployeeNumber!).mockResolvedValue(null);
      vi.mocked(mockRepo.getByEmail!).mockResolvedValue(null);

      await expect(
        service.createEmployee(tenantId, companyId, {
          ...input,
          locationId: 'loc_unrelated',
        }),
      ).rejects.toThrow(BadRequestError);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getEmployeeById', () => {
    it('returns employee details when found', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(sampleEmployee);

      const result = await service.getEmployeeById(tenantId, companyId, 'emp_123');
      expect(result.id).toBe('emp_123');
      expect(result.employeeNumber).toBe('EMP-001');
    });

    it('throws NotFoundError when employee does not exist', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(null);

      await expect(service.getEmployeeById(tenantId, companyId, 'emp_nonexistent')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('updateEmployee', () => {
    it('updates employee fields successfully', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(sampleEmployee);
      vi.mocked(mockRepo.update!).mockResolvedValue({
        ...sampleEmployee,
        firstName: 'Jonathan',
        fullName: 'Jonathan Doe',
      });

      const updated = await service.updateEmployee(tenantId, companyId, 'emp_123', {
        firstName: 'Jonathan',
      });

      expect(updated.firstName).toBe('Jonathan');
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('throws ConflictError if updating email to another existing employee email', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(sampleEmployee);
      vi.mocked(mockRepo.getByEmail!).mockResolvedValue({
        ...sampleEmployeeRecord,
        id: 'emp_another_user',
        email: 'other@example.com',
      });

      await expect(
        service.updateEmployee(tenantId, companyId, 'emp_123', {
          email: 'other@example.com',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
