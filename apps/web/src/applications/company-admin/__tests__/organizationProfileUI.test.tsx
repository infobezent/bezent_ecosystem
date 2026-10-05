import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import {
  OrganizationProfileSection,
  validateOrganizationProfile,
  profileRecordToForm,
  PROFILE_FIELD_ORDER,
  PROFILE_FIELD_ELEMENT_IDS,
  type OrganizationProfileFormValues,
} from '../organization/OrganizationProfileSection';
import { OrganizationStructureSection } from '../organization/OrganizationStructureSection';
import { AuthContext, type AuthContextValue } from '../../../platform/auth/AuthProvider';
import type { OrganizationProfile } from '../organization/api/organizationApi';

const mockProfile: OrganizationProfile = {
  id: 'comp_apj3d_01',
  tenantId: 'tenant_demo_01',
  name: 'APJ3D Design Solution Pvt Ltd',
  code: 'APJ3D',
  displayName: 'APJ3D',
  organizationType: 'Private Limited',
  industry: 'IT Services',
  website: 'https://www.apj3d.com',
  logoUrl: 'https://cdn.example.com/logo.png',
  primaryEmail: 'hr@apj3d.com',
  phoneNumber: '+91 98765 43210',
  alternateEmail: 'admin@apj3d.com',
  alternatePhone: '+91 87654 32109',
  addressLine1: 'No. 123, Industrial Estate, SIPCOT Phase II',
  addressLine2: 'Hosur',
  country: 'India',
  state: 'Tamil Nadu',
  city: 'Hosur',
  postalCode: '635126',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockCompanyAccess = {
  companyId: 'comp_apj3d_01',
  companyName: 'APJ3D Design Solution Pvt Ltd',
  companyCode: 'APJ3D',
  tenantId: 'tenant_demo_01',
  tenantName: 'Demo Tenant',
  isMember: true,
  isPlatformOversight: false,
  roles: [{ id: 'role_admin', name: 'Company Admin', code: 'company_admin', isSystem: true, moduleCode: null }],
  permissions: [
    'company.organization.view',
    'company.organization.manage',
    'company.profile.view',
    'company.profile.edit',
  ],
  enabledModules: ['hrms' as const],
  essEligible: false,
  employeeId: null,
  workspaces: ['company_admin' as const],
};

function createMockAuthContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'authenticated',
    error: null,
    errorKind: null,
    access: {
      user: {
        id: 'usr_test',
        email: 'admin@apj3d.com',
        firstName: 'Admin',
        lastName: 'User',
        isSuperAdmin: false,
      },
      platformWorkspaces: ['company_admin' as const],
      companies: [mockCompanyAccess],
    },
    activeCompany: mockCompanyAccess,
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    hasApplicationAccess: () => true,
    isSuperAdmin: false,
    isCompanyAdmin: true,
    completeSignIn: () => {},
    selectCompany: () => true,
    refreshAccess: async () => {},
    signOut: async () => {},
    ...overrides,
  };
}

function TestAuthProvider({
  children,
  context = createMockAuthContext(),
}: {
  children: ReactNode;
  context?: AuthContextValue;
}) {
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

describe('Company Admin — Organization Profile UI & Logic', () => {
  describe('Form Validation Logic', () => {
    it('passes validation for completely valid profile values', () => {
      const form = profileRecordToForm(mockProfile);
      const errors = validateOrganizationProfile(form);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('enforces required fields', () => {
      const emptyForm: OrganizationProfileFormValues = {
        name: '',
        displayName: '',
        organizationType: '',
        industry: '',
        website: '',
        logoUrl: null,
        primaryEmail: '',
        phoneNumber: '',
        alternateEmail: '',
        alternatePhone: '',
        addressLine1: '',
        addressLine2: '',
        country: '',
        state: '',
        city: '',
        postalCode: '',
      };
      const errors = validateOrganizationProfile(emptyForm);
      expect(errors.name).toBe('Organization name is required');
      expect(errors.organizationType).toBe('Organization type is required');
      expect(errors.primaryEmail).toBe('Primary email is required');
      expect(errors.addressLine1).toBe('Address line 1 is required');
      expect(errors.country).toBe('Country is required');
      expect(errors.state).toBe('State / Province is required');
      expect(errors.city).toBe('City is required');
      expect(errors.postalCode).toBe('Postal code is required');
    });

    it('validates email formats for primary and alternate emails', () => {
      const form = {
        ...profileRecordToForm(mockProfile),
        primaryEmail: 'invalid-email',
        alternateEmail: 'not-an-email',
      };
      const errors = validateOrganizationProfile(form);
      expect(errors.primaryEmail).toBe('Please enter a valid primary email address');
      expect(errors.alternateEmail).toBe('Please enter a valid alternate email address');
    });

    it('validates URL format for website', () => {
      const form = {
        ...profileRecordToForm(mockProfile),
        website: 'htp:/bad-url',
      };
      const errors = validateOrganizationProfile(form);
      expect(errors.website).toBe('Please enter a valid website URL (e.g. www.apj3d.com)');
    });
  });

  describe('Component Rendering', () => {
    it('renders profile section with profile data in read mode', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationProfileSection initialProfile={mockProfile} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Organization Profile');
      expect(html).toContain('APJ3D Design Solution Pvt Ltd');
      expect(html).toContain('APJ3D');
      expect(html).toContain('Private Limited');
      expect(html).toContain('IT Services');
      expect(html).toContain('hr@apj3d.com');
      expect(html).toContain('No. 123, Industrial Estate, SIPCOT Phase II');
    });

    it('PROFILE_FIELD_ORDER and PROFILE_FIELD_ELEMENT_IDS accurately reflect form layout and inputs', () => {
      expect(PROFILE_FIELD_ORDER).toEqual([
        'name',
        'displayName',
        'organizationType',
        'industry',
        'website',
        'primaryEmail',
        'phoneNumber',
        'alternateEmail',
        'alternatePhone',
        'addressLine1',
        'addressLine2',
        'country',
        'state',
        'city',
        'postalCode',
      ]);

      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationProfileSection initialProfile={mockProfile} />
        </TestAuthProvider>,
      );

      for (const field of PROFILE_FIELD_ORDER) {
        const elementId = PROFILE_FIELD_ELEMENT_IDS[field];
        expect(html).toContain(`id="${elementId}"`);
      }
    });

    it('Organization Structure reflects canonical profile fields consistently', () => {
      const hierarchyWithUpdatedProfile = {
        company: {
          id: 'comp_apj3d_01',
          tenantId: 'tenant_demo_01',
          name: 'APJ3D Technologies',
          code: 'APJ3D',
          displayName: 'APJ3D Solution',
          organizationType: 'Private Limited',
          industry: 'Software & Technology',
          website: 'apj3d.com',
          addressLine1: 'No. 123 Tech Park',
          addressLine2: null,
          city: 'Hosur',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '635126',
        },
        businessUnits: [],
        totalBusinessUnits: 0,
        totalDivisions: 0,
      };

      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationStructureSection initialHierarchy={hierarchyWithUpdatedProfile} onNavigateToProfile={() => {}} />
        </TestAuthProvider>,
      );

      expect(html).toContain('APJ3D Technologies');
      expect(html).toContain('APJ3D Solution');
      expect(html).toContain('Private Limited');
      expect(html).toContain('Software &amp; Technology');
      expect(html).toContain('apj3d.com');
      expect(html).toContain('No. 123 Tech Park, Hosur, Tamil Nadu, India, 635126');
      expect(html).toContain('Edit Company Profile');
    });
  });
});
