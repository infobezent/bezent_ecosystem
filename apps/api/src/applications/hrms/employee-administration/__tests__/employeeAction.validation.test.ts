import { describe, it, expect } from 'vitest';
import {
  isValidIsoDate,
  validateActionValues,
  validateApplyEmployeeAction,
  validateCancelEmployeeAction,
  validateCreateEmployeeAction,
  validateListEmployeeActionsQuery,
  validateUpdateEmployeeAction,
} from '../validation/employeeAction.schema.js';
import { ValidationError } from '../../../../app/errors/AppError.js';

function detailsOf(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    return (err as ValidationError).details ?? {};
  }
  throw new Error('Expected ValidationError');
}

describe('Employee Action validation', () => {
  const base = {
    employeeId: 'emp_1',
    actionType: 'department_change',
    effectiveDate: '2026-09-01',
    reason: 'Team restructuring',
    values: { departmentId: 'dept_2' },
  };

  it('accepts a valid department change and trims values', () => {
    const dto = validateCreateEmployeeAction({
      ...base,
      reason: '  Team restructuring  ',
      values: { departmentId: ' dept_2 ', designationId: 'desig_2', reportingManagerId: '' },
    });
    expect(dto.actionType).toBe('department_change');
    expect(dto.reason).toBe('Team restructuring');
    expect(dto.values).toEqual({ departmentId: 'dept_2', designationId: 'desig_2' });
  });

  it('requires employee, reason, and effective date', () => {
    const details = detailsOf(() =>
      validateCreateEmployeeAction({
        actionType: 'designation_change',
        values: { designationId: 'd' },
      }),
    );
    expect(details.employeeId).toBeDefined();
    expect(details.reason).toBeDefined();
    expect(details.effectiveDate).toBeDefined();
  });

  it('rejects unknown action types', () => {
    const details = detailsOf(() =>
      validateCreateEmployeeAction({ ...base, actionType: 'promotion' }),
    );
    expect(details.actionType).toBeDefined();
  });

  it('requires the action-specific value', () => {
    const details = detailsOf(() => validateCreateEmployeeAction({ ...base, values: {} }));
    expect(details['values.departmentId']).toBe('Department is required');
  });

  it('rejects values that do not belong to the action type', () => {
    const details = detailsOf(() =>
      validateCreateEmployeeAction({
        ...base,
        actionType: 'designation_change',
        values: { designationId: 'desig_2', employmentStatus: 'terminated' },
      }),
    );
    expect(details['values.employmentStatus']).toContain('not applicable');
  });

  it('confirm_employee accepts no values', () => {
    const dto = validateCreateEmployeeAction({
      ...base,
      actionType: 'confirm_employee',
      values: {},
    });
    expect(dto.values).toEqual({});
    expect(() =>
      validateCreateEmployeeAction({
        ...base,
        actionType: 'confirm_employee',
        values: { probationEndDate: '2026-12-01' },
      }),
    ).toThrow(ValidationError);
  });

  it('employment status change only allows active, suspended, notice', () => {
    expect(
      validateActionValues('employment_status_change', { employmentStatus: 'suspended' }),
    ).toEqual({
      employmentStatus: 'suspended',
    });
    for (const status of ['terminated', 'resigned', 'probation']) {
      expect(() =>
        validateActionValues('employment_status_change', { employmentStatus: status }),
      ).toThrow(ValidationError);
    }
  });

  it('employment type change validates the enum', () => {
    expect(() =>
      validateActionValues('employment_type_change', { employmentType: 'freelance' }),
    ).toThrow(ValidationError);
  });

  it('separations default effective date and require last working date', () => {
    const dto = validateCreateEmployeeAction({
      employeeId: 'emp_1',
      actionType: 'resignation',
      reason: 'Relocating',
      values: { requestDate: '2026-08-01', lastWorkingDate: '2026-08-31' },
    });
    expect(dto.effectiveDate).toBeNull();
    expect(dto.values.lastWorkingDate).toBe('2026-08-31');

    const details = detailsOf(() =>
      validateCreateEmployeeAction({
        employeeId: 'emp_1',
        actionType: 'termination',
        reason: 'x',
        values: {},
      }),
    );
    expect(details['values.lastWorkingDate']).toBeDefined();
  });

  it('rejects a request date after the last working date', () => {
    expect(() =>
      validateActionValues('resignation', {
        requestDate: '2026-09-02',
        lastWorkingDate: '2026-09-01',
      }),
    ).toThrow(ValidationError);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(() => validateCreateEmployeeAction({ ...base, effectiveDate: '2026-13-01' })).toThrow(
      ValidationError,
    );
  });

  it('requires a positive integer version for update, cancel and apply', () => {
    expect(() => validateApplyEmployeeAction({})).toThrow(ValidationError);
    expect(() => validateCancelEmployeeAction({ version: 0 })).toThrow(ValidationError);
    expect(() => validateUpdateEmployeeAction({ version: 'x' })).toThrow(ValidationError);
    expect(validateApplyEmployeeAction({ version: 2 })).toEqual({ version: 2 });
    expect(validateCancelEmployeeAction({ version: 1, reason: ' dup ' })).toEqual({
      version: 1,
      reason: 'dup',
    });
  });

  it('sanitizes list query parameters', () => {
    const params = validateListEmployeeActionsQuery({
      page: '-1',
      pageSize: '1000',
      category: 'separation',
      status: 'applied',
      actionType: 'bogus',
      search: '  Kavya ',
    });
    expect(params).toEqual({
      page: 1,
      pageSize: 25,
      category: 'separation',
      status: 'applied',
      search: 'Kavya',
    });
  });
});
