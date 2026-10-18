import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EssPrivacyTab } from '../EssPrivacyTab';
import { AuthContext, type AuthContextValue } from '../../../../../../platform/auth';
import type { EssFullProfile } from '../../../api/essApi';

import type { CompanyAccess, AccessOverview } from '../../../../../../platform/auth/authApi';

const mockCompanyAccess: CompanyAccess = {
  tenantId: 'tent_bezent_demo_01',
  tenantName: 'Bezent Demo Tenant',
  companyId: 'comp_bezent_demo_01',
  companyName: 'Bezent Technologies Inc.',
  companyCode: 'BEZENT-INC',
  isMember: true,
  isPlatformOversight: false,
  roles: [],
  permissions: ['hrms:ess:read'],
  enabledModules: ['hrms'],
  essEligible: true,
  employeeId: 'emp_demo_002',
  workspaces: ['hrms'],
};

const mockAccessOverview: AccessOverview = {
  user: {
    id: 'usr_test_001',
    email: 'arjun.mehta@bezent.com',
    firstName: 'Arjun',
    lastName: 'Mehta',
    isSuperAdmin: false,
  },
  platformWorkspaces: ['hrms'],
  companies: [mockCompanyAccess],
};

const mockAuthValue: AuthContextValue = {
  status: 'authenticated',
  error: null,
  errorKind: null,
  access: mockAccessOverview,
  activeCompany: mockCompanyAccess,
  can: () => true,
  canAny: () => true,
  canAll: () => true,
  hasApplicationAccess: () => true,
  isSuperAdmin: false,
  isCompanyAdmin: false,
  completeSignIn: vi.fn(),
  selectCompany: () => true,
  refreshAccess: async () => {},
  signOut: vi.fn(async () => {}),
};

const renderWithAuth = (ui: React.ReactElement) => {
  return renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthValue}>{ui}</AuthContext.Provider>,
  );
};

const mockProfile: EssFullProfile = {
  employee: {
    id: 'emp_demo_002',
    tenantId: 'tent_bezent_demo_01',
    companyId: 'comp_bezent_demo_01',
    employeeNumber: 'EMP-002',
    firstName: 'Arjun',
    lastName: 'Mehta',
    email: 'arjun.mehta@bezent.com',
    workPhone: '+91 98765 43210',
    departmentId: 'dept_eng_01',
    departmentName: 'Engineering',
    designationId: 'desig_se_01',
    designationTitle: 'Senior Software Engineer',
    locationId: 'loc_chn_01',
    locationName: 'Chennai Campus',
    employmentType: 'full_time',
    employmentStatus: 'active',
    joiningDate: '2024-02-01',
    gender: 'male',
    avatarPreference: 'male',
  },
  personal: null,
  emergencyContacts: [],
  familyMembers: [],
  skills: [],
  workSchedule: null,
  bankAccount: null,
};

