import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { attendanceRouter } from '../attendance/routes/attendance.routes.js';
import { attendancePolicyService } from '../attendance/service/attendancePolicy.service.js';
import { attendanceSettingsService } from '../attendance/service/attendanceSettings.service.js';
import { EmployeeService } from '../employees/service/employee.service.js';
import type { EmployeeRepository } from '../employees/repository/employee.repository.js';
import type { OrganizationRepository } from '../../../platform/organization/repository/organization.repository.js';
import { workforceSettingsService } from '../workforce/service/workforceSettings.service.js';
import type { AttendancePolicy } from '../attendance/types/attendance.types.js';
import type { Employee } from '../../../db/schema.js';
import type { EmployeeDetails } from '../employees/types/employee.types.js';
import { errorHandler } from '../../../app/errors/errorHandler.js';

describe('BEZENT HRMS — Phase 2.1 Security & Reliability Hotfix Suite', () => {
  const tenantId = 'tenant_hotfix_01';
  const companyId = 'comp_hotfix_01';

  // ═════════════════════════════════════════════════════════════════════════════
  // FIX 1: ATTENDANCE POLICY ROUTE AUTHORIZATION & IMMUTABILITY
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Fix 1 — Attendance Legacy Policy Authorization & Immutability', () => {
    let mockPermissions: string[];

    const createTestApp = () => {
      const app = express();
      app.use(express.json());

      // Simulate authenticated company access context
      app.use((req, _res, next) => {
        req.user = { id: 'usr_test_operator', email: 'test@example.com' } as any;
        req.companyContext = { tenantId, companyId };
        req.access = {
          tenantId,
          companyId,
          userId: 'usr_test_operator',
          isSuperAdmin: false,
          isTenantAdmin: false,
          roles: [],
          permissions: mockPermissions,
          workspaces: ['hrms'],
        } as any;
        next();
      });

      app.use('/api/v1', attendanceRouter);
      app.use(errorHandler);
      return app;
    };

    beforeEach(() => {
      mockPermissions = [];
      vi.restoreAllMocks();
    });

    it('denies PUT /hrms/attendance/policies when user has hrms.attendance.regularize but lacks hrms.settings.manage (403 Forbidden)', async () => {
      // User is an attendance regularizer, but not an HR settings manager
      mockPermissions = ['hrms.attendance.view', 'hrms.attendance.regularize'];
      const app = createTestApp();

      const res = await request(app)
        .put('/api/v1/hrms/attendance/policies')
        .send({
          policyName: 'Unauthorized Policy Change',
          halfDayThresholdHours: 4.5,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN_PERMISSION');
      expect(res.body.error.message).toContain('hrms.settings.manage');
    });

    it('allows PUT /hrms/attendance/policies when user holds hrms.settings.manage along with required attendance permissions', async () => {
      mockPermissions = [
        'hrms.attendance.view',
        'hrms.attendance.regularize',
        'hrms.settings.manage',
      ];
      const app = createTestApp();

      const draftPolicy = {
        id: 'pol_draft_hotfix_1',
        tenantId,
        companyId,
        policyName: 'Draft Attendance Policy',
        version: 1,
        status: 'draft',
        scope: 'company',
        effectiveFrom: '2026-06-01',
        halfDayThresholdHours: '4.00',
        fullDayThresholdHours: '8.00',
        gracePeriodMinutes: 15,
        isActive: false,
      } as unknown as AttendancePolicy;

      vi.spyOn(attendancePolicyService, 'getPolicy').mockResolvedValue(draftPolicy);
      vi.spyOn(attendanceSettingsService, 'getPolicyById').mockResolvedValue(draftPolicy);
      vi.spyOn(attendanceSettingsService, 'updatePolicy').mockResolvedValue({
        ...draftPolicy,
        gracePeriodMinutes: 25,
      });

      const res = await request(app)
        .put('/api/v1/hrms/attendance/policies')
        .send({
          gracePeriodMinutes: 25,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.gracePeriodMinutes).toBe(25);
    });

    it('preserves published policy immutability on PUT /hrms/attendance/policies even when authorized (POLICY_IMMUTABLE)', async () => {
      mockPermissions = [
        'hrms.attendance.view',
        'hrms.attendance.regularize',
        'hrms.settings.manage',
      ];
      const app = createTestApp();

      const publishedPolicy = {
        id: 'pol_published_hotfix_1',
        tenantId,
        companyId,
        policyName: 'Published Attendance Policy',
        version: 1,
        status: 'published',
        scope: 'company',
        effectiveFrom: '2026-01-01',
        halfDayThresholdHours: '4.00',
        fullDayThresholdHours: '8.00',
        gracePeriodMinutes: 15,
        isActive: true,
      } as unknown as AttendancePolicy;

      vi.spyOn(attendancePolicyService, 'getPolicy').mockResolvedValue(publishedPolicy);
      vi.spyOn(attendanceSettingsService, 'getPolicyById').mockResolvedValue(publishedPolicy);

      const res = await request(app)
        .put('/api/v1/hrms/attendance/policies')
        .send({
          gracePeriodMinutes: 30,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('POLICY_IMMUTABLE');
      expect(res.body.error.message).toContain('Published and archived policies are immutable');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FIX 2: PROBATION POLICY ERROR HANDLING & DEFAULTING
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Fix 2 — Probation Policy Error Handling & Defaulting', () => {
    let mockRepo: Partial<EmployeeRepository>;
    let mockOrgRepo: Partial<OrganizationRepository>;
    let employeeService: EmployeeService;

    const baseInput = {
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@example.com',
      phone: '+919876543210',
      joiningDate: '2026-03-01',
      employmentStatus: 'probation' as const,
      departmentId: 'dept_01',
      designationId: 'desig_01',
      locationId: 'loc_01',
    };

    const sampleEmployeeRecord: Employee = {
      id: 'emp_hotfix_prob_1',
      tenantId,
      companyId,
      employeeNumber: 'EMP-7001',
      userId: null,
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@example.com',
      phone: '+919876543210',
      departmentId: 'dept_01',
      designationId: 'desig_01',
      locationId: 'loc_01',
      reportingManagerId: null,
      joiningDate: '2026-03-01',
      confirmedJoiningDate: null,
      probationEndDate: '2026-05-30',
      confirmationDate: null,
      lastWorkingDate: null,
      sourceOfHire: null,
      noticePeriodDays: null,
      contractEndDate: null,
      employmentType: 'full_time',
      employmentStatus: 'probation',
      referralCode: 'REF-EMP7001',
      referredByEmployeeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sampleEmployeeDetails: EmployeeDetails = {
      ...sampleEmployeeRecord,
      fullName: 'Robert Taylor',
      departmentName: 'Engineering',
      designationName: 'Software Engineer',
      locationName: 'HQ',
      reportingManagerName: null,
      referredByName: null,
    };

    beforeEach(() => {
      mockRepo = {
        create: vi.fn().mockImplementation((_t, _c, dto) =>
          Promise.resolve({ id: 'emp_hotfix_prob_1', ...dto, createdAt: new Date(), updatedAt: new Date() }),
        ),
        getById: vi.fn().mockResolvedValue(sampleEmployeeDetails),
        getByEmployeeNumber: vi.fn().mockResolvedValue(null),
        getByEmail: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      };

      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          company: { id: companyId, name: 'Hotfix Company', code: 'HF' },
          departments: [{ id: 'dept_01', name: 'Engineering', code: 'ENG' }],
          designations: [{ id: 'desig_01', name: 'Software Engineer', code: 'SWE' }],
          locations: [{ id: 'loc_01', name: 'HQ', code: 'HQ', city: 'City', country: 'Country' }],
        }),
      };

      employeeService = new EmployeeService(
        mockRepo as EmployeeRepository,
        mockOrgRepo as OrganizationRepository,
      );

      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wgs_hotfix_1',
        tenantId,
        companyId,
        generationMode: 'automatic',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 7001,
        currentCounter: 7000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
        nextSuggestedId: 'EMP-7001',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(workforceSettingsService, 'reserveNextEmployeeId').mockResolvedValue({
        nextId: 'EMP-7001',
        prefix: 'EMP-',
        sequenceNumber: 7001,
        suffix: null,
      });
    });

    it('calculates probationEndDate using existing configured probation duration', async () => {
      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockResolvedValue({
        id: 'wpp_1',
        tenantId,
        companyId,
        defaultProbationDays: 60, // Configured for 60 days
        confirmationMode: 'manager_review',
        reminderLeadDays: 14,
        maxExtensionDays: 90,
        maxExtensionsAllowed: 1,
        autoGenerateLetter: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await employeeService.createEmployee(tenantId, companyId, baseInput);

      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: '2026-04-30', // 2026-03-01 + 60 days
        }),
      );
    });

    it('falls back to documented 90-day default when no probation policy is configured', async () => {
      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockResolvedValue(null as any);

      await employeeService.createEmployee(tenantId, companyId, baseInput);

      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: '2026-05-30', // 2026-03-01 + 90 days
        }),
      );
    });

    it('propagates database connectivity errors and query failures clearly without silent suppression', async () => {
      // Simulate fatal database error during policy lookup
      const dbError = new Error('Database connection terminated: ECONNREFUSED on port 3306');
      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockRejectedValue(dbError);

      await expect(
        employeeService.createEmployee(tenantId, companyId, baseInput),
      ).rejects.toThrow('Database connection terminated: ECONNREFUSED on port 3306');

      // Crucial: Employee record must NOT have been created when database lookup failed
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('handles invalid policy values: negative or NaN falls back to 90 days; zero leaves probationEndDate unset', async () => {
      // 1. Negative value -> safe fallback to 90 days
      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockResolvedValue({
        id: 'wpp_neg',
        tenantId,
        companyId,
        defaultProbationDays: -15, // Invalid negative duration
        confirmationMode: 'manager_review',
        reminderLeadDays: 14,
        maxExtensionDays: 90,
        maxExtensionsAllowed: 1,
        autoGenerateLetter: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await employeeService.createEmployee(tenantId, companyId, baseInput);
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: '2026-05-30', // Default 90 days
        }),
      );

      // 2. Zero days -> no probation period
      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockResolvedValue({
        id: 'wpp_zero',
        tenantId,
        companyId,
        defaultProbationDays: 0, // Zero days means no probation
        confirmationMode: 'manager_review',
        reminderLeadDays: 14,
        maxExtensionDays: 90,
        maxExtensionsAllowed: 1,
        autoGenerateLetter: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await employeeService.createEmployee(tenantId, companyId, {
        ...baseInput,
        email: 'zero.probation@example.com',
      });
      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: null,
        }),
      );
    });

    it('preserves explicit caller-provided probationEndDate and avoids calling getProbationPolicy', async () => {
      const getProbationSpy = vi.spyOn(workforceSettingsService, 'getProbationPolicy');

      await employeeService.createEmployee(tenantId, companyId, {
        ...baseInput,
        probationEndDate: '2026-12-31', // Explicit date from caller
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          probationEndDate: '2026-12-31',
        }),
      );
      expect(getProbationSpy).not.toHaveBeenCalled();
    });
  });
});
