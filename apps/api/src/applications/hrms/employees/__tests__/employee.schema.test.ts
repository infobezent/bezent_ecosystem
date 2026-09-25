import { describe, it, expect } from 'vitest';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateListEmployeesParams,
} from '../validation/employee.schema.js';
import type { EmploymentType, EmploymentStatus } from '../types/employee.types.js';
import { ValidationError } from '../../../../app/errors/AppError.js';

describe('Employee Validation Schema', () => {
  describe('validateCreateEmployee', () => {
    const validBase = {
      employeeNumber: 'EMP-001',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      phone: '+1234567890',
      joiningDate: '2026-10-01',
      departmentId: 'dept_eng_01',
      designationId: 'desig_swe_01',
      locationId: 'loc_hq_01',
      employmentType: 'full_time',
      employmentStatus: 'probation',
    };

    it('accepts valid employee creation payload and sets defaults', () => {
      const result = validateCreateEmployee(validBase);
      expect(result.employeeNumber).toBe('EMP-001');
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('alice.smith@example.com');
      expect(result.phone).toBe('+1234567890');
      expect(result.joiningDate).toBe('2026-10-01');
      expect(result.employmentType).toBe('full_time');
      expect(result.employmentStatus).toBe('probation');
      expect(result.userId).toBeNull();
    });

    it('applies default employmentType and employmentStatus when omitted', () => {
      const result = validateCreateEmployee({
        employeeNumber: 'EMP-002',
        firstName: 'Bob',
        email: 'bob@example.com',
        joiningDate: '2026-10-15',
      });

      expect(result.employmentType).toBe('full_time');
      expect(result.employmentStatus).toBe('probation');
      expect(result.lastName).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('allows nullable userId without requiring IAM', () => {
      const withUser = validateCreateEmployee({
        ...validBase,
        userId: 'usr_mock_123',
      });
      expect(withUser.userId).toBe('usr_mock_123');

      const withoutUser = validateCreateEmployee({
        ...validBase,
        userId: null,
      });
      expect(withoutUser.userId).toBeNull();
    });

    it('throws ValidationError when required fields are missing', () => {
      expect(() => validateCreateEmployee({})).toThrow(ValidationError);

      try {
        validateCreateEmployee({});
      } catch (err) {
        const error = err as ValidationError;
        expect(error.details?.employeeNumber).toBeDefined();
        expect(error.details?.firstName).toBeDefined();
        expect(error.details?.email).toBeDefined();
        expect(error.details?.joiningDate).toBeDefined();
      }
    });

    it('rejects invalid email format', () => {
      expect(() =>
        validateCreateEmployee({
          ...validBase,
          email: 'not-an-email',
        }),
      ).toThrow(ValidationError);
    });

    it('rejects invalid joiningDate format', () => {
      expect(() =>
        validateCreateEmployee({
          ...validBase,
          joiningDate: '01-10-2026',
        }),
      ).toThrow(ValidationError);
    });

    it('rejects invalid confirmedJoiningDate format', () => {
      expect(() =>
        validateCreateEmployee({
          ...validBase,
          confirmedJoiningDate: '2026/10/01',
        }),
      ).toThrow(ValidationError);
    });

    it('rejects invalid employmentType enum value', () => {
      expect(() =>
        validateCreateEmployee({
          ...validBase,
          employmentType: 'freelance' as unknown as EmploymentType,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects invalid employmentStatus enum value', () => {
      expect(() =>
        validateCreateEmployee({
          ...validBase,
          employmentStatus: 'on_vacation' as unknown as EmploymentStatus,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects field lengths exceeding maximum limits', () => {
      expect(() =>
        validateCreateEmployee({
          ...validBase,
          employeeNumber: 'a'.repeat(51),
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validateCreateEmployee({
          ...validBase,
          firstName: 'a'.repeat(101),
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('validateUpdateEmployee', () => {
    it('validates partial update payloads', () => {
      const result = validateUpdateEmployee({
        firstName: ' Alicia ',
        email: 'ALICIA.NEW@EXAMPLE.COM',
      });

      expect(result.firstName).toBe('Alicia');
      expect(result.email).toBe('alicia.new@example.com');
    });

    it('allows setting nullable fields to null', () => {
      const result = validateUpdateEmployee({
        lastName: null,
        phone: null,
        departmentId: null,
      });

      expect(result.lastName).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.departmentId).toBeNull();
    });

    it('rejects invalid email on update', () => {
      expect(() =>
        validateUpdateEmployee({
          email: 'bad-email',
        }),
      ).toThrow(ValidationError);
    });

    it('rejects empty first name on update', () => {
      expect(() =>
        validateUpdateEmployee({
          firstName: '   ',
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('validateListEmployeesParams', () => {
    it('parses valid pagination and search parameters', () => {
      const params = validateListEmployeesParams({
        page: '2',
        pageSize: '50',
        search: ' Smith ',
        employmentType: 'full_time',
        employmentStatus: 'active',
      });

      expect(params.page).toBe(2);
      expect(params.pageSize).toBe(50);
      expect(params.search).toBe('Smith');
      expect(params.employmentType).toBe('full_time');
      expect(params.employmentStatus).toBe('active');
    });

    it('sanitizes invalid pagination values', () => {
      const params = validateListEmployeesParams({
        page: '-5',
        pageSize: '500',
      });

      expect(params.page).toBe(1);
      expect(params.pageSize).toBe(25);
    });
  });
});
