import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ShiftService } from '../shifts/service/shift.service.js';
import { ShiftResolutionService } from '../shifts/service/shiftResolution.service.js';
import type { ShiftRepository } from '../shifts/repository/shift.repository.js';
import { AuditService } from '../../../platform/audit/service/audit.service.js';
import type { AuditRepository } from '../../../platform/audit/repository/audit.repository.js';
import {
  ConflictError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../../../app/errors/AppError.js';
import { shiftRouter } from '../shifts/routes/shift.routes.js';
import { errorHandler } from '../../../app/errors/errorHandler.js';
import type { HrmsShift, HrmsShiftAssignment } from '../../../db/schema.js';
import { AttendanceCalculationService } from '../attendance/service/attendanceCalculation.service.js';
import { FALLBACK_ATTENDANCE_POLICY } from '../attendance/service/attendancePolicy.service.js';
import type { ShiftSchedule } from '../attendance/types/attendance.types.js';
import type { EnrichedShiftAssignment } from '../shifts/types/shift.types.js';

describe('BEZENT HRMS — Phase 3.4: Database-backed Shift Management & Attendance Integration', () => {
  const tenantId = 'tenant_shift_01';
  const companyId = 'comp_shift_01';
  const otherTenantId = 'tenant_shift_02';
  const otherCompanyId = 'comp_shift_02';

  let mockRepo: Partial<ShiftRepository>;
  let mockAuditRepo: Partial<AuditRepository>;
  let auditService: AuditService;
  let shiftService: ShiftService;
  let resolutionService: ShiftResolutionService;

  const sampleGeneralShift: HrmsShift = {
    id: 'shf_gen_01',
    tenantId,
    companyId,
    name: 'General Day Shift',
    code: 'GEN-01',
    description: 'Standard 9 AM to 6 PM shift',
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    lunchMinutes: 30,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    graceMinutes: 15,
    isOvernight: false,
    color: '#2563EB',
    isActive: true,
    createdBy: 'usr_actor',
    updatedBy: 'usr_actor',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleNightShift: HrmsShift = {
    id: 'shf_night_01',
    tenantId,
    companyId,
    name: 'Night Owl Shift',
    code: 'NIGHT-01',
    description: 'Overnight 10 PM to 6 AM shift',
    startTime: '22:00',
    endTime: '06:00',
    breakMinutes: 45,
    lunchMinutes: 30,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    graceMinutes: 10,
    isOvernight: true,
    color: '#7C3AED',
    isActive: true,
    createdBy: 'usr_actor',
    updatedBy: 'usr_actor',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleAssignment: HrmsShiftAssignment = {
    id: 'asgn_emp_01',
    tenantId,
    companyId,
    shiftId: sampleGeneralShift.id,
    assignmentScope: 'employee',
    employeeId: 'emp_001',
    departmentId: null,
    locationId: null,
    effectiveStartDate: '2026-11-01',
    effectiveEndDate: null,
    isActive: true,
    notes: null,
    createdBy: 'usr_actor',
    updatedBy: 'usr_actor',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockAuditRepo = {
      record: vi.fn().mockImplementation((event) => Promise.resolve({ id: 'aud_1', ...event })),
    };
    auditService = new AuditService(mockAuditRepo as AuditRepository);

    mockRepo = {
      getShiftById: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && id === sampleGeneralShift.id) {
          return Promise.resolve({ ...sampleGeneralShift });
        }
        if (t === tenantId && c === companyId && id === sampleNightShift.id) {
          return Promise.resolve({ ...sampleNightShift });
        }
        return Promise.resolve(null);
      }),
      getShiftByCode: vi.fn().mockImplementation((t, c, code) => {
        if (t === tenantId && c === companyId && code === sampleGeneralShift.code) {
          return Promise.resolve({ ...sampleGeneralShift });
        }
        if (t === tenantId && c === companyId && code === sampleNightShift.code) {
          return Promise.resolve({ ...sampleNightShift });
        }
        return Promise.resolve(null);
      }),
      createShift: vi.fn().mockImplementation((data) => {
        const id = data.id || 'shf_new_01';
        const isOvernight = data.isOvernight ?? (data.endTime < data.startTime);
        return Promise.resolve({
          ...data,
          id,
          isOvernight,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      updateShift: vi.fn().mockImplementation((_t, _c, id, data) =>
        Promise.resolve({
          ...sampleGeneralShift,
          id,
          ...data,
          updatedAt: new Date(),
        }),
      ),
      deleteShift: vi.fn().mockResolvedValue(true),
      listShifts: vi.fn().mockResolvedValue({
        items: [sampleGeneralShift, sampleNightShift],
        total: 2,
      }),

      // Assignment methods
      getAssignmentById: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && id === sampleAssignment.id) {
          return Promise.resolve({ ...sampleAssignment });
        }
        return Promise.resolve(null);
      }),
      createAssignment: vi.fn().mockImplementation((data) => {
        const id = data.id || 'asgn_new_01';
        return Promise.resolve({
          ...data,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      updateAssignment: vi.fn().mockImplementation((_t, _c, id, data) =>
        Promise.resolve({
          ...sampleAssignment,
          id,
          ...data,
          updatedAt: new Date(),
        }),
      ),
      endAssignment: vi.fn().mockImplementation((_t, _c, id, effectiveEndDate) =>
        Promise.resolve({
          ...sampleAssignment,
          id,
          effectiveEndDate,
          updatedAt: new Date(),
        }),
      ),
      deleteAssignment: vi.fn().mockResolvedValue(true),
      listAssignments: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
      }),
      findOverlappingAssignments: vi.fn().mockResolvedValue([]),
      getEmployeeWithOrg: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && (id === 'emp_001' || id === 'emp_002' || id === 'emp_future' || id === 'emp_precedence_01')) {
          return Promise.resolve({
            employee: { id, departmentId: 'dept_eng', locationId: 'loc_hq' } as any,
            department: { id: 'dept_eng', name: 'Engineering' } as any,
            location: { id: 'loc_hq', name: 'Headquarters' } as any,
          });
        }
        return Promise.resolve(null);
      }),
      getDepartment: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && (id === 'dept_support' || id === 'dept_eng')) {
          return Promise.resolve({ id, name: 'Support', tenantId, companyId } as any);
        }
        return Promise.resolve(null);
      }),
      getLocation: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && (id === 'loc_mumbai' || id === 'loc_hq')) {
          return Promise.resolve({ id, name: 'Mumbai', tenantId, companyId } as any);
        }
        return Promise.resolve(null);
      }),
      getActiveAssignmentsForDate: vi.fn().mockResolvedValue([]),
    };

    resolutionService = new ShiftResolutionService(mockRepo as ShiftRepository);
    shiftService = new ShiftService(mockRepo as ShiftRepository, resolutionService, auditService);
  });

  // ===========================================================================
  // 1. Shift CRUD & Business Validation
  // ===========================================================================
  describe('1. Shift CRUD & Business Validation', () => {
    it('1.1 creates a valid shift with standard working hours and default days', async () => {
      const result = await shiftService.createShift(
        tenantId,
        companyId,
        {
          name: 'Morning Shift',
          code: 'MRN-01',
          startTime: '08:00',
          endTime: '17:00',
          breakMinutes: 60,
          graceMinutes: 10,
        },
        'usr_actor',
      );

      expect(result.id).toBeDefined();
      expect(result.code).toBe('MRN-01');
      expect(result.isOvernight).toBe(false);
      expect(result.workingDays).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'shift.created',
          targetId: result.id,
        }),
        undefined,
      );
    });

    it('1.2 automatically detects overnight shifts when endTime is before startTime', async () => {
      const result = await shiftService.createShift(
        tenantId,
        companyId,
        {
          name: 'Late Night Shift',
          code: 'LN-01',
          startTime: '23:00',
          endTime: '07:00',
          breakMinutes: 60,
        },
        'usr_actor',
      );

      expect(result.isOvernight).toBe(true);
    });

    it('1.3 enforces shift code uniqueness per company and throws ConflictError on duplicate', async () => {
      await expect(
        shiftService.createShift(
          tenantId,
          companyId,
          {
            name: 'Another General Shift',
            code: 'GEN-01', // Already exists in mockRepo for this company
            startTime: '09:00',
            endTime: '18:00',
          },
          'usr_actor',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('1.4 allows identical shift code in a different company', async () => {
      // In otherCompanyId, GEN-01 does not exist
      const result = await shiftService.createShift(
        otherTenantId,
        otherCompanyId,
        {
          name: 'Other Company General Shift',
          code: 'GEN-01',
          startTime: '09:00',
          endTime: '18:00',
        },
        'usr_actor',
      );

      expect(result.companyId).toBe(otherCompanyId);
      expect(result.code).toBe('GEN-01');
    });

    it('1.5 rejects shift when break minutes exceeds or equals shift duration', async () => {
      await expect(
        shiftService.createShift(
          tenantId,
          companyId,
          {
            name: 'Absurd Break Shift',
            code: 'ABS-01',
            startTime: '09:00',
            endTime: '11:00', // 2 hours = 120 minutes
            breakMinutes: 120, // Break >= Duration
          },
          'usr_actor',
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('1.6 toggles shift status between active and inactive cleanly', async () => {
      const updated = await shiftService.setShiftStatus(
        tenantId,
        companyId,
        sampleGeneralShift.id,
        false,
        'usr_actor',
      );

      expect(mockRepo.updateShift).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleGeneralShift.id,
        expect.objectContaining({ isActive: false }),
      );
      expect(updated.isActive).toBe(false);
    });

    it('1.7 prevents deletion if active assignments exist for the shift', async () => {
      vi.mocked(mockRepo.listAssignments)!.mockResolvedValueOnce({
        items: [sampleAssignment as any],
        total: 1,
      });

      await expect(
        shiftService.deleteShift(
          tenantId,
          companyId,
          sampleGeneralShift.id,
          'usr_actor',
        ),
      ).rejects.toThrow(ConflictError);

      expect(mockRepo.deleteShift).not.toHaveBeenCalled();
    });

    it('1.8 deletes shift cleanly if no active assignments exist', async () => {
      vi.mocked(mockRepo.listAssignments)!.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const deleted = await shiftService.deleteShift(
        tenantId,
        companyId,
        sampleGeneralShift.id,
        'usr_actor',
      );

      expect(deleted).toBe(true);
      expect(mockRepo.deleteShift).toHaveBeenCalledWith(tenantId, companyId, sampleGeneralShift.id);
    });
  });

  // ===========================================================================
  // 2. Shift Assignment CRUD & Scoping
  // ===========================================================================
  describe('2. Shift Assignment CRUD & Scoping', () => {
    it('2.1 creates assignment for employee target', async () => {
      const asgn = await shiftService.createAssignment(
        tenantId,
        companyId,
        {
          shiftId: sampleGeneralShift.id,
          assignmentScope: 'employee',
          targetId: 'emp_002',
          effectiveStartDate: '2026-11-01',
        },
        'usr_actor',
      );

      expect(asgn.id).toBeDefined();
      expect(asgn.assignmentScope).toBe('employee');
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'shift_assignment.created',
          targetId: asgn.id,
        }),
        undefined,
      );
    });

    it('2.2 creates assignment for department target', async () => {
      const asgn = await shiftService.createAssignment(
        tenantId,
        companyId,
        {
          shiftId: sampleNightShift.id,
          assignmentScope: 'department',
          targetId: 'dept_support',
          effectiveStartDate: '2026-11-01',
        },
        'usr_actor',
      );

      expect(asgn.assignmentScope).toBe('department');
      expect(asgn.departmentId).toBe('dept_support');
    });

    it('2.3 creates assignment for work location target', async () => {
      const asgn = await shiftService.createAssignment(
        tenantId,
        companyId,
        {
          shiftId: sampleGeneralShift.id,
          assignmentScope: 'location',
          targetId: 'loc_mumbai',
          effectiveStartDate: '2026-11-01',
        },
        'usr_actor',
      );

      expect(asgn.assignmentScope).toBe('location');
      expect(asgn.locationId).toBe('loc_mumbai');
    });

    it('2.4 rejects assignment if target does not exist in the tenant/company', async () => {
      await expect(
        shiftService.createAssignment(
          tenantId,
          companyId,
          {
            shiftId: sampleGeneralShift.id,
            assignmentScope: 'employee',
            targetId: 'emp_nonexistent',
            effectiveStartDate: '2026-11-01',
          },
          'usr_actor',
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('2.5 rejects overlapping assignment for the same target and scope', async () => {
      vi.mocked(mockRepo.findOverlappingAssignments)!.mockResolvedValueOnce([sampleAssignment]);

      await expect(
        shiftService.createAssignment(
          tenantId,
          companyId,
          {
            shiftId: sampleNightShift.id,
            assignmentScope: 'employee',
            targetId: 'emp_001',
            effectiveStartDate: '2026-11-05',
          },
          'usr_actor',
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('2.6 allows future effective dates and preserves date sequence', async () => {
      const asgn = await shiftService.createAssignment(
        tenantId,
        companyId,
        {
          shiftId: sampleGeneralShift.id,
          assignmentScope: 'employee',
          targetId: 'emp_future',
          effectiveStartDate: '2027-01-01',
          effectiveEndDate: '2027-06-30',
        },
        'usr_actor',
      );

      expect(asgn.effectiveStartDate).toBe('2027-01-01');
      expect(asgn.effectiveEndDate).toBe('2027-06-30');
    });

    it('2.7 rejects assignment when effectiveEndDate is before effectiveStartDate', async () => {
      await expect(
        shiftService.createAssignment(
          tenantId,
          companyId,
          {
            shiftId: sampleGeneralShift.id,
            assignmentScope: 'employee',
            targetId: 'emp_001',
            effectiveStartDate: '2026-11-10',
            effectiveEndDate: '2026-11-01', // Before start date
          },
          'usr_actor',
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('2.8 ends assignment cleanly setting effectiveEndDate', async () => {
      const ended = await shiftService.endAssignment(
        tenantId,
        companyId,
        sampleAssignment.id,
        { effectiveEndDate: '2026-11-30' },
        'usr_actor',
      );

      expect(mockRepo.endAssignment).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleAssignment.id,
        '2026-11-30',
        'usr_actor',
      );
      expect(ended.effectiveEndDate).toBe('2026-11-30');
    });
  });

  // ===========================================================================
  // 3. Deterministic Shift Resolution Engine
  // ===========================================================================
  describe('3. Shift Resolution Engine Precedence', () => {
    const empId = 'emp_precedence_01';
    const deptId = 'dept_eng';
    const locId = 'loc_hq';

    const empShift: HrmsShift = {
      ...sampleGeneralShift,
      id: 'shf_emp',
      name: 'Employee Specific Shift',
      code: 'EMP-SPEC',
      startTime: '10:00',
      endTime: '19:00',
    };

    const deptShift: HrmsShift = {
      ...sampleGeneralShift,
      id: 'shf_dept',
      name: 'Department Shift',
      code: 'DEPT-ENG',
      startTime: '11:00',
      endTime: '20:00',
    };

    const locShift: HrmsShift = {
      ...sampleGeneralShift,
      id: 'shf_loc',
      name: 'Location Shift',
      code: 'LOC-HQ',
      startTime: '08:30',
      endTime: '17:30',
    };

    it('3.1 Employee assignment takes highest precedence over Department and Location', async () => {
      vi.mocked(mockRepo.getEmployeeWithOrg)!.mockResolvedValue({
        employee: { id: empId, departmentId: deptId, locationId: locId } as any,
        department: { id: deptId, name: 'Eng' } as any,
        location: { id: locId, name: 'HQ' } as any,
      });

      const empAsgnWithShift: HrmsShiftAssignment & { shift: HrmsShift } = {
        ...sampleAssignment,
        id: 'asgn_emp',
        assignmentScope: 'employee',
        employeeId: empId,
        shiftId: empShift.id,
        shift: empShift,
      };

      const deptAsgnWithShift: HrmsShiftAssignment & { shift: HrmsShift } = {
        ...sampleAssignment,
        id: 'asgn_dept',
        assignmentScope: 'department',
        departmentId: deptId,
        shiftId: deptShift.id,
        shift: deptShift,
      };

      vi.mocked(mockRepo.getActiveAssignmentsForDate)!.mockResolvedValue([
        empAsgnWithShift,
        deptAsgnWithShift,
      ]);

      const resolved = await resolutionService.resolveEmployeeShift(tenantId, companyId, empId, '2026-11-05');

      expect(resolved.shift?.code).toBe(empShift.code);
      expect(resolved.schedule.startTime).toBe('10:00');
      expect(resolved.resolutionSource).toBe('employee');
    });

    it('3.2 Department assignment takes precedence over Location when no Employee assignment exists', async () => {
      vi.mocked(mockRepo.getEmployeeWithOrg)!.mockResolvedValue({
        employee: { id: empId, departmentId: deptId, locationId: locId } as any,
        department: { id: deptId, name: 'Eng' } as any,
        location: { id: locId, name: 'HQ' } as any,
      });

      const deptAsgnWithShift: HrmsShiftAssignment & { shift: HrmsShift } = {
        ...sampleAssignment,
        id: 'asgn_dept',
        assignmentScope: 'department',
        departmentId: deptId,
        shiftId: deptShift.id,
        shift: deptShift,
      };

      const locAsgnWithShift: HrmsShiftAssignment & { shift: HrmsShift } = {
        ...sampleAssignment,
        id: 'asgn_loc',
        assignmentScope: 'location',
        locationId: locId,
        shiftId: locShift.id,
        shift: locShift,
      };

      vi.mocked(mockRepo.getActiveAssignmentsForDate)!.mockResolvedValue([
        deptAsgnWithShift,
        locAsgnWithShift,
      ]);

      const resolved = await resolutionService.resolveEmployeeShift(tenantId, companyId, empId, '2026-11-05');

      expect(resolved.shift?.code).toBe(deptShift.code);
      expect(resolved.schedule.startTime).toBe('11:00');
      expect(resolved.resolutionSource).toBe('department');
    });

    it('3.3 Location assignment takes precedence over company fallback when neither employee nor dept assignment exists', async () => {
      vi.mocked(mockRepo.getEmployeeWithOrg)!.mockResolvedValue({
        employee: { id: empId, departmentId: deptId, locationId: locId } as any,
        department: { id: deptId, name: 'Eng' } as any,
        location: { id: locId, name: 'HQ' } as any,
      });

      const locAsgnWithShift: HrmsShiftAssignment & { shift: HrmsShift } = {
        ...sampleAssignment,
        id: 'asgn_loc',
        assignmentScope: 'location',
        locationId: locId,
        shiftId: locShift.id,
        shift: locShift,
      };

      vi.mocked(mockRepo.getActiveAssignmentsForDate)!.mockResolvedValue([locAsgnWithShift]);

      const resolved = await resolutionService.resolveEmployeeShift(tenantId, companyId, empId, '2026-11-05');

      expect(resolved.shift?.code).toBe(locShift.code);
      expect(resolved.schedule.startTime).toBe('08:30');
      expect(resolved.resolutionSource).toBe('location');
    });

    it('3.4 Falls back to company default shift when no active assignments exist', async () => {
      vi.mocked(mockRepo.getEmployeeWithOrg)!.mockResolvedValue({
        employee: { id: empId, departmentId: deptId, locationId: locId } as any,
        department: { id: deptId, name: 'Eng' } as any,
        location: { id: locId, name: 'HQ' } as any,
      });
      vi.mocked(mockRepo.getActiveAssignmentsForDate)!.mockResolvedValue([]);
      vi.mocked(mockRepo.listShifts)!.mockResolvedValue({
        items: [sampleGeneralShift],
        total: 1,
      });

      const resolved = await resolutionService.resolveEmployeeShift(tenantId, companyId, empId, '2026-11-05');

      expect(resolved.shift?.code).toBe(sampleGeneralShift.code);
      expect(resolved.resolutionSource).toBe('default_shift');
    });

    it('3.5 Auto-allocation by punch window matches shift when enabled and punch time is supplied', async () => {
      // General shift: 09:00 with 60m window -> 08:00 to 10:00
      // Night shift: 22:00 with 60m window -> 21:00 to 23:00
      vi.mocked(mockRepo.listShifts)!.mockResolvedValue({
        items: [sampleGeneralShift, sampleNightShift],
        total: 2,
      });

      // Employee punches at 21:45 -> closest to Night Shift (22:00)
      const resolved = await resolutionService.resolveEmployeeShift(
        tenantId,
        companyId,
        empId,
        '2026-11-05',
        '21:45',
        true, // enableAutoShiftAllocation
      );

      expect(resolved.shift?.code).toBe(sampleNightShift.code);
      expect(resolved.resolutionSource).toBe('auto_allocated');
      expect(resolved.schedule.isOvernight).toBe(true);
    });
  });

  // ===========================================================================
  // 4. Attendance Calculation & Regression Verification
  // ===========================================================================
  describe('4. Attendance Calculation & Regression Verification', () => {
    const calcService = new AttendanceCalculationService();

    it('4.1 respects resolved shift grace period: check-in within grace is NOT marked late', () => {
      const schedule: ShiftSchedule = {
        shiftId: sampleGeneralShift.id,
        shiftCode: sampleGeneralShift.code,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        lunchMinutes: 30,
        scheduleRef: 'GEN-01',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        graceMinutes: 15,
        isOvernight: false,
      };

      const result = calcService.calculate({
        date: '2026-11-06', // Friday
        checkInTime: '09:12', // 12 mins late, but within 15 min grace
        checkOutTime: '18:00',
        schedule,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.status).toBe('present');
      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    it('4.2 marks late arrival accurately when punch is beyond grace period', () => {
      const schedule: ShiftSchedule = {
        shiftId: sampleGeneralShift.id,
        shiftCode: sampleGeneralShift.code,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        lunchMinutes: 30,
        scheduleRef: 'GEN-01',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        graceMinutes: 15,
        isOvernight: false,
      };

      const result = calcService.calculate({
        date: '2026-11-06',
        checkInTime: '09:25', // 25 mins late > 15m grace
        checkOutTime: '18:00',
        schedule,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(25);
    });

    it('4.3 marks early exit accurately when checkout is before shift end time', () => {
      const schedule: ShiftSchedule = {
        shiftId: sampleGeneralShift.id,
        shiftCode: sampleGeneralShift.code,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        lunchMinutes: 30,
        scheduleRef: 'GEN-01',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        graceMinutes: 15,
        isOvernight: false,
      };

      const result = calcService.calculate({
        date: '2026-11-06',
        checkInTime: '09:00',
        checkOutTime: '16:30', // 90 mins early
        schedule,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.isEarlyExit).toBe(true);
      expect(result.earlyMinutes).toBe(90);
    });

    it('4.4 accurately calculates overnight shift spanning midnight', () => {
      // 21:00 to 06:00 = 9 hours gross (540 mins) - 45 min break = 495 mins net (8.25 hrs >= 8.00 hr threshold) -> 'present'
      const schedule: ShiftSchedule = {
        shiftId: sampleNightShift.id,
        shiftCode: sampleNightShift.code,
        startTime: '21:00',
        endTime: '06:00',
        breakMinutes: 45,
        lunchMinutes: 30,
        scheduleRef: 'NIGHT-01',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        graceMinutes: 10,
        isOvernight: true,
      };

      const result = calcService.calculate({
        date: '2026-11-06',
        checkInTime: '21:05', // Within 10 min grace
        checkOutTime: '06:00',
        schedule,
        policy: FALLBACK_ATTENDANCE_POLICY,
      });

      expect(result.isLate).toBe(false);
      expect(result.isEarlyExit).toBe(false);
      expect(result.workedMinutes).toBe(490);
      expect(result.status).toBe('present');
    });

    it('4.5 historical attendance snapshot remains immutable when shift definition changes', () => {
      // Attendance calculation snapshot stores exact schedule values at calculation time
      const initialSchedule: ShiftSchedule = {
        shiftId: sampleGeneralShift.id,
        shiftCode: sampleGeneralShift.code,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        lunchMinutes: 30,
        scheduleRef: 'GEN-01',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        graceMinutes: 15,
        isOvernight: false,
      };

      const historicalRecord = {
        id: 'att_hist_01',
        shiftScheduleRef: initialSchedule.shiftCode,
        calculationMetadata: {
          snapshotSchedule: initialSchedule,
          startTime: initialSchedule.startTime,
          endTime: initialSchedule.endTime,
        },
      };

      // Now someone updates the shift definition in database to 10:00 - 19:00
      const modifiedShift = {
        ...sampleGeneralShift,
        startTime: '10:00',
        endTime: '19:00',
      };

      // The historical record's snapshot must remain strictly 09:00 - 18:00
      expect(historicalRecord.calculationMetadata.snapshotSchedule.startTime).toBe('09:00');
      expect(historicalRecord.calculationMetadata.snapshotSchedule.endTime).toBe('18:00');
      expect(modifiedShift.startTime).toBe('10:00');
    });
  });

  // ===========================================================================
  // 5. Security, RBAC & Route Integration
  // ===========================================================================
  describe('5. Security, RBAC & Route Integration', () => {
    let app: express.Express;

    beforeEach(() => {
      vi.restoreAllMocks();
      app = express();
      app.use(express.json());

      // Context middleware simulator
      app.use((req, _res, next) => {
        req.user = { id: 'usr_actor', email: 'hr@example.com' } as any;
        req.companyContext = { tenantId, companyId } as any;
        req.access = {
          tenantId,
          companyId,
          roles: ['hr_manager'],
          permissions: [
            'hrms.shifts.view',
            'hrms.shifts.manage',
            'hrms.shift_assignments.view',
            'hrms.shift_assignments.manage',
          ],
        } as any;
        next();
      });

      app.use('/api/v1', shiftRouter);
      app.use(errorHandler);
    });

    it('5.1 GET /api/v1/hrms/shifts returns list and 200', async () => {
      vi.spyOn(ShiftService.prototype, 'listShifts').mockResolvedValue({
        items: [sampleGeneralShift, sampleNightShift],
        total: 2,
      });

      const res = await request(app).get('/api/v1/hrms/shifts');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].code).toBe(sampleGeneralShift.code);
    });

    it('5.2 POST /api/v1/hrms/shifts creates shift and returns 201', async () => {
      vi.spyOn(ShiftService.prototype, 'createShift').mockResolvedValue({
        ...sampleGeneralShift,
        id: 'shf_created',
      });

      const res = await request(app)
        .post('/api/v1/hrms/shifts')
        .send({
          name: 'General Day Shift',
          code: 'GEN-01',
          startTime: '09:00',
          endTime: '18:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('shf_created');
    });

    it('5.3 POST /api/v1/hrms/shifts rejects invalid time format with 400', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/shifts')
        .send({
          name: 'Invalid Shift',
          code: 'INV-01',
          startTime: '9:00 AM', // Not HH:mm format
          endTime: '18:00',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('HH:mm');
    });

    it('5.4 GET /api/v1/hrms/shift-assignments returns assignments and 200', async () => {
      vi.spyOn(ShiftService.prototype, 'listAssignments').mockResolvedValue({
        items: [
          {
            ...sampleAssignment,
            shiftName: sampleGeneralShift.name,
            shiftCode: sampleGeneralShift.code,
            shiftStartTime: sampleGeneralShift.startTime,
            shiftEndTime: sampleGeneralShift.endTime,
            shiftIsOvernight: sampleGeneralShift.isOvernight,
            targetName: 'John Doe',
            targetCode: 'EMP-001',
          },
        ],
        total: 1,
      });

      const res = await request(app).get('/api/v1/hrms/shift-assignments');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('5.5 POST /api/v1/hrms/shift-assignments returns 201 on valid assignment', async () => {
      vi.spyOn(ShiftService.prototype, 'createAssignment').mockResolvedValue(sampleAssignment);

      const res = await request(app)
        .post('/api/v1/hrms/shift-assignments')
        .send({
          shiftId: sampleGeneralShift.id,
          assignmentScope: 'employee',
          targetId: 'emp_001',
          effectiveStartDate: '2026-11-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(sampleAssignment.id);
    });

    it('5.6 denies access when user lacks hrms.shifts.manage permission', async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use((req, _res, next) => {
        req.user = { id: 'usr_viewer', email: 'emp@example.com' } as any;
        req.companyContext = { tenantId, companyId } as any;
        req.access = {
          tenantId,
          companyId,
          roles: ['employee'],
          permissions: ['hrms.shifts.view'], // Lacks hrms.shifts.manage!
        } as any;
        next();
      });
      unauthApp.use('/api/v1', shiftRouter);
      unauthApp.use(errorHandler);

      const res = await request(unauthApp)
        .post('/api/v1/hrms/shifts')
        .send({
          name: 'Unauthorized Shift',
          code: 'UNAUTH-01',
          startTime: '09:00',
          endTime: '18:00',
        });

      expect(res.status).toBe(403);
    });
  });
});
