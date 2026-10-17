import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EssBankIdTab } from '../EssBankIdTab';
import type { EssFullProfile, EssDocument } from '../../../api/essApi';

const baseEmployee = {
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
};

const fullProfile: EssFullProfile = {
  employee: baseEmployee,
  personal: {
    employeeId: 'emp_demo_002',
    middleName: null,
    preferredName: 'Arjun',
    gender: 'male',
    dateOfBirth: '1995-08-20',
    maritalStatus: 'married',
    bloodGroup: 'O+',
    nationality: 'Indian',
    nativeLanguage: 'Tamil',
    fatherName: 'Ramesh Mehta',
    guardianName: null,
    personalEmail: 'arjun.mehta.personal@example.com',
    homePhone: '+91 98765 43210',
    businessPhone: '+91 44 2841 0000',
    workPhone: '+91 98765 43210',
    addressStreet: '42 Marina Beach Road',
    addressLine2: 'Apt 4B',
    addressCity: 'Chennai',
    addressDistrict: 'Chennai',
    addressState: 'Tamil Nadu',
    addressPostalCode: '600004',
    addressCountry: 'India',
    isPermanentSameAsCurrent: true,
  },
  emergencyContacts: [],
  familyMembers: [],
  skills: [],
  workSchedule: null,
  bankAccount: {
    bankName: 'HDFC Bank',
    accountHolderName: 'Arjun Mehta',
    maskedAccountNumber: '••••••••8901',
    ifscCode: 'HDFC0001234',
    branchName: 'Anna Salai Main Branch',
    bankLocation: 'Chennai, Tamil Nadu',
  },
};

const mockIdentityDocuments: EssDocument[] = [
  {
    id: 'doc_pan_01',
    category: 'personal_identity',
    documentType: 'pan',
    documentName: 'Permanent Account Number (PAN Card)',
    documentNumber: '••••••123F',
    status: 'verified',
    createdAt: '2024-02-05',
  },
  {
    id: 'doc_aadhaar_01',
    category: 'personal_identity',
    documentType: 'aadhaar',
    documentName: 'Aadhaar Identification Letter',
    documentNumber: '•••• •••• 9012',
    status: 'verified',
    createdAt: '2024-02-05',
  },
  {
    id: 'doc_passport_01',
    category: 'personal_identity',
    documentType: 'passport',
    documentName: 'Republic of India Passport',
    documentNumber: 'P••••678',
    status: 'pending',
    expiryDate: '2032-12-31',
    createdAt: '2024-02-05',
  },
];

const mockSocialSecurityDocuments: EssDocument[] = [
  {
    id: 'doc_uan_01',
    category: 'tax_other',
    documentType: 'uan',
    documentName: 'EPFO Universal Account Number (UAN)',
    documentNumber: '••••••••3456',
    status: 'verified',
    createdAt: '2024-02-06',
  },
  {
    id: 'doc_pf_01',
    category: 'tax_other',
    documentType: 'pf',
    documentName: 'Provident Fund Member Passbook',
    documentNumber: '••••••••7890',
    status: 'verified',
    createdAt: '2024-02-06',
  },
];

const mockBankDocuments: EssDocument[] = [
  {
    id: 'doc_cheque_01',
    category: 'bank_payroll',
    documentType: 'cancelled_cheque',
    documentName: 'Cancelled Cheque Leaf - HDFC Bank',
    documentNumber: '••••••••8901',
    status: 'verified',
    createdAt: '2024-02-05',
  },
];

