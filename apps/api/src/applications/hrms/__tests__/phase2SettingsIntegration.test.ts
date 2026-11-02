import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeService } from '../employees/service/employee.service.js';
import type { EmployeeRepository } from '../employees/repository/employee.repository.js';
import type { OrganizationRepository } from '../../../platform/organization/repository/organization.repository.js';
import { workforceSettingsService } from '../workforce/service/workforceSettings.service.js';
import { attendancePolicyService } from '../attendance/service/attendancePolicy.service.js';
import { attendanceSettingsService } from '../attendance/service/attendanceSettings.service.js';
import { BadRequestError, ConflictError } from '../../../app/errors/AppError.js';
import type { Employee } from '../../../db/schema.js';
import type { EmployeeDetails } from '../employees/types/employee.types.js';
import type { AttendancePolicy } from '../attendance/types/attendance.types.js';

describe('BEZENT HRMS — Phase 2: Settings Integration & Business Logic Enforcement', () => {
  const tenantId = 'tenant_phase2_audit';
  const companyId = 'comp_phase2_audit';

  describe('P0 — Workforce Numbering Settings (generationMode & allowManualOverride)', () => {
    let mockRepo: Partial<EmployeeRepository>;
    let mockOrgRepo: Partial<OrganizationRepository>;
    let employeeService: EmployeeService;

    const baseInput = {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      phone: '+919876543210',
      joiningDate: '2026-02-01',
      departmentId: 'dept_01',
      designationId: 'desig_01',
      locationId: 'loc_01',
    };

    const sampleEmployeeRecord: Employee = {
      id: 'emp_p2_1',
      tenantId,
      companyId,
      employeeNumber: 'EMP-1001',
      userId: null,
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      phone: '+919876543210',
      departmentId: 'dept_01',
      designationId: 'desig_01',
      locationId: 'loc_01',
      reportingManagerId: null,
      joiningDate: '2026-02-01',
      confirmedJoiningDate: null,
      probationEndDate: '2026-05-02',
      confirmationDate: null,
      lastWorkingDate: null,
      sourceOfHire: null,
      noticePeriodDays: null,
      contractEndDate: null,
      employmentType: 'full_time',
      employmentStatus: 'probation',
      referralCode: 'REF-EMP1001',
      referredByEmployeeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sampleEmployeeDetails: EmployeeDetails = {
      ...sampleEmployeeRecord,
      fullName: 'Alice Smith',
      departmentName: 'Engineering',
      designationName: 'Software Engineer',
      locationName: 'Bangalore HQ',
      reportingManagerName: null,
      referredByName: null,
    };

    beforeEach(() => {
      mockRepo = {
        create: vi.fn().mockResolvedValue(sampleEmployeeRecord),
        getById: vi.fn().mockResolvedValue(sampleEmployeeDetails),
        getByEmployeeNumber: vi.fn().mockResolvedValue(null),
        getByEmail: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      };

      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          company: { id: companyId, name: 'Audit Company', code: 'AUD' },
          departments: [{ id: 'dept_01', name: 'Engineering', code: 'ENG' }],
          designations: [{ id: 'desig_01', name: 'Software Engineer', code: 'SWE' }],
          locations: [{ id: 'loc_01', name: 'Bangalore HQ', code: 'BLR', city: 'BLR', country: 'IN' }],
        }),
      };

      employeeService = new EmployeeService(
        mockRepo as EmployeeRepository,
        mockOrgRepo as OrganizationRepository,
      );
    });

    it('requires employeeNumber when generationMode === "manual" and rejects empty number', async () => {
      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wgs_1',
        tenantId,
        companyId,
        generationMode: 'manual',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
        nextSuggestedId: 'EMP-1001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        employeeService.createEmployee(tenantId, companyId, {
          ...baseInput,
          employeeNumber: undefined, // No employee number provided in manual mode
        }),
      ).rejects.toThrow(BadRequestError);

      try {
        await employeeService.createEmployee(tenantId, companyId, {
          ...baseInput,
          employeeNumber: undefined,
        });
      } catch (err: any) {
        expect(err.code).toBe('EMPLOYEE_NUMBER_REQUIRED');
      }
    });

    it('rejects manual employeeNumber when generationMode === "automatic" and allowManualOverride === false', async () => {
      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wgs_1',
        tenantId,
        companyId,
        generationMode: 'automatic',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: false, // Disallow manual override
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
        nextSuggestedId: 'EMP-1001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        employeeService.createEmployee(tenantId, companyId, {
          ...baseInput,
          employeeNumber: 'CUSTOM-999', // User tries to manually override
        }),
      ).rejects.toThrow(BadRequestError);

      try {
        await employeeService.createEmployee(tenantId, companyId, {
          ...baseInput,
          employeeNumber: 'CUSTOM-999',
        });
      } catch (err: any) {
        expect(err.code).toBe('MANUAL_NUMBER_OVERRIDE_PROHIBITED');
      }
    });

    it('accepts manual employeeNumber when generationMode === "automatic" and allowManualOverride === true', async () => {
      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wgs_1',
        tenantId,
        companyId,
        generationMode: 'automatic',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
        nextSuggestedId: 'EMP-1001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await employeeService.createEmployee(tenantId, companyId, {
        ...baseInput,
        employeeNumber: 'CUSTOM-100',
      });

      expect(res.id).toBe('emp_p2_1');
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({ employeeNumber: 'CUSTOM-100' }),
      );
    });

    it('automatically reserves next sequence number when generationMode === "automatic" and no number is passed', async () => {
      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wgs_1',
        tenantId,
        companyId,
        generationMode: 'automatic',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
        nextSuggestedId: 'EMP-1001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(workforceSettingsService, 'reserveNextEmployeeId').mockResolvedValue({
        nextId: 'EMP-1001',
        prefix: 'EMP-',
        sequenceNumber: 1001,
        suffix: null,
      });

      const res = await employeeService.createEmployee(tenantId, companyId, {
        ...baseInput,
        employeeNumber: undefined,
      });

      expect(res.id).toBe('emp_p2_1');
      expect(workforceSettingsService.reserveNextEmployeeId).toHaveBeenCalledWith(
        tenantId,
        companyId,
        undefined,
      );
    });
  });

  describe('P1 — Probation Defaulting (joiningDate + defaultProbationDays)', () => {
    let mockRepo: Partial<EmployeeRepository>;
    let mockOrgRepo: Partial<OrganizationRepository>;
    let employeeService: EmployeeService;

    beforeEach(() => {
      mockRepo = {
        create: vi.fn().mockImplementation((_t, _c, dto) => Promise.resolve({ id: 'emp_p2_prob', ...dto })),
        getById: vi.fn().mockImplementation((_t, _c, id) =>
          Promise.resolve({
            id,
            tenantId,
            companyId,
            employeeNumber: 'EMP-2001',
            firstName: 'Bob',
            lastName: 'Builder',
            fullName: 'Bob Builder',
            email: 'bob@example.com',
            phone: '+919876543210',
            joiningDate: '2026-01-01',
            probationEndDate: '2026-04-01',
            employmentStatus: 'probation',
          }),
        ),
        getByEmployeeNumber: vi.fn().mockResolvedValue(null),
        getByEmail: vi.fn().mockResolvedValue(null),
      };

      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          company: { id: companyId, name: 'Audit Company', code: 'AUD' },
          departments: [{ id: 'dept_01', name: 'Engineering', code: 'ENG' }],
          designations: [{ id: 'desig_01', name: 'Software Engineer', code: 'SWE' }],
          locations: [{ id: 'loc_01', name: 'Bangalore HQ', code: 'BLR', city: 'BLR', country: 'IN' }],
        }),
      };

      employeeService = new EmployeeService(
        mockRepo as EmployeeRepository,
        mockOrgRepo as OrganizationRepository,
      );

      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wgs_1',
        tenantId,
        companyId,
        generationMode: 'automatic',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
        nextSuggestedId: 'EMP-1001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(workforceSettingsService, 'reserveNextEmployeeId').mockResolvedValue({
        nextId: 'EMP-2001',
        prefix: 'EMP-',
        sequenceNumber: 2001,
        suffix: null,
      });
    });

    it('calculates probationEndDate = joiningDate + 90 days for probation employee without explicit date', async () => {
      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockResolvedValue({
        id: 'wpp_1',
        tenantId,
        companyId,
        defaultProbationDays: 90,
        confirmationMode: 'manager_review',
        reminderLeadDays: 14,
        maxExtensionDays: 90,
        maxExtensionsAllowed: 1,
        autoGenerateLetter: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await employeeService.createEmployee(tenantId, companyId, {
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob@example.com',
        phone: '+919876543210',
        joiningDate: '2026-01-01',
        departmentId: 'dept_01',
        designationId: 'desig_01',
        locationId: 'loc_01',
        employmentStatus: 'probation',
        probationEndDate: undefined,
      });

      // 2026-01-01 + 90 days = 2026-04-01
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: '2026-04-01',
        }),
      );
    });

    it('correctly handles month/year boundary for joiningDate in December', async () => {
      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockResolvedValue({
        id: 'wpp_1',
        tenantId,
        companyId,
        defaultProbationDays: 90,
        confirmationMode: 'manager_review',
        reminderLeadDays: 14,
        maxExtensionDays: 90,
        maxExtensionsAllowed: 1,
        autoGenerateLetter: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await employeeService.createEmployee(tenantId, companyId, {
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob.dec@example.com',
        phone: '+919876543210',
        joiningDate: '2025-12-01',
        departmentId: 'dept_01',
        designationId: 'desig_01',
        locationId: 'loc_01',
        employmentStatus: 'probation',
        probationEndDate: undefined,
      });

      // 2025-12-01 + 90 days = 2026-03-01
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: '2026-03-01',
        }),
      );
    });

    it('preserves explicit probationEndDate when provided by caller', async () => {
      await employeeService.createEmployee(tenantId, companyId, {
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob.explicit@example.com',
        phone: '+919876543210',
        joiningDate: '2026-01-01',
        departmentId: 'dept_01',
        designationId: 'desig_01',
        locationId: 'loc_01',
        employmentStatus: 'probation',
        probationEndDate: '2026-07-01', // Custom explicit end date
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: '2026-07-01',
        }),
      );
    });
  });

  describe('P0 — Employee Lifecycle Transitions', () => {
    let mockRepo: Partial<EmployeeRepository>;
    let mockOrgRepo: Partial<OrganizationRepository>;
    let employeeService: EmployeeService;

    const createSampleEmployee = (status: any): EmployeeDetails => ({
      id: 'emp_lifecycle_1',
      tenantId,
      companyId,
      employeeNumber: 'EMP-3001',
      userId: null,
      firstName: 'Charlie',
      lastName: 'Brown',
      fullName: 'Charlie Brown',
      email: 'charlie@example.com',
      phone: '+919876543210',
      departmentId: null,
      departmentName: null,
      designationId: null,
      designationName: null,
      locationId: null,
      locationName: null,
      reportingManagerId: null,
      reportingManagerName: null,
      joiningDate: '2026-01-01',
      confirmedJoiningDate: null,
      probationEndDate: null,
      confirmationDate: null,
      lastWorkingDate: null,
      sourceOfHire: null,
      noticePeriodDays: null,
      contractEndDate: null,
      employmentType: 'full_time',
      employmentStatus: status,
      referralCode: null,
      referredByEmployeeId: null,
      referredByName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    beforeEach(() => {
      mockRepo = {
        getById: vi.fn(),
        update: vi.fn().mockImplementation((_t, _c, id, dto) => Promise.resolve({ id, ...dto })),
        getByEmail: vi.fn().mockResolvedValue(null),
      };

      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          company: { id: companyId, name: 'Audit Company', code: 'AUD' },
          departments: [],
          designations: [],
          locations: [],
        }),
      };

      employeeService = new EmployeeService(
        mockRepo as EmployeeRepository,
        mockOrgRepo as OrganizationRepository,
      );
    });

    it('allows valid transition: probation -> active (confirmation)', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(createSampleEmployee('probation'));

      const res = await employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
        employmentStatus: 'active',
      });

      expect(res.employmentStatus).toBe('active');
    });

    it('allows valid transition: active -> notice (resignation tendered)', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(createSampleEmployee('active'));

      const res = await employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
        employmentStatus: 'notice',
      });

      expect(res.employmentStatus).toBe('notice');
    });

    it('allows valid transition: notice -> resigned (separation completed)', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(createSampleEmployee('notice'));

      const res = await employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
        employmentStatus: 'resigned',
      });

      expect(res.employmentStatus).toBe('resigned');
    });

    it('rejects invalid transition: terminated -> active with INVALID_STATUS_TRANSITION', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(createSampleEmployee('terminated'));

      await expect(
        employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
          employmentStatus: 'active',
        }),
      ).rejects.toThrow(BadRequestError);

      try {
        await employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
          employmentStatus: 'active',
        });
      } catch (err: any) {
        expect(err.code).toBe('INVALID_STATUS_TRANSITION');
      }
    });

    it('rejects invalid transition: active -> probation with INVALID_STATUS_TRANSITION', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(createSampleEmployee('active'));

      await expect(
        employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
          employmentStatus: 'probation',
        }),
      ).rejects.toThrow(BadRequestError);

      try {
        await employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
          employmentStatus: 'probation',
        });
      } catch (err: any) {
        expect(err.code).toBe('INVALID_STATUS_TRANSITION');
      }
    });

    it('rejects invalid transition: resigned -> active with INVALID_STATUS_TRANSITION', async () => {
      vi.mocked(mockRepo.getById!).mockResolvedValue(createSampleEmployee('resigned'));

      await expect(
        employeeService.updateEmployee(tenantId, companyId, 'emp_lifecycle_1', {
          employmentStatus: 'active',
        }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('P0 — Attendance Legacy Route Policy Immutability', () => {
    it('enforces policy immutability through attendancePolicyService.updatePolicy on published policies', async () => {
      const publishedPolicy = {
        id: 'pol_pub_1',
        tenantId,
        companyId,
        policyName: 'Published Corp Policy',
        version: 1,
        status: 'published',
        scope: 'company',
        scopeId: null,
        overridesPriority: 0,
        effectiveFrom: '2026-01-01',
        halfDayThresholdHours: '4.00',
        fullDayThresholdHours: '8.00',
        gracePeriodMinutes: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as AttendancePolicy;

      vi.spyOn(attendancePolicyService, 'getPolicy').mockResolvedValue(publishedPolicy);
      vi.spyOn(attendanceSettingsService, 'getPolicyById').mockResolvedValue(publishedPolicy);

      // Attempting to update a published policy through legacy updatePolicy route
      await expect(
        attendancePolicyService.updatePolicy(tenantId, companyId, {
          policyName: 'Hacked Policy Name',
          halfDayThresholdHours: 3.5,
        }),
      ).rejects.toThrow(BadRequestError);

      try {
        await attendancePolicyService.updatePolicy(tenantId, companyId, {
          policyName: 'Hacked Policy Name',
        });
      } catch (err: any) {
        expect(err.code).toBe('POLICY_IMMUTABLE');
        expect(err.message).toContain('Published and archived policies are immutable');
      }
    });

    it('allows editing draft policies through attendancePolicyService.updatePolicy', async () => {
      const draftPolicy = {
        id: 'pol_draft_1',
        tenantId,
        companyId,
        policyName: 'Draft Corporate Policy',
        version: 2,
        status: 'draft',
        scope: 'company',
        scopeId: null,
        overridesPriority: 0,
        effectiveFrom: '2026-06-01',
        halfDayThresholdHours: '4.00',
        fullDayThresholdHours: '8.00',
        gracePeriodMinutes: 15,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as AttendancePolicy;

      vi.spyOn(attendancePolicyService, 'getPolicy').mockResolvedValue(draftPolicy);
      vi.spyOn(attendanceSettingsService, 'updatePolicy').mockResolvedValue({
        ...draftPolicy,
        policyName: 'Updated Draft Corporate Policy',
        gracePeriodMinutes: 20,
      });

      const updated = await attendancePolicyService.updatePolicy(tenantId, companyId, {
        policyName: 'Updated Draft Corporate Policy',
        gracePeriodMinutes: 20,
      });

      expect(updated.policyName).toBe('Updated Draft Corporate Policy');
      expect(updated.gracePeriodMinutes).toBe(20);
      expect(attendanceSettingsService.updatePolicy).toHaveBeenCalledWith(
        tenantId,
        companyId,
        'pol_draft_1',
        expect.objectContaining({ policyName: 'Updated Draft Corporate Policy' }),
        undefined,
      );
    });
  });
});
