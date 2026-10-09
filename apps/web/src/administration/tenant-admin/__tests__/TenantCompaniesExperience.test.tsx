import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TenantAdminContext, type TenantAdminContextValue } from '../context/TenantAdminContext';
import { TenantCompaniesPage } from '../pages/TenantCompaniesPage';
import type { TenantAdminCompanySummary } from '../types/tenantAdmin.types';

describe('Tenant Admin Companies Experience Visual & Functional Verification', () => {
  const mockCompanies: TenantAdminCompanySummary[] = [
    {
      id: 'comp_001',
      name: 'Acme Technologies Pvt Ltd',
      code: 'ACME-TECH',
      status: 'active',
      legalName: 'Acme Technologies Private Limited',
      country: 'India',
      location: 'Bengaluru, India',
      industry: 'Manufacturing',
      enabledModules: ['hrms', 'crm', 'project_management'],
      adminsCount: 2,
      createdAt: '2026-09-18T00:00:00.000Z',
    },
    {
      id: 'comp_002',
      name: 'Bezent Solutions',
      code: 'BEZENT-SOL',
      status: 'active',
      legalName: 'Bezent Solutions Inc',
      country: 'India',
      location: 'Chennai, India',
      industry: 'IT Services',
      enabledModules: ['hrms'],
      adminsCount: 1,
      createdAt: '2025-01-10T00:00:00.000Z',
    },
    {
      id: 'comp_003',
      name: 'TamZode Works',
      code: 'TAMZODE',
      status: 'inactive',
      legalName: 'TamZode Works LLC',
      country: 'India',
      location: 'Coimbatore, India',
      industry: 'Software Development',
      enabledModules: [],
      adminsCount: 0,
      createdAt: '2024-03-22T00:00:00.000Z',
    },
  ];

  const mockContext: TenantAdminContextValue = {
    tenantId: 'TEN-ACME-001',
    tenantName: 'Acme Technologies',
    tenant: {
      id: 'TEN-ACME-001',
      name: 'Acme Technologies',
      code: 'ACME-01',
      status: 'active',
      contactEmail: 'admin@acme.com',
      contactPhone: '+1-555-0100',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    user: {
      id: 'usr_001',
      email: 'admin@acme.com',
      firstName: 'Admin',
      lastName: 'User',
    },
    tenantAdmin: {
      id: 'adm_001',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    isTenantAdmin: true,
    isSuperAdmin: false,
    companies: mockCompanies,
    capacity: {
      used: 3,
      max: 5,
      remaining: 2,
      canCreateCompany: true,
      currentCompanies: 3,
      maxCompanies: 5,
      availableCapacity: 2,
    },
    isSingleCompany: false,
    entitlements: ['hrms', 'crm', 'project_management'],
    selectedCompanyId: null,
    selectedCompany: null,
    selectCompany: vi.fn(),
    isLoading: false,
    error: null,
    authorizationDenied: false,
    refreshContext: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Companies page renders header, compact capacity strip, result count, and companies grid without duplicate Add Company card', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantCompaniesPage initialCompanies={mockCompanies} />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Header & Breadcrumbs
    expect(html).toContain('Tenant');
    expect(html).toContain('Companies');
    expect(html).toContain('Manage legal entities and their organization structure.');
    expect(html).toContain('Add Company');

    // Compact capacity strip
    expect(html).toContain('Company Capacity');
    expect(html).toContain('3 of 5');
    expect(html).toContain('companies');
    expect(html).toContain('2 companies remaining');
    expect(html).toContain('bezent-progress-bar-wrapper');

    // Search and filter toolbar
    expect(html).toContain('Search companies...');
    expect(html).toContain('Filter');

    // Result count
    expect(html).toContain('3 Companies');

    // Companies rendered
    expect(html).toContain('Acme Technologies Pvt Ltd');
    expect(html).toContain('Bezent Solutions');
    expect(html).toContain('TamZode Works');
    expect(html).toContain('Bengaluru, India');
    expect(html).toContain('Chennai, India');
    expect(html).toContain('Coimbatore, India');

    // Subtle View company link
    expect(html).toContain('View company');

    // NO duplicate Add New Company card in populated grid
    expect(html).not.toContain('Add New Company');
    expect(html).not.toContain('You can create up to 2 more companies.');
  });

  it('2. Enforces capacity limit: disables Add Company and shows capacity full message', () => {
    const atCapacityContext: TenantAdminContextValue = {
      ...mockContext,
      capacity: {
        used: 5,
        max: 5,
        remaining: 0,
        canCreateCompany: false,
        currentCompanies: 5,
        maxCompanies: 5,
        availableCapacity: 0,
      },
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={atCapacityContext}>
          <TenantCompaniesPage initialCompanies={mockCompanies} />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Header Add Company button is disabled
    expect(html).toContain('disabled=""');
    expect(html).toContain('Company capacity reached');

    // Capacity strip shows 0 remaining
    expect(html).toContain('5 of 5');
    expect(html).toContain('Company capacity reached');
  });

  it('3. Renders empty state when no companies are provisioned', () => {
    const zeroCompaniesContext: TenantAdminContextValue = {
      ...mockContext,
      companies: [],
      capacity: {
        used: 0,
        max: 5,
        remaining: 5,
        canCreateCompany: true,
      },
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={zeroCompaniesContext}>
          <TenantCompaniesPage initialCompanies={[]} />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('No companies yet');
    expect(html).toContain('Create your first legal entity to begin configuring your organization.');
    expect(html).toContain('+ Add First Company');
  });

  it('4. Renders application badges, empty app state, and standardized metadata', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantCompaniesPage initialCompanies={mockCompanies} />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Module badges for companies that have them
    expect(html).toContain('HRMS');
    expect(html).toContain('CRM');
    expect(html).toContain('PM');

    // Section for company with zero apps enabled
    expect(html).toContain('No applications enabled');

    // Standardized metadata
    expect(html).toContain('2 Admins');
    expect(html).toContain('1 Admin');
    expect(html).toContain('0 Admins');
    expect(html).toContain('Created Sep 18, 2026');
  });

  it('5. Filter popover opens with proper structure: heading, radios for status, select for location, checkboxes for applications', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantCompaniesPage initialCompanies={mockCompanies} initialFilterOpen={true} />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Popover container & heading
    expect(html).toContain('bezent-filter-popover');
    expect(html).toContain('Filters');

    // STATUS section with radio semantics
    expect(html).toContain('STATUS');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('type="radio"');
    expect(html).toContain('value="all"');
    expect(html).toContain('value="active"');
    expect(html).toContain('value="inactive"');
    expect(html).toContain('checked=""'); // Default "All" is selected

    // LOCATION section with Select dropdown
    expect(html).toContain('LOCATION');
    expect(html).toContain('All locations');
    expect(html).toContain('Bengaluru, India');
    expect(html).toContain('Chennai, India');
    expect(html).toContain('Coimbatore, India');

    // APPLICATIONS section with multi-select checkboxes
    expect(html).toContain('APPLICATIONS');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('HRMS');
    expect(html).toContain('CRM');
    expect(html).toContain('Project Management');

    // Footer actions
    expect(html).toContain('Clear all');
    expect(html).toContain('Apply');
  });

  it('6. Does NOT render fake application options when data does not contain them', () => {
    const hrmsOnlyCompanies: TenantAdminCompanySummary[] = [
      {
        id: 'comp_only_hrms',
        name: 'Single App Company',
        code: 'SAC',
        status: 'active',
        enabledModules: ['hrms'],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantCompaniesPage initialCompanies={hrmsOnlyCompanies} initialFilterOpen={true} />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Only HRMS is present
    expect(html).toContain('HRMS');
    // CRM and Project Management are NOT in the applications group
    expect(html).not.toContain('value="crm"');
    expect(html).not.toContain('Project Management');
  });

  it('7. Enforces category-based filter count and displays active chips without default states', () => {
    // 3 categories active: Status (+1), Location (+1), Applications (+1)
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantCompaniesPage
            initialCompanies={mockCompanies}
            initialStatus="active"
            initialLocation="Bengaluru, India"
            initialApps={['hrms', 'crm']}
          />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Active filter badge shows 3 (not 4)
    expect(html).toContain('bezent-filter-badge');
    expect(html).toContain('>3<');

    // Active chips rendered
    expect(html).toContain('Active filters:');
    expect(html).toContain('Active');
    expect(html).toContain('Bengaluru, India');
    expect(html).toContain('HRMS');
    expect(html).toContain('CRM');

    // Default values never show as chips
    expect(html).not.toContain('All locations');

    // Only Acme matches all 3 criteria
    expect(html).toContain('Acme Technologies Pvt Ltd');
    expect(html).not.toContain('Bezent Solutions');
    expect(html).not.toContain('TamZode Works');
    expect(html).toContain('1 Company');
  });

  it('8. Status filtering: filters to inactive companies when Status is inactive', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantCompaniesPage initialCompanies={mockCompanies} initialStatus="inactive" />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    // Filter count is 1
    expect(html).toContain('>1<');
    expect(html).toContain('1 Company');

    // TamZode Works is inactive
    expect(html).toContain('TamZode Works');
    expect(html).not.toContain('Acme Technologies Pvt Ltd');
    expect(html).not.toContain('Bezent Solutions');
  });

  it('9. Shows zero results empty state when search or filters yield no matches', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TenantAdminContext.Provider value={mockContext}>
          <TenantCompaniesPage
            initialCompanies={mockCompanies}
            initialSearchQuery="NonExistentName"
          />
        </TenantAdminContext.Provider>
      </MemoryRouter>,
    );

    expect(html).toContain('No companies found');
    expect(html).toContain('No companies match your current search or filters.');
    expect(html).toContain('Clear Filters');
  });
});
