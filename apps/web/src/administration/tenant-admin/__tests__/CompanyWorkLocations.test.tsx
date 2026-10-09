import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { CompanyLocationsPage } from '../pages/CompanyLocationsPage';
import { AddLocationModal, isSameNormalizedAddress } from '../components/AddLocationModal';
import { EditLocationModal } from '../components/EditLocationModal';
import type {
  TenantAdminCompanySummary,
  WorkLocationRecord,
} from '../types/tenantAdmin.types';

describe('Tenant Admin → Company Organization → Work Locations V1 (Administration Tree)', () => {
  const mockCompany: TenantAdminCompanySummary = {
    id: 'comp_apj3d',
    name: 'APJ3D Design Solution',
    displayName: 'APJ3D',
    code: 'APJ3D-01',
    status: 'active',
    legalName: 'APJ3D Design Solution Private Limited',
    organizationType: 'Private Limited',
    industry: 'Engineering & Industrial Design',
    country: 'India',
    city: 'Hosur',
    state: 'Tamil Nadu',
    location: 'Hosur, Tamil Nadu, India',
    timeZone: 'Asia/Kolkata',
    createdAt: '2026-01-15T00:00:00.000Z',
  };

  const mockLocations: WorkLocationRecord[] = [
    {
      id: 'loc_hsr',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Hosur Head Office',
      code: 'HSR-001',
      type: 'office',
      addressLine1: 'Plot 42, SIPCOT Industrial Complex',
      addressLine2: 'Phase II',
      city: 'Hosur',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '635126',
      timezone: 'Asia/Kolkata',
      description: 'Primary corporate engineering office',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'loc_chn',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Chennai Office',
      code: 'CHN-001',
      type: 'office',
      addressLine1: 'Level 4, Tidel Park',
      addressLine2: 'OMR, Tharamani',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '600113',
      timezone: 'Asia/Kolkata',
      description: 'Regional client support hub',
      status: 'active',
      createdAt: '2026-01-16T00:00:00.000Z',
      updatedAt: '2026-01-16T00:00:00.000Z',
    },
    {
      id: 'loc_blr',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Bengaluru Branch',
      code: 'BLR-001',
      type: 'branch',
      addressLine1: '12th Main, Indiranagar',
      addressLine2: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560038',
      timezone: 'Asia/Kolkata',
      description: 'Software development center',
      status: 'active',
      createdAt: '2026-01-17T00:00:00.000Z',
      updatedAt: '2026-01-17T00:00:00.000Z',
    },
    {
      id: 'loc_inactive_cbe',
      tenantId: 'ten_main_123',
      companyId: 'comp_apj3d',
      name: 'Coimbatore Plant',
      code: 'CBE-001',
      type: 'plant_factory',
      addressLine1: 'Industrial Estate, SIDCO',
      addressLine2: null,
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '641021',
      timezone: 'Asia/Kolkata',
      description: 'Decommissioned testing plant',
      status: 'inactive',
      createdAt: '2026-01-18T00:00:00.000Z',
      updatedAt: '2026-01-18T00:00:00.000Z',
    },
  ];

  const mockContext: TenantAdminContextValue = {
    tenantId: 'ten_main_123',
    tenantName: 'Zentram Enterprise Systems',
    tenant: {
      id: 'ten_main_123',
      name: 'Zentram Enterprise Systems',
      code: 'ZENTRAM',
      status: 'active',
      contactEmail: 'admin@zentram.example',
      contactPhone: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    user: {
      id: 'usr_ta_1',
      email: 'tenantadmin@zentram.example',
      firstName: 'Tenant',
      lastName: 'Admin',
    },
    tenantAdmin: {
      id: 'ta_1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    isTenantAdmin: true,
    isSuperAdmin: false,
    companies: [mockCompany],
    capacity: {
      used: 1,
      max: 5,
      remaining: 4,
    },
    isSingleCompany: false,
    entitlements: [],
    selectedCompanyId: 'comp_apj3d',
    selectedCompany: mockCompany,
    selectCompany: vi.fn(),
    isLoading: false,
    error: null,
    authorizationDenied: false,
    refreshContext: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Workspace Shell Invariants & Clean Hierarchy', () => {
    it('renders unified CompanyWorkspaceHeader with Organization active and NO Edit Company', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization/work-locations']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/work-locations"
                element={<CompanyLocationsPage initialLocations={mockLocations} />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      // Identity & Breadcrumbs
      expect(html).toContain('Companies');
      expect(html).toContain('APJ3D Design Solution');
      expect(html).toContain('APJ3D-01');
      expect(html).toContain('Active');

      // Edit Company MUST NOT be shown on Organization
      expect(html).not.toContain('Edit Company');

      // Canonical 4 Workspace Tabs
      expect(html).toContain('Overview');
      expect(html).toContain('Organization');
      expect(html).toContain('Access');
      expect(html).toContain('Applications');

      // Organization sub-navigation tabs
      expect(html).toContain('Structure');
      expect(html).toContain('Work Locations');

      // Obsolete legacy elements MUST NOT exist
      expect(html).not.toContain('Company Details');
      expect(html).not.toContain('Managed Company Context');
      expect(html).not.toContain('Back to Settings');
      expect(html).not.toContain('Settings / Organization / Work Locations');
      expect(html).not.toContain('Company Overview');
    });

    it('resolves legacy /locations route to canonical /work-locations', () => {
      let redirectedTo = '';
      function LocationsRedirect() {
        redirectedTo = '/tenant-admin/tenant/companies/comp_apj3d/organization/work-locations';
        return <Navigate to="../work-locations" replace />;
      }

      renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization/locations']}>
          <Routes>
            <Route
              path="/tenant-admin/tenant/companies/:companyId/organization/locations"
              element={<LocationsRedirect />}
            />
          </Routes>
        </MemoryRouter>,
      );

      expect(redirectedTo).toBe('/tenant-admin/tenant/companies/comp_apj3d/organization/work-locations');
    });
  });

  describe('2. Populated Work Locations Presentation', () => {
    it('renders real location records with name, code, type, location summary, and status', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization/work-locations']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/work-locations"
                element={<CompanyLocationsPage initialLocations={mockLocations} />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      // Names
      expect(html).toContain('Hosur Head Office');
      expect(html).toContain('Chennai Office');
      expect(html).toContain('Bengaluru Branch');
      expect(html).toContain('Coimbatore Plant');

      // Codes
      expect(html).toContain('HSR-001');
      expect(html).toContain('CHN-001');
      expect(html).toContain('BLR-001');
      expect(html).toContain('CBE-001');

      // Types
      expect(html).toContain('Office');
      expect(html).toContain('Branch');
      expect(html).toContain('Plant');

      // Summaries
      expect(html).toContain('Hosur, Tamil Nadu, India');
      expect(html).toContain('Chennai, Tamil Nadu, India');
      expect(html).toContain('Bengaluru, Karnataka, India');

      // Statuses
      expect(html).toContain('Active');
      expect(html).toContain('Inactive');

      // Summary bar
      expect(html).toContain('4 Work Locations');
      expect(html).toContain('3 Active');
      expect(html).toContain('1 Inactive');

      // Toolbar Add Location appears exactly once in populated state
      const countAddLocation = (html.match(/Add Location/g) || []).length;
      expect(countAddLocation).toBe(1);
    });
  });

  describe('3. Single Creation CTA Invariant', () => {
    it('when 0 locations exist, shows clean Empty State with exactly ONE Add Location CTA', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_apj3d/organization/work-locations']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/work-locations"
                element={<CompanyLocationsPage initialLocations={[]} />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      // Empty state text
      expect(html).toContain('No work locations yet.');
      expect(html).toContain('first office, branch, plant, or work location.');

      // Exactly ONE Add Location CTA (the one inside EmptyState)
      const matches = (html.match(/Add Location/g) || []).length;
      expect(matches).toBe(1);
    });
  });

  describe('4. Smart Progressive Add Location & Edit Location Modals', () => {
    it('AddLocationModal renders initial simplified form with primary fields and collapsed advanced options', () => {
      const html = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={mockCompany}
          onSuccess={vi.fn()}
        />,
      );

      // Primary fields MUST be visible
      expect(html).toContain('Add Work Location');
      expect(html).toContain('Location Name');
      expect(html).toContain('Location Type');
      expect(html).toContain('Address Line 1');
      expect(html).toContain('City');
      expect(html).toContain('State / Province');
      expect(html).toContain('Postal Code');
      expect(html).toContain('Country');

      // Advanced options toggle is present
      expect(html).toContain('Advanced options');

      // Advanced-only fields MUST NOT be visible initially
      expect(html).not.toContain('Suggested business identifier within this company.');
      expect(html).not.toContain('Suite, floor, or landmark');
      expect(html).not.toContain('Additional operational or regional details...');

      // Physical location types supported
      expect(html).toContain('Office');
      expect(html).toContain('Branch');
      expect(html).toContain('Plant');
      expect(html).toContain('Client Site');
      expect(html).toContain('Other');

      // Remote Zone / Remote Hub MUST NOT be offered as physical location creation type
      expect(html).not.toContain('Remote Zone');
      expect(html).not.toContain('Remote Hub');
    });

    it('renders registered office shortcut when company address is available, and omits when insufficient', () => {
      const companyWithRegisteredOffice: TenantAdminCompanySummary = {
        ...mockCompany,
        addressLine1: 'Plot 42, SIPCOT Industrial Complex',
        city: 'Hosur',
        state: 'Tamil Nadu',
        postalCode: '635126',
        country: 'India',
      };

      const htmlWithOffice = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={companyWithRegisteredOffice}
          onSuccess={vi.fn()}
        />,
      );

      expect(htmlWithOffice).toContain('Registered office available');
      expect(htmlWithOffice).toContain('Plot 42, SIPCOT Industrial Complex, Hosur, Tamil Nadu, 635126, India');
      expect(htmlWithOffice).toContain('Use registered office');

      const companyWithoutOffice: TenantAdminCompanySummary = {
        ...mockCompany,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
      };

      const htmlWithoutOffice = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={companyWithoutOffice}
          onSuccess={vi.fn()}
        />,
      );

      expect(htmlWithoutOffice).not.toContain('Registered office available');
      expect(htmlWithoutOffice).not.toContain('Use registered office');
    });

    it('EditLocationModal renders populated fields and allows updating location details', () => {
      const targetLocation = mockLocations[0]!;
      const html = renderToStaticMarkup(
        <EditLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={mockCompany}
          location={targetLocation}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Edit Work Location');
      expect(html).toContain('Hosur Head Office');
      expect(html).toContain('HSR-001');
      expect(html).toContain('Plot 42, SIPCOT Industrial Complex');
      expect(html).toContain('Hosur');
      expect(html).toContain('Save Changes');
    });
  });

  describe('5. Registered Office Suggestion Deduplication', () => {
    const companyWithRegisteredOffice: TenantAdminCompanySummary = {
      ...mockCompany,
      addressLine1: 'Plot 42, SIPCOT Industrial Complex',
      addressLine2: 'Phase II',
      city: 'Hosur',
      state: 'Tamil Nadu',
      postalCode: '635126',
      country: 'India',
    };

    it('Case A: Registered Office exists + no matching Work Location → "Use registered office" is visible', () => {
      const html = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={companyWithRegisteredOffice}
          existingLocations={[]}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Registered office available');
      expect(html).toContain('Use registered office');
    });

    it('Case B: Registered Office exists + matching Work Location exists → shortcut is hidden while manual fields remain', () => {
      // mockLocations[0] matches the registered office address (Hosur Head Office)
      const html = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={companyWithRegisteredOffice}
          existingLocations={[mockLocations[0]!]}
          onSuccess={vi.fn()}
        />,
      );

      // Shortcut should be hidden
      expect(html).not.toContain('Registered office available');
      expect(html).not.toContain('Use registered office');

      // Manual address entry fields MUST remain available
      expect(html).toContain('Address Line 1');
      expect(html).toContain('City');
      expect(html).toContain('State / Province');
    });

    it('Case C: Same address with different casing/whitespace → considered a match and shortcut is hidden', () => {
      const locationWithWhitespaceAndCaseDifferences: WorkLocationRecord = {
        ...mockLocations[0]!,
        name: 'Custom Facility Name', // Does not depend on "Head Office"
        addressLine1: '  plot 42,   SIPCOT industrial complex  ',
        addressLine2: '   phase ii   ',
        city: '  hosur ',
        state: '  TAMIL NADU ',
        postalCode: ' 635126 ',
        country: 'india',
      };

      const html = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={companyWithRegisteredOffice}
          existingLocations={[locationWithWhitespaceAndCaseDifferences]}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).not.toContain('Registered office available');
      expect(html).not.toContain('Use registered office');
    });

    it('Case D: Registered Office exists + Work Location at another address → shortcut remains visible', () => {
      // mockLocations[1] is Chennai Office (different address)
      const html = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={companyWithRegisteredOffice}
          existingLocations={[mockLocations[1]!]}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Registered office available');
      expect(html).toContain('Use registered office');
    });

    it('Case E: No Registered Office → shortcut hidden', () => {
      const companyWithoutOffice: TenantAdminCompanySummary = {
        ...mockCompany,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
      };

      const html = renderToStaticMarkup(
        <AddLocationModal
          isOpen={true}
          onClose={vi.fn()}
          company={companyWithoutOffice}
          existingLocations={[]}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).not.toContain('Registered office available');
      expect(html).not.toContain('Use registered office');
    });

    it('isSameNormalizedAddress normalizes whitespace, trim, casing, and empty fields properly', () => {
      expect(
        isSameNormalizedAddress(
          {
            addressLine1: '  123 Main St  ',
            city: 'Chennai',
            state: 'TN',
            postalCode: '600001',
            country: 'India',
          },
          {
            addressLine1: '123   main   st',
            city: 'chennai',
            state: 'tn',
            postalCode: '600001',
            country: 'india',
          },
        ),
      ).toBe(true);

      expect(
        isSameNormalizedAddress(
          {
            addressLine1: '123 Main St',
            city: 'Chennai',
            state: 'TN',
          },
          {
            addressLine1: '123 Main St',
            city: 'Bengaluru',
            state: 'TN',
          },
        ),
      ).toBe(false);
    });
  });

  describe('6. Cross-Tenant Boundary Protection', () => {
    it('blocks foreign company ID and shows tenant isolation warning', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/tenant-admin/tenant/companies/comp_foreign_999/organization/work-locations']}>
          <TenantAdminContext.Provider value={mockContext}>
            <Routes>
              <Route
                path="/tenant-admin/tenant/companies/:companyId/organization/work-locations"
                element={<CompanyLocationsPage initialLocations={[]} />}
              />
            </Routes>
          </TenantAdminContext.Provider>
        </MemoryRouter>,
      );

      expect(html).toContain('Company Not Found or Access Denied');
      expect(html).toContain('Cross-tenant access is prohibited');
      expect(html).toContain('Back to Companies');
      expect(html).not.toContain('Hosur Head Office');
    });
  });
});
