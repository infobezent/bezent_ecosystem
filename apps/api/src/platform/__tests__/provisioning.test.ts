import { describe, it, expect } from 'vitest';
import { validateCustomerProvisioning } from '../provisioning/validation/provisioning.schema.js';
import { ValidationError } from '../../app/errors/AppError.js';

describe('Customer Provisioning Validation', () => {
  const validPayload = {
    tenant: {
      name: 'Global Corp Inc',
      code: 'global-corp',
      contactEmail: 'contact@globalcorp.com',
      contactPhone: '+1-555-0900',
    },
    company: {
      name: 'Global Corp US',
      code: 'gc-us',
      legalName: 'Global Corporation LLC',
      businessEmail: 'admin@globalcorp.com',
      country: 'US',
      timeZone: 'America/New_York',
    },
    admin: {
      newUser: {
        email: 'john.doe@globalcorp.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'StrongPassword123!',
      },
    },
    modules: ['hrms', 'crm'],
    activateImmediately: true,
  };

  it('validates a complete provisioning request', () => {
    const validated = validateCustomerProvisioning(validPayload);

    expect(validated.tenant.name).toBe('Global Corp Inc');
    expect(validated.tenant.code).toBe('GLOBAL-CORP');
    expect(validated.company.code).toBe('GC-US');
    expect(validated.admin.newUser?.email).toBe('john.doe@globalcorp.com');
    expect(validated.modules).toContain('hrms');
    expect(validated.modules).toContain('crm');
    expect(validated.activateImmediately).toBe(true);
  });

  it('rejects short names or invalid emails for admin in provisioning', () => {
    const invalidPayload = {
      ...validPayload,
      admin: {
        newUser: {
          ...validPayload.admin.newUser,
          email: 'not-an-email',
        },
      },
    };

    expect(() => validateCustomerProvisioning(invalidPayload)).toThrow(ValidationError);
  });

  it('rejects invalid module names in provisioning', () => {
    const invalidPayload = {
      ...validPayload,
      modules: ['invalid_module'],
    };

    expect(() => validateCustomerProvisioning(invalidPayload)).toThrow(ValidationError);
  });

  it('requires either userId or newUser for company admin', () => {
    const invalidPayload = {
      ...validPayload,
      admin: {},
    };

    expect(() => validateCustomerProvisioning(invalidPayload)).toThrow(ValidationError);
  });
});