describe('EssPrivacyTab (V1 Production Tab)', () => {
  it('renders all four core privacy sections with correct headings and descriptions', () => {
    const html = renderWithAuth(
      <EssPrivacyTab
        profile={mockProfile}
        onNavigateToChangeRequests={vi.fn()}
        onRequestCorrection={vi.fn()}
      />,
    );

    // Section 1: Account Security & Credentials
    expect(html).toContain('Account Security &amp; Credentials');
    expect(html).toContain(
      'Verified authentication methods, credential governance, and access integrity',
    );

    // Section 2: Profile Visibility & Access Boundaries
    expect(html).toContain('Profile Visibility &amp; Access Boundaries');
    expect(html).toContain(
      'Role-based authorization rules, isolation boundaries, and employee record protection',
    );

    // Section 3: Account Activity & Session State
    expect(html).toContain('Account Activity &amp; Session State');
    expect(html).toContain('Current browser authentication state and enterprise session tracking');

    // Section 4: Data Privacy & Statutory Requests
    expect(html).toContain('Data Privacy &amp; Statutory Requests');
    expect(html).toContain(
      'Workforce data compliance, statutory retention rules, and verified rectification workflows',
    );
  });

  it('displays verified passwordless authentication credentials without fake passwords', () => {
    const html = renderWithAuth(
      <EssPrivacyTab
        profile={mockProfile}
        onNavigateToChangeRequests={vi.fn()}
        onRequestCorrection={vi.fn()}
      />,
    );

    // Primary Identity
    expect(html).toContain('Primary Account Email');
    expect(html).toContain('arjun.mehta@bezent.com');

    // Verified Auth Protocol
    expect(html).toContain('Authentication Method');
    expect(html).toContain('Passwordless Email Verification');

    // Multi-Factor status
    expect(html).toContain('Sign-In Verification');
    expect(html).toContain('6-Digit One-Time Code');

    // Credential Architecture Note
    expect(html).toContain('Password Sign-In Policy');
    expect(html).toContain('Disabled by Enterprise Policy');
    expect(html).toContain('Zero Plaintext Secrets Stored');

    // No sensitive password fields or hashes
    expect(html).not.toContain('password_hash');
    expect(html).not.toContain('bcrypt');
    expect(html).not.toContain('New Password');
  });

  it('displays accurate Profile Visibility boundaries and multi-tenant isolation rules', () => {
    const html = renderWithAuth(
      <EssPrivacyTab
        profile={mockProfile}
        onNavigateToChangeRequests={vi.fn()}
        onRequestCorrection={vi.fn()}
      />,
    );

    // Self-Service boundary
    expect(html).toContain('Employee Self-Service (ESS)');
    expect(html).toContain('Your session is scoped strictly to your personal workforce file');

    // HR Role permissions
    expect(html).toContain('HR &amp; Administrative Reviewers');
    expect(html).toContain('HR Administration access is governed by fine-grained permissions');

    // Statutory Masking
    expect(html).toContain('Statutory Data Masking');
    expect(html).toContain(
      'Salary bank accounts, PAN, Aadhaar, and national identity numbers are masked',
    );

    // Multi-Tenant Isolation
    expect(html).toContain('Organization &amp; Legal Isolation');
    expect(html).toContain('Enforced Boundary');
    expect(html).toContain('personnel data are strictly isolated by legal company');
  });

  it('displays Current Active Browser Session and sign-out control with no fabricated devices', () => {
    const html = renderWithAuth(
      <EssPrivacyTab
        profile={mockProfile}
        onNavigateToChangeRequests={vi.fn()}
        onRequestCorrection={vi.fn()}
      />,
    );

    // Active session card
    expect(html).toContain('Current Browser Session');
    expect(html).toContain('Active Session');
    expect(html).toContain('Encrypted Web Session');
    expect(html).toContain('Active (24-Hour Expiry)');
    expect(html).toContain('Sign Out Current Session');

    // Enterprise audit logging note
    expect(html).toContain('Enterprise Session &amp; Security Oversight');

    // Verifies absence of fabricated mock IP addresses or device names
    expect(html).not.toContain('192.168.1.1');
    expect(html).not.toContain('iPhone 15 Pro');
    expect(html).not.toContain('Chrome on macOS');
  });

  it('displays statutory data compliance rights and change request action without fake deletion', () => {
    const html = renderWithAuth(
      <EssPrivacyTab
        profile={mockProfile}
        onNavigateToChangeRequests={vi.fn()}
        onRequestCorrection={vi.fn()}
      />,
    );

    // Statutory retention notice
    expect(html).toContain('Statutory Data Retention Notice');
    expect(html).toContain('labor and tax regulations');

    // Right to Rectification
    expect(html).toContain('Right to Rectification (Data Correction)');
    expect(html).toContain('Request Correction');
    expect(html).toContain('View Change Requests');

    // Offboarding info
    expect(html).toContain('Data Portability &amp; Exit Clearance');
    expect(html).toContain('HR Managed');

    // Verifies absence of fake self-service deletion buttons
    expect(html).not.toContain('Delete My Account');
    expect(html).not.toContain('Export All Data (JSON)');
  });

  it('uses clean design system classes and contains zero inline style attributes', () => {
    const html = renderWithAuth(
      <EssPrivacyTab
        profile={mockProfile}
        onNavigateToChangeRequests={vi.fn()}
        onRequestCorrection={vi.fn()}
      />,
    );

    // Checks presence of hrms.css classes
    expect(html).toContain('ess-privacy-card');
    expect(html).toContain('ess-privacy-grid-2');
    expect(html).toContain('ess-privacy-session-box');
    expect(html).toContain('ess-privacy-tag');

    // Absolute zero inline styles
    expect(html).not.toContain('style="');
    expect(html).not.toContain("style='");
  });
});
