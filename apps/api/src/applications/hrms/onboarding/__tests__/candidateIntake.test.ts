import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CandidateIntakeService } from '../service/candidateIntake.service.js';
import { CANDIDATE_INTAKE_FORM } from '../../settings/forms/definitions/candidateIntake.form.js';
import { resolveForm } from '../../settings/forms/service/formResolver.js';

describe('Candidate Intake Form Engine & Service Tests', () => {
  let service: CandidateIntakeService;

  beforeEach(() => {
    service = new CandidateIntakeService();
  });

  describe('1. Default Form Definition & Invariants', () => {
    it('defines the 6 mandatory default sections with correct keys', () => {
      const sectionKeys = CANDIDATE_INTAKE_FORM.sections.map((s) => s.key);
      expect(sectionKeys).toEqual([
        'personal',
        'contact',
        'address',
        'employment',
        'emergency',
        'additional',
      ]);
    });

    it('contains all required personal and contact fields', () => {
      const personalSection = CANDIDATE_INTAKE_FORM.sections.find((s) => s.key === 'personal')!;
      const personalFieldKeys = personalSection.fields.map((f) => f.key);
      expect(personalFieldKeys).toContain('personal.firstName');
      expect(personalFieldKeys).toContain('personal.lastName');
      expect(personalFieldKeys).toContain('personal.dateOfBirth');
      expect(personalFieldKeys).toContain('personal.gender');

      const firstName = personalSection.fields.find((f) => f.key === 'personal.firstName')!;
      expect(firstName.defaultRequired).toBe(true);

      const contactSection = CANDIDATE_INTAKE_FORM.sections.find((s) => s.key === 'contact')!;
      const contactKeys = contactSection.fields.map((f) => f.key);
      expect(contactKeys).toContain('contact.personalEmail');
      expect(contactKeys).toContain('contact.mobileNumber');
      expect(contactKeys).toContain('contact.alternatePhone');
    });

    it('configures address details with sameAsCurrent checkbox and conditional permanent address fields', () => {
      const addressSection = CANDIDATE_INTAKE_FORM.sections.find((s) => s.key === 'address')!;
      const addressKeys = addressSection.fields.map((f) => f.key);
      expect(addressKeys).toContain('address.currentAddress');
      expect(addressKeys).toContain('address.sameAsCurrent');
      expect(addressKeys).toContain('address.permanentAddress');
    });

    it('configures employment information as configurable with position, department, and joining date', () => {
      const empSection = CANDIDATE_INTAKE_FORM.sections.find((s) => s.key === 'employment')!;
      const empKeys = empSection.fields.map((f) => f.key);
      expect(empKeys).toContain('employment.position');
      expect(empKeys).toContain('employment.department');
      expect(empKeys).toContain('employment.employmentType');
      expect(empKeys).toContain('employment.expectedJoiningDate');
    });
  });

  describe('2. Validation & Conditional Logic', () => {
    it('validates required fields and reports field-level errors', () => {
      const resolved = resolveForm(CANDIDATE_INTAKE_FORM, {
        version: 1,
        overrides: [],
        customFields: [],
      });

      const validation = service.validateAnswers(resolved, {}, 'candidate');
      expect(validation.valid).toBe(false);
      expect(validation.errors['personal.firstName']).toBe('First Name is required');
      expect(validation.errors['contact.personalEmail']).toBe('Personal Email is required');
    });

    it('validates email format properly', () => {
      const resolved = resolveForm(CANDIDATE_INTAKE_FORM, {
        version: 1,
        overrides: [],
        customFields: [],
      });

      const answers = {
        'personal.firstName': 'John',
        'personal.lastName': 'Doe',
        'personal.dateOfBirth': '1995-05-15',
        'contact.personalEmail': 'invalid-email-address',
        'contact.mobileNumber': '+1234567890',
        'address.currentAddress': '123 Main St',
        'address.currentCity': 'New York',
        'address.currentState': 'NY',
        'address.currentCountry': 'USA',
        'address.currentPostalCode': '10001',
        'emergency.contactName': 'Jane Doe',
        'emergency.relationship': 'Spouse',
        'emergency.mobileNumber': '+1234567891',
      };

      const validation = service.validateAnswers(resolved, answers, 'candidate');
      expect(validation.valid).toBe(false);
      expect(validation.errors['contact.personalEmail']).toBe('Invalid email address format');
    });

    it('enforces conditional hiding (e.g. permanent address is hidden when sameAsCurrent is true)', () => {
      const resolved = resolveForm(CANDIDATE_INTAKE_FORM, {
        version: 1,
        metadata: {
          fieldRules: {
            'address.permanentAddress': [
              {
                targetFieldKey: 'address.sameAsCurrent',
                operator: 'equals',
                value: true,
                action: 'hide',
              },
            ],
          },
        },
        overrides: [
          {
            fieldKey: 'address.permanentAddress',
            required: true,
            enabled: true,
            label: null,
            description: null,
            width: null,
            sortOrder: null,
          },
        ],
        customFields: [],
      });

      // When sameAsCurrent is true, permanentAddress should be hidden and therefore NOT trigger required error
      const answers = {
        'personal.firstName': 'John',
        'personal.lastName': 'Doe',
        'personal.dateOfBirth': '1995-05-15',
        'contact.personalEmail': 'john@example.com',
        'contact.mobileNumber': '9876543210',
        'address.currentAddress': '123 Main St',
        'address.currentCity': 'New York',
        'address.currentState': 'NY',
        'address.currentCountry': 'USA',
        'address.currentPostalCode': '10001',
        'address.sameAsCurrent': true,
        'emergency.contactName': 'Jane Doe',
        'emergency.relationship': 'Spouse',
        'emergency.mobileNumber': '9876543211',
      };

      const validation = service.validateAnswers(resolved, answers, 'candidate');
      expect(validation.errors['address.permanentAddress']).toBeUndefined();
    });

    it('passes validation when all required fields and valid formats are supplied', () => {
      const resolved = resolveForm(CANDIDATE_INTAKE_FORM, {
        version: 1,
        overrides: [],
        customFields: [],
      });

      const answers = {
        'personal.firstName': 'John',
        'personal.lastName': 'Doe',
        'personal.dateOfBirth': '1995-05-15',
        'contact.personalEmail': 'john@example.com',
        'contact.mobileNumber': '9876543210',
        'address.currentAddress': '123 Main St',
        'address.currentCity': 'New York',
        'address.currentState': 'NY',
        'address.currentCountry': 'USA',
        'address.currentPostalCode': '10001',
        'emergency.contactName': 'Jane Doe',
        'emergency.relationship': 'Spouse',
        'emergency.mobileNumber': '9876543211',
      };

      const validation = service.validateAnswers(resolved, answers, 'candidate');
      expect(validation.valid).toBe(true);
      expect(Object.keys(validation.errors).length).toBe(0);
    });
  });
});
