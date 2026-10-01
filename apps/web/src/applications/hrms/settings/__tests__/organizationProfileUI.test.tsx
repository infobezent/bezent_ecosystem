import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';
import {
  OrganizationProfileSection,
  validateOrganizationProfile,
  profileRecordToForm,
  PROFILE_FIELD_ORDER,
  PROFILE_FIELD_ELEMENT_IDS,
  type OrganizationProfileFormValues,
} from '../organization/OrganizationProfileSection';
import { OrganizationStructureSection } from '../organization/OrganizationStructureSection';
import { OrganizationProfilePage } from '../pages/OrganizationProfilePage';
import { SettingsPage, SettingsPageInner } from '../pages/SettingsPage';
import { SETTINGS_MODULE_CARDS } from '../types/settingsCenter';
import { hrmsRoutes } from '../../routes/hrmsRoutes';
import { AuthContext, type AuthContextValue } from '../../../../platform/auth/AuthProvider';
import type { OrganizationProfile } from '../../organization/api/organizationApi';

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
    'hrms.organization.view',
    'hrms.organization.manage',
    'hrms.settings.view',
    'hrms.settings.manage',
    'company.profile.view',
    'company.profile.edit',
  ],
  enabledModules: ['hrms' as const],
  essEligible: true,
  employeeId: null,
  workspaces: ['hrms' as const],
};

