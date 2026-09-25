import { describe, it, expect } from 'vitest';
import {
  validateCreateEmployeeDocument,
  validateListEmployeeDocumentsQuery,
} from '../validation/employeeDocument.schema.js';
import { expiryStateOf, expiryWindow } from '../service/employeeDocument.service.js';
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

describe('Employee document validation', () => {
  const base = {
    employeeId: 'emp_1',
    category: 'personal_identity',
    documentName: ' PAN Card ',
    documentNumber: ' ABCDE1234F ',
  };

  it('accepts metadata and trims values', () => {
    expect(validateCreateEmployeeDocument({ ...base, expiryDate: '2030-01-31' })).toEqual({
      employeeId: 'emp_1',
      category: 'personal_identity',
      documentName: 'PAN Card',
      documentNumber: 'ABCDE1234F',
      expiryDate: '2030-01-31',
    });
  });

  it('accepts only the approved categories', () => {
    for (const category of [
      'personal_identity',
      'address_proof',
      'education',
      'previous_employment',
      'bank_payroll',
      'tax_other',
    ]) {
      expect(validateCreateEmployeeDocument({ ...base, category }).category).toBe(category);
    }
    expect(
      detailsOf(() => validateCreateEmployeeDocument({ ...base, category: 'medical' })).category,
    ).toBeDefined();
  });

  it('requires employee and document name and a real expiry date', () => {
    const details = detailsOf(() =>
      validateCreateEmployeeDocument({ category: 'education', expiryDate: '2030-02-30' }),
    );
    expect(details.employeeId).toBeDefined();
    expect(details.documentName).toBeDefined();
    expect(details.expiryDate).toBeDefined();
  });

  it('does not accept a status, remarks or file fields on creation', () => {
    const details = detailsOf(() =>
      validateCreateEmployeeDocument({
        ...base,
        status: 'verified',
        verificationRemarks: 'ok',
        fileName: 'pan.pdf',
      }),
    );
    expect(details.status).toContain('Pending');
    expect(details.verificationRemarks).toBeDefined();
    expect(details.fileName).toContain('not supported');
  });

  it('sanitizes list parameters', () => {
    expect(
      validateListEmployeeDocumentsQuery({
        page: '0',
        pageSize: '500',
        view: 'bogus',
        category: 'education',
        status: 'nope',
        search: '  pan ',
        departmentId: ' dept_1 ',
      }),
    ).toEqual({
      page: 1,
      pageSize: 25,
      view: 'all',
      category: 'education',
      search: 'pan',
      departmentId: 'dept_1',
    });
  });
});

describe('Expiry derivation', () => {
  const window = expiryWindow('2026-09-25');

  it('uses a 30-day warning window', () => {
    expect(window).toEqual({ today: '2026-09-25', warningUntil: '2026-10-25' });
  });

  it('derives state only from a real expiry date', () => {
    expect(expiryStateOf(null, window)).toBeNull();
    expect(expiryStateOf('2026-09-24', window)).toBe('expired');
    expect(expiryStateOf('2026-09-25', window)).toBe('expiring');
    expect(expiryStateOf('2026-10-25', window)).toBe('expiring');
    expect(expiryStateOf('2026-10-26', window)).toBe('valid');
  });
});