describe('EssBankIdTab — Four-Section UI & Security', () => {
  it('renders all four finalized sections with headers', () => {
    const html = renderToStaticMarkup(
      <EssBankIdTab
        profile={fullProfile}
        documents={[...mockIdentityDocuments, ...mockSocialSecurityDocuments, ...mockBankDocuments]}
      />,
    );

    expect(html).toContain('Salary Bank Account');
    expect(html).toContain('Tax &amp; Government Identifiers');
    expect(html).toContain('Social Security &amp; Benefits');
    expect(html).toContain('Verification Documents &amp; Proofs');
  });

  describe('Section 1: Salary Bank Account', () => {
    it('displays complete bank account fields when bank record exists', () => {
      const html = renderToStaticMarkup(<EssBankIdTab profile={fullProfile} documents={[]} />);

      expect(html).toContain('HDFC Bank');
      expect(html).toContain('Arjun Mehta');
      expect(html).toContain('••••••••8901');
      expect(html).toContain('HDFC0001234');
      expect(html).toContain('Anna Salai Main Branch');
      expect(html).toContain('Chennai, Tamil Nadu');
      expect(html).toContain('Request Account Update');
    });

    it('displays compact neutral empty state when no bank record exists', () => {
      const profileNoBank: EssFullProfile = {
        ...fullProfile,
        bankAccount: null,
      };

      const html = renderToStaticMarkup(<EssBankIdTab profile={profileNoBank} documents={[]} />);

      expect(html).toContain('No bank account registered');
      expect(html).toContain('salary disbursement account details will appear here');
      expect(html).toContain('Request Account Update');
    });

    it('does not invent unverified bank status', () => {
      const html = renderToStaticMarkup(<EssBankIdTab profile={fullProfile} documents={[]} />);

      expect(html).not.toContain('Instant Verified');
      expect(html).not.toContain('Direct Deposit Approved');
    });
  });

  describe('Section 2: Tax & Government IDs', () => {
    it('renders supported government identity cards when documents exist', () => {
      const html = renderToStaticMarkup(
        <EssBankIdTab profile={fullProfile} documents={mockIdentityDocuments} />,
      );

      expect(html).toContain('Permanent Account Number (PAN Card)');
      expect(html).toContain('••••••123F');

      expect(html).toContain('Aadhaar Identification Letter');
      expect(html).toContain('•••• •••• 9012');

      expect(html).toContain('Republic of India Passport');
      expect(html).toContain('P••••678');
      expect(html).toContain('Expires:');
    });

    it('displays empty state when no government identity documents exist', () => {
      const html = renderToStaticMarkup(<EssBankIdTab profile={fullProfile} documents={[]} />);

      expect(html).toContain('No government identifiers on file');
    });

    it('does not infer or fabricate tax regime from unrelated records', () => {
      const html = renderToStaticMarkup(
        <EssBankIdTab profile={fullProfile} documents={mockIdentityDocuments} />,
      );

      expect(html).not.toContain('New Tax Regime (Default)');
      expect(html).not.toContain('Old Tax Regime');
    });
  });

  describe('Section 3: Social Security & Benefits', () => {
    it('renders UAN and PF records when verified data exists', () => {
      const html = renderToStaticMarkup(
        <EssBankIdTab profile={fullProfile} documents={mockSocialSecurityDocuments} />,
      );

      expect(html).toContain('EPFO Universal Account Number (UAN)');
      expect(html).toContain('••••••••3456');
      expect(html).toContain('Provident Fund Member Passbook');
      expect(html).toContain('••••••••7890');
    });

    it('displays concise neutral empty state when no social security records exist', () => {
      const html = renderToStaticMarkup(<EssBankIdTab profile={fullProfile} documents={[]} />);

      expect(html).toContain('No social security records available');
      expect(html).toContain('Provident Fund (UAN) and Employee State Insurance (ESI)');
    });

    it('does not invent PF applicability, ESI eligibility, or gratuity entitlements', () => {
      const html = renderToStaticMarkup(<EssBankIdTab profile={fullProfile} documents={[]} />);

      expect(html).not.toContain('PF Covered (12%)');
      expect(html).not.toContain('ESI Eligible (0.75%)');
      expect(html).not.toContain('Gratuity Entitled');
    });
  });

  describe('Section 4: Verification Documents', () => {
    it('displays documents from personal_identity, bank_payroll, and tax_other', () => {
      const allDocs = [
        ...mockIdentityDocuments,
        ...mockSocialSecurityDocuments,
        ...mockBankDocuments,
      ];
      const html = renderToStaticMarkup(<EssBankIdTab profile={fullProfile} documents={allDocs} />);

      expect(html).toContain('Cancelled Cheque Leaf - HDFC Bank');
      expect(html).toContain('Bank Payroll');
      expect(html).toContain('Permanent Account Number (PAN Card)');
      expect(html).toContain('Personal Identity');
      expect(html).toContain('View Details');
    });

    it('filters out non-bank-and-id categories such as education or previous_employment', () => {
      const unrelatedDocs: EssDocument[] = [
        {
          id: 'doc_edu_01',
          category: 'education',
          documentName: 'Degree Certificate',
          status: 'verified',
          createdAt: '2024-02-05',
        },
        {
          id: 'doc_exp_01',
          category: 'previous_employment',
          documentName: 'Experience Letter',
          status: 'verified',
          createdAt: '2024-02-05',
        },
      ];

      const html = renderToStaticMarkup(
        <EssBankIdTab profile={fullProfile} documents={unrelatedDocs} />,
      );

      expect(html).not.toContain('Degree Certificate');
      expect(html).not.toContain('Experience Letter');
      expect(html).toContain('No verification documents uploaded');
    });
  });

  describe('Security & Confidentiality Guarantees', () => {
    it('never contains raw bank account numbers in rendered output', () => {
      const rawBank = '50100234567890';
      const html = renderToStaticMarkup(
        <EssBankIdTab profile={fullProfile} documents={mockBankDocuments} />,
      );

      expect(html).not.toContain(rawBank);
      expect(html).toContain('••••••••8901');
    });

    it('never contains raw unmasked PAN or Aadhaar in rendered output', () => {
      const rawPan = 'ABCDE1234F';
      const rawAadhaar = '123456789012';

      const html = renderToStaticMarkup(
        <EssBankIdTab profile={fullProfile} documents={mockIdentityDocuments} />,
      );

      expect(html).not.toContain(rawPan);
      expect(html).not.toContain(rawAadhaar);
      expect(html).toContain('••••••123F');
      expect(html).toContain('•••• •••• 9012');
    });

    it('provides controlled informational workflow instead of arbitrary unencrypted bank updates', () => {
      const html = renderToStaticMarkup(<EssBankIdTab profile={fullProfile} documents={[]} />);

      expect(html).toContain('Request Account Update');
      expect(html).not.toContain('name="newAccountNumber"');
    });
  });
});
