import { describe, it, expect } from 'vitest';
import {
  validateEmployeeRecordDetails,
  validateEmployeeRecordSection,
} from '../validation/employeeProfile.schema.js';
import { maskAccountNumber } from '../service/employeeProfile.service.js';
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

describe('Employee record detail validation (Registration → Employee mapping)', () => {
  it('accepts only employee record sections', () => {
    const details = detailsOf(() =>
      validateEmployeeRecordDetails({
        tasks: [],
        review: {},
        assets: [],
        onlineAccess: {},
        documents: [],
        compensation: {},
      }),
    );
    for (const key of ['tasks', 'review', 'assets', 'onlineAccess', 'documents', 'compensation']) {
      expect(details[`details.${key}`]).toContain('not part of the employee record');
    }
  });

  it('treats a missing details payload as no details', () => {
    expect(validateEmployeeRecordDetails(undefined)).toEqual({});
    expect(validateEmployeeRecordDetails(null)).toEqual({});
  });

  it('normalizes personal details and nulls blank fields', () => {
    const personal = validateEmployeeRecordSection('personal', {
      gender: ' Female ',
      personalEmail: 'A.B@Example.COM',
      homePhone: '',
    });
    expect(personal).toMatchObject({
      gender: 'Female',
      personalEmail: 'a.b@example.com',
      homePhone: null,
      middleName: null,
    });
  });

  it('rejects a future date of birth and invalid emails', () => {
    const details = detailsOf(() =>
      validateEmployeeRecordSection('personal', {
        dateOfBirth: '2999-01-01',
        personalEmail: 'nope',
      }),
    );
    expect(details['personal.dateOfBirth']).toBeDefined();
    expect(details['personal.personalEmail']).toBeDefined();
  });

  it('requires name and relationship for family members and nominees', () => {
    const details = detailsOf(() =>
      validateEmployeeRecordDetails({ familyMembers: [{}], nominees: [{ name: 'X' }] }),
    );
    expect(details['familyMembers[0].name']).toBe('Required');
    expect(details['familyMembers[0].relationship']).toBe('Required');
    expect(details['nominees[0].relationship']).toBe('Required');
    expect(details['nominees[0].sharePercentage']).toBe('Required');
  });

  it('validates bank account numbers and IFSC codes, uppercasing IFSC', () => {
    const account = validateEmployeeRecordSection('bankAccount', {
      accountHolderName: 'A',
      accountNumber: '50100012345678',
      ifscCode: 'hdfc0001234',
      bankName: 'HDFC',
    });
    expect(account.ifscCode).toBe('HDFC0001234');

    const details = detailsOf(() =>
      validateEmployeeRecordSection('bankAccount', {
        accountHolderName: 'A',
        accountNumber: '12',
        ifscCode: 'BAD',
        bankName: 'HDFC',
      }),
    );
    expect(details['bankAccount.accountNumber']).toBeDefined();
    expect(details['bankAccount.ifscCode']).toBeDefined();
  });

  it('validates skill proficiency against the registration levels', () => {
    const details = detailsOf(() =>
      validateEmployeeRecordSection('skills', [
        { skillName: 'SQL', skillType: 'Technical', proficiency: 'Guru' },
      ]),
    );
    expect(details['skills[0].proficiency']).toContain('Beginner');
  });

  it('validates working days and times, ordering days by calendar', () => {
    const schedule = validateEmployeeRecordSection('workSchedule', {
      workingDays: ['Wednesday', 'Monday'],
      startTime: '09:30',
      endTime: '18:00',
    });
    expect(schedule).toMatchObject({
      workingDays: ['Monday', 'Wednesday'],
      breakMinutes: 0,
      lunchMinutes: 0,
    });

    const details = detailsOf(() =>
      validateEmployeeRecordSection('workSchedule', {
        workingDays: ['Funday'],
        startTime: '25:00',
        endTime: '09:00',
      }),
    );
    expect(details['workSchedule.workingDays']).toBeDefined();
    expect(details['workSchedule.startTime']).toBeDefined();
  });

  it('masks all but the last four account digits', () => {
    expect(maskAccountNumber('50100012345678')).toBe('••••5678');
  });
});