function createMockAuthContext(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'authenticated',
    error: null,
    access: {
      user: {
        id: 'usr_test',
        email: 'admin@apj3d.com',
        firstName: 'Admin',
        lastName: 'User',
        isSuperAdmin: false,
      },
      platformWorkspaces: ['hrms' as const],
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

describe('BEZENT HRMS — Organization Profile UI & Logic', () => {
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
        primaryEmail: 'not-an-email',
        alternateEmail: 'bad-email@',
      };
      const errors = validateOrganizationProfile(form);
      expect(errors.primaryEmail).toBe('Please enter a valid primary email address');
      expect(errors.alternateEmail).toBe('Please enter a valid alternate email address');
    });

    it('validates website URL formats', () => {
      const invalidForm = {
        ...profileRecordToForm(mockProfile),
        website: 'htp:/wrong',
      };
      const errors = validateOrganizationProfile(invalidForm);
      expect(errors.website).toBe('Please enter a valid website URL (e.g. www.apj3d.com)');

      const validUrlForm = {
        ...profileRecordToForm(mockProfile),
        website: 'https://apj3d.com/about',
      };
      const validErrors = validateOrganizationProfile(validUrlForm);
      expect(validErrors.website).toBeUndefined();
    });

    it('enforces Indian PIN code format (6 digits) when country is India', () => {
      const invalidPinForm = {
        ...profileRecordToForm(mockProfile),
        country: 'India',
        postalCode: '12345', // only 5 digits
      };
      const errors = validateOrganizationProfile(invalidPinForm);
      expect(errors.postalCode).toBe('PIN code must be a 6-digit number');

      const validPinForm = {
        ...profileRecordToForm(mockProfile),
        country: 'India',
        postalCode: '635126',
      };
      expect(validateOrganizationProfile(validPinForm).postalCode).toBeUndefined();
    });

    it('supports international postal codes when country is not India', () => {
      const usForm = {
        ...profileRecordToForm(mockProfile),
        country: 'United States',
        postalCode: '94105-1234',
      };
      const errors = validateOrganizationProfile(usForm);
      expect(errors.postalCode).toBeUndefined();
    });
  });

  describe('UI Component Rendering', () => {
    it('renders the 3 canonical sections: Basic Information, Official Contact, and Registered Address', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationProfileSection initialProfile={mockProfile} />
        </TestAuthProvider>,
      );

      // Section 1: Basic Information
      expect(html).toContain('Basic Information');
      expect(html).toContain("Provide your organization&#x27;s basic details.");
      expect(html).toContain('Organization Logo');
      expect(html).toContain('Change Logo');
      expect(html).toContain('Remove');
      expect(html).toContain('PNG, JPG or SVG. Max 2 MB.');
      expect(html).toContain('Organization Name');
      expect(html).toContain('Display Name');
      expect(html).toContain('Organization Type');
      expect(html).toContain('Industry');
      expect(html).toContain('Website');

      // Pre-populated values
      expect(html).toContain('APJ3D Design Solution Pvt Ltd');
      expect(html).toContain('APJ3D');
      expect(html).toContain('https://www.apj3d.com');

      // Section 2: Official Contact
      expect(html).toContain('Official Contact');
      expect(html).toContain('Primary contact information for your organization.');
      expect(html).toContain('Primary Email');
      expect(html).toContain('Phone Number');
      expect(html).toContain('Alternate Email');
      expect(html).toContain('Alternate Phone');
      expect(html).toContain('hr@apj3d.com');
      expect(html).toContain('+91 98765 43210');

      // Section 3: Registered Address
      expect(html).toContain('Registered Address');
      expect(html).toContain("Your organization&#x27;s official registered address.");
      expect(html).toContain('Address Line 1');
      expect(html).toContain('Address Line 2');
      expect(html).toContain('Country');
      expect(html).toContain('State');
      expect(html).toContain('City');
      expect(html).toContain('Postal Code');
      expect(html).toContain('No. 123, Industrial Estate, SIPCOT Phase II');
      expect(html).toContain('Hosur');
      expect(html).toContain('635126');

      // Header and Actions
      expect(html).toContain('Organization Profile');
      expect(html).toContain('Manage your organization&#x27;s primary information and contact details.');
      expect(html).toContain('Cancel');
      expect(html).toContain('Save Changes');
    });

    it('displays breadcrumbs navigation correctly', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationProfileSection initialProfile={mockProfile} />
        </TestAuthProvider>,
      );
      expect(html).toContain('Settings');
      expect(html).toContain('Organization');
      expect(html).toContain('Organization Profile');
    });

    it('displays Access Denied when unauthorized user views organization settings', () => {
      const unauthorizedContext = createMockAuthContext({
        can: () => false,
        canAny: () => false,
        canAll: () => false,
        isCompanyAdmin: false,
      });

      const html = renderToStaticMarkup(
        <TestAuthProvider context={unauthorizedContext}>
          <OrganizationProfileSection initialProfile={mockProfile} />
        </TestAuthProvider>,
      );

      expect(html).toContain('Access Denied');
      expect(html).toContain(
        'You do not have permission to view or manage organization settings for this company.',
      );
      expect(html).not.toContain('Basic Information');
    });
  });

  describe('Settings Center Integration & Routing', () => {
    it('SETTINGS_MODULE_CARDS contains Organization card', () => {
      const orgCard = SETTINGS_MODULE_CARDS.find((card) => card.id === 'organization');
      expect(orgCard).toBeDefined();
      expect(orgCard?.name).toBe('Organization');
      expect(orgCard?.description).toContain('Manage organization profile, structure');
    });

    it('SettingsPage overview renders Organization card', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <SettingsPage />
        </TestAuthProvider>,
      );
      expect(html).toContain('Organization');
      expect(html).toContain('Manage organization profile, structure');
    });

    it('SettingsPage switches to Organization Profile when activeModule is organization', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <SettingsPageInner
            initialModule="organization"
            initialOrganizationProfile={mockProfile}
          />
        </TestAuthProvider>,
      );
      expect(html).toContain('Organization Profile');
      expect(html).toContain('Basic Information');
      expect(html).toContain('Official Contact');
      expect(html).toContain('Registered Address');
    });

    it('OrganizationProfilePage standalone component renders cleanly with provided profile', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationProfilePage initialProfile={mockProfile} />
        </TestAuthProvider>,
      );
      expect(html).toContain('Organization Profile');
      expect(html).toContain('Manage your organization&#x27;s primary information and contact details.');
      expect(html).toContain('Basic Information');
      expect(html).toContain('Official Contact');
      expect(html).toContain('Registered Address');
    });

    it('OrganizationProfilePage renders loading indicator when profile is being fetched', () => {
      const html = renderToStaticMarkup(
        <TestAuthProvider>
          <OrganizationProfilePage />
        </TestAuthProvider>,
      );
      expect(html).toContain('Loading organization profile…');
    });

    it('hrmsRoutes configures direct /settings/organization/profile route', () => {
      const basePathRoute = hrmsRoutes[0];
      const orgProfileRoute = basePathRoute?.children?.find(
        (r) => r.path === 'settings/organization/profile',
      );
      expect(orgProfileRoute).toBeDefined();
      expect(orgProfileRoute?.element).toBeDefined();

      const html = renderToStaticMarkup(
        <TestAuthProvider>{orgProfileRoute!.element as ReactElement}</TestAuthProvider>,
      );
      expect(html).toContain('Loading organization profile…');
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

      // Verify all element IDs exist in the rendered HTML
      for (const field of PROFILE_FIELD_ORDER) {
        const elementId = PROFILE_FIELD_ELEMENT_IDS[field];
        expect(html).toContain(`id="${elementId}"`);
      }
    });

    it('identifies the first invalid field when fields outside the top viewport fail validation', () => {
      // Simulating user filling out top section (Basic info) but missing lower contact/address fields
      const partialForm: OrganizationProfileFormValues = {
        name: 'APJ3D Technologies',
        displayName: 'APJ3D Solution',
        organizationType: 'Private Limited',
        industry: 'Software & Technology',
        website: 'apj3d.com',
        logoUrl: null,
        primaryEmail: '', // INVALID (missing)
        phoneNumber: '',
        alternateEmail: '',
        alternatePhone: '',
        addressLine1: '', // INVALID (missing)
        addressLine2: '',
        country: 'India',
        state: 'Tamil Nadu',
        city: '', // INVALID (missing)
        postalCode: '', // INVALID (missing)
      };

      const errors = validateOrganizationProfile(partialForm);
      expect(errors.name).toBeUndefined();
      expect(errors.organizationType).toBeUndefined();
      expect(errors.primaryEmail).toBe('Primary email is required');
      expect(errors.addressLine1).toBe('Address line 1 is required');

      // The first invalid field in visual page order MUST be primaryEmail
      const firstInvalidField = PROFILE_FIELD_ORDER.find((f) => errors[f]);
      expect(firstInvalidField).toBe('primaryEmail');
      expect(PROFILE_FIELD_ELEMENT_IDS[firstInvalidField!]).toBe('org-primary-email');
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
          <OrganizationStructureSection initialHierarchy={hierarchyWithUpdatedProfile} />
        </TestAuthProvider>,
      );

      // Company details pane must render the canonical profile data, not "—"
      expect(html).toContain('APJ3D Technologies');
      expect(html).toContain('APJ3D Solution');
      expect(html).toContain('Private Limited');
      expect(html).toContain('Software &amp; Technology');
      expect(html).toContain('apj3d.com');
      expect(html).toContain('No. 123 Tech Park, Hosur, Tamil Nadu, India, 635126');
    });
  });
});
